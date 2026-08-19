import { CloudRain, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'

export default function TopBar({ weather, region, title, sub, onRefresh, refreshing, online }) {
  return (
    <div className="topbar">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      <div className="topbar-right">
        <div className="search">
          <Search size={14} />
          <input placeholder="Search ward or alert…" />
        </div>
        {weather && (
          <div className="weather-chip" title="Live weather snapshot (simulated)">
            <CloudRain size={13} style={{ color: '#38BDF8' }} />
            {weather.temp_c}°C · {weather.rainfall_24h_mm}mm/24h · {weather.humidity}%RH
          </div>
        )}
        {region && <div className="weather-chip">{region}</div>}
        <div
          className="weather-chip"
          title={online ? 'API connected' : 'API offline'}
          style={{ color: online ? 'var(--accent-2)' : 'var(--sev-critical)' }}
        >
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          API :8006 {online ? 'online' : 'offline'}
        </div>
        <button className="icon-btn" onClick={onRefresh} title="Sync data">
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} style={refreshing ? { animation: 'spin 0.8s linear infinite' } : undefined} />
        </button>
      </div>
    </div>
  )
}
