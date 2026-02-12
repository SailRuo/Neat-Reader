import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import localforage from 'localforage'
import ePub from 'epubjs'
import { v4 as uuidv4 } from 'uuid'
import { api } from '../api/adapter'

// 定义分类类型
export interface BookCategory {
  id: string;
  name: string;
  color: string;
  bookIds: string[];
  createdAt: number;
  updatedAt: number;
}

// AI 对话消息类型
export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selectedText?: string; // 用户选中的文本（如果有）
}

// AI 对话历史类型（每本书独立）
export interface AIConversationHistory {
  bookId: string;
  messages: AIChatMessage[];
  lastUpdated: number;
}

// 定义电子书元数据类型
export interface EbookMetadata {
  id: string;
  title: string;
  author: string;
  cover: string;
  path: string;
  format: string;
  size: number;
  lastRead: number;
  totalChapters: number;
  readingProgress: number;
  storageType: 'local' | 'synced' | 'baidupan';
  baidupanPath?: string;
  categoryId?: string;
  addedAt: number;
  downloading?: boolean; // 是否正在下载
  uploading?: boolean; // 是否正在上传
  uploadProgress?: number; // 上传进度 0-100
}

// 定义阅读进度类型
export interface ReadingProgress {
  ebookId: string;
  chapterIndex: number;
  chapterTitle: string;
  position: number;
  cfi: string; // 精确的CFI位置
  timestamp: number;
  deviceId: string;
  deviceName: string;
  readingTime: number;
}

// 定义用户配置类型
export interface UserConfig {
  storage: {
    default: 'local' | 'baidupan';
    localPath: string;
    autoSync: boolean;
    syncInterval: number;
    baidupan: {
      accessToken: string;
      refreshToken: string;
      expiration: number;
      rootPath: string;
      userId: string;
      namingStrategy: string; // 文件命名策略: 0 不重命名, 1 重命名, 2 条件重命名, 3 覆盖
      appKey?: string;
      secretKey?: string;
    } | null;
  };
  reader: {
    fontSize: number;
    fontFamily: string;
    theme: 'light' | 'sepia' | 'dark' | 'green';
    pageMode: 'page' | 'scroll';
    brightness: number;
    lineSpacing: number;
    lineHeight: number;
    paragraphSpacing: number;
    autoSaveInterval: number;
  };
  ui: {
    viewMode: 'grid' | 'list';
    language: string;
  };
}

// 定义设备信息类型
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  platform: string;
  lastSync: number;
}

// 初始化localforage配置
localforage.config({
  name: 'NeatReader',
  storeName: 'ebookStore',
  description: 'Neat Reader电子书阅读器数据存储'
});

