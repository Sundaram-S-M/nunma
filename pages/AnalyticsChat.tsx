import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';
import { 
  Send, 
  Sparkles, 
  ArrowLeft, 
  Bot, 
  User, 
  Loader2, 
  Terminal,
  Zap,
  Info,
  Download
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
  const { user } = useAuth();
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

  const handleExportExcel = (content: string) => {
    let lines = [];
    
    // 1. Isolate the table data
    const codeBlockMatch = content.match(/```(?:csv|text)?\n([\s\S]*?)```/i);
    if (codeBlockMatch) {
      lines = codeBlockMatch[1].trim().split('\n');
    } else {
      lines = content.split('\n').filter(line => line.trim().length > 0 && (line.includes(',') || line.includes('"') || line.includes('|')));
    }

    if (lines.length < 2) {
      toast.error('Failed to export data. No valid table found.');
      return;
    }

    // 2. Parse into a 2D array
    let parsedData: any[][] = [];
    const isMarkdownTable = lines[0].includes('|');

    if (isMarkdownTable) {
      lines.forEach(line => {
        if (line.match(/^[\s|:-]+$/)) return; // Skip Markdown separator line (e.g. |---|---|)
        
        let row = line.split('|').map(cell => cell.trim());
        if (row.length > 0 && row[0] === '') row.shift();
        if (row.length > 0 && row[row.length - 1] === '') row.pop();
        
        parsedData.push(row);
      });
    } else {
      // Basic CSV Parser
      lines.forEach(line => {
        const row = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        row.push(currentValue.trim());
        parsedData.push(row);
      });
    }

    try {
      if (parsedData.length < 1) return;
      
      const headers = parsedData[0];
      const dataRows = parsedData.slice(1);

      const rowsHtml = dataRows.map(row => `
        <tr>
          ${row.map(cell => `<td>${cell}</td>`).join('')}
        </tr>
      `).join('\\n');

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Analytics Data</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            .header { background-color: #C2F575; color: #052E16; font-weight: bold; text-align: left; padding: 5px; }
            td { padding: 5px; white-space: nowrap; }
          </style>
        </head>
        <body>
          <table border="1">
            <tr>
              <td rowspan="4" colspan="3" style="border:none; text-align:left; vertical-align:top;">
                <img src="${window.location.origin}/assets/logo-full.png" alt="Nunma" height="60" />
              </td>
              <td style="border:none;"></td>
              <td style="border:none;"></td>
            </tr>
            <tr>
              <td style="border:none; font-weight:bold; color:#052E16;">Zone Name</td>
              <td style="border:none;">Global Platform</td>
            </tr>
            <tr>
              <td style="border:none; font-weight:bold; color:#052E16;">User Name</td>
              <td style="border:none;">${user?.name || 'Tutor'}</td>
            </tr>
            <tr>
              <td style="border:none;"></td>
              <td style="border:none;"></td>
            </tr>
            <tr>
              ${headers.map(h => `<th class="header">${h}</th>`).join('')}
            </tr>
            ${rowsHtml}
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Analytics_Export_${new Date().getTime()}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Exported to Excel successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. No valid table found.');
    }
  };

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
      setTimeout(() => setAiStatus('Generating insights with Nunma Agent...'), 6000);

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
            <h1 className="text-xl font-black text-nunma-forest tracking-tight flex items-center gap-3">
              AI Data Analyst <Sparkles className="text-[#c2f575]" size={20} />
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zone Insights Engine • Nunma Agent</p>
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
                 <Bot size={48} className="text-nunma-forest" />
               </div>
               <div className="space-y-3">
                 <h2 className="text-4xl font-black text-nunma-forest tracking-tighter">How can I help you analyze your Zone?</h2>
                 <p className="text-gray-400 font-medium text-lg">Ask about student performance, exam statistics, or engagement trends.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10">
                 {suggestedPrompts.map((prompt, i) => (
                   <button
                     key={i}
                     onClick={() => { setInput(prompt); }}
                     className="p-6 bg-white border border-gray-100 rounded-3xl text-left hover:border-[#c2f575] hover:shadow-xl hover:shadow-[#c2f575]/5 transition-all group"
                   >
                     <p className="text-sm font-bold text-nunma-forest group-hover:text-indigo-600">{prompt}</p>
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
                ${msg.role === 'assistant' ? 'bg-nunma-forest text-[#c2f575]' : 'bg-white border border-gray-100 text-indigo-900'}`}
              >
                {msg.role === 'assistant' ? <Bot size={24} /> : <User size={24} />}
              </div>
              
              <div className="flex-1 space-y-2 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {msg.role === 'assistant' ? 'Nunma Agent' : 'You'}
                  </p>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleExportExcel(msg.content)}
                      className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors shadow-sm"
                      title="Export tabular data to Excel"
                    >
                      <Download size={14} />
                      Export to Excel
                    </button>
                  )}
                </div>
                <div className={`prose prose-indigo max-w-none text-nunma-forest leading-relaxed font-medium 
                  ${msg.role === 'assistant' ? 'text-lg' : 'text-md bg-indigo-50/50 p-4 rounded-2xl'}`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-6 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-nunma-forest text-[#c2f575] flex items-center justify-center">
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
              className="flex-1 py-4 bg-transparent border-none focus:ring-0 text-nunma-forest font-bold placeholder:text-gray-300"
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="w-14 h-14 bg-nunma-forest text-[#c2f575] rounded-[1.75rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Info size={12} className="text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Powered by Nunma Agent • Analyzes up to 500 records per query</p>
          </div>
        </div>
      </footer>

      <style>{`
        .prose h1, .prose h2, .prose h3 {
          font-weight: 950;
          color: #052E16;
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
          color: #052E16;
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
