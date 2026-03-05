# OCR Web — Ảnh / PDF → HTML, Markdown, DOC

Trang web nhận đầu vào là **ảnh** hoặc **file PDF**, gọi API OCR (vLLM + olmOCR) và xuất kết quả dạng **HTML**, **Markdown**, **DOC**.

## Yêu cầu

1. **API OCR** — một trong hai:
   - **Tự host (Docker vLLM)** (mặc định, như ví dụ bên dưới).
   - **DeepInfra** (tuỳ chọn): đăng ký tại [deepinfra.com](https://deepinfra.com), lấy API key, set `OCR_API_KEY`. Không cần Docker.

```bash
docker run --gpus all -p 8000:8000 --rm --entrypoint /bin/bash \
  alleninstituteforai/olmocr:latest-with-model -c \
  "python3 -m vllm.entrypoints.openai.api_server \
   --model /opt/models/hub/models--allenai--olmOCR-2-7B-1025-FP8/snapshots/19133a8e683f7203f37c49000377c11a896c8d9b \
   --dtype auto --trust-remote-code --host 0.0.0.0 --port 8000 \
   --gpu-memory-utilization 0.9 --max-model-len 4096"
```

2. **Python 3.10+** (backend)  
3. **Node.js 18+** (frontend)  
4. Backend dùng **PyMuPDF** để chuyển PDF → ảnh (không cần cài Poppler).

## Cấu trúc

- `backend/` — FastAPI: nhận upload ảnh/PDF, gọi API vLLM, trả Markdown/HTML và endpoint xuất DOC.
- `frontend/` — Vite + React: giao diện upload, xem kết quả, nút tải HTML / Markdown / DOC.

## Chạy

### 1. Backend (port 5001)

Trên macOS port 5000 thường bị AirPlay Receiver chiếm, nên dùng port **5001**:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 5001
```

Biến môi trường (tùy chọn):

- `OCR_API_BASE` — Base URL API OCR, mặc định `http://127.0.0.1:8000/v1` (vLLM local). Có thể đổi sang DeepInfra (`https://api.deepinfra.com/v1/openai`) hoặc ngrok nếu cần public ra ngoài.
- `OCR_API_KEY` — **Bắt buộc khi dùng DeepInfra**: Bearer token lấy tại [deepinfra.com](https://deepinfra.com). Để trống nếu dùng API local/ngrok không cần auth.
- `OCR_MODEL` — Tên model (mặc định: `allenai/olmOCR-7B-0725-FP8`). DeepInfra cũng hỗ trợ `allenai/olmOCR-2-7B-1025`.

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt: **http://localhost:3000**

Frontend proxy `/api` sang `http://localhost:5001`, nên gọi OCR và export đều qua backend.

### 3. Luồng sử dụng

1. Chọn file **ảnh** (JPEG, PNG, WebP, …) hoặc **PDF**.
2. Bấm **Chạy OCR** → backend gửi ảnh (hoặc từng trang PDF) lên API tại `localhost:8000`.
3. Kết quả hiển thị dạng Markdown (có thể bật “Xem Markdown gốc”).
4. **Tải Markdown** / **Tải HTML** / **Tải DOC** → gọi `/api/export` và tải file tương ứng.

## API Backend

| Method | Path       | Mô tả |
|--------|------------|--------|
| POST   | `/api/ocr` | Body: `multipart/form-data` với key `file` (ảnh hoặc PDF). Trả về `{ "markdown", "html" }`. |
| POST   | `/api/export` | Body: `{ "format": "html" \| "markdown" \| "doc", "markdown": "..." }`. Trả về file tương ứng. |

## Ghi chú

- PDF được chuyển thành ảnh từng trang (PyMuPDF), mỗi trang gửi lên API OCR rồi nối lại.
- File DOC xuất bằng `python-docx` (nội dung từ Markdown, định dạng đơn giản).
- CORS backend cho phép mọi origin; production nên giới hạn origin.
