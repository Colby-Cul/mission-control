'use client'
/**
 * CompaniesQuickActions — mounts EntityQuickActions buttons after page renders.
 * Injected by companies/page.tsx server component alongside the HTML block.
 * Uses data attributes (data-entity-id, data-entity-slug, data-entity-name)
 * written onto each .entity-card by the server to anchor the portals.
 *
 * On mount: walks DOM, finds cards with data-entity-id, inserts button cluster
 * into their .entity-card-top .entity-badges slot.
 */
import React, { useEffect, useState } from 'react'
import EditEntityModal from '../_components/EditEntityModal'
import EditOwnershipModal from '../_components/EditOwnershipModal'

interface ActiveModal {
  type: 'entity' | 'ownership'
  entityId: string
  entityName: string
}

interface EntityInfo {
  id: string
  name: string
  slug: string | null
}

export default function CompaniesQuickActions() {
  const [modal, setModal] = useState<ActiveModal | null>(null)
  const [entities, setEntities] = useState<EntityInfo[]>([])

  useEffect(() => {
    // Collect entity info from DOM data attributes on .entity-card elements
    const cards = document.querySelectorAll<HTMLElement>('[data-entity-id]')
    const found: EntityInfo[] = []
    cards.forEach(card => {
      const id = card.getAttribute('data-entity-id')
      const name = card.getAttribute('data-entity-name') ?? ''
      const slug = card.getAttribute('data-entity-slug')
      if (id) found.push({ id, name, slug: slug || null })
    })
    setEntities(found)

    // Inject quick-action button cluster into each card's top-right badges area
    cards.forEach(card => {
      const id = card.getAttribute('data-entity-id')
      const name = card.getAttribute('data-entity-name') ?? ''
      const slug = card.getAttribute('data-entity-slug') ?? ''

      // Find the badges container inside this card
      const badgesEl = card.querySelector<HTMLElement>('.entity-badges')
      if (!badgesEl || badgesEl.querySelector('[data-qa-injected]')) return

      const wrap = document.createElement('div')
      wrap.setAttribute('data-qa-injected', '1')
      wrap.style.cssText = 'display:flex;gap:4px;align-items:center;margin-left:auto;'

      // Edit entity button
      const editBtn = makeIconBtn('rgba(249,115,22,0.15)', 'rgba(249,115,22,0.3)', pencilSvg(), 'Edit entity')
      editBtn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation()
        // dispatch custom event picked up by React state
        window.dispatchEvent(new CustomEvent('qa:open', { detail: { type: 'entity', entityId: id, entityName: name } }))
      })

      // Ownership button
      const ownBtn = makeIconBtn('rgba(139,92,246,0.12)', 'rgba(139,92,246,0.25)', graphSvg(), 'Edit ownership')
      ownBtn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation()
        window.dispatchEvent(new CustomEvent('qa:open', { detail: { type: 'ownership', entityId: id, entityName: name } }))
      })

      wrap.appendChild(editBtn)
      wrap.appendChild(ownBtn)

      // If it's an anchor card, prevent link nav on button click
      if (card.tagName === 'A') {
        wrap.addEventListener('click', e => e.preventDefault())
      }
      badgesEl.appendChild(wrap)
    })

    // Listen for open events
    function handleOpen(e: Event) {
      const { type, entityId, entityName } = (e as CustomEvent).detail
      setModal({ type, entityId, entityName })
    }
    window.addEventListener('qa:open', handleOpen)
    return () => window.removeEventListener('qa:open', handleOpen)
  }, [])

  function closeModal() { setModal(null) }

  return (
    <>
      {modal?.type === 'entity' && (
        <EditEntityModal
          entityId={modal.entityId}
          onClose={closeModal}
          onSaved={() => { closeModal(); window.location.reload() }}
        />
      )}
      {modal?.type === 'ownership' && (
        <EditOwnershipModal
          entityId={modal.entityId}
          entityName={modal.entityName}
          childType="entity"
          onClose={closeModal}
          onSaved={() => { closeModal(); window.location.reload() }}
        />
      )}
    </>
  )
}

// ── DOM helpers ────────────────────────────────────────────────────
function makeIconBtn(bg: string, border: string, svgHtml: string, title: string): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.title = title
  btn.innerHTML = svgHtml
  btn.style.cssText = `
    background:${bg};border:1px solid ${border};border-radius:7px;
    width:26px;height:26px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;color:rgba(255,255,255,0.7);flex-shrink:0;padding:0;
  `
  return btn
}

function pencilSvg(): string {
  return `<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11.05 3L17 8.95l-9.9 9.9H1.05V12.9L11.05 3z"/></svg>`
}

function graphSvg(): string {
  return `<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="4" r="2.5"/><circle cx="5" cy="10" r="2.5"/><circle cx="15" cy="16" r="2.5"/><line x1="7.4" y1="8.8" x2="12.6" y2="5.2"/><line x1="7.4" y1="11.2" x2="12.6" y2="14.8"/></svg>`
}
