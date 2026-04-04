import React, { useState, useRef } from 'react';
import { Upload, Trash2, Plus, Clock, Brain, Loader2, Award, FileText, Sparkles } from 'lucide-react';

export interface MCQ {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    timerSeconds?: number;
    marks?: number;
}

interface MCQBuilderProps {
    questions: MCQ[];
    setQuestions: React.Dispatch<React.SetStateAction<MCQ[]>>;
}

const MCQBuilder: React.FC<MCQBuilderProps> = ({ questions, setQuestions }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingMore, setIsGeneratingMore] = useState(false);
    const [targetCount, setTargetCount] = useState(5);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddQuestion = () => {
        const newQ: MCQ = {
            id: Date.now().toString(),
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            timerSeconds: 60,
            marks: 5
        };
        setQuestions([...questions, newQ]);
    };

    const handleUpdateQuestion = (id: string, field: keyof MCQ, value: any) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const handleUpdateOption = (id: string, optionIndex: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id === id) {
                const newOptions = [...q.options];
                newOptions[optionIndex] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const handleDeleteQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const generateMockQuestions = (count: number, offset: number = 0): MCQ[] => {
        return Array.from({ length: count }).map((_, i) => ({
            id: `${Date.now()}_${offset + i}`,
            question: i % 2 === 0 
                ? `Based on the uploaded document, what is the core principle mentioned in section ${offset + i + 1}?`
                : `Which of the following aligns with the framework analyzed in chapter ${offset + i + 1}?`,
            options: ['To define core terminology', 'To establish practical applications', 'To evaluate historical context', 'To summarize theoretical models'],
            correctAnswer: Math.floor(Math.random() * 4),
            timerSeconds: 60,
            marks: 5
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsGenerating(true);

        setTimeout(() => {
            const generated = generateMockQuestions(targetCount);
            setQuestions([...questions, ...generated]);
            setIsGenerating(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }, 3000);
    };

    const handleGenerateMore = () => {
        setIsGeneratingMore(true);
        setTimeout(() => {
            const moreQuestions = generateMockQuestions(5, questions.length);
            setQuestions([...questions, ...moreQuestions]);
            setIsGeneratingMore(false);
        }, 2000);
    };

    return (
        <div className="w-full flex flex-col gap-10">

            <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
                
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8 z-10 border border-indigo-50">
                    <Brain size={48} className="text-indigo-600" />
                </div>
                
                <h3 className="text-4xl font-black text-[#040457] mb-4 z-10 tracking-tight">AI Question Generator</h3>
                <p className="text-gray-500 font-bold max-w-lg z-10 mb-10 leading-relaxed text-sm">
                    Upload your syllabus or study material PDF. Our AI model will automatically extract key concepts and generate ready-to-use exact mock questions.
                </p>

                <div className="z-10 flex flex-col items-center gap-8 w-full max-w-md">
                    <div className="w-full space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question Quantity</label>
                            <span className="text-lg font-black text-indigo-600 bg-indigo-50 px-4 py-1 rounded-full">{targetCount} Questions</span>
                        </div>
                        <input 
                            type="range" 
                            min="2" 
                            max="20" 
                            value={targetCount} 
                            onChange={(e) => setTargetCount(parseInt(e.target.value))} 
                            className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-gray-300 uppercase tracking-tighter px-1">
                            <span>2 Min</span>
                            <span>20 Max</span>
                        </div>
                    </div>

                    <input
                        type="file"
                        accept=".pdf,.txt,.docx"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating}
                        className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl transition-all z-10 flex items-center justify-center gap-4 border ${isGenerating
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                            : 'bg-[#040457] text-white border-[#040457] hover:scale-[1.02] active:scale-95'
                            }`}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                Analyzing Document...
                            </>
                        ) : (
                            <>
                                <Upload size={24} className="text-[#c2f575]" />
                                Upload PDF & Generate
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mt-6">
                <div>
                    <h4 className="text-2xl font-black text-[#040457] tracking-tight">Question Bank</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Currently Contains {questions.length} Questions</p>
                </div>
                <button
                    onClick={handleAddQuestion}
                    className="px-8 py-4 bg-white text-[#040457] border-2 border-gray-100 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-[#c2f575] hover:shadow-lg transition-all flex items-center gap-3 active:scale-95"
                >
                    <Plus size={18} /> Add Empty Question
                </button>
            </div>

            <div className="space-y-8 min-h-[200px]">
                {questions.length === 0 ? (
                    <div className="text-center py-24 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-100">
                        <FileText size={64} className="text-gray-200 mx-auto mb-6" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No questions in the vault.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-8">
                            {questions.map((q, index) => (
                                <div key={q.id} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50 relative group hover:shadow-xl transition-all duration-500">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex items-center gap-6 w-full">
                                            <div className="w-14 h-14 rounded-2xl bg-[#040457] text-[#c2f575] flex flex-shrink-0 items-center justify-center text-xl font-black shadow-lg">
                                                {index + 1}
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={(e) => handleUpdateQuestion(q.id, 'question', e.target.value)}
                                                placeholder="Enter Question Statement..."
                                                className="w-full text-xl font-black text-[#040457] outline-none border-b-4 border-transparent focus:border-[#c2f575]/20 pb-2 transition-all placeholder-gray-200 tracking-tight"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleDeleteQuestion(q.id)}
                                            className="ml-6 p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pl-20">
                                        {q.options.map((opt, optIdx) => (
                                            <div key={optIdx} className="flex items-center gap-4 group/opt">
                                                <button
                                                    onClick={() => handleUpdateQuestion(q.id, 'correctAnswer', optIdx)}
                                                    className={`w-8 h-8 rounded-xl border-4 flex items-center justify-center flex-shrink-0 transition-all ${q.correctAnswer === optIdx ? 'bg-[#c2f575] border-[#c2f575] rotate-45' : 'border-gray-100 hover:border-[#c2f575]/50 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {q.correctAnswer === optIdx && <div className="w-3 h-3 bg-[#040457] -rotate-45 rounded-sm" />}
                                                </button>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                                    placeholder={`Enter Option ${optIdx + 1}`}
                                                    className={`w-full py-5 px-6 rounded-2xl border-2 outline-none font-bold text-sm transition-all ${q.correctAnswer === optIdx
                                                        ? 'bg-[#c2f575]/5 border-[#c2f575]/30 text-[#040457]'
                                                        : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100 text-gray-500'
                                                        }`}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-6 pl-20 border-t border-gray-50 pt-8">
                                        <div className="flex items-center gap-3 bg-gray-50/50 px-6 py-3 rounded-2xl border border-gray-100 shadow-inner">
                                            <Clock size={18} className="text-gray-400" />
                                            <input
                                                type="number"
                                                min="10"
                                                value={q.timerSeconds || 60}
                                                onChange={(e) => handleUpdateQuestion(q.id, 'timerSeconds', parseInt(e.target.value) || 0)}
                                                className="w-20 bg-transparent outline-none font-black text-[#040457] text-lg text-center"
                                            />
                                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Seconds</span>
                                        </div>

                                        <div className="flex items-center gap-3 bg-gray-50/50 px-6 py-3 rounded-2xl border border-gray-100 shadow-inner">
                                            <Award size={18} className="text-[#c2f575]" />
                                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Points</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={q.marks || 5}
                                                onChange={(e) => handleUpdateQuestion(q.id, 'marks', parseInt(e.target.value) || 0)}
                                                className="w-16 bg-transparent outline-none font-black text-[#040457] text-lg text-center"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-10 flex justify-center">
                            <button
                                onClick={handleGenerateMore}
                                disabled={isGeneratingMore}
                                className={`px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all border-2 flex items-center gap-4 ${isGeneratingMore
                                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                    : 'bg-white text-indigo-600 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 active:scale-95'
                                    }`}
                            >
                                {isGeneratingMore ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Fetching 5 More Intelligent Questions...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} className="text-[#c2f575]" />
                                        Showcase 5 More Questions
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MCQBuilder;