// 定义电子书状态管理
export const useEbookStore = defineStore('ebook', () => {
  // 状态
  const books = ref<EbookMetadata[]>([]);
  const categories = ref<BookCategory[]>([]);
  const currentBook = ref<EbookMetadata | null>(null);
  const readingProgress = ref<ReadingProgress | null>(null);
  const baidupanUser = ref<{baidu_name: string; avatar_url: string; vip_type: number} | null>(null);
  const baidupanUserInfoCache = ref<{data: any, timestamp: number} | null>(null);
  
  // AI 对话历史（每本书独立）
  const aiConversations = ref<Map<string, AIConversationHistory>>(new Map());
  const userConfig = ref<UserConfig>({
    storage: {
      default: 'local',
      localPath: '',
      autoSync: true,
      syncInterval: 15,
      baidupan: null
    },
    reader: {
      fontSize: 18,
      fontFamily: 'system',
      theme: 'light',
      pageMode: 'page',
      brightness: 100,
      lineSpacing: 1.5,
      lineHeight: 1.5,
      paragraphSpacing: 8,
      autoSaveInterval: 10
    },
    ui: {
      viewMode: 'grid',
      language: 'zh-CN'
    }
  });
  const deviceInfo = ref<DeviceInfo>({
    id: 'device-1',
    name: '本地设备',
    type: 'desktop',
    platform: 'windows',
    lastSync: Date.now()
  });

  // 计算属性
  const localBooks = computed(() => {
    return books.value.filter(book => book.storageType === 'local');
  });

  const baidupanBooks = computed(() => {
    return books.value.filter(book => book.storageType === 'baidupan');
  });

  const recentBooks = computed(() => {
    return [...books.value]
      .sort((a, b) => b.lastRead - a.lastRead)
      .slice(0, 10);
  });

  // 分类相关方法（不是计算属性，因为需要参数）
  const getBooksByCategory = (categoryId: string) => {
    return books.value.filter(book => book.categoryId === categoryId);
  };

  const getCategoryById = (categoryId: string) => {
    return categories.value.find(category => category.id === categoryId) || null;
  };

  // Blob URL 转 Base64 工具函数
  const blobToBase64 = (blobUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get 2d context'));
              return;
            }

            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load blob image'));
        };

        img.src = blobUrl;
      } catch (e) {
        reject(e);
      }
    });
  };

  // 方法
  const loadBooks = async () => {
    try {
      console.log('开始加载书籍列表...');
      const savedBooks = await localforage.getItem<EbookMetadata[]>('books');
      
      if (savedBooks) {
        console.log('成功加载书籍列表，书籍数量:', savedBooks.length);
        books.value = savedBooks;
        
        // 为EPUB书籍重新生成封面（并行处理）
        await Promise.all(books.value.map(async (book) => {
          if (book.cover && book.cover.startsWith('blob:')) {
            console.log('清除失效的 blob 封面链接:', book.id);
            book.cover = '';
          }
          
          if (book.format === 'epub' && !book.cover) {
            try {
              //console.log('为书籍重新生成封面:', book.id);
              const fileContent = await localforage.getItem<ArrayBuffer>(`ebook_content_${book.id}`);
              if (fileContent) {
                const epubBook = ePub(fileContent as ArrayBuffer);
                await new Promise((resolve, reject) => {
                  epubBook.ready.then(resolve).catch(reject);
                });
                const coverUrl = await epubBook.coverUrl();
                if (coverUrl) {
                  if (coverUrl.startsWith('blob:')) {
                    try {
                      console.log('将重新生成的封面转换为 Base64');
                      book.cover = await blobToBase64(coverUrl);
                      console.log('封面重新生成并转换成功:', book.id);
                      URL.revokeObjectURL(coverUrl);
                    } catch (e) {
                      console.warn('封面转换 Base64 失败:', e);
                    }
                  } else {
                    book.cover = coverUrl;
                    console.log('封面重新生成成功:', book.id);
                  }
                }
              }
            } catch (e) {
              console.warn('封面重新生成失败:', book.id, e);
            }
          }
        }));
        
        // 验证加载的数据
        // if (books.value.length > 0) {
        //   console.log('加载的书籍示例:', {
        //     id: books.value[0].id,
        //     title: books.value[0].title,
        //     author: books.value[0].author,
        //     cover: books.value[0].cover,
        //     storageType: books.value[0].storageType
        //   });
        // }
      } else {
        console.log('未找到保存的书籍列表，初始化为空数组');
        books.value = [];
      }
    } catch (error) {
      console.error('加载电子书列表失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      // 出错时初始化为空数组
      books.value = [];
    }
  };

  const saveBooks = async () => {
    try {
      // 保存书籍列表，确保数据可序列化
      const booksToSave = books.value.map(book => {
        // 创建可序列化的书籍对象
        const serializableBook: EbookMetadata = {
          id: book.id,
          title: book.title,
          author: book.author,
          cover: book.cover || '', // 确保封面字段存在，如果是blob URL会在加载时重新生成
          path: book.path,
          format: book.format,
          size: book.size,
          lastRead: book.lastRead,
          totalChapters: book.totalChapters,
          readingProgress: book.readingProgress,
          storageType: book.storageType,
          baidupanPath: book.baidupanPath,
          categoryId: book.categoryId,
          addedAt: book.addedAt
        };
        
        return serializableBook;
      });
      
      //console.log('正在保存书籍列表，书籍数量:', booksToSave.length);
      
      await localforage.setItem('books', booksToSave);
      // console.log('书籍列表保存成功');
    } catch (error) {
      console.error('保存电子书列表失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
    }
  };

  // 加载分类列表
  const loadCategories = async () => {
    try {
      // console.log('开始加载分类列表...');
      const savedCategories = await localforage.getItem<BookCategory[]>('categories');
      
      if (savedCategories && Array.isArray(savedCategories) && savedCategories.length > 0) {
        //console.log('成功加载分类列表，分类数量:', savedCategories.length);
        // 确保数据是干净的纯对象
        categories.value = savedCategories.map(category => ({
          id: category.id || `category_${Date.now()}_${Math.random()}`,
          name: category.name || '未命名',
          color: category.color || '#999999',
          bookIds: Array.isArray(category.bookIds) ? [...category.bookIds] : [],
          createdAt: category.createdAt || Date.now(),
          updatedAt: category.updatedAt || Date.now()
        }));
      } else {
        console.log('未找到保存的分类列表或分类为空，创建默认分类');
        categories.value = [];
        // 直接设置默认分类，不调用addCategory以避免可能的递归问题
        const defaultCategory: BookCategory = {
          id: `category_default_${Date.now()}`,
          name: '未分类',
          color: '#999999',
          bookIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        categories.value.push(defaultCategory);
        // 保存到本地存储
        await localforage.setItem('categories', [defaultCategory]);
        console.log('默认分类创建成功');
      }
    } catch (error) {
      console.error('加载分类列表失败:', error);
      // 出错时初始化为默认分类
      categories.value = [];
      const defaultCategory: BookCategory = {
        id: `category_default_${Date.now()}`,
        name: '未分类',
        color: '#999999',
        bookIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      categories.value.push(defaultCategory);
      try {
        await localforage.setItem('categories', [defaultCategory]);
      } catch (e) {
        console.error('保存默认分类失败:', e);
      }
    }
  };

  // 保存分类列表
  const saveCategories = async () => {
    try {
      console.log('正在保存分类列表，分类数量:', categories.value.length);
      console.log('分类列表内容:', JSON.stringify(categories.value));
      
      // 确保数据是可序列化的
      const categoriesToSave = categories.value.map(category => ({
        id: category.id,
        name: category.name,
        color: category.color,
        bookIds: Array.isArray(category.bookIds) ? [...category.bookIds] : [],
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }));
      
      console.log('准备保存的分类数据:', JSON.stringify(categoriesToSave));
      
      await localforage.setItem('categories', categoriesToSave);
      
      // 验证保存是否成功
      const savedData = await localforage.getItem('categories');
      console.log('验证保存结果:', savedData);
      
      if (savedData && Array.isArray(savedData) && savedData.length === categoriesToSave.length) {
        console.log('分类列表保存成功，验证通过');
      } else {
        console.error('分类列表保存验证失败');
      }
    } catch (error) {
      console.error('保存分类列表失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      throw error;
    }
  };

  // 添加分类
  const addCategory = async (name: string, color: string) => {
    try {
      console.log('开始添加分类:', name, color);
      
      const newCategory: BookCategory = {
        id: `category_${uuidv4()}`,
        name,
        color,
        bookIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      console.log('新分类对象:', newCategory);
      
      categories.value.push(newCategory);
      
      console.log('分类已添加到内存，当前分类数量:', categories.value.length);
      console.log('准备保存分类到本地存储...');
      
      await saveCategories();
      
      console.log('分类添加成功:', newCategory.name);
      return newCategory;
    } catch (error) {
      console.error('添加分类失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      throw error; // 重新抛出错误，让调用方知道失败
    }
  };

  // 更新分类
  const updateCategory = async (categoryId: string, updates: Partial<BookCategory>) => {
    try {
      const index = categories.value.findIndex(category => category.id === categoryId);
      if (index !== -1) {
        categories.value[index] = {
          ...categories.value[index],
          ...updates,
          updatedAt: Date.now()
        };
        await saveCategories();
        console.log('分类更新成功:', categories.value[index].name);
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新分类失败:', error);
      return false;
    }
  };

  // 删除分类
  const deleteCategory = async (categoryId: string) => {
    try {
      const index = categories.value.findIndex(category => category.id === categoryId);
      if (index !== -1) {
        const categoryName = categories.value[index].name;
        
        // 将该分类下的书籍移动到未分类
        const uncategorized = categories.value.find(cat => cat.name === '未分类');
        if (uncategorized) {
          for (const bookId of categories.value[index].bookIds) {
            const bookIndex = books.value.findIndex(book => book.id === bookId);
            if (bookIndex !== -1) {
              books.value[bookIndex].categoryId = uncategorized.id;
            }
          }
          await saveBooks();
        }
        
        categories.value.splice(index, 1);
        await saveCategories();
        
        console.log('分类删除成功:', categoryName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除分类失败:', error);
      return false;
    }
  };

  // 将书籍添加到分类
  const addBookToCategory = async (bookId: string, categoryId: string) => {
    try {
      // 更新书籍的分类ID
      const bookIndex = books.value.findIndex(book => book.id === bookId);
      if (bookIndex !== -1) {
        // 从原分类中移除
        if (books.value[bookIndex].categoryId) {
          const oldCategoryIndex = categories.value.findIndex(cat => cat.id === books.value[bookIndex].categoryId);
          if (oldCategoryIndex !== -1) {
            categories.value[oldCategoryIndex].bookIds = categories.value[oldCategoryIndex].bookIds.filter(id => id !== bookId);
            categories.value[oldCategoryIndex].updatedAt = Date.now();
          }
        }
        
        // 添加到新分类
        books.value[bookIndex].categoryId = categoryId;
        
        const categoryIndex = categories.value.findIndex(cat => cat.id === categoryId);
        if (categoryIndex !== -1 && !categories.value[categoryIndex].bookIds.includes(bookId)) {
          categories.value[categoryIndex].bookIds.push(bookId);
          categories.value[categoryIndex].updatedAt = Date.now();
        }
        
        await saveBooks();
        await saveCategories();
        
        console.log('书籍添加到分类成功:', bookId, '->', categoryId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('添加书籍到分类失败:', error);
      return false;
    }
  };

  // 从分类中移除书籍
  const removeBookFromCategory = async (bookId: string) => {
    try {
      const bookIndex = books.value.findIndex(book => book.id === bookId);
      if (bookIndex !== -1 && books.value[bookIndex].categoryId) {
        const categoryId = books.value[bookIndex].categoryId;
        
        // 从分类中移除
        const categoryIndex = categories.value.findIndex(cat => cat.id === categoryId);
        if (categoryIndex !== -1) {
          categories.value[categoryIndex].bookIds = categories.value[categoryIndex].bookIds.filter(id => id !== bookId);
          categories.value[categoryIndex].updatedAt = Date.now();
        }
        
        // 移除书籍的分类ID
        books.value[bookIndex].categoryId = undefined;
        
        await saveBooks();
        await saveCategories();
        
        console.log('书籍从分类中移除成功:', bookId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('从分类中移除书籍失败:', error);
      return false;
    }
  };

  // 搜索书籍
  const searchBooks = async (keyword: string): Promise<EbookMetadata[]> => {
    try {
      console.log('开始搜索书籍，关键字:', keyword);
      
      // 本地搜索
      const localResults = books.value.filter(book => {
        return book.title.toLowerCase().includes(keyword.toLowerCase()) ||
               book.author.toLowerCase().includes(keyword.toLowerCase());
      });
      
      console.log('本地搜索结果数量:', localResults.length);
      
      // 如果有百度网盘令牌，也在百度网盘中搜索
      const tokenValid = await ensureBaidupanToken();
      console.log('百度网盘令牌是否有效:', tokenValid);
      
      if (tokenValid && userConfig.value.storage.baidupan) {
        const { accessToken, rootPath } = userConfig.value.storage.baidupan;
        const searchDir = rootPath || `/apps/${AppName}`;
        console.log('搜索目录:', searchDir);
        
        try {
          const result = await api.searchFiles(
            accessToken,
            keyword,
            searchDir,
            'search',
            1
          );
          const data = result;
          console.log('百度网盘搜索结果:', data);
          
          if (data.list && Array.isArray(data.list) && data.list.length > 0) {
            for (const fileInfo of data.list) {
              if (!fileInfo.server_filename) continue;
              
              const ext = fileInfo.server_filename.split('.').pop()?.toLowerCase();
              if (['epub', 'pdf', 'txt'].includes(ext || '')) {
                const existingBook = books.value.find(book => 
                  book.baidupanPath === fileInfo.path
                );
                
                if (!existingBook) {
                  const newBook: EbookMetadata = {
                    id: `baidupan_${fileInfo.fs_id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: fileInfo.server_filename.replace(`.${ext}`, ''),
                    author: '未知作者',
                    cover: '',
                    path: fileInfo.path || '',
                    format: ext || 'txt',
                    size: fileInfo.size || 0,
                    lastRead: Date.now(),
                    totalChapters: 0,
                    readingProgress: 0,
                    storageType: 'baidupan',
                    baidupanPath: fileInfo.path || '',
                    addedAt: Date.now()
                  };
                  
                  localResults.push(newBook);
                  console.log('添加百度网盘搜索结果:', newBook.title);
                }
              }
            }
          } else {
            console.log('百度网盘中没有找到匹配的电子书');
          }
        } catch (fetchError) {
          console.warn('百度网盘搜索请求失败，跳过网盘搜索:', fetchError);
        }
      } else {
        console.log('百度网盘令牌无效，跳过网盘搜索');
      }
      
      console.log('搜索完成，总结果数量:', localResults.length);
      return localResults;
    } catch (error) {
      console.error('搜索书籍失败:', error);
      // 出错时返回空数组
      return [];
    }
  };

  const addBook = async (book: EbookMetadata) => {
    try {
      console.log('添加书籍到列表:', book.title);
      books.value.push(book);
      
      // 立即保存到持久化存储
      await saveBooks();
      
      console.log('书籍添加并保存成功');
    } catch (error) {
      console.error('添加书籍失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      throw error; // 重新抛出错误，让调用方知道操作失败
    }
  };

  const updateBook = async (bookId: string, updates: Partial<EbookMetadata>) => {
    const index = books.value.findIndex(book => book.id === bookId);
    if (index !== -1) {
      console.log('updateBook - 更新前:', { 
        id: books.value[index].id, 
        storageType: books.value[index].storageType,
        uploading: books.value[index].uploading 
      });
      console.log('updateBook - 更新内容:', updates);
      
      // 使用 Object.assign 直接修改对象，确保响应式更新
      Object.assign(books.value[index], updates);
      
      // 显式清除上传状态
      if (updates.storageType === 'synced') {
        books.value[index].uploading = false;
      }
      
      console.log('updateBook - 更新后:', { 
        id: books.value[index].id, 
        storageType: books.value[index].storageType,
        uploading: books.value[index].uploading 
      });
      
      await saveBooks();
    } else {
      console.error('updateBook - 未找到书籍:', bookId);
    }
  };

  const removeBook = async (bookId: string, storageType?: 'local' | 'baidupan') => {
    try {
      // 1. 找到索引
      const index = books.value.findIndex(book => book.id === bookId);
      if (index === -1) return false;

      const actualStorageType = storageType || books.value[index].storageType;

      // 2. 使用 splice 显式触发 Vue 响应式（更稳健）
      books.value.splice(index, 1);
      
      // 3. 异步执行持久化清理，不阻塞 UI 响应
      saveBooks(); 

      if (actualStorageType === 'local') {
        localforage.removeItem(`ebook_content_${bookId}`);
        localforage.removeItem(`ebook_cover_${bookId}`);
      }
      
      console.log('书籍删除成功');
      return true;
    } catch (error) {
      console.error('删除书籍失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      return false;
    }
  };

  const getBookById = (bookId: string) => {
    return books.value.find(book => book.id === bookId) || null;
  };

  const setCurrentBook = (book: EbookMetadata | null) => {
    currentBook.value = book;
  };

  const loadReadingProgress = async (ebookId: string) => {
    try {
      const progress = await localforage.getItem<ReadingProgress>(`progress_${ebookId}`);
      readingProgress.value = progress || null;
      return progress;
    } catch (error) {
      console.error('加载阅读进度失败:', error);
      return null;
    }
  };

  const saveReadingProgress = async (progress: ReadingProgress) => {
    try {
      readingProgress.value = progress;
      await localforage.setItem(`progress_${progress.ebookId}`, progress);
      
      // 更新电子书的阅读进度
      await updateBook(progress.ebookId, {
        lastRead: progress.timestamp,
        readingProgress: Math.round(progress.position * 100)
      });
    } catch (error) {
      console.error('保存阅读进度失败:', error);
    }
  };

  const loadUserConfig = async () => {
    try {
      const config = await localforage.getItem<UserConfig>('userConfig');
      if (config) {
        // 如果rootPath是'/NeatReader'，则将其重置为空字符串，符合百度网盘API要求
        if (config.storage.baidupan && config.storage.baidupan.rootPath === '/NeatReader') {
          config.storage.baidupan.rootPath = '';
        }
        userConfig.value = config;
      }
      
      // 加载百度网盘用户信息缓存
      const userInfoCache = await localforage.getItem<{data: any, timestamp: number}>('baidupanUserInfoCache');
      if (userInfoCache) {
        const cacheAge = Date.now() - userInfoCache.timestamp;
        const USER_INFO_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
        if (cacheAge < USER_INFO_CACHE_DURATION) {
          console.log('使用缓存的百度网盘用户信息');
          baidupanUser.value = userInfoCache.data;
          baidupanUserInfoCache.value = userInfoCache;
        }
      }
    } catch (error) {
      console.error('加载用户配置失败:', error);
    }
  };

  const saveUserConfig = async () => {
    try {
      // 深拷贝userConfig，确保所有对象都是可序列化的
      const serializableConfig = JSON.parse(JSON.stringify(userConfig.value));
      await localforage.setItem('userConfig', serializableConfig);
      await localforage.setItem('userConfigTimestamp', Date.now());
    } catch (error) {
      console.error('保存用户配置失败:', error);
    }
  };

  const updateUserConfig = async (updates: Partial<UserConfig>, skipSync = false) => {
    userConfig.value = { ...userConfig.value, ...updates };
    await saveUserConfig();
    
    // 同步到百度网盘
    if (skipSync) {
      return;
    }
    
    // 检查是否在 Wails 环境中
    if (!uploadToBaidupanNew) {
      console.log('非 Wails 环境，跳过配置云端同步');
      return;
    }
    
    try {
      if (await ensureBaidupanToken()) {
        const configData = JSON.stringify({ config: userConfig.value, timestamp: Date.now() });
        const configFile = new File([configData], 'config.json', { type: 'application/json' });
        await uploadToBaidupanNew(configFile, '/sync');
        console.log('用户配置已同步到百度网盘');
      }
    } catch (error) {
      console.warn('同步用户配置到百度网盘失败:', error);
    }
  };

  // 应用名称，用于百度网盘搜索路径
  const AppName = 'Neat Reader';

  // 百度网盘 API 配置
  const baidupanApiConfig = {
    clientId: 'hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf', // 替换为真实的 App Key
    clientSecret: 'YH2VpZcFJHYNnV6vLfHQXDBhcE7ZChyE', // 替换为真实的 App Secret
    redirectUri: 'http://localhost:8080/callback' // 替换为真实的回调地址
  };

  // 刷新百度网盘访问令牌
  const refreshBaidupanToken = async (): Promise<boolean> => {
    try {
      if (!userConfig.value.storage.baidupan) {
        return false;
      }
      const { refreshToken } = userConfig.value.storage.baidupan;
      if (!refreshToken) {
        return false;
      }
      
      const result = await api.refreshToken(
        refreshToken,
        baidupanApiConfig.clientId,
        baidupanApiConfig.clientSecret
      );
      
      const data = result;
      
      if (data.error) {
        console.error('刷新百度网盘令牌失败:', data.error);
        return false;
      }
      
      console.log('刷新百度网盘令牌成功:', {
        access_token: data.access_token ? '***' : null,
        refresh_token: data.refresh_token ? '***' : null,
        expires_in: data.expires_in
      });
      
      if (data.access_token && userConfig.value.storage.baidupan) {
        await updateUserConfig({
          storage: {
            ...userConfig.value.storage,
            baidupan: {
              ...userConfig.value.storage.baidupan,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiration: Date.now() + (data.expires_in * 1000),
              rootPath: userConfig.value.storage.baidupan.rootPath || '',
              userId: userConfig.value.storage.baidupan.userId || '',
              namingStrategy: userConfig.value.storage.baidupan.namingStrategy || '1'
            }
          }
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('刷新百度网盘令牌失败:', error);
      return false;
    }
  };

  // 检查百度网盘令牌是否有效
  const isBaidupanTokenValid = (): boolean => {
    const baidupan = userConfig.value.storage.baidupan;
    if (!baidupan) {
      return false;
    }
    const { accessToken, expiration } = baidupan;
    // 确保accessToken存在且剩余时间大于1小时
    const oneHourInMs = 60 * 60 * 1000;
    return !!accessToken && (expiration - Date.now()) > oneHourInMs;
  };

  // 确保百度网盘令牌有效
  const ensureBaidupanToken = async (): Promise<boolean> => {
    if (isBaidupanTokenValid()) {
      return true;
    }
    return await refreshBaidupanToken();
  };

  // 获取百度网盘用户信息
  const fetchBaidupanUserInfo = async (forceRefresh = false) => {
    if (!userConfig.value.storage.baidupan?.accessToken) {
      baidupanUser.value = null
      return
    }

    const USER_INFO_CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

    // 检查缓存
    if (!forceRefresh && baidupanUserInfoCache.value) {
      const cacheAge = Date.now() - baidupanUserInfoCache.value.timestamp
      if (cacheAge < USER_INFO_CACHE_DURATION) {
        console.log('使用缓存的百度网盘用户信息')
        baidupanUser.value = baidupanUserInfoCache.value.data
        return
      }
    }

    try {
      const result = await api.verifyToken(userConfig.value.storage.baidupan.accessToken)
      const data = result
      console.log('verifyToken 返回数据:', data)
      if (data.errno === 0 || !data.error) {
        const userInfo = {
          baidu_name: data.baidu_name || data.netdisk_name || data.name || '未知用户',
          avatar_url: data.avatar_url || '',
          vip_type: data.vip_type || 0
        }
        baidupanUser.value = userInfo
        const cacheData = {
          data: userInfo,
          timestamp: Date.now()
        }
        baidupanUserInfoCache.value = cacheData
        // 保存缓存到 localforage - 使用 JSON 序列化确保对象可克隆
        await localforage.setItem('baidupanUserInfoCache', JSON.parse(JSON.stringify(cacheData)))
      } else {
        console.log('verifyToken 失败:', data)
        baidupanUser.value = null
        baidupanUserInfoCache.value = null
        await localforage.removeItem('baidupanUserInfoCache')
      }
    } catch (error) {
      console.error('verifyToken 异常:', error)
      baidupanUser.value = null
      baidupanUserInfoCache.value = null
      await localforage.removeItem('baidupanUserInfoCache')
    }
  };

  // 检查文件大小限制
  const checkFileSizeLimit = (fileSize: number): boolean => {
    const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024;
    
    if (fileSize > MAX_FILE_SIZE) {
      console.error(`文件大小超过限制，最大支持 ${(MAX_FILE_SIZE / (1024 * 1024 * 1024)).toFixed(1)}GB`);
      return false;
    }
    
    return true;
  };

  const uploadToBaidupanNew = async (file: File, path: string): Promise<boolean> => {
    try {
      // console.log('开始上传到百度网盘:', file.name, '大小:', file.size, '路径:', path);
      
      // 确保令牌有效
      if (!await ensureBaidupanToken() || !userConfig.value.storage.baidupan) {
        console.error('百度网盘令牌无效或刷新失败');
        return false;
      }
      
      // 检查文件大小限制
      if (!checkFileSizeLimit(file.size)) {
        console.error('文件大小超过限制');
        return false;
      }
      
      const { accessToken } = userConfig.value.storage.baidupan;
      
      // 构建路径，直接使用相对路径，服务器端会添加/apps/网盘前缀
      const relativePath = path ? path.replace(/^\/+|\/+$/g, '') : '';

      // console.log('准备上传文件到Go服务器:', {
      //   fileName: file.name,
      //   relativePath: relativePath,
      //   fileSize: file.size,
      //   accessToken: accessToken ? '***' : null
      // });
      
      const fileArrayBuffer = await file.arrayBuffer();
      const fileBytes = Array.from(new Uint8Array(fileArrayBuffer));
      
      // console.log('文件转换为字节数组成功，长度:', fileBytes.length);
      
      const result = await api.uploadFile(file.name, fileBytes, accessToken);
      // console.log('后端服务器返回结果:', result);
      
      const uploadResult = result;
      // console.log('解析后的上传结果:', uploadResult);
      
      // 处理文件已存在的情况（error_code: 31061）
      if (uploadResult.error_code === 31061) {
        console.log('文件已存在，视为上传成功:', file.name);
        return true;
      }
      
      if (uploadResult.error) {
        console.error('上传失败，错误信息:', uploadResult.error);
        return false;
      }
      
      if (uploadResult.path || uploadResult.fs_id) {
        // console.log('文件上传成功:', uploadResult.path || uploadResult.fs_id);
        return true;
      } else {
        console.error('文件上传失败，返回结果中没有路径或文件ID:', uploadResult);
        return false;
      }
      
    } catch (error) {
      console.error('上传文件到百度网盘失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      return false;
    }
  };
  
  // 将本地书籍上传到百度网盘
  const uploadLocalBookToBaidupan = async (book: EbookMetadata): Promise<boolean> => {
    try {
      console.log('开始上传本地书籍到百度网盘:', book.title);
      
      // 确保令牌有效
      if (!await ensureBaidupanToken()) {
        console.error('百度网盘令牌无效，无法上传');
        throw new Error('百度网盘令牌无效，请先在设置中授权');
      }
      
      // 从 IndexedDB 获取文件内容
      console.log('尝试从 IndexedDB 获取文件内容，键名:', `ebook_content_${book.id}`);
      const fileContent = await localforage.getItem<ArrayBuffer>(`ebook_content_${book.id}`);
      if (!fileContent) {
        console.error('无法获取书籍文件内容');
        throw new Error('无法获取书籍文件内容，可能文件已损坏');
      }
      console.log('获取文件内容成功，大小:', fileContent.byteLength);
      
      // 将 ArrayBuffer 转换为 File 对象
      // 清理和规范化文件名，确保符合百度网盘的要求
      const cleanFileName = (name: string): string => {
        // 移除或替换不允许的字符
        let cleaned = name
          .replace(/[<>:"|?*\/\\]/g, '') // 移除不允许的特殊字符
          .replace(/\s+/g, '_') // 将空格替换为下划线
          .trim(); // 移除首尾空格
        
        // 限制文件名长度（百度网盘通常限制为255字符）
        if (cleaned.length > 200) {
          cleaned = cleaned.substring(0, 200);
        }
        
        return cleaned;
      };
      
      const fileName = `${cleanFileName(book.title)}.${book.format}`;
      console.log('清理后的文件名:', fileName);
      
      const file = new File([fileContent], fileName, { 
        type: `application/${book.format === 'epub' ? 'epub+zip' : book.format}` 
      });
      console.log('创建 File 对象成功:', fileName, '类型:', file.type);
      
      // 上传到百度网盘
      let uploadPath = '';
      if (userConfig.value.storage.baidupan) {
        uploadPath = userConfig.value.storage.baidupan.rootPath || '';
      }
      // 确保uploadPath是有效的，避免生成//fileName这样的路径
      if (!uploadPath || uploadPath === '/') {
        uploadPath = '';
      }
      // console.log('开始上传到百度网盘，路径:', uploadPath ? `${uploadPath}/${fileName}` : fileName);
      
      const uploadResult = await uploadToBaidupanNew(file, uploadPath);
      
      if (uploadResult) {
        console.log('上传成功，更新书籍存储类型');
        
        // 先在内存中更新，确保响应式
        const bookIndex = books.value.findIndex(b => b.id === book.id);
        if (bookIndex !== -1) {
          // 直接修改数组中的对象属性，触发响应式
          const existingCover = books.value[bookIndex].cover || book.cover;
          books.value[bookIndex].storageType = 'synced';
          books.value[bookIndex].baidupanPath = `${uploadPath}/${fileName}`;
          books.value[bookIndex].uploading = false;
          books.value[bookIndex].cover = existingCover;
          
          console.log('内存状态已更新:', {
            id: books.value[bookIndex].id,
            storageType: books.value[bookIndex].storageType,
            uploading: books.value[bookIndex].uploading,
            hasCover: !!books.value[bookIndex].cover
          });
        }
        
        // 再调用 updateBook 持久化到 IndexedDB
        await updateBook(book.id, {
          storageType: 'synced',
          baidupanPath: `${uploadPath}/${fileName}`,
          cover: books.value[bookIndex]?.cover || book.cover,
          uploading: false
        });
        
        console.log('书籍上传到百度网盘成功:', book.title);
        return true;
      }
      
      console.error('上传失败，uploadToBaidupan 返回 false');
      throw new Error('上传到百度网盘失败，请检查网络连接或重试');
    } catch (error) {
      console.error('上传本地书籍到百度网盘失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
        throw error; // 重新抛出错误，让调用方知道失败原因
      }
      throw new Error('上传失败，未知错误');
    }
  };

  // 从百度网盘下载 Blob（用于同步配置等）
  const downloadBlobFromBaidupan = async (path: string): Promise<Blob | null> => {
    try {
      // 确保令牌有效
      if (!await ensureBaidupanToken() || !userConfig.value.storage.baidupan) {
        return null;
      }
      
      const { accessToken, rootPath } = userConfig.value.storage.baidupan;
      
      // 从路径中提取目录和文件名
      const pathParts = path.split('/').filter(p => p);
      const fileName = pathParts.pop() || '';
      const dirPath = pathParts.length > 0 ? `/${pathParts.join('/')}` : (rootPath || `/apps/${AppName}`);
      
      console.log('下载文件 - 目录:', dirPath, '文件名:', fileName);
      
      // 先获取文件列表
      const result = await api.getFileList(
        accessToken,
        dirPath,
        1,
        1000,
        'name',
        'list',
        1
      );
      const fileListData = result;
      
      if (fileListData.error || !fileListData.list) {
        console.log('获取文件列表失败或为空:', fileListData);
        return null;
      }
      
      // 查找目标文件
      const targetFile = fileListData.list.find((file: any) => 
        file.server_filename === fileName && !file.isdir
      );
      
      if (!targetFile) {
        console.log('未找到文件:', fileName);
        return null;
      }
      
      // 获取下载链接
      const downloadResult = await api.getFileList(
        accessToken,
        dirPath,
        1,
        1,
        'name',
        'download',
        0
      );
      const downloadUrlData = JSON.parse(downloadResult);
      console.log('获取下载链接响应:', downloadUrlData);
      
      if (downloadUrlData.error || !downloadUrlData.dlink) {
        console.error('获取下载链接失败:', downloadUrlData);
        return null;
      }
      
      const fileResponse = await fetch(downloadUrlData.dlink);
      if (!fileResponse.ok) {
        console.error('下载文件失败:', fileResponse.status);
        return null;
      }
      
      const blob = await fileResponse.blob();
      return blob;
    } catch (error) {
      console.error('从百度网盘下载文件失败:', error);
      return null;
    }
  };

  // 从百度网盘下载文件
  const downloadFromBaidupan = async (path: string): Promise<boolean> => {
    try {
      // 确保令牌有效
      if (!await ensureBaidupanToken() || !userConfig.value.storage.baidupan) {
        return false;
      }
      
      const { accessToken } = userConfig.value.storage.baidupan;
      
      // 从完整路径中提取文件名（去除前导斜杠）
      const fileName = path.replace(/^.*\//, '').replace(/^\//, '');
      console.log('下载文件 - 原始路径:', path, '提取的文件名:', fileName);
      
      // 固定在 /apps/Neat Reader 目录下搜索
      const searchDir = `/apps/${AppName}`;
      console.log('搜索目录:', searchDir);
      
      // 阶段1：获取文件列表（获取 fsid）
      const fileListData = await api.getFileList(
        accessToken,
        searchDir,
        1,
        1000,
        'name',
        'list',
        1
      );
      console.log('获取文件列表响应:', fileListData);
      
      if (fileListData.error_code) {
        console.error('获取文件列表失败:', fileListData);
        return false;
      }
      
      if (!fileListData.list || fileListData.list.length === 0) {
        console.error('文件列表为空:', fileListData);
        return false;
      }
      
      // 在文件列表中查找匹配的文件
      const targetFile = fileListData.list.find((file: any) => file.server_filename === fileName);
      if (!targetFile) {
        console.error('未找到目标文件:', fileName, '文件列表:', fileListData.list);
        return false;
      }
      
      const fsid = targetFile.fs_id;
      console.log('获取到 fsid:', fsid);
      
      // 阶段2：查询文件信息（获取 dlink）
      const fileInfoData = await api.getFileInfo(accessToken, fsid.toString());
      console.log('获取文件信息响应:', fileInfoData);
      
      if (fileInfoData.error_code || fileInfoData.errno) {
        console.error('获取文件信息失败:', fileInfoData);
        return false;
      }
      
      // 百度网盘 API 返回的数据结构是 info 数组，不是 list 数组
      if (!fileInfoData.info || !Array.isArray(fileInfoData.info) || fileInfoData.info.length === 0) {
        console.error('没有下载链接，完整响应:', JSON.stringify(fileInfoData, null, 2));
        return false;
      }
      
      const dlink = fileInfoData.info[0].dlink;
      if (!dlink) {
        console.error('没有下载链接，完整响应:', JSON.stringify(fileInfoData, null, 2));
        return false;
      }
      
      console.log('获取到 dlink:', dlink);
      
      // 阶段3：下载文件（使用后端下载，避免 CORS 问题）
      const downloadResult = await api.downloadFile(dlink, accessToken);
      
      console.log('下载响应:', downloadResult);
      
      if (!downloadResult.success || !downloadResult.data || downloadResult.data.length === 0) {
        console.error('下载文件失败:', downloadResult.error || '文件数据为空');
        return false;
      }
      
      // 后端返回的是数组格式，转换为 ArrayBuffer
      const arrayBuffer = new Uint8Array(downloadResult.data).buffer;
      
      // 获取文件名和扩展名
      const ext = fileName.split('.').pop()?.toLowerCase() || 'epub';
      const title = fileName.replace(`.${ext}`, '');
      
      // 检查是否已经存在相同的云端书籍
      const existingCloudBook = books.value.find(book => 
        book.baidupanPath === path || book.title === title
      );
      
      let id;
      if (existingCloudBook) {
        // 如果存在，更新现有书籍
        id = existingCloudBook.id;
        console.log('更新已存在的云端书籍:', title, 'ID:', id);
      } else {
        // 如果不存在，创建新 ID
        id = `downloaded_${uuidv4()}`;
        console.log('创建新的云端书籍:', title, 'ID:', id);
      }
      
      // 保存文件内容到 IndexedDB
      await localforage.setItem(`ebook_content_${id}`, arrayBuffer);
      
      // 创建电子书元数据
      const ebookMetadata: EbookMetadata = {
        id,
        title,
        author: '未知作者',
        cover: existingCloudBook?.cover || '',
        path: id,
        format: ext,
        size: arrayBuffer.byteLength,
        lastRead: Date.now(),
        totalChapters: 0,
        readingProgress: existingCloudBook?.readingProgress || 0,
        storageType: 'synced',
        baidupanPath: path,
        addedAt: existingCloudBook?.addedAt || Date.now()
      };
      
      if (existingCloudBook) {
        // 更新现有书籍
        await updateBook(id, ebookMetadata);
      } else {
        // 添加新书籍
        await addBook(ebookMetadata);
      }
      
      // 如果是 EPUB，尝试生成封面和解析元数据
      if (ext === 'epub') {
        try {
          const epubBook = ePub(arrayBuffer as ArrayBuffer);
          await new Promise((resolve, reject) => {
            epubBook.ready.then(resolve).catch(reject);
          });
          
          const coverUrl = await epubBook.coverUrl();
          if (coverUrl) {
            if (coverUrl.startsWith('blob:')) {
              try {
                ebookMetadata.cover = await blobToBase64(coverUrl);
                URL.revokeObjectURL(coverUrl);
              } catch (e) {
                console.warn('封面转换 Base64 失败:', e);
              }
            } else {
              ebookMetadata.cover = coverUrl;
            }
          }
          
          const metadata = await epubBook.loaded.metadata;
          if (metadata) {
            if (metadata.creator) {
              ebookMetadata.author = Array.isArray(metadata.creator) 
                ? metadata.creator.join(', ') 
                : metadata.creator;
            }
            console.log('EPUB 元数据:', metadata);
          }
          
          // 更新封面和作者信息
          await updateBook(id, { 
            cover: ebookMetadata.cover,
            author: ebookMetadata.author
          });
        } catch (e) {
          console.warn('EPUB 元数据解析失败:', e);
        }
      }
      
      console.log('从百度网盘下载文件成功:', fileName);
      return true;
    } catch (error) {
      console.error('从百度网盘下载文件失败:', error);
      return false;
    }
  };

  // 加载百度网盘书籍列表
  const loadBaidupanBooks = async () => {
    try {
      if (!await ensureBaidupanToken() || !userConfig.value.storage.baidupan) {
        console.log('百度网盘令牌无效，跳过加载云端书籍');
        return;
      }
      
      const { accessToken, rootPath } = userConfig.value.storage.baidupan;
      const searchDir = rootPath || `/apps/${AppName}`;
      console.log('开始加载百度网盘书籍，目录:', searchDir);
      
      const result = await api.getFileList(
        accessToken,
        searchDir,
        1,
        1000,
        'name',
        'list',
        1
      );
      const data = result;
      // console.log('百度网盘文件列表:', data);
      
      if (data.list && Array.isArray(data.list) && data.list.length > 0) {
        for (const fileInfo of data.list) {
          if (fileInfo.isdir) continue;
          if (!fileInfo.server_filename) continue;
          
          const ext = fileInfo.server_filename.split('.').pop()?.toLowerCase();
          if (!['epub', 'pdf', 'txt'].includes(ext || '')) continue;
          
          const title = fileInfo.server_filename.replace(`.${ext}`, '');
          const cloudPath = fileInfo.path || '';
          
          const normalizeTitle = (t: string): string => {
            return t.toLowerCase()
              .replace(/[_\s\-]+/g, '') // 移除下划线、空格、连字符
              .replace(/[^\w\u4e00-\u9fa5]/g, '') // 移除特殊字符，保留中文和英文
              .trim();
          };
          
          const normalizedTitle = normalizeTitle(title);
          
          // 优先基于 baidupanPath 去重
          const existingByPath = books.value.find(book => 
            book.baidupanPath === cloudPath
          );
          
          // 如果没有找到相同路径，检查是否有相同书名的已下载书籍（synced 或 local）
          let existingBook = existingByPath;
          if (!existingBook) {
            existingBook = books.value.find(book => 
              normalizeTitle(book.title) === normalizedTitle && 
              (book.storageType === 'synced' || book.storageType === 'local')
            );
          }
          
          if (!existingBook) {
            // 没有找到相同的书，创建新的云端书籍
            const newBook: EbookMetadata = {
              id: `baidupan_${fileInfo.fs_id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: fileInfo.server_filename.replace(`.${ext}`, ''),
              author: '未知作者',
              cover: '',
              path: fileInfo.path || '',
              format: ext || 'txt',
              size: fileInfo.size || 0,
              lastRead: Date.now(),
              totalChapters: 0,
              readingProgress: 0,
              storageType: 'baidupan',
              baidupanPath: fileInfo.path || '',
              addedAt: Date.now()
            };
            
            books.value.push(newBook);
            console.log('添加云端书籍:', newBook.title);
          } else {
            // console.log('跳过已存在的书籍:', title, '存储类型:', existingBook.storageType);
          }
        }
        
        await saveBooks();
        console.log('百度网盘书籍加载完成，总数:', books.value.length);
      }
    } catch (error) {
      console.error('加载百度网盘书籍失败:', error);
    }
  };

  // 列出百度网盘文件
  const listBaidupanFiles = async (path: string): Promise<any[]> => {
    try {
      // 确保令牌有效
      if (!await ensureBaidupanToken() || !userConfig.value.storage.baidupan) {
        return [];
      }
      
      const { accessToken } = userConfig.value.storage.baidupan;
      
      const result = await api.getFileList(
        accessToken,
        path,
        1,
        100,
        'name',
        'list',
        0
      );
      
      const data = result;
      console.log('获取文件列表响应:', data);
      
      if (data.error) {
        console.error('获取百度网盘文件列表失败:', data);
        return [];
      }
      
      return data.list || [];
    } catch (error) {
      console.error('列出百度网盘文件失败:', error);
      return [];
    }
  };

  // 同步阅读进度到百度网盘
  const syncReadingProgress = async () => {
    try {
      // 确保令牌有效
      if (!await ensureBaidupanToken()) {
        console.error('百度网盘令牌无效，无法同步');
        return false;
      }
      
      console.log('开始同步阅读进度，书籍总数:', books.value.length);
      
      // 1. 上传书籍列表
      const booksData = {
        ebooks: books.value,
        timestamp: Date.now(),
        deviceId: deviceInfo.value.id,
        deviceName: deviceInfo.value.name
      };
      const booksFile = new File([JSON.stringify(booksData)], 'books.json', { type: 'application/json' });
      await uploadToBaidupanNew(booksFile, '/sync');
      
      // 2. 上传分类列表
      const categoriesData = {
        categories: categories.value,
        timestamp: Date.now(),
        deviceId: deviceInfo.value.id
      };
      const categoriesFile = new File([JSON.stringify(categoriesData)], 'categories.json', { type: 'application/json' });
      await uploadToBaidupanNew(categoriesFile, '/sync');
      console.log('分类列表已同步到百度网盘');
      
      // 3. 批量上传进度文件（每本书一个文件）
      let syncedCount = 0;
      const batchSize = 10; // 每批处理10本书
      
      for (let i = 0; i < books.value.length; i += batchSize) {
        const batch = books.value.slice(i, i + batchSize);
        const batchPromises = batch.map(async (book) => {
          try {
            const progress = await localforage.getItem<ReadingProgress>(`progress_${book.id}`);
            if (progress) {
              const progressFile = new File([JSON.stringify(progress)], `${book.id}.json`, { type: 'application/json' });
              await uploadToBaidupanNew(progressFile, `/sync/progress`);
              syncedCount++;
            }
          } catch (error) {
            console.error(`同步书籍进度失败: ${book.id}`, error);
          }
        });
        
        await Promise.all(batchPromises);
      }
      
      console.log(`同步阅读进度到百度网盘成功，同步了 ${syncedCount} 本书的进度`);
      return true;
    } catch (error) {
      console.error('同步阅读进度到百度网盘失败:', error);
      return false;
    }
  };

  // 只同步当前书籍的阅读进度到百度网盘（异步，不等待响应）
  const syncCurrentBookProgress = (ebookId: string) => {
    console.log('异步同步当前书籍进度到百度网盘:', ebookId);
    
    // 异步执行，不等待响应
    (async () => {
      try {
        const progress = await localforage.getItem<ReadingProgress>(`progress_${ebookId}`);
        if (progress) {
          const progressFile = new File([JSON.stringify(progress)], `${ebookId}.json`, { type: 'application/json' });
          await uploadToBaidupanNew(progressFile, `/sync/progress`);
          console.log('当前书籍进度同步成功:', ebookId);
        }
      } catch (error) {
        console.warn('同步当前书籍进度失败:', error);
      }
    })();
  };

  // 从百度网盘同步阅读进度
  const syncReadingProgressFromBaidupan = async (): Promise<boolean> => {
    try {
      // 确保令牌有效
      if (!await ensureBaidupanToken()) {
        console.error('百度网盘令牌无效，无法同步');
        return false;
      }
      
      console.log('开始从百度网盘同步阅读进度');
      
      // 1. 下载书籍列表
      const booksBlob = await downloadBlobFromBaidupan('/sync/books.json');
      if (booksBlob) {
        const booksText = await booksBlob.text();
        const booksData = JSON.parse(booksText);
        if (booksData.ebooks) {
          books.value = booksData.ebooks;
          await saveBooks();
          console.log('同步书籍列表成功，书籍总数:', books.value.length);
        }
      }
      
      // 2. 下载分类列表
      const categoriesBlob = await downloadBlobFromBaidupan('/sync/categories.json');
      if (categoriesBlob) {
        const categoriesText = await categoriesBlob.text();
        const categoriesData = JSON.parse(categoriesText);
        if (categoriesData.categories) {
          categories.value = categoriesData.categories;
          await saveCategories();
          console.log('同步分类列表成功，分类总数:', categories.value.length);
        }
      }
      
      // 3. 下载并同步每本书的进度
      let syncedCount = 0;
      
      for (const book of books.value) {
        try {
          const progressBlob = await downloadBlobFromBaidupan(`/sync/progress/${book.id}.json`);
          if (progressBlob) {
            const progressText = await progressBlob.text();
            const progress = JSON.parse(progressText);
            await localforage.setItem(`progress_${book.id}`, progress);
            // 如果是当前书籍，更新内存中的进度
            if (book.id === readingProgress.value?.ebookId) {
              readingProgress.value = progress;
            }
            syncedCount++;
          }
        } catch (error) {
          console.error(`同步书籍进度失败: ${book.id}`, error);
        }
      }
      
      console.log(`从百度网盘同步阅读进度成功，同步了 ${syncedCount} 本书的进度`);
      return true;
    } catch (error) {
      console.error('从百度网盘同步阅读进度失败:', error);
      return false;
    }
  };

  // 导入 EPUB 文件
  const importEpubFile = async (file: File): Promise<EbookMetadata | null> => {
    try {
      console.log('开始导入 EPUB 文件:', file.name);
      
      // 生成唯一 ID
      const id = `epub_${uuidv4()}`;
      
      // 将文件转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 保存文件内容到 IndexedDB
      console.log('保存文件内容到 IndexedDB，键名:', `ebook_content_${id}`);
      await localforage.setItem(`ebook_content_${id}`, arrayBuffer);
      
      // 提取元数据（封面、作者、标题等）
      let coverData = '';
      let authorData = '未知作者';
      let titleData = file.name.replace('.epub', '');
      
      try {
        const book = ePub(arrayBuffer as ArrayBuffer);
        // 等待书籍加载完成
        await new Promise((resolve, reject) => {
          book.ready.then(resolve).catch(reject);
        });
        
        // 提取书籍元数据
        const metadata = await book.loaded.metadata;
        console.log('EPUB 元数据:', metadata);
        
        // 提取作者
        if (metadata.creator) {
          if (Array.isArray(metadata.creator)) {
            authorData = metadata.creator.join(', ');
          } else {
            authorData = metadata.creator;
          }
        }
        
        // 提取标题
        if (metadata.title) {
          titleData = metadata.title;
        }
        
        // 获取封面 URL
        const coverUrl = await book.coverUrl();
        console.log('封面 URL:', coverUrl);
        if (coverUrl) {
          // 如果是 blob URL，转换为 Base64 持久化存储
          if (typeof coverUrl === 'string' && coverUrl.startsWith('blob:')) {
            try {
              console.log('将 Blob URL 转换为 Base64');
              coverData = await blobToBase64(coverUrl);
              console.log('封面转换成功，Base64 长度:', coverData.length);
              // 释放原有的 Blob 内存
              URL.revokeObjectURL(coverUrl);
            } catch (e) {
              console.warn('封面转换 Base64 失败:', e);
              coverData = '';
            }
          } else {
            // 对于相对路径或其他格式，直接使用
            coverData = coverUrl;
          }
        }
      } catch (e) {
        console.warn('元数据提取失败:', e);
      }
      
      // 创建电子书元数据
      const ebookMetadata: EbookMetadata = {
        id,
        title: titleData,
        author: authorData,
        cover: coverData,
        path: id, // 使用 ID 作为路径，后续通过 ID 获取文件内容
        format: 'epub',
        size: file.size,
        lastRead: Date.now(),
        totalChapters: 0,
        readingProgress: 0,
        storageType: 'local',
        addedAt: Date.now()
      };
      
      console.log('创建电子书元数据:', {
        id: ebookMetadata.id,
        title: ebookMetadata.title,
        author: ebookMetadata.author,
        cover: ebookMetadata.cover,
        storageType: ebookMetadata.storageType
      });
      
      // 保存到本地存储
      await addBook(ebookMetadata);
      
      console.log('EPUB 文件导入成功');
      return ebookMetadata;
    } catch (error) {
      console.error('导入 EPUB 文件失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      return null;
    }
  }

  // 导入 PDF 文件
  const importPdfFile = async (file: File): Promise<EbookMetadata | null> => {
    try {
      // 生成唯一 ID
      const id = `pdf_${uuidv4()}`;
      
      // 将文件转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 保存文件内容到 IndexedDB
      await localforage.setItem(`ebook_content_${id}`, arrayBuffer);
      
      // 创建电子书元数据
      const ebookMetadata: EbookMetadata = {
        id,
        title: file.name.replace('.pdf', ''),
        author: '未知作者',
        cover: '',
        path: id, // 使用 ID 作为路径，后续通过 ID 获取文件内容
        format: 'pdf',
        size: file.size,
        lastRead: Date.now(),
        totalChapters: 0,
        readingProgress: 0,
        storageType: 'local',
        addedAt: Date.now()
      };
      
      // 保存到本地存储
      await addBook(ebookMetadata);
      
      return ebookMetadata;
    } catch (error) {
      console.error('导入 PDF 文件失败:', error);
      return null;
    }
  }

  // 导入 TXT 文件
  const importTxtFile = async (file: File): Promise<EbookMetadata | null> => {
    try {
      // 生成唯一 ID
      const id = `txt_${uuidv4()}`;
      
      // 将文件转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 保存文件内容到 IndexedDB
      await localforage.setItem(`ebook_content_${id}`, arrayBuffer);
      
      // 创建电子书元数据
      const ebookMetadata: EbookMetadata = {
        id,
        title: file.name.replace('.txt', ''),
        author: '未知作者',
        cover: '',
        path: id, // 使用 ID 作为路径，后续通过 ID 获取文件内容
        format: 'txt',
        size: file.size,
        lastRead: Date.now(),
        totalChapters: 1,
        readingProgress: 0,
        storageType: 'local',
        addedAt: Date.now()
      };
      
      // 保存到本地存储
      await addBook(ebookMetadata);
      
      return ebookMetadata;
    } catch (error) {
      console.error('导入 TXT 文件失败:', error);
      return null;
    }
  }

  // 导入电子书文件
  const importEbookFile = async (file: File): Promise<EbookMetadata | null> => {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExtension) {
        console.error('无法获取文件扩展名');
        throw new Error('无法获取文件扩展名');
      }
      
      switch (fileExtension) {
        case 'epub':
          return await importEpubFile(file);
        case 'pdf':
          return await importPdfFile(file);
        case 'txt':
          return await importTxtFile(file);
        default:
          console.error('不支持的文件格式:', fileExtension);
          throw new Error(`不支持的文件格式: ${fileExtension}`);
      }
    } catch (error) {
      console.error('导入电子书文件失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      return null;
    }
  };

  // AI 对话历史管理
  const loadAIConversations = async () => {
    try {
      const saved = await localforage.getItem<Record<string, AIConversationHistory>>('aiConversations')
      if (saved) {
        aiConversations.value = new Map(Object.entries(saved))
        console.log('✅ 加载 AI 对话历史成功，书籍数:', aiConversations.value.size)
      }
    } catch (error) {
      console.error('❌ 加载 AI 对话历史失败:', error)
    }
  }

  const saveAIConversations = async () => {
    try {
      // 将 Map 转换为普通对象，确保可序列化
      const obj: Record<string, AIConversationHistory> = {}
      aiConversations.value.forEach((value, key) => {
        // 深拷贝并确保所有数据都是可序列化的
        obj[key] = {
          bookId: value.bookId,
          messages: value.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            selectedText: msg.selectedText
          })),
          lastUpdated: value.lastUpdated
        }
      })
      await localforage.setItem('aiConversations', obj)
    } catch (error) {
      console.error('❌ 保存 AI 对话历史失败:', error)
    }
  }

  const getAIConversation = (bookId: string): AIConversationHistory => {
    if (!aiConversations.value.has(bookId)) {
      aiConversations.value.set(bookId, {
        bookId,
        messages: [],
        lastUpdated: Date.now()
      })
    }
    return aiConversations.value.get(bookId)!
  }

  const addAIMessage = async (bookId: string, message: AIChatMessage) => {
    const conversation = getAIConversation(bookId)
    conversation.messages.push(message)
    conversation.lastUpdated = Date.now()
    await saveAIConversations()
  }

  const clearAIConversation = async (bookId: string) => {
    aiConversations.value.delete(bookId)
    await saveAIConversations()
  }

  // 初始化函数
  const initialize = async () => {
    await Promise.all([
      loadBooks(),
      loadUserConfig(),
      loadCategories(),
      loadAIConversations()
    ]);
    
    // 尝试从百度网盘同步配置和书籍
    try {
      if (await ensureBaidupanToken()) {
        // 1. 同步配置
        const configBlob = await downloadBlobFromBaidupan('/sync/config.json');
        if (configBlob) {
          try {
            const configText = await configBlob.text();
            const configData = JSON.parse(configText);
            if (configData.config && configData.timestamp) {
              // 检查云端配置是否比本地新
              const localConfig = await localforage.getItem<UserConfig>('userConfig');
              const localTimestamp = localConfig ? await localforage.getItem<number>('userConfigTimestamp') || 0 : 0;
              
              if (configData.timestamp > localTimestamp) {
                console.log('从百度网盘同步用户配置');
                userConfig.value = { ...userConfig.value, ...configData.config };
                await saveUserConfig();
                await localforage.setItem('userConfigTimestamp', configData.timestamp);
              }
            }
          } catch (error) {
            console.warn('解析云端配置失败:', error);
          }
        }
        
        // 2. 加载云端书籍
        await loadBaidupanBooks();
      }
    } catch (error) {
      console.warn('从百度网盘同步用户配置失败:', error);
    }
  };

  return {
    // 状态
    books,
    categories,
    currentBook,
    readingProgress,
    userConfig,
    deviceInfo,
    baidupanUser,
    aiConversations,
    
    // 计算属性
    localBooks,
    baidupanBooks,
    recentBooks,
    
    // 方法
    getBooksByCategory,
    getCategoryById,
    loadBooks,
    saveBooks,
    addBook,
    updateBook,
    removeBook,
    getBookById,
    setCurrentBook,
    loadReadingProgress,
    saveReadingProgress,
    loadUserConfig,
    saveUserConfig,
    updateUserConfig,
    loadCategories,
    saveCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    addBookToCategory,
    removeBookFromCategory,
    searchBooks,
    syncReadingProgress,
    syncReadingProgressFromBaidupan,
    importEpubFile,
    importPdfFile,
    importTxtFile,
    importEbookFile,
    uploadLocalBookToBaidupan,
    downloadBlobFromBaidupan,
    downloadFromBaidupan,
    listBaidupanFiles,
    isBaidupanTokenValid,
    syncCurrentBookProgress,
    loadBaidupanBooks,
    fetchBaidupanUserInfo,
    uploadToBaidupanNew,
    getAIConversation,
    addAIMessage,
    clearAIConversation,
    saveAIConversations,
    initialize
  };
});
