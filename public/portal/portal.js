// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_LABEL = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' }
const PRIORITY_COLOR = { 1: '#dc2626', 2: '#ea580c', 3: '#2563eb', 4: '#6b7280' }
const STATUS_LABEL   = {
  1: 'New', 5: 'Complete', 8: 'In Progress', 9: 'Waiting Customer',
  11: 'Escalate', 12: 'Pending', 33: 'Assigned',
}

// ── State ─────────────────────────────────────────────────────────────────────
let currentRange   = 30
let chartVolume    = null
let chartPriority  = null
let portalData     = null

// ── Auth helpers ──────────────────────────────────────────────────────────────
function currentUser() { return netlifyIdentity.currentUser() }

async function getToken() {
  return currentUser().jwt()  // auto-refreshes
}

// ── View helpers ──────────────────────────────────────────────────────────────
function show(id) { document.getElementById(id).classList.remove('hidden') }
function hide(id) { document.getElementById(id).classList.add('hidden') }

function showLogin() {
  show('login-view')
  hide('dashboard-view')
}

function showDashboard(user) {
  hide('login-view')
  show('dashboard-view')
  document.getElementById('header-email').textContent = user.email
  loadData()
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function loadData(range = currentRange, bust = false) {
  try {
    const token = await getToken()
    const url   = `/api/portal-data?range=${range}${bust ? '&bust=1' : ''}`
    const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data  = await res.json()

    if (!res.ok) {
      // Show friendly error in summary section
      document.getElementById('summary-headline').textContent = data.error ?? 'Failed to load data.'
      document.getElementById('summary-trend').textContent = ''
      return
    }

    portalData   = data
    currentRange = range
    renderAll(data)
  } catch (err) {
    document.getElementById('summary-headline').textContent = `Error: ${err.message}`
  }
}

// ── Render everything ─────────────────────────────────────────────────────────
function renderAll(data) {
  renderSummary(data)
  renderStatCards(data)
  renderVolumeChart(data)
  renderPriorityChart(data)
  renderOpenTable(data)
  renderClosedTable(data)
  updateRangePicker(data.range)
}

// ── Executive Summary ─────────────────────────────────────────────────────────
function renderSummary(data) {
  const { summary } = data
  const { openCount, criticalOpen, avgResolutionDays, trend, trendPct } = summary

  // Headline
  const parts = [`${openCount} open ticket${openCount !== 1 ? 's' : ''}`]
  if (criticalOpen > 0) parts.push(`${criticalOpen} critical`)
  if (avgResolutionDays !== null) {
    parts.push(`avg resolution ${avgResolutionDays}d`)
  }
  document.getElementById('summary-headline').textContent = parts.join('  ·  ')

  // Trend line
  const trendEl = document.getElementById('summary-trend')
  if (trendPct === 0 || trend === 'stable') {
    trendEl.textContent  = 'Ticket volume stable vs prior 30 days'
    trendEl.className    = 'summary-trend'
  } else {
    const arrow    = trend === 'down' ? '↓' : '↑'
    const pct      = Math.abs(trendPct)
    const dir      = trend === 'down' ? 'fewer' : 'more'
    trendEl.textContent = `${arrow} ${pct}% ${dir} tickets opened vs prior 30 days`
    trendEl.className   = `summary-trend ${trend === 'down' ? 'trend-down' : 'trend-up'}`
  }

  // Updated timestamp
  document.getElementById('summary-updated').textContent =
    `Last updated ${fmtDateTime(data.generatedAt)}`
}

// ── Stat cards ────────────────────────────────────────────────────────────────
const STAT_COLORS = { open: '#1d4ed8', critical: '#dc2626', closed: '#16a34a', avg: '#7c3aed' }

function renderStatCards(data) {
  const { summary } = data
  const closed = summary[`closedLast${currentRange}`] ?? 0
  const avg    = summary.avgResolutionDays

  const cards = [
    { value: summary.openCount,   label: 'Open Tickets',      color: STAT_COLORS.open },
    { value: summary.criticalOpen, label: 'Critical Open',    color: STAT_COLORS.critical },
    { value: closed,               label: `Closed (${currentRange}d)`, color: STAT_COLORS.closed },
    { value: avg !== null ? `${avg}d` : '—', label: 'Avg Resolution', color: STAT_COLORS.avg },
  ]

  document.getElementById('stat-cards').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-value" style="color:${c.color}">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>
  `).join('')
}

// ── Monthly volume chart ──────────────────────────────────────────────────────
function renderVolumeChart(data) {
  const labels = data.monthlyVolume.map(m => m.label)
  const counts = data.monthlyVolume.map(m => m.count)

  if (chartVolume) chartVolume.destroy()

  chartVolume = new Chart(document.getElementById('chart-volume'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Tickets opened',
        data:  counts,
        backgroundColor: '#3b82f6',
        borderRadius:    4,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11 } } },
        y: {
          grid:  { color: 'rgba(0,0,0,.04)' },
          ticks: { font: { size: 11 }, stepSize: 1, precision: 0 },
          beginAtZero: true,
        },
      },
    },
  })
}

// ── Priority donut chart ──────────────────────────────────────────────────────
function renderPriorityChart(data) {
  if (!data.byPriority.length) {
    document.getElementById('chart-priority').parentElement.innerHTML =
      '<div class="tbl-empty">No open tickets</div>'
    return
  }

  if (chartPriority) chartPriority.destroy()

  chartPriority = new Chart(document.getElementById('chart-priority'), {
    type: 'doughnut',
    data: {
      labels:   data.byPriority.map(p => p.label),
      datasets: [{
        data:            data.byPriority.map(p => p.count),
        backgroundColor: data.byPriority.map(p => p.color),
        borderWidth:     2,
        borderColor:     '#fff',
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '60%',
      plugins: {
        legend: {
          position: 'right',
          labels:   { boxWidth: 12, font: { size: 12 }, padding: 12 },
        },
      },
    },
  })
}

// ── Open tickets table ────────────────────────────────────────────────────────
function renderOpenTable(data) {
  const wrap = document.getElementById('open-table-wrap')

  if (!data.openTickets.length) {
    wrap.innerHTML = '<div class="tbl-empty">No open tickets — great work!</div>'
    return
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Ticket</th>
          <th>Title</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Age</th>
        </tr>
      </thead>
      <tbody>
        ${data.openTickets.map(t => `
          <tr>
            <td class="col-ticket">${escHtml(t.ticketNumber)}</td>
            <td class="col-title">${escHtml(t.title)}</td>
            <td>${priorityBadge(t.priority)}</td>
            <td><span style="color:var(--muted)">${STATUS_LABEL[t.status] ?? `Status ${t.status}`}</span></td>
            <td class="col-age">${t.ageDays}d</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

// ── Closed tickets table ──────────────────────────────────────────────────────
function renderClosedTable(data) {
  const wrap = document.getElementById('closed-table-wrap')
  document.getElementById('closed-header').textContent =
    `Closed in Last ${currentRange} Days`

  if (!data.closedTickets.length) {
    wrap.innerHTML = '<div class="tbl-empty">No closed tickets in this period.</div>'
    return
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Ticket</th>
          <th>Priority</th>
          <th>Resolution</th>
          <th>Closed</th>
        </tr>
      </thead>
      <tbody>
        ${data.closedTickets.map(t => `
          <tr>
            <td class="col-ticket">${escHtml(t.ticketNumber)}</td>
            <td>${priorityBadge(t.priority)}</td>
            <td class="col-age">${t.resolutionDays !== null ? `${t.resolutionDays}d` : '—'}</td>
            <td class="col-age">${fmtDate(t.closedAt)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

// ── Range picker ──────────────────────────────────────────────────────────────
function updateRangePicker(range) {
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.range) === range)
  })
}

document.querySelectorAll('.range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const r = Number(btn.dataset.range)
    if (r === currentRange || !portalData) return
    currentRange = r
    updateRangePicker(r)
    // Re-render data-dependent sections without a new fetch
    renderStatCards(portalData)
    renderClosedTable({ ...portalData, range: r, closedTickets: filterClosed(portalData, r) })
    document.getElementById('closed-header').textContent = `Closed in Last ${r} Days`
  })
})

// Filter already-fetched recentClosed to the requested range
// (portalData.closedTickets is pre-filtered server-side for the initial range;
//  for live range switching we use the full 90d set if available)
function filterClosed(data, range) {
  // The function already returns all closed tickets within 90d
  // re-requesting at the new range ensures accurate data
  loadData(range)
  return data.closedTickets   // temporary; loadData will replace it
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function priorityBadge(p) {
  const label = PRIORITY_LABEL[p] ?? `P${p ?? '?'}`
  const color = PRIORITY_COLOR[p] ?? '#6b7280'
  return `<span class="badge" style="background:${color}">${label}</span>`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', () => {
  netlifyIdentity.open('login')
})

document.getElementById('logout-btn').addEventListener('click', () => {
  netlifyIdentity.logout()
})

// ── Netlify Identity lifecycle ────────────────────────────────────────────────
netlifyIdentity.on('init', (user) => {
  if (user) showDashboard(user)
  else      showLogin()
})

netlifyIdentity.on('login', (user) => {
  netlifyIdentity.close()
  showDashboard(user)
})

netlifyIdentity.on('logout', () => showLogin())
