import React, { useEffect, useRef } from 'react';
import { usePDFStore } from '../store/pdfStore';
import { PageView } from './PageView';
export const Workspace: React.FC = () => {
  const { 
    pageDimensions, 
    deletedPages, 
    selectedTextItemId, 
    selectedAnnotationId,
    currentPage,
    setCurrentPage,
    setActiveTool,
    undo,
    redo,
    deleteTextItem,
    deleteAnnotation,
    exportPDF
  } = usePDFStore();

  const mainContainerRef = useRef<HTMLElement>(null);
  const isScrollingProgrammatically = useRef(false);

  const activePages = pageDimensions.filter(p => !deletedPages.includes(p.pageNumber - 1));

  // 1. Two-way synchronization: Scroll canvas when currentPage changes (e.g. from sidebar click)
  useEffect(() => {
    if (!currentPage || isScrollingProgrammatically.current) return;
    const targetPage = document.getElementById(`pdf-page-${currentPage}`);
    if (targetPage && mainContainerRef.current) {
      isScrollingProgrammatically.current = true;
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const timer = setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // 2. Two-way synchronization: Update currentPage as user scrolls through pages in the workspace
  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return;
      const containerRect = container.getBoundingClientRect();
      const containerTargetY = containerRect.top + 140;

      let closestPage = currentPage;
      let minDistance = Infinity;

      for (const page of activePages) {
        const el = document.getElementById(`pdf-page-${page.pageNumber}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - containerTargetY);
          if (distance < minDistance) {
            minDistance = distance;
            closestPage = page.pageNumber;
          }
        }
      }

      if (closestPage !== currentPage) {
        setCurrentPage(closestPage);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activePages, currentPage, setCurrentPage]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing in an input or textarea, don't trigger global shortcuts
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        exportPDF();
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('edit-text');
      } else if (e.key.toLowerCase() === 't') {
        setActiveTool('add-text');
      } else if (e.key.toLowerCase() === 'w') {
        setActiveTool('whiteout');
      } else if (e.key.toLowerCase() === 'r') {
        setActiveTool('redact');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('highlight');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTextItemId) {
          e.preventDefault();
          deleteTextItem(selectedTextItemId);
        } else if (selectedAnnotationId) {
          e.preventDefault();
          deleteAnnotation(selectedAnnotationId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTextItemId, selectedAnnotationId, undo, redo, exportPDF, setActiveTool, deleteTextItem, deleteAnnotation]);

  return (
    <main 
      ref={mainContainerRef}
      className="flex-1 bg-zinc-100 dark:bg-zinc-950 bg-grid-pattern-light dark:bg-grid-pattern overflow-y-auto overflow-x-auto relative flex flex-col items-center py-6 px-4 transition-colors"
    >
      {/* Pages Container */}
      <div className="flex flex-col items-center w-full max-w-full">
        {activePages.map((page) => (
          <PageView key={page.pageNumber} pageNumber={page.pageNumber} />
        ))}
      </div>
    </main>
  );
};
