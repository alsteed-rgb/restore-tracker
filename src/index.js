import { AutotaskClient } from './client.js'
import { Tickets } from './resources/tickets.js'
import { ConfigurationItems } from './resources/configItems.js'
import { Companies } from './resources/companies.js'

export { AutotaskClient, Tickets, ConfigurationItems, Companies }

/**
 * Create a fully configured Autotask API instance from environment variables.
 *
 * Requires in .env (or environment):
 *   AUTOTASK_BASE_URL        — zone URL (run scripts/getZone.js to find it)
 *   AUTOTASK_USERNAME        — API user email
 *   AUTOTASK_INTEGRATION_CODE
 *   AUTOTASK_SECRET
 *
 * @returns {{ client, tickets, configItems, companies }}
 */
export function createAutotaskFromEnv() {
  return createAutotask({
    baseUrl:         process.env.AUTOTASK_BASE_URL,
    username:        process.env.AUTOTASK_USERNAME,
    integrationCode: process.env.AUTOTASK_INTEGRATION_CODE,
    secret:          process.env.AUTOTASK_SECRET,
  })
}

/**
 * Create a fully configured Autotask API instance with explicit config.
 *
 * @param {{ baseUrl, username, integrationCode, secret }} config
 * @returns {{ client, tickets, configItems, companies }}
 */
export function createAutotask(config) {
  const client = new AutotaskClient(config)
  return {
    client,
    tickets:     new Tickets(client),
    configItems: new ConfigurationItems(client),
    companies:   new Companies(client),
  }
}
