import { createAutotask } from '../../src/index.js'

const at = createAutotask({
  baseUrl:         process.env.AUTOTASK_BASE_URL,
  username:        process.env.AUTOTASK_USERNAME,
  integrationCode: process.env.AUTOTASK_INTEGRATION_CODE,
  secret:          process.env.AUTOTASK_SECRET,
})

// In-memory cache — 5 min TTL (Netlify functions are stateless per cold start,
// but warm instances will reuse this across requests within the same instance)
let _cache = null
let _cacheAt = 0
const TTL = 5 * 60 * 1000

/** Count occurrences of each value for arr[key], return top-10 sorted desc. */
function tally(arr, key, nullLabel = 'Unassigned') {
  const map = {}
  for (const item of arr) {
    const k = item[key] ?? nullLabel
    map[k] = (map[k] || 0) + 1
  }
  return Object.entries(map)
    .map(([id, count]) => ({ id: (!isNaN(id) && id !== nullLabel) ? +id : id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
  }

  const bust = event.queryStringParameters?.bust === '1'
  if (!bust && _cache && Date.now() - _cacheAt < TTL) {
    return { statusCode: 200, headers, body: _cache }
  }

  try {
    // Fetch all four entity types in parallel
    const [tickets, companies, configItems, resources] = await Promise.all([
      at.client.query('Tickets', {
        filter: [{ op: 'noteq', field: 'Status', value: 5 }],
        MaxRecords: 500,
        IncludeFields: [
          'id', 'ticketNumber', 'title', 'status', 'priority',
          'queueID', 'companyID', 'assignedResourceID', 'createDate',
        ],
      }),
      at.client.query('Companies', {
        filter: [{ op: 'eq', field: 'IsActive', value: true }],
        MaxRecords: 500,
        IncludeFields: ['id', 'companyName'],
      }),
      at.client.query('ConfigurationItems', {
        filter: [{ op: 'eq', field: 'IsActive', value: true }],
        MaxRecords: 500,
        IncludeFields: ['id', 'configurationItemType', 'companyID'],
      }),
      at.client.query('Resources', {
        filter: [{ op: 'eq', field: 'IsActive', value: true }],
        MaxRecords: 500,
        IncludeFields: ['id', 'firstName', 'lastName'],
      }),
    ])

    // Lookup maps for enriching ticket data
    const companyMap = Object.fromEntries(
      companies.map(c => [c.id, c.companyName || `Co.${c.id}`])
    )
    const resourceMap = Object.fromEntries(
      resources.map(r => [r.id, `${r.firstName || ''} ${r.lastName || ''}`.trim() || `Res.${r.id}`])
    )

    // Enrich byCompany / byResource tallies with display names
    const byCompany = tally(tickets, 'companyID').map(x => ({
      ...x,
      name: x.id === 'Unassigned' ? 'Unassigned' : (companyMap[x.id] || `Co.${x.id}`),
    }))
    const byResource = tally(tickets, 'assignedResourceID').map(x => ({
      ...x,
      name: x.id === 'Unassigned' ? 'Unassigned' : (resourceMap[x.id] || `Res.${x.id}`),
    }))

    // 10 most-recently-created open tickets
    const recent = [...tickets]
      .sort((a, b) => new Date(b.createDate) - new Date(a.createDate))
      .slice(0, 10)
      .map(t => ({ ...t, companyName: companyMap[t.companyID] || '' }))

    const body = JSON.stringify({
      generatedAt: new Date().toISOString(),
      tickets: {
        open:       tickets.length,
        byPriority: tally(tickets, 'priority'),
        byStatus:   tally(tickets, 'status'),
        byQueue:    tally(tickets, 'queueID'),
        byCompany,
        byResource,
        recent,
      },
      companies:   { active: companies.length },
      configItems: { total: configItems.length, byType: tally(configItems, 'configurationItemType') },
      resources:   { active: resources.length },
    })

    _cache = body
    _cacheAt = Date.now()
    return { statusCode: 200, headers, body }
  } catch (err) {
    console.error('Stats error:', err)
    return {
      statusCode: err.status || 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
