# Neat Reader - Tauri 开发环境搭建指南

本指南将帮助你在 Windows 上从零开始搭建 Tauri 开发环境。

## 前置要求

- Windows 10/11
- 管理员权限（用于安装软件）
- 稳定的网络连接

---

## 第一步：安装 Node.js

如果已安装 Node.js，跳过此步骤。

### 检查是否已安装

```bash
node --version
npm --version
```

### 安装方法

**使用 winget：**
```bash
winget install OpenJS.NodeJS.LTS
```

**或手动下载：**
访问 https://nodejs.org/ 下载 LTS 版本并安装。

---

## 第二步：安装 Rust

### 1. 安装 Rustup

**使用 winget（推荐）：**
```bash
winget install Rustlang.Rustup
```

**或手动下载：**
访问 https://rustup.rs/ 下载 `rustup-init.exe` 并运行。

### 2. 设置默认工具链

安装完成后，**重启终端**，然后运行：

```bash
rustup default stable
```

### 3. 验证安装

```bash
cargo --version
rustc --version
```

应该看到版本号输出，例如：
```
cargo 1.75.0
rustc 1.75.0
```

---

## 第三步：安装 Visual Studio Build Tools

这是 Windows 上编译 Rust 项目的必需工具。

### 1. 安装 Build Tools

**使用 winget（推荐）：**
```bash
winget install Microsoft.VisualStudio.2022.BuildTools
```

**或手动下载：**
访问 https://visualstudio.microsoft.com/downloads/ 下载 "Build Tools for Visual Studio 2022"。

### 2. 选择工作负载

安装程序启动后，选择 **"使用 C++ 的桌面开发"** 工作负载。

### 3. 必需组件（确保勾选）

在右侧"安装详细信息"中，确保勾选：

**必需：**
- ✅ MSVC v143 - VS 2022 C++ x64/x86 生成工具
- ✅ Windows 11 SDK（或 Windows 10 SDK）

**推荐（可选）：**
- ✅ 用于 Windows 的 C++ CMake 工具
- ✅ 测试工具核心功能 - 生成工具
- ✅ C++ AddressSanitizer
- ✅ vcpkg 包管理器

**不需要：**
- ❌ C++ ATL
- ❌ C++ MFC
- ❌ C++/CLI 支持
- ❌ C++ 模块
- ❌ C++ Clang 工具

### 4. 开始安装

点击"安装"按钮，等待安装完成（可能需要 10-30 分钟）。

### 5. 验证安装

安装完成后，**重启终端**，运行：

```bash
where link.exe
```

应该看到类似输出：
```
C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.xx.xxxxx\bin\Hostx64\x64\link.exe
```

---

## 第四步：配置 Rust 国内镜像（可选，加速下载）

项目已配置好 `.cargo/config.toml`，使用 USTC 镜像加速依赖下载。

如果需要手动配置，创建或编辑 `%USERPROFILE%\.cargo\config.toml`：

```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"
```

---

## 第五步：安装项目依赖

进入项目目录：

```bash
cd E:\Project\AI-Code\Neat-Reader
```

安装依赖：

```bash
npm install
```

这会自动安装：
- 根目录的依赖（包括 `@tauri-apps/cli`）
- `frontend/` 的 Vue 3 依赖
- `backend/` 的 Express 依赖

---

## 第六步：启动开发环境

### 使用启动脚本（推荐）

```bash
start-tauri-dev.bat
```

脚本会自动检查：
- Rust 是否安装
- MSVC 链接器是否可用
- 然后启动 Tauri 开发环境

### 或手动启动

```bash
npm run dev
```

### 首次编译说明

首次运行会编译 Tauri 的 Rust 依赖，可能需要 **10-30 分钟**。后续启动会快很多（1-2 分钟）。

---

## 开发服务器

启动成功后，会自动打开应用窗口：

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend (Vite) | 5173 | Vue 3 开发服务器 |
| Backend (Express) | 3001 | API 服务器 |
| Tauri | - | 桌面应用窗口 |

---

## 常用命令

```bash
# 启动开发环境
npm run dev

# 构建生产版本
npm run build:tauri

# 仅构建 Windows 版本
npm run build:tauri:win

# 前端类型检查
cd frontend && npm run typecheck

# 后端开发模式
cd backend && npm run dev
```

---

## 常见问题

### 问题 1：`cargo` 命令不存在

**原因：** Rust 未安装或未设置默认工具链。

**解决：**
```bash
rustup default stable
```

### 问题 2：`link.exe` not found

**原因：** 未安装 Visual Studio Build Tools 或未选择 C++ 工作负载。

**解决：** 按照第三步重新安装，确保勾选 "使用 C++ 的桌面开发"。

### 问题 3：npm 安装依赖失败

**原因：** 网络问题或版本不匹配。

**解决：**
```bash
# 清除缓存
npm cache clean --force

# 重新安装
npm install
```

### 问题 4：首次编译太慢

**原因：** Tauri 需要编译大量 Rust 依赖。

**解决：** 这是正常现象，耐心等待。已配置国内镜像会加速下载。后续编译会快很多。

### 问题 5：端口被占用

**原因：** 5173 或 3001 端口被其他程序占用。

**解决：**
```bash
# 查看端口占用
netstat -ano | findstr :5173
netstat -ano | findstr :3001

# 结束进程（替换 PID）
taskkill /PID <进程ID> /F
```

---

## 开发工具推荐

- **VS Code** - 代码编辑器
  - 插件：Vue - Official, Rust Analyzer, Tauri
- **Chrome DevTools** - 前端调试（按 F12）
- **Rust Analyzer** - Rust 代码智能提示

---

## 下一步

环境搭建完成后，可以：

1. 查看 `README.md` 了解项目结构
2. 查看 `.kiro/steering/structure.md` 了解架构设计
3. 查看 `.kiro/steering/tech.md` 了解技术栈
4. 开始开发功能

---

## 技术支持

如遇到其他问题，请检查：

- Rust 官方文档：https://www.rust-lang.org/
- Tauri 官方文档：https://tauri.app/
- Vue 3 官方文档：https://vuejs.org/
- 项目 Issues：（如有 GitHub 仓库）

---

**祝开发顺利！** 🚀
