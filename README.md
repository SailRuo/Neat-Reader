# Neat Reader

一个简洁优雅的电子书阅读器桌面应用，支持 EPUB 和 PDF 格式，无缝集成百度网盘。

## 功能特性

- **多格式支持**：支持 EPUB 和 PDF 电子书格式
- **百度网盘集成**：从百度网盘直接导入和管理电子书，支持双向同步
- **阅读进度保存**：自动保存阅读进度，跨设备同步阅读位置
- **本地存储**：使用 localforage 实现离线数据存储
- **现代化界面**：基于 Vue 3 + TypeScript 的现代化架构
- **桌面应用**：基于 Wails 框架构建跨平台桌面应用
- **分类管理**：支持自定义分类管理电子书
- **智能缓存**：百度网盘用户信息缓存，减少 API 调用

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
- lucide-vue-next - 图标库
- axios - HTTP 客户端

### 后端
- Go - Google 开发的静态类型编程语言
- Wails v2 - 使用 Go 和 Web 技术构建桌面应用
- 处理百度网盘 API 请求代理

## 项目结构

```
neat-reader/
├── frontend/                      # 前端项目目录
│   ├── src/
│   │   ├── assets/               # 静态资源
│   │   │   ├── icons/            # 图标资源
│   │   │   └── styles/           # 全局样式
│   │   │       └── global.css    # 全局 CSS 样式
│   │   ├── components/           # Vue 组件
│   │   │   ├── Dialog/           # 对话框组件
│   │   │   └── SettingsPanel/    # 设置面板组件
│   │   ├── pages/                # 页面组件
│   │   │   ├── Callback/         # OAuth 回调页面
│   │   │   ├── FileManager/      # 文件管理器页面
│   │   │   ├── Home/             # 首页
│   │   │   ├── Reader/           # 阅读器页面
│   │   │   └── Settings/         # 设置页面
│   │   ├── stores/               # Pinia 状态管理
│   │   │   ├── dialog.ts         # 对话框状态
│   │   │   └── ebook.ts          # 电子书状态管理
│   │   ├── App.vue               # 根组件
│   │   ├── main.ts               # 应用入口
│   │   ├── router.ts             # 路由配置
│   │   └── wails.ts              # Wails 运行时绑定
│   ├── dist/                     # 构建输出目录
│   ├── index.html                # HTML 入口文件
│   ├── package.json              # 前端依赖配置
│   ├── tsconfig.json             # TypeScript 配置
│   └── vite.config.ts            # Vite 配置
├── app.go                         # Go 后端应用逻辑
├── wails.go                       # Wails 应用入口
├── wails.json                     # Wails 配置文件
├── go.mod                         # Go 模块配置
├── go.sum                         # Go 依赖锁定文件
└── README.md                      # 项目说明文档
```

## 快速开始

### 环境要求

- Node.js 18+
- Go 1.20+
- npm 或 yarn
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### 安装依赖

```bash
# 进入前端目录安装前端依赖
cd frontend
npm install

# 返回项目根目录
cd ..
```

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

**说明**：使用 `-frontenddevserverurl` 参数可以让 Wails 连接到已经运行的前端开发服务器，而不是使用 `dist` 目录中的静态文件，这样可以实现热更新功能。

### 构建应用

```bash
# 在项目根目录运行
wails build

# 构建产物位于 `build` 目录
# Windows 可执行文件为 `neat-reader.exe`
# Linux/Mac 可执行文件为 `neat-reader`
```

### 前端独立构建

```bash
cd frontend

# 类型检查
npm run typecheck

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 主要页面

### 首页 (Home)
- 展示书架和阅读历史
- 快捷操作入口
- 百度网盘登录状态显示

### 文件管理器 (FileManager)
管理本地和百度网盘中的电子书文件：
- 浏览本地电子书库
- 从百度网盘导入文件
- 搜索电子书
- 管理书籍分类

### 阅读器 (Reader)
核心阅读功能页面：
- **EPUB 格式**：章节导航、字体调整、主题切换、阅读进度保存
- **PDF 格式**：缩放控制、页面导航、阅读进度保存
- 自动同步阅读进度到百度网盘

### 设置 (Settings)
应用配置页面：
- 百度网盘账户管理（登录/登出）
- 数据同步设置
- 阅读偏好设置
- 缓存管理

### 回调页面 (Callback)
处理百度网盘 OAuth 2.0 授权回调，自动完成登录流程。

## 百度网盘集成

### 获取 API 密钥

1. 前往 [百度开放平台](https://open.baidu.com/) 创建应用
2. 获取 `Client ID` 和 `Client Secret`
3. 配置回调地址为 `http://localhost:8080/callback`

### 配置应用

首次使用时，在应用的设置页面中输入百度网盘 API 配置信息：
- Client ID
- Client Secret
- 回调地址（默认为 `http://localhost:8080/callback`）

### 后端 API 方法

后端服务通过 Wails 绑定提供以下功能：

| 功能 | Go 方法 | 描述 |
|------|---------|------|
| 健康检查 | `GetHealth()` | 检查服务状态 |
| 获取 Token | `GetTokenViaCode(code, clientId, clientSecret, redirectUri)` | 通过授权码获取访问令牌 |
| 刷新 Token | `RefreshToken(refreshToken, clientId, clientSecret)` | 刷新访问令牌 |
| 文件列表 | `GetFileList(accessToken, dir, pageNum, pageSize, order, method, recursion)` | 获取百度网盘文件列表 |
| 搜索文件 | `SearchFiles(accessToken, key, dir, method, recursion)` | 搜索百度网盘文件 |
| 文件上传 | `UploadFile(fileName, fileData, accessToken)` | 上传文件到百度网盘 |
| 验证 Token | `VerifyToken(accessToken)` | 验证访问令牌有效性 |
| 打开目录 | `OpenDirectory()` | 打开系统目录选择对话框 |
| 读取文件 | `ReadFile(path)` | 读取本地文件内容 |
| 选择文件 | `SelectFile()` | 打开系统文件选择对话框 |

## 数据存储

### 本地存储
使用 localforage 存储以下数据：
- `books` - 电子书元数据列表
- `categories` - 分类数据
- `progress_<bookId>` - 阅读进度
- `ebook_content_<bookId>` - 电子书内容缓存
- `userConfig` - 用户配置
- `baidupanUserInfoCache` - 百度网盘用户信息缓存

### 百度网盘同步
- 配置文件同步到 `/sync/config.json`
- 阅读进度同步到 `/sync/progress/<bookId>.json`

## 开发说明

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 Vue 3 组合式 API 风格
- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化

### 项目配置

- 开发服务器端口：8080
- Wails 前端目录：`frontend`
- 构建输出目录：`build`

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [Wails 文档](https://wails.io/docs/)
- [Vue 3 文档](https://vuejs.org/)
- [百度网盘开放平台](https://pan.baidu.com/union)
