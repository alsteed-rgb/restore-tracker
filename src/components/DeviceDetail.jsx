import { Badge, StatCard, fmt, TableHeader, EmptyState } from './ui.jsx'

export function DeviceDetail({ device, restores, onBack, onEdit, onLogRestore, onEditRestore, onDeleteRestore }) {
  const history = [...restores.filter((r) => r.device_id === device.id)].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
  const pass = history.filter((r) => r.result === 'Pass').length
  const fail = history.filter((r) => r.result === 'Fail').length
  const last = history[0]
  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", marginBottom: 20, padding: 0 }}>← Back to Devices</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: '#3b82f6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{device.client}</div>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 700, color: '#f1f5f9' }}>{device.name}</h2>
          <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>{[device.type, device.os, device.ip, device.site].filter(Boolean).map((v, i) => <span key={i} style={{ fontSize: 12, color: '#64748b' }}>{v}</span>)}</div>
          {device.notes && <p style={{ marginTop: 10, fontSize: 12, color: '#475569', maxWidth: 500 }}>{device.notes}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => onEdit(device)}>Edit Device</button>
          <button className="btn-primary" onClick={() => onLogRestore(device.id)}>+ Log Restore</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Restores" value={history.length} color="#3b82f6" />
        <StatCard label="Passed"         value={pass}           color="#10b981" />
        <StatCard label="Failed"         value={fail}           color="#ef4444" />
        <StatCard label="Last Restore"   value={last ? fmt(last.date || last.created_at) : 'Never'} color="#94a3b8" small />
      </div>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #334155', fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Restore History</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHeader cols={['Date / Time', 'Result', 'Technician', 'Duration', 'Notes', '']} />
          <tbody>
            {history.length === 0 ? <EmptyState message="No restore records yet." /> : history.map((r) => (
              <tr key={r.id} className="row-hover" style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{fmt(r.date || r.created_at)}</td>
                <td style={{ padding: '11px 16px' }}><Badge status={r.result} /></td>
                <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{r.technician || '—'}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{r.duration || '—'}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                <td style={{ padding: '11px 16px' }}><div style={{ display: 'flex', gap: 6 }}><button className="btn-ghost" onClick={() => onEditRestore(r)}>Edit</button><button className="btn-ghost" style={{ color: '#f87171', borderColor: 'rgba(127,29,29,0.2)' }} onClick={() => onDeleteRestore(r.id)}>Del</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
        }
