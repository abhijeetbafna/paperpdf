import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2,
  RefreshCcw 
} from 'lucide-react';
import type { PageDimension } from '../types/pdf';

interface PagePreviewLightboxProps {
  pdfDoc: any;
  initialPageNumber: number;
  totalPages: number;
  pageDimensions: PageDimension[];
  pageRotations?: Record<number, number>;
  onClose: () => void;
  onRotate?: (pageIndex: number, delta: number) => void;
}

export const PagePreviewLightbox: React.FC<PagePreviewLightboxProps> = ({
  pdfDoc,
  initialPageNumber,
  totalPages,
  pageDimensions,
  pageRotations = {},
  onClose,
  onRotate,
}) => {
  const [currentPage, setCurrentPage] = useState(initialPageNumber);
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0); // 1.0 = Fit to Screen
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth - 60 : 800,
    height: typeof window !== 'undefined' ? window.innerHeight - 160 : 600,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageIndex = currentPage - 1;
  const rotation = pageRotations[pageIndex] || 0;
  const pageDim = pageDimensions.find(p => p.pageNumber === currentPage);

  // Measure container dimensions dynamically on mount and window/container resize
  const updateContainerSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        setContainerSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    }
  }, []);

  useEffect(() => {
    updateContainerSize();

    const handleResize = () => {
      updateContainerSize();
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateContainerSize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateContainerSize]);

  // Render high-resolution page preview dynamically fitted to available viewport
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    let renderTask: any = null;
    setIsLoading(true);
    setHasError(false);

    const renderFullPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled || !canvasRef.current) return;

        // 1. Get unscaled page dimensions taking rotation into account
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        const unscaledWidth = unscaledViewport.width;
        const unscaledHeight = unscaledViewport.height;

        // 2. Compute dynamic Fit-to-Screen scale with comfortable padding (32px padding)
        const availableW = Math.max(150, containerSize.width - 32);
        const availableH = Math.max(150, containerSize.height - 32);

        const scaleX = availableW / unscaledWidth;
        const scaleY = availableH / unscaledHeight;
        
        // Exact Fit-to-Screen scale ensures the entire page is visible without clipping
        const fitScale = Math.min(scaleX, scaleY);
        const finalRenderScale = Math.max(0.1, fitScale * zoomMultiplier);

        const viewport = page.getViewport({ scale: finalRenderScale, rotation });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.save();
        context.scale(outputScale, outputScale);

        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        } as any);

        await renderTask.promise;
        if (!isCancelled) {
          context.restore();
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering preview for page ${currentPage}:`, err);
          if (!isCancelled) {
            setHasError(true);
            setIsLoading(false);
          }
        }
      }
    };

    renderFullPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, zoomMultiplier, rotation, containerSize]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage(prev => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
      } else if (e.key === '+' || e.key === '=') {
        setZoomMultiplier(z => Math.min(3.0, Math.round((z + 0.25) * 100) / 100));
      } else if (e.key === '-') {
        setZoomMultiplier(z => Math.max(0.4, Math.round((z - 0.25) * 100) / 100));
      } else if (e.key === '0') {
        setZoomMultiplier(1.0); // Reset to fit
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, onClose]);

  const handlePrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  return (
    <div className="fixed inset-0 z-60 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-4 select-none animate-fade-in">
      {/* Lightbox Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2 text-white shadow-2xl backdrop-blur-lg">
        {/* Left: Page Meta Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg text-xs font-mono font-semibold text-blue-300">
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            <span>FIT PREVIEW</span>
          </div>
          <span className="text-xs font-medium text-zinc-300">
            Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
          </span>
          {pageDim && (
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              ({Math.round(pageDim.width)} × {Math.round(pageDim.height)} pt)
            </span>
          )}
        </div>

        {/* Center: Pagination Controls */}
        <div className="flex items-center gap-1 bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700/60">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Page (← Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2.5 text-xs font-mono font-bold text-zinc-200 min-w-[55px] text-center">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Page (→ Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom, Rotate & Close */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          <div className="flex items-center bg-zinc-800/80 rounded-lg border border-zinc-700/60 text-xs font-mono">
            <button
              onClick={() => setZoomMultiplier(z => Math.max(0.4, Math.round((z - 0.25) * 100) / 100))}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-l-md transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomMultiplier(1.0)}
              className={`px-2 py-1 text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                zoomMultiplier === 1.0
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-zinc-300 hover:text-white'
              }`}
              title="Fit to Screen (Click to reset)"
            >
              <RefreshCcw className="w-2.5 h-2.5" />
              <span>{zoomMultiplier === 1.0 ? 'Fit Page' : `${Math.round(zoomMultiplier * 100)}%`}</span>
            </button>
            <button
              onClick={() => setZoomMultiplier(z => Math.min(3.0, Math.round((z + 0.25) * 100) / 100))}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-r-md transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate Button */}
          {onRotate && (
            <button
              onClick={() => onRotate(pageIndex, 90)}
              className="p-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors text-xs font-medium"
              title="Rotate Page 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/80 ml-1"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Page Viewport Container: Auto-Centered and Fitted */}
      <div 
        ref={containerRef}
        className="w-full flex-1 flex items-center justify-center overflow-auto p-2 sm:p-4 my-2 relative"
      >
        {/* Loading Spinner Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs font-medium text-zinc-400">Rendering fitted page...</span>
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400 max-w-sm">
            <p className="text-sm font-semibold text-zinc-200 mb-1">Failed to render page</p>
            <p className="text-xs text-zinc-500">Please verify this page structure or try reopening.</p>
          </div>
        ) : (
          <div className="relative shadow-2xl rounded-[2px] bg-white border border-zinc-700/60 overflow-hidden transition-all duration-150 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className={`block transition-opacity duration-150 ${
                isLoading ? 'opacity-30' : 'opacity-100'
              }`}
            />
          </div>
        )}
      </div>

      {/* Lightbox Footer Navigation Bar */}
      <div className="w-full max-w-md flex items-center justify-between bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-400 backdrop-blur-lg">
        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous Page</span>
        </button>

        <span className="text-[11px] font-mono text-zinc-500">
          ← / → to switch • Esc to exit
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
        >
          <span>Next Page</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
