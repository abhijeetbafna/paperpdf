import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { applyPageNumbers } from '../../core/pdfEngine';
import { X, Hash, Check } from 'lucide-react';

export const PageNumbersModal: React.FC = () => {
  const { setActiveModal, documentBytes, fileName, loadDocument } = usePDFStore();

  // Page Numbers State
  const [pageNumberFormat, setPageNumberFormat] = useState<'Page {n} of {total}' | '{n} / {total}' | '{n}'>('Page {n} of {total}');
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right' | 'bottom-left'>('bottom-center');
  const [pageNumberFontSize, setPageNumberFontSize] = useState(10);
  const [pageNumberColor, setPageNumberColor] = useState('#4b5563');

  const [isProcessing, setIsProcessing] = useState(false);

  const handleApply = async () => {
    if (!documentBytes) return;
    setIsProcessing(true);
    try {
      const updatedBytes = await applyPageNumbers(
        documentBytes,
        {
          enabled: true,
          format: pageNumberFormat,
          position: pageNumberPosition,
          fontSize: pageNumberFontSize,
          color: pageNumberColor,
        }
      );

      await loadDocument(updatedBytes, fileName);
      setIsProcessing(false);
      setActiveModal(null);
    } catch (err) {
      console.error('Failed to apply page numbers:', err);
      alert('Error applying page numbering to document.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Page Numbers & Headers
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono truncate max-w-[280px]">
                {fileName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-zinc-50/40 dark:bg-zinc-950/40">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Pagination Configuration
              </span>
            </div>

            <div className="space-y-4 pt-1">
              {/* Position */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Page Number Position
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bottom-center', label: 'Bottom Center' },
                    { id: 'bottom-right', label: 'Bottom Right' },
                    { id: 'bottom-left', label: 'Bottom Left' },
                    { id: 'top-right', label: 'Top Right' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setPageNumberPosition(pos.id as any)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                        pageNumberPosition === pos.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Numbering Format
                </label>
                <select
                  value={pageNumberFormat}
                  onChange={(e: any) => setPageNumberFormat(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Page {n} of {total}">Page 1 of 10 (Full Page Count)</option>
                  <option value="{n} / {total}">1 / 10 (Compact Fraction)</option>
                  <option value="{n}">1 (Page number only)</option>
                </select>
              </div>

              {/* Font Size & Color */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    <span>Font Size</span>
                    <span className="font-mono">{pageNumberFontSize}pt</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="18"
                    step="1"
                    value={pageNumberFontSize}
                    onChange={(e) => setPageNumberFontSize(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg mt-1"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Text Color
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={pageNumberColor}
                      onChange={(e) => setPageNumberColor(e.target.value)}
                      className="w-8 h-7 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer p-0.5 bg-transparent"
                      title="Custom Color"
                    />
                    <span className="text-[11px] font-mono text-zinc-500 uppercase">{pageNumberColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/80 flex items-center justify-between">
          <button
            onClick={() => setActiveModal(null)}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Applying Numbers...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Apply to All Pages</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
