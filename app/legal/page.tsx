/**
 * Legal Docs — contracts, filings, compliance.
 * Hero metric: Active Legal Documents
 * Animation: seal/shield with concentric rings + golden scan lines
 * Sources: entity_documents where category='legal', entity_ownership
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getEntityDocuments, getEntities, getUpcomingTaxDeadlines, getUserProfile, getComplianceChecklist } from '../lib/queries'

export const dynamic = 'force-dynamic'

const LEGAL_TYPES = ['operating_agreement', 'contract', 'insurance', 'formation', 'filing', 'ein', 'annual_report', 'legal', 'nda']

const ACHIEVEMENTS = [
  { name: 'Entity Formed',     description: 'Filed the first LLC or entity.',              xp: 200, progress: 100, icon: '🏛️', earned: true  },
  { name: 'NDA Shield',        description: 'At least 3 active NDAs on file.',             xp: 250, progress: 100, icon: '🤐', earned: true  },
  { name: 'Contract King',     description: 'Library holds 10+ active contracts.',        xp: 350, progress: 60,  icon: '📜', earned: false },
  { name: 'Compliance Clear',  description: 'All entities have current annual reports.',   xp: 400, progress: 70,  icon: '✅', earned: false },
  { name: 'Filings Current',   description: 'No overdue tax or compliance filings.',       xp: 300, progress: 80,  icon: '📋', earned: false },
  { name: 'EIN Registered',    description: 'EIN on file for every active entity.',        xp: 200, progress: 100, icon: '🔢', earned: true  },
  { name: 'Audit Ready',       description: 'All docs indexed and searchable.',            xp: 500, progress: 40,  icon: '🔍', earned: false },
  { name: 'Legal Empire',      description: 'Multi-state entity coverage.',                xp: 600, progress: 50,  icon: '⚖️', earned: false },
]

export default async function LegalPage() {
  const [docs, entities, deadlines, profile, compliance] = await Promise.all([
    getEntityDocuments(LEGAL_TYPES).catch(() => []),
    getEntities().catch(() => []),
    getUpcomingTaxDeadlines().catch(() => []),
    getUserProfile().catch(() => null),
    getComplianceChecklist().catch(() => []),
  ])

  const allDocs = docs as any[]
  const totalActive = allDocs.length

  const buckets: Record<string, any[]> = {
    'Entity Filings':        allDocs.filter((d: any) => ['formation', 'filing', 'annual_report', 'ein'].includes(d.document_type)),
    'Operating Agreements':  allDocs.filter((d: any) => d.document_type === 'operating_agreement'),
    'Contracts':             allDocs.filter((d: any) => d.document_type === 'contract'),
    'NDAs':                  allDocs.filter((d: any) => d.document_type === 'nda'),
    'Insurance':             allDocs.filter((d: any) => d.document_type === 'insurance'),
  }

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    stats: [
      { key: 'Legal Docs',  value: String(totalActive) },
      { key: 'Entities',    value: String(entities.length) },
      { key: 'Filings Due', value: String(deadlines.length) },
      { key: 'XP',          value: (profile.xp ?? 0).toLocaleString() },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="⚖️ LEGAL · CONTRACTS &amp; FILINGS"
        greeting="Legal Documents"
        primaryMetric={String(totalActive)}
        metricSubtitle={`${entities.length} entities · ${deadlines.length} upcoming filings`}
        kpiCards={[
          { label: 'Contracts',       value: String(buckets['Contracts'].length) },
          { label: 'NDAs',            value: String(buckets['NDAs'].length) },
          { label: 'Filings Due',     value: String(deadlines.length), delta: deadlines.length > 0 ? 'Action needed' : 'All clear', deltaPositive: deadlines.length === 0 },
          { label: 'Compliance',      value: '—' },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Docs',   value: String(totalActive),                    color: 'var(--accent)' },
          { label: 'Contracts',    value: String(buckets['Contracts'].length),     color: 'var(--amber)'  },
          { label: 'NDAs',         value: String(buckets['NDAs'].length),          color: 'var(--green)'  },
          { label: 'Filings Due',  value: String(deadlines.length),               color: deadlines.length > 0 ? 'var(--red)' : 'var(--green)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="entity_documents">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Entities + Upcoming Filings side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <SpecCard accent dataSource="entity_ownership">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Entities on File ({entities.length})
          </div>
          {entities.length === 0 && <p style={{ fontSize: 12, color: 'var(--dim)' }}>No entities found.</p>}
          {(entities as any[]).map((e: any) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{e.entity_name}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginTop: 2 }}>{e.entity_type} · {e.state ?? '—'}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                EIN {e.ein ? '••' + String(e.ein).slice(-4) : '—'}
              </div>
            </div>
          ))}
        </SpecCard>

        <SpecCard accent dataSource="tax_deadlines">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Upcoming Filings
          </div>
          {deadlines.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--green)' }}>All clear — no upcoming filings.</p>
          )}
          {(deadlines as any[]).map((d: any) => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{d.kind}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{d.entity_id ?? 'All entities'}</div>
              </div>
              <div style={{ fontFamily: 'var(--mo)', fontSize: 11, color: 'var(--red)' }}>{d.deadline_date}</div>
            </div>
          ))}
        </SpecCard>
      </div>

      {/* Document buckets */}
      {Object.entries(buckets).map(([title, list]) => (
        <SpecCard key={title} accent dataSource="entity_documents" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            {title} · {list.length}
          </div>
          {list.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--dim)' }}>Nothing filed in this bucket yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {list.map((d: any) => (
                <div key={d.id} style={{ padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.entity_name ?? d.entity_id ?? 'Unfiled'}</div>
                  <div style={{ fontWeight: 600, fontSize: 12, margin: '4px 0', wordBreak: 'break-word' }}>{d.filename ?? d.title ?? d.id}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{d.created_at?.slice(0,10) ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      ))}

      {/* Compliance checklist — derived per entity */}
      <SpecCard accent dataSource="entity_ownership,entity_documents,financial_accounts" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Compliance Checklist</div>
          <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
            Avg {((compliance as any[]) ?? []).length > 0 ? Math.round(((compliance as any[]) ?? []).reduce((s, r: any) => s + r.score, 0) / ((compliance as any[]) ?? []).length) : 0}/100
          </span>
        </div>
        {((compliance as any[]) ?? []).length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>No entities to score.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {((compliance as any[]) ?? []).map((c: any) => {
              const col = c.score >= 80 ? 'var(--green)' : c.score >= 60 ? 'var(--amber)' : 'var(--red)'
              return (
                <div key={c.entityId} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{c.entityName}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--mo)', color: col, fontWeight: 700 }}>{c.score}/100</div>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${c.score}%`, background: col, borderRadius: 2 }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {c.checks.map((chk: any) => (
                      <span key={chk.key} style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 3, fontFamily: 'var(--mo)',
                        background: chk.pass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                        color: chk.pass ? 'var(--green)' : 'var(--red)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {chk.pass ? '✓' : '✗'} {chk.key}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SpecCard>
    </>
  )
}
