import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { 
  runOcrOnPdfPages, 
  injectSearchableOcrTextLayer, 
  convertOcrResultsToEditableTextItems, 
  SUPPORTED_OCR_LANGUAGES,
  type PageOcrResult,
  type OcrProgressEvent 
} from '../../core/ocrEngine';
import { 
  X, 
  ScanText, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  FileText, 
  Languages, 
  Edit3, 
  Search, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';

export const OcrModal: React.FC = () => {
  const { 
    activeModal, 
    setActiveModal, 
    pdfDocProxy, 
    documentBytes, 
    pageDimensions, 
    currentPage, 
    fileName,
    loadDocument
  } = usePDFStore();

  const [language, setLanguage] = useState<string>('eng');
  const [pageScope, setPageScope] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressEvent, setProgressEvent] = useState<OcrProgressEvent | null>(null);
  const [ocrResults, setOcrResults] = useState<PageOcrResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (activeModal !== 'ocr') return null;

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

  const handleStartOcr = async () => {
    if (!pdfDocProxy) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessStatus(null);
    setOcrResults([]);

    let targetPages: number[];
    if (pageScope === 'current') {
      targetPages = [currentPage || 1];
    } else if (pageScope === 'custom') {
      targetPages = parsePageRange(customRange, totalPages);
    } else {
      targetPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    try {
      const results = await runOcrOnPdfPages(
        pdfDocProxy,
        targetPages,
        language,
        (evt) => setProgressEvent(evt)
      );

      setOcrResults(results);
      setSuccessStatus(`Successfully recognized ${results.reduce((acc, r) => acc + r.words.length, 0)} words across ${results.length} pages!`);
    } catch (err: any) {
      console.error('OCR processing failed:', err);
      setErrorMessage(err?.message || 'Failed to complete optical character recognition.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMakeSearchableAndDownload = async () => {
    if (!documentBytes || ocrResults.length === 0) return;
    setIsProcessing(true);
    setSuccessStatus('Injecting searchable vector text overlay...');

    try {
      const searchableBytes = await injectSearchableOcrTextLayer(documentBytes, ocrResults);
      const outputName = fileName 
        ? fileName.replace(/\.pdf$/i, '_searchable_ocr.pdf') 
        : 'searchable_ocr_document.pdf';

      const blob = new Blob([searchableBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessStatus('Searchable PDF downloaded! Try opening it and pressing Ctrl+F.');
    } catch (err: any) {
      console.error('Searchable PDF generation failed:', err);
      setErrorMessage('Failed to generate searchable PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanToEditable = async () => {
    if (!documentBytes || ocrResults.length === 0) return;
    setIsProcessing(true);
    setSuccessStatus('Injecting editable text layers into PaperPDF...');

    try {
      // 1. Inject OCR text layer into PDF document so it retains vector structure
      const searchableBytes = await injectSearchableOcrTextLayer(documentBytes, ocrResults);
      const editableItemsByPage = convertOcrResultsToEditableTextItems(ocrResults);

      // 2. Load into store
      await loadDocument(searchableBytes, fileName || 'ocr_document.pdf');
      
      // 3. Populate extracted text items into pdfStore
      usePDFStore.setState((state) => ({
        extractedTextByPage: {
          ...state.extractedTextByPage,
          ...editableItemsByPage,
        },
        activeTool: 'edit-text',
      }));

      setActiveModal(null);
    } catch (err: any) {
      console.error('Scan to editable failed:', err);
      setErrorMessage('Failed to convert scanned text to editable elements.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    const fullText = ocrResults.map((r) => `--- Page ${r.pageNumber} ---\n${r.text}`).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const fullText = ocrResults.map((r) => `--- Page ${r.pageNumber} ---\n${r.text}`).join('\n\n');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'document';
    link.download = `${baseName}_ocr_extracted.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fullRecognizedText = ocrResults.map((r) => r.text).join('\n\n');
  const avgConfidence = ocrResults.length > 0 
    ? Math.round(ocrResults.reduce((acc, r) => acc + r.confidence, 0) / ocrResults.length) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ScanText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Optical Character Recognition (OCR)</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Convert scanned PDFs into searchable, selectable, editable vector text
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
          {!documentBytes ? (
            <div className="py-2">
              <ModalDocumentDropzone
                title="Upload Scanned PDF to OCR"
                subtitle="Extract high-accuracy text, inject searchable layers, or copy raw text"
              />
            </div>
          ) : (
            <>
              {/* Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Language Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" />
                <span>Recognition Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isProcessing}
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {SUPPORTED_OCR_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Scope Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Pages to Process
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPageScope('all')}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    pageScope === 'all'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  All ({totalPages})
                </button>
                <button
                  type="button"
                  onClick={() => setPageScope('current')}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    pageScope === 'current'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  Page {currentPage || 1}
                </button>
                <button
                  type="button"
                  onClick={() => setPageScope('custom')}
                  disabled={isProcessing}
                  className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    pageScope === 'custom'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  Custom
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
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[11px] text-zinc-400 mt-1">Specify comma-separated page numbers or ranges</p>
            </div>
          )}

          {/* Progress Overlay */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {progressEvent?.status || 'Processing neural OCR...'}
                </span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-300">
                  {progressEvent?.progress || 0}%
                </span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-900/50 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-600 h-full transition-all duration-200 rounded-full" 
                  style={{ width: `${progressEvent?.progress || 0}%` }} 
                />
              </div>
            </div>
          )}

          {/* Feedback */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successStatus && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successStatus}</span>
            </div>
          )}

          {/* OCR Results Preview Box */}
          {ocrResults.length > 0 && (
            <div className="space-y-3 pt-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Recognized Text Preview ({avgConfidence}% confidence)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={fullRecognizedText}
                rows={6}
                className="w-full text-xs font-mono p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-800 dark:text-zinc-200 resize-none focus:outline-none"
              />

              {/* Action Cards for Output Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  onClick={handleMakeSearchableAndDownload}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer transition-all hover:scale-[1.01] shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400">
                      <Search className="w-4 h-4" />
                      <span>Make Searchable & Download PDF</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Embeds invisible selectable text vectors so you can search (Ctrl+F) and copy text directly with mouse.
                    </p>
                  </div>
                  <div className="pt-2 text-right">
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 group-hover:underline">
                      Download PDF →
                    </span>
                  </div>
                </div>

                <div
                  onClick={handleScanToEditable}
                  className="p-3.5 rounded-xl border border-purple-300 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/30 hover:border-purple-600 cursor-pointer transition-all hover:scale-[1.01] shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <Edit3 className="w-4 h-4" />
                      <span>Scan to Editable PaperPDF Text</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                      Instantly converts detected scanned lines into clickable, in-place editable text elements in the editor.
                    </p>
                  </div>
                  <div className="pt-2 text-right">
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 group-hover:underline">
                      Open in Editor →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            100% In-Browser Tesseract Neural Engine
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
            {documentBytes && (
              <button
                type="button"
                onClick={handleStartOcr}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{ocrResults.length > 0 ? 'Re-Run OCR' : 'Start OCR Recognition'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
