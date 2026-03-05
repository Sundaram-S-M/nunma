import React, { useState, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../utils/firebase';
import { UploadCloud, X, Film, CheckCircle } from 'lucide-react';
import Confetti from 'react-confetti';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

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
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
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
    };

    const startTusUpload = async () => {
        if (!file) return;

        try {
            setIsUploading(true);
            setUploadStatus('uploading');
            setErrorMessage('');

            // 1. Get Bunny Stream Signature from our Cloud Function
            const getSignatureNode = httpsCallable(functions, 'getBunnyUploadSignature');
            const result = await getSignatureNode({ title: file.name, zoneId });
            const { videoId, signature, expirationTime, libraryId } = result.data as any;

            // 2. Initialize TUS Upload
            const upload = new tus.Upload(file, {
                endpoint: 'https://video.bunnycdn.com/tusupload',
                retryDelays: [0, 3000, 5000, 10000, 20000],
                headers: {
                    AuthorizationSignature: signature,
                    AuthorizationExpire: expirationTime.toString(),
                    VideoId: videoId,
                    LibraryId: libraryId,
                },
                metadata: {
                    filetype: file.type,
                    title: file.name,
                },
                onError: (error) => {
                    console.error('TUS Upload Failed:', error);
                    setUploadStatus('error');
                    setErrorMessage(`Upload failed: ${error.message}`);
                    setIsUploading(false);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = (bytesUploaded / bytesTotal) * 100;
                    setUploadProgress(percentage);
                },
                onSuccess: async () => {
                    console.log('TUS Upload completed for videoId:', videoId);
                    setUploadStatus('success');
                    setIsUploading(false);

                    // Notify parent component
                    onUploadSuccess({ videoId, title: file.name });

                    // Save directly to Tutor Library
                    if (user) {
                        try {
                            await addDoc(collection(db, 'tutor_videos'), {
                                tutorId: user.uid,
                                bunnyVideoId: videoId,
                                title: file.name || "Untitled Video",
                                sizeBytes: file.size, // Track size for storage metering
                                status: "processing",
                                createdAt: serverTimestamp()
                            });

                            // If chapterId and zoneId are present, add it directly to the chapter's "lessons" subcollection
                            if (zoneId && chapterId) {
                                await addDoc(collection(db, 'zones', zoneId, 'chapters', chapterId, 'lessons'), {
                                    title: file.name || "Untitled Video",
                                    type: 'video',
                                    videoId: videoId,
                                    sizeBytes: file.size, // Optional: helpful for UI
                                    status: 'processing',
                                    createdAt: serverTimestamp()
                                });
                            }

                            alert("Video uploaded successfully.");
                        } catch (err: any) {
                            console.error("Failed to save video metadata:", err);
                        }
                    }

                    // Auto close after 3 seconds showing success
                    setTimeout(() => {
                        handleClose();
                    }, 3000);
                },
            });

            uploadRef.current = upload;

            // 3. Start the upload
            upload.start();

        } catch (error: any) {
            console.error('Backend Signature Failed:', error);
            setUploadStatus('error');
            setErrorMessage('Failed to initiate secure upload session. Please try again.');
            setIsUploading(false);
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

    const handleClose = () => {
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
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300">
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
                                {uploadStatus === 'success' && (
                                    <CheckCircle size={28} className="text-[#c2f575]" />
                                )}
                            </div>

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
                                            className="bg-[#c2f575] h-full rounded-full transition-all duration-300 ease-out"
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
                                        onClick={startTusUpload}
                                        className="w-full py-4 bg-[#040457] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl"
                                    >
                                        Start Upload
                                    </button>
                                )}

                                {uploadStatus === 'uploading' && (
                                    <button
                                        onClick={cancelUpload}
                                        className="w-full py-4 bg-gray-100 text-[#040457] rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </button>
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
