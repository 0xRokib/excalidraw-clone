import type { ToolContext } from "./BaseTool.ts";
import { BaseTool } from "./BaseTool.ts";

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export class LaserTool extends BaseTool {
  private points: Point[] = [];
  private isDrawing = false;
  private rafId: number | null = null;
  private LIFETIME = 800; // ms

  constructor(context: ToolContext) {
    super(context);
  }

  onPointerDown(e: PointerEvent): void {
    this.isDrawing = true;
    this.points = [];
    this.addPoint(e.clientX, e.clientY);
    this.startAnimation();
  }

  onPointerMove(e: PointerEvent): void {
    if (this.isDrawing) {
      this.addPoint(e.clientX, e.clientY);
    }
  }

  onPointerUp(): void {
    this.isDrawing = false;
  }

  private addPoint(clientX: number, clientY: number) {
    const { x, y } = this.context.cameraManager.screenToWorld(clientX, clientY);
    this.points.push({ x, y, timestamp: Date.now() });

    // Send laser event via awareness for collaboration
    this.context.scene.getCollab().awareness.setLocalStateField("laser", {
      points: this.points.slice(-20), // Only send recent points
      timestamp: Date.now(),
    });
  }

  private startAnimation() {
    if (this.rafId) return;

    const animate = () => {
      const now = Date.now();
      this.points = this.points.filter(
        (p) => now - p.timestamp < this.LIFETIME,
      );

      if (this.points.length > 0 || this.isDrawing) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.rafId = null;
        this.context.scene
          .getCollab()
          .awareness.setLocalStateField("laser", null);
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }

  // Not used but needed for interface
  onKeyDown(): void {}

  onDeactivate(): void {
    this.isDrawing = false;
    this.points = [];
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.context.scene.getCollab().awareness.setLocalStateField("laser", null);
  }

  /**
   * Externally called by Renderer to draw the laser
   */
  public static renderLaser(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    lifetime: number,
  ) {
    if (points.length < 2) return;

    const now = Date.now();
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const age = now - p2.timestamp;
      const opacity = Math.max(0, 1 - age / lifetime);

      if (opacity <= 0) continue;

      ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
      ctx.lineWidth = 4 * opacity;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }
}
