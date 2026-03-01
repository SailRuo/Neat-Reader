"""
配置管理
"""
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """应用配置"""
    
    # 服务器配置
    HOST: str = "127.0.0.1"
    PORT: int = 3002
    DEBUG: bool = True
    
    # CORS 配置
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    
    # PageIndex 配置
    PAGEINDEX_CACHE_DIR: str = "./cache/pageindex"
    PAGEINDEX_MAX_TREE_DEPTH: int = 4
    PAGEINDEX_MAX_PAGES_PER_NODE: int = 10
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# 创建全局配置实例
settings = Settings()

# 确保缓存目录存在
os.makedirs(settings.PAGEINDEX_CACHE_DIR, exist_ok=True)
