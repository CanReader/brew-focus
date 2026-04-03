use tauri::Manager;

pub mod commands;
pub mod events;
pub mod timer;
pub mod tray;

use commands::*;
use timer::{BackgroundTimer, TimerConfig};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:brewfocus.db",
                    vec![
                        tauri_plugin_sql::Migration {
                            version: 1,
                            description: "initial schema",
                            sql: include_str!("../migrations/001_init.sql"),
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 2,
                            description: "add task notes and project fields",
                            sql: include_str!("../migrations/002_task_improvements.sql"),
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 3,
                            description: "milestones and session notes",
                            sql: include_str!("../migrations/003_milestones_session_notes.sql"),
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                    ],
                )
                .build(),
        )
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
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            win.show().unwrap();

            // System tray
            tray::setup_tray(&app.handle())?;

            // Background tick loop
            let bg_timer = app.state::<BackgroundTimer>().inner().clone();
            bg_timer.spawn_tick_loop(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
