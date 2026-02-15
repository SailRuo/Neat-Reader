# Tauri API Adapter

This adapter provides a type-safe, consistent interface for all Tauri IPC calls, maintaining compatibility with the existing Electron API surface to minimize frontend code changes.

## Overview

The Tauri adapter wraps all Tauri `invoke` calls and provides:

- ✅ **Type Safety**: Full TypeScript type definitions for all commands
- ✅ **Error Handling**: Graceful error handling with descriptive messages
- ✅ **API Compatibility**: Same interface as Electron version
- ✅ **Zero Frontend Changes**: Drop-in replacement for existing API calls

## Requirements Fulfilled

- **3.1**: Maps all Electron contextBridge API to Tauri invoke pattern
- **3.3**: Type-safe IPC interfaces using TypeScript
- **3.4**: Graceful error handling with typed responses
- **3.5**: Maintains same API surface for frontend components

## Architecture

```
Frontend Component
       ↓
  tauriApi (adapter)
       ↓
  Tauri invoke()
       ↓
  Rust Command Handler
       ↓
  Backend Service (Baidu/Qwen/TTS)
```

## Usage

### Import the Adapter

```typescript
import { tauriApi, isTauri } from '@/api/tauri-adapter'
```

### Check Environment

```typescript
if (isTauri()) {
  // Running in Tauri
  const path = await tauriApi.openDirectory()
} else {
  // Running in browser or Electron
}
```

## API Reference

### File System API

#### `openDirectory()`
Opens a native directory picker dialog.

```typescript
const path = await tauriApi.openDirectory()
// Returns: string | null
```

#### `readFile(path: string)`
Reads a file from the filesystem.

```typescript
const data = await tauriApi.readFile('/path/to/book.epub')
// Returns: number[] (byte array)
```

#### `writeFile(path: string, data: number[])`
Writes data to a file.

```typescript
await tauriApi.writeFile('/path/to/file.txt', [72, 101, 108, 108, 111])
// Returns: void
```

#### `openFile(filters?: FileFilter[])`
Opens a native file picker dialog with optional filters.

```typescript
const path = await tauriApi.openFile([
  { name: '电子书', extensions: ['epub', 'pdf', 'txt'] }
])
// Returns: string | null
```

#### `selectFile()`
Convenience method for selecting ebook files.

```typescript
const path = await tauriApi.selectFile()
// Returns: string | null
// Pre-configured with epub, pdf, txt filters
```

### Baidu Netdisk API

#### `getTokenViaCode()`
Exchanges authorization code for access token.

```typescript
const response = await tauriApi.getTokenViaCode(
  code,
  clientId,
  clientSecret,
  redirectUri
)
// Returns: BaiduTokenResponse
// {
//   access_token: string
//   expires_in: number
//   refresh_token: string
//   scope: string
// }
```

#### `refreshToken()`
Refreshes an expired access token.

```typescript
const response = await tauriApi.refreshToken(
  refreshToken,
  clientId,
  clientSecret
)
// Returns: BaiduTokenResponse
```

#### `verifyToken()`
Verifies if an access token is valid.

```typescript
const userInfo = await tauriApi.verifyToken(accessToken)
// Returns: any (user info object)
```

#### `getFileList()`
Lists files in a Baidu Netdisk directory.

```typescript
const response = await tauriApi.getFileList(
  accessToken,
  '/apps/Neat Reader',  // dir
  1,                     // pageNum
  100,                   // pageSize
  'name',                // order
  'list',                // method
  0                      // recursion
)
// Returns: any (file list response)
```

#### `searchFiles()`
Searches for files in Baidu Netdisk.

```typescript
const response = await tauriApi.searchFiles(
  accessToken,
  'book.epub',  // search key
  '/',          // dir
  'search',     // method
  1             // recursion
)
// Returns: any (search results)
```

#### `getFileInfo()`
Gets detailed info for specific files.

```typescript
const info = await tauriApi.getFileInfo(
  accessToken,
  '123456789'  // fsids (comma-separated)
)
// Returns: any (file info)
```

#### `downloadFile()`
Downloads a file from Baidu Netdisk.

```typescript
const data = await tauriApi.downloadFile(dlink, accessToken)
// Returns: number[] (file bytes)
```

#### `uploadFile()`
Uploads a file to Baidu Netdisk.

```typescript
const response = await tauriApi.uploadFile(
  'book.epub',
  fileData,      // number[]
  accessToken
)
// Returns: any (upload response)
```

### Qwen AI API

#### `qwenChat()`
Sends a chat message to Qwen AI.

```typescript
const response = await tauriApi.qwenChat(
  accessToken,
  [
    { role: 'user', content: 'Summarize this chapter' }
  ],
  'qwen-turbo',           // optional model
  'https://...'           // optional resource_url
)
// Returns: QwenChatResponse
// {
//   id: string
//   object: string
//   created: number
//   model: string
//   choices: [
//     {
//       index: number
//       message: { role: string, content: string }
//       finish_reason: string
//     }
//   ]
//   usage?: {
//     prompt_tokens: number
//     completion_tokens: number
//     total_tokens: number
//   }
// }
```

#### `qwenListModels()`
Lists available Qwen AI models.

