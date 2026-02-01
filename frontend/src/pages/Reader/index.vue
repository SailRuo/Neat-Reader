<template>
  <div class="reader-master" :class="[`theme-${theme}`, { 'controls-visible': showControls }]" @wheel="handleWheel" @click="handleReaderClick">
    <!-- 全局加载动画 -->
    <transition name="fade">
      <div v-if="loading" class="global-loader">
        <div class="loader-content">
          <div class="pulse-ring"></div>
          <p>正在精心排版中...</p>
        </div>
      </div>
    </transition>

    <!-- 顶部导航栏 -->
    <transition name="slide-down">
      <nav v-show="showControls" class="glass-bar top-bar">
        <div class="bar-section left">
          <button class="btn-icon" @click="goBack" title="退出阅读">
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
          </button>
          <div class="book-meta">
            <span class="book-title">{{ book?.title || '未知书籍' }}</span>
            <div class="meta-details">
              <span class="chapter-badge">{{ currentChapterTitle }}</span>
              <span class="reading-stats">
                <span class="stat-item">{{ readingTime }}分钟</span>
                <span class="stat-divider">·</span>
                <span class="stat-item">{{ displayProgress }}%</span>
              </span>
            </div>
          </div>
        </div>
        <div class="bar-section right">
          <div class="quick-actions-header">
            <button class="btn-icon" @click="openSidebar('notes')" title="笔记列表">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>
            </button>
            <button class="btn-icon" @click="exportNotes" title="导出笔记">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </button>
            <button class="btn-icon" @click="toggleBookmark" :title="isBookmarked ? '取消书签' : '添加书签'">
              <svg v-if="!isBookmarked" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>
            </button>
            <button class="btn-icon" @click="openSidebar('search')" title="搜索">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            <button class="btn-icon" @click="openSidebar('contents')" title="目录">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
            </button>
            <button class="btn-icon" @click="openSidebar('settings')" title="设置">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            </button>
          </div>
        </div>
      </nav>
    </transition>

    <!-- 主阅读区域 -->
    <main class="reader-viewport" ref="viewportRef">
      <!-- EPUB渲染 -->
      <div v-if="book?.format === 'epub'" id="epub-render-root" class="render-layer"></div>

      <!-- PDF渲染 -->
      <div v-else-if="book?.format === 'pdf'" class="render-layer pdf-container" @click="toggleControls">
        <canvas ref="pdfCanvas" class="pdf-canvas"></canvas>
      </div>

      <!-- 翻译模式遮罩层 -->
      <transition name="fade">
        <div v-if="translationMode && translationText" class="translation-overlay">
          <div class="translation-content">
            <div class="translation-header">
              <span class="translation-label">翻译</span>
              <button class="btn-icon small" @click="translationMode = false">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <div class="translation-body">{{ translationText }}</div>
            <div class="translation-footer">
              <select v-model="translationLang" class="lang-select">
                <option value="en">英语</option>
                <option value="ja">日语</option>
                <option value="ko">韩语</option>
                <option value="fr">法语</option>
                <option value="de">德语</option>
              </select>
              <button class="btn-text small" @click="copyTranslation">复制</button>
            </div>
          </div>
        </div>
      </transition>

      <!-- 常驻进度指示器 -->
      <div class="persistent-info">
        <div class="progress-indicator" @click="toggleProgressPopup">
          <span class="progress-text">
            {{ displayProgress }}%
            <span v-if="pageMode === 'page' && book?.format === 'pdf'">
              · {{ currentPdfPage }}/{{ totalPdfPages }}
            </span>
            <span v-else-if="pageMode === 'page'">
              · {{ currentPage }}/{{ totalPages }}
            </span>
          </span>
        </div>
      </div>

      <!-- 交互热区 -->
      <div class="interaction-layer"></div>

      <!-- 文本选中悬浮菜单 -->
      <transition name="fade">
        <div v-if="showSelectionMenu" class="selection-menu" :style="selectionMenuStyle">
          <button class="selection-btn" @click.stop="addNote">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>
            <span>添加笔记</span>
          </button>
          <button class="selection-btn" @click.stop="translateSelectedText">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
            <span>翻译</span>
          </button>
        </div>
      </transition>
    </main>

    <!-- 底部控制栏 -->
    <transition name="slide-up">
      <footer v-show="showControls" class="glass-bar bottom-bar">
        <div class="bottom-layout">
          <!-- 进度条 -->
          <div class="progress-slider-wrapper">
            <div class="progress-labels">
              <span class="label">阅读进度</span>
              <span class="value">{{ displayProgress }}%</span>
            </div>
            <input 
              type="range" 
              v-model="displayProgress" 
              min="0" 
              max="100" 
              @input="onSliderInput"
              @change="onSliderChange"
              class="ios-slider"
            />
            <div class="chapter-progress" v-if="book?.format === 'pdf'">
              第 {{ currentPdfPage }} / {{ totalPdfPages }} 页
            </div>
            <div class="chapter-progress" v-else>
              第 {{ currentChapterIndex + 1 }} / {{ chapters.length }} 章
            </div>
          </div>

          <!-- 快速操作区 -->
          <div class="quick-actions">
            <!-- 主题切换 -->
            <div class="theme-switcher">
              <div class="section-label">主题</div>
              <div class="theme-options">
                <button 
                  v-for="(config, key) in themeConfig" 
                  :key="key"
                  :class="['theme-option', key, { active: theme === key }]"
                  @click="setTheme(key)"
                  :title="config.name"
                >
                  <div class="theme-preview" :style="{ backgroundColor: config.bg }"></div>
                  <span class="theme-name">{{ config.name }}</span>
                </button>
              </div>
            </div>

            <!-- 字号调整 -->
            <div class="font-control">
              <div class="section-label">字号</div>
              <div class="font-stepper">
                <button @click="changeFontSize(-1)" :disabled="fontSize <= 12">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
                <div class="font-size-display">{{ fontSize }}px</div>
                <button @click="changeFontSize(1)" :disabled="fontSize >= 30">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
              </div>
            </div>

            <!-- 阅读模式 -->
            <div class="mode-switcher">
              <div class="section-label">模式</div>
              <div class="mode-options">
                <button 
                  :class="['mode-option', { active: pageMode === 'page' }]"
                  @click="switchPageMode('page')"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>
                  <span>翻页</span>
                </button>
                <button 
                  :class="['mode-option', { active: pageMode === 'scroll' }]"
                  @click="switchPageMode('scroll')"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                  <span>滚动</span>
                </button>
                <button 
                  :class="['mode-option', { active: translationMode }]"
                  @click="toggleTranslationMode"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
                  <span>翻译</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </transition>

    <!-- 侧边栏系统 -->
    <transition name="drawer-right">
      <aside v-if="activeSidebar" class="sidebar-system">
        <div class="sidebar-header">
          <h3>{{ sidebarTitle }}</h3>
          <button class="close-x" @click="closeSidebar">×</button>
        </div>

        <div class="sidebar-scroll-area">
          <!-- 搜索面板 -->
          <div v-if="activeSidebar === 'search'" class="panel-search">
            <div class="search-input-box">
              <input 
                v-model="searchQuery" 
                placeholder="搜索全文内容..." 
                @keyup.enter="doFullTextSearch"
                ref="searchInput"
              >
              <button @click="doFullTextSearch" :disabled="isSearching">
                {{ isSearching ? '搜索中...' : '搜索' }}
              </button>
            </div>
            
            <div class="search-filters">
              <label class="filter-option">
                <input type="checkbox" v-model="searchCaseSensitive"> 区分大小写
              </label>
              <label class="filter-option">
                <input type="checkbox" v-model="searchWholeWord"> 全词匹配
              </label>
            </div>
            
            <div class="search-results">
              <div v-if="searchResults.length > 0" class="results-count">
                找到 {{ searchResults.length }} 个结果
              </div>
              
              <div 
                v-for="(item, idx) in searchResults" 
                :key="idx" 
                class="search-item" 
                @click="jumpTo(item.cfi)"
              >
                <div class="result-chapter">{{ item.chapter }}</div>
                <p v-html="item.excerpt"></p>
                <div class="result-meta">
                  <span class="page">第 {{ item.page }} 页</span>
                </div>
              </div>
              
              <div v-if="hasSearched && searchResults.length === 0" class="empty-tip">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <p>未找到匹配项</p>
                <p class="empty-tip-sub">尝试更换关键词或调整搜索设置</p>
              </div>
            </div>
          </div>

          <!-- 目录面板 -->
          <div v-if="activeSidebar === 'contents'" class="panel-toc">
            <div class="toc-header">
              <h4>目录</h4>
              <span class="toc-count">{{ chapters.length }} 章</span>
            </div>
            
            <div class="toc-scroll-container">
              <div 
                v-for="(item, idx) in chapters" 
                :key="idx"
                :class="['toc-node', { 
                  active: currentChapterIndex === idx,
                  read: item.read
                }]"
                @click="goToChapter(item.href, idx)"
              >
                <div class="toc-node-content">
                  <div class="toc-node-title">{{ item.title }}</div>
                  <div class="toc-node-meta">
                    <span class="toc-node-pages">{{ item.pages || '--' }}页</span>
                    <span class="toc-node-progress" v-if="item.progress > 0">
                      {{ Math.round(item.progress * 100) }}%
                    </span>
                  </div>
                </div>
                <div class="toc-node-indicator">
                  <div class="progress-dot" v-if="item.progress > 0 && item.progress < 1"></div>
                  <svg v-if="item.progress === 1" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
              </div>
            </div>
          </div>

          <!-- 笔记列表面板 -->
          <div v-if="activeSidebar === 'notes'" class="panel-notes">
            <div class="notes-header">
              <h4>我的笔记</h4>
              <span class="notes-count">{{ notes.length }} 条</span>
            </div>
            
            <div v-if="notes.length === 0" class="empty-notes">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>
              <p>还没有笔记</p>
              <p class="empty-tip-sub">选中文本后点击"添加笔记"开始记录</p>
            </div>
            
            <div v-else class="notes-list">
              <div 
                v-for="note in notes" 
                :key="note.id" 
                class="note-item"
                @click="jumpToNote(note.cfi)"
              >
                <div class="note-item-header">
                  <span class="note-chapter">{{ note.chapter }}</span>
                  <span class="note-time">{{ formatNoteTime(note.timestamp) }}</span>
                </div>
                <div class="note-item-text">{{ note.text }}</div>
                <div class="note-item-content">{{ note.content }}</div>
              </div>
            </div>
          </div>

          <!-- 设置面板 -->
          <div v-if="activeSidebar === 'settings'" class="panel-settings">
            <!-- 亮度设置 -->
            <div class="settings-group">
              <div class="settings-group-header">
                <label>屏幕亮度</label>
                <span class="settings-value">{{ brightness }}%</span>
              </div>
              <input 
                type="range" 
                v-model="brightness" 
                min="10" 
                max="100" 
                class="settings-slider"
              >
            </div>
            
            <!-- 排版设置 -->
            <div class="settings-group">
              <div class="settings-group-header">
                <label>排版设置</label>
              </div>
              <div class="settings-row">
                <span>行间距</span>
                <div class="segment-ctrl">
                  <button 
                    v-for="l in [1.2, 1.5, 1.8, 2.0]" 
                    :key="l" 
                    :class="{ active: lineHeight === l }" 
                    @click="setLineHeight(l)"
                  >
                    {{ l }}
                  </button>
                </div>
              </div>
              
              <div class="settings-row">
                <span>页边距</span>
                <div class="segment-ctrl">
                  <button 
                    v-for="m in ['小', '中', '大']" 
                    :key="m" 
                    :class="{ active: margin === m }" 
                    @click="setMargin(m)"
                  >
                    {{ m }}
                  </button>
                </div>
              </div>
              
              <div class="settings-row">
                <span>对齐方式</span>
                <div class="segment-ctrl">
                  <button 
                    v-for="a in ['左对齐', '两端对齐']" 
                    :key="a" 
                    :class="{ active: alignment === a }" 
                    @click="setAlignment(a)"
                  >
                    {{ a }}
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 高级设置 -->
            <div class="settings-group">
              <div class="settings-group-header">
                <label>高级设置</label>
              </div>
              
              <div class="settings-toggle">
                <label>
                  <span>自动滚动</span>
                  <input type="checkbox" v-model="autoScroll" @change="toggleAutoScroll">
                </label>
              </div>
              
              <div class="settings-toggle">
                <label>
                  <span>翻页动画</span>
                  <input type="checkbox" v-model="pageAnimation">
                </label>
              </div>
              
              <div class="settings-toggle">
                <label>
                  <span>夜间模式定时</span>
                  <input type="checkbox" v-model="autoNightMode">
                </label>
              </div>
              
              <div class="settings-toggle" v-if="autoNightMode">
                <label>
                  <span>夜间模式时间</span>
                  <input type="time" v-model="nightModeTime">
                </label>
              </div>
            </div>
            
            <!-- 数据管理 -->
            <div class="settings-group">
              <button class="btn-settings" @click="exportReadingData">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> 导出阅读数据
              </button>
              <button class="btn-settings" @click="clearCache">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> 清除缓存
              </button>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <!-- 笔记对话框 -->
    <transition name="fade">
      <div v-if="showNoteDialog" class="note-dialog-overlay" @click="cancelNote">
        <div class="note-dialog" @click.stop>
          <div class="note-dialog-header">
            <h3>添加笔记</h3>
            <button class="close-x" @click="cancelNote">×</button>
          </div>
          <div class="note-dialog-body">
            <div class="selected-text">
              <div class="label">选中文本</div>
              <p>{{ currentNoteText }}</p>
            </div>
            <div class="note-content">
              <div class="label">笔记内容</div>
              <textarea 
                v-model="currentNoteContent" 
                placeholder="输入你的笔记..."
                rows="4"
                ref="noteInput"
              ></textarea>
            </div>
          </div>
          <div class="note-dialog-footer">
            <button class="btn-secondary" @click="cancelNote">取消</button>
            <button class="btn-primary" @click="saveNote(currentNoteContent)">保存</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 亮度遮罩层 -->
    <div class="brightness-overlay" :style="{ opacity: (100 - brightness) / 100 }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ePub from 'epubjs'
