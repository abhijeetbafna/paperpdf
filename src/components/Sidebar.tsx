import React from 'react';
import { usePDFStore } from '../store/pdfStore';
import { PageThumbnail } from './PageThumbnail';
import { 
  RotateCw, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Layers
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { 
    pdfDocProxy,
    pageDimensions, 
    deletedPages, 
    currentPage, 
    setCurrentPage, 
    rotatePage, 
    deletePage, 
    pageRotations 
  } = usePDFStore();

  const activePages = pageDimensions.filter(p => !deletedPages.includes(p.pageNumber - 1));

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute left-3 top-16 z-20 p-2 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-md backdrop-blur transition-all"
        title="Open Page Thumbnails"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950 flex flex-col h-[calc(100vh-3.5rem)] select-none z-20 shrink-0 transition-colors">
      {/* Sidebar Header */}
      <div className="h-10 px-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white/80 dark:bg-zinc-900/50 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-[11px] font-mono tracking-wider">PAGES ({activePages.length})</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Thumbnails List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activePages.map((page) => {
          const pageIdx = page.pageNumber - 1;
          const isCurrent = currentPage === page.pageNumber;
          const rot = pageRotations[pageIdx] || 0;

          return (
            <div
              key={page.pageNumber}
              onClick={() => setCurrentPage(page.pageNumber)}
              className={`group relative p-1.5 rounded-lg border transition-all cursor-pointer ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/30'
                  : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/50'
              }`}
            >
              {/* Miniature PDF Render Container */}
              <div 
                className="w-full bg-white rounded overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"
              >
                <PageThumbnail
                  pdfDoc={pdfDocProxy}
                  pageNumber={page.pageNumber}
                  rotation={rot}
                />
              </div>

              {/* Page Number & Hover Actions */}
              <div className="mt-1.5 flex items-center justify-between px-0.5">
                <span className="text-[11px] font-mono font-medium text-zinc-600 dark:text-zinc-400">
                  Page {page.pageNumber}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      rotatePage(pageIdx, 90);
                    }}
                    className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activePages.length > 1) {
                        deletePage(pageIdx);
                      } else {
                        alert('Cannot delete the only page in the document.');
                      }
                    }}
                    className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/80 transition-colors"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
