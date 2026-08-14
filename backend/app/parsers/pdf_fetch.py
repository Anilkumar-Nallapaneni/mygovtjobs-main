"""Download official PDFs and extract text (pymupdf → pypdf → optional OCR)."""

from __future__ import annotations

import io
import logging

from pypdf import PdfReader

from app.scrapers.http_client import create_async_client
from app.services.noise_filter import strip_postgres_control_chars
from app.services.pdf_candidate import is_real_pdf
from app.utils.url_safety import assert_safe_url

logger = logging.getLogger(__name__)

_MAX_BYTES = 20 * 1024 * 1024
_MIN_OCR_TEXT = 40
_PDF_MAGIC = b"%PDF"


def _is_pdf_bytes(data: bytes) -> bool:
    head = data[:2048].lstrip()
    return head.startswith(_PDF_MAGIC)


def _extract_with_pypdf(data: bytes, *, max_pages: int = 12) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for page in reader.pages[:max_pages]:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)


def _page_text_to_str(raw: object) -> str:
    """PyMuPDF get_text() stubs allow str | list | dict; we only need plain text."""
    if isinstance(raw, str):
        return raw
    if not raw:
        return ""
    return str(raw)


def _extract_with_pymupdf(data: bytes, *, max_pages: int = 12) -> str:
    import fitz  # pymupdf

    parts: list[str] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc[:max_pages]:
            parts.append(_page_text_to_str(page.get_text("text")))
    return "\n".join(parts)


def _extract_with_ocr(data: bytes, *, max_pages: int = 4, dpi: int = 200) -> str:
    """OCR scanned pages when Tesseract is available (optional dependency)."""
    import fitz  # pymupdf

    parts: list[str] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc[:max_pages]:
            try:
                text_page = page.get_textpage_ocr(dpi=dpi, full=True)
                chunk = _page_text_to_str(page.get_text(textpage=text_page))
            except Exception as exc:
                logger.debug("OCR page failed: %s", exc)
                chunk = ""
            if chunk.strip():
                parts.append(chunk)
    return "\n".join(parts)


def extract_text_from_pdf_bytes(
    data: bytes,
    *,
    max_pages: int = 12,
    ocr_enabled: bool = False,
) -> str:
    """Best-effort text from PDF bytes."""
    if not data or not _is_pdf_bytes(data):
        return ""

    text = ""
    try:
        text = _extract_with_pymupdf(data, max_pages=max_pages)
    except Exception as exc:
        logger.debug("pymupdf extract failed: %s", exc)

    if len(text.strip()) < _MIN_OCR_TEXT:
        try:
            fallback = _extract_with_pypdf(data, max_pages=max_pages)
            if len(fallback.strip()) > len(text.strip()):
                text = fallback
        except Exception as exc:
            logger.debug("pypdf extract failed: %s", exc)

    if ocr_enabled and len(text.strip()) < _MIN_OCR_TEXT:
        try:
            ocr_text = _extract_with_ocr(data, max_pages=min(4, max_pages))
            if len(ocr_text.strip()) > len(text.strip()):
                text = ocr_text
        except Exception as exc:
            logger.info("PDF OCR skipped (install Tesseract for scanned notices): %s", exc)

    return strip_postgres_control_chars(text)


async def fetch_pdf_bytes(url: str, *, timeout: float = 30) -> bytes:
    """Download PDF using legacy-tolerant SSL (many .gov.in portals)."""
    assert_safe_url(url)
    async with create_async_client(timeout=timeout, url_for_tls_policy=url) as client:
        async with client.stream(
            "GET",
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "application/pdf,application/octet-stream,*/*;q=0.8",
            },
        ) as res:
            res.raise_for_status()
            content_type = (res.headers.get("content-type") or "").lower()
            buf = io.BytesIO()
            size = 0
            async for chunk in res.aiter_bytes():
                size += len(chunk)
                if size > _MAX_BYTES:
                    raise ValueError("PDF too large")
                buf.write(chunk)
            data = buf.getvalue()
            if not is_real_pdf(data, content_type, min_bytes=2_000):
                if not _is_pdf_bytes(data):
                    if "pdf" not in content_type and "octet-stream" not in content_type:
                        raise ValueError("Response is not a PDF")
                    if data[:1] == b"<" or b"<!DOCTYPE" in data[:256].upper():
                        raise ValueError("Response is HTML, not a PDF")
                elif len(data) < 2_000:
                    raise ValueError("PDF too small to be a notification")
            return data


async def fetch_pdf_text(
    url: str,
    *,
    timeout: float = 30,
    ocr_enabled: bool = False,
) -> str:
    data = await fetch_pdf_bytes(url, timeout=timeout)
    return extract_text_from_pdf_bytes(data, ocr_enabled=ocr_enabled)
