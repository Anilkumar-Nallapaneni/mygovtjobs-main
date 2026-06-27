# Build from repo root: docker build -f backend/Dockerfile .
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# PDF OCR is off in production by default (APP_ENV=production → PDF_OCR_ENABLED=false).
# Set PDF_OCR_ENABLED=1 on Railway/Render only when this image is used for PDF ingest.

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY scripts ./scripts

ENV PYTHONPATH=/app
EXPOSE 8000

# Railway/Render set PORT; default 8000 for local docker run
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
