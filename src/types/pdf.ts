export type ToolMode = 
  | 'select' 
  | 'edit-text' 
  | 'add-text' 
  | 'text'
  | 'image'
  | 'form-field'
  | 'whiteout' 
  | 'redact' 
  | 'highlight' 
  | 'draw'
  | 'shape'
  | 'signature'
  | 'organize';

export interface PageDimension {
  pageNumber: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  rotation: number;
}

export interface ExtractedTextItem {
  id: string;
  pageIndex: number;
  text: string;
  originalText: string;
  x: number; // PDF point coordinates (from left)
  y: number; // PDF point coordinates (from bottom)
  originalX?: number;
  originalY?: number;
  domX: number; // Normalized DOM coordinates (from left in pt)
  domY: number; // Normalized DOM coordinates (from top in pt)
  originalDomX?: number;
  originalDomY?: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontName?: string;
  color: string; // #rrggbb hex
  backgroundColor?: string; // #rrggbb hex of underlying PDF background
  isBold: boolean;
  isItalic: boolean;
  isUnderline?: boolean;
  align?: 'left' | 'center' | 'right';
  isModified?: boolean;
  isDeleted?: boolean;
}

export interface TextAnnotation {
  id: string;
  type: 'text';
  pageIndex: number;
  x: number; // PDF point coordinates
  y: number; // PDF point coordinates
  domX: number;
  domY: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontName?: string;
  color: string;
  backgroundColor?: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline?: boolean;
  align: 'left' | 'center' | 'right';
}

export interface RectAnnotation {
  id: string;
  type: 'whiteout' | 'redact' | 'highlight';
  pageIndex: number;
  domX: number;
  domY: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
}

export interface FreehandHighlightAnnotation {
  id: string;
  type: 'freehand-highlight';
  pageIndex: number;
  points: { x: number; y: number }[]; // In DOM unzoomed points (scale 1.0)
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface DrawAnnotation {
  id: string;
  type: 'draw';
  pageIndex: number;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface ShapeAnnotation {
  id: string;
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'arrow' | 'line';
  pageIndex: number;
  domX: number;
  domY: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  opacity: number;
}

export interface SignatureAnnotation {
  id: string;
  type: 'signature';
  pageIndex: number;
  domX: number;
  domY: number;
  width: number;
  height: number;
  dataUrl: string;
}

export interface ImageAnnotation {
  id: string;
  type: 'image';
  pageIndex: number;
  domX: number;
  domY: number;
  width: number;
  height: number;
  dataUrl: string;
  name?: string;
  opacity: number; // 0.1 to 1.0
  rotation: number; // 0 to 360 deg
  aspectRatioLocked?: boolean;
}

export interface FormFieldAnnotation {
  id: string;
  type: 'form-field';
  pageIndex: number;
  fieldType: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'date';
  name: string;
  value: string | boolean;
  placeholder?: string;
  options?: string[]; // for dropdown / radio
  required?: boolean;
  readOnly?: boolean;
  domX: number;
  domY: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  borderColor?: string;
}

export type AnnotationItem = 
  | TextAnnotation 
  | RectAnnotation 
  | FreehandHighlightAnnotation 
  | DrawAnnotation
  | ShapeAnnotation
  | SignatureAnnotation
  | ImageAnnotation
  | FormFieldAnnotation;

export interface HistoryState {
  textModifications: Record<string, ExtractedTextItem>;
  annotations: AnnotationItem[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
}

export interface PageNumberConfig {
  enabled: boolean;
  format: 'Page {n} of {total}' | '{n} / {total}' | '{n}';
  position: 'bottom-center' | 'bottom-right' | 'top-right' | 'bottom-left';
  fontSize: number;
  color: string;
}

export interface CompressionSettings {
  level: 'low' | 'medium' | 'extreme';
  imageQuality: number; // 0.1 to 1.0
  compressStreams: boolean;
}
