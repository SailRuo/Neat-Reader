# Tauri Configuration Quick Reference

## 🎯 Quick Start

### Current Configuration Status

✅ **Configured**:
- Application metadata (name, version, identifier)
- Window properties (1200x800, resizable, centered)
- Security permissions (file system, HTTP, dialogs)
- Build system (Vite integration)
- Windows bundle settings (MSI, WebView2)

⚠️ **Action Required**:
- Generate icon files (see below)
- Consider window size adjustment to match Electron

---

## 🚀 Essential Commands

```bash
# Development
npm run tauri dev              # Start Tauri dev mode

# Build
npm run tauri build            # Build for current platform
npm run tauri build -- --target x86_64-pc-windows-msvc  # Windows 64-bit

# Icon Generation (REQUIRED before first build)
npm install -g @tauri-apps/cli
tauri icon build/appicon.png   # Generate all icon formats
```

---

## 📋 Configuration File Location

**File**: `src-tauri/tauri.conf.json`

**Key Sections**:
- `build` - Build commands and paths
- `package` - App name and version
- `tauri.allowlist` - Security permissions
- `tauri.bundle` - Bundle settings (icons, identifier)
- `tauri.windows` - Window configuration
- `tauri.security` - Content Security Policy

---

## 🔒 Security Permissions (Allowlist)

### Enabled APIs

| API | Purpose | Scope |
|-----|---------|-------|
| **dialog** | File/directory picker | All dialog types |
| **fs** | File operations | `$APPDATA`, `$DOCUMENT`, `$DOWNLOAD`, `$HOME` |
| **http** | Network requests | Baidu, Qwen, OAuth domains only |
| **shell** | Open URLs | Browser only (no command execution) |
| **window** | Window management | All window operations |

### Adding New Permissions

**Example**: Allow access to a new directory
```json
{
  "fs": {
    "scope": [
      "$APPDATA/*",
      "$DOCUMENT/*",
      "$DOWNLOAD/*",
      "$HOME/*",
      "$TEMP/*"  // ← Add new scope
    ]
  }
}
```

**Example**: Allow requests to a new API domain
```json
{
  "http": {
    "scope": [
      "https://openapi.baidu.com/*",
      "https://pan.baidu.com/*",
      "https://dashscope.aliyuncs.com/*",
      "https://alistgo.com/*",
      "https://api.example.com/*"  // ← Add new domain
    ]
  }
}
```

---

## 🪟 Window Configuration

### Current Settings

```json
{
  "width": 1200,
  "height": 800,
  "minWidth": 800,
  "minHeight": 600,
  "resizable": true,
  "center": true,
  "title": "Neat Reader"
}
```

### Electron Comparison

| Property | Tauri | Electron | Match? |
|----------|-------|----------|--------|
| Width | 1200 | 1440 | ⚠️ Different |
| Height | 800 | 900 | ⚠️ Different |
| Min Width | 800 | 1024 | ⚠️ Different |
| Min Height | 600 | 768 | ⚠️ Different |

**To match Electron exactly**, update `tauri.conf.json`:
```json
{
  "windows": [{
    "width": 1440,
    "height": 900,
    "minWidth": 1024,
    "minHeight": 768
  }]
}
```

---

## 🎨 Icon Requirements

### Required Files

| Platform | File | Size | Status |
|----------|------|------|--------|
| Windows | `icon.ico` | Multi-size | ⚠️ **TODO** |
| macOS | `icon.icns` | Multi-size | ⚠️ **TODO** |
| Linux | `32x32.png` | 32x32 | ⚠️ **TODO** |
| Linux | `128x128.png` | 128x128 | ⚠️ **TODO** |
| Linux | `128x128@2x.png` | 256x256 | ⚠️ **TODO** |

### Generate Icons

```bash
# Install Tauri CLI globally
npm install -g @tauri-apps/cli

# Generate all icon formats from source image
tauri icon build/appicon.png

# Output: src-tauri/icons/
# - 32x32.png
# - 128x128.png
# - 128x128@2x.png
# - icon.icns (macOS)
# - icon.ico (Windows)
```

**Source Image Requirements**:
- Format: PNG with transparency
- Size: 1024x1024 or larger
- Square aspect ratio
- High quality (will be scaled down)

---

## 📦 Bundle Configuration

### Application Identifier

```json
{
  "bundle": {
    "identifier": "com.neatreader.app"
  }
}
```

**Format**: Reverse domain notation (e.g., `com.company.app`)
**Rules**:
- Must be unique
- Use lowercase
- No spaces or special characters
- Cannot change after first release (affects updates)

### Bundle Targets

```json
{
  "bundle": {
    "targets": "all"
  }
}
```

