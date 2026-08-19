import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { get } from './api.js'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import { Overview, AlertsPage, RegionPage, SmsPage, SourcesPage } from './components/Pages.jsx'

const PAGE_META = {
  overview: { title: 'Operations Overview', sub: 'Fused flood · crop · heat alerting for ward-level response' },
  alerts: { title: 'Alert Centre', sub: 'All generated alerts, ranked by severity' },
  region: { title: 'Region Coverage', sub: 'Ward-level monitoring footprint · Puri district, Odisha' },
  sms: { title: 'SMS-Lite Output', sub: 'Low-bandwidth payloads for 2G / no-data areas' },
  sources: { title: 'Data Sources', sub: 'Satellite, weather and IoT inputs feeding the fusion engine' },
}

let toastSeq = 0

export default function App() {
  const [page, setPage] = useState('overview')
  const [summary, setSummary] = useState(null)
  const [wards, setWards] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [timeline, setTimeline] = useState(null)
  const [selectedAlertId, setSelectedAlertId] = useState(null)
  const [domainFilter, setDomainFilter] = useState('all')
  const [toasts, setToasts] = useState([])
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const alertCountRef = useRef(0)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [s, w, a, t] = await Promise.all([
        get('/dashboard'),
        get('/wards'),
        get('/alerts'),
        get('/timeline'),
      ])
      setSummary(s)
      setWards(w)
      setAlerts(a.alerts)
      setTimeline(t)
      alertCountRef.current = s.active_alerts
    } catch (e) {
      setError('Backend unreachable — run .\\start.ps1 in the project root, then reload. Auto-retrying…')
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!error) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [error, load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setTimeout(() => setRefreshing(false), 600)
  }

  const notify = (text, kind = 'ok') => {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }

  const onValidated = (updated) => {
    setAlerts((all) => all.map((a) => (a.id === updated.id ? updated : a)))
    setSummary((s) => ({
      ...s,
      verified: s.verified + (updated.status === 'confirmed' ? 1 : 0),
      disputed: s.disputed + (updated.status === 'false_positive' ? 1 : 0),
    }))
  }

  const meta = PAGE_META[page]
  const activeCount = summary?.active_alerts ?? 0

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} alertCount={activeCount} />
      <div className="main">
        <TopBar
          title={meta.title} sub={meta.sub}
          weather={summary?.weather} region={summary?.region}
          onRefresh={refresh} refreshing={refreshing}
          online={summary !== null && !error}
        />
        <div className="content">
          {error && (
            <div className="banner">
              <AlertTriangle size={15} />
              <span>{error}</span>
              <button className="btn" onClick={load}><RefreshCw size={13} /> Retry now</button>
            </div>
          )}
          {page === 'overview' && (
            <Overview
              summary={summary} wards={wards} alerts={alerts} timeline={timeline}
              selectedAlertId={selectedAlertId} onSelectAlert={setSelectedAlertId}
              onBack={() => setSelectedAlertId(null)}
              notify={notify} onValidated={onValidated} onPick={setPage}
              domainFilter={domainFilter} setDomainFilter={setDomainFilter}
            />
          )}
          {page === 'alerts' && (
            <AlertsPage
              wards={wards} alerts={alerts} event={summary?.event}
              selectedAlertId={selectedAlertId} onSelectAlert={setSelectedAlertId}
              onBack={() => setSelectedAlertId(null)}
              notify={notify} onValidated={onValidated}
              domainFilter={domainFilter} setDomainFilter={setDomainFilter}
            />
          )}
          {page === 'region' && <RegionPage wards={wards} alerts={alerts} summary={summary} />}
          {page === 'sms' && <SmsPage alerts={alerts} />}
          {page === 'sources' && <SourcesPage />}
        </div>
      </div>
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'ok' ? 'toast-ok' : 'toast-err'}`}>{t.text}</div>
        ))}
      </div>
    </div>
  )
}
