import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db, functions } from '../utils/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';
import { Send, MessageCircle, Hand, Mic, MicOff, Check, X as CloseIcon } from 'lucide-react';

type Tab = 'chat' | 'hands' | 'qa' | 'polls';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: any;
}

interface RaisedHand {
    id: string;
    uid: string;
    name: string;
    status: 'waiting' | 'speaking';
    timestamp: any;
}

const EngagementSidebar: React.FC = () => {
    const { zoneId, sessionId } = useParams<{ zoneId: string, sessionId: string }>();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('chat');
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
    const [isHandRaised, setIsHandRaised] = useState(false);

    const isTutor = user?.role === 'TUTOR';

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

    const handleToggleAudio = async (studentUid: string, studentName: string, currentStatus: string) => {
        if (!zoneId || !sessionId) return;
        const allow = currentStatus === 'waiting';
        
        try {
            const toggleAudioFunc = httpsCallable(functions, 'toggleStudentAudio');
            await toggleAudioFunc({
                zoneId,
                sessionId,
                studentIdentity: studentName, // Using name as identity per generateLiveToken logic
                allowAudio: allow
            });

            // Update Firestore status
            const handRef = doc(db, 'zones', zoneId, 'liveSessions', sessionId, 'raisedHands', studentUid);
            if (allow) {
                await setDoc(handRef, { status: 'speaking' }, { merge: true });
            } else {
                // If muting, we could either set back to waiting or remove hand. 
                // Let's remove hand when muted by tutor to clear the queue.
                await deleteDoc(handRef);
            }
        } catch (error) {
            console.error('Error toggling student audio:', error);
            alert('Failed to update student permissions.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a2e] text-white overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            {/* Header / Tabs */}
            <div className="flex border-b border-white/10 shrink-0">
                {(['chat', 'hands', 'qa', 'polls'] as Tab[]).map((tab) => (
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
                        {tab === 'qa' && <span className="text-[10px]">Q&A</span>}
                        {tab === 'polls' && <span className="text-[10px]">POLL</span>}
                        <span className="scale-90">{tab === 'qa' ? '' : tab === 'hands' ? 'Hands' : tab === 'polls' ? '' : tab}</span>
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
                                messages.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className={`flex flex-col max-w-[85%] ${msg.senderId === user?.uid ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                                    >
                                        <span className="text-[10px] text-gray-400 mb-1 ml-1">{msg.senderName}</span>
                                        <div 
                                            className={`px-3 py-2 rounded-2xl text-sm ${
                                                msg.senderId === user?.uid 
                                                ? 'bg-[#c2f575] text-[#1A1A4E] rounded-tr-sm' 
                                                : 'bg-white/10 text-white rounded-tl-sm'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
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
                                className="w-10 h-10 bg-[#c2f575] text-[#1A1A4E] rounded-xl flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
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
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${isHandRaised ? 'bg-[#c2f575] text-[#1A1A4E] shadow-[0_0_30px_rgba(194,245,117,0.3)]' : 'bg-white/10 text-white'}`}>
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
                                        : 'bg-[#c2f575] text-[#1A1A4E] hover:scale-105 active:scale-95'
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
                                                {hand.status === 'waiting' ? (
                                                    <button 
                                                        onClick={() => handleToggleAudio(hand.uid, hand.name, 'waiting')}
                                                        className="w-10 h-10 bg-[#c2f575] text-[#1A1A4E] rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                                                        title="Allow to Speak"
                                                    >
                                                        <Mic size={18} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleToggleAudio(hand.uid, hand.name, 'speaking')}
                                                        className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                                                        title="Mute Student"
                                                    >
                                                        <MicOff size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'qa' && (
                    <div className="h-full flex items-center justify-center p-6 text-center text-gray-500 text-sm">
                        Q&A feature coming soon.
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

