'use client'
/**
 * HighlightOnMount — reads ?highlight=<provider> from the URL, scrolls the matching
 * integration card into view, applies a temporary orange glow ring, and focuses
 * the primary action button on the card. Attaches once on mount.
 */
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function HighlightOnMount() {
  const params = useSearchParams()

  useEffect(() => {
    const highlight = params.get('highlight')
    if (!highlight) return

    const key = highlight.toLowerCase()
    // Wait a tick so card grid has rendered.
    const t = setTimeout(() => {
      const card = document.querySelector<HTMLElement>(
        `[data-integration-provider="${key}"]`,
      )
      if (!card) return
      card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      card.classList.add('mc-highlight-glow')
      // Focus the primary action button inside the card.
      const btn = card.querySelector<HTMLElement>('[data-integration-action]')
      btn?.focus()
      window.setTimeout(() => card.classList.remove('mc-highlight-glow'), 3000)
    }, 120)
    return () => clearTimeout(t)
  }, [params])

  return null
}
