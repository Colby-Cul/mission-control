/**
 * Docs Hub — central document library.
 * Hero metric: Total Documents
 * Animation: floating document cards by category
 * Sources: documents (via getDocs + getEntityDocuments)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getDocs, getEntityDocuments, getUserProfile } from '../lib/queries'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Doc',         description: 'Uploaded the first document.',                 xp: 100, progress: 100, icon: '📄', earned: true  },
  { name: 'Organized',         description: 'Documents span 3+ categories.',                xp: 200, progress: 100, icon: '🗂️', earned: true  },
  { name: 'Fully Indexed',     description: 'All docs processed by the AI indexer.',        xp: 300, progress: 60,  icon: '🔍', earned: false },
  { name: '10 Docs',           description: 'Library holds 10+ documents.',                 xp: 150, progress: 100, icon: '📚', earned: true  },
  { name: 'Signed & Sealed',   description: 'At least 5 docs have valid signatures.',       xp: 250, progress: 40,  icon: '✍️', earned: false },
  { name: 'Expiry Hawk',       description: 'No documents expired in the last 90 days.',   xp: 200, progress: 70,  icon: '⏰', earned: false },
  { name: 'Doc Machine',       description: 'Library holds 50+ documents.',                 xp: 400, progress: 20,  icon: '🏛️', earned: false },
  { name: 'Zero Pending',      description: 'No documents awaiting signature.',             xp: 300, progress: 30,  icon: '✅', earned: false },
]

const CATEGORIES = ['Legal', 'Tax', 'Insurance', 'Property', 'Company', 'Personal']

const CAT_ICONS: Record<string, string> = {
  Legal: '⚖️', Tax: '📊', Insurance: '🛡️', Property: '🏠', Company: '🏢', Personal: '👤',
}

const CAT_COLORS: Record<string, string> = {
  Legal: 'var(--orange)', Tax: 'var(--amber)', Insurance: 'var(--green)',
  Property: 'var(--purple)', Company: 'var(--pink)', Personal: '#06b6d4',
}

function fmtSize(bytes?: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocsPage() {
  const [entityDocs, profile] = await Promise.all([
    getEntityDocuments().catch(() => []),
    getUserProfile().catch(() => null),
  ])

  const allDocs = entityDocs as any[]
  const totalDocs = allDocs.length

  // Categorise
  const byCategory: Record<string, any[]> = {}
  CATEGORIES.forEach(c => { byCategory[c] = [] })
  allDocs.forEach((d: any) => {
    const cat = d.document_type?.charAt(0).toUpperCase() + d.document_type?.slice(1) ?? 'Other'
    const match = CATEGORIES.find(c => c.toLowerCase() === (d.document_type ?? '').toLowerCase())
    if (match) byCategory[match].push(d)
    else byCategory['Company'] = byCategory['Company'] ?? []
  })

  // Stats
  const thisMonth = allDocs.filter((d: any) => {
    const dt = d.created_at ?? ''
    const now = new Date()
    return dt.startsWith(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  }).length

  const totalStorage = allDocs.reduce((s: number, d: any) => s + Number(d.file_size ?? 0), 0)
  const storageMB = (totalStorage / (1024 * 1024)).toFixed(1)

  const recentDocs = [...allDocs].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')
  ).slice(0, 8)

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    stats: [
      { key: 'Total Docs',  value: String(totalDocs) },
      { key: 'This Month',  value: String(thisMonth) },
      { key: 'Storage',     value: storageMB + ' MB' },
      { key: 'XP',          value: (profile.xp ?? 0).toLocaleString() },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="📁 DOCS HUB · DOCUMENT LIBRARY"
        greeting="Documents & Knowledge"
        primaryMetric={String(totalDocs)}
        metricSubtitle="total documents indexed"
        kpiCards={[
          { label: 'This Month',       value: String(thisMonth) },
          { label: 'Awaiting Sign',    value: '—' },
          { label: 'Expiring Soon',    value: '—' },
          { label: 'Storage',          value: storageMB + ' MB' },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Docs',    value: String(totalDocs), color: 'var(--orange)' },
          { label: 'This Month',    value: String(thisMonth), color: 'var(--green)'  },
          { label: 'Awaiting Sign', value: '—',               color: 'var(--amber)'  },
          { label: 'Storage',       value: storageMB + ' MB', color: 'var(--purple)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="entity_documents">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Category grid */}
      <SpecCard accent dataSource="entity_documents" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Categories
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {CATEGORIES.map(cat => {
            const count = byCategory[cat]?.length ?? 0
            return (
              <div key={cat} style={{
                padding: 16, background: 'rgba(255,255,255,0.025)', borderRadius: 12,
                border: `1px solid rgba(255,255,255,0.07)`, textAlign: 'center',
                cursor: 'pointer', transition: 'transform 0.2s',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{CAT_ICONS[cat]}</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: CAT_COLORS[cat] }}>{cat}</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mo)', marginTop: 4 }}>{count}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>documents</div>
              </div>
            )
          })}
        </div>
      </SpecCard>

      {/* Recent uploads */}
      <SpecCard accent dataSource="entity_documents" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Recent Uploads
        </div>
        {recentDocs.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--dim)' }}>No documents yet. Add rows to <code>entity_documents</code>.</p>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {recentDocs.map((d: any) => (
              <div key={d.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 18 }}>
                    {CAT_ICONS[d.document_type?.charAt(0).toUpperCase() + d.document_type?.slice(1)] ?? '📄'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{d.filename ?? d.title ?? d.id}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>
                      {d.document_type ?? '—'} · {d.entity_name ?? d.entity_id ?? 'Unfiled'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontFamily: 'var(--mo)', fontSize: 11 }}>{fmtSize(d.file_size)}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{d.created_at?.slice(0,10) ?? '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SpecCard>

      {/* Expiring soon */}
      <div style={{ marginBottom: 24 }}>
        <ComingSoon
          title="Expiring Soon"
          reason="Documents approaching expiration — insurance, contracts, licenses."
          icon="⏰"
          dataSource="coming-soon:entity_documents.expiry_date"
          skeleton="table"
          minHeight={160}
        />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <ComingSoon
          title="Document Search"
          reason="Full-text search across all indexed documents."
          icon="🔍"
          dataSource="coming-soon:entity_documents.full_text"
          skeleton="table"
          minHeight={140}
        />
      </div>
    </>
  )
}
