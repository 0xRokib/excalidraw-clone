import { CameraManager } from "./core/Camera.ts";
import { Renderer } from "./core/Renderer.ts";
import { Scene } from "./core/Scene.ts";
import { HistoryManager } from "./history/HistoryManager.ts";
import type { ToolContext } from "./tools/BaseTool.ts";
import { BaseTool } from "./tools/BaseTool.ts";
import { EraserTool } from "./tools/EraserTool.ts";
import { PencilTool } from "./tools/PencilTool.ts";
import { SelectionTool } from "./tools/SelectionTool.ts";
import { ShapeTool } from "./tools/ShapeTool.ts";
import { TextTool } from "./tools/TextTool.ts";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
// Use a unique room name for local testing or from URL
const roomName =
  new URLSearchParams(window.location.search).get("room") || "default-room";
const scene = new Scene(roomName);
const cameraManager = new CameraManager();
const renderer = new Renderer(canvas, scene, cameraManager);
const history = new HistoryManager(scene.getCollab().elementsMap);

// Export Functionality
const exportToImage = () => {
  const link = document.createElement("a");
  link.download = `antigravity-draw-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

// Style State
let currentStyle = {
  strokeColor: "#000000",
  backgroundColor: "transparent",
  strokeWidth: 2,
  roughness: 1,
  opacity: 1,
};

const context: ToolContext = {
  scene,
  cameraManager,
  canvas,
  getCurrentStyle: () => ({ ...currentStyle }),
};

const tools: Record<string, BaseTool> = {
  select: new SelectionTool(context),
  rectangle: new ShapeTool(context, "rectangle"),
  ellipse: new ShapeTool(context, "ellipse"),
  diamond: new ShapeTool(context, "diamond"),
  line: new ShapeTool(context, "line"),
  arrow: new ShapeTool(context, "arrow"),
  pencil: new PencilTool(context),
  eraser: new EraserTool(context),
  text: new TextTool(context),
};

let activeTool: BaseTool = tools.select;
let isPanning = false;
let lastMousePos = { x: 0, y: 0 };
let spacePressed = false;

// Toolbar handling
document.querySelectorAll(".tool-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document.querySelector(".tool-btn.active")?.classList.remove("active");
    const toolId = (e.currentTarget as HTMLButtonElement).dataset.tool!;
    if (tools[toolId]) {
      activeTool.onDeactivate?.();
      activeTool = tools[toolId];
      (e.currentTarget as HTMLButtonElement).classList.add("active");

      if (toolId === "select") {
        canvas.style.cursor = "default";
      } else if (toolId === "eraser") {
        canvas.style.cursor = "cell";
      } else {
        canvas.style.cursor = "crosshair";
      }
    }
  });
});

// Helper to update selected elements
const updateSelectedElements = (update: Partial<any>) => {
  const selection = context.scene
    .getCollab()
    .awareness.getLocalState()?.selection;
  if (selection && selection.length > 0) {
    const elements = context.scene.getElements();
    selection.forEach((id: string) => {
      const el = elements.find((e) => e.id === id);
      if (el) {
        Object.assign(el, update);
        el.version++;
        context.scene.setElement({ ...el });
      }
    });
  }
};

// Property Panel Listeners
const setupPropertyListeners = () => {
  // Stroke Colors
  document
    .querySelectorAll("#stroke-colors .color-swatch")
    .forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        document
          .querySelector("#stroke-colors .active")
          ?.classList.remove("active");
        (e.currentTarget as HTMLElement).classList.add("active");
        const color = (e.currentTarget as HTMLElement).dataset.color!;
        currentStyle.strokeColor = color;
        updateSelectedElements({ strokeColor: color });
      });
    });

  // Background Colors
  document.querySelectorAll("#bg-colors .color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", (e) => {
      document.querySelector("#bg-colors .active")?.classList.remove("active");
      (e.currentTarget as HTMLElement).classList.add("active");
      const color = (e.currentTarget as HTMLElement).dataset.color!;
      currentStyle.backgroundColor = color;
      updateSelectedElements({ backgroundColor: color });
    });
  });

  // Roughness
  document.querySelectorAll("#roughness-btns .style-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelector("#roughness-btns .active")
        ?.classList.remove("active");
      (e.currentTarget as HTMLElement).classList.add("active");
      const val = Number((e.currentTarget as HTMLElement).dataset.value);
      currentStyle.roughness = val;
      updateSelectedElements({ roughness: val });
    });
  });

  // Stroke Width
  document.querySelectorAll("#stroke-width-btns .style-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelector("#stroke-width-btns .active")
        ?.classList.remove("active");
      (e.currentTarget as HTMLElement).classList.add("active");
      const val = Number((e.currentTarget as HTMLElement).dataset.value);
      currentStyle.strokeWidth = val;
      updateSelectedElements({ strokeWidth: val });
    });
  });
};

setupPropertyListeners();

canvas.addEventListener("pointerdown", (e) => {
  if (spacePressed || e.button === 1) {
    isPanning = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
    return;
  }
  activeTool.onPointerDown(e);
});

window.addEventListener("pointermove", (e) => {
  // Update awareness cursor
  const worldPos = cameraManager.screenToWorld(e.clientX, e.clientY);
  scene.getCollab().updateCursor(worldPos.x, worldPos.y);

  if (isPanning) {
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    cameraManager.pan(dx, dy);
    lastMousePos = { x: e.clientX, y: e.clientY };
    return;
  }
  activeTool.onPointerMove(e);
});

window.addEventListener("pointerup", (e) => {
  if (isPanning) {
    isPanning = false;
    return;
  }
  activeTool.onPointerUp(e);
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = -e.deltaY / 1000;
    cameraManager.zoomAt(delta, e.clientX, e.clientY);
  },
  { passive: false },
);

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    spacePressed = true;
    canvas.style.cursor = "grab";
  }

  // Undo / Redo
  if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ") {
    if (e.shiftKey) {
      history.redo();
    } else {
      history.undo();
    }
    return;
  }

  activeTool.onKeyDown(e);

  if (e.code === "KeyA")
    document
      .querySelector('[data-tool="arrow"]')
      ?.dispatchEvent(new Event("click"));
  if (e.code === "KeyD")
    document
      .querySelector('[data-tool="diamond"]')
      ?.dispatchEvent(new Event("click"));
  if (e.code === "KeyT")
    document
      .querySelector('[data-tool="text"]')
      ?.dispatchEvent(new Event("click"));
  if (e.code === "KeyE")
    document
      .querySelector('[data-tool="eraser"]')
      ?.dispatchEvent(new Event("click"));
  if (e.code === "KeyL")
    document
      .querySelector('[data-tool="line"]')
      ?.dispatchEvent(new Event("click"));
  if (e.code === "KeyR")
    document
      .querySelector('[data-tool="rectangle"]')
      ?.dispatchEvent(new Event("click"));
  if (e.code === "KeyO")
    document
      .querySelector('[data-tool="ellipse"]')
      ?.dispatchEvent(new Event("click"));
  if (e.code === "KeyP")
    document
      .querySelector('[data-tool="pencil"]')
      ?.dispatchEvent(new Event("click"));
  if (e.code === "KeyV")
    document
      .querySelector('[data-tool="select"]')
      ?.dispatchEvent(new Event("click"));
});

// Action Panel Listeners
document.getElementById("export-btn")?.addEventListener("click", exportToImage);
document.getElementById("theme-toggle")?.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  const icon = document.querySelector("#theme-toggle svg") as HTMLElement;
  if (isDark) {
    icon.innerHTML =
      '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>';
  } else {
    icon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />';
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    spacePressed = false;
    canvas.style.cursor = "default";
  }
});

window.addEventListener("resize", () => {
  renderer.resize();
});
