import type { ToolContext } from "./BaseTool.ts";
import { BaseTool } from "./BaseTool.ts";

export class EraserTool extends BaseTool {
  private isErasing = false;

  constructor(context: ToolContext) {
    super(context);
  }

  onPointerDown(e: PointerEvent): void {
    this.isErasing = true;
    this.eraseAt(e.clientX, e.clientY);
  }

  onPointerMove(e: PointerEvent): void {
    if (this.isErasing) {
      this.eraseAt(e.clientX, e.clientY);
    }
  }

  onPointerUp(): void {
    this.isErasing = false;
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.isErasing = false;
    }
  }

  private eraseAt(clientX: number, clientY: number) {
    const { x, y } = this.context.cameraManager.screenToWorld(clientX, clientY);

    // Simple hit testing - find the element under the cursor and remove it
    const elements = this.context.scene.getElements();
    const hitElement = [...elements].reverse().find((el) => {
      if (el.type === "pencil") {
        if (!el.points) return false;
        // Check if any point is close to the eraser
        return el.points.some((p: [number, number]) => {
          const dx = p[0] - x;
          const dy = p[1] - y;
          return Math.sqrt(dx * dx + dy * dy) < 10; // 10 world units radius
        });
      }

      const minX = Math.min(el.x, el.x + el.width);
      const maxX = Math.max(el.x, el.x + el.width);
      const minY = Math.min(el.y, el.y + el.height);
      const maxY = Math.max(el.y, el.y + el.height);

      // Add a small buffer for easier erasing of thin lines
      const buffer = 5;
      return (
        x >= minX - buffer &&
        x <= maxX + buffer &&
        y >= minY - buffer &&
        y <= maxY + buffer
      );
    });

    if (hitElement) {
      this.context.scene.removeElement(hitElement.id);
    }
  }
}
