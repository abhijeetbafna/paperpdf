import React, { useEffect, useRef, useState } from 'react';

interface PageThumbnailProps {
  pdfDoc: any;
  pageNumber: number;
  rotation?: number;
  className?: string;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  pdfDoc,
  pageNumber,
  rotation = 0,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1 / 1.414);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    let renderTask: any = null;
    setIsLoading(true);
    setHasError(false);

    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled || !canvasRef.current) return;

        // Determine correct aspect ratio based on page dimensions and rotation
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        const ratio = unscaledViewport.width / unscaledViewport.height;
        setAspectRatio(ratio);

        // Compute thumbnail scale (target thumbnail width ~ 180px)
        const targetWidth = 180;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        context.save();
        context.scale(outputScale, outputScale);

        // Fill background white
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        } as any);

        await renderTask.promise;
        if (!isCancelled) {
          context.restore();
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering thumbnail for page ${pageNumber}:`, err);
          if (!isCancelled) {
            setHasError(true);
            setIsLoading(false);
          }
        }
      }
    };

    renderThumbnail();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, rotation]);

  return (
    <div 
      style={{ aspectRatio: `${aspectRatio}` }} 
      className={`relative w-full bg-white rounded overflow-hidden flex items-center justify-center shadow-inner ${className}`}
    >
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-zinc-400 text-[10px] text-center bg-zinc-100 dark:bg-zinc-900">
          <span>Failed to load preview</span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-contain pointer-events-none block transition-opacity duration-200 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
    </div>
  );
};
