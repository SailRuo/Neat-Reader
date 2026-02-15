# Baidu OAuth Verification Test Plan

## Test Overview
This document outlines the comprehensive testing plan for verifying Baidu Netdisk OAuth compatibility in the Tauri migration.

## Test Environment Setup

### Prerequisites
1. Valid Baidu Netdisk account
2. OAuth credentials (Client ID, Client Secret, Redirect URI)
3. Tauri development environment running
4. Network connectivity

### Default OAuth Configuration
- Client ID: `hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf`
- Client Secret: `YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE`
- Redirect URI: `https://alistgo.com/tool/baidu/callback`

## Test Cases

### Test 1: OAuth Authorization Window Creation
**Objective**: Verify that the OAuth window opens correctly and displays the Baidu authorization page.

**Steps**:
1. Call `open_auth_window` command with authorization URL
2. Verify window opens with correct dimensions (800x600)
3. Verify window title is "授权"
4. Verify Baidu authorization page loads

**Expected Result**: OAuth window opens successfully and displays Baidu login page.

### Test 2: OAuth Callback Handling
**Objective**: Verify that the callback URL is captured and authorization code is extracted.

**Steps**:
1. Complete OAuth authorization in the window
2. Verify JavaScript injection detects callback URL
3. Verify authorization code is extracted from URL parameters
4. Verify `oauth_callback_handler` is invoked with correct parameters
5. Verify OAuth window closes automatically

**Expected Result**: Authorization code is successfully captured and window closes.

### Test 3: Token Exchange
**Objective**: Verify that authorization code is exchanged for access token and refresh token.

**Steps**:
1. Call `baidu_get_token` with authorization code
2. Verify HTTP request to `https://openapi.baidu.com/oauth/2.0/token`
3. Verify response contains `access_token`, `refresh_token`, `expires_in`, `scope`
4. Verify token response is properly deserialized

**Expected Result**: Valid tokens are received from Baidu API.

### Test 4: Token Storage
**Objective**: Verify that tokens are securely stored using Tauri's storage system.

**Steps**:
1. Call `save_token` command with token data
2. Verify token is stored in `tokens.dat` file
3. Verify stored data includes timestamp
4. Call `get_token` command
5. Verify retrieved token matches stored token

**Expected Result**: Tokens are persisted and can be retrieved correctly.

### Test 5: Token Refresh
**Objective**: Verify that expired tokens can be refreshed using refresh token.

**Steps**:
1. Call `baidu_refresh_token` with refresh token
2. Verify HTTP request to token endpoint with `grant_type=refresh_token`
3. Verify new access token is received
4. Verify new token is stored
5. Verify old token is replaced

**Expected Result**: New access token is obtained and stored successfully.

### Test 6: Token Verification
**Objective**: Verify that access token can be validated with Baidu API.

**Steps**:
1. Call `baidu_verify_token` with access token
2. Verify HTTP request to `https://pan.baidu.com/rest/2.0/xpan/nas?method=uinfo`
3. Verify response contains user information
4. Verify no error codes in response

**Expected Result**: Token is valid and user info is returned.

### Test 7: API Call with Token
**Objective**: Verify that access token can be used to make successful API calls.

**Steps**:
1. Call `baidu_list_files` with access token and directory path
2. Verify HTTP request includes access token parameter
3. Verify response contains file list
4. Verify file metadata is correctly parsed

**Expected Result**: File list is retrieved successfully.

### Test 8: Token Expiration Detection
**Objective**: Verify that expired tokens are detected correctly.

**Steps**:
1. Store token with old timestamp
2. Call `is_token_expired` command
3. Verify expiration is detected based on `expires_in` and `stored_at`
4. Verify 5-minute buffer is applied

**Expected Result**: Expired tokens are correctly identified.

### Test 9: Error Handling - Invalid Code
**Objective**: Verify proper error handling for invalid authorization codes.

**Steps**:
1. Call `baidu_get_token` with invalid code
2. Verify error response from Baidu API
3. Verify error is properly propagated to frontend
4. Verify no token is stored

**Expected Result**: Error is handled gracefully with descriptive message.

### Test 10: Error Handling - Network Failure
**Objective**: Verify proper error handling for network failures.

**Steps**:
1. Disconnect network
2. Attempt OAuth flow
3. Verify timeout error is returned
4. Verify user-friendly error message

**Expected Result**: Network errors are handled gracefully.

## Manual Testing Checklist

- [ ] OAuth window opens correctly
- [ ] Baidu login page loads
- [ ] User can enter credentials
- [ ] Authorization succeeds
- [ ] Callback is captured
- [ ] Window closes automatically
- [ ] Token is stored
- [ ] Token can be retrieved
- [ ] Token refresh works
- [ ] API calls succeed with token
- [ ] Expired tokens are detected
- [ ] Errors are handled gracefully

## Success Criteria

All test cases must pass with the following conditions:
1. OAuth flow completes end-to-end without errors
2. Tokens are securely stored and retrieved
3. Token refresh mechanism works correctly
4. API calls succeed with valid tokens
5. Error handling is robust and user-friendly
6. No memory leaks or resource issues
7. Performance is acceptable (< 5 seconds for OAuth flow)

## Known Issues and Limitations

Document any issues found during testing here.
