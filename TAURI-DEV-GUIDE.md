# Tauri 开发指南

## 开发者工具

### 打开开发者工具的方法

在 Tauri 开发模式下，有以下几种方式打开开发者工具：

#### 1. 使用快捷键（推荐）

- **F12** - 切换开发者工具
- **Ctrl + Shift + I** (Windows/Linux) - 打开开发者工具
- **Cmd + Option + I** (macOS) - 打开开发者工具

#### 2. 在浏览器控制台中手动调用

```javascript
// 打开开发者工具
import { openDevTools } from './utils/devtools'
openDevTools()

// 关闭开发者工具
import { closeDevTools } from './utils/devtools'
closeDevTools()

// 环境诊断
import { diagnoseEnvironment } from './utils/devtools'
diagnoseEnvironment()
```

#### 3. 在代码中添加

```typescript
// 在任何 Vue 组件或 TypeScript 文件中
import { openDevTools } from '@/utils/devtools'

// 在需要的地方调用
openDevTools()
```

## 常见问题

### 1. OAuth 授权窗口被阻止

**问题**: 点击"获取授权"后，提示"外部浏览器窗口被阻止"

**原因**: Tauri 环境检测失败，代码尝试使用 `window.open()` 而不是 Tauri 的 `open_auth_window` 命令

**解决方案**:

1. 检查环境检测是否正确：
```javascript
// 在浏览器控制台运行
console.log('__TAURI__' in window) // 应该返回 true
```

2. 如果返回 `false`，检查 Tauri 是否正确初始化：
```javascript
// 查看环境诊断
import { diagnoseEnvironment } from '@/utils/devtools'
diagnoseEnvironment()
```

3. 确保使用正确的 API：
```typescript
// 正确的方式（会自动检测环境）
import { api } from '@/api/adapter'
const result = await api.openAuthWindow(authUrl)

// 错误的方式（在 Tauri 中不工作）
window.open(authUrl, '_blank')
```

### 2. CSP 策略阻止资源加载

**问题**: 控制台显示 "violates the following Content Security Policy directive"

**已修复**: `tauri.conf.json` 中的 CSP 策略已更新，支持：
- `blob:` URL（用于 EPUB 阅读器）
- `data:` URL（用于图片和字体）
- 外部 API 域名（百度网盘、通义千问等）

### 3. iframe sandbox 警告

**问题**: "An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing"

**说明**: 这是 EPUB 阅读器（foliate-js）的正常行为，不影响功能。EPUB 内容需要在 iframe 中运行脚本。

## 开发模式启动

### 方法 1: 使用 npm 脚本

```bash
# 启动完整开发环境（推荐）
npm run dev

# 或分别启动
npm run dev:frontend  # 前端开发服务器 (端口 5173)
npm run dev:tauri     # Tauri 窗口
```

### 方法 2: 使用批处理文件

```bash
# Windows
start-tauri.bat

# 或
npm run tauri dev
```

## 调试技巧

### 1. 查看 Rust 后端日志

Rust 后端的 `println!` 和 `console.log` 会输出到启动 Tauri 的终端窗口。

### 2. 查看前端日志

使用 F12 打开开发者工具，查看 Console 标签。

### 3. 网络请求调试

在开发者工具的 Network 标签中查看所有 HTTP 请求。

### 4. 存储调试

在开发者工具的 Application 标签中查看：
- IndexedDB（localforage 数据）
- Local Storage
- Session Storage

### 5. 环境诊断

```javascript
// 在控制台运行
import { diagnoseEnvironment } from '@/utils/devtools'
diagnoseEnvironment()
```

输出示例：
```
=== 环境诊断 ===
window.__TAURI__: true
window.electron: false
window.location.href: http://localhost:5173/
navigator.userAgent: Mozilla/5.0 ...
✓ Tauri 环境已检测到
```

## 构建和打包

### 开发构建

```bash
npm run build:tauri
```

输出位置：
- `src-tauri/target/release/neat-reader.exe` - 可执行文件
- `src-tauri/target/release/bundle/msi/` - Windows 安装包 (.msi)
- `src-tauri/target/release/bundle/nsis/` - NSIS 安装包 (.exe)

### 生产构建

```bash
npm run build:tauri
```

## 性能优化

### 前端优化

1. **代码分割**: 大型组件使用动态导入
```typescript
const HeavyComponent = defineAsyncComponent(() => 
  import('./components/HeavyComponent.vue')
)
```

2. **图片优化**: 使用 WebP 格式，添加 lazy loading

3. **Bundle 分析**:
```bash
npm run build:frontend -- --mode analyze
```

### Rust 后端优化

1. **Release 构建**: 自动启用优化
2. **减小二进制大小**: 在 `Cargo.toml` 中配置

## 故障排除

### Tauri 窗口无法启动

1. 检查端口 5173 是否被占用
2. 确保前端开发服务器正在运行
3. 查看终端错误信息

### 前端无法连接后端

1. 检查 API 适配器是否正确检测环境
2. 确认 Tauri 命令已在 `main.rs` 中注册
3. 查看浏览器控制台的错误信息

### 构建失败

1. 清理缓存：
```bash
# 清理 Rust 构建缓存
cd src-tauri
cargo clean

# 清理前端构建缓存
cd frontend
rm -rf dist node_modules
npm install
```

2. 更新依赖：
```bash
npm update
cd src-tauri
cargo update
```

## 相关文档

- [Tauri 官方文档](https://tauri.app/v1/guides/)
- [Vue 3 文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [项目架构文档](.kiro/steering/structure.md)
- [技术栈文档](.kiro/steering/tech.md)
