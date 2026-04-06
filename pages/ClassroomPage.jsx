import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LiveKitRoom, 
  useTracks, 
  useParticipantInfo, 
  useLocalParticipant,
  RoomAudioRenderer,
  ConnectionState,
  useConnectionState,
  TrackToggle,
  DisconnectButton,
  ParticipantTile,
  ParticipantContext,
  useRemoteParticipants
} from '@livekit/components-react';
import { Track, ConnectionQuality } from 'livekit-client';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, functions } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, LogOut, 
  Loader2, AlertCircle, Signal, SignalHigh, SignalMedium, SignalLow,
  Zap, ZapOff
} from 'lucide-react';

const NetworkQualityIndicator = () => {
  const { localParticipant } = useLocalParticipant();
  const quality = localParticipant?.connectionQuality;

  const getIcon = () => {
    switch (quality) {
      case ConnectionQuality.Excellent:
      case ConnectionQuality.Good:
        return <SignalHigh size={18} color="#22c55e" />;
      case ConnectionQuality.Poor:
        return <SignalMedium size={18} color="#f59e0b" />;
      case ConnectionQuality.VeryPoor:
        return <SignalLow size={18} color="#ef4444" />;
      default:
        return <Signal size={18} color="rgba(255,255,255,0.3)" />;
    }
  };

  return (
    <div className="quality-indicator" title={`Quality: ${quality}`}>
      {getIcon()}
    </div>
  );
};

