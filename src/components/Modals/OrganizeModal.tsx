import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { PageThumbnail } from '../PageThumbnail';
import { PagePreviewLightbox } from '../PagePreviewLightbox';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';
import { X, RotateCw, Trash2, LayoutGrid, Check, ExternalLink, Eye } from 'lucide-react';

export const OrganizeModal: React.FC = () => {
  const { 
    activeModal,
    setActiveModal, 
    documentBytes,
    pdfDocProxy,
    pageDimensions, 
    deletedPages, 
    pageRotations, 
    rotatePage, 
    deletePage,
    setCurrentPage 
  } = usePDFStore();

  const [previewPageNumber, setPreviewPageNumber] = useState<number | null>(null);

  if (activeModal !== 'organize') return null;

  const activePages = pageDimensions.filter(p => !deletedPages.includes(p.pageNumber - 1));

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-colors">
          {/* Modal Header */}
          <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Organize Document Pages
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Click any thumbnail to Quick Preview, or rotate and delete pages
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

          {/* Modal Body: Scrollable Grid with Real PDF Page Previews */}
          <div className="p-6 overflow-y-auto flex-1 bg-zinc-100/40 dark:bg-zinc-950/40">
            {!documentBytes || activePages.length === 0 ? (
              <ModalDocumentDropzone
                title="Select a PDF to organize and rotate pages"
                subtitle="Upload any document to reorder, delete, and manage its visual page structure."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {activePages.map((page) => {
                  const pageIdx = page.pageNumber - 1;
                  const rot = pageRotations[pageIdx] || 0;

                return (
                  <div
                    key={page.pageNumber}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col items-center group relative hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    {/* Rendered PDF Page Thumbnail with Quick Preview Hover Overlay */}
                    <div 
                      onClick={() => setPreviewPageNumber(page.pageNumber)}
                      className="relative w-full flex items-center justify-center p-1 bg-zinc-50 dark:bg-zinc-950/80 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-hidden cursor-pointer group/thumb"
                      title="Click to Quick Preview page"
                    >
                      <PageThumbnail
                        pdfDoc={pdfDocProxy}
                        pageNumber={page.pageNumber}
                        rotation={rot}
                      />

                      {/* Hover Quick Preview Action Pill */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-white rounded-lg text-[11px] font-bold shadow-lg transform translate-y-1 group-hover/thumb:translate-y-0 transition-transform">
                          <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Quick Preview</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Controls */}
                    <div className="mt-3 w-full flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Page {page.pageNumber}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {Math.round(page.width)}×{Math.round(page.height)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Quick Preview Icon Button */}
                        <button
                          onClick={() => setPreviewPageNumber(page.pageNumber)}
                          className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 transition-colors"
                          title="Quick Preview this page"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Jump to Page in Workspace */}
                        <button
                          onClick={() => {
                            setCurrentPage(page.pageNumber);
                            setActiveModal(null);
                          }}
                          className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 transition-colors"
                          title="Jump to this page in Editor"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Rotate 90° */}
                        <button
                          onClick={() => rotatePage(pageIdx, 90)}
                          className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                          title="Rotate 90° Clockwise"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Page */}
                        <button
                          onClick={() => {
                            if (activePages.length > 1) {
                              deletePage(pageIdx);
                            } else {
                              alert('Cannot delete the only remaining page in the document.');
                            }
                          }}
                          className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/80 dark:hover:text-red-400 transition-colors"
                          title="Delete Page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="h-14 px-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/80 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              {activePages.length} active page{activePages.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => setActiveModal(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done Organizing</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-Resolution Quick Page Preview Lightbox */}
      {previewPageNumber !== null && (
        <PagePreviewLightbox
          pdfDoc={pdfDocProxy}
          initialPageNumber={previewPageNumber}
          totalPages={pageDimensions.length}
          pageDimensions={pageDimensions}
          pageRotations={pageRotations}
          onRotate={rotatePage}
          onClose={() => setPreviewPageNumber(null)}
        />
      )}
    </>
  );
};
