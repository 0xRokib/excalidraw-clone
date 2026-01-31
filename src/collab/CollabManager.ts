import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import type { Element } from "../elements/types.ts";

export class CollabManager {
  public doc: Y.Doc;
  public elementsMap: Y.Map<Element>;
  public awareness: any;
  private provider: WebrtcProvider;

  constructor(roomName: string, onUpdate: (elements: Element[]) => void) {
    this.doc = new Y.Doc();
    this.elementsMap = this.doc.getMap("elements");

    // Setup WebRTC with multiple signaling servers for redundancy
    this.provider = new WebrtcProvider(roomName, this.doc, {
      signaling: [
        "wss://y-webrtc-signaling-eu.herokuapp.com",
        "wss://y-webrtc-signaling-us.herokuapp.com",
        "wss://y-webrtc-ck90.onrender.com",
      ],
      filterBcConns: false, // Ensure broadcast channel is used for same-browser tabs
    });

    this.awareness = this.provider.awareness;

    // Sync elements
    this.elementsMap.observe(() => {
      onUpdate(Array.from(this.elementsMap.values()));
    });

    // Sync awareness (presence, cursors, etc.)
    this.awareness.on("change", () => {
      onUpdate(Array.from(this.elementsMap.values()));
    });

    // Setup local user presence
    this.setupPresence();
  }

  getPeerCount(): number {
    return this.awareness.getStates().size;
  }

  private setupPresence() {
    const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
    this.awareness.setLocalStateField("user", {
      name: `User ${Math.floor(Math.random() * 100)}`,
      color: randomColor,
    });
  }

  updateCursor(x: number, y: number) {
    this.awareness.setLocalStateField("cursor", { x, y });
  }

  setElement(element: Element) {
    this.elementsMap.set(element.id, element);
  }

  removeElement(id: string) {
    this.elementsMap.delete(id);
  }

  getElements(): Element[] {
    return Array.from(this.elementsMap.values());
  }
}
