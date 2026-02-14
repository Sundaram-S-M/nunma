import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Mic, MicOff, Video as VideoIcon, VideoOff, Users, MessageSquare, Send, Radio,
  Pencil, Eraser, Trash2, Palette, RotateCcw, Monitor, ScreenShare,
  LayoutGrid, Settings, MoreVertical, Sparkles, ChevronLeft, ChevronRight,
  LogOut, Hand, Check, Link
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
  ParticipantTile
} from '@livekit/components-react';
import { Track, LocalAudioTrack, ConnectionState, RoomEvent } from 'livekit-client';
import { httpsCallable } from 'firebase/functions';
import { auth, functions, db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { GoogleGenAI } from '@google/genai';
import ConfusionHeatmap from './ConfusionHeatmap';
import ChatSidebar from './ChatSidebar';
import Toast, { ToastType } from './Toast';
import '@livekit/components-styles';


interface ClassroomStreamProps {
  sessionId: string;
  zoneId: string;
  role: 'TUTOR' | 'STUDENT';
  onClose: () => void;
  title: string;
}

interface DrawAction {
  type: 'draw' | 'clear' | 'start';
  x: number;
  y: number;
  color: string;
  size: number;
  isEraser: boolean;
}

const ClassroomStream: React.FC<ClassroomStreamProps> = ({ sessionId, zoneId, role, onClose, title }) => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      console.log("ClassroomStream: Attempting to fetch token...", { zoneId, sessionId, role });

      if (!zoneId || !sessionId) {
        console.warn("ClassroomStream: Missing zoneId or sessionId", { zoneId, sessionId });
        return;
      }

      // Check if Firebase Functions are configured
      if (!functions) {
        console.error("ClassroomStream: Firebase Functions not configured.");
        setError("Live streaming requires Firebase configuration. Please create a .env file with your Firebase credentials.");
        setToast({
          message: "Firebase not configured. Check the browser console for setup instructions.",
          type: 'error'
        });
        return;
      }

      try {
        console.log("ClassroomStream: Calling re-wired generateLiveKitToken...");

        const response = await fetch('https://us-central1-nunma-by-cursor.cloudfunctions.net/generateLiveKitToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: `${zoneId}-${sessionId}`,
            role: role,
            userId: user?.uid,
            userName: user?.name
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("ClassroomStream: Token received via re-wire");
        setToken(data.token);
      } catch (err: any) {
        console.error("ClassroomStream: Token fetch failed:", err);
        setError(err.message || 'Failed to join live session.');
        setToast({ message: err.message || 'Connection failed', type: 'error' });
      }
    };
    fetchToken();
  }, [sessionId, zoneId, role]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[300] bg-[#1A1A4E] flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <X size={40} className="text-red-500" />
        </div>
        <h3 className="text-white text-2xl font-black">Connection Failed</h3>
        <p className="text-gray-400 max-w-sm">{error}</p>
        <button
          onClick={onClose}
          className="px-8 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all mt-4"
        >
          Return to Zone
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="fixed inset-0 z-[300] bg-[#1A1A4E] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#c2f575] font-black uppercase tracking-[0.3em] text-[10px]">Establishing Secure Stream...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#040457] flex flex-col font-inter h-[100dvh] overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <LiveKitRoom
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880'}
        audio={true}
        video={role === 'TUTOR'}
        connect={true}
        className="flex-1 flex flex-col relative"
        onDisconnected={onClose}
        onError={(err) => {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setToast({ message: "Camera/Mic access denied. Enable them to participate.", type: 'error' });
          }
        }}
      >
        <ClassroomContent role={role} title={title} sessionId={sessionId} onClose={onClose} setToast={setToast} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