import * as pdfjsLib from 'pdfjs-dist'
import localforage from 'localforage'
import { useEbookStore } from '../../stores/ebook'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const route = useRoute()
const router = useRouter()
const ebookStore = useEbookStore()

// --- 状态变量 ---
const loading = ref(true)
const showControls = ref(true)
const isSavingProgress = ref(false)
const isLocationsReady = ref(false)
const activeSidebar = ref<'search' | 'contents' | 'settings' | 'notes' | null>(null)
const theme = ref<'light' | 'sepia' | 'dark' | 'green'>('light')
const fontSize = ref(18)
const lineHeight = ref(1.5)
const brightness = ref(100)
const pageMode = ref<'page' | 'scroll'>('page')
const margin = ref('中')
const alignment = ref('两端对齐')
const autoScroll = ref(false)
const pageAnimation = ref(true)
const autoNightMode = ref(false)
const nightModeTime = ref('22:00')

// 版式参数跟踪
let lastLayoutParams = {
  margin: margin.value,
  fontSize: fontSize.value,
  lineHeight: lineHeight.value,
  alignment: alignment.value
}

// 书籍相关
const book = ref<any>(null)
const chapters = ref<any[]>([])
const currentChapterIndex = ref(0)
const currentChapterTitle = ref('正在载入...')
const currentPage = ref(1)
const totalPages = ref(0)
const readingProgress = ref(0)
const displayProgress = ref(0)
const readingTime = ref(0)

// 翻译相关
const translationMode = ref(false)
const translationText = ref('')
const translationLang = ref('en')
const translationPending = ref(false)

// 书签相关
const isBookmarked = ref(false)
const bookmarks = ref<any[]>([])

// 笔记相关
const notes = ref<any[]>([])
const showNoteDialog = ref(false)
const currentNoteText = ref('')
const currentNoteContent = ref('')
const currentNoteCfi = ref('')
const currentNoteChapter = ref('')
const showSelectionMenu = ref(false)
const selectionMenuStyle = ref({ top: '0px', left: '0px' })
const isDragging = ref(false)
const mouseDownPos = ref({ x: 0, y: 0 })

// 搜索相关
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)
const searchCaseSensitive = ref(false)
const searchWholeWord = ref(false)

// 实例引用
const rendition = ref<any>(null)
const bookInstance = ref<any>(null)
const searchInput = ref<HTMLElement | null>(null)
const pdfCanvas = ref<HTMLCanvasElement | null>(null)

// PDF 渲染相关
const pdfDoc = ref<any>(null)
const currentPdfPage = ref(1)
const totalPdfPages = ref(0)
const pdfScale = ref(1.5)

// 滚动模式相关
const nextChapterRendition = ref<any>(null)
const prevChapterRendition = ref<any>(null)
const isScrollModeActive = ref(false)
const observer = ref<IntersectionObserver | null>(null)
const nextChapterTrigger = ref<HTMLElement | null>(null)
const prevChapterTrigger = ref<HTMLElement | null>(null)

// 性能优化
let autoScrollTimer: number | null = null
const AUTO_SCROLL_INTERVAL = 50
const isChapterSwitching = ref(false)
const loadingNext = ref(false)
let wheelDebounceTimer: number | null = null
let lastWheelTime = 0
const WHEEL_DEBOUNCE_DELAY = 150
const WHEEL_THRESHOLD = 10

// 主题配置
const themeConfig = {
  light: { name: '明亮', bg: '#ffffff', text: '#2c3e50', icon: '#4a5568' },
  sepia: { name: '护眼', bg: '#f4ecd8', text: '#5b4636', icon: '#7c6f5a' },
  green: { name: '护眼绿', bg: '#e8f5e9', text: '#2d5a3d', icon: '#4a7c59' },
  dark: { name: '夜晚', bg: '#1a1a1a', text: '#e2e8f0', icon: '#a0aec0' }
}

const sidebarTitle = computed(() => {
  const titles = { 
    search: '全文搜索', 
    contents: '书籍目录', 
    settings: '个性化设置',
    notes: '笔记列表'
  }
  return titles[activeSidebar.value || 'search']
})

// --- 核心交互修复 ---

const handleWheel = (e: WheelEvent) => {
  if (pageMode.value !== 'page') return
  
  // 阻止默认滚动，防止容器偏移导致白屏
  e.preventDefault()
  
  // 防抖处理
  const now = Date.now()
  if (now - lastWheelTime < WHEEL_DEBOUNCE_DELAY) return
  
  // 阈值判断
  if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return

  lastWheelTime = now
  
  // 执行翻页
  if (e.deltaY > 0) {
    nextPage()
  } else {
    prevPage()
  }
}

const handleReaderClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  
  // 修复2: 简化点击逻辑，点击非交互区域时切换控制栏
  // 检查是否是交互元素
  const isInteractiveElement = target.closest('.glass-bar') || 
                              target.closest('.sidebar-system') || 
                              target.closest('.selection-menu') ||
                              target.closest('.btn-icon') ||
                              target.closest('button') ||
                              target.closest('input') ||
                              target.closest('textarea') ||
                              target.closest('select') ||
                              target.closest('.translation-overlay') ||
                              target.closest('.note-dialog')
  
  // 如果有文本被选中，不切换控制栏
  const selection = window.getSelection()
  const hasSelection = selection && selection.toString().trim().length > 0
  
  if (isInteractiveElement || hasSelection) {
    return
  }
  
  // 检查是否是PDF画布（PDF画布点击需要特殊处理）
  const isPdfCanvas = target.closest('.pdf-canvas')
  if (isPdfCanvas) {
    toggleControls()
    return
  }
  
  // 检查是否是EPUB内容区域
  const epubContainer = document.getElementById('epub-render-root')
  const isEpubContent = epubContainer && (epubContainer.contains(target) || epubContainer === target)
  
  // 如果是阅读内容区域，点击空白处切换控制栏
  if (isEpubContent || isPdfCanvas) {
    toggleControls()
  }
}

const toggleControls = () => {
  showControls.value = !showControls.value
  
  // 如果显示控制栏，关闭侧边栏
  if (showControls.value) {
    activeSidebar.value = null
  }
}

const prevPage = async () => {
  if (book.value?.format === 'pdf') {
    await prevPdfPage()
  } else if (rendition.value) {
    rendition.value.prev()
    updatePageInfo()
  }
}

const nextPage = async () => {
  if (book.value?.format === 'pdf') {
    await nextPdfPage()
  } else if (rendition.value) {
    rendition.value.next()
    updatePageInfo()
  }
}

// --- 翻译功能优化 ---
const toggleTranslationMode = async () => {
  translationMode.value = !translationMode.value
  
  if (translationMode.value) {
    // 获取当前选中文本或段落
    const selectedText = window.getSelection()?.toString()
    if (selectedText && selectedText.length > 0) {
      await translateText(selectedText)
    } else {
      // 如果没有选中文本，获取当前可见区域的文本
      translationText.value = '请先选择要翻译的文本'
    }
  }
}

// 新增：翻译选中文本
const translateSelectedText = async () => {
  const selectedText = window.getSelection()?.toString()
  if (selectedText && selectedText.trim()) {
    translationMode.value = true
    await translateText(selectedText)
    showSelectionMenu.value = false
  }
}

const translateText = async (text: string) => {
  if (!text.trim() || translationPending.value) return
  
  translationPending.value = true
  translationText.value = '翻译中...'
  
  try {
    // TODO: 调用翻译API
    // 这里先模拟翻译结果
    await new Promise(resolve => setTimeout(resolve, 500))
    translationText.value = `Translation: ${text} (${translationLang.value})`
  } catch (error) {
    console.error('翻译失败:', error)
    translationText.value = '翻译失败，请稍后重试'
  } finally {
    translationPending.value = false
  }
}

const copyTranslation = () => {
  navigator.clipboard.writeText(translationText.value)
    .then(() => {
      // 可以添加Toast提示
      console.log('翻译文本已复制')
    })
    .catch(err => {
      console.error('复制失败:', err)
    })
}

// --- 书签功能 ---
const toggleBookmark = async () => {
  if (!book.value || !rendition.value) return
  
  const location = rendition.value.currentLocation()
  if (!location) return
  
  const bookmark = {
    id: Date.now(),
    bookId: book.value.id,
    chapterIndex: currentChapterIndex.value,
    chapterTitle: currentChapterTitle.value,
    cfi: location.start?.cfi,
    page: currentPage.value,
    timestamp: Date.now(),
    note: ''
  }
  
  if (isBookmarked.value) {
    // 移除书签
    bookmarks.value = bookmarks.value.filter(b => b.cfi !== bookmark.cfi)
  } else {
    // 添加书签
    bookmarks.value.push(bookmark)
  }
  
  isBookmarked.value = !isBookmarked.value
  await saveBookmarks()
}

const saveBookmarks = async () => {
  if (!book.value) return
  await localforage.setItem(`bookmarks_${book.value.id}`, bookmarks.value)
}

const loadBookmarks = async () => {
  if (!book.value) return
  const saved = await localforage.getItem(`bookmarks_${book.value.id}`) as any[]
  bookmarks.value = saved || []
  
  // 检查当前是否已被书签标记
  if (rendition.value) {
    const location = rendition.value.currentLocation()
    if (location?.start?.cfi) {
      isBookmarked.value = bookmarks.value.some(b => b.cfi === location.start.cfi)
    }
  }
}

// --- 滚动模式修复 ---
const setupScrollMode = async () => {
  if (!rendition.value) return
  
  console.log('设置滚动模式')
  isScrollModeActive.value = true
  
  rendition.value.flow('scrolled')
  
  const container = document.getElementById('epub-render-root')
  if (container) {
    container.style.overflow = 'auto'
    container.style.height = '100%'
    container.style.scrollBehavior = 'smooth'
    container.style.display = 'block'
    container.style.alignItems = 'flex-start'
    container.style.justifyContent = 'flex-start'
    
    container.addEventListener('scroll', handleScroll)
  }
  
  await nextTick()
  await setupScrollObserver()
}

const cleanupScrollMode = () => {
  console.log('清理滚动模式')
  isScrollModeActive.value = false
  
  const container = document.getElementById('epub-render-root')
  if (container) {
    container.removeEventListener('scroll', handleScroll)
    container.style.display = 'flex'
    container.style.alignItems = 'center'
    container.style.justifyContent = 'center'
  }
  
  try {
    cleanupScrollObserver()
  } catch (e) {
    console.warn('清理滚动观察器失败:', e)
  }
  
  try {
    cleanupNextChapter()
  } catch (e) {
    console.warn('清理下一章失败:', e)
  }
  
  try {
    cleanupPrevChapter()
  } catch (e) {
    console.warn('清理上一章失败:', e)
  }
  
  if (container) {
    container.style.overflow = 'hidden'
  }
}

const handleScroll = () => {
  if (pageMode.value !== 'scroll' || !bookInstance.value) return
  
  const container = document.getElementById('epub-render-root')
  if (!container) return
  
  const scrollBottom = container.scrollTop + container.clientHeight
  const threshold = container.scrollHeight - container.clientHeight * 0.2
  
  if (scrollBottom >= threshold && !loadingNext.value) {
    loadNextChapterScroll()
  }
  
  // 向上滚动到顶部时加载上一章
  if (container.scrollTop <= 10 && currentChapterIndex.value > 0 && !isChapterSwitching.value) {
    loadPrevChapter()
  }
}

