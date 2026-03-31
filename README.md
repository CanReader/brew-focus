# Brew Focus

A coffee-themed Pomodoro timer for the desktop. Built with Tauri 2 and React.

![Brew Focus](https://raw.githubusercontent.com/CanReader/brew-focus/main/src-tauri/icons/128x128.png)

---

## Features

- **Pomodoro timer** — configurable work, short break, and long break durations
- **Animated coffee cup** — fills as your focus session progresses
- **Task management** — create, prioritize, and reorder tasks with drag-and-drop
- **Project organization** — group tasks by color-coded projects
- **Session history** — tracks completed sessions and daily focus time
- **Focus goals** — set a daily target and monitor your progress
- **System tray** — minimize to tray, timer keeps running in the background
- **Fullscreen mode** — distraction-free overlay during work sessions
- **Settings** — accent color themes, auto-start, custom durations
- **Fully local** — no account, no cloud, all data stays on your machine

---

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 18 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS + CSS custom properties |
| Animation | Framer Motion |
| Drag & drop | dnd-kit |
| Persistence | Tauri plugin-store (local JSON) |

---

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable toolchain)
- **Linux only:** WebKit2GTK and GTK development libraries

```bash
# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg
```

---

## Development

```bash
# Install dependencies
npm install

# Run the full desktop app with hot reload (recommended)
npm run tauri:dev

# Run the frontend dev server only (no desktop window)
npm run dev
```

---

## Build

```bash
# Produces a platform-native installer in src-tauri/target/release/bundle/
npm run tauri build
```

---

## Data storage

All app data is persisted to a single JSON file:

| Platform | Path |
|----------|------|
| Linux | `~/.local/share/com.brewfocus.app/brew-focus.json` |
| macOS | `~/Library/Application Support/com.brewfocus.app/brew-focus.json` |
| Windows | `%APPDATA%\com.brewfocus.app\brew-focus.json` |

---

## Project structure

```
src/                    React frontend
├── components/         UI components (FocusScreen, TasksScreen, modals)
├── store/              Zustand stores (task, timer, settings)
├── hooks/useTimer.ts   Timer tick and phase-transition logic
└── types/index.ts      Shared TypeScript types

src-tauri/src/          Rust backend
├── timer.rs            Background timer with Arc/Mutex state
├── commands.rs         Tauri IPC commands
├── tray.rs             System tray icon and menu
└── events.rs           Event constants and payload types
```

---

## License

MIT
