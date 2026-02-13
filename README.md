## Neat Reader
 
 简洁优雅的桌面电子书阅读器，让阅读更智能。
 
 > 💡 **选中文本，即刻对话**：集成免费千问 AI，随时解答疑问、翻译内容、总结要点，让每一次阅读都成为深度学习。  
 > ⚠️ 项目持续迭代中，欢迎反馈建议。
 
 <p align="center">
   <img src="https://img.shields.io/badge/status-alpha-orange" alt="status" />
   <img src="https://img.shields.io/badge/license-MIT-blue" alt="license" />
 </p>


---

### 目录

- [核心功能](#核心功能)
- [AI 使用指南](#ai-使用指南)
- [快速开始](#快速开始)
- [预览截图](#预览截图)
- [技术实现](#技术实现)
- [常见问题](#常见问题)
- [电子书资源服务](#电子书资源服务)
- [贡献指南](#贡献指南)
- [License](#license)

---

### 核心功能

#### 🤖 AI 智能阅读助手

**选中文本，即刻对话** —— 阅读过程中遇到任何疑问，选中文本即可唤起 AI 助手，获得即时解答。

- **免费使用**：集成阿里云千问大模型，通过 OAuth 授权后免费使用
- **多场景支持**：
  - 📖 解释专业术语和复杂概念
  - 🌍 翻译外文段落
  - 📝 总结长篇内容要点
  - 💭 深入探讨观点和论述
  - 🔍 推荐相关延伸阅读
- **流畅体验**：实时流式响应，支持多轮对话，保持上下文连贯
- **安全可靠**：标准 OAuth 授权流程，数据安全有保障

#### 📚 舒适的阅读体验

- **多格式支持**：EPUB、PDF 格式无缝阅读
- **个性化设置**：自定义字体、主题、亮度，打造专属阅读环境
- **进度同步**：自动保存阅读进度，随时续读
- **智能标注**：支持高亮、笔记、书签，方便回顾重点

#### ☁️ 云端书库管理

- **百度网盘集成**：直接访问网盘中的电子书，无需下载
- **本地书库**：支持导入本地文件，离线阅读
- **分类管理**：自定义分类标签，轻松整理书籍

#### 🔊 语音朗读

- **TTS 朗读**：支持文本转语音，解放双眼
- **多种音色**：提供多种语音选择
- **朗读控制**：调节语速、音量，自由控制播放

---

### AI 使用指南

#### 第一步：授权 AI 服务

1. 打开应用设置面板
2. 找到 "Qwen AI 设置" 选项
3. 点击 "开始授权"，按照提示完成授权
4. 授权成功后即可使用

#### 第二步：开始智能对话

1. **选中文本**：在阅读时选中任意文本（单词、句子或段落）
2. **唤起 AI**：点击弹出菜单中的 AI 对话图标
3. **提出问题**：输入你的问题，AI 会结合选中内容给出解答
4. **持续交流**：支持多轮对话，深入探讨

#### 使用场景示例

```
场景 1：学习专业书籍
选中："量子纠缠是一种物理现象..."
提问："用通俗的语言解释量子纠缠"

场景 2：阅读外文资料
选中："The fundamental theorem of calculus..."
提问："翻译成中文并解释"

场景 3：总结长篇内容
选中：[一整页的论述]
提问："总结这段内容的核心观点"

场景 4：深度思考
选中："作者认为教育的本质是..."
提问："这个观点有哪些局限性？"
```

#### 使用说明

- 本功能使用阿里云千问大模型免费额度
- 适用于个人学习、研究、探讨等非商业用途
- 请遵守相关服务条款与使用规范


---

### 快速开始

#### 安装与运行

```bash
# 安装依赖
npm install

# 启动应用（开发模式）
npm run dev

# 打包应用
npm run build        # 通用打包
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

#### 首次使用

1. **导入电子书**
   - 点击 "导入本地文件" 添加 EPUB 或 PDF 文件
   - 或连接百度网盘，直接访问云端书库

2. **授权 AI 服务**（可选）
   - 进入设置 → Qwen AI 设置
   - 完成授权后即可使用 AI 阅读助手

3. **开始阅读**
   - 选择书籍，开始阅读
   - 选中文本即可唤起 AI 对话

---

### 预览截图
<img width="2158" height="1271" alt="image" src="https://github.com/user-attachments/assets/83438abb-9055-4f50-98ed-5a449d4ea4cc" />

<img width="2158" height="1271" alt="image" src="https://github.com/user-attachments/assets/9dead75d-2e38-4668-b148-6f59aa8d315a" />

<img width="2158" height="1271" alt="image" src="https://github.com/user-attachments/assets/ad75008e-9a5d-4342-bd23-a36905503a16" />

<img width="2158" height="1271" alt="image" src="https://github.com/user-attachments/assets/eded8d41-a671-470b-9e04-10e9609a0d7b" />

<img width="2158" height="1271" alt="image" src="https://github.com/user-attachments/assets/237df806-603e-4979-97f6-67d57869e1cf" />

<img width="2158" height="1271" alt="image" src="https://github.com/user-attachments/assets/cf0db06d-06b0-4a66-b0dc-cd7bbac3be88" />

<img width="2158" height="1271" alt="image" src="https://github.com/user-attachments/assets/197c5b5b-d67f-42ac-9e45-71ccc00b5615" />

---

### 技术实现

#### 架构设计

采用三层架构，确保安全性和可维护性：

- **Electron 主进程**：窗口管理、系统集成、进程通信
- **Vue 3 前端**：用户界面、交互逻辑、状态管理
- **Express 后端**：API 服务、第三方集成、业务逻辑


#### 技术栈

**前端技术**
- Vue 3 + TypeScript：现代化响应式框架
- Pinia：状态管理
- Vue Router：路由管理（Hash 模式）
- Vite：快速构建工具

**阅读引擎**
- epubjs / foliate-js：EPUB 渲染
- pdfjs-dist：PDF 渲染
- localforage：离线数据存储（IndexedDB）

**后端服务**
- Node.js + Express：API 服务器（端口 3001）
- Axios：HTTP 客户端
- node-edge-tts：语音合成

**桌面应用**
- Electron 28+：跨平台桌面框架
- electron-builder：应用打包

#### 项目结构

```text
Neat-Reader/
├── frontend/          # Vue 3 前端应用
│   └── src/
│       ├── pages/     # 页面组件（Home、Reader、FileManager）
│       ├── components/# 通用组件
│       ├── stores/    # Pinia 状态管理
│       └── api/       # API 接口封装
├── backend/           # Express 后端服务
│   └── src/
│       ├── routes/    # API 路由（baidu、qwen、tts）
│       └── services/  # 业务逻辑层
├── electron/          # Electron 主进程
│   ├── main.js        # 窗口创建与管理
│   └── preload.js     # 安全 API 桥接
└── build/             # 打包资源
```

#### 开发者指南

**环境要求**
- Node.js 18+
- npm 或兼容包管理器

**开发命令**

```bash
npm run dev              # 启动完整开发环境
npm run dev:frontend     # 仅启动前端（端口 5173）
npm run dev:backend      # 仅启动后端（端口 3001）
npm run dev:electron     # 仅启动 Electron
```


**配置说明**

- 前端开发服务器配置了代理：`/api/*` → `http://localhost:3001/api/*`
- 百度网盘 OAuth 需要自行申请 `clientId` / `clientSecret`
- Qwen OAuth 使用 Device Code Flow，内置于 `backend/src/services/qwenService.js`

**代码阅读指引**

- 阅读器核心：`frontend/src/pages/Reader/` 及其 `components/`、`composables/`
- AI/TTS 集成：`frontend/src/api/`、`backend/src/routes/`、`backend/src/services/`
- 状态管理：`frontend/src/stores/`
- Electron 交互：`electron/main.js`、`electron/preload.js`、`frontend/src/electron.ts`

---

### 常见问题

**Q: AI 功能需要付费吗？**  
A: 使用阿里云千问大模型的免费额度，适用于个人学习研究。

**Q: 支持哪些电子书格式？**  
A: 目前支持 EPUB 和 PDF 格式。

**Q: 数据存储在哪里？**  
A: 本地数据使用 IndexedDB 存储，云端书库通过百度网盘访问。

**Q: 可以离线使用吗？**  
A: 本地导入的书籍可以完全离线阅读，AI 功能需要网络连接。

**Q: 如何反馈问题或建议？**  
A: 欢迎在 GitHub Issues 中提交反馈。

**Q: 找不到想要的电子书资源？**  
A: 如果你是出于学习、研究等非商业用途需要电子书资源，可以联系我们帮忙寻找。请发送邮件至 **908977862@qq.com**，注明书名、作者及用途。

---

### 电子书资源服务

📚 **免费电子书寻找服务**

如果你在学习、研究过程中需要特定的电子书资源，我们愿意提供帮助：

- 📧 **联系邮箱**：908977862@qq.com
- 🎓 **适用范围**：学习、研究、学术探讨等非商业用途
- 📖 **服务内容**：帮助寻找 EPUB、PDF 等格式的电子书资源
- ⏱️ **响应时间**：通常 1-3 个工作日内回复

**发送邮件时请注明：**
1. 书名和作者
2. 使用用途（学习/研究方向）
3. 首选格式（EPUB/PDF）

> 注：本服务仅用于学习研究交流，请尊重版权，支持正版。

---

### 贡献指南

欢迎参与项目改进：

- 💡 提交 Issue 反馈问题或建议新功能
- 🔧 提交 Pull Request 贡献代码
- 📖 完善文档和使用指南
- 🌟 Star 项目支持开发

---

### License

本项目使用 **MIT License**。

---

### English Quick Overview

**Neat Reader** - An intelligent desktop ebook reader that makes reading smarter.

**🌟 Key Feature: AI-Powered Reading**
- Select any text while reading to instantly chat with Qwen AI (free model)
- Perfect for learning, research, and knowledge exploration
- Get explanations, translations, summaries, and insights in real-time
- Streaming responses with multi-turn conversation support

**Other Features:**
- Multi-format support (EPUB, PDF)
- Baidu Netdisk integration for cloud library
- Text-to-speech (TTS) support
- Customizable themes and reading settings
- Cross-platform desktop app
- Free ebook finding service for learning & research (Email: 908977862@qq.com)

**Quick Start**

```bash
npm install
npm run dev
```

**Build**

```bash
npm run build        # All platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

For technical details, see the [技术实现](#技术实现) section above.
