# 📄 PaperPDF — Modern, In-Browser PDF Editor

> **A fast, privacy-first, 100% client-side PDF editor with direct in-place text editing, annotations, page reorganization, compression, redaction, and zero watermarks.**

PaperPDF is a high-performance alternative to traditional online PDF editors (such as Sejda and Adobe Acrobat). Unlike conventional cloud PDF converters that upload your confidential files to remote servers, **PaperPDF processes everything locally inside your browser** using WebAssembly and `pdf-lib`.

---

## ✨ Key Features

### 🖋️ Direct In-Place Text Editing & Smart Typography
- **Direct In-Place Editing**: Click and edit existing PDF text directly with raster mask elimination (no ghost text / double layers).
- **Intelligent Typography Matching**: Automatically inherits surrounding PDF font families (Helvetica, Times New Roman, Courier, Georgia, Calibri, Roboto), sizes, weights, and colors when adding text.
- **Rich Contextual Toolbar**: Floating, non-obtrusive formatting HUD for font selection, size steppers, bold, italic, underline, paragraph alignment, and color picker.
- **Smart Alignment & Snapping Guides**: Real-time dual-axis (horizontal and vertical) snapping to page centers and neighboring elements.
- **User-Controlled Wrapping & Width**: Horizontal drag handles for custom bounding box expansion and explicit line break control.

### 🛡️ Annotate, Protect & Redact
- **Permanent Redaction & Whiteout**: Erase sensitive data securely from the document stream.
- **Vector Shapes & Drawing**: Add rectangles, ellipses, lines, arrows, and freehand pen annotations.
- **Smart Highlighting**: Auto-straightening text highlighter with blend mode multiply for clear visibility.
- **Digital Signatures**: Draw or upload signatures and place them anywhere.

### 📑 Page Organization & Document Suite
- **Visual Thumbnail Sidebar**: Reorder pages via drag-and-drop, rotate pages, or delete pages instantly.
- **PDF Merging**: Combine multiple PDF files in one seamless session.
- **WASM Document Compression**: Reduce file size directly in the browser.
- **Zero Watermarks**: Export clean, unaltered PDFs without paywalls or forced branding.

### 🔒 100% Client-Side Privacy
- **Zero Server Uploads**: Your documents never leave your device. All rendering and vector export happens in-memory in the browser.

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

## 🌐 Deploy to Vercel

PaperPDF is pre-configured for **1-click zero-config deployment on Vercel**:

1. Fork or push this repository to your GitHub account.
2. Go to [Vercel Dashboard](https://vercel.com/) and click **"Add New Project"**.
3. Import the `paperpdf` repository.
4. Click **Deploy**.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **PDF Rendering Engine**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **PDF Manipulation & Generation**: [pdf-lib](https://pdf-lib.js.org/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📄 License

MIT License — free for personal and commercial use.
