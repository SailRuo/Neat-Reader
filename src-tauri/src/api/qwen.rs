use crate::error::{AppError, AppResult};
use crate::api::types::{QwenChatRequest, QwenChatResponse, QwenMessage, QwenModelsResponse};
use reqwest::Client;
use serde_json::json;

/// Qwen AI API client (OAuth-based)
pub struct QwenClient {
    client: Client,
}

impl QwenClient {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
        }
    }

    /// Chat with Qwen AI using OAuth token
    /// Based on CLIProxyAPI implementation
    pub async fn chat(
        &self,
        access_token: &str,
        messages: Vec<QwenMessage>,
        model: Option<String>,
        resource_url: Option<String>,
    ) -> AppResult<QwenChatResponse> {
        // Construct API base URL from resource_url or use default
        let api_base_url = if let Some(url) = resource_url {
            format!("https://{}/v1", url)
        } else {
            "https://portal.qwen.ai/v1".to_string()
        };

        let url = format!("{}/chat/completions", api_base_url);
        let model = model.unwrap_or_else(|| "qwen3-coder-flash".to_string());

        let request_body = json!({
            "model": model,
            "messages": messages,
            "stream": false
        });

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "google-api-nodejs-client/9.15.1")
            .header("X-Goog-Api-Client", "gl-node/22.17.0")
            .header("Client-Metadata", "ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI")
            .header("Accept", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if response.status().is_success() {
            let result: QwenChatResponse = response.json().await?;
            Ok(result)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(AppError::ApiError(format!("Qwen API error ({}): {}", status, error_text)))
        }
    }

    /// List available models using OAuth token
    pub async fn list_models(
        &self,
        access_token: &str,
        resource_url: Option<String>,
    ) -> AppResult<QwenModelsResponse> {
        // Construct API base URL from resource_url or use default
        let api_base_url = if let Some(url) = resource_url {
            format!("https://{}/v1", url)
        } else {
            "https://portal.qwen.ai/v1".to_string()
        };

        let url = format!("{}/models", api_base_url);

        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "google-api-nodejs-client/9.15.1")
            .header("X-Goog-Api-Client", "gl-node/22.17.0")
            .header("Client-Metadata", "ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI")
            .header("Accept", "application/json")
            .send()
            .await?;

        if response.status().is_success() {
            let result: QwenModelsResponse = response.json().await?;
            Ok(result)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(AppError::ApiError(format!("Qwen API error ({}): {}", status, error_text)))
        }
    }
}

impl Default for QwenClient {
    fn default() -> Self {
        Self::new()
    }
}
