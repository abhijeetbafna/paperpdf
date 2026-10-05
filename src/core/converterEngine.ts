import JSZip from 'jszip';
import { PDFDocument, PageSizes } from 'pdf-lib';

export interface PdfToImageOptions {
  dpi: 150 | 300 | 600;
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  quality: number; // 0.1 to 1.0 (for jpeg/webp)
  pageRange: number[]; // 1-indexed page numbers
}

export interface RenderedPageImage {
  pageNumber: number;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  filename: string;
}

export interface ImageToPdfItem {
  id: string;
  file: File;
  dataUrl: string;
  name: string;
  width: number;
  height: number;
  size: number;
}

export interface ImageToPdfOptions {
  pageSize: 'fit' | 'a4' | 'letter' | 'legal';
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: number; // in PDF points (0, 15, 30)
}

/**
 * Converts selected pages of a PDF Document Proxy to high-resolution images.
 */
export async function convertPdfToImages(
  pdfDocProxy: any,
  options: PdfToImageOptions,
  onProgress?: (progress: number, current: number, total: number, latestImage?: RenderedPageImage) => void
): Promise<{ images: RenderedPageImage[]; zipBlob: Promise<Blob> }> {
  if (!pdfDocProxy) {
    throw new Error('No PDF document loaded');
  }

  // Standard PDF resolution is 72 DPI
  const scale = options.dpi / 72;
  const extension = options.format === 'image/jpeg' ? 'jpg' : options.format === 'image/webp' ? 'webp' : 'png';
  const renderedImages: RenderedPageImage[] = [];
  const total = options.pageRange.length;

  for (let i = 0; i < total; i++) {
    const pageNumber = options.pageRange[i];
    const page = await pdfDocProxy.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { alpha: options.format === 'image/png' });
    if (!ctx) throw new Error('Failed to create canvas context');

    // Fill white background for JPEG
    if (options.format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      intent: 'print',
    };

    await page.render(renderContext).promise;

    // Export blob and dataUrl
    const blob: Blob = await new Promise((resolve) => {
      canvas.toBlob(
        (b) => resolve(b || new Blob()),
        options.format,
        options.format === 'image/png' ? undefined : options.quality
      );
    });

    const dataUrl = canvas.toDataURL(
      options.format,
      options.format === 'image/png' ? undefined : options.quality
    );

    const padNumber = String(pageNumber).padStart(3, '0');
    const filename = `page_${padNumber}.${extension}`;

    const rendered: RenderedPageImage = {
      pageNumber,
      blob,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      filename,
    };

    renderedImages.push(rendered);

    if (onProgress) {
      const progress = Math.round(((i + 1) / total) * 100);
      onProgress(progress, i + 1, total, rendered);
    }
  }

  // Helper function to lazily construct ZIP file when requested
  const createZipBlob = async (): Promise<Blob> => {
    const zip = new JSZip();
    for (const img of renderedImages) {
      zip.file(img.filename, img.blob);
    }
    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  };

  return {
    images: renderedImages,
    zipBlob: createZipBlob(),
  };
}

/**
 * Converts a list of image items into a standard PDF document.
 */
export async function convertImagesToPdf(
  items: ImageToPdfItem[],
  options: ImageToPdfOptions
): Promise<Uint8Array> {
  if (items.length === 0) {
    throw new Error('No images provided');
  }

  const pdfDoc = await PDFDocument.create();

  for (const item of items) {
    // 1. Convert image dataUrl/blob to bytes
    const response = await fetch(item.dataUrl);
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    let embeddedImage: any;
    const isJpeg = item.file.type === 'image/jpeg' || item.file.type === 'image/jpg' || item.name.toLowerCase().endsWith('.jpg') || item.name.toLowerCase().endsWith('.jpeg');
    const isPng = item.file.type === 'image/png' || item.name.toLowerCase().endsWith('.png');

    if (isJpeg) {
      embeddedImage = await pdfDoc.embedJpg(uint8);
    } else if (isPng) {
      try {
        embeddedImage = await pdfDoc.embedPng(uint8);
      } catch {
        // Fallback: draw through canvas if raw PNG is non-standard
        const rasterized = await rasterizeImageToPngBytes(item.dataUrl);
        embeddedImage = await pdfDoc.embedPng(rasterized);
      }
    } else {
      // WebP, SVG, BMP, GIF: rasterize to standard PNG
      const rasterized = await rasterizeImageToPngBytes(item.dataUrl);
      embeddedImage = await pdfDoc.embedPng(rasterized);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    // 2. Determine target page dimensions
    let targetPageWidth: number;
    let targetPageHeight: number;

    if (options.pageSize === 'fit') {
      targetPageWidth = imgWidth + options.margin * 2;
      targetPageHeight = imgHeight + options.margin * 2;
    } else {
      let baseSize: [number, number];
      switch (options.pageSize) {
        case 'letter':
          baseSize = PageSizes.Letter; // [612, 792]
          break;
        case 'legal':
          baseSize = PageSizes.Legal; // [612, 1008]
          break;
        case 'a4':
        default:
          baseSize = PageSizes.A4; // [595.28, 841.89]
          break;
      }

      const isLandscapeOrientation =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && imgWidth > imgHeight);

      if (isLandscapeOrientation) {
        targetPageWidth = Math.max(baseSize[0], baseSize[1]);
        targetPageHeight = Math.min(baseSize[0], baseSize[1]);
      } else {
        targetPageWidth = Math.min(baseSize[0], baseSize[1]);
        targetPageHeight = Math.max(baseSize[0], baseSize[1]);
      }
    }

    const page = pdfDoc.addPage([targetPageWidth, targetPageHeight]);

    // 3. Calculate aspect-ratio fitted image dimensions inside margins
    const usableWidth = targetPageWidth - options.margin * 2;
    const usableHeight = targetPageHeight - options.margin * 2;

    const scaleFactor = Math.min(
      usableWidth / imgWidth,
      usableHeight / imgHeight
    );

    const drawWidth = imgWidth * scaleFactor;
    const drawHeight = imgHeight * scaleFactor;

    // Center image on the page
    const drawX = options.margin + (usableWidth - drawWidth) / 2;
    const drawY = options.margin + (usableHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Helper to rasterize any browser-supported image format (WebP, SVG, GIF) to PNG bytes
 */
async function rasterizeImageToPngBytes(dataUrl: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failure'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Blob export failure'));
          return;
        }
        const ab = await blob.arrayBuffer();
        resolve(new Uint8Array(ab));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load image for rasterization'));
    img.src = dataUrl;
  });
}
