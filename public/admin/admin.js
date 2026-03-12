// ── Auth helpers ──────────────────────────────────────────────────────────────
function currentUser() { return netlifyIdentity.currentUser() }

async function getToken() {
  // .jwt() auto-refreshes if the token is near expiry
  return currentUser().jwt()
}

async function apiFetch(path, options = {}) {
  const token = await getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── View helpers ──────────────────────────────────────────────────────────────
function show(id)  { document.getElementById(id).classList.remove('hidden') }
function hide(id)  { document.getElementById(id).classList.add('hidden') }

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = `toast ${type}`
  el.classList.remove('hidden')
  clearTimeout(el._timer)
  el._timer = setTimeout(() => el.classList.add('hidden'), 3500)
}

// ── Views ─────────────────────────────────────────────────────────────────────
function showLogin()     { show('login-view'); hide('admin-view'); hide('forbidden-view') }
function showForbidden() { show('forbidden-view'); hide('login-view'); hide('admin-view') }
function showAdmin(user) {
  show('admin-view'); hide('login-view'); hide('forbidden-view')
  document.getElementById('admin-email').textContent = user.email
  loadUsers()
}

// ── Load users ────────────────────────────────────────────────────────────────
async function loadUsers() {
  const wrap = document.getElementById('table-wrap')
  wrap.innerHTML = '<div class="loading">Loading users…</div>'

  try {
    const { users } = await apiFetch('/api/admin-identity')
    document.getElementById('user-count').textContent = users.length
    renderTable(users)
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state" style="color:#dc2626">${err.message}</div>`
  }
}

function renderTable(users) {
  const wrap = document.getElementById('table-wrap')

  if (!users.length) {
    wrap.innerHTML = '<div class="empty-state">No users found.</div>'
    return
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Status</th>
          <th>Company ID</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td class="email-cell">${escHtml(u.email)}</td>
            <td>
              <span class="status-badge ${u.confirmed ? 'status-confirmed' : 'status-pending'}">
                ${u.confirmed ? 'Confirmed' : 'Pending'}
              </span>
            </td>
            <td>
              <div class="company-id-cell">
                <input
                  type="number"
                  id="cid-${u.id}"
                  value="${u.companyId ?? ''}"
                  placeholder="—"
                  min="1"
                  step="1"
                />
              </div>
            </td>
            <td>
              <button
                class="btn btn-primary btn-sm"
                data-user-id="${u.id}"
                onclick="saveCompanyId(this)"
              >Save</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

// ── Save company ID ───────────────────────────────────────────────────────────
async function saveCompanyId(btn) {
  const userId    = btn.dataset.userId
  const input     = document.getElementById(`cid-${userId}`)
  const companyId = input.value.trim() === '' ? null : parseInt(input.value, 10)

  if (companyId !== null && (isNaN(companyId) || companyId < 1)) {
    showToast('Company ID must be a positive number', 'error')
    return
  }

  btn.disabled    = true
  btn.textContent = '…'

  try {
    await apiFetch('/api/admin-identity', {
      method: 'POST',
      body: JSON.stringify({ action: 'set-company', userId, companyId }),
    })
    showToast(companyId ? `Saved: companyId ${companyId}` : 'Company ID cleared')
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    btn.disabled    = false
    btn.textContent = 'Save'
  }
}

// ── Invite user ───────────────────────────────────────────────────────────────
async function sendInvite() {
  const input    = document.getElementById('invite-email')
  const feedback = document.getElementById('invite-feedback')
  const btn      = document.getElementById('invite-btn')
  const email    = input.value.trim()

  feedback.className = 'feedback hidden'

  if (!email || !email.includes('@')) {
    feedback.textContent = 'Please enter a valid email address.'
    feedback.className   = 'feedback error'
    return
  }

  btn.disabled    = true
  btn.textContent = 'Sending…'

  try {
    await apiFetch('/api/admin-identity', {
      method: 'POST',
      body: JSON.stringify({ action: 'invite', email }),
    })
    feedback.textContent = `Invite sent to ${email}`
    feedback.className   = 'feedback success'
    input.value          = ''
    // Refresh list — new pending user will appear
    setTimeout(loadUsers, 800)
  } catch (err) {
    feedback.textContent = err.message
    feedback.className   = 'feedback error'
  } finally {
    btn.disabled    = false
    btn.textContent = 'Send Invite'
  }
}

// ── Tiny HTML escape (for email rendering) ───────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', () => {
  netlifyIdentity.open('login')
})

document.getElementById('logout-btn').addEventListener('click', () => {
  netlifyIdentity.logout()
})

document.getElementById('logout-forbidden-btn').addEventListener('click', () => {
  netlifyIdentity.logout()
})

document.getElementById('refresh-btn').addEventListener('click', loadUsers)

document.getElementById('invite-btn').addEventListener('click', sendInvite)

document.getElementById('invite-email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendInvite()
})

// ── Netlify Identity lifecycle ────────────────────────────────────────────────
netlifyIdentity.on('init', (user) => {
  if (!user) { showLogin(); return }
  if (user.app_metadata?.role !== 'admin') { showForbidden(); return }
  showAdmin(user)
})

netlifyIdentity.on('login', (user) => {
  netlifyIdentity.close()
  if (user.app_metadata?.role !== 'admin') { showForbidden(); return }
  showAdmin(user)
})

netlifyIdentity.on('logout', () => { showLogin() })
