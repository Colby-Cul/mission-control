'use client'
/**
 * Sidebar — 68px icon rail per MASTER-REDESIGN-PLAN §5.0.
 * Active: orange 3px left indicator + rgba(249,115,22,0.08) bg.
 * Tooltips show label + group on hover.
 * Nav order matches §5.0 exactly.
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
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  group?: string
  pinned?: boolean
}

// Nav order: per §5.0, pinned first, then groups
const NAV: NavItem[] = [
  // Pinned
  { label: 'Dashboard',    icon: <LayoutDashboard size={18} />,  href: '/',           group: 'Pinned',      pinned: true },
  { label: 'Vision Board', icon: <Sparkles size={18} />,         href: '/vision',     group: 'Pinned',      pinned: true },
  { label: 'The Forge',    icon: <Flame size={18} />,            href: '/forge',      group: 'Pinned',      pinned: true },
  // Finance
  { label: 'Finance',      icon: <DollarSign size={18} />,       href: '/finance',    group: 'Finance' },
  { label: 'Cash Flow',    icon: <TrendingUp size={18} />,       href: '/cash-flow',  group: 'Finance' },
  { label: 'Tax Center',   icon: <Receipt size={18} />,          href: '/tax',        group: 'Finance' },
  // Work
  { label: 'Projects',     icon: <Briefcase size={18} />,        href: '/projects',   group: 'Work' },
  { label: 'Tasks',        icon: <CheckSquare size={18} />,      href: '/tasks',      group: 'Work' },
  // Assets
  { label: 'Companies',    icon: <Building2 size={18} />,        href: '/companies',  group: 'Assets' },
  { label: 'Properties',   icon: <Home size={18} />,             href: '/properties', group: 'Assets' },
  { label: 'Rentals',      icon: <Building size={18} />,         href: '/rentals',    group: 'Assets' },
  { label: 'Photo Mgr',    icon: <Camera size={18} />,           href: '/photos',     group: 'Assets' },
  { label: 'Entity Map',   icon: <Map size={18} />,              href: '/entities',   group: 'Assets' },
  // Engineering
  { label: 'Agents',       icon: <Bot size={18} />,              href: '/agents',     group: 'Engineering' },
  { label: 'Skill Lab',    icon: <FlaskConical size={18} />,     href: '/skills',     group: 'Engineering' },
  { label: 'Activity',     icon: <Activity size={18} />,         href: '/activity',   group: 'Engineering' },
  { label: 'Sessions',     icon: <Clock size={18} />,            href: '/sessions',   group: 'Engineering' },
  // Documents
  { label: 'Docs Hub',     icon: <FileText size={18} />,         href: '/docs',       group: 'Documents' },
  { label: 'Files',        icon: <Folder size={18} />,           href: '/files',      group: 'Documents' },
  { label: 'Legal',        icon: <Scale size={18} />,            href: '/legal',      group: 'Documents' },
  { label: 'Memory',       icon: <Brain size={18} />,            href: '/memory',     group: 'Documents' },
  // Operations
  { label: 'Monitor',      icon: <Monitor size={18} />,          href: '/monitor',    group: 'Operations' },
  { label: 'Incidents',    icon: <AlertTriangle size={18} />,    href: '/incidents',  group: 'Operations' },
  { label: 'Integrations', icon: <Plug size={18} />,             href: '/integrations', group: 'Operations' },
  { label: 'Sys Monitor',  icon: <Zap size={18} />,              href: '/monitor',    group: 'Operations' },
  // People
  { label: 'Team',         icon: <Users size={18} />,            href: '/team',       group: 'People' },
  { label: 'The Floor',    icon: <Building size={18} />,         href: '/floor',      group: 'People' },
  // System (bottom)
  { label: 'Settings',     icon: <Settings size={18} />,         href: '/settings',   group: 'System' },
]

// De-duplicate hrefs (Operations has a dup)
const DEDUPED = NAV.filter((item, idx, arr) => arr.findIndex(i => i.href === item.href && i.label === item.label) === idx)
  .filter(item => !(item.label === 'Sys Monitor'))

const PINNED  = DEDUPED.filter(i => i.pinned)
const GROUPED = DEDUPED.filter(i => !i.pinned && i.group !== 'System')
const BOTTOM  = DEDUPED.filter(i => i.group === 'System')

function NavIcon({
  item,
  active,
  isForge,
}: {
  item: NavItem
  active: boolean
  isForge?: boolean
}) {
  return (
    <Link
      href={item.href}
      className={`sb-item${active ? ' on' : ''}`}
      style={isForge ? { color: active ? undefined : 'var(--orange)' } : undefined}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
    >
      {item.icon}
      <span className="sb-tooltip">
        {item.label}
        {item.group && item.group !== 'Pinned' && (
          <span className="sb-tooltip-group">{item.group}</span>
        )}
      </span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="sb" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <Link href="/" className="sb-logo" aria-label="Mission Control home">
        MC
      </Link>

      <div className="sb-divider" />

      {/* Pinned items */}
      <nav className="sb-nav" aria-label="Pinned pages">
        {PINNED.map(item => (
          <NavIcon
            key={item.href + item.label}
            item={item}
            active={isActive(item.href)}
            isForge={item.href === '/forge'}
          />
        ))}

        <div className="sb-divider" style={{ margin: '6px 10px' }} />

        {/* All grouped items */}
        {GROUPED.map(item => (
          <NavIcon
            key={item.href + item.label}
            item={item}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      {/* Bottom: Settings + Avatar */}
      <div className="sb-bottom">
        <div className="sb-divider" style={{ width: '80%' }} />
        {BOTTOM.map(item => (
          <NavIcon
            key={item.href + item.label}
            item={item}
            active={isActive(item.href)}
          />
        ))}
        <div className="sb-avatar" aria-label="User menu" role="button" tabIndex={0}>
          C
        </div>
      </div>
    </aside>
  )
}
