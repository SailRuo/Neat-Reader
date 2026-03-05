use log::error;
use std::fs::OpenOptions;
use std::io::Write;
use std::panic;
use std::sync::Mutex;
use tauri::Manager;
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

      // 在 release 模式启动打包的 backend.exe
      if !cfg!(debug_assertions) {
        match shell.sidecar("backend").and_then(|command| command.spawn()) {
          Ok(child) => {
            app.manage(Mutex::new(Some(child)));
          }
          Err(e) => {
            error!("failed to spawn backend sidecar: {e}");
          }
        }
      } else {
        // 开发模式：不自动启动后端，需要手动启动
        println!("� [DEV] 开发模试式：请手动启动后端 (http://localhost:3002)");
        println!("💡 提示：cd python-backend && python -m uvicorn main:app --host 127.0.0.1 --port 3002 --reload");
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        // 在窗口关闭时终止后端进程
        if let Ok(mut child_mutex) = window.state::<Mutex<Option<CommandChild>>>().lock() {
          if let Some(child) = child_mutex.take() {
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
