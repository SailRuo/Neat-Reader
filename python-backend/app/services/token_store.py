"""
统一 Token 存储
- 百度、Qwen 的 token 放在同一个 JSON 文件
- 后端验证通过后写入文件并更新内存缓存
- 重启后无缓存时从文件读取
"""
from pathlib import Path
from typing import Optional, Dict, Any
import json
from loguru import logger

# 单文件路径：data/auth_tokens.json
_DATA_DIR = Path("data")
_TOKEN_FILE = _DATA_DIR / "auth_tokens.json"

# 内存缓存，与文件结构一致
_cache: Dict[str, Any] = {}


def _ensure_dir():
    _DATA_DIR.mkdir(parents=True, exist_ok=True)


def load() -> None:
    """启动时从文件加载到内存缓存"""
    global _cache
    try:
        if not _TOKEN_FILE.exists():
            _cache = {}
            return
        with open(_TOKEN_FILE, "r", encoding="utf-8") as f:
            _cache = json.load(f)
        logger.info("已从 auth_tokens.json 加载 Token 缓存")
    except Exception as e:
        logger.warning(f"加载 Token 文件失败: {e}")
        _cache = {}


def _save() -> None:
    """将内存缓存写回文件"""
    try:
        _ensure_dir()
        with open(_TOKEN_FILE, "w", encoding="utf-8") as f:
            json.dump(_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"保存 Token 文件失败: {e}")


# ---------- 百度 ----------


def set_baidu(access_token: str) -> None:
    """验证通过后保存百度 token"""
    if not access_token or not access_token.strip():
        return
    if "baidu" not in _cache:
        _cache["baidu"] = {}
    _cache["baidu"]["access_token"] = access_token.strip()
    _save()
    logger.info("百度网盘 Token 已保存（本地文件 + 内存缓存）")


def get_baidu_token() -> Optional[str]:
    """取百度 access_token：优先内存，无则从文件再读一次"""
    token = (_cache.get("baidu") or {}).get("access_token")
    if token:
        return token.strip() or None
    load()
    token = (_cache.get("baidu") or {}).get("access_token")
    return (token or "").strip() or None


# ---------- Qwen ----------


def set_qwen(
    access_token: str,
    refresh_token: Optional[str] = None,
    expires_at: Optional[int] = None,
    resource_url: Optional[str] = None,
) -> None:
    """验证通过后保存 Qwen token"""
    if not access_token or not access_token.strip():
        return
    if "qwen" not in _cache:
        _cache["qwen"] = {}
    _cache["qwen"]["access_token"] = access_token.strip()
    if refresh_token:
        _cache["qwen"]["refresh_token"] = refresh_token
    if expires_at is not None:
        _cache["qwen"]["expires_at"] = expires_at
    if resource_url:
        _cache["qwen"]["resource_url"] = resource_url
    _save()
    logger.info("Qwen Token 已保存（本地文件 + 内存缓存）")


def get_qwen_token() -> Optional[Dict[str, Any]]:
    """取 Qwen 信息：优先内存，无则从文件再读一次。返回 {access_token, refresh_token?, expires_at?, resource_url?}"""
    data = _cache.get("qwen")
    if data and (data.get("access_token") or "").strip():
        return {
            "access_token": (data.get("access_token") or "").strip(),
            **{k: v for k, v in data.items() if k != "access_token" and v is not None},
        }
    load()
    data = _cache.get("qwen")
    if not data or not (data.get("access_token") or "").strip():
        return None
    return {
        "access_token": (data.get("access_token") or "").strip(),
        **{k: v for k, v in data.items() if k != "access_token" and v is not None},
    }


# ---------- 自定义 API 配置（OpenAI 兼容） ----------


def set_custom_api(base_url: str, api_key: str, model_id: str) -> None:
    """保存自定义 API 配置，重启后可继续使用"""
    if not base_url or not api_key or not model_id:
        return
    base_url = base_url.strip()
    api_key = api_key.strip()
    model_id = (model_id or "gpt-3.5-turbo").strip()
    if not base_url or not api_key or not model_id:
        return
    if "custom_api" not in _cache:
        _cache["custom_api"] = {}
    _cache["custom_api"]["base_url"] = base_url
    _cache["custom_api"]["api_key"] = api_key
    _cache["custom_api"]["model_id"] = model_id
    _save()
    logger.info("自定义 API 配置已保存（data/auth_tokens.json）")


def get_custom_api() -> Optional[Dict[str, str]]:
    """读取自定义 API 配置。返回 {base_url, api_key, model_id} 或 None"""
    data = _cache.get("custom_api")
    if data and (data.get("base_url") or "").strip() and (data.get("api_key") or "").strip():
        return {
            "base_url": (data.get("base_url") or "").strip(),
            "api_key": (data.get("api_key") or "").strip(),
            "model_id": (data.get("model_id") or "gpt-3.5-turbo").strip(),
        }
    load()
    data = _cache.get("custom_api")
    if not data or not (data.get("base_url") or "").strip() or not (data.get("api_key") or "").strip():
        return None
    return {
        "base_url": (data.get("base_url") or "").strip(),
        "api_key": (data.get("api_key") or "").strip(),
        "model_id": (data.get("model_id") or "gpt-3.5-turbo").strip(),
    }


def clear_custom_api() -> None:
    """清除自定义 API 配置"""
    if "custom_api" in _cache:
        del _cache["custom_api"]
        _save()
        logger.info("自定义 API 配置已清除")


def set_custom_api_models(base_url: str, models: Any, fetched_at: Optional[int] = None) -> None:
    if not base_url or not (base_url or "").strip():
        return
    if models is None:
        return
    if fetched_at is None:
        import time
        fetched_at = int(time.time() * 1000)
    if "custom_api_models" not in _cache:
        _cache["custom_api_models"] = {}
    _cache["custom_api_models"]["base_url"] = (base_url or "").strip()
    _cache["custom_api_models"]["fetched_at"] = fetched_at
    _cache["custom_api_models"]["models"] = models
    _save()


def get_custom_api_models() -> Optional[Dict[str, Any]]:
    data = _cache.get("custom_api_models")
    if data and (data.get("base_url") or "").strip() and data.get("models") is not None:
        return {
            "base_url": (data.get("base_url") or "").strip(),
            "fetched_at": data.get("fetched_at"),
            "models": data.get("models"),
        }
    load()
    data = _cache.get("custom_api_models")
    if not data or not (data.get("base_url") or "").strip() or data.get("models") is None:
        return None
    return {
        "base_url": (data.get("base_url") or "").strip(),
        "fetched_at": data.get("fetched_at"),
        "models": data.get("models"),
    }


def clear_custom_api_models() -> None:
    if "custom_api_models" in _cache:
        del _cache["custom_api_models"]
        _save()
