'use client'
/**
 * CommandPaletteGlobal — mounts a global ⌘K listener at the layout level.
 * This handles the case where TopbarClient is not in the DOM tree
 * (e.g., custom page layouts that don't use Topbar).
 * Opens the same CommandPalette modal.
 */
import { useEffect, useState } from 'react'
import CommandPalette from './CommandPalette'

export default function CommandPaletteGlobal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(p => !p)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null
  return <CommandPalette onClose={() => setOpen(false)} />
}
