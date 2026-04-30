'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User, Sliders, CreditCard, Plug, Receipt, Lock, Building2,
  Folder, FileText, Scale, Brain, Monitor, AlertTriangle, Clock, FlaskConical, Download,
} from 'lucide-react'

const GROUPS: Array<{ title: string; items: Array<{ label: string; href: string; icon: React.ReactNode }> }> = [
  {
    title: 'Account',
    items: [
      { label: 'Profile',          href: '/settings',             icon: <User size={14} /> },
      { label: 'Preferences',      href: '/settings/preferences', icon: <Sliders size={14} /> },
      { label: 'Security',         href: '/settings/security',    icon: <Lock size={14} /> },
      { label: 'Billing & Plan',   href: '/settings/billing',     icon: <Receipt size={14} /> },
    ],
  },
  {
    title: 'Data & Connections',
    items: [
      { label: 'Connected Accounts', href: '/settings/connected-accounts', icon: <CreditCard size={14} /> },
      { label: 'Integrations',       href: '/settings/integrations',       icon: <Plug size={14} /> },
      { label: 'Entities & Ownership', href: '/settings/entities',         icon: <Building2 size={14} /> },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Files',      href: '/settings/files',     icon: <Folder size={14} /> },
      { label: 'Documents',  href: '/settings/documents', icon: <FileText size={14} /> },
      { label: 'Legal Vault', href: '/settings/legal',    icon: <Scale size={14} /> },
      { label: 'Memory',     href: '/settings/memory',    icon: <Brain size={14} /> },
    ],
  },
  {
    title: 'Ops & AI',
    items: [
      { label: 'System Monitor',    href: '/settings/monitor',   icon: <Monitor size={14} /> },
      { label: 'Incidents',         href: '/settings/incidents', icon: <AlertTriangle size={14} /> },
      { label: 'Sessions & AI Cost', href: '/settings/sessions', icon: <Clock size={14} /> },
      { label: 'Skills Lab',        href: '/settings/skills',    icon: <FlaskConical size={14} /> },
      { label: 'Export & Backups',  href: '/settings/export',    icon: <Download size={14} /> },
    ],
  },
]

export default function SettingsNav() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href ||
    (href !== '/settings' && pathname.startsWith(href))

  return (
    <nav aria-label="Settings sub-navigation" style={{
      display: 'flex', flexDirection: 'column', gap: 20,
      position: 'sticky', top: 68, alignSelf: 'start',
      maxHeight: 'calc(100vh - 88px)', overflowY: 'auto',
      paddingRight: 8,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--mo)', marginBottom: 8 }}>
          Settings
        </div>
      </div>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
            fontFamily: 'var(--mo)', marginBottom: 6, paddingLeft: 8,
          }}>
            {group.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.items.map((item) => {
              const on = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? 'page' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: 8,
                    fontSize: 13, fontWeight: on ? 600 : 500,
                    color: on ? 'var(--accent)' : 'rgba(255,255,255,0.65)',
                    background: on ? 'rgba(59,130,246,0.08)' : 'transparent',
                    textDecoration: 'none',
                    position: 'relative',
                    transition: 'background .1s, color .1s',
                  }}
                >
                  {on && (
                    <span aria-hidden style={{
                      position: 'absolute', left: -2, top: 6, bottom: 6, width: 3,
                      background: 'var(--accent)', borderRadius: '0 2px 2px 0',
                    }} />
                  )}
                  <span style={{ color: on ? 'var(--accent)' : 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
