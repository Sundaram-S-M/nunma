import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import { Track, LocalAudioTrack, RoomEvent, ConnectionState } from 'livekit-client';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from './ChatSidebar';
import Toast, { ToastType } from './Toast';
import { useGeminiQuiz } from '../utils/useGeminiQuiz';
import {
  Sparkles,
  MessageSquare,
  Hand,
  Smile,
  Users as UsersIcon,
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  X,
  Monitor,
  LayoutGrid,
  MoreVertical,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import '@livekit/components-styles';

const LiveRoom: React.FC = () => {
  const { zoneId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const { isGenerating, startCapture, stopAndGenerate } = useGeminiQuiz(zoneId || '', sessionId || '');

  useEffect(() => {
    const fetchToken = async () => {
      console.log("LiveRoom: Attempting to fetch token...", { zoneId, sessionId, userRole: user?.role });
      if (!zoneId || !sessionId || !user) {
        console.warn("LiveRoom: Missing zoneId, sessionId or user", { zoneId, sessionId, user: !!user });
        return;
      }

      // Check if Firebase Functions are configured
      if (!functions) {
        console.error("LiveRoom: Firebase Functions not configured.");
        setError("Live streaming requires Firebase configuration. Please create a .env file with your Firebase credentials.");
        return;
      }

      try {
        console.log("LiveRoom: Calling re-wired generateLiveKitToken...");

        const response = await fetch('https://us-central1-nunma-by-cursor.cloudfunctions.net/generateLiveKitToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: `${zoneId}-${sessionId}`,
            role: user.role,
            userId: user.uid,
            userName: user.name
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("LiveRoom: Token received via re-wire");
        setToken(data.token);
      } catch (err: any) {
        console.error("LiveRoom: Token fetch failed:", err);

        // Attempt diagnostic check via fetch
        fetch('https://us-central1-nunma-by-cursor.cloudfunctions.net/checkLiveKitConfig')
          .then(r => r.json())
          .then(diag => console.warn("LiveRoom: Server Diagnostic:", diag))
          .catch(diagErr => console.error("LiveRoom: Diagnostic failed:", diagErr));

        setError(err.message || 'Failed to join live session. Please check your connection.');
      }
    };

    fetchToken();
  }, [zoneId, sessionId, user]);

  const handleMediaError = useCallback((err: Error) => {
    console.error("Media Error:", err);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      setToast({
        message: "Camera/Microphone access denied. Please enable them to participate.",
        type: 'error'
      });
    } else {
      setToast({
        message: `Connection Error: ${err.message}`,
        type: 'warning'
      });
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1A4E] flex items-center justify-center p-6 text-center">
        <div className="bg-white/5 backdrop-blur-xl p-12 rounded-[3rem] border border-white/10 max-w-md">
          <h2 className="text-white text-3xl font-black mb-6">Access Denied</h2>
          <p className="text-gray-400 mb-10">{error}</p>
          <button onClick={() => navigate(-1)} className="bg-[#c2f575] text-[#1A1A4E] px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Back to Hub</button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#1A1A4E] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#c2f575] font-black uppercase tracking-[0.3em] text-[10px]">Establishing Secure Stream...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1A4E] overflow-hidden flex flex-col font-inter">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <LiveKitRoom
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880'}
        audio={true}
        video={user?.role === 'TUTOR'}
        connect={true}
        className="flex-1 flex flex-col relative"
        onDisconnected={() => {
          navigate(-1);
        }}
        onError={handleMediaError}
      >
        <RoomContent
          zoneId={zoneId!}
          sessionId={sessionId!}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isGenerating={isGenerating}
          startCapture={startCapture}
          stopAndGenerate={stopAndGenerate}
          setToast={setToast}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

interface RoomContentProps {
  zoneId: string;
  sessionId: string;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isGenerating: boolean;
  startCapture: (stream: MediaStream) => void;
  stopAndGenerate: () => void;
  setToast: (toast: { message: string; type: ToastType } | null) => void;
}

const RoomContent: React.FC<RoomContentProps> = ({
  zoneId,
  sessionId,
  isChatOpen,
  setIsChatOpen,
  isGenerating,
  startCapture,
  stopAndGenerate,
  setToast
}) => {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showParticipants, setShowParticipants] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    if (!zoneId || !sessionId || !db) return;
    const unsub = onSnapshot(doc(db, 'zones', zoneId, 'sessions', sessionId), (doc) => {
      if (doc.exists()) {
        setActiveSession({ id: doc.id, ...doc.data() });
      }
    });
    return () => unsub();
  }, [sessionId, zoneId]);

  // Sync Attendance & Start Capture
  useEffect(() => {
    if (user && zoneId && sessionId) {
      if (db) {
        setDoc(doc(db, `zones/${zoneId}/sessions/${sessionId}/attendance`, user.uid), {
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          joinedAt: serverTimestamp(),
          status: 'Present'
        });
      }

      if (user.role === 'TUTOR' && localParticipant) {
        const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
        if (audioTrack?.track instanceof LocalAudioTrack && audioTrack.track.mediaStream) {
          startCapture(audioTrack.track.mediaStream);
        }
      }
    }
  }, [user, localParticipant, zoneId, sessionId, startCapture]);

  const toggleHandRaise = async () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    await localParticipant.setAttributes({ raisedHand: newState ? 'true' : 'false' });
  };

  const toggleScreenShare = async () => {
    try {
      const isEnabled = !isScreenSharing;
      await localParticipant.setScreenShareEnabled(isEnabled);
      setIsScreenSharing(isEnabled);
    } catch (err: any) {
      console.error("Screen Share Error:", err);
      setToast({
        message: "Screen sharing failed. Please check browser permissions.",
        type: 'warning'
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040457]">
      {/* BBB-Style Header */}
      <div className="h-16 bg-[#1A1A4E] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="w-[1px] h-6 bg-white/10 mx-2" />
          <div>
            <h1 className="text-white font-black text-sm tracking-tight">{activeSession?.title || 'Live Knowledge Stream'}</h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Live Session </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user?.role === 'TUTOR' && (
            <button
              onClick={stopAndGenerate}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${isGenerating ? 'bg-gray-600 text-gray-400' : 'bg-[#c2f575] text-[#1A1A4E] hover:scale-105 shadow-lg shadow-[#c2f575]/10'
                }`}
            >
              <Sparkles size={14} /> {isGenerating ? 'AI Analyzing...' : 'Quiz'}
            </button>
          )}
          <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
            <UsersIcon size={12} className="text-[#c2f575]" />
            <span className="text-[9px] font-black text-white">{participants.length}</span>
          </div>
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (BBB Style) */}
        <div className={`flex transition-all duration-300 ease-in-out ${isChatOpen ? 'w-80' : 'w-0'} bg-[#1A1A4E] border-r border-white/5 relative overflow-hidden`}>
          <div className="w-80 flex flex-col h-full">
            <ChatSidebar
              zoneId={zoneId}
              sessionId={sessionId}
              isOpen={true}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        </div>

        {/* Main Viewing Area */}
        <main className="flex-1 relative flex bg-black overflow-hidden flex-col">
          <div className="flex-1 relative bg-black/40">
            <VideoConference />

            {/* Raised Hands Overlay */}
            <div className="absolute top-6 left-6 z-[60] flex flex-col gap-3 pointer-events-none">
              {participants.filter(p => p.attributes.raisedHand === 'true').map(p => (
                <div key={p.identity} className="bg-[#c2f575] text-[#1A1A4E] px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl animate-in slide-in-from-left duration-300 pointer-events-auto">
                  <Hand size={14} fill="currentColor" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{p.name || p.identity} raised hand</span>
                </div>
              ))}
            </div>

            {/* Sidebar Toggle Button (Inside Main Area) */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`absolute top-1/2 -translate-y-1/2 left-0 z-[100] p-1 bg-[#1A1A4E] text-white border border-white/10 rounded-r-xl transition-all ${isChatOpen ? 'opacity-0' : 'opacity-100'}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* BBB Centered Control Bar (Docked) */}
          <div className="h-24 bg-[#1A1A4E] border-t border-white/5 flex items-center justify-center gap-4 px-8 shrink-0 relative z-[100]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
                className={`p-5 rounded-2xl transition-all ${!localParticipant.isMicrophoneEnabled ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                {localParticipant.isMicrophoneEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </button>

              <button
                onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)}
                className={`p-5 rounded-2xl transition-all ${!localParticipant.isCameraEnabled ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                {localParticipant.isCameraEnabled ? <VideoIcon size={24} /> : <VideoOff size={24} />}
              </button>

              <div className="w-[1px] h-8 bg-white/10 mx-2" />

              <button
                onClick={toggleScreenShare}
                className={`p-5 rounded-2xl transition-all ${isScreenSharing ? 'bg-[#c2f575] text-[#1A1A4E] shadow-xl shadow-[#c2f575]/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
                title="Share Screen"
              >
                <Monitor size={24} />
              </button>

              <button
                onClick={toggleHandRaise}
                className={`p-5 rounded-2xl transition-all ${isHandRaised ? 'bg-orange-500 text-white animate-bounce' : 'bg-white/5 text-white hover:bg-white/10'}`}
                title="Raise Hand"
              >
                <Hand size={24} fill={isHandRaised ? "currentColor" : "none"} />
              </button>

              <button className="p-5 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-all" title="Actions">
                <LayoutGrid size={24} />
              </button>

              <div className="w-[1px] h-8 bg-white/10 mx-2" />

              <div className="relative group">
                <button className="p-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all shadow-xl shadow-red-600/20">
                  <LogOut size={24} />
                </button>
                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-[#1A1A4E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]">
                  <button onClick={() => navigate(-1)} className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-white hover:bg-white/5 transition-colors border-b border-white/5">
                    Leave session
                  </button>
                  {user?.role === 'TUTOR' && (
                    <button onClick={() => navigate(-1)} className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-colors">
                      End session for all
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BBB Bottom-Right Icons */}
            <div className="absolute right-8 flex items-center gap-4">
              <button className="p-3 text-gray-400 hover:text-white transition-colors">
                <Settings size={20} />
              </button>
              <button className="p-3 text-gray-400 hover:text-white transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        </main>

        {/* Participant Toggle Button Overlay (Floating) */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="absolute top-20 left-6 z-[110] p-4 bg-[#c2f575] text-[#1A1A4E] rounded-2xl shadow-2xl hover:scale-105 transition-all"
          >
            <MessageSquare size={20} />
          </button>
        )}
      </div>
    </div>
  );
};


export default LiveRoom;
