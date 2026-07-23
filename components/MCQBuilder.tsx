import React, { useState, useRef } from 'react';
import { Trash2, Plus, Clock, Loader2, Award, FileText, Sparkles, AlertTriangle, FileUp, CheckCircle2, Languages, BookOpen, Image as ImageIcon } from 'lucide-react';
import { extractTextFromPdf, parseMCQFromText, renderPdfPageToImage } from '../utils/pdfParser';

export interface MCQOption {
    text: string;
    textTranslated?: string;
}

export interface MCQ {
    id: string;
    question: string;
    questionTranslated?: string;
    options: MCQOption[];
    correctAnswer: number;
    timerSeconds?: number;
    marks?: number;
    needsReview?: boolean;
    reviewReason?: string;
    sharedPassage?: string;
    passageId?: string;
    hasFigure?: boolean;
    figurePageNumber?: number;
    figureImageUrl?: string;
    figureDescription?: string;
    pdfUrl?: string;
}

interface MCQBuilderProps {
    questions: MCQ[];
    setQuestions: React.Dispatch<React.SetStateAction<MCQ[]>>;
}

const MCQBuilder: React.FC<MCQBuilderProps> = ({ questions, setQuestions }) => {
    const [isExtracting, setIsExtracting] = useState(false);
    const [globalTimer, setGlobalTimer] = useState<number>(60);
    const [globalMarks, setGlobalMarks] = useState<number>(1);
    const [showTranslation, setShowTranslation] = useState<boolean>(false);

    const qpFileInputRef = useRef<HTMLInputElement>(null);
    const akFileInputRef = useRef<HTMLInputElement>(null);

    const [qpFile, setQpFile] = useState<File | null>(null);
    const [akFile, setAkFile] = useState<File | null>(null);

    const handleAddQuestion = () => {
        const newQ: MCQ = {
            id: Date.now().toString(),
            question: '',
            options: [
                { text: '', textTranslated: undefined },
                { text: '', textTranslated: undefined },
                { text: '', textTranslated: undefined },
                { text: '', textTranslated: undefined }
            ],
            correctAnswer: 0,
            timerSeconds: globalTimer,
            marks: globalMarks
        };
        setQuestions([...questions, newQ]);
    };

    const handleApplyToAll = (field: 'timerSeconds' | 'marks', value: number) => {
        setQuestions(questions.map(q => ({ ...q, [field]: value })));
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

    const handleUpdateOption = (id: string, optionIndex: number, field: 'text' | 'textTranslated', value: string) => {
        setQuestions(questions.map(q => {
            if (q.id === id) {
                const newOptions = q.options.map((opt, idx) => {
                    if (idx === optionIndex) {
                        return {
                            ...opt,
                            [field]: value
                        };
                    }
                    return opt;
                });
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

            const parsedQuestionsRaw = parseMCQFromText(qpText, akText || undefined);

            if (parsedQuestionsRaw.length === 0) {
                alert('No questions could be extracted from the PDF. Please check the PDF formatting.');
                return;
            }

            const qpPdfDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(qpFile);
            });

            const parsedQuestions = await Promise.all(parsedQuestionsRaw.map(async (q: any) => {
                let figureImageUrl = q.figureImageUrl;
                if (q.hasFigure && q.figurePageNumber && !figureImageUrl && qpFile) {
                    try {
                        figureImageUrl = await renderPdfPageToImage(qpArrayBuffer, q.figurePageNumber);
                    } catch (e) {
                        console.error('Failed to render PDF page image for figure question:', e);
                    }
                }

                const normalizedOptions: MCQOption[] = (q.options || []).map((opt: any) => {
                    if (typeof opt === 'string') return { text: opt, textTranslated: undefined };
                    return { text: opt.text || '', textTranslated: opt.textTranslated || undefined };
                });
                while (normalizedOptions.length < 4) {
                    normalizedOptions.push({ text: '', textTranslated: undefined });
                }

                return {
                    ...q,
                    options: normalizedOptions,
                    figureImageUrl,
                    timerSeconds: globalTimer,
                    marks: globalMarks,
                    pdfUrl: qpPdfDataUrl
                };
            }));

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
                
                <h3 className="text-3xl font-black text-nunma-forest tracking-tight mb-2 z-10">Upload Question Paper & Key</h3>
                <p className="text-gray-400 font-bold text-xs max-w-md mb-10 leading-relaxed z-10">
                    Upload your Question Paper PDF and optional Answer Key PDF.
                </p>

                {/* File Dropzone Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-10 mb-8">
                    {/* QP Card */}
                    <label className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 border-dashed cursor-pointer transition-all ${qpFile ? 'bg-emerald-50/80 border-emerald-400' : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${qpFile ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {qpFile ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                            </div>
                            <div className="text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 block">Question Paper (PDF)</span>
                                <span className="text-xs font-bold text-gray-500 truncate max-w-[180px] block">
                                    {qpFile ? qpFile.name : 'Click to Browse'}
                                </span>
                            </div>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" ref={qpFileInputRef} onChange={(e) => handleFileChange(e, 'qp')} />
                    </label>

                    {/* AK Card */}
                    <label className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 border-dashed cursor-pointer transition-all ${akFile ? 'bg-emerald-50/80 border-emerald-400' : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'}`}>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${akFile ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {akFile ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                                </div>
                                <div className="text-left">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 block">Answer Key (Optional PDF)</span>
                                    <span className="text-xs font-bold text-gray-500 truncate max-w-[140px] block">
                                        {akFile ? akFile.name : 'Click to Browse'}
                                    </span>
                                </div>
                            </div>
                            <div>
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

                <div className="flex items-center gap-4 w-full max-w-md z-10 mb-2">
                    <div className="flex-1 bg-white p-2 rounded-[2rem] border-2 border-emerald-100 shadow-sm flex items-center pr-4 transition-all hover:border-emerald-300">
                        <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-[1.5rem] mr-4 shrink-0">
                            <Clock size={20} className="text-emerald-500" />
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">Time per Q</span>
                            <div className="flex items-end gap-1">
                                <input
                                    type="number"
                                    min="10"
                                    value={globalTimer}
                                    onChange={(e) => setGlobalTimer(parseInt(e.target.value) || 60)}
                                    className="w-full bg-transparent outline-none font-black text-emerald-950 text-xl leading-none p-0 border-none focus:ring-0"
                                />
                                <span className="text-[10px] font-bold text-gray-400 leading-tight">sec</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white p-2 rounded-[2rem] border-2 border-emerald-100 shadow-sm flex items-center pr-4 transition-all hover:border-emerald-300">
                        <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-[1.5rem] mr-4 shrink-0">
                            <Award size={20} className="text-emerald-500" />
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">Points</span>
                            <div className="flex items-end gap-1">
                                <input
                                    type="number"
                                    min="1"
                                    value={globalMarks}
                                    onChange={(e) => setGlobalMarks(parseInt(e.target.value) || 1)}
                                    className="w-full bg-transparent outline-none font-black text-emerald-950 text-xl leading-none p-0 border-none focus:ring-0"
                                />
                                <span className="text-[10px] font-bold text-gray-400 leading-tight">pts</span>
                            </div>
                        </div>
                    </div>
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
                <div className="flex items-center gap-3">
                    {questions.some(q => q.questionTranslated || q.options?.some((o: any) => o?.textTranslated)) && (
                        <button
                            onClick={() => setShowTranslation(!showTranslation)}
                            className={`px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border flex items-center gap-2 ${
                                showTranslation 
                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md'
                                    : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                        >
                            <Languages size={14} />
                            {showTranslation ? 'Hide Translation' : 'Show Translation (Tamil/2nd Lang)'}
                        </button>
                    )}
                    <button
                        onClick={handleAddQuestion}
                        className="px-8 py-4 bg-white text-nunma-forest border-2 border-gray-100 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-[#c2f575] hover:shadow-lg transition-all flex items-center gap-3 active:scale-95"
                    >
                        <Plus size={18} /> Add Empty Question
                    </button>
                </div>
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
                                            {q.reviewReason || "Needs Review - Verify Correct Answer"}
                                        </div>
                                    )}

                                    {/* Shared Passage Banner */}
                                    {q.sharedPassage && (
                                        <div className="mb-6 p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-2 text-indigo-900 font-black text-xs uppercase tracking-wider">
                                                <BookOpen size={16} className="text-indigo-600" />
                                                Shared Passage / Setup Context {q.passageId && `(${q.passageId})`}
                                            </div>
                                            <p className="text-sm font-semibold text-indigo-950 leading-relaxed whitespace-pre-wrap">
                                                {q.sharedPassage}
                                            </p>
                                        </div>
                                    )}

                                    {/* Figure Diagram Display */}
                                    {(q.hasFigure || q.figureImageUrl) && (
                                        <div className="mb-6 p-5 bg-amber-50/50 border border-amber-200 rounded-2xl flex flex-col items-center">
                                            <div className="flex items-center justify-between w-full mb-3">
                                                <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                                                    <ImageIcon size={16} className="text-amber-600" />
                                                    Diagram / Figure (Page {q.figurePageNumber || 'N/A'})
                                                </span>
                                                {q.figureDescription && (
                                                    <span className="text-[10px] font-bold text-amber-700 italic">
                                                        {q.figureDescription}
                                                    </span>
                                                )}
                                            </div>
                                            {q.figureImageUrl ? (
                                                <img 
                                                    src={q.figureImageUrl} 
                                                    alt="Question Figure Diagram" 
                                                    className="max-h-72 object-contain rounded-xl border border-amber-200 shadow-sm bg-white p-2"
                                                />
                                            ) : (
                                                <div className="py-4 text-center text-amber-800 text-xs font-bold">
                                                    [Visual Diagram Flagged - Render image preview by clicking Process]
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex items-start gap-6 w-full">
                                            <div className={`w-14 h-14 rounded-2xl flex flex-shrink-0 items-center justify-center text-xl font-black shadow-lg ${q.needsReview ? 'bg-amber-100 text-amber-600' : 'bg-nunma-forest text-[#c2f575]'}`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex flex-col gap-3 w-full">
                                                <textarea
                                                    rows={2}
                                                    value={q.question}
                                                    onChange={(e) => handleUpdateQuestion(q.id, 'question', e.target.value)}
                                                    placeholder="Enter Primary Question Statement..."
                                                    className="w-full text-xl font-black text-nunma-forest outline-none border-b-4 border-transparent focus:border-[#c2f575]/20 pb-2 transition-all placeholder-gray-200 tracking-tight resize-none overflow-hidden"
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = `${target.scrollHeight}px`;
                                                    }}
                                                />
                                                {(showTranslation || q.questionTranslated) && (
                                                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 block mb-1">Secondary Language (e.g. Tamil)</span>
                                                        <textarea
                                                            rows={2}
                                                            value={q.questionTranslated || ''}
                                                            onChange={(e) => handleUpdateQuestion(q.id, 'questionTranslated', e.target.value)}
                                                            placeholder="Enter Translated Question Statement (e.g. Tamil)..."
                                                            className="w-full text-lg font-bold text-emerald-950 bg-transparent outline-none resize-none overflow-hidden"
                                                            onInput={(e) => {
                                                                const target = e.target as HTMLTextAreaElement;
                                                                target.style.height = 'auto';
                                                                target.style.height = `${target.scrollHeight}px`;
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteQuestion(q.id)}
                                            className="ml-6 p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pl-20">
                                        {q.options.map((optItem, optIdx) => {
                                            const opt = typeof optItem === 'string' ? { text: optItem } : optItem;
                                            return (
                                                <div key={optIdx} className="flex flex-col gap-2 group/opt">
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            onClick={() => handleUpdateQuestion(q.id, 'correctAnswer', optIdx)}
                                                            className={`w-8 h-8 rounded-xl border-4 flex items-center justify-center flex-shrink-0 transition-all ${q.correctAnswer === optIdx ? 'bg-[#c2f575] border-[#c2f575] rotate-45' : 'border-gray-100 hover:border-[#c2f575]/50 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {q.correctAnswer === optIdx && <div className="w-3 h-3 bg-nunma-forest -rotate-45 rounded-sm" />}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={opt.text || ''}
                                                            onChange={(e) => handleUpdateOption(q.id, optIdx, 'text', e.target.value)}
                                                            placeholder={`Option ${optIdx + 1}`}
                                                            className={`w-full py-5 px-6 rounded-2xl border-2 outline-none font-bold text-sm transition-all ${q.correctAnswer === optIdx
                                                                ? 'bg-[#c2f575]/5 border-[#c2f575]/30 text-nunma-forest'
                                                                : 'bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100 text-gray-500'
                                                                }`}
                                                        />
                                                    </div>
                                                    {(showTranslation || opt.textTranslated) && (
                                                        <div className="pl-12">
                                                            <input
                                                                type="text"
                                                                value={opt.textTranslated || ''}
                                                                onChange={(e) => handleUpdateOption(q.id, optIdx, 'textTranslated', e.target.value)}
                                                                placeholder={`Option ${optIdx + 1} (Tamil / Secondary)`}
                                                                className="w-full py-2 px-4 rounded-xl border border-emerald-100 bg-emerald-50/40 outline-none font-semibold text-xs text-emerald-900 placeholder-emerald-300"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                                value={q.marks || 1}
                                                onChange={(e) => handleUpdateQuestion(q.id, 'marks', parseInt(e.target.value) || 0)}
                                                className="w-16 bg-transparent outline-none font-black text-nunma-forest text-lg text-center"
                                            />
                                        </div>
                                        
                                        <button 
                                            onClick={() => {
                                                handleApplyToAll('timerSeconds', q.timerSeconds || 60);
                                                handleApplyToAll('marks', q.marks || 1);
                                            }}
                                            className="ml-auto px-6 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 active:scale-95"
                                        >
                                            <Sparkles size={14} />
                                            Apply Time & Points to All
                                        </button>
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
