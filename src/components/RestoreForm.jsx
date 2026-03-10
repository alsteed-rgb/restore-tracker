import { useState } from 'react'
import { Modal, Field, Input, Select, Textarea, nowLocal } from './ui.jsx'

export function RestoreForm({ restore, devices, onSave, onClose }) {
  const editing = !!restore?.id
  const [f, setF] = useState({ device_id: '', result: 'Pending', technician: '', duration: '', notes: '', ...(restore || {}), date: restore?.date ? new Date(restore.date).toISOString().slice(0, 16) : nowLocal() })
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  return (
    <Modal title={editing ? 'Edit Restore Record' : 'Log Restore Test'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Device *" span2><Select value={f.device_id} onChange={(e) => set('device_id', e.target.value)}><option value="">— Select Device —</option>{devices.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.client})</option>)}</Select></Field>
        <Field label="Result"><Select value={f.result} onChange={(e) => set('result', e.target.value)}><option>Pending</option><option>Pass</option><option>Fail</option></Select></Field>
        <Field label="Date / Time"><Input type="datetime-local" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Technician"><Input value={f.technician} onChange={(e) => set('technician', e.target.value)} /></Field>
        <Field label="Duration"><Input value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 45m" /></Field>
        <Field label="Notes" span2><Textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!f.device_id} onClick={() => onSave({ ...f, date: f.date ? new Date(f.date).toISOString() : new Date().toISOString() })}>{editing ? 'Save Changes' : 'Log Restore'}</button>
      </div>
    </Modal>
  )
                                                                               }
