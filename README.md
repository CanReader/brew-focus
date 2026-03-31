# ☕ Brew Focus

> A coffee-themed Pomodoro timer that lives on your desktop.

Brew Focus pairs a distraction-free timer with lightweight task management — all local, no account required. As you work, an animated coffee cup fills up. When it's full, it's time for a break.

---

## Features

**Timer**
- Work / short break / long break phases with configurable durations
- Auto-start next phase option
- Fullscreen focus overlay
- Background timer — keeps ticking even when the window is hidden

**Tasks**
- Create tasks and assign pomodoro estimates
- Drag-and-drop reordering
- Group tasks into color-coded projects
- Filter by Today, Tomorrow, or project

**Stats & tracking**
- Per-session history log
- Daily focus time with a customizable goal
- Pomodoro count per task

**App**
- System tray — minimize without closing, timer continues
- 6 accent color themes
- Fully offline — all data stored locally in a single JSON file

---

## Installation

Download the latest release for your platform from the [Releases](https://github.com/CanReader/brew-focus/releases) page.

| Platform | Installer |
|----------|-----------|
| macOS | `.dmg` |
| Windows | `.msi` or `.exe` |
| Linux | `.AppImage` or `.deb` |

---

## Building from source

**Prerequisites**

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) stable toolchain

Linux also requires WebKit2GTK:
```bash
# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg
```

**Run in development**
```bash
npm install
npm run tauri:dev
```

**Build a release bundle**
```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/
```

---

## Tech stack

| | |
|---|---|
| Desktop | [Tauri 2](https://tauri.app) (Rust) |
| UI | React 18 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Persistence | Tauri plugin-store |

---

## Data

Everything is saved locally to one JSON file. No telemetry, no network requests.

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/com.brewfocus.app/brew-focus.json` |
| Windows | `%APPDATA%\com.brewfocus.app\brew-focus.json` |
| Linux | `~/.local/share/com.brewfocus.app/brew-focus.json` |

---

## License

MIT
