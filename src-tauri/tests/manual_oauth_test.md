# Manual OAuth Testing Guide

## Purpose
This guide provides step-by-step instructions for manually testing the complete Baidu OAuth flow in the Tauri application.

## Prerequisites
1. Tauri development environment running (`npm run tauri dev`)
2. Valid Baidu Netdisk account
3. Network connectivity

## Test Procedure

### Step 1: Start the Application
```bash
npm run tauri dev
```

Wait for the application to start and the main window to appear.

### Step 2: Open Browser Console
Open the browser developer tools in the Tauri window:
- Windows/Linux: Press `F12` or `Ctrl+Shift+I`
- macOS: Press `Cmd+Option+I`

### Step 3: Test OAuth Window Creation

Run the following in the browser console:

```javascript
// Test 1: Open OAuth window
const clientId = 'hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf';
const redirectUri = 'https://alistgo.com/tool/baidu/callback';
const scope = 'basic,netdisk';

const authUrl = `https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

console.log('Opening OAuth window with URL:', authUrl);

window.__TAURI__.invoke('open_auth_window', { authUrl })
  .then(result => {
    console.log('OAuth result:', result);
    if (result.success) {
      console.log('✓ Authorization code received:', result.code);
    } else {
      console.error('✗ OAuth failed:', result.error);
    }
  })
  .catch(error => {
    console.error('✗ OAuth error:', error);
  });
```

**Expected Behavior**:
- A new window opens with Baidu login page
- Window size is 800x600
- Window title is "授权"

### Step 4: Complete Authorization

In the OAuth window:
1. Log in with your Baidu account credentials
2. Click "授权" (Authorize) button
3. Wait for redirect to callback URL

**Expected Behavior**:
- After authorization, window automatically closes
- Console shows authorization code
- No errors in console

### Step 5: Test Token Exchange

After receiving the authorization code, test token exchange:

```javascript
// Test 2: Exchange code for token
const code = 'YOUR_AUTHORIZATION_CODE_HERE'; // Replace with actual code from Step 4
const clientId = 'hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf';
const clientSecret = 'YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE';
const redirectUri = 'https://alistgo.com/tool/baidu/callback';

window.__TAURI__.invoke('baidu_get_token', {
  code,
  clientId,
  clientSecret,
  redirectUri
})
  .then(tokenResponse => {
    console.log('✓ Token received:', tokenResponse);
    console.log('  Access Token:', tokenResponse.access_token);
    console.log('  Refresh Token:', tokenResponse.refresh_token);
    console.log('  Expires In:', tokenResponse.expires_in, 'seconds');
    console.log('  Scope:', tokenResponse.scope);
    
    // Store for next tests
    window.testAccessToken = tokenResponse.access_token;
    window.testRefreshToken = tokenResponse.refresh_token;
  })
  .catch(error => {
    console.error('✗ Token exchange failed:', error);
  });
```

**Expected Behavior**:
- Token response contains `access_token`, `refresh_token`, `expires_in`, `scope`
- No errors in console

### Step 6: Test Token Storage

```javascript
// Test 3: Save token
const tokenData = {
  access_token: window.testAccessToken,
  refresh_token: window.testRefreshToken,
  expires_in: 2592000,
  scope: 'basic,netdisk',
  client_id: 'hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf',
  client_secret: 'YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE',
  redirect_uri: 'https://alistgo.com/tool/baidu/callback'
};

window.__TAURI__.invoke('save_token', { tokenData })
  .then(() => {
    console.log('✓ Token saved successfully');
    
    // Test 4: Retrieve token
    return window.__TAURI__.invoke('get_token');
  })
  .then(retrievedToken => {
    console.log('✓ Token retrieved:', retrievedToken);
    console.log('  Stored at:', new Date(retrievedToken.stored_at * 1000));
  })
  .catch(error => {
    console.error('✗ Token storage failed:', error);
  });
```

**Expected Behavior**:
- Token is saved without errors
- Retrieved token matches saved token
- `stored_at` timestamp is present

### Step 7: Test Token Verification

```javascript
// Test 5: Verify token
window.__TAURI__.invoke('baidu_verify_token', {
  accessToken: window.testAccessToken
})
  .then(userInfo => {
    console.log('✓ Token verified successfully');
    console.log('  User Info:', userInfo);
  })
  .catch(error => {
    console.error('✗ Token verification failed:', error);
  });
```

**Expected Behavior**:
- User information is returned
- No error codes in response

### Step 8: Test API Call (List Files)

```javascript
// Test 6: List files
window.__TAURI__.invoke('baidu_list_files', {
  accessToken: window.testAccessToken,
  dir: '/apps/Neat Reader',
  pageNum: 1,
  pageSize: 100,
  order: 'name',
  recursion: 0
})
  .then(fileList => {
    console.log('✓ Files listed successfully');
    console.log('  File count:', fileList.list?.length || 0);
    console.log('  Files:', fileList.list);
  })
  .catch(error => {
    console.error('✗ List files failed:', error);
  });
```

**Expected Behavior**:
- File list is returned
- Files array contains file metadata
- No errors

### Step 9: Test Token Refresh

```javascript
// Test 7: Refresh token
window.__TAURI__.invoke('baidu_refresh_token', {
  refreshToken: window.testRefreshToken,
  clientId: 'hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf',
  clientSecret: 'YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE'
})
  .then(newTokenResponse => {
    console.log('✓ Token refreshed successfully');
    console.log('  New Access Token:', newTokenResponse.access_token);
    console.log('  New Refresh Token:', newTokenResponse.refresh_token);
    
    window.testAccessToken = newTokenResponse.access_token;
    window.testRefreshToken = newTokenResponse.refresh_token;
  })
  .catch(error => {
    console.error('✗ Token refresh failed:', error);
  });
```

**Expected Behavior**:
- New access token is received
- New refresh token is received
- Old tokens are replaced

### Step 10: Test Token Expiration Check

```javascript
// Test 8: Check token expiration
window.__TAURI__.invoke('is_token_expired')
  .then(isExpired => {
    console.log('✓ Token expiration check:', isExpired ? 'EXPIRED' : 'VALID');
  })
  .catch(error => {
    console.error('✗ Expiration check failed:', error);
  });
```

**Expected Behavior**:
- Returns boolean indicating expiration status
- Fresh tokens should not be expired

## Test Results Checklist

Mark each test as passed or failed:

- [ ] OAuth window opens correctly
- [ ] Authorization completes successfully
- [ ] Authorization code is captured
- [ ] Token exchange succeeds
- [ ] Tokens are stored correctly
- [ ] Tokens can be retrieved
- [ ] Token verification succeeds
- [ ] API calls work with token
- [ ] Token refresh succeeds
- [ ] Expiration detection works

## Troubleshooting

### OAuth Window Doesn't Open
- Check console for errors
- Verify Tauri window permissions
- Check network connectivity

### Authorization Code Not Captured
- Check JavaScript injection in OAuth window
- Verify callback URL matches configuration
- Check browser console in OAuth window

### Token Exchange Fails
- Verify client credentials are correct
- Check authorization code is valid (not expired)
- Verify redirect URI matches exactly

### API Calls Fail
- Verify access token is valid
- Check token hasn't expired
- Verify network connectivity
- Check Baidu API status

## Success Criteria

All tests must pass for OAuth compatibility to be verified:
1. ✓ OAuth flow completes end-to-end
2. ✓ Tokens are stored and retrieved
3. ✓ Token refresh works
4. ✓ API calls succeed
5. ✓ Error handling is robust
6. ✓ No memory leaks or crashes
