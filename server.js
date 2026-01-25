// 简单的Node.js后端服务，用于代理百度网盘API请求
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;

// 配置CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 配置JSON解析
app.use(express.json());

// 代理百度网盘授权相关API
app.get('/api/baidu/oauth/token', async (req, res) => {
  try {
    const response = await axios.get('https://openapi.baidu.com/oauth/2.0/token', {
      params: req.query,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('代理百度网盘授权API失败:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || '代理请求失败'
    });
  }
});

// 代理百度网盘文件相关API
app.get('/api/baidu/pan/file', async (req, res) => {
  try {
    const response = await axios.get('https://pan.baidu.com/rest/2.0/xpan/file', {
      params: req.query,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('代理百度网盘文件API失败:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || '代理请求失败'
    });
  }
});

// 代理百度网盘文件上传相关API
app.post('/api/baidu/pan/precreate', async (req, res) => {
  try {
    const response = await axios.post('https://pan.baidu.com/rest/2.0/xpan/file?method=precreate', req.body, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('代理百度网盘文件预上传API失败:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || '代理请求失败'
    });
  }
});

// 代理百度网盘上传分片API
app.post('/api/baidu/pan/upload', async (req, res) => {
  try {
    // 从请求头获取访问令牌
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    // 构建请求URL
    const url = `https://pan.baidu.com/rest/2.0/xpan/file?method=upload&access_token=${accessToken}`;
    
    // 使用 multipart/form-data 格式上传文件
    const response = await axios.post(url, req.body, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('代理百度网盘上传分片API失败:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || '代理请求失败'
    });
  }
});

// 代理百度网盘创建文件API
app.post('/api/baidu/pan/create', async (req, res) => {
  try {
    const response = await axios.post('https://pan.baidu.com/rest/2.0/xpan/file?method=create', req.body, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('代理百度网盘创建文件API失败:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || '代理请求失败'
    });
  }
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '代理服务运行正常' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`代理服务已启动，监听端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`百度网盘授权代理: http://localhost:${PORT}/api/baidu/oauth/token`);
  console.log(`百度网盘文件API代理: http://localhost:${PORT}/api/baidu/pan/file`);
});
