import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { mergeMultiplePDFs } from '../../core/pdfEngine';
import { X, Upload, FileText, ArrowUp, ArrowDown, Trash2, Combine } from 'lucide-react';

export const MergeModal: React.FC = () => {
  const { setActiveModal } = usePDFStore();
  const [files, setFiles] = useState<{ id: string; name: string; size: number; bytes: Uint8Array }[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    uploadedFiles.forEach(file => {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result instanceof ArrayBuffer) {
            setFiles(prev => [
              ...prev,
              {
                id: `file-${Date.now()}-${Math.random()}`,
                name: file.name,
                size: file.size,
                bytes: new Uint8Array(event.target!.result as ArrayBuffer),
              }
            ]);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= files.length) return;
    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIdx];
    newFiles[targetIdx] = temp;
    setFiles(newFiles);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleMergeAndDownload = async () => {
    if (files.length < 2) {
      alert('Please add at least 2 PDF files to merge.');
      return;
    }
    setIsMerging(true);
    try {
      const mergedBytes = await mergeMultiplePDFs(files.map(f => f.bytes));
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged-document-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsMerging(false);
      setActiveModal(null);
    } catch (err) {
      console.error('Merge failed:', err);
      alert('Failed to merge documents.');
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors">
        {/* Modal Header */}
        <div className="h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Combine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Merge PDF Documents</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* File Dropper */}
          <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-950 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group">
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-zinc-400 group-hover:text-blue-500 mb-2 transition-colors" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
              Click to select or drop multiple PDFs
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">
              100% processed in browser. No file size limits.
            </span>
          </label>

          {/* Files Queue */}
          {files.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Files Queue ({files.length})
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-mono text-[11px] text-zinc-600 dark:text-zinc-400 shrink-0">
                        {idx + 1}
                      </span>
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate max-w-[220px]">
                        {file.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveFile(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveFile(idx, 'down')}
                        disabled={idx === files.length - 1}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 rounded text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/80 ml-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {files.length} document{files.length === 1 ? '' : 's'} queued
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal(null)}
              className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleMergeAndDownload}
              disabled={files.length < 2 || isMerging}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
            >
              {isMerging ? (
                <span>Merging...</span>
              ) : (
                <>
                  <Combine className="w-3.5 h-3.5" />
                  <span>Merge & Download</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
