import { getStore } from '@netlify/blobs'

const STORE = 'restore-tracker'

function cors(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    }
  })
}

// Fetch all devices stored as individual blobs (device-{id}).
// On first run, migrates legacy single-blob format automatically.
async function getAllDevices(store) {
  const { blobs } = await store.list({ prefix: 'device-' })

  if (blobs.length === 0) {
    // Migrate from legacy single-blob format if present
    const legacy = await store.get('devices')
    if (legacy) {
      const records = JSON.parse(legacy)
      await Promise.all(records.map(d => store.set(`device-${d.id}`, JSON.stringify(d))))
      await store.delete('devices')
      return records
    }
    return []
  }

  const results = await Promise.all(
    blobs.map(async ({ key }) => {
      try {
        const raw = await store.get(key)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    })
  )
  return results.filter(Boolean)
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return cors(null, 204)
  const store = getStore({ name: STORE, consistency: 'strong' })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (req.method === 'GET') {
    const devices = await getAllDevices(store)
    return cors(devices)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const now = new Date().toISOString()
    const device = { ...body, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await store.set(`device-${device.id}`, JSON.stringify(device))
    return cors(device, 201)
  }

  if (req.method === 'PUT') {
    if (!id) return cors({ error: 'id required' }, 400)
    const body = await req.json()
    const raw = await store.get(`device-${id}`)
    if (!raw) return cors({ error: 'Not found' }, 404)
    const existing = JSON.parse(raw)

    // Conflict detection: if the client's updatedAt doesn't match what's stored,
    // another user has modified this record since the client last loaded it.
    if (body.updatedAt && existing.updatedAt && body.updatedAt !== existing.updatedAt) {
      return cors({ error: 'Conflict', current: existing }, 409)
    }

    const { updatedAt: _clientTs, ...fields } = body
    const updated = { ...existing, ...fields, id, updatedAt: new Date().toISOString() }
    await store.set(`device-${id}`, JSON.stringify(updated))
    return cors(updated)
  }

  if (req.method === 'DELETE') {
    if (!id) return cors({ error: 'id required' }, 400)
    await store.delete(`device-${id}`)
    return cors({ ok: true })
  }

  return cors({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/devices' }
