import { nanoid } from "nanoid";
import type { Element } from "../elements/types.ts";
import type { ToolContext } from "./BaseTool.ts";
import { BaseTool } from "./BaseTool.ts";

type ShapeType = "rectangle" | "ellipse" | "diamond" | "line" | "arrow";

export class ShapeTool extends BaseTool {
  private isDrawing = false;
  private currentElementId: string | null = null;
  private startPos = { x: 0, y: 0 };
  private shapeType: ShapeType;

  constructor(context: ToolContext, type: ShapeType) {
    super(context);
    this.shapeType = type;
  }

  onPointerDown(e: PointerEvent): void {
    const { x, y } = this.context.cameraManager.screenToWorld(
      e.clientX,
      e.clientY,
    );
    this.isDrawing = true;
    this.startPos = { x, y };
    this.currentElementId = nanoid();

    const style = this.context.getCurrentStyle();
    const newElement: Element = {
      id: this.currentElementId,
      type: this.shapeType,
      x,
      y,
      width: 0,
      height: 0,
      strokeColor: style.strokeColor,
      backgroundColor: style.backgroundColor,
      strokeWidth: style.strokeWidth,
      roughness: style.roughness,
      opacity: style.opacity,
      version: 1,
      authorId: "local-user",
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

    if (element) {
      const width = x - this.startPos.x;
      const height = y - this.startPos.y;

      if (this.shapeType === "line" || this.shapeType === "arrow") {
        element.width = width;
        element.height = height;
      } else {
        element.x = width < 0 ? x : this.startPos.x;
        element.y = height < 0 ? y : this.startPos.y;
        element.width = Math.abs(width);
        element.height = Math.abs(height);
      }

      element.version++;
      this.context.scene.setElement({ ...element });
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
