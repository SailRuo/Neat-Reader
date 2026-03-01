"""
Baidu Netdisk API 路由
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from loguru import logger

from app.services.baidu_service import BaiduNetdiskService

router = APIRouter()
baidu_service = BaiduNetdiskService()


class TokenRequest(BaseModel):
    code: str
    clientId: str
    clientSecret: str
    redirectUri: str


class AlistTokenRequest(BaseModel):
    code: str


class RefreshTokenRequest(BaseModel):
    refreshToken: str
    clientId: str
    clientSecret: str


class FileListRequest(BaseModel):
    accessToken: str
    dir: str = "/"
    pageNum: int = 1
    pageSize: int = 100
    order: str = "name"
    method: str = "list"
    recursion: int = 0


class CreateDirRequest(BaseModel):
    accessToken: str
    dir: str


class UploadFileRequest(BaseModel):
    fileName: str
    fileData: List[int]  # 数组格式的文件数据
    accessToken: str


class DeleteFileRequest(BaseModel):
    accessToken: str
    filePaths: List[str]


@router.post("/token")
async def get_token(request: TokenRequest):
    """获取访问令牌；验证通过后写入统一 token 存储（本地 JSON + 内存缓存）"""
    try:
        token = baidu_service.get_token_via_code(
            request.code,
            request.clientId,
            request.clientSecret,
            request.redirectUri
        )
        if token.get("access_token"):
            from app.services.token_store import set_baidu
            set_baidu(token["access_token"])
        return token
    except Exception as e:
        logger.error(f"获取令牌失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/token-direct")
async def get_token_direct(request: TokenRequest):
    """直接代理百度 API 获取 token（避免 CORS）；成功后写入统一 token 存储"""
    try:
        token = baidu_service.get_token_via_code(
            request.code,
            request.clientId,
            request.clientSecret,
            request.redirectUri
        )
        if token.get("access_token"):
            from app.services.token_store import set_baidu
            set_baidu(token["access_token"])
        return token
    except Exception as e:
        logger.error(f"直接获取令牌失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alist-token")
async def get_alist_token(request: AlistTokenRequest):
    """通过 alist API 获取 token"""
    try:
        if not request.code:
            raise HTTPException(status_code=400, detail="缺少授权码")
        
        token = baidu_service.get_token_via_alist(request.code)
        if token.get("access_token"):
            from app.services.token_store import set_baidu
            set_baidu(token["access_token"])
        return token
    except Exception as e:
        logger.error(f"通过 alist 获取令牌失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_token(request: RefreshTokenRequest):
    """刷新令牌"""
    try:
        new_token = baidu_service.refresh_token(
            request.refreshToken,
            request.clientId,
            request.clientSecret
        )
        if new_token.get("access_token"):
            from app.services.token_store import set_baidu
            set_baidu(new_token["access_token"])
        return new_token
    except Exception as e:
        logger.error(f"刷新令牌失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verify")
async def verify_token(accessToken: str):
    """验证令牌；验证通过后写入统一 token 存储（本地 JSON + 内存缓存）"""
    try:
        result = baidu_service.verify_token(accessToken)
        from app.services.token_store import set_baidu
        set_baidu(accessToken)
        # 返回前端可识别的成功格式
        return {"success": True, **result} if isinstance(result, dict) else {"success": True, "data": result}
    except Exception as e:
        logger.error(f"验证令牌失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files")
async def get_files(
    accessToken: str,
    dir: str = "/",
    pageNum: int = 1,
    pageSize: int = 100,
    order: str = "name",
    method: str = "list",
    recursion: int = 0
):
    """获取文件列表"""
    try:
        files = baidu_service.get_file_list(
            accessToken,
            dir,
            pageNum,
            pageSize,
            order,
            method,
            recursion
        )
        return files
    except Exception as e:
        logger.error(f"获取文件列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_files(
    accessToken: str,
    key: str,
    dir: str = "/",
    method: str = "search",
    recursion: int = 1
):
    """搜索文件"""
    try:
        files = baidu_service.search_files(
            accessToken,
            key,
            dir,
            method,
            recursion
        )
        return files
    except Exception as e:
        logger.error(f"搜索文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fileinfo")
async def get_file_info(accessToken: str, fsids: str):
    """获取文件信息"""
    try:
        info = baidu_service.get_file_info(accessToken, fsids)
        return info
    except Exception as e:
        logger.error(f"获取文件信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
async def download_file(dlink: str, accessToken: str):
    """下载文件"""
    try:
        result = baidu_service.download_file(dlink, accessToken)
        return result
    except Exception as e:
        logger.error(f"下载文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mkdir")
async def create_directory(request: CreateDirRequest):
    """创建目录"""
    try:
        result = baidu_service.create_directory(
            request.accessToken,
            request.dir
        )
        return result
    except Exception as e:
        logger.error(f"创建目录失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(request: UploadFileRequest):
    """上传文件"""
    try:
        # 将数组转换为 bytes
        file_buffer = bytes(request.fileData)
        
        result = baidu_service.upload_file(
            request.fileName,
            file_buffer,
            request.accessToken
        )
        return result
    except Exception as e:
        logger.error(f"上传文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def delete_file(request: DeleteFileRequest):
    """删除文件"""
    try:
        result = baidu_service.delete_file(
            request.accessToken,
            request.filePaths
        )
        return result
    except Exception as e:
        logger.error(f"删除文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
