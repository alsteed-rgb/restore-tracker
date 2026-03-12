/**
 * Customer portal data endpoint.
 *
 * Security model:
 *   1. Netlify validates the JWT automatically → event.clientContext.user
 *   2. companyId is read ONLY from user.app_metadata (set by admin, not the user)
 *   3. Every Autotask query has a hard-coded companyID = X filter — no exceptions
 *   4. The 'range' query param (30/60/90) is validated to an allowlist
 *
 * Returns all data needed for the portal dashboard in a single response.
 */

import { createAutotask } from '../../src/index.js'

const at = createAutotask({
  baseUrl:         process.env.AUTOTASK_BASE_URL,
  username:        process.env.AUTOTASK_USERNAME,
  integrationCode: process.env.AUTOTASK_INTEGRATION_CODE,
  secret:          process.env.AUTOTASK_SECRET,
})

const HEADERS = { 'Content-Type': 'application/json' }
const PRIORITY_LABEL = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' }
const PRIORITY_COLOR = { 1: '#dc2626', 2: '#ea580c', 3: '#2563eb', 4: '#6b7280' }
const ALLOWED_RANGES = [30, 60, 90]

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function diffDays(a, b) {
  return Math.abs(new Date(b) - new Date(a)) / 86_400_000
}

export const handler = async (event) => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const user = event.clientContext?.user
  if (!user) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const companyId = user.app_metadata?.companyId
  if (!companyId) {
    return {
      statusCode: 403,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Your account has not been configured yet. Please contact support.' }),
    }
  }

  // ── Validate range param ────────────────────────────────────────────────────
  const rangeParam = parseInt(event.queryStringParameters?.range ?? '30', 10)
  const range = ALLOWED_RANGES.includes(rangeParam) ? rangeParam : 30

  try {
    const cid           = Number(companyId)
    const ago90         = daysAgo(90)
    const ago180        = daysAgo(180)

    // ── Three parallel Autotask queries, all scoped to this company ────────────
    const [openTickets, recentClosed, trendTickets] = await Promise.all([

      // 1. All open tickets for this company
      at.client.query('Tickets', {
        filter: [
          { op: 'noteq', field: 'Status',    value: 5 },
          { op: 'eq',    field: 'CompanyID', value: cid },
        ],
        MaxRecords: 500,
        IncludeFields: [
          'id', 'ticketNumber', 'title', 'status',
          'priority', 'createDate', 'lastActivityDate',
        ],
      }),

      // 2. Closed tickets in the last 90 days (covers 30/60/90 range options)
      at.client.query('Tickets', {
        filter: [
          { op: 'eq',  field: 'Status',    value: 5 },
          { op: 'eq',  field: 'CompanyID', value: cid },
          { op: 'gte', field: 'CreateDate', value: ago90 },
        ],
        MaxRecords: 500,
        IncludeFields: ['id', 'priority', 'createDate', 'lastActivityDate'],
      }),

      // 3. All tickets created in last 6 months — for monthly volume chart
      at.client.query('Tickets', {
        filter: [
          { op: 'eq',  field: 'CompanyID', value: cid },
          { op: 'gte', field: 'CreateDate', value: ago180 },
        ],
        MaxRecords: 500,
        IncludeFields: ['id', 'createDate'],
      }),
    ])

    // ── Closed counts by range ────────────────────────────────────────────────
    const closedIn = (days) => {
      const cutoff = new Date(daysAgo(days))
      return recentClosed.filter(t => new Date(t.createDate) >= cutoff).length
    }

    // ── Average resolution time ───────────────────────────────────────────────
    // Uses lastActivityDate as proxy for resolution date (standard Autotask behaviour)
    const resolvable = recentClosed.filter(t => t.createDate && t.lastActivityDate)
    const avgResolutionDays = resolvable.length
      ? resolvable.reduce((s, t) => s + diffDays(t.createDate, t.lastActivityDate), 0) / resolvable.length
      : null

    // ── Priority breakdown (open tickets) ────────────────────────────────────
    const priorityCounts = {}
    for (const t of openTickets) {
      const k = t.priority ?? 0
      priorityCounts[k] = (priorityCounts[k] || 0) + 1
    }
    const byPriority = Object.entries(priorityCounts)
      .map(([id, count]) => ({
        id:    +id,
        label: PRIORITY_LABEL[id] ?? `P${id}`,
        color: PRIORITY_COLOR[id] ?? '#6b7280',
        count,
      }))
      .sort((a, b) => a.id - b.id)

    // ── Monthly volume (tickets opened per month, last 6 months) ─────────────
    const monthlyVolume = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const year  = d.getFullYear()
      const month = d.getMonth()
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const count = trendTickets.filter(t => {
        const c = new Date(t.createDate)
        return c.getFullYear() === year && c.getMonth() === month
      }).length
      monthlyVolume.push({ label, count })
    }

    // ── Trend: last 30d vs prior 30d ─────────────────────────────────────────
    const last30  = trendTickets.filter(t => new Date(t.createDate) >= new Date(daysAgo(30))).length
    const prior30 = trendTickets.filter(t => {
      const d = new Date(t.createDate)
      return d >= new Date(daysAgo(60)) && d < new Date(daysAgo(30))
    }).length
    const trendPct = prior30 === 0 ? 0 : Math.round(((last30 - prior30) / prior30) * 100)
    const trend    = trendPct < -5 ? 'down' : trendPct > 5 ? 'up' : 'stable'

    // ── Enrich open tickets for table ─────────────────────────────────────────
    const openOut = openTickets
      .map(t => ({
        ticketNumber: t.ticketNumber ?? String(t.id),
        title:        t.title ?? '—',
        status:       t.status,
        priority:     t.priority,
        ageDays:      Math.floor(diffDays(t.createDate, new Date().toISOString())),
      }))
      .sort((a, b) => a.priority - b.priority || b.ageDays - a.ageDays)

    // ── Closed tickets for selected range ─────────────────────────────────────
    const cutoff    = new Date(daysAgo(range))
    const closedOut = recentClosed
      .filter(t => new Date(t.createDate) >= cutoff)
      .map(t => ({
        ticketNumber:   t.ticketNumber ?? String(t.id),
        priority:       t.priority,
        resolutionDays: t.createDate && t.lastActivityDate
          ? Math.round(diffDays(t.createDate, t.lastActivityDate))
          : null,
        closedAt: t.lastActivityDate ?? null,
      }))
      .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        summary: {
          openCount:         openTickets.length,
          criticalOpen:      openTickets.filter(t => t.priority === 1).length,
          closedLast30:      closedIn(30),
          closedLast60:      closedIn(60),
          closedLast90:      closedIn(90),
          avgResolutionDays: avgResolutionDays !== null
            ? Math.round(avgResolutionDays * 10) / 10
            : null,
          trend,
          trendPct,
        },
        openTickets:   openOut,
        closedTickets: closedOut,
        byPriority,
        monthlyVolume,
        range,
        generatedAt: new Date().toISOString(),
      }),
    }
  } catch (err) {
    console.error('portal-data error:', err)
    return {
      statusCode: err.status ?? 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
