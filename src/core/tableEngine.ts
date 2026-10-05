import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

export interface TableItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  pageNumber: number;
  rawGrid: string[][];
}

/**
 * Extract structured text items with coordinates from a PDF page
 */
export async function getPageTextItems(pdfDoc: pdfjsLib.PDFDocumentProxy, pageNumber: number): Promise<TableItem[]> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();

  const items: TableItem[] = [];

  for (const item of textContent.items as any[]) {
    if (!item.str || item.str.trim() === '') continue;

    // item.transform is [scaleX, skewY, skewX, scaleY, transX, transY]
    const tx = item.transform[4];
    const ty = item.transform[5];
    const w = item.width || 0;
    const h = item.height || Math.abs(item.transform[3]) || 12;

    // Convert PDF coordinates (origin bottom-left) to standard top-left
    const x = tx;
    const y = viewport.height - ty - h;

    items.push({
      str: item.str.trim(),
      x,
      y,
      w,
      h,
    });
  }

  return items;
}

/**
 * Spatial clustering algorithm to auto-detect rows & columns and build a 2D table grid
 */
export function clusterItemsToGrid(items: TableItem[], yTolerance = 6, xTolerance = 14): string[][] {
  if (items.length === 0) return [];

  // 1. Sort items top-to-bottom, then left-to-right
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= yTolerance) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  // 2. Group into distinct row bands
  const rowBands: TableItem[][] = [];
  let currentRow: TableItem[] = [];
  let currentY = sorted[0].y;

  for (const item of sorted) {
    if (Math.abs(item.y - currentY) <= yTolerance) {
      currentRow.push(item);
    } else {
      if (currentRow.length > 0) {
        currentRow.sort((a, b) => a.x - b.x);
        rowBands.push(currentRow);
      }
      currentRow = [item];
      currentY = item.y;
    }
  }
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.x - b.x);
    rowBands.push(currentRow);
  }

  // 3. Find unique column centers across all rows
  const allX = sorted.map(it => it.x).sort((a, b) => a - b);
  const columnCenters: number[] = [];

  for (const x of allX) {
    const existing = columnCenters.find(c => Math.abs(c - x) <= xTolerance);
    if (existing === undefined) {
      columnCenters.push(x);
    }
  }
  columnCenters.sort((a, b) => a - b);

  // 4. Populate 2D grid
  const grid: string[][] = [];

  for (const row of rowBands) {
    const rowCells: string[] = new Array(columnCenters.length).fill('');

    for (const item of row) {
      // Find closest column
      let bestColIdx = 0;
      let minDistance = Infinity;

      columnCenters.forEach((cx, colIdx) => {
        const dist = Math.abs(cx - item.x);
        if (dist < minDistance) {
          minDistance = dist;
          bestColIdx = colIdx;
        }
      });

      if (rowCells[bestColIdx]) {
        rowCells[bestColIdx] += ' ' + item.str;
      } else {
        rowCells[bestColIdx] = item.str;
      }
    }

    // Only keep rows that have at least one non-empty cell
    if (rowCells.some(c => c.trim().length > 0)) {
      grid.push(rowCells);
    }
  }

  return grid;
}

/**
 * Filter items inside a user-selected Region of Interest (ROI) box
 */
export function filterItemsByROI(items: TableItem[], roi: { x: number; y: number; width: number; height: number }): TableItem[] {
  return items.filter(it => {
    const centerX = it.x + it.w / 2;
    const centerY = it.y + it.h / 2;
    return (
      centerX >= roi.x &&
      centerX <= roi.x + roi.width &&
      centerY >= roi.y &&
      centerY <= roi.y + roi.height
    );
  });
}

/**
 * Export table grid to .xlsx Excel file
 */
export function exportToExcel(grid: string[][], filename = 'extracted_table.xlsx') {
  const ws = XLSX.utils.aoa_to_sheet(grid);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TableData');
  XLSX.writeFile(wb, filename);
}

/**
 * Export table grid to CSV string
 */
export function exportToCsv(grid: string[][]): string {
  return grid.map(row => 
    row.map(cell => {
      const escaped = cell.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  ).join('\n');
}

/**
 * Export table grid to JSON object array
 */
export function exportToJson(grid: string[][], hasHeaders = true): string {
  if (grid.length === 0) return '[]';
  
  if (hasHeaders && grid.length > 1) {
    const headers = grid[0].map((h, i) => h.trim() || `Column_${i + 1}`);
    const rows = grid.slice(1).map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });
    return JSON.stringify(rows, null, 2);
  }

  return JSON.stringify(grid, null, 2);
}

/**
 * Export table grid to GitHub Flavored Markdown
 */
export function exportToMarkdown(grid: string[][], hasHeaders = true): string {
  if (grid.length === 0) return '';
  const numCols = Math.max(...grid.map(r => r.length));
  
  const formattedRows = grid.map(row => {
    const cells = [...row];
    while (cells.length < numCols) cells.push('');
    return `| ${cells.map(c => c.replace(/\|/g, '\\|')).join(' | ')} |`;
  });

  if (hasHeaders && grid.length > 0) {
    const divider = `| ${new Array(numCols).fill('---').join(' | ')} |`;
    return [formattedRows[0], divider, ...formattedRows.slice(1)].join('\n');
  }

  return formattedRows.join('\n');
}
