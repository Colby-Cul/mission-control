import { CalmModeToggle } from '../../_components/CalmMode'

export const dynamic = 'force-dynamic'

/**
 * Preferences — display, motion, density, locale. Dedicated page so the
 * Calm Mode toggle isn't buried in the main Settings hero.
 */
export default function PreferencesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <header>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--orange)', fontFamily: 'var(--mo)', marginBottom: 6 }}>
          Settings · Preferences
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Preferences</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.55, maxWidth: 640 }}>
          Display, motion, and locale defaults. These are stored locally per device.
        </p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionTitle>Motion & Focus</SectionTitle>
        <CalmModeToggle />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionTitle>Locale</SectionTitle>
        <ReadOnlyRow label="Currency"  value="USD" />
        <ReadOnlyRow label="Timezone"  value="America/Los_Angeles" />
        <ReadOnlyRow label="Theme"     value="Dark (default)" />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionTitle>Notifications</SectionTitle>
        <ReadOnlyRow label="Email digests"   value="Enabled" />
        <ReadOnlyRow label="Telegram alerts" value="Enabled" />
      </section>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
      textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
      fontFamily: 'var(--mo)', paddingBottom: 4,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>{children}</div>
  )
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
    }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#f5f5f7', fontFamily: 'var(--mo)' }}>{value}</span>
    </div>
  )
}
