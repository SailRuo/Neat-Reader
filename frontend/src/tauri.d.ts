/**
 * Tauri API Type Definitions
 * 
 * This file provides TypeScript type definitions for the Tauri environment
 * and complements the tauri-adapter.ts implementation.
 */

declare global {
  interface Window {
    /**
     * Tauri API is available when running in Tauri environment
     */
    __TAURI__?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      [key: string]: any
    }
  }
}

/**
 * Tauri command names
 * These correspond to the Rust #[tauri::command] functions
 */
export type TauriCommand =
  // File system commands
  | 'open_directory'
  | 'read_file'
  | 'write_file'
  | 'open_file'
  // Baidu Netdisk commands
  | 'baidu_get_token'
  | 'baidu_refresh_token'
  | 'baidu_verify_token'
  | 'baidu_list_files'
  | 'baidu_search_files'
  | 'baidu_upload_file'
  | 'baidu_download_file'
  | 'baidu_get_fileinfo'
  // Qwen AI commands
  | 'qwen_chat'
  | 'qwen_list_models'
  // TTS commands
  | 'tts_synthesize'
  | 'tts_list_voices'

/**
 * Tauri invoke function signature
 */
export interface TauriInvoke {
  <T = any>(cmd: TauriCommand, args?: Record<string, unknown>): Promise<T>
}

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export {}
