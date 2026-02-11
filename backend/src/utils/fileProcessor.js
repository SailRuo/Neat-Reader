/**
 * 文件处理工具 - 参考 Qwen Code 实现
 * 支持智能类型检测和内容编码
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

// 已知的二进制文件扩展名
const BINARY_EXTENSIONS = [
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp',
  '.mp3', '.wav', '.ogg', '.flac', '.m4a',
  '.mp4', '.avi', '.mov', '.mkv', '.webm',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
];

// 文本文件扩展名
const TEXT_EXTENSIONS = [
  '.txt', '.md', '.json', '.xml', '.yaml', '.yml',
  '.js', '.ts', '.jsx', '.tsx', '.vue',
  '.html', '.css', '.scss', '.sass', '.less',
  '.py', '.java', '.c', '.cpp', '.h', '.hpp',
  '.go', '.rs', '.rb', '.php', '.sh', '.bat'
];

/**
 * 检测 BOM (Byte Order Mark)
 */
function detectBOM(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'UTF-8';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'UTF-16BE';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'UTF-16LE';
  }
  return null;
}

/**
 * 检测文件是否为二进制文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>}
 */
async function isBinaryFile(filePath) {
  let fh = null;
  try {
    fh = await fs.open(filePath, 'r');
    const stats = await fh.stat();
    const fileSize = stats.size;
    
    if (fileSize === 0) return false; // 空文件不是二进制
    
    // 采样最多 4KB
    const sampleSize = Math.min(4096, fileSize);
    const buf = Buffer.alloc(sampleSize);
    const { bytesRead } = await fh.read(buf, 0, sampleSize, 0);
    
    if (bytesRead === 0) return false;
    
    // 检查 BOM
    const bom = detectBOM(buf.subarray(0, Math.min(4, bytesRead)));
    if (bom) return false;
    
    let nonPrintableCount = 0;
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true; // 遇到空字节则为二进制
      if (buf[i] < 9 || (buf[i] > 13 && buf[i] < 32)) {
        nonPrintableCount++;
      }
    }
    
    // 如果超过 30% 的不可打印字符，则认为是二进制
    return nonPrintableCount / bytesRead > 0.3;
  } finally {
    if (fh) await fh.close();
  }
}

/**
 * 检测文件类型
 * @param {string} filePath - 文件路径
 * @returns {Promise<'text' | 'image' | 'pdf' | 'audio' | 'video' | 'binary'>}
 */
async function detectFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  // 特殊处理 TypeScript 文件
  if (['.ts', '.mts', '.cts'].includes(ext)) {
    return 'text';
  }
  
  // 检查已知的文本扩展名
  if (TEXT_EXTENSIONS.includes(ext)) {
    return 'text';
  }
  
  // 检查图像类型
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'].includes(ext)) {
    return 'image';
  }
  
  // 检查 PDF
  if (ext === '.pdf') {
    return 'pdf';
  }
  
  // 检查音频
  if (['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext)) {
    return 'audio';
  }
  
  // 检查视频
  if (['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'].includes(ext)) {
    return 'video';
  }
  
  // 检查已知的二进制扩展名
  if (BINARY_EXTENSIONS.includes(ext)) {
    return 'binary';
  }
  
  // 内容检测是否为二进制文件
  if (await isBinaryFile(filePath)) {
    return 'binary';
  }
  
  return 'text';
}

/**
 * 获取 MIME 类型
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const mimeTypes = {
    // 图像
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    
    // 文档
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // 音频
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    
    // 视频
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    
    // 文本
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 处理单个文件内容
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} - { type, content, mimeType, displayName }
 */
async function processFileContent(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const displayName = path.basename(filePath);
    
    if (stats.isDirectory()) {
      return {
        type: 'directory',
        content: null,
        displayName,
        error: 'Cannot process directory'
      };
    }
    
    const fileType = await detectFileType(filePath);
    const mimeType = getMimeType(filePath);
    
    logger.info('处理文件', { filePath, fileType, mimeType });
    
    // 处理文本文件
    if (fileType === 'text') {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        type: 'text',
        content: content,
        mimeType: mimeType,
        displayName: displayName,
        size: stats.size
      };
    }
    
    // 处理二进制文件（图像、PDF、音视频）
    if (['image', 'pdf', 'audio', 'video', 'binary'].includes(fileType)) {
      const buffer = await fs.readFile(filePath);
      const base64Data = buffer.toString('base64');
      
      return {
        type: fileType,
        content: base64Data,
        mimeType: mimeType,
        displayName: displayName,
        size: stats.size,
        // OpenAI 兼容格式
        dataUrl: `data:${mimeType};base64,${base64Data}`
      };
    }
    
    return {
      type: 'unknown',
      content: null,
      displayName,
      error: 'Unknown file type'
    };
    
  } catch (error) {
    logger.error('处理文件失败', { filePath, error: error.message });
    return {
      type: 'error',
      content: null,
      displayName: path.basename(filePath),
      error: error.message
    };
  }
}

/**
 * 处理多个文件
 * @param {string[]} filePaths - 文件路径数组
 * @returns {Promise<Object[]>}
 */
async function processMultipleFiles(filePaths) {
  const results = await Promise.all(
    filePaths.map(filePath => processFileContent(filePath))
  );
  
  return results;
}

/**
 * 将文件处理结果转换为 OpenAI 兼容的消息格式
 * @param {Object[]} fileResults - 文件处理结果数组
 * @param {string} userMessage - 用户消息
 * @returns {Object} - OpenAI 消息格式
 */
function toOpenAIMessageFormat(fileResults, userMessage = '') {
  const content = [];
  
  // 添加所有文件内容
  fileResults.forEach(result => {
    if (result.type === 'text') {
      content.push({
        type: 'text',
        text: `\n--- File: ${result.displayName} ---\n${result.content}\n`
      });
    } else if (['image', 'pdf'].includes(result.type)) {
      content.push({
        type: 'image_url',
        image_url: {
          url: result.dataUrl
        }
      });
    }
  });
  
  // 添加用户消息
  if (userMessage) {
    content.push({
      type: 'text',
      text: userMessage
    });
  }
  
  return {
    role: 'user',
    content: content
  };
}

module.exports = {
  detectFileType,
  isBinaryFile,
  getMimeType,
  processFileContent,
  processMultipleFiles,
  toOpenAIMessageFormat
};
