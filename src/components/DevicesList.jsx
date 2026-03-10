import { useState } from 'react'
import { Badge, fmt, Input, TableHeader, EmptyState } from './ui.jsx'

export function DevicesList({ devices, restores, onNew, onEdit, onDelete, onViewDevice, onLogRestore }) {
  const [search, setSearch] = useState('')
  const filtered = devices.filter((d) => { const q = search.toLowerCase(); return !q || d.name?.toLowerCase().includes(q) || d.client?.toLowerCase().includes(q) || d.ip?.includes(q) })
  const lastRestore = (id) => [...restores.filter((r) => r.device_id === id)].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))[0] || null
  const restoreCount = (id) => restores.filter((r) => r.device_id === id).length
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Input placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <button className="btn-primary" onClick={onNew}>+ Register Device</button>
      </div>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHeader cols={['Device Name', 'Client', 'Type', 'OS', 'IP Address', 'Site', 'Last Restore', 'Count', '']} />
          <tbody>
            {filtered.length === 0 ? <EmptyState message="No devices registered yet." /> : filtered.map((d) => {
              const last = lastRestore(d.id)
              return (
                <tr key={d.id} className="row-hover" style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#f1f5f9', cursor: 'pointer' }} onClick={() => onViewDevice(d.id)}>{d.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{d.client || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{d.type || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{d.os || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{d.ip || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{d.site || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{last ? <Badge status={last.result} /> : <span style={{ color: '#334155', fontSize: 12 }}>Never</span>}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>{restoreCount(d.id)}</td>
                  <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', gap: 6 }}><button className="btn-ghost" onClick={() => onEdit(d)}>Edit</button><button className="btn-ghost" onClick={() => onLogRestore(d.id)}>+ Restore</button><button className="btn-ghost" style={{ color: '#f87171', borderColor: 'rgba(127,29,29,0.2)' }} onClick={() => onDelete(d.id)}>Del</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#334155' }}>{filtered.length} of {devices.length} devices</div>
    </div>
  )
                    }
