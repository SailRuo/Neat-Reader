/**
 * Token Storage Types for Tauri
 * 
 * Type definitions for secure token storage using tauri-plugin-store
 */

export interface BaiduTokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  stored_at?: number;  // Unix timestamp in seconds
}

export interface QwenTokenData {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  api_key?: string;
  stored_at?: number;  // Unix timestamp in seconds
}

export interface UserSettings {
  theme?: string;
  font_size?: number;
  line_height?: number;
  language?: string;
  extra?: Record<string, any>;
}

export interface TokenStorageResponse<T = any> {
  success: boolean;
  message?: string;
  token?: T;
  settings?: T;
  expired?: boolean;
}

/**
 * Token Storage API
 * 
 * Provides methods to interact with Tauri's secure token storage
 */
export interface TokenStorageAPI {
  // Baidu Netdisk token operations
  saveBaiduToken(token: Omit<BaiduTokenData, 'stored_at'>): Promise<TokenStorageResponse>;
  getBaiduToken(): Promise<TokenStorageResponse<BaiduTokenData>>;
  deleteBaiduToken(): Promise<TokenStorageResponse>;
  isBaiduTokenExpired(): Promise<{ expired: boolean }>;
  
  // Qwen AI token operations
  saveQwenToken(token: Omit<QwenTokenData, 'stored_at'>): Promise<TokenStorageResponse>;
  getQwenToken(): Promise<TokenStorageResponse<QwenTokenData>>;
  deleteQwenToken(): Promise<TokenStorageResponse>;
  isQwenTokenExpired(): Promise<{ expired: boolean }>;
  
  // User settings operations
  saveUserSettings(settings: UserSettings): Promise<TokenStorageResponse>;
  getUserSettings(): Promise<TokenStorageResponse<UserSettings>>;
  deleteUserSettings(): Promise<TokenStorageResponse>;
  
  // Clear all storage
  clearAllStorage(): Promise<TokenStorageResponse>;
}
