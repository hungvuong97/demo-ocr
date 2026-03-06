import json
from typing import Literal

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response, StreamingResponse
from pydantic import BaseModel

from app.config import API_BASE
from app.export import to_docx, to_html
from app.ocr_service import ocr_bytes, ocr_image
from app.pdf_utils import pdf_to_images


class ExportBody(BaseModel):
    format: Literal["html", "markdown", "doc"]
    markdown: str

app = FastAPI(title="OCR Web API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_PDF = "application/pdf"


def _format_err(e: Exception) -> str:
    if isinstance(e, httpx.ConnectError):
        return f"Không kết nối được tới API OCR tại {API_BASE}. Kiểm tra API đã chạy chưa."
    if isinstance(e, httpx.HTTPStatusError):
        return f"API trả lỗi {e.response.status_code}: {(e.response.text or '')[:150]}"
    if isinstance(e, (httpx.ReadError, httpx.WriteError, httpx.ReadTimeout, httpx.ConnectTimeout)):
        return "Kết nối bị ngắt hoặc quá thời gian. Thử lại hoặc giảm kích thước file."
    return str(e)[:200]


async def _ocr_stream_gen(content_type: str, raw: bytes):
    try:
        if content_type == ALLOWED_PDF:
            images = pdf_to_images(raw)
            total = len(images)
            parts = []
            for i, img in enumerate(images):
                part = await ocr_image(img)
                content = part or ""
                parts.append(content)
                yield json.dumps({"page": i + 1, "total": total, "content": content}) + "\n"
            markdown_result = "\n\n".join(
                f"--- Trang {i + 1} ---\n\n{p}" for i, p in enumerate(parts)
            )
        elif content_type in ALLOWED_IMAGE:
            text = await ocr_bytes(raw)
            yield json.dumps({"page": 1, "total": 1, "content": text}) + "\n"
            markdown_result = text
        else:
            yield json.dumps({"error": f"Unsupported type: {content_type}"}) + "\n"
            yield json.dumps({"done": True, "markdown": None}) + "\n"
            return
        yield json.dumps({"done": True, "markdown": markdown_result}) + "\n"
    except Exception as e:
        yield json.dumps({"error": _format_err(e)}) + "\n"
        yield json.dumps({"done": True, "markdown": None}) + "\n"


@app.post("/api/ocr")
async def ocr(file: UploadFile = File(...)):
    content_type = file.content_type or ""
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Empty file")
    if content_type not in (ALLOWED_PDF, *ALLOWED_IMAGE):
        raise HTTPException(400, f"Loại file không hỗ trợ: {content_type}. Dùng ảnh (JPEG/PNG/WebP) hoặc PDF.")

    async def body_gen():
        async for chunk in _ocr_stream_gen(content_type, raw):
            yield chunk.encode("utf-8")

    return StreamingResponse(
        body_gen(),
        media_type="application/x-ndjson; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/export")
async def export_as(body: ExportBody):
    md = body.markdown.strip()
    if not md:
        raise HTTPException(400, "markdown is required")
    if body.format == "markdown":
        return PlainTextResponse(md, media_type="text/markdown")
    if body.format == "html":
        return PlainTextResponse(to_html(md), media_type="text/html")
    if body.format == "doc":
        # Xuất DOCX thuần văn bản từ Markdown (giữ nguyên nội dung, không thêm "Trang 1/2/...")
        blob = to_docx(md)
        return Response(
            content=blob,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=document.docx"},
        )
    raise HTTPException(400, "Invalid format")
