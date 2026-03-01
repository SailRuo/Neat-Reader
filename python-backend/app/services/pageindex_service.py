"""\
PageIndex service
Build and persist a lightweight, non-vector index from an uploaded EPUB.
"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import re
import time

from bs4 import BeautifulSoup
from ebooklib import epub, ITEM_DOCUMENT
from loguru import logger


_WORD_RE = re.compile(r"[A-Za-z0-9\u4e00-\u9fff]+", re.UNICODE)


@dataclass
class PageChunk:
    chunk_id: str
    chapter_index: int
    chapter_name: str
    text: str


class PageIndexService:
    def __init__(self, cache_dir: str):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _index_path(self, book_id: str) -> Path:
        return self.cache_dir / f"{book_id}.json"

    def exists(self, book_id: str) -> bool:
        return self._index_path(book_id).exists()

    def load(self, book_id: str) -> Dict[str, Any]:
        path = self._index_path(book_id)
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def delete(self, book_id: str) -> bool:
        path = self._index_path(book_id)
        if path.exists():
            path.unlink()
            return True
        return False

    def list_book_ids(self) -> List[str]:
        return sorted([p.stem for p in self.cache_dir.glob("*.json") if p.is_file()])

    def search(self, *, book_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Very small retrieval: token overlap scoring over cached chunk tokens."""
        if not self.exists(book_id):
            return []
        q = (query or "").strip().lower()
        if not q:
            return []

        q_tokens = set([t.lower() for t in _WORD_RE.findall(q) if t.strip()])
        if not q_tokens:
            return []

        index_doc = self.load(book_id)
        scored = []
        for c in index_doc.get("chunks", []):
            tokens = c.get("tokens") or []
            if not tokens:
                tokens = self._tokens(c.get("text") or "")
            token_set = set(tokens)
            score = len(q_tokens & token_set)
            if score <= 0:
                continue
            scored.append((score, c))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, c in scored[: max(1, int(top_k))]:
            text = (c.get("text") or "")
            results.append(
                {
                    "chunk_id": c.get("chunk_id"),
                    "chapter_name": c.get("chapter_name"),
                    "snippet": text[:800],
                    "score": score,
                }
            )
        return results

    def build_from_epub_bytes(self, *, book_id: str, epub_bytes: bytes, filename: Optional[str] = None) -> Dict[str, Any]:
        started_at = time.time()

        book = epub.read_epub(BytesIO(epub_bytes))

        toc = self._extract_toc(book)

        chunks: List[PageChunk] = []
        chapter_index = 0

        for item in book.get_items_of_type(ITEM_DOCUMENT):
            try:
                raw = item.get_content()
                html = raw.decode("utf-8", errors="ignore")
                soup = BeautifulSoup(html, "lxml")
                text = soup.get_text("\n", strip=True)
                if not text:
                    continue

                chapter_name = item.get_name() or f"chapter_{chapter_index}"
                chapter_chunks = self._chunk_text(text)
                for i, c in enumerate(chapter_chunks):
                    chunks.append(
                        PageChunk(
                            chunk_id=f"{chapter_index}_{i}",
                            chapter_index=chapter_index,
                            chapter_name=chapter_name,
                            text=c,
                        )
                    )
                chapter_index += 1
            except Exception as e:
                logger.warning(f"解析章节失败: {item.get_name()} - {e}")

        index_doc: Dict[str, Any] = {
            "book_id": book_id,
            "source": {
                "filename": filename,
                "byte_size": len(epub_bytes),
            },
            "built_at": started_at,
            "chunk_count": len(chunks),
            "toc": toc,
            "chunks": [
                {
                    "chunk_id": c.chunk_id,
                    "chapter_index": c.chapter_index,
                    "chapter_name": c.chapter_name,
                    "text": c.text,
                    "tokens": self._tokens(c.text),
                }
                for c in chunks
            ],
        }

        path = self._index_path(book_id)
        tmp = path.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(index_doc, f, ensure_ascii=False)
        tmp.replace(path)

        logger.info(f"✅ PageIndex 构建完成: book_id={book_id}, chunks={len(chunks)}, path={path}")
        return {"path": str(path), "chunk_count": len(chunks), "elapsed_sec": round(time.time() - started_at, 3)}

    def _chunk_text(self, text: str, *, max_chars: int = 1200, overlap_chars: int = 150) -> List[str]:
        normalized = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        if len(normalized) <= max_chars:
            return [normalized]

        chunks: List[str] = []
        start = 0
        while start < len(normalized):
            end = min(start + max_chars, len(normalized))
            chunk = normalized[start:end]
            chunks.append(chunk)
            if end >= len(normalized):
                break
            start = max(0, end - overlap_chars)
        return chunks

    def _tokens(self, text: str) -> List[str]:
        return [t.lower() for t in _WORD_RE.findall(text)[:2048]]

    def _extract_toc(self, book: Any) -> List[Dict[str, Any]]:
        try:
            toc = getattr(book, "toc", None)
            if not toc:
                return []
            return self._parse_toc_items(toc)
        except Exception as e:
            logger.warning(f"提取 TOC 失败: {e}")
            return []

    def _parse_toc_items(self, items: Any) -> List[Dict[str, Any]]:
        if not items:
            return []

        out: List[Dict[str, Any]] = []
        for it in items:
            if isinstance(it, (list, tuple)) and len(it) == 2 and isinstance(it[1], (list, tuple)):
                parent = it[0]
                children = it[1]
                node: Dict[str, Any] = {
                    "title": (getattr(parent, "title", None) or getattr(parent, "label", None) or str(parent)).strip(),
                    "href": getattr(parent, "href", None),
                    "nodes": self._parse_toc_items(children),
                }
                if not node["nodes"]:
                    node.pop("nodes", None)
                if node.get("href") is None:
                    node.pop("href", None)
                out.append(node)
            else:
                title = (getattr(it, "title", None) or getattr(it, "label", None) or str(it)).strip()
                href = getattr(it, "href", None)
                node2: Dict[str, Any] = {"title": title}
                if href is not None:
                    node2["href"] = href
                out.append(node2)
        return out
