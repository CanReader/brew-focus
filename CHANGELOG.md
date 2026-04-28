# Changelog — Brew Focus Desktop

All notable changes to the desktop app are documented here. Format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Versioning follows [SemVer](https://semver.org/) — see [`/VERSIONING.md`](../VERSIONING.md) for the full release process.

This file tracks the **desktop** app only. The mobile app has its own [`mobile/CHANGELOG.md`](../mobile/CHANGELOG.md). Cross-platform feature parity lives in [`FEATURES.md`](../FEATURES.md).

---

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

### Removed
-

---

## [0.1.0] - YYYY-MM-DD

> First versioned release. Establishes the baseline of what shipped before the formal release process started. The human (Can) will fill in the date and prune this entry to the actually-shippable feature set before tagging.

### Added — Core focus / timer
- Pomodoro timer (work / short break / long break) driven by `useTimer.ts` (JS, `setInterval(1000)`).
- Custom durations + auto-start toggles, per-task duration overrides, skip-long-break per task.
- Background noise / ambient sounds, custom backgrounds, mood rating after each work session.
- Fullscreen mode + widget timer mode.
- Active task selector, **Daily Focus Queue** with auto-flow.

### Added — Tasks
- CRUD with priority (P1–P4), due dates, tags, subtasks, repeat (daily/weekly/monthly), reminders.
- **Status** (todo/in_progress/blocked/done) with the `completed === (status === 'done')` invariant.
- **Type** (feature/bug/chore/idea/task), milestone assignment, dependencies (`dependsOn`) with cycle filtering.
- Stale task indicator (14d idle), bulk multi-select (shift/cmd-click), per-task activity log.
- Markdown notes (full GFM + wiki-links), `[[Task]]` / `[[Project]]` linking.

### Added — Projects
- CRUD + archive, status (active/on_hold/completed), color, icon, description.
- Long-form markdown notes, milestones with target dates, links, weekly focus goal + progress.
- Project templates (Software / Writing / Habit / Blank + 8 student templates).
- Per-project default Pomodoro durations (resolution: task override → project override → global).
- Views: list, **kanban board**, **calendar**, **plan view** with milestone swimlanes, velocity sparkline, stats strip.
- Per-project focus time (denormalized projectId on sessions).

### Added — Power features
- Quick-capture parser (`!today #bug @proj +p1 *3`) with chip preview and typo suggestions.
- Saved smart lists (filter combos), Obsidian-style graph view.
- Coffee cup picker — server-driven catalog from `coffee_cup_variants` table + `coffee-cups` Storage bucket; bundled fallback for offline.

### Added — Backend / infra
- Supabase Postgres schema with RLS, auth (email + username + reset).
- Activity events table (migration `011_activity_log.sql`), coffee cup catalog (migration `012_coffee_cup_catalog.sql`).
- Auto-update channel via `tauri-plugin-updater`, deep-link auth callback (`brewfocus://`).

### Added — Platform integration
- Custom window chrome (`TitleBar.tsx`), system tray with hide-on-close, always-on-top toggle.
- Window commands: `set_always_on_top`, `show_main_window`, `hide_main_window`, `center_window`, `get_window_scale_factor`.

### Notes
- This is the first release going through the formal versioning process. Prior to this, desktop had a `v0.0.1` git tag with no published GitHub release.
- The Tauri auto-updater is wired to `https://github.com/CanReader/brew-focus/releases/latest/download/latest.json`; this release will be the first artifact at that URL.

---

[Unreleased]: https://github.com/CanReader/brew-focus/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/CanReader/brew-focus/releases/tag/v0.1.0
