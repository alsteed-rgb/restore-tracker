import { createAutotask } from '../../src/index.js'

const at = createAutotask({
  baseUrl:         process.env.AUTOTASK_BASE_URL,
  username:        process.env.AUTOTASK_USERNAME,
  integrationCode: process.env.AUTOTASK_INTEGRATION_CODE,
  secret:          process.env.AUTOTASK_SECRET,
})

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' }

  try {
    const status = event.queryStringParameters?.status ?? 'open'

    // Status 5 = Complete in Autotask (adjust if your instance differs)
    const filter = status === 'open'
      ? [{ op: 'noteq', field: 'Status', value: 5 }]
      : [{ op: 'eq',    field: 'Status', value: 5 }]

    const items = await at.tickets.query({
      filter,
      MaxRecords: 50,
      IncludeFields: ['id', 'ticketNumber', 'title', 'status', 'priority', 'assignedResourceID', 'companyID', 'createDate', 'lastActivityDate'],
    })

    return { statusCode: 200, headers, body: JSON.stringify({ items }) }
  } catch (err) {
    console.error('Autotask error:', err)
    return {
      statusCode: err.status ?? 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
