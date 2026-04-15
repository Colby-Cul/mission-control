'use client'
/**
 * EntityOrgChart — SVG-based org-chart of the full entity ownership graph.
 * Layout: layers by BFS depth from root nodes (nodes with no incoming edges).
 * Color-coded by entity_type. Click → navigate to /companies/[slug].
 * Filters: all / operating / trusts / holding. Toggle: Show Properties.
 * Hover: 3-dot menu (Edit Entity / Edit Ownership / Open).
 */
import React, { useMemo, useState, useRef } from 'react'
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
  purpose: string | null  // 'primary-residence' | 'rental' | 'vacation' | 'investment'
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

// Color palette per entity_type
const TYPE_COLOR: Record<string, { stroke: string; fill: string; text: string }> = {
  Person:       { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.15)',  text: '#c4b5fd' },
  Trust:        { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.15)',  text: '#fcd34d' },
  LLC:          { stroke: '#f97316', fill: 'rgba(249,115,22,0.15)',  text: '#fdba74' },
  'C-Corp':     { stroke: '#10b981', fill: 'rgba(16,185,129,0.15)',  text: '#6ee7b7' },
  'S-Corp':     { stroke: '#10b981', fill: 'rgba(16,185,129,0.15)',  text: '#6ee7b7' },
  LP:           { stroke: '#84cc16', fill: 'rgba(132,204,22,0.15)',  text: '#bef264' },
  Partnership:  { stroke: '#84cc16', fill: 'rgba(132,204,22,0.15)',  text: '#bef264' },
  'Sole Prop':  { stroke: '#ec4899', fill: 'rgba(236,72,153,0.15)',  text: '#f9a8d4' },
}
const DEFAULT_COLOR = { stroke: '#6b7280', fill: 'rgba(107,114,128,0.15)', text: '#9ca3af' }

// Purpose overlay
const PURPOSE_BADGE: Record<string, { label: string; color: string }> = {
  holding:     { label: 'HOLDING',    color: '#ec4899' },
  trust:       { label: 'TRUST',      color: '#f59e0b' },
  management:  { label: 'MGMT',       color: '#8b5cf6' },
  individual:  { label: 'PERSON',     color: '#8b5cf6' },
  'legal-separation': { label: 'LEGAL', color: '#6b7280' },
  operating:   { label: 'OPERATING',  color: '#10b981' },
}

// Property purpose → color
const PROP_PURPOSE_COLOR: Record<string, { stroke: string; fill: string; text: string }> = {
  'primary-residence': { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.15)',  text: '#93c5fd' },
  'rental':            { stroke: '#10b981', fill: 'rgba(16,185,129,0.15)',  text: '#6ee7b7' },
  'vacation':          { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.15)',   text: '#67e8f9' },
  'investment':        { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.15)',  text: '#fcd34d' },
}
const DEFAULT_PROP_COLOR = { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.15)', text: '#93c5fd' }

const NODE_W = 160
const NODE_H = 54
const H_GAP = 40
const V_GAP = 80

type Filter = 'all' | 'operating' | 'trusts' | 'holding'

type OrgModal =
  | { type: 'editEntity';    entityId: string; entityName: string }
  | { type: 'editOwnership'; entityId: string; entityName: string }
  | { type: 'editProperty';  propertyId: string }
  | { type: 'editPropOwn';   propertyId: string; propertyName: string }

