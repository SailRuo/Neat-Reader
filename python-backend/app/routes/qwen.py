"""
Qwen API 路由
验证 Python 调用 Qwen API 的可行性
支持 LangChain Agent 模式
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from loguru import logger
import json
import time
import secrets
import hashlib
import base64
import requests

from app.services.qwen_client import QwenClient
from app.services.langchain_qwen_service import LangChainQwenService
from app.services.conversation_manager import conversation_manager
from app.utils.api_logger import log_api_failure

router = APIRouter()

# Qwen OAuth 配置（与原 Node.js 实现保持一致）
QWEN_OAUTH_CONFIG = {
    "client_id": "f0304373b74a44d2b584a3fb70ca9e56",
    "scope": "openid profile email model.completion",
    "device_auth_url": "https://chat.qwen.ai/api/v1/oauth2/device/code",
    "token_url": "https://chat.qwen.ai/api/v1/oauth2/token",
}

# Device Code Flow 轮询会话缓存
_polling_sessions: Dict[str, Dict] = {}


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _generate_pkce_pair():
    """生成 PKCE code_verifier 和 code_challenge"""
    code_verifier = _base64url_encode(secrets.token_bytes(32))
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = _base64url_encode(digest)
    return code_verifier, code_challenge


def _resolve_qwen_token(access_token: Optional[str], resource_url: Optional[str]):
    """优先使用请求中的 token，否则从统一存储读取（内存缓存或 data/auth_tokens.json）
    返回 (access_token, resource_url) 或 (None, None)
    """
    if access_token and access_token.strip():
        return access_token.strip(), resource_url
    saved = conversation_manager.load_qwen_token()
    if saved:
        return saved.get("access_token"), saved.get("resource_url") or resource_url
    return None, resource_url


def _resolve_llm_credentials(request_access_token: Optional[str], request_resource_url: Optional[str], custom_api=None):
    """
    解析 LLM 调用凭证。
    优先级：1. 请求中的 custom_api  2. 后端已保存的 custom_api  3. OAuth token
    返回: (creds_ok: bool, kwargs_for_LangChainQwenService)
    """
    # 1. 请求中的 custom_api
    if custom_api:
        d = custom_api.model_dump() if hasattr(custom_api, "model_dump") else (custom_api or {})
        base_url = (d.get("base_url") or "").strip()
        api_key = (d.get("api_key") or "").strip()
        model_id = (d.get("model_id") or "").strip()
        if base_url and api_key and model_id:
            return True, {"base_url": base_url, "api_key": api_key, "model": model_id}

    # 2. 后端已保存的自定义 API 配置（重启后可用）
    from app.services.token_store import get_custom_api
    saved_custom = get_custom_api()
    if saved_custom and saved_custom.get("base_url") and saved_custom.get("api_key") and saved_custom.get("model_id"):
        return True, {
            "base_url": saved_custom["base_url"],
            "api_key": saved_custom["api_key"],
            "model": saved_custom["model_id"],
        }

    # 3. OAuth token
    access_token, resource_url = _resolve_qwen_token(request_access_token, request_resource_url)
    if access_token:
        return True, {"access_token": access_token, "resource_url": resource_url}
    return False, {}


class SaveQwenTokenRequest(BaseModel):
    """保存 Qwen Token 请求（用户授权后由前端同步，后端调用 Qwen 时优先使用）"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None
    resource_url: Optional[str] = None


class QwenRefreshRequest(BaseModel):
    """刷新 Qwen Token 请求（前端持有 refresh_token，后端调用 OAuth /token 刷新）"""
    refresh_token: str


class QwenPollTokenRequest(BaseModel):
    """轮询获取 token 请求"""
    session_id: str


class QwenTestRequest(BaseModel):
    """Qwen API 测试请求"""
    access_token: Optional[str] = None  # 不传则使用已保存的 token
    resource_url: Optional[str] = None
    message: Optional[str] = "你好，请用一句话介绍你自己。"


class CustomAPIConfig(BaseModel):
    """自定义 API 配置（OpenAI 兼容）"""
    base_url: str
    api_key: str
    model_id: str


