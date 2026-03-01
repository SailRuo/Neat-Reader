"""
Baidu Netdisk API 服务
实现文件管理、OAuth 认证等功能
"""
import requests
from requests.exceptions import ContentDecodingError
from typing import Optional, Dict, Any, List
from loguru import logger
import json
import time
from pathlib import PurePosixPath

from app.utils.api_logger import log_api_failure


class BaiduNetdiskService:
    """百度网盘 API 服务"""
    
    BASE_URL = "https://pan.baidu.com/rest/2.0"
    OAUTH_URL = "https://openapi.baidu.com/oauth/2.0"
    
    # 上传域名缓存（全局共享）
    _upload_domain_cache = None
    
    def __init__(self):
        """初始化百度网盘服务"""
        pass
    
    @classmethod
    def clear_upload_domain_cache(cls):
        """清除上传域名缓存"""
        cls._upload_domain_cache = None
        logger.info("[Upload] 上传域名缓存已清除")
    
    def get_token_via_code(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        通过授权码获取访问令牌
        
        Args:
            code: 授权码
            client_id: 应用 ID
            client_secret: 应用密钥
            redirect_uri: 回调地址
            
        Returns:
            包含 access_token 和 refresh_token 的字典
        """
        try:
            logger.info("通过授权码获取 token")
            
            data = {
                'grant_type': 'authorization_code',
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': redirect_uri
            }
            
            response = requests.post(
                f"{self.OAUTH_URL}/token",
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info("成功获取 token")
            return result
            
        except Exception as e:
            url = f"{self.OAUTH_URL}/token"
            log_api_failure(
                "百度 OAuth token",
                str(e),
                method="POST",
                url=url,
                status_code=getattr(e, "response", None) and getattr(e.response, "status_code"),
                response_body=getattr(e, "response", None) and getattr(e.response, "text", "")[:500] if hasattr(e, "response") else None,
            )
            raise

    def get_token_via_alist(self, code: str) -> Dict[str, Any]:
        """
        通过 alist API 获取 token
        
        Args:
            code: 授权码
            
        Returns:
            包含 access_token 和 refresh_token 的字典
        """
        try:
            logger.info(f"通过 alist API 获取 token, code: {code}")
            
            response = requests.get(
                f"https://api.alistgo.com/alist/baidu/get_refresh_token?code={code}",
                timeout=30
            )
            
            logger.info(f"alist API 响应状态: {response.status_code}")
            
            if response.status_code != 200:
                log_api_failure(
                    "alist get_refresh_token",
                    f"HTTP {response.status_code}",
                    method="GET",
                    url="https://api.alistgo.com/alist/baidu/get_refresh_token",
                    status_code=response.status_code,
                    response_body=response.text[:500] if response.text else None,
                )
                raise Exception(f"alist API 返回错误状态: {response.status_code}")

            result = response.json()

            if not result.get('access_token') or not result.get('refresh_token'):
                log_api_failure(
                    "alist get_refresh_token",
                    "返回数据格式错误",
                    method="GET",
                    url="https://api.alistgo.com/alist/baidu/get_refresh_token",
                    status_code=response.status_code,
                    response_body=result,
                )
                raise Exception("alist API 返回数据格式错误")
            
            logger.info("成功通过 alist 获取 token")
            return result
            
        except Exception as e:
            log_api_failure("alist get_refresh_token", str(e))
            raise

    def refresh_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """
        刷新访问令牌
        
        Args:
            refresh_token: 刷新令牌
            client_id: 应用 ID
            client_secret: 应用密钥
            
        Returns:
            新的 token 信息
        """
        try:
            logger.info("刷新 token")
            
            data = {
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
                'client_id': client_id,
                'client_secret': client_secret
            }
            
            response = requests.post(
                f"{self.OAUTH_URL}/token",
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info("成功刷新 token")
            return result
            
        except Exception as e:
            url = f"{self.OAUTH_URL}/token"
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度 OAuth refresh_token",
                str(e),
                method="POST",
                url=url,
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
            )
            raise

    def verify_token(self, access_token: str) -> Dict[str, Any]:
        """
        验证访问令牌
        
        Args:
            access_token: 访问令牌
            
        Returns:
            验证结果
        """
        try:
            logger.info("验证 token")
            
            response = requests.get(
                f"{self.BASE_URL}/xpan/nas",
                params={
                    'method': 'uinfo',
                    'access_token': access_token
                },
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info("Token 验证成功")
            return result
            
        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 uinfo(验证token)",
                str(e),
                method="GET",
                url=f"{self.BASE_URL}/xpan/nas?method=uinfo",
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
            )
            raise

    def get_file_list(
        self,
        access_token: str,
        dir: str = "/",
        page_num: int = 1,
        page_size: int = 100,
        order: str = "name",
        method: str = "list",
        recursion: int = 0
    ) -> Dict[str, Any]:
        """
        获取文件列表
        
        Args:
            access_token: 访问令牌
            dir: 目录路径
            page_num: 页码
            page_size: 每页数量
            order: 排序方式
            method: 方法（list/search）
            recursion: 是否递归
            
        Returns:
            文件列表
        """
        try:
            logger.info(f"获取文件列表: {dir}")
            
            params = {
                'access_token': access_token,
                'method': method,
                'dir': dir,
                'pageNum': page_num,
                'pageSize': page_size,
                'order': order,
                'recursion': recursion
            }
            
            response = requests.get(
                f"{self.BASE_URL}/xpan/file",
                params=params,
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"成功获取文件列表，共 {len(result.get('list', []))} 个文件")
            return result
            
        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 xpan/file list",
                str(e),
                method="GET",
                url=f"{self.BASE_URL}/xpan/file",
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
            )
            raise

    def search_files(
        self,
        access_token: str,
        key: str,
        dir: str = "/",
        method: str = "search",
        recursion: int = 1
    ) -> Dict[str, Any]:
        """
        搜索文件
        
        Args:
            access_token: 访问令牌
            key: 搜索关键词
            dir: 搜索目录
            method: 方法
            recursion: 是否递归
            
        Returns:
            搜索结果
        """
        try:
            logger.info(f"搜索文件: {key}")
            
            params = {
                'access_token': access_token,
                'method': method,
                'key': key,
                'dir': dir,
                'recursion': recursion
            }
            
            response = requests.get(
                f"{self.BASE_URL}/xpan/file",
                params=params,
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"搜索完成，找到 {len(result.get('list', []))} 个文件")
            return result
            
        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 xpan/file search",
                str(e),
                method="GET",
                url=f"{self.BASE_URL}/xpan/file",
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
            )
            raise

    def get_file_info(
        self,
        access_token: str,
        fsids: str
    ) -> Dict[str, Any]:
        """
        获取文件信息（包含下载链接）
        
        Args:
            access_token: 访问令牌
            fsids: 文件 ID 列表（逗号分隔）
            
        Returns:
            文件信息
        """
        try:
            logger.info(f"获取文件信息: {fsids}")
            
            params = {
                'method': 'filemetas',
                'access_token': access_token,
                'fsids': f'[{fsids}]',
                'dlink': '1'
            }
            
            response = requests.get(
                f"{self.BASE_URL}/xpan/file",
                params=params,
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info("成功获取文件信息")
            return result
            
        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 xpan/file filemetas",
                str(e),
                method="GET",
                url=f"{self.BASE_URL}/xpan/file",
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
            )
            raise

    def download_file(
        self,
        dlink: str,
        access_token: str
    ) -> Dict[str, Any]:
        """
        下载文件
        
        Args:
            dlink: 下载链接
            access_token: 访问令牌
            
        Returns:
            下载结果
        """
        try:
            logger.info("下载文件")
            
            headers = {
                'User-Agent': 'pan.baidu.com'
            }
            
            response = requests.get(
                dlink,
                params={'access_token': access_token},
                headers=headers,
                timeout=60,
                stream=True
            )
            
            response.raise_for_status()
            
            logger.info("文件下载成功")
            return {
                'success': True,
                'content': response.content
            }
            
        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 下载文件",
                str(e),
                method="GET",
                url=str(dlink)[:200],
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
            )
            raise

    def create_directory(
        self,
        access_token: str,
        path: str,
        _retry_parent: bool = True
    ) -> Dict[str, Any]:
        """
        创建目录
        
        Args:
            access_token: 访问令牌
            path: 目录路径
            
        Returns:
            创建结果
        """
        try:
            logger.info(f"创建目录: {path}")

            path = (path or "").strip()
            if not path:
                return {'success': False, 'errno': None, 'errmsg': 'path is empty'}

            data = {
                'path': path,
                'isdir': '1',
                'rtype': '0'
            }
            
            response = requests.post(
                f"{self.BASE_URL}/xpan/file?method=create&access_token={requests.compat.quote(access_token)}",
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            # errno: -8 表示目录已存在，也视为成功
            if result.get('errno') == 0 or result.get('errno') == -8:
                logger.info(f"目录就绪: {path} (errno: {result.get('errno')})")
                return {'success': True, 'exists': result.get('errno') == -8}

            # errno: 2 通常表示父目录不存在，尝试递归创建父目录后重试一次
            if result.get('errno') == 2 and _retry_parent:
                parent = str(PurePosixPath(path).parent)
                if parent and parent != '/' and parent != '.':
                    logger.warning(f"父目录不存在，尝试创建父目录: {parent}")
                    parent_result = self.create_directory(access_token, parent, _retry_parent=False)
                    if parent_result.get('success'):
                        logger.info(f"父目录创建完成，重试创建目录: {path}")
                        return self.create_directory(access_token, path, _retry_parent=False)

            log_api_failure(
                "百度网盘 xpan/file create(创建文件夹)",
                f"errno={result.get('errno')} errmsg={result.get('errmsg')}",
                method="POST",
                url=f"{self.BASE_URL}/xpan/file?method=create",
                status_code=response.status_code,
                response_body=result,
                request_params={"path": path},
            )
            return {'success': False, 'errno': result.get('errno'), 'errmsg': result.get('errmsg')}

        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 xpan/file create(创建文件夹)",
                str(e),
                method="POST",
                url=f"{self.BASE_URL}/xpan/file?method=create",
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
                request_params={"path": path},
            )
            raise

    def upload_file(
        self,
        file_name: str,
        file_data: bytes,
        access_token: str,
        path: str = "/apps/Neat Reader"
    ) -> Dict[str, Any]:
        """
        上传文件到百度网盘
        
        Args:
            file_name: 文件名
            file_data: 文件数据（bytes）
            access_token: 访问令牌
            path: 上传路径（默认 /apps/Neat Reader）
            
        Returns:
            上传结果
        """
        try:
            logger.info(f"[Upload] 开始上传文件: {file_name}, 大小: {len(file_data)}")
            
            # 构建完整的百度网盘路径
            baidu_path = f"{path}/{file_name}".replace('//', '/')
            logger.info(f"[Upload] 百度路径: {baidu_path}")
            
            # 1. 获取上传域名
            upload_domain = self._get_upload_domain(access_token, baidu_path)
            logger.info(f"[Upload] 上传域名: {upload_domain}")
            
            # 2. 构建上传 URL（ondup=overwrite 表示覆盖已存在的文件）
            upload_url = (
                f"{upload_domain}/rest/2.0/pcs/file"
                f"?method=upload"
                f"&access_token={access_token}"
                f"&path={requests.compat.quote(baidu_path)}"
                f"&ondup=overwrite"
            )
            
            # 3. 创建 multipart/form-data 请求
            files = {
                'file': ('upload', file_data, 'application/octet-stream')
            }
            
            # 4. 上传文件
            response = requests.post(
                upload_url,
                files=files,
                timeout=300  # 5分钟超时
            )
            
            response.raise_for_status()
            result = response.json()
            
            # 5. 检查结果
            if result.get('error_code'):
                error_code = result.get('error_code')
                error_msg = result.get('error_msg', '未知错误')
                
                # 31061 表示文件已存在（虽然我们用了 overwrite，但有时还是会返回这个）
                if error_code == 31061:
                    logger.info(f"[Upload] 文件已存在: {file_name}")
                    return {
                        'success': True,
                        'path': baidu_path,
                        'error_code': error_code,
                        'message': '文件已存在'
                    }
                
                log_api_failure(
                    "百度网盘 上传文件",
                    f"error_code={error_code} error_msg={error_msg}",
                    method="POST",
                    url=upload_url.split("?")[0],
                    response_body=result,
                    request_params={"path": baidu_path, "file": file_name},
                )
                return {
                    'success': False,
                    'error': f"上传失败: {error_msg}",
                    'error_code': error_code,
                    'error_msg': error_msg
                }
            
            logger.info(f"[Upload] 上传成功: {result.get('path', baidu_path)}")
            return {
                'success': True,
                **result
            }
            
        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 上传文件",
                str(e),
                method="POST",
                url="<upload_domain>/rest/2.0/pcs/file",
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
                request_params={"file": file_name, "path": baidu_path},
            )
            return {
                'success': False,
                'error': str(e)
            }

    def _get_upload_domain(self, access_token: str, path: str) -> str:
        """
        获取上传域名（带缓存）
        
        Args:
            access_token: 访问令牌
            path: 文件路径
            
        Returns:
            上传域名
        """
        # 如果缓存存在，直接返回
        if BaiduNetdiskService._upload_domain_cache:
            logger.debug(f"[Upload] 使用缓存的上传域名: {BaiduNetdiskService._upload_domain_cache}")
            return BaiduNetdiskService._upload_domain_cache
        
        try:
            # 预上传接口，获取上传域名
            # 文档：https://pan.baidu.com/union/doc/Mlvw5hfnr
            logger.info("[Upload] 首次获取上传域名...")
            url = "https://d.pcs.baidu.com/rest/2.0/pcs/file"
            params = {
                'method': 'locateupload',
                'access_token': access_token,
                'path': path
            }
            headers = {
                # 避免某些网络环境下服务端错误标记 gzip，导致客户端解码失败
                'Accept-Encoding': 'identity',
                'Accept': 'application/json',
                'User-Agent': 'pan.baidu.com'
            }

            try:
                response = requests.get(url, params=params, headers=headers, timeout=30)
            except ContentDecodingError as e:
                logger.warning(f"[Upload] locateupload 响应解码失败，重试(identity): {e}")
                response = requests.get(url, params=params, headers=headers, timeout=30)
            
            response.raise_for_status()
            result = response.json()
            
            # 返回上传域名（优先使用 servers 中的 https 域名）
            servers = result.get('servers') or []
            https_servers = [s.get('server') for s in servers if isinstance(s, dict) and str(s.get('server') or '').startswith('https://')]
            host = (https_servers[0] if https_servers else None) or result.get('host') or 'https://c.pcs.baidu.com'
            if not str(host).startswith('http'):
                host = f"https://{host}"
            
            # 缓存域名
            BaiduNetdiskService._upload_domain_cache = host
            logger.info(f"[Upload] 获取并缓存上传域名: {host}")
            return host
            
        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 locateupload(获取上传域名)",
                str(e),
                method="GET",
                url="https://d.pcs.baidu.com/rest/2.0/pcs/file",
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
            )
            logger.warning(f"[Upload] 获取上传域名失败，使用默认域名: {e}")
            # 如果获取失败，使用默认域名并缓存
            default_domain = "https://c.pcs.baidu.com"
            BaiduNetdiskService._upload_domain_cache = default_domain
            return default_domain
    
    def delete_file(
        self,
        access_token: str,
        file_paths: List[str]
    ) -> Dict[str, Any]:
        """
        删除文件
        
        Args:
            access_token: 访问令牌
            file_paths: 文件路径列表
            
        Returns:
            删除结果
        """
        try:
            logger.info(f"删除文件: {file_paths}")
            
            # 使用 filemanager 方法删除文件
            params = {
                'access_token': access_token,
                'opera': 'delete',
                'async': '2'
            }
            
            data = {
                'filelist': json.dumps(file_paths)
            }
            
            response = requests.post(
                f"{self.BASE_URL}/xpan/file?method=filemanager&{requests.compat.urlencode(params)}",
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"响应数据: {result}")
            
            if result.get('errno') != 0:
                log_api_failure(
                    "百度网盘 filemanager(delete)",
                    f"errno={result.get('errno')} errmsg={result.get('errmsg')}",
                    method="POST",
                    url=f"{self.BASE_URL}/xpan/file?method=filemanager",
                    status_code=response.status_code,
                    response_body=result,
                    request_params={"filelist": file_paths[:3]},  # 只打印前几个
                )
                raise Exception(f"删除失败: {result.get('errmsg', '未知错误')}")

            logger.info("文件删除成功")
            return result

        except Exception as e:
            resp = getattr(e, "response", None)
            log_api_failure(
                "百度网盘 filemanager(delete)",
                str(e),
                method="POST",
                url=f"{self.BASE_URL}/xpan/file?method=filemanager",
                status_code=resp.status_code if resp else None,
                response_body=resp.text[:500] if resp and resp.text else None,
                request_params={"filelist": file_paths[:3]},
            )
            raise
