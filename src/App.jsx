import { useState, useEffect, useCallback } from 'react'
import { api } from './api.js'
import { Toast } from './components/ui.jsx'
import { Dashboard } from './components/Dashboard.jsx'
import { DevicesList } from './components/DevicesList.jsx'
import { DeviceDetail } from './components/DeviceDetail.jsx'
import { DeviceForm } from './components/DeviceForm.jsx'
import { RestoreForm } from './components/RestoreForm.jsx'
import { RestoreLog } from './components/RestoreLog.jsx'

export default function App() {
  const [view, setView]               = useState('dashboard')
  const [devices, setDevices]         = useState([])
  const [restores, setRestores]       = useState([])
  const [ready, setReady]             = useState(false)
  const [toast, setToast]             = useState(null)
  const [detailId, setDetailId]       = useState(null)
  const [deviceModal, setDeviceModal] = useState(null)
  const [restoreModal, setRestoreModal] = useState(null)
  const [search, setSearch]           = useState('')
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

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const saveDevice = async (data) => {
    try {
      const { id, created_at, ...fields } = data
      if (id) { const updated = await api.updateDevice(id, fields); setDevices((prev) => prev.map((d) => d.id === id ? updated : d)) }
      else { const created = await api.createDevice(fields); setDevices((prev) => [...prev, created]) }
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

  const saveRestore = async (data, screenshotFile) => {
    try {
      const { id, created_at, ...fields } = data
      let saved
      if (id) {
        saved = await api.updateRestore(id, fields)
        setRestores((prev) => prev.map((r) => r.id === id ? saved : r))
      } else {
        saved = await api.createRestore(fields)
        setRestores((prev) => [...prev, saved])
      }
      if (screenshotFile) {
        await api.uploadScreenshot(saved.id, screenshotFile)
        setRestores((prev) => prev.map((r) => r.id === saved.id ? { ...r, hasScreenshot: true } : r))
      }
      setRestoreModal(null)
      loadAll()
    } catch (e) {
      if (e.status === 409) { showToast('Someone else edited this record. Data refreshed — please try again.', false); loadAll() }
      else { showToast('Error saving restore.', false) }
    }
  }

  const deleteRestore = async (id) => {
    if (!window.confirm('Delete this restore record?')) return
    try { await api.deleteRestore(id); setRestores((prev) => prev.filter((r) => r.id !== id)) }
    catch { showToast('Error deleting record.', false) }
  }

  const viewDevice = (id) => { setDetailId(id); setView('device-detail') }
  const logRestoreForDevice = (deviceId) => setRestoreModal({ device_id: deviceId })
  const completed = restores.filter((r) => r.result !== 'Pending')
  const passRate = completed.length ? Math.round(completed.filter((r) => r.result === 'Pass').length / completed.length * 100) : 0

  const nav = [{ id: 'dashboard', label: 'Dashboard' }, { id: 'devices', label: `Devices (${devices.length})` }, { id: 'restores', label: `Restore Log (${restores.length})` }]

  if (!ready) return (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#8b949e' }}>Loading…</div>)

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <Toast toast={toast} />
      <div style={{ background: '#0c1525', borderBottom: '1px solid #1e293b', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', letterSpacing: 1 }}>
            <nav style={{ display: 'flex', gap: 4 }}>
              {nav.map((n) => (<button key={n.id} onClick={() => setView(n.id)} style={{ background: view === n.id ? '#1e293b' : 'transparent', color: view === n.id ? '#38bdf8' : '#94a3b8', border: 'none', padding: '14px 16px', cursor: 'pointer', fontSize: 13, borderBottom: view === n.id ? '2px solid #38bdf8' : '2px solid transparent' }}>{n.label}</button>))}
            </nav>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#334155' }}>{passRate}% pass rate · {restores.length} restores</div>
      </div>
      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {view === 'dashboard'     && <Dashboard devices={devices} restores={restores} onViewDevice={viewDevice} onLogRestore={() => setRestoreModal({})} />}
        {view === 'devices'       && <DevicesList devices={devices} restores={restores} search={search} setSearch={setSearch} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterClient={filterClient} setFilterClient={setFilterClient} onEdit={(d) => setDeviceModal(d)} onDelete={deleteDevice} onView={viewDevice} onAdd={() => setDeviceModal({})} onLogRestore={logRestoreForDevice} />}
        {view === 'restores'      && <RestoreLog restores={restores} devices={devices} search={search} setSearch={setSearch} onEdit={(r) => setRestoreModal(r)} onDelete={deleteRestore} onAdd={() => setRestoreModal({})} />}
        {view === 'device-detail' && detailId && <DeviceDetail device={devices.find((d) => d.id === detailId)} restores={restores.filter((r) => r.device_id === detailId)} onEdit={(d) => setDeviceModal(d)} onDelete={deleteDevice} onLogRestore={logRestoreForDevice} onEditRestore={(r) => setRestoreModal(r)} onDeleteRestore={deleteRestore} onBack={() => setView('devices')} />}
      </div>
      {deviceModal  !== null && <DeviceForm  device={deviceModal}  onSave={saveDevice}  onClose={() => setDeviceModal(null)} />}
      {restoreModal !== null && <RestoreForm restore={restoreModal} devices={devices} onSave={saveRestore} onClose={() => setRestoreModal(null)} />}
    </div>
  )
      }
