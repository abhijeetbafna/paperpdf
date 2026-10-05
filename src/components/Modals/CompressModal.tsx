import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { compressPDFDocument } from '../../core/pdfEngine';
import { X, Zap, Download, CheckCircle2, FileCheck, ArrowRight } from 'lucide-react';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';

export const CompressModal: React.FC = () => {
  const { setActiveModal, documentBytes, fileName, loadDocument } = usePDFStore();
  const [level, setLevel] = useState<'low' | 'medium' | 'extreme'>('medium');
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<{
    compressedBytes: Uint8Array;
    originalSize: number;
    newSize: number;
    savedPercentage: number;
  } | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCompress = async () => {
    if (!documentBytes) return;
    setIsCompressing(true);
    try {
      // Simulate minor delay for UI polish
      await new Promise(r => setTimeout(r, 400));
      const res = await compressPDFDocument(documentBytes, { level });
      setResult(res);
      setIsCompressing(false);
    } catch (err) {
      console.error('Compression failed:', err);
      alert('Failed to compress PDF.');
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.compressedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = fileName.replace(/\.pdf$/i, '');
    link.href = url;
    link.download = `${baseName}-compressed.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setActiveModal(null);
  };

  const handleLoadIntoWorkspace = async () => {
    if (!result) return;
    const baseName = fileName.replace(/\.pdf$/i, '');
    await loadDocument(result.compressedBytes, `${baseName}-compressed.pdf`);
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Compress PDF Document
              </h2>
              <p className="text-[11px] text-zinc-500">
                100% Client-Side stream optimization and object reduction
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!documentBytes ? (
            <div className="py-2">
              <ModalDocumentDropzone
                title="Upload PDF to Compress"
                subtitle="Reduce PDF file size locally with lossless and extreme compression presets"
              />
            </div>
          ) : !result ? (
            <>
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Select Compression Preset
              </div>

              <div className="space-y-2.5">
                {/* Recommended / Medium */}
                <div
                  onClick={() => setLevel('medium')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    level === 'medium'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Recommended (Balanced)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full">
                        Popular
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      ~30% to 50% smaller
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Compresses object streams while preserving high-resolution text and imagery.
                  </p>
                </div>

                {/* Extreme Compression */}
                <div
                  onClick={() => setLevel('extreme')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    level === 'extreme'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Extreme Compression
                    </span>
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Max Reduction
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Strips unused fonts, redundant metadata, and compacts xref tables.
                  </p>
                </div>

                {/* Low Compression */}
                <div
                  onClick={() => setLevel('low')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    level === 'low'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Low Compression (Print Quality)
                    </span>
                    <span className="text-xs font-mono text-zinc-400 font-semibold">
                      ~10% smaller
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Retains full commercial print quality with light byte optimization.
                  </p>
                </div>
              </div>

              {/* Current File Size Badge */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Current File Size</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {formatBytes(documentBytes?.byteLength || 0)}
                </span>
              </div>
            </>
          ) : (
            /* Results Screen */
            <div className="space-y-4 py-2 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  PDF Compressed Successfully!
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Optimized 100% locally with zero data leakage
                </p>
              </div>

              {/* Comparison Box */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-around">
                <div className="flex flex-col">
                  <span className="text-[11px] text-zinc-400">Original</span>
                  <span className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300 line-through">
                    {formatBytes(result.originalSize)}
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-zinc-400" />

                <div className="flex flex-col">
                  <span className="text-[11px] text-zinc-400">Compressed</span>
                  <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBytes(result.newSize)}
                  </span>
                </div>

                <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold">
                  -{result.savedPercentage}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/80 flex items-center justify-between">
          <button
            onClick={() => setActiveModal(null)}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>

          {!result ? (
            <button
              onClick={handleCompress}
              disabled={isCompressing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isCompressing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Compressing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Compress Now</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadIntoWorkspace}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors"
                title="Edit the compressed PDF in Lexis"
              >
                <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Open in Editor</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
