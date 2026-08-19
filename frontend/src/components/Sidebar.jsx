import { Activity, LayoutDashboard, Bell, MapPinned, Smartphone, Database, Satellite } from 'lucide-react'

const NAV = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'alerts', label: 'Alerts', Icon: Bell },
  { id: 'region', label: 'Region Coverage', Icon: MapPinned },
  { id: 'sms', label: 'SMS Lite Output', Icon: Smartphone },
  { id: 'sources', label: 'Data Sources', Icon: Database },
]

export default function Sidebar({ page, setPage, alertCount }) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">
          <Satellite size={18} />
        </div>
        <div>
          <div className="logo-name">Aakash Watch</div>
          <div className="logo-sub">Edge-AI EO Platform</div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-section">Operations</div>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item ${page === id ? 'active' : ''}`}
            onClick={() => setPage(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
            {id === 'alerts' && alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-row">
          <span className="dot" />
          <span>Backend live</span>
        </div>
        <div className="port-tag">api :8006 · ui :3006</div>
      </div>
    </aside>
  )
}
