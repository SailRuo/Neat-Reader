<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="text-selection-menu"
      :style="menuStyle"
      @click.stop
    >
      <button
        class="menu-button"
        @click="handleAskAI"
        title="与 AI 对话"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>问 AI</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

// Props
const props = defineProps<{
  visible: boolean
  selectedText: string
  position: { x: number; y: number }
}>()

// Emits
const emit = defineEmits<{
  'ask-ai': [text: string]
  close: []
}>()

// 状态
const menuRef = ref<HTMLElement | null>(null)

// 计算菜单位置
const menuStyle = computed(() => {
  const { x, y } = props.position
  
  // 菜单尺寸（估算）
  const menuWidth = 120
  const menuHeight = 48
  
  // 视口尺寸
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // 计算位置，确保不超出视口
  let left = x
  let top = y + 10 // 在选中文本下方10px
  
  // 水平方向调整
  if (left + menuWidth > viewportWidth) {
    left = viewportWidth - menuWidth - 10
  }
  if (left < 10) {
    left = 10
  }
  
  // 垂直方向调整
  if (top + menuHeight > viewportHeight) {
    top = y - menuHeight - 10 // 在选中文本上方
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`
  }
})

// 处理 AI 对话
const handleAskAI = () => {
  console.log('🎯 [文本选择菜单] 点击问 AI，文本:', props.selectedText.substring(0, 50))
  if (props.selectedText.trim()) {
    emit('ask-ai', props.selectedText.trim())
  }
}

// 监听可见性变化
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await nextTick()
    // 可以在这里添加动画或其他逻辑
  }
})

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

// 监听点击事件
watch(() => props.visible, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

// 当文本选区被取消时也隐藏菜单（例如用户点击其他地方或清空选区）
const handleSelectionChange = () => {
  const sel = window.getSelection?.()
  if (!sel) return
  const txt = sel.toString().trim()
  if (!txt) {
    emit('close')
  }
}

// 把 selectionchange 绑定到 visible 的监听中
watch(() => props.visible, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      document.addEventListener('selectionchange', handleSelectionChange)
    }, 100)
  } else {
    document.removeEventListener('selectionchange', handleSelectionChange)
  }
})
</script>

<style scoped>
.text-selection-menu {
  position: fixed;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.menu-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-button:active {
  background: rgba(255, 255, 255, 0.15);
}

.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
</style>