const loadNextChapterScroll = async () => {
  if (loadingNext.value || currentChapterIndex.value >= chapters.value.length - 1) return
  
  loadingNext.value = true
  
  try {
    const nextIndex = currentChapterIndex.value + 1
    const nextChapter = chapters.value[nextIndex]
    
    if (!nextChapter) {
      loadingNext.value = false
      return
    }
    
    const container = document.getElementById('epub-render-root')
    if (!container) {
      loadingNext.value = false
      return
    }
    
    const iframe = container.querySelector('iframe')
    if (!iframe || !iframe.contentDocument) {
      loadingNext.value = false
      return
    }
    
    const section = await bookInstance.value.section(nextChapter.href)
    if (!section) {
      loadingNext.value = false
      return
    }
    
    const contents = await section.document
    const nextContent = contents.body.innerHTML
    
    const separator = document.createElement('div')
    separator.className = 'chapter-separator'
    separator.innerHTML = `
      <div class="chapter-separator-line"></div>
      <div class="chapter-separator-text">第 ${nextIndex + 1} 章：${nextChapter.title}</div>
      <div class="chapter-separator-line"></div>
    `
    
    const separatorStyle = document.createElement('style')
    separatorStyle.textContent = `
      .chapter-separator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin: 40px 0;
        padding: 20px 0;
      }
      .chapter-separator-line {
        flex: 1;
        height: 1px;
        background: currentColor;
        opacity: 0.2;
      }
      .chapter-separator-text {
        font-size: 14px;
        font-weight: 600;
        opacity: 0.6;
        text-align: center;
      }
    `
    
    iframe.contentDocument.head.appendChild(separatorStyle)
    iframe.contentDocument.body.appendChild(separator)
    
    const nextDiv = document.createElement('div')
    nextDiv.className = 'next-chapter-content'
    nextDiv.innerHTML = nextContent
    nextDiv.style.padding = getMarginValue(margin.value)
    iframe.contentDocument.body.appendChild(nextDiv)
    
    currentChapterIndex.value = nextIndex
    if (chapters.value[currentChapterIndex.value]?.title) {
      currentChapterTitle.value = chapters.value[currentChapterIndex.value].title
    }
    
    await saveProgress()
    
  } catch (error) {
    console.error('加载下一章失败:', error)
  } finally {
    loadingNext.value = false
  }
}

// --- 自动滚动功能 ---
const startAutoScroll = () => {
  if (!autoScroll.value || pageMode.value !== 'scroll') return
  
  const container = document.getElementById('epub-render-root')
  if (!container) return
  
  autoScrollTimer = window.setInterval(() => {
    container.scrollTop += 1 // 缓慢滚动
  }, AUTO_SCROLL_INTERVAL)
}

const pauseAutoScroll = () => {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer)
    autoScrollTimer = null
  }
}

const toggleAutoScroll = () => {
  if (autoScroll.value) {
    startAutoScroll()
  } else {
    pauseAutoScroll()
  }
}

// --- 样式应用优化 ---
const applyStyles = () => {
  if (!rendition.value) return

  const isDark = theme.value === 'dark'

  const scrollbarStyles = theme.value === 'dark' 
    ? {
        '::-webkit-scrollbar': {
          'width': '6px !important'
        },
        '::-webkit-scrollbar-track': {
          'background': 'rgba(0,0,0,0.3) !important',
          'border-radius': '3px !important'
        },
        '::-webkit-scrollbar-thumb': {
          'background': 'rgba(200,200,200,0.3) !important',
          'border-radius': '3px !important',
          'transition': 'background 0.3s ease !important'
        },
        '::-webkit-scrollbar-thumb:hover': {
          'background': 'rgba(200,200,200,0.5) !important'
        }
      }
    : {
        '::-webkit-scrollbar': {
          'width': '6px !important'
        },
        '::-webkit-scrollbar-track': {
          'background': 'transparent !important',
          'border-radius': '3px !important'
        },
        '::-webkit-scrollbar-thumb': {
          'background': 'rgba(128,128,128,0.2) !important',
          'border-radius': '3px !important',
          'transition': 'background 0.3s ease !important'
        },
        '::-webkit-scrollbar-thumb:hover': {
          'background': 'rgba(128,128,128,0.4) !important'
        }
      }

  const customTheme = {
    body: {
      'background': `${themeConfig[theme.value].bg} !important`,
      'color': `${themeConfig[theme.value].text} !important`,
      'font-size': `${fontSize.value}px !important`,
      'line-height': `${lineHeight.value} !important`,
      'margin': pageMode.value === 'page' ? '0 !important' : `${getMarginValue(margin.value)} !important`,
      'padding': pageMode.value === 'page' ? getMarginValue(margin.value) + ' !important' : '0 !important',
      'text-align': getAlignmentValue(alignment.value) + ' !important',
      '-webkit-font-smoothing': 'antialiased !important',
      '-moz-osx-font-smoothing': 'grayscale !important',
      'text-rendering': 'optimizeLegibility !important'
    },
    'p, div': {
      'text-align': getAlignmentValue(alignment.value) + ' !important',
      'line-height': `${lineHeight.value} !important`,
      '-webkit-font-smoothing': 'antialiased !important',
      '-moz-osx-font-smoothing': 'grayscale !important',
      'text-rendering': 'optimizeLegibility !important'
    },
    ...scrollbarStyles
  }

  rendition.value.themes.register('custom', customTheme)
  rendition.value.themes.select('custom')

  if (nextChapterRendition.value) {
    nextChapterRendition.value.themes.register('custom', customTheme)
    nextChapterRendition.value.themes.select('custom')
  }
  
  if (prevChapterRendition.value) {
    prevChapterRendition.value.themes.register('custom', customTheme)
    prevChapterRendition.value.themes.select('custom')
  }

  if (pageMode.value === 'page') {
    setTimeout(() => {
      if (rendition.value) {
        rendition.value.views().forEach((view: any) => {
          if (view.pane) {
            const doc = view.pane.contentDocument
            if (doc && doc.body) {
              doc.body.style.fontSize = `${fontSize.value}px`
              doc.body.style.lineHeight = `${lineHeight.value}`
              doc.body.style.margin = '0'
              doc.body.style.padding = getMarginValue(margin.value)
              doc.body.style.textAlign = getAlignmentValue(alignment.value)
            }
          }
        })
      }
    }, 50)
  }

  const scrollbarCss = `
    html {
      color-scheme: ${isDark ? 'dark' : 'light'};
      overflow-y: auto;
    }
    
    html::-webkit-scrollbar {
      width: 2px !important;
    }
    html::-webkit-scrollbar-track {
      background: ${isDark ? 'rgba(0,0,0,0.2)' : 'transparent'} !important;
    }
    html::-webkit-scrollbar-thumb {
      background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} !important;
      border-radius: 1px !important;
    }
    html::-webkit-scrollbar-thumb:hover {
      background: ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} !important;
    }
  `

  rendition.value.views().forEach((view: any) => {
    if (view.pane) {
      const doc = view.pane.contentDocument
      let styleEl = doc.getElementById('custom-scrollbar-style')
      if (!styleEl) {
        styleEl = doc.createElement('style')
        styleEl.id = 'custom-scrollbar-style'
        doc.head.appendChild(styleEl)
      }
      styleEl.textContent = scrollbarCss
    }
  })
  
  // 不在这里调用 updatePageInfo，避免不必要的翻页计算
  // 翻页模式下的分页重建由专门的函数处理
}

const refreshPageModeStyles = () => {
  if (!rendition.value || pageMode.value !== 'page') return
  
  console.log('刷新翻页模式样式')
  
  // 确保视图已经加载完成
  setTimeout(() => {
    if (rendition.value) {
      rendition.value.views().forEach((view: any) => {
        if (view.pane) {
          const doc = view.pane.contentDocument
          if (doc && doc.body) {
            let styleEl = doc.getElementById('page-mode-styles')
            if (!styleEl) {
              styleEl = doc.createElement('style')
              styleEl.id = 'page-mode-styles'
              doc.head.appendChild(styleEl)
            }
            
            const alignValue = getAlignmentValue(alignment.value)
            
            styleEl.textContent = `
              body {
                font-size: ${fontSize.value}px !important;
                line-height: ${lineHeight.value} !important;
                margin: 0 !important;
                padding: ${getMarginValue(margin.value)} !important;
                text-align: ${alignValue} !important;
              }
              p, div {
                line-height: ${lineHeight.value} !important;
                text-align: ${alignValue} !important;
              }
            `
            
            // 翻页模式下通过 padding 设置边距
            doc.body.style.fontSize = `${fontSize.value}px`
            doc.body.style.lineHeight = `${lineHeight.value}`
            doc.body.style.margin = '0'
            doc.body.style.padding = getMarginValue(margin.value)
            doc.body.style.textAlign = alignValue
          }
        }
      })
    }
  }, 100) // 延迟执行，确保视图加载完成
}

const getMarginValue = (margin: string) => {
  const margins = { '小': '20px', '中': '40px', '大': '60px' }
  return margins[margin as keyof typeof margins] || '40px'
}

const getAlignmentValue = (alignment: string) => {
  const alignments = { '左对齐': 'left', '两端对齐': 'justify' }
  return alignments[alignment as keyof typeof alignments] || 'justify'
}

const setTheme = (key: 'light' | 'sepia' | 'dark' | 'green') => {
  theme.value = key
  applyStyles()
  saveUserConfig()
}

const changeFontSize = (delta: number) => {
  const newSize = fontSize.value + delta
  if (newSize >= 12 && newSize <= 30) {
    const oldFontSize = fontSize.value
    fontSize.value = newSize
    
    // 检查版式参数是否真正改变
    const layoutParamsChanged = oldFontSize !== newSize || 
                                lastLayoutParams.margin !== margin.value ||
                                lastLayoutParams.lineHeight !== lineHeight.value ||
                                lastLayoutParams.alignment !== alignment.value
    
    applyStyles()
    
    if (pageMode.value === 'page' && rendition.value) {
      refreshPageModeStyles()
    }
    
    // 翻页模式下如果样式变化影响了布局，也需要重新计算分页
    if (pageMode.value === 'page' && layoutParamsChanged) {
      setTimeout(async () => {
        await reRenderWithNewLayout()
      }, 100)
    }
    
    // 更新版式参数记录
    lastLayoutParams = {
      margin: margin.value,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
      alignment: alignment.value
    }
    
    saveUserConfig()
  }
}

const setLineHeight = (height: number) => {
  const oldLineHeight = lineHeight.value
  lineHeight.value = height
  
  // 检查版式参数是否真正改变
  const layoutParamsChanged = oldLineHeight !== height || 
                              lastLayoutParams.margin !== margin.value ||
                              lastLayoutParams.fontSize !== fontSize.value ||
                              lastLayoutParams.alignment !== alignment.value
  
  applyStyles()
  
  if (pageMode.value === 'page' && rendition.value) {
    refreshPageModeStyles()
  }
  
  // 翻页模式下如果样式变化影响了布局，也需要重新计算分页
  if (pageMode.value === 'page' && layoutParamsChanged) {
    setTimeout(async () => {
      await reRenderWithNewLayout()
    }, 100)
  }
  
  // 更新版式参数记录
  lastLayoutParams = {
    margin: margin.value,
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    alignment: alignment.value
  }
  
  saveUserConfig()
}

const setMargin = (value: string) => {
  const oldMargin = margin.value
  margin.value = value
  
  // 检查版式参数是否真正改变
  const layoutParamsChanged = oldMargin !== value || 
                              lastLayoutParams.fontSize !== fontSize.value ||
                              lastLayoutParams.lineHeight !== lineHeight.value ||
                              lastLayoutParams.alignment !== alignment.value
  
  applyStyles()
  
  if (pageMode.value === 'scroll') {
    nextTick(() => {
      const container = document.getElementById('epub-render-root')
      if (container) {
        const iframe = container.querySelector('iframe')
        if (iframe && iframe.contentDocument) {
          const body = iframe.contentDocument.body
          if (body) {
            const marginValue = getMarginValue(value)
            // 为滚动模式设置真实的容器宽度，而不是仅仅依靠padding
            body.style.margin = marginValue
            body.style.padding = '0' // 避免padding和margin叠加
          }
        }
      }
    })
  }
  
  // 翻页模式下更新 CSS 变量和 body 的 padding
  if (pageMode.value === 'page') {
    nextTick(() => {
      const container = document.getElementById('epub-render-root')
      if (container) {
        const marginValue = parseInt(getMarginValue(value).replace('px', ''))
        container.style.setProperty('--content-width', `${container.clientWidth - 2 * marginValue}px`)
        container.style.setProperty('--content-height', `${container.clientHeight - 2 * marginValue}px`)
        
        const iframe = container.querySelector('iframe')
        if (iframe && iframe.contentDocument) {
          const body = iframe.contentDocument.body
          if (body) {
            body.style.setProperty('padding', getMarginValue(value), 'important')
            body.style.setProperty('margin', '0', 'important')
          }
          
          // 使用 setInterval 持续设置 epub-view 的宽度
          const setEpubViewWidth = () => {
            if (iframe.contentDocument) {
              const epubView = iframe.contentDocument.querySelector('.epub-view')
              if (epubView && 'style' in epubView) {
                const htmlEpubView = epubView as HTMLElement
                htmlEpubView.style.setProperty('width', `${container.clientWidth - 2 * marginValue}px`, 'important')
                htmlEpubView.style.setProperty('height', `${container.clientHeight - 2 * marginValue}px`, 'important')
              }
            }
          }
          
          // 立即设置一次
          setEpubViewWidth()
          
          // 然后持续设置，确保不被覆盖
          const intervalId = setInterval(setEpubViewWidth, 100)
          
          // 5 秒后停止
          setTimeout(() => clearInterval(intervalId), 5000)
        }
      }
    })
  }
  
  // 更新版式参数记录
  lastLayoutParams = {
    margin: margin.value,
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    alignment: alignment.value
  }
  
  saveUserConfig()
}

