import React, { useEffect, useRef, useState } from 'react';
import { usePDFStore } from '../store/pdfStore';
import type { 
  TextAnnotation, 
  RectAnnotation, 
  FreehandHighlightAnnotation, 
  DrawAnnotation, 
  ShapeAnnotation, 
  SignatureAnnotation,
  ImageAnnotation,
  FormFieldAnnotation,
  ExtractedTextItem
} from '../types/pdf';
import { 
  Trash2, 
  Move, 
  Check, 
  RotateCcw,
  RotateCw,
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus, 
  Plus,
  Copy
} from 'lucide-react';

interface PageViewProps {
  pageNumber: number;
}

interface AlignmentGuide {
  type: 'x' | 'y';
  pos: number;
}

interface TextEditDraft {
  id: string;
  isAnnotation: boolean; // true = user-added text annotation, false = extracted PDF text item
  originalText: string;
  originalFontFamily: string;
  originalFontName?: string;
  originalFontSize: number;
  originalIsBold?: boolean;
  originalIsItalic?: boolean;
  originalIsUnderline?: boolean;
  originalAlign?: 'left' | 'center' | 'right';
  originalColor: string;
  originalWidth: number;
  originalDomX: number;
  originalDomY: number;

  // Working interactive draft state
  text: string;
  fontFamily: string;
  fontName?: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  align: 'left' | 'center' | 'right';
  color: string;
  width: number;
  domX: number;
  domY: number;
  height?: number;
}

