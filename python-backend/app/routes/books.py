"""
书籍管理 API 路由
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form
from fastapi.responses import FileResponse
from typing import Optional, List
from pydantic import BaseModel
from pathlib import Path
import hashlib
import uuid
from loguru import logger

from app.db.database import get_db


router = APIRouter()


# ============================================
# 请求/响应模型
# ============================================

class BookCreate(BaseModel):
    title: str
    author: Optional[str] = None
    cover: Optional[str] = None
    format: str
    category_id: Optional[str] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    cover: Optional[str] = None
    category_id: Optional[str] = None
    last_read: Optional[int] = None
    reading_progress: Optional[float] = None


class CategoryCreate(BaseModel):
    name: str
    color: str


class ProgressSave(BaseModel):
    ebook_id: str
    chapter_index: int
    chapter_title: Optional[str] = None
    position: float
    cfi: str
    device_id: str
    device_name: str
    reading_time: Optional[int] = 0


class AnnotationCreate(BaseModel):
    book_id: str
    cfi: str
    text: Optional[str] = None
    note: Optional[str] = None
    color: Optional[str] = None
    type: str  # 🎯 修复：移除默认值，要求必须明确指定类型 (highlight, underline, note)
    chapter_index: Optional[int] = 0
    chapter_title: Optional[str] = None


# ============================================
# 书籍管理
# ============================================

@router.post("/books/upload")
async def upload_book(
    file: UploadFile = File(...),
    title: Optional[str] = None,
    author: Optional[str] = None,
    category_id: Optional[str] = None,
    cover: Optional[str] = Form(None)  # 🎯 添加封面参数
):
    """
    上传书籍文件
    
    - 保存文件到 data/books/
    - 创建数据库记录
    - 自动触发 PageIndex 构建（EPUB 格式）
    - 返回书籍 ID
    """
    try:
        db = get_db()
        
        # 读取文件内容
        content = await file.read()
        
        # 计算文件哈希（用于去重）
        file_hash = hashlib.md5(content).hexdigest()
        
        # 检查是否已存在相同文件
        existing = db.execute(
            "SELECT id FROM books WHERE file_hash = ?",
            (file_hash,),
            fetch_one=True
        )
        
        if existing:
            logger.info(f"书籍已存在（相同哈希）: {existing['id']}")
            return {
                "success": True,
                "book_id": existing['id'],
                "message": "书籍已存在"
            }
        
        # 生成书籍 ID
        book_id = str(uuid.uuid4())
        
        # 确定文件格式
        file_ext = Path(file.filename).suffix.lower()
        if not file_ext:
            file_ext = '.epub'  # 默认
        
        # 保存文件
        books_dir = Path("data/books")
        books_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = books_dir / f"{book_id}{file_ext}"
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # 创建数据库记录
        import time
        book_data = {
            'id': book_id,
            'title': title or Path(file.filename).stem,
            'author': author,
            'cover': cover,  # 🎯 保存封面（Base64）
            'file_path': f"books/{book_id}{file_ext}",
            'format': file_ext.lstrip('.'),
            'size': len(content),
            'file_hash': file_hash,
            'category_id': category_id,
            'added_at': int(time.time()),
            'storage_type': 'local',
            'is_downloaded': 1
        }
        
        db.create_book(book_data)
        
        logger.info(f"书籍上传成功: {book_id} - {book_data['title']}")
        
        # 🎯 自动触发 PageIndex 构建（仅 EPUB 格式）
        pageindex_result = None
        if file_ext.lower() == '.epub':
            try:
                from app.services.pageindex_service import PageIndexService
                from app.config import settings
                
                pageindex_service = PageIndexService(settings.PAGEINDEX_CACHE_DIR)
                pageindex_result = pageindex_service.build_from_epub_bytes(
                    book_id=book_id,
                    epub_bytes=content,
                    filename=file.filename
                )
                logger.info(f"✅ PageIndex 自动构建成功: {book_id}")
            except Exception as e:
                logger.warning(f"⚠️ PageIndex 自动构建失败（不影响上传）: {e}")
        
        return {
            "success": True,
            "book_id": book_id,
            "message": "上传成功",
            "pageindex": pageindex_result
        }
        
    except Exception as e:
        logger.error(f"上传书籍失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/books")
async def list_books(
    category_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """列出书籍"""
    try:
        db = get_db()
        books = db.list_books(category_id=category_id, limit=limit, offset=offset)
        
        return {
            "success": True,
            "books": books,
            "count": len(books)
        }
        
    except Exception as e:
        logger.error(f"列出书籍失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/books/{book_id}")
async def get_book(book_id: str):
    """获取书籍详情"""
    try:
        db = get_db()
        book = db.get_book(book_id)
        
        if not book:
            raise HTTPException(status_code=404, detail="书籍不存在")
        
        return {
            "success": True,
            "book": book
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取书籍失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/books/{book_id}/content")
async def get_book_content(book_id: str):
    """获取书籍文件内容"""
    try:
        db = get_db()
        book = db.get_book(book_id)
        
        if not book:
            raise HTTPException(status_code=404, detail="书籍不存在")
        
        file_path = Path("data") / book['file_path']
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="书籍文件不存在")
        
        return FileResponse(
            path=str(file_path),
            media_type='application/octet-stream',
            filename=f"{book['title']}.{book['format']}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取书籍内容失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/books/{book_id}")
async def update_book(book_id: str, updates: BookUpdate):
    """更新书籍信息"""
    try:
        db = get_db()
        
        # 检查书籍是否存在
        book = db.get_book(book_id)
        if not book:
            raise HTTPException(status_code=404, detail="书籍不存在")
        
        # 只更新提供的字段
        update_data = updates.dict(exclude_unset=True)
        
        if update_data:
            db.update_book(book_id, update_data)
        
        return {
            "success": True,
            "message": "更新成功"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新书籍失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/books/{book_id}")
async def delete_book(book_id: str):
    """删除书籍"""
    try:
        db = get_db()
        
        # 获取书籍信息
        book = db.get_book(book_id)
        if not book:
            raise HTTPException(status_code=404, detail="书籍不存在")
        
        # 删除文件
        file_path = Path("data") / book['file_path']
        if file_path.exists():
            file_path.unlink()
        
        # 删除数据库记录（级联删除相关数据）
        db.delete_book(book_id)
        
        logger.info(f"删除书籍: {book_id}")
        
        return {
            "success": True,
            "message": "删除成功"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除书籍失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 分类管理
# ============================================

@router.post("/categories")
async def create_category(category: CategoryCreate):
    """创建分类"""
    try:
        db = get_db()
        
        category_id = str(uuid.uuid4())
        
        db.create_category({
            'id': category_id,
            'name': category.name,
            'color': category.color
        })
        
        return {
            "success": True,
            "category_id": category_id,
            "message": "创建成功"
        }
        
    except Exception as e:
        logger.error(f"创建分类失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def list_categories():
    """列出所有分类"""
    try:
        db = get_db()
        categories = db.list_categories()
        
        return {
            "success": True,
            "categories": categories
        }
        
    except Exception as e:
        logger.error(f"列出分类失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/categories/{category_id}")
async def update_category(category_id: str, updates: CategoryCreate):
    """更新分类"""
    try:
        db = get_db()
        
        update_data = {}
        if updates.name:
            update_data['name'] = updates.name
        if updates.color:
            update_data['color'] = updates.color
        
        db.update_category(category_id, update_data)
        
        return {
            "success": True,
            "message": "更新成功"
        }
        
    except Exception as e:
        logger.error(f"更新分类失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """删除分类"""
    try:
        db = get_db()
        db.delete_category(category_id)
        
        return {
            "success": True,
            "message": "删除成功"
        }
        
    except Exception as e:
        logger.error(f"删除分类失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 阅读进度管理
# ============================================

@router.post("/progress")
async def save_progress(progress: ProgressSave):
    """保存阅读进度"""
    try:
        db = get_db()
        
        import time
        progress_data = progress.dict()
        progress_data['timestamp'] = int(time.time())
        
        db.save_progress(progress_data)
        
        return {
            "success": True,
            "message": "进度已保存"
        }
        
    except Exception as e:
        logger.error(f"保存进度失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress/{ebook_id}")
async def get_progress(ebook_id: str):
    """获取阅读进度"""
    try:
        db = get_db()
        progress = db.get_progress(ebook_id)
        
        if not progress:
            return {
                "success": True,
                "progress": None
            }
        
        return {
            "success": True,
            "progress": progress
        }
        
    except Exception as e:
        logger.error(f"获取进度失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 注释管理
# ============================================

@router.post("/annotations")
async def create_annotation(annotation: AnnotationCreate):
    """创建注释"""
    try:
        db = get_db()
        
        annotation_id = str(uuid.uuid4())
        
        annotation_data = annotation.dict()
        annotation_data['id'] = annotation_id
        
        db.create_annotation(annotation_data)
        
        return {
            "success": True,
            "annotation_id": annotation_id,
            "message": "创建成功"
        }
        
    except Exception as e:
        logger.error(f"创建注释失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/annotations/{book_id}")
async def list_annotations(book_id: str):
    """列出书籍的所有注释"""
    try:
        db = get_db()
        annotations = db.list_annotations(book_id)
        
        return {
            "success": True,
            "annotations": annotations
        }
        
    except Exception as e:
        logger.error(f"列出注释失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/annotations/{annotation_id}")
async def update_annotation(annotation_id: str, updates: AnnotationCreate):
    """更新注释"""
    try:
        db = get_db()
        
        update_data = {}
        if updates.note is not None:
            update_data['note'] = updates.note
        if updates.color is not None:
            update_data['color'] = updates.color
        if updates.text is not None:
            update_data['text'] = updates.text
        if updates.type is not None:
            update_data['type'] = updates.type
        if updates.chapter_index is not None:
            update_data['chapter_index'] = updates.chapter_index
        if updates.chapter_title is not None:
            update_data['chapter_title'] = updates.chapter_title
        
        db.update_annotation(annotation_id, update_data)
        
        return {
            "success": True,
            "message": "更新成功"
        }
        
    except Exception as e:
        logger.error(f"更新注释失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(annotation_id: str):
    """删除注释"""
    try:
        db = get_db()
        db.delete_annotation(annotation_id)
        
        return {
            "success": True,
            "message": "删除成功"
        }
        
    except Exception as e:
        logger.error(f"删除注释失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
