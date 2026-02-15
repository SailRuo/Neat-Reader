use crate::api::qwen::QwenClient;
use crate::api::types::{QwenChatResponse, QwenMessage, QwenModelsResponse};

/// Chat with Qwen AI using OAuth token
/// Based on CLIProxyAPI implementation
#[tauri::command]
pub async fn qwen_chat(
    access_token: String,
    messages: Vec<QwenMessage>,
    model: Option<String>,
    resource_url: Option<String>,
) -> Result<QwenChatResponse, String> {
    let client = QwenClient::new();
    client
        .chat(&access_token, messages, model, resource_url)
        .await
        .map_err(|e| e.to_string())
}

/// List available Qwen models using OAuth token
#[tauri::command]
pub async fn qwen_list_models(
    access_token: String,
    resource_url: Option<String>,
) -> Result<QwenModelsResponse, String> {
    let client = QwenClient::new();
    client
        .list_models(&access_token, resource_url)
        .await
        .map_err(|e| e.to_string())
}
