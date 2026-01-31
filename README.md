# Neat Reader

一个简洁的电子书阅读器，支持 EPUB 和 PDF 格式，可无缝集成百度网盘。

## 功能特性

- **多格式支持**：支持 EPUB 和 PDF 电子书格式
- **百度网盘集成**：从百度网盘直接导入和管理电子书
- **阅读进度保存**：自动保存阅读进度，下次打开继续阅读
- **本地存储**：使用 localforage 实现离线数据存储
- **现代化界面**：基于 Vue 3 + TypeScript 的现代化架构
- **响应式设计**：支持不同尺寸的屏幕

## 技术栈

### 前端
- Vue 3 - 渐进式 JavaScript 框架
- TypeScript - 类型安全的 JavaScript 超集
- Vite - 下一代前端构建工具
- Pinia - Vue 状态管理库
- Vue Router - Vue.js 官方路由管理器
- epubjs - EPUB 电子书解析库
- pdfjs-dist - PDF 文档解析库
- localforage - 离线存储库
- dayjs - 轻量级日期处理库

### 后端
- Go - Google 开发的静态类型编程语言
- 处理百度网盘 API 请求代理

## 项目结构

```
neat-reader/
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   └── styles/
│   │   │       └── global.css       # 全局样式
│   │   ├── components/
│   │   │   └── Dialog/              # 对话框组件
│   │   ├── pages/
│   │   │   ├── Callback/            # OAuth 回调页面
│   │   │   ├── FileManager/         # 文件管理器页面
│   │   │   ├── Home/                # 首页
│   │   │   ├── Reader/              # 阅读器页面
│   │   │   └── Settings/            # 设置页面
│   │   ├── stores/
│   │   │   ├── dialog.ts            # 对话框状态管理
│   │   │   └── ebook.ts             # 电子书状态管理
│   │   ├── App.vue                  # 根组件
│   │   ├── main.ts                  # 应用入口
│   │   ├── router.ts                # 路由配置
│   │   └── wails.ts                 # Wails 绑定
│   ├── wailsjs/                     # Wails 自动生成的绑定文件
│   ├── index.html                   # HTML 入口文件
│   ├── package.json                 # 前端依赖配置
│   ├── package-lock.json            # 前端依赖锁定文件
│   ├── tsconfig.json                # TypeScript 配置
│   ├── tsconfig.node.json           # TypeScript Node 配置
│   └── vite.config.ts               # Vite 配置
├── app.go                           # Go 后端应用逻辑
├── wails.go                         # Wails 应用入口
├── wails.json                       # Wails 配置文件
├── go.mod                           # Go 模块配置
├── go.sum                           # Go 依赖锁定文件
└── README.md                        # 项目说明文档
```

## 快速开始

### 前端安装与运行

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run typecheck

# 预览生产版本
npm run preview
```

### Wails 开发模式

使用 Wails CLI 启动完整的开发环境（同时启动前端和后端服务）：

```bash
# 在项目根目录运行
wails dev

# 开发服务器默认运行在 http://localhost:8080
# Wails 应用会自动打开
```

## 主要页面

### 首页 (Home)
展示阅读历史、快捷操作入口和阅读统计信息。

### 文件管理器 (FileManager)
管理本地和百度网盘中的电子书文件，支持：
- 浏览文件列表
- 搜索电子书
- 从百度网盘导入文件
- 上传文件到百度网盘

### 阅读器 (Reader)
核心阅读功能页面，支持：
- EPUB 格式：章节导航、字体调整、背景切换
- PDF 格式：缩放、翻页、页面跳转

### 设置 (Settings)
应用配置，包括：
- 主题设置
- 阅读偏好设置
- 百度网盘账户管理
- 数据同步设置

### 回调页面 (Callback)
处理百度网盘 OAuth 2.0 授权回调。

## 百度网盘 API 配置

### 获取 API 密钥

1. 前往[百度开放平台](https://open.baidu.com/)创建应用
2. 获取 `Client ID` 和 `Client Secret`
3. 配置回调地址为 `http://localhost:8080/callback`

### 配置后端服务

百度网盘 API 配置在前端代码中管理，通过前端界面进行设置。首次使用时，您需要：

1. 前往[百度开放平台](https://open.baidu.com/)创建应用
2. 获取 `Client ID` 和 `Client Secret`
3. 在应用设置中配置回调地址为 `http://localhost:8080/callback`
4. 在应用的设置页面中输入这些配置信息

后端服务会自动使用这些配置与百度网盘 API 进行交互。

### API 端点

后端服务通过 Wails 绑定提供以下功能，这些功能通过前端直接调用 Go 方法实现，而不是通过 HTTP API 端点：

| 功能 | Go 方法 | 描述 |
|------|---------|------|
| 健康检查 | `GetHealth()` | 检查服务状态 |
| 获取 Token | `GetTokenViaCode(code, clientId, clientSecret, redirectUri)` | 通过授权码获取访问令牌 |
| 刷新 Token | `RefreshToken(refreshToken, clientId, clientSecret)` | 刷新访问令牌 |
| 文件列表 | `GetFileList(accessToken, dir, pageNum, pageSize, order, method, recursion)` | 获取文件列表 |
| 搜索文件 | `SearchFiles(accessToken, key, dir, method, recursion)` | 搜索文件 |
| 文件上传 | `UploadFile(fileName, fileData, accessToken)` | 上传文件到百度网盘 |
| 验证 Token | `VerifyToken(accessToken)` | 验证访问令牌有效性 |
| 打开目录 | `OpenDirectory()` | 打开系统目录选择对话框 |
| 读取文件 | `ReadFile(path)` | 读取本地文件内容 |
| 选择文件 | `SelectFile()` | 打开系统文件选择对话框 |

## 开发说明

### 环境要求

- Node.js 18+
- Go 1.20+
- npm 或 yarn

### 开发模式

#### 方式一：使用 Wails CLI（推荐）

```bash
# 在项目根目录运行
wails dev

# Wails 会自动启动前端开发服务器和后端服务
# 应用会自动打开
# 开发服务器默认运行在 http://localhost:8080
```

#### 方式二：分别启动前端和后端

1. 启动前端开发服务器：
   ```bash
   cd frontend && npm run dev
   ```

2. 启动 Wails 后端服务（在另一个终端）：
   ```bash
   wails dev -frontenddevserverurl http://localhost:8080
   ```

3. 访问 `http://localhost:8080` 开始使用

**说明**：使用 `-frontenddevserverurl` 参数可以让 Wails 连接到已经运行的前端开发服务器，而不是使用 `dist` 目录中的静态文件，这样可以实现热更新功能。

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 Vue 3 组合式 API 风格
- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化

## 构建部署

### 使用 Wails 构建完整应用

```bash
# 在项目根目录运行
wails build

# 构建产物位于 `build` 目录
# 可执行文件为 `neat-reader.exe`（Windows）或 `neat-reader`（Linux/Mac）
```

### 前端构建（仅静态文件）

```bash
cd frontend
npm run build
```

构建产物位于 `frontend/dist` 目录，可部署到任何静态文件服务器。

## 浏览器支持

支持所有现代浏览器：
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request！
