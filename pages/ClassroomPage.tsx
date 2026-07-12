// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  useTracks,
  useLocalParticipant,
  RoomAudioRenderer,
  useConnectionState,
  TrackToggle,
  ParticipantTile,
  Chat,
} from '@livekit/components-react';
import { Track, ConnectionQuality, RoomEvent, VideoPresets, ConnectionState } from 'livekit-client';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import {
  Mic, MicOff, Video, VideoOff, Monitor, LogOut,
  Loader2, AlertCircle, Signal, SignalHigh, SignalMedium, SignalLow,
  Zap, ZapOff, X, MessageSquare, Clock, Presentation, Wrench, Timer, Plus
} from 'lucide-react';
import { Tldraw, getSnapshot, loadSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import EngagementSidebar from '../components/EngagementSidebar';

// ─── Live Collaborative Whiteboard ────────────────────────────────────────────
const LiveWhiteboard: React.FC<{ zoneId: string; isTutor: boolean }> = ({ zoneId, isTutor }) => {
  const editorRef = useRef<any>(null);
  const isSyncingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMount = (editor: any) => {
    editorRef.current = editor;

    if (!isTutor) {
      // Students: read-only — lock editing
      editor.updateInstanceState({ isReadonly: true });
    }

    // Listen to Firestore for whiteboard updates
    const wbRef = doc(db!, 'whiteboards', zoneId);
    const unsub = onSnapshot(wbRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data?.snapshot) return;
      // Don't overwrite our own changes on the tutor's side
      if (isTutor && isSyncingRef.current) return;
      try {
        editor.store.mergeRemoteChanges(() => {
          loadSnapshot(editor.store, data.snapshot);
        });
      } catch (e) {
        console.warn('Whiteboard load error:', e);
      }
    });

    if (isTutor) {
      // Tutor: push store changes to Firestore (debounced 300ms)
      editor.store.listen(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          isSyncingRef.current = true;
          try {
            const snapshot = getSnapshot(editor.store);
            setDoc(doc(db!, 'whiteboards', zoneId), {
              snapshot,
              updatedAt: new Date().toISOString(),
            });
          } catch (e) {
            console.error('Whiteboard sync error:', e);
          } finally {
            setTimeout(() => { isSyncingRef.current = false; }, 500);
          }
        }, 300);
      }, { scope: 'document', source: 'user' });
    }

    return () => { unsub(); };
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Tldraw
        hideUi={!isTutor}
        onMount={handleMount}
      />
      {!isTutor && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          background: 'rgba(194,245,117,0.1)', border: '1px solid rgba(194,245,117,0.3)',
          borderRadius: 10, padding: '6px 14px',
          color: '#c2f575', fontSize: '11px', fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          backdropFilter: 'blur(10px)',
        }}>
          👁 Viewing Live
        </div>
      )}
    </div>
  );
};

// ─── Network Quality Indicator ────────────────────────────────────────────────
const NetworkQualityIndicator = () => {
  const { localParticipant } = useLocalParticipant();
  const quality = localParticipant?.connectionQuality;

  if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good)
    return <SignalHigh size={18} color="#22c55e" />;
  if (quality === ConnectionQuality.Poor)
    return <SignalMedium size={18} color="#f59e0b" />;
  if (quality === ConnectionQuality.VeryPoor)
    return <SignalLow size={18} color="#ef4444" />;
  return <Signal size={18} color="rgba(255,255,255,0.3)" />;
};

// ─── Connection Status Bar ────────────────────────────────────────────────────
const ConnectionStatus = () => {
  const status = useConnectionState();
  const isConnected = status === ConnectionState.Connected;

  return (
    <div className="flex items-center gap-3">
      <NetworkQualityIndicator />
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: isConnected ? '#22c55e' : '#ef4444',
            boxShadow: `0 0 8px ${isConnected ? '#22c55e' : '#ef4444'}`,
          }}
        />
        <span className="text-[10px] uppercase tracking-widest font-black opacity-60">
          {isConnected ? 'Uplink Active' : 'Connecting...'}
        </span>
      </div>
    </div>
  );
};

