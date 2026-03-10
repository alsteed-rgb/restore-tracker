import { useState } from 'react'
import { Modal, Field, Input, Select, Textarea, DEVICE_TYPES, OS_LIST } from './ui.jsx'

export function DeviceForm({ device, onSave, onClose }) {
  const editing = !!device?.id
  const [f, setF] = useState({ name: '', client: '', type: '', os: '', ip: '', site: '', technician: '', notes: '', ...(device || {}) })
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  return (
    <Modal title={editing ? 'Edit Device' : 'Register Device'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Device Name *"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="SRV-DC01" /></Field>
        <Field label="Client *"><Input value={f.client} onChange={(e) => set('client', e.target.value)} placeholder="Acme Corp" /></Field>
        <Field label="Device Type"><Select value={f.type} onChange={(e) => set('type', e.target.value)}><option value="">— Select —</option>{DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="OS / Platform"><Select value={f.os} onChange={(e) => set('os', e.target.value)}><option value="">— Select —</option>{OS_LIST.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="IP Address"><Input value={f.ip} onChange={(e) => set('ip', e.target.value)} placeholder="192.168.1.10" /></Field>
        <Field label="Location / Site"><Input value={f.site} onChange={(e) => set('site', e.target.value)} placeholder="HQ / US-East" /></Field>
        <Field label="Assigned Technician"><Input value={f.technician} onChange={(e) => set('technician', e.target.value)} /></Field>
        <Field label="Notes" span2><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!f.name || !f.client} onClick={() => onSave(f)}>{editing ? 'Save Changes' : 'Register Device'}</button>
      </div>
    </Modal>
  )
}
