# Brew Focus

A coffee-themed Pomodoro timer and task manager for macOS, Windows, and Linux. As you work, an animated coffee cup fills up. When it's full, it's time for a break.

The mobile app for the same account lives at [CanReader/brew-focus-mobile](https://github.com/CanReader/brew-focus-mobile).

---

## Features

**Timer**
- Work, short break, and long break phases with configurable durations
- Auto-start the next phase
- Per-task custom durations override the global defaults
- Fullscreen focus overlay and a compact widget mode

**Tasks and projects**
- Create tasks, assign Pomodoro estimates, drag-and-drop to reorder
- Group tasks into color-coded projects
- Filter by Today, Tomorrow, Upcoming, or by project
- Markdown notes with `[[wiki link]]` rendering
- Bulk actions and dependencies on stale tasks
- Project views: board, calendar, graph, and weekly plan

**Focus and tracking**
- Daily focus goal with a progress ring
- Activity timeline that records every session, edit, and completion
- Per-task Pomodoro counts and a session history log
- Coffee cup catalog with multiple bundled cups

**App**
- Custom dark window chrome with a draggable title bar
- System tray — closing the window keeps the timer running in the background
- 6 accent color themes
- 7 languages with full RTL support (English, Turkish, Spanish, French, Arabic, Ukrainian, Chinese)
- Auto-updates from the GitHub releases channel

**Account and sync**
- Supabase-backed account (sign up with email, password reset, account deletion)
- Tasks, projects, settings, and history sync across desktop and mobile
- Avatar upload to Supabase Storage

---

## Status

The desktop app is in active development. See [`CHANGELOG.md`](./CHANGELOG.md) for what has shipped and [`ROADMAP.md`](./ROADMAP.md) for what is planned. Versioning rules and the release process live in [`/VERSIONING.md`](../VERSIONING.md) at the project root.

---

## Install

Download the latest release for your platform from the [Releases](https://github.com/CanReader/brew-focus/releases) page.

| Platform | Installer |
|----------|-----------|
| macOS    | `.dmg` |
| Windows  | `.msi` or `.exe` |
| Linux    | `.AppImage` or `.deb` |

The app self-updates after the first install. The update channel is signed; the public key is committed in `src-tauri/tauri.conf.json`.

---

## Build from source

**Prerequisites**

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) stable toolchain

Linux also needs WebKit2GTK and a few system libraries:

```bash
# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg
```

**Configure Supabase**

The app talks to Supabase for auth, data, and avatar storage. Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Run in development**

```bash
npm install
npm run tauri:dev
```

The dev script sets `GDK_BACKEND=x11` and `WEBKIT_DISABLE_COMPOSITING_MODE=1` on Linux to work around a WebKit rendering bug. Don't strip those flags.

**Build a release bundle**

```bash
npm run tauri:build
# Output: src-tauri/target/release/bundle/
```

**Useful scripts**

```bash
npm run dev            # Vite frontend only (no Tauri shell), port 1420
npm run build          # tsc && vite build (frontend type-check + bundle)
npx tsc --noEmit       # Fast type-check
```

A root-level `Makefile` proxies the most common commands so you don't have to `cd` between `desktop/` and `mobile/`. From the project root: `make d` (desktop dev), `make t` (typecheck both), `make desktop-build` (release bundle).

---

## Tech stack

| | |
|---|---|
| Shell        | [Tauri 2](https://tauri.app) (Rust) |
| UI           | React 18 + TypeScript |
| State        | Zustand |
| Styling      | Tailwind CSS + CSS custom properties |
| Animation    | Framer Motion |
| i18n         | i18next + ICU |
| Backend      | [Supabase](https://supabase.com) (Postgres, Auth, Storage) |
| Auto-update  | `tauri-plugin-updater` against GitHub Releases |

---

## Repository layout

```
desktop/
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── screens/          # Top-level screens (Focus, Tasks, Reports, Settings, Projects)
│   ├── store/            # Zustand stores (one per domain)
│   ├── hooks/            # useTimer, useUpdater, etc.
│   ├── locales/          # 7-language string tables
│   └── utils/            # supabase client, helpers
└── src-tauri/            # Rust shell
    ├── src/              # commands, tray, deep-link, updater wiring
    └── icons/            # platform icon set
```

---

## Contributing

This is currently a one-person project, but bug reports and reproducible repros are welcome. Open an issue at [github.com/CanReader/brew-focus/issues](https://github.com/CanReader/brew-focus/issues).

---

## License

MIT