class QwenTestCustomRequest(BaseModel):
    """自定义 API 测试请求"""
    base_url: str
    api_key: str
    model_id: str


class QwenChatRequest(BaseModel):
    """Qwen 对话请求"""
    access_token: Optional[str] = None  # 不传则使用已保存的 token
    resource_url: Optional[str] = None
    messages: Optional[List[Dict]] = None  # 完整消息数组（新格式）
    message: Optional[str] = None  # 单条消息文本（兼容旧格式）
    images: Optional[List[str]] = None  # Base64 图片数组（兼容旧格式）
    model: Optional[str] = "qwen3-coder-plus"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    tools: Optional[List[Dict]] = None  # 工具定义（Function Calling）
    tool_choice: Optional[str] = "auto"  # "auto", "none", 或具体工具名
    conversation_id: Optional[str] = None  # 会话 ID（用于会话管理）
    save_to_backend: bool = True  # 默认启用后端存储（混合模式）
    custom_api: Optional[CustomAPIConfig] = None  # 自定义 API 配置（优先于 OAuth）

@router.post("/device-auth")
async def start_device_auth():
    """
    启动 Device Code Flow（兼容原 Node.js /api/qwen/device-auth）。
    返回 user_code、auth_url 等，前端展示给用户去浏览器授权，然后轮询 poll-token。
    """
    try:
        code_verifier, code_challenge = _generate_pkce_pair()
        data = {
            "client_id": QWEN_OAUTH_CONFIG["client_id"],
            "scope": QWEN_OAUTH_CONFIG["scope"],
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        resp = requests.post(
            QWEN_OAUTH_CONFIG["device_auth_url"],
            data=data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "User-Agent": "Neat-Reader/1.0",
            },
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()

        device_code = result.get("device_code")
        if not device_code:
            raise HTTPException(status_code=502, detail="Qwen 未返回 device_code")

        user_code = result.get("user_code", "")
        verification_uri = result.get("verification_uri", "")
        verification_uri_complete = result.get("verification_uri_complete")
        expires_in = result.get("expires_in", 900)
        interval = result.get("interval", 5)

        auth_url = verification_uri_complete or f"{verification_uri}?user_code={user_code}"

        session_id = secrets.token_hex(16)
        _polling_sessions[session_id] = {
            "device_code": device_code,
            "code_verifier": code_verifier,
            "expires_at": int(time.time() * 1000) + expires_in * 1000,
            "interval": interval,
        }

        logger.info(f"Device Code Flow 启动成功: session_id={session_id[:8]}...")
        return {
            "session_id": session_id,
            "user_code": user_code,
            "auth_url": auth_url,
            "verification_uri": verification_uri,
            "expires_in": expires_in,
            "interval": interval,
        }
    except HTTPException:
        raise
    except Exception as e:
        resp = getattr(e, "response", None)
        log_api_failure(
            "Qwen OAuth device-auth",
            str(e),
            method="POST",
            url=QWEN_OAUTH_CONFIG["device_auth_url"],
            status_code=resp.status_code if resp else None,
            response_body=resp.text[:500] if resp and resp.text else None,
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/poll-token")
async def poll_token(request: QwenPollTokenRequest):
    """
    轮询获取 token（兼容原 Node.js /api/qwen/poll-token）。
    用户完成授权后，前端轮询此接口直到返回 token。
    """
    try:
        session = _polling_sessions.get(request.session_id)
        if not session:
            raise HTTPException(status_code=400, detail="Invalid or expired session")

        if time.time() * 1000 > session["expires_at"]:
            _polling_sessions.pop(request.session_id, None)
            raise HTTPException(status_code=400, detail="Session expired")

        data = {
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "device_code": session["device_code"],
            "client_id": QWEN_OAUTH_CONFIG["client_id"],
            "code_verifier": session["code_verifier"],
        }
        resp = requests.post(
            QWEN_OAUTH_CONFIG["token_url"],
            data=data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "User-Agent": "Neat-Reader/1.0",
            },
            timeout=10,
        )

        err_code = None
        try:
            body = resp.json() if (resp.text or "").strip() else {}
            err_code = body.get("error")
        except Exception:
            body = {}

        if err_code == "authorization_pending":
            return {"status": "pending", "slow_down": False}
        if err_code == "slow_down":
            return {"status": "pending", "slow_down": True}
        if err_code == "expired_token":
            _polling_sessions.pop(request.session_id, None)
            raise HTTPException(status_code=400, detail="授权超时，请重新开始")
        if err_code == "access_denied":
            _polling_sessions.pop(request.session_id, None)
            raise HTTPException(status_code=400, detail="用户拒绝授权")

        if resp.status_code != 200:
            err_msg = body.get("error_description") or body.get("error") or resp.text or f"HTTP {resp.status_code}"
            log_api_failure(
                "Qwen OAuth poll-token",
                str(err_msg),
                method="POST",
                url=QWEN_OAUTH_CONFIG["token_url"],
                status_code=resp.status_code,
                response_body=body or resp.text[:500],
            )
            raise HTTPException(status_code=502, detail=str(err_msg))

        access_token = body.get("access_token")
        if not access_token:
            raise HTTPException(status_code=502, detail="Qwen 未返回 access_token")

        _polling_sessions.pop(request.session_id, None)

        refresh_token = body.get("refresh_token", "")
        expires_in = body.get("expires_in", 0)
        resource_url = body.get("resource_url")

        from app.services.token_store import set_qwen
        set_qwen(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=int(time.time()) + int(expires_in) if expires_in else None,
            resource_url=resource_url,
        )

        logger.info("成功获取 Qwen token")
        return {
            "status": "success",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "token_type": body.get("token_type", "Bearer"),
            "resource_url": resource_url,
        }
    except HTTPException:
        raise
    except Exception as e:
        resp = getattr(e, "response", None)
        log_api_failure(
            "Qwen OAuth poll-token",
            str(e),
            method="POST",
            url=QWEN_OAUTH_CONFIG["token_url"],
            status_code=resp.status_code if resp else None,
            response_body=resp.text[:500] if resp and resp.text else None,
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/token")
async def save_qwen_token(request: SaveQwenTokenRequest):
    """
    保存用户 Qwen token（验证通过后写入统一存储：data/auth_tokens.json + 内存缓存）。
    """
    try:
        from app.services.token_store import set_qwen
        set_qwen(
            access_token=request.access_token,
            refresh_token=request.refresh_token,
            expires_at=request.expires_at,
            resource_url=request.resource_url,
        )
        return {"success": True, "message": "Token 已保存"}
    except Exception as e:
        logger.error(f"保存 Qwen Token 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SaveCustomAPIRequest(BaseModel):
    """保存自定义 API 配置请求"""
    base_url: str
    api_key: str
    model_id: str


class ListCustomModelsRequest(BaseModel):
    """拉取自定义 API 模型列表请求（可不传则使用后端已保存配置）"""
    base_url: Optional[str] = None
    api_key: Optional[str] = None


@router.get("/custom-api")
async def get_custom_api_config():
    """
    获取后端保存的自定义 API 配置（用于前端同步，如新设备/清除缓存后恢复）
    """
    from app.services.token_store import get_custom_api
    saved = get_custom_api()
    if not saved:
        return {"has_config": False}
    return {
        "has_config": True,
        "base_url": saved["base_url"],
        "api_key": saved["api_key"],
        "model_id": saved["model_id"],
    }


@router.post("/custom-api")
async def save_custom_api(request: SaveCustomAPIRequest):
    """
    保存自定义 API 配置到后端（data/auth_tokens.json）。
    重启后仍可使用，调用 API 时若请求未带 custom_api 则使用此配置。
    """
    try:
        if not request.base_url or not request.api_key or not request.model_id:
            raise HTTPException(status_code=400, detail="base_url、api_key、model_id 不能为空")
        from app.services.token_store import set_custom_api
        set_custom_api(
            base_url=request.base_url,
            api_key=request.api_key,
            model_id=request.model_id,
        )
        return {"success": True, "message": "自定义 API 配置已保存"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"保存自定义 API 配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/custom-api")
async def delete_custom_api():
    """清除后端保存的自定义 API 配置"""
    try:
        from app.services.token_store import clear_custom_api as token_clear_custom_api
        token_clear_custom_api()
        from app.services.token_store import clear_custom_api_models
        clear_custom_api_models()
        return {"success": True, "message": "自定义 API 配置已清除"}
    except Exception as e:
        logger.error(f"清除自定义 API 配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/custom-models")
async def list_custom_models(request: ListCustomModelsRequest):
    """根据 base_url + /v1/models 获取模型列表，并保存到 data/auth_tokens.json"""
    try:
        from app.services.token_store import get_custom_api, set_custom_api_models, get_custom_api_models

        base_url = (request.base_url or "").strip()
        api_key = (request.api_key or "").strip()

        # 若未传参，则使用后端已保存配置
        if not base_url or not api_key:
            saved = get_custom_api() or {}
            base_url = (saved.get("base_url") or "").strip() if not base_url else base_url
            api_key = (saved.get("api_key") or "").strip() if not api_key else api_key

        if not base_url or not api_key:
            raise HTTPException(status_code=400, detail="base_url、api_key 不能为空")

        # 标准化 base_url：允许用户填 https://xxx 或 https://xxx/v1
        base_url_no_slash = base_url.rstrip("/")
        if base_url_no_slash.endswith("/v1"):
            models_url = f"{base_url_no_slash}/models"
            base_url_for_cache = base_url_no_slash
        else:
            models_url = f"{base_url_no_slash}/v1/models"
            base_url_for_cache = f"{base_url_no_slash}/v1"

        # 若缓存命中且 base_url 一致，直接返回缓存
        cached = get_custom_api_models()
        if cached and (cached.get("base_url") or "").strip() == base_url_for_cache and cached.get("models") is not None:
            return {
                "success": True,
                "cached": True,
                "base_url": cached.get("base_url"),
                "fetched_at": cached.get("fetched_at"),
                "models": cached.get("models"),
            }

        headers = {
            "Accept": "application/json",
            "User-Agent": "Neat-Reader/1.0",
        }

        # 兼容两种格式：sk-xxx 或 Bearer xxx
        if api_key.lower().startswith("bearer "):
            headers["Authorization"] = api_key
        else:
            headers["Authorization"] = f"Bearer {api_key}"

        resp = requests.get(models_url, headers=headers, timeout=20)
        if resp.status_code != 200:
            preview = (resp.text or "")[:300]
            raise HTTPException(status_code=502, detail=f"获取模型列表失败: HTTP {resp.status_code}: {preview}")

        data = resp.json() if (resp.text or "").strip() else {}
        set_custom_api_models(base_url_for_cache, data)
        return {
            "success": True,
            "cached": False,
            "base_url": base_url_for_cache,
            "fetched_at": int(time.time() * 1000),
            "models": data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取自定义 API 模型列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_qwen_token(request: QwenRefreshRequest):
    """
    刷新 Qwen access token（兼容原 Node.js /api/qwen/refresh 接口）。

    前端只需要传 refresh_token，实际刷新逻辑在后端完成：
    - 调用 Qwen OAuth /token 接口
    - 更新统一 token 存储（data/auth_tokens.json + 内存）
    - 返回新的 access_token / refresh_token / expires_in 给前端
    """
    try:
        if not request.refresh_token:
            raise HTTPException(status_code=400, detail="refresh_token is required")

        logger.info("开始刷新 Qwen token")

        # 构造表单参数（application/x-www-form-urlencoded）
        data = {
            "grant_type": "refresh_token",
            "refresh_token": request.refresh_token,
            "client_id": QWEN_OAUTH_CONFIG["client_id"],
        }

        resp = requests.post(
            QWEN_OAUTH_CONFIG["token_url"],
            data=data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            timeout=10,
        )

        # 先记录原始响应，便于排查
        body_preview = (resp.text or "")[:300]
        logger.info(f"Qwen 刷新响应: status={resp.status_code}, body_len={len(resp.text or '')}, body={body_preview!r}")

        # 解析 JSON：空响应或非 JSON 时安全处理
        tokens = {}
        if (resp.text or "").strip():
            try:
                tokens = resp.json()
            except Exception as parse_err:
                log_api_failure(
                    "Qwen OAuth refresh",
                    f"JSON 解析失败: {parse_err}",
                    method="POST",
                    url=QWEN_OAUTH_CONFIG["token_url"],
                    status_code=resp.status_code,
                    response_body=body_preview,
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"Qwen 接口返回异常: {resp.status_code} - {body_preview[:150]}"
                )

        if resp.status_code != 200:
            err_msg = tokens.get("error_description") or tokens.get("error") or resp.text or f"HTTP {resp.status_code}"
            log_api_failure(
                "Qwen OAuth refresh",
                str(err_msg),
                method="POST",
                url=QWEN_OAUTH_CONFIG["token_url"],
                status_code=resp.status_code,
                response_body=tokens or resp.text[:500],
            )
            raise HTTPException(status_code=502, detail=str(err_msg))

        access_token = tokens.get("access_token")
        if not access_token:
            log_api_failure(
                "Qwen OAuth refresh",
                "返回中无 access_token",
                method="POST",
                url=QWEN_OAUTH_CONFIG["token_url"],
                status_code=resp.status_code,
                response_body=tokens,
            )
            raise HTTPException(status_code=500, detail="刷新 token 失败：返回中没有 access_token")

        refresh_token = tokens.get("refresh_token") or request.refresh_token
        expires_in = tokens.get("expires_in", 0)
        # 以秒为单位的过期时间戳（前端用毫秒，这里只用于后端存储）
        expires_at = int(time.time()) + int(expires_in) if expires_in else None
        resource_url = tokens.get("resource_url")

        # 更新统一 token 存储
        try:
            from app.services.token_store import set_qwen

            set_qwen(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
                resource_url=resource_url,
            )
        except Exception as e:
            logger.warning(f"刷新 Qwen token 成功，但保存到 token_store 失败: {e}")

        logger.info("成功刷新 Qwen token")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "token_type": tokens.get("token_type", "Bearer"),
            "resource_url": resource_url,
        }

    except HTTPException:
        raise
    except Exception as e:
        resp = getattr(e, "response", None)
        log_api_failure(
            "Qwen OAuth refresh",
            str(e),
            method="POST",
            url=QWEN_OAUTH_CONFIG["token_url"],
            status_code=resp.status_code if resp else None,
            response_body=resp.text[:500] if resp and resp.text else None,
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_qwen_api(request: QwenTestRequest):
    """测试 Qwen API 连接 - 使用 LangChain（OAuth 模式）"""
    try:
        access_token, resource_url = _resolve_qwen_token(request.access_token, request.resource_url)
        if not access_token:
            raise HTTPException(status_code=401, detail="未提供 Qwen Token，请先在前端完成授权")
        logger.info("收到 Qwen API 测试请求")
        
        service = LangChainQwenService(
            access_token=access_token,
            resource_url=resource_url
        )
        
        result = await service.simple_chat(
            user_message=request.message or "你好，请用一句话介绍你自己。"
        )
        
        logger.info("Qwen API 测试成功")
        
        # 返回兼容旧格式的响应
        return {
            "success": True,
            "message": "Qwen API 连接成功",
            "response": result,
            "usage": {
                "prompt_tokens": 0,  # LangChain 不返回详细 token 信息
                "completion_tokens": 0,
                "total_tokens": 0
            }
        }
        
    except Exception as e:
        err_str = str(e)
        logger.error(f"Qwen API 测试失败: {e}")
        if "429" in err_str or "insufficient_quota" in err_str:
            raise HTTPException(status_code=429, detail="Qwen 免费额度已用完，请升级或等待额度重置")
        if "401" in err_str or "Unauthorized" in err_str:
            raise HTTPException(status_code=401, detail="Token 无效或已过期，请重新授权")
        raise HTTPException(status_code=500, detail=err_str)


@router.post("/test-custom")
async def test_custom_api(request: QwenTestCustomRequest):
    """测试自定义 API 连接 - OpenAI 兼容格式"""
    try:
        if not request.base_url or not request.api_key or not request.model_id:
            raise HTTPException(status_code=400, detail="请提供 base_url、api_key 和 model_id")
        logger.info(f"收到自定义 API 测试请求，model_id={request.model_id!r}")
        
        service = LangChainQwenService(
            base_url=request.base_url,
            api_key=request.api_key,
            model=request.model_id
        )
        
        result = await service.simple_chat(
            user_message="你好，请用一句话介绍你自己。"
        )
        
        # 打印一次接口响应内容（避免日志过长，这里做安全截断）
        try:
            preview = result if isinstance(result, str) else str(result)
        except Exception:
            preview = "<无法序列化响应内容>"
        if len(preview) > 500:
            preview = preview[:500] + "...[truncated]"
        logger.info(f"自定义 API 测试成功，model_id={request.model_id!r}，响应内容预览: {preview}")
        return {
            "success": True,
            "message": "自定义 API 连接成功",
            "response": result,
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        }
    except Exception as e:
        err_str = str(e)
        logger.error(f"自定义 API 测试失败: {e}")
        if "401" in err_str or "Unauthorized" in err_str:
            raise HTTPException(status_code=401, detail="API Key 无效")
        if "429" in err_str or "insufficient_quota" in err_str:
            raise HTTPException(status_code=429, detail="API 额度已用完")
        raise HTTPException(status_code=500, detail=err_str)


async def chat_completion(request: QwenChatRequest):
    """
    Qwen 对话（非流式）- 使用 LangChain Agent
    
    兼容两种格式：
    1. 旧格式：message (string) + images (array)
    2. 新格式：messages (array)
    
    支持会话管理：
    - 如果提供 conversation_id 且 save_to_backend=True，会自动保存到后端
    - 否则前端自己管理历史记录
    """
    try:
        # 构建消息
        if request.messages:
            user_messages = [msg for msg in request.messages if msg.get("role") == "user"]
            if not user_messages:
                raise HTTPException(status_code=400, detail="没有找到用户消息")
            user_message = user_messages[-1]["content"]
            if isinstance(user_message, list):
                # 多模态消息，提取文本部分
                text_parts = [part.get("text", "") for part in user_message if part.get("type") == "text"]
                user_message = " ".join(text_parts) if text_parts else "请分析这些内容"
            chat_history = request.messages[:-1] if len(request.messages) > 1 else None
        else:
            user_message = request.message or "你好"
            chat_history = None
        
        access_token, resource_url = _resolve_qwen_token(request.access_token, request.resource_url)
        if not access_token:
            raise HTTPException(status_code=401, detail="未提供 Qwen Token，请先在前端完成授权")
        
        logger.info(f"收到对话请求 [会话:{request.conversation_id}]: {user_message[:50]}...")
        
        # 如果启用后端会话管理，从后端加载历史
        if request.save_to_backend and request.conversation_id:
            conversation = conversation_manager.get_conversation(request.conversation_id)
            if conversation:
                # 使用后端存储的历史记录
                chat_history = conversation_manager.get_messages(
                    request.conversation_id,
                    limit=20  # 限制最近 20 条消息
                )
                logger.info(f"从后端加载历史记录: {len(chat_history)} 条消息")
            else:
                # 创建新会话
                conversation_manager.create_conversation(
                    conversation_id=request.conversation_id,
                    title=user_message[:50]
                )
                logger.info(f"创建新会话: {request.conversation_id}")
        
        # 使用 LangChain 服务
        service = LangChainQwenService(
            access_token=access_token,
            resource_url=resource_url
        )
        
        response = await service.chat_with_agent(
            user_message=user_message,
            chat_history=chat_history,
            conversation_id=request.conversation_id
        )
        
        # 保存到后端（如果启用）
        if request.save_to_backend and request.conversation_id:
            conversation_manager.add_message(
                conversation_id=request.conversation_id,
                role="user",
                content=user_message
            )
            conversation_manager.add_message(
                conversation_id=request.conversation_id,
                role="assistant",
                content=response["content"],
                metadata={"tool_calls": response.get("tool_calls", [])}
            )
            logger.info(f"消息已保存到后端会话: {request.conversation_id}")
        
        logger.info("对话成功")
        
        return {
            "success": True,
            "response": response
        }
        
    except Exception as e:
        err_str = str(e)
        logger.error(f"对话失败: {e}")
        if "401" in err_str or "Unauthorized" in err_str:
            raise HTTPException(status_code=401, detail="Token 无效或已过期")
        elif "429" in err_str or "insufficient_quota" in err_str:
            raise HTTPException(status_code=429, detail="Qwen 免费额度已用完或调用超限，请升级或等待重置")
        elif "500" in err_str or "502" in err_str or "503" in err_str:
            raise HTTPException(status_code=503, detail="Qwen 服务暂时不可用")
        else:
            raise HTTPException(status_code=500, detail=err_str)

@router.post("/chat-stream")
async def chat_completion_stream(request: QwenChatRequest):
    """
    Qwen 对话（流式响应）- 使用 LangChain Agent
    
    兼容两种格式：
    1. 旧格式：message (string) + images (array)
    2. 新格式：messages (array)
    
    支持会话管理：
    - 如果提供 conversation_id 且 save_to_backend=True，会自动保存到后端
    - 否则前端自己管理历史记录
    """
    try:
        # 构建消息
        if request.messages:
            user_messages = [msg for msg in request.messages if msg.get("role") == "user"]
            if not user_messages:
                raise HTTPException(status_code=400, detail="没有找到用户消息")
            user_message = user_messages[-1]["content"]
            if isinstance(user_message, list):
                # 多模态消息，提取文本部分
                text_parts = [part.get("text", "") for part in user_message if part.get("type") == "text"]
                user_message = " ".join(text_parts) if text_parts else "请分析这些内容"
            chat_history = request.messages[:-1] if len(request.messages) > 1 else None
        else:
            user_message = request.message or "你好"
            chat_history = None
        
        creds_ok, llm_kwargs = _resolve_llm_credentials(
            request.access_token, request.resource_url, request.custom_api
        )
        if not creds_ok or not llm_kwargs:
            raise HTTPException(status_code=401, detail="未提供 AI 凭证，请在设置中完成 OAuth 授权或配置自定义 API")
        
        logger.info(f"收到流式对话请求 [会话:{request.conversation_id}]: {user_message[:50]}...")
        
        # 如果启用后端会话管理，从后端加载历史
        if request.save_to_backend and request.conversation_id:
            conversation = conversation_manager.get_conversation(request.conversation_id)
            if conversation:
                # 使用后端存储的历史记录
                chat_history = conversation_manager.get_messages(
                    request.conversation_id,
                    limit=20  # 限制最近 20 条消息
                )
                logger.info(f"从后端加载历史记录: {len(chat_history)} 条消息")
            else:
                # 创建新会话
                conversation_manager.create_conversation(
                    conversation_id=request.conversation_id,
                    title=user_message[:50]
                )
                logger.info(f"创建新会话: {request.conversation_id}")
            
            # 保存用户消息
            conversation_manager.add_message(
                conversation_id=request.conversation_id,
                role="user",
                content=user_message
            )
        
        # 使用 LangChain 服务
        service = LangChainQwenService(**llm_kwargs)
        
        async def generate():
            """生成 SSE 流"""
            assistant_message = ""
            try:
                async for chunk in service.chat_stream_with_agent(
                    user_message=user_message,
                    chat_history=chat_history,
                    conversation_id=request.conversation_id
                ):
                    assistant_message += chunk
                    yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
                
                # 保存 AI 响应到后端（如果启用）
                if request.save_to_backend and request.conversation_id:
                    conversation_manager.add_message(
                        conversation_id=request.conversation_id,
                        role="assistant",
                        content=assistant_message
                    )
                    logger.info(f"AI 响应已保存到后端会话: {request.conversation_id}")
                
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"流式响应错误: {e}")
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except Exception as e:
        err_str = str(e)
        logger.error(f"流式对话失败: {e}")
        if "401" in err_str or "Unauthorized" in err_str:
            raise HTTPException(status_code=401, detail="Token 无效或已过期")
        if "429" in err_str or "insufficient_quota" in err_str:
            raise HTTPException(status_code=429, detail="Qwen 免费额度已用完或调用超限，请升级或等待重置")
        if "500" in err_str or "502" in err_str or "503" in err_str:
            raise HTTPException(status_code=503, detail="Qwen 服务暂时不可用")
        raise HTTPException(status_code=500, detail=err_str)
