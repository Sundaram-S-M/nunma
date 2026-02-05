
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  sender: 'me' | 'other';
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  online: boolean;
  type: 'chat' | 'community' | 'collaboration';
}

const Inbox: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialTab = (params.get('tab') as any) || 'chat';

  const [activeCategory, setActiveCategory] = useState<'chat' | 'community' | 'collaboration'>(initialTab);
  const [selectedChatId, setSelectedChatId] = useState<string | null>('1');
  const [messageText, setMessageText] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  
  const addMenuRef = useRef<HTMLDivElement>(null);

  const chats: Chat[] = [
    { id: '1', name: 'Sundaram S M', avatar: 'https://picsum.photos/seed/sundaram/80/80', lastMessage: 'Hey! Are we still on for the mockup?', time: '10:42 AM', unreadCount: 2, online: true, type: 'chat' },
    { id: '2', name: 'Design Squad', avatar: 'https://picsum.photos/seed/design/80/80', lastMessage: 'Sarah: The new icons look amazing!', time: 'Yesterday', online: false, type: 'community' },
    { id: '3', name: 'Pollards Masterclass Forum', avatar: 'https://picsum.photos/seed/growth/80/80', lastMessage: 'Joined community forum...', time: 'Just now', online: true, type: 'community' },
    { id: '4', name: 'EngineeringSync', avatar: 'https://picsum.photos/seed/eng/80/80', lastMessage: 'PR #452 merged successfully.', time: 'Monday', online: false, type: 'collaboration' },
  ];

  const messages: Message[] = [
    { id: 'm1', text: 'Hi Sundaram! Hope your week is going great.', sender: 'me', time: '10:30 AM', status: 'read' },
    { id: 'm2', text: 'Absolutely! Busy with the new Nunma modules.', sender: 'other', time: '10:32 AM' },
    { id: 'm3', text: 'Hey! Are we still on for the mockup?', sender: 'other', time: '10:42 AM' },
  ];

  const categories = [
    { id: 'chat', label: 'CHAT', icon: <MessageCircle size={16} />, color: 'text-blue-500' },
    { id: 'community', label: 'COMMUNITY', icon: <Users size={16} />, color: 'text-[#7cc142]' },
    { id: 'collaboration', label: 'COLLAB', icon: <Zap size={16} />, color: 'text-purple-500' },
  ];

  const filteredChats = chats.filter(c => c.type === activeCategory);
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
                    {[1,2].map(i => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                         <div className="flex items-center gap-4">
                            <img src={`https://picsum.photos/seed/fol${i}/40/40`} className="w-10 h-10 rounded-xl" alt="" />
                            <p className="text-sm font-black text-indigo-900">User Alpha {i}</p>
                         </div>
                         <button className="p-2 bg-[#c1e60d] text-indigo-900 rounded-xl"><Plus size={16}/></button>
                      </div>
                    ))}
                 </div>
                 <button className="w-full py-5 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Create Group</button>
              </div>
           </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-96 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-10 pb-4 flex items-center justify-between">
          <h2 className="text-4xl font-black text-[#1A1A4E] tracking-tighter">Inbox</h2>
        </div>

        <div className="px-8 py-4">
          <div className="flex bg-gray-50 p-1.5 rounded-[1.75rem] border border-gray-100 gap-1">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex-1 flex flex-col items-center justify-center py-4 rounded-2xl transition-all border
                  ${activeCategory === cat.id 
                    ? 'bg-white border-[#c1e60d] text-indigo-900 shadow-xl' 
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
        
        {/* Search & Add Section moved here */}
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
                className={`w-full flex items-center gap-5 p-5 rounded-[2rem] transition-all group relative
                  ${selectedChatId === chat.id ? 'bg-[#c1e60d]/10 border border-[#c1e60d]/30' : 'hover:bg-gray-50'}
                `}
              >
                <div className="relative shrink-0">
                  <img src={chat.avatar} alt={chat.name} className="w-14 h-14 rounded-[1.25rem] object-cover shadow-sm" />
                  {chat.online && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#7cc142] border-[4px] border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-black text-indigo-900 text-sm truncate">{chat.name}</h4>
                    <span className="text-[9px] font-black text-gray-300 uppercase">{chat.time}</span>
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
              <p className="text-[10px] font-black uppercase tracking-widest">No Active Threads</p>
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
                  <img src={activeChat.avatar} alt={activeChat.name} className="w-14 h-14 rounded-[1.25rem] object-cover shadow-xl" />
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

            <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-gray-50/10 custom-scrollbar">
              <div className="flex justify-center mb-10">
                <span className="px-6 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] shadow-sm">Today</span>
              </div>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-6 duration-700`}>
                  <div className="max-w-[75%] group relative">
                    <div className={`p-6 rounded-[2.5rem] shadow-lg relative ${
                      msg.sender === 'me' 
                        ? 'bg-indigo-900 text-white rounded-tr-none' 
                        : 'bg-white text-indigo-900 rounded-tl-none border border-gray-100'
                    }`}>
                      <p className="text-base font-medium leading-relaxed">{msg.text}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-3 px-4 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{msg.time}</span>
                      {msg.sender === 'me' && <CheckCheck size={16} className={msg.status === 'read' ? 'text-[#c1e60d]' : 'text-gray-200'} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-10 py-8 bg-white border-t border-gray-50">
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
                        <p className="px-5 py-3 text-[9px] font-black text-indigo-900/30 uppercase tracking-[0.25em] border-b border-gray-50 mb-3">Share Experience</p>
                        <div className="space-y-2">
                          {[
                            { label: 'Photos & Videos', icon: <ImageIcon size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                            { label: 'Documents', icon: <FileText size={20} />, color: 'text-orange-500', bg: 'bg-orange-50' },
                            { label: 'Live Camera', icon: <Camera size={20} />, color: 'text-red-500', bg: 'bg-red-50' },
                            { label: 'Contact', icon: <UserPlus size={20} />, color: 'text-purple-500', bg: 'bg-purple-50' }
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
                    placeholder="Compose your message..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-[2.25rem] pl-8 pr-16 py-5 focus:outline-none focus:ring-4 focus:ring-[#c1e60d]/10 font-medium text-indigo-900 transition-all shadow-inner text-lg"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                     <button className="text-gray-300 hover:text-indigo-900">
                       <Smile size={24} />
                     </button>
                  </div>
                </div>
                <button 
                  onClick={() => setMessageText('')}
                  className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all active:scale-90
                    ${messageText.trim() ? 'bg-[#c1e60d] text-indigo-900 shadow-[#c1e60d]/20 scale-105' : 'bg-indigo-900 text-white shadow-indigo-900/20'}
                  `}
                >
                  {messageText.trim() ? <Send size={28} strokeWidth={2.5} className="ml-1" /> : <Mic size={28} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-gray-50/5">
             <div className="w-64 h-64 bg-white rounded-[5rem] flex items-center justify-center mb-12 relative shadow-2xl border border-gray-100">
                <MessageCircle size={100} className="text-gray-50" strokeWidth={1} />
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#c1e60d] rounded-[2.5rem] flex items-center justify-center text-indigo-900 shadow-2xl rotate-12 ring-8 ring-white">
                   <Zap size={44} fill="currentColor" />
                </div>
             </div>
             <h3 className="text-5xl font-black text-indigo-900 tracking-tighter mb-6 leading-none">Your Workspace</h3>
             <p className="text-gray-400 font-medium max-w-sm mx-auto mb-12 text-xl leading-relaxed">
               Pick a thread from your workspace categories to begin the stream of collaboration.
             </p>
             <button className="bg-indigo-900 text-white px-14 py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-indigo-900/20 hover:scale-105 transition-all flex items-center gap-4">
                Explore The Squad <ArrowRight size={22} className="text-[#c1e60d]" />
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
