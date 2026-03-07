import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { X, AlertCircle } from 'lucide-react';

interface TextModuleEditorProps {
    courseId: string;
    chapterId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const TextModuleEditor: React.FC<TextModuleEditorProps> = ({ courseId, chapterId, onClose, onSuccess }) => {
    if (!courseId || !chapterId) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl">
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3">
                    <AlertCircle size={16} /> Error: Missing Chapter Data
                </div>
            </div>
        );
    }

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!title.trim() || !content.trim() || content === '<p><br></p>') {
            setError("Please provide both a title and content for the reading module.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const modulesRef = collection(db, `courses/${courseId}/chapters/${chapterId}/modules`);
            await addDoc(modulesRef, {
                type: 'text',
                title: title.trim(),
                content: content,
                createdAt: serverTimestamp()
            });

            setIsSaving(false);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error saving text module:", err);
            setError("Failed to save the reading module. Please try again.");
            setIsSaving(false);
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'blockquote', 'code-block'],
            ['clean']
        ]
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-3xl font-black text-[#040457] tracking-tighter mb-1">Add Reading Module</h3>
                        <p className="text-sm text-gray-400 font-medium">Create a rich text reading section for this chapter.</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Module Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Introduction to Neural Networks"
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all"
                        />
                    </div>

                    <div className="flex-1 min-h-[300px] flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Content</label>
                        <div className="[&_.ql-toolbar]:rounded-t-2xl [&_.ql-toolbar]:border-gray-200 [&_.ql-container]:rounded-b-2xl [&_.ql-container]:border-gray-200 [&_.ql-editor]:min-h-[220px] [&_.ql-editor]:text-base [&_.ql-editor]:font-medium [&_.ql-editor]:text-[#040457]">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                modules={modules}
                                placeholder="Write your chapter content here..."
                            />
                        </div>
                    </div>
                </div>

                <div className="p-8 shrink-0 border-t border-gray-100 flex gap-4">
                    <button
                        onClick={onClose}
                        type="button"
                        className="flex-1 py-5 bg-white text-gray-400 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all border border-gray-200 disabled:opacity-50"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !title.trim() || !content.trim() || content === '<p><br></p>'}
                        className="flex-1 py-5 bg-[#040457] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-[#040457]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            'Save Reading Module'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TextModuleEditor;
