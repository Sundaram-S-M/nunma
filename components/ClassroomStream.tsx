
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, Mic, MicOff, Video, VideoOff, Users, MessageSquare, Send, Radio,
  Pencil, Eraser, Trash2, Palette, Square, Type as TextIcon,
  Circle, Download, CheckCircle, UserCheck, Monitor, ScreenShare,
  LayoutGrid, Settings, MoreVertical, RotateCcw, AlertTriangle, Sparkles,
  Link, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleGenAI } from '@google/genai';
import ConfusionHeatmap from './ConfusionHeatmap';

interface ClassroomStreamProps {
  sessionId: string;
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

const ClassroomStream: React.FC<ClassroomStreamProps> = ({ sessionId, role, onClose, title }) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [brushColor, setBrushColor] = useState('#c1e60d');
  const [brushSize, setBrushSize] = useState(3);
  const [participantCount, setParticipantCount] = useState(1);
  const [attendees, setAttendees] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [sentimentData, setSentimentData] = useState<{ time: string; confusion: number }[]>([]);
  const [classConfusionPct, setClassConfusionPct] = useState(0);
  const [nudge, setNudge] = useState<string | null>(null);
  const [isCapturingSentiment, setIsCapturingSentiment] = useState(false);

  const studentSentiments = useRef<Record<string, number>>({});

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const signaling = useRef<BroadcastChannel | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const isDrawing = useRef(false);

