import React, { useState } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { protectPdfDocument, sanitizePdfMetadata, unlockProtectedPdf, type SanitizedMetadataReport } from '../../core/securityEngine';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { ModalDocumentDropzone } from './ModalDocumentDropzone';

export const ProtectModal: React.FC = () => {
  const { 
    activeModal, 
    setActiveModal, 
    documentBytes, 
    fileName,
    loadDocument
  } = usePDFStore();

  const [tab, setTab] = useState<'encrypt' | 'unlock' | 'sanitize'>('encrypt');

  // Encryption state
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [restrictPrinting, setRestrictPrinting] = useState(false);
  const [restrictCopying, setRestrictCopying] = useState(true);
  const [restrictModifying, setRestrictModifying] = useState(true);
  const [sanitizeOnEncrypt, setSanitizeOnEncrypt] = useState(true);

  // Unlock state
  const [unlockPassword, setUnlockPassword] = useState('');

  // Execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sanitizeReport, setSanitizeReport] = useState<SanitizedMetadataReport | null>(null);

  if (activeModal !== 'protect') return null;

  const handleEncrypt = async (action: 'download' | 'apply') => {
    if (!documentBytes) return;
    if (!userPassword) {
      setErrorMessage('Please enter a user password to encrypt this document.');
      return;
    }
    if (userPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your password.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const protectedBytes = await protectPdfDocument(documentBytes, {
        userPassword,
        ownerPassword: userPassword,
        permissions: {
          copying: !restrictCopying,
          modifying: !restrictModifying,
          printing: restrictPrinting ? 'none' : 'highResolution',
          annotating: !restrictModifying,
          fillingForms: !restrictModifying,
        },
        sanitizeMetadata: sanitizeOnEncrypt,
      });

      const outputName = fileName 
        ? fileName.replace(/\.pdf$/i, '_protected.pdf') 
        : 'protected_document.pdf';

      if (action === 'download') {
        const blob = new Blob([protectedBytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = outputName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessMessage('Password protected PDF downloaded successfully!');
      } else {
        await loadDocument(protectedBytes, outputName);
        setActiveModal(null);
      }
    } catch (err: any) {
      console.error('Encryption failed:', err);
      setErrorMessage(err?.message || 'Failed to encrypt document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (!documentBytes) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const unlockedBytes = await unlockProtectedPdf(documentBytes, unlockPassword);
      const outputName = fileName 
        ? fileName.replace(/\.pdf$/i, '_unlocked.pdf') 
        : 'unlocked_document.pdf';

      const blob = new Blob([unlockedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMessage('Password removed and clean PDF downloaded successfully!');
    } catch (err: any) {
      console.error('Unlock failed:', err);
      setErrorMessage('Incorrect password or file is not encrypted with this password.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSanitizeOnly = async () => {
    if (!documentBytes) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { sanitizedBytes, report } = await sanitizePdfMetadata(documentBytes);
      setSanitizeReport(report);

      const outputName = fileName 
        ? fileName.replace(/\.pdf$/i, '_sanitized.pdf') 
        : 'sanitized_document.pdf';

      const blob = new Blob([sanitizedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMessage('All metadata, GPS tags, and author info scrubbed clean!');
    } catch (err: any) {
      console.error('Sanitization failed:', err);
      setErrorMessage('Failed to sanitize metadata.');
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
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Security & Privacy Suite</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                AES-256 password encryption & metadata sanitizer
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
            onClick={() => { setTab('encrypt'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              tab === 'encrypt'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Protect with Password</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('unlock'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              tab === 'unlock'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock PDF</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('sanitize'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              tab === 'sanitize'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sanitize Metadata</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!documentBytes ? (
            <div className="py-2">
              <ModalDocumentDropzone 
                title="Upload PDF Document to Protect & Encrypt"
                subtitle="Apply AES encryption, restrict permissions, or sanitize metadata"
              />
            </div>
          ) : (
            <>
              {tab === 'encrypt' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    User Password (Required to Open PDF)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Enter strong password..."
                      disabled={isProcessing}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-9 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password to confirm..."
                    disabled={isProcessing}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Granular Permissions Lockdown
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={restrictCopying}
                    onChange={(e) => setRestrictCopying(e.target.checked)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Prevent text copying and content extraction</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={restrictModifying}
                    onChange={(e) => setRestrictModifying(e.target.checked)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Prevent modifying pages, comments, or form fields</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={restrictPrinting}
                    onChange={(e) => setRestrictPrinting(e.target.checked)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Disable printing (high/low resolution)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={sanitizeOnEncrypt}
                    onChange={(e) => setSanitizeOnEncrypt(e.target.checked)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sanitize hidden document metadata and timestamps</span>
                </label>
              </div>
            </div>
          )}

          {tab === 'unlock' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Unlock a password-protected PDF file by entering its password. A clean, completely unencrypted copy will be generated for you.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Document Password
                </label>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter the PDF password..."
                  disabled={isProcessing}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          {tab === 'sanitize' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5 text-xs text-amber-800 dark:text-amber-200">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Permanent Privacy Scrub</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Removes author names, original software signatures, GPS locations, embedded keywords, creation timestamps, and hidden XMP metadata tags.
                </p>
              </div>

              {sanitizeReport && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                  <div className="font-bold text-zinc-700 dark:text-zinc-300">Sanitized Properties:</div>
                  {sanitizeReport.previousAuthor && <div>• Stripped Author: <span className="font-mono text-zinc-500">{sanitizeReport.previousAuthor}</span></div>}
                  {sanitizeReport.previousProducer && <div>• Stripped Producer: <span className="font-mono text-zinc-500">{sanitizeReport.previousProducer}</span></div>}
                  {sanitizeReport.hadCreationDate && <div>• Stripped Creation/Modification Timestamps</div>}
                </div>
              )}
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            100% In-Browser AES-256 Engine
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            {tab === 'encrypt' && (
              <button
                type="button"
                onClick={() => handleEncrypt('download')}
                disabled={isProcessing || !userPassword}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-40"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Encrypt & Download</span>
              </button>
            )}

            {tab === 'unlock' && (
              <button
                type="button"
                onClick={handleUnlock}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-40"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>Remove Password</span>
              </button>
            )}

            {tab === 'sanitize' && (
              <button
                type="button"
                onClick={handleSanitizeOnly}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-40"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Scrub & Download</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
