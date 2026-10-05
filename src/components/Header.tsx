import React, { useRef, useState, useEffect } from 'react';
import { usePDFStore } from '../store/pdfStore';
import { 
  FileText, 
  MousePointer2,
  Type, 
  Edit3, 
  Eraser, 
  ShieldAlert,
  Highlighter, 
  PenTool, 
  LayoutGrid, 
  Combine, 
  Scissors, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Upload, 
  Sparkles,
  Sun, 
  Moon, 
  ChevronDown, 
  Layers, 
  Pencil, 
  Square, 
  Circle, 
  ArrowUpRight, 
  Minus, 
  Zap, 
  Hash,
  MoreHorizontal,
  Check,
  Image as ImageIcon,
  FileUp,
  Lock,
  FileCode,
  ScanText,
  CheckSquare,
  FileSpreadsheet,
  GitCompare,
  Table
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    fileName, 
    fileSize, 
    activeTool, 
    setActiveTool, 
    drawColor,
    setDrawColor,
    drawStrokeWidth,
    setDrawStrokeWidth,
    highlightColor,
    setHighlightColor,
    shapeType,
    setShapeType,
    zoom, 
    setZoom, 
    undo, 
    redo, 
    undoStack, 
    redoStack, 
    exportPDF, 
    isExporting, 
    loadDocument,
    loadSampleDocument,
    setActiveModal,
    addAnnotation,
    selectAnnotation,
    currentPage,
    theme,
    toggleTheme
  } = usePDFStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Dropdown States
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showAnnotateMenu, setShowAnnotateMenu] = useState(false);
  const [showProtectMenu, setShowProtectMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const editMenuRef = useRef<HTMLDivElement>(null);
  const annotateMenuRef = useRef<HTMLDivElement>(null);
  const protectMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (editMenuRef.current && !editMenuRef.current.contains(target)) {
        setShowEditMenu(false);
      }
      if (annotateMenuRef.current && !annotateMenuRef.current.contains(target)) {
        setShowAnnotateMenu(false);
      }
      if (protectMenuRef.current && !protectMenuRef.current.contains(target)) {
        setShowProtectMenu(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setShowToolsMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  // Palettes
  const highlightPalette = [
    { id: '#fef08a', name: 'Yellow' },
    { id: '#bbf7d0', name: 'Green' },
    { id: '#bae6fd', name: 'Blue' },
    { id: '#fbcfe8', name: 'Pink' },
    { id: '#fed7aa', name: 'Orange' },
  ];

  const penColors = [
    { id: '#000000', name: 'Black' },
    { id: '#374151', name: 'Charcoal' },
    { id: '#2563eb', name: 'Blue' },
    { id: '#dc2626', name: 'Red' },
    { id: '#16a34a', name: 'Green' },
    { id: '#ca8a04', name: 'Yellow' },
    { id: '#ea580c', name: 'Orange' },
    { id: '#9333ea', name: 'Purple' },
    { id: '#ffffff', name: 'White' },
  ];

  const strokeWidths = [1, 2, 3, 5, 8];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          loadDocument(new Uint8Array(event.target.result), file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 180;
          const naturalW = img.naturalWidth || 180;
          const naturalH = img.naturalHeight || 180;
          const scale = Math.min(maxDim / naturalW, maxDim / naturalH, 1.0);
          const w = Math.round(naturalW * scale);
          const h = Math.round(naturalH * scale);

          const newImageAnn = {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'image' as const,
            pageIndex: Math.max(0, (currentPage || 1) - 1),
            domX: 100,
            domY: 150,
            width: w,
            height: h,
            dataUrl,
            name: file.name,
            opacity: 1.0,
            rotation: 0,
            aspectRatioLocked: true,
          };
          addAnnotation(newImageAnn);
          selectAnnotation(newImageAnn.id);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Group active checks
  const isEditActive = activeTool === 'add-text' || activeTool === 'text' || activeTool === 'edit-text' || activeTool === 'shape' || activeTool === 'image' || activeTool === 'form-field';
  const isAnnotateActive = activeTool === 'highlight' || activeTool === 'draw';
  const isProtectActive = activeTool === 'whiteout' || activeTool === 'redact';
  const isMoreToolActive = isProtectActive || isAnnotateActive;

  return (
    <header className="h-13 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2.5 sm:px-3 flex items-center justify-between select-none z-40 transition-colors gap-1.5 sm:gap-2 w-full max-w-full">
      {/* ------------------------------------------------------------- */}
      {/* Left: Brand Logo & Current Document Pill                      */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 hidden sm:inline">
            PaperPDF
          </span>
        </div>

        {fileName ? (
          <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-w-[90px] sm:max-w-[130px] md:max-w-[170px] truncate" title={fileName}>
              {fileName}
            </span>
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 hidden lg:inline-block">
              {formatBytes(fileSize)}
            </span>
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Center: Responsive Tool Hubs with Overflow Menu               */}
      {/* ------------------------------------------------------------- */}
      {fileName && (
        <div className="flex items-center gap-1 shrink-0">
          {/* 1. Select Pointer (Always visible) */}
          <button
            onClick={() => setActiveTool('select')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-zinc-700 dark:text-zinc-300 bg-zinc-100/90 dark:bg-zinc-900/90 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800'
            }`}
            title="Select Tool (V) — Click annotations to move, resize or delete"
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Select</span>
          </button>

          {/* 2. Edit Hub ▾ (Add Text, Edit Text, Shapes) */}
          <div ref={editMenuRef} className="relative">
            <button
              onClick={() => setShowEditMenu(!showEditMenu)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isEditActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-semibold'
                  : 'bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Edit Tools (Text & Shapes)"
            >
              {activeTool === 'edit-text' ? (
                <Edit3 className="w-3.5 h-3.5" />
              ) : activeTool === 'shape' ? (
                <Square className="w-3.5 h-3.5" />
              ) : (
                <Type className="w-3.5 h-3.5" />
              )}
              <span>
                {activeTool === 'edit-text' ? 'Edit Text' : activeTool === 'shape' ? 'Shapes' : 'Add Text'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
            </button>

            {/* Edit Menu Popover */}
            {showEditMenu && (
              <div className="absolute top-10 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-2xl z-50 w-56 animate-popover flex flex-col gap-1">
                <button
                  onClick={() => {
                    setActiveTool('add-text');
                    setShowEditMenu(false);
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'add-text' || activeTool === 'text'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Type className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <div className="font-semibold">Add Text</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Click anywhere to place text</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('edit-text');
                    setShowEditMenu(false);
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'edit-text'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Edit3 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <div className="font-semibold">Edit Existing Text</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Directly modify document text</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    imageInputRef.current?.click();
                    setShowEditMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left transition-colors text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-semibold">Insert Image</div>
                    <div className="text-[10px] text-zinc-500 font-normal">PNG, JPG, WebP, SVG on canvas</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('form-field');
                    setShowEditMenu(false);
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'form-field'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-semibold">Form Field (AcroForm)</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Text, Checkbox, Dropdowns</div>
                  </div>
                </button>

                <div className="border-t border-zinc-200 dark:border-zinc-800 my-0.5" />

                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Vector Shapes
                </div>
                <div className="grid grid-cols-2 gap-1 px-1">
                  {[
                    { id: 'rectangle', label: 'Rectangle', icon: Square },
                    { id: 'ellipse', label: 'Circle', icon: Circle },
                    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
                    { id: 'line', label: 'Line', icon: Minus },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setShapeType(item.id as any);
                          setActiveTool('shape');
                          setShowEditMenu(false);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md font-medium transition-colors ${
                          activeTool === 'shape' && shapeType === item.id
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Annotate Hub ▾ (Highlight, Draw with Colors & Thickness) - Collapses into More on narrow viewports */}
          <div ref={annotateMenuRef} className="relative hidden md:block">
            <button
              onClick={() => setShowAnnotateMenu(!showAnnotateMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isAnnotateActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-semibold'
                  : 'bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Annotation Tools (Highlight & Draw)"
            >
              {activeTool === 'draw' ? (
                <Pencil className="w-3.5 h-3.5" />
              ) : (
                <Highlighter className="w-3.5 h-3.5" />
              )}
              <span>
                {activeTool === 'draw' ? 'Draw' : 'Highlight'}
              </span>
              <span
                style={{ backgroundColor: activeTool === 'draw' ? drawColor : highlightColor }}
                className="w-2.5 h-2.5 rounded-full border border-black/20"
              />
              <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
            </button>

            {/* Annotate Menu Popover */}
            {showAnnotateMenu && (
              <div className="absolute top-10 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-2xl z-50 w-64 animate-popover space-y-3">
                {/* Highlighter Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => {
                        setActiveTool('highlight');
                        setShowAnnotateMenu(false);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600"
                    >
                      <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                      <span>Highlighter Tool</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {highlightPalette.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setHighlightColor(c.id);
                          setActiveTool('highlight');
                          setShowAnnotateMenu(false);
                        }}
                        style={{ backgroundColor: c.id }}
                        className={`w-6 h-6 rounded-full border border-black/20 transition-transform ${
                          highlightColor === c.id ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800" />

                {/* Freehand Pen Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => {
                        setActiveTool('draw');
                        setShowAnnotateMenu(false);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-500" />
                      <span>Freehand Pen</span>
                    </button>
                  </div>
                  
                  {/* Pen Colors */}
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {penColors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setDrawColor(c.id);
                          setActiveTool('draw');
                        }}
                        style={{ backgroundColor: c.id }}
                        className={`w-6 h-6 rounded-full border border-black/20 transition-transform ${
                          drawColor === c.id ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'
                        }`}
                        title={c.name}
                      />
                    ))}
                    {/* Custom Color Input */}
                    <label className="w-6 h-6 rounded-full border border-dashed border-zinc-400 dark:border-zinc-600 flex items-center justify-center cursor-pointer hover:border-blue-500 relative overflow-hidden" title="Custom Color">
                      <input
                        type="color"
                        value={drawColor}
                        onChange={(e) => {
                          setDrawColor(e.target.value);
                          setActiveTool('draw');
                        }}
                        className="opacity-0 absolute inset-0 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-zinc-500">+</span>
                    </label>
                  </div>

                  {/* Stroke Thickness */}
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                    {strokeWidths.map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          setDrawStrokeWidth(w);
                          setActiveTool('draw');
                        }}
                        className={`flex-1 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                          drawStrokeWidth === w
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Protect Hub ▾ (Whiteout, Redact) - Collapses into More on narrow viewports */}
          <div ref={protectMenuRef} className="relative hidden lg:block">
            <button
              onClick={() => setShowProtectMenu(!showProtectMenu)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isProtectActive
                  ? activeTool === 'redact'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm font-semibold'
                    : 'bg-blue-600 text-white border-blue-600 shadow-sm font-semibold'
                  : 'bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Privacy & Redaction Tools"
            >
              {activeTool === 'redact' ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <Eraser className="w-3.5 h-3.5" />
              )}
              <span>
                {activeTool === 'redact' ? 'Redact' : 'Whiteout'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
            </button>

            {/* Protect Menu Popover */}
            {showProtectMenu && (
              <div className="absolute top-10 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-2xl z-50 w-52 animate-popover flex flex-col gap-1">
                <button
                  onClick={() => {
                    setActiveTool('whiteout');
                    setShowProtectMenu(false);
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'whiteout'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Eraser className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-semibold">Whiteout (Mask)</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Covers area with white layer</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTool('redact');
                    setShowProtectMenu(false);
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'redact'
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <div>
                    <div className="font-semibold text-red-600 dark:text-red-400">Permanent Redact</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Blackout & sanitize data</div>
                  </div>
                </button>

                <div className="border-t border-zinc-200 dark:border-zinc-800 my-0.5" />

                <button
                  onClick={() => {
                    setActiveModal('protect');
                    setShowProtectMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-left transition-colors text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Lock className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-semibold text-indigo-600 dark:text-indigo-400">Protect & Encrypt</div>
                    <div className="text-[10px] text-zinc-500 font-normal">AES-256 password & permissions</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 5. Sign Button - Collapses into More on narrow viewports */}
          <button
            onClick={() => setActiveModal('signature')}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/90 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800 shadow-sm transition-all"
            title="Digital Signatures"
          >
            <PenTool className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sign</span>
          </button>

          {/* 6. More ⋯ Hub (Progressive Overflow Container for Zoom / Narrow Viewports) */}
          <div ref={moreMenuRef} className="relative block xl:hidden">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isMoreToolActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-semibold'
                  : 'bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
              }`}
              title="More Editing & Protection Tools"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {activeTool === 'highlight' 
                  ? 'Highlight' 
                  : activeTool === 'draw' 
                  ? 'Draw' 
                  : activeTool === 'whiteout' 
                  ? 'Whiteout' 
                  : activeTool === 'redact' 
                  ? 'Redact' 
                  : 'More'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
            </button>

            {/* More Menu Popover */}
            {showMoreMenu && (
              <div className="absolute top-10 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-2xl z-50 w-60 animate-popover flex flex-col gap-1">
                {/* Annotations Group */}
                <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Annotations
                </div>
                
                {/* Highlight */}
                <button
                  onClick={() => {
                    setActiveTool('highlight');
                    setShowMoreMenu(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'highlight'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Highlighter className="w-4 h-4 text-amber-500" />
                    <span>Highlight Text</span>
                  </div>
                  {activeTool === 'highlight' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>

                {/* Draw */}
                <button
                  onClick={() => {
                    setActiveTool('draw');
                    setShowMoreMenu(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'draw'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-blue-500" />
                    <span>Freehand Pen</span>
                  </div>
                  {activeTool === 'draw' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>

                <div className="border-t border-zinc-200 dark:border-zinc-800 my-0.5" />

                {/* Privacy & Redaction Group */}
                <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Privacy & Masking
                </div>

                {/* Whiteout */}
                <button
                  onClick={() => {
                    setActiveTool('whiteout');
                    setShowMoreMenu(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'whiteout'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eraser className="w-4 h-4 text-zinc-500" />
                    <span>Whiteout Mask</span>
                  </div>
                  {activeTool === 'whiteout' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>

                {/* Redact */}
                <button
                  onClick={() => {
                    setActiveTool('redact');
                    setShowMoreMenu(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
                    activeTool === 'redact'
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <span className="text-red-600 dark:text-red-400 font-medium">Permanent Redaction</span>
                  </div>
                  {activeTool === 'redact' && <Check className="w-3.5 h-3.5 text-red-600" />}
                </button>

                <div className="border-t border-zinc-200 dark:border-zinc-800 my-0.5" />

                {/* Sign Modal */}
                <button
                  onClick={() => {
                    setActiveModal('signature');
                    setShowMoreMenu(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
                >
                  <PenTool className="w-4 h-4 text-indigo-500" />
                  <span>Add Digital Signature</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Right: Tools Dropdown, History, Zoom, Theme, Upload & Export  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {fileName ? (
          <>
            {/* Tools ▾ Menu */}
            <div ref={toolsMenuRef} className="relative">
              <button
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-sm"
                title="Document Surgery & Page Tools"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden md:inline">Tools</span>
                <ChevronDown className="w-3 h-3 text-zinc-500 opacity-70" />
              </button>

              {showToolsMenu && (
                <div className="absolute right-0 top-10 w-[490px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3.5 z-50 animate-popover max-h-[calc(100vh-4.2rem)] overflow-y-auto space-y-3 select-none">
                  
                  {/* Category 1: Page Surgery & Structure */}
                  <div>
                    <div className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Page Surgery & Structure
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          setActiveModal('organize');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">Organize Pages</div>
                          <div className="text-[10px] text-zinc-500">Reorder, rotate & delete</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('merge');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Combine className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors">Merge PDFs</div>
                          <div className="text-[10px] text-zinc-500">Combine multiple files</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('split');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Scissors className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 transition-colors">Split PDF</div>
                          <div className="text-[10px] text-zinc-500">Extract selected ranges</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('compress');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors">Compress PDF</div>
                          <div className="text-[10px] text-zinc-500">Reduce file size locally</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('pageNumbers');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group sm:col-span-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">Page Numbers & Headers</div>
                          <div className="text-[10px] text-zinc-500">Add dynamic pagination, Bates numbering & labels</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 dark:border-zinc-800" />

                  {/* Category 2: Conversions & Office */}
                  <div>
                    <div className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Conversions & Office Studio
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          setActiveModal('wordConverter');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <FileCode className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">Word (.docx) Studio</div>
                          <div className="text-[10px] text-zinc-500">Two-way PDF ↔ Word</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('ocr');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <ScanText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 transition-colors">OCR (Text Scan)</div>
                          <div className="text-[10px] text-zinc-500">Make scans searchable</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('pdfToImages');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">PDF to Images</div>
                          <div className="text-[10px] text-zinc-500">High-DPI PNG / JPG / ZIP</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('imagesToPdf');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <FileUp className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors">Images to PDF</div>
                          <div className="text-[10px] text-zinc-500">Convert JPG/PNG to PDF</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 dark:border-zinc-800" />

                  {/* Category 3: Intelligence & Security */}
                  <div>
                    <div className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Document Intelligence & Security
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          setActiveModal('pdfDiff');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <GitCompare className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">Visual Diff & Redline</div>
                          <div className="text-[10px] text-zinc-500">Compare 2 drafts with swipe</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('tableExtractor');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Table className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors">Smart Table to Excel</div>
                          <div className="text-[10px] text-zinc-500">Extract tables to .xlsx/CSV</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('formResponses');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 transition-colors">Form Data (JSON/CSV)</div>
                          <div className="text-[10px] text-zinc-500">Inspect & auto-fill data</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal('protect');
                          setShowToolsMenu(false);
                        }}
                        className="flex items-center gap-2.5 p-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">Protect & Password</div>
                          <div className="text-[10px] text-zinc-500">AES encryption & sanitize</div>
                        </div>
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={undo}
                disabled={undoStack.length === 0}
                className="p-1 sm:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={redo}
                disabled={redoStack.length === 0}
                className="p-1 sm:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
              <button
                onClick={() => setZoom(zoom - 0.1)}
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={() => setZoom(0.85)}
                className="px-1 text-center text-[10px] text-zinc-700 dark:text-zinc-300 font-medium hover:text-blue-500"
                title="Reset Zoom to Fit"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom(zoom + 0.1)}
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>

            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={toggleTheme}
              className="p-1 sm:p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors hidden sm:inline-flex"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-zinc-700" />}
            </button>

            {/* Open / Upload File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf"
              className="hidden"
            />
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 sm:p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hidden sm:inline-flex"
              title="Open Another PDF"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            {/* Export PDF Button (Always Visible, Full & Never Clipped) */}
            <button
              onClick={exportPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 shrink-0 min-w-fit"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden xs:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </>
              )}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            </button>
            <button
              onClick={loadSampleDocument}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sample Invoice</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PDF</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

