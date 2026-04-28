# Brew Focus Desktop - Roadmap

> Proposed future versions. Each entry is a **plan**, not a commitment. Version numbers, themes, and feature lists may shift as we learn from each release.
>
> See [`CHANGELOG.md`](./CHANGELOG.md) for what has actually shipped.
> See [`/VERSIONING.md`](../VERSIONING.md) for the release process and SemVer rules.
> See [`/FEATURES.md`](../FEATURES.md) for cross-platform feature parity.

Mobile has its own [`ROADMAP.md`](../mobile/ROADMAP.md). The trains are independent. Versions on the two platforms will not match. The brand and the feature contract do.

---

## At a glance

| Version | Theme | Phase | Status |
|---|---|---|---|
| 0.2.0 | Onboarding & first-run | Pre-1.0 polish | Planned |
| 0.3.0 | Observability & telemetry baseline | Pre-1.0 polish | Planned |
| 0.4.0 | Timer hardening | Pre-1.0 polish | Planned |
| 0.5.0 | Accessibility scaffolding | Pre-1.0 polish | Planned |
| 0.6.0 | Performance pass | Pre-1.0 polish | Planned |
| 0.7.0 | Copy & microcopy | Pre-1.0 polish | Planned |
| 0.8.0 | Empty states | Pre-1.0 polish | Planned |
| 0.9.0 | Power-user idiom polish | Pre-1.0 polish | Planned |
| 0.10.0 | Import / export round-trip | Pre-1.0 polish | Planned |
| 0.11.0 | Backup & recovery | Pre-1.0 polish | Planned |
| 0.12.0 | i18n & RTL scaffolding | Pre-1.0 polish | Planned |
| 0.13.0 | Assistive-tech & launch readiness | Pre-1.0 polish | Planned |
| 1.0.0 | Pro launch | 1.0 | Planned |
| 1.1.0 | Sync polish under real load | Pro cohort iteration | Planned |
| 1.2.0 | Friends & social foundation | Multiplayer | Planned |
| 1.3.0 | Friend groups | Multiplayer | Planned |
| 1.4.0 | Multiplayer sessions | Multiplayer | Planned |
| 1.5.0 | Onboarding rebuild | Pro cohort iteration | Planned |
| 1.6.0 | Most-requested Pro feature | Pro cohort iteration | Planned |
| 1.7.0 | Delight, paywall A/B, lifecycle | Pro cohort iteration | Planned |
| 1.8.0 | Calendar integration | 1.x evolution | Planned |
| 1.9.0 | Task-tool integrations | 1.x evolution | Planned |
| 1.10.0 | API access | 1.x evolution | Planned |
| 1.11.0 | Reports v2 | 1.x evolution | Planned |
| 1.12.0 | Team plan & power-user widgets | 1.x evolution | Planned |
| 2.0.0 | Web build GA | 2.0 inflection | Planned |
| 2.1.0 | Shared core & content engine | 2.x sustaining | Planned |
| 2.2.0 | AI assist | 2.x sustaining | Planned |
| 2.3.0 | Public API & webhooks | 2.x sustaining | Planned |
| 2.4.0 | Native depth | 2.x sustaining | Planned |

---

## Phase 1 - Pre-1.0 polish (versions 0.2 → 0.13, twelve minors)

> Headline: earn the right to charge people money. Remove every reason a paying user would walk away in the first week.

The job of every version in this phase is to make the desktop app feel finished before a paywall is even thinkable. Each minor is single-theme so we can dogfood it, course-correct, and move on. Mobile carries the higher commercial priority across the brand, so where a tie has to break, mobile ships first. Desktop's job here is to be the quality halo and the credibility play: a real desktop client people are surprised exists for a Pomodoro app.

The detailed monetization design (exact caps, paywall copy, placement, A/B variants) is a separate later session. Anywhere this roadmap names a Pro feature or cap, treat it as a candidate to validate, not a locked decision. (monetization design TBD)

---

### [0.2.0] - Onboarding & first-run

**Goal:** Get a new account from "I just installed Brew Focus" to "I just finished my first Pomodoro" in under sixty seconds.

**Added:**
- First-run welcome carousel with three slides (focus / projects / sync) shown once per account
- "Try a 5-minute focus" sample-session shortcut on the empty TasksScreen
- Sample project ("Brew Focus tour") seeded on first sign-in, deletable in one click
- Inline tooltips on the FocusScreen the first time a user opens the active-task picker, the coffee-cup picker, and the Daily Focus Queue
- "What's a Pomodoro?" link on the first-run welcome that opens a single explainer view

**Changed:**
- AuthScreen routes a freshly verified account into the welcome carousel instead of straight to FocusScreen
- TitleBar's avatar popover surfaces the welcome carousel as a "Replay tour" entry so power users can dismiss it and seekers can find it again

**Fixed:**
- TitleBar drag region briefly captures clicks during the first paint after signup, blocking the welcome modal's primary CTA
- Sign-up redirect after the deep-link callback occasionally lands on a stale FocusScreen instance with no active task wired up

**Why this version exists:** the desktop app today drops a new user onto a blank FocusScreen with an unconfigured timer and a task list of one Sample Task. Half of "is this app for me" is settled in the first sixty seconds, and we're spending those seconds wrong. 0.2 fixes the on-ramp before any later version asks the user to invest more.

---

### [0.3.0] - Observability & telemetry baseline

**Goal:** Make crash data and product behaviour visible so every later decision is grounded in numbers, not gut feel.

**Added:**
- Sentry integration on the renderer, with release tagging tied to `tauri.conf.json` version and source-mapped stack traces
- Sentry on the Rust side via `sentry-rust` for panics in `lib.rs`, `commands.rs`, `tray.rs`
- Anonymous event pipe ("brewfocus-events" via PostHog or self-hosted): `app_open`, `session_start`, `session_complete`, `task_created`, `project_created`, `settings_opened`, `screen_view` (per route)
- Structured renderer logging behind a `VITE_LOG_LEVEL` env var, with rotating-file output via Tauri's data-dir API
- Supabase RLS audit baseline: a `audit_log` table that records auth-sensitive writes, queryable by the founder

**Changed:**
- Auto-update banner (`UpdateBanner.tsx`) reports update-success and update-failure events to the new pipe so we can tell when an updater regression silently breaks rollouts
- Crash reports include desktop-specific context: window state (always-on-top, fullscreen, tray-hidden), display scale factor, GTK/WebKit versions on Linux

**Pro scaffolding (no-op for free users):**
- Event taxonomy includes the names paywall and entitlement code will eventually report against (`pro_upsell_view`, `pro_upsell_tap`, `pro_purchase_initiated`, `pro_purchase_completed`, `pro_restore_attempted`) so dashboards stay continuous when those events start firing in 0.6+

**Why this version exists:** we currently can't tell whether a regression in 0.2 made anything worse. 0.3 gives us crash data, basic funnel data, and the audit trail we need before money or paywalls touch the codebase. Every later version's "Why this version exists" paragraph leans on data this release starts collecting.

---

### [0.4.0] - Timer hardening

**Goal:** Make the desktop timer survive everything the OS throws at it: sleep, wake, lid close, suspend-to-disk, crashed system tray, GPU driver reset.

**Added:**
- Suspend / resume detection in `useTimer.ts` using `Date.now()` deltas instead of accumulated `setInterval` ticks, so OS sleep no longer desyncs the displayed time
- Power-state listener (Tauri command bridging `tauri-plugin-os`) that surfaces "the system slept during your session" recovery prompt on next focus
- Window-state telemetry: emits events for always-on-top toggled, tray-hidden, fullscreen-widget entered/exited (data feeds the funnel dashboard from 0.3)
- "Reopen last session" prompt if the timer was running when the app was force-killed