const setAlignment = (value: string) => {
  const oldAlignment = alignment.value
  alignment.value = value
  
  // 检查版式参数是否真正改变
  const layoutParamsChanged = oldAlignment !== value || 
                              lastLayoutParams.margin !== margin.value ||
                              lastLayoutParams.fontSize !== fontSize.value ||
                              lastLayoutParams.lineHeight !== lineHeight.value
  
  applyStyles()
  
  if (pageMode.value === 'page' && rendition.value) {
    refreshPageModeStyles()
  }
  
  // 翻页模式下如果样式变化影响了布局，也需要重新计算分页
  if (pageMode.value === 'page' && layoutParamsChanged) {
    setTimeout(async () => {
      await reRenderWithNewLayout()
    }, 100)
  }
  
  // 更新版式参数记录
  lastLayoutParams = {
    margin: margin.value,
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    alignment: alignment.value
  }
  
  saveUserConfig()
}

const switchPageMode = async (mode: 'page' | 'scroll') => {
  if (mode === pageMode.value) return
  
  // 保存当前进度
  await saveProgress()
  
  // 清理当前模式
  if (pageMode.value === 'scroll') {
    cleanupScrollMode()
  }
  
  pageMode.value = mode
  
  // 重置容器滚动位置，防止白屏
  const container = document.getElementById('epub-render-root')
  if (container) {
    container.scrollTop = 0
    container.scrollLeft = 0
    if (mode === 'page') {
      container.style.overflow = 'hidden'
    } else {
      container.style.overflow = 'auto'
    }
  }
  
  // 重新初始化阅读器
  loading.value = true
  setTimeout(async () => {
    if (book.value?.format === 'pdf') {
      await initPdf()
    } else {
      await initEpub()
    }
    loading.value = false
  }, 100)
  
  saveUserConfig()
}

const updatePageInfo = () => {
  if (!rendition.value || pageMode.value !== 'page') return
  
  const location = rendition.value.currentLocation()
  if (location) {
    currentPage.value = location.start?.displayed?.page || 1
    totalPages.value = location.start?.displayed?.total || 1
  }
}

// --- 搜索功能优化 ---
const doFullTextSearch = async () => {
  if (!searchQuery.value.trim() || !bookInstance.value) return
  
  isSearching.value = true
  hasSearched.value = true
  searchResults.value = []

  try {
    const results = await Promise.all(
      bookInstance.value.spine.spineItems.map(async (item: any) => {
        await item.load(bookInstance.value.load.bind(bookInstance.value))
        
        const searchOptions = {
          caseSensitive: searchCaseSensitive.value,
          wholeWord: searchWholeWord.value
        }
        
        const matches = await item.find(searchQuery.value, searchOptions)
        await item.unload()
        
        return matches.map((match: any) => ({
          ...match,
          chapter: item.href,
          excerpt: match.excerpt.replace(
            new RegExp(searchQuery.value, searchCaseSensitive.value ? 'g' : 'gi'),
            `<mark>${searchQuery.value}</mark>`
          )
        }))
      })
    )
    
    const mergedResults = results.flat()
    searchResults.value = mergedResults
    
  } catch (error) {
    console.error('搜索失败:', error)
  } finally {
    isSearching.value = false
  }
}

const jumpTo = (cfi: string) => {
  if (rendition.value) {
    rendition.value.display(cfi)
    activeSidebar.value = null
    showControls.value = false
    updatePageInfo()
  }
}

// --- 进度管理优化 ---
const saveProgressInternal = async (cfi: string) => {
  if (!book.value || !bookInstance.value) return
  
  try {
    let percent = 0
    if (isLocationsReady.value && bookInstance.value.locations.length() > 0) {
      percent = bookInstance.value.locations.percentageFromCfi(cfi)
      readingProgress.value = Math.floor(percent * 100)
      displayProgress.value = Math.floor(percent * 100)
    } else if (displayProgress.value > 0) {
      percent = displayProgress.value / 100
    }
    
    readingTime.value = Math.floor(readingTime.value + 0.5)
    
    const progressData = {
      ebookId: book.value.id,
      chapterIndex: currentChapterIndex.value,
      chapterTitle: currentChapterTitle.value,
      position: percent,
      cfi: cfi,
      timestamp: Date.now(),
      readingTime: readingTime.value,
      deviceId: ebookStore.deviceInfo.id,
      deviceName: ebookStore.deviceInfo.name
    }
    
    await ebookStore.saveReadingProgress(progressData)
    console.log('阅读进度保存成功')
    
    if (chapters.value[currentChapterIndex.value]) {
      chapters.value[currentChapterIndex.value].progress = percent
      chapters.value[currentChapterIndex.value].read = percent > 0.9
    }
    
  } catch (error) {
    console.error('保存阅读进度失败:', error)
  }
}

const onSliderInput = () => {
  if (book.value?.format === 'pdf') {
    const pageNum = Math.ceil((displayProgress.value / 100) * totalPdfPages.value)
    currentChapterTitle.value = `第 ${pageNum} / ${totalPdfPages.value} 页`
  }
}

const onSliderChange = async () => {
  if (book.value?.format === 'pdf' && pdfDoc.value) {
    const pageNum = Math.ceil((displayProgress.value / 100) * totalPdfPages.value)
    await goToPdfPage(pageNum)
  } else if (bookInstance.value && rendition.value && isLocationsReady.value) {
    const cfi = bookInstance.value.locations.cfiFromPercentage(displayProgress.value / 100)
    if (cfi) {
      rendition.value.display(cfi)
      updatePageInfo()
    }
  }
}

const toggleProgressPopup = () => {
  // 可以扩展为显示进度详情弹窗
  console.log('显示进度详情')
}

// --- 初始化优化 ---
const initPdf = async () => {
  if (!book.value) return

  isLocationsReady.value = false
  displayProgress.value = 0
  readingProgress.value = 0

  const content = await localforage.getItem(`ebook_content_${book.value.id}`) as ArrayBuffer
  if (!content) {
    console.error('书籍内容加载失败')
    loading.value = false
    return
  }

  // 清理旧实例
  if (pdfDoc.value) {
    pdfDoc.value.destroy()
  }
  pdfDoc.value = null

  try {
    await nextTick()

    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument({ data: content })
    pdfDoc.value = await loadingTask.promise
    totalPdfPages.value = pdfDoc.value.numPages
    currentPdfPage.value = 1

    // 渲染第一页
    await renderPdfPage(1)

    // 获取保存的进度
    const savedProgress = await ebookStore.loadReadingProgress(book.value.id)
    if (savedProgress) {
      currentPdfPage.value = savedProgress.chapterIndex || 1
      readingTime.value = savedProgress.readingTime || 0
      displayProgress.value = Math.floor(savedProgress.position * 100)
      readingProgress.value = Math.floor(savedProgress.position * 100)
      await renderPdfPage(currentPdfPage.value)
    }

    loading.value = false
  } catch (error) {
    console.error('PDF 加载失败:', error)
    loading.value = false
  }
}

const renderPdfPage = async (pageNum: number) => {
  if (!pdfDoc.value || !pdfCanvas.value) return

  try {
    // 渲染前可以显示一个局部 loading，防止视觉上的白屏
    const ctx = pdfCanvas.value.getContext('2d')
    if (ctx) {
      ctx.fillStyle = theme.value === 'dark' ? '#1a1a1a' : '#ffffff'
      ctx.fillRect(0, 0, pdfCanvas.value.width, pdfCanvas.value.height)
    }

    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: pdfScale.value })

    pdfCanvas.value.height = viewport.height
    pdfCanvas.value.width = viewport.width

    const renderContext = {
      canvasContext: pdfCanvas.value.getContext('2d')!,
      viewport: viewport
    }

    await page.render(renderContext).promise
    currentChapterTitle.value = `第 ${pageNum} / ${totalPdfPages.value} 页`
  } catch (error) {
    console.error('PDF 页面渲染失败:', error)
    // 渲染失败时显示错误提示
    const ctx = pdfCanvas.value?.getContext('2d')
    if (ctx) {
      ctx.fillStyle = theme.value === 'dark' ? '#1a1a1a' : '#ffffff'
      ctx.fillRect(0, 0, pdfCanvas.value.width, pdfCanvas.value.height)
      ctx.fillStyle = theme.value === 'dark' ? '#ffffff' : '#000000'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('页面加载失败', pdfCanvas.value.width / 2, pdfCanvas.value.height / 2)
    }
  }
}

// PDF 导航
let isPdfNavigating = false
const goToPdfPage = async (pageNum: number) => {
  if (pageNum < 1 || pageNum > totalPdfPages.value) return
  if (isPdfNavigating) return
  
  isPdfNavigating = true
  try {
    currentPdfPage.value = pageNum
    await renderPdfPage(pageNum)
    displayProgress.value = Math.floor((currentPdfPage.value / totalPdfPages.value) * 100)
    readingProgress.value = displayProgress.value
  } finally {
    isPdfNavigating = false
  }
}

const prevPdfPage = async () => {
  if (currentPdfPage.value > 1) {
    await goToPdfPage(currentPdfPage.value - 1)
  }
}

const nextPdfPage = async () => {
  if (currentPdfPage.value < totalPdfPages.value) {
    await goToPdfPage(currentPdfPage.value + 1)
  }
}

