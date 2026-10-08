"""Write one folder of official central and state recruitment portals.

Unofficial aggregators are left out. The legacy `ne` map shape is not a state.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parent
ROOT = AGENT_DIR.parent
sys.path.insert(0, str(AGENT_DIR))

from agent.load_sources import load_official_sites  # noqa: E402
from agent.state_map import STATE_NAMES  # noqa: E402

# 28 states + 8 union territories. `ne` is map geometry only.
BROWSE_STATES = [
    "jk", "la", "hp", "pb", "hr", "dl", "ch", "uk", "rj", "up",
    "br", "sk", "wb", "as", "ar", "nl", "mn", "mz", "tr", "ml",
    "jh", "od", "mp", "cg", "gj", "dd", "mh", "ga", "tg", "ap",
    "ka", "kl", "ld", "tn", "py", "an",
]

OUT = AGENT_DIR / "government-portals"


def _portal(site: dict) -> dict:
    return {
        "id": site.get("id"),
        "name": site.get("name"),
        "url": site.get("url"),
        "notificationsUrl": site.get("latestUrl") or site.get("url"),
        "category": site.get("category"),
        "scope": site.get("scope"),
    }


def main() -> None:
    sites = load_official_sites()
    central: list[dict] = []
    by_state: dict[str, list[dict]] = defaultdict(list)
    for site in sites:
        state_ids = [code for code in (site.get("stateIds") or []) if code and code != "all"]
        if not state_ids:
            central.append(_portal(site))
            continue
        for code in state_ids:
            by_state[code].append(_portal(site))

    if OUT.exists():
        for child in OUT.rglob("*"):
            if child.is_file():
                child.unlink()
    (OUT / "states").mkdir(parents=True, exist_ok=True)

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    (OUT / "central.json").write_text(
        json.dumps(
            {"level": "central", "name": "Central and All India", "count": len(central), "portals": central},
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    state_counts = []
    for code in BROWSE_STATES:
        rows = by_state.get(code, [])
        name = STATE_NAMES[code]
        payload = {"id": code, "name": name, "count": len(rows), "portals": rows}
        (OUT / "states" / f"{code}.json").write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        state_counts.append({"id": code, "name": name, "count": len(rows)})

    missing = [row["name"] for row in state_counts if row["count"] == 0]
    summary = {
        "generatedAt": generated,
        "whatThisIs": "Official recruitment portals already curated in this project, filed under central and all 36 states and union territories.",
        "whatThisIsNot": "Not every government department website in India, and not the live vacancy list.",
        "centralPortals": len(central),
        "statePortals": sum(row["count"] for row in state_counts),
        "statesAndUnionTerritories": len(BROWSE_STATES),
        "statesWithNoPortal": missing,
        "states": state_counts,
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [
        "# Official government recruitment portals",
        "",
        f"Generated {generated}.",
        "",
        f"Central and All India: {len(central)} portals (`central.json`).",
        f"States and Union Territories: {len(BROWSE_STATES)} (`states/<code>.json`).",
        "",
        "This is the official portal directory. It is not every department website in India, and it is not the live vacancy list on the homepage.",
        "",
        "## States and Union Territories",
        "",
    ]
    for row in state_counts:
        lines.append(f"- {row['name']} ({row['id']}): {row['count']}")
    lines.append("")
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"central": len(central), "stateRows": summary["statePortals"], "missing": missing}))


if __name__ == "__main__":
    main()
