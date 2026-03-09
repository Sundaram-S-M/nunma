import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import MCQBuilder, { MCQ } from './MCQBuilder';

interface QuizModuleEditorProps {
    courseId: string;
    chapterId: string;
    onClose: () => void;
    onSuccess: (quizData: { title: string; maxMark: number; minMark: number; questions: MCQ[] }) => void;
}

const QuizModuleEditor: React.FC<QuizModuleEditorProps> = ({ onClose, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [maxMark, setMaxMark] = useState(100);
    const [minMark, setMinMark] = useState(40);
    const [questions, setQuestions] = useState<MCQ[]>([]);

    const handleSave = () => {
        if (!title.trim() || questions.length === 0) {
            alert("Please provide a title and at least one question.");
            return;
        }

        onSuccess({
            title: title.trim(),
            maxMark,
            minMark,
            questions
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative my-8">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-3xl font-black text-[#040457] tracking-tighter mb-1">Add Quiz Module</h3>
                        <p className="text-sm text-gray-400 font-medium">Create a quiz section for this chapter.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Quiz Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Chapter 1 Assessment"
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Max Marks</label>
                            <input
                                type="number"
                                min="1"
                                value={maxMark}
                                onChange={(e) => setMaxMark(parseInt(e.target.value) || 0)}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Passing Marks (Min)</label>
                            <input
                                type="number"
                                min="0"
                                max={maxMark}
                                value={minMark}
                                onChange={(e) => setMinMark(parseInt(e.target.value) || 0)}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-8">
                        <MCQBuilder questions={questions} setQuestions={setQuestions} />
                    </div>
                </div>

                <div className="p-8 shrink-0 border-t border-gray-100 flex gap-4">
                    <button
                        onClick={onClose}
                        type="button"
                        className="flex-1 py-5 bg-white text-gray-400 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all border border-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-5 bg-[#c2f575] text-[#040457] rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Sparkles size={18} /> Add Quiz Module
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizModuleEditor;
