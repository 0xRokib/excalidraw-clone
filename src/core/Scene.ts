import { CollabManager } from "../collab/CollabManager.ts";
import type { Element } from "../elements/types.ts";

export class Scene {
  private collab: CollabManager;
  private onUpdateListeners: (() => void)[] = [];

  constructor(roomName: string) {
    this.collab = new CollabManager(roomName, () => {
      this.notifyListeners();
    });
  }

  getElements(): Element[] {
    return this.collab.getElements();
  }

  setElement(element: Element) {
    this.collab.setElement(element);
  }

  removeElement(id: string) {
    this.collab.removeElement(id);
  }

  onUpdate(listener: () => void) {
    this.onUpdateListeners.push(listener);
  }

  private notifyListeners() {
    this.onUpdateListeners.forEach((l) => l());
  }

  getCollab() {
    return this.collab;
  }

  getPeerCount() {
    return this.collab.getPeerCount();
  }
}
