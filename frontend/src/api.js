const BASE = '/api'

export async function get(path) {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(`API ${r.status} on ${path}`)
  return r.json()
}

export async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`API ${r.status} on ${path}`)
  return r.json()
}
