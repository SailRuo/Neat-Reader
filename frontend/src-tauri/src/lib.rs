use log::error;
use std::fs::OpenOptions;
use std::io::Write;
use std::panic;
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
        if let Err(e) = shell
          .sidecar("backend")
          .and_then(|command| command.spawn().map(|_| ()))
        {
          error!("failed to spawn backend sidecar: {e}");
        }
      }

      Ok(())
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
