import React, { useRef } from 'react';
import { usePDFStore } from '../store/pdfStore';
import { 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Lock,
  Zap,
  FileUp,
  FileCode,
  Presentation,
  GitCompare,
  Table,
  Layers,
  Volume2,
  QrCode
} from 'lucide-react';

export const EmptyState: React.FC = () => {
  const { loadDocument, loadSampleDocument, isLoading, loadingMessage, setActiveModal } = usePDFStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          loadDocument(new Uint8Array(event.target.result), file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          loadDocument(new Uint8Array(event.target.result), file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 bg-grid-pattern-light dark:bg-grid-pattern overflow-y-auto transition-colors">
      <div className="w-full max-w-4xl space-y-6 text-center">
        {/* Main Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[11px] font-mono text-blue-600 dark:text-blue-400">
            <Cpu className="w-3 h-3" /> Client-Side WebAssembly Engine • Zero Server Latency
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            In-Place PDF Text Editor & Intelligence Studio
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Click existing text directly inside your PDF to edit it. Diff contracts, extract tables, generate vector QR codes, or convert to Word/PPT — 100% in-browser.
          </p>
        </div>

        {/* Drop Zone Box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white/80 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-900/90 rounded-2xl p-7 sm:p-9 cursor-pointer transition-all duration-200 shadow-lg dark:shadow-xl group relative overflow-hidden max-w-2xl mx-auto"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".pdf"
            className="hidden"
          />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 animate-pulse">
                {loadingMessage || 'Processing document...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:border-blue-500/40 transition-all shadow-md">
                <Upload className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Drop your PDF here, or <span className="text-blue-600 dark:text-blue-400 underline underline-offset-2">browse files</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500">
                  Supports standard documents, scanned invoices, legal contracts, and forms.
                </div>
              </div>

              {/* Sample Document Fast Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSampleDocument();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Try Sample Commercial Invoice (1-Click Test)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Tool Launchers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-left max-w-3xl mx-auto">
          <div 
            onClick={() => setActiveModal('pdfDiff')}
            className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 cursor-pointer transition-all shadow-sm hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 transition-colors">
              <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Visual PDF Diff
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Compare 2 drafts with swipe overlay.
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('tableExtractor')}
            className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 cursor-pointer transition-all shadow-sm hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 transition-colors">
              <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Smart Table to Excel
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Extract tabular data to .xlsx & CSV.
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('pdfToPpt')}
            className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 hover:border-orange-500/50 dark:hover:border-orange-500/50 cursor-pointer transition-all shadow-sm hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-orange-600 transition-colors">
              <Presentation className="w-4 h-4 text-orange-600 dark:text-orange-400" /> PDF to PPT
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Export 16:9 PowerPoint slides.
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('wordConverter')}
            className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 hover:border-blue-500/50 dark:hover:border-blue-500/50 cursor-pointer transition-all shadow-sm hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 transition-colors">
              <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Word Studio
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Two-way PDF ↔ Word (.docx).
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('batchStudio')}
            className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 cursor-pointer transition-all shadow-sm hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 transition-colors">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Batch Surgery
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Bulk watermark, rotate & ZIP.
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('barcodeGenerator')}
            className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 hover:border-purple-500/50 dark:hover:border-purple-500/50 cursor-pointer transition-all shadow-sm hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-purple-600 transition-colors">
              <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" /> QR & Barcode
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Generate & stamp vector codes.
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('ttsReader')}
            className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 hover:border-blue-500/50 dark:hover:border-blue-500/50 cursor-pointer transition-all shadow-sm hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 transition-colors">
              <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Natural Voice (TTS)
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Read document aloud with tracking.
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('imagesToPdf')}
            className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 hover:border-pink-500/50 dark:hover:border-pink-500/50 cursor-pointer transition-all shadow-sm hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-pink-600 transition-colors">
              <FileUp className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Images to PDF
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Combine JPG/PNG into PDF.
            </p>
          </div>
        </div>

        {/* Security & Privacy Banner */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-900">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> 100% In-Browser Privacy
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" /> No File Upload to Cloud
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Zero Watermarks
          </span>
        </div>
      </div>
    </div>
  );
};
