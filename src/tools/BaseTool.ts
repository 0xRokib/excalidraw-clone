import type { CameraManager } from "../core/Camera.ts";
import type { Scene } from "../core/Scene.ts";

export interface ToolStyle {
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  roughness: number;
  opacity: number;
}

export interface ToolContext {
  scene: Scene;
  cameraManager: CameraManager;
  canvas: HTMLCanvasElement;
  getCurrentStyle: () => ToolStyle;
}

export abstract class BaseTool {
  protected context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  abstract onPointerDown(e: PointerEvent): void;
  abstract onPointerMove(e: PointerEvent): void;
  abstract onPointerUp(e: PointerEvent): void;
  abstract onKeyDown(e: KeyboardEvent): void;

  // Cleanup when tool is deactivated
  onDeactivate() {}
}
