import React, { useState, useRef } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import type { 
  BatchItem, 
  BatchOperationType 
} from '../../core/batchEngine';
import { 
  processBatchPdf, 
  downloadBatchZip 
} from '../../core/batchEngine';
import { 
  X, 
  Layers, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RotateCw, 
  Hash, 
  Droplet, 
  FileCheck,
  Archive
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export const BatchProcessingModal: React.FC = () => {
  const { activeModal, setActiveModal } = usePDFStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<BatchItem[]>([]);
  const [operation, setOperation] = useState<BatchOperationType>('watermark');
  
  // Operation configs
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkColor, setWatermarkColor] = useState('#ef4444');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [pageNumberFormat, setPageNumberFormat] = useState<'Page {n} of {total}' | 'Page {n}' | '{n} / {total}'>('Page {n} of {total}');
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right'>('bottom-center');
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (activeModal !== 'batchStudio') return null;

  const handleFilesAdded = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: BatchItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let pageCount = 0;
        try {
          const doc = await PDFDocument.load(bytes);
          pageCount = doc.getPageCount();
        } catch {
          pageCount = 1;
        }

        newItems.push({
          id: `${file.name}-${Date.now()}-${i}`,
          name: file.name,
          file,
          bytes,
          pageCount,
          status: 'pending'
        });
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsDone(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
    setIsDone(false);
  };

  const handleRunBatch = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setIsDone(false);

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'processing' };
      setItems([...updated]);

      try {
        const processed = await processBatchPdf(updated[i].bytes, {
          operation,
          watermarkText,
          watermarkColor,
          watermarkOpacity,
          pageNumberFormat,
          pageNumberPosition,
          rotationAngle
        });

        updated[i] = {
          ...updated[i],
          status: 'done',
          processedBytes: processed
        };
      } catch (err: any) {
        updated[i] = {
          ...updated[i],
          status: 'error',
          error: err?.message || 'Processing failed'
        };
      }

      setItems([...updated]);
    }

    setIsProcessing(false);
    setIsDone(true);
  };

  const handleDownloadSingle = (item: BatchItem) => {
    if (!item.processedBytes) return;
    const blob = new Blob([item.processedBytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name.replace(/\.pdf$/i, '_processed.pdf');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    await downloadBatchZip(items, `PaperPDF_${operation}_batch.zip`);
  };

  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Multi-File Batch Surgery Studio</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Batch watermark, paginate, rotate, and flatten multiple PDFs simultaneously</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Operations & Configurations */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Operation Selector */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">Select Batch Action</label>
              <div className="space-y-1.5">
                {[
                  { id: 'watermark', label: 'Bulk Watermark', desc: 'Stamp diagonal text across all pages', icon: Droplet },
                  { id: 'pageNumbers', label: 'Bulk Page Numbers', desc: 'Add clean footer or header numbering', icon: Hash },
                  { id: 'rotate', label: 'Bulk Rotate Pages', desc: 'Rotate orientation for all files', icon: RotateCw },
                  { id: 'flatten', label: 'Bulk Flatten Form Fields', desc: 'Bake annotations & forms permanently', icon: FileCheck }
                ].map((op) => {
                  const Icon = op.icon;
                  return (
                    <div
                      key={op.id}
                      onClick={() => setOperation(op.id as BatchOperationType)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        operation === op.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        <Icon className={`w-4 h-4 ${operation === op.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`} />
                        {op.label}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 ml-6">{op.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sub Settings */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
              {operation === 'watermark' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-zinc-500 block mb-1">Color</label>
                      <input
                        type="color"
                        value={watermarkColor}
                        onChange={(e) => setWatermarkColor(e.target.value)}
                        className="w-full h-8 rounded-lg cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-500 block mb-1">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                        className="w-full mt-2"
                      />
                    </div>
                  </div>
                </>
              )}

              {operation === 'pageNumbers' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">Numbering Format</label>
                    <select
                      value={pageNumberFormat}
                      onChange={(e) => setPageNumberFormat(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    >
                      <option value="Page {n} of {total}">Page X of Y (Standard)</option>
                      <option value="Page {n}">Page X</option>
                      <option value="{n} / {total}">X / Y</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">Position</label>
                    <select
                      value={pageNumberPosition}
                      onChange={(e) => setPageNumberPosition(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    >
                      <option value="bottom-center">Bottom Center (Recommended)</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right Header</option>
                    </select>
                  </div>
                </>
              )}

              {operation === 'rotate' && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">Rotation Angle</label>
                  <select
                    value={rotationAngle}
                    onChange={(e) => setRotationAngle(Number(e.target.value) as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  >
                    <option value={90}>Rotate 90° Clockwise</option>
                    <option value={180}>Rotate 180° Flip</option>
                    <option value={270}>Rotate 270° (90° Counter-Clockwise)</option>
                  </select>
                </div>
              )}

              {operation === 'flatten' && (
                <p className="text-xs text-zinc-500">
                  Form fields and interactive widgets in all uploaded files will be permanently merged into vector page graphics.
                </p>
              )}
            </div>
          </div>

          {/* Files List & Execution */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            
            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-zinc-50/60 dark:bg-zinc-800/30 rounded-2xl p-6 text-center cursor-pointer transition-colors group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFilesAdded(e.target.files)}
                multiple
                accept=".pdf"
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Drop multiple PDF documents here, or <span className="text-emerald-600 dark:text-emerald-400 underline">browse files</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Process up to 50 files simultaneously in local memory (Zero upload limits)
                </div>
              </div>
            </div>

            {/* File Queue List */}
            <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden min-h-[200px]">
              <div className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Document Queue ({items.length} files)
                </span>
                {items.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear List
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[260px]">
                {items.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-400 py-8">
                    No files added to queue yet.
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.status === 'pending' && <div className="w-2 h-2 rounded-full bg-zinc-400" />}
                        {item.status === 'processing' && <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                        {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                        {item.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                        
                        <div className="truncate">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.name}</div>
                          <div className="text-[10px] text-zinc-400">{item.pageCount} pages • {(item.bytes.length / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.status === 'done' && (
                          <button
                            onClick={() => handleDownloadSingle(item)}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 rounded-lg transition-colors"
                            title="Download Processed PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!isProcessing && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-zinc-500">
                {doneCount > 0 && `${doneCount} of ${items.length} documents completed.`}
              </div>

              <div className="flex items-center gap-2">
                {isDone && doneCount > 0 && (
                  <button
                    onClick={handleDownloadZip}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all animate-bounce"
                  >
                    <Archive className="w-4 h-4" /> Download All as ZIP
                  </button>
                )}

                <button
                  onClick={handleRunBatch}
                  disabled={items.length === 0 || isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-50 text-xs font-semibold shadow-md transition-all"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing Queue...
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" /> Execute Batch {operation}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
