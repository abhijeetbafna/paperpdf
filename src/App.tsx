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
import { PdfToImagesModal } from './components/Modals/PdfToImagesModal';
import { ImagesToPdfModal } from './components/Modals/ImagesToPdfModal';
import { ProtectModal } from './components/Modals/ProtectModal';
import { WordConverterModal } from './components/Modals/WordConverterModal';
import { OcrModal } from './components/Modals/OcrModal';
import { FormResponsesModal } from './components/Modals/FormResponsesModal';
import { PdfDiffModal } from './components/Modals/PdfDiffModal';
import { TableExtractorModal } from './components/Modals/TableExtractorModal';
import { PdfToPptModal } from './components/Modals/PdfToPptModal';
import { BarcodeModal } from './components/Modals/BarcodeModal';
import { BatchProcessingModal } from './components/Modals/BatchProcessingModal';
import { TtsReaderModal } from './components/Modals/TtsReaderModal';

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
      {activeModal === 'pdfToImages' && <PdfToImagesModal />}
      {activeModal === 'imagesToPdf' && <ImagesToPdfModal />}
      {activeModal === 'protect' && <ProtectModal />}
      {activeModal === 'wordConverter' && <WordConverterModal />}
      {activeModal === 'ocr' && <OcrModal />}
      {activeModal === 'formResponses' && <FormResponsesModal />}
      {activeModal === 'pdfDiff' && <PdfDiffModal />}
      {activeModal === 'tableExtractor' && <TableExtractorModal />}
      {activeModal === 'pdfToPpt' && <PdfToPptModal />}
      {activeModal === 'barcodeGenerator' && <BarcodeModal />}
      {activeModal === 'batchStudio' && <BatchProcessingModal />}
      {activeModal === 'ttsReader' && <TtsReaderModal />}

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
