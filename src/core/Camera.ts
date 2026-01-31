import type { Camera } from "../elements/types.ts";

export class CameraManager {
  private camera: Camera = { x: 0, y: 0, zoom: 1 };

  constructor() {}

  get() {
    return { ...this.camera };
  }

  set(camera: Partial<Camera>) {
    this.camera = { ...this.camera, ...camera };
  }

  pan(dx: number, dy: number) {
    this.camera.x += dx / this.camera.zoom;
    this.camera.y += dy / this.camera.zoom;
  }

  zoomAt(delta: number, centerX: number, centerY: number) {
    const oldZoom = this.camera.zoom;
    const newZoom = Math.min(Math.max(0.1, oldZoom * (1 + delta)), 10);

    // Adjust camera position to keep center point fixed
    const worldX = centerX / oldZoom - this.camera.x;
    const worldY = centerY / oldZoom - this.camera.y;

    this.camera.zoom = newZoom;
    this.camera.x = centerX / newZoom - worldX;
    this.camera.y = centerY / newZoom - worldY;
  }

  screenToWorld(x: number, y: number) {
    return {
      x: x / this.camera.zoom - this.camera.x,
      y: y / this.camera.zoom - this.camera.y,
    };
  }

  worldToScreen(x: number, y: number) {
    return {
      x: (x + this.camera.x) * this.camera.zoom,
      y: (y + this.camera.y) * this.camera.zoom,
    };
  }
}