const RemoteParticipantTile = ({ trackReference }) => {
  return (
    <div className="remote-tile">
      <ParticipantTile {...trackReference} />
      <style>{`
        .remote-tile {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #1a1a1a;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .remote-tile .lk-participant-tile {
          height: 100%;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

const ConnectionStatus = () => {
  const status = useConnectionState();
  const isConnected = status === ConnectionState.Connected;

  return (
    <div className="flex items-center gap-3">
      <NetworkQualityIndicator />
      <div className="flex items-center gap-2">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="text-[10px] uppercase tracking-widest font-black opacity-60">
          {isConnected ? 'Uplink Active' : 'Disconnected'}
        </span>
      </div>
      <style>{`
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
        }
        .status-dot.connected {
          background-color: #22c55e;
          color: rgba(34, 197, 94, 0.5);
        }
        .status-dot.disconnected {
          background-color: #ef4444;
          color: rgba(239, 68, 68, 0.5);
        }
      `}</style>
    </div>
  );
};

const ClassroomContent = ({ zoneTitle, zoneId }) => {
  const navigate = useNavigate();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlyRemote: true });
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isHD, setIsHD] = useState(() => {
    const saved = localStorage.getItem('nunma_video_quality');
    if (saved) return saved === 'HD';
    return window.innerWidth >= 480;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setVideoQuality(isHD ? 'high' : 'low');
      localStorage.setItem('nunma_video_quality', isHD ? 'HD' : 'SD');
    }
  }, [isHD, localParticipant]);

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Filter out the local participant
  const remoteTracks = tracks.filter(track => track.participant.sid !== localParticipant.sid);
  
  // Mobile limitation: Max 4 tiles
  const displayedTracks = isMobile ? remoteTracks.slice(0, 4) : remoteTracks;
  const moreCount = remoteTracks.length - displayedTracks.length;

  return (
    <div className="classroom-layout">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="flex items-center gap-4">
          <h1 className="zone-title">{zoneTitle || 'Knowledge Stream'}</h1>
          <button 
            className={`quality-toggle ${isHD ? 'hd' : 'sd'}`}
            onClick={() => { vibrate(); setIsHD(!isHD); }}
          >
            {isHD ? <Zap size={14} /> : <ZapOff size={14} />}
            <span>{isHD ? 'HD' : 'SD'}</span>
          </button>
        </div>
        <ConnectionStatus />
      </header>

      {/* Main Grid */}
      <main className="grid-container custom-scrollbar">
        {remoteTracks.length === 0 ? (
          <div className="empty-state">
            <p className="text-gray-500 uppercase tracking-widest text-[10px] font-black opacity-40">Waiting for connections...</p>
          </div>
        ) : (
          <div className="participants-grid">
            {displayedTracks.map((track) => (
              <RemoteParticipantTile key={track.participant.sid + track.source} trackReference={track} />
            ))}
            {isMobile && moreCount > 0 && (
              <div className="more-pill">
                <span className="font-black">+{moreCount}</span>
                <span className="text-[10px] uppercase tracking-tighter opacity-70">Active Nodes</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Local PiP */}
      <div className="local-pip">
        <ParticipantTile participant={localParticipant} source={Track.Source.Camera} />
      </div>

      {/* Bottom Bar Controls */}
      <footer className="bottom-bar">
        <div className="controls-group">
          <TrackToggle source={Track.Source.Microphone} className="control-btn" onClick={vibrate}>
             {({ enabled }) => enabled ? <Mic size={20} /> : <MicOff size={20} />}
          </TrackToggle>
          
          <TrackToggle source={Track.Source.Camera} className="control-btn" onClick={vibrate}>
            {({ enabled }) => enabled ? <Video size={20} /> : <VideoOff size={20} />}
          </TrackToggle>

          {!isMobile && (
            <TrackToggle source={Track.Source.ScreenShare} className="control-btn" onClick={vibrate}>
              <Monitor size={20} />
            </TrackToggle>
          )}

          <button 
            className="control-btn leave-btn"
            onClick={() => {
              vibrate();
              navigate(`/zones/${zoneId}`);
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </footer>

      <style>{`
        .classroom-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          background-color: #0a0a0a;
          color: #fcfcfc;
          overflow: hidden;
          position: relative;
        }

        .top-bar {
          height: 64px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(20px);
          z-index: 10;
        }

        .quality-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 4px 10px;
          border-radius: 8px;
          color: white;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quality-toggle.hd { color: #c2f575; border-color: rgba(194, 245, 117, 0.3); }

        .zone-title {
          font-size: 0.9rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #c2f575;
          margin: 0;
          text-transform: uppercase;
        }

        .grid-container {
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

        .more-pill {
          aspect-ratio: 16 / 9;
          background: rgba(194, 245, 117, 0.05);
          border: 1px dashed rgba(194, 245, 117, 0.3);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #c2f575;
          font-size: 24px;
        }

        @media (min-width: 768px) {
          .participants-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (min-width: 1024px) {
          .participants-grid { grid-template-columns: repeat(3, 1fr); }
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }

        .bottom-bar {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
          padding-bottom: 20px;
          z-index: 30;
        }

        .controls-group {
          display: flex;
          gap: 12px;
          background: rgba(20, 20, 20, 0.9);
          padding: 8px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }

        .control-btn {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          background: transparent;
          color: white;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 767px) {
          .controls-group {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            padding: 12px;
            border-radius: 28px;
          }
          .control-btn {
            width: 56px;
            height: 56px;
          }
          .bottom-bar {
            height: 160px;
          }
           .local-pip {
            bottom: 160px;
            right: 16px;
            width: 120px;
            height: 90px;
          }
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .control-btn.lk-button-active {
            background-color: #c2f575 !important;
            color: #0a0a0a !important;
        }

        .leave-btn {
          background: #ef4444 !important;
          color: white !important;
        }

        .leave-btn:hover {
          background: #dc2626 !important;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
        }

        .local-pip {
          position: absolute;
          bottom: 110px;
          right: 24px;
          width: 200px;
          height: 150px;
          border-radius: 16px;
          overflow: hidden;
          background: #1a1a1a;
          border: 2px solid #c2f575;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
          z-index: 20;
          transition: all 0.3s ease;
        }

        .local-pip .lk-participant-tile {
          height: 100%;
          width: 100%;
        }

        /* Anti-Gravity Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(194, 245, 117, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(194, 245, 117, 0.3); }
      `}</style>
    </div>
  );
};

const ClassroomPage = () => {
  const { zoneId } = useParams();
  const { user } = useAuth();
  const [token, setToken] = useState(null);
  const [zoneTitle, setZoneTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Connection Resilience
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [roomKey, setRoomKey] = useState(0); // Forcing remount on retry
  const reconnectAttempts = React.useRef(0);

  const handleDisconnect = (reason) => {
    // If it's not a user-initiated leave
    if (reason !== 'leave' && reconnectAttempts.current < 3) {
      setIsReconnecting(true);
      reconnectAttempts.current += 1;
      
      setTimeout(() => {
        setRoomKey(prev => prev + 1);
        setIsReconnecting(false);
      }, 2000);
    } else if (reconnectAttempts.current >= 3) {
      setError("Connection lost after multiple attempts. Please check your uplink.");
    }
  };

  useEffect(() => {
    const initPage = async () => {
      if (!zoneId || !user?.uid) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const [tokenResult, zoneSnap] = await Promise.all([
          httpsCallable(functions, 'getLiveKitToken')({ roomName: zoneId, identity: user.uid }),
          getDoc(doc(db, 'zones', zoneId))
        ]);

        setToken(tokenResult.data.token);
        if (zoneSnap.exists()) {
          setZoneTitle(zoneSnap.data().title);
        }
      } catch (err) {
        console.error("Initialization failed:", err);
        setError(err.message || "Failed to initialize classroom. Please check your enrollment.");
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [zoneId, user?.uid]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner-wrapper">
          <div className="spinner" />
          <div className="spinner-inner" />
        </div>
        <p className="loading-text">Synchronizing Knowledge Stream...</p>
        <style>{`
          .loader-container {
            height: 100vh;
            width: 100vw;
            background: #0a0a0a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 24px;
          }
          .spinner-wrapper {
            position: relative;
            width: 80px;
            height: 80px;
          }
          .spinner {
            width: 100%;
            height: 100%;
            border: 4px solid rgba(194, 245, 117, 0.1);
            border-top: 4px solid #c2f575;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .spinner-inner {
            position: absolute;
            top: 15px;
            left: 15px;
            width: 50px;
            height: 50px;
            border: 4px solid rgba(194, 245, 117, 0.05);
            border-bottom: 4px solid #c2f575;
            border-radius: 50%;
            animation: spin-reverse 1.5s linear infinite;
          }
          .loading-text {
            color: #c2f575;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            opacity: 0.8;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes spin-reverse { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle size={48} color="#ef4444" />
        <h2 className="error-title">Uplink Interrupted</h2>
        <p className="error-message">{error}</p>
        <button className="retry-btn" onClick={() => window.location.reload()}>Re-attempt Connection</button>
        <style>{`
          .error-container {
            height: 100vh;
            width: 100vw;
            background: #0a0a0a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 24px;
            gap: 16px;
          }
          .error-title {
            color: #ef4444;
            text-transform: uppercase;
            letter-spacing: -0.02em;
            font-weight: 900;
            margin: 0;
          }
          .error-message {
            color: rgba(255, 255, 255, 0.6);
            max-width: 400px;
            font-size: 0.9rem;
          }
          .retry-btn {
            margin-top: 12px;
            background: #c2f575;
            color: #1a1a4e;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 800;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            transition: all 0.2s ease;
          }
          .retry-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(194, 245, 117, 0.4);
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <LiveKitRoom
        key={roomKey}
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL}
        connect={true}
        video={true}
        audio={true}
        data-lk-theme="default"
        onDisconnected={() => handleDisconnect('unexpected')}
      >
        <RoomAudioRenderer />
        <ClassroomContent zoneTitle={zoneTitle} zoneId={zoneId} />
      </LiveKitRoom>

      {isReconnecting && (
        <div className="reconnecting-overlay">
          <div className="overlay-content">
            <Loader2 className="re-spinner" size={40} />
            <h2>Restoring Uplink...</h2>
            <p>Attempt {reconnectAttempts.current} of 3</p>
          </div>
          <style>{`
            .reconnecting-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(10px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
            }
            .overlay-content {
              text-align: center;
              color: #c2f575;
            }
            .re-spinner {
              animation: spin 1s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </>
  );
};

export default ClassroomPage;
