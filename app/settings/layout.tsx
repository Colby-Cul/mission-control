import SettingsNav from './_components/SettingsNav'

/**
 * Settings hub layout — two-pane: left sub-nav, right content. No hero.
 * Sprint 1 IA restructure (2026-04-18) consolidated 12 back-office surfaces
 * (Accounts, Entities, Integrations, Files, Docs, Legal, Memory, Monitor,
 * Incidents, Sessions, Skills) into /settings/* so the top-level sidebar
 * stays at 9 high-signal items.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gap: 24,
      padding: '28px 24px 80px',
      maxWidth: 1500,
      margin: '0 auto',
      minHeight: 'calc(100vh - 52px)',
    }}>
      <SettingsNav />
      <main style={{ minWidth: 0 }}>{children}</main>
    </div>
  )
}
