/**
 * Tauri API Adapter
 * 
 * This adapter wraps all Tauri invoke calls to provide a consistent, type-safe API
 * that maintains the same interface as the Electron version for minimal frontend changes.
 * 
 * Requirements:
 * - 3.1: Map all existing Electron contextBridge API to equivalent Tauri invoke pattern
 * - 3.3: Implement type-safe IPC interfaces using TypeScript
 * - 3.4: Handle errors gracefully and return typed responses
 * - 3.5: Maintain same API surface for frontend components
 */

import { invoke } from '@tauri-apps/api/tauri'
import type { 
  BaiduTokenData, 
  QwenTokenData, 
  UserSettings, 
  TokenStorageResponse 
} from '@/types/token-storage'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Baidu Netdisk token response
 */
export interface BaiduTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
}

/**
 * Baidu Netdisk file info
 */
export interface BaiduFileInfo {
  fs_id: number
  path: string
  server_filename: string
  size: number
  isdir: number
  category: number
  md5?: string
  server_mtime: number
  local_mtime: number
}

/**
 * Baidu Netdisk file list response
 */
export interface BaiduFileListResponse {
  errno: number
  list: BaiduFileInfo[]
}

/**
 * Qwen AI chat message
 */
export interface QwenMessage {
  role: string
  content: string | any[] // Can be string or array for multimodal
}

/**
 * Qwen AI chat response
 */
export interface QwenChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: QwenChoice[]
  usage?: QwenUsage
}

export interface QwenChoice {
  index: number
  message: QwenMessage
  finish_reason: string
}

export interface QwenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

/**
 * Qwen models list response
 */
export interface QwenModelsResponse {
  object: string
  data: QwenModel[]
}

export interface QwenModel {
  id: string
  object: string
  created: number
  owned_by: string
}

/**
 * TTS voice info
 */
export interface TtsVoice {
  ShortName: string
  FriendlyName: string
  Locale: string
  Gender: string
  Description?: string
}

/**
 * TTS voices response
 */
export interface TtsVoicesResponse {
  all: TtsVoice[]
  chinese: TtsVoice[]
}

/**
 * TTS synthesis request
 */
export interface TtsSynthesisRequest {
  text: string
  voice?: string
  rate?: number    // -100 to 100, 0 = default
  pitch?: number   // -100 to 100, 0 = default
  volume?: number  // -100 to 100, 0 = default
}

/**
 * File filter for file picker
 */
export interface FileFilter {
  name: string
  extensions: string[]
}

/**
 * OAuth authorization result
 */
export interface OAuthResult {
  success: boolean
  code?: string
  error?: string
}

/**
 * External browser result
 */
export interface ExternalBrowserResult {
  success: boolean
}

// ============================================================================
// File System API
// ============================================================================

/**
 * Open directory picker dialog
 * @returns Selected directory path or null if cancelled
 */
export async function openDirectory(): Promise<string | null> {
  try {
    const result = await invoke<string | null>('open_directory')
    return result
  } catch (error) {
    console.error('Failed to open directory:', error)
    throw new Error(`Failed to open directory: ${error}`)
  }
}

/**
 * Read file from filesystem
 * @param path File path to read
 * @returns File content as byte array
 */
export async function readFile(path: string): Promise<number[]> {
  try {
    const result = await invoke<number[]>('read_file', { path })
    return result
  } catch (error) {
    console.error('Failed to read file:', error)
    throw new Error(`Failed to read file: ${error}`)
  }
}

/**
 * Write file to filesystem
 * @param path File path to write
 * @param data File content as byte array
 */
export async function writeFile(path: string, data: number[]): Promise<void> {
  try {
    await invoke('write_file', { path, data })
  } catch (error) {
    console.error('Failed to write file:', error)
    throw new Error(`Failed to write file: ${error}`)
  }
}

/**
 * Open file picker dialog
 * @param filters Optional file filters
 * @returns Selected file path or null if cancelled
 */
