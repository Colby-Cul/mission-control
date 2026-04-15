'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'

export interface KanbanColumn<T> {
  key: string
  label: string
  color: string
  accent?: string
}

interface KanbanCardProps {
  id: string
  children: React.ReactNode
}

function DroppableColumn({
  column,
  children,
  count,
}: {
  column: KanbanColumn<unknown>
  children: React.ReactNode
  count: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key })
  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isOver ? column.color + '40' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16,
        minWidth: 240,
        flex: 1,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* Column header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px',
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        borderTop: `3px solid ${column.color}`,
        borderRadius: '14px 14px 0 0',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: column.color }}>
          {column.label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: column.color + '18', color: column.color, fontFamily: 'var(--mo)',
        }}>
          {count}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
        {children}
      </div>
    </div>
  )
}

export function SortableItem({ id, children }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
      }}
    >
      {children}
    </div>
  )
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumn<T>[]
  items: T[]
  getColumnKey: (item: T) => string
  renderCard: (item: T) => React.ReactNode
  onMove?: (itemId: string, fromColumn: string, toColumn: string) => void
}

export default function KanbanBoard<T extends { id: string }>({
  columns,
  items,
  getColumnKey,
  renderCard,
  onMove,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const grouped = columns.reduce<Record<string, T[]>>((acc, col) => {
    acc[col.key] = items.filter((item) => getColumnKey(item) === col.key)
    return acc
  }, {})

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    const fromColumn = getColumnKey(items.find((i) => i.id === active.id)!)
    const toColumn = String(over.id)
    if (fromColumn !== toColumn && onMove) {
      onMove(String(active.id), fromColumn, toColumn)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 8 }}>
        {columns.map((col) => (
          <DroppableColumn key={col.key} column={col} count={grouped[col.key]?.length ?? 0}>
            <SortableContext items={grouped[col.key]?.map((i) => i.id) ?? []} strategy={verticalListSortingStrategy}>
              {grouped[col.key]?.map((item) => (
                <SortableItem key={item.id} id={item.id}>
                  {renderCard(item)}
                </SortableItem>
              ))}
              {!grouped[col.key]?.length && (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
                  Empty
                </div>
              )}
            </SortableContext>
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div style={{ opacity: 0.9, cursor: 'grabbing' }}>
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
