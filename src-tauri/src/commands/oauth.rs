use tauri::Manager;
use tauri::webview::WebviewWindowBuilder;
use serde_json::Value;
use std::sync::{Arc, Mutex};

lazy_static::lazy_static! {
    static ref OAUTH_RESULT: Arc<Mutex<Option<Result<Value, String>>>> = Arc::new(Mutex::new(None));
}

/// Handle OAuth callback from JavaScript
#[tauri::command]
pub async fn oauth_callback_handler(
    app: tauri::AppHandle,
    code: Option<String>,
    error: Option<String>,
    window_label: String,
) -> Result<(), String> {
    println!("=== OAuth 回调处理 ===");
    println!("Code: {:?}", code);
    println!("Error: {:?}", error);
    println!("Window Label: {}", window_label);

    // Store the result
    let result = if let Some(code_value) = code {
        println!("✓ 成功获取授权码");
        Ok(serde_json::json!({
            "success": true,
            "code": code_value
        }))
    } else if let Some(error_value) = error {
        println!("✗ 授权错误: {}", error_value);
        Ok(serde_json::json!({
            "success": false,
            "error": error_value
        }))
    } else {
        println!("✗ 未找到 code 或 error 参数");
        Ok(serde_json::json!({
            "success": false,
            "error": "未找到授权码"
        }))
    };

    *OAUTH_RESULT.lock().unwrap() = Some(result);

    // Close the OAuth window
    if let Some(window) = app.get_webview_window(&window_label) {
        println!("关闭授权窗口...");
        let _ = window.close();
    }

    Ok(())
}

/// Open OAuth authorization window and listen for redirect
/// 
/// This command creates a new window for OAuth authorization and monitors
/// URL changes to capture the authorization code from the callback URL.
/// 
/// Supports both Baidu Netdisk and Qwen OAuth flows.
#[tauri::command]
pub async fn open_auth_window(
    app: tauri::AppHandle,
    auth_url: String,
) -> Result<Value, String> {
    println!("=== Tauri: 开始处理 OAuth 授权窗口 ===");
    println!("授权 URL: {}", auth_url);

    // Clear previous result
    *OAUTH_RESULT.lock().unwrap() = None;

    // Create authorization window
    let auth_window = WebviewWindowBuilder::new(
        &app,
        "oauth-window",
        tauri::WebviewUrl::External(auth_url.parse().map_err(|e| format!("无效的 URL: {}", e))?)
    )
    .title("授权")
    .inner_size(800.0, 600.0)
    .center()
    .resizable(true)
    .build()
    .map_err(|e| format!("创建授权窗口失败: {}", e))?;

    println!("✓ 授权窗口创建成功");

    let window_label = auth_window.label().to_string();

    // Inject JavaScript to monitor URL changes
    // Wait a bit for the window to load
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    let inject_script = format!(r#"
        (function() {{
            console.log('[OAuth] 开始监听 URL 变化');
            let lastUrl = window.location.href;
            
            const checkUrl = () => {{
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {{
                    console.log('[OAuth] URL 变化:', currentUrl);
                    lastUrl = currentUrl;
                    
                    // Check if this is a callback URL
                    const isBaiduCallback = currentUrl.includes('alistgo.com/tool/baidu/callback');
                    const isQwenCallback = currentUrl.includes('qwen-callback');
                    
                    if (isBaiduCallback || isQwenCallback) {{
                        console.log('[OAuth] 检测到回调 URL');
                        try {{
                            // Parse URL parameters
                            const url = new URL(currentUrl);
                            const code = url.searchParams.get('code');
                            const error = url.searchParams.get('error');
                            
                            console.log('[OAuth] Code:', code);
                            console.log('[OAuth] Error:', error);
                            
                            // Send result to Rust backend
                            window.__TAURI__.invoke('oauth_callback_handler', {{
                                code: code,
                                error: error,
                                windowLabel: '{}'
                            }}).then(() => {{
                                console.log('[OAuth] 回调处理成功');
                            }}).catch((err) => {{
                                console.error('[OAuth] 回调处理失败:', err);
                            }});
                        }} catch (e) {{
                            console.error('[OAuth] URL 解析失败:', e);
                        }}
                    }}
                }}
            }};
            
            // Check every 100ms
            setInterval(checkUrl, 100);
            
            // Also check on page load
            window.addEventListener('load', checkUrl);
        }})();
    "#, window_label);

    if let Err(e) = auth_window.eval(&inject_script) {
        println!("⚠️ 注入 JavaScript 失败: {}", e);
        // Continue anyway, the window might still work
    }

    // Wait for result or timeout
    let timeout_duration = std::time::Duration::from_secs(300); // 5 minutes
    let start_time = std::time::Instant::now();
    let app_clone = app.clone();
    let window_label_clone = window_label.clone();

    loop {
        // Check if we have a result
        {
            let result_lock = OAUTH_RESULT.lock().unwrap();
            if let Some(result) = result_lock.as_ref() {
                println!("=== OAuth 流程完成 ===");
                return result.clone();
            }
        }

        // Check if window still exists
        if app_clone.get_webview_window(&window_label_clone).is_none() {
            println!("授权窗口已关闭");
            return Ok(serde_json::json!({
                "success": false,
                "error": "用户取消授权"
            }));
        }

        // Check timeout
        if start_time.elapsed() > timeout_duration {
            println!("✗ 授权超时");
            if let Some(window) = app_clone.get_webview_window(&window_label_clone) {
                let _ = window.close();
            }
            return Err("授权超时".to_string());
        }

        // Sleep briefly
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }
}

/// Open URL in external browser
#[tauri::command]
pub async fn open_external(url: String) -> Result<Value, String> {
    println!("打开外部链接: {}", url);

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("cmd")
            .args(&["/C", "start", "", &url])
            .spawn()
            .map_err(|e| format!("打开外部链接失败: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("打开外部链接失败: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("打开外部链接失败: {}", e))?;
    }

    println!("✓ 外部链接已打开");
    Ok(serde_json::json!({
        "success": true
    }))
}
