export type ElementType =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "pencil"
  | "text";

export interface Element {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  version: number;
  authorId: string;
  // Pencil/Line specific
  points?: [number, number][];
  // Text specific
  text?: string;
  fontSize?: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Presence {
  cursor: { x: number; y: number } | null;
  username: string;
  color: string;
  selection: string[];
}
