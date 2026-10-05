import { createWorker } from 'tesseract.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ExtractedTextItem } from '../types/pdf';

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number }; // In PDF DOM unzoomed points (scale 1.0)
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number }; // In PDF DOM unzoomed points (scale 1.0)
  words: OcrWord[];
}

export interface PageOcrResult {
  pageNumber: number; // 1-indexed
  pageIndex: number; // 0-indexed
  text: string;
  confidence: number;
  lines: OcrLine[];
  words: OcrWord[];
  pageWidth: number; // in pt
  pageHeight: number; // in pt
}

export interface OcrProgressEvent {
  status: string;
  progress: number; // 0 to 100
  currentPage: number;
  totalPages: number;
}

export const SUPPORTED_OCR_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish (Español)' },
  { code: 'fra', name: 'French (Français)' },
  { code: 'deu', name: 'German (Deutsch)' },
  { code: 'ita', name: 'Italian (Italiano)' },
  { code: 'por', name: 'Portuguese (Português)' },
  { code: 'hin', name: 'Hindi (हिंदी)' },
  { code: 'jpn', name: 'Japanese (日本語)' },
  { code: 'chi_sim', name: 'Chinese Simplified (简体中文)' },
  { code: 'rus', name: 'Russian (Русский)' },
  { code: 'nld', name: 'Dutch (Nederlands)' },
  { code: 'pol', name: 'Polish (Polski)' },
];

/**
 * Runs client-side WASM OCR on specified pages of a PDF.
 */
