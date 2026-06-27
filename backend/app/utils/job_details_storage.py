"""Upload job detail JSON to Supabase Storage (service role)."""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import get_settings


def upload_job_detail_json(slug: str, payload: dict[str, Any]) -> bool:
    settings = get_settings()
    base = (settings.supabase_url or "").rstrip("/")
    key = settings.supabase_service_role_key
    bucket = settings.job_details_storage_bucket or "job-details"
    if not base or not key or not slug:
        return False

    path = f"{slug}.json"
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    url = f"{base}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
        "x-upsert": "true",
    }
    with httpx.Client(timeout=60.0) as client:
        res = client.post(url, content=body, headers=headers)
        if res.status_code in (200, 201):
            return True
        # Supabase returns 400 when object exists without upsert on older stacks
        if res.status_code == 400 and "already exists" in res.text.lower():
            res = client.put(url, content=body, headers=headers)
            return res.status_code in (200, 201)
        return False
