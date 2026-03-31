use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    Work,
    ShortBreak,
    LongBreak,
}

impl Phase {
    pub fn label(&self) -> &'static str {
        match self {
            Phase::Work => "Work",
            Phase::ShortBreak => "Short Break",
            Phase::LongBreak => "Long Break",
        }
    }

    pub fn is_break(&self) -> bool {
        matches!(self, Phase::ShortBreak | Phase::LongBreak)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerConfig {
    pub work_secs: u32,
    pub short_break_secs: u32,
    pub long_break_secs: u32,
    pub long_break_interval: u32,
    pub auto_start_breaks: bool,
    pub auto_start_work: bool,
}

impl Default for TimerConfig {
    fn default() -> Self {
        Self {
            work_secs: 25 * 60,
            short_break_secs: 5 * 60,
            long_break_secs: 15 * 60,
            long_break_interval: 4,
            auto_start_breaks: false,
            auto_start_work: false,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub phase: Phase,
    pub seconds_left: u32,
    pub total_seconds: u32,
    pub is_running: bool,
    pub completed_cycles: u32,
    pub elapsed_secs: u32,
}

#[derive(Debug)]
struct Inner {
    phase: Phase,
    seconds_left: u32,
    total_seconds: u32,
    is_running: bool,
    completed_cycles: u32,
    elapsed_secs: u32,
    last_tick: Option<Instant>,
    config: TimerConfig,
}

impl Inner {
    fn new(config: TimerConfig) -> Self {
        let secs = config.work_secs;
        Self {
            phase: Phase::Work,
            seconds_left: secs,
            total_seconds: secs,
            is_running: false,
            completed_cycles: 0,
            elapsed_secs: 0,
            last_tick: None,
            config,
        }
    }

    fn snapshot(&self) -> TimerSnapshot {
        TimerSnapshot {
            phase: self.phase,
            seconds_left: self.seconds_left,
            total_seconds: self.total_seconds,
            is_running: self.is_running,
            completed_cycles: self.completed_cycles,
            elapsed_secs: self.elapsed_secs,
        }
    }

    fn phase_duration(&self, phase: Phase) -> u32 {
        match phase {
            Phase::Work => self.config.work_secs,
            Phase::ShortBreak => self.config.short_break_secs,
            Phase::LongBreak => self.config.long_break_secs,
        }
    }

    fn next_phase(&self) -> Phase {
        match self.phase {
            Phase::Work => {
                let cycles_done = self.completed_cycles + 1;
                if cycles_done % self.config.long_break_interval == 0 {
                    Phase::LongBreak
                } else {
                    Phase::ShortBreak
                }
            }
            Phase::ShortBreak | Phase::LongBreak => Phase::Work,
        }
    }

    fn advance_phase(&mut self) {
        if self.phase == Phase::Work {
            self.completed_cycles += 1;
        }
        let next = self.next_phase();
        let auto_start = if next == Phase::Work {
            self.config.auto_start_work
        } else {
            self.config.auto_start_breaks
        };
        self.phase = next;
        self.total_seconds = self.phase_duration(next);
        self.seconds_left = self.total_seconds;
        self.elapsed_secs = 0;
        self.is_running = auto_start;
        self.last_tick = if auto_start { Some(Instant::now()) } else { None };
    }

    fn tick(&mut self) -> bool {
        if !self.is_running {
            return false;
        }
        let now = Instant::now();
        let delta = match self.last_tick {
            Some(last) => {
                let d = now.duration_since(last);
                // Cap at 2s to avoid huge jumps after suspend
                d.min(Duration::from_secs(2)).as_secs() as u32
            }
            None => 0,
        };
        self.last_tick = Some(now);

        if delta == 0 {
            return false;
        }

        if self.seconds_left <= delta {
            self.seconds_left = 0;
            self.elapsed_secs = self.total_seconds;
            self.is_running = false;
            return true; // phase completed
        }

        self.seconds_left -= delta;
        self.elapsed_secs += delta;
        false
    }
}

#[derive(Clone)]
pub struct BackgroundTimer {
    inner: Arc<Mutex<Inner>>,
}

impl BackgroundTimer {
    pub fn new(config: TimerConfig) -> Self {
        Self {
            inner: Arc::new(Mutex::new(Inner::new(config))),
        }
    }

    pub fn start(&self) {
        let mut g = self.inner.lock().unwrap();
        if !g.is_running {
            g.is_running = true;
            g.last_tick = Some(Instant::now());
        }
    }

    pub fn pause(&self) {
        let mut g = self.inner.lock().unwrap();
        g.is_running = false;
        g.last_tick = None;
    }

    pub fn reset(&self) {
        let mut g = self.inner.lock().unwrap();
        g.seconds_left = g.total_seconds;
        g.elapsed_secs = 0;
        g.is_running = false;
        g.last_tick = None;
    }

    pub fn skip(&self) {
        let mut g = self.inner.lock().unwrap();
        g.advance_phase();
    }

    pub fn update_config(&self, config: TimerConfig) {
        let mut g = self.inner.lock().unwrap();
        let was_work = g.phase == Phase::Work;
        g.config = config;
        // Refresh current phase duration if not running
        if !g.is_running {
            g.total_seconds = g.phase_duration(g.phase);
            g.seconds_left = g.total_seconds;
            g.elapsed_secs = 0;
        }
        let _ = was_work;
    }

    pub fn snapshot(&self) -> TimerSnapshot {
        self.inner.lock().unwrap().snapshot()
    }

    /// Advance one tick and return (snapshot, phase_just_completed).
    pub fn tick(&self) -> (TimerSnapshot, bool) {
        let mut g = self.inner.lock().unwrap();
        let completed = g.tick();
        if completed {
            let snap_before = g.snapshot();
            g.advance_phase();
            return (snap_before, true);
        }
        (g.snapshot(), false)
    }

    /// Spawn a background thread that ticks every second and emits events.
    pub fn spawn_tick_loop(self, app: AppHandle) {
        std::thread::spawn(move || loop {
            std::thread::sleep(Duration::from_secs(1));
            let (snap, completed) = self.tick();
            let _ = app.emit("timer:tick", &snap);
            if completed {
                let _ = app.emit("timer:phase-complete", &snap);
            }
        });
    }
}
