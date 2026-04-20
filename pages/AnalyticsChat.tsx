import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Sparkles, 
  ArrowLeft, 
  Bot, 
  User, 
  Loader2, 
  Terminal,
  Zap,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  status?: string;
}

const AnalyticsChat: React.FC = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiStatus]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    setAiStatus('Initializing Neural Net...');

    try {
      // Status update simulation for better UX
      setTimeout(() => setAiStatus('Scanning 500 student records...'), 1500);
      setTimeout(() => setAiStatus('Aggregating exam scores...'), 3500);
      setTimeout(() => setAiStatus('Generating insights with Gemini...'), 6000);

      const askZoneAnalytics = httpsCallable(functions!, 'askZoneAnalytics');
      const result = await askZoneAnalytics({ zoneId, userMessage: userMsg });
      
      const responseData = result.data as { response: string };
      setMessages(prev => [...prev, { role: 'assistant', content: responseData.response }]);
    } catch (error: any) {
      console.error('AI Analysis Error:', error);
      toast.error('AI Analysis failed. Please try again.');
    } finally {
      setLoading(false);
      setAiStatus('');
    }
  };

  const suggestedPrompts = [
    "Who are the top 5 performers this month?",
    "Summarize student engagement across all exams.",
    "Identify patterns of abnormal submission behavior.",
    "Which student segments need immediate attention?"
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-[#fbfbfb] flex flex-col font-sans">
      {/* Premium Header */}
      <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-indigo-900 hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-[#1A1A4E] tracking-tight flex items-center gap-3">
              AI Data Analyst <Sparkles className="text-[#c2f575]" size={20} />
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zone Insights Engine • Gemini 1.5 Pro</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <Zap size={14} className="text-indigo-600" />
          <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Ultra Performance Mode Enabled</span>
        </div>
      </header>

      {/* Message Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-0 py-10 scroll-smooth custom-scrollbar"
      >
        <div className="max-w-3xl mx-auto space-y-12">
          {messages.length === 0 && (
            <div className="py-20 text-center space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
               <div className="w-24 h-24 bg-[#c2f575] rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-[#c2f575]/20">
                 <Bot size={48} className="text-[#1A1A4E]" />
               </div>
               <div className="space-y-3">
                 <h2 className="text-4xl font-black text-[#1A1A4E] tracking-tighter">How can I help you analyze your Zone?</h2>
                 <p className="text-gray-400 font-medium text-lg">Ask about student performance, exam statistics, or engagement trends.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10">
                 {suggestedPrompts.map((prompt, i) => (
                   <button
                     key={i}
                     onClick={() => { setInput(prompt); }}
                     className="p-6 bg-white border border-gray-100 rounded-3xl text-left hover:border-[#c2f575] hover:shadow-xl hover:shadow-[#c2f575]/5 transition-all group"
                   >
                     <p className="text-sm font-bold text-[#1A1A4E] group-hover:text-indigo-600">{prompt}</p>
                   </button>
                 ))}
               </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}
            >
              <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm 
                ${msg.role === 'assistant' ? 'bg-[#1A1A4E] text-[#c2f575]' : 'bg-white border border-gray-100 text-indigo-900'}`}
              >
                {msg.role === 'assistant' ? <Bot size={24} /> : <User size={24} />}
              </div>
              
              <div className="flex-1 space-y-2 overflow-hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {msg.role === 'assistant' ? 'Gemini Analyst' : 'You'}
                </p>
                <div className={`prose prose-indigo max-w-none text-[#1A1A4E] leading-relaxed font-medium 
                  ${msg.role === 'assistant' ? 'text-lg' : 'text-md bg-indigo-50/50 p-4 rounded-2xl'}`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-6 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1A4E] text-[#c2f575] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin" />
              </div>
              <div className="flex-1 space-y-4">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Terminal size={12} /> {aiStatus}
                </p>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                  <div className="h-4 bg-gray-100 rounded-full w-1/2"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <footer className="p-8 bg-[#fbfbfb]">
        <div className="max-w-3xl mx-auto relative group">
          <form 
            onSubmit={handleSend}
            className="relative flex items-center gap-3 bg-white border-2 border-gray-100 focus-within:border-indigo-500 rounded-[2.5rem] p-3 shadow-2xl shadow-indigo-900/5 transition-all"
          >
            <div className="pl-4 text-indigo-400 group-focus-within:text-indigo-600 transition-colors">
              <Sparkles size={20} />
            </div>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your data..."
              className="flex-1 py-4 bg-transparent border-none focus:ring-0 text-[#1A1A4E] font-bold placeholder:text-gray-300"
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="w-14 h-14 bg-[#1A1A4E] text-[#c2f575] rounded-[1.75rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Info size={12} className="text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Powered by Gemini 1.5 Pro • Analyzes up to 500 records per query</p>
          </div>
        </div>
      </footer>

      <style>{`
        .prose h1, .prose h2, .prose h3 {
          font-weight: 950;
          color: #1A1A4E;
          letter-spacing: -0.02em;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .prose ul, .prose ol {
          margin-top: 1rem;
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .prose li {
          margin-bottom: 0.5rem;
        }
        .prose strong {
          font-weight: 800;
          color: #1A1A4E;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
};

export default AnalyticsChat;
