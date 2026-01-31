import { nanoid } from "nanoid";
import type { Element } from "../elements/types.ts";
import type { ToolContext } from "./BaseTool.ts";
import { BaseTool } from "./BaseTool.ts";

export class TextTool extends BaseTool {
  private isEditing = false;
  private currentElementId: string | null = null;
  private input: HTMLTextAreaElement | null = null;
  private worldPos = { x: 0, y: 0 };

  constructor(context: ToolContext) {
    super(context);
  }

  onPointerDown(e: PointerEvent): void {
    if (this.isEditing) {
      this.finishEditing();
      return;
    }

    const { x, y } = this.context.cameraManager.screenToWorld(
      e.clientX,
      e.clientY,
    );
    this.worldPos = { x, y };
    this.createTextInput(e.clientX, e.clientY);
  }

  onPointerMove(): void {}
  onPointerUp(): void {}

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape" && this.isEditing) {
      this.cancelEditing();
    } else if (e.key === "Enter" && !e.shiftKey && this.isEditing) {
      e.preventDefault();
      this.finishEditing();
    }
  }

  private createTextInput(clientX: number, clientY: number) {
    this.isEditing = true;
    this.currentElementId = nanoid();

    this.input = document.createElement("textarea");
    this.input.style.position = "absolute";
    this.input.style.top = `${clientY}px`;
    this.input.style.left = `${clientX}px`;
    this.input.style.background = "var(--panel-bg)";
    this.input.style.backdropFilter = "blur(10px)";
    this.input.style.border = "1px solid var(--primary-color)";
    this.input.style.outline = "none";
    this.input.style.padding = "4px";
    this.input.style.verticalAlign = "top";
    this.input.style.margin = "0";
    this.input.style.font = "20px 'Patrick Hand', cursive";
    this.input.style.color = "var(--text-color)";
    this.input.style.resize = "none";
    this.input.style.zIndex = "1000";
    this.input.style.overflow = "hidden";
    this.input.style.minWidth = "100px";
    this.input.style.boxShadow = "var(--shadow)";
    this.input.style.borderRadius = "var(--radius-sm)";

    document.body.appendChild(this.input);

    // Slight delay to ensure focus works
    setTimeout(() => this.input?.focus(), 0);

    // Auto-resize textarea
    this.input.oninput = () => {
      if (this.input) {
        this.input.style.height = "auto";
        this.input.style.height = `${this.input.scrollHeight}px`;
        this.input.style.width = "auto";
        this.input.style.width = `${Math.max(100, this.input.scrollWidth)}px`;
      }
    };

    // Save on blur if not cancelled
    this.input.onblur = () => {
      // Small delay to allow potential Esc key to trigger cancelEditing first
      setTimeout(() => {
        if (this.isEditing) {
          this.finishEditing();
        }
      }, 100);
    };
  }

  private finishEditing() {
    if (!this.input || !this.isEditing) return;

    const text = this.input.value.trim();
    if (text) {
      const style = this.context.getCurrentStyle();
      const zoom = this.context.cameraManager.get().zoom;

      const newElement: Element = {
        id: this.currentElementId!,
        type: "text",
        x: this.worldPos.x,
        y: this.worldPos.y,
        width: this.input.offsetWidth / zoom,
        height: this.input.offsetHeight / zoom,
        text: text,
        strokeColor: style.strokeColor,
        backgroundColor: "transparent",
        strokeWidth: style.strokeWidth,
        roughness: 0,
        opacity: style.opacity,
        fontSize: 20,
        version: 1,
        authorId: "local-user",
      };
      this.context.scene.setElement(newElement);
    }

    this.cleanup();
  }

  private cancelEditing() {
    this.isEditing = false; // Mark as not editing to prevent blur from saving
    this.cleanup();
  }

  private cleanup() {
    if (this.input && this.input.parentNode) {
      this.input.parentNode.removeChild(this.input);
    }
    this.input = null;
    this.isEditing = false;
    this.currentElementId = null;
  }

  onDeactivate(): void {
    if (this.isEditing) {
      this.finishEditing();
    }
  }
}
