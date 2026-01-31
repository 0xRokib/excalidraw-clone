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

// --- Global App Context ---
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const roomName =
  new URLSearchParams(window.location.search).get("room") || "default-room";
const scene = new Scene(roomName);
const cameraManager = new CameraManager();
const renderer = new Renderer(canvas, scene, cameraManager);
const history = new HistoryManager(scene.getCollab().elementsMap);
const suggestionEngine = new SuggestionEngine();

let currentStyle = {
  strokeColor: "#1a1c1e",
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
let isSpacePressed = false;

// --- Helper Functions ---
const updateZoomUI = () => {
  const zoom = Math.round(cameraManager.get().zoom * 100);
  const label = document.getElementById("zoom-val");
  if (label) label.textContent = `${zoom}%`;
};

const updateSelectedElements = (update: Partial<any>) => {
  const selection = scene.getCollab().awareness.getLocalState()?.selection;
  if (selection && selection.length > 0) {
    const elements = scene.getElements();
    selection.forEach((id: string) => {
      const el = elements.find((e) => e.id === id);
      if (el) {
        Object.assign(el, update);
        el.version++;
        scene.setElement({ ...el });
      }
    });
  }
};

const setTool = (toolId: string) => {
  if (!tools[toolId]) return;

  // UI Update
  document.querySelector(".dock-btn.active")?.classList.remove("active");
  const newBtn = document.querySelector(`[data-tool="${toolId}"]`);
  if (newBtn) newBtn.classList.add("active");

  // State Update
  activeTool.onDeactivate?.();
  activeTool = tools[toolId];

  // Cursor Update
  canvas.style.cursor =
    toolId === "select"
      ? "default"
      : toolId === "eraser"
        ? "cell"
        : "crosshair";
};

// --- Event Listeners ---

// Tool Dock
document.querySelectorAll(".dock-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const toolId = (e.currentTarget as HTMLButtonElement).dataset.tool!;
    setTool(toolId);
  });
});

// Properties Panel (Colors & Styles)
document.querySelectorAll(".color-dot").forEach((dot) => {
  dot.addEventListener("click", (e) => {
    const target = e.currentTarget as HTMLElement;
    const colorId = target.parentElement?.id;
    document.querySelector(`#${colorId} .active`)?.classList.remove("active");
    target.classList.add("active");

    const color = target.dataset.color!;
    if (colorId === "stroke-colors") {
      currentStyle.strokeColor = color;
      updateSelectedElements({ strokeColor: color });
    } else {
      currentStyle.backgroundColor = color;
      updateSelectedElements({ backgroundColor: color });
    }
  });
});

document.querySelectorAll(".toggle-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const target = e.currentTarget as HTMLElement;
    const groupId = target.parentElement?.id;
    document.querySelector(`#${groupId} .active`)?.classList.remove("active");
    target.classList.add("active");

    const val = Number(target.dataset.value);
    if (groupId === "roughness-btns") {
      currentStyle.roughness = val;
      updateSelectedElements({ roughness: val });
    } else {
      currentStyle.strokeWidth = val;
      updateSelectedElements({ strokeWidth: val });
    }
  });
});

// Canvas Events
canvas.addEventListener("pointerdown", (e) => {
  if (isSpacePressed || e.button === 1) {
    isPanning = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
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
    canvas.style.cursor = isSpacePressed ? "grab" : "default";
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

// Nav Buttons
document.getElementById("export-btn")?.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `antigravity-draw-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

document.getElementById("share-btn")?.addEventListener("click", () => {
  navigator.clipboard.writeText(window.location.href);
  const btn = document.getElementById("share-btn")!;
  const original = btn.innerHTML;
  btn.innerHTML = `<span style="font-size:10px; font-weight:800; color:var(--accent)">COPIED</span>`;
  setTimeout(() => (btn.innerHTML = original), 2000);
});

document.getElementById("theme-toggle")?.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  const icon = document.querySelector("#theme-icon")!;
  icon.innerHTML = isDark
    ? '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'
    : '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';

  // Set explicit canvas background for export stability
  if (isDark) {
    currentStyle.strokeColor =
      currentStyle.strokeColor === "#1a1c1e"
        ? "#e2e2e2"
        : currentStyle.strokeColor;
  } else {
    currentStyle.strokeColor =
      currentStyle.strokeColor === "#e2e2e2"
        ? "#1a1c1e"
        : currentStyle.strokeColor;
  }
});

let gridStyles: ("dots" | "grid" | "none")[] = ["dots", "grid", "none"];
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

// shortcuts
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    isSpacePressed = true;
    if (!isPanning) canvas.style.cursor = "grab";
  }

  // Undo / Redo
  if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ") {
    if (e.shiftKey) history.redo();
    else history.undo();
    return;
  }

  // Clear All
  if (e.shiftKey && (e.key === "Backspace" || e.key === "Delete")) {
    if (confirm("Reset current drawing?")) {
      scene.getElements().forEach((el) => scene.removeElement(el.id));
    }
  }

  activeTool.onKeyDown(e);

  const keyMap: Record<string, string> = {
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
  if (keyMap[e.code]) setTool(keyMap[e.code]);
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    isSpacePressed = false;
    canvas.style.cursor = "default";
  }
});

// AI Suggestion Handler
let currentAiSuggestionId: string | null = null;
document.getElementById("ai-cleanup-btn")?.addEventListener("click", () => {
  if (!currentAiSuggestionId) return;
  const el = scene.getElements().find((e) => e.id === currentAiSuggestionId);
  if (el) {
    scene.setElement(suggestionEngine.cleanup(el, "rectangle"));
    document.getElementById("ai-toast")!.style.display = "none";
  }
});

// Scene Updates
scene.onUpdate(() => {
  const count = scene.getPeerCount();
  const label = document.getElementById("collab-text");
  if (label)
    label.textContent = `${count} active user${count === 1 ? "" : "s"}`;

  // AI Check
  const elements = scene.getElements();
  const last = elements[elements.length - 1];
  if (
    last &&
    last.type === "pencil" &&
    last.id !== currentAiSuggestionId &&
    last.points &&
    last.points.length > 20
  ) {
    const start = last.points[0];
    const end = last.points[last.points.length - 1];
    const d = Math.sqrt((start[0] - end[0]) ** 2 + (start[1] - end[1]) ** 2);
    if (d < 50) {
      currentAiSuggestionId = last.id;
      const toast = document.getElementById("ai-toast")!;
      toast.style.display = "flex";
      setTimeout(() => {
        if (currentAiSuggestionId === last.id) toast.style.display = "none";
      }, 7000);
    }
  }
});

window.addEventListener("resize", () => renderer.resize());
updateZoomUI();
setTool("pencil"); // Start with pencil for better first impression
