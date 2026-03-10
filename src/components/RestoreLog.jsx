import { Badge, fmt, Input, Select, TableHeader, EmptyState } from './ui.jsx'

export function RestoreLog({ restores, devices, search, setSearch, filterStatus, setFilterStatus, filterClient, setFilterClient, onNew, onEdit, onDelete, onViewDevice }) {
  const clients = [...new Set(devices.map((d) => d.client).filter(Boolean))].sort()
  const filtered = restores
    .filter((r) => {
      const dev = devices.find((d) => d.id === r.device_id)
      const q = search.toLowerCase()
      return (filterStatus === 'All' || r.result === filterStatus) && (filterClient === 'All' || dev?.client === filterClient) && (!q || dev?.name?.toLowerCase().includes(q) || dev?.client?.toLowerCase().includes(q) || (r.technician || '').toLowerCase().includes(q))
    })
    .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
          <Select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} style={{ width: 'auto' }}><option value="All">All Clients</option>{clients.map((c) => <option key={c}>{c}</option>)}</Select>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Pass', 'Fail', 'Pending'].map((s) => (<button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '7px 13px', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", borderColor: filterStatus === s ? '#3b82f6' : '#334155', background: filterStatus === s ? 'rgba(59,130,246,0.15)' : 'transparent', color: filterStatus === s ? '#93c5fd' : '#64748b' }}>{s}</button>))}
          </div>
        </div>
        <button className="btn-primary" onClick={onNew}>+ Log Restore</button>
      </div>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHeader cols={['Date / Time', 'Device', 'Client', 'Result', 'Technician', 'Duration', 'Notes', '']} />
          <tbody>
            {filtered.length === 0 ? <EmptyState message="No records found." /> : filtered.map((r) => {
              const dev = devices.find((d) => d.id === r.device_id)
              return (
                <tr key={r.id} className="row-hover" style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{fmt(r.date || r.created_at)}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500, color: '#f1f5f9', cursor: dev ? 'pointer' : 'default' }} onClick={() => dev && onViewDevice(dev.id)}>{dev?.name || <span style={{ color: '#ef4444' }}>Unknown</span>}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{dev?.client || '—'}</td>
                  <td style={{ padding: '11px 16px' }}><Badge status={r.result} /></td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{r.technician || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{r.duration || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                  <td style={{ padding: '11px 16px' }}><div style={{ display: 'flex', gap: 6 }}><button className="btn-ghost" onClick={() => onEdit(r)}>Edit</button><button className="btn-ghost" style={{ color: '#f87171', borderColor: 'rgba(127,29,29,0.2)' }} onClick={() => onDelete(r.id)}>Del</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#334155' }}>{filtered.length} of {restores.length} records</div>
    </div>
  )
    }
