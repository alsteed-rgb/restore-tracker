/**
 * Looks up the correct Autotask API zone URL for a given user email.
 *
 * This does NOT require authentication — run it once to find your base URL,
 * then put that URL in your .env as AUTOTASK_BASE_URL.
 *
 * Usage:
 *   node scripts/getZone.js
 *   node scripts/getZone.js user@example.com
 */
import 'dotenv/config'

const email = process.argv[2] ?? process.env.AUTOTASK_USERNAME

if (!email) {
  console.error('Usage: node scripts/getZone.js <email>  OR set AUTOTASK_USERNAME in .env')
  process.exit(1)
}

const url = `https://webservices.autotask.net/atservicesrest/v1.0/zoneInformation?user=${encodeURIComponent(email)}`
console.log(`Looking up zone for: ${email}\n`)

const res = await fetch(url)
if (!res.ok) {
  console.error(`Failed: HTTP ${res.status}`)
  process.exit(1)
}

const data = await res.json()
console.log('Full response:', JSON.stringify(data, null, 2))
console.log('\n--- Set this in your .env ---')
console.log(`AUTOTASK_BASE_URL=${data.url ?? data.webUrl}`)
