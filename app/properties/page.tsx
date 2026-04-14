import { getProperties } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function PropertiesPage() {
  const properties = await getProperties()
  const totalValue = properties.reduce((s: number, p: any) => s + Number(p.current_value ?? 0), 0)
  const totalEquity = properties.reduce((s: number, p: any) => s + Number(p.equity ?? 0), 0)

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ PROPERTIES · REAL ESTATE PORTFOLIO</div>
        <h1>Properties</h1>
        <div className="big">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <p>
          {properties.length} properties · ${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })} equity
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {properties.map((p: any) => (
          <div key={p.id} className="mc-card accent">
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {p.property_type ?? '—'} · {p.is_rental ? 'Rental' : 'Owner-occupied'}
            </div>
            <h3 style={{ fontSize: 15, margin: '6px 0' }}>{p.name ?? p.address}</h3>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{p.address}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--mo)', fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>VALUE</div>
                <div>${Number(p.current_value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>MORTGAGE</div>
                <div>${Number(p.mortgage_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>EQUITY</div>
                <div style={{ color: 'var(--green)' }}>${Number(p.equity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
