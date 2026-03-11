/**
 * Example: working with Autotask Configuration Items (devices/assets).
 *
 * 1. Copy .env.example to .env and fill in your credentials.
 * 2. Run: node scripts/getZone.js   to find your AUTOTASK_BASE_URL.
 * 3. Run: node examples/configItems.js
 */
import 'dotenv/config'
import { createAutotaskFromEnv } from '../src/index.js'

const { configItems } = createAutotaskFromEnv()

// --- Fetch a config item by ID ---
const item = await configItems.getById(99999) // replace with a real ID
console.log('Config Item:', item)

// --- Find all devices for a company ---
const companyDevices = await configItems.getByCompany(12345) // replace with real CompanyID
console.log(`Devices for company: ${companyDevices.length}`)

// --- Look up a device by serial number ---
const matches = await configItems.getBySerialNumber('ABC123XYZ')
console.log('Device by serial:', matches[0])
