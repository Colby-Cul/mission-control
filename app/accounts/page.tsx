/**
 * Accounts — financial accounts aggregation via Plaid.
 * Ported from live Accounts.jsx: full accounts table (Banking/Investment/Credit),
 * net worth KPIs, properties summary.
 * Hero metric: net worth / total balances
 *
 * v7 additions:
 *  - Owner column with inline EntitySelect (Personal / Entity + dropdown)
 *  - LinkAccountBar at top for scoped Plaid link flow
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from '../_components/HeroCanvasDefault'
import EntitySelect from '../_components/EntitySelect'
import LinkAccountBar from '../_components/LinkAccountBar'
import {
  getAccounts,
  accountSignedBalance,
  getProperties,
  getEntities,
  getNetWorthTimeline,
  getRecentTransactions,
} from '../lib/queries'

export const dynamic = 'force-dynamic'

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const USD2 = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Account',   description: 'Linked your first financial account.',              xp: 50,  progress: 100, icon: '🏦', earned: true  },
  { name: 'Plaid Connected', description: 'Connected Plaid for real-time balance sync.',      xp: 150, progress: 100, icon: '🔗', earned: true  },
  { name: 'Multi-Bank',      description: 'Accounts from 3+ financial institutions.',         xp: 200, progress: 100, icon: '💳', earned: true  },
  { name: '$500K+ Liquid',   description: 'Maintained $500K+ in liquid accounts.',            xp: 400, progress: 40,  icon: '💰', earned: false },
  { name: 'Zero Credit Bal', description: 'Paid off all credit card balances.',               xp: 500, progress: 30,  icon: '✅', earned: false },
  { name: 'Net Worth $3M+',  description: 'Total net worth exceeded $3 million.',             xp: 750, progress: 80,  icon: '🏆', earned: false },
  { name: 'Crypto Portfolio', description: 'Held crypto across 2+ assets.',                   xp: 200, progress: 100, icon: '₿',  earned: true  },
  { name: 'Real Estate King', description: 'Property portfolio value exceeds $3M.',           xp: 600, progress: 60,  icon: '🏡', earned: false },
]

/** Type pill colors matching live site */
function typeBadge(type: string, subtype?: string): { bg: string; color: string; label: string } {
  const t = String(type ?? '').toLowerCase()
  const s = String(subtype ?? '').toLowerCase()
  if (t === 'credit')                          return { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: subtype || 'Credit'    }
  if (t === 'investment' || t === 'brokerage') return { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', label: subtype || 'Brokerage'  }
  if (s === 'utma')                            return { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', label: 'UTMA'                  }
  if (t === 'loan')                            return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: subtype || 'Loan'       }
  if (s === 'cash management' || s === 'cash') return { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: subtype || 'Cash'       }
  return                                              { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: subtype || 'Checking'   }
}

/** Group accounts by owner: personal first, then one section per entity */
function groupByOwner(accounts: any[], entityMap: Record<string, string>) {
  const personal: any[] = []
  const byEntity: Record<string, any[]> = {}

  for (const a of accounts) {
    if (a.account_scope === 'entity' && a.entity_id) {
      if (!byEntity[a.entity_id]) byEntity[a.entity_id] = []
      byEntity[a.entity_id].push(a)
    } else {
      personal.push(a)
    }
  }

  const groups: { key: string; label: string; accounts: any[] }[] = []
  if (personal.length) groups.push({ key: 'personal', label: 'Personal (Colby)', accounts: personal })
  for (const [eid, accts] of Object.entries(byEntity)) {
    groups.push({ key: eid, label: entityMap[eid] ?? eid, accounts: accts })
  }
  return groups
}

const TH_STYLE: React.CSSProperties = {
  fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em',
  padding: '10px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600,
}

export default async function AccountsPage() {
  const [accounts, properties, entities] = await Promise.allSettled([
    getAccounts(),
    getProperties().catch(() => []),
    getEntities().catch(() => []),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const accts = accounts as any[]
  const ents  = (entities as any[]).map((e: any) => ({ id: e.id, entity_name: e.entity_name }))

  const depositoryAccts   = accts.filter((a: any) => String(a.type ?? '').toLowerCase() === 'depository')
  const investmentAccts   = accts.filter((a: any) => ['investment', 'brokerage'].includes(String(a.type ?? '').toLowerCase()))
  const creditAccts       = accts.filter((a: any) => String(a.type ?? '').toLowerCase() === 'credit')

  const liquidTotal     = depositoryAccts.reduce((s: number, a: any) => s + accountSignedBalance(a), 0)
  const investmentTotal = investmentAccts.reduce((s: number, a: any) => s + accountSignedBalance(a), 0)
  const creditDebt      = creditAccts.reduce((s: number, a: any) => s + Math.abs(Number(a.balance_current ?? 0)), 0)
  const netWorth        = accts.reduce((s: number, a: any) => s + accountSignedBalance(a), 0)
  const institutionCount = new Set(accts.map((a: any) => a.institution_id ?? a.institution_name ?? a.name)).size

  const xpEarned = DEFAULT_ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  const sortedAccounts = [...accts].sort(
    (a: any, b: any) => Math.abs(Number(b.balance_current ?? 0)) - Math.abs(Number(a.balance_current ?? 0)),
  )

  // Build entity name lookup
  const entityMap: Record<string, string> = {}
  for (const e of ents) entityMap[e.id] = e.entity_name

  const groups = groupByOwner(sortedAccounts, entityMap)

  return (
    <>
      <Hero
        label="◈ ACCOUNTS · FINANCIAL ACCOUNTS"
        greeting="Financial Accounts"
        primaryMetric={USD(netWorth)}
        metricSubtitle="Net Worth · all accounts"
        kpiCards={[
          { label: 'Banking',      value: USD(liquidTotal),     delta: `${depositoryAccts.length} checking/savings`, deltaPositive: true  },
          { label: 'Investments',  value: USD(investmentTotal), delta: 'portfolio value',                             deltaPositive: true  },
          { label: 'Credit Debt',  value: USD(creditDebt),      delta: `${creditAccts.length} cards`,                deltaPositive: false },
          { label: 'Institutions', value: String(institutionCount), delta: 'linked banks',                           deltaPositive: true  },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={DEFAULT_ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* Net Worth KPI strip */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Balance Summary</h2>
            <span className="achieve-count">{accts.length} accounts</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <SpecCard accent dataSource="financial_accounts.balance_current">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Net Worth</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', background: 'linear-gradient(135deg,var(--orange),var(--pink),var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{USD(netWorth)}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>All accounts combined</div>
          </SpecCard>
          <SpecCard accent dataSource="financial_accounts.balance_current">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Liquid Cash</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>{USD(liquidTotal)}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Checking + savings</div>
          </SpecCard>
          <SpecCard accent dataSource="financial_accounts.balance_current">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Investments</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--purple)' }}>{USD(investmentTotal)}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Brokerage + retirement</div>
          </SpecCard>
          <SpecCard accent dataSource="financial_accounts.balance_current">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Credit Debt</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--red)' }}>{USD(creditDebt)}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Credit cards balance</div>
          </SpecCard>
        </div>
      </section>

      {/* Link new account bar */}
      <LinkAccountBar entities={ents} />

      {/* Accounts table grouped by owner */}
      {accts.length > 0 ? (
        <section style={{ marginBottom: 28 }}>
          <div className="section-header">
            <div className="section-header-left">
              <h2 className="section-title">All Accounts</h2>
              <span className="achieve-count">{accts.length} accounts · {groups.length} owner group{groups.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {groups.map(group => (
            <div key={group.key} style={{ marginBottom: 20 }}>
              {/* Group header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 8, padding: '0 2px',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: group.key === 'personal' ? 'var(--green)' : 'var(--purple)',
                  background: group.key === 'personal' ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)',
                  padding: '3px 8px', borderRadius: 4,
                }}>
                  {group.key === 'personal' ? 'Personal' : 'Entity'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{group.label}</span>
                <span style={{ fontSize: 11, color: 'var(--dim)' }}>{group.accounts.length} account{group.accounts.length !== 1 ? 's' : ''}</span>
              </div>

              <SpecCard dataSource="financial_accounts">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={TH_STYLE}>Account</th>
                        <th style={TH_STYLE}>Institution</th>
                        <th style={TH_STYLE}>Type</th>
                        <th style={TH_STYLE}>Owner</th>
                        <th style={{ ...TH_STYLE, textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.accounts.map((a: any, i: number) => {
                        const badge  = typeBadge(a.type, a.subtype)
                        const bal    = Number(a.balance_current ?? 0)
                        const isNeg  = bal < 0 || String(a.type ?? '').toLowerCase() === 'credit'
                        return (
                          <tr key={a.id ?? i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td style={{ padding: '10px 10px', fontWeight: 500 }}>
                              {a.name}
                              {a.mask && <span style={{ color: 'var(--dim)', fontSize: 10, marginLeft: 6 }}>···{a.mask}</span>}
                            </td>
                            <td style={{ padding: '10px 10px', fontSize: 11, color: 'var(--dim)' }}>
                              {a.institution_name ?? '—'}
                            </td>
                            <td style={{ padding: '10px 10px' }}>
                              <span style={{
                                fontSize: 10, fontFamily: 'var(--mo)',
                                background: badge.bg, color: badge.color,
                                padding: '2px 6px', borderRadius: 4,
                              }}>
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <EntitySelect
                                accountId={a.id}
                                currentScope={a.account_scope ?? 'personal'}
                                currentEntity={a.entity_id ?? null}
                                entities={ents}
                              />
                            </td>
                            <td style={{
                              padding: '10px 10px', textAlign: 'right',
                              fontFamily: 'var(--mo)', color: isNeg ? 'var(--red)' : 'inherit',
                            }}>
                              {isNeg ? `-${USD2(Math.abs(bal))}` : USD2(bal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </SpecCard>
            </div>
          ))}
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          <ComingSoon title="Banking Accounts"    reason="Checking and savings balances from all linked institutions via Plaid." icon="🏦" connect="plaid" dataSource="coming-soon:accounts.banking"     skeleton="table" />
          <ComingSoon title="Investment Portfolio" reason="Brokerage and retirement account holdings, performance, and allocation." icon="📈" connect="plaid" dataSource="coming-soon:accounts.investments" skeleton="chart" />
          <ComingSoon title="Credit Accounts"     reason="Credit cards, lines of credit, utilization rates, and payment due dates." icon="💳" connect="plaid" dataSource="coming-soon:accounts.credit"       skeleton="table" />
        </div>
      )}

      {/* Properties Summary */}
      {(properties as any[]).length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div className="section-header">
            <div className="section-header-left">
              <h2 className="section-title">Properties</h2>
              <span className="achieve-count">{(properties as any[]).length} properties</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {(properties as any[]).map((p: any) => {
              const val   = Number(p.current_value ?? 0)
              const mort  = Number(p.mortgage_balance ?? 0)
              const pct   = Number(p.ownership_pct ?? 100)
              const equity = (val - mort) * pct / 100
              return (
                <SpecCard key={p.id} accent dataSource="property_assets">
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{p.address}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 12 }}>
                    {[p.city, p.state].filter(Boolean).join(', ')}
                    {p.is_rental && <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(245,158,11,0.12)', color: 'var(--amber)', padding: '1px 5px', borderRadius: 3 }}>STR</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--dim)' }}>Value</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)' }}>{USD(val)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--dim)' }}>Owned Equity</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>{USD(equity)}</div>
                    </div>
                    {p.monthly_payment && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--dim)' }}>Mortgage Pmt</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)' }}>${Number(p.monthly_payment).toLocaleString()}/mo</div>
                      </div>
                    )}
                    {p.monthly_expenses && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--dim)' }}>Monthly Exp</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--red)' }}>${Number(p.monthly_expenses).toLocaleString()}/mo</div>
                      </div>
                    )}
                  </div>
                </SpecCard>
              )
            })}
          </div>
        </section>
      )}

      {/* Net Worth Trend + Transaction Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon title="Transaction Feed"  reason="Recent transactions across all accounts — categorized and searchable." icon="🔄" connect="plaid" dataSource="coming-soon:accounts.transactions" skeleton="table" />
        <ComingSoon title="Net Worth Trend"   reason="Historical net worth chart across all asset classes and account types."  icon="💰" dataSource="coming-soon:accounts.net_worth"                 skeleton="chart" />
      </div>
    </>
  )
}
