import React, { useState, useEffect, useRef } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import * as pdfjsLib from 'pdfjs-dist';
import { comparePdfPages, type DiffResult } from '../../core/diffEngine';
import { 
  X, 
  GitCompare, 
  Upload, 
  Layers, 
  Columns, 
  SplitSquareVertical, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export const PdfDiffModal: React.FC = () => {
  const { activeModal, setActiveModal, documentBytes, fileName } = usePDFStore();

  const [docABytes, setDocABytes] = useState<Uint8Array | null>(null);
  const [docBBytes, setDocBBytes] = useState<Uint8Array | null>(null);
  const [docAName, setDocAName] = useState<string>('Document A');
  const [docBName, setDocBName] = useState<string>('Document B');

  const [pdfDocA, setPdfDocA] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfDocB, setPdfDocB] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [maxPages, setMaxPages] = useState(1);

  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'heatmap' | 'redline'>('slider');
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isComparing, setIsComparing] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);

  // Initialize Doc A with active document
  useEffect(() => {
    if (activeModal === 'pdfDiff' && documentBytes) {
      setDocABytes(documentBytes.slice());
      setDocAName(fileName || 'Original Document.pdf');
    }
  }, [activeModal, documentBytes, fileName]);

  // Load PDF.js proxies
  useEffect(() => {
    let isMounted = true;

    async function loadDocs() {
      if (!docABytes) return;

      try {
        setErrorMessage(null);
        const loadingTaskA = pdfjsLib.getDocument({ data: docABytes.slice() });
        const docA = await loadingTaskA.promise;
        if (!isMounted) return;
        setPdfDocA(docA);

        if (docBBytes) {
          const loadingTaskB = pdfjsLib.getDocument({ data: docBBytes.slice() });
          const docB = await loadingTaskB.promise;
          if (!isMounted) return;
          setPdfDocB(docB);
          const pages = Math.min(docA.numPages, docB.numPages);
          setMaxPages(pages > 0 ? pages : 1);
          setCurrentPage(prev => Math.max(1, Math.min(prev, pages > 0 ? pages : 1)));
        } else {
          setPdfDocB(null);
          setMaxPages(docA.numPages || 1);
          setCurrentPage(1);
        }
      } catch (err: any) {
        console.error('Error loading PDF documents for diff:', err);
        if (isMounted) setErrorMessage(err?.message || 'Failed to load PDF documents for comparison.');
      }
    }

    loadDocs();

    return () => {
      isMounted = false;
    };
  }, [docABytes, docBBytes]);

  // Run diff when pages or documents change
  useEffect(() => {
    let isMounted = true;

    async function runDiff() {
      if (!pdfDocA || !pdfDocB) {
        setDiffResult(null);
        return;
      }

      setIsComparing(true);
      setErrorMessage(null);
      try {
        const safePage = Math.max(1, Math.min(currentPage, Math.min(pdfDocA.numPages, pdfDocB.numPages)));
        const result = await comparePdfPages(pdfDocA, safePage, pdfDocB, safePage);
        if (isMounted) {
          setDiffResult(result);
        }
      } catch (err: any) {
        console.error('Diff computation error:', err);
        if (isMounted) setErrorMessage(err?.message || 'Error computing visual diff.');
      } finally {
        if (isMounted) setIsComparing(false);
      }
    }

    runDiff();

    return () => {
      isMounted = false;
    };
  }, [pdfDocA, pdfDocB, currentPage]);

  if (activeModal !== 'pdfDiff') return null;

  const handleUploadB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          setDocBBytes(new Uint8Array(event.target.result));
          setDocBName(file.name);
          setCurrentPage(1);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleUploadA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          setDocABytes(new Uint8Array(event.target.result));
          setDocAName(file.name);
          setCurrentPage(1);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Slider Dragging Handlers
  const handleSliderMouseDown = () => {
    isDraggingSlider.current = true;
  };

  const handleSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSlider.current || !sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleSliderMouseUp = () => {
    isDraggingSlider.current = false;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto select-none"
      onMouseMove={handleSliderMouseMove}
      onMouseUp={handleSliderMouseUp}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Visual PDF Diff & Legal Redline Studio</span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Zero Cloud Upload
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Compare two drafts of a contract or drawing to detect exact pixel shifts and modified text.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Document Selectors & Comparison Modes */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Document Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Doc A */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="font-semibold text-zinc-500">A (Original):</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 max-w-[130px] truncate" title={docAName}>{docAName}</span>
              <label className="cursor-pointer text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1">
                Change
                <input type="file" accept=".pdf" onChange={handleUploadA} className="hidden" />
              </label>
            </div>

            <span className="text-zinc-400 text-xs font-bold">vs</span>

            {/* Doc B */}
            {docBBytes ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-zinc-500">B (Revision):</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200 max-w-[130px] truncate" title={docBName}>{docBName}</span>
                <label className="cursor-pointer text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1">
                  Change
                  <input type="file" accept=".pdf" onChange={handleUploadB} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document B (.pdf)</span>
                <input type="file" accept=".pdf" onChange={handleUploadB} className="hidden" />
              </label>
            )}
          </div>

          {/* View Modes */}
          {docBBytes && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setViewMode('slider')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    viewMode === 'slider' 
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>Split Swipe</span>
                </button>

                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    viewMode === 'side-by-side' 
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Side by Side</span>
                </button>

                <button
                  onClick={() => setViewMode('heatmap')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    viewMode === 'heatmap' 
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Visual Heatmap</span>
                </button>

                <button
                  onClick={() => setViewMode('redline')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    viewMode === 'redline' 
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Text Redline</span>
                </button>
              </div>

              {/* Page Navigator */}
              {maxPages > 1 && (
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg text-xs shadow-sm">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-medium">Page {currentPage} of {maxPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(maxPages, p + 1))}
                    disabled={currentPage >= maxPages}
                    className="p-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[420px] bg-zinc-100/60 dark:bg-zinc-950/60 flex flex-col items-center justify-center">
          {!docBBytes ? (
            <div className="text-center max-w-md p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <GitCompare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">Upload Revised Document</h3>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                Select a revised version of this PDF to run pixel-by-pixel differential overlay, visual split-screen comparison, and text redline analysis.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md">
                <Upload className="w-4 h-4" />
                <span>Select Document B (.pdf)</span>
                <input type="file" accept=".pdf" onChange={handleUploadB} className="hidden" />
              </label>
            </div>
          ) : isComparing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Rendering pages and computing difference matrix...</p>
            </div>
          ) : errorMessage ? (
            <div className="text-center max-w-md p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">Comparison Failed</h4>
              <p className="text-xs text-red-600 dark:text-red-400 mb-4">{errorMessage}</p>
              <button
                onClick={() => setCurrentPage(1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Comparison</span>
              </button>
            </div>
          ) : diffResult ? (
            <div className="w-full flex flex-col items-center gap-4">
              {/* Diff Statistics Banner */}
              <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-sm text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>+{diffResult.addedCount} Added Words</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>-{diffResult.removedCount} Removed Words</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-medium">Similarity Match:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-xs ${
                    diffResult.similarityScore > 90 
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : diffResult.similarityScore > 70
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                  }`}>
                    {diffResult.similarityScore}%
                  </span>
                </div>
              </div>

              {/* View Mode 1: Split Slider */}
              {viewMode === 'slider' && (
                <div 
                  ref={sliderContainerRef}
                  className="relative max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden select-none cursor-ew-resize flex items-center justify-center"
                  onMouseDown={handleSliderMouseDown}
                >
                  {/* Layer B (Revision) */}
                  <img 
                    src={diffResult.canvasBUrl} 
                    alt="Revision B" 
                    className="w-full h-auto max-h-[62vh] object-contain block pointer-events-none" 
                  />

                  {/* Layer A (Original Clipped) */}
                  <div 
                    className="absolute inset-0 overflow-hidden border-r-2 border-indigo-500 pointer-events-none"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img 
                      src={diffResult.canvasAUrl} 
                      alt="Original A" 
                      className="max-w-none h-full block pointer-events-none" 
                      style={{ width: sliderContainerRef.current?.clientWidth || '100%' }}
                    />
                  </div>

                  {/* Slider Handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 flex items-center justify-center pointer-events-none"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white text-[10px] font-bold">
                      ↔
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none">
                    Original (A)
                  </div>
                  <div className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none">
                    Revision (B)
                  </div>
                </div>
              )}

              {/* View Mode 2: Side-by-Side */}
              {viewMode === 'side-by-side' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl">
                  <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 overflow-hidden p-3 flex flex-col items-center">
                    <div className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Original (A) — {docAName}
                    </div>
                    <img src={diffResult.canvasAUrl} alt="Original A" className="w-full h-auto max-h-[58vh] object-contain rounded border border-zinc-200 dark:border-zinc-800 shadow-sm" />
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 overflow-hidden p-3 flex flex-col items-center">
                    <div className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Revision (B) — {docBName}
                    </div>
                    <img src={diffResult.canvasBUrl} alt="Revision B" className="w-full h-auto max-h-[58vh] object-contain rounded border border-zinc-200 dark:border-zinc-800 shadow-sm" />
                  </div>
                </div>
              )}

              {/* View Mode 3: Visual Heatmap Overlay */}
              {viewMode === 'heatmap' && (
                <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-3 text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Pixel Difference Map:</span>
                    <div className="flex items-center gap-3 text-[11px] font-medium">
                      <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Added in B</span>
                      <span className="flex items-center gap-1 text-red-600"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Missing from B</span>
                      <span className="flex items-center gap-1 text-zinc-400"><span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block" /> Identical</span>
                    </div>
                  </div>
                  <img src={diffResult.canvasDiffUrl} alt="Diff Overlay" className="w-full h-auto max-h-[60vh] object-contain rounded border border-zinc-200 dark:border-zinc-800" />
                </div>
              )}

              {/* View Mode 4: Text Redline */}
              {viewMode === 'redline' && (
                <div className="max-w-4xl w-full bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 p-5">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3">
                    Unified Text Redline Stream
                  </h4>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono leading-relaxed max-h-[360px] overflow-y-auto whitespace-pre-wrap">
                    {diffResult.wordDiffs.map((word, idx) => {
                      if (word.type === 'added') {
                        return (
                          <span key={idx} className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1 rounded mx-0.5">
                            +{word.text}{' '}
                          </span>
                        );
                      }
                      if (word.type === 'removed') {
                        return (
                          <span key={idx} className="bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 line-through px-1 rounded mx-0.5">
                            -{word.text}{' '}
                          </span>
                        );
                      }
                      return <span key={idx} className="text-zinc-700 dark:text-zinc-300">{word.text} </span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <GitCompare className="w-8 h-8 opacity-40" />
              <span className="text-xs">Select or change document to compute difference.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>100% In-Browser Privacy Diff: No files leave your machine.</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            Close Diff Studio
          </button>
        </div>

      </div>
    </div>
  );
};