export async function openFile(filters?: FileFilter[]): Promise<string | null> {
  try {
    // Convert filters to Tauri format: Vec<(String, Vec<String>)>
    const tauriFilters = filters?.map(f => [f.name, f.extensions])
    const result = await invoke<string | null>('open_file', { 
      filters: tauriFilters 
    })
    return result
  } catch (error) {
    console.error('Failed to open file:', error)
    throw new Error(`Failed to open file: ${error}`)
  }
}

// ============================================================================
// Baidu Netdisk API
// ============================================================================

/**
 * Get Baidu access token using authorization code
 */
export async function baiduGetToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<BaiduTokenResponse> {
  try {
    const result = await invoke<BaiduTokenResponse>('baidu_get_token', {
      code,
      clientId,
      clientSecret,
      redirectUri
    })
    return result
  } catch (error) {
    console.error('Failed to get Baidu token:', error)
    throw new Error(`Failed to get Baidu token: ${error}`)
  }
}

/**
 * Refresh Baidu access token
 */
export async function baiduRefreshToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<BaiduTokenResponse> {
  try {
    const result = await invoke<BaiduTokenResponse>('baidu_refresh_token', {
      refreshToken,
      clientId,
      clientSecret
    })
    return result
  } catch (error) {
    console.error('Failed to refresh Baidu token:', error)
    throw new Error(`Failed to refresh Baidu token: ${error}`)
  }
}

/**
 * Verify Baidu access token
 */
export async function baiduVerifyToken(accessToken: string): Promise<any> {
  try {
    const result = await invoke<any>('baidu_verify_token', { accessToken })
    return result
  } catch (error) {
    console.error('Failed to verify Baidu token:', error)
    throw new Error(`Failed to verify Baidu token: ${error}`)
  }
}

/**
 * List files in Baidu Netdisk
 */
export async function baiduListFiles(
  accessToken: string,
  dir: string = '/',
  pageNum: number = 1,
  pageSize: number = 100,
  order: string = 'name',
  recursion: number = 0
): Promise<any> {
  try {
    const result = await invoke<any>('baidu_list_files', {
      accessToken,
      dir,
      pageNum,
      pageSize,
      order,
      recursion
    })
    return result
  } catch (error) {
    console.error('Failed to list Baidu files:', error)
    throw new Error(`Failed to list Baidu files: ${error}`)
  }
}

/**
 * Search files in Baidu Netdisk
 */
export async function baiduSearchFiles(
  accessToken: string,
  key: string,
  dir: string,
  recursion: number = 1
): Promise<any> {
  try {
    const result = await invoke<any>('baidu_search_files', {
      accessToken,
      key,
      dir,
      recursion
    })
    return result
  } catch (error) {
    console.error('Failed to search Baidu files:', error)
    throw new Error(`Failed to search Baidu files: ${error}`)
  }
}

/**
 * Upload file to Baidu Netdisk
 */
export async function baiduUploadFile(
  accessToken: string,
  fileName: string,
  fileData: number[]
): Promise<any> {
  try {
    const result = await invoke<any>('baidu_upload_file', {
      accessToken,
      fileName,
      fileData
    })
    return result
  } catch (error) {
    console.error('Failed to upload file to Baidu:', error)
    throw new Error(`Failed to upload file to Baidu: ${error}`)
  }
}

/**
 * Download file from Baidu Netdisk
 */
export async function baiduDownloadFile(
  dlink: string,
  accessToken: string
): Promise<number[]> {
  try {
    const result = await invoke<number[]>('baidu_download_file', {
      dlink,
      accessToken
    })
    return result
  } catch (error) {
    console.error('Failed to download file from Baidu:', error)
    throw new Error(`Failed to download file from Baidu: ${error}`)
  }
}

/**
 * Get file info from Baidu Netdisk
 */
export async function baiduGetFileinfo(
  accessToken: string,
  fsids: string
): Promise<any> {
  try {
    const result = await invoke<any>('baidu_get_fileinfo', {
      accessToken,
      fsids
    })
    return result
  } catch (error) {
    console.error('Failed to get Baidu file info:', error)
    throw new Error(`Failed to get Baidu file info: ${error}`)
  }
}

