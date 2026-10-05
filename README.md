# 📄 PaperPDF — Next-Gen, 100% In-Browser PDF Suite & Editor

> **A blazing-fast, privacy-first, zero-upload PDF editor and productivity workstation. Features direct in-place text editing, Smart Table $\to$ Excel extraction, AI voice reading (TTS), Visual PDF diffing, Batch processing, and Office conversions — all running 100% locally in your browser.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Server Uploads](https://img.shields.io/badge/Privacy-100%25%20Client--Side-emerald.svg)]()
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple.svg)](https://vite.dev/)

---

## 🌟 Why PaperPDF?

Traditional online PDF tools (Sejda, SmallPDF, iLovePDF, Adobe Acrobat Web) require you to upload your confidential contracts, medical records, financial statements, and personal tax documents to remote servers.

**PaperPDF is fundamentally different:**
- 🔒 **100% Private & Air-Gapped Ready**: Every single PDF byte, image, and text layer is processed in-memory using WebAssembly, `pdf-lib`, and PDF.js. Your documents never touch an external server or API.
- ⚡ **Zero Queueing & No Upload Delays**: Instantaneous processing with no file size limits imposed by cloud servers.
- 🎨 **Modern, Sleek Workspace**: Ultra-responsive Dark & Light theme interface with smooth animations and keyboard shortcuts.
- 🚫 **Zero Watermarks & No Paywalls**: Export pristine, unaltered PDF documents with full formatting fidelity.

---

## ✨ Features Breakdown

### 1. 🖋️ Direct In-Place Text Editing & Smart Typography
- **Direct Canvas Editing**: Click and edit existing PDF text directly with automatic raster mask elimination (no ghost text or overlapping layers).
- **Intelligent Font & Style Matching**: Automatically inherits surrounding font families (Helvetica, Times New Roman, Courier, Georgia, Calibri, Roboto, Outfit), sizing, weights, and colors.
- **Floating Formatting HUD**: Non-obtrusive formatting bar for font family, size steppers, bold, italic, underline, paragraph alignment, and color picking.
- **Smart Alignment & Snapping**: Real-time dual-axis (horizontal and vertical) snapping guides to align with page centers and neighboring elements.
- **User-Controlled Width & Wrapping**: Drag handles for dynamic text bounding boxes and line wraps.

### 2. 📊 Smart PDF Table to Excel & CSV Extractor
- **Spatial Clustering AI Engine**: Automatically analyzes text coordinates and bounding boxes to reconstruct row and column grid lines from tables.
- **Interactive Spreadsheet Grid**: Inspect, add, edit, or delete rows and columns before downloading.
- **Multi-Format Export**: Export detected tables to `.xlsx` (Microsoft Excel), `.csv`, `.json`, and Markdown tables.

### 3. 🔊 Natural Voice Document Reader (TTS)
- **High-Fidelity Text-to-Speech**: Listen to document pages or entire books with synchronized sentence highlights and real-time karaoke tracking.
- **Custom Voice Controls**: Fine-tune speech synthesis voices, playback speed (0.5x – 2.0x), and pitch.
- **Interactive Sentence Navigation**: Click any sentence in the transcript stream to jump audio directly to that phrase.

### 4. ⚖️ Visual PDF Diff & Legal Redline Studio
- **Dual-Document Comparison**: Compare two versions of contracts, blueprints, or documents page-by-page.
- **4 Interactive Comparison Modes**:
  - **Side-by-Side**: Synchronized split comparison view.
  - **Split-Swipe Slider**: Smooth interactive wipe handle to inspect micro-differences.
  - **Difference Heatmap Overlay**: Highlights additions in green and deletions in red.
  - **Legal Text Redline Stream**: Word-by-word tokenized diff showing exact text modifications.

### 5. 📦 Multi-File Batch Processing Studio
- **Bulk Document Surgery**: Process dozens of PDF files simultaneously in-browser.
- **Custom Watermarking**:
  - **Text Watermarks**: Custom angle, font size, color, opacity, and presets (`CONFIDENTIAL`, `DRAFT`, `COPY`).
  - **Logo / Image Watermarks**: Upload PNG/JPG logos with selectable positioning and opacity.
- **Batch Operations**: Bulk page numbering, document rotation, metadata stripping, encryption, and flattening.

### 6. 🔄 Office & Format Converters
- **PDF $\leftrightarrow$ Microsoft Word (.docx)**: Two-way conversion preserving paragraph structure, headings, bold/italic runs, and page breaks.
- **PDF to PowerPoint (.pptx)**: Generates 16:9 presentation slides with high-DPI visuals and extracted speaker notes.
- **PDF to Images**: High-resolution rendering to PNG, JPG, and WebP with customizable DPI presets (150, 300, 600 DPI) and single or bulk `.zip` download.

### 7. 🔍 In-Browser Tesseract OCR Studio
- **Client-Side Optical Character Recognition**: Recognize text from scanned documents and images using WebAssembly Tesseract.
- **Searchable PDF Output**: Re-embeds invisible selectable text layers back onto scanned PDF pages.

### 8. 🔢 Custom Barcode & QR Code Studio
- **Vector Code Generator**: Create QR Codes, Code 128, EAN-13, and Aztec barcodes.
- **Direct PDF Stamping**: Place generated barcodes directly onto document pages with customizable sizing and alignment.

### 9. 🛡️ Page Organization, Forms & Annotations
- **Visual Page Grid**: Rotate, delete, extract, and reorder document pages with interactive previews.
- **Document Splitting**: Extract specific pages or range expressions (`1-3, 5, 8-10`).
- **Interactive Form Builder**: Place text fields, checkboxes, dropdowns, and export form responses to JSON/CSV.
- **Permanent Redaction & Whiteout**: Erase sensitive data securely from the document stream.
- **Digital Signatures**: Draw, type, or upload signature images.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- `npm` or `pnpm`

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/abhijeetbafna/paperpdf.git
cd paperpdf

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Production Build

```bash
npm run build
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tooling** | [Vite 6](https://vite.dev/) |
| **PDF Manipulation & Export** | [pdf-lib](https://pdf-lib.js.org/) |
| **PDF Rendering Engine** | [PDF.js](https://mozilla.github.io/pdf.js/) |
| **Spreadsheet Engine** | [xlsx (SheetJS)](https://sheetjs.com/) |
| **Document Conversion** | [docx](https://docx.js.org/), [pptxgenjs](https://gitbrent.github.io/PptxGenJS/) |
| **OCR Engine** | [Tesseract.js](https://tesseract.projectnaptha.com/) (WebAssembly) |
| **Barcodes & QR** | [bwip-js](https://github.com/metafloor/bwip-js), [qrcode](https://github.com/soldair/node-qrcode) |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **Styling & UI Icons** | Vanilla CSS + [Lucide React](https://lucide.dev/) |

---

## 🌐 1-Click Deployment (Vercel / Netlify / Cloudflare Pages)

PaperPDF is fully static and client-side:

1. Push or fork this repository to your GitHub account.
2. Connect your repo in [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/).
3. Build command: `npm run build` | Output directory: `dist`.
4. Deploy!

---

## 📄 License

MIT License — free for personal, commercial, and enterprise use.
