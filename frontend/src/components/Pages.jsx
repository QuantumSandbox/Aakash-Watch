import { useMemo, useState } from 'react'
import {
  Bell, RadioTower, MapPin, Satellite, CloudRain,
  Leaf, Sun, Database, Cpu, Smartphone, Waves, Sprout, Timer,
} from 'lucide-react'
import MapView from './MapView.jsx'
import AlertFeed from './AlertFeed.jsx'
import DetailDrawer from './DetailDrawer.jsx'
import StatCards from './StatCards.jsx'
import { DOMAIN, SEVERITY, sevColor, num, timeAgo } from '../lib.js'

const DOMAIN_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'flood', label: 'Flood', Icon: Waves },
  { id: 'crop', label: 'Crop stress', Icon: Sprout },
  { id: 'heat', label: 'Urban heat', Icon: Sun },
]

/* ------------------------------------------------------------- Map pane */
function MapPane({ wards, alerts, selectedAlertId, onSelectAlert, onBack, notify, onValidated, domainFilter, setDomainFilter, event }) {
  const filteredAlerts = useMemo(
    () => (domainFilter === 'all' ? alerts : alerts.filter((a) => a.domain === domainFilter)),
    [alerts, domainFilter],
  )
  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? null

  const handleWardClick = (wardId) => {
    const wardAlerts = filteredAlerts.filter((a) => a.ward_id === wardId)
    if (wardAlerts.length > 0) {
      onSelectAlert([...wardAlerts].sort((a, b) => b.score - a.score)[0].id)
    } else {
      onSelectAlert(null)
      onBack()
    }
  }

  return (
    <div className="map-row">
      <div className="map-wrap">
        <div className="filter-row">
          {DOMAIN_FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter-chip ${domainFilter === f.id ? 'active' : ''}`}
              onClick={() => setDomainFilter(f.id)}
            >
              {f.Icon && <f.Icon size={12} />}
              {f.label}
            </button>
          ))}
        </div>
        <div className="map-event-chip">
          <span className="dot" style={{ background: '#F87171' }} /> {event ?? ''}
        </div>
        <MapView
          wards={wards}
          selectedWardId={selectedAlert?.ward_id ?? null}
          onSelectWard={handleWardClick}
          domainFilter={domainFilter}
        />
        <div className="map-legend">
          <h4>Severity · fused score</h4>
          {Object.entries(SEVERITY).filter(([k]) => k !== 'none').map(([k, v]) => (
            <div className="legend-row" key={k}>
              <span className="legend-swatch" style={{ background: v.color }} />
              {v.label}
            </div>
          ))}
          <div className="legend-row" style={{ color: 'var(--ink-lo)' }}>
            <span className="legend-swatch" style={{ background: SEVERITY.none.color }} />
            {SEVERITY.none.label}
          </div>
        </div>
        <div className="map-sim-tag">simulated data · demo scenario</div>
      </div>

      <div className="rail">
        <div className="rail-head">
          <span className="rail-title">
            <Bell size={14} style={{ color: 'var(--accent)' }} />
            {selectedAlert ? selectedAlert.ward_name : 'Alert feed'}
          </span>
          {!selectedAlert && <span className="rail-count">{filteredAlerts.length} alerts</span>}
        </div>
        {selectedAlert ? (
          <DetailDrawer
            alert={selectedAlert}
            onBack={onBack}
            onValidated={onValidated}
            notify={notify}
          />
        ) : (
          <AlertFeed alerts={filteredAlerts} selectedId={selectedAlertId} onSelect={(a) => onSelectAlert(a.id)} />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Overview */
export function Overview({ summary, wards, alerts, selectedAlertId, onSelectAlert, onBack, notify, onValidated, onPick, domainFilter, setDomainFilter, timeline }) {
  return (
    <>
      <StatCards summary={summary} onPick={onPick} />
      {timeline && timeline.entries.length > 0 && (
        <div className="timeline">
          {timeline.entries.map((e, i) => (
            <div key={e.id} style={{ display: 'contents' }}>
              {i > 0 && <div className="tl-line" />}
              <div className="tl-item">
                <div className="tl-node"><Timer size={12} /></div>
                <div>
                  <div className="tl-time">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="tl-label">{e.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <MapPane
        wards={wards} alerts={alerts} event={summary?.event}
        selectedAlertId={selectedAlertId} onSelectAlert={onSelectAlert}
        onBack={onBack} notify={notify} onValidated={onValidated}
        domainFilter={domainFilter} setDomainFilter={setDomainFilter}
      />
    </>
  )
}

/* ------------------------------------------------------------- Alerts */
export function AlertsPage(props) {
  return (
    <MapPane
      {...props}
    />
  )
}

/* ------------------------------------------------------------- Region */
export function RegionPage({ wards, alerts, summary }) {
  const rows = useMemo(() => {
    const byWard = new Map()
    alerts.forEach((a) => {
      const arr = byWard.get(a.ward_id) ?? []
      arr.push(a)
      byWard.set(a.ward_id, arr)
    })
    return (wards?.features ?? []).map((f) => {
      const p = f.properties
      const wardAlerts = byWard.get(p.id) ?? []
      const sev = wardAlerts.length ? [...wardAlerts].sort((a, b) => b.score - a.score)[0].severity : 'none'
      const domains = [...new Set(wardAlerts.map((a) => a.domain))]
      return { ...p, sev, domains, alertCount: wardAlerts.length }
    })
  }, [wards, alerts])

  const verified = alerts.filter((a) => a.status === 'confirmed').length
  const total = rows.length

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Wards covered <MapPin size={14} /></div>
          <div className="stat-value">{num(total)}</div>
          <div className="stat-foot">{summary?.region ?? 'Puri District, Odisha'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Villages & wards alerted <Bell size={14} /></div>
          <div className="stat-value">{num(summary?.wards_watched ?? 0)}</div>
          <div className="stat-foot">{num(summary?.total_alerts ?? 0)} total alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Field-verified <RadioTower size={14} /></div>
          <div className="stat-value">{num(verified)}</div>
          <div className="stat-foot">active-learning dataset growing</div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ward</th><th>Type</th><th>Population</th><th>Alerts</th><th>Domains</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="cell-strong">{r.name}</td>
                <td><span className="type-tag">{r.type}</span></td>
                <td>{num(r.population)}</td>
                <td>{r.alertCount}</td>
                <td>
                  <div className="domain-stack">
                    {r.domains.map((d) => (
                      <span key={d} className="domain-pill" style={{ color: DOMAIN[d].color, background: `${DOMAIN[d].color}1c` }}>
                        {DOMAIN[d].label}
                      </span>
                    ))}
                    {r.domains.length === 0 && <span style={{ color: 'var(--ink-lo)' }}>—</span>}
                  </div>
                </td>
                <td>
                  <span className="sev-dot-cell">
                    <span className="sev-dot" style={{ background: sevColor(r.sev) }} />
                    {r.sev === 'none' ? 'No alert' : SEVERITY[r.sev].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- SMS */
export function SmsPage({ alerts }) {
  const [active, setActive] = useState(0)
  const smsAlerts = (alerts ?? []).filter((a) => a.severity === 'high' || a.severity === 'critical')
  const current = smsAlerts[active] ?? smsAlerts[0]
  const d = current ? DOMAIN[current.domain] : null

  return (
    <div className="sms-page">
      <div className="phone">
        <div className="phone-notch"><span /></div>
        {current && (
          <div className="phone-screen">
            <div className="sms-time">GSM-7 · {timeAgo(current.issued_at)} · {current.sms.length * 1.7 / 1024} KB</div>
            <div className="sms-bubble">
              <span className="sms-head">{current.sms.split(' |')[0]}</span>
              {current.sms.split('|').slice(1).join(' |')}
            </div>
            <div className="sms-meta">
              <span>ward: {current.ward_name}</span>
              <span>{current.confidence}% conf</span>
              <span>severity: {current.severity}</span>
            </div>
          </div>
        )}
        {!current && <div className="phone-screen" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--ink-lo)', fontSize: 12 }}>No high/critical alerts to relay</div>}
      </div>

      <div className="sms-list">
        <div className="section-card" style={{ background: 'var(--bg-1)' }}>
          <div className="section-title"><Smartphone size={13} /> Low-bandwidth queue · 2G fallback</div>
          <div style={{ fontSize: 12, color: 'var(--ink-mid)', lineHeight: 1.5 }}>
            Lightweight GSM-7 text payloads generated from the fusion engine — sent to ward-level
            helpline numbers when mobile data is unavailable. No imagery, no JSON — 120–170 chars per alert.
          </div>
        </div>
        {smsAlerts.map((a, i) => (
          <div key={a.id} className={`sms-card ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>
            <div className="sms-card-top">
              <span className="sms-card-name">{a.ward_name}</span>
              <span className="conf-chip" style={{ color: DOMAIN[a.domain].color, background: `${DOMAIN[a.domain].color}1c` }}>
                {a.severity} · {a.confidence}%
              </span>
            </div>
            <div className="sms-card-text">{a.sms}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------- Data sources */
const SOURCES = [
  { name: 'Sentinel-1 SAR', Icon: Satellite, desc: 'VV/VH backscatter change detection — flood extent through cloud cover. 6-day revisit.', tag: 'flood' },
  { name: 'Sentinel-2 MSI', Icon: Leaf, desc: 'NDVI / NDRE time series vs 5-year growth-stage baseline — crop stress anomaly.', tag: 'crop' },
  { name: 'Landsat-9 TIRS', Icon: Sun, desc: 'Thermal band LST + urban heat island index at 100 m resolution.', tag: 'heat' },
  { name: 'Google Earth Engine', Icon: Cpu, desc: 'Server-side processing of all optical / SAR / thermal collections in one pipeline.', tag: 'fusion' },
  { name: 'Weather feed', Icon: CloudRain, desc: 'OpenWeatherMap / IMD: rainfall, humidity, wind — 1h refresh, ingested as fusion features.', tag: 'features' },
  { name: 'IoT ward mesh', Icon: RadioTower, desc: 'Water level, soil moisture, air temperature — simulated nodes for demo, 15-min cadence.', tag: 'features' },
  { name: 'Fusion + UQ engine', Icon: Database, desc: 'Gradient-boosted ensemble with Monte-Carlo spread → confidence ± uncertainty.', tag: 'engine' },
  { name: 'Explainability', Icon: Smartphone, desc: 'SHAP feature contributions + NL evidence sentences for every issued alert.', tag: 'engine' },
]

export function SourcesPage() {
  return (
    <div className="src-grid">
      {SOURCES.map((s) => (
        <div className="src-card" key={s.name}>
          <div className="src-icon"><s.Icon size={18} /></div>
          <div>
            <div className="src-name">{s.name}</div>
            <div className="src-desc">{s.desc}</div>
            <span className="src-tag">{s.tag}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
