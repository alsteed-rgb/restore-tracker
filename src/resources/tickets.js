export class Tickets {
  constructor(client) {
    this.client = client
  }

  getById(id) {
    return this.client.getById('Tickets', id)
  }

  /**
   * Search tickets with an Autotask filter.
   * @example
   *   tickets.query({ filter: [{ field: 'Status', op: 'eq', value: 1 }] })
   */
  query(filter) {
    return this.client.query('Tickets', filter)
  }

  getByCompany(companyId) {
    return this.client.query('Tickets', {
      filter: [{ field: 'CompanyID', op: 'eq', value: companyId }],
    })
  }

  getOpenByResource(resourceId) {
    return this.client.query('Tickets', {
      filter: [
        { field: 'AssignedResourceID', op: 'eq', value: resourceId },
        { field: 'Status', op: 'noteq', value: 5 }, // 5 = Complete — adjust per instance
      ],
    })
  }

  /** @param {object} data - At minimum: { Title, CompanyID, Status, Priority, QueueID } */
  create(data) {
    return this.client.create('Tickets', data)
  }

  update(id, data) {
    return this.client.update('Tickets', id, data)
  }

  addNote(ticketId, { title, description, noteType = 1, publish = 1 }) {
    return this.client.create('TicketNotes', {
      TicketID: ticketId,
      Title: title,
      Description: description,
      NoteType: noteType,
      Publish: publish,
    })
  }
}
