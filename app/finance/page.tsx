import { getAccounts } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function FinancePage() {
  const accounts = await getAccounts()
  const total = accounts.reduce((s, a) => s + Number(a.balance_current ?? 0), 0)
  const assets = accounts.filter(a => Number(a.balance_current ?? 0) >= 0)
  const liabilities = accounts.filter(a => Number(a.balance_current ?? 0) < 0)
  const assetTotal = assets.reduce((s, a) => s + Number(a.balance_current ?? 0), 0)
  const liabTotal = liabilities.reduce((s, a) => s + Math.abs(Number(a.balance_current ?? 0)), 0)

  const byScope = accounts.reduce<Record<string, { total: number; count: number }>>((m, a) => {
    const k = a.account_scope ?? a.entity_id ?? 'Unscoped'
    if (!m[k]) m[k] = { total: 0, count: 0 }
    m[k].total += Number(a.balance_current ?? 0)
    m[k].count += 1
    return m
  }, {})

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ FINANCE · NET WORTH</div>
        <h1>Finance</h1>
        <div className="big">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <p>
          {accounts.length} accounts · ${assetTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} in assets ·
          {' '}${liabTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} in liabilities
        </p>
      </div>

      <div className="mc-card accent" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>By Scope</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {Object.entries(byScope).map(([k, v]) => (
            <div key={k} style={{ padding: 12, background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{k}</div>
              <div style={{ fontFamily: 'var(--mo)', fontSize: 18, marginTop: 6, color: v.total < 0 ? 'var(--red)' : 'var(--t1)' }}>
                ${v.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{v.count} accounts</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>All Accounts</h3>
        {accounts.map(a => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 500 }}>{a.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{a.type} · {a.subtype} · ••{a.mask}</div>
            </div>
            <div style={{ fontFamily: 'var(--mo)', color: Number(a.balance_current) < 0 ? 'var(--red)' : 'var(--t1)' }}>
              ${Number(a.balance_current ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