// ─── Local Video PiP ──────────────────────────────────────────────────────────
const LocalVideoPiP = () => {
  const { localParticipant } = useLocalParticipant();
  // Get the local camera track reference
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localCameraTrack = tracks.find(t => t.participant.isLocal);

  if (!localCameraTrack) return null;

  return (
    <div className="local-pip">
      <ParticipantTile trackRef={localCameraTrack} disableSpeakingIndicator />
    </div>
  );
};

// ─── Remote Participant Tile ──────────────────────────────────────────────────
const RemoteParticipantTile = ({ trackRef }: { trackRef: any }) => (
  <div className="remote-tile">
    <ParticipantTile trackRef={trackRef} />
  </div>
);

// ─── Classroom Content (inside LiveKitRoom context) ───────────────────────────
const ClassroomContent = ({
  zoneTitle,
  zoneId,
}: {
  zoneTitle: string;
  zoneId: string | undefined;
}) => {
  const navigate = useNavigate();
  const { localParticipant } = useLocalParticipant();
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isHD, setIsHD] = useState(() => {
    const saved = localStorage.getItem('nunma_video_quality');
    if (saved) return saved === 'HD';
    return window.innerWidth >= 480;
  });
  const [isConnectionPoor, setIsConnectionPoor] = useState(false);
  const [showPoorConnToast, setShowPoorConnToast] = useState(false);

  // Duration limit state
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Stage Privacy Guard & Student Controls
  const [studentStageStatus, setStudentStageStatus] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);

  const [showToolsModal, setShowToolsModal] = useState(false);
  const [timerState, setTimerState] = useState<{ timerEndsAt: number, timerRemaining: number, timerStatus: string } | null>(null);
  const [timerMins, setTimerMins] = useState('5');
  const [timerSecs, setTimerSecs] = useState('0');

  // Poll Creation State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  useEffect(() => {
    if (!zoneId || !activeSessionId) return;
    const unsub = onSnapshot(doc(db, 'zones', zoneId, 'liveSessions', activeSessionId), (snap) => {
      if (snap.exists() && snap.data().timer) {
        setTimerState(snap.data().timer);
      } else {
        setTimerState(null);
      }
    });
    return () => unsub();
  }, [zoneId, activeSessionId]);

  const handleTimerAction = async (action: 'start' | 'pause' | 'resume' | 'cancel') => {
    try {
      const duration = (parseInt(timerMins || '0') * 60) + parseInt(timerSecs || '0');
      const manageTimerFunc = httpsCallable(functions, 'manageLiveTimer');
      await manageTimerFunc({ zoneId, sessionId: activeSessionId, action, duration });
      if (action === 'start') setShowToolsModal(false);
    } catch (e) {
      console.error('Timer action failed:', e);
      alert('Failed to update timer.');
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some(o => !o.trim()) || !zoneId || !activeSessionId || !user) return;
    try {
      const messagesRef = collection(db, 'zones', zoneId, 'liveSessions', activeSessionId, 'messages');
      await addDoc(messagesRef, {
        type: 'poll',
        text: pollQuestion,
        status: 'open',
        senderId: user.uid,
        senderName: user.name || 'Tutor',
        createdAt: serverTimestamp(),
        pollData: {
          question: pollQuestion,
          options: pollOptions,
          votes: {}
        }
      });
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowToolsModal(false);
      setShowChat(true);
    } catch (error) {
      console.error('Failed to create poll:', error);
      alert('Failed to create poll.');
    }
  };

  // Fetch active session to enforce time limits
  useEffect(() => {
    if (!zoneId) return;
    const fetchActiveSession = async () => {
      try {
        const q = query(collection(db, 'zones', zoneId, 'sessions'), where('status', '==', 'live'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const session = snap.docs[0].data();
          setActiveSessionId(snap.docs[0].id);
          if (session.duration && (session.startTime || session.createdAt)) {
            const start = new Date(session.startTime || session.createdAt);
            const end = new Date(start.getTime() + Number(session.duration) * 60000);
            setSessionEndTime(end);
          }
        }
      } catch (err) {
        console.error('Failed to fetch active session for duration limit:', err);
      }
    };
    fetchActiveSession();
  }, [zoneId]);

  // Countdown timer logic
  useEffect(() => {
    if (!sessionEndTime) return;

    const interval = setInterval(async () => {
      const now = new Date();
      const diff = sessionEndTime.getTime() - now.getTime();

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft('00:00');
        
        // Time is up, end session if tutor
        if (!isStudent && activeSessionId) {
          try {
            await updateDoc(doc(db, 'zones', zoneId!, 'sessions', activeSessionId), {
              status: 'ended',
              endedAt: serverTimestamp()
            });
          } catch (e) {
            console.error('Error ending session on timeout:', e);
          }
        }
        
        // Force disconnect and redirect
        if (localParticipant?.room) {
          localParticipant.room.disconnect();
        }
        navigate(`/zone/${zoneId}`); // Redirect everyone back to zone detail
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionEndTime, localParticipant, isStudent, activeSessionId, navigate, zoneId]);

  // Listen to student hand status
  useEffect(() => {
    if (!isStudent || !zoneId || !activeSessionId || !user?.uid) return;
    const handRef = doc(db, 'zones', zoneId, 'liveSessions', activeSessionId, 'raisedHands', user.uid);
    const unsub = onSnapshot(handRef, async (snap) => {
      if (snap.exists()) {
        const status = snap.data().status;
        setStudentStageStatus(status);
        
        if (status === 'speaking' || status === 'speaking-video') {
            try {
                if (localParticipant) {
                    await localParticipant.setMicrophoneEnabled(true);
                    if (status === 'speaking-video') {
                        await localParticipant.setCameraEnabled(true);
                    } else {
                        await localParticipant.setCameraEnabled(false);
                    }
                }
                setPermissionError(false);
            } catch (e) {
                console.warn('Browser permission denied:', e);
                setPermissionError(true);
            }
        }
      } else {
        setStudentStageStatus(null);
        setPermissionError(false);
        // Force unpublish if not on stage
        if (localParticipant) {
            localParticipant.setMicrophoneEnabled(false);
            localParticipant.setCameraEnabled(false);
        }
      }
    });
    return () => unsub();
  }, [isStudent, zoneId, activeSessionId, user?.uid, localParticipant]);

  // Privacy Guard: Auto-unpublish if tutor disconnects
  useEffect(() => {
      if (!isStudent || !localParticipant?.room || !zoneId || !activeSessionId || !user?.uid) return;
      const room = localParticipant.room;
      
      const checkTutorPresence = async () => {
          // If room is completely empty of remote participants or no tutor is found
          // (Wait, checking role via server metadata is safer, but we can assume if there are participants publishing, one is tutor.
          // Better: simply assume if remoteParticipants size is 0, tutor is gone).
          if (room.remoteParticipants.size === 0 && studentStageStatus) {
              // Auto-lower hand and mute
              localParticipant.setMicrophoneEnabled(false);
              localParticipant.setCameraEnabled(false);
              try {
                  const handRef = doc(db, 'zones', zoneId, 'liveSessions', activeSessionId, 'raisedHands', user.uid);
                  await deleteDoc(handRef);
              } catch (e) {
                  // Ignore
              }
          }
      };

      room.on(RoomEvent.ParticipantDisconnected, checkTutorPresence);
      return () => { room.off(RoomEvent.ParticipantDisconnected, checkTutorPresence); };
  }, [localParticipant, isStudent, studentStageStatus, zoneId, activeSessionId, user?.uid]);

  // All tracks except local participant tracks
  const allTracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false }
  );
  const remoteTracks = allTracks.filter(t => !t.participant.isLocal);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Connection quality monitoring
  useEffect(() => {
    if (!localParticipant?.room) return;
    const room = localParticipant.room;
    const onQualityChanged = (quality: any, participant: any) => {
      if (participant === localParticipant) {
        if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.VeryPoor) {
          setIsConnectionPoor(true);
          setShowPoorConnToast(true);
          setTimeout(() => setShowPoorConnToast(false), 5000);
        } else if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) {
          setIsConnectionPoor(false);
        }
      }
    };
    room.on(RoomEvent.ConnectionQualityChanged, onQualityChanged);
    return () => room.off(RoomEvent.ConnectionQualityChanged, onQualityChanged);
  }, [localParticipant]);

  // Mobile: only show screen share + active speaker
  const displayedTracks = isMobile
    ? remoteTracks.filter(t =>
        t.source === Track.Source.ScreenShare || t.participant.isSpeaking
      ).slice(0, 1)
    : remoteTracks;

  // Fallback: show first remote participant on mobile if none match filter
  const finalTracks =
    isMobile && displayedTracks.length === 0 && remoteTracks.length > 0
      ? [remoteTracks[0]]
      : displayedTracks;

  const moreCount = remoteTracks.length - finalTracks.length;
  const [showChat, setShowChat] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  return (
    <div className="classroom-layout">
      {/* Top Bar */}
      <header className="classroom-top-bar">
        <div className="flex items-center gap-4">
          <h1 className="classroom-zone-title">{zoneTitle || 'Live Session'}</h1>
          <button
            className={`quality-toggle ${isHD ? 'hd' : ''}`}
            onClick={() => {
              const next = !isHD;
              setIsHD(next);
              localStorage.setItem('nunma_video_quality', next ? 'HD' : 'SD');
            }}
          >
            {isHD ? <Zap size={14} /> : <ZapOff size={14} />}
            <span>{isHD ? 'HD' : 'SD'}</span>
          </button>
          {timeLeft && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-white font-black text-[11px] uppercase tracking-widest ml-4">
              <Clock size={14} className="text-red-500" />
              <span className={timeLeft.startsWith('00') ? 'text-red-500' : ''}>{timeLeft}</span>
            </div>
          )}
        </div>
        <ConnectionStatus />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {showWhiteboard ? (
          <main className="flex-1 relative bg-white">
            <LiveWhiteboard
              zoneId={zoneId!}
              isTutor={!isStudent}
            />
          </main>
        ) : (
          <main className="classroom-grid custom-scrollbar flex-1">
            {remoteTracks.length === 0 ? (
              <div className="classroom-empty-state">
                <div
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    border: '2px solid rgba(194,245,117,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Video size={24} color="#c2f575" />
                </div>
                <p className="text-[11px] uppercase tracking-widest font-black text-gray-500">
                  Waiting for participants...
                </p>
              </div>
            ) : (
              <div className="participants-grid">
                {finalTracks.map(track => (
                  <RemoteParticipantTile
                    key={`${track.participant.sid}-${track.source}`}
                    trackRef={track}
                  />
                ))}
                {isMobile && moreCount > 0 && (
                  <div className="more-pill">
                    <span className="font-black text-2xl">+{moreCount}</span>
                    <span className="text-[10px] uppercase tracking-tighter opacity-70">
                      More Nodes
                    </span>
                  </div>
                )}
              </div>
            )}
          </main>
        )}

        {/* Engagement Sidebar */}
        {showChat && activeSessionId && (
          <aside className="chat-sidebar">
            <div className="chat-header">
              <h3 className="text-sm font-black text-[#c2f575] uppercase tracking-widest">Classroom Panel</h3>
              <button onClick={() => setShowChat(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="chat-container relative">
              <EngagementSidebar sessionId={activeSessionId} />
            </div>
          </aside>
        )}
      </div>

      {/* Student Stage Status Overlay */}
      {isStudent && studentStageStatus?.startsWith('calling') && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
          <div className="w-20 h-20 bg-[#c2f575]/20 rounded-full flex items-center justify-center mb-6 animate-pulse border border-[#c2f575]/50">
            {studentStageStatus === 'calling-video' ? <Video size={40} className="text-[#c2f575]" /> : <Mic size={40} className="text-[#c2f575]" />}
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
            {studentStageStatus === 'calling-video' ? "You're being called to video stage..." : "You're being called to speak..."}
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Please wait while we set up your connection. You will be prompted to allow browser permissions shortly.
          </p>
        </div>
      )}

      {/* Permission Error Overlay */}
      {isStudent && permissionError && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
            Browser Permission Required
          </h2>
          <p className="text-gray-300 max-w-md mx-auto mb-8">
            The tutor has invited you to the stage, but your browser blocked access to your microphone or camera. Please click allow when prompted.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={async () => {
                 try {
                     if (localParticipant) {
                         await localParticipant.setMicrophoneEnabled(true);
                         if (studentStageStatus === 'speaking-video') {
                             await localParticipant.setCameraEnabled(true);
                         } else {
                             await localParticipant.setCameraEnabled(false);
                         }
                     }
                     setPermissionError(false);
                 } catch (e) {
                     console.warn('Still denied:', e);
                 }
              }}
              className="bg-[#c2f575] text-[#0a0a0a] px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Try Again
            </button>
            <button 
              onClick={async () => {
                 setPermissionError(false);
                 try {
                     if (activeSessionId && zoneId && user?.uid) {
                         const handRef = doc(db, 'zones', zoneId, 'liveSessions', activeSessionId, 'raisedHands', user.uid);
                         await deleteDoc(handRef);
                     }
                 } catch (e) {}
              }}
              className="bg-white/10 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-colors border border-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tools Modal (Tutor Only) */}
      {!isStudent && showToolsModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-[2rem] w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2"><Wrench size={24} className="text-[#c2f575]" /> Instructor Tools</h2>
              <button onClick={() => setShowToolsModal(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              {/* Timer Control */}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4"><Timer size={16} className="text-purple-400" /> Session Timer</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Everyone can see and control the timer (Tutor only)</p>
                
                {timerState && timerState.timerStatus !== 'stopped' ? (
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleTimerAction(timerState.timerStatus === 'paused' ? 'resume' : 'pause')}
                      className="flex-1 py-3 bg-purple-500 text-white font-black uppercase text-xs rounded-xl hover:bg-purple-600 transition-colors"
                    >
                      {timerState.timerStatus === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                      onClick={() => handleTimerAction('cancel')}
                      className="flex-1 py-3 bg-white/10 text-white font-black uppercase text-xs rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Minutes</label>
                        <input type="number" value={timerMins} onChange={e => setTimerMins(e.target.value)} min="0" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Seconds</label>
                        <input type="number" value={timerSecs} onChange={e => setTimerSecs(e.target.value)} min="0" max="59" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500" />
                      </div>
                    </div>
                    <button 
                      onClick={() => handleTimerAction('start')}
                      className="w-full py-3 bg-purple-500 text-white font-black uppercase text-xs rounded-xl hover:bg-purple-600 transition-colors"
                    >
                      Start Timer
                    </button>
                  </>
                )}
              </div>

              {/* Poll Creation */}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4"><MessageSquare size={16} className="text-[#c2f575]" /> Create Poll</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Polls appear directly in the chat feed</p>
                
                <div className="space-y-3 mb-4">
                  <input 
                    type="text" 
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#c2f575]" 
                  />
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={e => {
                          const newOpts = [...pollOptions];
                          newOpts[idx] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#c2f575]" 
                      />
                      {idx > 1 && (
                        <button onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="px-3 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-bold text-[#c2f575] flex items-center gap-1 hover:underline">
                      <Plus size={14} /> Add Option
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={handleCreatePoll}
                  disabled={!pollQuestion.trim() || pollOptions.some(o => !o.trim())}
                  className="w-full py-3 bg-[#c2f575] text-[#0a0a0a] font-black uppercase text-xs rounded-xl hover:bg-[#aee65c] transition-colors disabled:opacity-50"
                >
                  Create Poll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local PiP */}
      <LocalVideoPiP />

      {/* Bottom Controls */}
      <footer className="classroom-bottom-bar">
        <div className="controls-group">
          <TrackToggle source={Track.Source.Microphone} className="control-btn">
            {({ enabled }) => enabled ? <Mic size={20} /> : <MicOff size={20} />}
          </TrackToggle>

          <TrackToggle source={Track.Source.Camera} className="control-btn">
            {({ enabled }) => enabled ? <Video size={20} /> : <VideoOff size={20} />}
          </TrackToggle>

          {!isMobile && (
            <TrackToggle source={Track.Source.ScreenShare} className="control-btn">
              {({ enabled }) => <Monitor size={20} style={{ color: enabled ? '#c2f575' : 'white' }} />}
            </TrackToggle>
          )}

          <button
            className={`control-btn ${showWhiteboard ? 'lk-button-active' : ''}`}
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            title="Toggle Whiteboard"
          >
            <Presentation size={20} />
          </button>

          {!isStudent && (
             <button
               className={`control-btn ${showToolsModal ? 'lk-button-active' : ''}`}
               onClick={() => setShowToolsModal(true)}
               title="Instructor Tools"
             >
               <Wrench size={20} />
             </button>
          )}

          <button 
            className={`control-btn ${showChat ? 'lk-button-active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="Toggle Chat"
          >
            <MessageSquare size={20} />
          </button>

          <button
            className="control-btn leave-btn"
            onClick={() => navigate(`/zones/${zoneId}`)}
          >
            <LogOut size={20} />
          </button>
        </div>
      </footer>

      {/* Poor Connection Toast */}
      {showPoorConnToast && (
        <div
          style={{
            position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#ef4444', color: 'white', borderRadius: 16,
            padding: '12px 20px', display: 'flex', alignItems: 'center',
            gap: 16, zIndex: 1000, boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          <p className="font-black text-[11px] uppercase tracking-widest">
            Poor connection — video paused to preserve audio
          </p>
          <button onClick={() => setShowPoorConnToast(false)} style={{ opacity: 0.6 }}>
            <X size={14} />
          </button>
        </div>
      )}

      <style>{`
        .classroom-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          background: #0a0a0a;
          color: #fcfcfc;
          overflow: hidden;
          position: relative;
        }
        .classroom-top-bar {
          height: 64px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(10,10,10,0.85);
          backdrop-filter: blur(20px);
          z-index: 10;
          flex-shrink: 0;
        }
        .classroom-zone-title {
          font-size: 0.875rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #c2f575;
          margin: 0;
          text-transform: uppercase;
        }
        .quality-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 8px 14px;
          border-radius: 12px;
          color: white;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 40px;
        }
        .quality-toggle.hd { color: #c2f575; border-color: rgba(194,245,117,0.3); }
        .classroom-grid {
          flex: 1;
          padding: clamp(12px, 3vw, 24px);
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .participants-grid {
          display: grid;
          gap: 16px;
          width: 100%;
          max-width: 1400px;
          grid-template-columns: repeat(1, 1fr);
        }
        @media (min-width: 768px) {
          .participants-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .participants-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .remote-tile {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #1a1a1a;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .remote-tile .lk-participant-tile {
          height: 100%;
          width: 100%;
        }
        .classroom-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }
        .more-pill {
          aspect-ratio: 16 / 9;
          background: rgba(194,245,117,0.05);
          border: 1px dashed rgba(194,245,117,0.3);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #c2f575;
          gap: 4px;
        }
        .classroom-bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(to top, rgba(0,0,0,0.95), transparent);
          padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
          z-index: 100;
          flex-shrink: 0;
        }
        .controls-group {
          display: flex;
          gap: 12px;
          background: rgba(20,20,20,0.9);
          padding: 8px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .control-btn {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          background: rgba(255,255,255,0.07);
          color: white;
          transition: all 0.2s;
          touch-action: manipulation;
        }
        .control-btn:hover { background: rgba(255,255,255,0.12); transform: translateY(-2px); }
        .control-btn:active { transform: scale(0.92); }
        .control-btn[data-lk-active="true"], .control-btn.lk-button-active {
          background: #c2f575 !important;
          color: #0a0a0a !important;
        }
        .leave-btn { background: #ef4444 !important; color: white !important; }
        .leave-btn:hover { background: #dc2626 !important; box-shadow: 0 0 20px rgba(239,68,68,0.4); }
        .local-pip {
          position: fixed;
          bottom: 90px;
          right: 24px;
          width: 180px;
          height: 135px;
          border-radius: 14px;
          overflow: hidden;
          background: #1a1a1a;
          border: 2px solid #c2f575;
          box-shadow: 0 16px 40px rgba(0,0,0,0.7);
          z-index: 50;
        }
        .local-pip .lk-participant-tile {
          height: 100%;
          width: 100%;
        }
        .chat-sidebar {
          width: 320px;
          background: rgba(20,20,20,0.85);
          border-left: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          border-radius: 20px 0 0 20px;
          margin-top: 16px;
          overflow: hidden;
          backdrop-filter: blur(20px);
        }
        .chat-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chat-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .chat-container .lk-chat {
          height: 100%;
          background: transparent;
          border: none;
        }
        @media (max-width: 767px) {
          .controls-group { grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px; border-radius: 28px; }
          .control-btn { width: 56px; height: 56px; }
          .local-pip { bottom: 170px; right: 16px; width: 120px; height: 90px; }
          .chat-sidebar {
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            width: 100%; border-radius: 0; margin-top: 0;
            z-index: 60;
          }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(194,245,117,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(194,245,117,0.3); }
      `}</style>
    </div>
  );
};

// ─── Global Timer Display Subcomponent ─────────────────────────────────────────
const GlobalTimerDisplay = ({ timerState, isTutor, onOpenTools }: { timerState: any, isTutor: boolean, onOpenTools: () => void }) => {
  const [display, setDisplay] = useState('');
  const [isZero, setIsZero] = useState(false);

  useEffect(() => {
    if (!timerState || timerState.timerStatus === 'stopped') {
      setDisplay('');
      return;
    }

    const interval = setInterval(() => {
      let remaining = 0;
      if (timerState.timerStatus === 'paused') {
        remaining = timerState.timerRemaining;
      } else if (timerState.timerStatus === 'running') {
        remaining = Math.max(0, timerState.timerEndsAt - Date.now());
      }
      
      if (remaining <= 0) {
        setDisplay('00:00');
        setIsZero(true);
      } else {
        setIsZero(false);
        const totalSecs = Math.floor(remaining / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        setDisplay(`${m}:${s.toString().padStart(2, '0')}`);
      }
    }, 500);

    // Run once immediately
    let r = 0;
    if (timerState.timerStatus === 'paused') r = timerState.timerRemaining;
    else if (timerState.timerStatus === 'running') r = Math.max(0, timerState.timerEndsAt - Date.now());
    if (r <= 0) { setDisplay('00:00'); setIsZero(true); }
    else {
        const totalSecs = Math.floor(r / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        setDisplay(`${m}:${s.toString().padStart(2, '0')}`);
        setIsZero(false);
    }

    return () => clearInterval(interval);
  }, [timerState]);

  if (!display) return null;

  return (
    <div 
      onClick={() => isTutor && onOpenTools()}
      className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm transition-all ${isTutor ? 'cursor-pointer hover:scale-105' : ''} ${
        isZero ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
      }`}
      title={isTutor ? "Timer Controls" : "Time Remaining"}
    >
      <Timer size={16} />
      <span className="min-w-[40px] text-center">{display}</span>
    </div>
  );
};

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100vh', width: '100vw', background: '#0a0a0a',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
          }}
        >
          <AlertCircle size={48} color="#ef4444" />
          <h2 style={{ color: '#ef4444', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
            Module Signal Lost
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 400, fontSize: '0.9rem' }}>
            Something went wrong while loading this infrastructure module. Our systems have logged the incident.
          </p>
          <div
            style={{
              background: '#1a1a1a', border: '1px solid rgba(255,0,0,0.2)',
              borderRadius: 12, padding: '12px 20px', maxWidth: 600,
            }}
          >
            <p style={{ color: '#f87171', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              {this.state.error}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, background: '#c2f575', color: '#052E16',
              border: 'none', padding: '14px 28px', borderRadius: 12,
              fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Re-Initiate System
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ClassroomPage: React.FC = () => {
  const { zoneId } = useParams<{ zoneId: string }>();
  const { user } = useAuth();
  const { isSidebarOpen } = useSidebar();
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(import.meta.env.VITE_LIVEKIT_URL || '');
  const [zoneTitle, setZoneTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [roomKey, setRoomKey] = useState(0);
  const reconnectAttempts = useRef(0);

  const handleDisconnect = (reason?: any) => {
    const reasonStr = typeof reason === 'string' ? reason : String(reason ?? '');
    
    if (reasonStr === 'leave') {
      if (user?.role === 'THALA' || user?.role === 'TUTOR') {
        navigate('/workplace');
      } else {
        navigate(`/classroom/zone/${zoneId}`);
      }
      return;
    }

    if (reconnectAttempts.current < 3) {
      setIsReconnecting(true);
      reconnectAttempts.current += 1;
      setTimeout(() => {
        setRoomKey(prev => prev + 1);
        setIsReconnecting(false);
      }, 2000);
    } else {
      setError('Connection lost after multiple attempts. Please check your network.');
    }
  };

  useEffect(() => {
    const initPage = async () => {
      if (!zoneId || !user?.uid) return;
      setLoading(true);
      setError(null);
      try {
        const [tokenResult, zoneSnap] = await Promise.all([
          httpsCallable(functions!, 'generateLiveToken')({ zoneId, sessionId: zoneId }),
          getDoc(doc(db!, 'zones', zoneId)),
        ]);
        const data = tokenResult.data as any;
        setToken(data.token);
        // Use the backend provided serverUrl to ensure token signature matches
        setServerUrl(data.serverUrl || import.meta.env.VITE_LIVEKIT_URL);
        if (zoneSnap.exists()) setZoneTitle(zoneSnap.data().title);
      } catch (err: any) {
        console.error('Initialization failed:', err);
        setError(err?.message || err?.code || 'Failed to initialize classroom. Please check your enrollment.');
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [zoneId, user?.uid]);

  // ── Loading Screen ──
  if (loading) {
    return (
      <div
        style={{
          height: '100vh', width: '100vw', background: '#0a0a0a',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 24,
        }}
      >
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <div
            style={{
              position: 'absolute', inset: 0,
              border: '4px solid rgba(194,245,117,0.1)',
              borderTop: '4px solid #c2f575',
              borderRadius: '50%',
              animation: 'lk-spin 1s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute', top: 15, left: 15, width: 50, height: 50,
              border: '4px solid rgba(194,245,117,0.05)',
              borderBottom: '4px solid #c2f575',
              borderRadius: '50%',
              animation: 'lk-spin-rev 1.5s linear infinite',
            }}
          />
        </div>
        <p
          style={{
            color: '#c2f575', fontSize: '0.75rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.8,
          }}
        >
          Synchronizing Knowledge Stream...
        </p>
        <style>{`
          @keyframes lk-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes lk-spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        `}</style>
      </div>
    );
  }

  // ── Error Screen ──
  if (error) {
    return (
      <div
        style={{
          height: '100vh', width: '100vw', background: '#0a0a0a',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
        }}
      >
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ color: '#ef4444', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
          Uplink Interrupted
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 400, fontSize: '0.9rem' }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 12, background: '#c2f575', color: '#052E16',
            border: 'none', padding: '16px 32px', borderRadius: 12,
            fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
            letterSpacing: '0.05em', fontSize: '0.8rem',
            transition: 'all 0.2s',
          }}
        >
          Re-attempt Connection
        </button>
      </div>
    );
  }

  // ── Live Room ──
  return (
    <>
      <LiveKitRoom
        key={roomKey}
        token={token ?? undefined}
        serverUrl={serverUrl}
        connect={!!token && !!serverUrl}
        audio={true}
        video={true}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            simulcast: true,
            videoSimulcastLayers: [
              VideoPresets.h720.encoding,
              VideoPresets.h360.encoding,
              VideoPresets.h180.encoding,
            ],
          },
        }}
        onDisconnected={handleDisconnect}
        onError={(err) => console.error('LiveKit room error:', err)}
        style={{ height: '100%' }}
      >
        <RoomAudioRenderer />
        <ErrorBoundary>
          <ClassroomContent zoneTitle={zoneTitle} zoneId={zoneId} />
        </ErrorBoundary>
      </LiveKitRoom>

      {isReconnecting && (
        <div
          style={{
            position: 'fixed',
            top: 0, right: 0, bottom: 0,
            left: isSidebarOpen ? 240 : 64,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div style={{ textAlign: 'center', color: '#c2f575' }}>
            <Loader2
              size={40}
              style={{ animation: 'lk-spin 1s linear infinite', marginBottom: 16 }}
            />
            <h2 style={{ margin: '0 0 8px', fontWeight: 900 }}>Restoring Uplink...</h2>
            <p style={{ opacity: 0.6 }}>Attempt {reconnectAttempts.current} of 3</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ClassroomPage;
