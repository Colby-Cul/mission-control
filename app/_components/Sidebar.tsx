'use client'
/**
 * Sidebar — 68px icon rail that auto-expands to 260px on hover, revealing labels
 * + every nav item inline. Click any item to navigate. No more hidden flyouts.
 * Nav order matches NAV_GROUPS from ~/mission-control/src/components/Icons.jsx.
 */
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Sparkles,
  DollarSign,
  TrendingUp,
  Building2,
  Home,
  Briefcase,
  CheckSquare,
  Receipt,
  Bot,
  Flame,
  Settings,
  Zap,
  FileText,
  Folder,
  Scale,
  Brain,
  Monitor,
  AlertTriangle,
  Plug,
  Users,
  Building,
  Camera,
  Map,
  Clock,
  FlaskConical,
  Activity,
  Command,
  Star,
  Target,
  Shield,
  CreditCard,
  BookOpen,
} from 'lucide-react'

interface NavItem { label: string; icon: React.ReactNode; href: string }
interface NavGroup { id: string; label: string; icon: React.ReactNode; children: NavItem[] }

// Sprint 1 IA restructure (2026-04-18). Top-level sidebar dropped from 30+
// links to 9 — Home / Finance / Companies / Properties / Work / Agents /
// Team / Forge / Settings. Back-office surfaces (Accounts, Integrations,
// Entities, Files, Docs, Legal, Memory, Monitor, Incidents, Sessions,
// Skills) moved under /settings/*. Old URLs still work via redirects in
// next.config.js.
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home', label: 'Home', icon: <Home size={18} />,
    children: [
      { label: 'Home',         icon: <Home size={15} />,   href: '/' },
      { label: 'Vision Board', icon: <Target size={15} />, href: '/vision' },
    ],
  },
  {
    // Finance hub — four sub-views.
    id: 'finance', label: 'Finance', icon: <DollarSign size={18} />,
    children: [
      { label: 'Empire View',  icon: <Command size={15} />,      href: '/finance' },
      { label: 'Personal',     icon: <Users size={15} />,        href: '/finance/personal' },
      { label: 'Tax Planning', icon: <Shield size={15} />,       href: '/tax' },
      { label: 'Cash Flow',    icon: <TrendingUp size={15} />,   href: '/cash-flow' },
    ],
  },
  {
    id: 'companies', label: 'Companies', icon: <Building2 size={18} />,
    children: [
      { label: 'All Companies', icon: <Building2 size={15} />,  href: '/companies' },
      { label: 'Xome Home',     icon: <Building2 size={15} />,  href: '/companies/xome-home' },
    ],
  },
  {
    id: 'properties', label: 'Properties', icon: <Building size={18} />,
    children: [
      { label: 'All Properties', icon: <Building size={15} />, href: '/properties' },
      { label: 'Rentals',        icon: <Home size={15} />,     href: '/rentals' },
      { label: 'Photo Manager',  icon: <Camera size={15} />,   href: '/photos' },
    ],
  },
  {
    id: 'work', label: 'Work', icon: <Briefcase size={18} />,
    children: [
      { label: 'Projects', icon: <Briefcase size={15} />,   href: '/projects' },
      { label: 'Tasks',    icon: <CheckSquare size={15} />, href: '/tasks' },
    ],
  },
  {
    id: 'agents', label: 'Agents', icon: <Bot size={18} />,
    children: [
      { label: 'Agent Fleet', icon: <Bot size={15} />, href: '/agents' },
    ],
  },
  {
    id: 'team', label: 'Team', icon: <Users size={18} />,
    children: [
      { label: 'People', icon: <Users size={15} />, href: '/team' },
    ],
  },
  {
    id: 'forge', label: 'Forge', icon: <Flame size={18} />,
    children: [
      { label: 'Idea Pipeline', icon: <Flame size={15} />, href: '/forge' },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Settings', icon: <Settings size={18} />, href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="sb" role="navigation" aria-label="Main navigation">
      <Link href="/" className="sb-logo" aria-label="Mission Control home">
        MC
        <span className="sb-brand-text">Mission Control</span>
      </Link>

      <div className="sb-divider" />

      <nav className="sb-nav" aria-label="Main pages">
        {NAV_GROUPS.map(group => {
          const primary = group.children[0]
          const groupActive = group.children.some(c =>
            c.href === '/' ? pathname === '/' : pathname.startsWith(c.href))

          return (
            <div key={group.id} className="sb-group">
              {/* Collapsed-mode clickable group icon */}
              <Link
                href={primary.href}
                className={`sb-group-header${groupActive ? ' on' : ''}`}
                aria-label={`${group.label} — ${primary.label}`}
                title={group.label}
              >
                <span className="sb-icon">{group.icon}</span>
                <span className="sb-label">{group.label}</span>
              </Link>

              {/* Expanded-mode inline child list */}
              <div className="sb-children">
                {group.children.map(c => {
                  const on = c.href === '/' ? pathname === '/' : pathname.startsWith(c.href)
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`sb-child${on ? ' on' : ''}`}
                      aria-current={on ? 'page' : undefined}
                      title={c.label}
                    >
                      <span className="sb-icon-sm">{c.icon}</span>
                      <span className="sb-label">{c.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="sb-bottom">
        <div className="sb-divider" />
        {BOTTOM_ITEMS.map(item => {
          const on = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sb-group-header${on ? ' on' : ''}`}
              aria-label={item.label}
              aria-current={on ? 'page' : undefined}
              title={item.label}
            >
              <span className="sb-icon">{item.icon}</span>
              <span className="sb-label">{item.label}</span>
            </Link>
          )
        })}
        <div className="sb-avatar" aria-label="User menu" role="button" tabIndex={0}>
          C<span className="sb-avatar-label">Colby</span>
        </div>
      </div>
    </aside>
  )
}
