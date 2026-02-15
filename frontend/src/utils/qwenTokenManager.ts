/**
 * Qwen Token 自动刷新管理器
 * 
 * 功能：
 * 1. 自动检测 token 过期时间
 * 2. 在过期前 3 小时自动刷新
 * 3. 刷新失败时触发回调
 */

import { refreshToken as apiRefreshToken } from '../api/qwen'

interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp (毫秒)
  resourceUrl?: string
}

class QwenTokenManager {
  private tokenData: TokenData | null = null
  private refreshTimer: number | null = null
  private onTokenRefreshed: ((tokens: TokenData) => void) | null = null
  private onRefreshFailed: ((error: Error) => void) | null = null
  
  // 刷新提前时间：3 小时（与 CLIProxyAPI 保持一致）
  private readonly REFRESH_LEAD_TIME = 3 * 60 * 60 * 1000 // 3 hours in ms
  
  /**
   * 初始化 token 管理器
   */
  constructor() {
    this.loadFromStorage()
    this.scheduleRefresh()
  }
  
  /**
   * 从 localStorage 加载 token
   */
  private loadFromStorage(): void {
    try {
      const accessToken = localStorage.getItem('qwen_access_token')
      const refreshToken = localStorage.getItem('qwen_refresh_token')
      const expiresAt = localStorage.getItem('qwen_expires_at')
      const resourceUrl = localStorage.getItem('qwen_resource_url')
      
      if (accessToken && refreshToken && expiresAt) {
        this.tokenData = {
          accessToken,
          refreshToken,
          expiresAt: parseInt(expiresAt, 10),
          resourceUrl: resourceUrl || undefined
        }
        
        console.log('✅ [Token Manager] 从存储加载 token', {
          expiresAt: new Date(this.tokenData.expiresAt).toLocaleString(),
          hasResourceUrl: !!resourceUrl
        })
      }
    } catch (error) {
      console.error('❌ [Token Manager] 加载 token 失败:', error)
    }
  }
  
  /**
   * 保存 token 到 localStorage
   */
  private saveToStorage(): void {
    if (!this.tokenData) return
    
    try {
      localStorage.setItem('qwen_access_token', this.tokenData.accessToken)
      localStorage.setItem('qwen_refresh_token', this.tokenData.refreshToken)
      localStorage.setItem('qwen_expires_at', this.tokenData.expiresAt.toString())
      
      if (this.tokenData.resourceUrl) {
        localStorage.setItem('qwen_resource_url', this.tokenData.resourceUrl)
      }
      
      console.log('✅ [Token Manager] Token 已保存到存储')
    } catch (error) {
      console.error('❌ [Token Manager] 保存 token 失败:', error)
    }
  }
  
  /**
   * 设置 token 数据
   */
  setTokens(accessToken: string, refreshToken: string, expiresIn: number, resourceUrl?: string): void {
    const expiresAt = Date.now() + expiresIn * 1000
    
    this.tokenData = {
      accessToken,
      refreshToken,
      expiresAt,
      resourceUrl
    }
    
    this.saveToStorage()
    this.scheduleRefresh()
    
    console.log('✅ [Token Manager] Token 已设置', {
      expiresAt: new Date(expiresAt).toLocaleString(),
      expiresIn: `${Math.floor(expiresIn / 60)} 分钟`
    })
  }
  
  /**
   * 获取当前 access token
   */
  getAccessToken(): string | null {
    return this.tokenData?.accessToken || null
  }
  
  /**
   * 获取 resource URL
   */
  getResourceUrl(): string | null {
    return this.tokenData?.resourceUrl || null
  }
  
  /**
   * 检查 token 是否即将过期
   */
  /*
  private isTokenExpiringSoon(): boolean {
    if (!this.tokenData) return false
    
    const timeUntilExpiry = this.tokenData.expiresAt - Date.now()
    return timeUntilExpiry <= this.REFRESH_LEAD_TIME
  }
  */
  
  /**
   * 检查 token 是否已过期
   */
  isTokenExpired(): boolean {
    if (!this.tokenData) return true
    return Date.now() >= this.tokenData.expiresAt
  }
  
  /**
   * 计划下次刷新时间
   */
  private scheduleRefresh(): void {
    // 清除现有定时器
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    
    if (!this.tokenData) return
    
    const timeUntilExpiry = this.tokenData.expiresAt - Date.now()
    const timeUntilRefresh = timeUntilExpiry - this.REFRESH_LEAD_TIME
    
    if (timeUntilRefresh <= 0) {
      // 已经需要刷新了
      console.log('⚠️ [Token Manager] Token 即将过期，立即刷新')
      this.refreshTokenNow()
    } else {
      // 计划在合适的时间刷新
      console.log('⏰ [Token Manager] 计划刷新时间', {
        refreshIn: `${Math.floor(timeUntilRefresh / 1000 / 60)} 分钟`,
        refreshAt: new Date(Date.now() + timeUntilRefresh).toLocaleString()
      })
      
      this.refreshTimer = window.setTimeout(() => {
        this.refreshTokenNow()
      }, timeUntilRefresh)
    }
  }
  
  /**
   * 立即刷新 token
   */
  async refreshTokenNow(): Promise<void> {
    if (!this.tokenData) {
      console.warn('⚠️ [Token Manager] 没有 token 数据，无法刷新')
      return
    }
    
    console.log('🔄 [Token Manager] 开始刷新 token...')
    
    try {
      const result = await apiRefreshToken(this.tokenData.refreshToken)
      
      // 更新 token 数据
      this.setTokens(
        result.access_token,
        result.refresh_token,
        result.expires_in,
        result.resource_url || this.tokenData.resourceUrl
      )
      
      console.log('✅ [Token Manager] Token 刷新成功')
      
      // 触发回调
      if (this.onTokenRefreshed && this.tokenData) {
        this.onTokenRefreshed(this.tokenData)
      }
    } catch (error) {
      console.error('❌ [Token Manager] Token 刷新失败:', error)
      
      // 触发失败回调
      if (this.onRefreshFailed) {
        this.onRefreshFailed(error as Error)
      }
      
      // 如果刷新失败，5 分钟后重试
      console.log('⏰ [Token Manager] 5 分钟后重试刷新')
      this.refreshTimer = window.setTimeout(() => {
        this.refreshTokenNow()
      }, 5 * 60 * 1000)
    }
  }
  
  /**
   * 设置 token 刷新成功回调
   */
  onRefresh(callback: (tokens: TokenData) => void): void {
    this.onTokenRefreshed = callback
  }
  
  /**
   * 设置 token 刷新失败回调
   */
  onError(callback: (error: Error) => void): void {
    this.onRefreshFailed = callback
  }
  
  /**
   * 清除 token
   */
  clearTokens(): void {
    this.tokenData = null
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    
    localStorage.removeItem('qwen_access_token')
    localStorage.removeItem('qwen_refresh_token')
    localStorage.removeItem('qwen_expires_at')
    localStorage.removeItem('qwen_resource_url')
    
    console.log('✅ [Token Manager] Token 已清除')
  }
  
  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    
    this.onTokenRefreshed = null
    this.onRefreshFailed = null
  }
}

// 导出单例
export const qwenTokenManager = new QwenTokenManager()
