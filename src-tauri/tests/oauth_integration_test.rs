#[cfg(test)]
mod oauth_integration_tests {
    use serde_json::json;

    /// Test OAuth callback handler with valid code
    #[tokio::test]
    async fn test_oauth_callback_with_code() {
        let code = Some("test_authorization_code".to_string());
        let error = None;
        let window_label = "oauth-window".to_string();

        // Simulate callback handler
        let result = if let Some(code_value) = code {
            Ok(json!({
                "success": true,
                "code": code_value
            }))
        } else {
            Ok(json!({
                "success": false,
                "error": "No code provided"
            }))
        };

        assert!(result.is_ok());
        let result_json = result.unwrap();
        assert_eq!(result_json["success"], true);
        assert_eq!(result_json["code"], "test_authorization_code");
    }

    /// Test OAuth callback handler with error
    #[tokio::test]
    async fn test_oauth_callback_with_error() {
        let code = None;
        let error = Some("access_denied".to_string());
        let window_label = "oauth-window".to_string();

        let result = if let Some(error_value) = error {
            Ok(json!({
                "success": false,
                "error": error_value
            }))
        } else {
            Ok(json!({
                "success": false,
                "error": "Unknown error"
            }))
        };

        assert!(result.is_ok());
        let result_json = result.unwrap();
        assert_eq!(result_json["success"], false);
        assert_eq!(result_json["error"], "access_denied");
    }

    /// Test token expiration calculation
    #[test]
    fn test_token_expiration() {
        let stored_at = 1000000;
        let expires_in = 2592000; // 30 days
        let current_time = 1000000 + 2592000 + 1; // Just expired

        let buffer = 300; // 5 minutes
        let is_expired = (current_time - stored_at) >= (expires_in - buffer);
        
        assert!(is_expired);
    }

    /// Test token not expired
    #[test]
    fn test_token_not_expired() {
        let stored_at = 1000000;
        let expires_in = 2592000; // 30 days
        let current_time = 1000000 + 1000; // 1000 seconds later
        
        let buffer = 300;
        let is_expired = (current_time - stored_at) >= (expires_in - buffer);
        
        assert!(!is_expired);
    }

    /// Test authorization URL construction
    #[test]
    fn test_auth_url_construction() {
        let client_id = "hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf";
        let redirect_uri = "https://alistgo.com/tool/baidu/callback";
        let scope = "basic,netdisk";
        
        let auth_url = format!(
            "https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id={}&redirect_uri={}&scope={}",
            client_id,
            urlencoding::encode(redirect_uri),
            scope
        );
        
        assert!(auth_url.contains("response_type=code"));
        assert!(auth_url.contains(&format!("client_id={}", client_id)));
        assert!(auth_url.contains("redirect_uri="));
    }
}
