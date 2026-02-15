use crate::error::{AppError, AppResult};
use crate::api::types::{BaiduTokenResponse, BaiduFileInfo, BaiduFileListResponse};
use reqwest::{Client, multipart};
use serde_json::{json, Value};
use std::time::Duration;

const APP_NAME: &str = "Neat Reader";

/// Baidu Netdisk API client
pub struct BaiduClient {
    client: Client,
}

impl BaiduClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| Client::new());
        
        Self { client }
    }

    /// Get Baidu path with app prefix
    fn get_baidu_path(relative_path: &str) -> String {
        let clean_path = relative_path.trim_start_matches('/');
        if clean_path.is_empty() {
            format!("/apps/{}", APP_NAME)
        } else {
            format!("/apps/{}/{}", APP_NAME, clean_path)
        }
    }

    /// Get access token using authorization code
    pub async fn get_token(
        &self,
        code: &str,
        client_id: &str,
        client_secret: &str,
        redirect_uri: &str,
    ) -> AppResult<BaiduTokenResponse> {
        let url = "https://openapi.baidu.com/oauth/2.0/token";
        
        let params = [
            ("grant_type", "authorization_code"),
            ("code", code),
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("redirect_uri", redirect_uri),
        ];

        let response = self.client
            .post(url)
            .form(&params)
            .send()
            .await?;

        if response.status().is_success() {
            let token_response: BaiduTokenResponse = response.json().await?;
            Ok(token_response)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to get token: {}", error_text)))
        }
    }

    /// Refresh access token
    pub async fn refresh_token(
        &self,
        refresh_token: &str,
        client_id: &str,
        client_secret: &str,
    ) -> AppResult<BaiduTokenResponse> {
        let url = "https://openapi.baidu.com/oauth/2.0/token";
        
        let params = [
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            ("client_id", client_id),
            ("client_secret", client_secret),
        ];

        let response = self.client
            .post(url)
            .form(&params)
            .send()
            .await?;

        if response.status().is_success() {
            let token_response: BaiduTokenResponse = response.json().await?;
            Ok(token_response)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to refresh token: {}", error_text)))
        }
    }

    /// Verify access token
    pub async fn verify_token(&self, access_token: &str) -> AppResult<Value> {
        let url = "https://pan.baidu.com/rest/2.0/xpan/nas";
        
        let response = self.client
            .get(url)
            .query(&[
                ("method", "uinfo"),
                ("access_token", access_token),
            ])
            .send()
            .await?;

        if response.status().is_success() {
            let result: Value = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to verify token: {}", error_text)))
        }
    }

    /// List files in a directory
    pub async fn list_files(
        &self,
        access_token: &str,
        dir: &str,
        page_num: Option<u32>,
        page_size: Option<u32>,
        order: Option<&str>,
        recursion: Option<u8>,
    ) -> AppResult<Value> {
        let url = "https://pan.baidu.com/rest/2.0/xpan/file";
        
        let mut params = vec![
            ("method", "list"),
            ("access_token", access_token),
            ("dir", dir),
        ];

        let page_num_str = page_num.unwrap_or(1).to_string();
        let page_size_str = page_size.unwrap_or(100).to_string();
        let order_str = order.unwrap_or("name");
        let recursion_str = recursion.unwrap_or(0).to_string();

        params.push(("page", &page_num_str));
        params.push(("num", &page_size_str));
        params.push(("order", order_str));
        params.push(("recursion", &recursion_str));

        let response = self.client
            .get(url)
            .query(&params)
            .send()
            .await?;

        if response.status().is_success() {
            let result: Value = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to list files: {}", error_text)))
        }
    }

    /// Search files
    pub async fn search_files(
        &self,
        access_token: &str,
        key: &str,
        dir: &str,
        recursion: Option<u8>,
    ) -> AppResult<Value> {
        let url = "https://pan.baidu.com/rest/2.0/xpan/file";
        
        let recursion_str = recursion.unwrap_or(1).to_string();
        
        let params = [
            ("method", "search"),
            ("access_token", access_token),
            ("key", key),
            ("dir", dir),
            ("recursion", &recursion_str),
        ];

        let response = self.client
            .get(url)
            .query(&params)
            .send()
            .await?;

        if response.status().is_success() {
            let result: Value = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to search files: {}", error_text)))
        }
    }

    /// Get file info with download link
    pub async fn get_fileinfo(
        &self,
        access_token: &str,
        fsids: &str,
    ) -> AppResult<Value> {
        let url = "https://pan.baidu.com/rest/2.0/xpan/file";
        
        let fsids_formatted = format!("[{}]", fsids);
        
        let params = [
            ("method", "filemetas"),
            ("access_token", access_token),
            ("fsids", &fsids_formatted),
            ("dlink", "1"),
        ];

        let response = self.client
            .get(url)
            .query(&params)
            .send()
            .await?;

        if response.status().is_success() {
            let result: Value = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to get file info: {}", error_text)))
        }
    }

    /// Download file
    pub async fn download_file(
        &self,
        dlink: &str,
        access_token: &str,
    ) -> AppResult<Vec<u8>> {
        let download_url = format!("{}&access_token={}", dlink, access_token);
        
        let response = self.client
            .get(&download_url)
            .header("User-Agent", "pan.baidu.com")
            .send()
            .await?;

        if response.status().is_success() {
            let bytes = response.bytes().await?;
            Ok(bytes.to_vec())
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to download file: {}", error_text)))
        }
    }

    /// Get upload domain
    async fn get_upload_domain(
        &self,
        access_token: &str,
        file_path: &str,
    ) -> AppResult<String> {
        let url = "https://d.pcs.baidu.com/rest/2.0/pcs/file";
        
        let params = [
            ("method", "locateupload"),
            ("appid", "250528"),
            ("access_token", access_token),
            ("path", file_path),
            ("upload_version", "2.0"),
            ("uploadid", "temp"),
        ];

        let response = self.client
            .get(url)
            .query(&params)
            .send()
            .await?;

        if response.status().is_success() {
            let result: Value = response.json().await?;
            
            if let Some(error_code) = result.get("error_code") {
                if !error_code.is_null() {
                    let error_msg = result.get("error_msg")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown error");
                    return Err(AppError::ApiError(format!("Get upload domain failed: {}", error_msg)));
                }
            }
            
            if let Some(servers) = result.get("servers").and_then(|v| v.as_array()) {
                if let Some(server) = servers.first() {
                    if let Some(server_url) = server.get("server").and_then(|v| v.as_str()) {
                        return Ok(server_url.to_string());
                    }
                }
            }
            
            Err(AppError::ApiError("No upload server available".to_string()))
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to get upload domain: {}", error_text)))
        }
    }

    /// Create directory
    pub async fn create_directory(
        &self,
        access_token: &str,
        relative_path: &str,
    ) -> AppResult<Value> {
        let baidu_path = Self::get_baidu_path(relative_path);
        let url = format!("https://pan.baidu.com/rest/2.0/xpan/file?method=filemanager&access_token={}&opera=mkdir", access_token);
        
        let form_data = [
            ("path", baidu_path.as_str()),
            ("isdir", "1"),
        ];

        let response = self.client
            .post(&url)
            .form(&form_data)
            .send()
            .await?;

        if response.status().is_success() {
            let result: Value = response.json().await?;
            
            // errno: 0 = success, -8 = directory already exists (also success)
            if let Some(errno) = result.get("errno").and_then(|v| v.as_i64()) {
                if errno == 0 || errno == -8 {
                    return Ok(json!({
                        "success": true,
                        "exists": errno == -8
                    }));
                }
            }
            
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to create directory: {}", error_text)))
        }
    }

    /// Upload file
    pub async fn upload_file(
        &self,
        file_name: &str,
        file_data: Vec<u8>,
        access_token: &str,
    ) -> AppResult<Value> {
        let baidu_path = Self::get_baidu_path(file_name);
        
        // Get upload domain
        let upload_domain = self.get_upload_domain(access_token, &baidu_path).await?;
        
        // Build upload URL
        let upload_url = format!(
            "{}/rest/2.0/pcs/file?method=upload&access_token={}&path={}&ondup=overwrite",
            upload_domain,
            access_token,
            urlencoding::encode(&baidu_path)
        );
        
        // Create multipart form
        let part = multipart::Part::bytes(file_data)
            .file_name("upload");
        
        let form = multipart::Form::new()
            .part("file", part);

        let response = self.client
            .post(&upload_url)
            .multipart(form)
            .send()
            .await?;

        if response.status().is_success() {
            let result: Value = response.json().await?;
            
            if let Some(error_code) = result.get("error_code") {
                if !error_code.is_null() {
                    let error_msg = result.get("error_msg")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown error");
                    return Err(AppError::ApiError(format!("Upload failed: {}", error_msg)));
                }
            }
            
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to upload file: {}", error_text)))
        }
    }

    /// Delete file
    pub async fn delete_file(
        &self,
        access_token: &str,
        file_paths: Vec<String>,
    ) -> AppResult<Value> {
        let url = format!(
            "https://pan.baidu.com/rest/2.0/xpan/file?method=filemanager&access_token={}&opera=delete&async=2",
            access_token
        );
        
        let filelist = serde_json::to_string(&file_paths)?;
        let form_data = [("filelist", filelist.as_str())];

        let response = self.client
            .post(&url)
            .form(&form_data)
            .send()
            .await?;

        if response.status().is_success() {
            let result: Value = response.json().await?;
            
            if let Some(errno) = result.get("errno").and_then(|v| v.as_i64()) {
                if errno != 0 {
                    let errmsg = result.get("errmsg")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown error");
                    return Err(AppError::ApiError(format!("Delete failed: {}", errmsg)));
                }
            }
            
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(AppError::ApiError(format!("Failed to delete file: {}", error_text)))
        }
    }
}

impl Default for BaiduClient {
    fn default() -> Self {
        Self::new()
    }
}
