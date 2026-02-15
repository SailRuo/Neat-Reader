use tauri::AppHandle;
use std::fs;
use std::path::PathBuf;

/// Open directory picker dialog
#[tauri::command]
pub async fn open_directory(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let result = app.dialog()
        .file()
        .blocking_pick_folder();
    
    Ok(result.map(|path| path.to_string()))
}

/// Read file from filesystem
#[tauri::command]
pub async fn read_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// Write file to filesystem
#[tauri::command]
pub async fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    fs::write(&path, data)
        .map_err(|e| format!("Failed to write file {}: {}", path, e))
}

/// Open file picker dialog
#[tauri::command]
pub async fn open_file(app: AppHandle, filters: Option<Vec<(String, Vec<String>)>>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let mut dialog = app.dialog().file();
    
    // Add file filters if provided
    if let Some(filter_list) = filters {
        for (name, extensions) in filter_list {
            let exts: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(&name, &exts);
        }
    }
    
    let result = dialog.blocking_pick_file();
    Ok(result.map(|path| path.to_string()))
}
