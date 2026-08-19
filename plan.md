# Edge-AI Earth Observation Platform — Complete Project Plan

## 1. Scope the MVP First (Critical for Hackathon Success)

Don't try to build a full production system. Define a **demo-able slice**:

- **1 pilot region** (e.g., a district with known flood/heat/crop issues — Odisha coastal belt works well given ITER's location and monsoon relevance)
- **3 alert types**: Flood extent, Crop stress, Urban heat — each with a working pipeline, even if simplified
- **1 fusion + alert engine** that outputs ward-level severity + confidence
- **1 dashboard** with map, explainability panel, and a "validate/correct" button
- **1 low-bandwidth output** (SMS-style text alert or compressed JSON)

Judges reward **end-to-end working flow** over a perfect single model.

---

## 2. Team Role Division (assume 5-6 members)

| Role | Responsibility |
|---|---|
| Geo-data/ML Engineer 1 | Satellite data pipeline (GEE, Sentinel-1/2) + Flood model |
| Geo-data/ML Engineer 2 | Crop stress (NDVI) + Heat stress (LST) models |
| Fusion/Backend Engineer | Data fusion, uncertainty quantification, API (FastAPI) |
| Frontend/Dashboard Dev | React/Leaflet map dashboard + validation UI |
| Edge/Deployment Engineer | Model compression (TFLite/ONNX), low-bandwidth payloads |
| PM/Presenter | Docs, pitch deck, demo script, problem-solution mapping |

---

## 3. System Architecture (high-level)

```
[Satellite Data] --\
[Weather API]  ------> [Ingestion Layer] --> [Feature Extraction per domain]
[IoT/Sensor sim] --/                                |
                                                      v
                                    [Domain Models: Flood | Crop | Heat]
                                                      |
                                     [Fusion Engine + Uncertainty Quantifier]
                                                      |
                                       [Explainability Layer (SHAP/Grad-CAM)]
                                                      |
                                    [Alert Generator: severity, GeoJSON, text]
                                                      |
                              -----------------------------------------
                              |                                       |
                  [Low-bandwidth Mobile/SMS output]      [Authority Dashboard]
                                                                     |
                                                        [Field Validation Feedback]
                                                                     |
                                                        [Retraining/Active Learning Loop]
```

---

## 4. Data Sources (all free/accessible — use these)

- **Flood**: Sentinel-1 SAR (via Google Earth Engine) — works through clouds, ideal for monsoon flood detection using backscatter change detection.
- **Crop**: Sentinel-2 optical → NDVI/NDRE time series, compared against historical baseline for crop calendar stage.
- **Heat**: Landsat 8/9 thermal band or MODIS LST product → Land Surface Temperature, urban heat island computation.
- **Weather**: OpenWeatherMap API, IMD data, NASA POWER (rainfall, temperature, humidity).
- **IoT**: Since real deployment isn't feasible in hackathon time, **simulate** ward-level sensors (soil moisture, water level, temperature) using synthetic data generators calibrated to realistic ranges — clearly label as "simulated IoT for demo."
- **Ground truth**: Bhuvan (ISRO) flood layers, NRSC data, or manually labeled sample AOIs for validation.

👉 **Tool tip**: Use **Google Earth Engine Python API** — it gives you Sentinel-1/2, Landsat, MODIS all preprocessed, and lets you compute NDVI/LST/SAR-change with a few lines of code. Massive time-saver in hackathon settings.

---

## 5. Model Development (per domain)

### A. Flood Extent
- Approach: SAR backscatter change detection (pre-flood vs during-flood image) using threshold or a simple U-Net segmentation model.
- Output: Flooded pixel mask → aggregate to ward polygon → % area flooded.
- Quick win: Otsu thresholding on VV/VH band difference is fast and surprisingly effective; deep learning (U-Net) is a bonus if time permits.

### B. Crop Stress
- Approach: NDVI/NDRE anomaly detection — compare current NDVI to historical mean for same growth stage (z-score anomaly).
- Optionally add a lightweight classifier (Random Forest/XGBoost) using NDVI, soil moisture, rainfall deficit as features → stress severity class.

### C. Urban Heat Stress
- Approach: Compute LST, derive Urban Heat Island Index (LST_ward − LST_regional_mean), combine with weather station temperature/humidity for heat index (like heat stress via Wet Bulb Globe Temp approximation).

### Fusion Layer
- Aggregate all three domain outputs + weather + IoT at **ward/village polygon level**.
- Use a simple **weighted ensemble or Gradient Boosting model** (XGBoost/LightGBM) that takes multi-modal features and outputs: `alert_type, severity_score, confidence`.

---

## 6. Uncertainty Quantification (this is a key differentiator — don't skip)

Pick 1-2 lightweight approaches given time constraints:
- **Ensemble variance**: Run 3-5 model variants (different thresholds/seeds), use spread as uncertainty.
- **Monte Carlo Dropout**: If using a neural net, keep dropout active at inference, run N passes, compute variance.
- **Conformal prediction**: Wrap final severity score with calibrated confidence intervals (easy to implement with `mapie` library in Python).
- Present as: **"Flood probability: 78% ± 12%"** rather than a hard yes/no.

---

## 7. Explainability Layer

- **For image models**: Grad-CAM / saliency maps highlighting which pixels triggered flood/heat detection.
- **For fusion model**: SHAP values showing feature contribution (e.g., "rainfall 45%, SAR backscatter drop 35%, IoT water level 20%").
- **Natural language template generation**:
  > "Flood alert for Ward 12 (Confidence: 82%). Evidence: 65mm rainfall in 24h, 30% drop in SAR backscatter indicating water presence, nearby river gauge +1.2m above normal."
- This turns black-box output into **auditable, trustworthy alerts** — directly answers the "explain evidence" requirement in the PS.

---

## 8. Low-Bandwidth / Edge Optimization

- Convert model outputs to **GeoJSON with simplified polygons** (not raw rasters) — drastically reduces payload size.
- Compress imagery previews as WebP/low-res thumbnails, only fetch full res on demand.
- Model compression: convert final classifier to **TensorFlow Lite / ONNX** for edge inference on low-power devices.
- Alert delivery: design a **fallback text/SMS format** for 2G/no-data areas:
  > "FLOOD ALERT: Ward 12, HIGH severity (82% confidence). Avoid low-lying areas. Reply Y to confirm/N to dispute."
- Consider a **Progressive Web App (PWA)** with offline caching for the dashboard so field workers can view last-synced alerts without connectivity.

---

## 9. Authority Dashboard + Validation Loop

- **Map view** (Leaflet/Mapbox) with ward polygons color-coded by severity.
- Click a ward → see alert details, confidence, explanation, satellite/weather evidence snapshots.
- **Validation buttons**: Confirm / False Positive / Partially Correct + optional photo/comment upload.
- Store feedback in DB (PostgreSQL/PostGIS or Firebase for speed) → this becomes your **active learning dataset** for retraining — mention this explicitly in your pitch as the "human-in-the-loop" component the PS asks for.

---

## 10. Suggested Tech Stack

| Layer | Tool |
|---|---|
| Satellite data | Google Earth Engine Python API |
| Weather | OpenWeatherMap / NASA POWER API |
| ML | PyTorch/TensorFlow, scikit-learn, XGBoost, MAPIE (conformal prediction) |
| Explainability | SHAP, Grad-CAM |
| Backend | FastAPI |
| DB | PostgreSQL + PostGIS (or Firebase for speed) |
| Frontend | React + Leaflet.js / Mapbox GL |
| Edge | TensorFlow Lite / ONNX Runtime |
| Alerts | Twilio (SMS simulation) |
| Deployment | Docker + (Render/Vercel/local for demo) |

---

## 11. Suggested Timeline (for a ~36-48 hr hackathon)

| Time | Task |
|---|---|
| 0-4h | Finalize architecture, split roles, set up repo, pick pilot region, gather sample data via GEE |
| 4-12h | Build individual domain pipelines (flood/crop/heat) — get raw outputs working |
| 12-20h | Build fusion engine + uncertainty quantification |
| 20-26h | Add explainability layer (SHAP/Grad-CAM + text generation) |
| 26-32h | Build dashboard (map + alert cards + validation UI) |
| 32-38h | Low-bandwidth output formatting + edge model conversion |
| 38-42h | Integration testing, fix bugs, seed demo data |
| 42-48h | Prepare pitch deck, rehearse demo, record backup video |

---

## 12. Pitch/Demo Tips

- Open with the **problem's human cost** (flood damage, crop loss, heat deaths) tied to real stats for your chosen region.
- Live demo flow: show a live/simulated flood event → alert generated → explanation shown → authority validates it on dashboard → SMS sent to a phone (even simulated).
- Highlight your **3 differentiators explicitly** since these are exactly what the PS demands:
  1. Uncertainty quantification (not just binary alerts)
  2. Explainability (evidence-backed, auditable)
  3. Human-in-the-loop correction (trust + continuous improvement)
- Have a **backup recorded video** in case live demo/internet fails (very common issue with GEE/API-dependent demos).
- Prepare a slide on **scalability**: "Same pipeline can extend to any ward in India using existing free satellite/weather data — no new hardware required, edge deployment enables offline rural use."

---

Want me to help you next with: (a) a ready-to-use Google Earth Engine script for flood/NDVI/LST extraction, (b) the fusion model + uncertainty code, or (c) the pitch deck structure/slide content?