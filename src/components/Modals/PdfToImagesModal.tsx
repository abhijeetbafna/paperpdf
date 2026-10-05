import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { convertPdfToImages, type RenderedPageImage } from '../../core/converterEngine';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';
import { 
  X, 
  Image as ImageIcon, 
  Download, 
  Archive, 
  Sparkles, 
  Loader2, 
  FileCheck 
} from 'lucide-react';

export const PdfToImagesModal: React.FC = () => {
  const { 
    activeModal, 
    setActiveModal, 
    pdfDocProxy, 
    pageDimensions, 
    fileName 
  } = usePDFStore();

  const [dpi, setDpi] = useState<150 | 300 | 600>(300);
  const [format, setFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [quality, setQuality] = useState<number>(0.92);
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [renderedImages, setRenderedImages] = useState<RenderedPageImage[]>([]);
  const [zipBlobPromise, setZipBlobPromise] = useState<Promise<Blob> | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  if (activeModal !== 'pdfToImages') return null;

  const totalPages = pageDimensions.length || (pdfDocProxy?.numPages ?? 1);

  const parsePageRange = (rangeStr: string, maxPages: number): number[] => {
    if (!rangeStr.trim()) {
      return Array.from({ length: maxPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>();
    const parts = rangeStr.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(maxPages, end); p++) {
            pages.add(p);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= maxPages) {
          pages.add(p);
        }
      }
    }
    const result = Array.from(pages).sort((a, b) => a - b);
    return result.length > 0 ? result : Array.from({ length: maxPages }, (_, i) => i + 1);
  };

  const handleStartConversion = async () => {
    if (!pdfDocProxy) return;

    setIsProcessing(true);
    setProgress(0);
    setCurrentStepText('Initializing rendering engine...');
    setRenderedImages([]);

    const targetPages = pageScope === 'all'
      ? Array.from({ length: totalPages }, (_, i) => i + 1)
      : parsePageRange(customRange, totalPages);

    try {
      const result = await convertPdfToImages(
        pdfDocProxy,
        {
          dpi,
          format,
          quality,
          pageRange: targetPages,
        },
        (prog, current, total, latest) => {
          setProgress(prog);
          setCurrentStepText(`Rendering page ${current} of ${total} (${dpi} DPI)...`);
          if (latest) {
            setRenderedImages((prev) => [...prev, latest]);
          }
        }
      );

      setZipBlobPromise(result.zipBlob);
      setCurrentStepText('Completed! High-resolution images ready.');
    } catch (err) {
      console.error('PDF to Image conversion error:', err);
      setCurrentStepText('Conversion failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (img: RenderedPageImage) => {
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = img.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllZip = async () => {
    if (!zipBlobPromise) return;
    setIsZipping(true);
    try {
      const blob = await zipBlobPromise;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'document';
      link.download = `${baseName}_images_${dpi}dpi.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP packaging failed:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Export PDF to Images</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Extract high-resolution PNG, JPG, or WebP images locally
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!pdfDocProxy ? (
            <ModalDocumentDropzone
              title="Select a PDF to export as high-resolution images"
              subtitle="Extract crisp PNG, JPG, or WebP page images directly in your browser with selectable DPI presets."
            />
          ) : (
            <>
              {/* Preset Quality / DPI Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Image Resolution & DPI
                </label>
                <div className="grid grid-cols-3 gap-3">
              {[
                { dpi: 150, title: '150 DPI', sub: 'Fast & Web Ready', badge: 'Standard' },
                { dpi: 300, title: '300 DPI', sub: 'Crystal Clear (Recommended)', badge: 'Print HD' },
                { dpi: 600, title: '600 DPI', sub: 'Ultra High Fidelity', badge: 'Archival' },
              ].map((opt) => (
                <button
                  key={opt.dpi}
                  type="button"
                  onClick={() => setDpi(opt.dpi as any)}
                  disabled={isProcessing}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    dpi === opt.dpi
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">{opt.title}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {opt.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    {opt.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Output Format
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'image/png', label: 'PNG (Lossless)' },
                  { id: 'image/jpeg', label: 'JPEG (Compact)' },
                  { id: 'image/webp', label: 'WebP (Modern)' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id as any)}
                    disabled={isProcessing}
                    className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                      format === fmt.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              {(format === 'image/jpeg' || format === 'image/webp') && (
                <div className="mt-2 flex items-center justify-between gap-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[11px] text-zinc-500">Quality:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    disabled={isProcessing}
                    className="flex-1 accent-blue-600 h-1.5 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[11px] text-zinc-700 dark:text-zinc-300 w-8 text-right">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Page Range Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Page Scope
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPageScope('all')}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    pageScope === 'all'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  All Pages ({totalPages})
                </button>
                <button
                  type="button"
                  onClick={() => setPageScope('custom')}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    pageScope === 'custom'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>
          </div>

          {pageScope === 'custom' && (
            <div className="animate-fade-in">
              <input
                type="text"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="e.g. 1, 3-5, 8"
                disabled={isProcessing}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-zinc-400 mt-1">Specify comma-separated page numbers or ranges</p>
            </div>
          )}

          {/* Progress Bar & Status */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {currentStepText}
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-300">{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900/50 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-200 rounded-full" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          )}

          {/* Rendered Preview Grid */}
          {renderedImages.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Generated Images ({renderedImages.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={isZipping || !zipBlobPromise}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isZipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  <span>Download All as ZIP</span>
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                {renderedImages.map((img) => (
                  <div 
                    key={img.pageNumber} 
                    className="group relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm flex flex-col"
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <img 
                        src={img.dataUrl} 
                        alt={img.filename} 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div className="p-1.5 flex items-center justify-between bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-[10px]">
                      <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400">
                        P.{img.pageNumber}
                      </span>
                      <button
                        onClick={() => handleDownloadSingle(img)}
                        className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white transition-colors"
                        title={`Download ${img.filename}`}
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Rendered 100% locally in-memory
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleStartConversion}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{renderedImages.length > 0 ? 'Re-Export Images' : 'Start Conversion'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
