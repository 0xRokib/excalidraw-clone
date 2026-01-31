import { CameraManager } from "./core/Camera.ts";
import { Renderer } from "./core/Renderer.ts";
import { Scene } from "./core/Scene.ts";
import { SuggestionEngine } from "./core/SuggestionEngine.ts";
import { HistoryManager } from "./history/HistoryManager.ts";
import type { ToolContext } from "./tools/BaseTool.ts";
import { BaseTool } from "./tools/BaseTool.ts";
import { EraserTool } from "./tools/EraserTool.ts";
import { LaserTool } from "./tools/LaserTool.ts";
import { PencilTool } from "./tools/PencilTool.ts";
import { SelectionTool } from "./tools/SelectionTool.ts";
import { ShapeTool } from "./tools/ShapeTool.ts";
import { TextTool } from "./tools/TextTool.ts";

// --- Initialization ---
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const roomName =
  new URLSearchParams(window.location.search).get("room") || "default-room";
const scene = new Scene(roomName);
const cameraManager = new CameraManager();
const renderer = new Renderer(canvas, scene, cameraManager);
const history = new HistoryManager(scene.getCollab().elementsMap);
const suggestionEngine = new SuggestionEngine();

// --- State ---
let currentStyle = {
  strokeColor: "#1e293b",
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
  laser: new LaserTool(context),
};

let activeTool: BaseTool = tools.select;
let isPanning = false;
let lastMousePos = { x: 0, y: 0 };
let spacePressed = false;

// --- Helpers ---
const updateZoomUI = () => {
  const zoom = Math.round(cameraManager.get().zoom * 100);
  const zoomLabel = document.getElementById("zoom-level");
  if (zoomLabel) zoomLabel.textContent = `${zoom}%`;
};

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

const exportToImage = () => {
  const link = document.createElement("a");
  link.download = `antigravity-draw-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

// AI Suggestion Logic
let lastPencilId: string | null = null;
const showSuggestion = (id: string) => {
  const toast = document.getElementById("suggestion-toast");
  if (!toast) return;
  lastPencilId = id;
  toast.style.display = "flex";
  setTimeout(() => {
    if (lastPencilId === id) toast.style.display = "none";
  }, 8000);
};

// --- Event Listeners ---

// Tool Buttons
document.querySelectorAll(".tool-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document.querySelector(".tool-btn.active")?.classList.remove("active");
    const toolId = (e.currentTarget as HTMLButtonElement).dataset.tool!;
    if (tools[toolId]) {
      activeTool.onDeactivate?.();
      activeTool = tools[toolId];
      (e.currentTarget as HTMLButtonElement).classList.add("active");
      canvas.style.cursor =
        toolId === "select"
          ? "default"
          : toolId === "eraser"
            ? "cell"
            : "crosshair";
    }
  });
});

// Property Panel
document.querySelectorAll(".color-swatch").forEach((swatch) => {
  swatch.addEventListener("click", (e) => {
    const containerId = (e.currentTarget as HTMLElement).parentElement?.id;
    document
      .querySelector(`#${containerId} .active`)
      ?.classList.remove("active");
    (e.currentTarget as HTMLElement).classList.add("active");
    const color = (e.currentTarget as HTMLElement).dataset.color!;
    if (containerId === "stroke-colors") {
      currentStyle.strokeColor = color;
      updateSelectedElements({ strokeColor: color });
    } else {
      currentStyle.backgroundColor = color;
      updateSelectedElements({ backgroundColor: color });
    }
  });
});

document.querySelectorAll(".style-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const containerId = (e.currentTarget as HTMLElement).parentElement?.id;
    document
      .querySelector(`#${containerId} .active`)
      ?.classList.remove("active");
    (e.currentTarget as HTMLElement).classList.add("active");
    const val = Number((e.currentTarget as HTMLElement).dataset.value);
    if (containerId === "roughness-btns") {
      currentStyle.roughness = val;
      updateSelectedElements({ roughness: val });
    } else {
      currentStyle.strokeWidth = val;
      updateSelectedElements({ strokeWidth: val });
    }
  });
});

// Canvas Interactions
canvas.addEventListener("pointerdown", (e) => {
  if (spacePressed || e.button === 1) {
    isPanning = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
    return;
  }
  activeTool.onPointerDown(e);
});

