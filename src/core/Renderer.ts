import rough from "roughjs";
import type { Element } from "../elements/types.ts";
import type { CameraManager } from "./Camera.ts";
import type { Scene } from "./Scene.ts";

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private rc: any;
  private generator: any;
  private scene: Scene;
  private cameraManager: CameraManager;
  private drawableCache: Map<string, { drawable: any; version: number }> =
    new Map();
  private gridStyle: "grid" | "dots" | "none" = "dots";

  constructor(
    canvas: HTMLCanvasElement,
    scene: Scene,
    cameraManager: CameraManager,
  ) {
    this.canvas = canvas;
    this.scene = scene;
    this.cameraManager = cameraManager;
    this.ctx = canvas.getContext("2d", { alpha: false })!;

    // Setup offscreen buffer
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCtx = this.offscreenCanvas.getContext("2d", {
      alpha: false,
    })!;
    this.rc = rough.canvas(this.offscreenCanvas);
    this.generator = this.rc.generator;

    this.setupCanvas();
    this.render();
  }

  public setGridStyle(style: "grid" | "dots" | "none") {
    this.gridStyle = style;
  }

  private setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
  }

  public render = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 1. Prepare Offscreen Buffer
    this.offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.offscreenCtx.fillStyle = document.body.classList.contains("dark-theme")
      ? "#121212"
      : "#f8f9fa";
    this.offscreenCtx.fillRect(0, 0, w, h);

    const camera = this.cameraManager.get();

    // 2. World Space Rendering
    this.offscreenCtx.save();
    this.offscreenCtx.translate(camera.x * camera.zoom, camera.y * camera.zoom);
    this.offscreenCtx.scale(camera.zoom, camera.zoom);

    this.renderGrid(this.offscreenCtx);

    const elements = this.scene.getElements();
    elements.forEach((element) => {
      try {
        this.renderElement(element);
      } catch (e) {
        console.error("Error rendering element:", element, e);
      }
    });

    // Render Laser Pointers
    this.renderLaser(this.offscreenCtx);

    this.renderSelections(this.offscreenCtx);
    this.offscreenCtx.restore();

    // 3. Screen Space Rendering
    this.renderCursors(this.offscreenCtx);

    // 4. Final Blit
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    requestAnimationFrame(this.render);
  };

  private renderGrid(ctx: CanvasRenderingContext2D) {
    if (this.gridStyle === "none") return;

    const camera = this.cameraManager.get();
    const gridSize = 40;
    const zoom = camera.zoom;

    const startX = Math.floor(-camera.x / gridSize) * gridSize;
    const startY = Math.floor(-camera.y / gridSize) * gridSize;
    const endX = startX + window.innerWidth / zoom + gridSize;
    const endY = startY + window.innerHeight / zoom + gridSize;

    const isDark = document.body.classList.contains("dark-theme");
    ctx.strokeStyle = isDark ? "#222" : "#eee";
    ctx.fillStyle = isDark ? "#222" : "#ddd";
    ctx.lineWidth = 0.5 / zoom;

    if (this.gridStyle === "grid") {
      ctx.beginPath();
      for (let x = startX; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
    } else {
      for (let x = startX; x < endX; x += gridSize) {
        for (let y = startY; y < endY; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 0.5, 0, Math.PI * 2);
          ctx.fillStyle = isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)";
          ctx.fill();
        }
      }
    }
  }

  private renderLaser(ctx: CanvasRenderingContext2D) {
    const collab = this.scene.getCollab();
    const states = collab.awareness.getStates();

    states.forEach((state: any) => {
      if (state.laser && state.laser.points) {
        import("../tools/LaserTool.ts").then(({ LaserTool }) => {
          LaserTool.renderLaser(ctx, state.laser.points, 800);
        });
      }
    });
  }

  private renderElement(element: Element) {
    if (!element) return;

    // Handle Text specifically as it doesn't use Rough.js
    if (element.type === "text") {
      if (element.text) {
        this.offscreenCtx.save();
        this.offscreenCtx.fillStyle = element.strokeColor || "#000";
        this.offscreenCtx.font = `${element.fontSize || 20}px 'Patrick Hand', cursive`;
        this.offscreenCtx.textBaseline = "top";
        this.offscreenCtx.textAlign = "left";
        const lines = element.text.split("\n");
        lines.forEach((line, i) => {
          this.offscreenCtx.fillText(
            line,
            element.x,
            element.y + i * (element.fontSize || 20) * 1.2,
          );
        });
        this.offscreenCtx.restore();
      }
      return;
    }

    const cached = this.drawableCache.get(element.id);
    if (cached && cached.version === element.version) {
      const drawables = Array.isArray(cached.drawable)
        ? cached.drawable
        : [cached.drawable];
      drawables.forEach((d: any) => this.rc.draw(d));
      return;
    }

    const options = {
      stroke: element.strokeColor || "#000",
      fill:
        element.backgroundColor === "transparent"
          ? undefined
          : element.backgroundColor,
      strokeWidth: element.strokeWidth || 2,
      roughness: element.roughness ?? 1,
      opacity: element.opacity ?? 1,
    };

    let drawables: any[] = [];

    switch (element.type) {
      case "rectangle":
        drawables.push(
          this.generator.rectangle(
            element.x,
            element.y,
            element.width,
            element.height,
            options,
          ),
        );
        break;
      case "ellipse":
        drawables.push(
          this.generator.ellipse(
            element.x + element.width / 2,
            element.y + element.height / 2,
            element.width,
            element.height,
            options,
          ),
        );
        break;
      case "diamond":
        const hw = element.width / 2;
        const hh = element.height / 2;
        drawables.push(
          this.generator.polygon(
            [
              [element.x + hw, element.y],
              [element.x + element.width, element.y + hh],
              [element.x + hw, element.y + element.height],
              [element.x, element.y + hh],
            ],
            options,
          ),
        );
        break;
      case "line":
        drawables.push(
          this.generator.line(
            element.x,
            element.y,
            element.x + element.width,
            element.y + element.height,
            options,
          ),
        );
        break;
      case "arrow":
        const x1 = element.x,
          y1 = element.y;
        const x2 = element.x + element.width,
          y2 = element.y + element.height;
        drawables.push(this.generator.line(x1, y1, x2, y2, options));
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 15;
        drawables.push(
          this.generator.polygon(
            [
              [x2, y2],
              [
                x2 - headLength * Math.cos(angle - Math.PI / 6),
                y2 - headLength * Math.sin(angle - Math.PI / 6),
              ],
              [
                x2 - headLength * Math.cos(angle + Math.PI / 6),
                y2 - headLength * Math.sin(angle + Math.PI / 6),
              ],
            ],
            { ...options, fill: options.stroke, fillStyle: "solid" },
          ),
        );
        break;
      case "pencil":
        if (element.points && element.points.length > 1) {
          drawables.push(this.generator.linearPath(element.points, options));
        }
        break;
    }

    if (drawables.length > 0) {
      this.drawableCache.set(element.id, {
        drawable: drawables.length === 1 ? drawables[0] : drawables,
        version: element.version,
      });
      drawables.forEach((d) => this.rc.draw(d));
    }
  }

  private renderSelections(ctx: CanvasRenderingContext2D) {
    const collab = this.scene.getCollab();
    const states = collab.awareness.getStates();
    const localId = collab.doc.clientID;

    states.forEach((state: any, clientId: number) => {
      if (!state.selection || state.selection.length === 0) return;

      const elements = this.scene.getElements();
      state.selection.forEach((id: string) => {
        const el = elements.find((e) => e.id === id);
        if (!el) return;

        ctx.save();
        // Use peer's color if it's not the local user, otherwise use standard selection color
        ctx.strokeStyle =
          clientId === localId ? "#6965db" : state.user?.color || "#6965db";
        ctx.lineWidth = 1.5 / this.cameraManager.get().zoom;
        ctx.setLineDash([5, 5]);

        const minX = Math.min(el.x, el.x + el.width);
        const maxX = Math.max(el.x, el.x + el.width);
        const minY = Math.min(el.y, el.y + el.height);
        const maxY = Math.max(el.y, el.y + el.height);

        const padding = 6 / this.cameraManager.get().zoom;
        ctx.strokeRect(
          minX - padding,
          minY - padding,
          maxX - minX + padding * 2,
          maxY - minY + padding * 2,
        );
        ctx.restore();
      });
    });
  }

  private renderCursors(ctx: CanvasRenderingContext2D) {
    const collab = this.scene.getCollab();
    const states = collab.awareness.getStates();
    const localId = collab.doc.clientID;

    states.forEach((state: any, clientId: number) => {
      if (clientId === localId || !state.cursor) return;
      const { x, y } = state.cursor;
      const screenPos = this.cameraManager.worldToScreen(x, y);
      const color = state.user?.color || "#000";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(screenPos.x, screenPos.y);
      ctx.lineTo(screenPos.x + 10, screenPos.y + 15);
      ctx.lineTo(screenPos.x + 4, screenPos.y + 13);
      ctx.lineTo(screenPos.x, screenPos.y + 20);
      ctx.fill();

      ctx.fillRect(
        screenPos.x + 10,
        screenPos.y + 10,
        ctx.measureText(state.user?.name || "Peer").width + 8,
        16,
      );
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.fillText(
        state.user?.name || "Peer",
        screenPos.x + 14,
        screenPos.y + 22,
      );
    });
  }

  public resize() {
    this.setupCanvas();
  }
}
