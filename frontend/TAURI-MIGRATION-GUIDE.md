# Frontend Migration Guide: Electron to Tauri

This guide provides step-by-step instructions for migrating frontend code from Electron to Tauri using the new adapter.

## Overview

The Tauri adapter (`frontend/src/api/tauri-adapter.ts`) provides a drop-in replacement for the Electron API with minimal code changes required.

## Migration Strategy

### Phase 1: Add Tauri Adapter (✅ Complete)

- ✅ Created `frontend/src/api/tauri-adapter.ts`
- ✅ Created `frontend/src/tauri.d.ts` for type definitions
- ✅ Created documentation

### Phase 2: Update API Imports

Replace Electron API imports with Tauri adapter imports.

### Phase 3: Test and Validate

Test all functionality in Tauri environment.

## Step-by-Step Migration

### 1. Install Tauri Dependencies

```bash
cd frontend
npm install @tauri-apps/api
```

### 2. Update API Adapter (adapter.ts)

**Current Code** (`frontend/src/api/adapter.ts`):
```typescript
import { baiduApi } from './baidu'
import { isElectron } from '@/electron'

export const api = {
  async getTokenViaCode(...) {
    return baiduApi.getToken(...)
  },
  
  async openDirectory() {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.openDirectory()
  }
}
```

**New Code** (create `frontend/src/api/unified-adapter.ts`):
```typescript
import { isTauri, tauriApi } from './tauri-adapter'
import { isElectron, electronApi } from '@/electron'
import { baiduApi } from './baidu'

// Detect environment
const isNativeApp = isTauri() || isElectron()

// Use Tauri if available, fallback to Electron, then HTTP
export const api = {
  // Baidu API - use HTTP backend for both Electron and Tauri
  async getTokenViaCode(code: string, clientId: string, clientSecret: string, redirectUri: string) {
    if (isTauri()) {
      return tauriApi.getTokenViaCode(code, clientId, clientSecret, redirectUri)
    }
    return baiduApi.getToken(code, clientId, clientSecret, redirectUri)
  },
  
  async refreshToken(refreshToken: string, clientId: string, clientSecret: string) {
    if (isTauri()) {
      return tauriApi.refreshToken(refreshToken, clientId, clientSecret)
    }
    return baiduApi.refreshToken(refreshToken, clientId, clientSecret)
  },
  
  async verifyToken(accessToken: string) {
    if (isTauri()) {
      return tauriApi.verifyToken(accessToken)
    }
    return baiduApi.verifyToken(accessToken)
  },
  
  async getFileList(accessToken: string, dir: string = '/', pageNum: number = 1, pageSize: number = 100, order: string = 'name', method: string = 'list', recursion: number = 0) {
    if (isTauri()) {
      return tauriApi.getFileList(accessToken, dir, pageNum, pageSize, order, method, recursion)
    }
    return baiduApi.getFileList(accessToken, dir, pageNum, pageSize, order, method, recursion)
  },
  
  async searchFiles(accessToken: string, key: string, dir: string, method: string = 'search', recursion: number = 1) {
    if (isTauri()) {
      return tauriApi.searchFiles(accessToken, key, dir, method, recursion)
    }
    return baiduApi.searchFiles(accessToken, key, dir, method, recursion)
  },
  
  async getFileInfo(accessToken: string, fsids: string) {
    if (isTauri()) {
      return tauriApi.getFileInfo(accessToken, fsids)
    }
    return baiduApi.getFileInfo(accessToken, fsids)
  },
  
  async downloadFile(dlink: string, accessToken: string) {
    if (isTauri()) {
      return tauriApi.downloadFile(dlink, accessToken)
    }
    return baiduApi.downloadFile(dlink, accessToken)
  },
  
  async uploadFile(fileName: string, fileData: number[], accessToken: string) {
    if (isTauri()) {
      return tauriApi.uploadFile(fileName, fileData, accessToken)
    }
    return baiduApi.uploadFile(fileName, fileData, accessToken)
  },
  
  // File System API - native only
  async openDirectory(): Promise<string | null> {
    if (isTauri()) {
      return tauriApi.openDirectory()
    }
    if (isElectron()) {
      return electronApi.openDirectory()
    }
    throw new Error('File system API not available in browser')
  },
  
  async readFile(filePath: string): Promise<number[]> {
    if (isTauri()) {
      return tauriApi.readFile(filePath)
    }
    if (isElectron()) {
      return electronApi.readFile(filePath)
    }
    throw new Error('File system API not available in browser')
  },
  
  async selectFile(): Promise<string | null> {
    if (isTauri()) {
      return tauriApi.selectFile()
    }
    if (isElectron()) {
      return electronApi.openFile([
        { name: '电子书', extensions: ['epub', 'pdf', 'txt'] }
      ])
    }
    throw new Error('File system API not available in browser')
  }
}
```