window.addEventListener("pointermove", (e) => {
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
    cameraManager.zoomAt(-e.deltaY / 1000, e.clientX, e.clientY);
    updateZoomUI();
  },
  { passive: false },
);

// Global Key Listeners
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    spacePressed = true;
    canvas.style.cursor = "grab";
  }

  // Undo / Redo
  if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ") {
    if (e.shiftKey) history.redo();
    else history.undo();
    return;
  }

  // Clear Canvas (Shift + Backspace)
  if (e.shiftKey && (e.key === "Backspace" || e.key === "Delete")) {
    if (confirm("Clear entire canvas?")) {
      scene.getElements().forEach((el) => scene.removeElement(el.id));
    }
  }

  activeTool.onKeyDown(e);

  // Shortcuts Mapping
  const shortcuts: Record<string, string> = {
    KeyV: "select",
    KeyR: "rectangle",
    KeyO: "ellipse",
    KeyD: "diamond",
    KeyL: "line",
    KeyA: "arrow",
    KeyP: "pencil",
    KeyT: "text",
    KeyE: "eraser",
    KeyK: "laser",
  };
  if (shortcuts[e.code]) {
    document
      .querySelector(`[data-tool="${shortcuts[e.code]}"]`)
      ?.dispatchEvent(new Event("click"));
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    spacePressed = false;
    canvas.style.cursor = "default";
  }
});

// Action Buttons
document.getElementById("export-btn")?.addEventListener("click", exportToImage);
document.getElementById("share-btn")?.addEventListener("click", () => {
  navigator.clipboard.writeText(window.location.href);
  const btn = document.getElementById("share-btn")!;
  const old = btn.innerHTML;
  btn.innerHTML = "<span style='font-size:10px'>COPIED</span>";
  setTimeout(() => (btn.innerHTML = old), 2000);
});

document.getElementById("theme-toggle")?.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  const icon = document.querySelector("#theme-toggle svg")!;
  icon.innerHTML = isDark
    ? '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'
    : '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
});

let gridStyles: ("grid" | "dots" | "none")[] = ["dots", "grid", "none"];
let currentGridIdx = 0;
document.getElementById("grid-toggle")?.addEventListener("click", () => {
  currentGridIdx = (currentGridIdx + 1) % gridStyles.length;
  renderer.setGridStyle(gridStyles[currentGridIdx]);
});

// Zoom Hub
document.getElementById("zoom-in")?.addEventListener("click", () => {
  cameraManager.zoomAt(0.1, window.innerWidth / 2, window.innerHeight / 2);
  updateZoomUI();
});
document.getElementById("zoom-out")?.addEventListener("click", () => {
  cameraManager.zoomAt(-0.1, window.innerWidth / 2, window.innerHeight / 2);
  updateZoomUI();
});
document.getElementById("zoom-reset")?.addEventListener("click", () => {
  cameraManager.set({ zoom: 1 });
  updateZoomUI();
});

// AI Suggestion Handler
document.getElementById("suggestion-toast")?.addEventListener("click", () => {
  if (!lastPencilId) return;
  const el = scene.getElements().find((e) => e.id === lastPencilId);
  if (el) {
    scene.setElement(suggestionEngine.cleanup(el, "rectangle"));
    document.getElementById("suggestion-toast")!.style.display = "none";
  }
});

// Sync UI States
scene.onUpdate(() => {
  const count = scene.getPeerCount();
  const badge = document.querySelector(".collab-badge");
  if (badge) {
    const textNode = badge.childNodes[badge.childNodes.length - 1];
    if (textNode) textNode.textContent = `${count} connected`;
  }

  // AI Suggestion Logic
  const elements = scene.getElements();
  const last = elements[elements.length - 1];
  if (
    last &&
    last.type === "pencil" &&
    last.id !== lastPencilId &&
    last.points &&
    last.points.length > 20
  ) {
    const start = last.points[0];
    const end = last.points[last.points.length - 1];
    const d = Math.sqrt((start[0] - end[0]) ** 2 + (start[1] - end[1]) ** 2);
    if (d < 50) showSuggestion(last.id);
  }
});

window.addEventListener("resize", () => renderer.resize());
updateZoomUI();
