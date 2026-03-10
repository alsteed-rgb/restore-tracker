import { useState, useEffect, useCallback } from 'react'
import { api } from './api.js'
import { Toast } from './components/ui.jsx'
import { Dashboard } from './components/Dashboard.jsx'
import { DevicesList } from './components/DevicesList.jsx'
import { DeviceDetail } from './components/DeviceDetail.jsx'
import { RestoreLog } from './components/RestoreLog.jsx'
import { DeviceForm } from './components/DeviceForm.jsx'
import { RestoreForm } from './components/RestoreForm.jsx'

export default function App() {
  const [view, setView]         = useState('dashboard')
  const [devices, setDevices]   = useState([])
  const [restores, setRestores] = useState([])
  const [ready, setReady]       = useState(false)
  const [toast, setToast]       = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [deviceModal, setDeviceModal]   = useState(null)
  const [restoreModal, setRestoreModal] = useState(null)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterClient, setFilterClient] = useState('All')

  const loadAll = useCallback(async () => {
    try {
      const [devs, rests] = await Promise.all([api.getDevices(), api.getRestores()])
      setDevices(devs); setRestores(rests)
    } catch (e) { showToast('Failed to load data. Are you running via netlify dev?', false) }
    setReady(true)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const saveDevice = async (data) => {
    try {
      const { id, created_at, ...fields } = data
      if (id) { await api.updateDevice(id, fields); showToast('Device updated.') }
      else { await api.createDevice(fields); showToast('Device registered.') }
      setDeviceModal(null)
      loadAll()
    } catch (e) {
      if (e.status === 409) { showToast('Someone else edited this device. Data refreshed — please try again.', false); loadAll() }
      else { showToast('Error saving device.', false) }
    }
  }

  const deleteDevice = async (id) => {
    if (!window.confirm('Delete this device and ALL its restore records? This cannot be undone.')) return
    try {
      await Promise.all([api.deleteDevice(id), api.deleteRestoresByDevice(id)])
      showToast('Device deleted.', false)
      if (detailId === id) { setDetailId(null); setView('devices') }
      loadAll()
    } catch { showToast('Error deleting device.', false) }
  }

  const saveRestore = async (data) => {
    try {
      const { id, created_at, ...fields } = data
      if (id) { await api.updateRestore(id, fields); showToast('Record updated.') }
      else { await api.createRestore(fields); showToast('Restore logged.') }
      setRestoreModal(null)
      loadAll()
    } catch (e) {
      if (e.status === 409) { showToast('Someone else edited this record. Data refreshed — please try again.', false); loadAll() }
      else { showToast('Error saving restore.', false) }
    }
  }

  const deleteRestore = async (id) => {
    if (!window.confirm('Delete this restore record?')) return
    try { await api.deleteRestore(id); showToast('Record deleted.', false); loadAll() }
    catch { showToast('Error deleting record.', false) }
  }

  const viewDevice = (id) => { setDetailId(id); setView('device-detail') }
  const logRestoreForDevice = (deviceId) => setRestoreModal({ device_id: deviceId })
  const completed = restores.filter((r) => r.result !== 'Pending')
  const passRate  = completed.length ? Math.round(restores.filter((r) => r.result === 'Pass').length / completed.length * 100) : 0
  const nav = [{ id: 'dashboard', label: 'Dashboard' }, { id: 'devices', label: `Devices (${devices.length})` }, { id: 'restores', label: `Restore Log (${restores.length})` }]

  if (!ready) return (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>Loading…</div>)

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <Toast toast={toast} />
      <div style={{ background: '#0c1525', borderBottom: '1px solid #1e293b', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.05em' }}><span style={{ color: '#3b82f6' }}>▣</span> RestoreDB</div>
          <nav style={{ display: 'flex', gap: 4 }}>
            {nav.map((n) => (<button key={n.id} onClick={() => setView(n.id)} style={{ background: view === n.id ? '#1e293b' : 'none', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: view === n.id ? '#f1f5f9' : '#64748b' }}>{n.label}</button>))}
          </nav>
        </div>
        <div style={{ fontSize: 11, color: '#334155' }}>{passRate}% pass rate · {restores.length} restores</div>
      </div>
      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {view === 'dashboard'     && <Dashboard devices={devices} restores={restores} onNavigate={setView} onViewDevice={viewDevice} />}
        {view === 'devices'       && <DevicesList devices={devices} restores={restores} onNew={() => setDeviceModal({})} onEdit={setDeviceModal} onDelete={deleteDevice} onViewDevice={viewDevice} onLogRestore={logRestoreForDevice} />}
        {view === 'restores'      && <RestoreLog restores={restores} devices={devices} search={search} setSearch={setSearch} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterClient={filterClient} setFilterClient={setFilterClient} onNew={() => setRestoreModal({})} onEdit={setRestoreModal} onDelete={deleteRestore} onViewDevice={viewDevice} />}
        {view === 'device-detail' && detailId && <DeviceDetail device={devices.find((d) => d.id === detailId)} restores={restores} onBack={() => setView('devices')} onEdit={setDeviceModal} onLogRestore={logRestoreForDevice} onEditRestore={setRestoreModal} onDeleteRestore={deleteRestore} />}
      </div>
      {deviceModal  !== null && <DeviceForm  device={deviceModal}  onSave={saveDevice}  onClose={() => setDeviceModal(null)} />}
      {restoreModal !== null && <RestoreForm restore={restoreModal} devices={devices} onSave={saveRestore} onClose={() => setRestoreModal(null)} />}
    </div>
  )
        }