// ============================================================================
// Qwen AI API
// ============================================================================

/**
 * Chat with Qwen AI
 */
export async function qwenChat(
  accessToken: string,
  messages: QwenMessage[],
  model?: string,
  resourceUrl?: string
): Promise<QwenChatResponse> {
  try {
    const result = await invoke<QwenChatResponse>('qwen_chat', {
      accessToken,
      messages,
      model,
      resourceUrl
    })
    return result
  } catch (error) {
    console.error('Failed to chat with Qwen:', error)
    throw new Error(`Failed to chat with Qwen: ${error}`)
  }
}

/**
 * List available Qwen models
 */
export async function qwenListModels(
  accessToken: string,
  resourceUrl?: string
): Promise<QwenModelsResponse> {
  try {
    const result = await invoke<QwenModelsResponse>('qwen_list_models', {
      accessToken,
      resourceUrl
    })
    return result
  } catch (error) {
    console.error('Failed to list Qwen models:', error)
    throw new Error(`Failed to list Qwen models: ${error}`)
  }
}

// ============================================================================
// TTS API
// ============================================================================

/**
 * Synthesize text to speech
 */
export async function ttsSynthesize(request: TtsSynthesisRequest): Promise<number[]> {
  try {
    const result = await invoke<number[]>('tts_synthesize', { request })
    return result
  } catch (error) {
    console.error('Failed to synthesize speech:', error)
    throw new Error(`Failed to synthesize speech: ${error}`)
  }
}

/**
 * List available TTS voices
 */
export async function ttsListVoices(): Promise<TtsVoicesResponse> {
  try {
    const result = await invoke<TtsVoicesResponse>('tts_list_voices')
    return result
  } catch (error) {
    console.error('Failed to list TTS voices:', error)
    throw new Error(`Failed to list TTS voices: ${error}`)
  }
}

// ============================================================================
// OAuth API
// ============================================================================

/**
 * Open OAuth authorization window and capture authorization code
 * @param authUrl Full authorization URL
 * @returns OAuth result with code or error
 */
export async function openAuthWindow(authUrl: string): Promise<OAuthResult> {
  try {
    const result = await invoke<OAuthResult>('open_auth_window', { authUrl })
    return result
  } catch (error) {
    console.error('Failed to open auth window:', error)
    throw new Error(`Failed to open auth window: ${error}`)
  }
}

/**
 * Open URL in system default browser
 * @param url URL to open
 * @returns Success result
 */
export async function openExternal(url: string): Promise<ExternalBrowserResult> {
  try {
    const result = await invoke<ExternalBrowserResult>('open_external', { url })
    return result
  } catch (error) {
    console.error('Failed to open external URL:', error)
    throw new Error(`Failed to open external URL: ${error}`)
  }
}

// ============================================================================
// Unified API Adapter (maintains Electron interface)
// ============================================================================

/**
 * Check if running in Tauri environment
 */
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

/**
 * Unified API adapter that maintains the same interface as Electron version
 * This allows frontend components to work without modification
 */