```typescript
const response = await tauriApi.qwenListModels(
  accessToken,
  resourceUrl  // optional
)
// Returns: QwenModelsResponse
// {
//   object: string
//   data: [
//     {
//       id: string
//       object: string
//       created: number
//       owned_by: string
//     }
//   ]
// }
```

### TTS API

#### `ttsSynthesize()`
Synthesizes text to speech.

```typescript
const audioData = await tauriApi.ttsSynthesize({
  text: 'Hello, world!',
  voice: 'zh-CN-XiaoxiaoNeural',  // optional
  rate: 0,                         // optional: -100 to 100
  pitch: 0,                        // optional: -100 to 100
  volume: 0                        // optional: -100 to 100
})
// Returns: number[] (audio bytes)

// Convert to Blob for playback
const blob = new Blob([new Uint8Array(audioData)], { type: 'audio/mpeg' })
const url = URL.createObjectURL(blob)
const audio = new Audio(url)
audio.play()
```

#### `ttsListVoices()`
Lists available TTS voices.

```typescript
const response = await tauriApi.ttsListVoices()
// Returns: TtsVoicesResponse
// {
//   all: TtsVoice[]
//   chinese: TtsVoice[]
// }
// 
// TtsVoice: {
//   ShortName: string
//   FriendlyName: string
//   Locale: string
//   Gender: string
//   Description?: string
// }
```

## Migration from Electron

The adapter maintains the same interface as the Electron version, so most code can remain unchanged:

### Before (Electron)
```typescript
import { api } from '@/api/adapter'

const path = await api.openDirectory()
const token = await api.getTokenViaCode(code, clientId, clientSecret, redirectUri)
```

### After (Tauri)
```typescript
import { tauriApi } from '@/api/tauri-adapter'

const path = await tauriApi.openDirectory()
const token = await tauriApi.getTokenViaCode(code, clientId, clientSecret, redirectUri)
```

### Universal Adapter Pattern

For code that needs to work in both environments:

```typescript
import { api as electronApi } from '@/api/adapter'
import { tauriApi, isTauri } from '@/api/tauri-adapter'

const api = isTauri() ? tauriApi : electronApi

// Now use api normally
const path = await api.openDirectory()
```

## Error Handling

All adapter functions handle errors gracefully:

```typescript
try {
  const data = await tauriApi.readFile('/path/to/file.epub')
  // Process data
} catch (error) {
  // Error is already logged to console
  // Show user-friendly message
  console.error('Failed to load book:', error.message)
}
```

Errors are:
1. Caught and logged with context
2. Re-thrown with descriptive messages
3. Type-safe (TypeScript will catch type errors at compile time)

## Type Definitions

All types are exported from the adapter:

```typescript
import type {
  BaiduTokenResponse,
  BaiduFileInfo,
  QwenMessage,
  QwenChatResponse,
  QwenModelsResponse,
  TtsVoice,
  TtsVoicesResponse,
  TtsSynthesisRequest,
  FileFilter
} from '@/api/tauri-adapter'
```

## Direct Function Access

You can also import individual functions directly:

```typescript
import {
  tauriOpenDirectory,
  tauriReadFile,
  baiduGetToken,
  qwenChat,
  ttsSynthesize
} from '@/api/tauri-adapter'

const path = await tauriOpenDirectory()
const token = await baiduGetToken(code, clientId, clientSecret, redirectUri)
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { tauriApi } from '@/api/tauri-adapter'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}))

describe('Tauri Adapter', () => {
  it('should call open_directory command', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri')
    vi.mocked(invoke).mockResolvedValue('/path/to/dir')
    
    const result = await tauriApi.openDirectory()
    
    expect(invoke).toHaveBeenCalledWith('open_directory')
    expect(result).toBe('/path/to/dir')
  })
})
```

## Performance Considerations

- **Type Safety**: All type checking happens at compile time (zero runtime cost)
- **Error Handling**: Minimal overhead, only logs and re-throws
- **Direct Invocation**: No intermediate layers, direct Tauri invoke calls
- **Memory Efficient**: Byte arrays are passed directly without copying

## Security

The adapter follows Tauri's security model:

- ✅ All commands must be explicitly registered in Rust
- ✅ No arbitrary command execution
- ✅ Type-safe parameter validation
- ✅ Rust-side error handling prevents crashes

## Troubleshooting

### "Command not found" error

Make sure the command is registered in `src-tauri/src/main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    file_system::open_directory,
    // ... other commands
])
```

### Type mismatch errors

Check that the TypeScript types match the Rust types:

```rust
// Rust
#[tauri::command]
pub async fn my_command(param: String) -> Result<Vec<u8>, String>
```

```typescript
// TypeScript
async function myCommand(param: string): Promise<number[]>
```

### "Tauri not available" error

Check if running in Tauri environment:

```typescript
if (!isTauri()) {
  throw new Error('This feature requires Tauri')
}
```

## Next Steps

1. ✅ Adapter created with full type safety
2. ⏳ Update frontend components to use `tauriApi`
3. ⏳ Test all API calls in Tauri environment
4. ⏳ Remove Electron dependencies
5. ⏳ Update build configuration

## Related Files

- `frontend/src/api/tauri-adapter.ts` - Main adapter implementation
- `frontend/src/tauri.d.ts` - Type definitions
- `src-tauri/src/commands/` - Rust command handlers
- `src-tauri/src/api/` - Rust API implementations
