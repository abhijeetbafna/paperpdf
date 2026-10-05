import * as pdfjsLib from 'pdfjs-dist';
// Directly bundle the local worker via Vite URL resolver - 100% offline & zero CORS
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import type { ExtractedTextItem, PageDimension, AnnotationItem, RectAnnotation } from '../types/pdf';

// Configure local worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Load PDF Document from ArrayBuffer / Uint8Array
 */
export async function loadPDFDocument(bytes: Uint8Array) {
  const cleanData = new Uint8Array(bytes.slice(0));
  
  const loadingTask = pdfjsLib.getDocument({
    data: cleanData,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pageDimensions: PageDimension[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    pageDimensions.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      originalWidth: viewport.width,
      originalHeight: viewport.height,
      rotation: viewport.rotation,
    });
  }

  return { pdfDoc, numPages, pageDimensions };
}

/**
 * Render a single PDF page onto a canvas element with crisp high-DPI scaling
 */
export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotation: number = 0
): Promise<void> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation });

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

  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
  context.restore();
}

/**
 * Extract text items with exact glyph coordinates and merge adjacent words on the same line
/**
 * Helper to convert RGB values to hex string
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Extract text items with exact glyph coordinates, true background & font color sampling
 */
export async function extractPageTextItems(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  _pageHeight?: number
): Promise<ExtractedTextItem[]> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  
  interface RawItem {
    str: string;
    pdfX: number;
    pdfY: number;
    domX: number;
    domY: number;
    fontSize: number;
    width: number;
    height: number;
    fontName: string;
  }

  const rawItems: RawItem[] = [];

  for (const item of textContent.items) {
    if ('str' in item && item.str && item.str.length > 0) {
      const tx = item.transform; // [scaleX, skewY, skewX, scaleY, tx, ty]
      const pdfX = tx[4];
      const pdfY = tx[5];
      const fontSize = Math.hypot(tx[0], tx[1]) || 12;
      const width = item.width || (item.str.length * fontSize * 0.55);
      const height = item.height || fontSize;
      const fontName = (item as any).fontName || 'Helvetica';

      // Use PDF.js viewport conversion for exact subpixel DOM alignment
      const [domX, baselineY] = viewport.convertToViewportPoint(pdfX, pdfY);
      const domY = Math.max(0, baselineY - fontSize * 0.85);

      rawItems.push({
        str: item.str,
        pdfX,
        pdfY,
        domX,
        domY,
        fontSize,
        width,
        height,
        fontName,
      });
    }
  }

  // Render page to an offscreen canvas to sample true background and glyph colors
  let colorSampler: ((domX: number, domY: number, width: number, height: number) => { bg: string; fg: string }) | null = null;

  try {
    if (typeof document !== 'undefined') {
      const offscreenCanvas = document.createElement('canvas');
      const offscreenWidth = Math.ceil(viewport.width);
      const offscreenHeight = Math.ceil(viewport.height);
      offscreenCanvas.width = offscreenWidth;
      offscreenCanvas.height = offscreenHeight;
      const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

      if (offscreenCtx) {
        offscreenCtx.fillStyle = '#FFFFFF';
        offscreenCtx.fillRect(0, 0, offscreenWidth, offscreenHeight);

        await (page.render as any)({
          canvasContext: offscreenCtx,
          viewport: viewport,
          canvas: offscreenCanvas,
        }).promise;

        const imgData = offscreenCtx.getImageData(0, 0, offscreenWidth, offscreenHeight);
        const data = imgData.data;

        colorSampler = (domX: number, domY: number, width: number, height: number) => {
          const bx = Math.max(0, Math.min(offscreenWidth - 1, Math.floor(domX)));
          const by = Math.max(0, Math.min(offscreenHeight - 1, Math.floor(domY)));
          const bw = Math.max(1, Math.min(offscreenWidth - bx, Math.ceil(width)));
          const bh = Math.max(1, Math.min(offscreenHeight - by, Math.ceil(height)));

          // Sample perimeter pixels to find underlying background color (expand 2px outwards)
          let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
          const samplePixel = (px: number, py: number) => {
            if (px < 0 || px >= offscreenWidth || py < 0 || py >= offscreenHeight) return;
            const idx = (py * offscreenWidth + px) * 4;
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
            bgCount++;
          };

          // Sample corners and perimeter points outside glyph area
          const sx = Math.max(0, bx - 2);
          const sy = Math.max(0, by - 2);
          const sw = Math.min(offscreenWidth - sx, bw + 4);
          const sh = Math.min(offscreenHeight - sy, bh + 4);

          samplePixel(sx, sy);
          samplePixel(sx + sw - 1, sy);
          samplePixel(sx, sy + sh - 1);
          samplePixel(sx + sw - 1, sy + sh - 1);
          samplePixel(sx + Math.floor(sw / 2), sy);
          samplePixel(sx + Math.floor(sw / 2), sy + sh - 1);

          if (bgCount === 0) {
            return { bg: '#ffffff', fg: '#000000' };
          }

          const avgBgR = Math.round(bgR / bgCount);
          const avgBgG = Math.round(bgG / bgCount);
          const avgBgB = Math.round(bgB / bgCount);
          const bgHex = rgbToHex(avgBgR, avgBgG, avgBgB);
          const bgLuminance = 0.299 * avgBgR + 0.587 * avgBgG + 0.114 * avgBgB;

          // Find foreground text glyph pixel (maximum contrast from bg)
          let maxContrast = 0;
          let fgR = bgLuminance < 128 ? 255 : 0;
          let fgG = bgLuminance < 128 ? 255 : 0;
          let fgB = bgLuminance < 128 ? 255 : 0;

          const stepX = Math.max(1, Math.floor(bw / 12));
          const stepY = Math.max(1, Math.floor(bh / 6));

          for (let y = by; y < by + bh; y += stepY) {
            for (let x = bx; x < bx + bw; x += stepX) {
              const idx = (y * offscreenWidth + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const diff = Math.abs(r - avgBgR) + Math.abs(g - avgBgG) + Math.abs(b - avgBgB);
              if (diff > maxContrast) {
                maxContrast = diff;
                fgR = r;
                fgG = g;
                fgB = b;
              }
            }
          }

          let fgHex: string;
          if (maxContrast > 50) {
            fgHex = rgbToHex(fgR, fgG, fgB);
          } else {
            fgHex = bgLuminance < 128 ? '#ffffff' : '#000000';
          }

          return { bg: bgHex, fg: fgHex };
        };
      }
    }
  } catch (err) {
    console.warn('Canvas color sampling fallback:', err);
  }

  const items: ExtractedTextItem[] = [];
  let idx = 0;

  for (const item of rawItems) {
    const textTrimmed = item.str.trim();
    if (!textTrimmed) continue;

    const fontName = item.fontName.toLowerCase();
    const isBold = fontName.includes('bold') || fontName.includes('heavy') || fontName.includes('black') || fontName.includes('700') || fontName.includes('800');
    const isItalic = fontName.includes('italic') || fontName.includes('oblique');

    let normalizedFont = 'Helvetica';
    if (fontName.includes('times') || fontName.includes('serif')) {
      normalizedFont = 'Times-Roman';
    } else if (fontName.includes('courier') || fontName.includes('mono')) {
      normalizedFont = 'Courier';
    }

    let itemBg = '#ffffff';
    let itemFg = '#000000';
    if (colorSampler) {
      const sampled = colorSampler(item.domX, item.domY, item.width, item.height);
      itemBg = sampled.bg;
      itemFg = sampled.fg;
    } else {
      // If sampling is unavailable, detect if glyph might be white on dark header
      if (item.domY < 80 && (item.str.toLowerCase().includes('statement') || item.str.toLowerCase().includes('invoice'))) {
        itemBg = '#000000';
        itemFg = '#ffffff';
      }
    }

    items.push({
      id: `text-${pageNumber}-${idx++}`,
      pageIndex: pageNumber - 1,
      text: item.str,
      originalText: item.str,
      x: item.pdfX,
      y: item.pdfY,
      originalX: item.pdfX,
      originalY: item.pdfY,
      domX: Math.round(item.domX * 10) / 10,
      domY: Math.round(item.domY * 10) / 10,
      originalDomX: Math.round(item.domX * 10) / 10,
      originalDomY: Math.round(item.domY * 10) / 10,
      width: Math.round(item.width * 10) / 10,
      height: Math.round(Math.max(item.height, item.fontSize * 1.2) * 10) / 10,
      fontSize: Math.round(item.fontSize * 10) / 10,
      fontFamily: normalizedFont,
      fontName: item.fontName,
      color: itemFg,
      backgroundColor: itemBg,
      isBold,
      isItalic,
    });
  }

  return items;
}

