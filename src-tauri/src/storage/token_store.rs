use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::{Store, StoreBuilder};
use std::sync::Arc;
use crate::error::{AppError, AppResult};

/// Token data for Baidu Netdisk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaiduTokenData {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub scope: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_secret: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub redirect_uri: Option<String>,
    /// Timestamp when token was stored (Unix timestamp in seconds)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stored_at: Option<i64>,
}

/// Token data for Qwen AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QwenTokenData {
    pub access_token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
    /// Timestamp when token was stored (Unix timestamp in seconds)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stored_at: Option<i64>,
}

/// User preferences and settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub theme: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_size: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line_height: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(flatten)]
    pub extra: Option<Value>,
}

/// Token storage manager using tauri-plugin-store
pub struct TokenStore<R: Runtime> {
    store: Arc<Store<R>>,
}

impl<R: Runtime> TokenStore<R> {
    /// Store file name
    const STORE_FILE: &'static str = "tokens.dat";
    
    /// Storage keys
    const KEY_BAIDU_TOKEN: &'static str = "baidu_token";
    const KEY_QWEN_TOKEN: &'static str = "qwen_token";
    const KEY_USER_SETTINGS: &'static str = "user_settings";

    /// Create a new TokenStore instance
    pub fn new(app: &AppHandle<R>) -> AppResult<Self> {
        let store = StoreBuilder::new(app, Self::STORE_FILE)
            .build()
            .map_err(|e| AppError::StorageError(format!("Failed to create store: {}", e)))?;

        Ok(Self {
            store,
        })
    }

    /// Save Baidu Netdisk token
    pub fn save_baidu_token(&self, token: BaiduTokenData) -> AppResult<()> {
        let mut token_with_timestamp = token;
        token_with_timestamp.stored_at = Some(Self::current_timestamp());

        self.store.set(
            Self::KEY_BAIDU_TOKEN.to_string(),
            serde_json::to_value(&token_with_timestamp)
                .map_err(|e| AppError::StorageError(format!("Failed to serialize token: {}", e)))?
        );

        self.store.save()
            .map_err(|e| AppError::StorageError(format!("Failed to save store: {}", e)))?;

        println!("✓ Baidu token saved successfully");
        Ok(())
    }

    /// Retrieve Baidu Netdisk token
    pub fn get_baidu_token(&self) -> AppResult<Option<BaiduTokenData>> {
        match self.store.get(Self::KEY_BAIDU_TOKEN) {
            Some(value) => {
                let token = serde_json::from_value(value.clone())
                    .map_err(|e| AppError::StorageError(format!("Failed to deserialize token: {}", e)))?;
                Ok(Some(token))
            }
            None => Ok(None),
        }
    }

    /// Delete Baidu Netdisk token
    pub fn delete_baidu_token(&self) -> AppResult<()> {
        self.store.delete(Self::KEY_BAIDU_TOKEN);

        self.store.save()
            .map_err(|e| AppError::StorageError(format!("Failed to save store: {}", e)))?;

        println!("✓ Baidu token deleted successfully");
        Ok(())
    }

    /// Check if Baidu token is expired
    pub fn is_baidu_token_expired(&self) -> AppResult<bool> {
        match self.get_baidu_token()? {
            Some(token) => {
                if let Some(stored_at) = token.stored_at {
                    let current_time = Self::current_timestamp();
                    let elapsed = current_time - stored_at;
                    // Token expires after expires_in seconds, with 5-minute buffer
                    let expires_in = token.expires_in - 300; // 5 minutes buffer
                    Ok(elapsed >= expires_in)
                } else {
                    // If no timestamp, consider it expired
                    Ok(true)
                }
            }
            None => Ok(true), // No token means expired
        }
    }

    /// Save Qwen AI token
    pub fn save_qwen_token(&self, token: QwenTokenData) -> AppResult<()> {
        let mut token_with_timestamp = token;
        token_with_timestamp.stored_at = Some(Self::current_timestamp());

        self.store.set(
            Self::KEY_QWEN_TOKEN.to_string(),
            serde_json::to_value(&token_with_timestamp)
                .map_err(|e| AppError::StorageError(format!("Failed to serialize token: {}", e)))?
        );

        self.store.save()
            .map_err(|e| AppError::StorageError(format!("Failed to save store: {}", e)))?;

        println!("✓ Qwen token saved successfully");
        Ok(())
    }

    /// Retrieve Qwen AI token
    pub fn get_qwen_token(&self) -> AppResult<Option<QwenTokenData>> {
        match self.store.get(Self::KEY_QWEN_TOKEN) {
            Some(value) => {
                let token = serde_json::from_value(value.clone())
                    .map_err(|e| AppError::StorageError(format!("Failed to deserialize token: {}", e)))?;
                Ok(Some(token))
            }
            None => Ok(None),
        }
    }

    /// Delete Qwen AI token
    pub fn delete_qwen_token(&self) -> AppResult<()> {
        self.store.delete(Self::KEY_QWEN_TOKEN);

        self.store.save()
            .map_err(|e| AppError::StorageError(format!("Failed to save store: {}", e)))?;

        println!("✓ Qwen token deleted successfully");
        Ok(())
    }

    /// Check if Qwen token is expired
    pub fn is_qwen_token_expired(&self) -> AppResult<bool> {
        match self.get_qwen_token()? {
            Some(token) => {
                if let (Some(stored_at), Some(expires_in)) = (token.stored_at, token.expires_in) {
                    let current_time = Self::current_timestamp();
                    let elapsed = current_time - stored_at;
                    // Token expires after expires_in seconds, with 5-minute buffer
                    let expires_in_buffered = expires_in - 300; // 5 minutes buffer
                    Ok(elapsed >= expires_in_buffered)
                } else {
                    // If no timestamp or expires_in, consider it not expired
                    Ok(false)
                }
            }
            None => Ok(true), // No token means expired
        }
    }

    /// Save user settings
    pub fn save_user_settings(&self, settings: UserSettings) -> AppResult<()> {
        self.store.set(
            Self::KEY_USER_SETTINGS.to_string(),
            serde_json::to_value(&settings)
                .map_err(|e| AppError::StorageError(format!("Failed to serialize settings: {}", e)))?
        );

        self.store.save()
            .map_err(|e| AppError::StorageError(format!("Failed to save store: {}", e)))?;

        println!("✓ User settings saved successfully");
        Ok(())
    }

    /// Retrieve user settings
    pub fn get_user_settings(&self) -> AppResult<Option<UserSettings>> {
        match self.store.get(Self::KEY_USER_SETTINGS) {
            Some(value) => {
                let settings = serde_json::from_value(value.clone())
                    .map_err(|e| AppError::StorageError(format!("Failed to deserialize settings: {}", e)))?;
                Ok(Some(settings))
            }
            None => Ok(None),
        }
    }

    /// Delete user settings
    pub fn delete_user_settings(&self) -> AppResult<()> {
        self.store.delete(Self::KEY_USER_SETTINGS);

        self.store.save()
            .map_err(|e| AppError::StorageError(format!("Failed to save store: {}", e)))?;

        println!("✓ User settings deleted successfully");
        Ok(())
    }

    /// Clear all stored data
    pub fn clear_all(&self) -> AppResult<()> {
        self.store.clear();

        self.store.save()
            .map_err(|e| AppError::StorageError(format!("Failed to save store: {}", e)))?;

        println!("✓ All stored data cleared successfully");
        Ok(())
    }

    /// Get current Unix timestamp in seconds
    fn current_timestamp() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }
}
