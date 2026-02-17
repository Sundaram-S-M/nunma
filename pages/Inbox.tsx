
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, setDoc, doc, updateDoc,
  getDocs, limit, or, getDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
  Plus,
  Send,
  MessageCircle, Users, Zap, X, Search, MoreVertical,
  ImageIcon, Smile, Mic, Phone, Video, CheckCheck,
  FileText, Camera, Mail, ArrowRight, UserPlus
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  status?: 'sent' | 'delivered' | 'read';
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount?: number;
  online: boolean;
  type: 'chat' | 'community' | 'collaboration';
  participants: string[];
  otherUser?: {
    uid: string;
    name: string;
    avatar: string;
    online?: boolean; // Add if we track online status
  };
}

const Inbox: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialTab = (params.get('tab') as any) || 'chat';
  const initialChatId = params.get('chatId');
  const targetUserId = params.get('userId');

  const [activeCategory, setActiveCategory] = useState<'chat' | 'community' | 'collaboration'>(initialTab);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId);
  const [messageText, setMessageText] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const addMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeChats = onSnapshot(q, async (snapshot) => {
      const chatData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let otherUser = undefined;

        // If it's a 1:1 chat, try to resolve the other participant
        if (data.type === 'chat' && data.participants && data.participants.length === 2) {
          const otherId = data.participants.find((p: string) => p !== user.uid);
          if (otherId) {
            // Ideally, fetch this user's basic info. 
            // For performance in a list, you might want to cache this or store a denormalized 'participantsInfo' map in the chat doc.
            // But for now, let's fetch individual docs or use what we have.
            // NOTE: Fetching inside a map like this inside onSnapshot can be expensive and cause valid reads. 
            // Better approach: Store participant names in the chat doc OR use a separate listener for users.
            // For simplicity in this iteration, we will try to get it if we can, or just use static data if available.

            // OPTIMIZATION: We'll do a quick fetch ONLY if we don't have the data, but doing async inside onSnapshot callback 
            // requires handling the promise.

            try {
              const userSnap = await getDoc(doc(db, 'users', otherId));
              if (userSnap.exists()) {
                otherUser = userSnap.data();
              }
            } catch (e) {
              console.error("Error fetching other user", e);
            }
          }
        }

        return {
          id: docSnap.id,
          ...data,
          otherUser,
          // Override name/avatar for 1:1 chats if we found the user
          name: data.type === 'chat' && otherUser ? otherUser.name : data.name,
          avatar: data.type === 'chat' && otherUser ? otherUser.avatar : data.avatar
        };
      }));
      setChats(chatData as Chat[]);
      setLoading(false);
    });

    return () => unsubscribeChats();
  }, [user]);

  // Handle creating/finding chat when targetUserId is present
  useEffect(() => {
    const handleDirectMessage = async () => {
      if (!user || !targetUserId) return;

      // Check if we already have a chat with this user
      // We can check our local 'chats' state if it uses a listener, but better to query to be sure if we haven't loaded yet.
      // Or since we have 'chats' from the listener above, we can check that.

      // Wait for chats to load if they haven't
      if (loading) return;

      const existingChat = chats.find(c =>
        c.type === 'chat' &&
        c.participants.includes(targetUserId) &&
        c.participants.includes(user.uid)
      );

      if (existingChat) {
        setSelectedChatId(existingChat.id);
        // Optionally clear the param so refreshing doesn't re-trigger logic unnecessary, but keeping it is fine too.
      } else {
        // Create new chat
        try {
          const newChatRef = await addDoc(collection(db, 'conversations'), {
            type: 'chat',
            participants: [user.uid, targetUserId],
            createdAt: serverTimestamp(),
            lastMessage: '',
            lastMessageTime: serverTimestamp(),
            unreadCounts: {
              [user.uid]: 0,
              [targetUserId]: 0
            }
            // We don't verify if targetUser exists here, assuming valid ID passed.
          });
          setSelectedChatId(newChatRef.id);
        } catch (err) {
          console.error("Error creating chat:", err);
        }
      }
    };

    handleDirectMessage();
  }, [user, targetUserId, chats, loading]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', selectedChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[]);
    });

    return () => unsubscribeMessages();
  }, [selectedChatId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChatId || !user) return;

    const msgText = messageText;
    setMessageText('');

    try {
      await addDoc(collection(db, 'conversations', selectedChatId, 'messages'), {
        text: msgText,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        status: 'sent'
      });

      await updateDoc(doc(db, 'conversations', selectedChatId), {
        lastMessage: msgText,
        lastMessageTime: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const categories = [
    { id: 'chat', label: 'CHAT', icon: <MessageCircle size={16} />, color: 'text-blue-500' },
    { id: 'community', label: 'COMMUNITY', icon: <Users size={16} />, color: 'text-[#7cc142]' },
    { id: 'collaboration', label: 'COLLAB', icon: <Zap size={16} />, color: 'text-purple-500' },
  ];

  const filteredChats = chats.filter(c => (c.type || 'chat') === activeCategory);
  const activeChat = chats.find(c => c.id === selectedChatId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-[calc(100vh-140px)] flex bg-[#fbfbfb] rounded-[4rem] border border-gray-100 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-700 relative">

      {showCreateGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
              <div>
                <h3 className="text-2xl font-black text-indigo-900">New Collab Group</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Mutual Followers Only</p>
              </div>
              <button onClick={() => setShowCreateGroup(false)} className="p-3 text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input type="text" placeholder="Search mutual followers..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 font-bold text-indigo-900 focus:outline-none" />
              </div>
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <img src={`https://picsum.photos/seed/fol${i}/40/40`} className="w-10 h-10 rounded-xl" alt="" />
                      <p className="text-sm font-black text-indigo-900">User Alpha {i}</p>
                    </div>
                    <button className="p-2 bg-[#c2f575] text-indigo-900 rounded-xl"><Plus size={16} /></button>
                  </div>
                ))}
              </div>
              <button className="w-full py-5 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Create Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-96 border-r border-gray-100 flex flex-col bg-white overflow-hidden">
        <div className="p-10 pb-4 flex items-center justify-between">
          <h2 className="text-4xl font-black text-[#1A1A4E] tracking-tighter">Inbox</h2>
        </div>

        <div className="px-8 py-4">
          <div className="flex bg-gray-50 p-1.5 rounded-[1.75rem] border border-gray-100 gap-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  setSelectedChatId(null);
                }}
                className={`flex-1 flex flex-col items-center justify-center py-4 rounded-2xl transition-all border
                  ${activeCategory === cat.id
                    ? 'bg-white border-[#c2f575] text-indigo-900 shadow-xl'
                    : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'
                  }
                `}
              >
                <div className={`${activeCategory === cat.id ? cat.color : 'text-gray-200'} mb-1`}>{cat.icon}</div>
                <span className="text-[8px] font-black tracking-[0.2em] leading-none">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative group flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-200 group-focus-within:text-indigo-900 transition-colors" size={18} />
              <input
                type="text"
                placeholder={`Search in ${activeCategory}...`}
                className="w-full bg-gray-50 border border-transparent focus:border-indigo-900/10 focus:bg-white rounded-[1.5rem] pl-14 pr-4 py-4 text-xs font-bold text-indigo-900 placeholder:text-gray-300 transition-all outline-none"
              />
            </div>
            {activeCategory === 'collaboration' && (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-12 h-12 bg-indigo-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-900/10 hover:scale-110 active:scale-95 transition-all"
              >
                <Plus size={24} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2 custom-scrollbar">
          {filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full flex items-center gap-5 p-5 rounded-[2.5rem] transition-all group relative border ${selectedChatId === chat.id
                  ? 'bg-[#c2f575]/10 border-[#c2f575]'
                  : 'bg-white border-transparent hover:bg-gray-50'
                  }`}
              >
                <div className="relative shrink-0">
                  <img src={chat.avatar || 'https://picsum.photos/seed/user/80/80'} alt={chat.name} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                  {chat.online && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#7cc142] border-[4px] border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-black text-indigo-900 text-sm truncate">{chat.name}</h4>
                    <span className="text-[9px] font-black text-gray-300 uppercase">
                      {chat.lastMessageTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${chat.unreadCount ? 'text-indigo-900 font-black' : 'text-gray-400 font-medium'}`}>
                    {chat.lastMessage}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-24 opacity-20 flex flex-col items-center">
              <Mail size={40} className="mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Threads Found</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedChatId && activeChat ? (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-500">
            <div className="px-12 py-8 flex items-center justify-between border-b border-gray-50 bg-white sticky top-0 z-30">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img src={activeChat.avatar || 'https://picsum.photos/seed/user/80/80'} alt={activeChat.name} className="w-14 h-14 rounded-2xl object-cover shadow-xl" />
                  {activeChat.online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#7cc142] border-[3px] border-white rounded-full"></div>}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-indigo-900 tracking-tighter leading-none mb-2">{activeChat.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${activeChat.online ? 'bg-[#7cc142]' : 'bg-gray-300'}`}></span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeChat.online ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 rounded-2xl text-indigo-900 transition-all border border-gray-100 shadow-sm bg-white">
                  <Phone size={20} />
                </button>
                <button className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 rounded-2xl text-gray-300 hover:text-indigo-900 transition-all bg-white border border-gray-50">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-8 bg-gray-50/10 custom-scrollbar">
              <div className="flex justify-center mb-10">
                <span className="px-6 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] shadow-sm">Real-time Stream</span>
              </div>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                  <div className="max-w-[70%] group relative">
                    <div className={`p-6 rounded-[2.5rem] shadow-xl relative ${msg.senderId === user?.uid
                      ? 'bg-indigo-900 text-white rounded-tr-none'
                      : 'bg-white text-indigo-900 rounded-tl-none border border-gray-100'
                      }`}>
                      <p className="text-base font-medium leading-relaxed">{msg.text}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-3 px-4 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                        {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.senderId === user?.uid && <CheckCheck size={14} className={msg.status === 'read' ? 'text-[#c2f575]' : 'text-gray-200'} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-10 py-8 bg-white border-t border-gray-100">
              <div className="flex items-center gap-5">
                <div className="relative" ref={addMenuRef}>
                  <button
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className={`w-14 h-14 rounded-2xl transition-all flex items-center justify-center shadow-xl ${showAddMenu ? 'bg-indigo-900 text-white rotate-45 scale-90' : 'text-gray-400 hover:text-indigo-900 hover:bg-gray-50 bg-white border border-gray-100'}`}
                  >
                    <Plus size={28} />
                  </button>
                  {showAddMenu && (
                    <div className="absolute bottom-full left-0 mb-6 w-64 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 p-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
                      <p className="px-5 py-3 text-[9px] font-black text-indigo-900/30 uppercase tracking-[0.25em] border-b border-gray-50 mb-3">Attach Resource</p>
                      <div className="space-y-2">
                        {[
                          { label: 'Cloud Documents', icon: <FileText size={20} />, color: 'text-orange-500', bg: 'bg-orange-50' },
                          { label: 'Capture & Send', icon: <Camera size={20} />, color: 'text-red-500', bg: 'bg-red-50' },
                          { label: 'Contact Node', icon: <UserPlus size={20} />, color: 'text-purple-500', bg: 'bg-purple-50' }
                        ].map((opt) => (
                          <button key={opt.label} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-indigo-900 transition-all group">
                            <div className={`w-10 h-10 rounded-2xl ${opt.bg} ${opt.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>{opt.icon}</div>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-[2.25rem] pl-8 pr-16 py-5 focus:outline-none focus:ring-4 focus:ring-[#c2f575]/10 font-bold text-indigo-900 transition-all shadow-inner text-lg"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <button className="text-gray-300 hover:text-indigo-900">
                      <Smile size={24} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSendMessage}
                  className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all active:scale-90
                    ${messageText.trim() ? 'bg-[#c2f575] text-indigo-900 shadow-[#c2f575]/20 scale-105' : 'bg-indigo-900 text-white shadow-indigo-900/20'}
                  `}
                >
                  {messageText.trim() ? <Send size={28} strokeWidth={2.5} className="ml-1" /> : <Mic size={28} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-gray-50/5">
            <div className="w-72 h-72 bg-white rounded-[6rem] flex items-center justify-center mb-12 relative shadow-2xl border border-gray-100">
              <MessageCircle size={120} className="text-gray-50" strokeWidth={1} />
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#c2f575] rounded-[3rem] flex items-center justify-center text-indigo-900 shadow-2xl rotate-12 ring-8 ring-white animate-bounce-slow">
                <Zap size={48} fill="currentColor" />
              </div>
            </div>
            <h3 className="text-5xl font-black text-indigo-900 tracking-tighter mb-6 leading-none uppercase">Collaboration Hub</h3>
            <p className="text-gray-400 font-semibold max-w-sm mx-auto mb-12 text-xl leading-relaxed italic">
              Select a conversation to sync with your squad and start the stream.
            </p>
            <button className="bg-indigo-900 text-white px-16 py-7 rounded-[3rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-indigo-900/20 hover:scale-105 transition-all flex items-center gap-4">
              Explore The Squad <ArrowRight size={22} className="text-[#c2f575]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
