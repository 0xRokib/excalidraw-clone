import { nanoid } from "nanoid";
import type { Element } from "../elements/types.ts";
import type { ToolContext } from "./BaseTool.ts";
import { BaseTool } from "./BaseTool.ts";

export class TextTool extends BaseTool {
  private isEditing = false;
  private currentElementId: string | null = null;
  private input: HTMLTextAreaElement | null = null;

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
    this.createTextInput(e.clientX, e.clientY, x, y);
  }

  onPointerMove(): void {}
  onPointerUp(): void {}

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape" && this.isEditing) {
      this.cancelEditing();
    } else if (e.key === "Enter" && !e.shiftKey && this.isEditing) {
      this.finishEditing();
    }
  }

  private createTextInput(
    clientX: number,
    clientY: number,
    worldX: number,
    worldY: number,
  ) {
    this.isEditing = true;
    this.currentElementId = nanoid();

    this.input = document.createElement("textarea");
    this.input.style.position = "absolute";
    this.input.style.top = `${clientY}px`;
    this.input.style.left = `${clientX}px`;
    this.input.style.background = "transparent";
    this.input.style.border = "1px dashed #6965db";
    this.input.style.outline = "none";
    this.input.style.padding = "4px";
    this.input.style.margin = "0";
    this.input.style.font = "20px 'Patrick Hand', cursive";
    this.input.style.color = this.context.getCurrentStyle().strokeColor;
    this.input.style.resize = "none";
    this.input.style.zIndex = "1000";
    this.input.style.overflow = "hidden";
    this.input.style.minWidth = "100px";

    document.body.appendChild(this.input);
    this.input.focus();

    // Auto-resize textarea
    this.input.oninput = () => {
      if (this.input) {
        this.input.style.height = "auto";
        this.input.style.height = `${this.input.scrollHeight}px`;
        this.input.style.width = "auto";
        this.input.style.width = `${Math.max(100, this.input.scrollWidth)}px`;
      }
    };

    // Save on blur
    this.input.onblur = () => {
      this.finishEditing(worldX, worldY);
    };
  }

  private finishEditing(worldX?: number, worldY?: number) {
    if (!this.input || !this.isEditing) return;

    const text = this.input.value.trim();
    if (text && worldX !== undefined && worldY !== undefined) {
      const style = this.context.getCurrentStyle();
      const newElement: Element = {
        id: this.currentElementId!,
        type: "text",
        x: worldX,
        y: worldY,
        width: this.input.offsetWidth / this.context.cameraManager.get().zoom,
        height: this.input.offsetHeight / this.context.cameraManager.get().zoom,
        text: text,
        strokeColor: style.strokeColor,
        backgroundColor: "transparent",
        strokeWidth: style.strokeWidth,
        roughness: 0, // Text usually looks better clean
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
    this.finishEditing();
  }
}
