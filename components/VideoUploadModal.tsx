import React, { useState, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../utils/firebase';
import { UploadCloud, X, Film, CheckCircle } from 'lucide-react';
import Confetti from 'react-confetti';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Play, Pause } from 'lucide-react';

interface VideoUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess: (videoData: { videoId: string, title: string }) => void;
    zoneId?: string; // Optional context if uploading for a specific zone
    chapterId?: string; // Optional context if uploading for a specific chapter
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ isOpen, onClose, onUploadSuccess, zoneId, chapterId }) => {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'resuming' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [title, setTitle] = useState('');
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const [foundUploads, setFoundUploads] = useState<tus.PreviousUpload[]>([]);
    const { user } = useAuth();

    const uploadRef = useRef<tus.Upload | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('video/')) {
            setErrorMessage('Please select a valid video file (MP4, WebM, etc).');
            return;
        }

        // Optional: Add size limit, e.g., 2GB
        if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
            setErrorMessage('File size exceeds the 2GB limit.');
            return;
        }

        setErrorMessage('');
        setFile(selectedFile);
        setUploadStatus('idle');
        setUploadProgress(0);
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    };

    const handleStartFresh = async () => {
        if (!file) return;

        try {
            setIsUploading(true);
            setUploadStatus('uploading');
            setIsPaused(false);
            setErrorMessage('');

            // Task 3: The "Start Fresh" Path
            // Call the createBunnyVideo Cloud Function to generate a new VideoId and Signature.
            const getSignatureNode = httpsCallable(functions, 'createBunnyVideo');
            const result = await getSignatureNode({ title, zoneId });
            const data = result.data as any;
            
            const { videoId, signature, expirationTime, libraryId } = data;
            setCurrentVideoId(videoId);

            // Inject these credentials into the instance
            const upload = new tus.Upload(file, {
                endpoint: 'https://video.bunnycdn.com/tusupload',
                retryDelays: [0, 1000, 3000, 5000, 10000],
                chunkSize: 50 * 1024 * 1024,
                removeFingerprintOnSuccess: true,
                headers: {
                    AuthorizationSignature: signature,
                    AuthorizationExpire: expirationTime.toString(),
                    VideoId: videoId,
                    LibraryId: libraryId.toString(),
                },
                metadata: {
                    filetype: file.type,
                    title: file.name,
                    collection: zoneId || 'default',
                    // Redundancy: Bunny sometimes parses these from metadata in certain TUS versions
                    VideoId: videoId,
                    LibraryId: libraryId.toString(),
                    AuthorizationSignature: signature,
                    AuthorizationExpire: expirationTime.toString(),
                },
                onError: (error) => {
                    console.error('TUS Upload Failed:', error);
                    setUploadStatus('error');
                    if (error.message.includes('timeout') || error.message.includes('Network Error')) {
                        toast.error("Connection unstable. Retrying automatically...", { id: 'tus-retry' });
                    }
                    setErrorMessage(`Upload failed: ${error.message}`);
                    setIsUploading(false);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = (bytesUploaded / bytesTotal) * 100;
                    setUploadProgress(percentage);
                },
                onSuccess: async () => {
                    console.log('TUS Upload completed for videoId:', videoId);
                    try {
                        if (zoneId && videoId) {
                            const videoRef = doc(db, `zones/${zoneId}/videos/${videoId}`);
                            await updateDoc(videoRef, {
                                status: 'processing',
                                updatedAt: serverTimestamp()
                            });
                        }
                        setUploadStatus('success');
                        setIsUploading(false);
                        toast.success("Video uploaded! It is now processing.", { icon: '🎬' });
                        onUploadSuccess({ videoId: videoId!, title: title || file.name });
                        setTimeout(() => handleClose(), 2000);
                    } catch (dbError) {
                        console.error("Critical Handoff Error:", dbError);
                        setUploadStatus('error');
                        setErrorMessage("Video uploaded, but database sync failed.");
                    }
                },
            });

            uploadRef.current = upload;
            upload.start();

        } catch (error: any) {
            console.error('Start Fresh Error:', error);
            setUploadStatus('error');
            const userFriendlyMsg = (error.code === 'internal' || error.message?.includes('failed-precondition')) 
                ? "Backend failed to generate secure upload token."
                : (error.message || 'Failed to initiate upload.');
            setErrorMessage(userFriendlyMsg);
            setIsUploading(false);
        }
    };

    const handleResumeUpload = async () => {
        if (!file || foundUploads.length === 0) return;

        try {
            setIsUploading(true);
            setUploadStatus('uploading');
            setIsPaused(false);
            setErrorMessage('');

            // Task 4: The "Resume" Path
            // Extract the old VideoId from the cached upload metadata
            const oldVideoId = foundUploads[0].metadata.videoId;
            if (!oldVideoId) throw new Error("Could not find VideoId in previous upload metadata.");

            // Call Cloud Function to generate a fresh signature for that existing old VideoId.
            const getSignatureNode = httpsCallable(functions, 'createBunnyVideo');
            const result = await getSignatureNode({ title, zoneId, videoId: oldVideoId });
            const data = result.data as any;

            const { videoId, signature, expirationTime, libraryId } = data;

            // Inject the refreshed credentials into the headers
            const upload = new tus.Upload(file, {
                endpoint: 'https://video.bunnycdn.com/tusupload',
                retryDelays: [0, 1000, 3000, 5000, 10000],
                chunkSize: 50 * 1024 * 1024,
                removeFingerprintOnSuccess: true,
                headers: {
                    AuthorizationSignature: signature,
                    AuthorizationExpire: expirationTime.toString(),
                    VideoId: videoId,
                    LibraryId: libraryId.toString(),
                },
                metadata: {
                    filetype: file.type,
                    title: file.name,
                    collection: zoneId || 'default',
                    VideoId: videoId,
                    LibraryId: libraryId.toString(),
                    AuthorizationSignature: signature,
                    AuthorizationExpire: expirationTime.toString(),
                },
                onError: (error) => {
                    console.error('TUS Resume Failed:', error);
                    setUploadStatus('error');
                    setErrorMessage(`Resume failed: ${error.message}`);
                    setIsUploading(false);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = (bytesUploaded / bytesTotal) * 100;
                    setUploadProgress(percentage);
                },
                onSuccess: async () => {
                    // Success handling is identical to start fresh
                    if (zoneId && videoId) {
                        const videoRef = doc(db, `zones/${zoneId}/videos/${videoId}`);
                        await updateDoc(videoRef, { status: 'processing', updatedAt: serverTimestamp() });
                    }
                    setUploadStatus('success');
                    setIsUploading(false);
                    onUploadSuccess({ videoId: videoId!, title: title || file.name });
                    setTimeout(() => handleClose(), 2000);
                },
            });

            uploadRef.current = upload;
            upload.resumeFromPreviousUpload(foundUploads[0]);
            upload.start();

        } catch (error: any) {
            console.error('Resume Error:', error);
            setUploadStatus('error');
            const userFriendlyMsg = (error.code === 'internal' || error.message?.includes('failed-precondition')) 
                ? "Backend failed to generate secure upload token."
                : (error.message || 'Failed to resume upload.');
            setErrorMessage(userFriendlyMsg);
            setIsUploading(false);
        }
    };

    const startTusUpload = async () => {
        if (!file) return;
        setErrorMessage('');

        try {
            // Task 1: Pre-Flight Check (No Backend Call Yet)
            const upload = new tus.Upload(file, {
                endpoint: 'https://video.bunnycdn.com/tusupload',
                retryDelays: [0, 1000, 3000, 5000, 10000],
                chunkSize: 50 * 1024 * 1024,
                headers: {
                    LibraryId: '608015' // Pass Library ID for pre-flight check if possible
                },
                removeFingerprintOnSuccess: true,
            } as any);

            const previousUploads = await upload.findPreviousUploads();
            
            // Task 2: Handle the State & UI
            if (previousUploads && previousUploads.length > 0) {
                setFoundUploads(previousUploads);
                setUploadStatus('resuming');
                return; // Halt all network calls
            }

            // No previous uploads, proceed directly to Start Fresh
            await handleStartFresh();

        } catch (error: any) {
            console.warn("Could not check for previous uploads:", error);
            await handleStartFresh();
        }
    };

    const togglePause = () => {
        if (!uploadRef.current) return;
        
        if (isPaused) {
            uploadRef.current.start();
            setIsPaused(false);
            setUploadStatus('uploading');
        } else {
            uploadRef.current.abort();
            setIsPaused(true);
        }
    };

    const cancelUpload = () => {
        if (uploadRef.current && isUploading) {
            uploadRef.current.abort();
        }
        setFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
        setIsUploading(false);
    };

    const handleClose = useCallback(() => {
        if (isUploading) {
            const confirmClose = window.confirm("Closing will cancel your upload. Are you sure?");
            if (!confirmClose) return;
            cancelUpload();
        }
        // Reset state and close
        setFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
        setErrorMessage('');
        onClose();
    }, [isUploading, onClose]);

    const modalRef = useFocusTrap(isOpen, handleClose);

    if (!isOpen) return null;

    return (
        <div ref={modalRef} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300">
            {uploadStatus === 'success' && <Confetti recycle={false} numberOfPieces={500} />}

            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 relative">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-2xl font-black text-[#040457]">Upload Video</h3>
                    <button
                        onClick={handleClose}
                        disabled={uploadStatus === 'success'}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 disabled:opacity-50 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8">
                    {/* File Selection Area */}
                    {!file && (
                        <div
                            className={`border-4 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${dragActive ? 'border-[#c2f575] bg-[#c2f575]/10' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('video-upload-input')?.click()}
                        >
                            <input
                                id="video-upload-input"
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={handleChange}
                            />
                            <UploadCloud size={64} className={`mb-4 ${dragActive ? 'text-[#c2f575]' : 'text-gray-300'}`} />
                            <p className="font-bold text-[#040457] text-lg text-center mb-2">
                                Drag & Drop your video here
                            </p>
                            <p className="text-sm font-medium text-gray-400 text-center">
                                or click to browse your files
                            </p>
                        </div>
                    )}

                    {/* Selected File Display & Upload UI */}
                    {file && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-2xl flex items-center justify-between border border-gray-100">
                                <div className="flex items-center space-x-4 overflow-hidden">
                                    <div className="bg-[#040457]/10 p-3 rounded-xl text-[#040457]">
                                        <Film size={28} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-[#040457] truncate max-w-[250px]">{file.name}</p>
                                        <p className="text-xs font-semibold text-gray-400 mt-1">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                {uploadStatus === 'idle' && (
                                    <button
                                        onClick={cancelUpload}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            {uploadStatus === 'resuming' && (
                                <div className="bg-[#c2f575]/10 border border-[#c2f575]/30 p-6 rounded-2xl animate-in fade-in zoom-in duration-300">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-[#c2f575] p-2 rounded-lg text-indigo-900">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#040457]">Incomplete upload detected</p>
                                            <p className="text-sm text-gray-500 mt-1">We found a partial upload for this file. Would you like to resume?</p>
                                            <div className="flex gap-3 mt-4">
                                                <button onClick={() => handleResumeUpload()} className="px-4 py-2 bg-[#040457] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all">Resume</button>
                                                <button onClick={() => handleStartFresh()} className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Start Fresh</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {uploadStatus === 'idle' && (
                                <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Section Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Introduction to Calculus"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[1.5rem] px-8 py-5 font-bold text-[#040457] outline-none transition-all"
                                    />
                                </div>
                            )}

                            {/* Progress Bar Area */}
                            {(uploadStatus === 'uploading' || uploadStatus === 'success') && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm font-bold text-[#040457]">
                                        <span>
                                            {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Complete!'}
                                        </span>
                                        <span>{Math.round(uploadProgress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-nunma-lime h-full rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {errorMessage && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-semibold">
                                    {errorMessage}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                                {uploadStatus === 'idle' && (
                                    <button
                                        onClick={() => startTusUpload()}
                                        className="w-full py-4 bg-[#040457] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl"
                                    >
                                        Start Upload
                                    </button>
                                )}

                                {uploadStatus === 'uploading' && (
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={togglePause}
                                            className="flex-1 py-4 bg-indigo-50 text-indigo-900 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                                        >
                                            {isPaused ? <><Play size={16} /> Resume</> : <><Pause size={16} /> Pause</>}
                                        </button>
                                        <button
                                            onClick={cancelUpload}
                                            className="px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-100 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {uploadStatus === 'error' && (
                                    <button
                                        onClick={startTusUpload}
                                        className="w-full py-4 bg-[#040457] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl"
                                    >
                                        Retry Upload
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
