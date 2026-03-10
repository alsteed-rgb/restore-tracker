import { useMemo } from 'react'
import { fmt } from './ui.jsx'

const DAY_MS = 86400000

function daysBetween(iso, now = Date.now()) {
  if (!iso) return null
  return Math.floor((now - new Date(iso).getTime()) / DAY_MS)
}

function CardHeader({ label, badge }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      {badge}
    </div>
  )
}

function OverduePill({ days }) {
  if (days <= 0) return <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b' }}>Due</span>
  const red = days > 30
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: red ? '#ef4444' : '#f59e0b', background: red ? '#ef444420' : '#f59e0b20', padding: '3px 10px', borderRadius: 99 }}>
      {days}d overdue
    </span>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, background: '#162032', border: '1px solid #334155', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 30, fontWeight: 700, color, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

function ExceptionRow({ ex, onViewDevice }) {
  const base = { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 20px', borderBottom: '1px solid rgba(51,65,85,0.4)' }
  const nameStyle = { fontSize: 13, fontWeight: 500, color: '#f1f5f9', cursor: 'pointer' }
  const clientStyle = { fontSize: 12, color: '#475569', marginLeft: 8 }
  const subStyle = { fontSize: 12, color: '#64748b', marginTop: 3 }

  if (ex.type === 'fail') {
    const { device, restore } = ex
    const d = restore.date || restore.created_at
    return (
      <div style={base}>
        <span style={{ fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>❌</span>
        <div>
          <span style={nameStyle} onClick={() => device && onViewDevice(device.id)}>
            {device?.name ?? 'Unknown device'}
          </span>
          {device?.client && <span style={clientStyle}>{device.client}</span>}
          <div style={subStyle}>
            Restore failed · {fmt(d)}{restore.technician ? ` · ${restore.technician}` : ''}
          </div>
        </div>
      </div>
    )
  }

  if (ex.type === 'overdue') {
    const { device, lastDate, daysSince } = ex
    return (
      <div style={base}>
        <span style={{ fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>⚠️</span>
        <div>
          <span style={nameStyle} onClick={() => onViewDevice(device.id)}>{device.name}</span>
          {device.client && <span style={clientStyle}>{device.client}</span>}
          <div style={subStyle}>
            {lastDate
              ? `Last restore ${daysSince} days ago`
              : `Never restored · registered ${fmt(device.created_at)}`}
          </div>
        </div>
      </div>
    )
  }

  if (ex.type === 'repeat') {
    const { device, count } = ex
    return (
      <div style={base}>
        <span style={{ fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>🔁</span>
        <div>
          <span style={nameStyle} onClick={() => onViewDevice(device.id)}>{device.name}</span>
          {device.client && <span style={clientStyle}>{device.client}</span>}
          <div style={subStyle}>{count} failures in the last 90 days</div>
        </div>
      </div>
    )
  }

  return null
}

export function Dashboard({ devices, restores, onNavigate, onViewDevice }) {
  const now = Date.now()

  // Most recent restore per device
  const latestByDevice = useMemo(() => {
    const map = {}
    for (const r of restores) {
      const ts = new Date(r.date || r.created_at).getTime()
      if (!map[r.device_id] || ts > map[r.device_id]._ts) {
        map[r.device_id] = { ...r, _ts: ts }
      }
    }
    return map
  }, [restores])

  // Section 1: devices due or overdue (last restore > 30d ago, or never restored)
  const queue = useMemo(() => {
    return devices
      .map(device => {
        const latest = latestByDevice[device.id]
        const lastDate = latest ? (latest.date || latest.created_at) : null
        const refDate = lastDate || device.created_at
        const daysSinceRef = daysBetween(refDate, now) ?? 0
        if (lastDate && daysSinceRef <= 30) return null
        return { device, lastDate, daysOverdue: Math.max(0, daysSinceRef - 30) }
      })
      .filter(Boolean)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
  }, [devices, latestByDevice, now])

  // Section 2: last 30 days summary
  const last30 = useMemo(() => {
    const cutoff = now - 30 * DAY_MS
    const recent = restores.filter(r => new Date(r.date || r.created_at).getTime() >= cutoff)
    return {
      total: recent.length,
      passed: recent.filter(r => r.result === 'Pass').length,
      failed: recent.filter(r => r.result === 'Fail').length,
    }
  }, [restores, now])

  // Section 3: exceptions
  const exceptions = useMemo(() => {
    const items = []
    const cutoff30 = now - 30 * DAY_MS
    const cutoff90 = now - 90 * DAY_MS

    // ❌ failures in last 30 days
    for (const r of restores) {
      if (r.result === 'Fail' && new Date(r.date || r.created_at).getTime() >= cutoff30) {
        const device = devices.find(d => d.id === r.device_id)
        items.push({ type: 'fail', restore: r, device, key: `fail-${r.id}` })
      }
    }

    // ⚠️ severely overdue (60+ days since last restore, or never restored and device > 30 days old)
    for (const device of devices) {
      const latest = latestByDevice[device.id]
      const lastDate = latest ? (latest.date || latest.created_at) : null
      const refDate = lastDate || device.created_at
      const daysSince = daysBetween(refDate, now) ?? 0
      const threshold = lastDate ? 60 : 30
      if (daysSince >= threshold) {
        items.push({ type: 'overdue', device, lastDate, daysSince, key: `overdue-${device.id}` })
      }
    }

    // 🔁 repeat failures (2+ in last 90 days)
    const failsByDevice = {}
    for (const r of restores) {
      if (r.result === 'Fail' && new Date(r.date || r.created_at).getTime() >= cutoff90) {
        failsByDevice[r.device_id] = (failsByDevice[r.device_id] || 0) + 1
      }
    }
    for (const [deviceId, count] of Object.entries(failsByDevice)) {
      if (count >= 2) {
        const device = devices.find(d => d.id === deviceId)
        if (device) items.push({ type: 'repeat', device, count, key: `repeat-${deviceId}` })
      }
    }

    return items
  }, [devices, restores, latestByDevice, now])

  const card = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: '#3b82f6', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>// OVERVIEW</div>
        <h1 style={{ margin: 0, fontSize: 22, fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 700, color: '#f1f5f9' }}>Daily Briefing</h1>
      </div>

      {/* ── 1. Restore Queue ── */}
      <div style={card}>
        <CardHeader
          label="Restore Queue"
          badge={
            <span style={{ fontSize: 11, fontWeight: 600, color: queue.length > 0 ? '#ef4444' : '#10b981' }}>
              {queue.length} device{queue.length !== 1 ? 's' : ''} due
            </span>
          }
        />
        {queue.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
            All devices are up to date.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Device', 'Client', 'Last Restore', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', background: '#162032' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map(({ device, lastDate, daysOverdue }) => (
                <tr key={device.id} className="row-hover" style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', cursor: 'pointer' }} onClick={() => onViewDevice(device.id)}>
                      {device.name}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8' }}>{device.client || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{lastDate ? fmt(lastDate) : 'Never'}</td>
                  <td style={{ padding: '11px 16px' }}><OverduePill days={daysOverdue} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 2. Last Round Summary ── */}
      <div style={card}>
        <CardHeader label="Last 30 Days" />
        <div style={{ padding: 20, display: 'flex', gap: 16 }}>
          <StatPill label="Total" value={last30.total} color="#94a3b8" />
          <StatPill label="Successful" value={last30.passed} color="#10b981" />
          <StatPill label="Failed" value={last30.failed} color="#ef4444" />
        </div>
      </div>

      {/* ── 3. Exceptions ── */}
      <div style={card}>
        <CardHeader
          label="Exceptions"
          badge={exceptions.length > 0
            ? <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>{exceptions.length} issue{exceptions.length !== 1 ? 's' : ''}</span>
            : null}
        />
        {exceptions.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
            No issues to report.
          </div>
        ) : (
          <div>
            {exceptions.map(ex => (
              <ExceptionRow key={ex.key} ex={ex} onViewDevice={onViewDevice} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
