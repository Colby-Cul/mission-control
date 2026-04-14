import { getAccounts, getRecentTransactions } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function CashFlowPage() {
  const [accounts, txns] = await Promise.all([getAccounts(), getRecentTransactions(100)])

  const total = accounts.reduce((s, a) => s + Number(a.balance_current ?? 0), 0)
  const inflow30 = txns.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const outflow30 = txns.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ CASH FLOW · LIVE FROM SUPABASE</div>
        <h1>Cash Flow</h1>
        <div className="big">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <p>
          {accounts.length} accounts · ${inflow30.toLocaleString(undefined, { maximumFractionDigits: 0 })} in ·
          {' '}${outflow30.toLocaleString(undefined, { maximumFractionDigits: 0 })} out (last {txns.length} txns)
        </p>
      </div>

      <div className="mc-card accent" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Accounts</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {accounts.map(a => (
            <div key={a.id} style={{ padding: 12, background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{a.entity_id ?? a.account_scope}</div>
              <div style={{ fontWeight: 600, fontSize: 13, margin: '4px 0' }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{a.type} · {a.subtype} · ••{a.mask}</div>
              <div style={{ fontFamily: 'var(--mo)', fontSize: 18, marginTop: 6, color: Number(a.balance_current) < 0 ? 'var(--red)' : 'var(--t1)' }}>
                ${Number(a.balance_current ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Recent Transactions</h3>
        {txns.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>No transactions in staging yet.</div>}
        {txns.slice(0, 50).map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 500 }}>{t.name || t.merchant_name || 'Transaction'}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{t.transaction_date} · {t.category ?? '—'}</div>
            </div>
            <div style={{ fontFamily: 'var(--mo)', color: Number(t.amount) > 0 ? 'var(--red)' : 'var(--green)' }}>
              {Number(t.amount) > 0 ? '-' : '+'}${Math.abs(Number(t.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
