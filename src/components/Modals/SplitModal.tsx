import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { splitAndExtractPDF } from '../../core/pdfEngine';
import { PageThumbnail } from '../PageThumbnail';
import { PagePreviewLightbox } from '../PagePreviewLightbox';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';
import { X, Scissors, Check, Download, Eye } from 'lucide-react';

export const SplitModal: React.FC = () => {
  const { activeModal, setActiveModal, documentBytes, pdfDocProxy, pageDimensions, fileName } = usePDFStore();
  const [selectedPages, setSelectedPages] = useState<number[]>(
    pageDimensions.map(p => p.pageNumber)
  );
  const [rangeInput, setRangeInput] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);
  const [previewPageNumber, setPreviewPageNumber] = useState<number | null>(null);

  // Sync selected pages when pageDimensions change
  React.useEffect(() => {
    setSelectedPages(pageDimensions.map(p => p.pageNumber));
  }, [pageDimensions]);

  if (activeModal !== 'split') return null;

  const togglePage = (pageNum: number) => {
    if (selectedPages.includes(pageNum)) {
      setSelectedPages(selectedPages.filter(p => p !== pageNum));
    } else {
      setSelectedPages([...selectedPages, pageNum].sort((a, b) => a - b));
    }
  };

  const parseRangeInput = (input: string) => {
    try {
      const parts = input.split(',').map(s => s.trim());
      const pages = new Set<number>();
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= pageDimensions.length) pages.add(i);
            }
          }
        } else {
          const num = Number(part);
          if (!isNaN(num) && num >= 1 && num <= pageDimensions.length) {
            pages.add(num);
          }
        }
      }
      if (pages.size > 0) {
        setSelectedPages(Array.from(pages).sort((a, b) => a - b));
      }
    } catch {
      // ignore invalid input
    }
  };

  const handleSplitExport = async () => {
    if (!documentBytes || selectedPages.length === 0) return;
    setIsSplitting(true);
    try {
      // 0-based page indices
      const pageIndices = selectedPages.map(p => p - 1);
      const splitBytes = await splitAndExtractPDF(documentBytes, pageIndices);
      const blob = new Blob([splitBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = fileName.replace(/\.pdf$/i, '');
      link.href = url;
      link.download = `${baseName}-extracted-pages.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsSplitting(false);
      setActiveModal(null);
    } catch (err) {
      console.error('Split failed:', err);
      alert('Failed to split document.');
      setIsSplitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-colors">
          {/* Modal Header */}
          <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Split & Extract Pages
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Select specific pages or type page ranges to extract into a new PDF
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

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-zinc-50/40 dark:bg-zinc-950/40">
            {!documentBytes ? (
              <ModalDocumentDropzone
                title="Select a PDF to split and extract pages"
                subtitle="Upload any document to choose custom page ranges, extract single sheets, or separate sections."
              />
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Page Range Expression (e.g. 1-3, 5)
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. 1-${pageDimensions.length}`}
                    value={rangeInput}
                    onChange={(e) => {
                      setRangeInput(e.target.value);
                      parseRangeInput(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                      Select Pages ({selectedPages.length} of {pageDimensions.length})
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setSelectedPages(pageDimensions.map(p => p.pageNumber))}
                        className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-400">•</span>
                      <button
                        onClick={() => setSelectedPages([])}
                        className="text-zinc-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1">
                    {pageDimensions.map((page) => {
                      const isSelected = selectedPages.includes(page.pageNumber);
                      return (
                        <div
                          key={page.pageNumber}
                          onClick={() => togglePage(page.pageNumber)}
                          className={`relative p-2 rounded-xl border text-center cursor-pointer transition-all group ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 ring-2 ring-blue-500 shadow-sm'
                              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="relative w-full overflow-hidden rounded-lg mb-1.5 bg-zinc-50 dark:bg-zinc-950/80">
                            <PageThumbnail
                              pdfDoc={pdfDocProxy}
                              pageNumber={page.pageNumber}
                            />

                            {/* Quick preview hover button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewPageNumber(page.pageNumber);
                              }}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              title="Quick Preview"
                            >
                              <span className="px-2 py-0.5 bg-zinc-900/90 rounded text-[10px] font-medium flex items-center gap-1">
                                <Eye className="w-3 h-3 text-blue-400" />
                                <span>Preview</span>
                              </span>
                            </button>
                          </div>

                          <span className="text-[11px] font-bold block text-zinc-800 dark:text-zinc-200">
                            Page {page.pageNumber}
                          </span>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="h-14 px-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/80 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              {selectedPages.length} page{selectedPages.length === 1 ? '' : 's'} selected for extraction
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSplitExport}
                disabled={selectedPages.length === 0 || isSplitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-40"
              >
                {isSplitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Extract & Download</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Page Preview Lightbox */}
      {previewPageNumber !== null && (
        <PagePreviewLightbox
          pdfDoc={pdfDocProxy}
          initialPageNumber={previewPageNumber}
          totalPages={pageDimensions.length}
          pageDimensions={pageDimensions}
          onClose={() => setPreviewPageNumber(null)}
        />
      )}
    </>
  );
};
