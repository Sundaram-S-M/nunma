import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Trash2, RotateCcw } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  canvasWidth?: number;
  canvasHeight?: number;
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
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
    const touch = 'touches' in e ? (e.touches[0] || (e as any).changedTouches?.[0]) : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      if (e.touches.length >= 2) {
        // 2-finger touch: cancel drawing and record touch position for 2-finger scroll
        setIsDrawing(false);
        setCurrentPath(null);
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastTouchRef.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        return;
      }
      e.preventDefault();
    }
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const coords = getCoordinates(e, canvasRef.current);
    setIsDrawing(true);
    setCurrentPath({
      points: [{ x: coords.x, y: coords.y }],
      color: 'red',
      width: 3,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    if ('touches' in e) {
      if (e.touches.length >= 2) {
        // 2-finger gesture: scroll the container
        if (isDrawing) {
          setIsDrawing(false);
          setCurrentPath(null);
        }
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const curX = (t1.clientX + t2.clientX) / 2;
        const curY = (t1.clientY + t2.clientY) / 2;

        if (lastTouchRef.current && scrollContainerRef.current) {
          const deltaX = lastTouchRef.current.x - curX;
          const deltaY = lastTouchRef.current.y - curY;
          scrollContainerRef.current.scrollTop += deltaY;
          scrollContainerRef.current.scrollLeft += deltaX;
        }
        lastTouchRef.current = { x: curX, y: curY };
        return;
      }

      // 1 finger touch: draw ink
      if (!isDrawing || !currentPath) return;
      e.preventDefault();
      const coords = getCoordinates(e, canvasRef.current);
      setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, coords] } : null);
    } else {
      // Mouse draw
      if (!isDrawing || !currentPath) return;
      const coords = getCoordinates(e, canvasRef.current);
      setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, coords] } : null);
    }
  };

  const stopDrawing = () => {
    lastTouchRef.current = null;
    if (isDrawing && currentPath) {
      setAllPaths(prev => ({
        ...prev,
        [pageNumber]: [...(prev[pageNumber] || []), currentPath]
      }));
    }
    setIsDrawing(false);
    setCurrentPath(null);
  };

  const handleUndo = () => {
    setAllPaths(prev => {
      const current = prev[pageNumber] || [];
      if (current.length === 0) return prev;
      return { ...prev, [pageNumber]: current.slice(0, -1) };
    });
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
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl md:rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
      {/* Control Bar */}
      <div className="flex justify-between items-center p-2 md:p-4 bg-white border-b border-gray-100 flex-wrap gap-2 shrink-0">
        
        {/* Page Nav */}
        <div className="flex gap-1.5 md:gap-3 items-center">
          <button 
            disabled={pageNumber <= 1} 
            onClick={() => setPageNumber(p => p - 1)}
            className="p-1.5 md:p-3 bg-gray-50 hover:bg-gray-100 rounded-xl disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-black text-[10px] md:text-[11px] uppercase tracking-widest text-nunma-forest whitespace-nowrap">
            Page {pageNumber} of {numPages}
          </span>
          <button 
            disabled={pageNumber >= numPages} 
            onClick={() => setPageNumber(p => p + 1)}
            className="p-1.5 md:p-3 bg-gray-50 hover:bg-gray-100 rounded-xl disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Undo & Clear */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleUndo}
            disabled={!(allPaths[pageNumber] && allPaths[pageNumber].length > 0)}
            className="flex items-center gap-1 px-2.5 md:px-4 py-1.5 md:py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-colors disabled:opacity-30"
            title="Undo last mark"
          >
            <RotateCcw size={14} /> <span className="hidden sm:inline">Undo</span>
          </button>

          <button 
            onClick={() => setAllPaths(prev => ({ ...prev, [pageNumber]: [] }))}
            className="flex items-center gap-1 px-2.5 md:px-5 py-1.5 md:py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-colors"
            title="Clear all drawings on page"
          >
            <Trash2 size={14} /> Clear<span className="hidden sm:inline"> Page</span>
          </button>
        </div>
      </div>

      {/* PDF Viewport & Canvas Overlay */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto flex justify-center p-2 md:p-8 bg-gray-100 relative custom-scrollbar touch-pan-x touch-pan-y"
      >
        <div className="relative shadow-2xl bg-white my-auto max-w-full" style={{ width: canvasSize.width, height: canvasSize.height }}>
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
            className="absolute top-0 left-0 cursor-crosshair touch-none pointer-events-auto"
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
