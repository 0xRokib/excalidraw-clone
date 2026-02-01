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
    const zoom = this.context.cameraManager.get().zoom;

    // Radius in world units, ensuring it's at least 15 pixels on screen
    const hitRadius = Math.max(10, 15 / zoom);

    const elements = this.context.scene.getElements();
    const hitElement = [...elements].reverse().find((el) => {
      if (el.type === "pencil") {
        if (!el.points) return false;
        return el.points.some((p: [number, number]) => {
          const dx = p[0] - x;
          const dy = p[1] - y;
          return Math.sqrt(dx * dx + dy * dy) < hitRadius;
        });
      }

      // Special case for thin lines and arrows: check distance to the line segment
      if (el.type === "line" || el.type === "arrow") {
        const x1 = el.x;
        const y1 = el.y;
        const x2 = el.x + el.width;
        const y2 = el.y + el.height;

        // Distance from point (x,y) to line segment (x1,y1)-(x2,y2)
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq != 0) param = dot / len_sq;

        let xx, yy;
        if (param < 0) {
          xx = x1;
          yy = y1;
        } else if (param > 1) {
          xx = x2;
          yy = y2;
        } else {
          xx = x1 + param * C;
          yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy) < hitRadius;
      }

      const minX = Math.min(el.x, el.x + (el.width || 0));
      const maxX = Math.max(el.x, el.x + (el.width || 0));
      const minY = Math.min(el.y, el.y + (el.height || 0));
      const maxY = Math.max(el.y, el.y + (el.height || 0));

      const buffer = hitRadius;
      return (
        x >= minX - buffer &&
        x <= maxX + buffer &&
        y >= minY - buffer &&
        y <= maxY + buffer
      );
    });

    if (hitElement) {
      console.log(`Erasing element: ${hitElement.id} (${hitElement.type})`);
      this.context.scene.removeElement(hitElement.id);
    }
  }
}
