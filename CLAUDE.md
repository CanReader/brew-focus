# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brew Focus is a coffee-themed Pomodoro timer desktop app built with Tauri 2.0 (Rust backend) + React/TypeScript frontend.

## Commands

```bash
# Frontend dev server only (Vite, port 1420)
npm run dev

# Full desktop app with hot reload (use this for development)
npm run tauri:dev

# Build frontend only
npm run build

# Tauri CLI
npm run tauri <command>
```

`tauri:dev` sets Linux-specific env vars: `GDK_BACKEND=x11 WEBKIT_DISABLE_COMPOSITING_MODE=1`

There are no test commands configured in this project.

## Architecture

**Two-layer app:** Rust (Tauri) hosts a WebView running a React SPA.

### State Management (Zustand stores in `src/store/`)
- `taskStore.ts` — tasks, projects, activeTaskId; persists to Tauri store
- `timerStore.ts` — timer phase (work/shortBreak/longBreak), countdown, session history, daily focus total
- `settingsStore.ts` — durations, accent color, auto-start, sound preferences

All stores load from and save to Tauri's plugin-store (a JSON file at `~/.local/share/com.brewfocus.app/brew-focus.json`) on every mutation.

### Timer Logic (`src/hooks/useTimer.ts`)
A 1-second interval drives the timer. On completion: records the session, increments the task's pomodoro count, accumulates daily focus seconds, then advances the phase (work → short break → long break after N cycles). Auto-start behavior is configurable.

### Frontend Structure (`src/`)
```
App.tsx                  — tab switching (Focus/Tasks), modal rendering, store init
components/
  FocusScreen/           — main timer view (CoffeeCup SVG, TimerDisplay, TimerControls, TaskSelector, SidePanel)
  TasksScreen/           — task management (dnd-kit drag-drop, Sidebar filters, TaskDetailPanel, context menus)
  TimerModal.tsx         — fullscreen timer overlay
  SettingsModal.tsx      — preferences
  TitleBar.tsx           — custom window chrome (decorations: false)
store/                   — Zustand stores (described above)
hooks/useTimer.ts        — timer tick + phase transition logic
types/index.ts           — all shared TypeScript types
utils/nanoid.ts          — 21-char crypto-random ID generator
```

### Rust Backend (`src-tauri/`)
Minimal: initializes the Tauri app with the store plugin. Platform workarounds for Linux WebKit/DMA-buf are in `main.rs`.

## Styling

Dark-only theme via CSS custom properties (defined in `src/index.css`):
- `--bg` / `--bg2` / `--card` — background layers
- `--brd` — borders
- `--t` / `--t2` / `--t3` — text hierarchy
- `--accent` — primary accent (user-selectable, 6 color options)
- `--grn` / `--blu` — short break / long break indicators

Tailwind uses these variables through `tailwind.config.js` customizations.

## Key Constraints

- **No server/backend API** — all data is local (Tauri store)
- **Single JSON file persistence** — all app state lives in one store file; changes are saved immediately on every mutation
- **Linux WebKit quirks** — env vars in `tauri:dev` script exist to prevent rendering bugs; do not remove them
- **Custom titlebar** — window `decorations: false`; `TitleBar.tsx` handles all window controls

