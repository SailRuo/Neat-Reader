use log::error;
use std::fs::OpenOptions;
use std::io::Write;
use std::panic;
use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  panic::set_hook(Box::new(|info| {
    let _ = write_diagnostic(&format!("panic: {info}"));
  }));

  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_log::Builder::default().build())
    .setup(|app| {
      let shell = app.shell();

      if !cfg!(debug_assertions) {
        match shell.sidecar("backend").and_then(|command| command.spawn()) {
          Ok(child) => {
            // 保存子进程句柄到 app state
            app.manage(Mutex::new(Some(child)));
          }
          Err(e) => {
            error!("failed to spawn backend sidecar: {e}");
          }
        }
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        // 在窗口关闭时终止后端进程
        if let Some(child_mutex) = window.state::<Mutex<Option<CommandChild>>>().try_lock().ok() {
          if let Some(mut child) = child_mutex.as_ref().and_then(|c| c.as_ref()) {
            let _ = child.kill();
          }
        }
      }
    })
    .run(tauri::generate_context!())
    .unwrap_or_else(|e| {
      let _ = write_diagnostic(&format!("tauri run error: {e}"));
    });
}

fn write_diagnostic(message: &str) -> std::io::Result<()> {
  let mut path = std::env::temp_dir();
  path.push("neat-reader-tauri-diagnostic.log");

  let mut f = OpenOptions::new().create(true).append(true).open(path)?;
  writeln!(f, "{message}")?;
  Ok(())
}
