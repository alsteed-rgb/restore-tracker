/**
 * Core Autotask REST API client.
 *
 * Handles authentication, request construction, pagination, and error handling.
 * All resource modules (tickets, configItems, etc.) are built on top of this.
 *
 * Autotask REST API docs:
 *   https://autotask.net/help/developerhelp/Content/APIs/REST/REST_API_Home.htm
 */
export class AutotaskClient {
  /**
   * @param {object} config
   * @param {string} config.baseUrl           - Zone-specific base URL, e.g.:
   *                                            https://webservices1.autotask.net/atservicesrest/v1.0
   *                                            Run scripts/getZone.js to find yours.
   * @param {string} config.username          - API user email/username
   * @param {string} config.integrationCode   - ApiIntegrationCode from Admin > Resources/Users > API Users
   * @param {string} config.secret            - API user password/secret
   */
  constructor({ baseUrl, username, integrationCode, secret }) {
    if (!baseUrl || !username || !integrationCode || !secret) {
      throw new Error(
        'AutotaskClient requires: baseUrl, username, integrationCode, secret.\n' +
        'Run "node scripts/getZone.js" to find your baseUrl.'
      )
    }
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.headers = {
      'Content-Type':       'application/json',
      'ApiIntegrationCode': integrationCode,
      'UserName':           username,
      'Secret':             secret,
    }
  }

  /** Execute a fetch and throw a descriptive error on non-2xx responses. */
  async _fetch(method, path, { params, body } = {}) {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    let payload
    try {
      payload = await res.json()
    } catch {
      payload = null
    }

    if (!res.ok) {
      const message = Array.isArray(payload?.errors)
        ? payload.errors.join(', ')
        : `HTTP ${res.status}`
      const err = new Error(`Autotask API [${method} ${path}]: ${message}`)
      err.status  = res.status
      err.payload = payload
      throw err
    }

    return payload
  }

  // ---------------------------------------------------------------------------
  // HTTP verbs
  // ---------------------------------------------------------------------------

  get(path, params)   { return this._fetch('GET',    path, { params }) }
  post(path, body)    { return this._fetch('POST',   path, { body }) }
  patch(path, body)   { return this._fetch('PATCH',  path, { body }) }
  put(path, body)     { return this._fetch('PUT',    path, { body }) }
  delete(path)        { return this._fetch('DELETE', path) }

  // ---------------------------------------------------------------------------
  // High-level query — POST /resource/query, auto-paginate via nextPageUrl
  //
  // Autotask query body shape:
  //   {
  //     filter:        [ { op, field, value }, ... ],  // required
  //     MaxRecords:    500,                             // optional, 1–500
  //     IncludeFields: ['Id', 'Title', ...],            // optional
  //   }
  //
  // OR expressions nest under an "items" array:
  //   { op: 'or', items: [ { op: 'eq', field: 'X', value: 1 }, ... ] }
  // ---------------------------------------------------------------------------

  /**
   * Query an Autotask entity and return all matching records, automatically
   * following pagination (each page ≤ 500 records).
   *
   * @param {string} resource - Entity name, e.g. 'Tickets', 'ConfigurationItems'
   * @param {object} queryBody - { filter, MaxRecords?, IncludeFields? }
   * @returns {Promise<object[]>}
   */
  async query(resource, queryBody) {
    const results = []

    // First page
    let payload = await this._fetch('POST', `/${resource}/query`, {
      body: { MaxRecords: 500, ...queryBody },
    })
    results.push(...(payload?.items ?? []))

    // Follow nextPageUrl until exhausted
    while (payload?.pageDetails?.nextPageUrl) {
      const nextUrl = payload.pageDetails.nextPageUrl
      // nextPageUrl is a full URL — fetch it directly
      const res = await fetch(nextUrl, { method: 'GET', headers: this.headers })
      payload = await res.json()
      results.push(...(payload?.items ?? []))
    }

    return results
  }

  /**
   * Fetch a single record by ID.
   * @param {string} resource
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
  async getById(resource, id) {
    const payload = await this.get(`/${resource}/${id}`)
    return payload?.item ?? null
  }

  /**
   * Create a new record.
   * @param {string} resource
   * @param {object} data
   * @returns {Promise<object>} The created item
   */
  async create(resource, data) {
    const payload = await this.post(`/${resource}`, data)
    return payload?.item ?? payload?.itemId ?? null
  }

  /**
   * Update an existing record (PATCH — only send changed fields).
   * @param {string} resource
   * @param {number|string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(resource, id, data) {
    const payload = await this.patch(`/${resource}`, { id, ...data })
    return payload?.item ?? null
  }

  /**
   * Replace an existing record (PUT — send all fields).
   * @param {string} resource
   * @param {number|string} id
   * @param {object} data
   */
  async replace(resource, id, data) {
    const payload = await this.put(`/${resource}`, { id, ...data })
    return payload?.item ?? null
  }

  /**
   * Delete a record by ID.
   * @param {string} resource
   * @param {number|string} id
   */
  async deleteById(resource, id) {
    return this.delete(`/${resource}/${id}`)
  }
}
