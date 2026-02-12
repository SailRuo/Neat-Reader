<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="text-selection-menu"
      :style="menuStyle"
      @click.stop
    >
      <!-- 下划线按钮 -->
      <button
        class="menu-button underline-btn"
        @click="handleUnderline"
        title="下划线"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
          <line x1="4" y1="21" x2="20" y2="21"/>
        </svg>
      </button>

      <!-- 笔记按钮 -->
      <button
        class="menu-button note-btn"
        @click="handleNote"
        title="笔记（自动高亮）"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      <!-- 颜色预设 -->
      <div class="colors" title="选择颜色">
        <button
          v-for="c in presetColors"
          :key="c"
          class="color-swatch"
          :class="{ active: c === selectedColor }"
          :style="{ backgroundColor: c }"
          @click="selectColor(c)"
        ></button>
      </div>

      <!-- 分隔线 -->
      <div class="menu-divider"></div>

      <!-- AI 对话按钮 -->
      <button
        class="menu-button ai-btn"
        @click="handleAskAI"
        title="与 AI 对话"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
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
  color?: string
}>()

// Emits
const emit = defineEmits<{
  'ask-ai': [text: string]
  underline: []
  note: []
  'color-change': [color: string]
  close: []
}>()

// 状态
const menuRef = ref<HTMLElement | null>(null)

const presetColors = ['#FBBF24', '#60A5FA', '#34D399', '#A78BFA']
const selectedColor = computed(() => props.color || presetColors[0])

// 计算菜单位置
const menuStyle = computed(() => {
  const { x, y } = props.position
  
  // 菜单尺寸（估算）
  const menuWidth = 320
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

// 处理下划线
const handleUnderline = () => {
  console.log('📏 [文本选择菜单] 创建下划线')
  emit('underline')
}

// 处理笔记
const handleNote = () => {
  console.log('� [文本选择菜单] 创建笔记（自动高亮）')
  emit('note')
}

const selectColor = (c: string) => {
  emit('color-change', c)
}

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
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.15s ease-out;
  display: flex;
  align-items: center;
  gap: 4px;
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
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.menu-button:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
}

.menu-button:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.menu-button.highlight-btn:hover {
  background: rgba(251, 191, 36, 0.2);
  color: #FBBF24;
}

.menu-button.underline-btn:hover {
  background: rgba(96, 165, 250, 0.2);
  color: #60A5FA;
}

.menu-button.note-btn:hover {
  background: rgba(167, 139, 250, 0.2);
  color: #A78BFA;
}

.menu-button.ai-btn:hover {
  background: rgba(52, 211, 153, 0.2);
  color: #34D399;
}

.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.menu-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

.colors {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
}

.color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0;
  outline: none;
  transition: transform 0.15s ease-out, border-color 0.15s ease-out;
}

.color-swatch:hover {
  transform: scale(1.15);
  border-color: rgba(255, 255, 255, 0.6);
}

.color-swatch.active {
  border-color: white;
  transform: scale(1.15);
}
</style>
