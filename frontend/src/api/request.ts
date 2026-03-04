import axios from 'axios';

// 探测是否在 Tauri 环境中
const isTauri = !!(window as any).__TAURI_INTERNALS__;

// Tauri 环境下后端默认运行在 3002 端口（当前项目 python-backend 配置）
// 开发环境下使用 Vite 代理或直接连接
const API_BASE_URL = isTauri ? 'http://localhost:3002' : '';

const service = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export default service;
export { API_BASE_URL };
