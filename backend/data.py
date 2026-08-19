"""Deterministic seeded data for the Aakash Watch demo.

Pilot region: Puri district, Odisha — monsoon surge scenario.
All data is simulated (clearly labelled in the UI) but structurally realistic:
ward polygons, fusion scores, ensemble confidence + uncertainty, SHAP-style
feature contributions, NL explanations, IoT sensor readings, SMS-lite payloads.
"""
from __future__ import annotations

import math
import random
from datetime import datetime, timedelta
from typing import Any

REGION = {
    "name": "Puri District, Odisha",
    "state": "Odisha",
    "center": [85.8312, 19.8135],
    "event": "Monsoon Surge · Surge Phase 2",
    "weather": {
        "temp_c": 31.4,
        "humidity": 88,
        "rainfall_24h_mm": 64.8,
        "wind_kph": 21,
        "pressure_hpa": 993,
    },
}

SEED = 42

# --------------------------------------------------------------------------
# Ward catalogue: (name, type, base_risk 0..1, population)
# type: coastal (flood) | agricultural (crop) | urban (heat)
# --------------------------------------------------------------------------
WARDS = [
    ("Bali Sahi", "coastal", 0.92, 12400),
    ("Chandanpur", "coastal", 0.88, 9800),
    ("Vipradham", "coastal", 0.85, 8600),
    ("Nagar Basti", "coastal", 0.80, 15200),
    ("Sana Danda", "coastal", 0.77, 7100),
    ("Alisahi", "coastal", 0.71, 9200),
    ("Gopinathpur", "coastal", 0.62, 8400),
    ("Sipasarubali", "coastal", 0.55, 6600),
    ("Sakhigopal", "agricultural", 0.74, 11500),
    ("Gundicha", "agricultural", 0.68, 8700),
    ("Nischintakoili", "agricultural", 0.61, 14300),
    ("Brahmagiri", "agricultural", 0.58, 12900),
    ("Kanas", "agricultural", 0.52, 16100),
    ("Delanga", "agricultural", 0.46, 10700),
    ("Balanga", "agricultural", 0.40, 8800),
    ("Kusubenti", "agricultural", 0.33, 6400),
    ("Badasankha", "urban", 0.78, 20300),
    ("Harachandi", "urban", 0.74, 15800),
    ("Balagandi", "urban", 0.69, 13600),
    ("Satyasahi", "urban", 0.64, 11900),
    ("Baseli Sahi", "urban", 0.58, 10400),
    ("Dandamukundapur", "urban", 0.51, 8900),
    ("Ahiriyo Sahi", "urban", 0.44, 7700),
    ("Math Sahi", "urban", 0.36, 6900),
]

DOMAIN_ICONS = {"flood": "waves", "crop": "sprout", "heat": "sun"}


def _jitter(rng: random.Random, v: float, span: float) -> float:
    return v + rng.uniform(-span, span)


def _build_polygon(rng: random.Random, cx: float, cy: float, radius: float) -> list[list[float]]:
    """Irregular, deterministic ward polygon (lng, lat) around a center."""
    n = rng.randint(11, 15)
    base = rng.uniform(0, math.tau)
    pts: list[list[float]] = []
    for i in range(n):
        ang = base + i * math.tau / n
        r = radius * rng.uniform(0.55, 1.0)
        x = cx + math.cos(ang) * r * 0.00125
        y = cy + math.sin(ang) * r * 0.00115
        pts.append([round(x, 5), round(y, 5)])
    return pts


def _smooth(points: list[list[float]]) -> list[list[float]]:
    """Chaikin corner cutting — gives organic ward boundaries."""
    for _ in range(2):
        out: list[list[float]] = []
        for i in range(len(points)):
            p0, p1 = points[i], points[(i + 1) % len(points)]
            out.append([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25])
            out.append([p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75])
        points = out
    return [[round(x, 5), round(y, 5)] for x, y in points]


def _ward_geometry(rng: random.Random, idx: int) -> tuple[float, float, list[list[float]]]:
    cx = REGION["center"][0] + _jitter(rng, 0, 0.022)
    cy = REGION["center"][1] + _jitter(rng, 0, 0.016)
    radius = rng.uniform(0.55, 0.95)
    ring = _smooth(_build_polygon(rng, cx, cy, radius))
    return cx, cy, ring


