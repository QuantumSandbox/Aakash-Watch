import { Radar, AlertTriangle, Wifi, ShieldCheck, TrendingUp, Activity } from 'lucide-react'
import { num } from '../lib.js'

const cards = [
  { key: 'active_alerts', label: 'Active alerts', Icon: AlertTriangle, foot: 'critical + high', delta: '↑ surge', tone: 'delta-up' },
  { key: 'wards_watched', label: 'Wards under watch', Icon: Radar, foot: 'of region', delta: '24 wards', tone: 'delta-mid' },
  { key: 'sensors_online', label: 'IoT sensors online', Icon: Wifi, foot: 'simulated mesh', delta: '3/ward', tone: 'delta-ok' },
  { key: 'avg_confidence', label: 'Avg. confidence', Icon: ShieldCheck, foot: 'ensemble ± spread', delta: 'UQ active', tone: 'delta-ok' },
]

export default function StatCards({ summary, onPick }) {
  if (!summary) {
    return (
      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.key} className="stat-card"><div className="skel" style={{ height: 12, width: '55%' }} /><div className="skel" style={{ height: 30, width: '40%', marginTop: 12 }} /></div>
        ))}
      </div>
    )
  }
  return (
    <div className="stat-grid">
      {cards.map(({ key, label, Icon, foot, delta, tone }) => (
        <div key={key} className="stat-card" onClick={() => key === 'active_alerts' && onPick('alerts')}>
          <div className="stat-label">
            {label}
            <Icon size={15} style={{ color: 'var(--ink-lo)' }} />
          </div>
          <div className="stat-value">{key === 'avg_confidence' ? `${summary[key]}%` : num(summary[key] ?? 0)}</div>
          <div className="stat-foot">
            <span className={`stat-delta ${tone}`}>{delta}</span>
            <Activity size={11} /> {foot}
          </div>
        </div>
      ))}
    </div>
  )
}
