# Neat Reader（Tauri + Python Sidecar）开发 / 打包指南（Windows）

本项目包含：

- **前端**：`frontend/`（Vue + Vite）
- **Tauri 主程序**：`frontend/src-tauri/`（Rust）
- **Python 后端（sidecar）**：`python-backend/`（FastAPI + Uvicorn，经 PyInstaller 打包为 exe）

本文档说明：

- 开发模式如何启动
- 后端/前端分别如何构建
- 如何打包成安装包（NSIS/MSI）
- 常见打包坑（本仓库已遇到的）

---

## 0. 环境要求

- **Node.js**：建议 18+
- **Rust**：与 `frontend/src-tauri/Cargo.toml` 中 `rust-version` 对齐（本项目为 `1.77.2`）
- **Python**：需要能运行 `python-backend/`（并已安装依赖）
- **Tauri CLI**：在 `frontend/package.json` 中（`@tauri-apps/cli`）
- **Windows WebView2 Runtime**：Tauri 在 Windows 依赖它

---

## 1. 安装依赖（一次性）

### 1.1 Node 依赖

- 根目录：

```bat
npm install
```

或使用项目自带脚本：

```bat
install.bat
```

### 1.2 Python 依赖

在根目录执行：

```bat
start_backend.bat
```

该脚本会自动检查并安装 `python-backend/requirements.txt`。

---

## 2. 开发模式启动

### 2.1 只启动 Python 后端（FastAPI）

```bat
start_backend.bat
```

默认会监听 `http://localhost:3002`（以 `python-backend/app/config` 实际配置为准）。

### 2.2 只启动前端（Vite）

```bat
start_frontend.bat
```

默认 `http://localhost:5173`。

### 2.3 启动 Tauri 开发模式（推荐）

在 `frontend/` 目录执行：

```bat
npm run tauri:dev
```

说明：

- `tauri:dev` 会根据 `frontend/src-tauri/tauri.conf.json`：
  - 先跑 `beforeDevCommand`（`npm run dev`，即 Vite）
  - 然后启动 Tauri 壳程序
- 本项目 Tauri 启动时会尝试拉起 sidecar：`backend`（Python 后端 exe）。

---

## 3. 后端（Python sidecar）如何打包

### 3.1 产物位置（重要）

Python sidecar 的输出目录固定为：

- `frontend/src-tauri/binaries/`

文件名为（与 CPU 架构有关）：

- `backend-x86_64-pc-windows-msvc.exe`

Tauri 打包时通过 `frontend/src-tauri/tauri.conf.json` 的：

- `bundle.externalBin: ["binaries/backend"]`

把 `binaries/` 下匹配的 `backend-<target-triple>.exe` 带入安装包。

### 3.2 打包命令

在仓库根目录执行：

```bat
python python-backend\build_scripts.py
```

该脚本会运行 PyInstaller（`--onefile --noconsole`）。

---

## 4. 前端构建（Vite）

在 `frontend/` 目录执行：

```bat
npm run build
```

生成 `frontend/dist/`。

`tauri.conf.json` 中的 `build.frontendDist` 指向 `../dist`，即 `frontend/dist`。

---

## 5. 打包 Tauri（生成安装包）

### 5.1 打包命令

在 `frontend/` 目录执行：

```bat
npm run tauri:build
```

### 5.2 产物位置

- `frontend/src-tauri/target/release/bundle/nsis/Neat-Reader_0.1.0_x64-setup.exe`
- `frontend/src-tauri/target/release/bundle/msi/Neat-Reader_0.1.0_x64_en-US.msi`

（版本号取决于 `tauri.conf.json` 的 `version`）

---

## 6. 常见问题 / 坑位（以及本项目对应处理）

### 6.1 Tauri 启动“无反应/闪退”

排查方式：

- 用 PowerShell 启动 `frontend/src-tauri/target/release/app.exe` 看是否立刻退出

本项目已在 `frontend/src-tauri/src/lib.rs` 增加了诊断输出（写到 `%TEMP%\neat-reader-tauri-diagnostic.log`），用于定位启动阶段错误。

### 6.2 `tauri-plugin-shell` 配置字段不匹配导致无法启动

现象：

- `unknown field 'scope', expected 'open'`

解决：

- 不要在 `tauri.conf.json` 里使用旧版 `plugins.shell.scope`
- 使用 `capabilities/default.json` 里的权限（本项目已配置：`shell:allow-execute`、`shell:allow-spawn`）

### 6.3 Python sidecar 在 `--noconsole` 下 `sys.stdout/sys.stderr` 为 None

现象：

- loguru：`Cannot log to objects of type 'NoneType'`
- uvicorn：`'NoneType' object has no attribute 'isatty'`

解决：

- `python-backend/main.py` 已加入兜底：为 `sys.stdout/sys.stderr` 提供可用 stream
- 并在 `uvicorn.run(..., log_config=None)` 禁用 uvicorn 默认 log config

### 6.4 `tauri build` 报 `PermissionDenied (code 5)`

常见原因：

- `backend-*.exe` 或 `app.exe` 正在运行，被 Windows 占用
- 杀毒/Defender 正在扫描/锁定该 exe

解决：

- 关闭相关进程后再 `tauri:build`
- 必要时将项目目录加入 Defender 排除项

---

## 7. 一键打包（推荐用脚本）

请使用根目录的 `build_tauri.bat`（由本仓库提供）：

- 先打包 Python 后端 sidecar
- 再打包 Tauri 安装包
- 并提示最终产物目录
