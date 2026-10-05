import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { PDFDocument } from 'pdf-lib';

export type BarcodeType = 
  | 'qr' 
  | 'CODE128' 
  | 'EAN13' 
  | 'EAN8' 
  | 'UPC' 
  | 'CODE39' 
  | 'ITF14';

export interface BarcodeOptions {
  type: BarcodeType;
  text: string;
  fgColor?: string;
  bgColor?: string;
  width?: number; // scale/width factor
  height?: number;
  displayValue?: boolean;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generate a Data URL (PNG image) for QR Code or 1D Barcode
 */
export async function generateBarcodeDataUrl(options: BarcodeOptions): Promise<string> {
  const {
    type,
    text,
    fgColor = '#000000',
    bgColor = '#ffffff',
    qrErrorCorrection = 'M',
    displayValue = true
  } = options;

  if (!text.trim()) {
    throw new Error('Barcode text cannot be empty');
  }

  if (type === 'qr') {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: qrErrorCorrection,
      color: {
        dark: fgColor,
        light: bgColor === 'transparent' ? '#00000000' : bgColor
      },
      margin: 2,
      width: 400
    });
  }

  // 1D Barcodes via JsBarcode and offscreen canvas
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, text, {
    format: type,
    lineColor: fgColor,
    background: bgColor === 'transparent' ? 'transparent' : bgColor,
    displayValue,
    fontSize: 14,
    fontOptions: 'bold',
    margin: 10,
    height: options.height || 60,
    width: 2
  });

  return canvas.toDataURL('image/png');
}

/**
 * Stamp a generated barcode/QR onto a specific page of a PDF document
 */
export async function stampBarcodeOnPdf(
  pdfBytes: Uint8Array,
  barcodeDataUrl: string,
  pageIndex: number,
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center',
  stampWidth: number = 100,
  stampHeight: number = 100,
  margin: number = 30
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(`Invalid page index ${pageIndex}`);
  }

  const page = pages[pageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Convert data URL to bytes
  const base64Data = barcodeDataUrl.split(',')[1];
  const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  const image = await pdfDoc.embedPng(imageBytes);

  let x = margin;
  let y = margin;

  switch (position) {
    case 'top-right':
      x = pageWidth - stampWidth - margin;
      y = pageHeight - stampHeight - margin;
      break;
    case 'top-left':
      x = margin;
      y = pageHeight - stampHeight - margin;
      break;
    case 'bottom-right':
      x = pageWidth - stampWidth - margin;
      y = margin;
      break;
    case 'bottom-left':
      x = margin;
      y = margin;
      break;
    case 'center':
      x = (pageWidth - stampWidth) / 2;
      y = (pageHeight - stampHeight) / 2;
      break;
  }

  page.drawImage(image, {
    x,
    y,
    width: stampWidth,
    height: stampHeight
  });

  return pdfDoc.save();
}