**Options**:
- `"all"` - All available formats for platform
- `"msi"` - Windows MSI installer only
- `"nsis"` - Windows NSIS installer only
- `"deb"` - Linux DEB package only
- `"appimage"` - Linux AppImage only
- `"dmg"` - macOS DMG only

### WebView2 Installation Mode

```json
{
  "windows": {
    "webviewInstallMode": {
      "type": "downloadBootstrapper"
    }
  }
}
```

**Options**:

| Mode | Bundle Size | Internet Required | Use Case |
|------|-------------|-------------------|----------|
| `downloadBootstrapper` | ~5MB | Yes (if WebView2 missing) | **Current** - Most users have WebView2 |
| `embedBootstrapper` | ~10MB | No | Offline installation |
| `fixedRuntime` | ~150MB | No | Guaranteed compatibility |
| `skip` | ~3MB | N/A | Enterprise (WebView2 pre-installed) |

---

## 🔐 Content Security Policy (CSP)

### Current Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://openapi.baidu.com https://pan.baidu.com https://dashscope.aliyuncs.com https://alistgo.com
```

### Why `'unsafe-inline'` and `'unsafe-eval'`?

Required for EPUB and PDF rendering:
- **epub.js**: Uses `eval()` for dynamic content
- **pdf.js**: Uses inline scripts for workers
- **foliate-js**: Uses inline styles for formatting

### Adding New API Domain

Update both `http.scope` and CSP `connect-src`:

```json
{
  "http": {
    "scope": ["https://api.example.com/*"]
  },
  "security": {
    "csp": "... connect-src 'self' ... https://api.example.com"
  }
}
```

---

## 🧪 Testing Configuration

### Development Testing

```bash
# Start dev mode
npm run tauri dev

# Verify:
# ✓ Window opens at correct size
# ✓ Window is centered
# ✓ Window is resizable
# ✓ Title shows "Neat Reader"
# ✓ Frontend loads from localhost:5173
```

### Build Testing

```bash
# Build for Windows
npm run tauri build

# Verify:
# ✓ Build completes without errors
# ✓ Output in src-tauri/target/release/bundle/
# ✓ MSI installer created
# ✓ Installer size < 20MB
```

### Security Testing

```bash
# Test in dev mode:
# ✓ Can open file picker
# ✓ Can read/write files in allowed scopes
# ✓ Can make HTTP requests to whitelisted domains
# ✗ Cannot access system directories
# ✗ Cannot make requests to non-whitelisted domains
# ✗ Cannot execute shell commands
```

---

## 🐛 Common Issues

### Issue: Icons not found
```
Error: Icon file not found: icons/icon.ico
```
**Fix**: Run `tauri icon build/appicon.png`

---

### Issue: HTTP request blocked
```
Error: Request blocked by CSP
```
**Fix**: Add domain to `http.scope` and CSP `connect-src`

---

### Issue: File access denied
```
Error: Access denied: /path/to/file
```
**Fix**: Ensure path is in allowed scope (`$APPDATA`, `$DOCUMENT`, etc.)

---

### Issue: WebView2 not found
```
Error: WebView2 runtime not found
```
**Fix**: 
- Ensure `webviewInstallMode.type` is `downloadBootstrapper`
- Or install WebView2 manually: https://go.microsoft.com/fwlink/p/?LinkId=2124703

---

## 📚 Key Differences: Electron vs Tauri

| Aspect | Electron | Tauri |
|--------|----------|-------|
| **Config File** | `package.json` + `electron-builder.json` | `tauri.conf.json` |
| **Backend** | Node.js (separate process) | Rust (compiled in) |
| **IPC** | `ipcMain`/`ipcRenderer` | `invoke`/`emit` |
| **Security** | Manual setup | Built-in allowlist |
| **Bundle Size** | ~150MB | ~10-15MB |
| **Memory** | ~200-300MB | ~50-100MB |

---

## 🔗 Quick Links

- [Full Documentation](./TAURI-CONFIG-DOCUMENTATION.md)
- [Tauri Config Reference](https://tauri.app/v1/api/config/)
- [Tauri Security Guide](https://tauri.app/v1/guides/security/)
- [WebView2 Download](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

---

## ✅ Pre-Build Checklist

Before building for production:

- [ ] Generate icon files (`tauri icon build/appicon.png`)
- [ ] Update version in `tauri.conf.json`
- [ ] Update version in `Cargo.toml`
- [ ] Add copyright notice in bundle config
- [ ] Test on clean Windows system
- [ ] Verify all APIs work correctly
- [ ] Check bundle size (< 20MB target)
- [ ] Test installer on clean system

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2024
**Related Task**: 22.1 配置 tauri.conf.json