export const PageView: React.FC<PageViewProps> = ({ pageNumber }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const {
    pdfDocProxy,
    pageDimensions,
    extractedTextByPage,
    textModifications,
    annotations,
    pageRotations,
    deletedPages,
    zoom,
    activeTool,
    drawColor,
    drawStrokeWidth,
    highlightColor,
    shapeType,
    selectedTextItemId,
    selectedAnnotationId,
    selectTextItem,
    selectAnnotation,
    updateTextItem,
    deleteTextItem,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = usePDFStore();

  // Deterministic Text Editing Session State
  const [textEditDraft, setTextEditDraft] = useState<TextEditDraft | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);

  // Active Alignment Guide lines (both Vertical & Horizontal)
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);

  // Unified Element Dragging State
  const [draggingItem, setDraggingItem] = useState<{
    type: 'annotation' | 'textItem' | 'drawing';
    id: string;
    startX: number;
    startY: number;
    initialDomX: number;
    initialDomY: number;
    initialPdfX?: number;
    initialPdfY?: number;
    width: number;
    height: number;
    initialPoints?: { x: number; y: number }[];
  } | null>(null);

  // Text Box Horizontal Resize Drag State
  const [resizingTextItem, setResizingTextItem] = useState<{
    id: string;
    isAnnotation: boolean;
    startX: number;
    initialWidth: number;
  } | null>(null);

  // Auto-straightening straight highlighter state
  const [isHighlightDrawing, setIsHighlightDrawing] = useState(false);
  const [highlightStart, setHighlightStart] = useState<{ x: number; y: number } | null>(null);
  const [highlightCurrent, setHighlightCurrent] = useState<{ x: number; y: number } | null>(null);

  // Drag-to-rect state for Whiteout and Redaction
  const [isRectDragging, setIsRectDragging] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [rectCurrent, setRectCurrent] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Freehand Pen Drawing state
  const [isPenDrawing, setIsPenDrawing] = useState(false);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);

  // Vector Shape Dragging state
  const [isShapeDragging, setIsShapeDragging] = useState(false);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const pageIndex = pageNumber - 1;
  const isDeleted = deletedPages.includes(pageIndex);
  const pageDim = pageDimensions.find(p => p.pageNumber === pageNumber);
  const rotation = pageRotations[pageIndex] || 0;

  // Helper to map PDF font names accurately to CSS font-family
  const getFontFamilyCss = (fontFamily?: string, fontName?: string) => {
    if (fontName) {
      const cleanFontName = fontName.replace(/^[A-Z]{6}\+/, '');
      if (cleanFontName) {
        if (/times|serif/i.test(cleanFontName)) return '"Times New Roman", Times, Georgia, serif';
        if (/courier|mono/i.test(cleanFontName)) return '"Courier New", Courier, monospace';
        if (/helvetica/i.test(cleanFontName)) return 'Helvetica, Arial, sans-serif';
        if (/arial/i.test(cleanFontName)) return 'Arial, Helvetica, sans-serif';
        if (/georgia/i.test(cleanFontName)) return 'Georgia, serif';
        if (/garamond/i.test(cleanFontName)) return 'Garamond, serif';
        if (/calibri/i.test(cleanFontName)) return 'Calibri, sans-serif';
        if (/roboto/i.test(cleanFontName)) return 'Roboto, sans-serif';
        return `"${cleanFontName}", sans-serif`;
      }
    }
    if (fontFamily === 'Times-Roman' || fontFamily === 'serif') return '"Times New Roman", Times, Georgia, serif';
    if (fontFamily === 'Courier' || fontFamily === 'monospace') return '"Courier New", Courier, monospace';
    if (fontFamily === 'Helvetica' || fontFamily === 'sans-serif') return 'Helvetica, Arial, sans-serif';
    return fontFamily || 'sans-serif';
  };

  // Render Canvas with exact 1:1 scale
  useEffect(() => {
    if (!pdfDocProxy || !canvasRef.current || isDeleted || !pageDim) return;

    let renderTask: any = null;
    let isCancelled = false;

    const render = async () => {
      try {
        const page = await pdfDocProxy.getPage(pageNumber);
        if (isCancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: zoom, rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.save();
        context.scale(outputScale, outputScale);

        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
        context.restore();
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Render error on page ${pageNumber}:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [pdfDocProxy, pageNumber, zoom, rotation, isDeleted, pageDim]);

  // Clean up any active text editing session when active tool changes away
  useEffect(() => {
    if (activeTool !== 'edit-text' && activeTool !== 'add-text' && activeTool !== 'select') {
      if (textEditDraft) {
        commitEditDraft();
      }
    }
  }, [activeTool]);

  if (isDeleted || !pageDim) return null;

  const textItems = extractedTextByPage[pageNumber] || [];
  const pageAnnotations = annotations.filter(a => a.pageIndex === pageIndex);

  // Scaled dimensions
  const isRotated90 = (rotation % 180) !== 0;
  const pageWidth = Math.floor((isRotated90 ? pageDim.height : pageDim.width) * zoom);
  const pageHeight = Math.floor((isRotated90 ? pageDim.width : pageDim.height) * zoom);

  const currentHighlightColor = highlightColor || '#fef08a';

  // Find nearest typography characteristics to inherit styling on "Add Text"
  const findNearestTypography = (clickX: number, clickY: number) => {
    let nearest: ExtractedTextItem | null = null;
    let minDistance = 250;

    for (const item of textItems) {
      if (item.isDeleted) continue;
      const dist = Math.hypot(item.domX - clickX, item.domY - clickY);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = item;
      }
    }

    if (nearest) {
      return {
        fontFamily: nearest.fontFamily || 'Helvetica',
        fontName: nearest.fontName,
        fontSize: nearest.fontSize || 14,
        color: nearest.color || '#000000',
        isBold: nearest.isBold || false,
        isItalic: nearest.isItalic || false,
        isUnderline: nearest.isUnderline || false,
      };
    }

    return {
      fontFamily: 'Helvetica',
      fontName: undefined,
      fontSize: 14,
      color: '#000000',
      isBold: false,
      isItalic: false,
      isUnderline: false,
    };
  };

  // =========================================================================
  // Text Editing Lifecycle State Machine (Start, Update, Commit, Discard)
  // =========================================================================
  const startEditingText = (item: ExtractedTextItem | TextAnnotation, isAnnotation: boolean) => {
    // If another editing session is currently active, commit it first cleanly
    if (textEditDraft && textEditDraft.id !== item.id) {
      commitEditDraft();
    }

    const draft: TextEditDraft = {
      id: item.id,
      isAnnotation,
      originalText: item.text,
      originalFontFamily: item.fontFamily || 'Helvetica',
      originalFontName: item.fontName,
      originalFontSize: item.fontSize || 12,
      originalIsBold: item.isBold || false,
      originalIsItalic: item.isItalic || false,
      originalIsUnderline: item.isUnderline || false,
      originalAlign: item.align || 'left',
      originalColor: item.color || '#000000',
      originalWidth: item.width || 120,
      originalDomX: item.domX,
      originalDomY: item.domY,

      text: item.text,
      fontFamily: item.fontFamily || 'Helvetica',
      fontName: item.fontName,
      fontSize: item.fontSize || 12,
      isBold: item.isBold || false,
      isItalic: item.isItalic || false,
      isUnderline: item.isUnderline || false,
      align: item.align || 'left',
      color: item.color || '#000000',
      width: item.width || 120,
      domX: item.domX,
      domY: item.domY,
      height: item.height || 20,
    };

    setTextEditDraft(draft);
    if (isAnnotation) {
      selectAnnotation(item.id);
      setEditingAnnotationId(item.id);
      setEditingItemId(null);
    } else {
      selectTextItem(item.id);
      setEditingItemId(item.id);
      setEditingAnnotationId(null);
    }
  };

  const updateDraft = (updates: Partial<TextEditDraft>) => {
    setTextEditDraft(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };

      // Apply live update to store for instant rendering feedback
      if (updated.isAnnotation) {
        updateAnnotation(updated.id, {
          text: updated.text,
          fontFamily: updated.fontFamily,
          fontName: updated.fontName,
          fontSize: updated.fontSize,
          isBold: updated.isBold,
          isItalic: updated.isItalic,
          isUnderline: updated.isUnderline,
          align: updated.align,
          color: updated.color,
          width: updated.width,
        });
      } else {
        updateTextItem(updated.id, {
          text: updated.text,
          fontFamily: updated.fontFamily,
          fontName: updated.fontName,
          fontSize: updated.fontSize,
          isBold: updated.isBold,
          isItalic: updated.isItalic,
          isUnderline: updated.isUnderline,
          align: updated.align,
          color: updated.color,
          width: updated.width,
          isModified: true,
        });
      }

      return updated;
    });
  };

  const commitEditDraft = () => {
    if (!textEditDraft) return;

    if (textEditDraft.isAnnotation) {
      updateAnnotation(textEditDraft.id, {
        text: textEditDraft.text,
        fontFamily: textEditDraft.fontFamily,
        fontName: textEditDraft.fontName,
        fontSize: textEditDraft.fontSize,
        isBold: textEditDraft.isBold,
        isItalic: textEditDraft.isItalic,
        isUnderline: textEditDraft.isUnderline,
        align: textEditDraft.align,
        color: textEditDraft.color,
        width: textEditDraft.width,
      });
    } else {
      updateTextItem(textEditDraft.id, {
        text: textEditDraft.text,
        fontFamily: textEditDraft.fontFamily,
        fontName: textEditDraft.fontName,
        fontSize: textEditDraft.fontSize,
        isBold: textEditDraft.isBold,
        isItalic: textEditDraft.isItalic,
        isUnderline: textEditDraft.isUnderline,
        align: textEditDraft.align,
        color: textEditDraft.color,
        width: textEditDraft.width,
        isModified: true,
      });
    }

    // Completely clear editing session and active selection so toolbar vanishes instantly
    setTextEditDraft(null);
    setEditingItemId(null);
    setEditingAnnotationId(null);
    selectTextItem(null);
    selectAnnotation(null);
  };

  const discardEditDraft = () => {
    if (!textEditDraft) return;

    // Rollback store properties to original snapshot
    if (textEditDraft.isAnnotation) {
      updateAnnotation(textEditDraft.id, {
        text: textEditDraft.originalText,
        fontFamily: textEditDraft.originalFontFamily,
        fontName: textEditDraft.originalFontName,
        fontSize: textEditDraft.originalFontSize,
        isBold: textEditDraft.originalIsBold,
        isItalic: textEditDraft.originalIsItalic,
        isUnderline: textEditDraft.originalIsUnderline,
        align: textEditDraft.originalAlign || 'left',
        color: textEditDraft.originalColor,
        width: textEditDraft.originalWidth,
      });
    } else {
      updateTextItem(textEditDraft.id, {
        text: textEditDraft.originalText,
        fontFamily: textEditDraft.originalFontFamily,
        fontName: textEditDraft.originalFontName,
        fontSize: textEditDraft.originalFontSize,
        isBold: textEditDraft.originalIsBold,
        isItalic: textEditDraft.originalIsItalic,
        isUnderline: textEditDraft.originalIsUnderline,
        align: textEditDraft.originalAlign,
        color: textEditDraft.originalColor,
        width: textEditDraft.originalWidth,
        isModified: false,
      });
    }

    // Completely clear editing session and active selection so toolbar vanishes instantly
    setTextEditDraft(null);
    setEditingItemId(null);
    setEditingAnnotationId(null);
    selectTextItem(null);
    selectAnnotation(null);
  };

  // Drag Initializer
  const startDrag = (
    e: React.MouseEvent,
    type: 'annotation' | 'textItem' | 'drawing',
    id: string,
    initialData: { domX?: number; domY?: number; x?: number; y?: number; width?: number; height?: number; points?: { x: number; y: number }[] }
  ) => {
    e.stopPropagation();
    if (type === 'annotation' || type === 'drawing') selectAnnotation(id);
    if (type === 'textItem') selectTextItem(id);

    setDraggingItem({
      type,
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialDomX: initialData.domX || 0,
      initialDomY: initialData.domY || 0,
      initialPdfX: initialData.x,
      initialPdfY: initialData.y,
      width: initialData.width || 80,
      height: initialData.height || 20,
      initialPoints: initialData.points ? [...initialData.points] : undefined,
    });
  };

  // Mouse Down handler on Page Canvas
  const handlePageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingItem || resizingTextItem) return;

    const rect = pageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickDomX = (e.clientX - rect.left) / zoom;
    const clickDomY = (e.clientY - rect.top) / zoom;

    if (activeTool === 'highlight') {
      const hitItem = textItems.find(item => 
        clickDomX >= (item.domX - 8) && 
        clickDomX <= (item.domX + item.width + 8) &&
        clickDomY >= (item.domY - 4) && 
        clickDomY <= (item.domY + item.height + 4)
      );

      const startY = hitItem ? (hitItem.domY + hitItem.height / 2) : clickDomY;

      setIsHighlightDrawing(true);
      setHighlightStart({ x: clickDomX, y: startY });
      setHighlightCurrent({ x: clickDomX, y: startY });
    } else if (activeTool === 'draw') {
      setIsPenDrawing(true);
      setPenPoints([{ x: Math.round(clickDomX), y: Math.round(clickDomY) }]);
    } else if (activeTool === 'shape') {
      setIsShapeDragging(true);
      setShapeStart({ x: clickDomX, y: clickDomY });
      setShapeCurrent({ x: clickDomX, y: clickDomY, width: 0, height: 0 });
    } else if (activeTool === 'whiteout' || activeTool === 'redact') {
      setIsRectDragging(true);
      setRectStart({ x: clickDomX, y: clickDomY });
      setRectCurrent({ x: clickDomX, y: clickDomY, width: 0, height: 0 });
    } else if (activeTool === 'add-text' || activeTool === 'text') {
      // Inherit typography from surrounding text context
      const inherited = findNearestTypography(clickDomX, clickDomY);
      const newId = `ann-text-${Date.now()}`;
      const newAnn: TextAnnotation = {
        id: newId,
        type: 'text',
        pageIndex,
        x: clickDomX,
        y: pageDim.height - clickDomY - inherited.fontSize,
        domX: Math.round(clickDomX),
        domY: Math.round(clickDomY),
        width: 160,
        height: Math.round(inherited.fontSize * 1.5),
        text: 'Type text here',
        fontSize: inherited.fontSize,
        fontFamily: inherited.fontFamily,
        fontName: inherited.fontName,
        color: inherited.color,
        backgroundColor: undefined,
        isBold: inherited.isBold,
        isItalic: inherited.isItalic,
        isUnderline: inherited.isUnderline,
        align: 'left',
      };
      addAnnotation(newAnn);
      startEditingText(newAnn, true);
    } else if (activeTool === 'form-field') {
      const newId = `form-${Date.now()}`;
      const newAnn: FormFieldAnnotation = {
        id: newId,
        type: 'form-field',
        pageIndex,
        fieldType: 'text',
        name: `field_${Date.now().toString().slice(-4)}`,
        value: '',
        placeholder: 'Type here...',
        domX: Math.round(clickDomX),
        domY: Math.round(clickDomY),
        width: 140,
        height: 28,
        fontSize: 12,
        color: '#0f172a',
        borderColor: '#3b82f6',
        backgroundColor: '#ffffff',
      };
      addAnnotation(newAnn);
      selectAnnotation(newId);
    } else if (activeTool === 'select' || activeTool === 'edit-text') {
      // Clicked on empty canvas space: cleanly commit active draft & clear selection
      commitEditDraft();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = pageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Handle Active Text Box Width Resizing
    if (resizingTextItem) {
      const deltaX = (e.clientX - resizingTextItem.startX) / zoom;
      const newWidth = Math.max(40, Math.round(resizingTextItem.initialWidth + deltaX));
      if (resizingTextItem.isAnnotation) {
        updateAnnotation(resizingTextItem.id, { width: newWidth });
      } else {
        updateTextItem(resizingTextItem.id, { width: newWidth });
      }
      if (textEditDraft && textEditDraft.id === resizingTextItem.id) {
        setTextEditDraft(prev => prev ? { ...prev, width: newWidth } : null);
      }
      return;
    }

    // Handle Active Dragging of Elements with Full Horizontal & Vertical Alignment Snapping
    if (draggingItem) {
      const deltaX = (e.clientX - draggingItem.startX) / zoom;
      const deltaY = (e.clientY - draggingItem.startY) / zoom;

      let rawDomX = draggingItem.initialDomX + deltaX;
      let rawDomY = draggingItem.initialDomY + deltaY;

      const w = draggingItem.width || 60;
      const h = draggingItem.height || 20;

      // Smart Snapping Guides Calculation (Both Vertical X-guides & Horizontal Y-guides)
      const guides: AlignmentGuide[] = [];
      const snapThreshold = 5.0; // in unzoomed points

      // 1. Page Center Alignment Checks
      const pageCenterX = pageDim.width / 2;
      const pageCenterY = pageDim.height / 2;

      // Vertical guides (X-axis)
      if (Math.abs((rawDomX + w / 2) - pageCenterX) < snapThreshold) {
        rawDomX = pageCenterX - w / 2;
        guides.push({ type: 'x', pos: pageCenterX });
      } else if (Math.abs(rawDomX - pageCenterX) < snapThreshold) {
        rawDomX = pageCenterX;
        guides.push({ type: 'x', pos: pageCenterX });
      } else if (Math.abs((rawDomX + w) - pageCenterX) < snapThreshold) {
        rawDomX = pageCenterX - w;
        guides.push({ type: 'x', pos: pageCenterX });
      }

      // Horizontal guides (Y-axis)
      if (Math.abs((rawDomY + h / 2) - pageCenterY) < snapThreshold) {
        rawDomY = pageCenterY - h / 2;
        guides.push({ type: 'y', pos: pageCenterY });
      } else if (Math.abs(rawDomY - pageCenterY) < snapThreshold) {
        rawDomY = pageCenterY;
        guides.push({ type: 'y', pos: pageCenterY });
      } else if (Math.abs((rawDomY + h) - pageCenterY) < snapThreshold) {
        rawDomY = pageCenterY - h;
        guides.push({ type: 'y', pos: pageCenterY });
      }

      // 2. Alignment with all other text items and annotations on this page
      for (const item of textItems) {
        if (item.id === draggingItem.id || item.isDeleted) continue;
        const itemW = item.width || 50;
        const itemH = item.height || 16;

        // Vertical Guide alignments (Left, Center, Right)
        if (Math.abs(rawDomX - item.domX) < snapThreshold) {
          rawDomX = item.domX;
          guides.push({ type: 'x', pos: item.domX });
        } else if (Math.abs((rawDomX + w) - (item.domX + itemW)) < snapThreshold) {
          rawDomX = item.domX + itemW - w;
          guides.push({ type: 'x', pos: item.domX + itemW });
        } else if (Math.abs((rawDomX + w / 2) - (item.domX + itemW / 2)) < snapThreshold) {
          rawDomX = item.domX + itemW / 2 - w / 2;
          guides.push({ type: 'x', pos: item.domX + itemW / 2 });
        }

        // Horizontal Guide alignments (Top, Center, Bottom)
        if (Math.abs(rawDomY - item.domY) < snapThreshold) {
          rawDomY = item.domY;
          guides.push({ type: 'y', pos: item.domY });
        } else if (Math.abs((rawDomY + h) - (item.domY + itemH)) < snapThreshold) {
          rawDomY = item.domY + itemH - h;
          guides.push({ type: 'y', pos: item.domY + itemH });
        } else if (Math.abs((rawDomY + h / 2) - (item.domY + itemH / 2)) < snapThreshold) {
          rawDomY = item.domY + itemH / 2 - h / 2;
          guides.push({ type: 'y', pos: item.domY + itemH / 2 });
        }
      }

      for (const ann of pageAnnotations) {
        if (ann.id === draggingItem.id) continue;
        if (!('domX' in ann) || !('domY' in ann)) continue;
        const domAnn = ann as { domX: number; domY: number; width?: number; height?: number };
        const annW = domAnn.width || 50;
        const annH = domAnn.height || 16;

        if (Math.abs(rawDomX - domAnn.domX) < snapThreshold) {
          rawDomX = domAnn.domX;
          guides.push({ type: 'x', pos: domAnn.domX });
        } else if (Math.abs((rawDomX + w / 2) - (domAnn.domX + annW / 2)) < snapThreshold) {
          rawDomX = domAnn.domX + annW / 2 - w / 2;
          guides.push({ type: 'x', pos: domAnn.domX + annW / 2 });
        }

        if (Math.abs(rawDomY - domAnn.domY) < snapThreshold) {
          rawDomY = domAnn.domY;
          guides.push({ type: 'y', pos: domAnn.domY });
        } else if (Math.abs((rawDomY + h / 2) - (domAnn.domY + annH / 2)) < snapThreshold) {
          rawDomY = domAnn.domY + annH / 2 - h / 2;
          guides.push({ type: 'y', pos: domAnn.domY + annH / 2 });
        }
      }

      setActiveGuides(guides);

      if (draggingItem.type === 'annotation') {
        const nextDomX = Math.max(0, Math.min(pageDim.width - 10, rawDomX));
        const nextDomY = Math.max(0, Math.min(pageDim.height - 10, rawDomY));
        updateAnnotation(draggingItem.id, {
          domX: Math.round(nextDomX),
          domY: Math.round(nextDomY),
        });
        if (textEditDraft && textEditDraft.id === draggingItem.id) {
          setTextEditDraft(prev => prev ? { ...prev, domX: Math.round(nextDomX), domY: Math.round(nextDomY) } : null);
        }
      } else if (draggingItem.type === 'textItem') {
        const nextDomX = Math.max(0, Math.min(pageDim.width - 10, rawDomX));
        const nextDomY = Math.max(0, Math.min(pageDim.height - 10, rawDomY));
        const nextPdfX = (draggingItem.initialPdfX || 0) + (nextDomX - draggingItem.initialDomX);
        const nextPdfY = (draggingItem.initialPdfY || 0) - (nextDomY - draggingItem.initialDomY);
        updateTextItem(draggingItem.id, {
          domX: Math.round(nextDomX),
          domY: Math.round(nextDomY),
          x: Math.round(nextPdfX * 10) / 10,
          y: Math.round(nextPdfY * 10) / 10,
        });
        if (textEditDraft && textEditDraft.id === draggingItem.id) {
          setTextEditDraft(prev => prev ? { ...prev, domX: Math.round(nextDomX), domY: Math.round(nextDomY) } : null);
        }
      } else if (draggingItem.type === 'drawing' && draggingItem.initialPoints) {
        const translatedPoints = draggingItem.initialPoints.map(p => ({
          x: Math.round(p.x + deltaX),
          y: Math.round(p.y + deltaY),
        }));
        updateAnnotation(draggingItem.id, {
          points: translatedPoints,
        });
      }
      return;
    }

    // Handle Freehand Pen Drawing
    if (isPenDrawing) {
      const currentX = (e.clientX - rect.left) / zoom;
      const currentY = (e.clientY - rect.top) / zoom;
      setPenPoints(prev => [...prev, { x: Math.round(currentX), y: Math.round(currentY) }]);
      return;
    }

    // Handle Vector Shape Dragging
    if (isShapeDragging && shapeStart) {
      const currentX = (e.clientX - rect.left) / zoom;
      const currentY = (e.clientY - rect.top) / zoom;

      const minX = Math.min(shapeStart.x, currentX);
      const minY = Math.min(shapeStart.y, currentY);
      const width = Math.abs(currentX - shapeStart.x);
      const height = Math.abs(currentY - shapeStart.y);

      setShapeCurrent({ x: minX, y: minY, width, height });
      return;
    }

    // Handle auto-straightening highlighter drag
    if (isHighlightDrawing && highlightStart) {
      const currentX = (e.clientX - rect.left) / zoom;

      const hitItem = textItems.find(item => 
        currentX >= (item.domX - 8) && 
        currentX <= (item.domX + item.width + 8) &&
        Math.abs(highlightStart.y - (item.domY + item.height / 2)) < 12
      );

      const lockedY = hitItem ? (hitItem.domY + hitItem.height / 2) : highlightStart.y;

      setHighlightCurrent({ x: currentX, y: lockedY });
      return;
    }

    // Handle drag for Whiteout / Redact
    if (isRectDragging && rectStart) {
      const currentX = (e.clientX - rect.left) / zoom;
      const currentY = (e.clientY - rect.top) / zoom;

      const minX = Math.min(rectStart.x, currentX);
      const minY = Math.min(rectStart.y, currentY);
      const width = Math.abs(currentX - rectStart.x);
      const height = Math.abs(currentY - rectStart.y);

      setRectCurrent({ x: minX, y: minY, width, height });
      return;
    }
  };

  const handleMouseUp = () => {
    // Release Text Resizing
    if (resizingTextItem) {
      setResizingTextItem(null);
    }

    // Release Dragging & Clear Guides
    if (draggingItem) {
      setDraggingItem(null);
      setActiveGuides([]);
    }

    // Freehand Pen Up
    if (isPenDrawing && penPoints.length > 1) {
      const newAnn: DrawAnnotation = {
        id: `ann-draw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'draw',
        pageIndex,
        points: penPoints,
        color: drawColor || '#2563eb',
        strokeWidth: drawStrokeWidth || 3,
        opacity: 1.0,
      };
      addAnnotation(newAnn);
      setIsPenDrawing(false);
      setPenPoints([]);
    }

    // Vector Shape Up
    if (isShapeDragging && shapeCurrent) {
      if (shapeCurrent.width > 4 && shapeCurrent.height > 4) {
        const newAnn: ShapeAnnotation = {
          id: `ann-shape-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'shape',
          shapeType: shapeType || 'rectangle',
          pageIndex,
          domX: Math.round(shapeCurrent.x),
          domY: Math.round(shapeCurrent.y),
          width: Math.round(shapeCurrent.width),
          height: Math.round(shapeCurrent.height),
          strokeColor: drawColor || '#2563eb',
          fillColor: undefined,
          strokeWidth: drawStrokeWidth || 2,
          opacity: 1.0,
        };
        addAnnotation(newAnn);
      }
      setIsShapeDragging(false);
      setShapeStart(null);
      setShapeCurrent(null);
    }

    if (isHighlightDrawing && highlightStart && highlightCurrent) {
      const minX = Math.min(highlightStart.x, highlightCurrent.x);
      const maxX = Math.max(highlightStart.x, highlightCurrent.x);
      const strokeY = highlightStart.y;

      if ((maxX - minX) > 4) {
        const newAnn: FreehandHighlightAnnotation = {
          id: `ann-freehand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'freehand-highlight',
          pageIndex,
          points: [
            { x: Math.round(minX), y: Math.round(strokeY) },
            { x: Math.round(maxX), y: Math.round(strokeY) },
          ],
          color: currentHighlightColor,
          strokeWidth: 16,
          opacity: 0.55,
        };
        addAnnotation(newAnn);
      }
      setIsHighlightDrawing(false);
      setHighlightStart(null);
      setHighlightCurrent(null);
    }

    if (isRectDragging && rectCurrent) {
      if (rectCurrent.width > 4 && rectCurrent.height > 4) {
        const isRedact = activeTool === 'redact';
        const newAnn: RectAnnotation = {
          id: `ann-${isRedact ? 'redact' : 'whiteout'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: isRedact ? 'redact' : 'whiteout',
          pageIndex,
          domX: Math.round(rectCurrent.x),
          domY: Math.round(rectCurrent.y),
          width: Math.round(rectCurrent.width),
          height: Math.round(rectCurrent.height),
          color: isRedact ? '#000000' : '#ffffff',
          opacity: 1.0,
        };
        addAnnotation(newAnn);
      }
      setIsRectDragging(false);
      setRectStart(null);
      setRectCurrent(null);
    }
  };

  // =========================================================================
  // The Authoritative Contextual Rich Text Toolbar (Theme-Aware & Compact)
  // =========================================================================
  const renderRichTextToolbar = (
    itemData: TextEditDraft,
    isAddedText: boolean,
    onUpdate: (updates: Partial<TextEditDraft>) => void,
    onDelete: () => void,
    onDone: () => void,
    onDiscard: () => void
  ) => {
    const itemLeft = itemData.domX * zoom;
    const itemTop = itemData.domY * zoom;
    const itemWidth = (itemData.width || 80) * zoom;
    const itemHeight = (itemData.height || 20) * zoom;

    // Compact toolbar dimensions (~340px)
    const toolbarWidth = 345;
    const toolbarHeight = 36;

    // Horizontally center over text element, clamped securely inside [10, pageWidth - toolbarWidth - 10]
    const idealLeft = itemLeft + (itemWidth / 2) - (toolbarWidth / 2);
    const clampedLeft = Math.max(10, Math.min(pageWidth - toolbarWidth - 10, idealLeft));

    // Vertically: if enough room above, place above; otherwise place below
    const hasSpaceAbove = itemTop >= (toolbarHeight + 12);
    const clampedTop = hasSpaceAbove 
      ? Math.max(6, itemTop - toolbarHeight - 6)
      : Math.min(pageHeight - toolbarHeight - 6, itemTop + itemHeight + 6);

    const colors = ['#000000', '#2563eb', '#dc2626', '#16a34a', '#ffffff'];
    const cleanFontName = itemData.fontName ? itemData.fontName.replace(/^[A-Z]{6}\+/, '') : undefined;

    return (
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: `${clampedLeft}px`,
          top: `${clampedTop}px`,
        }}
        className="pointer-events-auto flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg px-2 py-1 shadow-2xl text-[11px] font-sans z-50 select-none animate-fade-in w-max flex-nowrap shrink-0"
      >
        {/* Drag / Move Handle */}
        <div
          onMouseDown={(e) => startDrag(
            e, 
            isAddedText ? 'annotation' : 'textItem', 
            itemData.id, 
            { 
              domX: itemData.domX, 
              domY: itemData.domY,
              width: itemData.width || 80,
              height: itemData.height || 20
            }
          )}
          className="flex items-center gap-0.5 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-grab active:cursor-grabbing text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shrink-0"
          title="Drag to reposition text"
        >
          <Move className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono font-medium hidden sm:inline">Move</span>
        </div>

        <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-700 mx-0.5 shrink-0" />

        {/* Font Family Selector */}
        <select
          value={itemData.fontFamily || 'Helvetica'}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[10px] rounded px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 outline-none cursor-pointer font-medium max-w-[105px] truncate shrink-0"
        >
          {cleanFontName && (
            <option value={itemData.fontFamily}>Original ({cleanFontName})</option>
          )}
          <option value="Helvetica">Sans-Serif (Helvetica)</option>
          <option value="Times-Roman">Serif (Times)</option>
          <option value="Courier">Monospace (Courier)</option>
        </select>

        {/* Font Size Steppers */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-300 dark:border-zinc-700 px-0.5 shrink-0">
          <button
            onClick={() => onUpdate({ fontSize: Math.max(6, Math.round(itemData.fontSize - 1)) })}
            className="px-1 py-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300"
            title="Decrease size"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span className="font-mono text-[10px] px-1 font-bold min-w-[18px] text-center text-zinc-800 dark:text-zinc-200">
            {Math.round(itemData.fontSize)}
          </span>
          <button
            onClick={() => onUpdate({ fontSize: Math.min(72, Math.round(itemData.fontSize + 1)) })}
            className="px-1 py-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300"
            title="Increase size"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Bold, Italic, Underline */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onUpdate({ isBold: !itemData.isBold })}
            className={`p-1 rounded transition-colors ${itemData.isBold ? 'bg-blue-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}`}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold className="w-3 h-3" />
          </button>
          <button
            onClick={() => onUpdate({ isItalic: !itemData.isItalic })}
            className={`p-1 rounded transition-colors ${itemData.isItalic ? 'bg-blue-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}`}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic className="w-3 h-3" />
          </button>
          <button
            onClick={() => onUpdate({ isUnderline: !itemData.isUnderline })}
            className={`p-1 rounded transition-colors ${itemData.isUnderline ? 'bg-blue-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}`}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
          >
            <Underline className="w-3 h-3" />
          </button>
        </div>

        <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-700 mx-0.5 shrink-0" />

        {/* Text Alignment */}
        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded p-0.5 border border-zinc-300 dark:border-zinc-700 shrink-0">
          <button
            onClick={() => onUpdate({ align: 'left' })}
            className={`p-0.5 rounded ${itemData.align === 'left' || !itemData.align ? 'bg-blue-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            title="Align Left"
            aria-label="Align Left"
          >
            <AlignLeft className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => onUpdate({ align: 'center' })}
            className={`p-0.5 rounded ${itemData.align === 'center' ? 'bg-blue-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            title="Align Center"
            aria-label="Align Center"
          >
            <AlignCenter className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => onUpdate({ align: 'right' })}
            className={`p-0.5 rounded ${itemData.align === 'right' ? 'bg-blue-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            title="Align Right"
            aria-label="Align Right"
          >
            <AlignRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Color Palette Dots */}
        <div className="flex items-center gap-1 px-0.5 shrink-0">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ color: c })}
              style={{ backgroundColor: c }}
              className={`w-3 h-3 rounded-full border border-zinc-400 dark:border-zinc-600 transition-transform ${
                (itemData.color || '#000000') === c ? 'scale-125 ring-1.5 ring-blue-500' : 'hover:scale-110'
              }`}
              title={`Color ${c}`}
            />
          ))}
          {/* Custom Hex Color Picker */}
          <label className="w-3 h-3 rounded-full border border-dashed border-zinc-400 dark:border-zinc-500 flex items-center justify-center cursor-pointer relative overflow-hidden shrink-0" title="Custom Color">
            <input
              type="color"
              value={itemData.color || '#000000'}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="opacity-0 absolute inset-0 cursor-pointer"
            />
            <span className="text-[7px] font-bold text-zinc-500 dark:text-zinc-400 leading-none">+</span>
          </label>
        </div>

        <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-700 mx-0.5 shrink-0" />

        {/* Done / Commit Icon Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
          className="flex items-center justify-center w-6 h-6 bg-blue-600 hover:bg-blue-500 rounded text-white shadow-sm transition-transform active:scale-90 shrink-0"
          title="Done / Save changes (Ctrl+Enter)"
          aria-label="Done"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        {/* Discard / Revert Icon Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDiscard();
          }}
          className="flex items-center justify-center w-6 h-6 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-zinc-700 transition-transform active:scale-90 shrink-0"
          title="Discard changes (Escape)"
          aria-label="Discard changes"
        >
          <RotateCcw className="w-3 h-3" />
        </button>

        {/* Delete Icon Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center justify-center w-6 h-6 hover:bg-red-100 dark:hover:bg-red-950/60 rounded text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors shrink-0"
          title="Delete text element (Delete)"
          aria-label="Delete text element"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div 
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      className="relative my-4 flex flex-col items-center select-none"
    >
      {/* Page Info Header */}
      <div className="w-full flex items-center justify-between px-1 mb-1 text-[11px] font-mono text-zinc-500">
        <span className="font-semibold text-zinc-700 dark:text-zinc-400">PAGE {pageNumber}</span>
        <span>{Math.round(pageDim.width)} × {Math.round(pageDim.height)} pt</span>
      </div>

      {/* Main Page Canvas Container */}
      <div
        ref={pageContainerRef}
        onMouseDown={handlePageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              const img = new Image();
              img.onload = () => {
                const rect = pageContainerRef.current?.getBoundingClientRect();
                const mouseX = rect ? (e.clientX - rect.left) / zoom : 50;
                const mouseY = rect ? (e.clientY - rect.top) / zoom : 50;
                const maxDim = 180;
                const naturalW = img.naturalWidth || 180;
                const naturalH = img.naturalHeight || 180;
                const scale = Math.min(maxDim / naturalW, maxDim / naturalH, 1.0);
                const w = Math.round(naturalW * scale);
                const h = Math.round(naturalH * scale);

                const newImageAnn: ImageAnnotation = {
                  id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  type: 'image',
                  pageIndex,
                  domX: Math.max(0, Math.round(mouseX - w / 2)),
                  domY: Math.max(0, Math.round(mouseY - h / 2)),
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
        }}
        style={{
          width: `${pageWidth}px`,
          height: `${pageHeight}px`,
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.08)',
        }}
        className="relative bg-white border border-zinc-200 dark:border-zinc-800 rounded-[2px] transition-shadow hover:shadow-xl select-none"
      >
        {/* Layer 1: Raster Canvas Layer */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block pointer-events-none z-10"
        />

        {/* Layer 2: Vector Drawing & SVG Annotations Overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
          style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}
        >
          {/* Dynamic Smart Alignment Guides (Both Horizontal and Vertical) */}
          {activeGuides.map((guide, idx) => (
            guide.type === 'x' ? (
              <line
                key={`guide-x-${idx}`}
                x1={guide.pos * zoom}
                y1={0}
                x2={guide.pos * zoom}
                y2={pageHeight}
                stroke="#06b6d4"
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.9}
              />
            ) : (
              <line
                key={`guide-y-${idx}`}
                x1={0}
                y1={guide.pos * zoom}
                x2={pageWidth}
                y2={guide.pos * zoom}
                stroke="#06b6d4"
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.9}
              />
            )
          ))}

          {/* Highlights */}
          {pageAnnotations.map((ann) => {
            if (ann.type === 'freehand-highlight') {
              const isSelected = selectedAnnotationId === ann.id;
              if (ann.points.length < 2) return null;
              return (
                <g key={ann.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); selectAnnotation(ann.id); }}>
                  <polyline
                    points={ann.points.map(p => `${p.x * zoom},${p.y * zoom}`).join(' ')}
                    fill="none"
                    stroke={ann.color || '#fef08a'}
                    strokeWidth={(ann.strokeWidth || 16) * zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.55}
                    style={{ mixBlendMode: 'multiply' }}
                    className={isSelected ? 'stroke-blue-400' : ''}
                  />
                </g>
              );
            }
            if (ann.type === 'draw') {
              const isSelected = selectedAnnotationId === ann.id;
              if (!isSelected || ann.points.length < 2) return null;
              return (
                <g key={ann.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); selectAnnotation(ann.id); }}>
                  <polyline
                    points={ann.points.map(p => `${p.x * zoom},${p.y * zoom}`).join(' ')}
                    fill="none"
                    stroke={ann.color || '#2563eb'}
                    strokeWidth={(ann.strokeWidth || 3) * zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={1.0}
                    className={isSelected ? 'filter drop-shadow-md' : ''}
                  />
                </g>
              );
            }
            return null;
          })}

          {/* Active Live Highlight Stroke */}
          {isHighlightDrawing && highlightStart && highlightCurrent && (
            <line
              x1={highlightStart.x * zoom}
              y1={highlightStart.y * zoom}
              x2={highlightCurrent.x * zoom}
              y2={highlightCurrent.y * zoom}
              stroke={currentHighlightColor}
              strokeWidth={16 * zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.65}
              style={{ mixBlendMode: 'multiply' }}
            />
          )}

          {/* Active Live Freehand Pen Drawing Stroke */}
          {isPenDrawing && penPoints.length > 1 && (
            <polyline
              points={penPoints.map(p => `${p.x * zoom},${p.y * zoom}`).join(' ')}
              fill="none"
              stroke={drawColor || '#2563eb'}
              strokeWidth={(drawStrokeWidth || 3) * zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          )}

          {/* Active Live Vector Shape Dragging Preview */}
          {isShapeDragging && shapeCurrent && (
            <rect
              x={shapeCurrent.x * zoom}
              y={shapeCurrent.y * zoom}
              width={shapeCurrent.width * zoom}
              height={shapeCurrent.height * zoom}
              fill="rgba(37, 99, 235, 0.08)"
              stroke="#2563eb"
              strokeWidth={2 * zoom}
              strokeDasharray="4 3"
              rx={2}
            />
          )}
        </svg>

        {/* Layer 3: Annotations Layer (Shapes, Whiteouts, Redactions, Text, Signatures) */}
        <div className="absolute inset-0 overflow-visible pointer-events-auto z-25">
          {pageAnnotations.map((ann) => {
            if (ann.type === 'freehand-highlight') return null;

            // Freehand Drawing HUD & Dragging
            if (ann.type === 'draw') {
              const isSelected = selectedAnnotationId === ann.id;
              if (!isSelected || ann.points.length === 0) return null;
              const firstPt = ann.points[0];
              return (
                <div
                  key={`hud-${ann.id}`}
                  style={{
                    left: `${firstPt.x * zoom}px`,
                    top: `${Math.max(0, firstPt.y * zoom - 30)}px`,
                  }}
                  className="absolute flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2 py-0.5 shadow-2xl text-[10px] z-50 pointer-events-auto select-none"
                >
                  <div
                    onMouseDown={(e) => startDrag(e, 'drawing', ann.id, { points: ann.points })}
                    className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-white"
                    title="Drag drawing"
                  >
                    <Move className="w-3 h-3" />
                    <span className="font-mono">Move Drawing</span>
                  </div>
                  <div className="w-[1px] h-3 bg-zinc-700" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnotation(ann.id);
                    }}
                    className="text-red-400 hover:text-red-300 ml-0.5"
                    title="Delete drawing"
                  >
                    <Trash2 className="w-3 h-3 inline" />
                  </button>
                </div>
              );
            }

            const isSelected = selectedAnnotationId === ann.id;
            const annLeft = ann.domX * zoom;
            const annTop = ann.domY * zoom;
            const annWidth = (ann.width || 80) * zoom;
            const annHeight = (ann.height || 20) * zoom;

            if (ann.type === 'highlight') {
              return (
                <div
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAnnotation(ann.id);
                  }}
                  style={{
                    left: `${annLeft}px`,
                    top: `${annTop}px`,
                    width: `${annWidth}px`,
                    height: `${annHeight}px`,
                    backgroundColor: ann.color,
                    opacity: 0.55,
                    mixBlendMode: 'multiply',
                  }}
                  className={`absolute rounded-[3px] cursor-pointer group transition-all ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:brightness-95'
                  }`}
                  title="Highlight"
                >
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnnotation(ann.id);
                      }}
                      className="absolute -top-6 right-0 p-1 bg-red-600 text-white rounded text-[10px] shadow-lg hover:bg-red-500 z-50 flex items-center gap-1 font-sans font-medium"
                      title="Remove Highlight"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              );
            } else if (ann.type === 'whiteout') {
              return (
                <div
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAnnotation(ann.id);
                  }}
                  style={{
                    left: `${annLeft}px`,
                    top: `${annTop}px`,
                    width: `${annWidth}px`,
                    height: `${annHeight}px`,
                    backgroundColor: '#ffffff',
                  }}
                  className={`absolute rounded-[1px] transition-all group flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:ring-1 hover:ring-blue-300'
                  }`}
                  title="Whiteout Cover"
                >
                  {isSelected && (
                    <div className="absolute -top-6 right-0 flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-0.5 shadow-xl text-[10px] font-mono z-50">
                      <div
                        onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                        className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-white"
                        title="Drag to reposition"
                      >
                        <Move className="w-3 h-3 inline" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                        className="text-red-400 hover:text-red-300 ml-1"
                        title="Delete Whiteout"
                      >
                        <Trash2 className="w-3 h-3 inline" />
                      </button>
                    </div>
                  )}
                </div>
              );
            } else if (ann.type === 'redact') {
              return (
                <div
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAnnotation(ann.id);
                  }}
                  style={{
                    left: `${annLeft}px`,
                    top: `${annTop}px`,
                    width: `${annWidth}px`,
                    height: `${annHeight}px`,
                    backgroundColor: '#000000',
                  }}
                  className={`absolute rounded-[1px] transition-all group flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-red-500 shadow-xl' : 'hover:ring-1 hover:ring-red-400'
                  }`}
                  title="Redacted Confidential Content"
                >
                  {isSelected && (
                    <div className="absolute -top-6 right-0 flex items-center gap-1.5 bg-red-950 border border-red-800 text-white rounded px-2 py-0.5 shadow-xl text-[10px] font-mono z-50">
                      <span className="text-red-300 font-bold uppercase tracking-wider">REDACTION</span>
                      <div
                        onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                        className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-white"
                        title="Drag to reposition"
                      >
                        <Move className="w-3 h-3 inline" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                        className="text-red-400 hover:text-red-300 ml-1"
                        title="Delete Redaction"
                      >
                        <Trash2 className="w-3 h-3 inline" />
                      </button>
                    </div>
                  )}
                </div>
              );
            } else if (ann.type === 'text') {
              const textAnn = ann as TextAnnotation;
              const isEditing = editingAnnotationId === ann.id;
              const fontSize = (textAnn.fontSize || 14) * zoom;
              const fontCss = getFontFamilyCss(textAnn.fontFamily, textAnn.fontName);
              const lines = (textAnn.text || '').split('\n');

              return (
                <div
                  key={ann.id}
                  style={{
                    left: `${annLeft}px`,
                    top: `${annTop}px`,
                    zIndex: isEditing ? 60 : isSelected ? 50 : 25,
                    width: textAnn.width ? `${textAnn.width * zoom}px` : 'auto',
                    minWidth: `${Math.max(60, (textAnn.width || 120) * zoom)}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isEditing) {
                      selectAnnotation(ann.id);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditingText(textAnn, true);
                  }}
                  className={`absolute rounded transition-all select-none group/addedtext ${
                    isEditing 
                      ? 'ring-2 ring-blue-600 shadow-2xl bg-transparent' 
                      : isSelected 
                      ? 'ring-1.5 ring-blue-500 shadow-md bg-blue-500/5' 
                      : 'hover:ring-1 hover:ring-blue-400 bg-transparent'
                  }`}
                >
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={textEditDraft?.text ?? textAnn.text}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateDraft({ text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            commitEditDraft();
                          } else {
                            // Explicit intentional newline created by user
                            e.stopPropagation();
                          }
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          discardEditDraft();
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: fontCss,
                        fontWeight: textAnn.isBold ? 700 : 400,
                        fontStyle: textAnn.isItalic ? 'italic' : 'normal',
                        textDecoration: textAnn.isUnderline ? 'underline' : 'none',
                        textAlign: textAnn.align || 'left',
                        color: textAnn.color || '#000000',
                        lineHeight: 1.25,
                        width: '100%',
                        minWidth: '60px',
                        whiteSpace: lines.length > 1 ? 'pre-wrap' : 'pre',
                        wordBreak: 'break-word',
                      }}
                      className="bg-transparent border-none outline-none p-1 resize-none overflow-hidden"
                      rows={Math.max(1, lines.length)}
                    />
                  ) : (
                    <div 
                      style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: fontCss,
                        fontWeight: textAnn.isBold ? 700 : 400,
                        fontStyle: textAnn.isItalic ? 'italic' : 'normal',
                        textDecoration: textAnn.isUnderline ? 'underline' : 'none',
                        textAlign: textAnn.align || 'left',
                        color: textAnn.color || '#000000',
                        lineHeight: 1.25,
                        whiteSpace: lines.length > 1 ? 'pre-wrap' : 'pre',
                        wordBreak: 'break-word',
                      }}
                      className="p-1 rounded cursor-pointer"
                    >
                      {textAnn.text || 'Type text here'}
                    </div>
                  )}

                  {/* Horizontal Width Resize Handle (User Control) */}
                  {(isSelected || isEditing) && (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingTextItem({
                          id: ann.id,
                          isAnnotation: true,
                          startX: e.clientX,
                          initialWidth: textAnn.width || 120,
                        });
                      }}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/40 rounded-r transition-colors"
                      title="Drag to resize text width"
                    />
                  )}
                </div>
              );
            } else if (ann.type === 'signature') {
              return (
                <div
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAnnotation(ann.id);
                  }}
                  style={{
                    left: `${annLeft}px`,
                    top: `${annTop}px`,
                    width: `${annWidth}px`,
                    height: `${annHeight}px`,
                  }}
                  className={`absolute group cursor-move select-none ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-500/5' : 'hover:ring-1 hover:ring-blue-400'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-7 left-0 right-0 flex items-center justify-between bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-0.5 shadow-lg text-[11px] z-50">
                      <div
                        onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                        className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-white font-mono"
                      >
                        <Move className="w-3 h-3" />
                        <span>Move Signature</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <img
                    src={(ann as SignatureAnnotation).dataUrl}
                    alt="Signature"
                    onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                    className="w-full h-full object-contain pointer-events-auto select-none"
                  />
                </div>
              );
            } else if (ann.type === 'image') {
              const imageAnn = ann as ImageAnnotation;
              const imgRotation = imageAnn.rotation || 0;
              const imgOpacity = imageAnn.opacity !== undefined ? imageAnn.opacity : 1.0;

              return (
                <div
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAnnotation(ann.id);
                  }}
                  style={{
                    left: `${annLeft}px`,
                    top: `${annTop}px`,
                    width: `${annWidth}px`,
                    height: `${annHeight}px`,
                    transform: `rotate(${imgRotation}deg)`,
                    transformOrigin: 'center center',
                    opacity: imgOpacity,
                  }}
                  className={`absolute group select-none ${
                    isSelected ? 'ring-2 ring-blue-500 rounded-sm' : 'hover:ring-1 hover:ring-blue-400/80'
                  }`}
                >
                  {/* Contextual Floating Image Inspector */}
                  {isSelected && (
                    <div 
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -top-9 left-0 flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2 py-0.5 shadow-2xl text-[11px] z-50 pointer-events-auto whitespace-nowrap"
                    >
                      <div
                        onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                        className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-white font-mono mr-1"
                        title="Drag to reposition image"
                      >
                        <Move className="w-3 h-3 text-blue-400" />
                        <span>Move</span>
                      </div>

                      <div className="w-[1px] h-3.5 bg-zinc-700" />

                      {/* Opacity Slider */}
                      <div className="flex items-center gap-1 text-[10px] text-zinc-300" title="Image Opacity (Watermark)">
                        <span>Opacity:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={imgOpacity}
                          onChange={(e) => updateAnnotation(ann.id, { opacity: parseFloat(e.target.value) })}
                          className="w-12 accent-blue-500 h-1 cursor-pointer"
                        />
                        <span className="font-mono text-[9px]">{Math.round(imgOpacity * 100)}%</span>
                      </div>

                      <div className="w-[1px] h-3.5 bg-zinc-700" />

                      {/* Rotate +90 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAnnotation(ann.id, { rotation: (imgRotation + 90) % 360 });
                        }}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const copyId = `img-${Date.now()}`;
                          addAnnotation({
                            ...imageAnn,
                            id: copyId,
                            domX: imageAnn.domX + 20,
                            domY: imageAnn.domY + 20,
                          });
                          selectAnnotation(copyId);
                        }}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white"
                        title="Duplicate Image"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                        className="p-1 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300"
                        title="Delete Image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <img
                    src={imageAnn.dataUrl}
                    alt={imageAnn.name || 'Image'}
                    onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                    className="w-full h-full object-contain pointer-events-auto cursor-move select-none"
                  />
                </div>
              );
            } else if (ann.type === 'form-field') {
              const formAnn = ann as FormFieldAnnotation;
              return (
                <div
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAnnotation(ann.id);
                  }}
                  style={{
                    left: `${annLeft}px`,
                    top: `${annTop}px`,
                    width: `${annWidth}px`,
                    height: `${annHeight}px`,
                  }}
                  className={`absolute group select-none ${
                    isSelected ? 'ring-2 ring-blue-500 rounded' : 'hover:ring-1 hover:ring-blue-400'
                  }`}
                >
                  {/* Floating Form Field Inspector */}
                  {isSelected && (
                    <div 
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -top-8 left-0 flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2 py-0.5 shadow-2xl text-[10px] z-50 pointer-events-auto whitespace-nowrap"
                    >
                      <div
                        onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                        className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-white font-mono mr-1"
                      >
                        <Move className="w-3 h-3 text-blue-400" />
                        <span>Field</span>
                      </div>

                      <div className="w-[1px] h-3 bg-zinc-700" />

                      <input
                        type="text"
                        value={formAnn.name}
                        onChange={(e) => updateAnnotation(ann.id, { name: e.target.value })}
                        placeholder="Name"
                        className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white w-16 focus:outline-none"
                      />

                      <select
                        value={formAnn.fieldType}
                        onChange={(e) => updateAnnotation(ann.id, { fieldType: e.target.value as any })}
                        className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[10px] text-zinc-300 focus:outline-none"
                      >
                        <option value="text">Text</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="dropdown">Dropdown</option>
                      </select>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                        className="text-red-400 hover:text-red-300 ml-1"
                        title="Delete Form Field"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Field Render by Type */}
                  {formAnn.fieldType === 'text' && (
                    <input
                      type="text"
                      value={String(formAnn.value || '')}
                      onChange={(e) => updateAnnotation(ann.id, { value: e.target.value })}
                      placeholder={formAnn.placeholder || 'Type here...'}
                      style={{
                        fontSize: `${(formAnn.fontSize || 12) * zoom}px`,
                        color: formAnn.color || '#0f172a',
                        borderColor: formAnn.borderColor || '#93c5fd',
                      }}
                      className="w-full h-full px-1.5 bg-blue-50/40 dark:bg-blue-950/30 border rounded border-dashed focus:border-solid focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all font-sans"
                    />
                  )}

                  {formAnn.fieldType === 'checkbox' && (
                    <label className="w-full h-full flex items-center justify-center cursor-pointer bg-blue-50/40 dark:bg-blue-950/30 border border-dashed border-blue-400 rounded">
                      <input
                        type="checkbox"
                        checked={formAnn.value === true || formAnn.value === 'true'}
                        onChange={(e) => updateAnnotation(ann.id, { value: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                      />
                    </label>
                  )}

                  {formAnn.fieldType === 'dropdown' && (
                    <select
                      value={String(formAnn.value || '')}
                      onChange={(e) => updateAnnotation(ann.id, { value: e.target.value })}
                      style={{
                        fontSize: `${(formAnn.fontSize || 11) * zoom}px`,
                      }}
                      className="w-full h-full px-1 bg-blue-50/40 dark:bg-blue-950/30 border border-blue-400 border-dashed rounded focus:border-solid focus:bg-white dark:focus:bg-zinc-900 focus:outline-none text-xs"
                    >
                      {(formAnn.options || ['Option 1', 'Option 2', 'Option 3']).map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            } else if (ann.type === 'shape') {
              const shapeAnn = ann as ShapeAnnotation;
              return (
                <div
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAnnotation(ann.id);
                  }}
                  style={{
                    left: `${annLeft}px`,
                    top: `${annTop}px`,
                    width: `${annWidth}px`,
                    height: `${annHeight}px`,
                  }}
                  className={`absolute group cursor-move select-none ${
                    isSelected ? 'ring-2 ring-blue-500 rounded-sm' : 'hover:ring-1 hover:ring-blue-400'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-7 left-0 right-0 flex items-center justify-between bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-0.5 shadow-lg text-[10px] z-50">
                      <div
                        onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                        className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-white font-mono"
                      >
                        <Move className="w-3 h-3" />
                        <span className="capitalize">{shapeAnn.shapeType}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                        className="text-red-400 hover:text-red-300 ml-1"
                        title="Delete Shape"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <svg 
                    width="100%" 
                    height="100%" 
                    className="overflow-visible" 
                    onMouseDown={(e) => startDrag(e, 'annotation', ann.id, { domX: ann.domX, domY: ann.domY, width: ann.width, height: ann.height })}
                  >
                    {shapeAnn.shapeType === 'rectangle' && (
                      <rect
                        x={0}
                        y={0}
                        width={annWidth}
                        height={annHeight}
                        stroke={shapeAnn.strokeColor || '#2563eb'}
                        strokeWidth={(shapeAnn.strokeWidth || 2) * zoom}
                        fill={shapeAnn.fillColor || 'rgba(37,99,235,0.05)'}
                        rx={2}
                      />
                    )}
                    {shapeAnn.shapeType === 'ellipse' && (
                      <ellipse
                        cx={annWidth / 2}
                        cy={annHeight / 2}
                        rx={Math.max(2, annWidth / 2)}
                        ry={Math.max(2, annHeight / 2)}
                        stroke={shapeAnn.strokeColor || '#2563eb'}
                        strokeWidth={(shapeAnn.strokeWidth || 2) * zoom}
                        fill={shapeAnn.fillColor || 'rgba(37,99,235,0.05)'}
                      />
                    )}
                    {shapeAnn.shapeType === 'line' && (
                      <line
                        x1={0}
                        y1={0}
                        x2={annWidth}
                        y2={annHeight}
                        stroke={shapeAnn.strokeColor || '#2563eb'}
                        strokeWidth={(shapeAnn.strokeWidth || 2) * zoom}
                      />
                    )}
                    {shapeAnn.shapeType === 'arrow' && (
                      <g>
                        <defs>
                          <marker
                            id={`arrowhead-${ann.id}`}
                            markerWidth="6"
                            markerHeight="6"
                            refX="5"
                            refY="3"
                            orient="auto"
                          >
                            <polygon points="0 0, 6 3, 0 6" fill={shapeAnn.strokeColor || '#2563eb'} />
                          </marker>
                        </defs>
                        <line
                          x1={0}
                          y1={0}
                          x2={annWidth}
                          y2={annHeight}
                          stroke={shapeAnn.strokeColor || '#2563eb'}
                          strokeWidth={(shapeAnn.strokeWidth || 2) * zoom}
                          markerEnd={`url(#arrowhead-${ann.id})`}
                        />
                      </g>
                    )}
                  </svg>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* ========================================================================= */}
        {/* Layer 4: Interactive In-Place Text Extraction & Direct Editing Layer       */}
        {/* ========================================================================= */}
        <div 
          className={`absolute inset-0 overflow-visible z-30 ${
            (activeTool === 'edit-text' || activeTool === 'select' || activeTool === 'highlight' || activeTool === 'whiteout' || activeTool === 'redact')
              ? 'pointer-events-auto' 
              : 'pointer-events-none'
          }`}
        >
          {textItems.map((item) => {
            const modified = textModifications[item.id];
            const currentItem = modified || item;

            const isSelected = selectedTextItemId === item.id;
            const isEditing = editingItemId === item.id;
            const isModified = !!modified && (modified.text !== item.originalText || modified.domX !== item.domX || modified.domY !== item.domY || modified.isModified);

            const itemLeft = (currentItem.domX ?? item.domX) * zoom;
            const itemTop = (currentItem.domY ?? item.domY) * zoom;
            const itemWidth = Math.max(currentItem.width ? currentItem.width * zoom : item.width * zoom, 12);
            const itemFontSize = Math.max(8, currentItem.fontSize * zoom);
            const fontCss = getFontFamilyCss(currentItem.fontFamily, currentItem.fontName);
            const lines = (currentItem.text || '').split('\n');

            const handleTextClick = (e: React.MouseEvent) => {
              e.stopPropagation();

              if (activeTool === 'highlight') {
                const newAnn: FreehandHighlightAnnotation = {
                  id: `ann-freehand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  type: 'freehand-highlight',
                  pageIndex,
                  points: [
                    { x: Math.round(item.domX - 2), y: Math.round(item.domY + item.height / 2) },
                    { x: Math.round(item.domX + item.width + 2), y: Math.round(item.domY + item.height / 2) },
                  ],
                  color: currentHighlightColor,
                  strokeWidth: 16,
                  opacity: 0.55,
                };
                addAnnotation(newAnn);
                return;
              }

              if (activeTool === 'whiteout') {
                const newAnn: RectAnnotation = {
                  id: `ann-whiteout-${Date.now()}-${Math.random()}`,
                  type: 'whiteout',
                  pageIndex,
                  domX: Math.max(0, item.domX - 1),
                  domY: Math.max(0, item.domY - 1),
                  width: item.width + 2,
                  height: item.height + 2,
                  color: '#ffffff',
                  opacity: 1.0,
                };
                addAnnotation(newAnn);
                return;
              }

              if (activeTool === 'redact') {
                const newAnn: RectAnnotation = {
                  id: `ann-redact-${Date.now()}-${Math.random()}`,
                  type: 'redact',
                  pageIndex,
                  domX: Math.max(0, item.domX - 1),
                  domY: Math.max(0, item.domY - 1),
                  width: item.width + 2,
                  height: item.height + 2,
                  color: '#000000',
                  opacity: 1.0,
                };
                addAnnotation(newAnn);
                return;
              }

              // Activate selection and start deterministic editing session
              startEditingText(currentItem, false);
            };

            const bgMaskColor = currentItem.backgroundColor || (currentItem.color === '#ffffff' ? '#000000' : '#ffffff');

            return (
              <React.Fragment key={item.id}>
                {/* 
                  CRITICAL ARCHITECTURAL FIX: ZERO DOUBLE TEXT DURING EDITING
                  Whenever a text item is active in editing (isEditing), or modified (isModified),
                  or deleted, the underlying raster canvas glyph at (item.domX, item.domY) is
                  completely masked with the exact matching background color.
                */}
                {(isEditing || isModified || currentItem.isDeleted) && (
                  <div 
                    style={{
                      left: `${item.domX * zoom - 1}px`,
                      top: `${item.domY * zoom - 1}px`,
                      width: `${item.width * zoom + 2}px`,
                      height: `${item.height * zoom + 2}px`,
                      backgroundColor: bgMaskColor,
                    }}
                    className="absolute pointer-events-none z-10 rounded-[1px]" 
                  />
                )}

                {/* Render the editable / interactive text at current position */}
                {!currentItem.isDeleted && (
                  <div
                    onMouseDown={handleTextClick}
                    onClick={handleTextClick}
                    style={{
                      left: `${itemLeft}px`,
                      top: `${itemTop}px`,
                      width: isEditing ? 'auto' : currentItem.width ? `${currentItem.width * zoom}px` : `${itemWidth}px`,
                      minWidth: `${itemWidth}px`,
                      zIndex: isEditing ? 60 : isSelected ? 50 : isModified ? 40 : 30,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    className={`absolute transition-all group/text cursor-pointer ${
                      isEditing
                        ? 'ring-2 ring-blue-600 shadow-2xl rounded-sm bg-transparent'
                        : isSelected
                        ? 'ring-1.5 ring-blue-500 bg-blue-500/10 rounded-sm'
                        : activeTool === 'edit-text' || activeTool === 'select'
                        ? 'hover:ring-1 hover:ring-blue-500 hover:bg-blue-500/10 rounded-sm'
                        : activeTool === 'whiteout'
                        ? 'hover:ring-1 hover:ring-red-400 hover:bg-red-400/25 rounded-sm'
                        : activeTool === 'redact'
                        ? 'hover:ring-1 hover:ring-black hover:bg-black/25 rounded-sm'
                        : ''
                    }`}
                    title={
                      activeTool === 'highlight'
                        ? 'Click to Highlight this text'
                        : activeTool === 'whiteout' 
                        ? 'Click to Whiteout this text' 
                        : activeTool === 'redact'
                        ? 'Click to Permanently Redact this text'
                        : 'Click to Edit / Move this text'
                    }
                  >
                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={textEditDraft?.text ?? currentItem.text}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          updateDraft({ text: e.target.value });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (e.ctrlKey || e.metaKey) {
                              e.preventDefault();
                              commitEditDraft();
                            } else {
                              // Intentional line break inserted by user
                              e.stopPropagation();
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            discardEditDraft();
                          }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: `${itemFontSize}px`,
                          fontFamily: fontCss,
                          fontWeight: currentItem.isBold ? 700 : 400,
                          fontStyle: currentItem.isItalic ? 'italic' : 'normal',
                          textDecoration: currentItem.isUnderline ? 'underline' : 'none',
                          textAlign: currentItem.align || 'left',
                          color: currentItem.color || '#000000',
                          backgroundColor: 'transparent',
                          caretColor: currentItem.color || '#000000',
                          lineHeight: 1.25,
                          width: '100%',
                          minWidth: `${Math.max(60, itemWidth)}px`,
                          whiteSpace: lines.length > 1 ? 'pre-wrap' : 'pre',
                          wordBreak: 'break-word',
                        }}
                        className="border-none outline-none p-0.5 resize-none overflow-hidden"
                        rows={Math.max(1, lines.length)}
                      />
                    ) : isModified ? (
                      <span
                        style={{
                          fontSize: `${itemFontSize}px`,
                          fontFamily: fontCss,
                          fontWeight: currentItem.isBold ? 700 : 400,
                          fontStyle: currentItem.isItalic ? 'italic' : 'normal',
                          textDecoration: currentItem.isUnderline ? 'underline' : 'none',
                          textAlign: currentItem.align || 'left',
                          color: currentItem.color || '#000000',
                          lineHeight: 1.25,
                          display: 'inline-block',
                          whiteSpace: lines.length > 1 ? 'pre-wrap' : 'pre',
                          wordBreak: 'break-word',
                        }}
                      >
                        {currentItem.text}
                      </span>
                    ) : (
                      <span 
                        style={{
                          fontSize: `${itemFontSize}px`,
                          lineHeight: 1.25,
                          display: 'inline-block',
                          whiteSpace: lines.length > 1 ? 'pre-wrap' : 'pre',
                          wordBreak: 'break-word',
                        }}
                        className="opacity-0 select-none"
                      >
                        {currentItem.text}
                      </span>
                    )}

                    {/* Horizontal Width Resize Handle (User Control) */}
                    {(isSelected || isEditing) && (
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingTextItem({
                            id: item.id,
                            isAnnotation: false,
                            startX: e.clientX,
                            initialWidth: currentItem.width || item.width,
                          });
                        }}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/40 rounded-r transition-colors"
                        title="Drag to resize text width"
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* Layer 5: Active Text Editing Contextual Toolbar (Unclipped Top Overlay)   */}
        {/* ========================================================================= */}
        {textEditDraft && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">
            {renderRichTextToolbar(
              textEditDraft,
              textEditDraft.isAnnotation,
              (updates) => updateDraft(updates),
              () => {
                if (textEditDraft.isAnnotation) {
                  deleteAnnotation(textEditDraft.id);
                } else {
                  deleteTextItem(textEditDraft.id);
                }
                setTextEditDraft(null);
                setEditingItemId(null);
                setEditingAnnotationId(null);
                selectTextItem(null);
                selectAnnotation(null);
              },
              () => commitEditDraft(),
              () => discardEditDraft()
            )}
          </div>
        )}
      </div>
    </div>
  );
};
