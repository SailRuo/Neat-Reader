<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h2 class="settings-title">设置</h2>
    </div>
    
    <div class="settings-content">
      <section class="setting-section">
        <h3 class="section-title">百度网盘</h3>
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">授权状态</span>
              <span class="setting-desc" v-if="baidupanUser">已连接</span>
              <span class="setting-desc" v-else>配置百度网盘信息以获取access_token</span>
            </div>
            <div class="setting-control">
              <span v-if="baidupanUser" class="status connected">已授权</span>
              <span v-else class="status disconnected">未授权</span>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">操作</span>
              <span class="setting-desc">管理百度网盘授权</span>
            </div>
            <div class="setting-control">
              <button v-if="baidupanUser" class="btn btn-danger" @click="$emit('cancelBaidupanAuth')">
                取消授权
              </button>
              <button v-else class="btn btn-primary" @click="$emit('showBaidupanAuthDialog')">
                获取授权
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="setting-section">
        <h3 class="section-title">外观</h3>
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">视图模式</span>
              <span class="setting-desc">{{ viewMode === 'grid' ? '网格' : '列表' }}</span>
            </div>
            <div class="setting-control">
              <div class="toggle-group">
                <button 
                  class="toggle-btn" 
                  :class="{ active: viewMode === 'grid' }"
                  @click="$emit('updateViewMode', 'grid')"
                >网格</button>
                <button 
                  class="toggle-btn" 
                  :class="{ active: viewMode === 'list' }"
                  @click="$emit('updateViewMode', 'list')"
                >列表</button>
              </div>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">语言</span>
              <span class="setting-desc">{{ ebookStore.userConfig.ui.language === 'zh-CN' ? '简体中文' : 'English' }}</span>
            </div>
            <div class="setting-control">
              <select class="form-control" :value="ebookStore.userConfig.ui.language" @change="handleLanguageChange">
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEbookStore } from '../../stores/ebook'

const ebookStore = useEbookStore()

defineProps<{
  baidupanUser: { baidu_name: string; avatar_url: string; vip_type: number } | null
  viewMode: 'grid' | 'list'
}>()

defineEmits<{
  cancelBaidupanAuth: []
  showBaidupanAuthDialog: []
  updateViewMode: [mode: 'grid' | 'list']
}>()

const handleLanguageChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await ebookStore.updateUserConfig({
    ui: { ...ebookStore.userConfig.ui, language: target.value }
  })
}
</script>

<style scoped>
.settings-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 24px 0;
  border-bottom: 1px solid #e8e8e8;
}

.settings-title {
  font-size: 24px;
  font-weight: bold;
  color: #4A90E2;
  margin: 0;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
}

.setting-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #4A90E2;
}

.setting-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 8px 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.setting-desc {
  font-size: 13px;
  color: #999;
}

.setting-control {
  flex-shrink: 0;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #DCDFE6;
  border-radius: 6px;
  font-size: 14px;
  min-width: 150px;
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 9L1 4l1-1 4 4 4-1-1zm0 0L1 4l5 5 5-5 1 1-5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.form-control:hover {
  border-color: #4A90E2;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.05), rgba(74, 144, 226, 0.02));
}

.form-control:focus {
  outline: none;
  border-color: #4A90E2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  background: linear-gradient(135deg, #FFFFFF, #F8FAFC);
}

.form-control option {
  background: white;
  color: #475569;
  padding: 8px 12px;
}

.status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status.connected {
  background-color: #F0F9EB;
  color: #67C23A;
}

.status.disconnected {
  background-color: #FEF0F0;
  color: #F56C6C;
}

.toggle-group {
  display: flex;
  background-color: #f5f7fa;
  border-radius: 6px;
  overflow: hidden;
}

.toggle-btn {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.toggle-btn.active {
  background-color: #4A90E2;
  color: white;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background-color: #4A90E2;
  color: white;
}

.btn-primary:hover {
  background-color: #357ABD;
}

.btn-danger {
  background-color: #F56C6C;
  color: white;
}

.btn-danger:hover {
  background-color: #f23c3c;
}

@media (max-width: 768px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .setting-control {
    width: 100%;
  }
  
  .form-control {
    width: 100%;
    min-width: 0;
  }
}
</style>
