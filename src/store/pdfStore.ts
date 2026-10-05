import { create } from 'zustand';
import type { 
  ToolMode, 
  PageDimension, 
  ExtractedTextItem, 
  AnnotationItem,
  HistoryState 
} from '../types/pdf';
import { 
  loadPDFDocument, 
  extractPageTextItems, 
  exportModifiedPDF, 
  generateSampleInvoicePDF 
} from '../core/pdfEngine';

interface PDFState {
  // Document State
  documentBytes: Uint8Array | null;
  fileName: string;
  fileSize: number;
  pdfDocProxy: any | null;
  pageDimensions: PageDimension[];
  extractedTextByPage: Record<number, ExtractedTextItem[]>;
  isLoading: boolean;
  loadingMessage: string;

  // Edit State
  textModifications: Record<string, ExtractedTextItem>;
  annotations: AnnotationItem[];
  pageRotations: Record<number, number>;
  deletedPages: number[];

  // Workspace & View State
  activeTool: ToolMode;
  selectedTextItemId: string | null;
  selectedAnnotationId: string | null;
  currentPage: number;
  zoom: number;
  theme: 'dark' | 'light';

  // Tool Specific Customization
  drawColor: string;
  drawStrokeWidth: number;
  highlightColor: string;
  shapeType: 'rectangle' | 'ellipse' | 'arrow' | 'line';

  // Export State
  isExporting: boolean;
  exportProgress: string;

  // History for Undo/Redo
  undoStack: HistoryState[];
  redoStack: HistoryState[];

  // Modals
  activeModal: 'merge' | 'split' | 'organize' | 'signature' | 'compress' | 'pageNumbers' | 'pdfToImages' | 'imagesToPdf' | 'protect' | 'wordConverter' | 'ocr' | null;

