// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_LABEL = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' }
const PRIORITY_COLOR = { 1: '#ff5630', 2: '#ff8b00', 3: '#0052cc', 4: '#6b778c' }

// Common Autotask status IDs — adjust values for your instance if needed
const STATUS_LABEL = {
  1:  'New',
  5:  'Complete',
  8:  'In Progress',
  9:  'Waiting Customer',
  11: 'Escalate',
  12: 'Pending Approval',
  29: 'Customer Note',
  33: 'Assigned',
}

const PALETTE = [
  '#0052cc', '#36b37e', '#ff8b00', '#6554c0',
  '#00b8d9', '#ff5630', '#ffab00', '#4c9aff',
  '#57d9a3', '#ff7452',
]

// ── Widget Registry ────────────────────────────────────────────────────────────
//
// type: 'stat' | 'bar' | 'hbar' | 'donut' | 'table'
// cols: grid column span (1–4)
//
const WIDGETS = [
  // ── Stat cards ────────────────────────────────────────────────────────────
  {
    id: 'stat-open',
    title: 'Open Tickets',
    type: 'stat',
    cols: 1,
    color: '#0052cc',
    get: s => s.tickets.open,
  },
  {
    id: 'stat-companies',
    title: 'Active Companies',
    type: 'stat',
    cols: 1,
    color: '#36b37e',
    get: s => s.companies.active,
  },
  {
    id: 'stat-ci',
    title: 'Config Items',
    type: 'stat',
    cols: 1,
    color: '#6554c0',
    get: s => s.configItems.total,
  },
  {
    id: 'stat-techs',
    title: 'Active Technicians',
    type: 'stat',
    cols: 1,
    color: '#ff8b00',
    get: s => s.resources.active,
  },

  // ── Charts ────────────────────────────────────────────────────────────────
  {
    id: 'chart-priority',
    title: 'Tickets by Priority',
    type: 'bar',
    cols: 2,
    labels: s => s.tickets.byPriority.map(x => PRIORITY_LABEL[x.id] ?? `Priority ${x.id}`),
    values: s => s.tickets.byPriority.map(x => x.count),
    colors: s => s.tickets.byPriority.map(x => PRIORITY_COLOR[x.id] ?? '#6b778c'),
  },
  {
    id: 'chart-status',
    title: 'Tickets by Status',
    type: 'donut',
    cols: 2,
    labels: s => s.tickets.byStatus.map(x => STATUS_LABEL[x.id] ?? `Status ${x.id}`),
    values: s => s.tickets.byStatus.map(x => x.count),
    colors: s => s.tickets.byStatus.map((_, i) => PALETTE[i % PALETTE.length]),
  },
  {
    id: 'chart-company',
    title: 'Top Companies (Open Tickets)',
    type: 'hbar',
    cols: 2,
    labels: s => s.tickets.byCompany.map(x => trunc(x.name, 22)),
    values: s => s.tickets.byCompany.map(x => x.count),
    colors: _ => PALETTE,
  },
  {
    id: 'chart-resource',
    title: 'Workload by Technician',
    type: 'hbar',
    cols: 2,
    labels: s => s.tickets.byResource.map(x => trunc(x.name, 22)),
    values: s => s.tickets.byResource.map(x => x.count),
    colors: _ => PALETTE,
  },
  {
    id: 'chart-ci-type',
    title: 'Config Items by Type',
    type: 'donut',
    cols: 2,
    labels: s => s.configItems.byType.map(x =>
      x.id === 'Unassigned' ? 'Unknown' : `Type ${x.id}`
    ),
    values: s => s.configItems.byType.map(x => x.count),
    colors: s => s.configItems.byType.map((_, i) => PALETTE[i % PALETTE.length]),
  },
  {
    id: 'chart-queue',
    title: 'Tickets by Queue',
    type: 'bar',
    cols: 2,
    labels: s => s.tickets.byQueue.map(x =>
      x.id === 'Unassigned' ? 'None' : `Queue ${x.id}`
    ),
    values: s => s.tickets.byQueue.map(x => x.count),
    colors: _ => PALETTE,
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  {
    id: 'table-recent',
    title: 'Recent Open Tickets',
    type: 'table',
    cols: 4,
    columns: ['Ticket #', 'Title', 'Priority', 'Company', 'Created'],
    rows: s => s.tickets.recent.map(t => [
      `<span class="ticket-num">${t.ticketNumber ?? t.id}</span>`,
      trunc(t.title ?? '—', 60),
      priorityBadge(t.priority),
      trunc(t.companyName || '—', 30),
      fmtDate(t.createDate),
    ]),
  },
]

// ── Config (persisted to localStorage) ────────────────────────────────────────

const CONFIG_KEY = 'autotask-dashboard-v1'

function defaultConfig() {
  return {
    order:  WIDGETS.map(w => w.id),
    hidden: {},
  }
}

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null')
    if (!saved) return defaultConfig()
    // Merge in any newly added widgets that weren't in the saved order
    const newIds = WIDGETS.map(w => w.id).filter(id => !saved.order.includes(id))
    return {
      order:  [...saved.order.filter(id => WIDGETS.some(w => w.id === id)), ...newIds],
      hidden: saved.hidden ?? {},
    }
  } catch {
    return defaultConfig()
  }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

