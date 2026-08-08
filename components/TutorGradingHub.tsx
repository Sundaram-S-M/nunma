import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import { X, Check, FileText, Edit3 } from 'lucide-react';
import PdfAnnotator, { DrawingPath } from './PdfAnnotator';
import { PDFDocument, rgb } from 'pdf-lib';

interface TutorGradingHubProps {
    zoneId: string;
    exam: any;
    studentId: string;
    studentName: string;
    submission: any;
    onClose: () => void;
    onGraded: () => void;
}

const TutorGradingHub: React.FC<TutorGradingHubProps> = ({ zoneId, exam, studentId, studentName, submission, onClose, onGraded }) => {
    const [marks, setMarks] = useState<number | ''>(submission?.marks || '');
    const [feedback, setFeedback] = useState(submission?.feedback || '');
    const [isSaving, setIsSaving] = useState(false);
    const [drawingPaths, setDrawingPaths] = useState<Record<number, DrawingPath[]>>({});
    const [mobileTab, setMobileTab] = useState<'paper' | 'grade'>('paper');

    React.useEffect(() => {
        const headerEl = document.getElementById('global-header');
        const mobileNavEl = document.getElementById('global-mobile-nav');

        if (headerEl) headerEl.style.setProperty('display', 'none', 'important');
        if (mobileNavEl) mobileNavEl.style.setProperty('display', 'none', 'important');

        return () => {
            if (headerEl) headerEl.style.removeProperty('display');
            if (mobileNavEl) mobileNavEl.style.removeProperty('display');
        };
    }, []);

    const handleFinalize = async () => {
        if (marks === '') {
            alert("Please enter a valid score.");
            return;
        }

        try {
            setIsSaving(true);
            let mergedPdfBase64 = null;

            if (submission?.answerSheetUrl) {
                const proxiedUrl = `https://proxybunnyfile-xtu74uomna-uc.a.run.app?fileUrl=${encodeURIComponent(submission.answerSheetUrl)}`;
                const response = await fetch(proxiedUrl);
                const arrayBuffer = await response.arrayBuffer();
                
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                
                // Embed Nunma logo
                const logoRes = await fetch(`${window.location.origin}/assets/logo-full.png`);
                const logoBuffer = await logoRes.arrayBuffer();
                const logoImage = await pdfDoc.embedPng(logoBuffer);
                const logoDims = logoImage.scale(0.25); // Scale down

                const pages = pdfDoc.getPages();

                Object.entries(drawingPaths).forEach(([pageNumStr, paths]) => {
                    const pageNum = parseInt(pageNumStr);
                    if (pageNum > 0 && pageNum <= pages.length) {
                        const page = pages[pageNum - 1];
                        const { width: pdfWidth, height: pdfHeight } = page.getSize();
                        
                        paths.forEach(path => {
                            if (!path.points || path.points.length === 0) return;

                            const cWidth = path.canvasWidth || pdfWidth;
                            const cHeight = path.canvasHeight || pdfHeight;

                            const scaleX = pdfWidth / cWidth;
                            const scaleY = pdfHeight / cHeight;

                            if (path.points.length === 1) {
                                const p1 = path.points[0];
                                page.drawCircle({
                                    x: p1.x * scaleX,
                                    y: pdfHeight - (p1.y * scaleY),
                                    size: (path.width || 3) * scaleX,
                                    color: rgb(0.95, 0.1, 0.1)
                                });
                            } else {
                                for (let i = 1; i < path.points.length; i++) {
                                    const p1 = path.points[i - 1];
                                    const p2 = path.points[i];

                                    page.drawLine({
                                        start: {
                                            x: p1.x * scaleX,
                                            y: pdfHeight - (p1.y * scaleY)
                                        },
                                        end: {
                                            x: p2.x * scaleX,
                                            y: pdfHeight - (p2.y * scaleY)
                                        },
                                        thickness: (path.width || 3) * scaleX,
                                        color: rgb(0.95, 0.1, 0.1),
                                        opacity: 0.95
                                    });
                                }
                            }
                        });
                    }
                });

                // Stamp logo on every page
                pages.forEach(page => {
                    page.drawImage(logoImage, {
                        x: 20,
                        y: 20,
                        width: logoDims.width,
                        height: logoDims.height,
                    });
                });

                mergedPdfBase64 = await pdfDoc.saveAsBase64();
            }

            const submitGraded = httpsCallable(functions, 'submitGradedScript');
            await submitGraded({
                zoneId,
                examId: exam.id,
                studentId,
                score: Number(marks),
                feedback,
                mergedPdf: mergedPdfBase64,
                oldFileUrl: submission?.answerSheetUrl
            });

            onGraded();
        } catch (error: any) {
            console.error("Valuation Error:", error);
            if (error?.message?.includes('permission-denied') || error?.code === 'permission-denied' || error?.code === 'functions/permission-denied') {
                alert('Access Denied: Your co-tutor permissions may have been revoked or you are trying to grade outside your assigned subject.');
            } else {
                alert("Failed to save and upload graded document.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-nunma-forest md:bg-nunma-forest/90 backdrop-blur-3xl flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-none md:rounded-[4rem] w-full max-w-[1400px] shadow-3xl overflow-hidden h-full md:max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-500">
                
                {/* Mobile Top Navigation Header */}
                <div className="flex md:hidden items-center justify-between p-3.5 bg-white border-b border-gray-100 shrink-0 z-20">
                    <div className="min-w-0 pr-2">
                        <h2 className="text-sm font-black text-nunma-forest truncate">{studentName}</h2>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Active Valuation</p>
                    </div>

                    {/* Mobile View Switcher Pill */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
                        <button
                            onClick={() => setMobileTab('paper')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mobileTab === 'paper' ? 'bg-white text-nunma-forest shadow-sm' : 'text-gray-500'
                            }`}
                        >
                            <FileText size={13} /> Paper
                        </button>
                        <button
                            onClick={() => setMobileTab('grade')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mobileTab === 'grade' ? 'bg-white text-nunma-forest shadow-sm' : 'text-gray-500'
                            }`}
                        >
                            <Edit3 size={13} /> Score & Notes
                        </button>
                    </div>

                    <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-black hover:text-white transition-all shrink-0 ml-1">
                        <X size={18} />
                    </button>
                </div>

                {/* Desktop Close Button */}
                <button onClick={onClose} className="hidden md:block absolute top-8 right-8 p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all z-10 shadow-sm">
                    <X size={24} />
                </button>
                
                {/* Main Body */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                    
                    {/* Exam Paper Section */}
                    <div className={`flex-1 bg-gray-50 p-2 md:p-6 flex-col relative md:w-[70%] ${
                        mobileTab === 'paper' ? 'flex' : 'hidden md:flex'
                    }`}>
                        <div className="hidden md:block mb-4">
                            <h2 className="text-3xl font-black text-nunma-forest">{studentName}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Active Valuation Interface</p>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            {submission?.answerSheetUrl ? (
                                <PdfAnnotator url={`https://proxybunnyfile-xtu74uomna-uc.a.run.app?fileUrl=${encodeURIComponent(submission.answerSheetUrl)}`} onPathsChange={setDrawingPaths} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest border-2 border-dashed border-gray-200 rounded-[2rem]">
                                    No Answer Script Uploaded
                                </div>
                            )}
                        </div>

                        {/* Mobile Floating Quick Bar on Paper View */}
                        <div className="flex md:hidden items-center justify-between gap-3 p-2.5 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg shrink-0 z-30">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-nunma-forest uppercase tracking-wider">Score:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max={exam.maxMark}
                                    placeholder="0"
                                    value={marks}
                                    onChange={e => setMarks(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-16 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 text-sm font-black text-nunma-forest text-center outline-none focus:border-[#c2f575]"
                                />
                                <span className="text-xs font-bold text-gray-400">/ {exam.maxMark}</span>
                            </div>
                            <button
                                onClick={() => setMobileTab('grade')}
                                className="px-3.5 py-1.5 bg-[#c2f575] text-indigo-900 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm"
                            >
                                Feedback & Submit <Edit3 size={12} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Score & Feedback Section */}
                    <div className={`w-full md:w-[30%] bg-white p-6 md:p-10 flex-col border-l border-gray-100 overflow-y-auto ${
                        mobileTab === 'grade' ? 'flex flex-1' : 'hidden md:flex'
                    }`}>
                        <div className="flex-1 space-y-6 md:space-y-10">
                            <div className="space-y-3 md:space-y-4">
                                <label className="text-[11px] font-black text-nunma-forest uppercase tracking-widest">Total Valuation Score</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        max={exam.maxMark}
                                        placeholder="0"
                                        value={marks}
                                        onChange={e => setMarks(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 md:py-5 text-3xl md:text-4xl font-black text-nunma-forest outline-none transition-all shadow-inner"
                                    />
                                    <span className="text-xl md:text-2xl font-black text-gray-300 shrink-0">/ {exam.maxMark}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3 md:space-y-4">
                                <label className="text-[11px] font-black text-nunma-forest uppercase tracking-widest">Instructor Feedback (Burned on DB)</label>
                                <textarea
                                    placeholder="Provide detailed feedback on the student's methodology..."
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#c2f575] focus:bg-white rounded-2xl px-5 md:px-6 py-4 md:py-5 text-sm font-bold text-nunma-forest outline-none resize-none h-48 md:h-64 custom-scrollbar transition-all shadow-inner"
                                />
                            </div>
                        </div>
                        
                        <div className="pt-6 md:pt-8 mt-auto border-t border-gray-100 shrink-0">
                            <button
                                disabled={isSaving || marks === ''}
                                onClick={handleFinalize}
                                className="w-full py-5 md:py-6 bg-[#c2f575] text-indigo-900 rounded-2xl md:rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-xl shadow-[#c2f575]/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                            >
                                {isSaving ? <div className="w-5 h-5 rounded-full border-2 border-indigo-900 border-t-transparent animate-spin"/> : <Check size={20} />}
                                {isSaving ? 'Synchronizing Grade...' : 'Finalize & Save Transcript'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorGradingHub;
