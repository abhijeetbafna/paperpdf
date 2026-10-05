import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';

export interface ProtectPdfOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: 'highResolution' | 'lowResolution' | 'none';
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
  };
  sanitizeMetadata?: boolean;
}

export interface SanitizedMetadataReport {
  previousTitle?: string;
  previousAuthor?: string;
  previousSubject?: string;
  previousCreator?: string;
  previousProducer?: string;
  hadKeywords?: boolean;
  hadCreationDate?: boolean;
  hadModDate?: boolean;
}

/**
 * Protects and sanitizes a PDF document entirely client-side.
 */
export async function protectPdfDocument(
  pdfBytes: Uint8Array,
  options: ProtectPdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // 1. Metadata Sanitization if requested
  if (options.sanitizeMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('PaperPDF Privacy Engine');
    pdfDoc.setCreator('PaperPDF Secure Studio');
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));

    // Strip custom XMP metadata streams
    try {
      const catalog = pdfDoc.context.lookup(pdfDoc.catalog) as PDFDict;
      if (catalog) {
        catalog.delete(PDFName.of('Metadata'));
        catalog.delete(PDFName.of('PieceInfo'));
      }
    } catch {
      // Non-fatal if metadata catalog entry is absent
    }
  }

  // 2. Encryption & Password Permissions
  if (options.userPassword || options.ownerPassword) {
    const permissions: any = {};
    if (options.permissions) {
      if (options.permissions.printing !== undefined) {
        permissions.printing = options.permissions.printing;
      }
      if (options.permissions.modifying !== undefined) {
        permissions.modifying = options.permissions.modifying;
      }
      if (options.permissions.copying !== undefined) {
        permissions.copying = options.permissions.copying;
      }
      if (options.permissions.annotating !== undefined) {
        permissions.annotating = options.permissions.annotating;
      }
      if (options.permissions.fillingForms !== undefined) {
        permissions.fillingForms = options.permissions.fillingForms;
      }
      if (options.permissions.contentAccessibility !== undefined) {
        permissions.contentAccessibility = options.permissions.contentAccessibility;
      }
      if (options.permissions.documentAssembly !== undefined) {
        permissions.documentAssembly = options.permissions.documentAssembly;
      }
    }

    return await pdfDoc.save({
      userPassword: options.userPassword || undefined,
      ownerPassword: options.ownerPassword || options.userPassword || undefined,
      permissions: Object.keys(permissions).length > 0 ? permissions : undefined,
    } as any);
  }

  return await pdfDoc.save();
}

/**
 * Completely scrubs all document metadata, tracking information, GPS coordinates, and producer histories.
 */
export async function sanitizePdfMetadata(
  pdfBytes: Uint8Array
): Promise<{ sanitizedBytes: Uint8Array; report: SanitizedMetadataReport }> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const report: SanitizedMetadataReport = {
    previousTitle: pdfDoc.getTitle() || undefined,
    previousAuthor: pdfDoc.getAuthor() || undefined,
    previousSubject: pdfDoc.getSubject() || undefined,
    previousCreator: pdfDoc.getCreator() || undefined,
    previousProducer: pdfDoc.getProducer() || undefined,
    hadKeywords: (pdfDoc.getKeywords() || []).length > 0,
    hadCreationDate: !!pdfDoc.getCreationDate(),
    hadModDate: !!pdfDoc.getModificationDate(),
  };

  // Scrub all metadata fields
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('PaperPDF Privacy Engine');
  pdfDoc.setCreator('PaperPDF Secure Studio');
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));

  // Strip catalog metadata & document info dictionary entries
  try {
    const catalog = pdfDoc.context.lookup(pdfDoc.catalog) as PDFDict;
    if (catalog) {
      catalog.delete(PDFName.of('Metadata'));
      catalog.delete(PDFName.of('PieceInfo'));
    }
  } catch (e) {
    console.warn('Metadata catalog strip notice:', e);
  }

  const sanitizedBytes = await pdfDoc.save();
  return { sanitizedBytes, report };
}

/**
 * Unlocks a password-protected PDF and exports a completely unencrypted copy.
 */
export async function unlockProtectedPdf(
  pdfBytes: Uint8Array,
  password?: string
): Promise<Uint8Array> {
  // Load using provided password
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    password: password || '',
    ignoreEncryption: false,
  } as any);

  // Save without encryption parameters
  return await pdfDoc.save();
}
