import React, { useState } from 'react';
import { usePDFStore } from './store/pdfStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { EmptyState } from './components/EmptyState';
import { MergeModal } from './components/Modals/MergeModal';
import { SplitModal } from './components/Modals/SplitModal';
import { OrganizeModal } from './components/Modals/OrganizeModal';
import { SignatureModal } from './components/Modals/SignatureModal';
import { CompressModal } from './components/Modals/CompressModal';
import { PageNumbersModal } from './components/Modals/PageNumbersModal';

export const App: React.FC = () => {
  const { documentBytes, activeModal, isLoading, loadingMessage } = usePDFStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased font-sans select-none transition-colors">
      {/* Top Application Header */}
      <Header />

      {/* Main Workspace Area */}
      <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {documentBytes ? (
          <>
            <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
            <Workspace />
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Modals */}
      {activeModal === 'merge' && <MergeModal />}
      {activeModal === 'split' && <SplitModal />}
      {activeModal === 'organize' && <OrganizeModal />}
      {activeModal === 'signature' && <SignatureModal />}
      {activeModal === 'compress' && <CompressModal />}
      {activeModal === 'pageNumbers' && <PageNumbersModal />}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs font-medium text-zinc-200 animate-pulse">
            {loadingMessage || 'Processing document...'}
          </span>
        </div>
      )}
    </div>
  );
};

export default App;
