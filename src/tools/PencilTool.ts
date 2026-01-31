import { nanoid } from "nanoid";
import type { Element } from "../elements/types.ts";
import type { ToolContext } from "./BaseTool.ts";
import { BaseTool } from "./BaseTool.ts";

export class PencilTool extends BaseTool {
  private isDrawing = false;
  private currentElementId: string | null = null;

  constructor(context: ToolContext) {
    super(context);
  }

  onPointerDown(e: PointerEvent): void {
    const { x, y } = this.context.cameraManager.screenToWorld(
      e.clientX,
      e.clientY,
    );
    this.isDrawing = true;
    this.currentElementId = nanoid();

    const style = this.context.getCurrentStyle();
    const newElement: Element = {
      id: this.currentElementId,
      type: "pencil",
      x: 0, // Points are absolute world coordinates
      y: 0,
      width: 0,
      height: 0,
      strokeColor: style.strokeColor,
      backgroundColor: style.backgroundColor,
      strokeWidth: style.strokeWidth,
      roughness: style.roughness,
      opacity: style.opacity,
      version: 1,
      authorId: "local-user",
      points: [[x, y]],
    };

    this.context.scene.setElement(newElement);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing || !this.currentElementId) return;

    const { x, y } = this.context.cameraManager.screenToWorld(
      e.clientX,
      e.clientY,
    );
    const element = this.context.scene
      .getElements()
      .find((el) => el.id === this.currentElementId);

    if (element && element.points) {
      // Avoid duplicate points
      const lastPoint = element.points[element.points.length - 1];
      if (lastPoint[0] !== x || lastPoint[1] !== y) {
        element.points = [...element.points, [x, y]];
        element.version++;
        this.context.scene.setElement({ ...element });
      }
    }
  }

  onPointerUp(): void {
    this.isDrawing = false;
    this.currentElementId = null;
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      if (this.currentElementId) {
        this.context.scene.removeElement(this.currentElementId);
      }
      this.onPointerUp();
    }
  }
}
