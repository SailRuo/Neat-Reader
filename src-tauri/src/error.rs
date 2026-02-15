use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Custom error type for the application
#[derive(Error, Debug)]
pub enum AppError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON serialization error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Tauri error: {0}")]
    TauriError(String),

    #[error("API error: {0}")]
    ApiError(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),

    #[error("Authentication error: {0}")]
    AuthError(String),

    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

/// Error response structure for frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

impl From<AppError> for ErrorResponse {
    fn from(error: AppError) -> Self {
        ErrorResponse {
            error: format!("{:?}", error),
            message: error.to_string(),
        }
    }
}

/// Convert AppError to String for Tauri commands
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

/// Result type alias for convenience
pub type AppResult<T> = Result<T, AppError>;
