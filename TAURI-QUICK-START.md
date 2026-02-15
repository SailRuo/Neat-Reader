# Tauri 版本快速启动指南

## 当前状态

✅ **Electron → Tauri 迁移已完成**（所有 28 个任务已完成）

你的项目现在同时支持两个版本：
- **Electron 版本**（原版）- 使用 Express 后端
- **Tauri 版本**（新版）- 使用 Rust 后端

## 启动 Tauri 版本

### 方法 1：使用批处理脚本（推荐）

```bash
# 开发模式
start-tauri.bat

# 构建生产版本
build-tauri.bat
```

### 方法 2：使用 npm 命令

```bash
# 开发模式
npm run dev:tauri

# 构建生产版本
npm run build:tauri
```

### 方法 3：使用 Cargo 命令

```bash
# 开发模式
cargo tauri dev

# 构建生产版本
cargo tauri build
```

## 前置要求

### 1. Rust 工具链

检查是否已安装：
```bash
cargo --version
```

如果未安装，访问：https://rustup.rs/

### 2. Tauri CLI

自动安装（首次运行时）：
```bash
cargo install tauri-cli
```

### 3. WebView2（Windows）

Windows 10/11 通常已预装。如果缺失，Tauri 会自动下载。

## 开发模式

启动开发服务器：
```bash
cargo tauri dev
```

这会：
1. 启动 Vite 前端开发服务器（http://localhost:5173）
2. 编译 Rust 后端
3. 打开 Tauri 窗口（带热重载）

## 构建生产版本

构建 Windows 安装包：
```bash
cargo tauri build
```

输出位置：
```
src-tauri/target/release/bundle/
├── msi/          # Windows 安装程序
└── nsis/         # 可选的 NSIS 安装程序
```

## 两个版本的区别

| 特性 | Electron 版本 | Tauri 版本 |
|------|--------------|-----------|
| 后端 | Express (Node.js) | Rust |
| 打包体积 | ~150MB | ~20MB |
| 内存占用 | 较高 | 较低 |
| 启动速度 | 较慢 | 较快 |
| 稳定性 | 一般 | 更好 |
| 开发体验 | 熟悉 | 需要学习 Rust |

## Tauri 架构

```
┌─────────────────────────────────────┐
│         Vue 3 Frontend              │
│    (TypeScript + Vite)              │
│    http://localhost:5173            │
└──────────────┬──────────────────────┘
               │ IPC (Tauri Invoke)
┌──────────────▼──────────────────────┐
│         Rust Backend                │
│    (Tauri Commands)                 │
│                                     │
│  • Baidu API (src/api/baidu.rs)    │
│  • Qwen API (src/api/qwen.rs)      │
│  • TTS API (src/api/tts.rs)        │
│  • File System (src/commands/)     │
│  • OAuth (src/commands/oauth.rs)   │
│  • Token Storage (src/storage/)    │
└─────────────────────────────────────┘
```

## API 调用方式

### Electron 版本
```typescript
import axios from 'axios'
const response = await axios.get('http://localhost:3001/api/baidu/files')
```

### Tauri 版本
```typescript
import { invoke } from '@tauri-apps/api/tauri'
const response = await invoke('baidu_list_files', { path: '/' })
```

### 使用适配器（推荐）
```typescript
import { baiduApi } from '@/api/baidu'
const files = await baiduApi.getFiles('/')
// 自动适配 Electron 或 Tauri
```

## 调试

### 打开开发者工具
- 开发模式下自动打开
- 或按 `F12` / `Ctrl+Shift+I`

### 查看 Rust 日志
```bash
# 设置日志级别
$env:RUST_LOG="debug"
cargo tauri dev
```

### 常见问题

**问题：`cargo: command not found`**
- 解决：安装 Rust - https://rustup.rs/

**问题：WebView2 缺失**
- 解决：Tauri 会自动下载，或手动安装 - https://developer.microsoft.com/microsoft-edge/webview2/

**问题：编译错误**
- 解决：清理缓存 `cargo clean` 然后重新构建

**问题：前端无法连接后端**
- 解决：检查 `tauri.conf.json` 中的 `devPath` 是否正确

## 下一步

1. **测试 Tauri 版本**：运行 `start-tauri.bat` 验证所有功能
2. **性能对比**：比较 Tauri 和 Electron 的启动速度、内存占用
3. **决定主版本**：根据测试结果决定使用哪个版本
4. **清理代码**：如果选择 Tauri，可以移除 Electron 相关代码

## 文档

- [Tauri 配置文档](src-tauri/TAURI-CONFIG-DOCUMENTATION.md)
- [Baidu API 实现](src-tauri/BAIDU-API-IMPLEMENTATION.md)
- [Qwen API 实现](src-tauri/QWEN-API-IMPLEMENTATION.md)
- [TTS API 实现](src-tauri/TTS-API-IMPLEMENTATION.md)
- [OAuth 实现](src-tauri/OAUTH-IMPLEMENTATION.md)
- [Token 存储](src-tauri/TOKEN-STORAGE-IMPLEMENTATION.md)
- [前端迁移指南](frontend/TAURI-MIGRATION-GUIDE.md)

## 支持

如有问题，请查看：
- [Tauri 官方文档](https://tauri.app/)
- [Tauri Discord](https://discord.com/invite/tauri)
- 项目文档目录 `src-tauri/`
