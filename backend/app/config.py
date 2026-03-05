import os

# Base URL API OCR (OpenAI-compatible). Ví dụ ngrok, vLLM local: http://127.0.0.1:8000/v1
# Override: OCR_API_BASE
API_BASE = os.getenv(
    "OCR_API_BASE",
    "https://6813-2402-800-61c3-43ff-5d6-bd13-ab6e-bd90.ngrok-free.app/v1"
)
# Id model — khớp với /v1/models của API (vd. vLLM trả về id đầy đủ đường dẫn)
# Override: OCR_MODEL
MODEL_NAME = os.getenv(
    "OCR_MODEL",
    "/opt/models/hub/models--allenai--olmOCR-2-7B-1025-FP8/snapshots/19133a8e683f7203f37c49000377c11a896c8d9b",
)
# Bearer token (bắt buộc nếu API yêu cầu)
OCR_API_KEY = os.getenv("OCR_API_KEY", "")
