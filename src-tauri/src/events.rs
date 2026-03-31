use serde::Serialize;

/// Emitted every second while the timer is running.
pub const TIMER_TICK: &str = "timer:tick";

/// Emitted when a phase (work/break) finishes.
pub const TIMER_PHASE_COMPLETE: &str = "timer:phase-complete";

/// Emitted when the window visibility changes.
pub const WINDOW_VISIBILITY_CHANGED: &str = "window:visibility-changed";

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseCompletePayload {
    pub phase: String,
    pub duration_secs: u32,
    pub completed_cycles: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowVisibilityPayload {
    pub visible: bool,
}
