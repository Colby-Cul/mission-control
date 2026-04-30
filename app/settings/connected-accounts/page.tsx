// Re-export from the legacy /accounts page. The page code stays in its
// original location so relative imports (../_components, ../lib) don't
// break; the redirect in next.config.js sends /accounts here.
export * from '../../accounts/page'
export { default } from '../../accounts/page'