class DataStore:
    def __init__(self) -> None:
        self.rng = random.Random(SEED)
        self.now = datetime.now()
        self.wards: list[dict[str, Any]] = []
        self.geojson: dict[str, Any] = {"type": "FeatureCollection", "features": []}
        self.alerts: list[dict[str, Any]] = []
        self._build()

    # ------------------------------------------------------------------ build
    def _build(self) -> None:
        for i, (name, wtype, risk, pop) in enumerate(WARDS, start=1):
            cx, cy, ring = _ward_geometry(self.rng, i)
            ward = {
                "id": f"w_{i:02d}",
                "name": name,
                "type": wtype,
                "population": pop,
                "risk": round(risk, 2),
            }
            self.wards.append(ward)
            self.geojson["features"].append(
                {
                    "type": "Feature",
                    "properties": {**ward, "alert_count": 0, "severity": "none"},
                    "geometry": {"type": "Polygon", "coordinates": [ring]},
                }
            )
        self._assign_signals()
        self._emit_alerts()
        self._sync_geojson()

    def _assign_signals(self) -> None:
        """Per-domain latent signals per ward (flood / crop / heat)."""
        for w in self.wards:
            r = w["risk"]
            rng = self.rng
            base = r * rng.uniform(0.55, 0.98) + rng.uniform(0.0, 0.18)
            if w["type"] == "coastal":
                w["signals"] = {
                    "flood": min(1.0, base + rng.uniform(-0.04, 0.04)),
                    "crop": rng.uniform(0.05, 0.25),
                    "heat": rng.uniform(0.1, 0.35),
                }
            elif w["type"] == "agricultural":
                w["signals"] = {
                    "flood": rng.uniform(0.08, 0.3),
                    "crop": min(1.0, base + rng.uniform(-0.04, 0.04)),
                    "heat": rng.uniform(0.2, 0.45),
                }
            else:
                w["signals"] = {
                    "flood": rng.uniform(0.05, 0.2),
                    "crop": rng.uniform(0.1, 0.3),
                    "heat": min(1.0, base + rng.uniform(-0.04, 0.04)),
                }

    # ------------------------------------------------------------- alert emit
    def _emit_alerts(self) -> None:
        for w in self.wards:
            for domain in ("flood", "crop", "heat"):
                sig = w["signals"][domain]
                if sig < 0.32:
                    continue
                alert = self._make_alert(w, domain, sig)
                self.alerts.append(alert)
        self.alerts.sort(key=lambda a: a["issued_at"], reverse=True)

    def _make_alert(self, ward: dict[str, Any], domain: str, sig: float) -> dict[str, Any]:
        alert_id = f"alt_{self._alert_seq()}"
        severity, score = self._severity_of(sig)
        conf, unc = self._uncertainty(severity)
        rng = self.rng
        issued = self.now - timedelta(
            hours=rng.uniform(1.5, 14), minutes=rng.uniform(0, 55)
        )
        sensors = self._sensors(ward, domain)
        sat = self._satellite(ward, domain)
        evidence = self._evidence(domain)
        explanation = self._explain(domain, evidence, ward, sat)
        sms = self._sms(domain, ward, severity, conf)
        return {
            "id": alert_id,
            "ward_id": ward["id"],
            "ward_name": ward["name"],
            "ward_type": ward["type"],
            "population": ward["population"],
            "domain": domain,
            "severity": severity,
            "score": round(score, 2),
            "confidence": conf,
            "uncertainty": unc,
            "status": "pending",
            "feedback": None,
            "issued_at": issued.isoformat(timespec="seconds"),
            "sensors": sensors,
            "satellite": sat,
            "evidence": evidence,
            "explanation": explanation,
            "sms": sms,
        }

    _seq = 0

    def _alert_seq(self) -> int:
        DataStore._seq += 1
        return DataStore._seq

    # ------------------------------------------------------------ estimators
    def _severity_of(self, sig: float) -> tuple[str, float]:
        if sig >= 0.80:
            return "critical", sig
        if sig >= 0.60:
            return "high", sig
        if sig >= 0.42:
            return "moderate", sig
        return "info", sig

    def _uncertainty(self, severity: str) -> tuple[int, int]:
        rng = self.rng
        if severity == "critical":
            conf, spread = rng.randint(78, 93), rng.randint(5, 9)
        elif severity == "high":
            conf, spread = rng.randint(70, 86), rng.randint(7, 12)
        elif severity == "moderate":
            conf, spread = rng.randint(58, 74), rng.randint(10, 15)
        else:
            conf, spread = rng.randint(48, 62), rng.randint(12, 18)
        return conf, spread

    # -------------------------------------------------------------- evidence
    def _evidence(self, domain: str) -> list[dict[str, Any]]:
        rng = self.rng
        specs = {
            "flood": [
                ("Rainfall 24h", "mm", 40, 85),
                ("SAR backscatter Δ", "dB", -65, -30),
                ("River gauge rise", "m", 0.8, 1.9),
                ("IoT water level", "cm", 18, 54),
            ],
            "crop": [
                ("NDVI anomaly (z)", "σ", -3.2, -1.4),
                ("Soil moisture deficit", "%", 8, 28),
                ("Rainfall deficit", "mm", 12, 46),
                ("LST anomaly", "°C", 1.5, 4.2),
            ],
            "heat": [
                ("LST anomaly", "°C", 2.5, 5.6),
                ("Heat index (WBGT)", "°C", 1.8, 4.1),
                ("UHI index", "°C", 1.2, 3.4),
                ("Humidity", "%", 62, 91),
            ],
        }
        out: list[dict[str, Any]] = []
        weights = [rng.uniform(0.4, 1.0) for _ in specs[domain]]
        wsum = sum(weights)
        for spec, w in zip(specs[domain], weights):
            lo, hi = spec[2], spec[3]
            val = rng.uniform(lo, hi)
            contrib = round(100 * w / wsum)
            out.append(
                {
                    "feature": spec[0],
                    "value": round(val, 1),
                    "unit": spec[1],
                    "contribution": contrib,
                    "signed": "negative" if val < 0 else "positive",
                }
            )
        out[-1]["contribution"] += 100 - sum(e["contribution"] for e in out)
        return out

    # ----------------------------------------------------------- explanation
    def _explain(
        self, domain: str, evidence: list[dict[str, Any]], ward: dict[str, Any], sat: dict[str, Any]
    ) -> str:
        e0, e1, e2 = evidence[0], evidence[1], evidence[2]
        if domain == "flood":
            return (
                f"{e0['value']}{e0['unit']} rainfall in 24h (largest driver, "
                f"{e0['contribution']}%), {e1['value']}{e1['unit']} SAR backscatter drop "
                f"confirming standing water, and river gauge {e2['value']}m above normal "
                f"for {ward['name']}. Sentinel-1 pass at {sat['pass']} confirms "
                f"{sat['metrics'][0]['label']}."
            )
        if domain == "crop":
            return (
                f"NDVI is {e0['value']} standard deviations below the 5-yr growth-stage "
                f"baseline (contribution {e0['contribution']}%), with soil moisture "
                f"{e1['value']}% below field capacity and a {e2['value']}mm rainfall "
                f"deficit this week — paddy in {ward['name']} is under moisture stress."
            )
        return (
            f"Land surface temperature is {e0['value']}°C above the regional mean "
            f"({e0['contribution']}% of signal), pushing heat index to "
            f"{e1['value']}°C above comfort — urban canopy effect is strongest in "
            f"{ward['name']} during afternoon peaks."
        )

    def _sms(self, domain: str, ward: dict[str, Any], severity: str, conf: int) -> str:
        tags = {
            "flood": ("FLOOD ALERT", "Avoid low-lying areas. Move valuables to higher ground."),
            "crop": ("CROP STRESS", "Consider irrigation. Consult Kisan call centre 1800-180-1551."),
            "heat": ("HEAT ALERT", "Limit outdoor exposure 12-4 PM. Keep hydrated."),
        }
        tag, advice = tags[domain]
        sev = severity.upper()
        return (
            f"{tag} | {ward['name']} ward, Puri | {sev} severity | "
            f"{conf}% confidence (+/- est. spread) | {advice} "
            f"Reply Y to confirm / N to dispute."
        )

    # --------------------------------------------------------------- sensors
    def _sensors(self, ward: dict[str, Any], domain: str) -> list[dict[str, Any]]:
        rng = self.rng
        specs = {
            "coastal": [
                ("water_level", "Water level", "m", 2.6, 4.8),
                ("soil_moisture", "Soil moisture", "%", 34, 78),
                ("air_temp", "Air temp", "°C", 27, 34),
            ],
            "agricultural": [
                ("soil_moisture", "Soil moisture", "%", 18, 52),
                ("water_level", "Water level", "m", 1.2, 2.1),
                ("air_temp", "Air temp", "°C", 28, 35),
            ],
            "urban": [
                ("air_temp", "Air temp", "°C", 30, 38),
                ("humidity", "Humidity", "%", 55, 85),
                ("water_level", "Water level", "m", 0.9, 1.4),
            ],
        }
        out = []
        for key, label, unit, lo, hi in specs[ward["type"]]:
            val = rng.uniform(lo, hi)
            out.append(
                {
                    "key": key,
                    "label": label,
                    "value": round(val, 1),
                    "unit": unit,
                    "trend": rng.choice(["up", "down", "steady"]),
                    "simulated": True,
                }
            )
        return out

    # ------------------------------------------------------------- satellite
    def _satellite(self, ward: dict[str, Any], domain: str) -> dict[str, Any]:
        rng = self.rng
        srcs = {
            "flood": ("Sentinel-1 SAR (VV/VH)", "09:14 IST"),
            "crop": ("Sentinel-2 MSI (NDVI)", "10:02 IST"),
            "heat": ("Landsat-9 TIRS (LST)", "11:26 IST"),
        }
        source, passtime = srcs[domain]
        metrics = [
            {"label": "Δ backscatter" if domain == "flood" else "Δ index", "value": round(rng.uniform(-38, -12), 1) if domain == "flood" else round(rng.uniform(-0.4, -0.15), 2), "unit": "dB" if domain == "flood" else "z"},
            {"label": "Cloud cover", "value": rng.randint(8, 42), "unit": "%"},
        ]
        return {"source": source, "pass": passtime, "metrics": metrics}

    # ---------------------------------------------------------------- sync
    def _sync_geojson(self) -> None:
        by_ward: dict[str, list[dict]] = {}
        for a in self.alerts:
            by_ward.setdefault(a["ward_id"], []).append(a)
        for f in self.geojson["features"]:
            pid = f["properties"]["id"]
            al = by_ward.get(pid, [])
            f["properties"]["alert_count"] = len(al)
            f["properties"]["severity"] = (
                max(al, key=lambda a: a["score"])["severity"] if al else "none"
            )
            f["properties"]["domains"] = sorted({a["domain"] for a in al})

    # -------------------------------------------------------------- queries
    def get_ward(self, ward_id: str) -> dict | None:
        return next((w for w in self.wards if w["id"] == ward_id), None)

    def get_alert(self, alert_id: str) -> dict | None:
        return next((a for a in self.alerts if a["id"] == alert_id), None)

    def summary(self) -> dict[str, Any]:
        active = [a for a in self.alerts if a["severity"] in ("high", "critical")]
        confs = [a["confidence"] for a in self.alerts]
        by_domain: dict[str, int] = {}
        by_severity: dict[str, int] = {}
        for a in self.alerts:
            by_domain[a["domain"]] = by_domain.get(a["domain"], 0) + 1
            by_severity[a["severity"]] = by_severity.get(a["severity"], 0) + 1
        return {
            "active_alerts": len(active),
            "total_alerts": len(self.alerts),
            "wards_watched": len({a["ward_id"] for a in self.alerts}),
            "total_wards": len(self.wards),
            "sensors_online": len(self.wards) * 3,
            "avg_confidence": round(sum(confs) / len(confs)) if confs else 0,
            "by_domain": by_domain,
            "by_severity": by_severity,
            "event": REGION["event"],
            "weather": REGION["weather"],
            "region": REGION["name"],
            "verified": sum(1 for a in self.alerts if a["status"] == "confirmed"),
            "disputed": sum(1 for a in self.alerts if a["status"] == "false_positive"),
        }


STORE = DataStore()
