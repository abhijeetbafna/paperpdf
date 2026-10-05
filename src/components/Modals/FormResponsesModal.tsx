import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import type { FormFieldAnnotation } from '../../types/pdf';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Check, 
  Table 
} from 'lucide-react';

export const FormResponsesModal: React.FC = () => {
  const { 
    activeModal, 
    setActiveModal, 
    documentBytes,
    annotations, 
    updateAnnotation, 
    fileName 
  } = usePDFStore();

  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  if (activeModal !== 'formResponses') return null;

  const formFields = annotations.filter((a): a is FormFieldAnnotation => a.type === 'form-field');

  const exportToJson = () => {
    const data: Record<string, any> = {};
    formFields.forEach((field) => {
      data[field.name || field.id] = field.value;
    });

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'form';
    link.download = `${baseName}_form_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessStatus('Form data exported to JSON!');
  };

  const exportToCsv = () => {
    const headers = ['Field Name', 'Field Type', 'Value', 'Page'];
    const rows = formFields.map((f) => [
      `"${(f.name || f.id).replace(/"/g, '""')}"`,
      `"${f.fieldType}"`,
      `"${String(f.value || '').replace(/"/g, '""')}"`,
      f.pageIndex + 1,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'form';
    link.download = `${baseName}_form_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessStatus('Form data exported to CSV spreadsheet!');
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let updatedCount = 0;
        formFields.forEach((field) => {
          const key = field.name || field.id;
          if (parsed[key] !== undefined) {
            updateAnnotation(field.id, { value: parsed[key] });
            updatedCount++;
          }
        });
        setSuccessStatus(`Successfully populated ${updatedCount} form fields from JSON!`);
      } catch (err) {
        console.error('Failed to parse JSON:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Form Data Manager</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Inspect, export (CSV/JSON), and auto-fill interactive form responses
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!documentBytes ? (
            <ModalDocumentDropzone
              title="Select a PDF to manage & fill form data"
              subtitle="Upload an interactive form document to extract, bulk fill, or export responses to CSV and JSON."
            />
          ) : formFields.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Table className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No interactive form fields found in this document
              </p>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                Use the <strong>"Forms"</strong> tool in the top toolbar to place interactive text boxes, checkboxes, and dropdowns onto any page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Document Form Fields ({formFields.length})
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleJsonImport}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={exportToJson}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportToCsv}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Table of fields */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500">
                    <tr>
                      <th className="p-2.5">Field Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Current Value</th>
                      <th className="p-2.5 text-right">Page</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                    {formFields.map((field) => (
                      <tr key={field.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="p-2.5 font-semibold text-zinc-800 dark:text-zinc-200">
                          {field.name || `field_${field.id.slice(0, 6)}`}
                        </td>
                        <td className="p-2.5 text-zinc-500 capitalize">{field.fieldType}</td>
                        <td className="p-2.5 font-normal text-zinc-700 dark:text-zinc-300 truncate max-w-[160px]">
                          {field.fieldType === 'checkbox'
                            ? field.value ? '✓ Checked' : '✗ Unchecked'
                            : String(field.value || '(empty)')}
                        </td>
                        <td className="p-2.5 text-right text-zinc-400">P.{field.pageIndex + 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {successStatus && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successStatus}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            AcroForm Engine • 100% In-Browser
          </div>
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