export default function EntityOrgChart({ entities, edges, properties = [] }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showProperties, setShowProperties] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const [nodeMenu, setNodeMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [modal, setModal] = useState<OrgModal | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

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

  // Apply filter
  const filteredIds = useMemo(() => {
    const all = new Set(entities.map(e => e.id))
    if (filter === 'all') return all
    if (filter === 'trusts') return new Set(entities.filter(e => e.entity_type === 'Trust' || e.purpose === 'trust').map(e => e.id))
    if (filter === 'holding') return new Set(entities.filter(e => e.purpose === 'holding').map(e => e.id))
    if (filter === 'operating') return new Set(entities.filter(e => !e.purpose || e.purpose === 'operating').map(e => e.id))
    return all
  }, [entities, filter])

  const filteredEntities = useMemo(() => entities.filter(e => filteredIds.has(e.id)), [entities, filteredIds])

  // Property edges: child_type='property', only show if showProperties is on
  const propertyEdges = useMemo(() =>
    showProperties
      ? edges.filter(e => e.child_type === 'property' && filteredIds.has(e.parent_entity_id))
      : []
  , [edges, filteredIds, showProperties])

  // Entity-only edges (exclude property edges)
  const filteredEdges = useMemo(() =>
    edges.filter(e => e.child_type !== 'property' && filteredIds.has(e.parent_entity_id) && filteredIds.has(e.child_entity_id))
  , [edges, filteredIds])

  // Property nodes to show (those referenced by visible property edges)
  const visiblePropertyIds = useMemo(() => new Set(propertyEdges.map(e => e.child_entity_id)), [propertyEdges])
  const visibleProperties = useMemo(() => properties.filter(p => visiblePropertyIds.has(p.id)), [properties, visiblePropertyIds])

  // BFS layout (entity nodes only; property nodes are appended as an extra layer)
  const layout = useMemo(() => {
    if (!filteredEntities.length) return { nodes: [], propNodes: [], svgW: 400, svgH: 200 }

    const childSet = new Set(filteredEdges.map(e => e.child_entity_id))
    // Root nodes: no incoming edges among filtered
    let roots = filteredEntities.filter(e => !childSet.has(e.id)).map(e => e.id)
    if (!roots.length) roots = [filteredEntities[0].id]

    // BFS to assign layers
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
        const children = filteredEdges.filter(e => e.parent_entity_id === id).map(e => e.child_entity_id)
        next.push(...children)
      }
      queue = next.filter(id => !visited.has(id))
    }
    // Append any disconnected entity nodes
    filteredEntities.forEach(e => {
      if (!visited.has(e.id)) layers.push([e.id])
    })

    // Assign x/y per layer
    const nodePos: Record<string, { x: number; y: number }> = {}
    let svgW = 0
    layers.forEach((layer, li) => {
      const totalW = layer.length * NODE_W + (layer.length - 1) * H_GAP
      svgW = Math.max(svgW, totalW)
      const y = li * (NODE_H + V_GAP) + 20
      layer.forEach((id, xi) => {
        const x = xi * (NODE_W + H_GAP)
        nodePos[id] = { x, y }
      })
    })
    // Center each layer
    layers.forEach(layer => {
      const rowW = layer.length * NODE_W + (layer.length - 1) * H_GAP
      const offset = (svgW - rowW) / 2
      layer.forEach(id => { nodePos[id].x += offset })
    })

    const entitySvgH = layers.length * (NODE_H + V_GAP) + 20

    const nodes = filteredEntities
      .filter(e => nodePos[e.id])
      .map(e => ({ entity: e, ...nodePos[e.id] }))

    // Property nodes: place them in an extra layer below entity nodes
    let propNodes: { prop: PropertyNode; x: number; y: number }[] = []
    if (visibleProperties.length > 0) {
      const propY = entitySvgH + V_GAP / 2
      const propTotalW = visibleProperties.length * NODE_W + (visibleProperties.length - 1) * H_GAP
      svgW = Math.max(svgW, propTotalW)
      const propOffset = (svgW - propTotalW) / 2
      propNodes = visibleProperties.map((p, xi) => ({
        prop: p,
        x: propOffset + xi * (NODE_W + H_GAP),
        y: propY,
      }))
      visibleProperties.forEach((p, xi) => {
        nodePos[p.id] = { x: propOffset + xi * (NODE_W + H_GAP), y: propY }
      })
    }

    const svgH = visibleProperties.length > 0
      ? (layers.length + 1) * (NODE_H + V_GAP) + 20
      : entitySvgH

    return { nodes, propNodes, svgW: Math.max(svgW, 400), svgH }
  }, [filteredEntities, filteredEdges, visibleProperties])

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    background: active ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
    color: active ? '#f97316' : 'rgba(255,255,255,0.5)',
    border: active ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.15s',
  })

  const nodePos: Record<string, { x: number; y: number }> = {}
  layout.nodes.forEach(n => { nodePos[n.entity.id] = { x: n.x, y: n.y } })
  ;(layout.propNodes ?? []).forEach(n => { nodePos[n.prop.id] = { x: n.x, y: n.y } })

  return (
    <div style={{
      background: 'rgba(255,255,255,0.015)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 20,
      padding: '24px',
      overflow: 'hidden',
    }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['all', 'operating', 'trusts', 'holding'] as Filter[]).map(f => (
          <button key={f} style={filterBtnStyle(filter === f)} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All Entities' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        {/* Show Properties toggle */}
        {properties.length > 0 && (
          <button
            style={{
              ...filterBtnStyle(showProperties),
              borderColor: showProperties ? 'rgba(59,130,246,0.4)' : undefined,
              color: showProperties ? '#93c5fd' : undefined,
              background: showProperties ? 'rgba(59,130,246,0.12)' : undefined,
            }}
            onClick={() => setShowProperties(v => !v)}
          >
            ⌂ Properties
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Person',    color: '#8b5cf6' },
            { label: 'Trust',     color: '#f59e0b' },
            { label: 'LLC',       color: '#f97316' },
            { label: 'Corp',      color: '#10b981' },
            { label: 'Holding',   color: '#ec4899' },
            { label: 'Property',  color: '#3b82f6' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
              <div style={{ width: 8, height: 8, borderRadius: label === 'Property' ? '50%' : 2, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* SVG org-chart */}
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${layout.svgW + 20} ${layout.svgH + 20}`}
          width={layout.svgW + 20}
          height={layout.svgH + 20}
          style={{ display: 'block', minWidth: '100%' }}
          onClick={() => setNodeMenu(null)}
        >
          <defs>
            <linearGradient id="oc-map-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(249,115,22,0.5)" />
              <stop offset="100%" stopColor="rgba(139,92,246,0.3)" />
            </linearGradient>
            <marker id="oc-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(249,115,22,0.4)" />
            </marker>
          </defs>

          {/* Entity→Entity Edges */}
          {filteredEdges.map((edge, i) => {
            const p = nodePos[edge.parent_entity_id]
            const c = nodePos[edge.child_entity_id]
            if (!p || !c) return null
            const x1 = p.x + NODE_W / 2
            const y1 = p.y + NODE_H
            const x2 = c.x + NODE_W / 2
            const y2 = c.y
            const midY = (y1 + y2) / 2
            const isHov = hovered === edge.parent_entity_id || hovered === edge.child_entity_id
            return (
              <g key={`ee-${i}`}>
                <path
                  d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                  fill="none"
                  stroke={isHov ? 'rgba(249,115,22,0.7)' : 'url(#oc-map-grad)'}
                  strokeWidth={isHov ? 2 : 1.5}
                  strokeDasharray={isHov ? 'none' : '5 3'}
                  markerEnd="url(#oc-arrow)"
                  opacity={isHov ? 1 : 0.6}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={midY - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="rgba(255,255,255,0.35)"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {Number(edge.ownership_pct)}%{edge.role ? ` · ${edge.role}` : ''}
                </text>
              </g>
            )
          })}

          {/* Entity→Property Edges */}
          {propertyEdges.map((edge, i) => {
            const p = nodePos[edge.parent_entity_id]
            const c = nodePos[edge.child_entity_id]
            if (!p || !c) return null
            const x1 = p.x + NODE_W / 2
            const y1 = p.y + NODE_H
            const x2 = c.x + NODE_W / 2
            const y2 = c.y
            const midY = (y1 + y2) / 2
            const isHov = hovered === edge.parent_entity_id || hovered === edge.child_entity_id
            return (
              <g key={`pe-${i}`}>
                <path
                  d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                  fill="none"
                  stroke={isHov ? 'rgba(59,130,246,0.8)' : 'rgba(59,130,246,0.4)'}
                  strokeWidth={isHov ? 2 : 1.5}
                  strokeDasharray={isHov ? 'none' : '4 3'}
                  markerEnd="url(#oc-arrow)"
                  opacity={isHov ? 1 : 0.6}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={midY - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="rgba(147,197,253,0.5)"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {Number(edge.ownership_pct)}%{edge.role ? ` · ${edge.role}` : ''}
                </text>
              </g>
            )
          })}

          {/* Nodes */}
          {layout.nodes.map(({ entity: e, x, y }) => {
            const color = e.purpose === 'holding'
              ? { stroke: '#ec4899', fill: 'rgba(236,72,153,0.15)', text: '#f9a8d4' }
              : TYPE_COLOR[e.entity_type ?? ''] ?? DEFAULT_COLOR
            const isHov = hovered === e.id
            const purposeBadge = PURPOSE_BADGE[e.purpose ?? '']

            return (
              <g
                key={e.id}
                style={{ cursor: e.slug ? 'pointer' : 'default' }}
                onMouseEnter={() => setHovered(e.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { if (e.slug) window.location.href = `/companies/${e.slug}` }}
              >
                {/* Node rect */}
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  ry={10}
                  fill={color.fill}
                  stroke={isHov ? color.stroke : color.stroke}
                  strokeWidth={isHov ? 2 : 1.5}
                  opacity={isHov ? 1 : 0.9}
                  style={{ transition: 'all 0.15s' }}
                />
                {/* Glow on hover */}
                {isHov && (
                  <rect
                    x={x - 2}
                    y={y - 2}
                    width={NODE_W + 4}
                    height={NODE_H + 4}
                    rx={12}
                    ry={12}
                    fill="none"
                    stroke={color.stroke}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                )}
                {/* Entity name */}
                <text
                  x={x + NODE_W / 2}
                  y={y + (purposeBadge ? 18 : 22)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={color.text}
                  fontFamily="DM Sans, sans-serif"
                >
                  {e.entity_name.length > 18 ? e.entity_name.substring(0, 17) + '…' : e.entity_name}
                </text>
                {/* Entity type sub-label */}
                <text
                  x={x + NODE_W / 2}
                  y={y + (purposeBadge ? 30 : 36)}
                  textAnchor="middle"
                  fontSize="8"
                  fill="rgba(255,255,255,0.35)"
                  fontFamily="DM Sans, sans-serif"
                >
                  {e.entity_type ?? '—'}
                </text>
                {/* Purpose badge */}
                {purposeBadge && (
                  <text
                    x={x + NODE_W / 2}
                    y={y + 44}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="700"
                    fill={purposeBadge.color}
                    fontFamily="IBM Plex Mono, monospace"
                    letterSpacing="0.06em"
                  >
                    {purposeBadge.label}
                  </text>
                )}
                {/* Navigate arrow if has slug */}
                {e.slug && isHov && (
                  <text x={x + NODE_W - 10} y={y + 14} fontSize="9" fill="rgba(255,255,255,0.5)">→</text>
                )}
                {/* 3-dot quick-action menu trigger on hover */}
                {isHov && (
                  <g
                    onClick={ev => {
                      ev.stopPropagation()
                      // position in SVG coords, converted to viewport
                      const svgEl = svgRef.current
                      if (!svgEl) return
                      const rect = svgEl.getBoundingClientRect()
                      const viewBox = svgEl.viewBox.baseVal
                      const scaleX = rect.width / (viewBox.width || 1)
                      const scaleY = rect.height / (viewBox.height || 1)
                      const vpX = rect.left + (x + 4) * scaleX
                      const vpY = rect.top + (y + NODE_H) * scaleY
                      setNodeMenu({ id: e.id, x: vpX, y: vpY })
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect x={x + 2} y={y + NODE_H - 14} width={20} height={14} rx={4} fill="rgba(0,0,0,0.5)" />
                    <circle cx={x + 7} cy={y + NODE_H - 7} r={1.4} fill="rgba(255,255,255,0.7)" />
                    <circle cx={x + 12} cy={y + NODE_H - 7} r={1.4} fill="rgba(255,255,255,0.7)" />
                    <circle cx={x + 17} cy={y + NODE_H - 7} r={1.4} fill="rgba(255,255,255,0.7)" />
                  </g>
                )}
              </g>
            )
          })}

          {/* Property Nodes */}
          {(layout.propNodes ?? []).map(({ prop: p, x, y }) => {
            const color = PROP_PURPOSE_COLOR[p.purpose ?? ''] ?? DEFAULT_PROP_COLOR
            const isHov = hovered === p.id
            const propSlug = p.slug ?? p.id
            return (
              <g
                key={p.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { window.location.href = `/properties/${propSlug}` }}
              >
                {/* Property node: rounded rect with dashed border */}
                <rect
                  x={x} y={y}
                  width={NODE_W} height={NODE_H}
                  rx={10} ry={10}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={isHov ? 2 : 1.5}
                  strokeDasharray="4 2"
                  opacity={isHov ? 1 : 0.88}
                />
                {isHov && (
                  <rect x={x - 2} y={y - 2} width={NODE_W + 4} height={NODE_H + 4} rx={12} ry={12}
                    fill="none" stroke={color.stroke} strokeWidth={1} opacity={0.3} />
                )}
                {/* Building icon */}
                <text x={x + 14} y={y + 30} fontSize="14" fill={color.text} textAnchor="middle">⌂</text>
                {/* Property address */}
                <text
                  x={x + NODE_W / 2 + 6} y={y + 20}
                  textAnchor="middle" fontSize="10" fontWeight="600"
                  fill={color.text} fontFamily="DM Sans, sans-serif"
                >
                  {(p.address.length > 16 ? p.address.substring(0, 15) + '…' : p.address)}
                </text>
                {/* City, purpose */}
                <text
                  x={x + NODE_W / 2 + 6} y={y + 32}
                  textAnchor="middle" fontSize="8"
                  fill="rgba(255,255,255,0.4)" fontFamily="DM Sans, sans-serif"
                >
                  {p.city ?? ''}{p.purpose ? ` · ${p.purpose}` : ''}
                </text>
                {/* Navigate arrow */}
                {isHov && (
                  <text x={x + NODE_W - 10} y={y + 14} fontSize="9" fill="rgba(255,255,255,0.5)">→</text>
                )}
                {/* 3-dot quick-action menu trigger on hover */}
                {isHov && (
                  <g
                    onClick={ev => {
                      ev.stopPropagation()
                      const svgEl = svgRef.current
                      if (!svgEl) return
                      const rect = svgEl.getBoundingClientRect()
                      const viewBox = svgEl.viewBox.baseVal
                      const scaleX = rect.width / (viewBox.width || 1)
                      const scaleY = rect.height / (viewBox.height || 1)
                      const vpX = rect.left + (x + 4) * scaleX
                      const vpY = rect.top + (y + NODE_H) * scaleY
                      setNodeMenu({ id: 'prop:' + p.id, x: vpX, y: vpY })
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect x={x + 2} y={y + NODE_H - 14} width={20} height={14} rx={4} fill="rgba(0,0,0,0.5)" />
                    <circle cx={x + 7} cy={y + NODE_H - 7} r={1.4} fill="rgba(255,255,255,0.7)" />
                    <circle cx={x + 12} cy={y + NODE_H - 7} r={1.4} fill="rgba(255,255,255,0.7)" />
                    <circle cx={x + 17} cy={y + NODE_H - 7} r={1.4} fill="rgba(255,255,255,0.7)" />
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Empty state */}
      {layout.nodes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          No entities match the current filter
        </div>
      )}

      {/* Node context menu (floating) */}
      {nodeMenu && (() => {
        const isProperty = nodeMenu.id.startsWith('prop:')
        const rawId = isProperty ? nodeMenu.id.slice(5) : nodeMenu.id
        const entityObj = entities.find(e => e.id === rawId)
        const propObj = properties.find(p => p.id === rawId)
        const menuItems = isProperty
          ? [
              { label: 'Edit Property',  action: () => { setModal({ type: 'editProperty', propertyId: rawId }); setNodeMenu(null) } },
              { label: 'Edit Ownership', action: () => { setModal({ type: 'editPropOwn', propertyId: rawId, propertyName: propObj?.address ?? '' }); setNodeMenu(null) } },
              { label: 'Open →',         action: () => { window.location.href = `/properties/${propObj?.slug ?? rawId}` } },
            ]
          : [
              { label: 'Edit Entity',    action: () => { setModal({ type: 'editEntity', entityId: rawId, entityName: entityObj?.entity_name ?? '' }); setNodeMenu(null) } },
              { label: 'Edit Ownership', action: () => { setModal({ type: 'editOwnership', entityId: rawId, entityName: entityObj?.entity_name ?? '' }); setNodeMenu(null) } },
              ...(entityObj?.slug ? [{ label: 'Open →', action: () => { window.location.href = `/companies/${entityObj.slug}` } }] : []),
            ]
        return (
          <div
            style={{
              position: 'fixed',
              left: nodeMenu.x,
              top: nodeMenu.y + 4,
              zIndex: 2000,
              background: '#111126',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              minWidth: 148,
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {menuItems.map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  display: 'block', width: '100%', padding: '9px 14px',
                  textAlign: 'left', background: 'none', border: 'none',
                  fontSize: 12, color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(249,115,22,0.08)' }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'none' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )
      })()}

      {/* Modals */}
      {modal?.type === 'editEntity' && (
        <EditEntityModal
          entityId={modal.entityId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); window.location.reload() }}
        />
      )}
      {modal?.type === 'editOwnership' && (
        <EditOwnershipModal
          entityId={modal.entityId}
          entityName={modal.entityName}
          childType="entity"
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}
      {modal?.type === 'editProperty' && (
        <EditPropertyModal
          propertyId={modal.propertyId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); window.location.reload() }}
        />
      )}
      {modal?.type === 'editPropOwn' && (
        <EditOwnershipModal
          entityId={modal.propertyId}
          entityName={modal.propertyName}
          childType="property"
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}
    </div>
  )
}
