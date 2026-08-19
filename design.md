# Edge-AI Earth Observation — UI/UX Design Specification

> Product: "Aakash Watch" — Edge-AI Earth Observation Platform
> Goal: A clean, modern, judge-friendly mission-control dashboard for hyperlocal flood / crop-stress / urban-heat alerts with uncertainty quantification, evidence explainability, and a human-in-the-loop validation loop.

---

## 1. Design Principles

1. **Calm mission control** — operators stare at this for hours. Dark, low-glare canvas; information density without noise.
2. **Severity first** — every element encodes risk using one consistent 5-level color ramp. No user should need to read text to know a ward is in danger.
3. **Evidence over assertion** — every alert must show *why* (feature contributions, satellite/weather/sensor evidence) and *how sure we are* (uncertainty band), answering the problem statement's explainability requirement.
4. **One-click human feedback** — the validate/correct loop is always reachable from an open alert (Confirm / False Positive / Partial).
5. **Low-bandwidth mindset** — the SMS-style payload preview is a first-class screen, proving the edge/lite-output requirement.

---

## 2. Aesthetic Direction

- **Theme:** Dark "orbit" palette — deep space-navy surfaces with a cyan/teal signal accent. Evokes satellite imagery at night, distinct from generic light admin dashboards.
- **Mood:** Precision, gravity, live telemetry.
- **Texture:** Subtle 1px borders (`hsla` white at ~6%), very soft shadows, 8–14px radii, minimal gradients (one radial glow behind the map).
- **Motion:** 150–250ms ease-out transitions only; no marquee/parallax effects (demo-safety).

---

## 3. Design Tokens

### 3.1 Color

| Token | Value | Usage |
|---|---|---|
| `--bg-0` | `#0B1120` | Page background (outer) |
| `--bg-1` | `#0F172A` | Panel background (cards) |
| `--bg-2` | `#16203A` | Elevated surfaces / drawer |
| `--bg-3` | `#1D2A47` | Hover, inputs |
| `--line` | `rgba(148,163,184,0.14)` | Borders, dividers |
| `--ink-hi` | `#F1F5F9` | Primary text |
| `--ink-mid` | `#94A3B8` | Secondary text |
| `--ink-lo` | `#64748B` | Muted text, labels |
| `--accent` | `#22D3EE` | Primary interactive (cyan) |
| `--accent-2` | `#34D399` | Success / confirmed |
| `--accent-dim` | `rgba(34,211,238,0.12)` | Accent fills |

### 3.2 Severity ramp (single source of truth)

| Level | Token | Hex | Fill (map) | Meaning |
|---|---|---|---|---|
| `info` | `--sev-info` | `#38BDF8` | 12% alpha + 90% stroke | Watch / advisory |
| `moderate` | `--sev-moderate` | `#FBBF24` | 14% alpha + 90% stroke | Elevated |
| `high` | `--sev-high` | `#FB923C` | 16% alpha + 90% stroke | High risk |
| `critical` | `--sev-critical` | `#F87171` | 18% alpha + 90% stroke | Critical |
| `none` | `--sev-none` | `#334155` | 6% alpha + 40% stroke | No alert |

Confidence chip: `#22D3EE` accent when ≥80%, `#FBBF24` 60–79%, `#F87171` <60%.

### 3.3 Typography

- Family: **Inter** (`-apple-system` fallback), mono: **JetBrains Mono** for numbers/SMS payload.
- Scale: 11 / 12 / 13 / 14 / 16 / 20 / 26 px (labels → page titles).
- Weights: 500 (labels), 600 (values), 700 (page titles). Never 800+.

### 3.4 Spacing / Radius / Elevation

- Spacing scale: 4, 8, 12, 16, 20, 24, 32 px.
- Radius: `6px` chips/inputs, `10px` cards, `14px` drawer/dialogs.
- Shadow: `0 8px 24px rgba(0,0,0,0.45)` for floating panels only.

---

## 4. Information Architecture

```
┌─────────────────────────────── App Shell ───────────────────────────────┐
│ Sidebar (240px)        Top Bar (56px): region, live-clock, sensors        │
│  ▸ Logo "Aakash Watch"   search, sync status                              │
│  ▸ Overview              ┌───────────────────────────────────────────┐   │
│  ▸ Alerts (badge: n)     │ Stat Cards ×4                             │   │
│  ▸ Region Coverage       ├───────────────────────────────────────────┤   │
│  ▸ SMS Lite Output       │                                           │   │
│  ▸ Data Sources          │        Map (Leaflet, dark tiles)          │   │
│                         │  ward polygons → severity fill            │   │
│  Legend (severity ramp) │  click ward → highlight + open drawer     │   │
│  Footer: API status     │  storm layer badge                        │   │
│                          └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
   Right rail (360px, collapsible):
     [Alert Feed] — newest first, domain-tagged, severity strip
     [Detail Drawer on select] — replaces feed
       1. Ward header + severity + confidence ± uncertainty
       2. Evidence panel (per-domain feature bars, SHAP-style)
       3. Explanation card (NL evidence sentence)
       4. Sensor strip (IoT live values, simulated label)
       5. SMS Lite preview (mono, phone-style)
       6. Validate actions: ✓ Confirm / ! False Positive / ≈ Partial + comment
```

### 4.1 Routes (SPA states, no router lib needed)

| State | Purpose |
|---|---|
| Overview | Map + stat cards + feed (default) |
| Alerts | Same map, feed filtered to active alerts |
| Region | Coverage stats: ward count, area, sensor health |
| SMS Lite | Simulated phone view of low-bandwidth payloads |
| Data Sources | Cards for Sentinel-1/2, Landsat-8/9, GEE, Weather, IoT sim |

