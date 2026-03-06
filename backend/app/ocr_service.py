import base64
import io

import httpx
from PIL import Image

from app.config import API_BASE, MODEL_NAME, OCR_API_KEY

# Prompt ngắn để tiết kiệm token (model max 4096; ảnh lớn chiếm rất nhiều token)
DEFAULT_PROMPT = """Extract all text and structure from this document image. Output clean Markdown. Preserve headings, paragraphs, tables (as Markdown), lists. Keep references and footnotes."""

# Cạnh dài tối đa (pixel) để giữ request dưới 4096 token
MAX_IMAGE_SIZE = 1280


def _resize_to_fit(image: Image.Image, max_side: int = MAX_IMAGE_SIZE) -> Image.Image:
    w, h = image.size
    if w <= max_side and h <= max_side:
        return image
    if w >= h:
        new_w, new_h = max_side, int(h * max_side / w)
    else:
        new_w, new_h = int(w * max_side / h), max_side
    return image.resize((new_w, new_h), Image.Resampling.LANCZOS)


def image_to_base64_data_url(image: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/png" if fmt.upper() == "PNG" else "image/jpeg"
    return f"data:{mime};base64,{b64}"


def _normalize_ocr_output(text: str) -> str:
    """
    Làm sạch kết quả OCR.
    - Nếu model trả về câu kiểu 'There is no text or content in the provided image. It appears to be blank'
      thì coi như trang trắng -> trả về chuỗi rỗng.
    """
    t = (text or "").strip()
    lowered = t.lower()
    if lowered.startswith("there is no text or content in the provided image"):
        return ""
    return t


async def ocr_image(image: Image.Image, prompt: str = DEFAULT_PROMPT) -> str:
    image = _resize_to_fit(image)
    data_url = image_to_base64_data_url(image)
    url = f"{API_BASE.rstrip('/')}/chat/completions"
    payload = {
        "model": MODEL_NAME or "allenai/olmOCR-7B-0725-FP8",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                ],
            }
        ],
        "max_tokens": 3500,
        "temperature": 0,
    }
    headers = {"Content-Type": "application/json"}
    if OCR_API_KEY:
        headers["Authorization"] = f"Bearer {OCR_API_KEY}"
    if "ngrok-free.app" in API_BASE:
        headers["ngrok-skip-browser-warning"] = "true"
    timeout = httpx.Timeout(connect=30.0, read=300.0, write=120.0, pool=60.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    choice = data.get("choices", [{}])[0]
    raw = (choice.get("message") or {}).get("content", "") or ""
    return _normalize_ocr_output(raw)


async def ocr_bytes(image_bytes: bytes, prompt: str = DEFAULT_PROMPT) -> str:
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    return await ocr_image(image, prompt=prompt)
