import React, { useState, useRef } from 'react';
import { Upload, Trash2, Plus, Clock, Brain, Loader2, Award, FileText } from 'lucide-react';

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simulate AI generation process
        setIsGenerating(true);

        setTimeout(() => {
            // Mock generated questions based on "reading context"
            const generated: MCQ[] = [
                {
                    id: Date.now().toString() + '_1',
                    question: 'Based on the uploaded document, what is the primary objective of this module?',
                    options: ['To define core terminology', 'To establish practical applications', 'To evaluate historical context', 'To summarize theoretical models'],
                    correctAnswer: 1,
                    timerSeconds: 60,
                    marks: 5
                },
                {
                    id: Date.now().toString() + '_2',
                    question: 'Which of the following aligns with the framework proposed in section 2?',
                    options: ['Iterative Design', 'Waterfall Approach', 'Agile Methodology', 'Lean Six Sigma'],
                    correctAnswer: 2,
                    timerSeconds: 45,
                    marks: 5
                }
            ];

            setQuestions([...questions, ...generated]);
            setIsGenerating(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }, 4000); // 4 seconds mock loading
    };

    return (
        <div className="w-full flex flex-col gap-6">

            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                {/* Abstract Background Element */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 z-10">
                    <Brain size={40} className="text-indigo-600" />
                </div>
                <h3 className="text-3xl font-black text-[#040457] mb-3 z-10 tracking-tight">AI Question Generator</h3>
                <p className="text-gray-500 font-medium max-w-md z-10 mb-8">
                    Upload your syllabus or study material PDF. Our AI model will automatically extract key concepts and generate ready-to-use exact mock questions.
                </p>

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
                    className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[13px] shadow-xl transition-all z-10 flex items-center gap-3 border ${isGenerating
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-[#c2f575] text-[#040457] border-[#c2f575] hover:bg-[#b0eb5c] active:scale-95'
                        }`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            AI is reading your document...
                        </>
                    ) : (
                        <>
                            <Upload size={20} />
                            Upload PDF (Auto-Generate)
                        </>
                    )}
                </button>
            </div>

            <div className="flex items-center justify-between mb-2 mt-4">
                <h4 className="text-xl font-black text-[#040457]">Question Bank <span className="text-gray-400 text-sm ml-2">({questions.length} Questions)</span></h4>
                <button
                    onClick={handleAddQuestion}
                    className="px-5 py-3 bg-gray-50 text-indigo-600 border border-gray-200 rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> Add Blank Question
                </button>
            </div>

            <div className="space-y-6">
                {questions.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold">No questions added yet.</p>
                    </div>
                ) : (
                    questions.map((q, index) => (
                        <div key={q.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative group animate-in slide-in-from-bottom-4 duration-300">

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="w-10 h-10 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 flex flex-shrink-0 items-center justify-center font-black text-indigo-400">
                                        {index + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={q.question}
                                        onChange={(e) => handleUpdateQuestion(q.id, 'question', e.target.value)}
                                        placeholder="Type your question here..."
                                        className="w-full text-lg font-bold text-[#040457] outline-none border-b-2 border-transparent focus:border-[#c2f575] pb-2 transition-colors placeholder-gray-300"
                                    />
                                </div>
                                <button
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="ml-4 p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all xl:opacity-0 xl:group-hover:opacity-100 flex-shrink-0"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pl-14">
                                {q.options.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleUpdateQuestion(q.id, 'correctAnswer', optIdx)}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${q.correctAnswer === optIdx ? 'bg-[#c2f575] border-[#c2f575]' : 'border-gray-300 hover:border-[#c2f575]'
                                                }`}
                                        >
                                            {q.correctAnswer === optIdx && <div className="w-2.5 h-2.5 rounded-full bg-[#040457]" />}
                                        </button>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                            placeholder={`Option ${optIdx + 1}`}
                                            className={`w-full py-3 px-4 rounded-xl border-2 outline-none font-bold text-sm transition-colors ${q.correctAnswer === optIdx
                                                ? 'bg-[#c2f575]/10 border-[#c2f575]/50 text-[#040457]'
                                                : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-200 text-gray-600'
                                                }`}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 pl-14 border-t border-gray-100 pt-6">
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
                                    <Clock size={16} className="text-gray-400" />
                                    <input
                                        type="number"
                                        min="10"
                                        value={q.timerSeconds || 60}
                                        onChange={(e) => handleUpdateQuestion(q.id, 'timerSeconds', parseInt(e.target.value) || 0)}
                                        className="w-16 bg-transparent outline-none font-black text-[#040457] text-sm text-center"
                                    />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Sec</span>
                                </div>

                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
                                    <Award size={16} className="text-[#c2f575] fill-current" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Marks</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={q.marks || 5}
                                        onChange={(e) => handleUpdateQuestion(q.id, 'marks', parseInt(e.target.value) || 0)}
                                        className="w-12 bg-transparent outline-none font-black text-[#040457] text-sm text-center"
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MCQBuilder;
