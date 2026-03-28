import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
}

interface PdfAnnotatorProps {
  url: string;
  onPathsChange: (paths: Record<number, DrawingPath[]>) => void;
}

const PdfAnnotator: React.FC<PdfAnnotatorProps> = ({ url, onPathsChange }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [allPaths, setAllPaths] = useState<Record<number, DrawingPath[]>>({});
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onPathsChange(allPaths);
  }, [allPaths, onPathsChange]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    const coords = getCoordinates(e, canvasRef.current);
    setIsDrawing(true);
    setCurrentPath({ points: [coords], color: 'red', width: 2 });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentPath || !canvasRef.current) return;
    e.preventDefault();
    const coords = getCoordinates(e, canvasRef.current);
    setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, coords] } : null);
  };

  const stopDrawing = () => {
    if (isDrawing && currentPath) {
      setAllPaths(prev => ({
        ...prev,
        [pageNumber]: [...(prev[pageNumber] || []), currentPath]
      }));
    }
    setIsDrawing(false);
    setCurrentPath(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const pagePaths = allPaths[pageNumber] || [];
    const pathsToDraw = currentPath ? [...pagePaths, currentPath] : pagePaths;

    pathsToDraw.forEach(path => {
      if (path.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });
  }, [allPaths, currentPath, pageNumber, canvasSize]);

  const onPageLoadSuccess = (pageInfo: any) => {
      setCanvasSize({ width: pageInfo.width, height: pageInfo.height });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-100">
        <div className="flex gap-4 items-center">
          <button 
            disabled={pageNumber <= 1} 
            onClick={() => setPageNumber(p => p - 1)}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-black text-[11px] uppercase tracking-widest text-[#1A1A4E]">Page {pageNumber} of {numPages}</span>
          <button 
            disabled={pageNumber >= numPages} 
            onClick={() => setPageNumber(p => p + 1)}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <button 
          onClick={() => setAllPaths(prev => ({ ...prev, [pageNumber]: [] }))}
          className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 font-black uppercase text-[10px] tracking-widest transition-colors"
        >
          <Trash2 size={16} /> Clear Page
        </button>
      </div>

      <div className="flex-1 overflow-auto flex justify-center p-8 bg-gray-100 relative custom-scrollbar">
        <div className="relative shadow-2xl bg-white" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <Document 
            file={url} 
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="font-bold text-indigo-900 p-8">Loading PDF Engine...</div>}
            error={<div className="font-bold text-red-500 p-8">Failed to compile PDF stream.</div>}
          >
            <Page 
              pageNumber={pageNumber} 
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="absolute top-0 left-0 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
};

export default PdfAnnotator;
