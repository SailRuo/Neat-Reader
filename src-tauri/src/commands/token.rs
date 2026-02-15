use tauri::State;
use serde_json::Value;
use crate::storage::{TokenStore, BaiduTokenData, QwenTokenData, UserSettings};
use tauri::Wry;

type AppTokenStore = TokenStore<Wry>;

/// Save Baidu Netdisk token
#[tauri::command]
pub async fn save_baidu_token(
    token_store: State<'_, AppTokenStore>,
    access_token: String,
    refresh_token: String,
    expires_in: i64,
    scope: String,
    client_id: Option<String>,
    client_secret: Option<String>,
    redirect_uri: Option<String>,
) -> Result<Value, String> {
    println!("=== 保存百度网盘令牌 ===");
    
    let token = BaiduTokenData {
        access_token,
        refresh_token,
        expires_in,
        scope,
        client_id,
        client_secret,
        redirect_uri,
        stored_at: None, // Will be set by TokenStore
    };

    token_store.save_baidu_token(token)?;

    Ok(serde_json::json!({
        "success": true,
        "message": "百度网盘令牌已保存"
    }))
}

/// Get Baidu Netdisk token
#[tauri::command]
pub async fn get_baidu_token(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    println!("=== 获取百度网盘令牌 ===");
    
    match token_store.get_baidu_token()? {
        Some(token) => {
            println!("✓ 找到百度网盘令牌");
            Ok(serde_json::json!({
                "success": true,
                "token": token
            }))
        }
        None => {
            println!("✗ 未找到百度网盘令牌");
            Ok(serde_json::json!({
                "success": false,
                "message": "未找到令牌"
            }))
        }
    }
}

/// Delete Baidu Netdisk token
#[tauri::command]
pub async fn delete_baidu_token(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    println!("=== 删除百度网盘令牌 ===");
    
    token_store.delete_baidu_token()?;

    Ok(serde_json::json!({
        "success": true,
        "message": "百度网盘令牌已删除"
    }))
}

/// Check if Baidu token is expired
#[tauri::command]
pub async fn is_baidu_token_expired(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    let is_expired = token_store.is_baidu_token_expired()?;

    Ok(serde_json::json!({
        "expired": is_expired
    }))
}

/// Save Qwen AI token
#[tauri::command]
pub async fn save_qwen_token(
    token_store: State<'_, AppTokenStore>,
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
    api_key: Option<String>,
) -> Result<Value, String> {
    println!("=== 保存通义千问令牌 ===");
    
    let token = QwenTokenData {
        access_token,
        refresh_token,
        expires_in,
        api_key,
        stored_at: None, // Will be set by TokenStore
    };

    token_store.save_qwen_token(token)?;

    Ok(serde_json::json!({
        "success": true,
        "message": "通义千问令牌已保存"
    }))
}

/// Get Qwen AI token
#[tauri::command]
pub async fn get_qwen_token(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    println!("=== 获取通义千问令牌 ===");
    
    match token_store.get_qwen_token()? {
        Some(token) => {
            println!("✓ 找到通义千问令牌");
            Ok(serde_json::json!({
                "success": true,
                "token": token
            }))
        }
        None => {
            println!("✗ 未找到通义千问令牌");
            Ok(serde_json::json!({
                "success": false,
                "message": "未找到令牌"
            }))
        }
    }
}

/// Delete Qwen AI token
#[tauri::command]
pub async fn delete_qwen_token(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    println!("=== 删除通义千问令牌 ===");
    
    token_store.delete_qwen_token()?;

    Ok(serde_json::json!({
        "success": true,
        "message": "通义千问令牌已删除"
    }))
}

/// Check if Qwen token is expired
#[tauri::command]
pub async fn is_qwen_token_expired(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    let is_expired = token_store.is_qwen_token_expired()?;

    Ok(serde_json::json!({
        "expired": is_expired
    }))
}

/// Save user settings
#[tauri::command]
pub async fn save_user_settings(
    token_store: State<'_, AppTokenStore>,
    theme: Option<String>,
    font_size: Option<i32>,
    line_height: Option<f32>,
    language: Option<String>,
    extra: Option<Value>,
) -> Result<Value, String> {
    println!("=== 保存用户设置 ===");
    
    let settings = UserSettings {
        theme,
        font_size,
        line_height,
        language,
        extra,
    };

    token_store.save_user_settings(settings)?;

    Ok(serde_json::json!({
        "success": true,
        "message": "用户设置已保存"
    }))
}

/// Get user settings
#[tauri::command]
pub async fn get_user_settings(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    println!("=== 获取用户设置 ===");
    
    match token_store.get_user_settings()? {
        Some(settings) => {
            println!("✓ 找到用户设置");
            Ok(serde_json::json!({
                "success": true,
                "settings": settings
            }))
        }
        None => {
            println!("✗ 未找到用户设置");
            Ok(serde_json::json!({
                "success": false,
                "message": "未找到设置"
            }))
        }
    }
}

/// Delete user settings
#[tauri::command]
pub async fn delete_user_settings(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    println!("=== 删除用户设置 ===");
    
    token_store.delete_user_settings()?;

    Ok(serde_json::json!({
        "success": true,
        "message": "用户设置已删除"
    }))
}

/// Clear all stored data (tokens and settings)
#[tauri::command]
pub async fn clear_all_storage(
    token_store: State<'_, AppTokenStore>,
) -> Result<Value, String> {
    println!("=== 清除所有存储数据 ===");
    
    token_store.clear_all()?;

    Ok(serde_json::json!({
        "success": true,
        "message": "所有存储数据已清除"
    }))
}
