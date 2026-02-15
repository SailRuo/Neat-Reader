# Qwen API Migration Guide: Express → Rust

## Quick Reference

This guide helps frontend developers migrate from the Express backend to the Rust Tauri backend for Qwen AI API calls.

## API Endpoint Comparison

### 1. Chat Completion

#### Express Backend (HTTP)
```typescript
// POST http://localhost:3001/api/qwen/chat
const response = await axios.post('/api/qwen/chat', {
  accessToken: 'your-token',
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'qwen3-coder-flash',
  resourceUrl: 'portal.qwen.ai'
});
```

#### Tauri Backend (IPC)
```typescript
// Tauri invoke
import { invoke } from '@tauri-apps/api/tauri';

const response = await invoke<QwenChatResponse>('qwen_chat', {
  accessToken: 'your-token',
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'qwen3-coder-flash',
  resourceUrl: 'portal.qwen.ai'
});
```

### 2. List Models

#### Express Backend (HTTP)
```typescript
// GET http://localhost:3001/api/qwen/models
const response = await axios.get('/api/qwen/models', {
  params: {
    accessToken: 'your-token',
    resourceUrl: 'portal.qwen.ai'
  }
});
```

#### Tauri Backend (IPC)
```typescript
// Tauri invoke
const response = await invoke<QwenModelsResponse>('qwen_list_models', {
  accessToken: 'your-token',
  resourceUrl: 'portal.qwen.ai'
});
```

## Type Definitions

### TypeScript Types (Frontend)

```typescript
// Message type (supports multimodal content)
interface QwenMessage {
  role: string;
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}

// Chat response
interface QwenChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: QwenMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Models response
interface QwenModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}
```

## Migration Checklist

### Step 1: Update API Adapter

**Before (Express):**
```typescript
// src/api/qwen.ts
import axios from 'axios';

export const qwenApi = {
  async chat(accessToken: string, messages: QwenMessage[], model?: string) {
    const response = await axios.post('/api/qwen/chat', {
      accessToken,
      messages,
      model
    });
    return response.data;
  },
  
  async listModels(accessToken: string) {
    const response = await axios.get('/api/qwen/models', {
      params: { accessToken }
    });
    return response.data;
  }
};
```

**After (Tauri):**
```typescript
// src/api/qwen.ts
import { invoke } from '@tauri-apps/api/tauri';

export const qwenApi = {
  async chat(
    accessToken: string,
    messages: QwenMessage[],
    model?: string,
    resourceUrl?: string
  ): Promise<QwenChatResponse> {
    return await invoke('qwen_chat', {
      accessToken,
      messages,
      model,
      resourceUrl
    });
  },
  
  async listModels(
    accessToken: string,
    resourceUrl?: string
  ): Promise<QwenModelsResponse> {
    return await invoke('qwen_list_models', {
      accessToken,
      resourceUrl
    });
  }
};
```

### Step 2: Update Component Usage

**No changes needed!** If you're using the API adapter pattern, component code remains the same:

```typescript
// Component code (unchanged)
import { qwenApi } from '@/api/qwen';

const response = await qwenApi.chat(
  accessToken,
  [{ role: 'user', content: 'Hello' }],
  'qwen3-coder-flash'
);
```

### Step 3: Update Error Handling

**Express errors:**
```typescript
try {
  const response = await qwenApi.chat(...);
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('API error:', error.response?.data);
  }
}
```

**Tauri errors:**
```typescript
try {
  const response = await qwenApi.chat(...);
} catch (error) {
  // Error is a string from Rust
  console.error('API error:', error);
}
```

## Key Differences

| Feature | Express Backend | Tauri Backend |
|---------|----------------|---------------|
| **Communication** | HTTP (axios) | IPC (invoke) |
| **Port** | localhost:3001 | N/A (IPC) |
| **Error Format** | Axios error object | String |
| **OAuth Flow** | Implemented | Not implemented (frontend handles) |
| **Streaming** | Supported | Not yet implemented |
| **Token Refresh** | Implemented | Not implemented (frontend handles) |

## OAuth Token Management

**Important:** The Rust backend does NOT implement OAuth flow. You must obtain tokens using:

1. **Frontend OAuth Flow** (recommended for Tauri)
2. **Existing Express Backend** (during migration)

**Token Storage:**
```typescript
// Use Tauri's secure storage
import { Store } from 'tauri-plugin-store-api';

const store = new Store('.settings.dat');

// Save token
await store.set('qwen_access_token', accessToken);
await store.set('qwen_refresh_token', refreshToken);
await store.set('qwen_resource_url', resourceUrl);

// Load token
const accessToken = await store.get('qwen_access_token');
const resourceUrl = await store.get('qwen_resource_url');
```

## Testing Migration

### 1. Test Chat Endpoint

```typescript
// Test in browser console or component
const testChat = async () => {
  try {
    const response = await invoke('qwen_chat', {
      accessToken: 'your-test-token',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      model: 'qwen3-coder-flash'
    });
    console.log('Chat response:', response);
  } catch (error) {
    console.error('Chat error:', error);
  }
};
```

### 2. Test Models Endpoint

```typescript
const testModels = async () => {
  try {
    const response = await invoke('qwen_list_models', {
      accessToken: 'your-test-token'
    });
    console.log('Models:', response);
  } catch (error) {
    console.error('Models error:', error);
  }
};
```

## Common Issues

### Issue 1: "Command not found"

**Cause:** Tauri commands not registered in `main.rs`

**Solution:** Verify commands are in `invoke_handler`:
```rust
.invoke_handler(tauri::generate_handler![
    qwen::qwen_chat,
    qwen::qwen_list_models,
])
```

### Issue 2: "Invalid access token"

**Cause:** Token expired or invalid

**Solution:** Implement token refresh logic in frontend:
```typescript
async function refreshTokenIfNeeded() {
  const expiresAt = await store.get('qwen_token_expires_at');
  if (Date.now() >= expiresAt) {
    // Refresh token using OAuth flow
    await refreshQwenToken();
  }
}
```

### Issue 3: "Resource URL not found"

**Cause:** Missing `resource_url` from token response

**Solution:** Use default endpoint (portal.qwen.ai):
```typescript
const response = await qwenApi.chat(
  accessToken,
  messages,
  model,
  undefined // Let Rust use default
);
```

## Performance Considerations

### Express Backend
- HTTP overhead: ~5-10ms per request
- JSON parsing: ~1-2ms
- Network latency: localhost

### Tauri Backend
- IPC overhead: ~1-2ms per request
- Serialization: ~0.5-1ms
- No network latency

**Expected improvement:** 3-5x faster for local API calls

## Rollback Plan

If issues arise, you can temporarily use both backends:

```typescript
// Hybrid approach
const USE_TAURI = false; // Feature flag

export const qwenApi = {
  async chat(...args) {
    if (USE_TAURI) {
      return await invoke('qwen_chat', ...);
    } else {
      return await axios.post('/api/qwen/chat', ...);
    }
  }
};
```

## Next Steps

1. ✅ Update API adapter to use Tauri invoke
2. ⏳ Test all Qwen AI features in app
3. ⏳ Implement token refresh in frontend
4. ⏳ Remove Express backend dependency
5. ⏳ Update documentation

## Support

For issues or questions:
- Check `QWEN-API-IMPLEMENTATION.md` for technical details
- Review Express backend: `backend/src/services/qwenService.js`
- Test with Tauri dev tools console
