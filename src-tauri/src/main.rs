// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod commands;
mod error;
mod storage;

use commands::*;
use storage::TokenStore;
use tauri::{Manager, Wry};

type AppTokenStore = TokenStore<Wry>;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Initialize TokenStore
            let token_store: AppTokenStore = TokenStore::new(app.handle())
                .expect("Failed to initialize token store");
            app.manage(token_store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File system commands
            file_system::open_directory,
            file_system::read_file,
            file_system::write_file,
            file_system::open_file,
            // Baidu Netdisk commands
            baidu::baidu_get_token,
            baidu::baidu_refresh_token,
            baidu::baidu_verify_token,
            baidu::baidu_list_files,
            baidu::baidu_search_files,
            baidu::baidu_upload_file,
            baidu::baidu_download_file,
            baidu::baidu_get_fileinfo,
            // Qwen AI commands
            qwen::qwen_chat,
            qwen::qwen_list_models,
            // TTS commands
            tts::tts_synthesize,
            tts::tts_list_voices,
            // OAuth commands
            oauth::open_auth_window,
            oauth::oauth_callback_handler,
            oauth::open_external,
            // Token storage commands
            token::save_baidu_token,
            token::get_baidu_token,
            token::delete_baidu_token,
            token::is_baidu_token_expired,
            token::save_qwen_token,
            token::get_qwen_token,
            token::delete_qwen_token,
            token::is_qwen_token_expired,
            token::save_user_settings,
            token::get_user_settings,
            token::delete_user_settings,
            token::clear_all_storage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
