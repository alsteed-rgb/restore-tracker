export class Companies {
  constructor(client) {
    this.client = client
  }

  getById(id) {
    return this.client.getById('Companies', id)
  }

  query(filter) {
    return this.client.query('Companies', filter)
  }

  getByName(name) {
    return this.client.query('Companies', {
      filter: [{ field: 'CompanyName', op: 'contains', value: name }],
    })
  }

  create(data) {
    return this.client.create('Companies', data)
  }

  update(id, data) {
    return this.client.update('Companies', id, data)
  }
}
