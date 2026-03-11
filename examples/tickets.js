/**
 * Example: working with Autotask Tickets.
 *
 * 1. Copy .env.example to .env and fill in your credentials.
 * 2. Run: node scripts/getZone.js   to find your AUTOTASK_BASE_URL.
 * 3. Run: node examples/tickets.js
 */
import 'dotenv/config'
import { createAutotaskFromEnv } from '../src/index.js'

const { tickets } = createAutotaskFromEnv()

// --- Fetch a ticket by ID ---
const ticket = await tickets.getById(12345)
console.log('Ticket:', ticket)

// --- Search for open tickets ---
const openTickets = await tickets.query({
  filter: [{ op: 'noteq', field: 'Status', value: 5 }], // 5 = Complete; adjust per instance
})
console.log(`Open tickets: ${openTickets.length}`)

// --- Create a ticket ---
const newTicket = await tickets.create({
  Title:     'Test ticket from API',
  CompanyID: 0,  // replace with a real CompanyID
  Status:    1,  // replace with your "New" status picklist value
  Priority:  2,  // replace with your priority picklist value
  QueueID:   0,  // replace with a real QueueID
})
console.log('Created ticket ID:', newTicket?.id)

// --- Add a note ---
if (newTicket?.id) {
  await tickets.addNote(newTicket.id, {
    title:       'Automated note',
    description: 'This note was added via the API.',
  })
  console.log('Note added.')
}