### 3. Update Component Imports

**No changes needed!** Components already use the unified `api` object:

```typescript
// This code works with both Electron and Tauri
import { api } from '@/api/adapter'

const path = await api.openDirectory()
const token = await api.getTokenViaCode(code, clientId, clientSecret, redirectUri)
```

### 4. Update Qwen API Integration

**Current Code** (`frontend/src/api/qwen.ts`):
```typescript
export async function chatStream(accessToken: string, message: string, ...) {
  const response = await fetch(`${API_BASE}/chat-stream`, {
    method: 'POST',
    // ...
  })
}
```

**Add Tauri Support**:
```typescript
import { isTauri, tauriApi } from './tauri-adapter'

export async function listModels(accessToken: string, resourceUrl?: string) {
  if (isTauri()) {
    return tauriApi.qwenListModels(accessToken, resourceUrl)
  }
  
  // Fallback to HTTP API
  const response = await axios.post(`${API_BASE}/models`, {
    access_token: accessToken,
    resource_url: resourceUrl
  })
  return response.data
}

// Note: chatStream needs special handling for streaming
// Tauri doesn't support streaming yet, so keep HTTP for now
export async function chatStream(...) {
  // Always use HTTP for streaming
  const response = await fetch(`${API_BASE}/chat-stream`, {
    method: 'POST',
    // ...
  })
}
```

### 5. Update TTS API Integration

**Current Code** (`frontend/src/api/tts.ts`):
```typescript
export async function synthesize(text: string, options: TTSOptions = {}): Promise<Blob> {
  const response = await axios.post(`${API_BASE}/synthesize`, {
    text,
    voice: options.voice || 'zh-CN-XiaoxiaoNeural',
    // ...
  }, {
    responseType: 'blob'
  })
  return response.data
}
```

**Add Tauri Support**:
```typescript
import { isTauri, tauriApi } from './tauri-adapter'

export async function synthesize(text: string, options: TTSOptions = {}): Promise<Blob> {
  if (isTauri()) {
    const audioData = await tauriApi.ttsSynthesize({
      text,
      voice: options.voice || 'zh-CN-XiaoxiaoNeural',
      rate: options.rate || 0,
      pitch: options.pitch || 0,
      volume: options.volume || 0
    })
    
    // Convert number[] to Blob
    return new Blob([new Uint8Array(audioData)], { type: 'audio/mpeg' })
  }
  
  // Fallback to HTTP API
  const response = await axios.post(`${API_BASE}/synthesize`, {
    text,
    voice: options.voice || 'zh-CN-XiaoxiaoNeural',
    rate: options.rate || 0,
    pitch: options.pitch || 0,
    volume: options.volume || 0
  }, {
    responseType: 'blob'
  })
  return response.data
}

export async function getVoices(): Promise<VoicesResponse> {
  if (isTauri()) {
    return tauriApi.ttsListVoices()
  }
  
  // Fallback to HTTP API
  const response = await axios.get(`${API_BASE}/voices`)
  return response.data.data
}
```

### 6. Update Vite Configuration

**Add Tauri Plugin** (`frontend/vite.config.ts`):
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  // Tauri expects a relative base path
  base: './',
  
  // Tauri development server
  server: {
    port: 5173,
    strictPort: true
  },
  
  // Optimize for Tauri
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false
  }
})
```

### 7. Update Environment Detection

**Create Unified Environment Check** (`frontend/src/utils/env.ts`):
```typescript
import { isTauri } from '@/api/tauri-adapter'
import { isElectron } from '@/electron'

export const ENV = {
  isTauri: isTauri(),
  isElectron: isElectron(),
  isBrowser: !isTauri() && !isElectron(),
  isNativeApp: isTauri() || isElectron()
}

