# ⚠️ REBUILD REQUIRED

## The Problem

The console logs show the browser is running **old cached code**:
```
FoliateReader.vue:723   - view.value?.renderer: 存在
FoliateReader.vue:733   - shadowRoot: 不存在
FoliateReader.vue:744 📄 [TTS] 在 renderer 中找到 0 个 iframe
```

But the actual source code at line 723 is now:
```typescript
console.log('  - 已缓存章节数:', loadedDocs.value.size)
```

This means the **frontend needs to be rebuilt** to apply the fixes.

## All Fixes Are Complete

✅ **Font size changes** - Now uses cached documents
✅ **Line height changes** - Now uses cached documents  
✅ **TTS text extraction** - Now uses cached chapter text
✅ **Progress restoration** - Improved timing with retries

## How to Apply the Fixes

### Option 1: Full Rebuild (Recommended)
```bash
cd frontend
npm run build
cd ..
npm run build
```

### Option 2: Dev Mode (For Testing)
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev

# Terminal 3: Electron
npm run dev:electron
```

### Option 3: Quick Frontend Only
```bash
cd frontend
npm run build
```

Then restart the Electron app.

## What Changed

### 1. Document Caching in `handleLoad()`
```typescript
const handleLoad = (doc: Document, index: number) => {
  // Cache the document object
  loadedDocs.value.set(index, doc)
  
  // Cache the text content
  const bodyText = doc.body?.innerText || doc.body?.textContent || ''
  if (bodyText.trim()) {
    currentChapterTexts.value.set(index, bodyText.trim())
  }
  // ... rest of the function
}
```

### 2. New `getCurrentPageText()` Using Cache
```typescript
const getCurrentPageText = (): string => {
  // Try cached text first (fastest)
  const cachedText = currentChapterTexts.value.get(currentChapterIndex.value)
  if (cachedText) {
    return cachedText
  }
  
  // Fallback to document object
  const doc = loadedDocs.value.get(currentChapterIndex.value)
  if (doc) {
    const bodyText = doc.body?.innerText || doc.body?.textContent || ''
    return bodyText.trim()
  }
  
  return ''
}
```

### 3. New `updateAllIframeStyles()` Using Cache
```typescript
const updateAllIframeStyles = () => {
  // Use cached documents instead of searching for iframes
  loadedDocs.value.forEach((doc, index) => {
    const styleEl = doc.getElementById('neat-reader-foliate-style')
    if (styleEl) {
      styleEl.textContent = `
        html, body {
          font-size: ${props.fontSize}px !important;
          line-height: ${props.lineHeight} !important;
        }
        // ... other styles
      `
    }
  })
}
```

### 4. Retry Mechanism in Parent Component
```typescript
const updateCurrentPageText = (retryCount = 0) => {
  const text = reader.getCurrentPageText()
  
  // Retry if text is empty (chapter not loaded yet)
  if (!text && retryCount < 3) {
    setTimeout(() => {
      updateCurrentPageText(retryCount + 1)
    }, 500)
    return
  }
  
  currentPageText.value = text
}
```

## Expected Behavior After Rebuild

### Font Size Changes
- ✅ Changes apply immediately to all loaded chapters
- ✅ No "未找到任何 iframe" warnings
- ✅ Logs show: "共更新 X 个章节"

### Line Height Changes  
- ✅ Changes apply immediately to all loaded chapters
- ✅ No "未找到任何 iframe" warnings
- ✅ Logs show: "共更新 X 个章节"

### TTS Text Extraction
- ✅ Text is extracted from cached chapter content
- ✅ Logs show: "使用缓存的章节文本，长度: XXXX"
- ✅ No "在 renderer 中找到 0 个 iframe" messages

### Progress Restoration
- ✅ Progress restores correctly on book open
- ✅ Text becomes available after short delay
- ✅ Retry mechanism handles timing issues

## Verification Steps

After rebuilding, open the reader and check the console:

1. **On page load:**
   ```
   📄 [章节加载] 0
   📝 [章节文本] 章节 0 文本长度: XXXX
   ```

2. **When changing font size:**
   ```
   📏 [字号变化] 18 → 20
   🔄 [样式更新] 开始更新所有已加载的章节
   ✅ [样式更新] 章节 0 已更新 (字号:20, 行高:1.5)
   ✅ [样式更新] 共更新 1 个章节
   ```

3. **When opening TTS:**
   ```
   🔊 [TTS] 打开 TTS 侧边栏，更新文本
   🔍 [TTS] 开始获取页面文本
     - 当前章节索引: 0
     - 已缓存章节数: 1
   ✅ [TTS] 使用缓存的章节文本，长度: XXXX 前50字: ...
   ```

## Files Modified

- ✅ `frontend/src/pages/Reader/components/FoliateReader.vue`
- ✅ `frontend/src/pages/Reader/index.vue`
- ✅ `docs/FOLIATE_READER_FIXES.md` (documentation)

## Next Steps

1. **Rebuild the frontend** using one of the options above
2. **Restart the Electron app**
3. **Test all features:**
   - Font size adjustment
   - Line height adjustment
   - TTS text reading
   - Progress restoration
4. **Verify console logs** match the expected behavior

The code is ready - it just needs to be compiled and run! 🚀
