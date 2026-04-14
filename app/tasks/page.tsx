import { getMyTasks } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const tasks = await getMyTasks()
  const open = tasks.filter((t: any) => t.status !== 'done' && t.status !== 'completed')
  const done = tasks.filter((t: any) => t.status === 'done' || t.status === 'completed')

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ TASKS · WHAT'S ON THE DECK</div>
        <h1>Tasks</h1>
        <div className="big">{open.length}</div>
        <p>{open.length} open · {done.length} done · {tasks.length} total</p>
      </div>

      <div className="mc-card accent" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Open</h3>
        {open.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Inbox zero. 🎯</div>}
        {open.map((t: any) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 500 }}>{t.title ?? t.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                {t.project?.name ?? 'No project'} · {t.status ?? 'open'}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--mo)', color: 'var(--t3)', fontSize: 10 }}>
              {t.due_date ?? ''}
            </div>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Recently Done</h3>
          {done.slice(0, 20).map((t: any) => (
            <div key={t.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--t3)' }}>
              <span style={{ textDecoration: 'line-through' }}>{t.title ?? t.name}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
