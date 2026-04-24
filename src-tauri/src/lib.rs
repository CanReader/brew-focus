use tauri::{Manager, WindowEvent};

pub mod commands;
pub mod events;
pub mod timer;
pub mod tray;

use commands::*;
use timer::{BackgroundTimer, TimerConfig};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(BackgroundTimer::new(TimerConfig::default()))
        .invoke_handler(tauri::generate_handler![
            // window
            set_always_on_top,
            show_main_window,
            hide_main_window,
            center_window,
            get_window_scale_factor,
            // app info
            get_app_version,
            get_app_name,
            // timer
            timer_start,
            timer_pause,
            timer_reset,
            timer_skip,
            timer_snapshot,
            timer_update_config,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            // Propagate errors rather than panicking — a panic in .setup()
            // would take down the app before the tray is registered, leaving
            // no recovery path.
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
            } else {
                return Err("main window not found".into());
            }

            tray::setup_tray(&app.handle())?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
