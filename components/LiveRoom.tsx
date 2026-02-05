import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  VideoConference,
  ControlBar,
  useTracks,
  RoomAudioRenderer,
  LayoutContextProvider
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, functions, auth } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from './ChatSidebar';
import { useGeminiQuiz } from '../utils/useGeminiQuiz';
import {
  Sparkles,
  MessageSquare,
  LogOut,
  Hand,
  Smile,
  Users as UsersIcon,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  X
} from 'lucide-react';
import {
  useLocalParticipant,
  useParticipants,
  useRemoteParticipants,
  useRoomContext
} from '@livekit/components-react';
import '@livekit/components-styles';

const LiveRoom: React.FC = () => {
  const { zoneId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isGenerating, startCapture, stopAndGenerate } = useGeminiQuiz(zoneId || '', sessionId || '');

  useEffect(() => {
    const fetchToken = async () => {
      if (!zoneId || !sessionId || !user) return;

      try {
        const generateToken = httpsCallable(functions, 'generateLiveKitToken');
        const result = await generateToken({
          roomName: `${zoneId}-${sessionId}`,
          role: user.role
        });
        setToken((result.data as any).token);
      } catch (err: any) {
        console.error("Token fetch failed:", err);
        setError("Failed to join live session. Please try again.");
      }
    };

    fetchToken();
  }, [zoneId, sessionId, user]);

  if (error) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-6 text-center">
        <div className="bg-white/5 backdrop-blur-xl p-12 rounded-[3rem] border border-white/10 max-w-md">
          <h2 className="text-white text-3xl font-black mb-6">Access Denied</h2>
          <p className="text-gray-400 mb-10">{error}</p>
          <button onClick={() => navigate(-1)} className="bg-lime text-navy px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Back to Hub</button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-lime border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lime font-black uppercase tracking-[0.3em] text-[10px]">Establishing Secure Stream...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1A4E] overflow-hidden flex flex-col font-inter">
      <LiveKitRoom
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880'}
        audio={true}
        video={user?.role === 'TUTOR'}
        connect={true}
        className="flex-1 flex flex-col relative"
        onConnected={(room) => {
          if (user?.role === 'TUTOR') {
            const audioTrack = room.localParticipant.getTrack(Track.Source.Microphone);
            if (audioTrack?.track?.mediaStream) {
              startCapture(audioTrack.track.mediaStream);
            }
          }

          // Sync attendance on join
          if (user && zoneId && sessionId) {
            setDoc(doc(db, `zones/${zoneId}/sessions/${sessionId}/attendance`, user.uid), {
              name: user.name,
              avatar: user.avatar,
              role: user.role,
              joinedAt: serverTimestamp(),
              status: 'Present'
            });
          }
        }}
        onDisconnected={() => {
          if (user && zoneId && sessionId) {
            // Optional: keep record but mark as left
            // deleteDoc(doc(db, `zones/${zoneId}/sessions/${sessionId}/attendance`, user.uid));
          }
          navigate(-1);
        }}
      >
        <RoomContent
          zoneId={zoneId!}
          sessionId={sessionId!}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isGenerating={isGenerating}
          stopAndGenerate={stopAndGenerate}
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
  stopAndGenerate: () => void;
}

const RoomContent: React.FC<RoomContentProps> = ({
  zoneId,
  sessionId,
  isChatOpen,
  setIsChatOpen,
  isGenerating,
  stopAndGenerate
}) => {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showParticipants, setShowParticipants] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    const sessions = JSON.parse(localStorage.getItem('nunma_live_sessions') || '[]');
    const active = sessions.find((s: any) => s.id === sessionId);
    if (active) setActiveSession(active);
  }, [sessionId]);

  // Sync Hand Raise to Attributes
  const toggleHandRaise = async () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    await localParticipant.setAttributes({ raisedHand: newState ? 'true' : 'false' });
  };

  return (
    <>
      {/* custom header */}
      <div className="h-20 bg-black/20 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-lime flex items-center justify-center text-navy shadow-lg shadow-lime/20">
            <img src="/assets/logo-icon.png" alt="" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-white font-black tracking-tight text-xl">{activeSession?.title || 'Live Knowledge Stream'}</h1>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live • Broadcasting
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user?.role === 'TUTOR' && (
            <button
              onClick={stopAndGenerate}
              disabled={isGenerating}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isGenerating ? 'bg-gray-600 text-gray-400' : 'bg-lime text-navy hover:scale-105 shadow-xl shadow-lime/20'
                }`}
            >
              <Sparkles size={16} /> {isGenerating ? 'Analyzing...' : 'Generate Quiz'}
            </button>
          )}

          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <UsersIcon size={14} className="text-lime" />
            <span className="text-[10px] font-black text-white">{participants.length} ACTIVE</span>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/5 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex bg-navy overflow-hidden">
        <div className="flex-1 relative">
          <VideoConference />

          {/* RAISED HANDS OVERLAY (for Tutor/All) */}
          <div className="absolute top-10 left-10 z-[60] flex flex-col gap-4 pointer-events-none">
            {participants.filter(p => p.attributes.raisedHand === 'true').map(p => (
              <div key={p.identity} className="bg-lime text-navy px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-left duration-300 pointer-events-auto">
                <Hand size={18} fill="currentColor" />
                <span className="text-xs font-black uppercase tracking-widest">{p.name || p.identity} raised hand</span>
              </div>
            ))}
          </div>

          {/* CUSTOM FLOATING CONTROL BAR */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#040457]/80 backdrop-blur-3xl px-8 py-5 rounded-[2.5rem] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
            {/* Standard Audio/Video toggles are inside VideoConference, but let's add the requested ones */}

            <button className="p-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-all group relative">
              <Mic size={20} />
            </button>
            <button className="p-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-all">
              <VideoIcon size={20} />
            </button>
            <div className="w-[1px] h-8 bg-white/10 mx-2" />

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-4 rounded-2xl transition-all ${isChatOpen ? 'bg-lime text-navy shadow-lg shadow-lime/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              <MessageSquare size={20} />
            </button>

            <button className="p-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-all">
              <Smile size={20} />
            </button>

            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={`p-4 rounded-2xl transition-all ${showParticipants ? 'bg-lime text-navy' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              <UsersIcon size={20} />
            </button>

            <button
              onClick={toggleHandRaise}
              className={`p-4 rounded-2xl transition-all ${isHandRaised ? 'bg-orange-500 text-white animate-bounce' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              <Hand size={20} fill={isHandRaised ? "currentColor" : "none"} />
            </button>

            <button onClick={() => navigate(-1)} className="ml-4 px-8 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all shadow-xl">
              Leave Session
            </button>
          </div>

          {/* PARTICIPANT OVERLAY */}
          {showParticipants && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-[#040457]/90 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-2xl z-[150] animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-black text-lime uppercase tracking-widest">Active Learners</h4>
                <button onClick={() => setShowParticipants(false)}><X size={16} className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                {participants.map(p => (
                  <div key={p.identity} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/10 overflow-hidden">
                        <img src={`https://picsum.photos/seed/${p.identity}/32/32`} alt="" />
                      </div>
                      <span className="text-xs font-bold text-white">{p.name || p.identity}</span>
                    </div>
                    {p.attributes.raisedHand === 'true' && <Hand size={14} className="text-orange-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ChatSidebar
          zoneId={zoneId}
          sessionId={sessionId}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      </div>
    </>
  );
};

export default LiveRoom;
