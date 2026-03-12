/**
 * Admin proxy for Netlify Identity Admin API.
 *
 * All requests require a valid Netlify Identity JWT with app_metadata.role = 'admin'.
 * The NETLIFY_PAT (personal access token) is used server-side only and never
 * sent to the browser.
 *
 * Routes (all via HTTP method + body action):
 *   GET  /api/admin-identity             → list all Identity users
 *   POST /api/admin-identity  { action: 'set-company', userId, companyId }  → update companyId
 *   POST /api/admin-identity  { action: 'invite', email }                   → invite new user
 */

const HEADERS = { 'Content-Type': 'application/json' }

function identityUrl() {
  const base = process.env.URL
  if (!base) throw new Error('URL environment variable not set (required to reach Identity API)')
  return `${base.replace(/\/$/, '')}/.netlify/identity`
}

function patHeaders() {
  const pat = process.env.NETLIFY_PAT
  if (!pat) throw new Error('NETLIFY_PAT environment variable not set')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${pat}`,
  }
}

function unauthorized(msg = 'Unauthorized') {
  return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: msg }) }
}

function forbidden(msg = 'Forbidden') {
  return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: msg }) }
}

function badRequest(msg) {
  return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: msg }) }
}

export const handler = async (event) => {
  // ── Auth gate: must be a logged-in admin ──────────────────────────────────
  const user = event.clientContext?.user
  if (!user) return unauthorized()
  if (user.app_metadata?.role !== 'admin') return forbidden('Admin access required')

  try {
    const base = identityUrl()
    const ph   = patHeaders()

    // ── GET: list all users ──────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const res  = await fetch(`${base}/admin/users?per_page=200`, { headers: ph })
      const data = await res.json()
      if (!res.ok) throw new Error(data.msg || `Identity API HTTP ${res.status}`)

      const users = (data.users ?? []).map(u => ({
        id:          u.id,
        email:       u.email,
        companyId:   u.app_metadata?.companyId ?? null,
        role:        u.app_metadata?.role ?? null,
        confirmed:   !!u.confirmed_at,
        createdAt:   u.created_at,
      }))

      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ users }) }
    }

    // ── POST: actions ────────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      let body
      try { body = JSON.parse(event.body || '{}') } catch { return badRequest('Invalid JSON') }

      // ── action: set-company ─────────────────────────────────────────────
      if (body.action === 'set-company') {
        const { userId, companyId } = body
        if (!userId) return badRequest('userId is required')

        // Read current user so we can merge rather than overwrite app_metadata
        const getRes = await fetch(`${base}/admin/users/${userId}`, { headers: ph })
        const current = await getRes.json()
        if (!getRes.ok) throw new Error(current.msg || `Could not read user: HTTP ${getRes.status}`)

        const merged = {
          ...current.app_metadata,
          // Allow clearing companyId by passing null/0/""
          companyId: companyId !== null && companyId !== '' && companyId !== 0
            ? Number(companyId)
            : null,
        }

        const putRes = await fetch(`${base}/admin/users/${userId}`, {
          method:  'PUT',
          headers: ph,
          body:    JSON.stringify({ app_metadata: merged }),
        })
        const result = await putRes.json()
        if (!putRes.ok) throw new Error(result.msg || `Update failed: HTTP ${putRes.status}`)

        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({ ok: true, companyId: result.app_metadata?.companyId ?? null }),
        }
      }

      // ── action: invite ──────────────────────────────────────────────────
      if (body.action === 'invite') {
        const { email } = body
        if (!email || !email.includes('@')) return badRequest('Valid email address required')

        const invRes = await fetch(`${base}/admin/invite`, {
          method:  'POST',
          headers: ph,
          body:    JSON.stringify({ email }),
        })
        const result = await invRes.json()
        if (!invRes.ok) throw new Error(result.msg || `Invite failed: HTTP ${invRes.status}`)

        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({ ok: true, email: result.email }),
        }
      }

      return badRequest(`Unknown action: ${body.action}`)
    }

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error('admin-identity error:', err)
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
