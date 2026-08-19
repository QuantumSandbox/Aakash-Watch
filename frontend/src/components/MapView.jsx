import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { sevFill, sevColor, SEVERITY, DOMAIN } from '../lib.js'

export default function MapView({ wards, selectedWardId, onSelectWard, domainFilter }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const polygonRef = useRef(new Map())

  useEffect(() => {
    const map = L.map(elRef.current, {
      center: [19.8135, 85.8312],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer || !wards) return
    layer.clearLayers()
    polygonRef.current.clear()

    wards.features.forEach((f) => {
      const props = f.properties
      const sev = props.severity
      const domains = props.domains ?? []

      const poly = L.polygon(f.geometry.coordinates, {
        fillColor: sevFill(sev),
        fillOpacity: 1,
        color: sevColor(sev),
        weight: sev === 'none' ? 0.7 : 1.2,
        interactive: true,
      })

      const domainText = domains.map((d) => DOMAIN[d]?.label).join(' · ')
      poly.bindTooltip(
        () => {
          const el = document.createElement('div')
          el.style.cssText = 'font-weight:600;font-size:12.5px;margin-bottom:2px'
          el.textContent = props.name
          const sub = document.createElement('div')
          sub.style.cssText = `color:${SEVERITY[sev]?.color};font-size:11px;display:flex;align-items:center;gap:5px`
          sub.innerHTML = `● ${SEVERITY[sev]?.label}${domainText ? ` · ${domainText}` : ''}`
          const wrap = document.createElement('div')
          wrap.appendChild(el)
          wrap.appendChild(sub)
          return wrap
        },
        { className: 'aakash', direction: 'top' },
      )

      poly.on('click', () => onSelectWard(props.id))
      poly.addTo(layer)
      polygonRef.current.set(props.id, poly)
    })

    setTimeout(() => mapRef.current?.invalidateSize(), 50)
  }, [wards, domainFilter, onSelectWard])

  useEffect(() => {
    polygonRef.current.forEach((poly, id) => {
      const props = wards?.features.find((f) => f.properties.id === id)?.properties
      if (!props) return
      const sev = props.severity
      const sel = id === selectedWardId
      poly.setStyle({
        fillColor: sevFill(sev),
        fillOpacity: sel ? 0.42 : 1,
        color: sel ? '#22D3EE' : sevColor(sev),
        weight: sel ? 2.6 : sev === 'none' ? 0.7 : 1.2,
      })
      if (sel) poly.bringToFront()
    })
  }, [selectedWardId, wards])

  return <div ref={elRef} style={{ width: '100%', height: '100%' }} />
}
