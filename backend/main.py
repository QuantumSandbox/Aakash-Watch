"""Aakash Watch — Edge-AI Earth Observation API (FastAPI, port 8006)."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data import REGION, STORE

app = FastAPI(
    title="Aakash Watch — Edge-AI Earth Observation API",
    version="1.0.0",
    description="Fused flood / crop-stress / urban-heat alerts with uncertainty, "
    "explainability and a human-in-the-loop validation loop.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3006", "http://127.0.0.1:3006"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "aakash-watch-api",
        "port": 8006,
        "region": REGION["name"],
        "time": datetime.now().isoformat(timespec="seconds"),
    }


@app.get("/api/dashboard")
def dashboard() -> dict:
    s = STORE.summary()
    s["generated_at"] = datetime.now().isoformat(timespec="seconds")
    return s


@app.get("/api/wards")
def wards() -> dict:
    return STORE.geojson


@app.get("/api/alerts")
def alerts(domain: Optional[str] = None, severity: Optional[str] = None) -> dict:
    items = STORE.alerts
    if domain:
        items = [a for a in items if a["domain"] == domain]
    if severity:
        items = [a for a in items if a["severity"] == severity]
    return {"count": len(items), "alerts": items}


class ValidationIn(BaseModel):
    action: Literal["confirmed", "false_positive", "partial"]
    comment: Optional[str] = None


@app.get("/api/alerts/{alert_id}")
def alert_detail(alert_id: str) -> dict:
    a = STORE.get_alert(alert_id)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    return a


@app.post("/api/alerts/{alert_id}/validate")
def validate(alert_id: str, body: ValidationIn) -> dict:
    a = STORE.get_alert(alert_id)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a["status"] = body.action
    a["feedback"] = {"action": body.action, "comment": body.comment or "", "at": datetime.now().isoformat(timespec="seconds")}
    a["validation_count"] = a.get("validation_count", 0) + 1
    return a


@app.get("/api/alerts/{alert_id}/sms")
def alert_sms(alert_id: str) -> dict:
    a = STORE.get_alert(alert_id)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "id": a["id"],
        "ward_name": a["ward_name"],
        "domain": a["domain"],
        "severity": a["severity"],
        "sms": a["sms"],
        "bytes": len(a["sms"].encode("utf-8")),
    }


@app.get("/api/timeline")
def timeline() -> dict:
    base = datetime.now()
    entries = [
        ("t0", "Surge onset — 120mm rainfall in 12h", base - timedelta(hours=30)),
        ("t1", "River gauge +1.1m above normal", base - timedelta(hours=26)),
        ("t2", "Sentinel-1 pass — SAR Δ detected in 6 coastal wards", base - timedelta(hours=22)),
        ("t3", "IoT water level sensors exceed 3m in Bali Sahi", base - timedelta(hours=18)),
        ("t4", "Fusion engine issues first flood alerts", base - timedelta(hours=16)),
        ("t5", "Landsat-9 pass — urban heat index peaks in Puri town", base - timedelta(hours=11)),
        ("t6", "Crop stress alerts raised for 6 agricultural wards", base - timedelta(hours=7)),
        ("t7", "Authority validation open — 3 ward alerts confirmed", base - timedelta(hours=2)),
    ]
    return {"count": len(entries), "entries": [
        {"id": e[0], "label": e[1], "at": e[2].isoformat(timespec="seconds")} for e in entries
    ]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8006)
