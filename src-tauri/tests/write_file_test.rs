#[cfg(test)]
mod write_file_tests {
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    // Simulate the write_file command logic
    async fn write_file_impl(path: String, data: Vec<u8>) -> Result<(), String> {
        // Ensure parent directory exists
        if let Some(parent) = PathBuf::from(&path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        
        fs::write(&path, data)
            .map_err(|e| format!("Failed to write file {}: {}", path, e))
    }

    #[tokio::test]
    async fn test_write_file_basic() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let data = b"Hello, World!".to_vec();

        let result = write_file_impl(
            file_path.to_string_lossy().to_string(),
            data.clone()
        ).await;

        assert!(result.is_ok());
        
        // Verify file was written correctly
        let read_data = fs::read(&file_path).unwrap();
        assert_eq!(read_data, data);
    }

    #[tokio::test]
    async fn test_write_file_creates_parent_directories() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("nested/dir/test.txt");
        let data = b"Test data".to_vec();

        let result = write_file_impl(
            file_path.to_string_lossy().to_string(),
            data.clone()
        ).await;

        assert!(result.is_ok());
        
        // Verify parent directories were created
        assert!(file_path.parent().unwrap().exists());
        
        // Verify file was written correctly
        let read_data = fs::read(&file_path).unwrap();
        assert_eq!(read_data, data);
    }

    #[tokio::test]
    async fn test_write_file_overwrites_existing() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        
        // Write initial data
        let initial_data = b"Initial".to_vec();
        write_file_impl(
            file_path.to_string_lossy().to_string(),
            initial_data
        ).await.unwrap();
        
        // Overwrite with new data
        let new_data = b"Overwritten".to_vec();
        let result = write_file_impl(
            file_path.to_string_lossy().to_string(),
            new_data.clone()
        ).await;

        assert!(result.is_ok());
        
        // Verify file was overwritten
        let read_data = fs::read(&file_path).unwrap();
        assert_eq!(read_data, new_data);
    }

    #[tokio::test]
    async fn test_write_file_binary_data() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("binary.dat");
        let data: Vec<u8> = (0..255).collect();

        let result = write_file_impl(
            file_path.to_string_lossy().to_string(),
            data.clone()
        ).await;

        assert!(result.is_ok());
        
        // Verify binary data was written correctly
        let read_data = fs::read(&file_path).unwrap();
        assert_eq!(read_data, data);
    }

    #[tokio::test]
    async fn test_write_file_empty_data() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("empty.txt");
        let data = Vec::new();

        let result = write_file_impl(
            file_path.to_string_lossy().to_string(),
            data
        ).await;

        assert!(result.is_ok());
        
        // Verify empty file was created
        let read_data = fs::read(&file_path).unwrap();
        assert_eq!(read_data.len(), 0);
    }

    #[tokio::test]
    async fn test_write_file_invalid_path() {
        // Try to write to an invalid path (root directory on Windows/Unix)
        let invalid_path = if cfg!(windows) {
            "C:\\invalid\\path\\that\\should\\fail\\test.txt"
        } else {
            "/root/invalid/path/test.txt"
        };
        
        let data = b"Test".to_vec();
        let result = write_file_impl(invalid_path.to_string(), data).await;

        // Should return an error
        assert!(result.is_err());
    }
}
