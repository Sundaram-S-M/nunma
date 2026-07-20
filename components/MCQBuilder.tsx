import React, { useState, useRef } from 'react';
import { Trash2, Plus, Clock, Loader2, Award, FileText, Sparkles, AlertTriangle, FileUp, CheckCircle2 } from 'lucide-react';
import { extractTextFromPdf, parseMCQFromText } from '../utils/pdfParser';

export interface MCQ {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    timerSeconds?: number;
    marks?: number;
    needsReview?: boolean;
}

interface MCQBuilderProps {
    questions: MCQ[];
    setQuestions: React.Dispatch<React.SetStateAction<MCQ[]>>;
}

const MCQBuilder: React.FC<MCQBuilderProps> = ({ questions, setQuestions }) => {
    const [isExtracting, setIsExtracting] = useState(false);

    const qpFileInputRef = useRef<HTMLInputElement>(null);
    const akFileInputRef = useRef<HTMLInputElement>(null);

    const [qpFile, setQpFile] = useState<File | null>(null);
    const [akFile, setAkFile] = useState<File | null>(null);

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
        setQuestions(questions.map(q => {
            if (q.id === id) {
                const updated = { ...q, [field]: value };
                if (field === 'correctAnswer') {
                    updated.needsReview = false;
                }
                return updated;
            }
            return q;
        }));
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'qp' | 'ak') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed.');
            if (e.target) e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File must be under 5MB. Please upload a smaller file.');
            if (e.target) e.target.value = '';
            return;
        }

        if (type === 'qp') setQpFile(file);
        else setAkFile(file);
    };

    const handleProcessUploads = async () => {
        if (!qpFile) {
            alert('Please upload the Question Paper.');
            return;
        }

        setIsExtracting(true);
        try {
            const qpArrayBuffer = await qpFile.arrayBuffer();
            const qpText = await extractTextFromPdf(qpArrayBuffer);

            let akText = '';
            if (akFile) {
                const akArrayBuffer = await akFile.arrayBuffer();
                akText = await extractTextFromPdf(akArrayBuffer);
            }

            const parsedQuestions = parseMCQFromText(qpText, akText || undefined);

            if (parsedQuestions.length === 0) {
                alert('No questions could be extracted from the PDF. Please check the PDF formatting.');
                return;
            }

            setQuestions([...questions, ...parsedQuestions]);
            
            setQpFile(null);
            setAkFile(null);
            if (qpFileInputRef.current) qpFileInputRef.current.value = '';
            if (akFileInputRef.current) akFileInputRef.current.value = '';

        } catch (error: any) {
            console.error('Extraction Error:', error);
            alert(`Failed to extract questions: ${error.message}`);
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="w-full flex flex-col gap-10">

            {/* Primary View: Dual Uploads */}
            <div className="bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-100 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
                
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8 z-10 border border-emerald-50">
                    <FileUp size={48} className="text-emerald-600" />
                </div>
                
                <h3 className="text-4xl font-black text-nunma-forest mb-4 z-10 tracking-tight">Extract from Existing Papers</h3>
                <p className="text-gray-500 font-bold max-w-lg z-10 mb-10 leading-relaxed text-sm">
                    Upload your Question Paper PDF (Answer Key is optional) (under 5MB). The system will automatically extract and map the questions and correct answers client-side.
                </p>

                <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
                    <label className={`flex flex-col items-center justify-center w-full h-40 border-4 border-dashed rounded-[2rem] cursor-pointer transition-all ${qpFile ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {qpFile ? <CheckCircle2 size={32} className="mb-2 text-emerald-500" /> : <FileText size={32} className="mb-2 text-emerald-300" />}
                            <div className="flex items-center justify-center gap-2 px-4 w-full">
                                <p className="text-sm font-black text-emerald-600 uppercase tracking-widest text-center truncate max-w-[200px]">
                                    {qpFile ? qpFile.name : '1. Upload Question Paper'}
                                </p>
                                {qpFile && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setQpFile(null);
                                            if (qpFileInputRef.current) qpFileInputRef.current.value = '';
                                        }}
                                        className="p-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" ref={qpFileInputRef} onChange={(e) => handleFileChange(e, 'qp')} />
                    </label>

                    <label className={`flex flex-col items-center justify-center w-full h-40 border-4 border-dashed rounded-[2rem] cursor-pointer transition-all ${akFile ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {akFile ? <CheckCircle2 size={32} className="mb-2 text-emerald-500" /> : <FileText size={32} className="mb-2 text-emerald-300" />}
                            <div className="flex items-center justify-center gap-2 px-4 w-full">
                                <p className="text-sm font-black text-emerald-600 uppercase tracking-widest text-center truncate max-w-[200px]">
                                    {akFile ? akFile.name : '2. Upload Answer Key (Optional)'}
                                </p>
                                {akFile && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setAkFile(null);
                                            if (akFileInputRef.current) akFileInputRef.current.value = '';
                                        }}
                                        className="p-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" ref={akFileInputRef} onChange={(e) => handleFileChange(e, 'ak')} />
                    </label>
                </div>

                <div className="flex flex-col gap-4 w-full max-w-md z-10">
                    <button
                        onClick={handleProcessUploads}
                        disabled={isExtracting || !qpFile}
                        className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl transition-all flex items-center justify-center gap-4 border ${isExtracting || !qpFile
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-80'
                            : 'bg-emerald-500 text-white border-emerald-600 hover:scale-[1.02] active:scale-95 hover:bg-emerald-600'
                            }`}
                    >
                        {isExtracting ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                Processing Documents...
                            </>
                        ) : (
                            <>
                                <Sparkles size={24} className="text-emerald-100" />
                                Process & Match
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleAddQuestion}
                        className="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-4 border bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95"
                    >
                        <Plus size={20} />
                        Add Manual Question
                    </button>
                </div>
            </div>

            {/* End of Primary View */}

            {questions.some(q => q.needsReview) && (
                <div className="bg-amber-50/60 border-2 border-dashed border-amber-200 rounded-[2.5rem] p-8 flex items-center gap-6 w-full mt-6 animate-in fade-in duration-500">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h5 className="font-black text-amber-950 text-base tracking-tight">Verify Answers Before Publishing</h5>
                        <p className="text-amber-700/80 font-bold text-xs mt-1 leading-relaxed">
                            Please make sure you select the right answers in each question before publishing the exam.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mt-6">
                <div>
                    <h4 className="text-2xl font-black text-nunma-forest tracking-tight">Question Bank</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Currently Contains {questions.length} Questions</p>
                </div>
                <button
                    onClick={handleAddQuestion}
                    className="px-8 py-4 bg-white text-nunma-forest border-2 border-gray-100 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-[#c2f575] hover:shadow-lg transition-all flex items-center gap-3 active:scale-95"
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
                                <div key={q.id} className={`bg-white rounded-[2.5rem] p-10 shadow-sm border-2 relative group hover:shadow-xl transition-all duration-500 ${q.needsReview ? 'border-amber-400 shadow-amber-100' : 'border-gray-50'}`}>
                                    
                                    {q.needsReview && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-amber-950 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg z-10">
                                            <AlertTriangle size={14} />
                                            Needs Review - Verify Correct Answer
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex items-center gap-6 w-full">
                                            <div className={`w-14 h-14 rounded-2xl flex flex-shrink-0 items-center justify-center text-xl font-black shadow-lg ${q.needsReview ? 'bg-amber-100 text-amber-600' : 'bg-nunma-forest text-[#c2f575]'}`}>
                                                {index + 1}
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={(e) => handleUpdateQuestion(q.id, 'question', e.target.value)}
                                                placeholder="Enter Question Statement..."
                                                className="w-full text-xl font-black text-nunma-forest outline-none border-b-4 border-transparent focus:border-[#c2f575]/20 pb-2 transition-all placeholder-gray-200 tracking-tight"
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
                                                    {q.correctAnswer === optIdx && <div className="w-3 h-3 bg-nunma-forest -rotate-45 rounded-sm" />}
                                                </button>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                                    placeholder={`Enter Option ${optIdx + 1}`}
                                                    className={`w-full py-5 px-6 rounded-2xl border-2 outline-none font-bold text-sm transition-all ${q.correctAnswer === optIdx
                                                        ? 'bg-[#c2f575]/5 border-[#c2f575]/30 text-nunma-forest'
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
                                                className="w-20 bg-transparent outline-none font-black text-nunma-forest text-lg text-center"
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
                                                className="w-16 bg-transparent outline-none font-black text-nunma-forest text-lg text-center"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>


                    </>
                )}
            </div>
        </div>
    );
};

export default MCQBuilder;
