import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db, functions } from '../utils/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Send, MessageCircle, Hand, Mic, MicOff, Video, VideoOff, Check, X as CloseIcon, BarChart2, Lock } from 'lucide-react';

type Tab = 'chat' | 'hands' | 'polls';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: any;
    type?: 'text' | 'poll';
    status?: 'open' | 'closed';
    pollData?: {
        question: string;
        options: string[];
        votes: Record<string, number>;
    };
}

interface RaisedHand {
    id: string;
    uid: string;
    name: string;
    status: 'waiting' | 'calling' | 'calling-video' | 'speaking' | 'speaking-video';
    timestamp: any;
}

interface EngagementSidebarProps {
    sessionId: string;
}

const EngagementSidebar: React.FC<EngagementSidebarProps> = ({ sessionId }) => {
    const { zoneId } = useParams<{ zoneId: string }>();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('chat');
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
    const [isHandRaised, setIsHandRaised] = useState(false);

    const isTutor = user?.role === UserRole.THALA;

    useEffect(() => {
        if (!zoneId || !sessionId) return;

        if (activeTab === 'chat') {
            const messagesRef = collection(db, 'zones', zoneId, 'liveSessions', sessionId, 'messages');
            const q = query(messagesRef, orderBy('createdAt', 'asc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Message[];
                setMessages(msgs);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            });

            return () => unsubscribe();
        }

        if (activeTab === 'hands') {
            const handsRef = collection(db, 'zones', zoneId, 'liveSessions', sessionId, 'raisedHands');
            const q = query(handsRef, orderBy('timestamp', 'asc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const hands = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as RaisedHand[];
                setRaisedHands(hands);
                
                // Track if current user's hand is raised
                const myHand = hands.find(h => h.uid === user?.uid);
                setIsHandRaised(!!myHand);
            });

            return () => unsubscribe();
        }
    }, [zoneId, sessionId, activeTab, user?.uid]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !zoneId || !sessionId || !user) return;

        try {
            const messagesRef = collection(db, 'zones', zoneId, 'liveSessions', sessionId, 'messages');
            await addDoc(messagesRef, {
                type: 'text',
                text: newMessage.trim(),
                senderId: user.uid,
                senderName: user.name || 'User',
                createdAt: serverTimestamp()
            });
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleVote = async (messageId: string, optionIndex: number) => {
        if (!zoneId || !sessionId || !user?.uid) return;
        try {
            const msgRef = doc(db, 'zones', zoneId, 'liveSessions', sessionId, 'messages', messageId);
            await setDoc(msgRef, {
                pollData: {
                    votes: {
                        [user.uid]: optionIndex
                    }
                }
            }, { merge: true });
        } catch (error) {
            console.error('Error voting:', error);
        }
    };

    const handleClosePoll = async (messageId: string) => {
        if (!zoneId || !sessionId) return;
        try {
            const msgRef = doc(db, 'zones', zoneId, 'liveSessions', sessionId, 'messages', messageId);
            await setDoc(msgRef, { status: 'closed' }, { merge: true });
        } catch (error) {
            console.error('Error closing poll:', error);
        }
    };

    const handleRaiseHand = async () => {
        if (!zoneId || !sessionId || !user) return;
        try {
            const handRef = doc(db, 'zones', zoneId, 'liveSessions', sessionId, 'raisedHands', user.uid);
            if (isHandRaised) {
                await deleteDoc(handRef);
            } else {
                await setDoc(handRef, {
                    uid: user.uid,
                    name: user.name || 'Student',
                    status: 'waiting',
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error toggling hand:', error);
        }
    };

    const handleToggleAudio = async (studentUid: string, studentName: string, action: 'call' | 'call-video' | 'demote' | 'lower') => {
        if (!zoneId || !sessionId) return;
        
        try {
            if (!functions) throw new Error("Firebase functions not initialized.");
            const toggleAudioFunc = httpsCallable(functions, 'toggleStudentAudio');
            const handRef = doc(db, 'zones', zoneId, 'liveSessions', sessionId, 'raisedHands', studentUid);

            if (action === 'call') {
                await setDoc(handRef, { status: 'calling' }, { merge: true });
                await toggleAudioFunc({ zoneId, sessionId, studentIdentity: studentUid, allowAudio: true, allowVideo: false });
                await setDoc(handRef, { status: 'speaking' }, { merge: true });
            } else if (action === 'call-video') {
                await setDoc(handRef, { status: 'calling-video' }, { merge: true });
                await toggleAudioFunc({ zoneId, sessionId, studentIdentity: studentUid, allowAudio: true, allowVideo: true });
                await setDoc(handRef, { status: 'speaking-video' }, { merge: true });
            } else if (action === 'demote') {
                await setDoc(handRef, { status: 'calling' }, { merge: true });
                await toggleAudioFunc({ zoneId, sessionId, studentIdentity: studentUid, allowAudio: true, allowVideo: false });
                await setDoc(handRef, { status: 'speaking' }, { merge: true });
            } else if (action === 'lower') {
                await setDoc(handRef, { status: 'calling' }, { merge: true }); // pending state for UI while muting
                await toggleAudioFunc({ zoneId, sessionId, studentIdentity: studentUid, allowAudio: false, allowVideo: false });
                await deleteDoc(handRef);
            }
        } catch (error) {
            console.error('Error toggling student permissions:', error);
            alert('Failed to update student permissions. Note: rapid clicks may cause state mismatch.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a2e] text-white overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            {/* Header / Tabs */}
            <div className="flex border-b border-white/10 shrink-0">
                {(['chat', 'hands', 'polls'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 flex flex-col items-center gap-1 ${
                            activeTab === tab 
                            ? 'border-[#c2f575] text-[#c2f575]' 
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {tab === 'chat' && <MessageCircle size={14} />}
                        {tab === 'hands' && <Hand size={14} />}
                        {tab === 'polls' && <span className="text-[10px]">POLL</span>}
                        <span className="scale-90">{tab === 'hands' ? 'Hands' : tab === 'polls' ? 'Polls' : tab}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'chat' && (
                    <div className="absolute inset-0 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                                    <MessageCircle className="mb-2 opacity-50" size={32} />
                                    <p>No messages yet.</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    if (msg.type === 'poll' && msg.pollData) {
                                        const totalVotes = Object.values(msg.pollData.votes || {}).length;
                                        const userVoted = user?.uid ? msg.pollData.votes?.[user.uid] !== undefined : false;
                                        const isTutor = user?.role !== 'STUDENT';
                                        
                                        return (
                                            <div key={msg.id} className="flex flex-col w-full mb-2">
                                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <BarChart2 size={16} className="text-[#c2f575]" />
                                                            <span className="text-xs font-bold text-[#c2f575] uppercase tracking-wider">Poll by {msg.senderName}</span>
                                                        </div>
                                                        {msg.status === 'closed' && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full uppercase"><Lock size={10} /> Closed</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-bold text-white mb-4">{msg.pollData.question}</p>
                                                    <div className="space-y-2">
                                                        {msg.pollData.options.map((opt, idx) => {
                                                            const votesForOpt = Object.values(msg.pollData!.votes || {}).filter(v => v === idx).length;
                                                            const percent = totalVotes > 0 ? Math.round((votesForOpt / totalVotes) * 100) : 0;
                                                            const isMyVote = user?.uid && msg.pollData!.votes?.[user.uid] === idx;
                                                            
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => msg.status !== 'closed' && handleVote(msg.id, idx)}
                                                                    disabled={msg.status === 'closed'}
                                                                    className={`relative w-full text-left overflow-hidden rounded-xl border p-3 transition-all ${
                                                                        isMyVote 
                                                                        ? 'border-[#c2f575] bg-[#c2f575]/10 text-white' 
                                                                        : 'border-white/10 bg-black/20 text-gray-300 hover:bg-white/5'
                                                                    } ${msg.status === 'closed' ? 'cursor-default' : 'cursor-pointer'}`}
                                                                >
                                                                    {/* Progress Bar Background */}
                                                                    <div 
                                                                        className={`absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-500 ${isMyVote ? 'bg-[#c2f575]' : 'bg-white'}`}
                                                                        style={{ width: `${percent}%` }}
                                                                    />
                                                                    <div className="relative flex justify-between items-center text-sm z-10">
                                                                        <span className="font-medium">{opt}</span>
                                                                        {(userVoted || msg.status === 'closed' || isTutor) && (
                                                                            <span className="text-xs font-bold">{percent}%</span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex justify-between items-center mt-4">
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                                                        {isTutor && msg.status !== 'closed' && (
                                                            <button 
                                                                onClick={() => handleClosePoll(msg.id)}
                                                                className="text-[10px] font-bold bg-white/10 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                                            >
                                                                Close Poll
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={`flex flex-col max-w-[85%] mb-2 ${msg.senderId === user?.uid ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                                        >
                                            <span className="text-[10px] text-gray-400 mb-1 ml-1">{msg.senderName}</span>
                                            <div 
                                                className={`px-3 py-2 rounded-2xl text-sm ${
                                                    msg.senderId === user?.uid 
                                                    ? 'bg-[#c2f575] text-nunma-forest rounded-tr-sm' 
                                                    : 'bg-white/10 text-white rounded-tl-sm'
                                                }`}
                                            >
                                                {msg.text}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2 shrink-0 bg-[#040413]">
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#c2f575]"
                            />
                            <button 
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="w-10 h-10 bg-[#c2f575] text-nunma-forest rounded-xl flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'hands' && (
                    <div className="absolute inset-0 flex flex-col p-4">
                        {!isTutor && (
                            <div className="mb-6 flex flex-col items-center justify-center p-8 bg-white/5 rounded-[2rem] border border-white/10 text-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${isHandRaised ? 'bg-[#c2f575] text-nunma-forest shadow-[0_0_30px_rgba(194,245,117,0.3)]' : 'bg-white/10 text-white'}`}>
                                    <Hand size={40} className={isHandRaised ? 'animate-bounce' : ''} />
                                </div>
                                <h3 className="text-lg font-black tracking-tight mb-2">
                                    {isHandRaised ? 'Hand Raised!' : 'Need to Speak?'}
                                </h3>
                                <p className="text-xs text-gray-400 mb-6 max-w-[200px]">
                                    {isHandRaised ? 'The tutor will grant you microphone access soon.' : 'Click below to notify the tutor that you have a question.'}
                                </p>
                                <button 
                                    onClick={handleRaiseHand}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                                        isHandRaised 
                                        ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white' 
                                        : 'bg-[#c2f575] text-nunma-forest hover:scale-105 active:scale-95'
                                    }`}
                                >
                                    {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">
                                {isTutor ? 'Speaker Queue' : 'Activity'}
                            </h4>
                            {isTutor && (
                                <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold">
                                    <span className="block mb-1 font-black uppercase">⚠️ Browser Security Notice</span>
                                    Students must manually click to approve microphone/camera access in their browser when called to the stage.
                                </div>
                            )}
                            {raisedHands.length === 0 ? (
                                <div className="py-12 text-center text-gray-500 text-xs italic">
                                    No active hand requests.
                                </div>
                            ) : (
                                raisedHands.map((hand) => (
                                    <div key={hand.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${hand.status === 'speaking' ? 'bg-[#c2f575] animate-pulse' : 'bg-yellow-500'}`}></div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{hand.name}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-black">{hand.status}</p>
                                            </div>
                                        </div>
                                        {isTutor && (
                                            <div className="flex gap-2">
                                                {hand.status === 'waiting' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleToggleAudio(hand.uid, hand.name, 'call')}
                                                            className="w-10 h-10 bg-[#c2f575] text-nunma-forest rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                                                            title="Call to Stage (Audio)"
                                                        >
                                                            <Mic size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleAudio(hand.uid, hand.name, 'call-video')}
                                                            className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                                                            title="Call to Video Stage"
                                                        >
                                                            <Video size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {hand.status === 'speaking' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleToggleAudio(hand.uid, hand.name, 'call-video')}
                                                            className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                                                            title="Promote to Video"
                                                        >
                                                            <Video size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleAudio(hand.uid, hand.name, 'lower')}
                                                            className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                                                            title="Lower Hand & Mute"
                                                        >
                                                            <MicOff size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {hand.status === 'speaking-video' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleToggleAudio(hand.uid, hand.name, 'demote')}
                                                            className="w-10 h-10 bg-yellow-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                                                            title="Demote to Audio Only"
                                                        >
                                                            <VideoOff size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleAudio(hand.uid, hand.name, 'lower')}
                                                            className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                                                            title="Lower Hand & Mute"
                                                        >
                                                            <MicOff size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {hand.status.startsWith('calling') && (
                                                    <div className="w-10 h-10 flex items-center justify-center text-gray-400">
                                                        <span className="animate-pulse text-[10px] uppercase font-black">...</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'polls' && (
                    <div className="h-full flex items-center justify-center p-6 text-center text-gray-500 text-sm">
                        Live polls feature coming soon.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EngagementSidebar;

