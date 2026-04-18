export const dynamic = 'force-dynamic'

export default function BillingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <header>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--orange)', fontFamily: 'var(--mo)', marginBottom: 6 }}>
          Settings · Billing
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Billing & Plan</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.55 }}>
          Subscription, payment methods, and invoice history. Mission Control is
          self-hosted — no subscription yet.
        </p>
      </header>
      <div style={{
        padding: '14px 16px',
        background: 'rgba(16,185,129,0.05)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>
          Self-hosted · No billing
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          You run this on your own Vercel + Supabase infra. Costs show up on
          each provider&rsquo;s dashboard, not here.
        </div>
      </div>
    </div>
  )
}
