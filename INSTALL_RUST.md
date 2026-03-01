# Rust 安装指南 (Windows)

## 方法 1: 使用 winget (推荐)

打开 PowerShell 或 CMD，运行：

```bash
winget install Rustlang.Rustup
```

## 方法 2: 手动下载安装

1. 访问 https://rustup.rs/
2. 下载 `rustup-init.exe`
3. 运行安装程序，按提示操作
4. 选择默认安装选项（按 1 然后回车）

## 安装后验证

重启终端后运行：

```bash
cargo --version
rustc --version
```

应该看到版本号输出，例如：
```
cargo 1.75.0
rustc 1.75.0
```

## 安装 Visual Studio Build Tools (Windows 必需)

Rust 在 Windows 上需要 MSVC 链接器。

**方法 1: 使用 winget (推荐)**

```bash
winget install Microsoft.VisualStudio.2022.BuildTools
```

安装时选择 "Desktop development with C++" 工作负载。

**方法 2: 手动下载**

1. 访问 https://visualstudio.microsoft.com/downloads/
2. 下载 "Build Tools for Visual Studio 2022"
3. 运行安装程序
4. 选择 "Desktop development with C++" 工作负载
5. 确保勾选：
   - MSVC v143 - VS 2022 C++ x64/x86 build tools
   - Windows 11 SDK (或 Windows 10 SDK)

**方法 3: 完整 Visual Studio (如果需要 IDE)**

```bash
winget install Microsoft.VisualStudio.2022.Community
```

同样选择 "Desktop development with C++" 工作负载。

**验证安装：**

重启终端后运行：

```bash
where link.exe
```

应该看到类似输出：
```
C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.xx.xxxxx\bin\Hostx64\x64\link.exe
```

## 配置国内镜像（可选，加速下载）

创建或编辑 `%USERPROFILE%\.cargo\config.toml`：

```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"
```

# Tauri CLI via npm (recommended)
npm install

# Or install globally via cargo (alternative)
cargo install tauri-cli --version "^2.0.0"


## 安装 Tauri CLI

项目已配置使用 npm 版本的 Tauri CLI（推荐）：

```bash
npm install
```

这会自动安装 `@tauri-apps/cli` 到 devDependencies。

## 启动开发环境

```bash
start-tauri-dev.bat
```

或直接运行：

```bash
npm run dev
```

## 常见问题

### 问题：`cargo tauri` 命令不存在

解决方案：使用 npm 脚本而不是直接调用 cargo：
- ✅ `npm run dev` 
- ❌ `cargo tauri dev`

### 问题：编译速度慢

首次编译 Tauri 会下载并编译大量依赖，可能需要 10-30 分钟。后续编译会快很多。

使用国内镜像加速（已配置在 `.cargo/config.toml`）：
- USTC 镜像：https://mirrors.ustc.edu.cn/crates.io-index/
