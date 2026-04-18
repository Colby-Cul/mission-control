export const dynamic = 'force-dynamic'

export default function ExportPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <header>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--orange)', fontFamily: 'var(--mo)', marginBottom: 6 }}>
          Settings · Export
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Export & Backups</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.55 }}>
          One-click dumps of your Mission Control data. Hooks into Supabase&rsquo;s
          point-in-time recovery + the nightly /api/export/* routes.
        </p>
      </header>
      <ExportRow title="Full JSON snapshot" description="All projects, tasks, entities, accounts, agent_runs." />
      <ExportRow title="Financial CSV"       description="financial_transactions + financial_accounts, 1 row per line." />
      <ExportRow title="Memory vault"        description="vault/**/*.md as a single archive." />
    </div>
  )
}

function ExportRow({ title, description }: { title: string; description: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f7', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{description}</div>
      </div>
      <button disabled style={{
        padding: '7px 14px', fontSize: 12, fontWeight: 600,
        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
        cursor: 'not-allowed',
      }}>
        Coming soon
      </button>
    </div>
  )
}
