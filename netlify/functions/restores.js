import { getStore } from '@netlify/blobs'

const STORE = 'restore-tracker'
const RESTORES_KEY = 'restores'

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

async function getRestores(store) {
  try {
    const raw = await store.get(RESTORES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default async function handler(req, context) {
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
    const restores = await getRestores(store)
    const idx = restores.findIndex(r => r.id === id)
    if (idx !== -1) {
      restores[idx].hasScreenshot = true
      await store.set(RESTORES_KEY, JSON.stringify(restores))
    }
    return cors({ ok: true })
  }

  // --- List / filter
  if (req.method === 'GET') {
    const restores = await getRestores(store)
    return cors(deviceId ? restores.filter(r => r.device_id === deviceId) : restores)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const restores = await getRestores(store)
    const restore = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    restores.push(restore)
    await store.set(RESTORES_KEY, JSON.stringify(restores))
    return cors(restore, 201)
  }

  if (req.method === 'PUT') {
    const body = await req.json()
    const restores = await getRestores(store)
    const idx = restores.findIndex(r => r.id === id)
    if (idx === -1) return cors({ error: 'Not found' }, 404)
    restores[idx] = { ...restores[idx], ...body, id }
    await store.set(RESTORES_KEY, JSON.stringify(restores))
    return cors(restores[idx])
  }

  if (req.method === 'DELETE') {
    const restores = await getRestores(store)
    const toDelete = deviceId
      ? restores.filter(r => r.device_id === deviceId)
      : restores.filter(r => r.id === id)
    // Clean up screenshots for deleted restores
    await Promise.allSettled(toDelete.map(r => store.delete(`screenshot-${r.id}`)))
    const filtered = deviceId
      ? restores.filter(r => r.device_id !== deviceId)
      : restores.filter(r => r.id !== id)
    await store.set(RESTORES_KEY, JSON.stringify(filtered))
    return cors({ ok: true })
  }

  return cors({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/restores' }
