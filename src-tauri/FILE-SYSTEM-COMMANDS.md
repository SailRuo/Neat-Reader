# File System Commands Documentation

## Overview

This document describes the file system Tauri commands implemented for the Neat Reader application. These commands provide secure file system access from the frontend through Tauri's IPC mechanism.

## Commands

### 1. read_file

**Purpose:** Read file contents from the filesystem and return as bytes (ArrayBuffer in JavaScript).

**Signature:**
```rust
#[tauri::command]
pub async fn read_file(path: String) -> Result<Vec<u8>, String>
```

**Parameters:**
- `path` (String): Absolute file path to read

**Returns:**
- `Ok(Vec<u8>)`: File contents as bytes (becomes ArrayBuffer in JavaScript)
- `Err(String)`: Error message with context

**Error Handling:**
- **File not found**: Returns error with message "Failed to read file {path}: No such file or directory"
- **Permission denied**: Returns error with message "Failed to read file {path}: Permission denied"
- **Other I/O errors**: Returns error with descriptive message

**Usage from Frontend:**
```typescript
import { invoke } from '@tauri-apps/api/tauri';

// Read EPUB file
const fileBytes = await invoke<Uint8Array>('read_file', { 
  path: 'C:\\Users\\username\\Documents\\book.epub' 
});

// Use with EPUB renderer
const blob = new Blob([fileBytes], { type: 'application/epub+zip' });
const arrayBuffer = await blob.arrayBuffer();
```

**Use Cases:**
- Load EPUB files for epub.js renderer (Requirement 4.3)
- Load PDF files for pdfjs-dist renderer (Requirement 4.3)
- Read user settings files
- Read book metadata files

**Security:**
- No path validation - relies on Tauri's security model
- User must have read permissions for the file
- Async operation prevents blocking the UI

---

### 2. open_directory

**Purpose:** Open native directory picker dialog.

**Signature:**
```rust
#[tauri::command]
pub fn open_directory() -> Result<Option<String>, String>
```

**Returns:**
- `Ok(Some(String))`: Selected directory path
- `Ok(None)`: User cancelled the dialog
- `Err(String)`: Error message

**Usage from Frontend:**
```typescript
const dirPath = await invoke<string | null>('open_directory');
if (dirPath) {
  console.log('Selected directory:', dirPath);
}
```

---

### 3. write_file

**Purpose:** Write data to filesystem with automatic directory creation.

**Signature:**
```rust
#[tauri::command]
pub async fn write_file(path: String, data: Vec<u8>) -> Result<(), String>
```

**Parameters:**
- `path` (String): Absolute file path to write
- `data` (Vec<u8>): File contents as bytes

**Returns:**
- `Ok(())`: Success
- `Err(String)`: Error message

**Features:**
- Automatically creates parent directories if they don't exist
- Overwrites existing files

**Usage from Frontend:**
```typescript
await invoke('write_file', {
  path: 'C:\\Users\\username\\Documents\\settings.json',
  data: new TextEncoder().encode(JSON.stringify(settings))
});
```

---

### 4. open_file

**Purpose:** Open native file picker dialog with optional filters.

**Signature:**
```rust
#[tauri::command]
pub fn open_file(filters: Option<Vec<(String, Vec<String>)>>) -> Result<Option<String>, String>
```

**Parameters:**
- `filters` (Optional): Array of tuples (name, extensions)

**Returns:**
- `Ok(Some(String))`: Selected file path
- `Ok(None)`: User cancelled the dialog
- `Err(String)`: Error message

**Usage from Frontend:**
```typescript
// With filters
const filePath = await invoke<string | null>('open_file', {
  filters: [
    ['EPUB Files', ['epub']],
    ['PDF Files', ['pdf']],
    ['All Files', ['*']]
  ]
});

// Without filters
const anyFile = await invoke<string | null>('open_file', { filters: null });
```

---

## Implementation Details

### File Reading Process

1. **Frontend calls invoke()** with file path
2. **Tauri IPC** serializes the call and sends to Rust backend
3. **Rust reads file** using `std::fs::read()`
4. **Returns Vec<u8>** which Tauri serializes
5. **Frontend receives** Uint8Array (ArrayBuffer view)

### Error Propagation

All errors are converted to descriptive strings:
```rust
fs::read(&path)
    .map_err(|e| format!("Failed to read file {}: {}", path, e))
```

This provides context about:
- Which file failed
- What the error was (not found, permission denied, etc.)

### Performance Considerations

- **Async operations**: `read_file` and `write_file` are async to prevent blocking
- **No buffering**: Files are read entirely into memory
- **Large files**: For files > 100MB, consider streaming or chunking (future enhancement)

---

## Requirements Mapping

| Requirement | Command | Status |
|-------------|---------|--------|
| 3.2 - File system Tauri commands | All | ✅ Complete |
| 4.2 - Native file picker | `open_directory`, `open_file` | ✅ Complete |
| 4.3 - Load file as ArrayBuffer | `read_file` | ✅ Complete |
| 4.4 - File write operations | `write_file` | ✅ Complete |

---

## Testing

### Manual Testing

```bash
# Build and run in dev mode
cd src-tauri
cargo tauri dev
```

Test scenarios:
1. Open file picker and select an EPUB file
2. Read the file and verify it loads in the reader
3. Write reading progress to a file
4. Verify error handling with invalid paths

### Integration Testing

The commands integrate with:
- **EpubReader component**: Uses `read_file` to load EPUB files
- **PdfReader component**: Uses `read_file` to load PDF files
- **Settings page**: Uses `write_file` to save user preferences
- **File manager**: Uses `open_file` and `open_directory` for file selection

---

## Security Notes

1. **No path traversal protection**: Tauri's security model handles this
2. **User permissions**: Commands respect OS-level file permissions
3. **No sandboxing**: Full filesystem access (configure in tauri.conf.json)
4. **HTTPS only**: Frontend must be served over HTTPS in production

---

## Future Enhancements

1. **Streaming API**: For large files (> 100MB)
2. **Progress callbacks**: For long-running operations
3. **Batch operations**: Read/write multiple files
4. **File watching**: Monitor file changes
5. **Metadata reading**: Get file info without reading contents

