use crate::api::baidu::BaiduClient;
use crate::api::types::BaiduTokenResponse;
use serde_json::Value;

/// Get Baidu access token
#[tauri::command]
pub async fn baidu_get_token(
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<BaiduTokenResponse, String> {
    let client = BaiduClient::new();
    client
        .get_token(&code, &client_id, &client_secret, &redirect_uri)
        .await
        .map_err(|e| e.to_string())
}

/// Refresh Baidu access token
#[tauri::command]
pub async fn baidu_refresh_token(
    refresh_token: String,
    client_id: String,
    client_secret: String,
) -> Result<BaiduTokenResponse, String> {
    let client = BaiduClient::new();
    client
        .refresh_token(&refresh_token, &client_id, &client_secret)
        .await
        .map_err(|e| e.to_string())
}

/// Verify Baidu access token
#[tauri::command]
pub async fn baidu_verify_token(access_token: String) -> Result<Value, String> {
    let client = BaiduClient::new();
    client
        .verify_token(&access_token)
        .await
        .map_err(|e| e.to_string())
}

/// List files in Baidu Netdisk
#[tauri::command]
pub async fn baidu_list_files(
    access_token: String,
    dir: String,
    page_num: Option<u32>,
    page_size: Option<u32>,
    order: Option<String>,
    recursion: Option<u8>,
) -> Result<Value, String> {
    let client = BaiduClient::new();
    client
        .list_files(
            &access_token,
            &dir,
            page_num,
            page_size,
            order.as_deref(),
            recursion,
        )
        .await
        .map_err(|e| e.to_string())
}

/// Search files in Baidu Netdisk
#[tauri::command]
pub async fn baidu_search_files(
    access_token: String,
    key: String,
    dir: String,
    recursion: Option<u8>,
) -> Result<Value, String> {
    let client = BaiduClient::new();
    client
        .search_files(&access_token, &key, &dir, recursion)
        .await
        .map_err(|e| e.to_string())
}

/// Upload file to Baidu Netdisk
#[tauri::command]
pub async fn baidu_upload_file(
    access_token: String,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<Value, String> {
    let client = BaiduClient::new();
    client
        .upload_file(&file_name, file_data, &access_token)
        .await
        .map_err(|e| e.to_string())
}

/// Download file from Baidu Netdisk
#[tauri::command]
pub async fn baidu_download_file(
    dlink: String,
    access_token: String,
) -> Result<Vec<u8>, String> {
    let client = BaiduClient::new();
    client
        .download_file(&dlink, &access_token)
        .await
        .map_err(|e| e.to_string())
}

/// Get file info from Baidu Netdisk
#[tauri::command]
pub async fn baidu_get_fileinfo(
    access_token: String,
    fsids: String,
) -> Result<Value, String> {
    let client = BaiduClient::new();
    client
        .get_fileinfo(&access_token, &fsids)
        .await
        .map_err(|e| e.to_string())
}
