# Token Storage Quick Start Guide

## Installation

The token storage is already configured. Just build the project:

```bash
cd src-tauri
cargo build
```

## Basic Usage

### 1. Save Baidu Token After OAuth

```typescript
import { tauriApi } from '@/api/tauri-adapter'

// After successful OAuth
const handleOAuthSuccess = async (authCode: string) => {
  // Get token from Baidu
  const tokenResponse = await tauriApi.getTokenViaCode(
    authCode,
    'your_client_id',
    'your_client_secret',
    'https://alistgo.com/tool/baidu/callback'
  )
  
  // Save to secure storage
  await tauriApi.saveBaiduToken({
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    expires_in: tokenResponse.expires_in,
    scope: tokenResponse.scope,
    client_id: 'your_client_id',
    client_secret: 'your_client_secret',
    redirect_uri: 'https://alistgo.com/tool/baidu/callback'
  })
  
  console.log('Token saved securely!')
}
```

### 2. Get Token for API Calls

```typescript
// Retrieve token when making API calls
const makeApiCall = async () => {
  const result = await tauriApi.getBaiduToken()
  
  if (result.success && result.token) {
    const accessToken = result.token.access_token
    
    // Use token for API call
    const files = await tauriApi.getFileList(accessToken, '/')
    return files
  } else {
    // No token found, redirect to login
    router.push('/settings')
  }
}
```

### 3. Check Token Expiration

```typescript
// Check if token needs refresh
const ensureValidToken = async () => {
  const expiryCheck = await tauriApi.isBaiduTokenExpired()
  
  if (expiryCheck.expired) {
    // Get stored token for refresh
    const tokenResult = await tauriApi.getBaiduToken()
    if (!tokenResult.success) {
      throw new Error('No token to refresh')
    }
    
    const token = tokenResult.token!
    
    // Refresh token
    const newToken = await tauriApi.refreshToken(
      token.refresh_token,
      token.client_id!,
      token.client_secret!
    )
    
    // Save new token
    await tauriApi.saveBaiduToken({
      access_token: newToken.access_token,
      refresh_token: newToken.refresh_token,
      expires_in: newToken.expires_in,
      scope: newToken.scope,
      client_id: token.client_id,
      client_secret: token.client_secret,
      redirect_uri: token.redirect_uri
    })
    
    return newToken.access_token
  } else {
    // Token still valid
    const tokenResult = await tauriApi.getBaiduToken()
    return tokenResult.token!.access_token
  }
}
```

### 4. Save User Settings

```typescript
// Save user preferences
const saveSettings = async () => {
  await tauriApi.saveUserSettings({
    theme: 'dark',
    font_size: 16,
    line_height: 1.5,
    language: 'zh-CN',
    extra: {
      autoSync: true,
      notifications: false
    }
  })
}

// Load settings on app start
const loadSettings = async () => {
  const result = await tauriApi.getUserSettings()
  if (result.success && result.settings) {
    applySettings(result.settings)
  }
}
```

### 5. Logout (Clear Tokens)

```typescript
const logout = async () => {
  // Delete tokens
  await tauriApi.deleteBaiduToken()
  await tauriApi.deleteQwenToken()
  
  // Optionally keep user settings
  // await tauriApi.deleteUserSettings()
  
  // Redirect to login
  router.push('/settings')
}
```

## Storage Location

Tokens are stored in encrypted `tokens.dat` file:

- **Windows:** `%APPDATA%\com.neatreader.app\tokens.dat`
- **macOS:** `~/Library/Application Support/com.neatreader.app/tokens.dat`
- **Linux:** `~/.config/com.neatreader.app/tokens.dat`

## Security Features

✅ Encrypted at rest
✅ Platform-specific secure storage
✅ Automatic timestamp tracking
✅ 5-minute expiration buffer
✅ Thread-safe operations

## API Reference

### Baidu Token
- `saveBaiduToken(token)` - Save token
- `getBaiduToken()` - Retrieve token
- `deleteBaiduToken()` - Delete token
- `isBaiduTokenExpired()` - Check expiration

### Qwen Token
- `saveQwenToken(token)` - Save token
- `getQwenToken()` - Retrieve token
- `deleteQwenToken()` - Delete token
- `isQwenTokenExpired()` - Check expiration

### User Settings
- `saveUserSettings(settings)` - Save settings
- `getUserSettings()` - Retrieve settings
- `deleteUserSettings()` - Delete settings

### Clear All
- `clearAllStorage()` - Clear all data (⚠️ destructive)

## Complete Example: Settings Component

```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { tauriApi } from '@/api/tauri-adapter'

const isConnected = ref(false)
const userInfo = ref<any>(null)

// Check if user is already connected
onMounted(async () => {
  const tokenResult = await tauriApi.getBaiduToken()
  if (tokenResult.success && tokenResult.token) {
    // Verify token is still valid
    const expiryCheck = await tauriApi.isBaiduTokenExpired()
    if (!expiryCheck.expired) {
      isConnected.value = true
      // Load user info
      const info = await tauriApi.verifyToken(tokenResult.token.access_token)
      userInfo.value = info
    }
  }
})

// Handle OAuth authorization
const handleAuthorize = async () => {
  const authUrl = 'https://openapi.baidu.com/oauth/2.0/authorize?...'
  
  // Open OAuth window
  const result = await tauriApi.openAuthWindow(authUrl)
  
  if (result.success && result.code) {
    // Exchange code for token
    const token = await tauriApi.getTokenViaCode(
      result.code,
      'client_id',
      'client_secret',
      'redirect_uri'
    )
    
    // Save token
    await tauriApi.saveBaiduToken({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_in: token.expires_in,
      scope: token.scope,
      client_id: 'client_id',
      client_secret: 'client_secret',
      redirect_uri: 'redirect_uri'
    })
    
    isConnected.value = true
    
    // Load user info
    const info = await tauriApi.verifyToken(token.access_token)
    userInfo.value = info
  }
}

// Disconnect
const handleDisconnect = async () => {
  await tauriApi.deleteBaiduToken()
  isConnected.value = false
  userInfo.value = null
}
</script>

<template>
  <div class="settings-panel">
    <div v-if="!isConnected">
      <button @click="handleAuthorize">连接百度网盘</button>
    </div>
    <div v-else>
      <p>已连接: {{ userInfo?.baidu_name }}</p>
      <button @click="handleDisconnect">断开连接</button>
    </div>
  </div>
</template>
```

## Troubleshooting

### Token not saving
- Check console for error messages
- Verify app has write permissions
- Check disk space

### Token expired immediately
- Verify `expires_in` value is correct (should be in seconds)
- Check system time is correct

### Cannot retrieve token
- Verify token was saved successfully
- Check storage file exists
- Try clearing and re-saving

## Next Steps

1. ✅ Token storage is implemented
2. Update Settings component to use token storage
3. Update API calls to check token expiration
4. Implement automatic token refresh
5. Test OAuth flow end-to-end

For detailed documentation, see `TOKEN-STORAGE-IMPLEMENTATION.md`
