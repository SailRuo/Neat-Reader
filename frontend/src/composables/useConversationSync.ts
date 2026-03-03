/**
 * 会话同步 Composable
 * 启动时从百度网盘拉取会话；用户授权后把 Baidu/Qwen Token 同步到后端，后端优先使用已存 token
 */
import { ref, onMounted } from 'vue'
import { syncFromBaidu, syncToBaidu, enableBaiduSync } from '@/api/conversation'
import { saveQwenToken } from '@/api/ai'
import { useEbookStore } from '@/stores/ebook'
import { qwenTokenManager } from '@/utils/qwenTokenManager'
import axios from 'axios'

export function useConversationSync() {
  const ebookStore = useEbookStore()
  const isSyncing = ref(false)
  const syncError = ref<string | null>(null)
  
  /**
   * 验证百度网盘 Token 是否有效
   */
  const verifyBaiduToken = async (accessToken: string): Promise<boolean> => {
    try {
      const response = await axios.get('/api/baidu/verify', {
        params: { accessToken }
      })
      return response.data.success
    } catch (error) {
      console.error('Token 验证失败:', error)
      return false
    }
  }
  
  /**
   * 启动时从百度网盘同步
   */
  const syncOnStartup = async () => {
    // 检查是否配置了百度网盘
    const baiduConfig = ebookStore.userConfig.storage.baidupan
    if (!baiduConfig || !baiduConfig.accessToken) {
      console.log('💾 百度网盘未配置，跳过会话同步')
      return
    }
    
    // 验证 Token 是否有效
    const isValid = await verifyBaiduToken(baiduConfig.accessToken)
    if (!isValid) {
      console.log('⚠️ 百度网盘 Token 无效或已过期，跳过会话同步')
      syncError.value = 'Token 无效或已过期'
      return
    }
    
    try {
      isSyncing.value = true
      syncError.value = null
      
      // 上面已调用 verify，验证通过时后端会自动写入统一 token 存储（data/auth_tokens.json + 内存）
      console.log('📥 正在从百度网盘同步会话...')
      
      // 启用百度网盘同步
      await enableBaiduSync()
      
      // 从百度网盘下载会话
      const result = await syncFromBaidu()
      
      if (result.success > 0) {
        console.log(`✅ 同步完成: 成功 ${result.success}, 失败 ${result.failed}`)
      } else {
        console.log('💾 百度网盘暂无会话数据')
      }
      
    } catch (error: any) {
      console.error('❌ 从百度网盘同步失败:', error)
      syncError.value = error.message || '同步失败'
    } finally {
      isSyncing.value = false
    }
  }
  
  /**
   * 手动触发同步
   */
  const manualSync = async (direction: 'upload' | 'download' = 'upload') => {
    try {
      isSyncing.value = true
      syncError.value = null
      
      if (direction === 'upload') {
        console.log('📤 手动上传会话到百度网盘...')
        const result = await syncToBaidu()
        console.log(`✅ 上传完成: 成功 ${result.success}, 失败 ${result.failed}`)
        return result
      } else {
        console.log('📥 手动从百度网盘下载会话...')
        await enableBaiduSync()
        const result = await syncFromBaidu()
        console.log(`✅ 下载完成: 成功 ${result.success}, 失败 ${result.failed}`)
        return result
      }
      
    } catch (error: any) {
      console.error('❌ 手动同步失败:', error)
      syncError.value = error.message || '同步失败'
      throw error
    } finally {
      isSyncing.value = false
    }
  }
  
  // 组件挂载时：拉取会话 + 把当前 Baidu/Qwen Token 同步到后端
  onMounted(() => {
    syncOnStartup()
    // 若有 Qwen token（授权后存于 localStorage），同步到后端，后续调用 Qwen 时前端可不传 token
    const qwenAccess = qwenTokenManager.getAccessToken()
    if (qwenAccess) {
      saveQwenToken({
        access_token: qwenAccess,
        resource_url: qwenTokenManager.getResourceUrl() || undefined
      }).catch(e => console.warn('保存 Qwen Token 到后端失败（不影响使用）:', e))
    }
  })
  
  return {
    isSyncing,
    syncError,
    syncOnStartup,
    manualSync
  }
}
