import type { ToolContext } from "./BaseTool.ts";
import { BaseTool } from "./BaseTool.ts";

export class SelectionTool extends BaseTool {
  private isDragging = false;
  private selectedElementId: string | null = null;
  private lastPos = { x: 0, y: 0 };

  constructor(context: ToolContext) {
    super(context);
  }

  onPointerDown(e: PointerEvent): void {
    const { x, y } = this.context.cameraManager.screenToWorld(
      e.clientX,
      e.clientY,
    );
    this.lastPos = { x, y };

    // Hit testing (simple bounding box check)
    const elements = this.context.scene.getElements();
    const hitElement = [...elements].reverse().find((el) => {
      if (el.type === "pencil") {
        // Simple bounding box for pencil
        if (!el.points) return false;
        const xs = el.points.map((p: [number, number]) => p[0]);
        const ys = el.points.map((p: [number, number]) => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      }
      const minX = Math.min(el.x, el.x + el.width);
      const maxX = Math.max(el.x, el.x + el.width);
      const minY = Math.min(el.y, el.y + el.height);
      const maxY = Math.max(el.y, el.y + el.height);

      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    });

    if (hitElement) {
      this.selectedElementId = hitElement.id;
      this.isDragging = true;
      this.syncUI(hitElement);
    } else {
      this.selectedElementId = null;
      // Clear UI active states? Maybe keep them as the "next default" style.
    }

    // Update awareness
    this.context.scene
      .getCollab()
      .awareness.setLocalStateField(
        "selection",
        this.selectedElementId ? [this.selectedElementId] : [],
      );
  }

  private syncUI(el: any) {
    // Update stroke color
    document
      .querySelectorAll("#stroke-colors .color-swatch")
      .forEach((swatch: any) => {
        swatch.classList.toggle(
          "active",
          swatch.dataset.color === el.strokeColor,
        );
      });

    // Update background color
    document
      .querySelectorAll("#bg-colors .color-swatch")
      .forEach((swatch: any) => {
        swatch.classList.toggle(
          "active",
          swatch.dataset.color === el.backgroundColor,
        );
      });

    // Update roughness
    document
      .querySelectorAll("#roughness-btns .style-btn")
      .forEach((btn: any) => {
        btn.classList.toggle(
          "active",
          Number(btn.dataset.value) === el.roughness,
        );
      });

    // Update stroke width
    document
      .querySelectorAll("#stroke-width-btns .style-btn")
      .forEach((btn: any) => {
        btn.classList.toggle(
          "active",
          Number(btn.dataset.value) === el.strokeWidth,
        );
      });
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDragging || !this.selectedElementId) return;

    const { x, y } = this.context.cameraManager.screenToWorld(
      e.clientX,
      e.clientY,
    );
    const dx = x - this.lastPos.x;
    const dy = y - this.lastPos.y;

    const elements = this.context.scene.getElements();
    const element = elements.find((el) => el.id === this.selectedElementId);

    if (element) {
      if (element.type === "pencil") {
        if (element.points) {
          element.points = element.points.map((p: [number, number]) => [
            p[0] + dx,
            p[1] + dy,
          ]);
        }
      } else {
        element.x += dx;
        element.y += dy;
      }
      element.version++;
      this.context.scene.setElement({ ...element });
      this.lastPos = { x, y };
    }
  }

  onPointerUp(): void {
    this.isDragging = false;
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Backspace" || e.key === "Delete") {
      if (this.selectedElementId) {
        this.context.scene.removeElement(this.selectedElementId);
        this.selectedElementId = null;
        this.context.scene
          .getCollab()
          .awareness.setLocalStateField("selection", []);
      }
    }
  }

  onDeactivate(): void {
    this.selectedElementId = null;
    this.isDragging = false;
    this.context.scene
      .getCollab()
      .awareness.setLocalStateField("selection", []);
  }
}