**Changed:**
- `useTimer.ts` module-level guards (`_lastSyncedActiveTaskId`, `_initialTimerSyncDone`) get a comment block documenting why they exist, so a future contributor doesn't refactor them away
- System-tray icon now reflects timer state (idle / focus / break) instead of a static cup, so a tray-hidden window still tells you what phase you're in

**Fixed:**
- Timer drifts by up to two seconds per hour on Linux when the system was suspended mid-session (root cause: accumulated `setInterval` ticks)
- Tray menu's "Open Brew Focus" sometimes opens a window with no swapchain on Linux when the system woke from suspend
- Notification permission request is silently denied on first launch when the user has denied notifications globally; we now surface a one-time banner explaining how to grant them

**Performance:**
- Renderer CPU during an idle FocusScreen (timer paused, no animations) drops from roughly 4% to under 1% on a Linux + WebKit baseline, mostly by gating CoffeeCup steam animation behind a `prefers-reduced-motion`-aware ticker

**Why this version exists:** the timer is the product. If the timer drifts, the product is broken in the way the user notices most. 0.3's crash dashboard will show timer-related session aborts as a top-three category once it has fourteen days of data. 0.4 spends a whole release wrestling them down before we ask for trust on anything else.

---

### [0.5.0] - Accessibility scaffolding

**Goal:** Make every interactive surface keyboard-navigable, screen-reader-readable, and high-contrast-friendly. Set the floor that every later release maintains.

**Added:**
- Keyboard shortcut audit pass: every menu, modal, and bottom-sheet has a documented shortcut, listed in a new "Keyboard shortcuts" Settings panel
- `focus-visible` outlines on every interactive element using a single CSS variable (`--focus-ring`) so the accent system from 0.1 carries through
- Skip-to-main-content link on every full-screen modal so keyboard users don't traverse the whole TitleBar to reach the timer
- ARIA labels on the TitleBar's drag region, min/max/close, and the entire popover content
- Funnel dashboard (Metabase view) live, fed by both desktop and mobile event pipes, accessible to the founder with shared link

