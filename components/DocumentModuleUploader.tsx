import React, { useState, useRef } from 'react';
import { X, File as FileIcon, AlertCircle, Upload } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';

interface DocumentModuleUploaderProps {
    courseId: string;
    chapterId: string;
    onClose: () => void;
    onSuccess: (docData: { id: string; title: string; fileUrl: string; fileSize: number }) => void;
}

const DocumentModuleUploader: React.FC<DocumentModuleUploaderProps> = ({ courseId, chapterId, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadTaskRef = useRef<any>(null);

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
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, "")); // Default title without extension
    };

    const processUpload = async () => {
        if (!file || !user) return;
        setIsUploading(true);
        setError(null);
        setProgress(0);

        try {
            // 1. Get Firebase ID Token
            const idToken = await getAuth().currentUser?.getIdToken();

            // 2. Prepare Multipart Data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', `zones/${courseId}/documents`);

            // 3. Upload via XMLHttpRequest (to track progress)
            const xhr = new XMLHttpRequest();
            
            // Construct the URL using the environment project ID. 
            // Defaulting to us-central1 as per common Firebase setups.
            const region = 'us-central1';
            const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
            const uploadUrl = `https://${region}-${projectId}.cloudfunctions.net/uploadFileToBunny`;

            xhr.open('POST', uploadUrl, true);
            xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    setProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                setIsUploading(false);
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        onSuccess({
                            id: `doc_${Date.now()}`,
                            title: title || response.fileName || file.name,
                            fileUrl: response.fileUrl,
                            fileSize: response.size || file.size
                        });
                        onClose();
                    } catch (err) {
                        setError('Failed to parse final upload response.');
                    }
                } else {
                    const errorMsg = xhr.responseText || `Upload failed with status ${xhr.status}`;
                    console.error('Bunny Upload error:', errorMsg);
                    setError(errorMsg);
                }
            };

            xhr.onerror = () => {
                setIsUploading(false);
                setError('Network error during upload. Please check your connection.');
            };

            xhr.onabort = () => {
                setIsUploading(false);
                setProgress(0);
            };

            // Store XHR in ref for cancellation if needed
            // @ts-ignore
            uploadTaskRef.current = xhr;

            xhr.send(formData);

        } catch (err: any) {
            console.error('Document Upload Initiation Error:', err);
            setError(`Failed to start upload: ${err.message}`);
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        if (uploadTaskRef.current) {
            // Check if it's an XHR or a Firebase UploadTask
            if ('abort' in uploadTaskRef.current) {
                // @ts-ignore
                uploadTaskRef.current.abort();
            } else if ('cancel' in uploadTaskRef.current) {
                 // @ts-ignore
                uploadTaskRef.current.cancel();
            }
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
                            <>
                                <FileIcon size={48} className="text-[#658525] mb-4" />
                                <p className="font-black text-[#040457] text-lg">{file.name}</p>
                                <p className="text-sm font-bold text-gray-400 mt-2">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </>
                        ) : (
                            <>
                                <Upload size={48} className="text-gray-300 mb-4" />
                                <p className="font-black text-[#040457] text-lg">Click or drag a file here</p>
                                <p className="text-sm font-bold text-gray-400 mt-2">PDF, DOC, DOCX, ZIP</p>
                            </>
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

                {file && !isUploading && (
                    <div className="mt-8 space-y-3 animate-in slide-in-from-top-4 duration-500">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Section Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Introduction to Architecture"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[1.5rem] px-8 py-5 font-bold text-[#040457] outline-none transition-all"
                        />
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