---

## 5. Component Specs

### 5.1 Sidebar
- 240px fixed, `bg-1`, right border `--line`.
- Nav items: 14px, 500 weight, `--ink-mid`; active = cyan left-bar (3px) + `accent-dim` fill + `--ink-hi`.
- Alert badge: 16px pill, `--sev-critical` background.
- Bottom: system status dot (green pulse = live) + backend port label `:8006`.

### 5.2 Stat Cards (×4)
- Label (11px caps, `--ink-lo`) + value (26px, 600) + delta chip (12px).
- Cards: `Overview — Active alerts`, `Wards under watch`, `IoT sensors online`, `Avg. confidence`.
- Click "Active alerts" card → filters map/feed to alerting wards.

### 5.3 Map
- Leaflet with CARTO dark tiles (`dark_all`), no default zoom controls styling override needed but styled container.
- Ward polygons: fill = severity (alpha per ramp), stroke = severity @90%, weight 1.2; hover → weight 2 + brighter fill; selected → neon stroke (`--accent`, weight 2.5) + glow.
- Ward label popup: name + top domain + severity chip (styled custom div, no default tooltip chrome).
- Corner overlay: legend (severity ramp), storm/event chip ("Monsoon Surge · 12h"), simulated data watermark (12px, bottom-right).

### 5.4 Alert Feed
- Stacked rows (10px radius): left severity strip (4px), domain icon, ward name (13px 600), confidence chip, time-ago (11px `--ink-lo`), chevron.
- Row states: default (`bg-2`), hover (`bg-3`), selected (accent 2px ring).
- Domain tags: Flood `#38BDF8`, Crop `#A3E635`, Heat `#FB923C` (icons: waves / sprout / sun).

### 5.5 Detail Drawer
- Header: ward name + type chip, severity badge (pill, colored), close button.
- Confidence block: big number + horizontal uncertainty band — a track with filled section and ± band (muted) labeled `78% ± 12%`.
- **Evidence panel**: for each contributing domain, a labeled horizontal bar of feature contributions (SHAP-style, percentages, colored by sign) with mono values — e.g. `Rainfall 24h 45%`, `SAR backscatter Δ 35%`, `IoT water level 20%`.
- **Explanation card**: sentence with emphasized evidence values (accent text), generated by NL template on backend.
- **IoT sensors strip**: 3 mini-cards (water level, soil moisture, air temp) with live value + trend arrow + `SIMULATED` tag.
- **Satellite snapshot card**: "Last pass: Sentinel-2 · 09:14 IST" + NDVI/SAR delta mono values.
- **Validation section**: three buttons — Confirm (green), False Positive (red ghost), Partially correct (amber ghost) + optional comment input + Submit. On submit → success toast, stat cards update, row gets a status chip (`Verified ✓` / `Disputed`).

### 5.6 SMS Lite Screen
- Phone frame (dark, 14px radius, notch bar) with mono text, `FLOOD ALERT` header, ward, severity, confidence, response hint `Reply Y to confirm / N to dispute`.
- Side list of other lite payloads; download/export button (JSON).

### 5.7 Toasts
- Bottom-right, `bg-2`, left accent border by kind (success `--accent-2`, error `--sev-critical`), 12px 500 weight. Auto-dismiss 3.5s.

---

## 6. Data → UI Mapping

| Backend field | UI treatment |
|---|---|
| `ward.severity` | Fill color (5.2), badge, strip |
| `alert.confidence`, `alert.uncertainty` | `confidence ± uncertainty` band (5.5) |
| `alert.evidence[]` | Contribution bars with % and sign color |
| `alert.explanation` | NL sentence, evidence values accented |
| `alert.sms` | Mono phone payload (5.6) |
| `alert.status` | Chip: pending (muted) / confirmed (green ✓) / disputed (red) |
| `sensor.value` | Mini-card value + ± trend |

---

## 7. Interaction Spec

1. Hover ward → outline brighten. Click → polygon selected (neon), right rail switches from feed → detail drawer for that ward.
2. Drawer "Back to feed" returns; ESC closes drawer.
3. Validate button → POST to `/api/alerts/{id}/validate` → toast + status chip + stat card recalculation.
4. Nav "SMS Lite Output" → full screen phone view (map hidden).
5. Refresh: top-bar sync button re-fetches all (pull-to-refresh pattern).

---

## 8. States

- **Loading:** skeleton cards + map fade-in (no spinners unless >800ms).
- **Empty:** no alerts → map all `none` fill + centered "All clear" chip.
- **Error:** connection banner (top, `--sev-critical` bg) with retry button; app shell stays usable.

---

## 9. Responsive / Demo Notes

- Desktop-first (judges view on laptop). Below 1100px: sidebar collapses to icon rail; below 860px: right rail overlays the map (absolute).
- Demo-safe: no external font downloads at runtime (Inter via system fallback), map tiles cached, all backend data deterministic/seeded so the demo is repeatable.

---

## 10. Tech Notes

- Frontend: Vite + React 19, Leaflet (vanilla, wrapped in `useRef`) — avoids react-leaflet version drift.
- Ports: UI **3006**, API **8006**; Vite dev proxy `/api` → `localhost:8006`.
- Icons: `lucide-react`. Charts: hand-rolled SVG (bars/sparklines), no chart lib.
- Backend: FastAPI, seeded deterministic data (Puri district, Odisha — monsoon surge scenario), endpoints listed in section 7.
