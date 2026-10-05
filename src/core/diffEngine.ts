import * as pdfjsLib from 'pdfjs-dist';

export interface DiffWord {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

export interface DiffResult {
  similarityScore: number; // 0 to 100%
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  wordDiffs: DiffWord[];
  canvasAUrl: string;
  canvasBUrl: string;
  canvasDiffUrl: string;
  width: number;
  height: number;
}

/**
 * Basic Myers diff / Longest Common Subsequence algorithm on word tokens
 */
export function computeWordDiff(textA: string, textB: string): { diffs: DiffWord[]; similarity: number; added: number; removed: number; unchanged: number } {
  const wordsA = textA.split(/\s+/).filter(w => w.length > 0);
  const wordsB = textB.split(/\s+/).filter(w => w.length > 0);

  const n = wordsA.length;
  const m = wordsB.length;

  if (n === 0 && m === 0) {
    return { diffs: [], similarity: 100, added: 0, removed: 0, unchanged: 0 };
  }

  // DP table for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (wordsA[i] === wordsB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build diffs
  const diffs: DiffWord[] = [];
  let i = n;
  let j = m;
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wordsA[i - 1] === wordsB[j - 1]) {
      diffs.unshift({ type: 'unchanged', text: wordsA[i - 1] });
      unchanged++;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffs.unshift({ type: 'added', text: wordsB[j - 1] });
      added++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diffs.unshift({ type: 'removed', text: wordsA[i - 1] });
      removed++;
      i--;
    }
  }

  const totalTokens = Math.max(n, m);
  const similarity = totalTokens > 0 ? Math.round((unchanged / totalTokens) * 1000) / 10 : 100;

  return { diffs, similarity, added, removed, unchanged };
}

/**
 * Render a specific page of a PDF document to an HTMLCanvasElement
 */
export async function renderPdfPageToCanvas(pdfDoc: pdfjsLib.PDFDocumentProxy, pageNumber: number, scale = 1.5): Promise<{ canvas: HTMLCanvasElement; text: string }> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d canvas context');

  // Render visual page
  await page.render({
    canvasContext: ctx,
    viewport,
    canvas: canvas as any,
  } as any).promise;

  // Extract text
  const textContent = await page.getTextContent();
  const text = textContent.items
    .map((item: any) => item.str || '')
    .join(' ');

  return { canvas, text };
}

/**
 * Compare two PDF pages and generate pixel overlay diff + text redline diff
 */
export async function comparePdfPages(
  docA: pdfjsLib.PDFDocumentProxy,
  pageA: number,
  docB: pdfjsLib.PDFDocumentProxy,
  pageB: number
): Promise<DiffResult> {
  const [{ canvas: cA, text: textA }, { canvas: cB, text: textB }] = await Promise.all([
    renderPdfPageToCanvas(docA, pageA),
    renderPdfPageToCanvas(docB, pageB)
  ]);

  const width = Math.max(cA.width, cB.width);
  const height = Math.max(cA.height, cB.height);

  // Prepare normalized canvases
  const normA = document.createElement('canvas');
  normA.width = width;
  normA.height = height;
  const ctxA = normA.getContext('2d')!;
  ctxA.fillStyle = '#ffffff';
  ctxA.fillRect(0, 0, width, height);
  ctxA.drawImage(cA, 0, 0);

  const normB = document.createElement('canvas');
  normB.width = width;
  normB.height = height;
  const ctxB = normB.getContext('2d')!;
  ctxB.fillStyle = '#ffffff';
  ctxB.fillRect(0, 0, width, height);
  ctxB.drawImage(cB, 0, 0);

  const imgDataA = ctxA.getImageData(0, 0, width, height);
  const imgDataB = ctxB.getImageData(0, 0, width, height);

  // Create Diff Overlay
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d')!;
  const diffData = diffCtx.createImageData(width, height);

  const pA = imgDataA.data;
  const pB = imgDataB.data;
  const pD = diffData.data;

  for (let i = 0; i < pA.length; i += 4) {
    const rA = pA[i];
    const gA = pA[i + 1];
    const bA = pA[i + 2];

    const rB = pB[i];
    const gB = pB[i + 1];
    const bB = pB[i + 2];

    // Compute luminance
    const lumA = 0.299 * rA + 0.587 * gA + 0.114 * bA;
    const lumB = 0.299 * rB + 0.587 * gB + 0.114 * bB;

    const diff = Math.abs(lumA - lumB);

    if (diff > 25) {
      if (lumA < lumB) {
        // Pixel removed in B / was present in A -> Red highlight
        pD[i] = 239;     // R
        pD[i + 1] = 68;  // G
        pD[i + 2] = 68;  // B
        pD[i + 3] = 220; // Alpha
      } else {
        // Pixel added in B / was missing in A -> Green highlight
        pD[i] = 34;      // R
        pD[i + 1] = 197; // G
        pD[i + 2] = 94;  // B
        pD[i + 3] = 220; // Alpha
      }
    } else {
      // Unchanged: render semi-transparent grayscale ghost
      pD[i] = lumA;
      pD[i + 1] = lumA;
      pD[i + 2] = lumA;
      pD[i + 3] = 40;
    }
  }

  diffCtx.putImageData(diffData, 0, 0);

  // Compute text diff
  const { diffs: wordDiffs, similarity, added, removed, unchanged } = computeWordDiff(textA, textB);

  return {
    similarityScore: similarity,
    addedCount: added,
    removedCount: removed,
    unchangedCount: unchanged,
    wordDiffs,
    canvasAUrl: normA.toDataURL('image/png'),
    canvasBUrl: normB.toDataURL('image/png'),
    canvasDiffUrl: diffCanvas.toDataURL('image/png'),
    width,
    height,
  };
}