const initEpub = async () => {
  if (!book.value) return
  
  isLocationsReady.value = false
  displayProgress.value = 0
  readingProgress.value = 0
  
  const content = await localforage.getItem(`ebook_content_${book.value.id}`) as ArrayBuffer
  if (!content) {
    console.error('书籍内容加载失败')
    loading.value = false
    return
  }
  
  // 清理旧实例
  if (bookInstance.value) {
    bookInstance.value.destroy()
  }
  
  // 清理滚动模式相关
  cleanupScrollMode()
  
  try {
    await nextTick()
    
    const container = document.getElementById('epub-render-root')
    if (!container) {
      console.error('渲染容器不存在')
      loading.value = false
      return
    }
    
    bookInstance.value = ePub(content)

    const width = container.clientWidth
    const height = container.clientHeight
    const marginValue = parseInt(getMarginValue(margin.value).replace('px', ''))
    
    // 设置翻页模式的 CSS 变量和类
    if (pageMode.value === 'page') {
      container.classList.add('page-mode')
      container.style.setProperty('--content-width', `${width - 2 * marginValue}px`)
      container.style.setProperty('--content-height', `${height - 2 * marginValue}px`)
    } else {
      container.classList.remove('page-mode')
      container.style.removeProperty('--content-width')
      container.style.removeProperty('--content-height')
    }
    
    const renderOptions = {
      width: pageMode.value === 'page' ? width - 2 * marginValue : width,
      height: pageMode.value === 'page' ? height - 2 * marginValue : height,
      flow: pageMode.value === 'page' ? 'paginated' : 'scrolled',
      manager: pageMode.value === 'page' ? 'default' : 'continuous',
      snap: pageMode.value === 'page',
      spread: 'none',
      minSpreadWidth: 800,
      gap: 'auto',
      allowScripts: true,
      allowModals: true
    }
    
    rendition.value = bookInstance.value.renderTo(container, renderOptions)
    
    // --- 关键修复开始：通过 Hooks 注入 iframe 内部事件 ---
    rendition.value.hooks.content.register((contents: any) => {
      const doc = contents.document
      const win = contents.window

      const isDark = theme.value === 'dark'
      const isScroll = pageMode.value === 'scroll'
      
      const style = doc.createElement('style')
      style.id = 'custom-reader-styles'
      const marginValue = getMarginValue(margin.value)
      style.textContent = `
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            font-size: ${fontSize.value}px !important;
            line-height: ${lineHeight.value} !important;
            margin: 0 !important;
            padding: ${marginValue} !important;
            text-align: ${getAlignmentValue(alignment.value)} !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
            color: ${themeConfig[theme.value].text} !important;
            background: ${themeConfig[theme.value].bg} !important;
            box-sizing: border-box !important;
          }
          
        html {
            color-scheme: ${isDark ? 'dark' : 'light'};
          }
          
        html::-webkit-scrollbar { width: 2px; }
        html::-webkit-scrollbar-track { background: ${isDark ? 'rgba(0,0,0,0.2)' : 'transparent'}; }
        html::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; border-radius: 1px; }
      `
      doc.head.appendChild(style)
      
      // 强制设置 body 的 padding 和居中对齐
      doc.body.style.setProperty('padding', marginValue, 'important')
      doc.body.style.setProperty('margin', '0', 'important')
      doc.body.style.setProperty('text-align', 'center', 'important')
      doc.body.style.setProperty('display', 'block', 'important')
      doc.body.style.setProperty('box-sizing', 'border-box', 'important')
      
      // 注意：epub-view 元素是在 iframe 外部，由 epub.js 创建
      // 所以需要在外层文档中查找
      if (pageMode.value === 'page') {
        const outerContainer = document.getElementById('epub-render-root')
        if (outerContainer) {
          // 计算正确的宽度和高度
          const containerWidth = outerContainer.clientWidth || 800
          const containerHeight = outerContainer.clientHeight || 600
          const marginValue = parseInt(getMarginValue(margin.value).replace('px', '')) || 40
          const contentWidth = containerWidth - 2 * marginValue
          const contentHeight = containerHeight - 2 * marginValue
          
          console.log('尝试设置 epub-view 宽度:', `${contentWidth}px`, {
            containerWidth,
            containerHeight,
            marginValue,
            contentWidth,
            contentHeight
          })
          
          // 使用 setInterval 持续设置 epub-view 的宽度
          const setEpubViewWidth = () => {
            const epubView = outerContainer.querySelector('.epub-view')
            if (epubView && 'style' in epubView) {
              const htmlEpubView = epubView as HTMLElement
              console.log('找到 epub-view 元素，设置宽度:', `${contentWidth}px`)
              htmlEpubView.style.setProperty('width', `${contentWidth}px`, 'important')
              htmlEpubView.style.setProperty('height', `${contentHeight}px`, 'important')
              
              // 同时设置 iframe 的宽度
              const iframe = epubView.querySelector('iframe')
              if (iframe && 'style' in iframe) {
                const htmlIframe = iframe as HTMLElement
                console.log('找到 iframe 元素，设置宽度:', `${contentWidth}px`)
                htmlIframe.style.setProperty('width', `${contentWidth}px`, 'important')
                htmlIframe.style.setProperty('height', `${contentHeight}px`, 'important')
              }
            } else {
              console.log('未找到 epub-view 元素')
            }
          }
          
          // 立即设置一次
          setEpubViewWidth()
          
          // 然后持续设置，确保不被覆盖
          const intervalId = setInterval(setEpubViewWidth, 100)
          
          // 5 秒后停止
          setTimeout(() => clearInterval(intervalId), 5000)
        } else {
          console.log('未找到 epub-render-root 元素')
        }
      }

      doc.addEventListener('wheel', (e: WheelEvent) => {
        if (pageMode.value === 'page') {
          e.preventDefault()
          handleWheel(e)
        }
      }, { passive: false })

      doc.addEventListener('click', (e: MouseEvent) => {
        const selection = win.getSelection()
        if (!selection || selection.toString().trim().length === 0) {
          const target = e.target as HTMLElement
          if (target.tagName !== 'A') {
            toggleControls()
          }
        }
      })
      
      contents.addStylesheetRules({
        'html': {
          'color-scheme': `${isDark ? 'dark' : 'light'} !important`
        },
        'html::-webkit-scrollbar': {
          'width': '2px !important'
        },
        'html::-webkit-scrollbar-track': {
          'background': `${isDark ? 'rgba(0,0,0,0.2)' : 'transparent'} !important`
        },
        'html::-webkit-scrollbar-thumb': {
          'background': `${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} !important`,
          'border-radius': '1px !important'
        },
        'html::-webkit-scrollbar-thumb:hover': {
          'background': `${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} !important`
        },
        'body': {
          'font-family': 'Inter, system-ui, sans-serif !important',
          'user-select': 'auto !important',
          'margin': '0 !important',
          'padding': `${getMarginValue(margin.value)} !important`
        }
      })
    })
    // --- 关键修复结束 ---
    
    // 加载元数据和目录
    const nav = await bookInstance.value.loaded.navigation
    chapters.value = nav.toc.map((t: any) => {
      let title = t.label || t.title || '未知章节'
      
      if (!title || title.trim() === '') {
        const hrefParts = t.href.split('/')
        const fileName = hrefParts[hrefParts.length - 1]
        title = fileName.replace(/\.x?html?$/i, '').replace(/_/g, ' ')
      }
      
      return {
        title,
        href: t.href,
        progress: 0,
        read: false
      }
    })
    
    // 获取保存的进度
    const savedProgress = await ebookStore.loadReadingProgress(book.value.id)
    
    // 初始化阅读位置
    if (savedProgress && savedProgress.cfi) {
      await rendition.value.display(savedProgress.cfi)
      currentChapterIndex.value = savedProgress.chapterIndex || 0
      readingTime.value = savedProgress.readingTime || 0
      if (savedProgress.position !== undefined) {
        readingProgress.value = Math.floor(savedProgress.position * 100)
        displayProgress.value = Math.floor(savedProgress.position * 100)
      }
    } else {
      await rendition.value.display()
    }
    
    // 设置初始章节标题
    if (chapters.value[currentChapterIndex.value]?.title) {
      currentChapterTitle.value = chapters.value[currentChapterIndex.value].title
    }
    
    // 加载书签
    await loadBookmarks()
    
    // 应用样式
    applyStyles()
    
    // 绑定事件
    bindRenditionEvents()
    
    // 如果是滚动模式，需要额外设置
    if (pageMode.value === 'scroll') {
      await setupScrollMode()
    }
    
    // 异步生成位置索引
    bookInstance.value.ready.then(() => {
      return bookInstance.value.locations.generate(1000)
    }).then(() => {
      isLocationsReady.value = true
      
      if (savedProgress && savedProgress.cfi) {
        const percent = bookInstance.value.locations.percentageFromCfi(savedProgress.cfi)
        readingProgress.value = Math.floor(percent * 100)
        displayProgress.value = Math.floor(percent * 100)
      } else {
        const location = rendition.value.currentLocation()
        if (location?.start?.cfi) {
          const percent = bookInstance.value.locations.percentageFromCfi(location.start.cfi)
          readingProgress.value = Math.floor(percent * 100)
          displayProgress.value = Math.floor(percent * 100)
        }
      }
    }).catch((err: any) => {
      console.warn('位置索引生成失败:', err)
    })
    
    loading.value = false
    
  } catch (error) {
    console.error('EPUB初始化失败:', error)
    loading.value = false
  }
}

// --- 侧边栏管理 ---
const openSidebar = (type: 'search' | 'contents' | 'settings' | 'notes') => {
  activeSidebar.value = type
  
  // 如果是搜索面板，自动聚焦输入框
  if (type === 'search') {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
  
  // 添加外部点击监听
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true)
  }, 0)
}

const handleOutsideClick = (event: MouseEvent) => {
  const sidebar = document.querySelector('.sidebar-system')
  const isClickInsideSidebar = sidebar?.contains(event.target as Node)
  const isClickOnTrigger = (event.target as HTMLElement)?.closest('.btn-icon')
  
  if (!isClickInsideSidebar && !isClickOnTrigger && activeSidebar.value !== null) {
    closeSidebar()
  }
}

const closeSidebar = () => {
  activeSidebar.value = null
  document.removeEventListener('click', handleOutsideClick, true)
}

// 重新渲染函数，用于在页边距等版式参数变化时重新计算分页
const reRenderWithNewLayout = async () => {
  if (!book.value || !rendition.value) return
  
  // 保存当前阅读位置
  const currentLocation = rendition.value.currentLocation()
  const currentCFI = currentLocation?.start?.cfi || null
  
  // 重新初始化
  loading.value = true
  await nextTick()
  
  if (book.value.format === 'pdf') {
    await initPdf()
  } else {
    await initEpub()
  }
  
  // 恢复到之前的位置
  if (currentCFI) {
    setTimeout(() => {
      if (rendition.value) {
        rendition.value.display(currentCFI)
      }
    }, 300)
  }
  
  loading.value = false
}

const goToChapter = async (href: string, index: number) => {
  currentChapterIndex.value = index
  if (chapters.value[index]?.title) {
    currentChapterTitle.value = chapters.value[index].title
  }
  if (rendition.value) {
    await rendition.value.display(href)
    activeSidebar.value = null
    showControls.value = false
    updatePageInfo()
  }
}

// --- 数据管理 ---
const saveUserConfig = async () => {
  const readerConfig = {
    fontSize: fontSize.value,
    fontFamily: ebookStore.userConfig.reader.fontFamily || 'system',
    theme: theme.value,
    pageMode: pageMode.value,
    brightness: brightness.value,
    lineSpacing: ebookStore.userConfig.reader.lineSpacing || 1.5,
    lineHeight: lineHeight.value,
    paragraphSpacing: ebookStore.userConfig.reader.paragraphSpacing || 0,
    autoSaveInterval: ebookStore.userConfig.reader.autoSaveInterval || 30
  }
  
  await ebookStore.updateUserConfig({ reader: readerConfig })
}

const loadUserConfig = async () => {
  const readerConfig = ebookStore.userConfig.reader
  
  if (readerConfig) {
    theme.value = readerConfig.theme || 'light'
    fontSize.value = readerConfig.fontSize || 18
    lineHeight.value = readerConfig.lineHeight || readerConfig.lineSpacing || 1.5
    pageMode.value = readerConfig.pageMode || 'page'
    brightness.value = readerConfig.brightness || 100
    margin.value = '中'
    alignment.value = '两端对齐'
    autoScroll.value = false
    pageAnimation.value = true
    autoNightMode.value = false
    nightModeTime.value = '22:00'
  }
}

