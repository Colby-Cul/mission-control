/**
 * export.ts — download helpers for CSV / JSON exports.
 * Called from TopbarClient on Export button click.
 */

export function exportAsCsv(rows: Record<string, unknown>[], filename: string): number {
  if (!rows.length) return 0
  const cols = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))].join('\n')
  triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
  return rows.length
}

export function exportAsJson(obj: unknown, filename: string): number {
  const json = JSON.stringify(obj, null, 2)
  triggerDownload(json, `${filename}.json`, 'application/json')
  if (Array.isArray(obj)) return obj.length
  return 1
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