**Changed:**
- All icon-only buttons gain `aria-label` strings sourced from a single `src/i18n/labels.ts` module (foundation for 0.12's i18n work)
- Coffee-cup picker modal now announces selection to screen readers ("Selected: Latte")

**Fixed:**
- Tab order on the FocusScreen jumps from active-task picker to settings cog and skips the Daily Focus Queue button entirely
- Esc key inside the TaskDetailPanel closes the whole window on Linux WebKit instead of closing the panel
- Markdown editor's preview/edit toggle is unreachable by keyboard

**Pro scaffolding (no-op for free users):**
- Single `src/lib/entitlements.ts` module with a stub `isPro()` returning false; every later "is this gated" check goes through this one file so the cap-enforcement layer can be raised, lowered, or A/B tested without touching twenty call sites

**Why this version exists:** 0.4 made the timer trustworthy. 0.5 makes the rest of the app navigable for keyboard users, screen-reader users, and the keyboard-only power users desktop especially attracts. The accessibility floor set here is what every subsequent release maintains: zero new axe-core violations from 0.5 onward.

---

### [0.6.0] - Performance pass

**Goal:** Cold-start under one second on a midrange Linux box. List virtualization on every screen that can show more than fifty rows. Quiet idle.

**Added:**
- List virtualization on TasksScreen, ProjectDetailView's task list, and the Reports history list using `@tanstack/react-virtual`
- Image lazy-loading on coffee-cup tiles and project icons (non-blocking via the `loading="lazy"` attribute plus an `IntersectionObserver` polyfill for older WebKit on Linux)
- Supabase query batching pass: store fetches that today fire one round-trip per resource get coalesced into a single boot-time fetch
- Performance budget assertions in dev: a `performance.measure` block that logs an error if FocusScreen mounts in over 350ms

**Changed:**
- React Query's default `staleTime` raised from zero to thirty seconds for read-heavy queries (tasks, projects, sessions); cache invalidation made explicit on writes
- CoffeeCup component switches from continuous `requestAnimationFrame` to a paused-when-not-focused ticker

**Fixed:**
- Memory leak in `useTimer.ts` where module-level guards were not torn down on full window reload (fix: `beforeunload` listener clears them)
- Markdown editor's preview pane re-renders the entire document on every keystroke (fix: debounce + memoized renderer)

**Performance:**
- Cold start (`tauri:dev` -> first FocusScreen paint) drops from roughly 1.6s to roughly 0.7s on a midrange Linux box
- Memory at idle drops from roughly 320MB to roughly 180MB after switching virtualization on
- Full-task-list scroll on a 5,000-task account holds 60fps on Linux WebKit (was dropping into the twenties)

**Pro scaffolding (no-op for free users):**
- Lemon Squeezy webhooks plumbed: a Supabase Edge Function consumes `order_created`, `subscription_updated`, `subscription_cancelled` and writes to a shared `pro_entitlements` table that mobile already reads. No frontend code reads from it yet.

**Why this version exists:** 0.6 trades the "feels responsive on a M-series Mac" we built so far for "feels responsive on a four-year-old ThinkPad". Cold start is the single most-felt metric, and Supabase's network round-trip count was the single biggest hit on cold start. After this, the app is fast enough to deserve a paywall conversation.

---

### [0.7.0] - Copy & microcopy

**Goal:** Make every error message, empty state, confirmation dialog, and Settings line read like a human wrote it for another human. No "An error occurred." Ever.

**Added:**
- Centralized `src/i18n/strings.ts` module with every user-facing string pulled out of components (foundation for 0.12 i18n wiring)
- Hosted Lemon Squeezy checkout flow: a "Buy Pro" button (still dev-flagged) opens a hosted checkout pre-filled with the user's email; on success, the webhook from 0.6 flips entitlement and the app polls for it on focus

**Changed:**
- Every error toast has a verb-led headline and one explanation sentence ("We could not save your task. The connection to Brew Focus dropped. Try again in a moment.")
- Every Settings panel description is rewritten in plain English with no jargon
- Sign-up email confirmation copy is rewritten by hand (was Supabase boilerplate)
- About dialog gains a one-paragraph "What is Brew Focus" line aimed at the friend a power user just shared the app with

**Fixed:**
- Empty markdown notes show "null" briefly while loading
- Project archive confirmation dialog says "Are you sure?" with no explanation of what archiving does to tasks (it doesn't delete them, but the dialog never said so)
- Reset-password email lands in spam on Outlook because the From-name was unset

**Pro scaffolding (no-op for free users):**
- Hosted-checkout flow exists end-to-end against Lemon Squeezy sandbox SKUs (`brewfocus_pro_monthly_499`, `brewfocus_pro_lifetime_2999`); `useEntitlement('pro')` still returns `false` for everyone

**Why this version exists:** copy is invisible until it's wrong, and it's wrong a lot in the current build. A version dedicated to text quality reads like a soft release but disproportionately moves trust. 0.7 is the dress rehearsal for 1.0's marketing-site copy: if every in-app string is good, the landing page writes itself.

---

### [0.8.0] - Empty states

**Goal:** Every screen that can be empty has a hand-crafted "you have nothing here yet, here's what to do" view. No blank rectangles.

**Added:**
- Empty state on TasksScreen with a single "Add your first task" CTA and a quick-capture-syntax hint
- Empty state on ProjectDetailView's Kanban / Calendar / Plan views (each one phrased for that view's idiom)
- Empty state on Reports when there are no completed sessions yet, with a "Start a 5-minute focus" shortcut
- Empty state on graph view when there are zero linked notes, with a copy-paste example of `[[Task name]]` syntax
- Empty state on Daily Focus Queue when the queue is empty, with "Drag a task from your task list" instructions

**Changed:**
- Saved smart lists empty state goes from "(none)" to a one-line introduction plus a "Create your first smart list" button
- Coffee-cup picker shows a friendly fallback instead of a spinner when the catalog endpoint is slow

**Pro scaffolding (no-op for free users):**
- Paywall UI scaffolding lands: a `<ProGate>` component that today renders its children unconditionally, but in 1.0 will render a paywall sheet if `!isPro()`. Every later "this is Pro" surface uses this single component.
- Internal-only test build can flip `VITE_PRO_PREVIEW=true` to render the paywall sheet against a sample feature, so we can take screenshots and iterate copy

**Why this version exists:** empty states are where new users decide whether the app is worth investing their data in. Every blank rectangle in the current build is a tiny pothole on the on-ramp. Once 0.8 is in, the only thing standing between a curious visitor and a paying customer is the paywall itself.

---

### [0.9.0] - Power-user idiom polish

**Goal:** Make Brew Focus feel like a desktop app, not a webapp running in a window. Keyboard depth, multi-window, native menus, native shortcuts.

**Added:**
- Native menu bar (per `tauri-plugin-menu`) with File / Edit / View / Window / Help, replacing the web-only menu surfaces
- Cmd/Ctrl-K command palette: type to search across tasks, projects, smart lists, and settings; Enter jumps; Cmd-Enter opens in the side panel
- Cmd/Ctrl-N to start a new focus session from anywhere; Cmd/Ctrl-T to add a task; Cmd/Ctrl-, to open Settings
- Multi-window support for project detail (Cmd-click a project opens it in a new window)
- "Always-on-top" exposed as a View menu toggle in addition to the existing TitleBar button

**Changed:**
- Tray menu items reflow into a more useful order: current session state -> "Pause / Resume" -> "Skip break" -> "Open Brew Focus" -> "Quit"
- The Linux-specific GDK_BACKEND/X11 env-var workaround in `tauri:dev` is now documented inline in the script so a future contributor knows why it exists

**Fixed:**
- Cmd/Ctrl-W closes the whole window on macOS instead of closing the active modal
- TitleBar drag region steals click events from the first 4px of the toolbar below it on Windows

**Pro scaffolding (no-op for free users):**
- License-key manual-entry fallback: a "I bought Pro but don't see it" flow in Settings that takes a license key and asks the Edge Function to upsert into `pro_entitlements`. Edge case but a future support-ticket killer.

**Why this version exists:** desktop's whole reason to exist is "I'd rather use this with a keyboard than my phone". Versions 0.2 through 0.8 made the renderer good. 0.9 makes the shell good. After this, a desktop user has the keyboard-first surface mobile structurally cannot offer.

---

### [0.10.0] - Import / export round-trip

**Goal:** Let any user pull their entire account out as a single JSON dump and put it back. No vendor lock-in. Foundation for the 1.0 markdown-export Pro feature.

**Added:**
- "Export account" in Settings: produces a single `.json` file containing every task, project, session, milestone, smart list, and setting, plus a `schema-version` integer
- "Import account" companion: reads a JSON dump, validates the `schema-version`, and merges into the current account (with a "replace, don't merge" advanced toggle)
- CSV export of tasks (filtered by current view) and sessions (filtered by date range) for spreadsheet folks
- "Copy markdown" on a single task or project to clipboard (Pro version in 1.0 will export bundles)

**Changed:**
- Activity-log row mappers gain a `schema_version` column passthrough so older clients can detect "your schema is older than the server" and prompt update
- The `feature_flags` table introduced in 0.6 gains a `min_schema_version` column to make schema-driven gating explicit

**Pro scaffolding (no-op for free users):**
- **Soft-gate goes live in an internal channel.** `useEntitlement('pro')` flips to read from the `pro_entitlements` table populated by the Lemon Squeezy webhook. A handful of internal accounts can actually buy via the hosted checkout from 0.7. Pro-only features still resolve to no-op for non-Pro users in this release; the goal is to verify the purchase + restore + revoke loop end-to-end before any user-facing surface depends on it.
- Cap-enforcement helper (`enforceFreeCap('projects')`, etc.) ships behind the `<ProGate>` component, returning "no cap" for everyone in this release. Specific cap numbers are deliberately not set here. (monetization design TBD)

**Why this version exists:** export ships before paywall by design. A user who can never get their data out is a user we cannot ethically charge $29.99 to. The import side also makes mid-flight schema migrations safer: we can dump, transform, restore in any order. Mobile reads the same dump format, so the file is the cross-platform interchange.

---

### [0.11.0] - Backup & recovery

**Goal:** Build the safety net before a paying customer has anything to lose. Account-level point-in-time restore, "undo last 24h", and deletion confirmations that actually slow the user down enough to think.

**Added:**
- "Restore from backup" UI in Settings, listing the last seven daily Supabase point-in-time snapshots; one click rewinds the account
- "Undo last 24h" surface that lists destructive operations (deletes, archives, status changes) from the last day with selective undo
- Two-step deletion for any project that has more than zero tasks: type the project name to confirm, with a five-second hold on the confirm button
- Supabase Edge Function `restore_account_to(snapshot_id)` that does the rewind server-side and emits an audit-log entry

**Changed:**
- Single-task delete now goes to a tombstone instead of hard-deleting; tombstones are GC'd after thirty days. This is invisible to users but lets "Undo last 24h" actually undo.
- Sign-out flow now warns if there are unsynced writes pending (rare on desktop, possible on a flaky network)

**Fixed:**
- Archived projects can be deleted from the archived view but their tasks are not deleted with them, leaving orphaned task rows referencing a non-existent project. Orphan-cleanup migration ships with this release.
- Activity-log events for cascading deletes are written before the delete commits, so a failed delete leaves stale "deleted" events. Order is now: write tombstone -> emit event -> hard-delete on GC.

**Pro scaffolding (no-op for free users):**
- Cross-platform entitlement reconciliation tested both directions: a sandbox lifetime purchase on desktop unlocks mobile within thirty seconds of next sign-in; the reverse also works. Internal channel only.

**Why this version exists:** every productivity-tool support ticket eventually contains the phrase "I lost my data". 0.11 makes that phrase wrong. We can rewind any account to any point in the last seven days from a button. That changes how confidently we can promote the app, how willingly we can retire features, and how aggressively we can refactor schema in 1.x.

---

### [0.12.0] - i18n & RTL scaffolding

**Goal:** Wire the plumbing for translation without yet shipping a translated build. Audit every layout for right-to-left flips. Set the floor for 1.x localization work.

**Added:**
- `react-i18next` integrated; every string pulled into `src/i18n/strings.ts` in 0.7 now resolves through the translation pipeline
- One non-English target wired up end-to-end (Turkish, since the founder speaks it and can verify quality) but kept off the public list so it's not a marketing claim
- RTL audit: every flex / grid layout uses logical properties (`padding-inline`, `margin-block`); icons that have a directional meaning (back arrow, forward arrow) flip under `[dir="rtl"]`
- Date and number formatting via `Intl` everywhere instead of hardcoded `toLocaleDateString('en-US')`

**Changed:**
- Settings gains a "Language" picker that today shows only English and Turkish; default tracks OS locale
- Markdown editor and renderer become RTL-aware (current implementation assumed LTR)

**Fixed:**
- A handful of Tailwind utility classes (`pl-4`, `mr-2`) replaced with logical equivalents (`ps-4`, `me-2`) where they were doing layout, not visual decoration
- Date pickers in TaskDetailPanel show ISO strings under non-en-US OS locale instead of localized formats

**Pro scaffolding (no-op for free users):**
- Refund / cancellation flow: "Cancel subscription" deep-links to the Lemon Squeezy customer portal. Failed-payment grace period of seven days, after which the app quietly downgrades to free without destroying data.
- Dunning emails (configured on the Lemon Squeezy side) sent at day three and day six of grace.

**Why this version exists:** i18n in 1.x means a translated string lands as a config change, not a refactor. Every version from 0.13 onward will land English-only with the wiring in place; 1.x can launch translation campaigns surgically. RTL is the harder half: layout that assumes LTR breaks invisibly until an Arabic-speaking user opens it. 0.12 catches it before money's on the table.

---

### [0.13.0] - Assistive-tech & launch readiness

**Goal:** Test with real assistive technology (NVDA on Windows, VoiceOver on macOS, Orca on Linux). Land the last polish. Sign off on launch readiness.

**Added:**
- Real-device assistive-tech pass: every primary flow (sign in, start session, add task, add project, configure timer, view reports) exercised under NVDA / VoiceOver / Orca with a written report
- Live regions on the FocusScreen so a screen-reader user is told when the timer phase changes ("Work session complete. Short break starts now.")
- Session-end notifications gain a screen-reader-friendly text alternative (the OS notification text is rewritten to lead with the verb)
- Launch-readiness audit document committed to the repo at `docs/launch-readiness/0.13.md` with the checklist results

**Changed:**
- Color-contrast pass: every text-on-background combination meets WCAG AA at minimum, AAA where the cost is zero. Tested across all six accent colors.
- Reduced-motion users get a no-animation CoffeeCup variant (steam still renders, just static)

**Fixed:**
- Three remaining axe-core violations from the 0.5 baseline that survived through the 0.x train (mostly missing labels on dynamically rendered list items)
- Tab order on Plan view skips milestone swimlanes entirely

**Pro scaffolding (no-op for free users):**
- Final launch-readiness audit: crash-free sessions over the last thirty days, time-to-first-pomodoro median, paywall purchase + restore + revoke loop verified one final time on a fresh machine, schema version and migration manifest verified, auto-updater promotes a test 0.13.1 to ninety percent of an internal cohort within fourteen days

**Why this version exists:** before turning the paywall on for the public, every flow needs to work for users who navigate without a mouse, without a screen, without sound, without color, and in ten different languages. 0.13 is the version that holds those flows up to the sun. After this, we cross 1.0 with a straight face.

---

## Phase 2 - 1.0.0 launch

> Headline: ship the smallest credible Pro tier that proves people will pay, while keeping Free strong enough that the funnel keeps filling.

The 1.0 commitment, per `VERSIONING.md`: the Supabase schema is stable enough to support for twelve-plus months without breaking-change migrations; the monetization model is locked in code and live; we are willing to publicly market this version as the 1.0 launch; at least one round of closed-test feedback ran without a P0 blocker.

Whether desktop or mobile crosses 1.0 first is decided by the work, not the brief. Both platforms ship the same Pro features at the same prices when they get there.

---

### [1.0.0] - Pro launch

**Goal:** Open the doors. Charge the first dollar. Hold the bar high enough that every paying user feels the price was a steal.

**Added:**
- **Pro tier live** on Lemon Squeezy as Merchant of Record: $4.99 per month or $29.99 lifetime, no trial, identical to mobile, cross-honored across both platforms (one purchase unlocks both clients via the shared `pro_entitlements` table); a "Manage subscription" deep-link in Settings opens the Lemon Squeezy customer portal
- **Unlimited everything for Pro users.** Free has caps on project count, tag count, custom Pomodoro durations beyond defaults, template count, ambient sound count, premium coffee variant access, and history-view length. Pro removes every cap. Specific cap numbers come out of the dedicated monetization design session. (monetization design TBD)
- **Full aesthetic pack for Pro:** premium coffee variants (using the `is_premium` flag already in `coffee_cup_variants`), additional accent colors, premium themes and backgrounds
- **Advanced reports and insights for Pro:** focus heatmap, mood-vs-output correlation, weekly review email, exportable PDF and CSV reports
- **Markdown export of project bundles for Pro:** one button on a project detail view dumps notes, tasks, milestones, and activity log into a single `.md` ready to paste into Obsidian, Notion, or anywhere that reads markdown
- **Priority support and early-access channel for Pro:** a separate support email tier and a "preview" feature flag that surfaces the next version's experimental features
- Marketing site at brewfocus.com goes live: pricing page, public Changelog rendering both `CHANGELOG.md` files, the existing privacy and support pages, an explicit "Sync is free" line so the value prop is unambiguous

**Changed:**
- TitleBar avatar popover gains a "Pro" badge for paying users, "Get Pro" for free users; both surfaces route through the `<ProGate>` from 0.8
- Settings reorganizes around the Pro / Free split; free-tier caps surface as warnings, not blockers, on first hit
- The "Replay tour" entry in TitleBar adds a "What's in Pro" item that previews the Pro features without forcing a purchase
- License-key entry fallback (built in 0.9) becomes a documented support path, not an internal escape hatch

**Fixed:**
- Any 0.13 launch-readiness audit findings that survived the gate (typically: a copy fix, a webhook retry edge case, a paywall-on-restore race condition)

**Pro feature set rationale (proposed; cap numbers TBD in dedicated monetization session):** Sync stays **free for everyone, on both platforms, forever** because sync is a 2026 baseline expectation; gating it pushes free users straight to free competitors. The Pro pitch is built on unlimited usage, deeper reports, full aesthetic pack, markdown export, and priority support. **Desktop has no ads at any tier.** Mobile lands ad scaffolding (inert, no impressions served) in mobile 1.5 and turns ads on for free users in mobile 1.6; desktop never does, at any tier, ever. Desktop is the quality halo. An ad SDK in a Tauri webview would degrade the product feel on the surface that exists specifically to be the credible, premium one, and the desktop checkout funnel is more direct (Lemon Squeezy hosted checkout, not an in-app store) so the ARPU economics of an ad funnel never apply on this side of the brand.

**Why this version exists:** 1.0 is the contract: we asked you to trust us with your projects through twelve minor releases of polish; here is the price for the version of Brew Focus that earns it. Everything from 0.2 to 0.13 was the rehearsal. The 1.0 launch is what those rehearsals were for. After this, the question stops being "is the app good enough to charge for" and starts being "how do we keep earning the subscription".

---

## Phase 3 - Post-1.0 sync, multiplayer, and Pro cohort iteration (versions 1.1 → 1.7)

> Headline: stabilize sync under real load, ship multiplayer end-to-end (1.2-1.4), then listen to the first paying users, ship the things they ask for, fix the churn cliffs the data exposes.

Desktop users are typically less churn-prone than mobile users (heavier intent at signup, paid up front, a desktop install is an act of commitment). The desktop post-launch wave is therefore feature requests rather than retention surgery. Mobile gets the larger share of attention in this phase because that's where ad revenue and paying conversions concentrate; desktop ships ~one minor behind on commercial features and ~one minor ahead on power-user features.

**Multiplayer (1.2 → 1.4)** lands as a tight three-version arc inside this phase: friends and privacy first (1.2), persistent groups with the first Pro hook on the multiplayer surface (1.3, Free ≤5 members), then live synchronized sessions with the second Pro hook (1.4, Free hosts capped at 5 participants per session, Pro hosts unlimited; non-friends can still join via invite link regardless of tier). After multiplayer is in users' hands, 1.5-1.7 return to cohort iteration with onboarding, the most-requested Pro feature, and paywall tuning — now informed by both the solo and multiplayer signal.

---

### [1.1.0] - Sync polish under real load

**Goal:** Sync is free at 1.0, which means every user generates sync traffic, not just Pro users. The bug surface widens. 1.1 makes sync feel boring in the best way.

**Added:**
- Conflict-resolution UI: when two clients edited the same task while one was offline, surface a side-by-side diff and let the user pick (instead of last-writer-wins)
- "Sync status" surface in TitleBar showing "synced", "syncing", "offline", "error" with a manual "Sync now" button
- Per-row sync conflict detail in the activity log so a user can audit what changed and when

**Changed:**
- Supabase realtime subscription strategy revisited: instead of one channel per table, use a single account-scoped channel with selective filters, dropping idle network traffic by an order of magnitude
- Optimistic-update pattern in stores rolls back cleanly on a failed write (was sometimes leaving zombie rows in memory)

**Fixed:**
- A cluster of "I edited a task on my phone but it didn't update on desktop until I quit and reopened" reports trace back to a missing cache invalidation; fixed with explicit query-key invalidation on every mutation
- Sign-out flow occasionally races with an in-flight write, dropping the write silently

**Performance:**
- Median sync round-trip drops from roughly 600ms to roughly 180ms on a baseline desktop + Supabase EU connection
- Supabase realtime subscription fanout drops from one socket per store (six sockets) to one socket per account

**Why this version exists:** sync was always going to be the area where free users would generate the most surface for bugs at scale, and the first month of 1.0 will surface a long tail of conflict edge cases. 1.1 is the "we promised sync to everyone, now we make it actually robust" release. After 1.1, sync stops being the weekly support topic.

---

### [1.2.0] - Friends & social foundation *(FREE)*

**Goal:** Lay the social graph that multiplayer depends on. Add friends, control privacy, block who you need to block.

**Added:**
- Friends list surface in Settings → Friends (or as a new top-level entry — designer's call, must be reachable in two taps from FocusScreen)
- Add friend by username (search), accept/reject incoming requests, cancel outgoing requests
- User profiles: display name, avatar, optional brief — every user has one, profiles are publicly readable by default
- Privacy settings: who can find me by username (everyone / friends-of-friends / nobody), who can send me requests, profile visibility
- Block / report system — non-negotiable for any social feature; blocked users can't see your profile, send requests, or join sessions you host
- Mutual friends visible on a profile when both parties have at least one mutual

**Changed:**
- TitleBar avatar popover gains a "Friends" entry with a badge for pending requests
- Settings reorganizes to surface a top-level "Social" section housing Friends, Groups (1.3), Privacy

**Architecture lifts:**
- `friendships` table with `requester_id`, `addressee_id`, `status` (pending / accepted / blocked), composite RLS that lets either party read but only the addressee accept
- `user_profiles` table extended with `display_name`, `avatar_url`, `bio`, `discoverable`, `request_policy`
- Username uniqueness + search index — `username` becomes a real lookup column, not just a display field
- A `social_blocks` table that hard-isolates blocked pairs across every social surface

**Why this version exists:** 1.1 stabilized sync. 1.2 starts adding the people on top of the data, in the smallest possible step — just the friend graph and the privacy controls that protect it. Everything multiplayer depends on lives here. Sessions and groups will be unsupportable without privacy and blocking, so they ship in the same release as the friend list.

---

### [1.3.0] - Friend groups *(FREE up to 5 members, Pro for larger groups — proposed)*

**Goal:** Persistent friend groups for the people you study, work, or focus with regularly. The first Pro hook on a multiplayer surface.

**Added:**
- Group creation flow (name, icon, optional description) — owned by creator
- Group membership management: invite friends to join (only friends, not arbitrary usernames — keeps abuse surface small), accept/reject incoming group invites, leave group
- Group roles: owner (single), admin (can invite + remove), member
- Groups list surface — your groups, groups you're invited to, group detail screen
- Discovery: a "your groups" entry on the FocusScreen header so a user can jump straight to a group's session history
- **Pro cap (proposed, monetization design TBD)**: Free groups capped at **5 members including the owner**. When a 6th member is added or invited, the action is blocked with a contextual paywall sheet: *"Free groups are capped at 5 members. Upgrade to Brew Focus Pro for unlimited group size."* The cap applies to the OWNER's tier, not the joiner's — a Pro owner can have unlimited members regardless of those members' tiers. **Groups are the first Pro hook on multiplayer (1.3); live sessions get the same 5-cap on Free hosts at 1.4. Together they monetize both commitment AND scale.**

**Changed:**
- The Friends list from 1.2 gains a "Create group" affordance with a friend-multi-select
- Profile pages of friends gain a "Groups in common" section

**Architecture lifts:**
- `groups` table (id, owner_id, name, icon, description, created_at, member_cap)
- `group_members` table (group_id, user_id, role, joined_at), with RLS so members can read the group but only owners and admins can mutate membership
- Group-scoped RLS pattern — first time the codebase has resource-level access shared across multiple users (the precursor to Team plan's multi-tenancy at 1.12)
- `enforceCap('group_members', currentCount, ownerIsPro)` goes through the same `<ProGate>` component from 0.8

**Why this version exists:** Groups are commitment. A user who has built a 12-person study group around Brew Focus is a user who is not casually moving to a competitor. Capping group size at Free is the first Pro hook on the multiplayer surface — it monetizes commitment (persistent communities); 1.4 adds the second Pro hook by capping live session size on Free hosts at the same 5. Together they monetize commitment AND scale. The architecture here also rehearses multi-tenancy patterns we'll need at scale for Team plan in 1.12.

---

### [1.4.0] - Multiplayer sessions *(FREE up to 5 participants per session, Pro for larger sessions)*

**Goal:** Live focus sessions with friends or groups. The headline multiplayer experience. Free hosts can run sessions of up to 5 people. Pro hosts run sessions of any size.

**Added:**
- "Start multiplayer session" affordance on the FocusScreen — host configures duration, picks a group OR multi-selects friends, optionally generates a shareable invite link (link works for non-friends too — they get a "join + add as friend?" prompt)
- Real-time presence on an active session: who's joined, who's currently in the focus phase, who's on break, who left
- Synchronized timer — host's timer is the source of truth, participants see it tick in lockstep, host can pause/skip-break and everyone follows
- Post-session shared report: each participant's individual focus time, group total, mood ratings (opt-in, blurred until everyone's submitted), task completions during the session
- Push notifications for incoming session invitations (mobile leads, desktop uses system notifications via `tauri-plugin-notification`)
- "Active sessions" surface — see what your friends and groups are currently doing, tap to join an in-progress session if it's still in the work phase
- Leave-session affordance with a "soft" leave (your time still counts) vs "abandon" (your time doesn't)

**Cap mechanic:**
- A Free host creating a session can invite up to 5 people total (themselves + 4, OR 5 invitees). Trying to invite a 6th person triggers the contextual paywall sheet: *"Free sessions are capped at 5 participants. Upgrade to Brew Focus Pro for unlimited session size."*
- A Pro host can invite unlimited people to a session.
- **"Anyone can join"** means: invitations and links work for non-friends — you don't have to be friends with the host to join. The cap is on TOTAL CAPACITY of the session, not on who's eligible to join.
- The cap applies to the HOST'S tier, not the joiners'. A Pro host can have 30 Free users in their session; a Free host caps at 5 regardless of how many of those joiners are themselves Pro.

**Changed:**
- The CoffeeCup component's steam animation gets a subtle "I'm not alone" variant — multi-cup framing when 2+ participants are in the work phase
- Daily Focus Queue gains a "session ahead" banner if a friend has scheduled a multiplayer session you're invited to

**Architecture lifts:**
- `multiplayer_sessions` table (id, host_id, group_id (nullable), duration, started_at, ended_at, status, **host_tier_at_create**, **participant_cap**) — `host_tier_at_create` snapshots the host's Free/Pro tier at the moment the session is created, and `participant_cap` is the resolved cap (5 or unlimited) computed from that snapshot; together they make the cap deterministic for the lifetime of the session even if the host's subscription state changes mid-session
- `session_participants` table (session_id, user_id, joined_at, left_at, focus_seconds, mood_rating)
- Supabase realtime channel per active session for sub-second presence + state sync
- Push notification infrastructure — desktop uses `tauri-plugin-notification` for system-level invites, also lands the foundation for future presence notifications
- Invitation expiry + token system so a stale link can't be replayed
- Session capacity enforced server-side via the same `enforceCap('session_participants', currentCount, hostIsPro)` pattern groups use in 1.3 — the `<ProGate>` component from 0.8 surfaces the upsell client-side, but the authoritative check lives in the Supabase RLS / Edge Function so a tampered client can't exceed the cap
- **Stale-invite enforcement:** the join path always validates against the session's `participant_cap` column at join time, not against the host's *current* tier — so a Pro host who created a 30-person session, then downgraded to Free before everyone joined, can still finish the session without kicking people; conversely a Free host whose stale 5-cap invite link gets shared after they upgraded to Pro doesn't suddenly admit unlimited joiners until they create a new session

**Why this version exists:** Sessions are the moment-to-moment value of multiplayer — what users will actually feel every day. The 5-participant cap on Free is the second Pro hook on the multiplayer surface (groups are the first); together they monetize commitment AND scale, while the join experience itself stays frictionless because anyone with the link can join — a Free host capping at 5 keeps the upgrade pressure honest without blocking the viral mechanic that makes any one session worth hosting (one user invites their four closest friends, three of them install Brew Focus, the friend graph compounds). After 1.4, multiplayer is shippable end-to-end and mobile + desktop both have a coherent social product on top of the focus loop.

---

### [1.5.0] - Onboarding rebuild

**Goal:** Get a freshly signed-up account from "I just installed Brew Focus" to "I just finished my first Pomodoro" in under forty-five seconds. Surface Pro organically by day three, not on day zero.

**Added:**
- Reworked first-run flow with measurable steps: every screen emits an event so we can see exactly where people drop out
- "Try a 5-minute focus" sample-session shortcut moved to the very first screen after sign-in, before any setup
- Sample project ("Brew Focus tour") with three pre-seeded tasks; users can start a focus session against one without configuring anything
- Day-three organic Pro reveal: a single, dismissible card on the FocusScreen that highlights one Pro feature the user has come close to using (no modal, no interrupt)
- Restore-purchases polish: a one-click "I bought Pro on another device" surface that runs entitlement reconciliation and shows a friendly status message
- Post-purchase celebration: a "Welcome to Pro" sequence highlighting the three Pro features Pro users actually use first, picked from 1.0 telemetry
- Onboarding A/B harness: feature-flag-driven first-run variants so we can compare two onboarding flows without an app release
- "Why upgrade" page accessible from any cap-warning, listing the Pro feature set with screenshots

**Changed:**
- The 0.2 welcome carousel becomes one of several variants the harness can serve; it stays the default until data says otherwise
- Sign-up email confirmation copy aligned with the day-three reveal so the first hour of the user's experience is one consistent voice

**Fixed:**
- "Restore purchases" sometimes shows "no purchases found" briefly before the entitlement reconciliation completes; we now show "Checking..." and let the network resolve
- Welcome carousel from 0.2 occasionally re-shows on a returning user after a Supabase auth refresh

**Why this version exists:** Now that multiplayer is in users' hands and they have someone to brew with, onboarding rebuilds around the social hook — every new account lands into a flow that highlights "you can focus with your friends" alongside the solo first-pomodoro path. 1.5 attacks the part of the funnel where users churn before they ever see Pro value. The hypothesis the briefs flag (D1 retention is fine but D7 collapses) almost always traces back to onboarding, not features. 1.5 is single-purpose: time-to-first-pomodoro under forty-five seconds and an organic Pro reveal that doesn't feel like a sales pitch. After this, the cohort that sees the paywall is a cohort that has already felt the product working.

---

### [1.6.0] - Most-requested Pro feature

**Goal:** Ship the feature the first cohort of paying users have been asking for, picked from telemetry plus support email.

**Added (placeholder - actual feature decided post-1.0 from cohort feedback):**
- Likely candidates from the `FEATURES.md` Planned queue: **sub-projects / project hierarchy**, **task templates** (recurring patterns within a project), or **project insights mini-dashboard** (velocity over weeks, average focus per session per project, completion rate trend)
- Whichever lands, it lands with the full treatment: a dedicated UI surface, a Pro gate on the advanced version (e.g. unlimited sub-project depth for Pro, two levels for Free), and the feature treadmill instrumented end-to-end so we can tell whether ≥30% of Pro users touch it in their first week

**Changed:**
- Whichever feature lands gets a row in `FEATURES.md` and a Pro-gating marker if its advanced version is gated
- Cap-enforcement layer from 0.10 used to enforce whatever Free / Pro split the new feature requires

**Pro feature decision rationale:**
- We are deliberately not pre-committing 1.6 to a specific feature in this roadmap because the choice depends on the data 1.0 + 1.1 + the multiplayer arc (1.2-1.4) + 1.5 collect. This roadmap entry is the slot, not the answer. The lead will name the actual feature in the 1.6 release-ready report; this file gets edited at that moment, not before.

**Why this version exists:** 1.0 through 1.5 prove people will pay and that multiplayer landed without breaking the core loop. 1.6 starts proving paying users will keep paying. The first thirty to sixty days of telemetry plus support email — now including the multiplayer signal from 1.2-1.4 — will surface a clear top-of-mind ask; whichever it is, 1.6 builds it well rather than three things badly.

---

### [1.7.0] - Delight, paywall A/B, lifecycle email

**Goal:** Compound the value of markdown notes for Pro users while running the first real paywall copy / price A/B test and putting Brew Focus into people's email inboxes at the right moments.

**Added:**
- **Backlinks panel** on every task and project detail, listing every note that wiki-links into this one, powered by the wiki-link parser already in place
- **Drag task between projects on Kanban** (deferred from desktop rounds 1-5 per `FEATURES.md`): drop a card onto another project's swimlane to reassign it, with a "moved from X to Y" activity-log entry and an undo toast
- Graph-view improvements: cluster sub-projects (if 1.6 shipped sub-projects), better force-sim convergence
- Multi-select drag on Kanban: shift-click a range, drag the group
- **Paywall copy and price A/B test** on the Lemon Squeezy hosted checkout: variants for lifetime price ($24.99 launch / $29.99 standard / $39.99 stretch) and monthly copy, served via the harness from 1.5
- **Lifecycle email infrastructure** (Resend or Loops) with four sequences: welcome (day 0-7), activation rescue (signed up, no session in three days), churn save (Pro cancel survey + offer), win-back (haven't opened in thirty days)

**Changed:**
- Activity-log events for project reassignment include source and destination projects so the history is auditable
- Graph view's selection and hover state reads through the same focus ring CSS variable from 0.5

**Fixed:**
- Wiki-link autocomplete sometimes proposes archived projects; archived items now ranked below active in the suggestion list
- Kanban column reorder occasionally drops a card during the drag if Supabase realtime fires mid-drag; we now lock the dragged card's row from realtime updates until drop

**Why this version exists:** 1.7 is the first minor that mixes pure delight (backlinks, cross-project Kanban) with the commercial work that turns 1.0's paywall from "live" into "tuned". The price A/B test is the single highest-leverage commercial experiment in the 1.x window: pricing is locked at $4.99/mo + $29.99 lifetime as the public number, but if the data says lifetime is materially under-priced, we have a defensible reason to revisit (with founder approval). Lifecycle email is the retention surface a productivity tool cannot afford to leave unbuilt; mobile is doing the same work in their 1.7.

---

## Phase 4 - 1.x evolution (versions 1.8 → 1.12)

> Headline: make Pro feel worth $4.99/mo year two. Build the integrations that lock people in. Introduce Team if the data supports it.

Integrations land on desktop first because OAuth flows are easier in a real browser. Desktop tends to be ~one minor ahead on integration work and ~one minor behind on commercial work. The Team plan launches simultaneously across both platforms because shared work doesn't make sense on one platform only.

---

### [1.8.0] - Calendar integration

**Goal:** Two-way Google Calendar integration. One-way Apple Calendar (read). Make a focus session a calendar citizen.

**Added:**
- Google Calendar OAuth flow (the OAuth abstraction this builds is the foundation for 1.9's three additional integrations) - Pro
- Two-way sync: tasks with due dates appear as calendar items; calendar events block the Daily Focus Queue so we don't propose focus during a meeting - Pro
- Apple Calendar read-only ingest via `EventKit` bridging on macOS - Pro
- "Schedule focus session" CTA on a task that creates a calendar block and an in-app focus reservation - Pro
- Calendar integration toggles in Settings -> Integrations, with a per-calendar enable/disable

**Changed:**
- Calendar view (the existing in-app one) now layers external calendar events as a faded background, distinguishable from native tasks
- Daily Focus Queue's "auto-flow" routine now respects calendar busy times

**Pro gating note:**
- Calendar integration is Pro-only across both platforms (matches mobile's 1.8). Cap-enforcement layer from 0.10 handles the gate.

**Why this version exists:** the most-requested integration in productivity tools is always calendar, and Brew Focus's calendar view sets the table for it perfectly. Desktop ships first because Google's OAuth flow demands a real browser and a real redirect URL, both of which a Tauri app handles cleanly via the deep-link scheme already in place. Mobile follows in the same minor on its own train.

---

### [1.9.0] - Task-tool integrations

**Goal:** Three more integrations on the same OAuth abstraction: Todoist, Notion, Linear. Each is a Pro hero feature for a different ICP slice.

**Added:**
- Todoist ingest: pull tasks in, brew them, push completion back - Pro
- Notion ingest: link a Notion database row to a Brew Focus task; updates flow both ways - Pro
- Linear ingest: link a Linear issue to a task; focus time on the task surfaces back as a Linear comment - Pro
- A unified "Integrations" Settings panel listing all four (Calendar, Todoist, Notion, Linear) with consistent connect / disconnect / refresh-token flows

**Changed:**
- Quick-capture parser learns three new prefix sigils (`!todoist`, `!notion`, `!linear`) so a power user can route a captured task to the right external system from the keyboard
- The `audit_log` table from 0.3 now records integration sync events so a user can debug "did this Linear update arrive"

**Pro gating note:**
- All three integrations are Pro-only on both platforms. Each integration is independently togglable so a Pro user only signs into the systems they actually use.

**Why this version exists:** integrations are how a product earns the recurring subscription. They're also how the product locks in: a Pro user with three integrations connected is dramatically less likely to churn than one with none. 1.9 is the ROI release for the OAuth abstraction 1.8 built. After this, every later integration costs us one new auth flow, not one new architecture.

---

### [1.10.0] - API access

**Goal:** Public read-only API for Pro users. Personal access tokens. Power-user surface that justifies $4.99/mo for the quantified-self crowd.

**Added:**
- Read-only REST endpoints for tasks, projects, sessions, milestones, activity log, exposed via Supabase Edge Functions with token auth - Pro
- Personal access tokens managed in Settings -> API: create, revoke, list with last-used timestamp - Pro
- Rate limiting per token (generous defaults, raised on request) backed by a Postgres counter
- API documentation site at brewfocus.com/docs, generated from an OpenAPI spec that lives in the repo at `docs/api/openapi.yaml`
- A "Connected apps" view in Settings showing which third-party tools have used each token recently

**Changed:**
- The OAuth abstraction from 1.8 / 1.9 is generalized so a Pro user could in theory build their own integration on top of these endpoints
- Premium aesthetic pack expands: new server-driven Pro coffee variants land via the existing `coffee_cup_variants` flow with no app release needed

**Pro gating note:**
- API access is Pro-only on both platforms. We deliberately do not create a separate "Developer" tier; the feature is a Pro hook.

**Why this version exists:** API access compounds the value of every other Pro feature. A Zapier-style integration with the entire ecosystem builds itself once read-only endpoints exist. 1.10 is the smallest credible API surface; a write API is left to a later minor where we have a stronger sense of what people actually want to write.

---

### [1.11.0] - Reports v2

**Goal:** Make the Reports tab the thing a Pro user shows their accountability buddy, manager, or therapist. Project-level insights. Weekly review email. PDF export.

**Added:**
- Project-level insights: velocity over weeks, average focus per session per project, completion rate trend, mood-vs-output regression - Pro
- Weekly review email sent every Sunday: total focus time, top three projects, longest session, the one task you kept rescheduling, sample of completed milestones - Pro
- "Export as PDF" on the Reports view, generating a clean printable summary suitable for sharing - Pro
- Cross-project velocity comparison: which project is moving fastest, slowest, has the most stale tasks
- Custom date-range selector on Reports beyond the existing week / month / quarter presets

**Changed:**
- Reports dashboard reorganizes around three time horizons (this week, this month, all time) with a consistent visual language
- The mood rating after work sessions (already in the schema) gets a real role in Reports for the first time

**Pro gating note:**
- The basic Reports surface stays free; the depth (project-level insights, weekly review email, PDF export, mood-vs-output) is Pro. Free Reports remains useful enough to be a daily-use tool.

**Why this version exists:** Reports v1 (the one that ships at 1.0) is enough to know what you did. Reports v2 is enough to know what you should do next. The weekly email is the single highest-leverage retention surface a productivity tool has, and it's how we put Brew Focus into a Pro user's routine even on the days they don't open the app.

---

### [1.12.0] - Team plan & power-user widgets

**Goal:** Launch the Team plan if the demand signal is there. Ship the desktop-only power-user features that make the always-on-top widget mode feel like first-class product.

**Added (Team plan, demand-gated):**
- **Brew Focus Teams** (only ships if ≥5 unsolicited "can multiple people share a project" requests have come in by 1.10; otherwise this entry slips to 2.x): shared projects, role-based read/write, team focus board, team-level analytics
- Org-scoped schema on a flag: an organization layer in the database that wraps the existing per-user tables, with row-level security rewritten to honor it
- Team billing on Lemon Squeezy: per-seat pricing; one purchase invoice covers the seat count; seat changes trigger prorated billing

**Added (desktop-only power-user widgets, Pro):**
- **Tray-resident mini-timer:** the system tray icon is now an interactive timer with play / pause / skip-break controls accessible without opening the window
- **Always-on-top widget mode** gets a redesigned compact layout with active task, current phase, and a one-tap "what's next" affordance - Pro
- **Linux GNOME Shell extension** for a native-feeling tray entry on Wayland (where the Tauri tray fallback is weaker) - Pro

**Changed:**
- The TitleBar avatar popover gains a Team-aware view if the user is in a team, listing teammates' presence (online / focusing / available) without leaking work content

**Pro gating note:**
- Team plan is a separate SKU at $9 per user per month (annual: $90 per user per year, 17% off) on both platforms. Individual Pro stays at $4.99/mo / $29.99 lifetime; Team is a different deal.
- Tray and widget power-user affordances are individual-Pro features (not Team-specific) because they are about the desktop idiom, not collaboration.

**Why this version exists:** if Phase 3 telemetry shows individual Pro converting and retaining well, 1.12 is where we start asking whether productivity teams are a separate market for the same product. If the data isn't there, Team slips and 1.12 becomes pure desktop-power-user delight. Either way, the tray / widget work is real and ships.

---

## Phase 5 - 2.0 inflection and 2.x sustaining

> Headline: ship the thing big enough to justify breaking the SemVer ceiling. Most likely candidate: the public web build going GA, which forces a concurrent schema and shared-package extraction.

These versions are sketched lightly. The closer we get to 2.0, the more this section gets rewritten with detail.

---

### [2.0.0] - Web build GA

**Goal:** Brew Focus runs in a browser. brewfocus.com becomes the primary acquisition surface. Shared core package ends the three-file duplication that's been a tax since day one.

**Highlights:**
- Web build (browser, including Chromebook and locked-down work computers) ships at parity with mobile (not desktop - desktop remains the power-user ceiling)
- brewfocus.com redesign: SEO-targeted landing pages (`/pomodoro-with-tasks`, `/pomodoro-for-students`, `/pomodoro-for-freelancers`, `/pomodoro-for-adhd`, `/alternative-to-forest`, `/alternative-to-focus-todo`), each its own ICP slice
- Pricing identical to desktop and mobile ($4.99/mo, $29.99 lifetime) via Lemon Squeezy
- **Web has no ads** in 2.0 (preserving the desktop+web quality halo; mobile carries the ad funnel)
- Shared `@brewfocus/core` package (real monorepo with pnpm or bun workspaces) containing types, row mappers, store logic; ends the three-file change discipline for schema work
- Auth model unification: web is browser-cookie based, desktop is deep-link based, mobile is OAuth-flow based, all behind one abstraction
- Performance budget framework: web, desktop, mobile all hit p99 interaction latency targets, with automated regression detection

**Why this version exists:** web doubles addressable market. The shared core package eliminates a structural tax that's been slowing every cross-platform feature since 0.1. 2.0 is the second launch moment after 1.0; the marketing pivots to brewfocus.com, the install-to-active-user funnel widens by the size of the browser-only audience.

---

### [2.1.0] - Shared core & content engine

**Highlights:**
- Both desktop and mobile finish migrating onto `@brewfocus/core` from 2.0
- Web feature parity catch-up: anything mobile / desktop have that web missed in 2.0 lands here
- Content engine launches: weekly long-form post on brewfocus.com, 1500-2500 words each, targeted at one keyword (sample topics: "Why Pomodoro fails for ADHD and what to do about it", "The 50/10 rule for deep code work", "Pomodoro vs time-blocking, which fits which work")
- Each post links to a relevant landing page from 2.0

**Why this version exists:** 2.0's architecture lift needs one minor of bedding-in. 2.1 also kicks off the content channel that compounds for the rest of the 2.x cycle.

---

### [2.2.0] - AI assist

**Highlights:**
- Smart task breakdown: paste a goal, get a list of tasks broken down with suggested durations
- Weekly planning suggestions: "based on your last four weeks, here's what to focus on next week"
- "What should I focus on right now" affordance that picks from your task list using priority, due date, and momentum signals
- Likely a Pro+ tier or addon (separate session decides; could be folded into Pro or sold as a $2 / month addon) - gating decision deferred to detailed monetization session (monetization design TBD)
- Affiliate / partner program launches: productivity creators get 30% recurring commission for twelve months on referred Pro subs

**Why this version exists:** AI assist in a productivity tool is now expected; 2.2 ships our take on it deliberately rather than reactively. The affiliate program is the second compounding channel after content.

---

### [2.3.0] - Public API & webhooks

**Highlights:**
- Write API endpoints land alongside the read endpoints from 1.10 (Pro) - Pro
- Webhooks: subscribe to `task.created`, `session.completed`, `project.archived`, more - Pro
- Zapier integration on top of the webhook surface
- The desktop client's own integrations from 1.8 / 1.9 migrate onto the same public webhook surface to dogfood it

**Why this version exists:** by 2.3 there's a real ecosystem. Pro users build their own integrations and share them. The "do you have an API" question stops being a sales objection.

---

### [2.4.0] - Native depth

**Highlights:**
- **Linux GNOME Shell extension** ships at parity with the existing tray (Wayland-first) - Pro
- Native macOS menu-bar widget option (alongside the existing tray) - Pro
- Windows widget surface in the Widgets pane (Win11) - Pro
- Performance budget regressions caught in CI

**Why this version exists:** 2.4 closes Phase 5 with a return to the desktop's idiomatic strengths after two minors of cross-platform AI and API work. The deep platform-native affordances are the last reason a power user picks Brew Focus over a phone-only Pomodoro app, and they age well: a tray entry shipped today is still a tray entry next year.

---

## Anti-goals - what this roadmap explicitly does NOT promise

- **No calendar dates.** Versions ship in order, when ready. We will not promise X.Y.Z by date Q.
- **No version-lockstepping with mobile.** Mobile is on its own train. At any given moment, desktop and mobile will have different version numbers, and that is correct.
- **We do not pre-decide which platform crosses 1.0 first.** Whichever platform finishes Phase 1 polish first gets the launch moment. The work decides, not the roadmap.
- **Sync is never gated behind Pro.** Sync is a 2026 baseline expectation, free for everyone, on both platforms, forever. Anyone who tells you sync is the Pro hook is reading a draft of this document from 2024.
- **Both persistent groups AND live sessions are capped at 5 on Free. Pro removes both caps. "Anyone can join" means non-friends can join via invite link — it does NOT mean unlimited session size for Free hosts.**
- **Pricing identical across platforms.** Free / Pro $4.99/mo / Pro $29.99 lifetime. No trial. One purchase cross-honors. We will not introduce a desktop-premium tier or a mobile discount at any point in this roadmap.
- **Pro users never see ads on any platform.** The `isPro === true` ad short-circuit is a correctness invariant, not a polish item. A Pro user seeing an ad is a brand-existential bug.
- **No ad ever interrupts the focus loop.** Not during a focus session, not during the brief between sessions, not on any surface that would block a Pomodoro from starting. We monetize the moments around focus, never focus itself.
- **No ads on desktop, ever.** Desktop is the quality halo and the power-user surface. Ad SDKs in a Tauri webview degrade the product feel. The mobile free tier carries the ad funnel; desktop carries the credibility. Future web stays ad-free for the same reason.
- **The exact Pro feature gates and free-tier caps are not locked in this file.** They land in a dedicated detailed monetization design session. Where this roadmap names a Pro feature or a cap, treat it as a candidate, not a final decision. (monetization design TBD)
- **No platform-only headline features without a "second-platform port" plan.** Genuinely platform-only features (tray, always-on-top, multi-window) stay desktop-only and that's fine; product features always get a port plan or are explicitly ruled out.
- **No "Generated with" trailers, no co-author lines, no internal jargon, no marketing fluff** in commits, changelogs, or this roadmap. The reader is a curious user or a paying subscriber, and they want signal, not noise.
- **No price changes during the 1.x window without founder approval.** Any price-display A/B test is on display, not on the underlying SKU.

---

## How this file is maintained

- New versions are added at the bottom of the relevant phase
- A version that ships moves its entry to [`CHANGELOG.md`](./CHANGELOG.md) under a real `[X.Y.Z] - YYYY-MM-DD` header, and the row in "At a glance" updates to `Released`
- The lead drafts changes; the founder (Can) approves every change to this file before it's published publicly
- This roadmap and [`mobile/ROADMAP.md`](../mobile/ROADMAP.md) are kept consistent on phase names, Pro feature gates, and anti-goals; version numbers and per-version themes diverge by design