export async function runOcrOnPdfPages(
  pdfDocProxy: any,
  targetPageNumbers: number[],
  languageCode: string = 'eng',
  onProgress?: (event: OcrProgressEvent) => void
): Promise<PageOcrResult[]> {
  if (!pdfDocProxy) {
    throw new Error('No PDF document loaded');
  }

  // 1. Initialize Tesseract Worker
  if (onProgress) {
    onProgress({
      status: `Initializing ${languageCode.toUpperCase()} OCR neural engine...`,
      progress: 5,
      currentPage: 0,
      totalPages: targetPageNumbers.length,
    });
  }

  const worker = await createWorker(languageCode, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        // sub-progress
      }
    },
  });

  const results: PageOcrResult[] = [];
  const total = targetPageNumbers.length;

  try {
    for (let i = 0; i < total; i++) {
      const pageNum = targetPageNumbers[i];
      const pageIndex = pageNum - 1;

      if (onProgress) {
        const baseProg = Math.round((i / total) * 90);
        onProgress({
          status: `Rendering page ${pageNum} (${i + 1}/${total}) for optical recognition...`,
          progress: Math.max(10, baseProg),
          currentPage: i + 1,
          totalPages: total,
        });
      }

      // Render PDF page to high-res canvas (150 DPI = ~2.0833 scale)
      const page = await pdfDocProxy.getPage(pageNum);
      const unzoomedViewport = page.getViewport({ scale: 1.0 });
      const ocrScale = 2.0; // 144 DPI for fast & accurate OCR
      const viewport = page.getViewport({ scale: ocrScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context failure');

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      if (onProgress) {
        onProgress({
          status: `Extracting text vectors on page ${pageNum}...`,
          progress: Math.round(((i + 0.5) / total) * 90),
          currentPage: i + 1,
          totalPages: total,
        });
      }

      // Run recognition
      const recognition = await worker.recognize(canvas);
      const data: any = recognition.data;

      const lines: OcrLine[] = ((data.lines || []) as any[]).map((l: any) => {
        const lineWords: OcrWord[] = ((l.words || []) as any[]).map((w: any) => ({
          text: w.text || '',
          confidence: w.confidence || 0,
          bbox: {
            x0: (w.bbox?.x0 || 0) / ocrScale,
            y0: (w.bbox?.y0 || 0) / ocrScale,
            x1: (w.bbox?.x1 || 0) / ocrScale,
            y1: (w.bbox?.y1 || 0) / ocrScale,
          },
        }));

        return {
          text: l.text?.trim() || '',
          confidence: l.confidence || 0,
          bbox: {
            x0: (l.bbox?.x0 || 0) / ocrScale,
            y0: (l.bbox?.y0 || 0) / ocrScale,
            x1: (l.bbox?.x1 || 0) / ocrScale,
            y1: (l.bbox?.y1 || 0) / ocrScale,
          },
          words: lineWords,
        };
      }).filter((l: OcrLine) => l.text.length > 0);

      const allWords: OcrWord[] = ((data.words || []) as any[]).map((w: any) => ({
        text: w.text || '',
        confidence: w.confidence || 0,
        bbox: {
          x0: (w.bbox?.x0 || 0) / ocrScale,
          y0: (w.bbox?.y0 || 0) / ocrScale,
          x1: (w.bbox?.x1 || 0) / ocrScale,
          y1: (w.bbox?.y1 || 0) / ocrScale,
        },
      })).filter((w: OcrWord) => w.text.trim().length > 0);

      results.push({
        pageNumber: pageNum,
        pageIndex,
        text: data.text || '',
        confidence: data.confidence || 0,
        lines,
        words: allWords,
        pageWidth: unzoomedViewport.width,
        pageHeight: unzoomedViewport.height,
      });
    }

    if (onProgress) {
      onProgress({
        status: 'OCR complete! Processing searchable output layers...',
        progress: 100,
        currentPage: total,
        totalPages: total,
      });
    }
  } finally {
    await worker.terminate();
  }

  return results;
}

/**
 * Injects invisible selectable text vectors over the scanned raster pages, making the PDF searchable (Ctrl+F).
 */
export async function injectSearchableOcrTextLayer(
  pdfBytes: Uint8Array,
  ocrResults: PageOcrResult[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const pageRes of ocrResults) {
    if (pageRes.pageIndex >= pdfDoc.getPageCount()) continue;
    const page = pdfDoc.getPage(pageRes.pageIndex);
    const { height: pageHeight } = page.getSize();

    for (const word of pageRes.words) {
      if (!word.text.trim()) continue;

      const wHeight = Math.max(4, word.bbox.y1 - word.bbox.y0);

      // PDF coordinates are from bottom-left
      const pdfX = word.bbox.x0;
      const pdfY = pageHeight - word.bbox.y1;
      const fontSize = Math.max(4, Math.min(36, wHeight));

      // Draw transparent text overlay (opacity 0 or near-zero invisible selectable text)
      page.drawText(word.text, {
        x: pdfX,
        y: pdfY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        opacity: 0.001, // Invisible to eye, fully selectable by mouse and searchable by Ctrl+F
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Converts OCR line results into PaperPDF in-place ExtractedTextItems for direct interactive editing.
 */
export function convertOcrResultsToEditableTextItems(
  ocrResults: PageOcrResult[]
): Record<number, ExtractedTextItem[]> {
  const extractedByPage: Record<number, ExtractedTextItem[]> = {};

  for (const pageRes of ocrResults) {
    const items: ExtractedTextItem[] = [];

    for (let i = 0; i < pageRes.lines.length; i++) {
      const line = pageRes.lines[i];
      const domX = line.bbox.x0;
      const domY = line.bbox.y0;
      const width = Math.max(20, line.bbox.x1 - line.bbox.x0);
      const height = Math.max(8, line.bbox.y1 - line.bbox.y0);
      const fontSize = Math.max(8, Math.min(32, Math.round(height * 0.85)));

      // PDF point Y is measured from bottom
      const pdfY = pageRes.pageHeight - (domY + height);

      items.push({
        id: `ocr-${pageRes.pageIndex}-${i}-${Date.now()}`,
        pageIndex: pageRes.pageIndex,
        text: line.text,
        originalText: line.text,
        x: domX,
        y: pdfY,
        domX,
        domY,
        originalDomX: domX,
        originalDomY: domY,
        width,
        height,
        fontSize,
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontName: 'Helvetica',
        color: '#000000',
        backgroundColor: '#ffffff', // default white background sample
        isBold: false,
        isItalic: false,
        align: 'left',
        isModified: false,
        isDeleted: false,
      });
    }

    extractedByPage[pageRes.pageIndex] = items;
  }

  return extractedByPage;
}