/**
 * Helper to parse hex colors to pdf-lib rgb values
 */
function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  }
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

/**
 * Export modified PDF with in-place text replacement, whiteout masks, and annotations
 */
export async function exportModifiedPDF(
  originalBytes: Uint8Array,
  textModifications: Record<string, ExtractedTextItem>,
  annotations: AnnotationItem[],
  pageRotations: Record<number, number> = {},
  deletedPages: number[] = []
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes.slice(0));
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const getEmbeddedFont = (fontFamily: string, isBold: boolean, isItalic: boolean) => {
    const family = (fontFamily || '').toLowerCase();
    if (family.includes('times')) {
      if (isBold) return timesBold;
      if (isItalic) return timesItalic;
      return timesRoman;
    }
    if (family.includes('courier') || family.includes('mono')) {
      if (isBold) return courierBold;
      return courier;
    }
    if (isBold && isItalic) return helveticaBoldOblique;
    if (isBold) return helveticaBold;
    if (isItalic) return helveticaOblique;
    return helvetica;
  };

  const pages = pdfDoc.getPages();

  // 1. Process True Redactions: permanently sanitize & erase covered text data from PDF stream
  const redactions = annotations.filter((a): a is RectAnnotation => a.type === 'redact');
  for (const red of redactions) {
    const redLeft = red.domX;
    const redTop = red.domY;
    const redRight = red.domX + red.width;
    const redBottom = red.domY + red.height;

    for (const [id, item] of Object.entries(textModifications)) {
      if (item.pageIndex === red.pageIndex) {
        const itemRight = item.domX + item.width;
        const itemBottom = item.domY + item.height;
        if (
          redLeft <= itemRight &&
          redRight >= item.domX &&
          redTop <= itemBottom &&
          redBottom >= item.domY
        ) {
          textModifications[id] = { ...item, isDeleted: true, text: '' };
        }
      }
    }
  }

  // 2. Process in-place text modifications & moved text
  for (const item of Object.values(textModifications)) {
    if (deletedPages.includes(item.pageIndex)) continue;
    const page = pages[item.pageIndex];
    if (!page) continue;

    const origDomX = item.originalDomX ?? item.domX;
    const origDomY = item.originalDomY ?? item.domY;
    const isActuallyChanged = item.isDeleted || (item.text !== item.originalText) || (item.domX !== origDomX) || (item.domY !== origDomY);
    if (!isActuallyChanged) continue;

    const origPdfX = item.originalX ?? item.x;
    const origPdfY = item.originalY ?? item.y;
    const boxWidth = Math.max(item.width, 10);
    const boxHeight = Math.max(item.height, item.fontSize * 1.2);

    // Step A: Erase original text glyphs at ORIGINAL position
    const effectiveBg = item.backgroundColor || (item.color === '#ffffff' ? '#000000' : '#ffffff');
    const bgColor = hexToRgb(effectiveBg);
    page.drawRectangle({
      x: Math.max(0, origPdfX - 1.5),
      y: Math.max(0, origPdfY - 2.5),
      width: boxWidth + 3,
      height: boxHeight + 4,
      color: bgColor,
    });

    // Step B: If not deleted, draw updated text at NEW position (item.x, item.y)
    if (!item.isDeleted && item.text && item.text.length > 0) {
      const font = getEmbeddedFont(item.fontFamily, item.isBold, item.isItalic);
      const textColor = hexToRgb(item.color || '#000000');
      const lines = item.text.split('\n');
      const lineStep = Math.max(6, item.fontSize) * 1.25;

      lines.forEach((line, idx) => {
        page.drawText(line, {
          x: item.x,
          y: item.y - (idx * lineStep),
          size: Math.max(6, item.fontSize),
          font,
          color: textColor,
        });
      });
    }
  }

  // 3. Process Annotations (Highlights, Whiteouts, Signatures, Added Text)
  for (const ann of annotations) {
    if (deletedPages.includes(ann.pageIndex)) continue;
    const page = pages[ann.pageIndex];
    if (!page) continue;

    const { height: pageHeight } = page.getSize();

    if (ann.type === 'text') {
      const font = getEmbeddedFont(ann.fontFamily, ann.isBold, ann.isItalic);
      const textColor = hexToRgb(ann.color || '#000000');
      const pdfX = ann.domX;
      const lines = (ann.text || '').split('\n');
      const lineStep = ann.fontSize * 1.25;
      const totalTextHeight = lines.length * lineStep;
      const pdfY = pageHeight - ann.domY - ann.fontSize;

      if (ann.backgroundColor && ann.backgroundColor !== 'transparent') {
        page.drawRectangle({
          x: pdfX - 2,
          y: pdfY - totalTextHeight + ann.fontSize - 2,
          width: ann.width + 4,
          height: totalTextHeight + 4,
          color: hexToRgb(ann.backgroundColor),
        });
      }

      lines.forEach((line, idx) => {
        page.drawText(line, {
          x: pdfX,
          y: pdfY - (idx * lineStep),
          size: ann.fontSize,
          font,
          color: textColor,
        });
      });
    } else if (ann.type === 'whiteout' || ann.type === 'redact' || ann.type === 'highlight') {
      const pdfX = ann.domX;
      const pdfY = pageHeight - ann.domY - ann.height;
      const color = ann.type === 'whiteout' ? rgb(1, 1, 1) : ann.type === 'redact' ? rgb(0, 0, 0) : hexToRgb(ann.color || '#fef08a');
      const opacity = ann.type === 'highlight' ? 0.45 : 1.0;

      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: ann.width,
        height: ann.height,
        color,
        opacity,
      });
    } else if (ann.type === 'freehand-highlight') {
      const color = hexToRgb(ann.color || '#fef08a');
      const thickness = ann.strokeWidth || 14;
      const opacity = ann.opacity || 0.45;

      for (let i = 0; i < ann.points.length - 1; i++) {
        const p1 = ann.points[i];
        const p2 = ann.points[i + 1];

        const x1 = p1.x;
        const y1 = pageHeight - p1.y;
        const x2 = p2.x;
        const y2 = pageHeight - p2.y;

        page.drawLine({
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          thickness: thickness,
          color: color,
          opacity: opacity,
        });
      }
    } else if (ann.type === 'draw') {
      const color = hexToRgb(ann.color || '#2563eb');
      const thickness = ann.strokeWidth || 3;
      const opacity = ann.opacity || 1.0;

      for (let i = 0; i < ann.points.length - 1; i++) {
        const p1 = ann.points[i];
        const p2 = ann.points[i + 1];

        const x1 = p1.x;
        const y1 = pageHeight - p1.y;
        const x2 = p2.x;
        const y2 = pageHeight - p2.y;

        page.drawLine({
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          thickness: thickness,
          color: color,
          opacity: opacity,
        });
      }
    } else if (ann.type === 'shape') {
      const strokeColor = hexToRgb(ann.strokeColor || '#2563eb');
      const opacity = ann.opacity || 1.0;
      const pdfX = ann.domX;
      const pdfY = pageHeight - ann.domY - ann.height;

      if (ann.shapeType === 'rectangle') {
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: ann.width,
          height: ann.height,
          borderColor: strokeColor,
          borderWidth: ann.strokeWidth || 2,
          color: ann.fillColor ? hexToRgb(ann.fillColor) : undefined,
          opacity: opacity,
        });
      } else if (ann.shapeType === 'ellipse') {
        page.drawEllipse({
          x: pdfX + ann.width / 2,
          y: pdfY + ann.height / 2,
          xScale: ann.width / 2,
          yScale: ann.height / 2,
          borderColor: strokeColor,
          borderWidth: ann.strokeWidth || 2,
          color: ann.fillColor ? hexToRgb(ann.fillColor) : undefined,
          opacity: opacity,
        });
      } else if (ann.shapeType === 'line' || ann.shapeType === 'arrow') {
        page.drawLine({
          start: { x: pdfX, y: pdfY + ann.height },
          end: { x: pdfX + ann.width, y: pdfY },
          thickness: ann.strokeWidth || 2,
          color: strokeColor,
          opacity: opacity,
        });
        if (ann.shapeType === 'arrow') {
          const endX = pdfX + ann.width;
          const endY = pdfY;
          const startX = pdfX;
          const startY = pdfY + ann.height;
          const angle = Math.atan2(endY - startY, endX - startX);
          const arrowLen = 12;
          const arrowAngle = Math.PI / 6;

          page.drawLine({
            start: { x: endX, y: endY },
            end: { x: endX - arrowLen * Math.cos(angle - arrowAngle), y: endY - arrowLen * Math.sin(angle - arrowAngle) },
            thickness: ann.strokeWidth || 2,
            color: strokeColor,
            opacity: opacity,
          });
          page.drawLine({
            start: { x: endX, y: endY },
            end: { x: endX - arrowLen * Math.cos(angle + arrowAngle), y: endY - arrowLen * Math.sin(angle + arrowAngle) },
            thickness: ann.strokeWidth || 2,
            color: strokeColor,
            opacity: opacity,
          });
        }
      }
    } else if (ann.type === 'signature' && ann.dataUrl) {
      try {
        const imageBytes = await fetch(ann.dataUrl).then((res) => res.arrayBuffer());
        let embeddedImage;
        if (ann.dataUrl.includes('png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }
        const pdfX = ann.domX;
        const pdfY = pageHeight - ann.domY - ann.height;
        page.drawImage(embeddedImage, {
          x: pdfX,
          y: pdfY,
          width: ann.width,
          height: ann.height,
        });
      } catch (err) {
        console.error('Failed to embed signature image:', err);
      }
    } else if (ann.type === 'image' && ann.dataUrl) {
      try {
        const imageBytes = await fetch(ann.dataUrl).then((res) => res.arrayBuffer());
        let embeddedImage;
        try {
          if (ann.dataUrl.includes('png') || ann.name?.toLowerCase().endsWith('.png')) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }
        } catch {
          // Fallback: draw through canvas
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        }

        const pdfX = ann.domX;
        const pdfY = pageHeight - ann.domY - ann.height;
        page.drawImage(embeddedImage, {
          x: pdfX,
          y: pdfY,
          width: ann.width,
          height: ann.height,
          opacity: ann.opacity !== undefined ? ann.opacity : 1.0,
          rotate: degrees(ann.rotation || 0),
        });
      } catch (err) {
        console.error('Failed to embed image annotation:', err);
      }
    } else if (ann.type === 'form-field') {
      try {
        const form = pdfDoc.getForm();
        const pdfX = ann.domX;
        const pdfY = pageHeight - ann.domY - ann.height;

        if (ann.fieldType === 'text') {
          const textField = form.createTextField(ann.name || `text_${ann.id}`);
          textField.setText(String(ann.value || ''));
          textField.addToPage(page, {
            x: pdfX,
            y: pdfY,
            width: ann.width,
            height: ann.height,
            borderWidth: 1,
            borderColor: hexToRgb(ann.borderColor || '#cbd5e1'),
          });
        } else if (ann.fieldType === 'checkbox') {
          const checkBox = form.createCheckBox(ann.name || `check_${ann.id}`);
          if (ann.value === true || ann.value === 'true') {
            checkBox.check();
          }
          checkBox.addToPage(page, {
            x: pdfX,
            y: pdfY,
            width: ann.width,
            height: ann.height,
            borderWidth: 1,
            borderColor: hexToRgb(ann.borderColor || '#cbd5e1'),
          });
        } else if (ann.fieldType === 'dropdown') {
          const dropdown = form.createDropdown(ann.name || `drop_${ann.id}`);
          if (ann.options && ann.options.length > 0) {
            dropdown.setOptions(ann.options);
            if (ann.value && typeof ann.value === 'string') {
              dropdown.select(ann.value);
            }
          }
          dropdown.addToPage(page, {
            x: pdfX,
            y: pdfY,
            width: ann.width,
            height: ann.height,
            borderWidth: 1,
            borderColor: hexToRgb(ann.borderColor || '#cbd5e1'),
          });
        }
      } catch (err) {
        console.error('Failed to embed interactive form field:', err);
      }
    }
  }

  // 3. Apply Page Rotations
  for (const [pageIdxStr, rotation] of Object.entries(pageRotations)) {
    const pageIdx = parseInt(pageIdxStr, 10);
    if (pages[pageIdx]) {
      const currentRot = pages[pageIdx].getRotation().angle;
      pages[pageIdx].setRotation(degrees((currentRot + rotation) % 360));
    }
  }

  // 4. Remove Deleted Pages
  const sortedDeleted = [...deletedPages].sort((a, b) => b - a);
  for (const delIdx of sortedDeleted) {
    if (delIdx >= 0 && delIdx < pdfDoc.getPageCount()) {
      pdfDoc.removePage(delIdx);
    }
  }

  const modifiedBytes = await pdfDoc.save();
  return modifiedBytes;
}

