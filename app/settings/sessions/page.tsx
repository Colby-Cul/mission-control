// /sessions and /activity both redirect here. The legacy /sessions page
// already surfaces run history + cost + cron analytics; if we want a deeper
// merge with /activity content later, we can fold that in-place.
export * from '../../sessions/page'
export { default } from '../../sessions/page'
