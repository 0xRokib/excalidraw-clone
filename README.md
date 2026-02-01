# 🎨 NovaDraw

**NovaDraw** is a next-generation, local-first collaborative drawing tool built for speed, aesthetics, and seamless teamwork. Inspired by the "pencil-and-paper" feel, it combines a hand-drawn aesthetic with powerful professional features and AI-assisted workflows.

![Banner](https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&q=80&w=2000)

## ✨ key Features

### 📡 Real-Time Collaboration

- **P2P Syncing**: Powered by WebRTC and Yjs (CRDT) for zero-latency multiplayer editing.
- **Live Cursors & Selections**: See exactly where your teammates are working and what they've selected.
- **Presence Badge**: Real-time indicator of active users in the room.
- **Triple-Redundant Signaling**: Automatic failover between multiple signaling servers ensures you stay connected.

### 🤖 AI-Assisted Drawing

- **Smart Cleanup**: A non-intrusive heuristic engine detects rough hand-drawn shapes (circles, boxes) and offers a one-click "Perfect" transformation.
- **Zero Latency**: AI logic runs entirely on the client-side.

### 💎 Flagship UI/UX

- **Infinity Dock**: A futuristic floating tool dock with smooth animations and micro-interactions.
- **Glassmorphism**: A "frosted glass" interface that adapts beautifully to both Light and Dark modes.
- **Ultra-Smooth Pan/Zoom**: Fluid navigation across an infinite canvas using the "Hand Tool" (Spacebar) or mouse wheel.

### ✏️ Professional Toolset

- **Drawing**: Pencil, Rectangle, Ellipse, Diamond, Arrow, and Line.
- **Collaboration**: A collaborative **Laser Pointer** for temporary highlighting.
- **Styling**: Real-time control over stroke width, background fills, and "Roughness" levels.
- **Export**: High-fidelity PNG export for sharing your masterpieces.

## 🌌 The Nova Identity

**NovaDraw** isn't just a rename; it's an evolution. We've shifted from a generic clone to a focused, high-performance canvas engine designed for the modern web.

### 🎨 Design Philosophy

- **Minimalism**: Focus on the content, not the controls.
- **Glassmorphism**: Using real-time backdrop sub-sampling for a premium, integrated feel.
- **Micro-Interactions**: Every click, tool switch, and zoom level change is accompanied by subtle, spring-based animations.

## 🛠️ Tech Stack

- **Core**: TypeScript with a custom reactive rendering loop.
- **Rendering**: HTML5 Canvas + [Rough.js](https://roughjs.com/) for that signature hand-drawn aesthetic.
- **Multiplayer**: [Yjs](https://yjs.dev/) (CRDT) + `y-webrtc` for real-time, conflict-free collaboration.
- **Styling**: Modern CSS Variables, CSS Grid, and sophisticated Glassmorphism.
- **Build Tool**: Powered by Vite for lightning-fast development.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- npm or yarn

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/your-username/novadraw.git
    cd novadraw
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Start the development server**:

    ```bash
    npm run dev
    ```

4.  **Open the app**:
    Navigate to `http://localhost:5173`. Add `?room=my-awesome-room` to the URL to join a specific collaboration session.

## ⌨️ Keyboard Shortcuts

| Shortcut                | Action         |
| :---------------------- | :------------- |
| **`V`**                 | Selection Tool |
| **`P`**                 | Pencil Tool    |
| **`R`**                 | Rectangle Tool |
| **`O`**                 | Ellipse Tool   |
| **`D`**                 | Diamond Tool   |
| **`A`**                 | Arrow Tool     |
| **`L`**                 | Line Tool      |
| **`T`**                 | Text Tool      |
| **`E`**                 | Eraser Tool    |
| **`K`**                 | Laser Pointer  |
| **`Space + Drag`**      | Pan Canvas     |
| **`Cmd/Ctrl + Z`**      | Undo           |
| **`Shift + Backspace`** | Clear Canvas   |

## 🏗️ Architecture

```
src/
  ├── core/           # Engine, Renderer, Camera, Scene logic
  ├── collab/         # Yjs/WebRTC sync management
  ├── elements/       # Shape types and interfaces
  ├── tools/          # State machines for each tool (Rectangle, Pencil, etc.)
  ├── history/        # Multiplayer-safe Undo/Redo
  └── math/           # Geometry and collision detection
```

---

Developed with ❤️ by the **NovaDraw Team**. Perfect for brainstorming, wireframing, and remote collaboration.