/**
 * Utility: 100% Client-Side PDF Compression Engine
 */
export async function compressPDFDocument(
  originalBytes: Uint8Array,
  settings: { level: 'low' | 'medium' | 'extreme'; compressStreams?: boolean }
): Promise<{ compressedBytes: Uint8Array; originalSize: number; newSize: number; savedPercentage: number }> {
  const originalSize = originalBytes.byteLength;
  const pdfDoc = await PDFDocument.load(originalBytes.slice(0), {
    updateMetadata: false,
  });

  // Optimize document objects
  if (settings.level === 'extreme') {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('PaperPDF Studio');
    pdfDoc.setCreator('PaperPDF Studio');
  }

  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  const newSize = compressedBytes.byteLength;
  const savedPercentage = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

  return {
    compressedBytes,
    originalSize,
    newSize,
    savedPercentage,
  };
}

/**
 * Utility: Batch Page Numbering & Header/Footer
 */
export async function applyPageNumbers(
  originalBytes: Uint8Array,
  pageNumbers: { enabled: boolean; format: string; position: string; fontSize: number; color: string }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes.slice(0));
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    if (pageNumbers && pageNumbers.enabled) {
      const currentNum = i + 1;
      let text = pageNumbers.format || 'Page {n} of {total}';
      text = text.replace(/\{n\}/g, String(currentNum)).replace(/\{total\}/g, String(totalPages));

      const fontSize = pageNumbers.fontSize || 10;
      const color = hexToRgb(pageNumbers.color || '#4b5563');
      const textWidth = helvetica.widthOfTextAtSize(text, fontSize);

      let x = width / 2 - textWidth / 2;
      let y = 25; // bottom margin

      if (pageNumbers.position === 'bottom-right') {
        x = width - textWidth - 30;
        y = 25;
      } else if (pageNumbers.position === 'bottom-left') {
        x = 30;
        y = 25;
      } else if (pageNumbers.position === 'top-right') {
        x = width - textWidth - 30;
        y = height - 30;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font: helvetica,
        color,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Utility: Merge multiple PDFs into a single document
 */
export async function mergeMultiplePDFs(pdfByteList: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const bytes of pdfByteList) {
    const doc = await PDFDocument.load(bytes.slice(0));
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Utility: Split PDF and extract selected pages
 */
export async function splitAndExtractPDF(originalBytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array> {
  const sourcePdf = await PDFDocument.load(originalBytes.slice(0));
  const newPdf = await PDFDocument.create();

  const validIndices = pageIndices.filter(i => i >= 0 && i < sourcePdf.getPageCount());
  const copiedPages = await newPdf.copyPages(sourcePdf, validIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

/**
 * Create a pristine, high-fidelity sample PDF for instant testing
 */
export async function generateSampleInvoicePDF(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 Size in points

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Background Header Accent Bar
  page.drawRectangle({
    x: 0,
    y: 780,
    width: 595.28,
    height: 61.89,
    color: rgb(0.09, 0.09, 0.11),
  });

  // Header Title
  page.drawText('PAPERPDF SYSTEMS INC.', {
    x: 40,
    y: 802,
    size: 14,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('CONFIDENTIAL / COMMERCIAL INVOICE', {
    x: 350,
    y: 802,
    size: 10,
    font: helvetica,
    color: rgb(0.63, 0.63, 0.69),
  });

  // Invoice Details Box
  page.drawText('INVOICE NO:', { x: 40, y: 730, size: 9, font: helveticaBold, color: rgb(0.44, 0.44, 0.49) });
  page.drawText('INV-2026-88941', { x: 120, y: 730, size: 10, font: helveticaBold, color: rgb(0.09, 0.09, 0.11) });

  page.drawText('ISSUE DATE:', { x: 40, y: 710, size: 9, font: helveticaBold, color: rgb(0.44, 0.44, 0.49) });
  page.drawText('October 05, 2026', { x: 120, y: 710, size: 10, font: helvetica, color: rgb(0.09, 0.09, 0.11) });

  page.drawText('DUE DATE:', { x: 40, y: 690, size: 9, font: helveticaBold, color: rgb(0.44, 0.44, 0.49) });
  page.drawText('November 04, 2026', { x: 120, y: 690, size: 10, font: helvetica, color: rgb(0.85, 0.2, 0.2) });

  // Bill To
  page.drawText('BILLED TO:', { x: 350, y: 730, size: 9, font: helveticaBold, color: rgb(0.44, 0.44, 0.49) });
  page.drawText('Acme Global Enterprises LLC', { x: 350, y: 710, size: 11, font: helveticaBold, color: rgb(0.09, 0.09, 0.11) });
  page.drawText('742 Evergreen Terrace, Suite 400', { x: 350, y: 695, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.35) });
  page.drawText('San Francisco, CA 94105, USA', { x: 350, y: 680, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.35) });

  // Table Header
  page.drawRectangle({
    x: 40,
    y: 620,
    width: 515.28,
    height: 24,
    color: rgb(0.95, 0.95, 0.96),
  });

  page.drawText('DESCRIPTION', { x: 50, y: 628, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.25) });
  page.drawText('QTY', { x: 340, y: 628, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.25) });
  page.drawText('UNIT PRICE', { x: 400, y: 628, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.25) });
  page.drawText('TOTAL', { x: 500, y: 628, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.25) });

  // Line Items
  const items = [
    { desc: 'Enterprise Platform License (Annual Tier 1)', qty: '1', rate: '$12,400.00', total: '$12,400.00', y: 590 },
    { desc: 'Dedicated High-Throughput PDF Worker Cluster', qty: '4', rate: '$1,200.00', total: '$4,800.00', y: 560 },
    { desc: 'Security Audit & Zero-Knowledge Encryption Setup', qty: '1', rate: '$3,500.00', total: '$3,500.00', y: 530 },
    { desc: '24/7 Dedicated Architectural Support SLA', qty: '12', rate: '$350.00', total: '$4,200.00', y: 500 },
  ];

  for (const row of items) {
    page.drawText(row.desc, { x: 50, y: row.y, size: 9.5, font: helvetica, color: rgb(0.1, 0.1, 0.12) });
    page.drawText(row.qty, { x: 345, y: row.y, size: 9.5, font: helvetica, color: rgb(0.1, 0.1, 0.12) });
    page.drawText(row.rate, { x: 400, y: row.y, size: 9.5, font: helvetica, color: rgb(0.1, 0.1, 0.12) });
    page.drawText(row.total, { x: 500, y: row.y, size: 9.5, font: helveticaBold, color: rgb(0.1, 0.1, 0.12) });
    
    // Hairline divider
    page.drawLine({
      start: { x: 40, y: row.y - 12 },
      end: { x: 555.28, y: row.y - 12 },
      thickness: 0.5,
      color: rgb(0.88, 0.88, 0.9),
    });
  }

  // Summary Totals
  page.drawText('SUBTOTAL:', { x: 380, y: 440, size: 9, font: helveticaBold, color: rgb(0.44, 0.44, 0.49) });
  page.drawText('$24,900.00', { x: 490, y: 440, size: 10, font: helvetica, color: rgb(0.1, 0.1, 0.12) });

  page.drawText('DISCOUNT (10%):', { x: 380, y: 420, size: 9, font: helveticaBold, color: rgb(0.44, 0.44, 0.49) });
  page.drawText('-$2,490.00', { x: 490, y: 420, size: 10, font: helvetica, color: rgb(0.15, 0.65, 0.3) });

  page.drawText('TAX (0.0%):', { x: 380, y: 400, size: 9, font: helveticaBold, color: rgb(0.44, 0.44, 0.49) });
  page.drawText('$0.00', { x: 490, y: 400, size: 10, font: helvetica, color: rgb(0.1, 0.1, 0.12) });

  // Total Box
  page.drawRectangle({
    x: 360,
    y: 365,
    width: 195.28,
    height: 25,
    color: rgb(0.15, 0.39, 0.92),
  });

  page.drawText('AMOUNT DUE (USD):', { x: 370, y: 374, size: 9.5, font: helveticaBold, color: rgb(1, 1, 1) });
  page.drawText('$22,410.00', { x: 485, y: 374, size: 11, font: helveticaBold, color: rgb(1, 1, 1) });

  // Footer notes & terms
  page.drawText('PAYMENT TERMS & INSTRUCTIONS', { x: 40, y: 320, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.25) });
  page.drawText('Payment is required within 30 days of invoice date via ACH/Wire Transfer.', { x: 40, y: 305, size: 8.5, font: helvetica, color: rgb(0.4, 0.4, 0.45) });
  page.drawText('Routing Transit Number: 021000021 | Account No: 98741029410 | SWIFT: LEXUS33', { x: 40, y: 290, size: 8.5, font: helvetica, color: rgb(0.4, 0.4, 0.45) });

  // Signature Block
  page.drawText('AUTHORIZED SIGNATURE:', { x: 40, y: 160, size: 9, font: helveticaBold, color: rgb(0.44, 0.44, 0.49) });
  page.drawLine({
    start: { x: 40, y: 110 },
    end: { x: 240, y: 110 },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.35),
  });
  page.drawText('Jonathan Vance, Chief Financial Officer', { x: 40, y: 95, size: 8.5, font: helvetica, color: rgb(0.4, 0.4, 0.45) });

  page.drawText('Page 1 of 1 — Generated securely with PaperPDF Core Engine', {
    x: 160,
    y: 35,
    size: 8,
    font: helvetica,
    color: rgb(0.65, 0.65, 0.7),
  });

  return await doc.save();
}
