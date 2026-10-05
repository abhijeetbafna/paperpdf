import * as pdfjsLib from 'pdfjs-dist';
import PptxGenJS from 'pptxgenjs';

export interface PptConversionOptions {
  scale?: number;
  slideLayout?: '16x9' | '4x3' | 'wide';
  includeEditableText?: boolean;
  onProgress?: (progress: number, currentSlide: number, totalSlides: number) => void;
}

/**
 * Convert PDF bytes directly into a PowerPoint (.pptx) presentation
 */
export async function convertPdfToPptx(
  pdfBytes: Uint8Array,
  outputFilename: string,
  options: PptConversionOptions = {}
): Promise<void> {
  const {
    scale = 2.0, // High DPI for crystal-clear slide resolution
    includeEditableText = true,
    onProgress
  } = options;

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(Math.round(((pageNum - 1) / numPages) * 100), pageNum, numPages);
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // 1. Render page to canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
      canvas: canvas as any,
    } as any);
    await renderTask.promise;

    const imgDataUrl = canvas.toDataURL('image/png');

    // 2. Add slide in PPTX
    const slide = pptx.addSlide();

    // Determine aspect ratio
    const isLandscape = viewport.width >= viewport.height;
    if (isLandscape) {
      slide.addImage({
        data: imgDataUrl,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        sizing: { type: 'contain', w: 10, h: 5.625 }
      });
    } else {
      // Portrait document centered on landscape slide
      const slideW = 10;
      const slideH = 5.625;
      const targetH = slideH;
      const targetW = (viewport.width / viewport.height) * targetH;
      const posX = (slideW - targetW) / 2;

      slide.addImage({
        data: imgDataUrl,
        x: posX,
        y: 0,
        w: targetW,
        h: targetH
      });
    }

    // 3. Optional: Extract text overlay if requested
    if (includeEditableText) {
      try {
        const textContent = await page.getTextContent();
        const textItems = (textContent.items as any[]).filter(it => it.str && it.str.trim().length > 0);
        
        // Add note with slide speaker notes containing page text for searchability
        const fullPageText = textItems.map(it => it.str).join(' ');
        if (fullPageText.trim().length > 0) {
          slide.addNotes(`Slide ${pageNum} Text Content:\n\n${fullPageText}`);
        }
      } catch (err) {
        console.warn('Could not extract text notes for slide:', err);
      }
    }
  }

  if (onProgress) {
    onProgress(100, numPages, numPages);
  }

  // Generate and download PPTX
  await pptx.writeFile({ fileName: outputFilename });
}
