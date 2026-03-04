/**
 * API 配置
 */

// Python 后端 API 地址
export const PYTHON_API_BASE_URL = 'http://localhost:3002'

// API 端点
export const API_ENDPOINTS = {
  tokens: `${PYTHON_API_BASE_URL}/api/tokens`,
  syncForce: `${PYTHON_API_BASE_URL}/api/sync/force`,
  syncStatus: `${PYTHON_API_BASE_URL}/api/sync/status`,
}
