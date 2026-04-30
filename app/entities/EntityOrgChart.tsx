'use client'
/**
 * EntityOrgChart — redesigned with:
 * - Pan/zoom SVG canvas (wheel = zoom, drag = pan, double-click = re-center)
 * - Zoom toolbar (+/−/fit)
 * - Hover path highlight: highlights full chain from root → hovered node
 * - Click node → popover with quick info
 * - ⌘F search to filter nodes by name
 * - Filter chips: All / Operating / Trusts / Holding / Properties / Accounts / Legal-only
 * - Floating legend (shape/color key)
 * - "Your Ownership View" cascade panel below the map
 * - Financial accounts rendered as a third leaf layer below properties
 *   with click-to-assign popover + bulk-assignment modal
 * - Hover entity node: shows net-worth tooltip (direct accounts + properties)
 * - Mobile: switches to vertical list below 768px
 * - All existing edit affordances preserved
 */
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import EditEntityModal from '../_components/EditEntityModal'
import EditOwnershipModal from '../_components/EditOwnershipModal'
import EditPropertyModal from '../_components/EditPropertyModal'
import { supabase } from '../lib/supabase'

interface Entity {
  id: string
  entity_name: string
  entity_type: string | null
  slug: string | null
  purpose: string | null
  is_active: boolean | null
}

interface PropertyNode {
  id: string
  address: string
  city: string | null
  state: string | null
  slug: string | null
  purpose: string | null
  ownership_pct: number | null
  current_value?: number | null
  mortgage_balance?: number | null
}

interface AccountNode {
  id: string
  name: string
  mask: string | null
  balance: number
  type: string | null
  subtype: string | null
  scope: string
  entity_id: string | null
  institution: string | null
}

interface Edge {
  parent_entity_id: string
  child_entity_id: string
  child_type?: string
  ownership_pct: number | string
  role: string | null
}

interface Props {
  entities: Entity[]
  edges: Edge[]
  properties?: PropertyNode[]
  accounts?: AccountNode[]
}

// ── Design tokens ──────────────────────────────────────────────────
const TYPE_COLOR: Record<string, { stroke: string; fill: string; text: string }> = {
  Person:      { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.18)', text: '#c4b5fd' },
  Trust:       { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.18)', text: '#fcd34d' },
  LLC:         { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.18)', text: '#fdba74' },
  'C-Corp':    { stroke: '#10b981', fill: 'rgba(16,185,129,0.18)', text: '#6ee7b7' },
  'S-Corp':    { stroke: '#10b981', fill: 'rgba(16,185,129,0.18)', text: '#6ee7b7' },
  LP:          { stroke: '#84cc16', fill: 'rgba(132,204,22,0.18)', text: '#bef264' },
  Partnership: { stroke: '#84cc16', fill: 'rgba(132,204,22,0.18)', text: '#bef264' },
  'Sole Prop': { stroke: '#ec4899', fill: 'rgba(236,72,153,0.18)', text: '#f9a8d4' },
}
const DEFAULT_COLOR = { stroke: '#6b7280', fill: 'rgba(107,114,128,0.15)', text: '#9ca3af' }
const HOLDING_COLOR = { stroke: '#ec4899', fill: 'rgba(236,72,153,0.15)', text: '#f9a8d4' }

const PROP_PURPOSE_COLOR: Record<string, { stroke: string; fill: string; text: string }> = {
  'primary-residence': { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.15)', text: '#93c5fd' },
  rental:              { stroke: '#10b981', fill: 'rgba(16,185,129,0.15)', text: '#6ee7b7' },
  vacation:            { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.15)',  text: '#67e8f9' },
  investment:          { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.15)', text: '#fcd34d' },
}
const DEFAULT_PROP_COLOR = { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.15)', text: '#93c5fd' }

const NODE_W = 168
const NODE_H = 56
const H_GAP  = 48
const V_GAP  = 88

// Account nodes are narrower
const ACCT_W = 180
const ACCT_H = 62
const ACCT_H_GAP = 14

// Financial account color coding by type/subtype
function acctTypeKey(type: string | null, subtype: string | null): string {
  const t = String(type ?? '').toLowerCase()
  const s = String(subtype ?? '').toLowerCase()
  if (t === 'credit') return 'credit'
  if (t === 'investment' || t === 'brokerage') return 'brokerage'
  if (s === 'utma') return 'utma'
  if (t === 'loan') return 'loan'
  if (s === 'cash management' || s === 'cash') return 'cash'
  return 'checking'
}

const ACCT_COLOR: Record<string, { stroke: string; fill: string; text: string; icon: string; label: string }> = {
  checking:  { stroke: '#10b981', fill: 'rgba(16,185,129,0.14)', text: '#6ee7b7', icon: '💵', label: 'Checking' },
  credit:    { stroke: '#ef4444', fill: 'rgba(239,68,68,0.14)',   text: '#fca5a5', icon: '💳', label: 'Credit Card' },
  brokerage: { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.14)',  text: '#c4b5fd', icon: '📈', label: 'Brokerage' },
  loan:      { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.14)',  text: '#fcd34d', icon: '🏠', label: 'Loan' },
  cash:      { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.14)',  text: '#fdba74', icon: '🪙', label: 'Cash' },
  utma:      { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.14)',  text: '#93c5fd', icon: '🎓', label: 'UTMA' },
}

type Filter = 'all' | 'operating' | 'trusts' | 'holding' | 'properties' | 'legal'
type OrgModal =
  | { type: 'editEntity';    entityId: string; entityName: string }
  | { type: 'editOwnership'; entityId: string; entityName: string }
  | { type: 'editProperty';  propertyId: string }
  | { type: 'editPropOwn';   propertyId: string; propertyName: string }
  | { type: 'bulkAssign' }

interface Popover {
  id: string
  kind: 'entity' | 'property' | 'account'
  vx: number
  vy: number
}

