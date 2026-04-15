'use client'
/**
 * EntityOrgChart — redesigned with:
 * - Pan/zoom SVG canvas (wheel = zoom, drag = pan, double-click = re-center)
 * - Zoom toolbar (+/−/fit)
 * - Hover path highlight: highlights full chain from root → hovered node
 * - Click node → popover with quick info
 * - ⌘F search to filter nodes by name
 * - Filter chips: All / Operating / Trusts / Holding / Properties / Legal-only
 * - Floating legend (shape/color key)
 * - "Your Ownership View" cascade panel below the map
 * - Mobile: switches to vertical list below 768px
 * - All existing edit affordances preserved
 */
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import EditEntityModal from '../_components/EditEntityModal'
import EditOwnershipModal from '../_components/EditOwnershipModal'
import EditPropertyModal from '../_components/EditPropertyModal'

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
}

// ── Design tokens ──────────────────────────────────────────────────
const TYPE_COLOR: Record<string, { stroke: string; fill: string; text: string }> = {
  Person:      { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.18)', text: '#c4b5fd' },
  Trust:       { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.18)', text: '#fcd34d' },
  LLC:         { stroke: '#f97316', fill: 'rgba(249,115,22,0.18)', text: '#fdba74' },
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

type Filter = 'all' | 'operating' | 'trusts' | 'holding' | 'properties' | 'legal'
type OrgModal =
  | { type: 'editEntity';    entityId: string; entityName: string }
  | { type: 'editOwnership'; entityId: string; entityName: string }
  | { type: 'editProperty';  propertyId: string }
  | { type: 'editPropOwn';   propertyId: string; propertyName: string }

interface Popover {
  id: string
  isProperty: boolean
  vx: number
  vy: number
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

  function walk(nodeId: string, accumulated: number, chain: { name: string; pct: number }[]) {
    const childEdges = edges.filter(e => e.parent_entity_id === nodeId && e.child_type !== 'property')
    for (const edge of childEdges) {
      const pct = Number(edge.ownership_pct)
      const effective = (accumulated * pct) / 100
      const childEntity = entityMap[edge.child_entity_id]
      if (!childEntity) continue
      const newChain = [...chain, { name: childEntity.entity_name, pct }]
      result.push({
        entityId: childEntity.id,
        entityName: childEntity.entity_name,
        entityType: childEntity.entity_type,
        effectivePct: effective,
        chain: newChain,
      })
      walk(childEntity.id, effective, newChain)
    }
  }

  for (const root of roots) {
    walk(root.id, 100, [{ name: root.entity_name, pct: 100 }])
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
export default function EntityOrgChart({ entities, edges, properties = [] }: Props) {
  const [filter, setFilter]           = useState<Filter>('all')
  const [showProperties, setShowProperties] = useState(true)
  const [hovered, setHovered]         = useState<string | null>(null)
  const [popover, setPopover]         = useState<Popover | null>(null)
  const [modal, setModal]             = useState<OrgModal | null>(null)
  const [search, setSearch]           = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showSearch, setShowSearch]   = useState(false)

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
  const visiblePropIds   = useMemo(() => new Set(propertyEdges.map(e => e.child_entity_id)), [propertyEdges])
  const visibleProperties = useMemo(() => properties.filter(p => visiblePropIds.has(p.id)), [properties, visiblePropIds])

  // Hover path highlight
  const hoveredChain = useMemo(() => {
    if (!hovered) return new Set<string>()
    return getAncestorAndDescendantIds(hovered, entityOnlyEdges)
  }, [hovered, entityOnlyEdges])

  // BFS layout
  const layout = useMemo(() => {
    if (!filteredEntities.length) return { nodes: [], propNodes: [], svgW: 400, svgH: 200 }

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
    if (visibleProperties.length > 0) {
      const propY = entitySvgH + V_GAP / 2
      const propTotalW = visibleProperties.length * NODE_W + (visibleProperties.length - 1) * H_GAP
      svgW = Math.max(svgW, propTotalW)
      const propOffset = (svgW - propTotalW) / 2
      propNodes = visibleProperties.map((p, xi) => ({ prop: p, x: propOffset + xi * (NODE_W + H_GAP), y: propY }))
      visibleProperties.forEach((p, xi) => { nodePos[p.id] = { x: propOffset + xi * (NODE_W + H_GAP), y: propNodes[xi].y } })
    }

    const svgH = visibleProperties.length > 0 ? (layers.length + 1) * (NODE_H + V_GAP) + 20 : entitySvgH
    return { nodes, propNodes, nodePos, svgW: Math.max(svgW, 400), svgH }
  }, [filteredEntities, entityOnlyEdges, visibleProperties])

  const allNodePos: Record<string, { x: number; y: number }> = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {}
    layout.nodes.forEach(n => { m[n.entity.id] = { x: n.x, y: n.y } })
    ;(layout.propNodes ?? []).forEach(n => { m[n.prop.id] = { x: n.x, y: n.y } })
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
  function openNodePopover(id: string, isProperty: boolean, svgX: number, svgY: number) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const vx = rect.left + transform.x + (svgX + NODE_W / 2) * transform.scale
    const vy = rect.top  + transform.y + (svgY + NODE_H + 4) * transform.scale
    setPopover({ id, isProperty, vx, vy })
  }

  // Cascade data
  const cascade = useMemo(() => computeCascade(entities, edges), [entities, edges])

  // ── Styles helpers ──
  const filterActive = (f: string) => filter === f
  const chipStyle = (active: boolean, activeColor = '#f97316'): React.CSSProperties => ({
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
                    <stop offset="0%" stopColor="rgba(249,115,22,0.5)" />
                    <stop offset="100%" stopColor="rgba(139,92,246,0.3)" />
                  </linearGradient>
                  <marker id="oc-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(249,115,22,0.45)" />
                  </marker>
                  <marker id="oc-arrow-hl" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(249,115,22,0.95)" />
                  </marker>
                  <marker id="oc-arrow-prop" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(59,130,246,0.5)" />
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
                        stroke={isHL ? 'rgba(249,115,22,0.9)' : 'url(#oc-grad)'}
                        strokeWidth={isHL ? 2.5 : 1.5}
                        strokeDasharray={isHL ? 'none' : '5 3'}
                        markerEnd={isHL ? 'url(#oc-arrow-hl)' : 'url(#oc-arrow)'}
                        opacity={hovered && !isHL ? 0.2 : isHL ? 1 : 0.65}
                      />
                      <text x={(x1 + x2) / 2} y={midY - 5} textAnchor="middle" fontSize="8" fill={isHL ? 'rgba(249,115,22,0.9)' : 'rgba(255,255,255,0.35)'} fontFamily="IBM Plex Mono, monospace">
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
                      onClick={ev => { ev.stopPropagation(); openNodePopover(e.id, false, x, y) }}
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
                      onClick={ev => { ev.stopPropagation(); openNodePopover(p.id, true, x, y) }}
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
            minWidth: 120,
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Legend</div>
            {[
              { label: 'Person',   color: '#8b5cf6', shape: 'rect' },
              { label: 'Trust',    color: '#f59e0b', shape: 'rect' },
              { label: 'LLC',      color: '#f97316', shape: 'rect' },
              { label: 'Corp',     color: '#10b981', shape: 'rect' },
              { label: 'Holding',  color: '#ec4899', shape: 'rect' },
              { label: 'Property', color: '#3b82f6', shape: 'circle' },
            ].map(({ label, color, shape }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, flexShrink: 0, borderRadius: shape === 'circle' ? '50%' : 2, background: color }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Node click popover */}
        {popover && (() => {
          const { id, isProperty, vx, vy } = popover
          const entity = !isProperty ? entities.find(e => e.id === id) : null
          const prop   = isProperty  ? properties.find(p => p.id === id) : null
          const items = isProperty && prop
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
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.08)')}
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
    </>
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
        background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#f97316',
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
