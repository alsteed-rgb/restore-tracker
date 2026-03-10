import { getStore } from '@netlify/blobs'

const STORE = 'restore-tracker'
const RESTORES_KEY = 'restores'

function cors(body, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' }, body: JSON.stringify(body) }
}

async function getRestores(store) {
  try { const raw = await store.get(RESTORES_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
}

export default async function handler(req, context) {
  if (req.method === 'OPTIONS') return cors({})
  const store = getStore({ name: STORE, consistency: 'strong' })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const deviceId = url.searchParams.get('device_id')

  if (req.method === 'GET') {
    const restores = await getRestores(store)
    return cors(deviceId ? restores.filter((r) => r.device_id === deviceId) : restores)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const restores = await getRestores(store)
    const restore = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    restores.unshift(restore)
    await store.set(RESTORES_KEY, JSON.stringify(restores))
    return cors(restore, 201)
  }

  if (req.method === 'PUT' && id) {
    const body = await req.json()
    const restores = await getRestores(store)
    const idx = restores.findIndex((r) => r.id === id)
    if (idx === -1) return cors({ error: 'Not found' }, 404)
    restores[idx] = { ...restores[idx], ...body }
    await store.set(RESTORES_KEY, JSON.stringify(restores))
    return cors(restores[idx])
  }

  if (req.method === 'DELETE') {
    const restores = await getRestores(store)
    let filtered
    if (id) { filtered = restores.filter((r) => r.id !== id) }
    else if (deviceId) { filtered = restores.filter((r) => r.device_id !== deviceId) }
    else { return cors({ error: 'id or device_id required' }, 400) }
    await store.set(RESTORES_KEY, JSON.stringify(filtered))
    return cors({ deleted: id || deviceId })
  }

  return cors({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/restores' }
