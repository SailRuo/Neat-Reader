# Baidu Netdisk API Implementation (Rust)

## Overview

This document describes the complete Rust implementation of all Baidu Netdisk API endpoints, replacing the previous Node.js Express backend. All 8 endpoints have been implemented following the original Express service logic.

## Implementation Status

✅ **All 8 endpoints completed:**

1. ✅ Token endpoint - Get access token via authorization code
2. ✅ Refresh endpoint - Refresh access token
3. ✅ Verify endpoint - Verify token validity
4. ✅ Files endpoint - List files in directory
5. ✅ Search endpoint - Search files by keyword
6. ✅ Upload endpoint - Upload files with multipart form
7. ✅ Download endpoint - Download files via dlink
8. ✅ Fileinfo endpoint - Get file metadata with download links

## Architecture

### File Structure

```
src-tauri/src/
├── api/
│   ├── baidu.rs          # Core API client implementation
│   └── types.rs          # Data structures
├── commands/
│   └── baidu.rs          # Tauri command wrappers
└── error.rs              # Error handling
```

### Key Components

**BaiduClient** (`src/api/baidu.rs`):
- HTTP client with 30-second timeout
- All API methods as async functions
- Proper error handling and response parsing
- App-specific path handling (`/apps/Neat Reader/`)

**Tauri Commands** (`src/commands/baidu.rs`):
- 8 command functions exposed to frontend
- Type-safe parameter handling
- Error conversion to strings for IPC

## API Endpoints

### 1. Token Endpoint

**Command:** `baidu_get_token`

**Purpose:** Exchange authorization code for access token

**Parameters:**
- `code: String` - Authorization code from OAuth flow
- `client_id: String` - Baidu app client ID
- `client_secret: String` - Baidu app client secret
- `redirect_uri: String` - OAuth redirect URI

**Returns:** `BaiduTokenResponse`
```rust
{
    access_token: String,
    expires_in: u64,
    refresh_token: String,
    scope: String
}
```

**Implementation:**
- POST to `https://openapi.baidu.com/oauth/2.0/token`
- Form-encoded parameters with `grant_type=authorization_code`

### 2. Refresh Endpoint

**Command:** `baidu_refresh_token`

**Purpose:** Refresh expired access token

**Parameters:**
- `refresh_token: String` - Refresh token from previous auth
- `client_id: String` - Baidu app client ID
- `client_secret: String` - Baidu app client secret

**Returns:** `BaiduTokenResponse`

**Implementation:**
- POST to `https://openapi.baidu.com/oauth/2.0/token`
- Form-encoded parameters with `grant_type=refresh_token`

### 3. Verify Endpoint

**Command:** `baidu_verify_token`

**Purpose:** Verify token validity and get user info

**Parameters:**
- `access_token: String` - Access token to verify

**Returns:** `Value` (JSON with user info)

**Implementation:**
- GET to `https://pan.baidu.com/rest/2.0/xpan/nas`
- Query parameters: `method=uinfo`, `access_token`

### 4. Files Endpoint

**Command:** `baidu_list_files`

**Purpose:** List files in a directory

**Parameters:**
- `access_token: String` - Valid access token
- `dir: String` - Directory path
- `page_num: Option<u32>` - Page number (default: 1)
- `page_size: Option<u32>` - Items per page (default: 100)
- `order: Option<String>` - Sort order (default: "name")
- `recursion: Option<u8>` - Recursive listing (default: 0)

**Returns:** `Value` (JSON with file list)

**Implementation:**
- GET to `https://pan.baidu.com/rest/2.0/xpan/file`
- Query parameters: `method=list`, pagination, sorting

### 5. Search Endpoint

**Command:** `baidu_search_files`

**Purpose:** Search files by keyword

**Parameters:**
- `access_token: String` - Valid access token
- `key: String` - Search keyword
- `dir: String` - Directory to search in
- `recursion: Option<u8>` - Recursive search (default: 1)

**Returns:** `Value` (JSON with search results)

**Implementation:**
- GET to `https://pan.baidu.com/rest/2.0/xpan/file`
- Query parameters: `method=search`, `key`, `dir`, `recursion`

### 6. Upload Endpoint

**Command:** `baidu_upload_file`

**Purpose:** Upload file to Baidu Netdisk

**Parameters:**
- `access_token: String` - Valid access token
- `file_name: String` - Target filename (relative to app folder)
- `file_data: Vec<u8>` - File content as bytes

**Returns:** `Value` (JSON with upload result)

**Implementation:**
1. Get upload domain via `locateupload` API
2. Build upload URL with path and access token
3. Create multipart form with file data
4. POST to upload domain
5. Handle error codes in response

**Path Handling:**
- Automatically prefixes with `/apps/Neat Reader/`
- Example: `book.epub` → `/apps/Neat Reader/book.epub`

### 7. Download Endpoint

**Command:** `baidu_download_file`

**Purpose:** Download file from Baidu Netdisk

**Parameters:**
- `dlink: String` - Download link from fileinfo endpoint
- `access_token: String` - Valid access token

