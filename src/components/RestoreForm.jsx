import { useState } from 'react'
import { Modal, Field, Input, Select, Textarea, nowLocal } from './ui.jsx'
import { api } from '../api.js'

export function RestoreForm({ restore, devices, onSave, onClose }) {
  const editing = !!restore?.id
  const [f, setF] = useState({ device_id: '', result: 'Pending', technician: '', duration: '', notes: '', ...(restore || {}), date: restore?.date ? new Date(restore.date).toISOString().slice(0, 16) : nowLocal() })
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScreenshotFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <Modal title={editing ? 'Edit Restore Record' : 'Log Restore Test'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Device *" span2><Select value={f.device_id} onChange={(e) => set('device_id', e.target.value)}><option value="">— Select Device —</option>{devices.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.client})</option>)}</Select></Field>
        <Field label="Result"><Select value={f.result} onChange={(e) => set('result', e.target.value)}><option>Pending</option><option>Pass</option><option>Fail</option></Select></Field>
        <Field label="Date / Time"><Input type="datetime-local" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Technician"><Input value={f.technician} onChange={(e) => set('technician', e.target.value)} /></Field>
        <Field label="Duration"><Input value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 45m" /></Field>
        <Field label="Notes" span2><Textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <Field label="Screenshot" span2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ color: '#c9d1d9', fontSize: 13, cursor: 'pointer' }}
            />
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Screenshot preview"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, border: '1px solid #30363d', objectFit: 'contain' }}
              />
            )}
            {!previewUrl && restore?.hasScreenshot && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={api.screenshotUrl(restore.id)}
                  alt="Existing screenshot"
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, border: '1px solid #30363d', objectFit: 'contain' }}
                />
                <span style={{ fontSize: 12, color: '#8b949e' }}>Existing screenshot (upload a new one to replace)</span>
              </div>
            )}
          </div>
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!f.device_id} onClick={() => onSave({ ...f, date: f.date ? new Date(f.date).toISOString() : new Date().toISOString() }, screenshotFile)}>{editing ? 'Save Changes' : 'Log Restore'}</button>
      </div>
    </Modal>
  )
}
