<template>
  <teleport to="body">
    <div
      v-if="visible"
      class="context-menu-overlay"
      @click="handleClose"
      @contextmenu.prevent
    >
      <div
        ref="menuRef"
        class="context-menu"
        :style="menuStyle"
        @click.stop
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="context-menu-item"
          :class="{
            'has-children': item.children,
            'disabled': item.disabled,
            'danger': item.danger,
            'divided': item.divided
          }"
          @mouseenter="handleMouseEnter(item, index, $event)"
          @click="handleItemClick(item)"
        >
          <div class="menu-item-content">
            <span v-if="item.icon" class="menu-item-icon">
              <component :is="item.icon" :size="16" />
            </span>
            <span class="menu-item-label">{{ item.label }}</span>
            <span v-if="item.children" class="menu-item-arrow">
              <ChevronRight :size="14" />
            </span>
          </div>
        </div>
      </div>

      <!-- 子菜单 -->
      <div
        v-if="activeSubmenu"
        ref="submenuRef"
        class="context-menu context-submenu"
        :style="submenuStyle"
        @click.stop
      >
        <div
          v-for="(subItem, subIndex) in activeSubmenu.children"
          :key="subIndex"
          class="context-menu-item"
          :class="{
            'has-children': subItem.children,
            'disabled': subItem.disabled,
            'danger': subItem.danger,
            'divided': subItem.divided
          }"
          @mouseenter="handleSubmenuMouseEnter(subItem, subIndex, $event)"
          @click="handleItemClick(subItem)"
        >
          <div class="menu-item-content">
            <span v-if="subItem.icon" class="menu-item-icon">
              <component :is="subItem.icon" :size="16" />
            </span>
            <span class="menu-item-label">{{ subItem.label }}</span>
            <span v-if="subItem.children" class="menu-item-arrow">
              <ChevronRight :size="14" />
            </span>
          </div>
        </div>
      </div>

      <!-- 三级菜单 -->
      <div
        v-if="activeThirdMenu"
        ref="thirdMenuRef"
        class="context-menu context-submenu"
        :style="thirdMenuStyle"
        @click.stop
      >
        <div
          v-for="(thirdItem, thirdIndex) in activeThirdMenu.children"
          :key="thirdIndex"
          class="context-menu-item"
          :class="{
            'disabled': thirdItem.disabled,
            'danger': thirdItem.danger,
            'divided': thirdItem.divided
          }"
          @click="handleItemClick(thirdItem)"
        >
          <div class="menu-item-content">
            <span v-if="thirdItem.icon" class="menu-item-icon">
              <component :is="thirdItem.icon" :size="16" />
            </span>
            <span class="menu-item-label">{{ thirdItem.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { ChevronRight } from 'lucide-vue-next'

export interface MenuItem {
  label: string
  icon?: any
  onClick?: () => void
  children?: MenuItem[]
  disabled?: boolean
  danger?: boolean
  divided?: boolean
}

interface Props {
  visible: boolean
  x: number
  y: number
  items: MenuItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const submenuRef = ref<HTMLElement | null>(null)
const thirdMenuRef = ref<HTMLElement | null>(null)
const activeSubmenu = ref<MenuItem | null>(null)
const activeThirdMenu = ref<MenuItem | null>(null)
const submenuPosition = ref({ x: 0, y: 0 })
const thirdMenuPosition = ref({ x: 0, y: 0 })

const menuStyle = computed(() => {
  if (!props.visible) return {}
  
  let x = props.x
  let y = props.y
  
  // 防止菜单超出屏幕
  nextTick(() => {
    if (menuRef.value) {
      const rect = menuRef.value.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      
      if (x + rect.width > windowWidth) {
        x = windowWidth - rect.width - 10
      }
      if (y + rect.height > windowHeight) {
        y = windowHeight - rect.height - 10
      }
    }
  })
  
  return {
    left: `${x}px`,
    top: `${y}px`
  }
})

const submenuStyle = computed(() => {
  return {
    left: `${submenuPosition.value.x}px`,
    top: `${submenuPosition.value.y}px`
  }
})

const thirdMenuStyle = computed(() => {
  return {
    left: `${thirdMenuPosition.value.x}px`,
    top: `${thirdMenuPosition.value.y}px`
  }
})

const handleMouseEnter = (item: MenuItem, _index: number, event: MouseEvent) => {
  if (item.disabled || !item.children) {
    activeSubmenu.value = null
    activeThirdMenu.value = null
    return
  }
  
  activeSubmenu.value = item
  activeThirdMenu.value = null
  
  nextTick(() => {
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const menuRect = menuRef.value?.getBoundingClientRect()
    
    if (menuRect) {
      let x = menuRect.right + 2
      let y = rect.top
      
      // 防止子菜单超出屏幕
      if (submenuRef.value) {
        const submenuRect = submenuRef.value.getBoundingClientRect()
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight
        
        if (x + submenuRect.width > windowWidth) {
          x = menuRect.left - submenuRect.width - 2
        }
        if (y + submenuRect.height > windowHeight) {
          y = windowHeight - submenuRect.height - 10
        }
      }
      
      submenuPosition.value = { x, y }
    }
  })
}

const handleSubmenuMouseEnter = (item: MenuItem, _index: number, event: MouseEvent) => {
  if (item.disabled || !item.children) {
    activeThirdMenu.value = null
    return
  }
  
  activeThirdMenu.value = item
  
  nextTick(() => {
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const submenuRect = submenuRef.value?.getBoundingClientRect()
    
    if (submenuRect) {
      let x = submenuRect.right + 2
      let y = rect.top
      
      // 防止三级菜单超出屏幕
      if (thirdMenuRef.value) {
        const thirdMenuRect = thirdMenuRef.value.getBoundingClientRect()
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight
        
        if (x + thirdMenuRect.width > windowWidth) {
          x = submenuRect.left - thirdMenuRect.width - 2
        }
        if (y + thirdMenuRect.height > windowHeight) {
          y = windowHeight - thirdMenuRect.height - 10
        }
      }
      
      thirdMenuPosition.value = { x, y }
    }
  })
}

const handleItemClick = (item: MenuItem) => {
  if (item.disabled || item.children) return
  
  if (item.onClick) {
    item.onClick()
  }
  
  handleClose()
}

const handleClose = () => {
  activeSubmenu.value = null
  activeThirdMenu.value = null
  emit('close')
}

// 监听visible变化，重置子菜单状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    activeSubmenu.value = null
    activeThirdMenu.value = null
  }
})
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: transparent;
}

.context-menu {
  position: fixed;
  min-width: 180px;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.375rem;
  z-index: 10000;
  animation: menuFadeIn 0.15s ease-out;
}

.context-submenu {
  z-index: 10001;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  position: relative;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.context-menu-item.divided {
  border-top: 1px solid var(--border-color);
  margin-top: 0.375rem;
  padding-top: 0.875rem;
}

.context-menu-item:not(.disabled):hover {
  background: #f8f9fa;
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.danger:not(.disabled):hover {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}

.context-menu-item.danger:not(.disabled):hover .menu-item-icon {
  color: #ef4444;
}

.menu-item-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.menu-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.menu-item-label {
  flex: 1;
  white-space: nowrap;
}

.menu-item-arrow {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  margin-left: auto;
  flex-shrink: 0;
}

.context-menu-item.has-children::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 20px;
}

/* 深色模式适配 */
.theme-dark .context-menu {
  background: #1E293B;
  border-color: #334155;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
</style>
