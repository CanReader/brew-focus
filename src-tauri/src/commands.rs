use tauri::{AppHandle, Manager, State, WebviewWindow};

use crate::timer::{BackgroundTimer, TimerConfig, TimerSnapshot};

// ── Window management ────────────────────────────────────────────────────────

#[tauri::command]
pub fn set_always_on_top(window: WebviewWindow, always_on_top: bool) -> Result<(), String> {
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<(), String> {
    let win = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    win.show().map_err(|e| e.to_string())?;
    win.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_main_window(app: AppHandle) -> Result<(), String> {
    let win = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    win.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn center_window(window: WebviewWindow) -> Result<(), String> {
    window.center().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_window_scale_factor(window: WebviewWindow) -> Result<f64, String> {
    window.scale_factor().map_err(|e| e.to_string())
}

// ── App info ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub fn get_app_name(app: AppHandle) -> String {
    app.package_info().name.clone()
}

// ── Timer commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn timer_start(timer: State<BackgroundTimer>) {
    timer.start();
}

#[tauri::command]
pub fn timer_pause(timer: State<BackgroundTimer>) {
    timer.pause();
}

#[tauri::command]
pub fn timer_reset(timer: State<BackgroundTimer>) {
    timer.reset();
}

#[tauri::command]
pub fn timer_skip(timer: State<BackgroundTimer>) {
    timer.skip();
}

#[tauri::command]
pub fn timer_snapshot(timer: State<BackgroundTimer>) -> TimerSnapshot {
    timer.snapshot()
}

#[tauri::command]
pub fn timer_update_config(timer: State<BackgroundTimer>, config: TimerConfig) {
    timer.update_config(config);
}
