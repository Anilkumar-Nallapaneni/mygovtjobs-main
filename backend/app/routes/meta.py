from fastapi import APIRouter

from app.services.daily_sync_service import DailySyncService

router = APIRouter()

STATES = [
    {"id": "jk", "name": "Jammu & Kashmir", "region": "north"},
    {"id": "la", "name": "Ladakh", "region": "north"},
    {"id": "hp", "name": "Himachal Pradesh", "region": "north"},
    {"id": "pb", "name": "Punjab", "region": "north"},
    {"id": "hr", "name": "Haryana", "region": "north"},
    {"id": "dl", "name": "Delhi", "region": "north"},
    {"id": "uk", "name": "Uttarakhand", "region": "north"},
    {"id": "rj", "name": "Rajasthan", "region": "north"},
    {"id": "up", "name": "Uttar Pradesh", "region": "north"},
    {"id": "br", "name": "Bihar", "region": "east"},
    {"id": "sk", "name": "Sikkim", "region": "northeast"},
    {"id": "wb", "name": "West Bengal", "region": "east"},
    {"id": "as", "name": "Assam", "region": "northeast"},
    {"id": "ne", "name": "NE States", "region": "northeast"},
    {"id": "jh", "name": "Jharkhand", "region": "east"},
    {"id": "od", "name": "Odisha", "region": "east"},
    {"id": "mp", "name": "Madhya Pradesh", "region": "central"},
    {"id": "cg", "name": "Chhattisgarh", "region": "central"},
    {"id": "gj", "name": "Gujarat", "region": "west"},
    {"id": "mh", "name": "Maharashtra", "region": "west"},
    {"id": "ga", "name": "Goa", "region": "west"},
    {"id": "tg", "name": "Telangana", "region": "south"},
    {"id": "ap", "name": "Andhra Pradesh", "region": "south"},
    {"id": "ka", "name": "Karnataka", "region": "south"},
    {"id": "kl", "name": "Kerala", "region": "south"},
    {"id": "tn", "name": "Tamil Nadu", "region": "south"},
    {"id": "py", "name": "Puducherry", "region": "south"},
    {"id": "an", "name": "Andaman & Nicobar", "region": "east"},
]

CATEGORIES = [
    {"id": "upsc", "name": "UPSC", "icon": "🏛️"},
    {"id": "ssc", "name": "SSC", "icon": "📋"},
    {"id": "railways", "name": "Railways", "icon": "🚂"},
    {"id": "banking", "name": "Banking", "icon": "🏦"},
    {"id": "police", "name": "Police", "icon": "🚔"},
    {"id": "teaching", "name": "Teaching", "icon": "📚"},
    {"id": "defence", "name": "Defence", "icon": "⚔️"},
    {"id": "psu", "name": "PSU", "icon": "⚙️"},
    {"id": "health", "name": "Health", "icon": "🏥"},
    {"id": "state", "name": "State PSC", "icon": "🏢"},
]


@router.get("/states")
async def list_states():
    return {"items": STATES}


@router.get("/categories")
async def list_categories():
    return {"items": CATEGORIES}


@router.get("/sync-status")
async def sync_status():
    """Public daily sync window — 8:00 AM IST, one update per day."""
    return DailySyncService().public_status()
