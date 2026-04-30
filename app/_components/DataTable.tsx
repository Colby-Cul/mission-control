'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Eye, EyeOff } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
  width?: string | number
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  filterValue?: string
  filterKeys?: string[]
  emptyMessage?: string
  stickyHeader?: boolean
}

type SortDir = 'asc' | 'desc' | null

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  filterValue = '',
  filterKeys = [],
  emptyMessage = 'No data',
  stickyHeader = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [showColMenu, setShowColMenu] = useState(false)

  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.key))

  const filtered = useMemo(() => {
    if (!filterValue.trim() || !filterKeys.length) return data
    const q = filterValue.toLowerCase()
    return data.filter((row) =>
      filterKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
    )
  }, [data, filterValue, filterKeys])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir(null) }
  }

  function toggleCol(key: string) {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function SortIcon({ col }: { col: Column<T> }) {
    if (!col.sortable) return null
    if (sortKey !== col.key) return <ChevronsUpDown size={12} style={{ opacity: 0.3 }} />
    if (sortDir === 'asc') return <ChevronUp size={12} style={{ color: 'var(--accent)' }} />
    return <ChevronDown size={12} style={{ color: 'var(--accent)' }} />
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Column visibility toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowColMenu(!showColMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            }}
          >
            <Eye size={13} /> Columns
          </button>
          {showColMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
              background: '#0f0a28', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: 8, minWidth: 160,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {columns.map((col) => (
                <button
                  key={col.key}
                  onClick={() => toggleCol(col.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '6px 10px', fontSize: 12, background: 'none', border: 'none',
                    color: hiddenCols.has(col.key) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
                    cursor: 'pointer', borderRadius: 6, textAlign: 'left',
                  }}
                >
                  {hiddenCols.has(col.key) ? <EyeOff size={12} /> : <Eye size={12} />}
                  {col.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                    color: 'rgba(255,255,255,0.4)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    cursor: col.sortable ? 'pointer' : 'default',
                    width: col.width,
                    userSelect: 'none',
                    position: stickyHeader ? 'sticky' : 'relative',
                    top: 0, background: 'var(--bg)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} style={{ padding: '40px 14px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : sorted.map((row, idx) => (
              <tr
                key={String(row.id ?? idx)}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
              >
                {visibleColumns.map((col) => (
                  <td key={col.key} style={{ padding: '12px 14px', fontSize: 13, color: '#f5f5f7', verticalAlign: 'middle' }}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div style={{ padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--mo)' }}>
          {sorted.length} of {data.length} rows
        </div>
      )}
    </div>
  )
}
