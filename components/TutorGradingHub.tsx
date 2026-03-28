import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import { X, Check } from 'lucide-react';
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

    const handleFinalize = async () => {
        if (marks === '') {
            alert("Please enter a valid score.");
            return;
        }

        try {
            setIsSaving(true);
            let mergedPdfBase64 = null;

            if (submission?.answerSheetUrl) {
                const response = await fetch(submission.answerSheetUrl);
                const arrayBuffer = await response.arrayBuffer();
                
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();

                Object.entries(drawingPaths).forEach(([pageNumStr, paths]) => {
                    const pageNum = parseInt(pageNumStr);
                    if (pageNum > 0 && pageNum <= pages.length) {
                        const page = pages[pageNum - 1];
                        const { height } = page.getSize();
                        
                        paths.forEach(path => {
                            if (path.points.length < 2) return;
                            let d = `M ${path.points[0].x} ${height - path.points[0].y}`;
                            for (let i = 1; i < path.points.length; i++) {
                                d += ` L ${path.points[i].x} ${height - path.points[i].y}`;
                            }
                            page.drawSvgPath(d, {
                                borderColor: rgb(1, 0, 0),
                                borderWidth: path.width
                            });
                        });
                    }
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
        } catch (error) {
            console.error("Valuation Error:", error);
            alert("Failed to save and upload graded document.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-[#040457]/90 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[4rem] w-full max-w-[1400px] shadow-3xl overflow-hidden h-full max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-500">
                <button onClick={onClose} className="absolute top-8 right-8 p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all z-10 shadow-sm">
                    <X size={24} />
                </button>
                
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-[70%] bg-gray-50 p-6 flex flex-col relative">
                        <div className="mb-4">
                            <h2 className="text-3xl font-black text-[#1A1A4E]">{studentName}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Active Valuation Interface</p>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {submission?.answerSheetUrl ? (
                                <PdfAnnotator url={submission.answerSheetUrl} onPathsChange={setDrawingPaths} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest border-2 border-dashed border-gray-200 rounded-[2rem]">
                                    No Answer Script Uploaded
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="w-[30%] bg-white p-10 flex flex-col border-l border-gray-100">
                        <div className="flex-1 space-y-10">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-[#1A1A4E] uppercase tracking-widest">Total Valuation Score</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        max={exam.maxMark}
                                        placeholder="0"
                                        value={marks}
                                        onChange={e => setMarks(Number(e.target.value))}
                                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-5 text-4xl font-black text-[#040457] outline-none transition-all shadow-inner"
                                    />
                                    <span className="text-2xl font-black text-gray-300 shrink-0">/ {exam.maxMark}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-[#1A1A4E] uppercase tracking-widest">Instructor Feedback (Burned on DB)</label>
                                <textarea
                                    placeholder="Provide detailed feedback on the student's methodology..."
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-5 text-sm font-bold text-[#040457] outline-none resize-none h-64 custom-scrollbar transition-all shadow-inner"
                                />
                            </div>
                        </div>
                        
                        <div className="pt-8 mt-auto border-t border-gray-100">
                            <button
                                disabled={isSaving || marks === ''}
                                onClick={handleFinalize}
                                className="w-full py-6 bg-[#c2f575] text-indigo-900 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-xl shadow-[#c2f575]/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
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
