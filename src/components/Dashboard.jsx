import { Badge, StatCard, fmt, TableHeader, EmptyState } from './ui.jsx'

export function Dashboard({ devices, restores, onNavigate, onViewDevice }) {
  const completed = restores.filter((r) => r.result !== 'Pending')
  const passRate = completed.length ? Math.round(restores.filter((r) => r.result === 'Pass').length / completed.length * 100) : 0
  const recent = [...restores].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)).slice(0, 8)
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: '#3b82f6', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>// OVERVIEW</div>
        <h1 style={{ margin: 0, fontSize: 22, fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 700, color: '#f1f5f9' }}>Dashboard</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard label="Devices"        value={devices.length}  color="#3b82f6" />
        <StatCard label="Total Restores" value={restores.length} color="#94a3b8" />
        <StatCard label="Passed"         value={restores.filter((r) => r.result === 'Pass').length} color="#10b981" />
        <StatCard label="Failed"         value={restores.filter((r) => r.result === 'Fail').length} color="#ef4444" />
        <StatCard label="Pass Rate"      value={`${passRate}%`}  color={passRate >= 80 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444'} />
      </div>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recent Restores</span>
          <button className="btn-ghost" onClick={() => onNavigate('restores')}>View All →</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHeader cols={['Date', 'Device', 'Client', 'Result', 'Technician']} />
          <tbody>
            {recent.length === 0
              ? <EmptyState message="No restores logged yet." action={() => onNavigate('devices')} actionLabel="Start by registering a device" />
              : recent.map((r) => {
                  const dev = devices.find((d) => d.id === r.device_id)
                  return (
                    <tr key={r.id} className="row-hover" style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{fmt(r.date || r.created_at)}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500, color: '#f1f5f9', cursor: dev ? 'pointer' : 'default' }} onClick={() => dev && onViewDevice(dev.id)}>{dev?.name || <span style={{ color: '#ef4444' }}>Unknown</span>}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{dev?.client || '—'}</td>
                      <td style={{ padding: '11px 16px' }}><Badge status={r.result} /></td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{r.technician || '—'}</td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
            }
