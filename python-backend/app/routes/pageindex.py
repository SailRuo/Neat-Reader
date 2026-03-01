"""
PageIndex 路由
EPUB 解析和树结构索引构建
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
from loguru import logger

from app.config import settings
from app.services.pageindex_service import PageIndexService
from langchain_openai import ChatOpenAI

router = APIRouter()

_pageindex_service = PageIndexService(settings.PAGEINDEX_CACHE_DIR)

class PageIndexBuildRequest(BaseModel):
    """PageIndex 构建请求"""
    book_id: str
    epub_path: str  # 本地文件路径或上传的文件

class PageIndexQueryRequest(BaseModel):
    """PageIndex 查询请求"""
    book_id: str
    query: str
    access_token: str
    resource_url: Optional[str] = None


class CustomAPIConfig(BaseModel):
    """自定义 API 配置（OpenAI 兼容）"""
    base_url: str
    api_key: str
    model_id: str


class PageIndexAnswerRequest(BaseModel):
    """PageIndex 生成回答请求（RAG）"""
    book_id: str
    query: str
    access_token: Optional[str] = None
    resource_url: Optional[str] = None
    custom_api: Optional[CustomAPIConfig] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.2
    top_k: Optional[int] = 5


class PageIndexSearchRequest(BaseModel):
    """跨全书架检索请求（不生成回答，仅召回）"""
    query: str
    book_ids: Optional[list[str]] = None
    top_k_per_book: Optional[int] = 3
    top_k_total: Optional[int] = 10


def _resolve_llm_credentials(access_token: Optional[str], resource_url: Optional[str], custom_api: Optional[CustomAPIConfig]):
    """解析 LLM 调用凭证。优先级：请求 custom_api > 后端保存 custom_api > 后端保存 OAuth token"""
    if custom_api:
        d = custom_api.model_dump()
        base_url = (d.get("base_url") or "").strip()
        api_key = (d.get("api_key") or "").strip()
        model_id = (d.get("model_id") or "").strip()
        if base_url and api_key and model_id:
            base = base_url.rstrip("/")
            if "/v1" not in base:
                base = f"{base}/v1"
            return True, {"base_url": base, "api_key": api_key, "model": model_id}

    from app.services.token_store import get_custom_api
    saved_custom = get_custom_api()
    if saved_custom and saved_custom.get("base_url") and saved_custom.get("api_key") and saved_custom.get("model_id"):
        base = (saved_custom["base_url"] or "").strip().rstrip("/")
        if "/v1" not in base:
            base = f"{base}/v1"
        return True, {"base_url": base, "api_key": saved_custom["api_key"], "model": saved_custom["model_id"]}

    if access_token and access_token.strip():
        tok = access_token.strip()
        base = f"https://{resource_url}/v1" if resource_url else "https://portal.qwen.ai/v1"
        return True, {"base_url": base, "api_key": tok, "model": None}

    from app.services.token_store import get_qwen_token
    saved = get_qwen_token()
    if saved and (saved.get("access_token") or "").strip():
        tok = (saved.get("access_token") or "").strip()
        res = saved.get("resource_url") or resource_url
        base = f"https://{res}/v1" if res else "https://portal.qwen.ai/v1"
        return True, {"base_url": base, "api_key": tok, "model": None}

    return False, {}

@router.post("/build")
async def build_pageindex(
    book_id: str = Form(...),
    epub_file: UploadFile = File(...),
):
    """
    构建 EPUB 的 PageIndex 树结构
    
    方案 A：前端上传 EPUB bytes，后端解析并落盘索引。
    """
    try:
        logger.info(f"收到 PageIndex 构建请求: book_id={book_id}, filename={epub_file.filename}")

        if not book_id or not book_id.strip():
            raise HTTPException(status_code=400, detail="book_id 不能为空")

        if not epub_file.filename or not epub_file.filename.lower().endswith(".epub"):
            raise HTTPException(status_code=400, detail="仅支持上传 .epub 文件")

        data = await epub_file.read()
        if not data:
            raise HTTPException(status_code=400, detail="上传文件为空")

        result = _pageindex_service.build_from_epub_bytes(book_id=book_id.strip(), epub_bytes=data, filename=epub_file.filename)

        return {
            "success": True,
            "message": "PageIndex 构建成功",
            "book_id": book_id.strip(),
            "result": result,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PageIndex 构建失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query")
async def query_pageindex(request: PageIndexQueryRequest):
    """
    基于 PageIndex 的 RAG 查询
    
    说明：目前先提供“索引存在性 + 返回简单召回片段”的最小能力。
    后续再接入 tree-search + LLM 生成。
    """
    try:
        logger.info(f"收到 PageIndex 查询请求: book_id={request.book_id}, query={request.query}")

        if not _pageindex_service.exists(request.book_id):
            raise HTTPException(status_code=404, detail="索引不存在，请先 build")

        q = (request.query or "").strip().lower()
        if not q:
            raise HTTPException(status_code=400, detail="query 不能为空")

        hits = _pageindex_service.search(book_id=request.book_id, query=request.query, top_k=5)

        return {
            "success": True,
            "book_id": request.book_id,
            "query": request.query,
            "hits": hits,
            "message": "查询成功（当前为最小召回版本，尚未接入 LLM 生成）",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PageIndex 查询失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/answer")
async def answer_pageindex(request: PageIndexAnswerRequest):
    """RAG：先检索索引片段，再调用 LLM 生成最终回答。"""
    try:
        logger.info(f"收到 PageIndex 回答请求: book_id={request.book_id}, query={request.query}")

        if not _pageindex_service.exists(request.book_id):
            raise HTTPException(status_code=404, detail="索引不存在，请先 build")

        q = (request.query or "").strip()
        if not q:
            raise HTTPException(status_code=400, detail="query 不能为空")

        hits = _pageindex_service.search(book_id=request.book_id, query=request.query, top_k=int(request.top_k or 5))

        creds_ok, creds = _resolve_llm_credentials(request.access_token, request.resource_url, request.custom_api)
        if not creds_ok:
            raise HTTPException(status_code=401, detail="未提供 AI 凭证，请在设置中完成 OAuth 授权或配置自定义 API")

        model_id = request.model
        if not model_id:
            # 自定义 API 模式下用保存/传入的 model；OAuth 模式下给一个默认
            model_id = creds.get("model") or "qwen3-coder-plus"

        llm = ChatOpenAI(
            model=model_id,
            api_key=creds["api_key"],
            base_url=creds["base_url"],
            temperature=float(request.temperature or 0.2),
            streaming=False,
        )

        context_text = "\n\n".join(
            [f"[#{h['chunk_id']} | {h.get('chapter_name')}]\n{h['snippet']}" for h in hits]
        )

        prompt = (
            "你是 Neat Reader 的阅读助手。你会收到用户问题，以及从书籍索引中召回的若干片段。\n"
            "请严格基于召回片段回答；如果片段不足以支持结论，请明确说“索引中未找到足够信息”。\n"
            "回答要求：\n"
            "1) 用中文\n"
            "2) 给出清晰结论\n"
            "3) 在回答末尾给出引用 chunk_id 列表（例如：引用: #0_1, #2_0）\n\n"
            f"用户问题：{q}\n\n"
            f"召回片段：\n{context_text if context_text else '(无命中片段)'}\n"
        )

        msg = llm.invoke(prompt)
        answer = getattr(msg, "content", str(msg))

        return {
            "success": True,
            "book_id": request.book_id,
            "query": request.query,
            "hits": hits,
            "answer": answer,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PageIndex 回答失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_library(request: PageIndexSearchRequest):
    """跨全书架检索：遍历 cache/pageindex/*.json 聚合召回结果。"""
    try:
        q = (request.query or "").strip()
        if not q:
            raise HTTPException(status_code=400, detail="query 不能为空")

        top_k_per_book = int(request.top_k_per_book or 3)
        top_k_total = int(request.top_k_total or 10)
        if top_k_per_book <= 0:
            top_k_per_book = 1
        if top_k_total <= 0:
            top_k_total = 1

        if request.book_ids:
            book_ids = [b for b in request.book_ids if isinstance(b, str) and b.strip()]
        else:
            book_ids = _pageindex_service.list_book_ids()

        aggregated = []
        for book_id in book_ids:
            hits = _pageindex_service.search(book_id=book_id, query=q, top_k=top_k_per_book)
            for h in hits:
                aggregated.append({"book_id": book_id, **h})

        aggregated.sort(key=lambda x: int(x.get("score") or 0), reverse=True)
        aggregated = aggregated[:top_k_total]

        return {
            "success": True,
            "query": request.query,
            "book_count": len(book_ids),
            "hit_count": len(aggregated),
            "hits": aggregated,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"跨书架检索失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/books")
async def list_indexed_books():
    """列出已构建 PageIndex 的书籍（返回 book_id 列表）。"""
    try:
        book_ids = _pageindex_service.list_book_ids()
        return {
            "success": True,
            "book_count": len(book_ids),
            "book_ids": book_ids,
        }
    except Exception as e:
        logger.error(f"列出索引书籍失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/toc/{book_id}")
async def get_pageindex_toc(book_id: str):
    """获取书籍目录（来自构建时提取的 EPUB toc）。"""
    try:
        if not _pageindex_service.exists(book_id):
            raise HTTPException(status_code=404, detail="索引不存在")

        index_doc = _pageindex_service.load(book_id)
        toc = index_doc.get("toc") or []

        return {
            "success": True,
            "book_id": book_id,
            "toc": toc,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 TOC 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tree/{book_id}")
async def get_pageindex_tree(book_id: str):
    """
    获取书籍的 PageIndex 树结构
    
    TODO: 从缓存加载树结构
    """
    try:
        logger.info(f"获取 PageIndex 树结构: book_id={book_id}")

        if not _pageindex_service.exists(book_id):
            raise HTTPException(status_code=404, detail="索引不存在")

        index_doc = _pageindex_service.load(book_id)

        return {
            "success": True,
            "message": "PageIndex 获取成功",
            "book_id": book_id,
            "index": index_doc,
        }
        
    except Exception as e:
        logger.error(f"获取 PageIndex 树结构失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{book_id}")
async def get_pageindex_status(book_id: str):
    """
    获取 PageIndex 构建状态
    """
    try:
        logger.info(f"获取 PageIndex 状态: book_id={book_id}")

        status = "built" if _pageindex_service.exists(book_id) else "not_built"

        return {
            "success": True,
            "book_id": book_id,
            "status": status,  # not_built, building, built, error
            "message": "PageIndex 状态查询成功",
        }
        
    except Exception as e:
        logger.error(f"获取 PageIndex 状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{book_id}")
async def delete_pageindex(book_id: str):
    """
    删除书籍的 PageIndex
    """
    try:
        logger.info(f"删除 PageIndex: book_id={book_id}")

        deleted = _pageindex_service.delete(book_id)

        return {
            "success": True,
            "message": "PageIndex 删除成功" if deleted else "索引不存在，无需删除",
            "book_id": book_id,
            "deleted": deleted,
        }
        
    except Exception as e:
        logger.error(f"删除 PageIndex 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
