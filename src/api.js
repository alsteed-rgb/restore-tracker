const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 409) {
    const data = await res.json()
    const err = new Error('Conflict')
    err.status = 409
    err.current = data.current
    throw err
  }
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  getDevices:    ()           => req('GET',    '/devices'),
  createDevice:  (data)       => req('POST',   '/devices', data),
  updateDevice:  (id, data)   => req('PUT',    `/devices?id=${id}`, data),
  deleteDevice:  (id)         => req('DELETE', `/devices?id=${id}`),
  getRestores:   ()           => req('GET',    '/restores'),
  createRestore: (data)       => req('POST',   '/restores', data),
  updateRestore: (id, data)   => req('PUT',    `/restores?id=${id}`, data),
  deleteRestore: (id)         => req('DELETE', `/restores?id=${id}`),
  deleteRestoresByDevice: (deviceId) => req('DELETE', `/restores?device_id=${deviceId}`),

  uploadScreenshot: async (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/restores?action=screenshot&id=${id}`, { method: 'POST', body: fd })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  },

  screenshotUrl: (id) => `/api/restores?action=screenshot&id=${id}`,
}
