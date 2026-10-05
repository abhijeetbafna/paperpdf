import React, { useState, useRef } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { convertPdfToDocx, convertDocxToPdf, type PdfToDocxOptions, type DocxToPdfOptions } from '../../core/wordEngine';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';
import { 
  X, 
  FileText, 
  FileCode, 
  Download, 
  UploadCloud, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';

export const WordConverterModal: React.FC = () => {
  const { 
    activeModal, 
    setActiveModal, 
    pdfDocProxy, 
    fileName, 
    loadDocument 
  } = usePDFStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab: 'pdf-to-word' or 'word-to-pdf'
  const [tab, setTab] = useState<'pdf-to-word' | 'word-to-pdf'>('pdf-to-word');

  // PDF to Word options
  const [includeFormatting, setIncludeFormatting] = useState(true);
  const [preservePageBreaks, setPreservePageBreaks] = useState(true);

  // Word to PDF options
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [fontSize, setFontSize] = useState<number>(11);

  // Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (activeModal !== 'wordConverter') return null;

  const handlePdfToWord = async () => {
    if (!pdfDocProxy) {
      setErrorMessage('No PDF loaded to convert.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Extracting document typography, headings, and paragraphs...');
    setErrorMessage(null);

    try {
      const options: PdfToDocxOptions = {
        includeFormatting,
        pageBreaks: preservePageBreaks,
      };

      const docxBlob = await convertPdfToDocx(pdfDocProxy, options);
      const outputName = fileName 
        ? fileName.replace(/\.pdf$/i, '.docx') 
        : 'converted_document.docx';

      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage('Word document (.docx) generated and downloaded successfully!');
    } catch (err: any) {
      console.error('PDF to Word conversion failed:', err);
      setErrorMessage(err?.message || 'Failed to convert PDF to Word.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocxFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.docx') || file.type.includes('wordprocessingml'))) {
      setDocxFile(file);
      setErrorMessage(null);
    } else if (file) {
      setErrorMessage('Please select a valid Microsoft Word (.docx) file.');
    }
  };

  const handleWordToPdf = async (action: 'open' | 'download') => {
    if (!docxFile) {
      setErrorMessage('Please upload a Word (.docx) document first.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Parsing Word document layout & building vector PDF...');
    setErrorMessage(null);

    try {
      const options: DocxToPdfOptions = {
        pageSize,
        margin: 54, // 0.75 in
        fontSize,
      };

      const pdfBytes = await convertDocxToPdf(docxFile, options);
      const outputName = docxFile.name.replace(/\.docx$/i, '.pdf');

      if (action === 'download') {
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = outputName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setStatusMessage('PDF generated and downloaded successfully!');
      } else {
        await loadDocument(pdfBytes, outputName);
        setActiveModal(null);
      }
    } catch (err: any) {
      console.error('Word to PDF conversion failed:', err);
      setErrorMessage(err?.message || 'Failed to convert Word file to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Word (.docx) Converter Studio</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Seamless two-way PDF $\leftrightarrow$ Microsoft Word document conversion
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

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 bg-zinc-50/30 dark:bg-zinc-900/30">
          <button
            type="button"
            onClick={() => { setTab('pdf-to-word'); setErrorMessage(null); setStatusMessage(null); }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              tab === 'pdf-to-word'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF to Word (.docx)</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('word-to-pdf'); setErrorMessage(null); setStatusMessage(null); }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              tab === 'word-to-pdf'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Word (.docx) to PDF</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {tab === 'pdf-to-word' && (
            <div className="space-y-4 animate-fade-in">
              {!pdfDocProxy ? (
                <ModalDocumentDropzone
                  title="Select a PDF to convert to Microsoft Word (.docx)"
                  subtitle="Upload any PDF to extract styled paragraphs, headings, and formatting directly into an editable Word document."
                />
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1 text-xs text-blue-900 dark:text-blue-200">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Smart Layout & Heading Recognition</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
                      Extracts document lines into structured Word paragraphs, titles, headings, and bold/italic runs formatted for Microsoft Word and Google Docs.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Export Preferences
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={includeFormatting}
                        onChange={(e) => setIncludeFormatting(e.target.checked)}
                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Preserve typography, bold/italic weights, and font sizing</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={preservePageBreaks}
                        onChange={(e) => setPreservePageBreaks(e.target.checked)}
                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Insert page breaks matching original PDF page boundaries</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'word-to-pdf' && (
            <div className="space-y-4 animate-fade-in">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
              >
                <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-blue-500 transition-colors mb-2" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {docxFile ? docxFile.name : 'Select or drop a Microsoft Word (.docx) file'}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  100% processed locally in-memory
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleDocxFileSelected}
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />
              </div>

              {/* Layout Config */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Target Page Size
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as any)}
                    className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="a4">Standard A4</option>
                    <option value="letter">US Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Body Font Size
                  </label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10 pt (Compact)</option>
                    <option value="11">11 pt (Standard)</option>
                    <option value="12">12 pt (Large)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Native .docx & PDF Engine
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>

            {tab === 'pdf-to-word' && (
              <button
                type="button"
                onClick={handlePdfToWord}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-40"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Convert & Download .docx</span>
              </button>
            )}

            {tab === 'word-to-pdf' && (
              <>
                <button
                  type="button"
                  onClick={() => handleWordToPdf('download')}
                  disabled={isProcessing || !docxFile}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                >
                  <span>Direct Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleWordToPdf('open')}
                  disabled={isProcessing || !docxFile}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-40"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Convert & Open in Editor</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