// ── State ──────────────────────────────────────────────────────────────────────
let stats        = null
let config       = loadConfig()
let pendingCfg   = null      // draft while customize panel is open
let chartMap     = {}        // Chart.js instances keyed by widget id
let customSort   = null      // SortableJS instance

// ── Helpers ────────────────────────────────────────────────────────────────────
function trunc(str, n) {
  return str && str.length > n ? str.slice(0, n - 1) + '…' : str
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function priorityBadge(p) {
  const label = PRIORITY_LABEL[p] ?? `P${p ?? '?'}`
  const color = PRIORITY_COLOR[p] ?? '#6b778c'
  return `<span class="badge" style="background:${color};color:#fff">${label}</span>`
}

// ── Data fetching ──────────────────────────────────────────────────────────────
async function fetchStats(bust = false) {
  const url = '/api/stats' + (bust ? '?bust=1' : '')
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Widget HTML rendering ──────────────────────────────────────────────────────
function widgetHTML(w) {
  if (w.type === 'stat') {
    const value = stats ? w.get(stats) : '—'
    return `
      <div class="widget widget-stat" data-cols="${w.cols}" data-id="${w.id}">
        <div class="stat-value" style="color:${w.color}">${value}</div>
        <div class="stat-label">${w.title}</div>
      </div>`
  }

  if (w.type === 'table') {
    const rows = stats ? w.rows(stats) : []
    const inner = !stats
      ? `<div class="widget-loading">Loading</div>`
      : rows.length === 0
        ? `<div class="empty">No tickets found</div>`
        : `<div class="table-wrap">
            <table>
              <thead><tr>${w.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
              <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>`
    return `
      <div class="widget widget-table" data-cols="${w.cols}" data-id="${w.id}">
        <div class="widget-header"><h3>${w.title}</h3></div>
        ${inner}
      </div>`
  }

  // bar / hbar / donut
  const extraClass = w.type === 'hbar' ? ' hbar' : ''
  const inner = !stats
    ? `<div class="widget-loading">Loading</div>`
    : `<div class="chart-wrap"><canvas id="canvas-${w.id}"></canvas></div>`

  return `
    <div class="widget widget-chart${extraClass}" data-cols="${w.cols}" data-id="${w.id}">
      <div class="widget-header"><h3>${w.title}</h3></div>
      ${inner}
    </div>`
}

// ── Chart initialization ───────────────────────────────────────────────────────
function initChart(w) {
  if (!stats) return
  const canvas = document.getElementById(`canvas-${w.id}`)
  if (!canvas) return

  const labels = w.labels(stats)
  const values = w.values(stats)
  const colors = w.colors(stats)

  if (!values.length) {
    canvas.parentElement.innerHTML = '<div class="empty">No data</div>'
    return
  }

  const bgColors = Array.isArray(colors)
    ? values.map((_, i) => colors[i % colors.length])
    : colors

  if (w.type === 'donut') {
    chartMap[w.id] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 12, font: { size: 12 }, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / values.reduce((a,b) => a+b,0) * 100)}%)`,
            },
          },
        },
        cutout: '60%',
      },
    })
    return
  }

  // bar / hbar
  chartMap[w.id] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: w.type === 'hbar' ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid:  { color: 'rgba(0,0,0,.04)' },
          ticks: { font: { size: 11 }, maxRotation: 0 },
        },
        y: {
          grid:  { color: 'rgba(0,0,0,.04)' },
          ticks: { font: { size: 11 } },
        },
      },
    },
  })
}

function destroyCharts() {
  Object.values(chartMap).forEach(c => c.destroy())
  chartMap = {}
}

// ── Dashboard rendering ────────────────────────────────────────────────────────
function renderDashboard() {
  const el = document.getElementById('dashboard')

  destroyCharts()

  const visible = config.order
    .map(id => WIDGETS.find(w => w.id === id))
    .filter(w => w && !config.hidden[w.id])

  el.innerHTML = visible.map(widgetHTML).join('')

  if (stats) {
    visible.forEach(w => {
      if (w.type === 'bar' || w.type === 'hbar' || w.type === 'donut') {
        initChart(w)
      }
    })
    document.getElementById('last-updated').textContent =
      `Updated ${fmtDateTime(stats.generatedAt)}`
  }
}

// ── Customize panel ────────────────────────────────────────────────────────────
function openCustomize() {
  pendingCfg = { order: [...config.order], hidden: { ...config.hidden } }
  renderCustomizeList()
  document.getElementById('customize-panel').classList.add('open')
  document.getElementById('customize-overlay').classList.add('open')
}

function closeCustomize() {
  pendingCfg = null
  document.getElementById('customize-panel').classList.remove('open')
  document.getElementById('customize-overlay').classList.remove('open')
}

function renderCustomizeList() {
  const ul = document.getElementById('widget-list')

  ul.innerHTML = pendingCfg.order
    .map(id => {
      const w = WIDGETS.find(x => x.id === id)
      if (!w) return ''
      const checked = !pendingCfg.hidden[id]
      return `
        <li data-id="${id}">
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <span class="widget-name">${w.title}</span>
          <label class="toggle" title="${checked ? 'Hide' : 'Show'}">
            <input type="checkbox" ${checked ? 'checked' : ''} data-id="${id}" />
            <span class="toggle-track"></span>
          </label>
        </li>`
    })
    .join('')

  // Drag-to-reorder via SortableJS
  if (customSort) customSort.destroy()
  customSort = Sortable.create(ul, {
    handle:    '.drag-handle',
    animation: 150,
    onEnd: () => {
      pendingCfg.order = [...ul.querySelectorAll('li')].map(li => li.dataset.id)
    },
  })

  // Toggle visibility checkboxes
  ul.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      pendingCfg.hidden[cb.dataset.id] = !cb.checked
    })
  })
}

function applyCustomize() {
  config = { ...pendingCfg }
  saveConfig(config)
  closeCustomize()
  renderDashboard()
}

// ── Event listeners ────────────────────────────────────────────────────────────
function setupListeners() {
  const refreshBtn = document.getElementById('refresh-btn')
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true
    refreshBtn.textContent = 'Refreshing…'
    try {
      stats = await fetchStats(true)
      renderDashboard()
    } catch (err) {
      showToast(`Refresh failed: ${err.message}`, true)
    } finally {
      refreshBtn.disabled = false
      refreshBtn.textContent = 'Refresh'
    }
  })

  document.getElementById('customize-btn').addEventListener('click', openCustomize)
  document.getElementById('close-customize').addEventListener('click', closeCustomize)
  document.getElementById('customize-overlay').addEventListener('click', closeCustomize)
  document.getElementById('save-customize').addEventListener('click', applyCustomize)
  document.getElementById('cancel-customize').addEventListener('click', closeCustomize)
}

// ── Toast notification ─────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const existing = document.getElementById('toast')
  if (existing) existing.remove()

  const el = document.createElement('div')
  el.id = 'toast'
  el.textContent = msg
  Object.assign(el.style, {
    position:     'fixed',
    bottom:       '1.5rem',
    left:         '50%',
    transform:    'translateX(-50%)',
    background:   isError ? '#bf2600' : '#172b4d',
    color:        '#fff',
    padding:      '0.625rem 1.25rem',
    borderRadius: '6px',
    fontSize:     '0.875rem',
    zIndex:       '999',
    boxShadow:    '0 4px 12px rgba(0,0,0,.2)',
  })
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 4000)
}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  renderDashboard()   // render skeleton with loading spinners
  setupListeners()

  try {
    stats = await fetchStats()
    renderDashboard()
  } catch (err) {
    document.getElementById('dashboard').innerHTML = `
      <div class="global-error">
        <strong>Failed to load dashboard data.</strong><br>
        ${err.message}<br><br>
        Make sure your <code>.env</code> credentials are correct
        and the Netlify dev server is running.
      </div>`
  }
}

init()
