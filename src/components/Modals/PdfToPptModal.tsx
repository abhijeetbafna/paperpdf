import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { convertPdfToPptx } from '../../core/pptEngine';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';
import { 
  X, 
  Presentation, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  Layers
} from 'lucide-react';

export const PdfToPptModal: React.FC = () => {
  const { activeModal, setActiveModal, documentBytes, fileName } = usePDFStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBytes, setSelectedBytes] = useState<Uint8Array | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Initialize with active document if available
  React.useEffect(() => {
    if (activeModal === 'pdfToPpt') {
      setIsFinished(false);
      setProgress(0);
      if (documentBytes) {
        setSelectedBytes(documentBytes);
      }
    }
  }, [activeModal, documentBytes]);

  if (activeModal !== 'pdfToPpt') return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          setSelectedBytes(new Uint8Array(event.target.result));
          setIsFinished(false);
          setProgress(0);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleConvert = async () => {
    if (!selectedBytes && !documentBytes) return;
    const targetBytes = selectedBytes || documentBytes;
    if (!targetBytes) return;

    setIsConverting(true);
    setProgress(0);
    setIsFinished(false);

    try {
      const baseName = selectedFile ? selectedFile.name : (fileName || 'presentation.pdf');
      const outputName = `${baseName.replace(/\.[^/.]+$/, '')}_slides.pptx`;

      await convertPdfToPptx(targetBytes, outputName, {
        scale: 2.0,
        includeEditableText: true,
        onProgress: (pct, cur, tot) => {
          setProgress(pct);
          setCurrentSlide(cur);
          setTotalSlides(tot);
        }
      });

      setIsFinished(true);
    } catch (err) {
      console.error('Failed to convert PDF to PPT:', err);
      alert('Error converting PDF to PowerPoint. Please try another PDF.');
    } finally {
      setIsConverting(false);
    }
  };

  const activeDocName = selectedFile ? selectedFile.name : (fileName || 'Active Document.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto select-none">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>PDF to PowerPoint (.pptx)</span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                  16:9 Slides
                </span>
              </h2>
              <p className="text-xs text-zinc-500">Convert document pages into crisp PowerPoint presentation slides.</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!documentBytes && !selectedBytes ? (
            <ModalDocumentDropzone
              title="Select a PDF to convert to PowerPoint (.pptx)"
              subtitle="Upload any PDF to render vector slides with high-DPI graphics and editable text notes."
              onFileLoaded={(file, bytes) => {
                setSelectedFile(file);
                setSelectedBytes(bytes);
              }}
            />
          ) : (
            <>
              {/* File Picker / Active Document Card */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-500">Selected Document:</span>
                  <label className="cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Upload different file
                    <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <FileText className="w-6 h-6 text-orange-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={activeDocName}>
                      {activeDocName}
                    </div>
                    <div className="text-[10px] text-zinc-500">Ready for PowerPoint slide conversion</div>
                  </div>
                </div>
              </div>

              {/* Features Highlights */}
              <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/40 flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">High-DPI Visuals</div>
                <div className="text-[10px] text-zinc-500">Crystal-clear vector & image rendering on 16:9 slides</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">Speaker Notes</div>
                <div className="text-[10px] text-zinc-500">Embeds extracted text into slide notes for search</div>
              </div>
            </div>
          </div>

          {/* Progress Bar during conversion */}
          {isConverting && (
            <div className="space-y-2 p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-200 dark:border-orange-900">
              <div className="flex justify-between text-xs font-semibold text-orange-800 dark:text-orange-300">
                <span>Rendering Slide {currentSlide} of {totalSlides}...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-orange-200 dark:bg-orange-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {isFinished && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>PowerPoint presentation created and downloaded successfully!</span>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-medium">100% Client-Side In-Browser Conversion</span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleConvert}
              disabled={isConverting || (!selectedBytes && !documentBytes)}
              className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {isConverting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <Presentation className="w-4 h-4" />
                  <span>Convert to .pptx</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
