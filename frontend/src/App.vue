<template>
  <div id="app">
    <router-view />
    <Dialog
      :visible="dialogStore.visible"
      :title="dialogStore.title"
      :message="dialogStore.message"
      :type="dialogStore.type"
      :details="dialogStore.details"
      :buttons="dialogStore.buttons"
      @close="dialogStore.closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { useDialogStore } from './stores/dialog'
import Dialog from './components/Dialog/index.vue'
import { useConversationSync } from './composables/useConversationSync'

// 初始化对话框状态管理
const dialogStore = useDialogStore()

// 启用会话自动同步（混合模式：前端 IndexedDB + 后端百度网盘）
useConversationSync()
</script>

<style scoped>
#app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>