import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Check, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
    url: string;
    onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, onClose }) => {
    const [scale, setScale] = useState(1);
    const [error, setError] = useState<string | null>(null);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

    return (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex flex-col animate-in fade-in duration-300">
            {/* Header Controls */}
            <div className="flex items-center justify-between p-4 bg-gray-900 text-white shadow-xl z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-lg tracking-tight">Document Viewer</h3>
                    <div className="h-6 w-px bg-gray-700 mx-2" />
                    <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
                        <button onClick={handleZoomOut} className="p-2 hover:bg-gray-700 rounded-md transition-colors" title="Zoom Out">
                            <ZoomOut size={18} />
                        </button>
                        <span className="text-sm font-mono w-16 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-700 rounded-md transition-colors" title="Zoom In">
                            <ZoomIn size={18} />
                        </button>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 overflow-auto bg-gray-950 flex justify-center p-8">
                {error ? (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-4 mt-20">
                        <AlertCircle size={48} className="text-red-500/50" />
                        <p className="text-xl font-bold">Failed to load document</p>
                        <p className="text-sm">{error}</p>
                    </div>
                ) : (
                    <div
                        className="bg-white shadow-2xl transition-transform origin-top"
                        style={{
                            transform: `scale(${scale})`,
                            width: '800px', // Standard A4 width approximation
                            minHeight: '1131px' // Standard A4 aspect ratio 
                        }}
                    >
                        {/* Note: In a real implementation using react-pdf, we'd render <Document /> and <Page /> here.
                 For this demo/mockup phase, or if using a simple iframe for robust browser support: */}
                        <iframe
                            src={`${url}#view=FitH`}
                            className="w-full h-full border-none"
                            title="PDF Document"
                            onError={() => setError("The document URL might be invalid or restricted by CORS.")}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFViewer;
