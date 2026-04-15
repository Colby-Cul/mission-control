export default function Sparkline({
  data,
  width = 560,
  height = 80,
  color = 'var(--green)',
  fill = 'rgba(80,200,120,0.12)',
  strokeWidth = 2,
}: {
  data: { value: number | string; as_of?: string }[]
  width?: number
  height?: number
  color?: string
  fill?: string
  strokeWidth?: number
}) {
  const pts = (data ?? [])
    .map(d => Number(d.value))
    .filter(n => Number.isFinite(n))
  if (pts.length < 2) {
    return (
      <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--mo)', padding: '8px 0' }}>
        not enough data for a trend yet
      </div>
    )
  }

  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 1
  const pad = 4
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const coords = pts.map((v, i) => {
    const x = pad + (i / (pts.length - 1)) * innerW
    const y = pad + innerH - ((v - min) / range) * innerH
    return [x, y] as const
  })

  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${(height - pad).toFixed(1)} L${coords[0][0].toFixed(1)},${(height - pad).toFixed(1)} Z`

  const last = coords[coords.length - 1]
  const first = pts[0]
  const lastVal = pts[pts.length - 1]
  const deltaPct = first === 0 ? 0 : ((lastVal - first) / Math.abs(first)) * 100
  const up = lastVal >= first

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        aria-label="trend sparkline"
      >
        <path d={area} fill={fill} />
        <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--mo)', marginTop: 4 }}>
        <span>{pts.length} snapshots</span>
        <span style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
          {up ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
