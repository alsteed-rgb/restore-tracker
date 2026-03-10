export const STATUS_STYLE = {
  Pass:    { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  Fail:    { bg: '#fee2e2', text: '#7f1d1d', dot: '#ef4444' },
  Pending: { bg: '#fef3c7', text: '#78350f', dot: '#f59e0b' },
}
export const DEVICE_TYPES = ['Physical Server','Virtual Machine','Cloud Instance','NAS / Storage','Workstation','Other']
export const OS_LIST = ['Windows Server 2022','Windows Server 2019','Windows Server 2016','Ubuntu 24.04','Ubuntu 22.04','Ubuntu 20.04','RHEL 9','RHEL 8','Debian 12','CentOS 7','Other']
export const fmt = (iso) => iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
export const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
export function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Pending
  return (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />{status}</span>)
}
export function Modal({ title, onClose, children }) {
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={(e) => e.target === e.currentTarget && onClose()}><div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}><h2 style={{ margin: 0, fontSize: 16, fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 700, color: '#f1f5f9' }}>{title}</h2><button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button></div>{children}</div></div>)
}
export function Field({ label, children, span2 }) {
  return (<div style={{ gridColumn: span2 ? 'span 2' : 'span 1' }}><label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>{children}</div>)
}
export const Input = ({ style, ...props }) => <input className="field-input" style={style} {...props} />
export const Select = ({ children, style, ...props }) => <select className="field-input" style={style} {...props}>{children}</select>
export const Textarea = ({ style, ...props }) => <textarea className="field-input" style={{ resize: 'vertical', ...style }} {...props} />
export function StatCard({ label, value, color, small }) {
  return (<div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '18px 22px' }}><div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div><div style={{ fontSize: small ? 14 : 30, fontWeight: 700, color, fontFamily: "'IBM Plex Sans',sans-serif" }}>{value}</div></div>)
}
export function Toast({ toast }) {
  if (!toast) return null
  return (<div style={{ position: 'fixed', top: 20, right: 20, zIndex: 200, background: toast.ok ? '#065f46' : '#7f1d1d', border: `1px solid ${toast.ok ? '#10b981' : '#ef4444'}`, borderRadius: 8, padding: '10px 18px', fontSize: 13, color: '#f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>{toast.msg}</div>)
}
export function TableHeader({ cols }) {
  return (<thead><tr style={{ borderBottom: '1px solid #334155' }}>{cols.map((h) => (<th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', background: '#162032' }}>{h}</th>))}</tr></thead>)
}
export function EmptyState({ message, action, actionLabel }) {
  return (<tr><td colSpan={99} style={{ padding: '48px 16px', textAlign: 'center', color: '#475569', fontSize: 13 }}>{message}{' '}{action && <button onClick={action} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{actionLabel} →</button>}</td></tr>)
    }
