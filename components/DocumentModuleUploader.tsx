import React, { useState, useRef } from 'react';
import { X, File as FileIcon, AlertCircle, Upload } from 'lucide-react';
import { storage, db } from '../utils/firebase';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface DocumentModuleUploaderProps {
    courseId: string;
    chapterId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const DocumentModuleUploader: React.FC<DocumentModuleUploaderProps> = ({ courseId, chapterId, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadTaskRef = useRef<UploadTask | null>(null);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) validateAndSetFile(e.dataTransfer.files[0]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) validateAndSetFile(e.target.files[0]);
    };

    const validateAndSetFile = (selectedFile: File) => {
        setError(null);
        const isValid = ['.pdf', '.doc', '.docx', '.zip'].some(ext => selectedFile.name.toLowerCase().endsWith(ext));
        if (!isValid) { setError('Invalid file. Use PDF, DOC, DOCX, or ZIP.'); return; }
        setFile(selectedFile);
    };

    const processUpload = async () => {
        if (!file || !user) return;
        setIsUploading(true);
        setError(null);

        try {
            const storageRef = ref(storage, `workspaces/${user.uid}/courses/${courseId}/documents/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTaskRef.current = uploadTask;
            uploadTask.on('state_changed',
                (snapshot) => setProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (uploadError) => {
                    // Cancelled uploads trigger an error — don't show an alert for those
                    if (uploadError.code === 'storage/canceled') return;
                    console.error('Firebase Storage Upload error:', uploadError);
                    alert(`Upload blocked: ${uploadError.message}`);
                    setError('Upload failed: ' + uploadError.message);
                    setIsUploading(false);
                    uploadTaskRef.current = null;
                },
                async () => {
                    try {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        await addDoc(collection(db, `courses/${courseId}/chapters/${chapterId}/modules`), {
                            type: 'document', fileUrl: downloadUrl, fileName: file.name, fileSize: file.size, createdAt: serverTimestamp()
                        });
                        await updateDoc(doc(db, 'users', user.uid), { storage_used_bytes: increment(file.size) });
                        uploadTaskRef.current = null;
                        setIsUploading(false);
                        onSuccess();
                        onClose();
                    } catch (err: any) {
                        setError('Failed to save record.');
                        setIsUploading(false);
                        uploadTaskRef.current = null;
                    }
                }
            );
        } catch (err: any) {
            console.error('Document Upload Initiation Error:', err);
            setError(`Failed to start upload: ${err.message}`);
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        if (uploadTaskRef.current) {
            uploadTaskRef.current.cancel();
            uploadTaskRef.current = null;
        }
        setIsUploading(false);
        setProgress(0);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden p-10 relative">
                <button onClick={onClose} disabled={isUploading} className="absolute top-8 right-8 p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all disabled:opacity-50">
                    <X size={20} />
                </button>
                <div className="mb-8">
                    <h3 className="text-3xl font-black text-[#040457] tracking-tighter mb-2">Upload Document</h3>
                    <p className="text-sm text-gray-400 font-medium">Add a PDF, DOC, or ZIP resource to this chapter.</p>
                </div>
                {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3"><AlertCircle size={16} /> {error}</div>}
                {!isUploading ? (
                    <div className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${file ? 'border-[#c2f575] bg-[#c2f575]/10' : 'border-gray-200 hover:border-[#c2f575] bg-gray-50'}`}
                        onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.zip" onChange={handleFileChange} />
                        {file ? (
                            <><FileIcon size={48} className="text-[#658525] mb-4" /><p className="font-black text-[#040457] text-lg">{file.name}</p><p className="text-sm font-bold text-gray-400 mt-2">{(file.size / (1024 * 1024)).toFixed(2)} MB</p></>
                        ) : (
                            <><Upload size={48} className="text-gray-300 mb-4" /><p className="font-black text-[#040457] text-lg">Click or drag a file here</p><p className="text-sm font-bold text-gray-400 mt-2">PDF, DOC, DOCX, ZIP</p></>
                        )}
                    </div>
                ) : (
                    <div className="py-12 px-6 text-center">
                        <div className="w-full bg-gray-100 rounded-full h-4 mb-6 overflow-hidden">
                            <div className="bg-[#c2f575] h-4 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="font-black text-[#040457] text-xl">Uploading... {Math.round(progress)}%</p>
                    </div>
                )}
                <div className="flex gap-4 mt-8">
                    <button onClick={handleCancel} className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all">
                        {isUploading ? 'Cancel Upload' : 'Cancel'}
                    </button>
                    <button onClick={processUpload} disabled={!file || isUploading} className="flex-1 py-5 bg-[#040457] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70">
                        {isUploading ? 'Uploading...' : 'Save Document'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentModuleUploader;
