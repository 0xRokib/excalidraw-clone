# Excalidraw Clone: Architectural Blueprint

This document outlines the technical decisions and architecture for the collaborative sketch-style drawing tool.

## 1. High-Level Architecture

The application is built as a **local-first, multiplayer-ready** system.

- **Frontend:** HTML5 Canvas for performance. Vanilla TypeScript for the core logic to avoid framework overhead.
- **State Management:** CRDT (Conflict-free Replicated Data Type) based state using **Yjs**.
- **Rendering:** A single-threaded deterministic render loop that mirrors the CRDT state to the Canvas.

## 2. Why Canvas over SVG?

| Feature     | Canvas (Chosen)                                         | SVG                                |
| ----------- | ------------------------------------------------------- | ---------------------------------- |
| Performance | **Superior** for many elements. Flat memory model.      | Degrades as DOM nodes increase.    |
| Rendering   | Full control over pixel-level operations (DPR scaling). | Limited to CSS/SVG filter effects. |
| Sketch Feel | Easy to implement custom jitter algorithms in the loop. | Requires complex path mutations.   |
| Multiplayer | Easier to ensure deterministic output.                  | DOM state sync can be noisier.     |

## 3. Sketch Feel: The Math

To achieve the "Excalidraw aesthetic," we avoid perfect lines.

- **Gaussian Jitter:** Every point in a shape is offset by a small random value.
- **Interpolation:** We use Catmull-Rom or similar splines to smooth rough pencil strokes.
- **Double Stroking:** Lines are rendered twice with slightly different random seeds to simulate human imperfection.
- **Roughness Parameter:** A configurable variance value that controls how "shaky" the lines look.

## 4. Collaboration Architecture (CRDT + WebRTC)

- **CRDT (Yjs):** We treat the Scene as a collection of immutable elements in a `Y.Map`.
- **Merge Strategy:** Yjs handles concurrent edits (e.g., two users moving the same box) by using timestamps and logical clocks to ensure eventual consistency without a central server.
- **Networking:**
  - **WebRTC:** Direct P2P syncing for lowest possible latency.
  - **Signaling:** A minimal WebSocket server handles initial peer discovery.
- **Presence:** `Y.Awareness` tracks cursor positions, usernames, and colors.

## 5. History & Per-User Undo

**The Challenge:** In a multiplayer environment, a global "Undo" is destructive. If User A undoes, they shouldn't revert User B's work.
**The Solution:**

- We use `Y.UndoManager` scoped to the local user's operations.
- **Command Pattern:** Every action (Add, Move, Delete) is a command.
- When `undo()` is called, Yjs identifies the last operation authored by the local user and reverts it. If User B has since modified that specific element, Yjs attempts a "smart revert" or preserves the latest state if a total conflict occurs.

## 6. AI-Assisted Features

- **Shape Cleanup:** A heuristic matching algorithm that checks if a rough drawing resembles a primitive (Circle, Square, Triangle) and offers to "snap" it.
- **Non-Intrusive UX:** Suggestions appear as subtle ghost outlines or small UI chips, never forcing a change on the user.
- **Client-Side:** Basic cleanup runs locally for zero latency.

## 7. Folder Structure

```
src/
  core/           # Rendering Pipeline, Input Handling, Camera
  elements/       # Shape logic (Drawers, Hit Testing)
  tools/          # State Machines (Selection, Rectangle, etc.)
  collab/         # Yjs, WebRTC, Awareness
  history/        # Scoped Undo/Redo logic
  ui/             # Toolbars, Sidebars, Context Menus
  math/           # Jitter, Geometry, Collisions
  app.ts          # Entry Point
```

## 8. Development Roadmap

1. **Core Engine:** Canvas setup, camera (pan/zoom), basic rendering.
2. **Tool System:** Pointer event handling, state machine, basic rectangle tool.
3. **Sketch Logic:** Integrating Roughness/Jitter.
4. **Collab:** Yjs integration & Live Cursors.
5. **Undo/Redo:** Per-user command stack.
6. **AI Scaffolding:** Shape detection.
