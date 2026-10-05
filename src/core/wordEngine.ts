import { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Packer 
} from 'docx';
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import mammoth from 'mammoth';

export interface PdfToDocxOptions {
  includeFormatting: boolean;
  pageBreaks: boolean;
}

export interface DocxToPdfOptions {
  pageSize: 'a4' | 'letter';
  margin: number; // in pt (e.g. 54pt = 0.75in)
  fontSize: number; // default 11pt
}

/**
 * Converts a PDF Document Proxy into a structured Microsoft Word (.docx) file.
 */
export async function convertPdfToDocx(
  pdfDocProxy: any,
  options: PdfToDocxOptions = { includeFormatting: true, pageBreaks: true }
): Promise<Blob> {
  if (!pdfDocProxy) {
    throw new Error('No PDF document loaded');
  }

  const numPages = pdfDocProxy.numPages;
  const docxSectionsChildren: (Paragraph)[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocProxy.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    if (items.length === 0) {
      docxSectionsChildren.push(new Paragraph({ text: '' }));
      continue;
    }

    // Group text items by vertical lines (Y position with tolerance)
    const lineGroups: { y: number; items: any[] }[] = [];
    for (const item of items) {
      const y = Math.round((item.transform ? item.transform[5] : 0) * 2) / 2;
      const existing = lineGroups.find((g) => Math.abs(g.y - y) <= 3);
      if (existing) {
        existing.items.push(item);
      } else {
        lineGroups.push({ y, items: [item] });
      }
    }

    // Sort lines top to bottom (PDF Y is from bottom up, so higher Y comes first)
    lineGroups.sort((a, b) => b.y - a.y);

    for (let i = 0; i < lineGroups.length; i++) {
      const group = lineGroups[i];
      // Sort items in line from left to right (X coordinate)
      group.items.sort((a, b) => (a.transform ? a.transform[4] : 0) - (b.transform ? b.transform[4] : 0));

      const lineText = group.items.map((it) => it.str).join(' ').trim();
      if (!lineText) continue;

      // Determine average font size in this line
      const firstItem = group.items[0];
      const fontSizePt = Math.round(firstItem.transform ? Math.hypot(firstItem.transform[0], firstItem.transform[1]) : 12);
      const fontName = (firstItem.fontName || '').toLowerCase();
      const isBold = fontName.includes('bold') || fontName.includes('black') || fontName.includes('heavy') || fontName.includes('700');
      const isItalic = fontName.includes('italic') || fontName.includes('oblique');

      // Detect Headings based on typography
      let heading: any = undefined;
      if (fontSizePt >= 22) {
        heading = HeadingLevel.TITLE;
      } else if (fontSizePt >= 18) {
        heading = HeadingLevel.HEADING_1;
      } else if (fontSizePt >= 14) {
        heading = HeadingLevel.HEADING_2;
      } else if (fontSizePt >= 12.5 && isBold) {
        heading = HeadingLevel.HEADING_3;
      }

      // Build Runs
      const textRuns: TextRun[] = group.items.map((it) => {
        const itemFont = (it.fontName || '').toLowerCase();
        return new TextRun({
          text: it.str + (it.hasEOL ? '' : ' '),
          bold: isBold || itemFont.includes('bold'),
          italics: isItalic || itemFont.includes('italic'),
          size: Math.max(16, fontSizePt * 2), // docx uses half-points (24 = 12pt)
          font: 'Calibri',
        });
      });

      docxSectionsChildren.push(
        new Paragraph({
          children: textRuns,
          heading,
          spacing: {
            before: heading ? 240 : 80,
            after: heading ? 120 : 80,
            line: 276,
          },
        })
      );
    }

    // Add page break between pages
    if (options.pageBreaks && pageNum < numPages) {
      docxSectionsChildren.push(
        new Paragraph({
          pageBreakBefore: true,
          children: [],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch in dxa
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: docxSectionsChildren.length > 0 ? docxSectionsChildren : [new Paragraph({ text: 'Empty Document' })],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Converts a Microsoft Word (.docx) file into a formatted PDF document.
 */
export async function convertDocxToPdf(
  docxFile: File | ArrayBuffer,
  options: DocxToPdfOptions = { pageSize: 'a4', margin: 54, fontSize: 11 }
): Promise<Uint8Array> {
  const arrayBuffer = docxFile instanceof ArrayBuffer 
    ? docxFile 
    : await docxFile.arrayBuffer();

  const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
  const htmlContent = mammothResult.value;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const baseSize = options.pageSize === 'letter' ? PageSizes.Letter : PageSizes.A4;
  const pageWidth = baseSize[0];
  const pageHeight = baseSize[1];
  const margin = options.margin;
  const contentWidth = pageWidth - margin * 2;

  // Simple DOM parser for HTML tokens
  const parser = new DOMParser();
  const docDom = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
  const elements = Array.from(docDom.body.firstElementChild?.children || []);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - margin;

  const checkPageOverflow = (neededHeight: number) => {
    if (cursorY - neededHeight < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - margin;
    }
  };

  const wrapText = (text: string, font: any, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (!word) continue;
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width <= maxW) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  };

  if (elements.length === 0) {
    // Fallback: extract raw text if HTML elements were empty
    const rawResult = await mammoth.extractRawText({ arrayBuffer });
    const rawLines = rawResult.value.split('\n');
    for (const line of rawLines) {
      if (!line.trim()) {
        cursorY -= 14;
        continue;
      }
      const wrapped = wrapText(line, fontRegular, options.fontSize, contentWidth);
      for (const wl of wrapped) {
        checkPageOverflow(options.fontSize + 4);
        currentPage.drawText(wl, {
          x: margin,
          y: cursorY - options.fontSize,
          size: options.fontSize,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
        cursorY -= options.fontSize + 4;
      }
    }
  } else {
    for (const el of elements) {
      const tagName = el.tagName.toLowerCase();
      const text = el.textContent || '';
      if (!text.trim()) {
        cursorY -= 10;
        continue;
      }

      let elementFont = fontRegular;
      let elementSize = options.fontSize;
      let spacingBefore = 4;
      let spacingAfter = 6;
      let textColor = rgb(0.12, 0.12, 0.12);
      let indentX = 0;

      if (tagName === 'h1') {
        elementFont = fontBold;
        elementSize = 20;
        spacingBefore = 14;
        spacingAfter = 10;
        textColor = rgb(0.08, 0.15, 0.3);
      } else if (tagName === 'h2') {
        elementFont = fontBold;
        elementSize = 16;
        spacingBefore = 12;
        spacingAfter = 8;
        textColor = rgb(0.1, 0.18, 0.35);
      } else if (tagName === 'h3') {
        elementFont = fontBold;
        elementSize = 13;
        spacingBefore = 8;
        spacingAfter = 6;
      } else if (tagName === 'ul' || tagName === 'ol') {
        const listItems = Array.from(el.querySelectorAll('li'));
        for (let liIdx = 0; liIdx < listItems.length; liIdx++) {
          const liText = listItems[liIdx].textContent || '';
          const prefix = tagName === 'ul' ? '• ' : `${liIdx + 1}. `;
          const wrapped = wrapText(prefix + liText, fontRegular, options.fontSize, contentWidth - 15);
          for (let l = 0; l < wrapped.length; l++) {
            checkPageOverflow(options.fontSize + 4);
            currentPage.drawText(wrapped[l], {
              x: margin + 15,
              y: cursorY - options.fontSize,
              size: options.fontSize,
              font: fontRegular,
              color: rgb(0.15, 0.15, 0.15),
            });
            cursorY -= options.fontSize + 4;
          }
        }
        cursorY -= 4;
        continue;
      } else if (tagName === 'blockquote') {
        elementFont = fontItalic;
        indentX = 20;
        textColor = rgb(0.35, 0.35, 0.35);
      }

      cursorY -= spacingBefore;
      const wrappedLines = wrapText(text, elementFont, elementSize, contentWidth - indentX);

      for (const wLine of wrappedLines) {
        checkPageOverflow(elementSize + 4);
        currentPage.drawText(wLine, {
          x: margin + indentX,
          y: cursorY - elementSize,
          size: elementSize,
          font: elementFont,
          color: textColor,
        });
        cursorY -= elementSize + 4;
      }

      cursorY -= spacingAfter;
    }
  }

  return await pdfDoc.save();
}
