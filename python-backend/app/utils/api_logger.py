"""
API 调用失败时输出详细日志，便于排查问题
"""
from typing import Optional, Any
from loguru import logger


def log_api_failure(
    endpoint: str,
    error: Any,
    *,
    method: str = "",
    url: str = "",
    status_code: Optional[int] = None,
    response_body: Any = None,
    request_params: Any = None,
) -> None:
    """
    输出 API 调用失败的详细日志

    Args:
        endpoint: 接口描述，如 "百度网盘 filemanager(mkdir)"
        error: 异常或错误消息
        method: HTTP 方法
        url: 请求 URL（可脱敏）
        status_code: HTTP 状态码
        response_body: 响应体（JSON 或文本）
        request_params: 请求参数（可脱敏）
    """
    parts = [
        f"接口: {endpoint}",
        f"错误: {error}",
    ]
    if method:
        parts.append(f"方法: {method}")
    if url:
        # 脱敏：隐藏 token 等敏感参数
        safe_url = url
        for sep in ("access_token=", "api_key=", "token="):
            if sep in safe_url.lower():
                idx = safe_url.lower().find(sep)
                start = safe_url[: idx + len(sep)]
                rest = safe_url[idx + len(sep) :]
                end_idx = rest.find("&") if "&" in rest else len(rest)
                safe_url = start + "***" + rest[end_idx:]
        parts.append(f"URL: {safe_url[:300]}")
    if status_code is not None:
        parts.append(f"状态码: {status_code}")
    if response_body is not None:
        try:
            body_str = str(response_body) if not isinstance(response_body, (dict, list)) else str(response_body)
        except Exception:
            body_str = "<无法序列化>"
        if len(body_str) > 500:
            body_str = body_str[:500] + "..."
        parts.append(f"响应: {body_str}")
    if request_params is not None:
        try:
            params_str = str(request_params) if not isinstance(request_params, (dict, list)) else str(request_params)
        except Exception:
            params_str = "<无法序列化>"
        if len(params_str) > 200:
            params_str = params_str[:200] + "..."
        parts.append(f"请求参数: {params_str}")

    logger.error(" | ".join(parts))