export function getPlatform(): 'tauri' | 'electron' | 'browser' {
  if (isTauri()) return 'tauri'
  if (isElectron()) return 'electron'
  return 'browser'
}
```

**Use in Components**:
```typescript
import { ENV, getPlatform } from '@/utils/env'

if (ENV.isNativeApp) {
  // Native features available
  const path = await api.openDirectory()
}

console.log(`Running on: ${getPlatform()}`)
```

## Testing Checklist

### File System Operations
- [ ] Open directory picker
- [ ] Open file picker with filters
- [ ] Read EPUB file
- [ ] Read PDF file
- [ ] Write file (progress, settings)

### Baidu Netdisk Integration
- [ ] Get authorization token
- [ ] Refresh token
- [ ] Verify token
- [ ] List files in directory
- [ ] Search files
- [ ] Get file info
- [ ] Download file
- [ ] Upload file

### Qwen AI Integration
- [ ] List available models
- [ ] Send chat message
- [ ] Receive response
- [ ] Handle errors

### TTS Integration
- [ ] List available voices
- [ ] Synthesize speech
- [ ] Play audio
- [ ] Adjust rate/pitch/volume

### UI/UX
- [ ] All pages load correctly
- [ ] EPUB rendering works
- [ ] PDF rendering works
- [ ] Reading progress saves
- [ ] Settings persist
- [ ] Theme switching works

## Common Issues and Solutions

### Issue: "Command not found"

**Solution**: Make sure the command is registered in `src-tauri/src/main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    file_system::open_directory,
    // Add your command here
])
```

### Issue: Type mismatch errors

**Solution**: Check that TypeScript types match Rust types:

```rust
// Rust: Vec<u8>
// TypeScript: number[]

// Rust: Option<String>
// TypeScript: string | undefined

// Rust: Result<T, String>
// TypeScript: Promise<T> (throws on error)
```

### Issue: File paths not working

**Solution**: Use absolute paths or convert relative paths:

```typescript
import { resolveResource } from '@tauri-apps/api/path'

const resourcePath = await resolveResource('data/books/book.epub')
const data = await api.readFile(resourcePath)
```

### Issue: CORS errors in development

**Solution**: Tauri doesn't have CORS issues since it's not a browser. If you see CORS errors, you're likely running in browser mode.

## Performance Optimization

### 1. Lazy Load Tauri API

```typescript
// Only import when needed
async function openFileDialog() {
  if (isTauri()) {
    const { tauriApi } = await import('@/api/tauri-adapter')
    return tauriApi.openFile()
  }
}
```

### 2. Cache API Responses

```typescript
let cachedVoices: TtsVoicesResponse | null = null

export async function getVoices(): Promise<TtsVoicesResponse> {
  if (cachedVoices) return cachedVoices
  
  if (isTauri()) {
    cachedVoices = await tauriApi.ttsListVoices()
    return cachedVoices
  }
  
  // HTTP fallback
}
```

### 3. Batch Operations

```typescript
// Instead of multiple calls
const file1 = await api.readFile(path1)
const file2 = await api.readFile(path2)

// Use Promise.all
const [file1, file2] = await Promise.all([
  api.readFile(path1),
  api.readFile(path2)
])
```

## Rollback Plan

If issues arise, you can easily rollback:

1. Keep Electron code intact
2. Use environment detection to switch between implementations
3. Gradually migrate features one at a time

```typescript
// Feature flag approach
const USE_TAURI = import.meta.env.VITE_USE_TAURI === 'true'

export const api = USE_TAURI ? tauriApi : electronApi
```

## Next Steps

1. ✅ Create Tauri adapter
2. ⏳ Update unified adapter with environment detection
3. ⏳ Update Qwen API with Tauri support
4. ⏳ Update TTS API with Tauri support
5. ⏳ Test all features in Tauri environment
6. ⏳ Update build scripts
7. ⏳ Create Tauri build configuration
8. ⏳ Package and distribute

## Resources

- [Tauri API Documentation](https://tauri.app/v1/api/js/)
- [Tauri Adapter README](./src/api/TAURI-ADAPTER-README.md)
- [Migration Spec](./.kiro/specs/electron-to-tauri-migration/)
