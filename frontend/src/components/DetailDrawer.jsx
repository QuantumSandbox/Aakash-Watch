import { useState } from 'react'
import {
  X, Satellite, Smartphone, Check, XCircle, MinusCircle,
  ArrowUpRight, ArrowDownRight, Minus, Radio, CloudLightning, Send,
} from 'lucide-react'
import { DOMAIN, SEVERITY, confTone, num, sevColor, timeAgo } from '../lib.js'
import { post } from '../api.js'

function Highlight({ text }) {
  const parts = text.split(/([-+]?\d+(?:\.\d+)?(?:σ|°C|%|mm|dB|m|km)?)/g)
  return parts.map((p, i) =>
    /^\d|[-+]?\d+(?:\.\d+)?/.test(p) ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>,
  )
}

const TREND_ICON = { up: <ArrowUpRight size={12} />, down: <ArrowDownRight size={12} />, steady: <Minus size={12} /> }

const FB_META = {
  confirmed: { cls: 'fb-confirmed', icon: <Check size={14} />, text: 'Alert confirmed by authority — feedback recorded for active-learning retraining.' },
  false_positive: { cls: 'fb-false_positive', icon: <XCircle size={14} />, text: 'Marked as false positive — the model will be retrained on this correction.' },
  partial: { cls: 'fb-partial', icon: <MinusCircle size={14} />, text: 'Marked partially correct — severity will be re-calibrated.' },
}

export default function DetailDrawer({ alert, onBack, onValidated, notify }) {
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')
  if (!alert) return null

  const d = DOMAIN[alert.domain]
  const Icon = d.Icon
  const sev = SEVERITY[alert.severity]
  const confColor = confTone(alert.confidence)

  const validate = async (action) => {
    setSaving(true)
    try {
      const updated = await post(`/api/alerts/${alert.id}/validate`, { action, comment: comment || null })
      onValidated(updated)
      notify(`Feedback recorded: ${action.replace('_', ' ')}`, 'ok')
    } catch (e) {
      notify('Failed to record feedback', 'err')
    } finally {
      setSaving(false)
    }
  }

  const fb = alert.feedback ? FB_META[alert.feedback.action] : null

  return (
    <>
      <div className="drawer-head">
        <div className="drawer-title">
          <div className="drawer-name">
            {alert.ward_name}
            <span className="sev-badge" style={{ background: `${sev.color}22`, color: sev.color }}>{sev.label}</span>
          </div>
          <div className="drawer-meta">
            <span className="type-tag">{alert.ward_type}</span>
            <span>{alert.id}</span>
            <span>{timeAgo(alert.issued_at)}</span>
          </div>
        </div>
        <button className="icon-btn" onClick={onBack} title="Back to feed">
          <X size={15} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="conf-block">
          <div>
            <div className="conf-num" style={{ color: confColor }}>{alert.confidence}%</div>
            <div className="conf-sub">confidence · ensemble</div>
          </div>
          <div className="conf-band">
            <div className="band-track">
              <div className="band-unc" style={{ left: `${Math.max(0, alert.confidence - alert.uncertainty)}%`, width: `${alert.uncertainty * 2}%` }} />
              <div className="band-fill" style={{ width: `${alert.confidence}%`, background: confColor }} />
            </div>
            <div className="band-labels">
              <span>0%</span>
              <span>± {alert.uncertainty}% spread (Monte-Carlo, n=25)</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="explain-card">
          <Icon size={13} style={{ color: d.color, marginRight: 6, verticalAlign: -2 }} />
          <Highlight text={alert.explanation} />
        </div>

        <div className="section-card">
          <div className="section-title"><CloudLightning size={13} style={{ color: d.color }} /> Fusion evidence — feature contributions</div>
          {alert.evidence.map((e) => (
            <div className="ev-row" key={e.feature}>
              <div className="ev-top">
                <span className="ev-feat">{e.feature}</span>
                <span className="ev-val">{e.value}{e.unit} · {e.contribution}%</span>
              </div>
              <div className="ev-track">
                <div className="ev-fill" style={{ width: `${e.contribution}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="section-card">
          <div className="section-title"><Radio size={13} /> IoT observations · ward mesh</div>
          <div className="sensor-grid">
            {alert.sensors.map((s) => (
              <div className="sensor-card" key={s.key}>
                <div className="sensor-label">
                  {s.label}
                  <span className="sim-tag">sim</span>
                </div>
                <div className="sensor-val">{s.value}<span style={{ fontSize: 11, color: 'var(--ink-lo)' }}> {s.unit}</span></div>
                <div className={`sensor-trend trend-${s.trend}`}>
                  {TREND_ICON[s.trend]} {s.trend}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <div className="section-title"><Satellite size={13} /> Satellite snapshot</div>
          <div className="sat-row">
            <span className="sat-key"><Satellite size={13} /> Source</span>
            <span className="sat-val">{alert.satellite.source}</span>
          </div>
          <div className="sat-row">
            <span className="sat-key">Pass</span>
            <span className="sat-val">{alert.satellite.pass}</span>
          </div>
          {alert.satellite.metrics.map((m) => (
            <div className="sat-row" key={m.label}>
              <span className="sat-key">{m.label}</span>
              <span className="sat-val">{m.value}{m.unit}</span>
            </div>
          ))}
        </div>

        <div className="section-card">
          <div className="section-title"><Smartphone size={13} /> SMS-lite payload · 2G fallback</div>
          <div className="sms-bubble" style={{ fontSize: 11.5 }}>
            {alert.sms}
          </div>
          <div className="sms-meta" style={{ marginTop: 8, paddingTop: 8 }}>
            <span>{alert.sms.length} chars</span>
            <span>{(alert.sms.length * 1.7 / 1024).toFixed(1)} KB</span>
            <span>protocol: GSM-7</span>
          </div>
        </div>

        <div className="section-card">
          <div className="section-title"><Check size={13} style={{ color: 'var(--accent-2)' }} /> Field validation — human in the loop</div>
          {fb ? (
            <div className={`feedback-banner ${fb.cls}`}>
              {fb.icon} {fb.text}
              {alert.feedback.comment && <span style={{ fontStyle: 'italic' }}> — "{alert.feedback.comment}"</span>}
            </div>
          ) : (
            <>
              <div className="validate-row">
                <button className="btn btn-ok" disabled={saving} onClick={() => validate('confirmed')}>
                  <Check size={14} /> Confirm
                </button>
                <button className="btn btn-part" disabled={saving} onClick={() => validate('partial')}>
                  <MinusCircle size={14} /> Partial
                </button>
                <button className="btn btn-bad" disabled={saving} onClick={() => validate('false_positive')}>
                  <XCircle size={14} /> False positive
                </button>
              </div>
              <textarea
                className="comment-input"
                rows={2}
                placeholder="Field note (optional) — e.g. water level 2.8 m observed at NH crossing"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              {comment && (
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <button className="btn" style={{ flex: 'none', width: 'auto', padding: '7px 18px' }} onClick={() => validate('confirmed')} disabled={saving}>
                    <Send size={13} /> Send with feedback
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-lo)', textAlign: 'center', paddingBottom: 6 }}>
          Ward population {num(alert.population ?? 0)} · feedback feeds the active-learning retrain loop
        </div>
      </div>
    </>
  )
}
