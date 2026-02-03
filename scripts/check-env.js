#!/usr/bin/env node

/**
 * 环境检查脚本
 * 检查开发环境是否满足要求
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔍 检查开发环境...\n')

let hasErrors = false

// 检查 Node.js 版本
try {
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
  
  if (majorVersion >= 16) {
    console.log(`✅ Node.js 版本: ${nodeVersion}`)
  } else {
    console.log(`❌ Node.js 版本过低: ${nodeVersion} (需要 >= 16.x)`)
    hasErrors = true
  }
} catch (error) {
  console.log('❌ 无法检测 Node.js 版本')
  hasErrors = true
}

// 检查 npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
  console.log(`✅ npm 版本: ${npmVersion}`)
} catch (error) {
  console.log('❌ npm 未安装')
  hasErrors = true
}

// 检查项目结构
const requiredDirs = [
  'electron',
  'backend',
  'backend/src',
  'frontend',
  'frontend/src'
]

console.log('\n📁 检查项目结构...')
for (const dir of requiredDirs) {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir}/`)
  } else {
    console.log(`❌ 缺少目录: ${dir}/`)
    hasErrors = true
  }
}

// 检查关键文件
const requiredFiles = [
  'electron/main.js',
  'electron/preload.js',
  'backend/src/server.js',
  'backend/package.json',
  'frontend/package.json',
  'package.json'
]

console.log('\n📄 检查关键文件...')
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ 缺少文件: ${file}`)
    hasErrors = true
  }
}

// 检查依赖是否已安装
console.log('\n📦 检查依赖安装...')

const checkDeps = (dir, name) => {
  const nodeModulesPath = path.join(dir, 'node_modules')
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`✅ ${name} 依赖已安装`)
    return true
  } else {
    console.log(`⚠️  ${name} 依赖未安装 (运行 npm install)`)
    return false
  }
}

checkDeps('.', '根项目')
checkDeps('frontend', '前端')
checkDeps('backend', '后端')

// 总结
console.log('\n' + '='.repeat(50))
if (hasErrors) {
  console.log('❌ 环境检查失败，请修复上述问题后重试')
  process.exit(1)
} else {
  console.log('✅ 环境检查通过！')
  console.log('\n💡 提示:')
  console.log('  - 运行 npm install 安装所有依赖')
  console.log('  - 运行 npm run dev 启动开发模式')
  console.log('  - 运行 npm run build 构建应用')
  process.exit(0)
}
