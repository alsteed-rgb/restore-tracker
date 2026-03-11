export class ConfigurationItems {
  constructor(client) {
    this.client = client
  }

  getById(id) {
    return this.client.getById('ConfigurationItems', id)
  }

  query(filter) {
    return this.client.query('ConfigurationItems', filter)
  }

  getByCompany(companyId) {
    return this.client.query('ConfigurationItems', {
      filter: [{ field: 'CompanyID', op: 'eq', value: companyId }],
    })
  }

  getBySerialNumber(serialNumber) {
    return this.client.query('ConfigurationItems', {
      filter: [{ field: 'SerialNumber', op: 'eq', value: serialNumber }],
    })
  }

  create(data) {
    return this.client.create('ConfigurationItems', data)
  }

  update(id, data) {
    return this.client.update('ConfigurationItems', id, data)
  }
}
