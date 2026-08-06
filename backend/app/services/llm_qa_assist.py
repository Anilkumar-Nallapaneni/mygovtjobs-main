"""Optional LLM assist for QA review when an API key is configured.

Deterministic extractors remain the source of truth. The model may only
propose fields that also appear (or are strongly supported) in notice text.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any
from urllib import error, request

logger = logging.getLogger(__name__)

_JSON_BLOCK = re.compile(r"\{[\s\S]*\}")


def llm_assist_enabled() -> bool:
    return bool(
        os.getenv("OPENAI_API_KEY")
        or os.getenv("AI_REVIEW_API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
    )


def suggest_job_fields(*, title: str, context: str, current: dict[str, Any]) -> dict[str, Any] | None:
    """Return optional field suggestions from an LLM, or None if unavailable/failed."""
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("AI_REVIEW_API_KEY")
    if not api_key:
        # Anthropic path kept optional; skip if only Anthropic without adapter.
        if os.getenv("ANTHROPIC_API_KEY"):
            logger.info("ANTHROPIC_API_KEY set but OpenAI-compatible endpoint not configured; skipping LLM")
        return None

    base = (os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("AI_REVIEW_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
    snippet = (context or "")[:6000]
    prompt = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You extract government job fields ONLY from the provided official notice text. "
                    "Never invent vacancy counts or dates. If unsure, omit the field. "
                    "Return JSON with optional keys: vacancies (int), last_date (YYYY-MM-DD), "
                    "published_date (YYYY-MM-DD), state_codes (array of 2-letter codes), "
                    "title (cleaned string), confidence (0-100), notes (string)."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "title": title,
                        "current": current,
                        "notice_text": snippet,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
    }
    req = request.Request(
        f"{base}/chat/completions",
        data=json.dumps(prompt).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=45) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"]
        match = _JSON_BLOCK.search(content or "")
        if not match:
            return None
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except (error.URLError, error.HTTPError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as exc:
        logger.warning("LLM QA assist failed: %s", exc)
        return None
