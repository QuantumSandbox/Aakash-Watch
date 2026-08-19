import { ChevronRight } from 'lucide-react'
import { DOMAIN, SEVERITY, confTone, sevColor, timeAgo } from '../lib.js'

const STATUS_LABEL = {
  pending: { text: 'Awaiting validation', color: '#94A3B8' },
  confirmed: { text: 'Verified ✓', color: '#34D399' },
  false_positive: { text: 'Disputed ✗', color: '#F87171' },
  partial: { text: 'Partially correct', color: '#FBBF24' },
}

export default function AlertFeed({ alerts, selectedId, onSelect }) {
  const sorted = [...(alerts ?? [])].sort((a, b) => b.score - a.score)
  return (
    <div className="rail-body">
      {sorted.length === 0 && <div className="alert-empty">No alerts match the current filter.</div>}
      {sorted.map((a) => {
        const d = DOMAIN[a.domain]
        const Icon = d.Icon
        const st = STATUS_LABEL[a.status]
        return (
          <div
            key={a.id}
            className={`alert-row ${selectedId === a.id ? 'selected' : ''}`}
            onClick={() => onSelect(a)}
          >
            <div className="sev-strip" style={{ background: sevColor(a.severity) }} />
            <div className="alert-main">
              <div className="alert-top">
                <span className="alert-name">{a.ward_name}</span>
                <span className="domain-tag" style={{ color: d.color, background: `${d.color}1f` }}>
                  <Icon size={11} /> {d.label}
                </span>
              </div>
              <div className="alert-sub">
                <span className="conf-chip" style={{ color: confTone(a.confidence) }}>
                  {a.confidence}% ± {a.uncertainty}
                </span>
                <span style={{ color: SEVERITY[a.severity].color, fontWeight: 600 }}>
                  {SEVERITY[a.severity].label}
                </span>
                <span>· {timeAgo(a.issued_at)}</span>
                <span className="alert-status" style={{ color: st.color }}>{st.text}</span>
              </div>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--ink-lo)', marginTop: 4, flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}
