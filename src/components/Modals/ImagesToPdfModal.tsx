import React, { useState, useRef } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { convertImagesToPdf, type ImageToPdfItem, type ImageToPdfOptions } from '../../core/converterEngine';
import { 
  X, 
  UploadCloud, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  FileText, 
  Sparkles, 
  Loader2, 
  Check, 
  Sliders 
} from 'lucide-react';

export const ImagesToPdfModal: React.FC = () => {
  const { activeModal, setActiveModal, loadDocument } = usePDFStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageToPdfItem[]>([]);
  const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [margin, setMargin] = useState<number>(15); // pt
  const [isConverting, setIsConverting] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  if (activeModal !== 'imagesToPdf') return null;

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: Promise<ImageToPdfItem>[] = Array.from(files).map((file) => {
      return new Promise<ImageToPdfItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const img = new Image();
          img.onload = () => {
            resolve({
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              file,
              dataUrl,
              name: file.name,
              width: img.naturalWidth || 800,
              height: img.naturalHeight || 600,
              size: file.size,
            });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newItems).then((loaded) => {
      setImages((prev) => [...prev, ...loaded]);
    });
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const copy = [...images];
    const item = copy.splice(index, 1)[0];
    copy.splice(targetIndex, 0, item);
    setImages(copy);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleGeneratePdf = async (action: 'open' | 'download') => {
    if (images.length === 0) return;
    setIsConverting(true);
    setSuccessStatus(null);

    try {
      const options: ImageToPdfOptions = {
        pageSize,
        orientation,
        margin,
      };

      const pdfBytes = await convertImagesToPdf(images, options);
      const outputFilename = `combined_images_${Date.now()}.pdf`;

      if (action === 'download') {
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = outputFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessStatus('PDF downloaded successfully!');
      } else {
        // Load into PaperPDF workspace
        await loadDocument(pdfBytes, outputFilename);
        setActiveModal(null);
      }
    } catch (err) {
      console.error('Image to PDF generation failed:', err);
      setSuccessStatus('Generation failed. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Convert Images to PDF</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Combine JPG, PNG, WebP, SVG images into a unified PDF
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
          {/* File Upload / Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesAdded(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
          >
            <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-emerald-500 transition-colors mb-2" />
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Click or drag & drop images here
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Supports PNG, JPG, WebP, SVG, GIF (Multi-selection enabled)
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFilesAdded(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Sizing & Layout Controls */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <Sliders className="w-3.5 h-3.5" />
              <span>Layout & Sizing Configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Page Size */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Page Dimensions
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="a4">Standard A4 (595 × 842 pt)</option>
                  <option value="letter">US Letter (612 × 792 pt)</option>
                  <option value="legal">US Legal (612 × 1008 pt)</option>
                  <option value="fit">Auto-Fit (Match Image Size)</option>
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  disabled={pageSize === 'fit'}
                  className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                >
                  <option value="auto">Auto (Match Image Ratio)</option>
                  <option value="portrait">Force Portrait</option>
                  <option value="landscape">Force Landscape</option>
                </select>
              </div>

              {/* Margin */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Page Margins
                </label>
                <div className="flex gap-1">
                  {[
                    { val: 0, label: '0 mm' },
                    { val: 15, label: '5 mm' },
                    { val: 30, label: '10 mm' },
                  ].map((m) => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setMargin(m.val)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                        margin === m.val
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 font-bold'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Image List & Order */}
          {images.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Page Sequence ({images.length} pages)
                </span>
                <button
                  type="button"
                  onClick={() => setImages([])}
                  className="text-xs text-red-500 hover:text-red-600 font-semibold"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-2 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[10px] font-bold">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="p-1.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[80px] font-medium text-zinc-700 dark:text-zinc-300" title={img.name}>
                        {img.name}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveImage(idx, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 text-zinc-600 dark:text-zinc-400"
                          title="Move earlier"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(idx, 'down')}
                          disabled={idx === images.length - 1}
                          className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 text-zinc-600 dark:text-zinc-400"
                          title="Move later"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500"
                          title="Remove image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {successStatus && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successStatus}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {images.length} image{images.length === 1 ? '' : 's'} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleGeneratePdf('download')}
              disabled={images.length === 0 || isConverting}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
            >
              <span>Direct Download</span>
            </button>
            <button
              type="button"
              onClick={() => handleGeneratePdf('open')}
              disabled={images.length === 0 || isConverting}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-40"
            >
              {isConverting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Convert & Open in Editor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
