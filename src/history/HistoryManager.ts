import * as Y from "yjs";

export class HistoryManager {
  private undoManager: Y.UndoManager;

  constructor(elementsMap: Y.Map<any>) {
    this.undoManager = new Y.UndoManager(elementsMap, {
      captureTimeout: 500, // Group changes within 500ms
    });
  }

  undo() {
    this.undoManager.undo();
  }

  redo() {
    this.undoManager.redo();
  }

  canUndo() {
    return this.undoManager.undoStack.length > 0;
  }

  canRedo() {
    return this.undoManager.redoStack.length > 0;
  }
}
