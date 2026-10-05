import React, { useRef } from 'react';
import { usePDFStore } from '../store/pdfStore';
import { 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Edit3, 
  Combine, 
  Scissors, 
  Lock,
  Zap
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
      <div className="w-full max-w-2xl space-y-6 text-center">
        {/* Main Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-[11px] font-mono text-blue-600 dark:text-blue-400">
            <Cpu className="w-3 h-3" /> Client-Side WebAssembly Engine • Zero Server Latency
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            In-Place PDF Text Editor & Studio
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Click existing text directly inside your PDF to edit it. Extract, redact, sign, merge, and split with complete vector stream preservation.
          </p>
        </div>

        {/* Drop Zone Box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white/80 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-900/90 rounded-2xl p-8 sm:p-10 cursor-pointer transition-all duration-200 shadow-lg dark:shadow-xl group relative overflow-hidden"
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

        {/* Quick Tool Launchers */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-left">
          <div 
            onClick={() => setActiveModal('merge')}
            className="p-3.5 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <Combine className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Merge PDFs
            </div>
            <p className="text-[11px] text-zinc-500 leading-tight">
              Combine multiple files into one PDF document.
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('split')}
            className="p-3.5 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Split & Extract
            </div>
            <p className="text-[11px] text-zinc-500 leading-tight">
              Select and export individual pages or ranges.
            </p>
          </div>

          <div 
            onClick={() => setActiveModal('organize')}
            className="p-3.5 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Reorder Pages
            </div>
            <p className="text-[11px] text-zinc-500 leading-tight">
              Rotate, organize, and delete pages visually.
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
