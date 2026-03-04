<template>
  <div class="migration-page">
    <div class="migration-container">
      <h1>数据迁移</h1>
      
      <div class="migration-info">
        <p>系统已升级到新的存储架构（SQLite3），需要迁移现有数据。</p>
        <p>迁移过程会将书籍、分类、阅读进度从浏览器存储迁移到后端数据库。</p>
      </div>

      <div v-if="migrationStatus === 'idle'" class="migration-actions">
        <button @click="startMigration" class="btn-primary">
          开始迁移
        </button>
        <button @click="skipMigration" class="btn-secondary">
          跳过（稍后迁移）
        </button>
      </div>

      <div v-if="migrationStatus === 'running'" class="migration-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <p class="progress-text">{{ progress.message }}</p>
        <p class="progress-count">{{ progress.current }} / {{ progress.total }}</p>
      </div>

      <div v-if="migrationStatus === 'completed'" class="migration-result success">
        <div class="result-icon">✅</div>
        <h2>迁移完成！</h2>
        <pre class="result-summary">{{ resultSummary }}</pre>
        
        <div v-if="progress.errors.length > 0" class="errors">
          <h3>错误列表：</h3>
          <ul>
            <li v-for="(error, index) in progress.errors" :key="index">
              {{ error }}
            </li>
          </ul>
        </div>

        <div class="migration-actions">
          <button @click="cleanupOldData" class="btn-primary">
            清理旧数据
          </button>
          <button @click="goToHome" class="btn-secondary">
            进入应用
          </button>
        </div>
      </div>

      <div v-if="migrationStatus === 'error'" class="migration-result error">
        <div class="result-icon">❌</div>
        <h2>迁移失败</h2>
        <p class="error-message">{{ progress.message }}</p>
        
        <div class="migration-actions">
          <button @click="retryMigration" class="btn-primary">
            重试
          </button>
          <button @click="skipMigration" class="btn-secondary">
            跳过
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { migrateAll, cleanupIndexedDB, MigrationProgress } from '@/utils/storeMigration'

const router = useRouter()

const migrationStatus = ref<'idle' | 'running' | 'completed' | 'error'>('idle')
const progress = ref<MigrationProgress>({
  total: 0,
  current: 0,
  status: 'idle',
  message: '',
  errors: []
})
const resultSummary = ref('')

const progressPercent = computed(() => {
  if (progress.value.total === 0) return 0
  return Math.round((progress.value.current / progress.value.total) * 100)
})

async function startMigration() {
  migrationStatus.value = 'running'
  
  const result = await migrateAll((p) => {
    progress.value = p
  })
  
  if (result.success) {
    migrationStatus.value = 'completed'
    resultSummary.value = result.summary
  } else {
    migrationStatus.value = 'error'
  }
}

async function retryMigration() {
  migrationStatus.value = 'idle'
  progress.value = {
    total: 0,
    current: 0,
    status: 'idle',
    message: '',
    errors: []
  }
  await startMigration()
}

async function cleanupOldData() {
  if (confirm('确定要清理旧数据吗？此操作不可恢复。')) {
    await cleanupIndexedDB()
    alert('旧数据已清理')
    goToHome()
  }
}

function skipMigration() {
  if (confirm('确定要跳过迁移吗？稍后可以在设置中手动迁移。')) {
    goToHome()
  }
}

function goToHome() {
  router.push('/')
}
</script>

<style scoped>
.migration-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.migration-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h1 {
  margin: 0 0 20px 0;
  font-size: 28px;
  color: #333;
  text-align: center;
}

.migration-info {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  line-height: 1.6;
  color: #666;
}

.migration-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #e0e0e0;
  color: #666;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

.migration-progress {
  margin: 30px 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  color: #666;
  margin: 8px 0;
}

.progress-count {
  text-align: center;
  color: #999;
  font-size: 14px;
}

.migration-result {
  text-align: center;
  padding: 20px;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.result-summary {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: left;
  white-space: pre-wrap;
  margin: 20px 0;
  color: #333;
  font-family: monospace;
}

.errors {
  margin: 20px 0;
  text-align: left;
}

.errors h3 {
  color: #e74c3c;
  margin-bottom: 10px;
}

.errors ul {
  background: #fff5f5;
  padding: 15px 15px 15px 35px;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
  max-height: 200px;
  overflow-y: auto;
}

.errors li {
  color: #c0392b;
  margin: 5px 0;
  font-size: 14px;
}

.error-message {
  color: #e74c3c;
  margin: 20px 0;
  padding: 15px;
  background: #fff5f5;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
}
</style>
