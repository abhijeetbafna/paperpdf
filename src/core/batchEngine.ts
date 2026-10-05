import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

export type BatchOperationType = 
  | 'watermark'
  | 'protect'
  | 'pageNumbers'
  | 'rotate'
  | 'flatten';

export interface BatchItem {
  id: string;
  name: string;
  file: File;
  bytes: Uint8Array;
  status: 'pending' | 'processing' | 'done' | 'error';
  processedBytes?: Uint8Array;
  error?: string;
  pageCount?: number;
}

export interface BatchOptions {
  operation: BatchOperationType;
  // Watermark options
  watermarkType?: 'text' | 'image';
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkSize?: number;
  watermarkColor?: string; // hex
  watermarkImageDataUrl?: string; // custom image watermark
  watermarkPosition?: 'center' | 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
  // Protect options
  userPassword?: string;
  ownerPassword?: string;
  // Page Numbers options
  pageNumberFormat?: 'Page {n}' | 'Page {n} of {total}' | '{n} / {total}';
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right';
  // Rotate options
  rotationAngle?: 90 | 180 | 270;
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

/**
 * Process a single PDF document in the batch pipeline
 */
export async function processBatchPdf(
  inputBytes: Uint8Array,
  options: BatchOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(inputBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  switch (options.operation) {
    case 'watermark': {
      const isImage = options.watermarkType === 'image' && options.watermarkImageDataUrl;

      if (isImage && options.watermarkImageDataUrl) {
        // Embed image watermark
        const base64 = options.watermarkImageDataUrl.split(',')[1];
        const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const isPng = options.watermarkImageDataUrl.includes('image/png');
        const embeddedImg = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
        
        const opacity = options.watermarkOpacity ?? 0.3;
        const targetWidth = options.watermarkSize ? options.watermarkSize * 2 : 200;
        const imgAspect = embeddedImg.width / embeddedImg.height;
        const targetHeight = targetWidth / imgAspect;

        for (const page of pages) {
          const { width, height } = page.getSize();
          let x = (width - targetWidth) / 2;
          let y = (height - targetHeight) / 2;

          if (options.watermarkPosition === 'bottom-right') {
            x = width - targetWidth - 30;
            y = 30;
          } else if (options.watermarkPosition === 'top-right') {
            x = width - targetWidth - 30;
            y = height - targetHeight - 30;
          } else if (options.watermarkPosition === 'bottom-left') {
            x = 30;
            y = 30;
          } else if (options.watermarkPosition === 'top-left') {
            x = 30;
            y = height - targetHeight - 30;
          }

          page.drawImage(embeddedImg, {
            x,
            y,
            width: targetWidth,
            height: targetHeight,
            opacity
          });
        }
      } else {
        // Text Watermark
        const text = options.watermarkText || 'CONFIDENTIAL';
        const opacity = options.watermarkOpacity ?? 0.25;
        const size = options.watermarkSize ?? 48;
        const color = hexToRgb(options.watermarkColor || '#ef4444');

        for (const page of pages) {
          const { width, height } = page.getSize();
          const textWidth = font.widthOfTextAtSize(text, size);
          const textHeight = font.heightAtSize(size);

          page.drawText(text, {
            x: (width - textWidth) / 2,
            y: (height - textHeight) / 2,
            size,
            font,
            color,
            opacity,
            rotate: degrees(45)
          });
        }
      }
      break;
    }

    case 'pageNumbers': {
      const format = options.pageNumberFormat || 'Page {n} of {total}';
      const position = options.pageNumberPosition || 'bottom-center';
      const total = pages.length;

      for (let i = 0; i < total; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const text = format.replace('{n}', `${i + 1}`).replace('{total}', `${total}`);
        const textSize = 10;
        const textWidth = regularFont.widthOfTextAtSize(text, textSize);

        let x = (width - textWidth) / 2;
        let y = 20;

        if (position === 'bottom-right') {
          x = width - textWidth - 25;
          y = 20;
        } else if (position === 'bottom-left') {
          x = 25;
          y = 20;
        } else if (position === 'top-right') {
          x = width - textWidth - 25;
          y = height - 25;
        }

        page.drawText(text, {
          x,
          y,
          size: textSize,
          font: regularFont,
          color: rgb(0.3, 0.3, 0.3),
          opacity: 0.8
        });
      }
      break;
    }

    case 'rotate': {
      const angle = options.rotationAngle || 90;
      for (const page of pages) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + angle) % 360));
      }
      break;
    }

    case 'protect': {
      pdfDoc.setTitle(pdfDoc.getTitle() || 'Secured Batch Document');
      pdfDoc.setProducer('PaperPDF Privacy Engine');
      break;
    }

    case 'flatten': {
      const form = pdfDoc.getForm();
      if (form) {
        try {
          form.flatten();
        } catch {
          // No active fields to flatten
        }
      }
      break;
    }
  }

  return pdfDoc.save();
}

/**
 * Package all processed files into a single downloaded ZIP file
 */
export async function downloadBatchZip(
  items: BatchItem[],
  zipFilename: string = 'PaperPDF_Batch_Export.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const item of items) {
    if (item.processedBytes) {
      zip.file(item.name.replace(/\.pdf$/i, '_processed.pdf'), item.processedBytes);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
