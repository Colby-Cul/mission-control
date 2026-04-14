import { getProperties } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function RentalsPage() {
  const all = await getProperties()
  const rentals = all.filter((p: any) => p.is_rental)
  const totalValue = rentals.reduce((s: number, p: any) => s + Number(p.current_value ?? 0), 0)
  const monthlyRent = rentals.reduce((s: number, p: any) => s + Number(p.monthly_rent ?? 0), 0)

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ RENTALS · INCOME PROPERTIES</div>
        <h1>Rentals</h1>
        <div className="big">${monthlyRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</div>
        <p>
          {rentals.length} rental properties · ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} total value
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {rentals.map((p: any) => (
          <div key={p.id} className="mc-card accent">
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {p.property_type ?? 'Rental'}
            </div>
            <h3 style={{ fontSize: 15, margin: '6px 0' }}>{p.name ?? p.address}</h3>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{p.address}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--mo)', fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>RENT/MO</div>
                <div style={{ color: 'var(--green)' }}>${Number(p.monthly_rent ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>VALUE</div>
                <div>${Number(p.current_value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>EQUITY</div>
                <div>${Number(p.equity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
          </div>
        ))}
        {rentals.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>No rentals flagged yet.</div>}
      </div>
    </>
  )
}
