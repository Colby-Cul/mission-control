'use client'

interface Props {
  initialTasks: any[]
  projects: any[]
  entities: any[]
}

export default function TasksClient({ initialTasks, projects, entities }: Props) {
  return (
    <div style={{ padding: '40px', color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Sans, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Tasks</h1>
      {initialTasks.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>No tasks found.</p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {initialTasks.map((t: any) => (
            <li key={t.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontWeight: 600 }}>{t.title ?? t.name ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{t.status}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
