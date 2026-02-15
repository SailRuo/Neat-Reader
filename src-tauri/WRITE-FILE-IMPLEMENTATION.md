# write_file Command Implementation

## Overview

The `write_file` command is a Tauri command that writes binary data to the filesystem. It's implemented in `src-tauri/src/commands/file_system.rs` and is used for saving reading progress, user settings, and other application data.

## Implementation Details

### Function Signature

```rust
#[tauri::command]
pub async fn write_file(path: String, data: Vec<u8>) -> Result<(), String>
```

### Parameters

- `path: String` - The file path where data should be written
- `data: Vec<u8>` - Binary data to write to the file

### Return Value

- `Result<(), String>` - Returns `Ok(())` on success, or `Err(String)` with error message on failure

### Key Features

1. **Parent Directory Creation**: Automatically creates parent directories if they don't exist
2. **Error Handling**: Provides descriptive error messages for both directory creation and file write failures
3. **Binary Data Support**: Handles any binary data (text, JSON, images, etc.)
4. **Overwrite Behavior**: Overwrites existing files with new data

### Implementation

```rust
pub async fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    fs::write(&path, data)
        .map_err(|e| format!("Failed to write file {}: {}", path, e))
}
```

## Usage from Frontend

### TypeScript Interface

```typescript
// In frontend/src/api/adapter.ts or similar
async function writeFile(path: string, data: Uint8Array): Promise<void> {
  await invoke('write_file', { path, data: Array.from(data) });
}
```

### Example: Save Reading Progress

```typescript
import { invoke } from '@tauri-apps/api/tauri';

async function saveReadingProgress(bookId: string, progress: ReadingProgress) {
  const data = JSON.stringify(progress);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  const path = `${appDataDir}/progress/${bookId}.json`;
  await invoke('write_file', {
    path,
    data: Array.from(bytes)
  });
}
```

### Example: Save User Settings

```typescript
async function saveSettings(settings: UserSettings) {
  const data = JSON.stringify(settings, null, 2);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  const path = `${appDataDir}/settings.json`;
  await invoke('write_file', {
    path,
    data: Array.from(bytes)
  });
}
```

## Error Handling

The command returns descriptive error messages for common failure scenarios:

### Directory Creation Failure

```
"Failed to create directory: Permission denied"
```

This occurs when:
- Insufficient permissions to create directories
- Invalid path characters
- Disk is full

### File Write Failure

```
"Failed to write file /path/to/file.txt: Permission denied"
```

This occurs when:
- Insufficient permissions to write file
- File is locked by another process
- Disk is full
- Invalid file path

## Security Considerations

### Tauri Permissions

The command requires the following permissions in `tauri.conf.json`:

```json
{
  "tauri": {
    "allowlist": {
      "fs": {
        "all": true,
        "scope": ["$APPDATA/*", "$APPDATA/**"]
      }
    }
  }
}
```

### Best Practices

1. **Validate Paths**: Always validate file paths on the frontend before calling the command
2. **Use App Data Directory**: Store application data in the app data directory, not arbitrary locations
3. **Handle Errors**: Always handle errors gracefully and provide user feedback
4. **Limit File Size**: Consider implementing file size limits to prevent disk space issues

## Testing

### Unit Tests

The implementation includes comprehensive unit tests in `src-tauri/tests/write_file_test.rs`:

1. **test_write_file_basic**: Verifies basic file writing functionality
2. **test_write_file_creates_parent_directories**: Verifies automatic directory creation
3. **test_write_file_overwrites_existing**: Verifies file overwrite behavior
4. **test_write_file_binary_data**: Verifies binary data handling
5. **test_write_file_empty_data**: Verifies empty file creation
6. **test_write_file_invalid_path**: Verifies error handling for invalid paths

### Running Tests

```bash
cd src-tauri
cargo test --test write_file_test
```

## Use Cases in Neat Reader

### 1. Reading Progress Persistence

Save user's reading position, chapter, and CFI (Canonical Fragment Identifier) for EPUB files:

```typescript
interface ReadingProgress {
  bookId: string;
  position: number;
  chapter: string;
  cfi?: string;
  timestamp: number;
}

await writeFile(
  `${appDataDir}/progress/${bookId}.json`,
  encodeJSON(progress)
);
```

### 2. User Settings Storage

Save application settings like theme, font size, line height:

```typescript
interface UserSettings {
  theme: 'light' | 'sepia' | 'green' | 'dark';
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
}

await writeFile(
  `${appDataDir}/settings.json`,
  encodeJSON(settings)
);
```

### 3. Category Management

Save custom book categories and tags:

```typescript
interface Category {
  id: string;
  name: string;
  bookIds: string[];
}

await writeFile(
  `${appDataDir}/categories.json`,
  encodeJSON(categories)
);
```

### 4. Bookmark Storage

Save bookmarks for each book:

```typescript
interface Bookmark {
  id: string;
  bookId: string;
  position: number;
  cfi?: string;
  note?: string;
  timestamp: number;
}

await writeFile(
  `${appDataDir}/bookmarks/${bookId}.json`,
  encodeJSON(bookmarks)
);
```

## Performance Considerations

1. **Async Operation**: The command is async, preventing UI blocking during file writes
2. **Batch Writes**: Consider batching multiple writes to reduce I/O operations
3. **Debouncing**: Debounce frequent writes (e.g., reading progress) to reduce disk I/O
4. **File Size**: Keep individual files small for faster writes and reads

## Migration from Electron

### Electron API

```javascript
// Electron preload.js
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electron', {
  writeFile: async (filePath, data) => {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, data);
  }
});
```

### Tauri API

```rust
// Tauri command
#[tauri::command]
pub async fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    fs::write(&path, data)
        .map_err(|e| format!("Failed to write file {}: {}", path, e))
}
```

### Frontend Migration

```typescript
// Before (Electron)
await window.electron.writeFile(path, data);

// After (Tauri)
import { invoke } from '@tauri-apps/api/tauri';
await invoke('write_file', { path, data: Array.from(data) });
```

## Related Commands

- `read_file`: Read file from filesystem
- `open_file`: Open file picker dialog
- `open_directory`: Open directory picker dialog

## Requirements Validation

This implementation satisfies **Requirement 4.4** from the migration spec:

> THE 系统 SHALL 实现文件写入操作，用于保存阅读进度和用户设置

✅ **Implemented Features:**
- Uses `std::fs::write` for file writing
- Creates parent directories automatically with `fs::create_dir_all`
- Implements comprehensive error handling with descriptive messages
- Returns `Result<(), String>` for proper error propagation
- Supports binary data for any file type
- Async operation to prevent UI blocking

## Conclusion

The `write_file` command is fully implemented and ready for use. It provides a robust, secure, and performant way to write files from the Tauri frontend, with automatic directory creation and comprehensive error handling.
