/**
 * Personal — your wallet, not your empire.
 * Sprint 1.C (2026-04-18). Scopes everything to financial_accounts where
 * account_scope='personal'. Separate from /finance (Empire View).
 */
import Hero from '../../_components/Hero'
import HeroCanvasDefault from '../../_components/HeroCanvasDefault'
import { getPersonalFinance, getPersonalRecurring } from '../../lib/queries'
import { fmtMoney, fmtMoneyExact, fmtPct } from '../../lib/format'
import { PersonalRadial, RecurringChargesList } from './_components/PersonalWidgets'
import { Wallet, Shield, TrendingDown, TrendingUp, Banknote } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p } catch { return fallback }
}

export default async function PersonalFinance() {
  const [p, recurring] = await Promise.all([
    safe(getPersonalFinance(90), {
      accounts: [], liquidCash: 0, brokerage: 0, creditDebt: 0, netWorth: 0,
      monthlyBurn: 0, emergencyMonths: null, savingsRate: null,
      recentOutflow: 0, recentInflow: 0, burnDays: 90,
    } as Awaited<ReturnType<typeof getPersonalFinance>>),
    safe(getPersonalRecurring(120), [] as Awaited<ReturnType<typeof getPersonalRecurring>>),
  ])

  const savingsRateDanger = p.savingsRate != null && p.savingsRate < 5
  const runwayDanger      = p.emergencyMonths != null && p.emergencyMonths < 2

  return (
    <div style={{ padding: '0 0 80px' }}>
      <Hero
        label="◆ PERSONAL · YOUR WALLET"
        greeting="Personal finance"
        primaryMetric={fmtMoney(p.netWorth)}
        metricSubtitle={`Personal Net Worth · ${fmtMoneyExact(p.netWorth)} exact`}
        kpiCards={[
          { label: 'Liquid Cash',   value: fmtMoney(p.liquidCash),
            delta: `${p.accounts.filter(a => a.type === 'depository').length} accounts`,
            deltaPositive: p.liquidCash > 0 },
          { label: 'Brokerage',     value: fmtMoney(p.brokerage),
            delta: `${p.accounts.filter(a => a.type === 'investment').length} accounts` },
          { label: 'Credit Debt',   value: fmtMoney(p.creditDebt),
            delta: `${p.accounts.filter(a => a.type === 'credit').length} cards`,
            deltaPositive: p.creditDebt === 0 },
          { label: 'Monthly Burn',  value: fmtMoney(p.monthlyBurn),
            delta: 'last 90 days avg', deltaPositive: false },
          { label: 'Emergency',     value: p.emergencyMonths != null ? `${p.emergencyMonths.toFixed(1)}mo` : '—',
            delta: 'cash runway', deltaPositive: !runwayDanger },
        ]}
        animationSlot={<HeroCanvasDefault />}
      />

      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Red-alert banner when runway or savings rate is dangerous */}
        {(savingsRateDanger || runwayDanger) && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <TrendingDown size={16} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
              {runwayDanger && `Emergency fund is only ${p.emergencyMonths?.toFixed(1)} months. Aim for 6+.`}
              {runwayDanger && savingsRateDanger && ' '}
              {savingsRateDanger && `Savings rate ${p.savingsRate?.toFixed(1)}% is below the 5% danger line.`}
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          <PersonalRadial netWorth={p.netWorth} liquidCash={p.liquidCash} brokerage={p.brokerage} debt={p.creditDebt} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StatRow icon={<Wallet size={14} />} label="90-day inflow"   value={fmtMoney(p.recentInflow)}  color="#10b981" />
            <StatRow icon={<TrendingDown size={14} />} label="90-day outflow"  value={fmtMoney(p.recentOutflow)} color="#ef4444" />
            <StatRow icon={<TrendingUp size={14} />} label="Savings rate"
                     value={p.savingsRate != null ? fmtPct(p.savingsRate) : '—'}
                     color={savingsRateDanger ? '#ef4444' : '#10b981'} />
            <StatRow icon={<Shield size={14} />} label="Emergency cushion"
                     value={p.emergencyMonths != null ? `${p.emergencyMonths.toFixed(1)} months` : '—'}
                     color={runwayDanger ? '#ef4444' : '#10b981'} />
            <StatRow icon={<Banknote size={14} />} label="Linked accounts"
                     value={`${p.accounts.length} connected`} color="rgba(255,255,255,0.65)" />
          </div>
        </div>

        <RecurringChargesList charges={recurring} />

        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--mo)', textAlign: 'center',
          padding: '14px 0 0', letterSpacing: '.04em',
        }}>
          Personal scope only · financial_accounts.account_scope=&apos;personal&apos;. Empire-wide view at /finance.
        </p>
      </div>
    </div>
  )
}

function StatRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
    }}>
      <span style={{ color, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color, fontFamily: 'var(--mo)' }}>{value}</span>
    </div>
  )
}
