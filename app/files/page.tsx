/**
 * Workspace Files — file manager and upload hub.
 * Hero metric: Total Files
 * Animation: folder/file icons floating in 3D perspective grid
 * Sources: entity_documents (workspace_files fallback)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getEntityDocuments, getUserProfile } from '../lib/queries'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Upload',     description: 'Uploaded the first file to the workspace.',   xp: 100, progress: 100, icon: '📤', earned: true  },
  { name: 'File Organizer',   description: 'Files span 3+ entity folders.',               xp: 200, progress: 100, icon: '🗂️', earned: true  },
  { name: 'AI Indexed',       description: 'At least 10 files indexed by agents.',        xp: 300, progress: 60,  icon: '🤖', earned: false },
  { name: '50 Files',         description: 'Workspace holds 50+ files.',                  xp: 250, progress: 30,  icon: '📦', earned: false },
  { name: 'Agent Feed',       description: 'Agents have read and summarized files.',      xp: 350, progress: 40,  icon: '🔬', earned: false },
  { name: 'Zero Orphans',     description: 'Every file assigned to an entity.',           xp: 200, progress: 55,  icon: '✅', earned: false },
  { name: 'Shared Team',      description: 'Files shared with at least one team member.', xp: 300, progress: 10,  icon: '🤝', earned: false },
  { name: 'File Empire',      description: 'Workspace holds 200+ files.',                 xp: 500, progress: 5,   icon: '🏰', earned: false },
]

function fmtSize(bytes?: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/': '🖼️',
  'video/': '🎬',
  'audio/': '🎵',
  'text/': '📝',
  'application/zip': '🗜️',
  'application/json': '⚙️',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml': '📊',
  'application/msword': '📝',
}

function mimeIcon(mime?: string | null): string {
  if (!mime) return '📄'
  for (const [prefix, icon] of Object.entries(MIME_ICONS)) {
    if (mime.startsWith(prefix)) return icon
  }
  return '📄'
}

export default async function FilesPage() {
  const [docs, profile] = await Promise.all([
    getEntityDocuments().catch(() => []),
    getUserProfile().catch(() => null),
  ])

  const allDocs = docs as any[]
  const totalFiles = allDocs.length

  const byEntity = allDocs.reduce<Record<string, any[]>>((m, d: any) => {
    const k = d.entity_name ?? d.entity_id ?? 'Unfiled'
    ;(m[k] ??= []).push(d)
    return m
  }, {})

  const analyzed     = allDocs.filter((d: any) => d.analysis_status === 'completed').length
  const totalStorage = allDocs.reduce((s: number, d: any) => s + Number(d.file_size ?? 0), 0)
  const storageMB    = (totalStorage / (1024 * 1024)).toFixed(1)

  // Recent 10
  const recentFiles = [...allDocs]
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 10)

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    stats: [
      { key: 'Files',    value: String(totalFiles) },
      { key: 'Indexed',  value: String(analyzed) },
      { key: 'Storage',  value: storageMB + ' MB' },
      { key: 'XP',       value: (profile.xp ?? 0).toLocaleString() },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="📁 WORKSPACE FILES · UPLOADS &amp; ASSETS"
        greeting="File Manager"
        primaryMetric={String(totalFiles)}
        metricSubtitle={`${analyzed} indexed · ${storageMB} MB stored`}
        kpiCards={[
          { label: 'Total Files',   value: String(totalFiles) },
          { label: 'AI Indexed',    value: String(analyzed) },
          { label: 'Starred',       value: '—' },
          { label: 'Storage',       value: storageMB + ' MB' },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Files',  value: String(totalFiles),                  color: 'var(--orange)' },
          { label: 'AI Indexed',   value: String(analyzed),                    color: 'var(--green)'  },
          { label: 'Entities',     value: String(Object.keys(byEntity).length), color: 'var(--purple)' },
          { label: 'Storage',      value: storageMB + ' MB',                   color: 'var(--amber)'  },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="entity_documents">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Recent files */}
      <SpecCard accent dataSource="entity_documents" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Recent Files
        </div>
        {recentFiles.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--dim)' }}>
            No files yet. Files added to <code>entity_documents</code> appear here automatically.
          </p>
        ) : (
          recentFiles.map((d: any) => (
            <div key={d.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{mimeIcon(d.mime_type)}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, wordBreak: 'break-word' }}>{d.filename ?? d.title ?? d.id}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                    {d.entity_name ?? d.entity_id ?? 'Unfiled'} · {d.document_type ?? 'file'}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontFamily: 'var(--mo)', fontSize: 11 }}>{fmtSize(d.file_size)}</div>
                <div style={{
                  fontSize: 10, marginTop: 3, fontFamily: 'var(--mo)',
                  color: d.analysis_status === 'completed' ? 'var(--green)'
                    : d.analysis_status === 'failed' ? 'var(--red)' : 'var(--amber)',
                }}>
                  {d.analysis_status ?? 'pending'}
                </div>
              </div>
            </div>
          ))
        )}
      </SpecCard>

      {/* Entity file tree */}
      {Object.keys(byEntity).length > 0 && (
        <SpecCard accent dataSource="entity_documents" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            By Entity
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {Object.entries(byEntity).map(([entity, list]) => (
              <div key={entity} style={{ padding: 14, background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>📁</span>
                  <div style={{ fontWeight: 600, fontSize: 12, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--orange)' }}>{list.length}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>files</div>
              </div>
            ))}
          </div>
        </SpecCard>
      )}

      {/* Shared With Me */}
      <div style={{ marginBottom: 24 }}>
        <ComingSoon
          title="Shared With Me"
          reason="Files shared by teammates once the sharing permissions table is wired."
          icon="🤝"
          dataSource="coming-soon:file_shares"
          skeleton="table"
          minHeight={160}
        />
      </div>

      {/* Starred Files */}
      <div style={{ marginBottom: 24 }}>
        <ComingSoon
          title="Starred Files"
          reason="Quick-access starred files — add a starred column to entity_documents to activate."
          icon="⭐"
          dataSource="coming-soon:entity_documents.starred"
          skeleton="table"
          minHeight={140}
        />
      </div>
    </>
  )
}