**Returns:** `Vec<u8>` (File content as bytes)

**Implementation:**
- GET to download URL with access token appended
- Custom User-Agent: `pan.baidu.com`
- Returns raw bytes for frontend processing

### 8. Fileinfo Endpoint

**Command:** `baidu_get_fileinfo`

**Purpose:** Get file metadata including download links

**Parameters:**
- `access_token: String` - Valid access token
- `fsids: String` - Comma-separated file system IDs

**Returns:** `Value` (JSON with file metadata)

**Implementation:**
- GET to `https://pan.baidu.com/rest/2.0/xpan/file`
- Query parameters: `method=filemetas`, `fsids=[...]`, `dlink=1`
- Returns metadata including download links

## Additional Helper Methods

### Create Directory

**Method:** `create_directory`

**Purpose:** Create directory in Baidu Netdisk (used internally by upload)

**Implementation:**
- POST to filemanager API with `opera=mkdir`
- Handles errno -8 (directory exists) as success
- Returns success status and exists flag

### Delete File

**Method:** `delete_file`

**Purpose:** Delete files from Baidu Netdisk

**Implementation:**
- POST to filemanager API with `opera=delete`
- Accepts array of file paths
- Async deletion with `async=2`

### Path Helper

**Method:** `get_baidu_path`

**Purpose:** Convert relative path to full Baidu path

**Logic:**
```rust
fn get_baidu_path(relative_path: &str) -> String {
    let clean_path = relative_path.trim_start_matches('/');
    if clean_path.is_empty() {
        format!("/apps/{}", APP_NAME)  // "/apps/Neat Reader"
    } else {
        format!("/apps/{}/{}", APP_NAME, clean_path)
    }
}
```

## Dependencies

Added to `Cargo.toml`:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json", "multipart", "stream"] }
tokio = { version = "1.35", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
urlencoding = "2.1"
```

## Error Handling

All methods return `AppResult<T>` which maps to:
- Success: `Ok(T)`
- Failure: `Err(AppError::ApiError(String))`

Tauri commands convert errors to strings for IPC:
```rust
.map_err(|e| e.to_string())
```

## Differences from Express Implementation

### Similarities
✅ Same API endpoints and parameters
✅ Same request/response formats
✅ Same error handling logic
✅ Same path handling (`/apps/Neat Reader/`)

### Improvements
✅ Type-safe parameters and responses
✅ Better async/await with Tokio
✅ No need for separate HTTP server
✅ Direct IPC communication (faster)
✅ Smaller binary size
✅ Better memory management

### Changes
- No logging middleware (can be added if needed)
- Returns `Value` (JSON) instead of parsed structs for flexibility
- Upload uses reqwest multipart instead of form-data
- Download returns `Vec<u8>` directly instead of array format

## Frontend Integration

Frontend will call these commands via Tauri's `invoke`:

```typescript
import { invoke } from '@tauri-apps/api/tauri';

// Get token
const tokenResponse = await invoke('baidu_get_token', {
  code: authCode,
  clientId: 'xxx',
  clientSecret: 'xxx',
  redirectUri: 'xxx'
});

// List files
const files = await invoke('baidu_list_files', {
  accessToken: token,
  dir: '/apps/Neat Reader',
  pageNum: 1,
  pageSize: 100
});

// Upload file
const result = await invoke('baidu_upload_file', {
  accessToken: token,
  fileName: 'book.epub',
  fileData: arrayBuffer
});

// Download file
const fileData = await invoke('baidu_download_file', {
  dlink: downloadLink,
  accessToken: token
});
```

## Testing Checklist

- [ ] Test token acquisition with valid authorization code
- [ ] Test token refresh with valid refresh token
- [ ] Test token verification
- [ ] Test file listing in various directories
- [ ] Test file search with different keywords
- [ ] Test file upload (small and large files)
- [ ] Test file download (small and large files)
- [ ] Test fileinfo retrieval
- [ ] Test error handling for invalid tokens
- [ ] Test error handling for network failures
- [ ] Test path handling with special characters
- [ ] Test concurrent API calls

## Performance Considerations

**Timeout:** 30 seconds for all requests
**Concurrency:** All methods are async and can run concurrently
**Memory:** Efficient byte handling with Vec<u8>
**Caching:** Client instance can be reused (currently creates new per call)

## Future Improvements

1. **Client Pooling:** Reuse HTTP client across calls
2. **Retry Logic:** Automatic retry for transient failures
3. **Progress Tracking:** Upload/download progress callbacks
4. **Chunked Upload:** Support for large file uploads
5. **Logging:** Add structured logging for debugging
6. **Rate Limiting:** Implement rate limiting to avoid API throttling
7. **Caching:** Cache file listings and metadata

## References

- Original Express implementation: `backend/src/services/baiduService.js`
- Baidu Netdisk API docs: https://pan.baidu.com/union/doc/
- Requirements: `.kiro/specs/electron-to-tauri-migration/requirements.md` (Requirement 2.1, 2.7)
- Design: `.kiro/specs/electron-to-tauri-migration/design.md`
