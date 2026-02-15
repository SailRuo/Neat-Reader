use crate::error::{AppError, AppResult};
use crate::api::types::{TtsVoice, TtsSynthesisRequest, TtsVoicesResponse};
use reqwest::Client;
use std::time::Duration;

/// TTS API client using Microsoft Edge TTS
/// Based on the Express backend implementation using node-edge-tts
pub struct TtsClient {
    client: Client,
}

impl TtsClient {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(60))
                .build()
                .unwrap_or_else(|_| Client::new()),
        }
    }

    /// Synthesize text to speech using Microsoft Edge TTS API
    /// This implementation uses the same Edge TTS service as the Express backend
    pub async fn synthesize(&self, request: TtsSynthesisRequest) -> AppResult<Vec<u8>> {
        // Validate input
        if request.text.trim().is_empty() {
            return Err(AppError::ApiError("Text cannot be empty".to_string()));
        }

        // Convert rate/pitch/volume to SSML format
        let rate = self.format_prosody_value(request.rate);
        let pitch = self.format_prosody_value(request.pitch);
        let volume = self.format_prosody_value(request.volume);

        // Build SSML
        let ssml = self.build_ssml(&request.text, &request.voice, &rate, &pitch, &volume);

        // Call Microsoft Edge TTS API
        let audio_data = self.call_edge_tts_api(&ssml, &request.voice).await?;

        Ok(audio_data)
    }

    /// List available voices (matches Express backend structure)
    pub async fn list_voices(&self) -> AppResult<TtsVoicesResponse> {
        // Return comprehensive Chinese voice list matching Express backend
        let chinese_voices = vec![
            // 普通话（中国大陆）- 女声
            TtsVoice {
                short_name: "zh-CN-XiaoxiaoNeural".to_string(),
                friendly_name: "晓晓 (女声，温柔自然)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("通用场景，温柔亲切".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaoyiNeural".to_string(),
                friendly_name: "晓伊 (女声，甜美活泼)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("年轻女性，甜美可爱".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaochenNeural".to_string(),
                friendly_name: "晓辰 (女声，知性优雅)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("成熟女性，知性大方".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaohanNeural".to_string(),
                friendly_name: "晓涵 (女声，亲切温暖)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("亲切温暖，适合客服".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaomoNeural".to_string(),
                friendly_name: "晓墨 (女声，沉稳专业)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("新闻播报，专业沉稳".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaoqiuNeural".to_string(),
                friendly_name: "晓秋 (女声，成熟稳重)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("成熟女性，稳重大气".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaoxuanNeural".to_string(),
                friendly_name: "晓萱 (女声，优雅柔美)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("优雅柔美，适合朗读".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaoyanNeural".to_string(),
                friendly_name: "晓颜 (女声，柔和舒缓)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("柔和舒缓，适合有声书".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaoyouNeural".to_string(),
                friendly_name: "晓悠 (女声，童声可爱)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("儿童声音，活泼可爱".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaozhenNeural".to_string(),
                friendly_name: "晓甄 (女声，温婉动听)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("温婉动听，适合故事".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaoruiNeural".to_string(),
                friendly_name: "晓睿 (女声，清新明快)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("清新明快，年轻活力".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-XiaoshuangNeural".to_string(),
                friendly_name: "晓双 (女声，童声)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("儿童声音，天真烂漫".to_string()),
            },
            // 普通话（中国大陆）- 男声
            TtsVoice {
                short_name: "zh-CN-YunxiNeural".to_string(),
                friendly_name: "云希 (男声，沉稳大气)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Male".to_string(),
                description: Some("通用场景，沉稳大气".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-YunyangNeural".to_string(),
                friendly_name: "云扬 (男声，专业播音)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Male".to_string(),
                description: Some("新闻播报，专业标准".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-YunjianNeural".to_string(),
                friendly_name: "云健 (男声，活力阳光)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Male".to_string(),
                description: Some("年轻男性，充满活力".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-YunfengNeural".to_string(),
                friendly_name: "云枫 (男声，成熟稳重)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Male".to_string(),
                description: Some("成熟男性，稳重可靠".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-YunhaoNeural".to_string(),
                friendly_name: "云皓 (男声，广告配音)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Male".to_string(),
                description: Some("广告配音，磁性动听".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-YunyeNeural".to_string(),
                friendly_name: "云野 (男声，专业解说)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Male".to_string(),
                description: Some("专业解说，清晰有力".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-YunzeNeural".to_string(),
                friendly_name: "云泽 (男声，年轻清新)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Male".to_string(),
                description: Some("年轻男性，清新自然".to_string()),
            },
            // 多语言支持
            TtsVoice {
                short_name: "zh-CN-XiaoxiaoMultilingualNeural".to_string(),
                friendly_name: "晓晓多语言 (女声)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Female".to_string(),
                description: Some("支持多语言切换".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-YunxiMultilingualNeural".to_string(),
                friendly_name: "云希多语言 (男声)".to_string(),
                locale: "zh-CN".to_string(),
                gender: "Male".to_string(),
                description: Some("支持多语言切换".to_string()),
            },
            // 方言
            TtsVoice {
                short_name: "zh-CN-liaoning-XiaobeiNeural".to_string(),
                friendly_name: "晓北 (女声，东北话)".to_string(),
                locale: "zh-CN-liaoning".to_string(),
                gender: "Female".to_string(),
                description: Some("东北方言".to_string()),
            },
            TtsVoice {
                short_name: "zh-CN-shaanxi-XiaoniNeural".to_string(),
                friendly_name: "晓妮 (女声，陕西话)".to_string(),
                locale: "zh-CN-shaanxi".to_string(),
                gender: "Female".to_string(),
                description: Some("陕西方言".to_string()),
            },
            // 粤语
            TtsVoice {
                short_name: "zh-HK-HiuMaanNeural".to_string(),
                friendly_name: "曉曼 (女声，粤语)".to_string(),
                locale: "zh-HK".to_string(),
                gender: "Female".to_string(),
                description: Some("香港粤语，女声".to_string()),
            },
            TtsVoice {
                short_name: "zh-HK-HiuGaaiNeural".to_string(),
                friendly_name: "曉佳 (女声，粤语)".to_string(),
                locale: "zh-HK".to_string(),
                gender: "Female".to_string(),
                description: Some("香港粤语，女声".to_string()),
            },
            TtsVoice {
                short_name: "zh-HK-WanLungNeural".to_string(),
                friendly_name: "雲龍 (男声，粤语)".to_string(),
                locale: "zh-HK".to_string(),
                gender: "Male".to_string(),
                description: Some("香港粤语，男声".to_string()),
            },
            // 台湾国语
            TtsVoice {
                short_name: "zh-TW-HsiaoChenNeural".to_string(),
                friendly_name: "曉臻 (女声，台湾)".to_string(),
                locale: "zh-TW".to_string(),
                gender: "Female".to_string(),
                description: Some("台湾国语，女声".to_string()),
            },
            TtsVoice {
                short_name: "zh-TW-HsiaoYuNeural".to_string(),
                friendly_name: "曉雨 (女声，台湾)".to_string(),
                locale: "zh-TW".to_string(),
                gender: "Female".to_string(),
                description: Some("台湾国语，女声".to_string()),
            },
            TtsVoice {
                short_name: "zh-TW-YunJheNeural".to_string(),
                friendly_name: "雲哲 (男声，台湾)".to_string(),
                locale: "zh-TW".to_string(),
                gender: "Male".to_string(),
                description: Some("台湾国语，男声".to_string()),
            },
        ];

        Ok(TtsVoicesResponse {
            all: chinese_voices.clone(),
            chinese: chinese_voices,
        })
    }

    /// Format prosody value for SSML (-100 to 100 -> percentage string)
    fn format_prosody_value(&self, value: i32) -> String {
        if value == 0 {
            "default".to_string()
        } else if value > 0 {
            format!("+{}%", value)
        } else {
            format!("{}%", value)
        }
    }

    /// Build SSML for Edge TTS
    fn build_ssml(&self, text: &str, voice: &str, rate: &str, pitch: &str, volume: &str) -> String {
        format!(
            r#"<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
                <voice name="{}">
                    <prosody rate="{}" pitch="{}" volume="{}">
                        {}
                    </prosody>
                </voice>
            </speak>"#,
            voice, rate, pitch, volume, text
        )
    }

    /// Call Microsoft Edge TTS API
    /// Uses the same endpoint as node-edge-tts
    async fn call_edge_tts_api(&self, ssml: &str, _voice: &str) -> AppResult<Vec<u8>> {
        // Microsoft Edge TTS endpoint
        let url = "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";

        // Generate request ID (UUID format)
        let _request_id = uuid::Uuid::new_v4().to_string().replace("-", "");

        // Build headers matching Edge TTS protocol
        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/ssml+xml")
            .header("X-Microsoft-OutputFormat", "audio-24khz-48kbitrate-mono-mp3")
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0")
            .header("Origin", "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold")
            .header("Referer", "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1")
            .header("X-Edge-Shopping-Flag", "1")
            .header("Sec-CH-UA", "\"Microsoft Edge\";v=\"120\", \"Chromium\";v=\"120\", \"Not_A Brand\";v=\"99\"")
            .header("Sec-CH-UA-Mobile", "?0")
            .header("Sec-CH-UA-Platform", "\"Windows\"")
            .body(ssml.to_string())
            .send()
            .await?;

        if response.status().is_success() {
            let audio_data = response.bytes().await?;
            Ok(audio_data.to_vec())
        } else {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            Err(AppError::ApiError(format!(
                "Edge TTS API error ({}): {}",
                status, error_text
            )))
        }
    }
}

impl Default for TtsClient {
    fn default() -> Self {
        Self::new()
    }
}
