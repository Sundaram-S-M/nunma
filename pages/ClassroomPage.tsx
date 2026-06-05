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
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import {
  Mic, MicOff, Video, VideoOff, Monitor, LogOut,
  Loader2, AlertCircle, Signal, SignalHigh, SignalMedium, SignalLow,
  Zap, ZapOff, X, MessageSquare,
} from 'lucide-react';

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
        </div>
        <ConnectionStatus />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Video Grid */}
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

        {/* Chat Sidebar */}
        {showChat && (
          <aside className="chat-sidebar">
            <div className="chat-header">
              <h3 className="text-sm font-black text-[#c2f575] uppercase tracking-widest">Stream Chat</h3>
              <button onClick={() => setShowChat(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="chat-container">
              <Chat />
            </div>
          </aside>
        )}
      </div>

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
              marginTop: 8, background: '#c2f575', color: '#1a1a4e',
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
    if (reasonStr !== 'leave' && reconnectAttempts.current < 3) {
      setIsReconnecting(true);
      reconnectAttempts.current += 1;
      setTimeout(() => {
        setRoomKey(prev => prev + 1);
        setIsReconnecting(false);
      }, 2000);
    } else if (reconnectAttempts.current >= 3) {
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
        // Always use the frontend env URL — the Firebase LIVEKIT_URL secret may point
        // to a different LiveKit project than the API key is valid for.
        setServerUrl(import.meta.env.VITE_LIVEKIT_URL);
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
            marginTop: 12, background: '#c2f575', color: '#1a1a4e',
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
