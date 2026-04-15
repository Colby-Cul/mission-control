/**
 * UpcomingEventsCard — server component.
 *
 * - If the current user has a Google token row → fetches the next-7-days of
 *   primary calendar events and renders them in a glassmorphic .mc-card.
 * - If no token / env vars missing / API error → renders the ComingSoon
 *   fallback (same visual as before, with the "Connect Google" CTA).
 */
import ComingSoon from '../_components/ComingSoon'
import {
  currentUserId,
  getCalendarEvents,
  getGoogleTokenRow,
  isGoogleOAuthConfigured,
  GoogleCalendarEvent,
} from '../lib/google'

const CALENDAR_COLOR_MAP: Record<string, string> = {
  '1':  '#7986cb', // Lavender
  '2':  '#33b679', // Sage
  '3':  '#8e24aa', // Grape
  '4':  '#e67c73', // Flamingo
  '5':  '#f6bf26', // Banana
  '6':  '#f4511e', // Tangerine
  '7':  '#039be5', // Peacock
  '8':  '#616161', // Graphite
  '9':  '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000', // Tomato
}

function fmtTime(iso?: string, allDay?: string): string {
  if (allDay) return 'All day'
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function meetLink(e: GoogleCalendarEvent): string | null {
  if (e.hangoutLink) return e.hangoutLink
  const entry = e.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')
  return entry?.uri ?? null
}

export default async function UpcomingEventsCard() {
  // OAuth not set up → show ComingSoon (with helpful CTA text).
  if (!isGoogleOAuthConfigured()) {
    return (
      <ComingSoon
        title="Upcoming Events"
        reason="Next 7 days from Google Calendar — meetings, deadlines, and important dates."
        icon="📅"
        connect="google"
        dataSource="coming-soon:home.calendar"
        skeleton="table"
      />
    )
  }

  const userId = currentUserId()
  const token = await getGoogleTokenRow(userId).catch(() => null)

  // Not connected yet → ComingSoon (still with Connect button).
  if (!token) {
    return (
      <ComingSoon
        title="Upcoming Events"
        reason="Next 7 days from Google Calendar — meetings, deadlines, and important dates."
        icon="📅"
        connect="google"
        dataSource="coming-soon:home.calendar"
        skeleton="table"
      />
    )
  }

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
  const events = await getCalendarEvents(userId, {
    timeMin: now,
    timeMax: in7Days,
    maxResults: 20,
  }).catch(() => [])

  return (
    <div
      className="mc-card"
      data-source="google.calendar.events"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 260,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>Upcoming Events</div>
            <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', letterSpacing: '0.05em', marginTop: 1 }}>
              NEXT 7 DAYS · GOOGLE CALENDAR
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 9, fontWeight: 700, color: 'var(--green)',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          padding: '3px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
          fontFamily: 'var(--mo)',
        }}>
          LIVE
        </div>
      </div>

      {events.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--dim)', fontSize: 13, padding: '28px 0',
          fontFamily: 'var(--b)',
        }}>
          No events in next 7 days
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map(ev => {
            const startIso = ev.start?.dateTime ?? ev.start?.date
            const timeLabel = fmtTime(ev.start?.dateTime, ev.start?.date)
            const color = CALENDAR_COLOR_MAP[ev.colorId ?? ''] ?? '#f97316'
            const guests = ev.attendees?.length ?? 0
            const meet = meetLink(ev)
            return (
              <a
                key={ev.id}
                href={ev.htmlLink ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
              >
                <div style={{
                  width: 6, borderRadius: 3, alignSelf: 'stretch',
                  background: color, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--dim)',
                    letterSpacing: '0.04em', marginBottom: 2,
                  }}>
                    {timeLabel}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 600, fontFamily: 'var(--b)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ev.summary ?? '(no title)'}
                  </div>
                  <div style={{
                    display: 'flex', gap: 10, fontSize: 10, color: 'var(--dim)',
                    marginTop: 3, flexWrap: 'wrap', fontFamily: 'var(--mo)',
                  }}>
                    {ev.location && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        📍 {ev.location}
                      </span>
                    )}
                    {guests > 0 && <span>👥 {guests}</span>}
                    {meet && (
                      <span style={{ color: 'var(--orange)' }}>
                        🎥 Meet
                      </span>
                    )}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
