'use client'
/**
 * WizardSuccessToast — reads ?wizard=done from the URL and fires a toast.
 * Placed once in the entities page to handle post-wizard redirect.
 */
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function WizardSuccessToast() {
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('wizard') === 'done') {
      const el = document.createElement('div')
      el.textContent = 'Your ownership structure is set up. You can edit anytime from the Edit buttons.'
      Object.assign(el.style, {
        position: 'fixed', bottom: '28px', right: '28px',
        background: 'rgba(14,12,30,0.97)',
        border: '1px solid rgba(16,185,129,0.4)',
        borderRadius: '14px', padding: '14px 20px',
        fontSize: '13px', color: 'var(--green, #10b981)',
        zIndex: '9999', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        fontFamily: "'DM Sans', sans-serif",
        maxWidth: '340px', lineHeight: '1.5',
        transition: 'opacity 0.4s',
      })
      document.body.appendChild(el)
      setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400) }, 5000)

      // Clean query param from URL without reload
      const url = new URL(window.location.href)
      url.searchParams.delete('wizard')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [params])

  return null
}