function formatUSD(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${n < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}k`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function signedBalance(a: AccountNode): number {
  const t = String(a.type ?? '').toLowerCase()
  return (t === 'credit' || t === 'loan') ? -a.balance : a.balance
}

// ── BFS ancestor set (from a node up to roots) ────────────────────
function getAncestorAndDescendantIds(
  nodeId: string,
  entityEdges: Edge[],
): Set<string> {
  const result = new Set<string>()
  result.add(nodeId)

  // Walk up (parents)
  const visitUp = (id: string) => {
    entityEdges.filter(e => e.child_entity_id === id).forEach(e => {
      if (!result.has(e.parent_entity_id)) {
        result.add(e.parent_entity_id)
        visitUp(e.parent_entity_id)
      }
    })
  }
  // Walk down (children)
  const visitDown = (id: string) => {
    entityEdges.filter(e => e.parent_entity_id === id).forEach(e => {
      if (!result.has(e.child_entity_id)) {
        result.add(e.child_entity_id)
        visitDown(e.child_entity_id)
      }
    })
  }
  visitUp(nodeId)
  visitDown(nodeId)
  return result
}

// ── Effective ownership chain computation ─────────────────────────
interface CascadeEntry {
  entityId: string
  entityName: string
  entityType: string | null
  effectivePct: number
  chain: { name: string; pct: number }[]
}

function computeCascade(entities: Entity[], edges: Edge[]): CascadeEntry[] {
  // Find root nodes (no incoming entity edges)
  const childSet = new Set(edges.filter(e => e.child_type !== 'property').map(e => e.child_entity_id))
  const roots = entities.filter(e => !childSet.has(e.id))

  const result: CascadeEntry[] = []
  const entityMap: Record<string, Entity> = {}
  entities.forEach(e => { entityMap[e.id] = e })

  function walk(
    nodeId: string,
    accumulated: number,
    chain: { name: string; pct: number }[],
    visited: Set<string>,
  ) {
    if (visited.has(nodeId)) return // cycle guard
    const nextVisited = new Set(visited); nextVisited.add(nodeId)
    const childEdges = edges.filter(e => e.parent_entity_id === nodeId && e.child_type !== 'property')
    for (const edge of childEdges) {
      const pct = Number(edge.ownership_pct)
      const effective = (accumulated * pct) / 100
      const childEntity = entityMap[edge.child_entity_id]
      if (!childEntity) continue
      if (nextVisited.has(childEntity.id)) continue // skip self-loops + back-edges
      const newChain = [...chain, { name: childEntity.entity_name, pct }]
      result.push({
        entityId: childEntity.id,
        entityName: childEntity.entity_name,
        entityType: childEntity.entity_type,
        effectivePct: effective,
        chain: newChain,
      })
      walk(childEntity.id, effective, newChain, nextVisited)
    }
  }

  for (const root of roots) {
    walk(root.id, 100, [{ name: root.entity_name, pct: 100 }], new Set())
  }

  // Deduplicate — keep highest effective % per entity
  const best: Record<string, CascadeEntry> = {}
  result.forEach(entry => {
    if (!best[entry.entityId] || entry.effectivePct > best[entry.entityId].effectivePct) {
      best[entry.entityId] = entry
    }
  })

  return Object.values(best).sort((a, b) => b.effectivePct - a.effectivePct)
}

// ── Main component ─────────────────────────────────────────────────
export default function EntityOrgChart({ entities, edges, properties = [], accounts = [] }: Props) {
  const [filter, setFilter]           = useState<Filter>('all')
  const [showProperties, setShowProperties] = useState(true)
  const [showAccounts, setShowAccounts] = useState(true)
  const [collapseAccounts, setCollapseAccounts] = useState(accounts.length > 50)
  const [hovered, setHovered]         = useState<string | null>(null)
  const [popover, setPopover]         = useState<Popover | null>(null)
  const [modal, setModal]             = useState<OrgModal | null>(null)
  const [search, setSearch]           = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showSearch, setShowSearch]   = useState(false)
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null)

  // Pan/zoom state
  const [transform, setTransform]     = useState({ x: 0, y: 0, scale: 1 })
  const isDragging                    = useRef(false)
  const dragStart                     = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const containerRef                  = useRef<HTMLDivElement>(null)
  const svgRef                        = useRef<SVGSVGElement>(null)
  const searchInputRef                = useRef<HTMLInputElement>(null)

  // ⌘F keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setSearch('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const entityMap = useMemo(() => {
    const m: Record<string, Entity> = {}
    entities.forEach(e => { m[e.id] = e })
    return m
  }, [entities])

  const propertyMap = useMemo(() => {
    const m: Record<string, PropertyNode> = {}
    properties.forEach(p => { m[p.id] = p })
    return m
  }, [properties])

  // Apply filter + search
  const filteredIds = useMemo(() => {
    let set: Set<string>
    if (filter === 'all')        set = new Set(entities.map(e => e.id))
    else if (filter === 'trusts')    set = new Set(entities.filter(e => e.entity_type === 'Trust' || e.purpose === 'trust').map(e => e.id))
    else if (filter === 'holding')   set = new Set(entities.filter(e => e.purpose === 'holding').map(e => e.id))
    else if (filter === 'operating') set = new Set(entities.filter(e => !e.purpose || e.purpose === 'operating').map(e => e.id))
    else if (filter === 'legal')     set = new Set(entities.filter(e => e.purpose === 'legal-separation').map(e => e.id))
    else set = new Set(entities.map(e => e.id))

    if (search.trim()) {
      const q = search.toLowerCase()
      set = new Set([...set].filter(id => entityMap[id]?.entity_name.toLowerCase().includes(q)))
    }
    return set
  }, [entities, filter, search, entityMap])

  const filteredEntities = useMemo(() => entities.filter(e => filteredIds.has(e.id)), [entities, filteredIds])
  const entityOnlyEdges  = useMemo(() => edges.filter(e => e.child_type !== 'property' && filteredIds.has(e.parent_entity_id) && filteredIds.has(e.child_entity_id)), [edges, filteredIds])
  const propertyEdges    = useMemo(() => showProperties && filter !== 'legal' ? edges.filter(e => e.child_type === 'property' && filteredIds.has(e.parent_entity_id)) : [], [edges, filteredIds, showProperties, filter])
  // Show ALL properties when toggle is on — unassigned ones appear as floating nodes with a dashed "unassigned" border
  const visibleProperties = useMemo(() => showProperties && filter !== 'legal' ? properties : [], [properties, showProperties, filter])

  // Bucket accounts into: assigned-to-visible-entity | unassigned
  const { assignedAccounts, unassignedAccounts } = useMemo(() => {
    const assigned: AccountNode[] = []
    const unassigned: AccountNode[] = []
    for (const a of accounts) {
      const isAssignedToVisibleEntity = a.scope === 'entity' && a.entity_id && filteredIds.has(a.entity_id)
      if (isAssignedToVisibleEntity) assigned.push(a)
      else if (a.scope === 'entity' && !a.entity_id) unassigned.push(a)
      else if (a.scope !== 'personal' && a.scope !== 'entity') unassigned.push(a)
      // Personal accounts float as "unassigned" to the bottom row too, but with a Colby pill
      else if (a.scope === 'personal') unassigned.push({ ...a, entity_id: null })
    }
    return { assignedAccounts: assigned, unassignedAccounts: unassigned }
  }, [accounts, filteredIds])

  const visibleAccounts = useMemo(() => {
    if (!showAccounts || filter === 'legal') return { assigned: [] as AccountNode[], unassigned: [] as AccountNode[] }
    return { assigned: assignedAccounts, unassigned: unassignedAccounts }
  }, [assignedAccounts, unassignedAccounts, showAccounts, filter])

  // Net-worth lookup per entity (direct accounts + direct properties)
  const entityDirectValue = useMemo(() => {
    const m: Record<string, { accountCount: number; accountTotal: number; propCount: number; propEquity: number }> = {}
    entities.forEach(e => { m[e.id] = { accountCount: 0, accountTotal: 0, propCount: 0, propEquity: 0 } })
    accounts.forEach(a => {
      if (a.scope === 'entity' && a.entity_id && m[a.entity_id]) {
        m[a.entity_id].accountCount += 1
        m[a.entity_id].accountTotal += signedBalance(a)
      }
    })
    // Direct property edges: entity → property
    edges.forEach(edge => {
      if (edge.child_type === 'property' && m[edge.parent_entity_id]) {
        const prop = properties.find(p => p.id === edge.child_entity_id)
        if (prop) {
          const val = Number(prop.current_value ?? 0)
          const mort = Number(prop.mortgage_balance ?? 0)
          const pct = Number(edge.ownership_pct ?? 100)
          m[edge.parent_entity_id].propCount += 1
          m[edge.parent_entity_id].propEquity += (val - mort) * (pct / 100)
        }
      }
    })
    return m
  }, [entities, accounts, edges, properties])

  // Hover path highlight
  const hoveredChain = useMemo(() => {
    if (!hovered) return new Set<string>()
    return getAncestorAndDescendantIds(hovered, entityOnlyEdges)
  }, [hovered, entityOnlyEdges])

  // BFS layout
  const layout = useMemo(() => {
    if (!filteredEntities.length) return { nodes: [], propNodes: [], acctNodes: [], acctCollapsed: [], unassignedAcctNodes: [], svgW: 400, svgH: 200 }

    const childSet = new Set(entityOnlyEdges.map(e => e.child_entity_id))
    let roots = filteredEntities.filter(e => !childSet.has(e.id)).map(e => e.id)
    if (!roots.length) roots = [filteredEntities[0].id]

    const layers: string[][] = []
    const visited = new Set<string>()
    let queue = roots
    while (queue.length) {
      const next: string[] = []
      const layerIds: string[] = []
      for (const id of queue) {
        if (visited.has(id)) continue
        visited.add(id)
        layerIds.push(id)
      }
      if (layerIds.length) layers.push(layerIds)
      for (const id of layerIds) {
        entityOnlyEdges.filter(e => e.parent_entity_id === id).forEach(e => next.push(e.child_entity_id))
      }
      queue = next.filter(id => !visited.has(id))
    }
    filteredEntities.forEach(e => { if (!visited.has(e.id)) layers.push([e.id]) })

    const nodePos: Record<string, { x: number; y: number }> = {}
    let svgW = 0
    layers.forEach((layer, li) => {
      const totalW = layer.length * NODE_W + (layer.length - 1) * H_GAP
      svgW = Math.max(svgW, totalW)
      const y = li * (NODE_H + V_GAP) + 20
      layer.forEach((id, xi) => { nodePos[id] = { x: xi * (NODE_W + H_GAP), y } })
    })
    layers.forEach(layer => {
      const rowW = layer.length * NODE_W + (layer.length - 1) * H_GAP
      const offset = (svgW - rowW) / 2
      layer.forEach(id => { nodePos[id].x += offset })
    })

    const entitySvgH = layers.length * (NODE_H + V_GAP) + 20
    const nodes = filteredEntities.filter(e => nodePos[e.id]).map(e => ({ entity: e, ...nodePos[e.id] }))

    // Property layer
    let propNodes: { prop: PropertyNode; x: number; y: number }[] = []
    let propLayerY = entitySvgH
    if (visibleProperties.length > 0) {
      propLayerY = entitySvgH + V_GAP / 2
      const propTotalW = visibleProperties.length * NODE_W + (visibleProperties.length - 1) * H_GAP
      svgW = Math.max(svgW, propTotalW)
      const propOffset = (svgW - propTotalW) / 2
      propNodes = visibleProperties.map((p, xi) => ({ prop: p, x: propOffset + xi * (NODE_W + H_GAP), y: propLayerY }))
      visibleProperties.forEach((p, xi) => { nodePos[p.id] = { x: propOffset + xi * (NODE_W + H_GAP), y: propNodes[xi].y } })
    }

    const afterPropsY = visibleProperties.length > 0
      ? propLayerY + NODE_H + V_GAP
      : entitySvgH + V_GAP / 2

    // Account layer(s)
    let acctNodes: { acct: AccountNode; x: number; y: number }[] = []
    let acctCollapsed: { entityId: string; count: number; total: number; x: number; y: number }[] = []
    let unassignedAcctNodes: { acct: AccountNode; x: number; y: number }[] = []

    const acctLayerY = afterPropsY

    if (visibleAccounts.assigned.length > 0 || visibleAccounts.unassigned.length > 0) {
      if (collapseAccounts && visibleAccounts.assigned.length > 0) {
        // Group by entity_id
        const grouped: Record<string, AccountNode[]> = {}
        visibleAccounts.assigned.forEach(a => {
          const key = a.entity_id!
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(a)
        })
        const entries = Object.entries(grouped)
        const totalW = entries.length * NODE_W + (entries.length - 1) * H_GAP
        svgW = Math.max(svgW, totalW)
        const offset = (svgW - totalW) / 2
        // If expandedEntity is set, expand that one cluster
        entries.forEach(([eid, list], xi) => {
          const x = offset + xi * (NODE_W + H_GAP)
          const y = acctLayerY
          if (expandedEntity === eid) {
            // expand: stack them vertically below
            list.forEach((a, i) => {
              acctNodes.push({ acct: a, x: x + (NODE_W - ACCT_W) / 2, y: y + (i) * (ACCT_H + 10) })
            })
          } else {
            const total = list.reduce((s, a) => s + signedBalance(a), 0)
            acctCollapsed.push({ entityId: eid, count: list.length, total, x, y })
          }
        })
      } else {
        // Flat: all assigned accounts in one row
        const all = visibleAccounts.assigned
        if (all.length > 0) {
          const totalW = all.length * ACCT_W + (all.length - 1) * ACCT_H_GAP
          svgW = Math.max(svgW, totalW)
          const offset = (svgW - totalW) / 2
          acctNodes = all.map((a, xi) => ({ acct: a, x: offset + xi * (ACCT_W + ACCT_H_GAP), y: acctLayerY }))
        }
      }

      // Unassigned row — below assigned
      const unassignedY = acctLayerY + (expandedEntity || !collapseAccounts ? ACCT_H + 28 : NODE_H + 28)
      if (visibleAccounts.unassigned.length > 0) {
        const n = visibleAccounts.unassigned.length
        const totalW = n * ACCT_W + (n - 1) * ACCT_H_GAP
        svgW = Math.max(svgW, totalW)
        const offset = (svgW - totalW) / 2
        unassignedAcctNodes = visibleAccounts.unassigned.map((a, xi) => ({ acct: a, x: offset + xi * (ACCT_W + ACCT_H_GAP), y: unassignedY }))
      }
    }

    acctNodes.forEach(({ acct, x, y }) => { nodePos[acct.id] = { x, y } })
    unassignedAcctNodes.forEach(({ acct, x, y }) => { nodePos[acct.id] = { x, y } })

    // Compute final svgH
    let svgH = entitySvgH
    if (visibleProperties.length > 0) svgH = propLayerY + NODE_H + 20
    const maxAcctY = Math.max(
      0,
      ...acctNodes.map(n => n.y + ACCT_H),
      ...unassignedAcctNodes.map(n => n.y + ACCT_H),
      ...acctCollapsed.map(n => n.y + NODE_H),
    )
    if (maxAcctY > 0) svgH = maxAcctY + 20

    return { nodes, propNodes, acctNodes, acctCollapsed, unassignedAcctNodes, nodePos, svgW: Math.max(svgW, 400), svgH }
  }, [filteredEntities, entityOnlyEdges, visibleProperties, visibleAccounts, collapseAccounts, expandedEntity])

  const allNodePos: Record<string, { x: number; y: number }> = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {}
    layout.nodes.forEach(n => { m[n.entity.id] = { x: n.x, y: n.y } })
    ;(layout.propNodes ?? []).forEach(n => { m[n.prop.id] = { x: n.x, y: n.y } })
    ;(layout.acctNodes ?? []).forEach(n => { m[n.acct.id] = { x: n.x, y: n.y } })
    ;(layout.unassignedAcctNodes ?? []).forEach(n => { m[n.acct.id] = { x: n.x, y: n.y } })
    return m
  }, [layout])

  // Fit-to-view
  const fitToView = useCallback(() => {
    if (!containerRef.current) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const scaleX = cw / (layout.svgW + 20)
    const scaleY = ch / (layout.svgH + 20)
    const scale = Math.min(scaleX, scaleY, 1) * 0.92
    const x = (cw - (layout.svgW + 20) * scale) / 2
    const y = (ch - (layout.svgH + 20) * scale) / 2
    setTransform({ x, y, scale })
  }, [layout])

  // Auto-fit on first render / layout change
  useEffect(() => { fitToView() }, [fitToView])

  // Pan handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-no-pan]')) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
  }, [transform])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    setTransform(t => ({ ...t, x: dragStart.current.tx + e.clientX - dragStart.current.x, y: dragStart.current.ty + e.clientY - dragStart.current.y }))
  }, [])

  const onMouseUp = useCallback(() => { isDragging.current = false }, [])

  // Zoom via wheel
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.1 : 0.9
    setTransform(t => {
      const newScale = Math.min(Math.max(t.scale * delta, 0.15), 3)
      if (!containerRef.current) return t
      const rect = containerRef.current.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const nx = mx - (mx - t.x) * (newScale / t.scale)
      const ny = my - (my - t.y) * (newScale / t.scale)
      return { x: nx, y: ny, scale: newScale }
    })
  }, [])

  const zoom = (factor: number) => {
    setTransform(t => {
      if (!containerRef.current) return t
      const cw = containerRef.current.clientWidth
      const ch = containerRef.current.clientHeight
      const newScale = Math.min(Math.max(t.scale * factor, 0.15), 3)
      const cx = cw / 2
      const cy = ch / 2
      return { x: cx - (cx - t.x) * (newScale / t.scale), y: cy - (cy - t.y) * (newScale / t.scale), scale: newScale }
    })
  }

  // Click node: open popover
  function openNodePopover(id: string, kind: 'entity' | 'property' | 'account', svgX: number, svgY: number, nodeW = NODE_W, nodeH = NODE_H) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const vx = rect.left + transform.x + (svgX + nodeW / 2) * transform.scale
    const vy = rect.top  + transform.y + (svgY + nodeH + 4) * transform.scale
    setPopover({ id, kind, vx, vy })
  }

  // Cascade data
  const cascade = useMemo(() => computeCascade(entities, edges), [entities, edges])

  // ── Styles helpers ──
  const filterActive = (f: string) => filter === f
  const chipStyle = (active: boolean, activeColor = '#3b82f6'): React.CSSProperties => ({
    padding: '5px 13px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', transition: 'all 0.15s',
    background: active ? `${activeColor}22` : 'rgba(255,255,255,0.04)',
    color: active ? activeColor : 'rgba(255,255,255,0.45)',
    border: active ? `1px solid ${activeColor}44` : '1px solid rgba(255,255,255,0.06)',
  })

  return (
    <>
      {/* ── Outer shell ── */}
      <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px 24px', overflow: 'hidden' }}>

        {/* Filter chips + search row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 2 }}>SHOW</span>
          {([
            { key: 'all',       label: 'All' },
            { key: 'operating', label: 'Operating' },
            { key: 'trusts',    label: 'Trusts' },
            { key: 'holding',   label: 'Holding' },
            { key: 'legal',     label: 'Legal-only' },
          ] as { key: Filter; label: string }[]).map(({ key, label }) => (
            <button key={key} style={chipStyle(filterActive(key))} onClick={() => setFilter(key)}>{label}</button>
          ))}

          {properties.length > 0 && (
            <button
              style={chipStyle(showProperties, '#3b82f6')}
              onClick={() => setShowProperties(v => !v)}
            >
              ⌂ Properties
            </button>
          )}

          {accounts.length > 0 && (
            <button
              style={chipStyle(showAccounts, '#10b981')}
              onClick={() => setShowAccounts(v => !v)}
            >
              $ Accounts
            </button>
          )}

          {accounts.length > 50 && showAccounts && (
            <button
              style={chipStyle(collapseAccounts, '#fbbf24')}
              onClick={() => { setCollapseAccounts(v => !v); setExpandedEntity(null) }}
              title="Collapse accounts per-entity to reduce clutter"
            >
              {collapseAccounts ? '▸ Collapsed' : '▾ Expanded'}
            </button>
          )}

          {unassignedAccounts.filter(a => a.scope !== 'personal').length > 0 && showAccounts && (
            <button
              style={{ ...chipStyle(false, '#fbbf24'), color: '#fbbf24', border: '1px dashed rgba(251,191,36,0.5)' }}
              onClick={() => setModal({ type: 'bulkAssign' })}
              title="Bulk-assign unassigned accounts to entities"
            >
              ⚡ Assign Unassigned ({unassignedAccounts.filter(a => a.scope !== 'personal').length})
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Search toggle */}
            {showSearch ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search nodes…"
                  data-no-pan
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, padding: '5px 10px',
                    fontSize: 12, color: '#fff', outline: 'none',
                    fontFamily: 'DM Sans, sans-serif', width: 160,
                  }}
                />
                <button
                  style={{ ...chipStyle(false), padding: '5px 8px' }}
                  onClick={() => { setShowSearch(false); setSearch('') }}
                  data-no-pan
                >✕</button>
              </div>
            ) : (
              <button
                style={chipStyle(false)}
                onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}
                title="⌘F Search"
              >
                ⌘F Search
              </button>
            )}
          </div>
        </div>

        {/* ── Map container ── */}
        <div style={{ position: 'relative', height: 480, borderRadius: 14, overflow: 'hidden', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', cursor: isDragging.current ? 'grabbing' : 'grab' }}>

          {/* Pan/zoom canvas */}
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
            onDoubleClick={fitToView}
          >
            <div style={{ position: 'absolute', transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', willChange: 'transform' }}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${layout.svgW + 20} ${layout.svgH + 20}`}
                width={layout.svgW + 20}
                height={layout.svgH + 20}
                style={{ display: 'block', overflow: 'visible' }}
                onClick={() => setPopover(null)}
              >
                <defs>
                  <linearGradient id="oc-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(59,130,246,0.5)" />
                    <stop offset="100%" stopColor="rgba(139,92,246,0.3)" />
                  </linearGradient>
                  <marker id="oc-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(59,130,246,0.45)" />
                  </marker>
                  <marker id="oc-arrow-hl" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(59,130,246,0.95)" />
                  </marker>
                  <marker id="oc-arrow-prop" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(59,130,246,0.5)" />
                  </marker>
                  <marker id="oc-arrow-acct" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(16,185,129,0.55)" />
                  </marker>
                </defs>

                {/* Entity → Entity edges */}
                {entityOnlyEdges.map((edge, i) => {
                  const p = allNodePos[edge.parent_entity_id]
                  const c = allNodePos[edge.child_entity_id]
                  if (!p || !c) return null
                  const x1 = p.x + NODE_W / 2, y1 = p.y + NODE_H
                  const x2 = c.x + NODE_W / 2, y2 = c.y
                  const midY = (y1 + y2) / 2
                  const isHL = hovered ? hoveredChain.has(edge.parent_entity_id) && hoveredChain.has(edge.child_entity_id) : false
                  return (
                    <g key={`ee-${i}`}>
                      <path
                        d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                        fill="none"
                        stroke={isHL ? 'rgba(59,130,246,0.9)' : 'url(#oc-grad)'}
                        strokeWidth={isHL ? 2.5 : 1.5}
                        strokeDasharray={isHL ? 'none' : '5 3'}
                        markerEnd={isHL ? 'url(#oc-arrow-hl)' : 'url(#oc-arrow)'}
                        opacity={hovered && !isHL ? 0.2 : isHL ? 1 : 0.65}
                      />
                      <text x={(x1 + x2) / 2} y={midY - 5} textAnchor="middle" fontSize="8" fill={isHL ? 'rgba(59,130,246,0.9)' : 'rgba(255,255,255,0.35)'} fontFamily="IBM Plex Mono, monospace">
                        {Number(edge.ownership_pct)}%{edge.role ? ` · ${edge.role}` : ''}
                      </text>
                    </g>
                  )
                })}

                {/* Entity → Property edges */}
                {propertyEdges.map((edge, i) => {
                  const p = allNodePos[edge.parent_entity_id]
                  const c = allNodePos[edge.child_entity_id]
                  if (!p || !c) return null
                  const x1 = p.x + NODE_W / 2, y1 = p.y + NODE_H
                  const x2 = c.x + NODE_W / 2, y2 = c.y
                  const midY = (y1 + y2) / 2
                  const isHL = hovered === edge.parent_entity_id || hovered === edge.child_entity_id
                  return (
                    <g key={`pe-${i}`}>
                      <path
                        d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                        fill="none"
                        stroke={isHL ? 'rgba(59,130,246,0.9)' : 'rgba(59,130,246,0.35)'}
                        strokeWidth={isHL ? 2 : 1.5}
                        strokeDasharray="4 3"
                        markerEnd="url(#oc-arrow-prop)"
                        opacity={isHL ? 1 : 0.55}
                      />
                      <text x={(x1 + x2) / 2} y={midY - 5} textAnchor="middle" fontSize="8" fill="rgba(147,197,253,0.45)" fontFamily="IBM Plex Mono, monospace">
                        {Number(edge.ownership_pct)}%
                      </text>
                    </g>
                  )
                })}

                {/* Entity nodes */}
                {layout.nodes.map(({ entity: e, x, y }) => {
                  const color = e.purpose === 'holding' ? HOLDING_COLOR : (TYPE_COLOR[e.entity_type ?? ''] ?? DEFAULT_COLOR)
                  const isHov = hovered === e.id
                  const dimmed = hovered && !hoveredChain.has(e.id)

                  return (
                    <g
                      key={e.id}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(e.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={ev => { ev.stopPropagation(); openNodePopover(e.id, 'entity', x, y) }}
                    >
                      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={10} ry={10}
                        fill={color.fill} stroke={color.stroke}
                        strokeWidth={isHov ? 2.5 : 1.5}
                        opacity={dimmed ? 0.25 : 0.95}
                        style={{ transition: 'opacity 0.15s, stroke-width 0.1s' }}
                      />
                      {isHov && (
                        <rect x={x - 3} y={y - 3} width={NODE_W + 6} height={NODE_H + 6} rx={13} ry={13}
                          fill="none" stroke={color.stroke} strokeWidth={1} opacity={0.35} />
                      )}
                      <text x={x + NODE_W / 2} y={y + 20} textAnchor="middle" fontSize="11" fontWeight="600" fill={color.text} fontFamily="DM Sans, sans-serif">
                        {e.entity_name.length > 19 ? e.entity_name.substring(0, 18) + '…' : e.entity_name}
                      </text>
                      <text x={x + NODE_W / 2} y={y + 33} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="DM Sans, sans-serif">
                        {e.entity_type ?? '—'}{e.purpose ? ` · ${e.purpose}` : ''}
                      </text>
                      {/* 3-dot menu */}
                      {isHov && (
                        <g
                          data-no-pan
                          onClick={ev => {
                            ev.stopPropagation()
                            const svgEl = svgRef.current; if (!svgEl) return
                            const rect2 = svgEl.getBoundingClientRect()
                            const vb = svgEl.viewBox.baseVal
                            const sx = rect2.width / (vb.width || 1)
                            const sy = rect2.height / (vb.height || 1)
                            const vpX = rect2.left + (x + 4) * sx
                            const vpY = rect2.top + (y + NODE_H) * sy
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <rect x={x + 2} y={y + NODE_H - 15} width={22} height={14} rx={4} fill="rgba(0,0,0,0.6)" />
                          <circle cx={x + 7}  cy={y + NODE_H - 8} r={1.5} fill="rgba(255,255,255,0.7)" />
                          <circle cx={x + 13} cy={y + NODE_H - 8} r={1.5} fill="rgba(255,255,255,0.7)" />
                          <circle cx={x + 19} cy={y + NODE_H - 8} r={1.5} fill="rgba(255,255,255,0.7)" />
                        </g>
                      )}
                    </g>
                  )
                })}

                {/* Property nodes */}
                {(layout.propNodes ?? []).map(({ prop: p, x, y }) => {
                  const color = PROP_PURPOSE_COLOR[p.purpose ?? ''] ?? DEFAULT_PROP_COLOR
                  const isHov = hovered === p.id
                  return (
                    <g
                      key={p.id}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(p.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={ev => { ev.stopPropagation(); openNodePopover(p.id, 'property', x, y) }}
                    >
                      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={10} ry={10}
                        fill={color.fill} stroke={color.stroke}
                        strokeWidth={isHov ? 2 : 1.5}
                        strokeDasharray="4 2"
                        opacity={isHov ? 1 : 0.88}
                        style={{ transition: 'opacity 0.15s' }}
                      />
                      {isHov && <rect x={x - 3} y={y - 3} width={NODE_W + 6} height={NODE_H + 6} rx={13} ry={13} fill="none" stroke={color.stroke} strokeWidth={1} opacity={0.3} />}
                      <text x={x + 14} y={y + 31} fontSize="14" fill={color.text} textAnchor="middle">⌂</text>
                      <text x={x + NODE_W / 2 + 8} y={y + 21} textAnchor="middle" fontSize="10" fontWeight="600" fill={color.text} fontFamily="DM Sans, sans-serif">
                        {p.address.length > 16 ? p.address.substring(0, 15) + '…' : p.address}
                      </text>
                      <text x={x + NODE_W / 2 + 8} y={y + 33} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="DM Sans, sans-serif">
                        {p.city ?? ''}{p.purpose ? ` · ${p.purpose}` : ''}
                      </text>
                    </g>
                  )
                })}

                {/* Entity → Account edges (dashed green) */}
                {(layout.acctNodes ?? []).map(({ acct, x, y }) => {
                  if (!acct.entity_id) return null
                  const p = allNodePos[acct.entity_id]
                  if (!p) return null
                  const x1 = p.x + NODE_W / 2, y1 = p.y + NODE_H
                  const x2 = x + ACCT_W / 2, y2 = y
                  const midY = (y1 + y2) / 2
                  const isHL = hovered === acct.id || hovered === acct.entity_id
                  return (
                    <g key={`ae-${acct.id}`}>
                      <path
                        d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                        fill="none"
                        stroke={isHL ? 'rgba(16,185,129,0.85)' : 'rgba(16,185,129,0.4)'}
                        strokeWidth={isHL ? 2 : 1.3}
                        strokeDasharray="3 3"
                        markerEnd="url(#oc-arrow-acct)"
                        opacity={isHL ? 1 : 0.6}
                      />
                      <text x={(x1 + x2) / 2} y={midY - 4} textAnchor="middle" fontSize="7" fill="rgba(110,231,183,0.55)" fontFamily="IBM Plex Mono, monospace">
                        owned
                      </text>
                    </g>
                  )
                })}

                {/* Account cluster (collapsed) nodes */}
                {(layout.acctCollapsed ?? []).map(({ entityId, count, total, x, y }) => {
                  const ent = entityMap[entityId]
                  const entName = ent?.entity_name ?? '—'
                  // dashed edge from entity
                  const p = allNodePos[entityId]
                  return (
                    <g key={`acct-c-${entityId}`} style={{ cursor: 'pointer' }}
                       onClick={ev => { ev.stopPropagation(); setExpandedEntity(entityId) }}>
                      {p && (() => {
                        const x1 = p.x + NODE_W / 2, y1 = p.y + NODE_H
                        const x2 = x + NODE_W / 2, y2 = y
                        const midY = (y1 + y2) / 2
                        return (
                          <path
                            d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                            fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth={1.3}
                            strokeDasharray="3 3" markerEnd="url(#oc-arrow-acct)" opacity={0.6}
                          />
                        )
                      })()}
                      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={10} ry={10}
                        fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.6)" strokeWidth={1.4} />
                      <text x={x + 14} y={y + 22} fontSize="14" textAnchor="middle">💵</text>
                      <text x={x + NODE_W / 2 + 8} y={y + 21} textAnchor="middle" fontSize="11" fontWeight="700" fill="#6ee7b7" fontFamily="DM Sans, sans-serif">
                        {entName.length > 17 ? entName.substring(0, 16) + '…' : entName}
                      </text>
                      <text x={x + NODE_W / 2} y={y + 36} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily="DM Sans, sans-serif">
                        {count} {count === 1 ? 'account' : 'accounts'}
                      </text>
                      <text x={x + NODE_W / 2} y={y + 48} textAnchor="middle" fontSize="10" fontWeight="600" fill="#10b981" fontFamily="IBM Plex Mono, monospace">
                        {formatUSD(total)}
                      </text>
                    </g>
                  )
                })}

                {/* Assigned Account nodes */}
                {(layout.acctNodes ?? []).map(({ acct, x, y }) => {
                  const key = acctTypeKey(acct.type, acct.subtype)
                  const color = ACCT_COLOR[key]
                  const isHov = hovered === acct.id
                  const sbal = signedBalance(acct)
                  const displayName = acct.institution ?? acct.name
                  return (
                    <g
                      key={`acct-${acct.id}`}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(acct.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={ev => { ev.stopPropagation(); openNodePopover(acct.id, 'account', x, y, ACCT_W, ACCT_H) }}
                    >
                      <rect x={x} y={y} width={ACCT_W} height={ACCT_H} rx={10} ry={10}
                        fill={color.fill} stroke={color.stroke}
                        strokeWidth={isHov ? 2 : 1.3}
                        opacity={isHov ? 1 : 0.92}
                        style={{ transition: 'opacity 0.15s' }}
                      />
                      {isHov && <rect x={x - 3} y={y - 3} width={ACCT_W + 6} height={ACCT_H + 6} rx={13} ry={13} fill="none" stroke={color.stroke} strokeWidth={1} opacity={0.3} />}
                      <text x={x + 12} y={y + 20} fontSize="13" textAnchor="middle">{color.icon}</text>
                      <text x={x + 28} y={y + 18} fontSize="10" fontWeight="700" fill={color.text} fontFamily="DM Sans, sans-serif">
                        {displayName.length > 22 ? displayName.substring(0, 21) + '…' : displayName}
                      </text>
                      <text x={x + 28} y={y + 32} fontSize="8" fill="rgba(255,255,255,0.45)" fontFamily="IBM Plex Mono, monospace">
                        {acct.mask ? `••••${acct.mask}` : acct.name.length > 24 ? acct.name.substring(0, 23) + '…' : acct.name}
                      </text>
                      <text x={x + 12} y={y + 50} fontSize="11" fontWeight="700" fill={sbal < 0 ? '#fca5a5' : color.text} fontFamily="IBM Plex Mono, monospace">
                        {formatUSD(sbal)}
                      </text>
                      <text x={x + ACCT_W - 10} y={y + 50} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="DM Sans, sans-serif">
                        {color.label}
                      </text>
                    </g>
                  )
                })}

                {/* Unassigned Account nodes */}
                {(layout.unassignedAcctNodes ?? []).map(({ acct, x, y }) => {
                  const key = acctTypeKey(acct.type, acct.subtype)
                  const color = ACCT_COLOR[key]
                  const isHov = hovered === acct.id
                  const sbal = signedBalance(acct)
                  const displayName = acct.institution ?? acct.name
                  const isPersonal = acct.scope === 'personal'
                  return (
                    <g
                      key={`uacct-${acct.id}`}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(acct.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={ev => { ev.stopPropagation(); openNodePopover(acct.id, 'account', x, y, ACCT_W, ACCT_H) }}
                    >
                      <rect x={x} y={y} width={ACCT_W} height={ACCT_H} rx={10} ry={10}
                        fill={isPersonal ? color.fill : 'rgba(107,114,128,0.08)'}
                        stroke={isPersonal ? color.stroke : 'rgba(156,163,175,0.55)'}
                        strokeWidth={isHov ? 2 : 1.3}
                        strokeDasharray={isPersonal ? 'none' : '5 3'}
                        opacity={isHov ? 1 : 0.85}
                      />
                      {isHov && <rect x={x - 3} y={y - 3} width={ACCT_W + 6} height={ACCT_H + 6} rx={13} ry={13} fill="none" stroke={isPersonal ? color.stroke : '#9ca3af'} strokeWidth={1} opacity={0.3} />}
                      <text x={x + 12} y={y + 20} fontSize="13" textAnchor="middle">{color.icon}</text>
                      <text x={x + 28} y={y + 18} fontSize="10" fontWeight="700" fill={isPersonal ? color.text : '#d1d5db'} fontFamily="DM Sans, sans-serif">
                        {displayName.length > 22 ? displayName.substring(0, 21) + '…' : displayName}
                      </text>
                      <text x={x + 28} y={y + 32} fontSize="8" fill="rgba(255,255,255,0.45)" fontFamily="IBM Plex Mono, monospace">
                        {acct.mask ? `••••${acct.mask}` : acct.name.length > 24 ? acct.name.substring(0, 23) + '…' : acct.name}
                      </text>
                      <text x={x + 12} y={y + 50} fontSize="11" fontWeight="700" fill={sbal < 0 ? '#fca5a5' : (isPersonal ? color.text : '#d1d5db')} fontFamily="IBM Plex Mono, monospace">
                        {formatUSD(sbal)}
                      </text>
                      <text x={x + ACCT_W - 10} y={y + 50} textAnchor="end" fontSize="8" fill={isPersonal ? 'rgba(110,231,183,0.8)' : 'rgba(255,255,255,0.4)'} fontFamily="DM Sans, sans-serif">
                        {isPersonal ? 'personal' : 'unassigned'}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          {/* Empty state */}
          {layout.nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              No entities match the current filter
            </div>
          )}

          {/* Zoom toolbar */}
          <div style={{
            position: 'absolute', bottom: 14, right: 14,
            display: 'flex', gap: 4, zIndex: 10,
          }}>
            {[
              { label: '+', action: () => zoom(1.25), title: 'Zoom in' },
              { label: '−', action: () => zoom(0.8), title: 'Zoom out' },
              { label: '⊞', action: fitToView, title: 'Fit to view' },
            ].map(({ label, action, title }) => (
              <button
                key={label}
                data-no-pan
                onClick={action}
                title={title}
                style={{
                  background: 'rgba(10,10,26,0.85)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, width: 32, height: 32, fontSize: 14,
                  color: 'rgba(255,255,255,0.65)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(6px)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scale indicator */}
          <div style={{ position: 'absolute', bottom: 18, left: 14, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'IBM Plex Mono, monospace', zIndex: 10 }}>
            {Math.round(transform.scale * 100)}% · drag to pan · scroll to zoom · dbl-click to fit
          </div>

          {/* Floating Legend */}
          <div style={{
            position: 'absolute', top: 14, right: 14, zIndex: 10,
            background: 'rgba(10,10,26,0.88)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(8px)',
            minWidth: 140, maxHeight: '88%', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Entities</div>
            {[
              { label: 'Person',   color: '#8b5cf6' },
              { label: 'Trust',    color: '#f59e0b' },
              { label: 'LLC',      color: '#3b82f6' },
              { label: 'Corp',     color: '#10b981' },
              { label: 'Holding',  color: '#ec4899' },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, flexShrink: 0, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
              </div>
            ))}
            {showProperties && (
              <>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8, marginBottom: 6 }}>Properties</div>
                {[
                  { label: 'Residence', color: '#3b82f6' },
                  { label: 'Rental',    color: '#10b981' },
                  { label: 'Vacation',  color: '#06b6d4' },
                  { label: 'Investment', color: '#f59e0b' },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, flexShrink: 0, borderRadius: 2, background: color, borderStyle: 'dashed' }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                  </div>
                ))}
              </>
            )}
            {showAccounts && accounts.length > 0 && (
              <>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8, marginBottom: 6 }}>Accounts</div>
                {[
                  { label: '💵 Checking',   color: '#10b981' },
                  { label: '💳 Credit',     color: '#ef4444' },
                  { label: '📈 Brokerage',  color: '#8b5cf6' },
                  { label: '🏠 Loan',       color: '#f59e0b' },
                  { label: '🎓 UTMA',       color: '#3b82f6' },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, flexShrink: 0, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 8, flexShrink: 0, borderRadius: 2, border: '1px dashed #9ca3af', background: 'transparent' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Unassigned</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Node click popover */}
        {popover && (() => {
          const { id, kind, vx, vy } = popover
          const entity = kind === 'entity'   ? entities.find(e => e.id === id)   : null
          const prop   = kind === 'property' ? properties.find(p => p.id === id) : null
          const account = kind === 'account' ? accounts.find(a => a.id === id)   : null

          // Account popover is a special "assign to entity" mini-editor
          if (kind === 'account' && account) {
            return (
              <div
                style={{ position: 'fixed', left: vx - 130, top: vy + 6, zIndex: 2000, background: '#111126', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 280, overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {ACCT_COLOR[acctTypeKey(account.type, account.subtype)].icon} {account.institution ?? account.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {account.mask ? `••••${account.mask}` : account.name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: signedBalance(account) < 0 ? '#fca5a5' : '#10b981', marginTop: 4, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatUSD(signedBalance(account))}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.04)' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Assign Owner</div>
                  <AccountOwnerPicker
                    account={account}
                    entities={entities}
                    onSaved={() => { setPopover(null); if (typeof window !== 'undefined') window.location.reload() }}
                  />
                </div>
                <div>
                  <button onClick={() => { window.location.href = `/accounts#${id}` }}
                    style={{ display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: 12, color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >Open account details →</button>
                  <button onClick={() => setPopover(null)} style={{ display: 'block', width: '100%', padding: '6px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: 11, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Dismiss</button>
                </div>
              </div>
            )
          }

          const items = prop
            ? [
                { label: 'Edit Property',  action: () => { setModal({ type: 'editProperty', propertyId: id }); setPopover(null) } },
                { label: 'Edit Ownership', action: () => { setModal({ type: 'editPropOwn', propertyId: id, propertyName: prop.address }); setPopover(null) } },
                { label: 'Open →',         action: () => { window.location.href = `/properties/${prop.slug ?? id}` } },
              ]
            : entity
            ? [
                { label: 'Edit Entity',    action: () => { setModal({ type: 'editEntity', entityId: id, entityName: entity.entity_name }); setPopover(null) } },
                { label: 'Edit Ownership', action: () => { setModal({ type: 'editOwnership', entityId: id, entityName: entity.entity_name }); setPopover(null) } },
                ...(entity.slug ? [{ label: 'Open →', action: () => { window.location.href = `/companies/${entity.slug}` } }] : []),
              ]
            : []

          return (
            <div
              style={{ position: 'fixed', left: vx - 70, top: vy + 6, zIndex: 2000, background: '#111126', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 160, overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{entity?.entity_name ?? prop?.address ?? '—'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {entity?.entity_type ?? (prop?.purpose ?? 'Property')}
                  {entity?.purpose ? ` · ${entity.purpose}` : ''}
                </div>
              </div>
              {items.map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: 12, color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {item.label}
                </button>
              ))}
              <button onClick={() => setPopover(null)} style={{ display: 'block', width: '100%', padding: '6px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: 11, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Dismiss</button>
            </div>
          )
        })()}

      </div>

      {/* ── YOUR OWNERSHIP VIEW ── */}
      {cascade.length > 0 && (
        <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your Ownership View
            </h3>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Cascading effective ownership, highest to lowest</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cascade.map((entry, i) => (
              <CascadeRow key={entry.entityId} entry={entry} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'editEntity' && (
        <EditEntityModal entityId={modal.entityId} onClose={() => setModal(null)} onSaved={() => { setModal(null); window.location.reload() }} />
      )}
      {modal?.type === 'editOwnership' && (
        <EditOwnershipModal entityId={modal.entityId} entityName={modal.entityName} childType="entity" onClose={() => setModal(null)} onSaved={() => { setModal(null); window.location.reload() }} />
      )}
      {modal?.type === 'editProperty' && (
        <EditPropertyModal propertyId={modal.propertyId} onClose={() => setModal(null)} onSaved={() => { setModal(null); window.location.reload() }} />
      )}
      {modal?.type === 'editPropOwn' && (
        <EditOwnershipModal entityId={modal.propertyId} entityName={modal.propertyName} childType="property" onClose={() => setModal(null)} onSaved={() => { setModal(null); window.location.reload() }} />
      )}
      {modal?.type === 'bulkAssign' && (
        <BulkAssignModal
          accounts={unassignedAccounts.filter(a => a.scope !== 'personal')}
          entities={entities}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); window.location.reload() }}
        />
      )}

      {/* Entity hover net-worth tooltip */}
      {hovered && entityMap[hovered] && (() => {
        const ent = entityMap[hovered]
        const stats = entityDirectValue[hovered]
        if (!stats) return null
        const pos = allNodePos[hovered]
        if (!pos || !containerRef.current) return null
        const rect = containerRef.current.getBoundingClientRect()
        const tx = rect.left + transform.x + (pos.x + NODE_W + 10) * transform.scale
        const ty = rect.top + transform.y + (pos.y) * transform.scale
        // Effective % via cascade
        const c = cascade.find(c => c.entityId === hovered)
        const effectivePct = c?.effectivePct ?? 100
        const totalToYou = (stats.accountTotal + stats.propEquity) * (effectivePct / 100)
        return (
          <div style={{
            position: 'fixed', left: tx, top: ty, zIndex: 1500, pointerEvents: 'none',
            background: 'rgba(10,10,26,0.96)', border: '1px solid rgba(139,92,246,0.35)',
            borderRadius: 10, padding: '10px 14px', minWidth: 220, maxWidth: 280,
            boxShadow: '0 6px 24px rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{ent.entity_name}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {ent.entity_type ?? '—'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, fontSize: 10, columnGap: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>Direct accounts:</span>
              <span style={{ color: '#6ee7b7', fontFamily: 'IBM Plex Mono, monospace' }}>
                {stats.accountCount} · {formatUSD(stats.accountTotal)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>Properties:</span>
              <span style={{ color: '#93c5fd', fontFamily: 'IBM Plex Mono, monospace' }}>
                {stats.propCount} · {formatUSD(stats.propEquity)} eq
              </span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>Effective to you:</span>
              <span style={{ color: '#fcd34d', fontFamily: 'IBM Plex Mono, monospace' }}>
                {effectivePct.toFixed(1)}%
              </span>
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total effective value</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d', fontFamily: 'IBM Plex Mono, monospace' }}>
                {formatUSD(totalToYou)}
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}

// ── Account Owner Picker (for popover) ─────────────────────────────
function AccountOwnerPicker({
  account, entities, onSaved,
}: {
  account: AccountNode
  entities: Entity[]
  onSaved: () => void
}) {
  const [scope, setScope] = useState<'personal' | 'entity'>(
    account.scope === 'entity' ? 'entity' : 'personal'
  )
  const [entityId, setEntityId] = useState<string>(account.entity_id ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save(next: { scope: 'personal' | 'entity'; entityId: string | null }) {
    setSaving(true); setErr(null)
    const { error } = await supabase
      .from('financial_accounts')
      .update({
        account_scope: next.scope,
        entity_id: next.scope === 'entity' ? (next.entityId || null) : null,
      })
      .eq('id', account.id)
    setSaving(false)
    if (error) {
      setErr('Save failed: ' + error.message)
      console.error('AccountOwnerPicker save error:', error)
    } else {
      onSaved()
    }
  }

  const sel: React.CSSProperties = {
    padding: '6px 10px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
    color: '#fff', fontSize: 12, cursor: 'pointer', outline: 'none',
    fontFamily: 'inherit', width: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <select
        value={scope}
        style={sel}
        onChange={e => {
          const next = e.target.value as 'personal' | 'entity'
          setScope(next)
          if (next === 'personal') { setEntityId(''); save({ scope: 'personal', entityId: null }) }
        }}
      >
        <option value="personal">Personal (Colby)</option>
        <option value="entity">Entity</option>
      </select>

      {scope === 'entity' && (
        <select
          value={entityId}
          style={sel}
          onChange={e => {
            setEntityId(e.target.value)
            save({ scope: 'entity', entityId: e.target.value || null })
          }}
        >
          <option value="">Select entity…</option>
          {entities.map(ent => (
            <option key={ent.id} value={ent.id}>{ent.entity_name}</option>
          ))}
        </select>
      )}

      {saving && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>saving…</span>}
      {err && <span style={{ fontSize: 10, color: '#fca5a5' }}>{err}</span>}
    </div>
  )
}

// ── Bulk Assign Modal ──────────────────────────────────────────────
function BulkAssignModal({
  accounts, entities, onClose, onSaved,
}: {
  accounts: AccountNode[]
  entities: Entity[]
  onClose: () => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(accounts.map(a => a.id)))
  const [target, setTarget] = useState<'personal' | string>('personal') // 'personal' or entityId
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function save() {
    if (selected.size === 0) return
    setSaving(true); setErr(null)
    const ids = [...selected]
    const patch = target === 'personal'
      ? { account_scope: 'personal', entity_id: null }
      : { account_scope: 'entity', entity_id: target }
    const { error } = await supabase
      .from('financial_accounts')
      .update(patch)
      .in('id', ids)
    setSaving(false)
    if (error) {
      setErr('Save failed: ' + error.message)
      return
    }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
         onClick={onClose}>
      <div style={{
        background: '#111126', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 14,
        maxWidth: 620, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Assign Unassigned Accounts</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
            {accounts.length} unassigned account{accounts.length === 1 ? '' : 's'}. Select which to assign.
          </div>
        </div>

        <div style={{ padding: '14px 20px', overflow: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Assign to:</span>
            <select
              value={target}
              onChange={e => setTarget(e.target.value)}
              style={{
                padding: '6px 12px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                color: '#fff', fontSize: 12, cursor: 'pointer', flex: 1,
              }}
            >
              <option value="personal">Personal (Colby)</option>
              {entities.map(ent => (
                <option key={ent.id} value={ent.id}>{ent.entity_name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={() => setSelected(new Set(accounts.map(a => a.id)))}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: 5, color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>
              Select all
            </button>
            <button onClick={() => setSelected(new Set())}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: 5, color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>
              Select none
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              {selected.size} selected
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {accounts.map(a => {
              const k = acctTypeKey(a.type, a.subtype)
              const col = ACCT_COLOR[k]
              const isSel = selected.has(a.id)
              return (
                <label key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                    background: isSel ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSel ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)'}`,
                  }}>
                  <input type="checkbox" checked={isSel} onChange={() => toggle(a.id)}
                    style={{ accentColor: '#fbbf24' }} />
                  <span style={{ fontSize: 14 }}>{col.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.institution ?? a.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {a.mask ? `••••${a.mask}` : a.name} · {col.label}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: signedBalance(a) < 0 ? '#fca5a5' : col.text, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatUSD(signedBalance(a))}
                  </div>
                </label>
              )
            })}
            {accounts.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                No unassigned accounts.
              </div>
            )}
          </div>

          {err && <div style={{ marginTop: 10, fontSize: 12, color: '#fca5a5' }}>{err}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', padding: '7px 16px', borderRadius: 7, color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || selected.size === 0}
            style={{
              background: saving || selected.size === 0 ? 'rgba(251,191,36,0.3)' : '#fbbf24',
              border: 'none', padding: '7px 16px', borderRadius: 7, color: '#111', fontSize: 12,
              fontWeight: 700, cursor: saving || selected.size === 0 ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'Saving…' : `Assign ${selected.size} account${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cascade row component ──────────────────────────────────────────
function CascadeRow({ entry, rank }: { entry: CascadeEntry; rank: number }) {
  const color = TYPE_COLOR[entry.entityType ?? ''] ?? DEFAULT_COLOR

  // Build the sentence: You own 100% of Root → which owns 99% of Child → ... = You effectively own X%
  const chainSentence = entry.chain.map((step, i) => {
    if (i === 0) return null  // first is the root (Colby), skip in rendering
    return (
      <React.Fragment key={i}>
        <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 5px' }}>→ which owns</span>
        <span style={{ color: '#fcd34d', fontWeight: 600 }}>{step.pct}%</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>of</span>
        <span style={{ color: color.text, fontWeight: 600 }}>{step.name}</span>
      </React.Fragment>
    )
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 12, padding: '11px 16px',
    }}>
      {/* Rank badge */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#3b82f6',
        fontFamily: 'IBM Plex Mono, monospace',
        marginTop: 1,
      }}>
        {rank}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Entity name + effective % */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <div style={{
            display: 'inline-block',
            width: 8, height: 8, borderRadius: 2, flexShrink: 0,
            background: color.stroke,
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: color.text }}>{entry.entityName}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono, monospace' }}>{entry.entityType ?? '—'}</span>
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace',
              color: entry.effectivePct >= 50 ? '#10b981' : entry.effectivePct >= 25 ? '#f59e0b' : '#9ca3af',
            }}>
              {entry.effectivePct.toFixed(1)}% effective
            </span>
          </div>
        </div>

        {/* Cascade sentence */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, flexWrap: 'wrap', display: 'flex', gap: 2, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>You own</span>
          <span style={{ color: '#fcd34d', fontWeight: 600, margin: '0 3px' }}>{entry.chain[0]?.pct ?? 100}%</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 3 }}>of</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{entry.chain[0]?.name ?? '—'}</span>
          {chainSentence}
          <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 5px' }}>=</span>
          <span style={{ color: entry.effectivePct >= 50 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
            you effectively own {entry.effectivePct.toFixed(1)}% of {entry.entityName}
          </span>
        </div>
      </div>
    </div>
  )
}