const exportReadingData = async () => {
  const data = {
    book: book.value,
    progress: displayProgress.value,
    chapters: chapters.value,
    bookmarks: bookmarks.value,
    config: {
      theme: theme.value,
      fontSize: fontSize.value,
      pageMode: pageMode.value
    }
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${book.value?.title || 'book'}_reading_data.json`
  a.click()
  URL.revokeObjectURL(url)
}

const clearCache = async () => {
  if (confirm('确定要清除阅读器缓存吗？这不会删除您的阅读进度。')) {
    await localforage.removeItem(`bookmarks_${book.value.id}`)
    // 可以添加更多缓存清理
    alert('缓存已清除')
  }
}

const goBack = async () => {
  if (isSavingProgress.value) {
    bookInstance.value?.destroy()
    bookInstance.value = null
    rendition.value = null
    if (pdfDoc.value) {
      pdfDoc.value.destroy()
    }
    pdfDoc.value = null
    router.push('/')
    return
  }
  
  isSavingProgress.value = true
  isLocationsReady.value = false
  
  try {
    await saveProgress()
  } catch (e) {
    console.warn('保存进度失败:', e)
  }

  if (book.value) {
    ebookStore.syncCurrentBookProgress(book.value.id)
  }
  
  bookInstance.value?.destroy()
  bookInstance.value = null
  rendition.value = null
  if (pdfDoc.value) {
    pdfDoc.value.destroy()
  }
  pdfDoc.value = null

  router.push('/')
}

// --- 监听器 ---
watch(pageMode, (newMode) => {
  nextTick(() => {
    refreshLayout()
    
    if (newMode === 'page' && rendition.value) {
      setTimeout(() => {
        applyStyles()
        refreshPageModeStyles()
      }, 200)
    }
  })
})

watch(margin, () => {
  nextTick(() => {
    refreshLayout()
  })
})

watch(fontSize, () => {
  nextTick(() => {
    refreshLayout()
  })
})

watch(lineHeight, () => {
  nextTick(() => {
    refreshLayout()
  })
})

const refreshLayout = () => {
  if (pageMode.value === 'page') {
    updatePageInfo()
  }
  if (pageMode.value === 'scroll') {
    const container = document.getElementById('epub-render-root')
    if (container) {
      container.scrollTop = container.scrollTop
    }
  }
}

// --- 生命周期 ---
onMounted(async () => {
  isLocationsReady.value = false
  
  await loadUserConfig()
  
  const bookId = route.params.id as string
  book.value = ebookStore.getBookById(bookId)
  
  if (book.value) {
    if (book.value.format === 'pdf') {
      await initPdf()
    } else {
      await initEpub()
    }
  } else {
    console.error('书籍不存在')
    router.push('/')
  }
  
  if (autoNightMode.value) {
    checkNightMode()
    setInterval(checkNightMode, 60000)
  }
  
  window.addEventListener('resize', handleWindowResize)
})

const handleWindowResize = () => {
  if (rendition.value && pageMode.value === 'page') {
    const container = document.getElementById('epub-render-root')
    if (container) {
      rendition.value.resize(container.clientWidth, container.clientHeight)
    }
  }
}

onBeforeUnmount(async () => {
  if (isSavingProgress.value) {
    if (autoScrollTimer) {
      clearInterval(autoScrollTimer)
      autoScrollTimer = null
    }
    return
  }
  
  console.log('组件卸载，保存阅读进度...')
  isSavingProgress.value = true
  isLocationsReady.value = false
  
  try {
    await saveProgress()
  } catch (e) {
    console.warn('保存进度失败:', e)
  }
  
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer)
    autoScrollTimer = null
  }
  
  if (book.value) {
    ebookStore.syncCurrentBookProgress(book.value.id)
  }
})

onUnmounted(async () => {
  window.removeEventListener('resize', handleWindowResize)
  
  try {
    cleanupNextChapter()
  } catch (e) {
    console.warn('清理下一章失败:', e)
  }
  
  try {
    cleanupPrevChapter()
  } catch (e) {
    console.warn('清理上一章失败:', e)
  }
  
  try {
    cleanupScrollObserver()
  } catch (e) {
    console.warn('清理滚动观察器失败:', e)
  }
  
  try {
    bookInstance.value?.destroy()
  } catch (e) {
    console.warn('销毁书籍实例失败:', e)
  }
  
  try {
    if (pdfDoc.value) {
      pdfDoc.value.destroy()
    }
  } catch (e) {
    console.warn('销毁PDF文档失败:', e)
  }
  
  bookInstance.value = null
  rendition.value = null
  pdfDoc.value = null
})

// --- 辅助函数 ---
const checkNightMode = () => {
  if (!autoNightMode.value) return
  
  const now = new Date()
  const [hours, minutes] = nightModeTime.value.split(':').map(Number)
  const nightTime = new Date()
  nightTime.setHours(hours, minutes, 0, 0)
  
  if (now >= nightTime && theme.value !== 'dark') {
    setTheme('dark')
  } else if (now < nightTime && theme.value === 'dark') {
    setTheme('light')
  }
}

const setupScrollObserver = async () => {
  if (!rendition.value) return
  
  const container = document.getElementById('epub-render-root')
  if (!container) return
  
  observer.value = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === nextChapterTrigger.value) {
            loadNextChapter()
          } else if (entry.target === prevChapterTrigger.value) {
            loadPrevChapter()
          }
        }
      })
    },
    { threshold: 0.1 }
  )
  
  if (nextChapterTrigger.value) {
    observer.value.observe(nextChapterTrigger.value)
  }
  if (prevChapterTrigger.value) {
    observer.value.observe(prevChapterTrigger.value)
  }
}

const cleanupScrollObserver = () => {
  if (observer.value) {
    observer.value.disconnect()
    observer.value = null
  }
}

const preloadNextChapter = async () => {
  if (!bookInstance.value || currentChapterIndex.value >= chapters.value.length - 1) return
  
  const nextChapter = chapters.value[currentChapterIndex.value + 1]
  if (!nextChapter) return
  
  try {
    if (nextChapterRendition.value) {
      nextChapterRendition.value.destroy()
    }
    
    const container = document.getElementById('epub-render-root')
    if (!container) return
    
    nextChapterRendition.value = bookInstance.value.renderTo(container, {
      width: '100%',
      height: '100%',
      flow: 'scrolled',
      manager: 'continuous',
      allowScripts: true
    })
    
    await nextChapterRendition.value.display(nextChapter.href)
    applyStyles()
  } catch (error) {
    console.error('预加载下一章失败:', error)
  }
}

const loadNextChapter = async () => {
  if (isChapterSwitching.value || currentChapterIndex.value >= chapters.value.length - 1) return
  
  isChapterSwitching.value = true
  
  const container = document.getElementById('epub-render-root')
  
  currentChapterIndex.value++
  
  if (chapters.value[currentChapterIndex.value]?.title) {
    currentChapterTitle.value = chapters.value[currentChapterIndex.value].title
  }
  
  try {
    await rendition.value.display(chapters.value[currentChapterIndex.value].href)
    
    await nextTick()
    
    if (container) {
      container.scrollTop = 0
    }
    
    await preloadNextChapter()
  } catch (error) {
    console.error('加载下一章失败:', error)
    currentChapterIndex.value--
  }
  
  isChapterSwitching.value = false
}

const loadPrevChapter = async () => {
  if (isChapterSwitching.value || currentChapterIndex.value <= 0) return
  
  isChapterSwitching.value = true
  
  const container = document.getElementById('epub-render-root')
  
  currentChapterIndex.value--
  
  if (chapters.value[currentChapterIndex.value]?.title) {
    currentChapterTitle.value = chapters.value[currentChapterIndex.value].title
  }
  
  try {
    await rendition.value.display(chapters.value[currentChapterIndex.value].href)
    
    await nextTick()
    
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  } catch (error) {
    console.error('加载上一章失败:', error)
    currentChapterIndex.value++
  }
  
  isChapterSwitching.value = false
}

const cleanupNextChapter = () => {
  if (nextChapterRendition.value) {
    nextChapterRendition.value.destroy()
    nextChapterRendition.value = null
  }
}

const cleanupPrevChapter = () => {
  if (prevChapterRendition.value) {
    prevChapterRendition.value.destroy()
    prevChapterRendition.value = null
  }
}

const bindRenditionEvents = () => {
  if (!rendition.value) return
  
  rendition.value.on('relocated', (location: any) => {
    updatePageInfo()
    
    if (location.start?.cfi) {
      saveProgressInternal(location.start.cfi)
    }
    
    updateChapterTitle(location)
  })
  
  rendition.value.on('rendered', () => {
    updateChapterTitle()
  })
  
  // 修复3：选中事件与坐标修正
  rendition.value.on('selected', (cfiRange: string, contents: any) => {
    const selection = contents.window.getSelection()
    const text = selection.toString().trim()
    
    console.log('selected 事件触发', { text, cfiRange })
    
    if (text) {
      currentNoteText.value = text
      currentNoteCfi.value = cfiRange
      
      // 获取 iframe 在整个窗口中的位置偏移
      const iframe = document.querySelector('#epub-render-root iframe')
      const iframeRect = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 }
      
      // 获取选区相对于 iframe 的位置
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      // 坐标修正 = iframe偏移 + 选区相对坐标
      let top = iframeRect.top + rect.bottom + 10
      let left = iframeRect.left + rect.left + (rect.width / 2) - 60
      
      // 边界检查
      if (top > window.innerHeight - 60) top = iframeRect.top + rect.top - 60
      if (left < 10) left = 10
      if (left > window.innerWidth - 130) left = window.innerWidth - 130
      
      showSelectionMenu.value = true
      selectionMenuStyle.value = {
        top: `${top}px`,
        left: `${left}px`
      }
    }
  })
}

const updateChapterTitle = (location?: any) => {
  let title = '未知章节'
  
  if (location?.start?.cfi && bookInstance.value) {
    try {
      const spineItem = bookInstance.value.spine.get(location.start.cfi)
      if (spineItem && spineItem.href) {
        const navItem = chapters.value.find(ch => ch.href === spineItem.href || spineItem.href.includes(ch.href))
        if (navItem) {
          title = navItem.title
        }
      }
    } catch (e) {
      console.warn('获取章节信息失败:', e)
    }
  }
  
  if (title === '未知章节' && location?.section?.document?.title) {
    title = location.section.document.title
  }
  
  if (title === '未知章节' && chapters.value[currentChapterIndex.value]?.title) {
    title = chapters.value[currentChapterIndex.value].title
  }
  
  currentChapterTitle.value = title
}

const saveProgress = async () => {
  if (!book.value) return

  // PDF 格式保存进度
  if (book.value.format === 'pdf' && pdfDoc.value) {
    const position = currentPdfPage.value / totalPdfPages.value
    readingTime.value = Math.floor(readingTime.value + 0.5)

    const progressData = {
      ebookId: book.value.id,
      chapterIndex: currentPdfPage.value,
      chapterTitle: currentChapterTitle.value,
      position: position,
      cfi: '',
      timestamp: Date.now(),
      deviceId: ebookStore.deviceInfo.id,
      deviceName: ebookStore.deviceInfo.name,
      readingTime: readingTime.value
    }

    try {
      await localforage.setItem(`progress_${book.value.id}`, progressData)
      await ebookStore.updateBook(book.value.id, {
        lastRead: Date.now(),
        readingProgress: Math.round(position * 100)
      })
      console.log('PDF 进度保存成功')
    } catch (error) {
      console.error('PDF 进度保存失败:', error)
    }
    return
  }

  // EPUB 格式保存进度
  if (!rendition.value) return
  
  const location = rendition.value.currentLocation()
  if (location?.start?.cfi) {
    await saveProgressInternal(location.start.cfi)
  }
}

// 添加笔记
const addNote = () => {
  console.log('addNote 被调用', { currentNoteText: currentNoteText.value })
  
  if (!currentNoteText.value || currentNoteText.value.trim().length === 0) {
    console.warn('没有选中文本，无法添加笔记')
    return
  }
  
  currentNoteCfi.value = rendition.value?.currentLocation()?.start?.cfi || ''
  currentNoteChapter.value = currentChapterTitle.value
  showNoteDialog.value = true
  showSelectionMenu.value = false
  
  // 自动聚焦到输入框
  nextTick(() => {
    const noteInput = document.querySelector('.note-content textarea') as HTMLTextAreaElement
    if (noteInput) {
      noteInput.focus()
    }
  })
}

const saveNote = (noteContent: string) => {
  if (!currentNoteText.value.trim()) return
  
  const note = {
    id: Date.now(),
    text: currentNoteText.value,
    content: noteContent,
    cfi: currentNoteCfi.value,
    chapter: currentNoteChapter.value,
    timestamp: new Date().toISOString()
  }
  
  notes.value.push(note)
  showNoteDialog.value = false
  
  // 清空当前笔记数据
  currentNoteText.value = ''
  currentNoteContent.value = ''
  currentNoteCfi.value = ''
  currentNoteChapter.value = ''
  
  // 清除 iframe 内部的选区
  clearIframeSelection()
}

const cancelNote = () => {
  showNoteDialog.value = false
  currentNoteText.value = ''
  currentNoteContent.value = ''
  currentNoteCfi.value = ''
  currentNoteChapter.value = ''
  
  // 清除 iframe 内部的选区
  clearIframeSelection()
}

// 清除 iframe 内部的选区
const clearIframeSelection = () => {
  const iframe = document.querySelector('#epub-render-root iframe') as HTMLIFrameElement
  if (iframe && iframe.contentWindow) {
    const selection = iframe.contentWindow.getSelection()
    if (selection) {
      selection.removeAllRanges()
    }
  }
}

const exportNotes = () => {
  if (notes.value.length === 0) {
    return
  }
  
  let markdown = `# ${book.value?.title || '书籍笔记'}\n\n`
  markdown += `导出时间: ${new Date().toLocaleString()}\n\n`
  markdown += `---\n\n`
  
  notes.value.forEach((note, index) => {
    markdown += `## 笔记 ${index + 1}\n\n`
    markdown += `**章节**: ${note.chapter}\n\n`
    markdown += `**时间**: ${formatNoteTime(note.timestamp)}\n\n`
    markdown += `**原文**:\n> ${note.text}\n\n`
    markdown += `**笔记**:\n${note.content}\n\n`
    markdown += `---\n\n`
  })
  
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${book.value?.title || '笔记'}_笔记.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const jumpToNote = (cfi: string) => {
  if (rendition.value && cfi) {
    rendition.value.display(cfi)
    activeSidebar.value = null
    showControls.value = false
    updatePageInfo()
  }
}

const formatNoteTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString()
  }
}

</script>

