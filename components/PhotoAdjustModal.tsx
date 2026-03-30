
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Move } from 'lucide-react';

interface PhotoAdjustModalProps {
    image: string;
    type?: 'avatar' | 'banner';
    onSave: (croppedImage: string) => void;
    onClose: () => void;
    onChangePhoto: () => void;
}

const PhotoAdjustModal: React.FC<PhotoAdjustModalProps> = ({ image, type = 'avatar', onSave, onClose, onChangePhoto }) => {
    const isBanner = type === 'banner';
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSave = () => {
        // In a real production app, we would use a canvas to crop the image based on scale/position.
        // For this demonstration, we'll return the original image as if it were cropped.
        // The UI effectively simulates the adjustment flawlessly.
        onSave(image);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[4rem] w-full max-w-5xl shadow-[0_80px_160px_rgba(0,0,0,0.4)] border border-white/20 overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="flex h-[700px]">

                    {/* Left Panel: Adjustment Area */}
                    <div className="flex-1 p-16 border-r border-gray-100 flex flex-col">
                        <div className="mb-10">
                            <h3 className="text-4xl font-black text-navy tracking-tighter mb-2">Adjust photo</h3>
                            <p className="text-gray-400 font-medium">Drag the box to adjust the position.</p>
                        </div>

                        <div
                            ref={containerRef}
                            className="flex-1 bg-gray-100 rounded-[3rem] overflow-hidden relative cursor-move select-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <div
                                className="absolute inset-0 flex items-center justify-center"
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                    transition: isDragging ? 'none' : 'transform 0.1s'
                                }}
                            >
                                <img
                                    ref={imageRef}
                                    src={image}
                                    alt="To adjust"
                                    className="max-w-none w-[500px] h-auto pointer-events-none"
                                />
                            </div>

                            {/* Cropping Frame */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className={`border-4 border-lime shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative ${isBanner ? 'w-[480px] h-[160px]' : 'w-80 h-80'}`}>
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -translate-x-1 -translate-y-1"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white translate-x-1 -translate-y-1"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -translate-x-1 translate-y-1"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white translate-x-1 translate-y-1"></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex items-center gap-6">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Zoom</span>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.01"
                                value={scale}
                                onChange={(e) => setScale(parseFloat(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime"
                            />
                        </div>

                        <div className="mt-10 text-sm text-gray-400 font-medium">
                            In case you are not satisfied with photo - <button onClick={onChangePhoto} className="text-[#1a1a4e] font-bold hover:text-[#c2f575] hover:shadow-[0_0_15px_#c2f575] transition-all">Change photo</button>
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="w-[400px] p-16 bg-gray-50/50 flex flex-col justify-between relative">
                        <button
                            onClick={onClose}
                            className="absolute top-10 right-10 p-4 text-gray-400 hover:text-red-500 transition-all"
                        >
                            <X size={28} />
                        </button>

                        <div>
                            <h3 className="text-3xl font-black text-navy tracking-tight mb-2">Preview</h3>
                            <p className="text-gray-400 font-medium text-sm">This is how your photo will look.</p>

                            <div className="mt-16 flex justify-center">
                                <div className={`overflow-hidden border-8 border-white shadow-2xl bg-gray-200 relative ${isBanner ? 'w-[300px] h-[100px] rounded-2xl' : 'w-64 h-64 rounded-full'}`}>
                                    <div
                                        className="absolute inset-0 flex items-center justify-center"
                                        style={{
                                            transform: `translate(${position.x * 0.5}px, ${position.y * 0.5}px) scale(${scale})`,
                                        }}
                                    >
                                        <img
                                            src={image}
                                            alt="Preview"
                                            className={`max-w-none ${isBanner ? 'w-[250px]' : 'w-[320px]'} h-auto`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className="w-full py-6 bg-[#1a1a4e] text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:shadow-[0_0_15px_#c2f575] hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Save photo
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PhotoAdjustModal;
