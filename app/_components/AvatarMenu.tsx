'use client'
/**
 * AvatarMenu — dropdown for the avatar button in the topbar.
 * Profile / Settings / Billing / Logout
 */
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings, CreditCard, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  initials: string
  onClose: () => void
}

export default function AvatarMenu({ initials, onClose }: Props) {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onOutside)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [onClose])

  const go = (href: string) => {
    onClose()
    router.push(href)
  }

  const logout = async () => {
    onClose()
    try {
      await supabase.auth.signOut()
    } catch {}
    router.push('/login')
  }

  const items = [
    { icon: <User size={14} />, label: 'Profile', action: () => go('/settings') },
    { icon: <Settings size={14} />, label: 'Settings', action: () => go('/settings') },
    { icon: <CreditCard size={14} />, label: 'Billing', action: () => go('/settings?tab=billing') },
    { divider: true },
    { icon: <LogOut size={14} />, label: 'Log out', action: logout, danger: true },
  ]

  return (
    <>
      {/* Invisible backdrop that closes on click-away */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 798 }}
      />

      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: 54,
          right: 16,
          width: 200,
          background: 'rgba(14,12,30,0.97)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          zIndex: 799,
        }}
      >
        {/* User chip at top */}
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,var(--accent),var(--pink))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Mission Control</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>v7 workspace</div>
          </div>
        </div>

        {/* Menu items */}
        <div style={{ padding: '6px 0' }}>
          {items.map((item, i) => {
            if ('divider' in item && item.divider) {
              return <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            }
            return (
              <button
                key={i}
                onClick={item.action}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  color: item.danger ? 'var(--red)' : 'var(--t2)',
                  fontSize: 13, textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <span style={{ opacity: 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