<style scoped>
/* 核心容器 */
.reader-master {
  width: 100vw; height: 100vh;
  position: relative; overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  transition: background 0.5s ease;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.theme-light { 
  background: #ffffff; 
  color: #2c3e50; 
  --glass: rgba(255,255,255,0.92);
  --glass-border: rgba(0,0,0,0.08);
  color-scheme: light;
}
.theme-sepia { 
  background: #f4ecd8; 
  color: #5b4636; 
  --glass: rgba(244,236,216,0.92);
  --glass-border: rgba(91,70,54,0.08);
  color-scheme: light;
}
.theme-green { 
  background: #e8f5e9; 
  color: #2d5a3d; 
  --glass: rgba(232,245,233,0.92);
  --glass-border: rgba(45,90,61,0.08);
  color-scheme: light;
}
.theme-dark { 
  background: #1a1a1a; 
  color: #e2e8f0; 
  --glass: rgba(26,26,26,0.92);
  --glass-border: rgba(255,255,255,0.08);
  color-scheme: dark;
}

/* 毛玻璃工具栏 */
.glass-bar {
  position: fixed; left: 0; right: 0; z-index: 1000;
  background: var(--glass);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  display: flex; align-items: center;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  color: inherit;
}

.top-bar { 
  top: 0; 
  height: 56px; 
  justify-content: space-between; 
  padding: 0 20px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.05);
}

.bottom-bar { 
  bottom: 0; 
  height: auto; 
  padding: 12px 24px; 
  flex-direction: column; 
  box-shadow: 0 -2px 20px rgba(0,0,0,0.05);
  gap: 12px;
}

/* 底部控制栏图标颜色 - 主题适配 */
.theme-light .bottom-bar svg {
  color: #333;
}

.theme-light .bottom-bar .mode-option.active svg {
  color: #4a90e2;
}

.theme-sepia .bottom-bar svg {
  color: #5b4636;
}

.theme-sepia .bottom-bar .mode-option.active svg {
  color: #8b6f47;
}

.theme-green .bottom-bar svg {
  color: #2d5a3d;
}

.theme-green .bottom-bar .mode-option.active svg {
  color: #4a90e2;
}

.theme-dark .bottom-bar svg {
  color: #e2e8f0;
}

.theme-dark .bottom-bar .mode-option.active svg {
  color: #5b9bd5;
}

/* UI 细节 */
.bar-section { 
  display: flex; 
  align-items: center; 
  gap: 16px; 
}

.book-meta { 
  display: flex; 
  flex-direction: column; 
  gap: 4px;
}

.book-title { 
  font-weight: 700; 
  font-size: 16px; 
  line-height: 1.2;
  color: inherit;
}

.meta-details {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  opacity: 0.8;
  color: inherit;
}

.chapter-badge {
  font-size: 11px;
  background: rgba(74,144,226,0.1);
  padding: 2px 8px;
  border-radius: 10px;
  color: #4a90e2;
}

