import React, { useRef } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { Upload, FileText, Sparkles, RefreshCw } from 'lucide-react';

interface ModalDocumentDropzoneProps {
  title?: string;
  subtitle?: string;
  onDocumentLoaded?: (bytes: Uint8Array, name: string) => void;
  onFileLoaded?: (file: File, bytes: Uint8Array) => void;
  compact?: boolean;
}

export const ModalDocumentDropzone: React.FC<ModalDocumentDropzoneProps> = ({
  title = 'Upload PDF Document',
  subtitle = 'Drop your PDF here or browse files from your computer',
  onDocumentLoaded,
  onFileLoaded,
  compact = false
}) => {
  const { documentBytes, fileName, loadDocument, loadSampleDocument, isLoading, loadingMessage } = usePDFStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          const bytes = new Uint8Array(event.target.result);
          loadDocument(bytes, file.name);
          onDocumentLoaded?.(bytes, file.name);
          onFileLoaded?.(file, bytes);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // If already loaded in compact mode (e.g. Header bar inside a modal)
  if (documentBytes && compact) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            {fileName || 'Loaded Document'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors shrink-0"
        >
          <RefreshCw className="w-3 h-3 text-zinc-400" />
          <span>Change PDF</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleInputChange}
            accept=".pdf"
            className="hidden"
          />
        </button>
      </div>
    );
  }

  // Large Dropzone when no document is loaded
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white/80 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-900/90 rounded-2xl p-6 sm:p-8 cursor-pointer transition-all text-center group relative overflow-hidden shadow-sm"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
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
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shadow-sm">
            <Upload className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {title}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Try Sample Commercial Invoice (1-Click Test)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
