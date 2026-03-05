#!/usr/bin/env bash
# Chạy backend (cần OCR API tại localhost:8000)
cd "$(dirname "$0")"
uvicorn app.main:app --reload --host 0.0.0.0 --port 5001
