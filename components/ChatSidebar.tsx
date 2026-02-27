import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, User } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';

interface Message {
    id: string;
    text: string;
    senderName: string;
    senderId: string;
    timestamp: any;
}

interface ChatSidebarProps {
    zoneId: string;
    sessionId: string;
    isOpen: boolean;
    onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ zoneId, sessionId, isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const user = auth.currentUser;

    useEffect(() => {
        if (!zoneId || !sessionId) return;

        const messagesRef = collection(db, `zones/${zoneId}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [zoneId, sessionId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        try {
            await addDoc(collection(db, `zones/${zoneId}/messages`), {
                text: newMessage,
                senderId: user.uid,
                senderName: user.displayName || 'Anonymous',
                timestamp: serverTimestamp()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 h-full w-80 bg-white/5 backdrop-blur-3xl border-l border-white/10 flex flex-col z-50 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#040457]/20">
                <h3 className="text-primary font-black uppercase tracking-widest text-xs flex items-center gap-3">
                    <MessageSquare size={16} /> Live Chat
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                {!isMe && <User size={10} className="text-gray-400" />}
                                <span className="text-[10px] font-bold text-gray-400">{msg.senderName}</span>
                            </div>
                            <div className={`p-3 rounded-2xl max-w-[85%] text-sm font-medium leading-relaxed ${isMe
                                ? 'bg-primary text-secondary rounded-tr-none'
                                : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#040457]/40">
                <div className="relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full bg-white/10 border border-white/10 focus:border-primary rounded-full pl-5 pr-12 py-3 text-sm text-white placeholder-gray-500 outline-none transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-secondary rounded-full hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatSidebar;
