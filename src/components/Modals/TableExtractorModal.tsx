import React, { useState, useEffect } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  getPageTextItems, 
  clusterItemsToGrid, 
  exportToExcel, 
  exportToCsv, 
  exportToJson, 
  exportToMarkdown,
  type TableItem 
} from '../../core/tableEngine';
import { 
  X, 
  Table, 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Trash2,
  FileCode,
  FileText
} from 'lucide-react';

export const TableExtractorModal: React.FC = () => {
  const { activeModal, setActiveModal, documentBytes, fileName, pageDimensions } = usePDFStore();
  const numPages = pageDimensions.length || 1;

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExtracting, setIsExtracting] = useState(false);
  
  const [grid, setGrid] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Load PDF document proxy
  useEffect(() => {
    let isMounted = true;
    async function loadPdf() {
      if (activeModal === 'tableExtractor' && documentBytes) {
        try {
          const loadingTask = pdfjsLib.getDocument({ data: documentBytes });
          const doc = await loadingTask.promise;
          if (isMounted) {
            setPdfDoc(doc);
            setCurrentPage(1);
          }
        } catch (err) {
          console.error('Failed to load PDF for table extraction:', err);
        }
      }
    }
    loadPdf();
    return () => {
      isMounted = false;
    };
  }, [activeModal, documentBytes]);

  // Extract table on current page
  useEffect(() => {
    let isMounted = true;
    async function runExtraction() {
      if (!pdfDoc) return;
      setIsExtracting(true);
      try {
        const items: TableItem[] = await getPageTextItems(pdfDoc, currentPage);
        const tableGrid = clusterItemsToGrid(items);
        if (isMounted) {
          setGrid(tableGrid);
        }
      } catch (err) {
        console.error('Error extracting table from page:', err);
      } finally {
        if (isMounted) setIsExtracting(false);
      }
    }

    runExtraction();
    return () => {
      isMounted = false;
    };
  }, [pdfDoc, currentPage]);

  if (activeModal !== 'tableExtractor') return null;

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const updated = grid.map((row, r) => {
      if (r !== rIdx) return row;
      const newRow = [...row];
      newRow[cIdx] = val;
      return newRow;
    });
    setGrid(updated);
  };

  const handleAddRow = () => {
    const numCols = grid.length > 0 ? grid[0].length : 3;
    setGrid([...grid, new Array(numCols).fill('')]);
  };

  const handleDeleteRow = (rIdx: number) => {
    setGrid(grid.filter((_, r) => r !== rIdx));
  };

  const handleAddColumn = () => {
    setGrid(grid.map(row => [...row, '']));
  };

  const handleExportExcel = () => {
    const name = (fileName || 'document').replace(/\.[^/.]+$/, '');
    exportToExcel(grid, `${name}_page_${currentPage}_table.xlsx`);
  };

  const handleExportCsv = () => {
    const csvContent = exportToCsv(grid);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(fileName || 'document').replace(/\.[^/.]+$/, '')}_page_${currentPage}_table.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonContent = exportToJson(grid, hasHeader);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(fileName || 'document').replace(/\.[^/.]+$/, '')}_page_${currentPage}_table.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = (format: 'csv' | 'json' | 'markdown') => {
    let text = '';
    if (format === 'csv') text = exportToCsv(grid);
    if (format === 'json') text = exportToJson(grid, hasHeader);
    if (format === 'markdown') text = exportToMarkdown(grid, hasHeader);

    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Smart PDF Table to Excel & CSV Extractor</span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  AI Spatial Clustering
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Detect, inspect, and export tabular data from financial statements, invoices, and forms into spreadsheet formats.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Page Navigator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Scan Page:</span>
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg text-xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-medium">{currentPage} of {numPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage === numPages}
                className="p-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 ml-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={hasHeader} 
                onChange={(e) => setHasHeader(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>First row is Header</span>
            </label>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3 h-3 text-emerald-500" />
              <span>Add Row</span>
            </button>
            <button
              onClick={handleAddColumn}
              className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3 h-3 text-blue-500" />
              <span>Add Col</span>
            </button>
          </div>
        </div>

        {/* Spreadsheet Area */}
        <div className="flex-1 p-6 overflow-auto min-h-[340px] bg-zinc-100/60 dark:bg-zinc-950/60 flex flex-col">
          {isExtracting ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-zinc-500">Scanning coordinates and clustering table cells...</p>
            </div>
          ) : grid.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900">
              <Table className="w-10 h-10 text-zinc-400 mb-2" />
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">No Tabular Data Found on Page {currentPage}</h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                Try switching pages or use the Add Row button above to construct a custom table matrix manually.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <tbody>
                  {grid.map((row, rIdx) => {
                    const isHeaderRow = hasHeader && rIdx === 0;
                    return (
                      <tr 
                        key={rIdx} 
                        className={`border-b border-zinc-200/80 dark:border-zinc-800/80 group ${
                          isHeaderRow 
                            ? 'bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-900 dark:text-zinc-100' 
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {/* Row Index Indicator */}
                        <td className="w-8 px-2 py-1.5 text-center text-[10px] font-mono text-zinc-400 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 select-none">
                          {rIdx + 1}
                        </td>

                        {/* Cells */}
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-1 border-r border-zinc-200/60 dark:border-zinc-800/60 min-w-[120px]">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                              className={`w-full px-2 py-1 bg-transparent rounded hover:bg-white dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-emerald-500 outline-none text-xs ${
                                isHeaderRow ? 'font-bold text-zinc-900 dark:text-zinc-100' : ''
                              }`}
                            />
                          </td>
                        ))}

                        {/* Row Action */}
                        <td className="w-8 px-1 py-1 text-center">
                          <button
                            onClick={() => handleDeleteRow(rIdx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 rounded transition-opacity"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer: Multi-Format Exporters */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Copy to Clipboard:</span>
            <button
              onClick={() => handleCopyClipboard('csv')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              {copiedFormat === 'csv' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>CSV</span>
            </button>

            <button
              onClick={() => handleCopyClipboard('json')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              {copiedFormat === 'json' ? <Check className="w-3 h-3 text-emerald-500" /> : <FileCode className="w-3 h-3" />}
              <span>JSON</span>
            </button>

            <button
              onClick={() => handleCopyClipboard('markdown')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              {copiedFormat === 'markdown' ? <Check className="w-3 h-3 text-emerald-500" /> : <FileText className="w-3 h-3" />}
              <span>Markdown</span>
            </button>
          </div>

          {/* Direct File Downloads */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={grid.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Download .CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={grid.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-500" />
              <span>Download .JSON</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={grid.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export to Excel (.xlsx)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
