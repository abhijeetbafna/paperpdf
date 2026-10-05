import React, { useRef, useState, useEffect } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { X, PenTool, Type, Upload, Check, RotateCcw } from 'lucide-react';
import type { SignatureAnnotation } from '../../types/pdf';

export const SignatureModal: React.FC = () => {
  const { setActiveModal, addAnnotation, currentPage, pageDimensions } = usePDFStore();
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Draw State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Type State
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState<'cursive1' | 'cursive2' | 'serif'>('cursive1');

  // Upload State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Clear Canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  useEffect(() => {
    if (tab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [tab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setUploadedImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplySignature = () => {
    let signatureDataUrl = '';

    if (tab === 'draw') {
      if (!canvasRef.current || !hasDrawn) return;
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    } else if (tab === 'type') {
      if (!typedName.trim()) return;
      // Convert typed text to transparent PNG canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.font = selectedFont === 'cursive1' 
        ? 'italic 38px "Brush Script MT", cursive, sans-serif'
        : selectedFont === 'cursive2'
        ? 'italic 34px "Lucida Handwriting", cursive, sans-serif'
        : 'italic 32px "Georgia", serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(typedName, 20, 70);
      signatureDataUrl = offscreen.toDataURL('image/png');
    } else if (tab === 'upload') {
      if (!uploadedImage) return;
      signatureDataUrl = uploadedImage;
    }

    if (!signatureDataUrl) return;

    const pageDim = pageDimensions.find(p => p.pageNumber === currentPage);
    const targetPageIndex = Math.max(0, currentPage - 1);

    const newSignatureAnn: SignatureAnnotation = {
      id: `sig-${Date.now()}`,
      type: 'signature',
      pageIndex: targetPageIndex,
      domX: 60,
      domY: (pageDim ? pageDim.height : 792) - 180,
      width: 160,
      height: 60,
      dataUrl: signatureDataUrl,
    };

    addAnnotation(newSignatureAnn);
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col transition-colors">
        {/* Modal Header */}
        <div className="h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <PenTool className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Create Digital Signature</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 pt-2">
          <button
            onClick={() => setTab('draw')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === 'draw'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            onClick={() => setTab('type')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === 'type'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === 'upload'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {tab === 'draw' && (
            <div className="space-y-2">
              <div className="relative border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="cursor-crosshair w-full block"
                />
                <div className="absolute bottom-2 left-4 right-4 border-b border-zinc-200 pointer-events-none" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Sign with mouse or stylus</span>
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
          )}

          {tab === 'type' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jonathan Vance"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {typedName && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Select Style
                  </span>
                  <div className="space-y-2">
                    {[
                      { id: 'cursive1', font: 'italic 28px "Brush Script MT", cursive' },
                      { id: 'cursive2', font: 'italic 24px "Lucida Handwriting", cursive' },
                      { id: 'serif', font: 'italic 24px "Georgia", serif' },
                    ].map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedFont(item.id as any)}
                        style={{ font: item.font }}
                        className={`p-3 rounded-lg border bg-white text-zinc-900 cursor-pointer transition-all ${
                          selectedFont === item.id ? 'ring-2 ring-blue-500 border-blue-500' : 'border-zinc-300'
                        }`}
                      >
                        {typedName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'upload' && (
            <div>
              <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                  Select signature PNG or JPG
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">
                  Transparent PNG recommended
                </span>
              </label>

              {uploadedImage && (
                <div className="mt-3 p-2 bg-white border border-zinc-300 rounded-lg flex items-center justify-center h-24">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    className="max-h-full object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 flex items-center justify-end gap-2">
          <button
            onClick={() => setActiveModal(null)}
            className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={handleApplySignature}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Place Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
};
