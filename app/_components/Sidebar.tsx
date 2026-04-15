'use client'
/**
 * Sidebar — 68px icon rail per MASTER-REDESIGN-PLAN §5.0.
 * Active: orange 3px left indicator + rgba(249,115,22,0.08) bg.
 * Hover: flyout shows group name + children list.
 * Nav order matches NAV_GROUPS from original Icons.jsx exactly (9 groups).
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

// ── NAV_GROUPS — ported verbatim from ~/mission-control/src/components/Icons.jsx ──

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
}

interface NavGroup {
  id: string
  label: string
  icon: React.ReactNode
  children: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'ceo', label: 'CEO', icon: <Star size={18} />,
    children: [
      { label: 'North Star',   icon: <Star size={16} />,          href: '/' },
      { label: 'Vision Board', icon: <Target size={16} />,         href: '/vision' },
      { label: 'Cash Flow',    icon: <DollarSign size={16} />,     href: '/cash-flow' },
      { label: 'Tax Center',   icon: <Shield size={16} />,         href: '/tax' },
    ],
  },
  {
    id: 'executive', label: 'Executive', icon: <Command size={18} />,
    children: [
      { label: 'Executive Overview', icon: <Command size={16} />,      href: '/executive' },
      { label: 'Home',               icon: <Home size={16} />,          href: '/home' },
      { label: 'Command Deck',       icon: <LayoutDashboard size={16} />, href: '/command' },
    ],
  },
  {
    id: 'people', label: 'People', icon: <Users size={18} />,
    children: [
      { label: 'Team',      icon: <Users size={16} />,    href: '/team' },
      { label: 'The Floor', icon: <Building size={16} />, href: '/floor' },
    ],
  },
  {
    id: 'work', label: 'Work', icon: <Briefcase size={18} />,
    children: [
      { label: 'Projects', icon: <Briefcase size={16} />,   href: '/projects' },
      { label: 'Tasks',    icon: <CheckSquare size={16} />, href: '/tasks' },
    ],
  },
  {
    id: 'finance', label: 'Finance', icon: <DollarSign size={18} />,
    children: [
      { label: 'Dashboard',   icon: <DollarSign size={16} />, href: '/finance' },
      { label: 'Xome Home',   icon: <Building2 size={16} />,  href: '/companies/xome-home' },
      { label: 'Companies',   icon: <Building2 size={16} />,  href: '/companies' },
      { label: 'Accounts',    icon: <CreditCard size={16} />, href: '/accounts' },
    ],
  },
  {
    id: 'documents', label: 'Documents', icon: <FileText size={18} />,
    children: [
      { label: 'Docs Hub',           icon: <BookOpen size={16} />,  href: '/docs' },
      { label: 'Workspace Files',    icon: <Folder size={16} />,    href: '/files' },
      { label: 'Legal Docs',         icon: <Scale size={16} />,     href: '/legal' },
      { label: 'Memory & Knowledge', icon: <Brain size={16} />,     href: '/memory' },
    ],
  },
  {
    id: 'engineering', label: 'Engineering', icon: <Flame size={18} />,
    children: [
      { label: 'The Forge',     icon: <Flame size={16} />,       href: '/forge' },
      { label: 'Skill Lab',     icon: <FlaskConical size={16} />, href: '/skills' },
      { label: 'Activity Feed', icon: <Activity size={16} />,    href: '/activity' },
      { label: 'Sessions',      icon: <Clock size={16} />,       href: '/sessions' },
    ],
  },
  {
    id: 'operations', label: 'Operations', icon: <Monitor size={18} />,
    children: [
      { label: 'System Monitor',   icon: <Monitor size={16} />,       href: '/monitor' },
      { label: 'Incident Room',    icon: <AlertTriangle size={16} />, href: '/incidents' },
      { label: 'Integrations Hub', icon: <Plug size={16} />,          href: '/integrations' },
    ],
  },
  {
    id: 'assets', label: 'Assets', icon: <Building size={18} />,
    children: [
      { label: 'Rentals',       icon: <Building size={16} />, href: '/rentals' },
      { label: 'Photo Manager', icon: <Camera size={16} />,   href: '/photos' },
      { label: 'Entity Map',    icon: <Map size={16} />,      href: '/entities' },
    ],
  },
]

// Bottom items (pinned below divider)
const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Agents',   icon: <Bot size={18} />,      href: '/agents' },
  { label: 'Settings', icon: <Settings size={18} />, href: '/settings' },
]

// ── Flyout group icon button ──────────────────────────────────────────────────

function GroupIcon({ group, activeHref }: { group: NavGroup; activeHref: string }) {
  const isGroupActive = group.children.some(c => {
    if (c.href === '/') return activeHref === '/'
    return activeHref.startsWith(c.href)
  })

  // Clicking the group icon navigates to the first child; hover reveals the flyout with all children.
  const primary = group.children[0]

  return (
    <div className="sb-group-wrap">
      <Link
        href={primary.href}
        className={`sb-item${isGroupActive ? ' on' : ''}`}
        aria-label={`${group.label} — ${primary.label}`}
        aria-haspopup="menu"
      >
        {group.icon}
        <span className="sb-tooltip">
          {group.label}
          <span className="sb-tooltip-group">Group</span>
        </span>
      </Link>
      {/* Flyout panel */}
      <div className="sb-flyout" role="menu" aria-label={`${group.label} navigation`}>
        <div className="sb-flyout-label">{group.label}</div>
        {group.children.map(child => {
          const childActive = child.href === '/' ? activeHref === '/' : activeHref.startsWith(child.href)
          return (
            <Link
              key={child.href}
              href={child.href}
              className={`sb-flyout-item${childActive ? ' on' : ''}`}
              role="menuitem"
            >
              {child.icon}
              <span>{child.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function NavIcon({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`sb-item${active ? ' on' : ''}`}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
    >
      {item.icon}
      <span className="sb-tooltip">{item.label}</span>
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

      {/* Groups — each group icon triggers a hover flyout */}
      <nav className="sb-nav" aria-label="Main pages">
        {NAV_GROUPS.map(group => (
          <GroupIcon key={group.id} group={group} activeHref={pathname} />
        ))}
      </nav>

      {/* Bottom: Agents + Settings + Avatar */}
      <div className="sb-bottom">
        <div className="sb-divider" style={{ width: '80%' }} />
        {BOTTOM_ITEMS.map(item => (
          <NavIcon
            key={item.href}
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
