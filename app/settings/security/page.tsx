export const dynamic = 'force-dynamic'

export default function SecurityPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <header>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--orange)', fontFamily: 'var(--mo)', marginBottom: 6 }}>
          Settings · Security
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Security</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.55 }}>
          Two-factor, active sessions, and OAuth grants.
        </p>
      </header>
      <Placeholder title="Two-factor authentication" status="Not configured" />
      <Placeholder title="Active sessions" status="—" />
      <Placeholder title="OAuth & API tokens" status="Managed via Integrations" />
    </div>
  )
}

function Placeholder({ title, status }: { title: string; status: string }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f7', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--mo)' }}>{status}</div>
    </div>
  )
}
