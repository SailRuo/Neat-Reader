## Neat Reader
 
 简洁优雅的桌面级电子书阅读器（Electron），支持 EPUB / PDF、本地文件与百度网盘书库，并集成 Qwen AI 阅读助手与 TTS 朗读。
 
 > ⚠️ 仍在积极开发中，API 与 UI 可能会有调整。
 
 <p align="center">
   <img src="https://img.shields.io/badge/status-alpha-orange" alt="status" />
   <img src="https://img.shields.io/badge/electron-28+-9feaf9" alt="electron" />
   <img src="https://img.shields.io/badge/vue-3.x-42b883" alt="vue3" />
   <img src="https://img.shields.io/badge/license-MIT-blue" alt="license" />
 </p>


---

### 目录

- [特性](#特性)
- [技术栈](#技术栈)
- [预览截图](#预览截图)
- [目录结构](#目录结构)
- [环境准备](#环境准备)
- [快速开始](#快速开始)
  - [安装依赖](#安装依赖)
  - [开发模式启动](#开发模式启动)
  - [构建与打包](#构建与打包)
- [配置与密钥管理](#配置与密钥管理)
- [代码阅读指引](#代码阅读指引)
- [常见问题 FAQ](#常见问题-faq)
- [贡献指南](#贡献指南)
- [License](#license)
- [English Quick Overview](#english-quick-overview)

---

### 特性

- **多格式阅读支持**
  - EPUB：`epubjs` / `@ray-d-song/foliate-js`
  - PDF：`pdfjs-dist`
  - 进度与主题等逻辑主要在 `frontend/src/pages/Reader` 下

- **百度网盘书库**
  - 后端：`backend/src/routes/baidu.js` + `backend/src/services/baiduService.js`
  - 能力：授权换 Token / 刷新 / 校验、文件列表 / 搜索 / 下载 / 上传

- **Qwen AI 阅读助手**
  - 后端：`backend/src/routes/qwen.js` + `backend/src/services/qwenService.js`
  - 能力：Device Code Flow（含 PKCE）、刷新 Token、模型列表、对话/流式对话（SSE）
  - 前端入口主要在 `frontend/src/pages/Reader/components`

- **TTS 朗读**
  - 后端：`backend/src/routes/tts.js` + `backend/src/services/ttsService.js`（`node-edge-tts`）
  - 提供语音列表、合成（一次性/流式）、清理缓存

- **跨平台桌面应用**
  - Electron 主进程：`electron/main.js`（窗口、CSP、授权窗口、IPC）
  - 打包：`electron-builder`（见 `electron-builder.json` 与根目录 `build:*` 脚本）

---

### 技术栈

- **桌面端**：Electron（主进程入口 `electron/main.js`）
- **前端**：Vue 3、Vue Router、Pinia、Vite、TypeScript
- **阅读内核**：`epubjs`、`@ray-d-song/foliate-js`、`pdfjs-dist`
- **后端**：Node.js + Express（`backend/src/server.js`，端口 `3001`）
- **其它**：Axios、dayjs、localforage、uuid、lucide-vue-next 等

---

### 预览截图

> 在 GitHub 上展示时，可以放几张关键页面截图（主页、阅读器、AI 面板等）。  
> 例如：
>
> ```md
> ![Home](./image-1.png)
> ![Reader](./image-2.png)
> ```

---

### 目录结构

```text
Neat-Reader/
  backend/            # Node/Express 后端
    src/
      routes/         # baidu / qwen / tts API 路由
      services/       # 第三方服务封装逻辑
      utils/          # 日志、端口占用处理等工具
      server.js       # 后端入口，默认端口 3001

  electron/           # Electron 主进程代码
    main.js           # 创建主窗口、CSP、授权窗口、IPC handler
    preload.js        # 预加载脚本（contextBridge 暴露安全 API）
    menu.js           # 应用菜单

  frontend/           # Vue 3 + Vite 前端
    src/
      pages/
        Home/         # 主页
        FileManager/  # 文件管理与导入
        Reader/       # 阅读器页面及组件（AI、TTS、主题等）
      components/     # 公共 UI 组件（对话框、设置面板、聊天窗口等）
      stores/         # Pinia 状态管理（如 `ebook`、`dialog`）
      api/            # 与 backend 的 API 适配层
      utils/          # Token 管理、工具函数等

  build/              # 打包资源（图标等）
  package.json        # 根目录脚本：安装、开发、打包
  electron-builder.json
  README.md
```

---

### 环境准备

- Node.js 18+（建议）  
- npm 或兼容包管理器（项目脚本以 `npm` 为例）  
- 可选账号/平台：
  - 百度网盘开放平台应用（用于 OAuth）
  - Qwen 账号（Device Code Flow）

> 注：当前后端对百度的 `clientId` / `clientSecret` / `redirectUri` 是由前端请求时传入（见 `backend/src/routes/baidu.js`）。Qwen 的 OAuth clientId 目前以常量形式存在于 `backend/src/services/qwenService.js`。

---

### 快速开始

#### 安装依赖

在项目根目录执行（自动为前端与后端安装依赖）：

```bash
npm install
```

`package.json` 中定义了：

- `postinstall`:  
  - 进入 `frontend` 执行 `npm install`
  - 进入 `backend` 执行 `npm install`

---

#### 开发模式启动

在根目录运行：

```bash
# 启动前后端 + Electron
npm run dev
```

该脚本会：

- 启动后端：`npm run dev:backend`（默认端口 `http://localhost:3001`，见 `backend/src/server.js`）
- 启动前端：`npm run dev:frontend`（Vite，默认 `http://localhost:5173`）
- 待前端可用后，启动 Electron 主进程：`npm run dev:electron`，加载 `http://localhost:5173`

前端开发服务器已在 `frontend/vite.config.ts` 配置了代理：

- `/api/*` -> `http://localhost:3001/api/*`

你也可以分别启动：

```bash
npm run dev:backend   # 只启动后端
npm run dev:frontend  # 只启动前端（浏览器访问 5173）
npm run dev:electron  # 只启动 Electron（需要前端已启动）
```

---

#### 构建与打包

前端打包（生成至 `frontend/dist`）：

```bash
npm run build:frontend
```

后端生产环境依赖安装：

```bash
npm run build:backend
```

桌面应用打包（调用 `electron-builder`）：

```bash
# 通用
npm run build

# 或指定平台
npm run build:win
npm run build:mac
npm run build:linux
```

打包完成后，可在相应输出目录中找到安装包 / 可执行文件。

---

### 配置与密钥管理

项目中涉及到的“配置/密钥”主要分两类：

- **百度网盘 OAuth（需要你自行申请）**
  - 后端接口需要前端传入：`clientId` / `clientSecret` / `redirectUri`（见 `backend/src/routes/baidu.js`）
  - 如果你使用 Electron 内置授权窗口（`electron/main.js` 的 `auth:openWindow`），回调识别逻辑会检测：
    - `alistgo.com/tool/baidu/callback`
  - 也提供通过 alist 获取 refresh token：`POST /api/baidu/alist-token`

- **Qwen（Device Code Flow）**
  - 启动授权：`POST /api/qwen/device-auth`
  - 轮询 token：`POST /api/qwen/poll-token`
  - `qwenService` 当前内置了 OAuth clientId 与端点（`backend/src/services/qwenService.js`）

建议：

- 不要把 `clientSecret` 写死在仓库里
- 若要改为环境变量方式，可在后端引入 `.env` 并在服务层读取（当前版本未内置 `.env` 读取逻辑）

---

### 代码阅读指引

- 想了解**阅读器内核与 UI**：  
  - `frontend/src/pages/Reader/index.vue`
  - `frontend/src/pages/Reader/components`：`FoliateReader.vue`、`PdfReader.vue`、`AIChatPanel.vue`、`TextSelectionMenu.vue` 等
  - `frontend/src/pages/Reader/composables`：主题/进度等

- 想了解**AI / TTS 能力如何接入**：  
  - 前端：`frontend/src/api`、`frontend/src/components/ChatWindow`、`TTSSettings` 等
  - 后端：`backend/src/routes/qwen.js`、`backend/src/routes/tts.js` 与对应 `services`

- 想了解**存储与状态管理**：  
  - `frontend/src/stores/ebook.ts` 等 Pinia Store
  - `localforage` 在本地缓存中的使用

- 想了解 **Electron 与前端的交互**：  
  - `electron/main.js` 中的 `ipcMain.handle(...)`（文件选择、授权窗口等）
  - `electron/preload.js` 中暴露给渲染进程的 API
  - 渲染进程封装：`frontend/src/electron.ts`

---

### 常见问题 FAQ

- **Q: 启动 `npm run dev` 后 Electron 窗口白屏或无法打开？**  
  - 请确认 Vite 前端是否成功启动（`http://localhost:5173` 可访问）  
  - 检查终端输出是否有端口占用或依赖安装失败

- **Q: 后端接口请求失败 / 401 / 5xx？**  
  - 检查后端控制台日志（`backend/src/utils/logger.js`）  
  - 确认端口：后端固定 `3001`，前端开发端口 `5173`  
  - 百度相关：确认 `clientId` / `clientSecret` / `redirectUri` 是否正确  
  - Qwen 相关：确认能访问 `chat.qwen.ai` / `portal.qwen.ai`，以及 device flow 是否完成授权

- **Q: 如何自定义 UI / 主题？**  
  - 查看 `frontend/src/pages/Reader/styles/theme.css` 与全局样式 `frontend/src/assets/styles/global.css`  
  - 可在此基础上添加新主题或调整配色

---

### 贡献指南

欢迎通过以下方式参与改进项目（未来可以补充 CONTRIBUTING 文档）：

- 提交 Issue，反馈 Bug 或提出新功能建议
- 提交 Pull Request：
  - 保持代码风格与现有项目一致
  - 尽量在前后端分别添加必要的注释
  - 如果改动较大，建议先开 Issue 讨论

---

### License

本项目使用 **MIT License**。

---

### English Quick Overview

Neat Reader is an Electron-based desktop ebook reader (EPUB / PDF) built with Vue 3 and an Express backend.  
It integrates Baidu Netdisk as a remote library and Qwen AI for reading assistance and text-to-speech.  

**Development**

```bash
npm install
npm run dev
```

**Build**

```bash
npm run build        # generic build
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

For more details, please refer to the source code and comments under `backend/src`, `frontend/src`, and `electron/`.

