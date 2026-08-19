import { Waves, Sprout, Sun } from 'lucide-react'

export const SEVERITY = {
  critical: { color: '#F87171', label: 'Critical' },
  high: { color: '#FB923C', label: 'High' },
  moderate: { color: '#FBBF24', label: 'Moderate' },
  info: { color: '#38BDF8', label: 'Watch' },
  none: { color: '#334155', label: 'No alert' },
}

export const DOMAIN = {
  flood: { color: '#38BDF8', label: 'Flood', Icon: Waves },
  crop: { color: '#A3E635', label: 'Crop stress', Icon: Sprout },
  heat: { color: '#FB923C', label: 'Urban heat', Icon: Sun },
}

export const sevColor = (s) => SEVERITY[s]?.color ?? SEVERITY.none.color
export const sevFill = (s) => {
  const alpha = { critical: 0.22, high: 0.2, moderate: 0.16, info: 0.12, none: 0.06 }[s] ?? 0.06
  return hexToRgba(sevColor(s), alpha)
}

export function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function confTone(conf) {
  if (conf >= 80) return '#22D3EE'
  if (conf >= 60) return '#FBBF24'
  return '#F87171'
}

export const num = (v) => v.toLocaleString('en-IN')
