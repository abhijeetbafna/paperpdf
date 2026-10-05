import React, { useState, useEffect } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import type { BarcodeType } from '../../core/barcodeEngine';
import { 
  generateBarcodeDataUrl, 
  stampBarcodeOnPdf 
} from '../../core/barcodeEngine';
import { 
  X, 
  QrCode, 
  Barcode, 
  Download, 
  Stamp, 
  CheckCircle2, 
  Wifi, 
  Globe, 
  User, 
  CreditCard,
  Copy,
  Check
} from 'lucide-react';

export const BarcodeModal: React.FC = () => {
  const { activeModal, setActiveModal, documentBytes, fileName, loadDocument, pageDimensions, currentPage } = usePDFStore();

  const [barcodeType, setBarcodeType] = useState<BarcodeType>('qr');
  const [qrPreset, setQrPreset] = useState<'url' | 'text' | 'wifi' | 'vcard' | 'upi'>('url');
  
  // Content fields
  const [content, setContent] = useState('https://paperpdf.app');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [vcardName, setVcardName] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiAmount, setUpiAmount] = useState('');

  // Styling
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrErrorCorrection, setQrErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');

  // Stamping options
  const [targetPage, setTargetPage] = useState(currentPage || 1);
  const [position, setPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'>('bottom-right');
  const [stampSize, setStampSize] = useState(100);

  // Live Preview Data URL
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStamping, setIsStamping] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [stampSuccess, setStampSuccess] = useState(false);

  // Recalculate content string if presets change
  useEffect(() => {
    if (barcodeType !== 'qr') return;

    if (qrPreset === 'wifi') {
      if (wifiSsid) {
        setContent(`WIFI:S:${wifiSsid};T:WPA;P:${wifiPass};;`);
      }
    } else if (qrPreset === 'vcard') {
      if (vcardName) {
        setContent(`BEGIN:VCARD\nVERSION:3.0\nN:${vcardName}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`);
      }
    } else if (qrPreset === 'upi') {
      if (upiId) {
        setContent(`upi://pay?pa=${upiId}&pn=PaperPDF&am=${upiAmount || '0'}&cu=INR`);
      }
    }
  }, [qrPreset, wifiSsid, wifiPass, vcardName, vcardPhone, vcardEmail, upiId, upiAmount, barcodeType]);

  // Update preview
  useEffect(() => {
    let isMounted = true;
    async function update() {
      try {
        setErrorMsg(null);
        const url = await generateBarcodeDataUrl({
          type: barcodeType,
          text: content || 'Sample',
          fgColor,
          bgColor,
          qrErrorCorrection
        });
        if (isMounted) setPreviewUrl(url);
      } catch (err: any) {
        if (isMounted) setErrorMsg(err?.message || 'Invalid barcode format');
      }
    }
    update();
    return () => { isMounted = false; };
  }, [barcodeType, content, fgColor, bgColor, qrErrorCorrection]);

  if (activeModal !== 'barcodeGenerator') return null;

  const handleDownloadPng = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = barcodeType === 'qr' ? 'qrcode.png' : `${barcodeType}_barcode.png`;
    a.click();
  };

  const handleCopyImage = async () => {
    if (!previewUrl) return;
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleStampPdf = async () => {
    if (!documentBytes || !previewUrl) return;
    setIsStamping(true);
    setErrorMsg(null);
    try {
      const stampedBytes = await stampBarcodeOnPdf(
        documentBytes,
        previewUrl,
        targetPage - 1,
        position,
        stampSize,
        barcodeType === 'qr' ? stampSize : stampSize * 0.5
      );
      loadDocument(stampedBytes, fileName || 'document.pdf');
      setStampSuccess(true);
      setTimeout(() => {
        setStampSuccess(false);
        setActiveModal(null);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to stamp barcode onto PDF');
    } finally {
      setIsStamping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Vector QR & Barcode Generator & Stamper</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Generate high-DPI codes and stamp directly onto PDF pages</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Controls Column */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Code Type Selector */}
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-1">
              <button
                onClick={() => { setBarcodeType('qr'); setContent('https://paperpdf.app'); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  barcodeType === 'qr'
                    ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <QrCode className="w-4 h-4" /> QR Code
              </button>
              <button
                onClick={() => { setBarcodeType('CODE128'); setContent('PAPERPDF-2026'); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  barcodeType !== 'qr'
                    ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Barcode className="w-4 h-4" /> 1D Barcode
              </button>
            </div>

            {/* If QR -> Sub Presets */}
            {barcodeType === 'qr' && (
              <div className="space-y-3">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'url', label: 'URL / Link', icon: Globe },
                    { id: 'text', label: 'Plain Text', icon: QrCode },
                    { id: 'wifi', label: 'Wi-Fi Network', icon: Wifi },
                    { id: 'vcard', label: 'Contact Card', icon: User },
                    { id: 'upi', label: 'Payment / UPI', icon: CreditCard }
                  ].map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setQrPreset(p.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                          qrPreset === p.id
                            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500/40 text-purple-600 dark:text-purple-400'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Preset Input Fields */}
                {qrPreset === 'url' && (
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Target Website URL</label>
                    <input
                      type="url"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                )}

                {qrPreset === 'text' && (
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Text Content / Message</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={3}
                      placeholder="Enter raw text to encode..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
                    />
                  </div>
                )}

                {qrPreset === 'wifi' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Network SSID</label>
                      <input
                        type="text"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        placeholder="e.g. Office_5G"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Wi-Fi Password</label>
                      <input
                        type="password"
                        value={wifiPass}
                        onChange={(e) => setWifiPass(e.target.value)}
                        placeholder="Password"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                )}

                {qrPreset === 'vcard' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={vcardName}
                      onChange={(e) => setVcardName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={vcardPhone}
                        onChange={(e) => setVcardPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      />
                      <input
                        type="email"
                        value={vcardEmail}
                        onChange={(e) => setVcardEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                )}

                {qrPreset === 'upi' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="UPI ID (e.g. user@okhdfc)"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                    <input
                      type="number"
                      value={upiAmount}
                      onChange={(e) => setUpiAmount(e.target.value)}
                      placeholder="Amount (optional)"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                )}
              </div>
            )}

            {/* If 1D Barcode */}
            {barcodeType !== 'qr' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Barcode Standard</label>
                    <select
                      value={barcodeType}
                      onChange={(e) => setBarcodeType(e.target.value as BarcodeType)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    >
                      <option value="CODE128">Code 128 (Standard Alpha-Numeric)</option>
                      <option value="EAN13">EAN-13 (13 Digit Retail)</option>
                      <option value="EAN8">EAN-8 (8 Digit Retail)</option>
                      <option value="UPC">UPC-A (12 Digit Product)</option>
                      <option value="CODE39">Code 39 (Industrial)</option>
                      <option value="ITF14">ITF-14 (Packaging)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Barcode Value / Digits</label>
                    <input
                      type="text"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter code"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Customization & Colors */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Code Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-zinc-300 dark:border-zinc-700"
                  />
                  <span className="text-xs font-mono">{fgColor}</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-zinc-300 dark:border-zinc-700"
                  />
                  <button
                    onClick={() => setBgColor(bgColor === 'transparent' ? '#ffffff' : 'transparent')}
                    className={`text-[10px] px-2 py-1 rounded-md border ${
                      bgColor === 'transparent' ? 'bg-purple-100 dark:bg-purple-950 text-purple-600' : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}
                  >
                    {bgColor === 'transparent' ? 'Trans' : 'Solid'}
                  </button>
                </div>
              </div>
              {barcodeType === 'qr' && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">Error Correction</label>
                  <select
                    value={qrErrorCorrection}
                    onChange={(e) => setQrErrorCorrection(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                    className="w-full px-2 py-1 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <option value="L">L (7% Recovery)</option>
                    <option value="M">M (15% Standard)</option>
                    <option value="Q">Q (25% High)</option>
                    <option value="H">H (30% Max)</option>
                  </select>
                </div>
              )}
            </div>

            {/* PDF Stamp Options (if document loaded) */}
            {documentBytes && (
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 rounded-xl space-y-2.5">
                <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Stamp className="w-3.5 h-3.5" /> Stamp onto Loaded Document
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Target Page</label>
                    <select
                      value={targetPage}
                      onChange={(e) => setTargetPage(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800"
                    >
                      {Array.from({ length: pageDimensions?.length || 1 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Position</label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value as any)}
                      className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="center">Center</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Stamp Size ({stampSize}px)</label>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={stampSize}
                      onChange={(e) => setStampSize(Number(e.target.value))}
                      className="w-full h-1.5 bg-purple-200 dark:bg-purple-900 rounded-lg appearance-none cursor-pointer mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview & Actions Column */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Live Vector Preview</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono uppercase">
                {barcodeType}
              </span>
            </div>

            {/* Render Box */}
            <div className="w-56 h-56 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-center shadow-inner overflow-hidden">
              {errorMsg ? (
                <div className="text-center p-2 text-rose-500 text-xs">{errorMsg}</div>
              ) : previewUrl ? (
                <img src={previewUrl} alt="Barcode Preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="w-full space-y-2 mt-4">
              {documentBytes && (
                <button
                  onClick={handleStampPdf}
                  disabled={isStamping || !!errorMsg}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all"
                >
                  {stampSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Stamped onto Page {targetPage}!
                    </>
                  ) : (
                    <>
                      <Stamp className="w-4 h-4" /> {isStamping ? 'Stamping...' : `Stamp to PDF Page ${targetPage}`}
                    </>
                  )}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadPng}
                  disabled={!previewUrl || !!errorMsg}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Save PNG
                </button>
                <button
                  onClick={handleCopyImage}
                  disabled={!previewUrl || !!errorMsg}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