export const tauriApi = {
  // File System API
  openDirectory,
  readFile,
  writeFile,
  openFile,
  
  // Baidu Netdisk API
  async getTokenViaCode(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<any> {
    return baiduGetToken(code, clientId, clientSecret, redirectUri)
  },
  
  async refreshToken(refreshToken: string, clientId: string, clientSecret: string): Promise<any> {
    return baiduRefreshToken(refreshToken, clientId, clientSecret)
  },
  
  async verifyToken(accessToken: string): Promise<any> {
    return baiduVerifyToken(accessToken)
  },
  
  async getFileList(
    accessToken: string,
    dir: string = '/',
    pageNum: number = 1,
    pageSize: number = 100,
    order: string = 'name',
    _method: string = 'list',
    recursion: number = 0
  ): Promise<any> {
    return baiduListFiles(accessToken, dir, pageNum, pageSize, order, recursion)
  },
  
  async searchFiles(
    accessToken: string,
    key: string,
    dir: string,
    _method: string = 'search',
    recursion: number = 1
  ): Promise<any> {
    return baiduSearchFiles(accessToken, key, dir, recursion)
  },
  
  async getFileInfo(accessToken: string, fsids: string): Promise<any> {
    return baiduGetFileinfo(accessToken, fsids)
  },
  
  async downloadFile(dlink: string, accessToken: string): Promise<any> {
    return baiduDownloadFile(dlink, accessToken)
  },
  
  async uploadFile(fileName: string, fileData: number[], accessToken: string): Promise<any> {
    return baiduUploadFile(accessToken, fileName, fileData)
  },
  
  async selectFile(): Promise<string | null> {
    return openFile([
      { name: '电子书', extensions: ['epub', 'pdf', 'txt'] }
    ])
  },
  
  // Qwen AI API
  async qwenChat(
    accessToken: string,
    messages: QwenMessage[],
    model?: string,
    resourceUrl?: string
  ): Promise<QwenChatResponse> {
    return qwenChat(accessToken, messages, model, resourceUrl)
  },
  
  async qwenListModels(accessToken: string, resourceUrl?: string): Promise<QwenModelsResponse> {
    return qwenListModels(accessToken, resourceUrl)
  },
  
  // TTS API
  async ttsSynthesize(request: TtsSynthesisRequest): Promise<number[]> {
    return ttsSynthesize(request)
  },
  
  async ttsListVoices(): Promise<TtsVoicesResponse> {
    return ttsListVoices()
  },
  
  // OAuth API
  async openAuthWindow(authUrl: string): Promise<OAuthResult> {
    return openAuthWindow(authUrl)
  },
  
  async openExternal(url: string): Promise<ExternalBrowserResult> {
    return openExternal(url)
  },
  
  // Token Storage API
  async saveBaiduToken(token: Omit<BaiduTokenData, 'stored_at'>): Promise<TokenStorageResponse> {
    return invoke('save_baidu_token', {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      scope: token.scope,
      clientId: token.client_id,
      clientSecret: token.client_secret,
      redirectUri: token.redirect_uri
    })
  },
  
  async getBaiduToken(): Promise<TokenStorageResponse<BaiduTokenData>> {
    return invoke('get_baidu_token')
  },
  
  async deleteBaiduToken(): Promise<TokenStorageResponse> {
    return invoke('delete_baidu_token')
  },
  
  async isBaiduTokenExpired(): Promise<{ expired: boolean }> {
    return invoke('is_baidu_token_expired')
  },
  
  async saveQwenToken(token: Omit<QwenTokenData, 'stored_at'>): Promise<TokenStorageResponse> {
    return invoke('save_qwen_token', {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      apiKey: token.api_key
    })
  },
  
  async getQwenToken(): Promise<TokenStorageResponse<QwenTokenData>> {
    return invoke('get_qwen_token')
  },
  
  async deleteQwenToken(): Promise<TokenStorageResponse> {
    return invoke('delete_qwen_token')
  },
  
  async isQwenTokenExpired(): Promise<{ expired: boolean }> {
    return invoke('is_qwen_token_expired')
  },
  
  async saveUserSettings(settings: UserSettings): Promise<TokenStorageResponse> {
    return invoke('save_user_settings', {
      theme: settings.theme,
      fontSize: settings.font_size,
      lineHeight: settings.line_height,
      language: settings.language,
      extra: settings.extra
    })
  },
  
  async getUserSettings(): Promise<TokenStorageResponse<UserSettings>> {
    return invoke('get_user_settings')
  },
  
  async deleteUserSettings(): Promise<TokenStorageResponse> {
    return invoke('delete_user_settings')
  },
  
  async clearAllStorage(): Promise<TokenStorageResponse> {
    return invoke('clear_all_storage')
  }
}

// Export aliases for file system functions
export {
  openDirectory as tauriOpenDirectory,
  readFile as tauriReadFile,
  writeFile as tauriWriteFile,
  openFile as tauriOpenFile
}