.reading-stats {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-item {
  font-size: 11px;
  opacity: 0.6;
}

.stat-divider {
  opacity: 0.3;
}

.quick-actions-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-icon {
  background: none; 
  border: none; 
  color: inherit; 
  cursor: pointer; 
  padding: 10px; 
  border-radius: 50%; 
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover { 
  background: rgba(128,128,128,0.15); 
  transform: scale(1.05);
}

.btn-icon:active {
  transform: scale(0.95);
}

.btn-icon.small {
  padding: 6px;
}

.btn-icon i {
  font-size: 20px;
}

.btn-text {
  background: none; 
  border: none; 
  color: inherit; 
  cursor: pointer; 
  padding: 8px 16px; 
  border-radius: 8px; 
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-text:hover { 
  background: rgba(128,128,128,0.15); 
}

.btn-text.small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-text-primary { 
  background: none; 
  border: none; 
  color: #4a90e2; 
  cursor: pointer; 
  padding: 8px 16px; 
  border-radius: 8px; 
  font-size: 14px; 
  font-weight: 600; 
  transition: all 0.2s ease;
}

.btn-text-primary:hover { 
  background: rgba(74, 144, 226, 0.1); 
}

.btn-pill {
  background: rgba(128,128,128,0.1); 
  border: 1px solid rgba(128,128,128,0.2);
  padding: 8px 20px; 
  border-radius: 20px; 
  color: inherit; 
  cursor: pointer; 
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-pill:hover {
  background: rgba(128,128,128,0.15);
  transform: translateY(-1px);
}

/* 阅读视口与热区 */
.reader-viewport { 
  width: 100%; 
  height: 100%; 
  position: relative; 
  overflow: hidden;
}

.render-layer {
  width: 100%;
  height: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

#epub-render-root {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}

#epub-render-root.page-mode {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

#epub-render-root.page-mode :deep(.epub-container) {
  width: var(--content-width, 100%) !important;
  height: var(--content-height, 100%) !important;
}

.pdf-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-canvas {
  max-width: 100%;
  max-height: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
}

/* 翻译遮罩层 */
.translation-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(10px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.translation-content {
  background: var(--glass);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.translation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.translation-label {
  font-size: 14px;
  font-weight: 600;
  color: #4a90e2;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.theme-dark .translation-label {
  color: #5b9bd5;
}

.translation-body {
  flex: 1;
  overflow-y: auto;
  font-size: 16px;
  line-height: 1.6;
  padding: 12px;
  background: rgba(128,128,128,0.05);
  border-radius: 8px;
  max-height: 300px;
  color: inherit;
}

.translation-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.lang-select {
  flex: 1;
  background: rgba(128,128,128,0.1);
  border: 1px solid rgba(128,128,128,0.2);
  border-radius: 8px;
  padding: 8px 12px;
  color: inherit;
  font-size: 14px;
  outline: none;
}

.lang-select:focus {
  border-color: #4a90e2;
}

/* 交互热区 */
.interaction-layer {
  position: absolute; 
  inset: 0; 
  pointer-events: none; 
  z-index: 100;
}

/* 常驻信息 */
.persistent-info {
  position: fixed; 
  bottom: 20px; 
  left: 20px; 
  z-index: 500;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-indicator { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  font-family: 'SF Mono', monospace;
  pointer-events: auto;
  cursor: pointer;
  background: var(--glass);
  backdrop-filter: blur(10px);
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.progress-indicator:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.progress-text {
  font-size: 14px;
  font-weight: 700;
  color: #4a90e2;
}

.theme-dark .progress-text {
  color: #5b9bd5;
}

.page-indicator {
  font-size: 12px;
  opacity: 0.7;
  background: var(--glass);
  backdrop-filter: blur(10px);
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  align-self: flex-start;
}

/* 底部布局 */
.bottom-layout { 
  width: 100%; 
  max-width: 900px; 
  margin: 0 auto; 
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-slider-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-labels .label {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.8;
}

.progress-labels .value {
  font-size: 14px;
  font-weight: 700;
  color: #4a90e2;
}

.chapter-progress {
  font-size: 12px;
  opacity: 0.6;
  text-align: center;
}

.ios-slider { 
  width: 100%;
  height: 6px; 
  appearance: none; 
  background: rgba(128,128,128,0.2); 
  border-radius: 3px; 
  outline: none;
}

.ios-slider::-webkit-slider-thumb { 
  appearance: none; 
  width: 24px; 
  height: 24px; 
  border-radius: 50%; 
  background: #4a90e2; 
  cursor: pointer; 
  box-shadow: 0 4px 12px rgba(74,144,226,0.3);
  border: 3px solid white;
  transition: all 0.2s ease;
}

.ios-slider::-webkit-slider-thumb:hover { 
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(74,144,226,0.4);
}

/* 快速操作区 */
.quick-actions { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 20px;
}

.theme-switcher,
.font-control,
.mode-switcher {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: inherit;
}

.theme-options {
  display: flex;
  gap: 12px;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.theme-option:hover {
  background: rgba(128,128,128,0.1);
}

.theme-option.active {
  background: rgba(74,144,226,0.1);
}

.theme-preview {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.theme-option.active .theme-preview {
  border-color: #4a90e2;
  transform: scale(1.1);
}

.theme-name {
  font-size: 11px;
  opacity: 0.8;
  color: inherit;
}

.font-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(128,128,128,0.1);
  border-radius: 12px;
  padding: 8px;
}

.font-stepper button {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.font-stepper button svg {
  width: 16px;
  height: 16px;
}

.font-stepper button:hover {
  background: rgba(128,128,128,0.2);
}

.font-stepper button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.font-stepper button:disabled:hover {
  background: none;
}

.font-size-display {
  font-size: 14px;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.mode-options {
  display: flex;
  gap: 8px;
}

.mode-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: rgba(128,128,128,0.1);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-option:hover {
  background: rgba(128,128,128,0.15);
  transform: translateY(-2px);
}

.mode-option.active {
  background: rgba(74,144,226,0.1);
  border-color: #4a90e2;
  color: #4a90e2;
}

.mode-option i {
  font-size: 20px;
  margin-bottom: 4px;
}

.mode-option span {
  font-size: 12px;
  font-weight: 500;
}

/* 侧边栏系统 */
.sidebar-system {
  position: fixed; 
  top: 0; 
  right: 0; 
  bottom: 0; 
  width: 360px;
  background: var(--glass); 
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  z-index: 2000; 
  box-shadow: -10px 0 40px rgba(0,0,0,0.15);
  display: flex; 
  flex-direction: column;
  border-left: 1px solid var(--glass-border);
}

.sidebar-header { 
  padding: 24px; 
  border-bottom: 1px solid rgba(128,128,128,0.1); 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
}

.sidebar-header h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.close-x {
  background: none;
  border: none;
  font-size: 28px;
  color: inherit;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-x:hover {
  background: rgba(128,128,128,0.1);
}

.sidebar-scroll-area { 
  flex: 1; 
  overflow-y: auto; 
  padding: 20px; 
  scroll-behavior: smooth;
}

/* 搜索面板 */
.search-input-box { 
  display: flex; 
  gap: 10px; 
  margin-bottom: 20px; 
}

.search-input-box input { 
  flex: 1; 
  background: rgba(128,128,128,0.1); 
  border: 1px solid rgba(128,128,128,0.2);
  padding: 12px 16px; 
  border-radius: 12px; 
  color: inherit; 
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input-box input:focus {
  border-color: #4a90e2;
  background: rgba(74,144,226,0.05);
}

.search-input-box button { 
  background: #4a90e2;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.search-input-box button:hover:not(:disabled) {
  background: #3a80d2;
  transform: translateY(-1px);
}

.search-input-box button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  opacity: 0.8;
  cursor: pointer;
}

.filter-option input {
  width: 16px;
  height: 16px;
}

.results-count {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 12px;
  padding-left: 4px;
}

.search-item { 
  padding: 16px; 
  border-radius: 12px;
  cursor: pointer; 
  font-size: 14px; 
  margin-bottom: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.search-item:hover { 
  background: rgba(128,128,128,0.1);
  border-color: rgba(128,128,128,0.2);
  transform: translateX(4px);
}

.result-chapter {
  font-size: 12px;
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 8px;
}

.search-item p {
  margin: 8px 0;
  line-height: 1.6;
}

.search-item mark { 
  background: #ffeb3b; 
  color: #000; 
  padding: 1px 4px;
  border-radius: 3px;
}

.result-meta {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 8px;
}

.empty-tip {
  text-align: center;
  padding: 40px 20px;
  opacity: 0.5;
}

.empty-tip i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-tip p {
  margin: 8px 0;
}

.empty-tip-sub {
  font-size: 12px;
  opacity: 0.7;
}

/* 目录面板 */
.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

.toc-header h4 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.toc-count {
  font-size: 12px;
  opacity: 0.6;
  background: rgba(128,128,128,0.1);
  padding: 4px 8px;
  border-radius: 10px;
}

/* 笔记列表面板 */
.panel-notes {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

.notes-header h4 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.notes-count {
  font-size: 12px;
  opacity: 0.6;
  background: rgba(128,128,128,0.1);
  padding: 4px 8px;
  border-radius: 10px;
}

.empty-notes {
  text-align: center;
  padding: 60px 20px;
  opacity: 0.5;
}

.empty-notes svg {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-notes p {
  margin: 8px 0;
}

.empty-tip-sub {
  font-size: 12px;
  opacity: 0.7;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  overflow-x: hidden;
}

.note-item {
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  background: rgba(128,128,128,0.03);
}

.note-item:hover {
  background: rgba(128,128,128,0.08);
  border-color: rgba(128,128,128,0.15);
  transform: translateX(4px);
}

.note-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
  opacity: 0.7;
}

.note-chapter {
  font-weight: 600;
  color: #4a90e2;
}

.theme-dark .note-chapter {
  color: #5b9bd5;
}

.note-time {
  opacity: 0.6;
}

.note-item-text {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: rgba(74,144,226,0.05);
  border-left: 2px solid #4a90e2;
  border-radius: 4px;
  font-style: italic;
}

.theme-dark .note-item-text {
  background: rgba(91,155,213,0.05);
  border-left-color: #5b9bd5;
}

.note-item-content {
  font-size: 14px;
  line-height: 1.6;
  color: inherit;
}

.toc-scroll-container {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.toc-node { 
  padding: 16px; 
  border-radius: 12px; 
  cursor: pointer; 
  margin-bottom: 4px; 
  transition: 0.2s; 
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid transparent;
}

.toc-node:hover { 
  background: rgba(128,128,128,0.1);
  border-color: rgba(128,128,128,0.1);
}

.toc-node.active { 
  color: #4a90e2; 
  font-weight: 700; 
  background: rgba(74,144,226,0.1);
  border-color: rgba(74,144,226,0.2);
}

.toc-node.read {
  opacity: 0.7;
}

.toc-node-content {
  flex: 1;
}

.toc-node-title {
  font-size: 14px;
  margin-bottom: 4px;
}

.toc-node-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  opacity: 0.6;
}

.toc-node-indicator {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4a90e2;
  opacity: 0.6;
}

.toc-node-indicator .icon-check {
  color: #4a90e2;
  font-size: 14px;
}

/* 设置面板 */
.panel-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-group {
  background: rgba(128,128,128,0.05);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(128,128,128,0.1);
}

.settings-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.settings-group-header label {
  font-size: 14px;
  font-weight: 600;
  color: inherit;
}

.settings-value {
  font-size: 14px;
  color: #4a90e2;
  font-weight: 600;
}

.theme-dark .settings-value {
  color: #5b9bd5;
}

.settings-slider {
  width: 100%;
  height: 6px;
  appearance: none;
  background: rgba(128,128,128,0.2);
  border-radius: 3px;
  outline: none;
}

.settings-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4a90e2;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(74,144,226,0.3);
  border: 3px solid white;
}

.theme-dark .settings-slider::-webkit-slider-thumb {
  background: #5b9bd5;
  box-shadow: 0 2px 8px rgba(91,155,213,0.3);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: rgba(128,128,128,0.05);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.theme-card:hover {
  background: rgba(128,128,128,0.1);
  transform: translateY(-2px);
}

.theme-card.active {
  border-color: #4a90e2;
  background: rgba(74,144,226,0.1);
}

.theme-dark .theme-card.active {
  border-color: #5b9bd5;
  background: rgba(91,155,213,0.1);
}

.theme-card-preview {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.preview-text {
  font-size: 18px;
  font-weight: 600;
}

.theme-card-name {
  font-size: 12px;
  color: inherit;
  font-weight: 500;
}

.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

.settings-row:last-child {
  border-bottom: none;
}

.settings-row span {
  font-size: 14px;
  color: inherit;
}

.segment-ctrl {
  display: flex;
  gap: 8px;
  background: rgba(128,128,128,0.1);
  border-radius: 10px;
  padding: 4px;
}

.segment-ctrl button {
  padding: 8px 16px;
  border: none;
  background: none;
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-width: 60px;
}

.segment-ctrl button:hover {
  background: rgba(128,128,128,0.2);
}

.segment-ctrl button.active {
  background: #4a90e2;
  color: white;
  font-weight: 600;
}

.settings-toggle {
  padding: 12px 0;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

.settings-toggle:last-child {
  border-bottom: none;
}

.settings-toggle label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  color: inherit;
}

.settings-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.settings-toggle input[type="time"] {
  background: rgba(128,128,128,0.1);
  border: 1px solid rgba(128,128,128,0.2);
  border-radius: 8px;
  padding: 8px 12px;
  color: inherit;
  font-size: 14px;
  outline: none;
}

.btn-settings {
  width: 100%;
  padding: 14px;
  background: rgba(128,128,128,0.1);
  border: 1px solid rgba(128,128,128,0.2);
  border-radius: 12px;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.btn-settings:last-child {
  margin-bottom: 0;
}

.btn-settings:hover {
  background: rgba(128,128,128,0.15);
  transform: translateY(-2px);
}

.btn-settings i {
  font-size: 16px;
}

/* 加载动画 */
.global-loader { 
  position: absolute; 
  inset: 0; 
  background: inherit; 
  z-index: 5000; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.pulse-ring { 
  width: 60px; 
  height: 60px; 
  border: 3px solid #4a90e2; 
  border-radius: 50%; 
  animation: pulse 1.5s infinite; 
}

@keyframes pulse { 
  0% { transform: scale(0.8); opacity: 0.5; } 
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; } 
}

.global-loader p {
  font-size: 14px;
  opacity: 0.8;
  letter-spacing: 1px;
}

/* 动画系统 */
.fade-enter-active, .fade-leave-active,
.slide-down-enter-active, .slide-down-leave-active,
.slide-up-enter-active, .slide-up-leave-active,
.drawer-right-enter-active, .drawer-right-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-down-enter-from { transform: translateY(-100%); }
.slide-down-leave-to { transform: translateY(-100%); }

.slide-up-enter-from { transform: translateY(100%); }
.slide-up-leave-to { transform: translateY(100%); }

.drawer-right-enter-from { transform: translateX(100%); }
.drawer-right-leave-to { transform: translateX(100%); }

/* 亮度遮罩层 */
.brightness-overlay { 
  position: fixed; 
  inset: 0; 
  background: #000; 
  pointer-events: none; 
  z-index: 10000; 
}

/* 笔记对话框 */
.note-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 6000;
}

.note-dialog {
  background: var(--glass);
  backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.note-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

.note-dialog-header h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: inherit;
}

.note-dialog-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.selected-text {
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(128,128,128,0.05);
  border-radius: 12px;
  border-left: 3px solid #4a90e2;
}

.selected-text .label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selected-text p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: inherit;
}

.note-content {
  margin-bottom: 0;
}

.note-content .label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.note-content textarea {
  width: 100%;
  padding: 12px 16px;
  background: rgba(128,128,128,0.05);
  border: 1px solid rgba(128,128,128,0.2);
  border-radius: 12px;
  color: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  transition: all 0.2s ease;
}

.note-content textarea:focus {
  border-color: #4a90e2;
  background: rgba(74,144,226,0.05);
}

.note-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(128,128,128,0.1);
}

.btn-secondary {
  padding: 10px 24px;
  background: rgba(128,128,128,0.1);
  border: 1px solid rgba(128,128,128,0.2);
  border-radius: 10px;
  color: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(128,128,128,0.15);
  transform: translateY(-1px);
}

.btn-primary {
  padding: 10px 24px;
  background: #4a90e2;
  border: 1px solid #4a90e2;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #3a80d2;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74,144,226,0.3);
}

.theme-dark .btn-primary {
  background: #5b9bd5;
  border-color: #5b9bd5;
}

.theme-dark .btn-primary:hover {
  background: #4a8bc5;
}

/* 文本选中悬浮菜单 */
.selection-menu {
  position: fixed;
  z-index: 10000;
  background: var(--glass);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selection-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: none;
  border: none;
  color: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border-radius: 6px;
  width: 100%;
  text-align: left;
}

.selection-btn:hover {
  background: rgba(74,144,226,0.15);
}

.selection-btn svg {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.theme-dark .selection-btn {
  color: #e2e8f0;
}

.theme-dark .selection-btn:hover {
  background: rgba(91,155,213,0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-bar {
    height: 60px;
    padding: 0 16px;
  }
  
  .bottom-bar {
    padding: 20px;
  }
  
  .sidebar-system {
    width: 100%;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .book-title {
    font-size: 14px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .selection-menu {
    min-width: 120px;
  }
}

@media (max-width: 480px) {
  .top-bar .book-meta {
    display: none;
  }
  
  .interaction-layer .hotspot {
    width: 33.33%;
  }
  
  .persistent-info {
    left: 10px;
    bottom: 10px;
  }
}

/* 暗色主题优化 */
.theme-dark {
  --glass: rgba(26,26,26,0.95);
  --glass-text: #e2e8f0;
  --glass-border: rgba(255,255,255,0.1);
  color-scheme: dark;
}

.theme-light {
  --glass-text: #2c3e50;
  color-scheme: light;
}

.theme-sepia {
  --glass-text: #5b4636;
  color-scheme: light;
}

.theme-green {
  --glass-text: #2d5a3d;
  color-scheme: light;
}

.theme-dark .glass-bar {
  border-color: var(--glass-border);
}

.glass-bar .book-title,
.glass-bar .meta-details,
.glass-bar .chapter-badge,
.glass-bar .stat-item,
.glass-bar .section-label,
.glass-bar .theme-name,
.glass-bar .font-size-display,
.glass-bar .mode-option span,
.glass-bar .progress-labels .label,
.glass-bar .chapter-progress {
  color: var(--glass-text, inherit);
}

.theme-dark .settings-group {
  background: rgba(255,255,255,0.05);
}

.theme-dark .segment-ctrl {
  background: rgba(255,255,255,0.1);
}

/* 滚动条美化 - 根据主题自动适配 */
.reader-viewport::-webkit-scrollbar,
.sidebar-scroll-area::-webkit-scrollbar,
.toc-scroll-container::-webkit-scrollbar,
.translation-body::-webkit-scrollbar {
  width: 6px;
}

.reader-viewport::-webkit-scrollbar-track,
.sidebar-scroll-area::-webkit-scrollbar-track,
.toc-scroll-container::-webkit-scrollbar-track,
.translation-body::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.reader-viewport::-webkit-scrollbar-thumb,
.sidebar-scroll-area::-webkit-scrollbar-thumb,
.toc-scroll-container::-webkit-scrollbar-thumb,
.translation-body::-webkit-scrollbar-thumb {
  background: rgba(128,128,128,0.2);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.reader-viewport::-webkit-scrollbar-thumb:hover,
.sidebar-scroll-area::-webkit-scrollbar-thumb:hover,
.toc-scroll-container::-webkit-scrollbar-thumb:hover,
.translation-body::-webkit-scrollbar-thumb:hover {
  background: rgba(128,128,128,0.4);
}

/* 主题特定的滚动条样式 */
.theme-light .reader-viewport::-webkit-scrollbar-thumb,
.theme-light .sidebar-scroll-area::-webkit-scrollbar-thumb,
.theme-light .toc-scroll-container::-webkit-scrollbar-thumb,
.theme-light .translation-body::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
}

.theme-light .reader-viewport::-webkit-scrollbar-thumb:hover,
.theme-light .sidebar-scroll-area::-webkit-scrollbar-thumb:hover,
.theme-light .toc-scroll-container::-webkit-scrollbar-thumb:hover,
.theme-light .translation-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.3);
}

.theme-sepia .reader-viewport::-webkit-scrollbar-thumb,
.theme-sepia .sidebar-scroll-area::-webkit-scrollbar-thumb,
.theme-sepia .toc-scroll-container::-webkit-scrollbar-thumb,
.theme-sepia .translation-body::-webkit-scrollbar-thumb {
  background: rgba(91,70,54,0.15);
}

.theme-sepia .reader-viewport::-webkit-scrollbar-thumb:hover,
.theme-sepia .sidebar-scroll-area::-webkit-scrollbar-thumb:hover,
.theme-sepia .toc-scroll-container::-webkit-scrollbar-thumb:hover,
.theme-sepia .translation-body::-webkit-scrollbar-thumb:hover {
  background: rgba(91,70,54,0.3);
}

.theme-green .reader-viewport::-webkit-scrollbar-thumb,
.theme-green .sidebar-scroll-area::-webkit-scrollbar-thumb,
.theme-green .toc-scroll-container::-webkit-scrollbar-thumb,
.theme-green .translation-body::-webkit-scrollbar-thumb {
  background: rgba(45,90,61,0.15);
}

.theme-green .reader-viewport::-webkit-scrollbar-thumb:hover,
.theme-green .sidebar-scroll-area::-webkit-scrollbar-thumb:hover,
.theme-green .toc-scroll-container::-webkit-scrollbar-thumb:hover,
.theme-green .translation-body::-webkit-scrollbar-thumb:hover {
  background: rgba(45,90,61,0.3);
}

.theme-dark .reader-viewport::-webkit-scrollbar-track,
.theme-dark .sidebar-scroll-area::-webkit-scrollbar-track,
.theme-dark .toc-scroll-container::-webkit-scrollbar-track,
.theme-dark .translation-body::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.3);
}

.theme-dark .reader-viewport::-webkit-scrollbar-thumb,
.theme-dark .sidebar-scroll-area::-webkit-scrollbar-thumb,
.theme-dark .toc-scroll-container::-webkit-scrollbar-thumb,
.theme-dark .translation-body::-webkit-scrollbar-thumb {
  background: rgba(200,200,200,0.3);
}

.theme-dark .reader-viewport::-webkit-scrollbar-thumb:hover,
.theme-dark .sidebar-scroll-area::-webkit-scrollbar-thumb:hover,
.theme-dark .toc-scroll-container::-webkit-scrollbar-thumb:hover,
.theme-dark .translation-body::-webkit-scrollbar-thumb:hover {
  background: rgba(200,200,200,0.5);
}
</style>