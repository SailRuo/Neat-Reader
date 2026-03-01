# Tauri 迁移状态

## 已完成 ✅

### 基础架构
- ✅ Rust 环境配置
- ✅ Visual Studio Build Tools 检测
- ✅ Tauri CLI 安装
- ✅ 前端 API 适配（从 axios 改为 invoke）

### 百度网盘集成
- ✅ OAuth 授权窗口（`open_auth_window`）
- ✅ Token 管理（获取、刷新、验证）
- ✅ 文件操作（列表、搜索、下载、上传）
- ✅ 前端 API 调用适配

### 文件系统
- ✅ 打开目录选择器
- ✅ 读取文件
- ✅ 写入文件
- ✅ 打开文件选择器

### TTS
- ✅ 语音合成
- ✅ 语音列表

## 待完成 ⏳

### 千问 AI 集成

**当前状态：** 
- ✅ 基础聊天 API（`qwen_chat`）
- ✅ 模型列表 API（`qwen_list_models`）
- ❌ OAuth Device Code Flow（未实现）

**问题：**
前端使用 Device Code Flow 授权，需要后端实现以下 API：
1. `startDeviceAuth()` - 启动设备码授权
2. `pollForToken()` - 轮询获取 token
3. `refreshToken()` - 刷新 token

**解决方案：**

**方案 A：实现完整 OAuth（推荐）**
在 `src-tauri/src/commands/qwen.rs` 中添加：
```rust
#[tauri::command]
pub async fn qwen_start_device_auth() -> Result<DeviceAuthResponse, String>

#[tauri::command]
pub async fn qwen_poll_token(session_id: String) -> Result<PollResponse, String>

#[tauri::command]
pub async fn qwen_refresh_token(refresh_token: String) -> Result<TokenResponse, String>
```

参考 Express 后端实现：`backend/src/services/qwenService.js`

**方案 B：简化为 API Key（快速方案）**
1. 修改前端设置页面，改为输入 API Key
2. 使用 API Key 直接调用千问 API
3. 不需要 OAuth 流程

## 测试状态

### 可测试功能
- ✅ 百度网盘授权（点击"获取授权"会弹出窗口）
- ✅ 文件系统操作
- ✅ TTS 语音合成

### 待测试功能
- ⏳ 千问 AI 聊天（需要先解决 OAuth）
- ⏳ EPUB 阅读器（需要测试 iframe 渲染）
- ⏳ PDF 阅读器

## 开发命令

```bash
# 启动开发环境
npm run dev

# 构建生产版本
npm run build:tauri

# 仅构建 Windows 版本
npm run build:tauri:win
```

## 已知问题

1. **千问授权不可用** - 需要实现 Device Code Flow 或改用 API Key
2. **浏览器测试不可用** - Tauri 只能在桌面端运行
3. **首次编译慢** - Rust 依赖编译需要 10-30 分钟（正常现象）

## 下一步工作

### 优先级 P0（必须完成）
1. 实现千问 OAuth 或改用 API Key
2. 测试 EPUB/PDF 阅读器功能
3. 测试百度网盘文件下载和导入

### 优先级 P1（重要）
1. 完善错误处理和用户提示
2. 添加加载状态和进度提示
3. 优化首次启动体验

### 优先级 P2（可选）
1. 添加自动更新功能
2. 优化应用图标和启动画面
3. 添加快捷键支持

## 参考文档

- Tauri 官方文档：https://tauri.app/
- 百度网盘 API：https://pan.baidu.com/union/doc/
- 千问 API：https://help.aliyun.com/zh/dashscope/
- RFC 8628 (Device Code Flow)：https://tools.ietf.org/html/rfc8628
