import { useState } from 'react'
import { Badge, Input, Select, TableHeader, EmptyState, fmt } from './ui.jsx'
import { api } from '../api.js'

export function RestoreLog({ restores, devices, search, setSearch, filterStatus, setFilterStatus, filterClient, setFilterClient, onEdit, onDelete, onAdd }) {
  const [lightbox, setLightbox] = useState(null)
  const clients = ['All', ...new Set(devices.map((d) => d.client).filter(Boolean))]
  const filtered = restores
    .filter((r) => {
      const dev = devices.find((d) => d.id === r.device_id)
      const q = search.toLowerCase()
      return (filterStatus === 'All' || r.result === filterStatus) && (filterClient === 'All' || dev?.client === filterClient) && (!q || dev?.name?.toLowerCase().includes(q) || r.technician?.toLowerCase().includes(q) || r.notes?.toLowerCase().includes(q))
    })
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>{clients.map((c) => <option key={c}>{c}</option>)}</Select>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Pass', 'Fail', 'Pending'].map((s) => (<button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid', borderColor: filterStatus === s ? '#38bdf8' : '#334155', background: filterStatus === s ? '#0f3d56' : 'transparent', color: filterStatus === s ? '#38bdf8' : '#94a3b8', fontSize: 12, cursor: 'pointer' }}>{s}</button>))}
          </div>
        </div>
        <button className="btn-primary" onClick={onAdd}>+ Log Restore</button>
      </div>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHeader cols={['Date / Time', 'Device', 'Client', 'Result', 'Technician', 'Duration', 'Notes', 'Screenshot', '']} />
          <tbody>
            {filtered.length === 0 ? <EmptyState message="No records found." /> : filtered.map((r) => {
              const dev = devices.find((d) => d.id === r.device_id)
              return (
                <tr key={r.id} className="row-hover" style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{fmt(r.date)}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}><button className="btn-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', fontSize: 13, padding: 0 }} onClick={() => dev && onEdit && false}>{dev?.name || <span style={{ color: '#ef4444' }}>Unknown</span>}</button></td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{dev?.client || '—'}</td>
                  <td style={{ padding: '11px 16px' }}><Badge status={r.result} /></td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{r.technician || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{r.duration || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    {r.hasScreenshot ? (
                      <button
                        onClick={() => setLightbox(api.screenshotUrl(r.id))}
                        style={{ background: 'none', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#38bdf8', fontSize: 18 }}
                        title="View screenshot"
                      >📷</button>
                    ) : <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 16px' }}><div style={{ display: 'flex', gap: 6 }}><button className="btn-ghost" onClick={() => onEdit(r)}>Edit</button><button className="btn-ghost" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }} onClick={() => onDelete(r.id)}>Del</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#334155' }}>{filtered.length} of {restores.length} records</div>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out' }}
        >
          <img
            src={lightbox}
            alt="Restore screenshot"
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}
          >✕</button>
        </div>
      )}
    </div>
  )
}
