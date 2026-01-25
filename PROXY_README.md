# 百度网盘API代理服务

这是一个简单的Node.js后端服务，用于代理百度网盘API请求，解决前端跨域问题。

## 功能特点

- ✅ 解决百度网盘API跨域问题
- ✅ 支持授权码获取Access Token
- ✅ 支持文件列表获取
- ✅ 支持文件上传预创建
- ✅ 支持CORS配置
- ✅ 提供健康检查接口

## 快速开始

### 1. 安装依赖

```bash
# 方式一：直接安装
npm install express cors axios nodemon

# 方式二：使用package.json.server
npm run install-deps
```

### 2. 启动服务

```bash
# 生产模式
node server.js

# 开发模式（自动重启）
npm run dev
```

### 3. 验证服务

访问以下地址，确认服务正常运行：

```
c
```

预期响应：
```json
{ "status": "ok", "message": "代理服务运行正常" }
```

## 服务端点

| 功能 | 代理端点 | 原始端点 | 方法 |
|------|----------|----------|------|
| 获取令牌 | /api/baidu/oauth/token | https://openapi.baidu.com/oauth/2.0/token | GET |
| 文件API | /api/baidu/pan/file | https://pan.baidu.com/rest/2.0/xpan/file | GET |
| 文件预上传 | /api/baidu/pan/precreate | https://pan.baidu.com/rest/2.0/xpan/file?method=precreate | POST |
| 健康检查 | /health | - | GET |

## 前端代码修改

### 修改 src/stores/ebook.ts

将百度网盘API请求改为通过代理服务访问：

```typescript
// 1. 修改 baidupanApiConfig
const baidupanApiConfig = {
  clientId: 'WreV7F9LXSzyYOQzzP7Ih1UmvuDxN763',
  clientSecret: 'hNAobFVEevG7kseZry9xq3LM6jxoWSLz',
  redirectUri: 'http://localhost:8080/callback',
  // 使用代理服务URL
  apiUrl: 'http://localhost:3001/api/baidu/pan',
  oauthUrl: 'http://localhost:3001/api/baidu/oauth'
};

// 2. 修改 getBaidupanToken 函数
const getBaidupanToken = async (code: string): Promise<any> => {
  try {
    // 使用代理服务的URL
    const params = new URLSearchParams({
      client_id: baidupanApiConfig.clientId,
      client_secret: baidupanApiConfig.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: baidupanApiConfig.redirectUri
    });
    
    const requestUrl = `${baidupanApiConfig.oauthUrl}/token?${params.toString()}`;
    console.log('请求URL:', requestUrl);
    
    // 使用代理服务请求
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 后续代码保持不变
    // ...
  } catch (error) {
    // 错误处理
    // ...
  }
};

// 3. 修改其他百度网盘API调用函数，如：
// listBaidupanFiles
// uploadToBaidupan
// downloadFromBaidupan
// 都需要将API URL改为使用代理服务
```

### 修改 src/pages/Reader/index.vue

确保阅读器页面也使用代理服务：

```typescript
// 确保所有百度网盘API请求都通过代理服务
```

## 部署建议

### 开发环境

- 使用 `nodemon` 自动重启服务
- 端口默认3001，可以通过环境变量 `PORT` 修改

### 生产环境

- 使用 `pm2` 或 `forever` 管理进程
- 配置 Nginx 反向代理
- 添加 HTTPS 支持

## 安全注意事项

1. **生产环境**：建议将 CORS 配置中的 `origin` 改为具体的域名，而不是 `*`
2. **密钥管理**：不要将 `clientId` 和 `clientSecret` 硬编码在前端代码中
3. **令牌安全**：确保 Access Token 和 Refresh Token 安全存储
4. **API 权限**：只开放必要的 API 端点

## 技术栈

- Node.js
- Express
- Axios
- CORS

## 替代方案

### 方案一：Vite 代理配置

在 `vite.config.ts` 中添加代理配置：

```typescript
export default defineConfig({
  // ...
  server: {
    proxy: {
      '/api/baidu': {
        target: 'https://openapi.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/baidu/, '')
      },
      '/api/pan.baidu': {
        target: 'https://pan.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pan.baidu/, '')
      }
    }
  }
});
```

### 方案二：Nginx 代理

在 Nginx 配置文件中添加：

```nginx
location /api/baidu/ {
    proxy_pass https://openapi.baidu.com/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /api/pan.baidu/ {
    proxy_pass https://pan.baidu.com/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 常见问题

### Q: 服务启动失败？
A: 检查端口是否被占用，或者依赖是否安装正确。

### Q: 代理请求返回400？
A: 检查请求参数是否正确，或者百度网盘API是否有变更。

### Q: 生产环境如何配置？
A: 建议使用 Nginx 反向代理，并添加 HTTPS 支持。

## 联系方式

如有问题，请随时反馈。