  // Actions
  loadDocument: (bytes: Uint8Array, fileName: string) => Promise<void>;
  loadSampleDocument: () => Promise<void>;
  setActiveTool: (tool: ToolMode) => void;
  setDrawColor: (color: string) => void;
  setDrawStrokeWidth: (width: number) => void;
  setHighlightColor: (color: string) => void;
  setShapeType: (shapeType: 'rectangle' | 'ellipse' | 'arrow' | 'line') => void;
  setZoom: (zoom: number) => void;
  setCurrentPage: (page: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setActiveModal: (modal: 'merge' | 'split' | 'organize' | 'signature' | 'compress' | 'pageNumbers' | 'pdfToImages' | 'imagesToPdf' | 'protect' | 'wordConverter' | 'ocr' | null) => void;

  selectTextItem: (id: string | null) => void;
  selectAnnotation: (id: string | null) => void;

  updateTextItem: (id: string, updates: Partial<ExtractedTextItem>) => void;
  deleteTextItem: (id: string) => void;

  addAnnotation: (annotation: AnnotationItem) => void;
  updateAnnotation: (id: string, updates: Partial<AnnotationItem>) => void;
  deleteAnnotation: (id: string) => void;

  rotatePage: (pageIndex: number, deltaAngle: number) => void;
  deletePage: (pageIndex: number) => void;

  undo: () => void;
  redo: () => void;
  exportPDF: () => Promise<void>;
  resetWorkspace: () => void;
}

const initialTheme = (typeof window !== 'undefined' && localStorage.getItem('lexis_theme') === 'light') 
  ? 'light' 
  : 'dark';

if (typeof document !== 'undefined') {
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Compute responsive fit zoom based on available window width
const calculateDefaultFitZoom = (pageWidth: number = 595) => {
  if (typeof window === 'undefined') return 0.85;
  const availableWidth = Math.max(360, window.innerWidth - 240 - 48);
  const fitZoom = Math.max(0.5, Math.min(0.95, (availableWidth * 0.88) / pageWidth));
  return Math.round(fitZoom * 100) / 100;
};

export const usePDFStore = create<PDFState>((set, get) => ({
  documentBytes: null,
  fileName: '',
  fileSize: 0,
  pdfDocProxy: null,
  pageDimensions: [],
  extractedTextByPage: {},
  isLoading: false,
  loadingMessage: '',

  textModifications: {},
  annotations: [],
  pageRotations: {},
  deletedPages: [],

  activeTool: 'select',
  selectedTextItemId: null,
  selectedAnnotationId: null,
  currentPage: 1,
  zoom: calculateDefaultFitZoom(),
  theme: initialTheme,

  drawColor: '#2563eb',
  drawStrokeWidth: 3,
  highlightColor: '#fef08a',
  shapeType: 'rectangle',

  isExporting: false,
  exportProgress: '',

  undoStack: [],
  redoStack: [],
  activeModal: null,

  loadDocument: async (bytes: Uint8Array, fileName: string) => {
    set({ isLoading: true, loadingMessage: 'Parsing PDF structures and glyph layers...' });
    try {
      const { pdfDoc, pageDimensions } = await loadPDFDocument(bytes);
      
      // Extract text content for all pages
      const extractedTextByPage: Record<number, ExtractedTextItem[]> = {};
      for (const pageDim of pageDimensions) {
        const textItems = await extractPageTextItems(pdfDoc, pageDim.pageNumber, pageDim.height);
        extractedTextByPage[pageDim.pageNumber] = textItems;
      }

      const firstPageWidth = pageDimensions[0]?.width || 595;
      const initialFitZoom = calculateDefaultFitZoom(firstPageWidth);

      set({
        documentBytes: bytes,
        fileName,
        fileSize: bytes.byteLength,
        pdfDocProxy: pdfDoc,
        pageDimensions,
        extractedTextByPage,
        textModifications: {},
        annotations: [],
        pageRotations: {},
        deletedPages: [],
        undoStack: [],
        redoStack: [],
        currentPage: 1,
        zoom: initialFitZoom,
        selectedTextItemId: null,
        selectedAnnotationId: null,
        isLoading: false,
        loadingMessage: '',
      });
    } catch (error) {
      console.error('Failed to load PDF document:', error);
      set({ isLoading: false, loadingMessage: '' });
      alert('Error parsing PDF. Please verify this is a valid PDF document.');
    }
  },

  loadSampleDocument: async () => {
    set({ isLoading: true, loadingMessage: 'Generating commercial vector invoice...' });
    try {
      const sampleBytes = await generateSampleInvoicePDF();
      await get().loadDocument(sampleBytes, 'PaperPDF-Sample-Invoice.pdf');
    } catch (error) {
      console.error('Failed to generate sample PDF:', error);
      set({ isLoading: false, loadingMessage: '' });
    }
  },

  setActiveTool: (tool) => {
    set({ 
      activeTool: tool,
      selectedTextItemId: null,
      selectedAnnotationId: null,
    });
  },

  setDrawColor: (drawColor) => set({ drawColor }),
  setDrawStrokeWidth: (drawStrokeWidth) => set({ drawStrokeWidth }),
  setHighlightColor: (highlightColor) => set({ highlightColor }),
  setShapeType: (shapeType) => set({ shapeType }),

  setZoom: (zoom) => {
    const clamped = Math.min(Math.max(0.25, zoom), 3.0);
    set({ zoom: Math.round(clamped * 100) / 100 });
  },

  setCurrentPage: (currentPage) => set({ currentPage }),
  
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('paperpdf_theme', theme);
    }
    set({ theme });
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  setActiveModal: (activeModal) => set({ activeModal }),

  selectTextItem: (id) => set({ selectedTextItemId: id, selectedAnnotationId: null }),
  selectAnnotation: (id) => set({ selectedAnnotationId: id, selectedTextItemId: null }),

  updateTextItem: (id, updates) => {
    const { textModifications, extractedTextByPage, undoStack, annotations, pageRotations, deletedPages } = get();
    
    // Find item in extracted items or existing modifications
    let existing = textModifications[id];
    if (!existing) {
      for (const pageItems of Object.values(extractedTextByPage)) {
        const found = pageItems.find(item => item.id === id);
        if (found) {
          existing = { ...found };
          break;
        }
      }
    }

    if (!existing) return;

    // Snapshot for Undo
    const snapshot: HistoryState = {
      textModifications: { ...textModifications },
      annotations: [...annotations],
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };

    const updatedItem: ExtractedTextItem = {
      ...existing,
      ...updates,
      isModified: true,
    };

    set({
      textModifications: {
        ...textModifications,
        [id]: updatedItem,
      },
      undoStack: [...undoStack.slice(-30), snapshot],
      redoStack: [],
    });
  },

  deleteTextItem: (id) => {
    const { updateTextItem } = get();
    updateTextItem(id, { isDeleted: true, text: '' });
  },

  addAnnotation: (annotation) => {
    const { annotations, undoStack, textModifications, pageRotations, deletedPages } = get();
    const snapshot: HistoryState = {
      textModifications: { ...textModifications },
      annotations: [...annotations],
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };

    set({
      annotations: [...annotations, annotation],
      selectedAnnotationId: annotation.id,
      selectedTextItemId: null,
      undoStack: [...undoStack.slice(-30), snapshot],
      redoStack: [],
    });
  },

  updateAnnotation: (id, updates) => {
    const { annotations, undoStack, textModifications, pageRotations, deletedPages } = get();
    const snapshot: HistoryState = {
      textModifications: { ...textModifications },
      annotations: [...annotations],
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };

    const nextAnnotations = annotations.map(ann => ann.id === id ? ({ ...ann, ...updates } as AnnotationItem) : ann);

    set({
      annotations: nextAnnotations,
      undoStack: [...undoStack.slice(-30), snapshot],
      redoStack: [],
    });
  },

  deleteAnnotation: (id) => {
    const { annotations, undoStack, textModifications, pageRotations, deletedPages } = get();
    const snapshot: HistoryState = {
      textModifications: { ...textModifications },
      annotations: [...annotations],
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };

    set({
      annotations: annotations.filter(ann => ann.id !== id),
      selectedAnnotationId: null,
      undoStack: [...undoStack.slice(-30), snapshot],
      redoStack: [],
    });
  },

  rotatePage: (pageIndex, deltaAngle) => {
    const { pageRotations } = get();
    const current = pageRotations[pageIndex] || 0;
    const nextRot = (current + deltaAngle + 360) % 360;
    set({
      pageRotations: {
        ...pageRotations,
        [pageIndex]: nextRot,
      },
    });
  },

  deletePage: (pageIndex) => {
    const { deletedPages } = get();
    if (!deletedPages.includes(pageIndex)) {
      set({
        deletedPages: [...deletedPages, pageIndex],
        selectedTextItemId: null,
        selectedAnnotationId: null,
      });
    }
  },

  undo: () => {
    const { undoStack, redoStack, textModifications, annotations, pageRotations, deletedPages } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);

    const currentSnapshot: HistoryState = {
      textModifications: { ...textModifications },
      annotations: [...annotations],
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };

    set({
      textModifications: previous.textModifications,
      annotations: previous.annotations,
      pageRotations: previous.pageRotations,
      deletedPages: previous.deletedPages,
      undoStack: newUndo,
      redoStack: [...redoStack, currentSnapshot],
    });
  },

  redo: () => {
    const { redoStack, undoStack, textModifications, annotations, pageRotations, deletedPages } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    const currentSnapshot: HistoryState = {
      textModifications: { ...textModifications },
      annotations: [...annotations],
      pageRotations: { ...pageRotations },
      deletedPages: [...deletedPages],
    };

    set({
      textModifications: next.textModifications,
      annotations: next.annotations,
      pageRotations: next.pageRotations,
      deletedPages: next.deletedPages,
      undoStack: [...undoStack, currentSnapshot],
      redoStack: newRedo,
    });
  },

  exportPDF: async () => {
    const { documentBytes, textModifications, annotations, pageRotations, deletedPages, fileName } = get();
    if (!documentBytes) return;

    set({ isExporting: true, exportProgress: 'Embedding font glyphs and compiling PDF stream...' });

    try {
      const outputBytes = await exportModifiedPDF(
        documentBytes,
        textModifications,
        annotations,
        pageRotations,
        deletedPages
      );

      // Trigger instant direct download
      const blob = new Blob([outputBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = fileName.replace(/\.pdf$/i, '');
      link.href = url;
      link.download = `${baseName}-edited.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      set({ isExporting: false, exportProgress: '' });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PDF. Check console for details.');
      set({ isExporting: false, exportProgress: '' });
    }
  },

  resetWorkspace: () => {
    set({
      documentBytes: null,
      fileName: '',
      fileSize: 0,
      pdfDocProxy: null,
      pageDimensions: [],
      extractedTextByPage: {},
      textModifications: {},
      annotations: [],
      pageRotations: {},
      deletedPages: [],
      undoStack: [],
      redoStack: [],
      selectedTextItemId: null,
      selectedAnnotationId: null,
    });
  },
}));
