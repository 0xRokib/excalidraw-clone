import type { Element } from "../elements/types.ts";

export class SuggestionEngine {
  constructor() {}

  public processElement(element: Element) {
    if (
      element.type !== "pencil" ||
      !element.points ||
      element.points.length < 10
    )
      return;

    // Simple heuristic: if start and end points are close, suggest a cleanup
    const start = element.points[0];
    const end = element.points[element.points.length - 1];
    const dist = Math.sqrt(
      Math.pow(start[0] - end[0], 2) + Math.pow(start[1] - end[1], 2),
    );

    if (dist < 30) {
      // Suggest a rectangle or ellipse based on aspect ratio of bounding box
      const xs = element.points.map((p) => p[0]);
      const ys = element.points.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const w = maxX - minX;
      const h = maxY - minY;

      // In a real app, this would trigger a UI popup or subtle ghost.
      // For now, we'll log it and provide a method to perform the cleanup.
      console.log("Suggestion: Cleanup to rectangle or ellipse", { w, h });
    }
  }

  public cleanup(element: Element, toType: "rectangle" | "ellipse"): Element {
    if (!element.points) return element;

    const xs = element.points.map((p) => p[0]);
    const ys = element.points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      ...element,
      type: toType,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      points: undefined,
    };
  }
}