  // Whiteboard Logic
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
    const channel = new BroadcastChannel(`nunma-live-${sessionId}`);
    signaling.current = channel;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnection.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.postMessage({ type: 'candidate', candidate: event.candidate, senderRole: role });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (role === 'TUTOR') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          channel.postMessage({ type: 'offer', sdp: offer, senderRole: role, senderName: user?.name });
        });
      }).catch(err => console.error("Media Error:", err));
    } else {
      channel.postMessage({ type: 'join', senderRole: role, senderName: user?.name, senderId: user?.email });
    }

    channel.onmessage = async (event) => {
      const { type, sdp, candidate, senderRole, senderName, senderId, message, drawAction, whiteboardState } = event.data;
      if (senderRole === role && type !== 'draw') return;

      if (type === 'offer' && role === 'STUDENT') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.postMessage({ type: 'answer', sdp: answer, senderRole: role });
      } else if (type === 'answer' && role === 'TUTOR') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } else if (type === 'candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else if (type === 'join' && role === 'TUTOR') {
        setParticipantCount(prev => prev + 1);
        if (senderName) setAttendees(prev => new Set(prev).add(senderName));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.postMessage({ type: 'offer', sdp: offer, senderRole: role });
      } else if (type === 'chat') {
        setMessages(prev => [...prev, message]);
      } else if (type === 'draw') {
        drawOnCanvas(drawAction);
      } else if (type === 'whiteboard_toggle') {
        setShowWhiteboard(whiteboardState);
      } else if (type === 'sentiment_update' && role === 'TUTOR') {
        const score = candidate as number;
        studentSentiments.current[senderId] = score;
        const scores = Object.values(studentSentiments.current);
        const confusedCount = scores.filter(s => (s as number) > 0.5).length;
        const pct = (confusedCount / scores.length) * 100;
        setClassConfusionPct(pct);
        setSentimentData(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), confusion: pct }]);

        if (pct >= 40) {
          setNudge("Class seems confused about the current concept. Re-explain?");
        } else {
          setNudge(null);
        }
      }
    };

    return () => {
      if (role === 'TUTOR' && attendees.size > 0) {
        const history = JSON.parse(localStorage.getItem('nunma_attendance_history') || '[]');
        history.push({
          sessionId,
          title,
          date: new Date().toISOString(),
          students: Array.from(attendees)
        });
        localStorage.setItem('nunma_attendance_history', JSON.stringify(history));
      }
      channel.close();
      pc.close();
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId, role, drawOnCanvas, attendees, title, user]);

  // Sentiment Analysis Loop (Student Side)
  useEffect(() => {
    if (role !== 'STUDENT' || isCamOff) {
      setIsCapturingSentiment(false);
      return;
    }

    setIsCapturingSentiment(true);
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    const analyzeSentiment = async () => {
      if (isCamOff || !localVideoRef.current) return;

      try {
        const video = localVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

        const result = await genAI.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64,
                    mimeType: "image/jpeg"
                  }
                },
                { text: "Analyze the facial expression of the student in this image. On a scale of 0.0 to 1.0, where 0.0 is completely clear/focused and 1.0 is highly confused/puzzled, return ONLY the numerical score." }
              ]
            }
          ]
        });

        const scoreText = result.text || "0";
        const score = parseFloat(scoreText.trim()) || 0;

        signaling.current?.postMessage({
          type: 'sentiment_update',
          senderRole: role,
          senderId: user?.email || 'anon',
          candidate: score // Re-purposing candidate field for score for quick implementation
        });
      } catch (err) {
        console.error("Sentiment analysis error:", err);
      }
    };

    const interval = setInterval(analyzeSentiment, 5000); // Analyze every 5 seconds
    return () => {
      clearInterval(interval);
      setIsCapturingSentiment(false);
    };
  }, [role, isCamOff, user?.email]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const pos = getPos(e);
    const action: DrawAction = { type: 'start', x: pos.x, y: pos.y, color: brushColor, size: brushSize, isEraser: activeTool === 'eraser' };
    drawOnCanvas(action);
    signaling.current?.postMessage({ type: 'draw', drawAction: action, senderRole: role });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    const action: DrawAction = { type: 'draw', x: pos.x, y: pos.y, color: brushColor, size: brushSize, isEraser: activeTool === 'eraser' };
    drawOnCanvas(action);
    signaling.current?.postMessage({ type: 'draw', drawAction: action, senderRole: role });
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

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

  const clearCanvas = () => {
    const action: DrawAction = { type: 'clear', x: 0, y: 0, color: '', size: 0, isEraser: false };
    drawOnCanvas(action);
    signaling.current?.postMessage({ type: 'draw', drawAction: action, senderRole: role });
  };

  const toggleWhiteboard = () => {
    const newState = !showWhiteboard;
    setShowWhiteboard(newState);
    signaling.current?.postMessage({ type: 'whiteboard_toggle', whiteboardState: newState, senderRole: role });
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleCam = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsCamOff(!isCamOff);
    }
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // Mock notification
    if (!isScreenSharing) {
      const msg = { sender: 'System', text: 'Tutor started screen sharing...', time: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, msg]);
      signaling.current?.postMessage({ type: 'chat', message: msg, senderRole: role });
    }
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = { sender: user?.name || (role === 'TUTOR' ? 'Tutor' : 'Student'), text: chatInput, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, msg]);
    signaling.current?.postMessage({ type: 'chat', message: msg, senderRole: role });
    setChatInput('');
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/#/classroom/zone/${sessionId.split('-')[0]}?session=${sessionId}`;
    // Fallback if sessionId doesn't contain zoneId
    const finalLink = window.location.href.split('?')[0] + `?session=${sessionId}`;
    navigator.clipboard.writeText(finalLink);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-300 overflow-hidden h-[100dvh]">
      {/* Participant Modal */}
      {showParticipants && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1A1A4E] text-white w-full max-w-md rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-xl font-black tracking-tight flex items-center gap-3"><Users className="text-[#c1e60d]" /> Participants</h4>
              <button onClick={() => setShowParticipants(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <img src={user?.avatar} className="w-10 h-10 rounded-full border-2 border-[#c1e60d]" alt="" />
                  <div>
                    <p className="text-sm font-black">{user?.name} (Me)</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{role}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Mic size={14} className="text-[#c1e60d]" />
                  <Video size={14} className="text-[#c1e60d]" />
                </div>
              </div>
              {/* Explicitly cast name to any to fix charAt error */}
              {Array.from(attendees).map((name: any) => (
                <div key={name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-[10px] font-black">{name.charAt(0)}</div>
                    <p className="text-sm font-black">{name}</p>
                  </div>
                  <div className="flex gap-2 opacity-40">
                    <MicOff size={14} />
                    <Video size={14} />
                  </div>
                </div>
              ))}
              {attendees.size === 0 && role === 'TUTOR' && <p className="text-center py-10 text-gray-500 italic">Waiting for students...</p>}
              {role === 'STUDENT' && <p className="text-center py-10 text-gray-500 italic">Other students encrypted</p>}
            </div>
            <div className="p-8 bg-white/5 border-t border-white/5 text-center">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Active: {participantCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-20 bg-gray-900/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-8 absolute top-0 w-full z-20">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-600/20 animate-pulse">
            <Radio className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-white font-black text-xl tracking-tight">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">LIVE • {role === 'TUTOR' ? 'Broadcasting' : 'Watching'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleShareLink}
            className={`px-5 py-2.5 rounded-full flex items-center gap-3 border transition-all ${isLinkCopied ? 'bg-[#c1e60d] border-[#c1e60d] text-indigo-900' : 'bg-white/5 border-white/10 text-white hover:bg-white/5'}`}
          >
            {isLinkCopied ? <Check size={16} /> : <Link size={16} className="text-[#c1e60d]" />}
            <span className="text-xs font-black tracking-widest">{isLinkCopied ? 'COPIED' : 'SHARE LINK'}</span>
          </button>
          <button
            onClick={() => setShowParticipants(true)}
            className="bg-black/40 px-5 py-2.5 rounded-full flex items-center gap-3 border border-white/10 hover:bg-white/5 transition-all"
          >
            <Users size={16} className="text-[#c1e60d]" />
            <span className="text-white text-xs font-black tracking-widest">{participantCount} ACTIVE</span>
          </button>
          <button onClick={onClose} className="p-4 bg-white/5 hover:bg-red-500/80 rounded-2xl text-white transition-all border border-white/10 shadow-xl group">
            <X size={20} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex pt-20">
        {/* Main Stage */}
        <div className="flex-1 bg-gray-950 relative flex items-center justify-center overflow-hidden">

          {/* Video Feeds */}
          <div className={`absolute inset-0 flex transition-all duration-700 ${showWhiteboard ? 'opacity-20 blur-md scale-110 pointer-events-none' : 'opacity-100'}`}>
            {role === 'TUTOR' ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
            ) : (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
            )}
            {isScreenSharing && (
              <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-12">
                <Monitor size={120} className="mb-8 text-[#c1e60d] opacity-50" />
                <h3 className="text-4xl font-black uppercase tracking-widest">Screen Share Active</h3>
                <p className="text-indigo-200 mt-4 font-medium">Broadcast stream focused on desktop view</p>
              </div>
            )}
          </div>

          {/* Whiteboard */}
          {showWhiteboard && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10 animate-in zoom-in duration-500">
              <div className="w-full h-full bg-[#111827] rounded-[4rem] border-[12px] border-white/5 shadow-2xl relative cursor-crosshair overflow-hidden group">
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

                {/* Board Toolbar */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
                  <button
                    onClick={() => setActiveTool('pen')}
                    className={`p-4 rounded-2xl transition-all ${activeTool === 'pen' ? 'bg-[#c1e60d] text-indigo-900 shadow-xl' : 'text-white hover:bg-white/10'}`}
                  >
                    <Pencil size={24} />
                  </button>
                  <button
                    onClick={() => setActiveTool('eraser')}
                    className={`p-4 rounded-2xl transition-all ${activeTool === 'eraser' ? 'bg-[#c1e60d] text-indigo-900 shadow-xl' : 'text-white hover:bg-white/10'}`}
                  >
                    <Eraser size={24} />
                  </button>
                  <div className="w-[1.5px] h-10 bg-white/10 mx-4" />
                  {['#c1e60d', '#ffffff', '#ef4444', '#3b82f6', '#facc15'].map(color => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 ${brushColor === color ? 'border-white scale-125 shadow-xl' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="w-[1.5px] h-10 bg-white/10 mx-4" />
                  <button onClick={clearCanvas} className="p-4 text-white hover:text-red-500 transition-colors group">
                    <RotateCcw size={24} className="group-active:-rotate-90 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Controls Bar */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-5 p-4 bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 z-30 shadow-2xl">
            <button onClick={toggleMute} className={`p-5 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button onClick={toggleCam} className={`p-5 rounded-2xl transition-all ${isCamOff ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}>
              {isCamOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
            <div className="w-[1.5px] h-10 bg-white/10 mx-2" />
            <button
              onClick={toggleScreenShare}
              className={`p-5 rounded-2xl transition-all ${isScreenSharing ? 'bg-[#c1e60d] text-indigo-900 shadow-xl shadow-[#c1e60d]/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              <ScreenShare size={24} />
            </button>
            <button
              onClick={toggleWhiteboard}
              className={`p-5 rounded-2xl transition-all ${showWhiteboard ? 'bg-[#c1e60d] text-indigo-900 shadow-xl shadow-[#c1e60d]/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              <Pencil size={24} />
            </button>
            <div className="w-[1.5px] h-10 bg-white/10 mx-2" />
            <button onClick={onClose} className="px-10 py-5 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-xl shadow-red-600/20 active:scale-95">
              Leave Session
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-[420px] bg-gray-900/95 backdrop-blur-3xl border-l border-white/10 flex flex-col relative z-20">
          <div className="p-10 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-white font-black text-lg tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg"><MessageSquare size={20} className="text-[#c1e60d]" /></div>
              Knowledge Stream
            </h4>
            <button className="text-gray-500 hover:text-white"><Settings size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-gray-900/20">
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${msg.sender === 'System' ? 'text-[#c1e60d]' : 'text-gray-400'}`}>
                    {msg.sender}
                  </span>
                  <span className="text-[8px] font-bold text-gray-600">{msg.time}</span>
                </div>
                <div className={`p-5 rounded-[1.75rem] border ${msg.sender === user?.name ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-white/5 text-indigo-100 border-white/5 rounded-tl-none'}`}>
                  <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                <MessageSquare size={64} strokeWidth={1} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Chat silence is golden...</p>
              </div>
            )}
          </div>

          {role === 'TUTOR' && (
            <div className="p-10 space-y-6">
              <ConfusionHeatmap data={sentimentData} />
              {nudge && (
                <div className="bg-red-500/20 border border-red-500/50 p-6 rounded-[2.5rem] flex items-center gap-6 animate-bounce">
                  <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <p className="text-white text-sm font-black leading-tight">{nudge}</p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={sendChatMessage} className="p-8 border-t border-white/5 bg-black/20">
            <div className="relative group">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your mentor..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-14 py-5 text-white text-sm font-medium focus:outline-none focus:border-[#c1e60d]/50 focus:bg-white/10 transition-all"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-gray-500 hover:text-[#c1e60d] transition-all group-focus-within:text-white">
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClassroomStream;
