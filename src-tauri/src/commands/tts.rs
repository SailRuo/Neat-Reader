use crate::api::tts::TtsClient;
use crate::api::types::{TtsVoicesResponse, TtsSynthesisRequest};

/// Synthesize text to speech using Microsoft Edge TTS
#[tauri::command]
pub async fn tts_synthesize(request: TtsSynthesisRequest) -> Result<Vec<u8>, String> {
    let client = TtsClient::new();
    client
        .synthesize(request)
        .await
        .map_err(|e| e.to_string())
}

/// List available TTS voices
#[tauri::command]
pub async fn tts_list_voices() -> Result<TtsVoicesResponse, String> {
    let client = TtsClient::new();
    client
        .list_voices()
        .await
        .map_err(|e| e.to_string())
}