const ClassroomContent: React.FC<{
  role: 'TUTOR' | 'STUDENT';
  title: string;
  sessionId: string;
  onClose: () => void;
  setToast: (t: { message: string; type: ToastType } | null) => void;
}> = ({ role, title, sessionId, onClose, setToast }) => {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [brushColor, setBrushColor] = useState('#c2f575');
  const [brushSize, setBrushSize] = useState(3);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [sentimentData, setSentimentData] = useState<{ time: string; confusion: number }[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const drawOnCanvas = useCallback((action: DrawAction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (action.type === 'start') {
      ctx.beginPath();
      ctx.moveTo(action.x, action.y);
      return;
    }
    if (action.type === 'clear') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.strokeStyle = action.isEraser ? '#111827' : action.color;
    ctx.lineWidth = action.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(action.x, action.y);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!localParticipant) return;

    const handleData = (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'whiteboard_draw') {
          drawOnCanvas(data.action);
        } else if (data.type === 'whiteboard_toggle') {
          setShowWhiteboard(data.state);
        } else if (data.type === 'sentiment_update' && role === 'TUTOR') {
          setSentimentData(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), confusion: data.score * 100 }]);
          if (data.score > 0.5) setNudge("Students might be confused. Try explaining again?");
        }
      } catch (err) {
        console.error("Data decode error:", err);
      }
    };

    localParticipant.on(RoomEvent.DataReceived, handleData);
    return () => {
      localParticipant.off(RoomEvent.DataReceived, handleData);
    };
  }, [localParticipant, drawOnCanvas, role]);

  const sendDrawAction = (action: DrawAction) => {
    if (!localParticipant) return;
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'whiteboard_draw', action }));
    localParticipant.publishData(payload, { reliable: true });
    drawOnCanvas(action);
  };

  const startDrawing = (e: any) => {
    isDrawing.current = true;
    const pos = getPos(e);
    sendDrawAction({ type: 'start', x: pos.x, y: pos.y, color: brushColor, size: brushSize, isEraser: activeTool === 'eraser' });
  };

  const draw = (e: any) => {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    sendDrawAction({ type: 'draw', x: pos.x, y: pos.y, color: brushColor, size: brushSize, isEraser: activeTool === 'eraser' });
  };

  const stopDrawing = () => { isDrawing.current = false; };

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const toggleWhiteboard = () => {
    const newState = !showWhiteboard;
    setShowWhiteboard(newState);
    if (localParticipant) {
      const payload = new TextEncoder().encode(JSON.stringify({ type: 'whiteboard_toggle', state: newState }));
      localParticipant.publishData(payload, { reliable: true });
    }
  };

  const toggleHandRaise = async () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    await localParticipant.setAttributes({ raisedHand: newState ? 'true' : 'false' });
  };

  const handleShareLink = () => {
    const finalLink = window.location.href.split('?')[0] + `?session=${sessionId}`;
    navigator.clipboard.writeText(finalLink);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040457]">
      {/* BBB-Style Header */}
      <div className="h-16 bg-[#1A1A4E] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="w-[1px] h-6 bg-white/10 mx-2" />
          <div>
            <h1 className="text-white font-black text-sm tracking-tight">{title}</h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Live Knowledge Stream</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleShareLink}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 border transition-all text-[9px] font-black tracking-widest ${isLinkCopied ? 'bg-[#c2f575] border-[#c2f575] text-[#1A1A4E]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
          >
            {isLinkCopied ? <Check size={14} /> : <Link size={14} className="text-[#c2f575]" />}
            {isLinkCopied ? 'COPIED' : 'SHARE'}
          </button>
          <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
            <Users size={12} className="text-[#c2f575]" />
            <span className="text-[9px] font-black text-white">{participants.length}</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (BBB Style) */}
        <div className={`flex transition-all duration-300 ease-in-out ${isChatOpen ? 'w-80' : 'w-0'} bg-[#1A1A4E] border-r border-white/5 relative overflow-hidden`}>
          <div className="w-80 flex flex-col h-full">
            <div className="flex-1 flex flex-col pt-4">
              <ChatSidebar
                zoneId={sessionId.split('-')[0]}
                sessionId={sessionId}
                isOpen={true}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
            {role === 'TUTOR' && sentimentData.length > 0 && (
              <div className="p-6 border-t border-white/5 bg-[#040457]/40">
                <ConfusionHeatmap data={sentimentData} />
              </div>
            )}
          </div>
        </div>

        {/* Main Viewing Area */}
        <main className="flex-1 relative flex bg-black overflow-hidden flex-col">
          <div className="flex-1 relative bg-black/40">
            <div className={`absolute inset-0 transition-opacity duration-500 ${showWhiteboard ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <VideoConference />
            </div>

            {showWhiteboard && (
              <div className="absolute inset-0 p-8 z-10 animate-in zoom-in duration-500 flex flex-col">
                <div className="flex-1 bg-[#111827] rounded-[3rem] border-8 border-white/5 shadow-2xl relative cursor-crosshair overflow-hidden group">
                  <canvas
                    ref={canvasRef}
                    width={1920}
                    height={1080}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 bg-gray-900/90 backdrop-blur-3xl rounded-2xl border border-white/10">
                    <button onClick={() => setActiveTool('pen')} className={`p-3 rounded-xl ${activeTool === 'pen' ? 'bg-[#c2f575] text-[#1A1A4E]' : 'text-white hover:bg-white/10'}`}><Pencil size={20} /></button>
                    <button onClick={() => setActiveTool('eraser')} className={`p-3 rounded-xl ${activeTool === 'eraser' ? 'bg-[#c2f575] text-[#1A1A4E]' : 'text-white hover:bg-white/10'}`}><Eraser size={20} /></button>
                    <div className="w-[1px] h-6 bg-white/10 mx-2" />
                    {['#c2f575', '#ffffff', '#ef4444', '#3b82f6'].map(c => (
                      <button key={c} onClick={() => setBrushColor(c)} className={`w-6 h-6 rounded-full border-2 ${brushColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                    <button onClick={() => { sendDrawAction({ type: 'clear', x: 0, y: 0, color: '', size: 0, isEraser: false }) }} className="p-3 text-white hover:text-red-500"><RotateCcw size={20} /></button>
                  </div>
                </div>
              </div>
            )}

            <div className="absolute top-6 left-6 z-[60] flex flex-col gap-3 pointer-events-none">
              {participants.filter(p => p.attributes.raisedHand === 'true').map(p => (
                <div key={p.identity} className="bg-[#c2f575] text-[#1A1A4E] px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl animate-in slide-in-from-left duration-300 pointer-events-auto">
                  <Hand size={14} fill="currentColor" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{p.name || p.identity} raised hand</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`absolute top-1/2 -translate-y-1/2 left-0 z-[100] p-1 bg-[#1A1A4E] text-white border border-white/10 rounded-r-xl transition-all ${isChatOpen ? 'opacity-0' : 'opacity-100'}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Centered Control Bar (Docked) */}
          <div className="h-24 bg-[#1A1A4E] border-t border-white/5 flex items-center justify-center gap-4 px-8 shrink-0 relative z-[100]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
                className={`p-5 rounded-2xl transition-all ${!localParticipant.isMicrophoneEnabled ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                {localParticipant.isMicrophoneEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </button>

              <button
                onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)}
                className={`p-5 rounded-2xl transition-all ${!localParticipant.isCameraEnabled ? 'bg-red-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                {localParticipant.isCameraEnabled ? <VideoIcon size={24} /> : <VideoOff size={24} />}
              </button>

              <div className="w-[1px] h-8 bg-white/10 mx-2" />

              <button
                onClick={() => localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled)}
                className={`p-5 rounded-2xl transition-all ${localParticipant.isScreenShareEnabled ? 'bg-[#c2f575] text-[#1A1A4E]' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                <Monitor size={24} />
              </button>

              <button
                onClick={toggleWhiteboard}
                className={`p-5 rounded-2xl transition-all ${showWhiteboard ? 'bg-[#c2f575] text-[#1A1A4E]' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                <Pencil size={24} />
              </button>

              <button
                onClick={toggleHandRaise}
                className={`p-5 rounded-2xl transition-all ${isHandRaised ? 'bg-orange-500 text-white animate-bounce' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                <Hand size={24} fill={isHandRaised ? "currentColor" : "none"} />
              </button>

              <div className="w-[1px] h-8 bg-white/10 mx-2" />

              <button onClick={onClose} className="px-10 py-5 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-xl active:scale-95">
                Leave Session
              </button>
            </div>

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

export default ClassroomStream;
