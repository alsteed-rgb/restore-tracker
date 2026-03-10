import { getStore } from '@netlify/blobs'

const STORE = 'restore-tracker'
const DEVICES_KEY = 'devices'

function cors(body, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' }, body: JSON.stringify(body) }
}

async function getDevices(store) {
  try { const raw = await store.get(DEVICES_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
}

export default async function handler(req, context) {
  if (req.method === 'OPTIONS') return cors({})
  const store = getStore({ name: STORE, consistency: 'strong' })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (req.method === 'GET') { const devices = await getDevices(store); return cors(devices) }

  if (req.method === 'POST') {
    const body = await req.json()
    const devices = await getDevices(store)
    const device = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    devices.unshift(device)
    await store.set(DEVICES_KEY, JSON.stringify(devices))
    return cors(device, 201)
  }

  if (req.method === 'PUT' && id) {
    const body = await req.json()
    const devices = await getDevices(store)
    const idx = devices.findIndex((d) => d.id === id)
    if (idx === -1) return cors({ error: 'Not found' }, 404)
    devices[idx] = { ...devices[idx], ...body }
    await store.set(DEVICES_KEY, JSON.stringify(devices))
    return cors(devices[idx])
  }

  if (req.method === 'DELETE' && id) {
    const devices = await getDevices(store)
    const filtered = devices.filter((d) => d.id !== id)
    await store.set(DEVICES_KEY, JSON.stringify(filtered))
    return cors({ deleted: id })
  }

  return cors({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/devices' }
