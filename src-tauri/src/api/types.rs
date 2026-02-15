use serde::{Deserialize, Serialize};

/// Common API response wrapper
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

/// Baidu Netdisk token response
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BaiduTokenResponse {
    pub access_token: String,
    pub expires_in: u64,
    pub refresh_token: String,
    pub scope: String,
}

/// Baidu Netdisk file info
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BaiduFileInfo {
    pub fs_id: u64,
    pub path: String,
    pub server_filename: String,
    pub size: u64,
    pub isdir: u8,
    pub category: u32,
    pub md5: Option<String>,
    pub server_mtime: u64,
    pub local_mtime: u64,
}

/// Baidu Netdisk file list response
#[derive(Debug, Serialize, Deserialize)]
pub struct BaiduFileListResponse {
    pub errno: i32,
    pub list: Vec<BaiduFileInfo>,
}

/// Qwen AI chat message
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QwenMessage {
    pub role: String,
    pub content: serde_json::Value, // Can be string or array for multimodal
}

/// Qwen AI chat request
#[derive(Debug, Serialize, Deserialize)]
pub struct QwenChatRequest {
    pub model: String,
    pub messages: Vec<QwenMessage>,
    pub stream: Option<bool>,
}

/// Qwen AI chat response (OpenAI-compatible format)
#[derive(Debug, Serialize, Deserialize)]
pub struct QwenChatResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<QwenChoice>,
    pub usage: Option<QwenUsage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QwenChoice {
    pub index: u32,
    pub message: QwenMessage,
    pub finish_reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QwenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Qwen models list response
#[derive(Debug, Serialize, Deserialize)]
pub struct QwenModelsResponse {
    pub object: String,
    pub data: Vec<QwenModel>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QwenModel {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub owned_by: String,
}

/// TTS voice info (matches Express backend structure)
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct TtsVoice {
    pub short_name: String,
    pub friendly_name: String,
    pub locale: String,
    pub gender: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// TTS voices response
#[derive(Debug, Serialize, Deserialize)]
pub struct TtsVoicesResponse {
    pub all: Vec<TtsVoice>,
    pub chinese: Vec<TtsVoice>,
}

/// TTS synthesis request
#[derive(Debug, Serialize, Deserialize)]
pub struct TtsSynthesisRequest {
    pub text: String,
    #[serde(default = "default_voice")]
    pub voice: String,
    #[serde(default)]
    pub rate: i32,  // -100 to 100, 0 = default
    #[serde(default)]
    pub pitch: i32, // -100 to 100, 0 = default
    #[serde(default)]
    pub volume: i32, // -100 to 100, 0 = default
}

fn default_voice() -> String {
    "zh-CN-XiaoxiaoNeural".to_string()
}
