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

// Fetch all restores stored as individual blobs (restore-{id}).
// On first run, migrates legacy single-blob format automatically.
async function getAllRestores(store) {
  const { blobs } = await store.list({ prefix: 'restore-' })

  if (blobs.length === 0) {
    // Migrate from legacy single-blob format if present
    const legacy = await store.get('restores')
    if (legacy) {
      const records = JSON.parse(legacy)
      await Promise.all(records.map(r => store.set(`restore-${r.id}`, JSON.stringify(r))))
      await store.delete('restores')
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
  const deviceId = url.searchParams.get('device_id')
  const action = url.searchParams.get('action')

  // --- Screenshot: GET /api/restores?action=screenshot&id={id}
  if (req.method === 'GET' && action === 'screenshot') {
    if (!id) return cors({ error: 'id required' }, 400)
    try {
      const data = await store.get(`screenshot-${id}`, { type: 'arrayBuffer' })
      if (!data) return cors({ error: 'Not found' }, 404)
      const meta = await store.getMetadata(`screenshot-${id}`)
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': meta?.metadata?.contentType || 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000'
        }
      })
    } catch {
      return cors({ error: 'Not found' }, 404)
    }
  }

  // --- Screenshot: POST /api/restores?action=screenshot&id={id}
  if (req.method === 'POST' && action === 'screenshot') {
    if (!id) return cors({ error: 'id required' }, 400)
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file) return cors({ error: 'No file provided' }, 400)
    const buffer = await file.arrayBuffer()
    await store.set(`screenshot-${id}`, buffer, {
      metadata: { contentType: file.type || 'image/png' }
    })
    // Update only the individual restore blob — no array read needed
    const raw = await store.get(`restore-${id}`)
    if (raw) {
      const restore = JSON.parse(raw)
      restore.hasScreenshot = true
      restore.updatedAt = new Date().toISOString()
      await store.set(`restore-${id}`, JSON.stringify(restore))
    }
    return cors({ ok: true })
  }

  // --- List / filter
  if (req.method === 'GET') {
    const restores = await getAllRestores(store)
    return cors(deviceId ? restores.filter(r => r.device_id === deviceId) : restores)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const now = new Date().toISOString()
    const restore = { ...body, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await store.set(`restore-${restore.id}`, JSON.stringify(restore))
    return cors(restore, 201)
  }

  if (req.method === 'PUT') {
    if (!id) return cors({ error: 'id required' }, 400)
    const body = await req.json()
    const raw = await store.get(`restore-${id}`)
    if (!raw) return cors({ error: 'Not found' }, 404)
    const existing = JSON.parse(raw)

    // Conflict detection: reject if another user updated this record since the client loaded it
    if (body.updatedAt && existing.updatedAt && body.updatedAt !== existing.updatedAt) {
      return cors({ error: 'Conflict', current: existing }, 409)
    }

    const { updatedAt: _clientTs, ...fields } = body
    const updated = { ...existing, ...fields, id, updatedAt: new Date().toISOString() }
    await store.set(`restore-${id}`, JSON.stringify(updated))
    return cors(updated)
  }

  if (req.method === 'DELETE') {
    if (deviceId) {
      // Delete all restores for a device
      const restores = await getAllRestores(store)
      const toDelete = restores.filter(r => r.device_id === deviceId)
      await Promise.allSettled([
        ...toDelete.map(r => store.delete(`restore-${r.id}`)),
        ...toDelete.map(r => store.delete(`screenshot-${r.id}`))
      ])
      return cors({ ok: true })
    }
    if (!id) return cors({ error: 'id or device_id required' }, 400)
    await Promise.allSettled([
      store.delete(`restore-${id}`),
      store.delete(`screenshot-${id}`)
    ])
    return cors({ ok: true })
  }

  return cors({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/restores' }
