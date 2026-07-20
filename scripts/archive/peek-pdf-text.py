#!/usr/bin/env python3
import asyncio
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.parsers.pdf_parser import fetch_pdf_text


async def main() -> None:
    url = sys.argv[1] if len(sys.argv) > 1 else (
        "https://www.vnsgu.ac.in/uploads/assetlinks/413552ba-f935-460f-a0f9-2717337dfaa6.pdf"
    )
    text = await fetch_pdf_text(url)
    print("len", len(text))
    print("--- head ---")
    print(text[:3000])
    print("--- date lines ---")
    for line in text.splitlines():
        if re.search(r"date|dated|last|closing|upto|until|application|notification", line, re.I):
            print(line.strip()[:200])


if __name__ == "__main__":
    asyncio.run(main())
