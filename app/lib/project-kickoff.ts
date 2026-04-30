/**
 * project-kickoff.ts — turn a Forge idea's spec into an immediately-dispatched
 * task plan, so Convert-to-Project produces real org motion, not just a DB row.
 *
 * Design intent:
 *   - Jarvis (main) is CEO + Chief of Staff; he oversees, he doesn't manually
 *     assign every task.
 *   - This module encodes his "standing orders": parse the agentic architecture
 *     of the idea into sentence-sized tasks, route each to the best-fit
 *     specialist agent by keyword match, and dispatch.
 *   - Jarvis then gets the oversight summary and can reassign if he disagrees.
 *
 * The keyword→agent map is deliberately conservative. When unsure, it falls
 * back to coding-agent (our strongest builder) — Jarvis can reroute later.
 */

export interface ProposedTask {
  description: string
  agent: string
  phase: string
  priority: 'high' | 'normal' | 'low'
}

// Keyword → specialist agent. First match wins; priority roughly by concreteness.
// Agent IDs MUST match the live OpenClaw registry (see `openclaw agents list`).
// Current valid IDs: beacon, bookkeeper, cfo, coding-agent, crypto-analyst,
// designer, echo, executive-assistant, fin-researcher, herald, lens, main,
// maven, ops-runner, pulse, quill, scribe, sentinel, spark, stock-analyst,
// tax-advisor, validation.
const ROUTING: Array<{ keywords: RegExp; agent: string; phase: string; priority?: 'high' | 'normal' | 'low' }> = [
  { keywords: /\b(stripe|payment|invoic|billing|receivable|payable|deposit|refund)\b/i, agent: 'coding-agent', phase: 'build', priority: 'high' },
  { keywords: /\b(finance|budget|p&l|cash[- ]?flow|pnl|forecast|balance sheet)\b/i,     agent: 'cfo',          phase: 'plan' },
  { keywords: /\b(tax|irs|deduction|1099|w-?2|schedule c)\b/i,                          agent: 'tax-advisor',  phase: 'plan' },
  { keywords: /\b(design|ui|ux|interface|mockup|wireframe|layout|figma|style guide)\b/i, agent: 'designer',    phase: 'design', priority: 'high' },
  { keywords: /\b(seo|linkedin|content|blog|social|campaign|growth|referral|brand)\b/i, agent: 'maven',        phase: 'gtm' },
  { keywords: /\b(market research|competitor|positioning|industry|insight)\b/i,        agent: 'lens',         phase: 'research' },
  { keywords: /\b(email|inbox|triage|reply|chat|support ticket|customer service|helpdesk)\b/i, agent: 'executive-assistant', phase: 'ops' },
  { keywords: /\b(sms|notification|alert|announcement|slack|broadcast|reminder)\b/i,    agent: 'beacon',       phase: 'ops' },
  { keywords: /\b(cron|scheduler|background job|queue|pipeline|batch|deploy)\b/i,       agent: 'ops-runner',   phase: 'ops' },
  { keywords: /\b(test|qa|regression|validate|verify|acceptance)\b/i,                   agent: 'validation',   phase: 'qa' },
  { keywords: /\b(crypto|token|defi|wallet|blockchain|bitcoin|ethereum)\b/i,            agent: 'crypto-analyst', phase: 'research' },
  { keywords: /\b(kpi|metric|dashboard|report|analytics)\b/i,                           agent: 'pulse',        phase: 'research' },
  { keywords: /\b(calendar|schedul|meeting|follow[- ]?up|executive|brief)\b/i,          agent: 'executive-assistant', phase: 'ops' },
  { keywords: /\b(research|investigat|diligence|study)\b/i,                             agent: 'fin-researcher', phase: 'research' },
  { keywords: /\b(copywrit|docs|draft|spec|memo|documentation)\b/i,                    agent: 'scribe',       phase: 'gtm' },
  { keywords: /\b(bookkeep|ledger|reconcil|expense|category|classify)\b/i,             agent: 'bookkeeper',   phase: 'ops' },
  { keywords: /\b(pr |press|public relations|brand health)\b/i,                        agent: 'herald',       phase: 'gtm' },
  { keywords: /\b(stock|equit|portfolio|trading|market hours)\b/i,                     agent: 'stock-analyst', phase: 'research' },
  // Default: engineering work goes to coding-agent
  { keywords: /\b(build|implement|integrat|api|chrome extension|backend|frontend|service|sdk|module|library|fix|refactor|migration|feature)\b/i, agent: 'coding-agent', phase: 'build', priority: 'high' },
]

const DEFAULT_AGENT = 'coding-agent'
const DEFAULT_PHASE = 'build'

function routeSentence(sentence: string): { agent: string; phase: string; priority: 'high' | 'normal' | 'low' } {
  for (const rule of ROUTING) {
    if (rule.keywords.test(sentence)) {
      return { agent: rule.agent, phase: rule.phase, priority: rule.priority ?? 'normal' }
    }
  }
  return { agent: DEFAULT_AGENT, phase: DEFAULT_PHASE, priority: 'normal' }
}

function cleanSentence(s: string): string {
  return s.replace(/\s+/g, ' ').trim().replace(/\.+$/, '').trim()
}

function splitSentences(text: string): string[] {
  if (!text) return []
  // Split on sentence boundaries, keep ones that read like real directives
  // ("agent X does Y" style).
  return text
    .split(/(?<=[.?!])\s+(?=[A-Z])/)
    .map(cleanSentence)
    .filter(s => s.length >= 20 && s.length <= 400)
}

/**
 * Turn an idea's `agentic_architecture` + fallback fields into an ordered task
 * plan. Caps at `maxTasks` so Jarvis never gets 30 sub-sessions from one click.
 */
export function parseArchitectureToTasks(args: {
  agenticArchitecture?: string | null
  mvpScope?: string | null
  targetAudience?: string | null
  fallbackName: string
  maxTasks?: number
}): ProposedTask[] {
  const max = Math.max(2, Math.min(8, args.maxTasks ?? 5))

  // Primary source: the agentic architecture block — it's structured as
  // "X agent does Y. Z agent handles W." etc. Perfect for sentence split.
  const primary = splitSentences(args.agenticArchitecture ?? '')

  // Secondary: MVP scope is usually a comma-separated feature list
  const scopeItems = (args.mvpScope ?? '')
    .split(/[,;\u2022]|(?:\s-\s)/)
    .map(cleanSentence)
    .filter(s => s.length >= 8 && s.length <= 200)

  // Build from primary, fall back to scope items if we have fewer than max
  const taskTexts: string[] = []
  for (const s of primary) {
    if (taskTexts.length >= max) break
    taskTexts.push(s)
  }
  if (taskTexts.length < max) {
    for (const s of scopeItems) {
      if (taskTexts.length >= max) break
      if (!taskTexts.some(existing => existing.toLowerCase().includes(s.toLowerCase()))) {
        taskTexts.push(`Build MVP scope item: ${s}`)
      }
    }
  }

  // Always include a GTM/intro task if we have a target audience
  if (args.targetAudience && taskTexts.length < max) {
    taskTexts.push(`Draft launch positioning for target audience: ${args.targetAudience}`)
  }

  // If we got NOTHING, synthesize a generic kickoff task
  if (taskTexts.length === 0) {
    taskTexts.push(`Scope the MVP for ${args.fallbackName} and propose a task breakdown`)
  }

  const tasks: ProposedTask[] = taskTexts.map((description, idx) => {
    const { agent, phase, priority } = routeSentence(description)
    return {
      description,
      agent,
      phase,
      // First task always high priority to kick things off
      priority: idx === 0 ? 'high' : priority,
    }
  })

  return tasks
}

/**
 * Render Jarvis's oversight brief — the summary he receives AFTER our
 * auto-dispatch, so he can review and reassign if he disagrees with any
 * routing call.
 */
export function buildJarvisOversightPrompt(args: {
  projectName: string
  projectId: string
  forgeIdeaId: string
  tasks: ProposedTask[]
}): string {
  const taskLines = args.tasks
    .map((t, i) => `  ${i + 1}. [${t.agent}] (${t.phase}) ${t.description}`)
    .join('\n')
  return [
    `New project "${args.projectName}" (id: ${args.projectId}) just kicked off from Forge (source idea: ${args.forgeIdeaId}).`,
    ``,
    `I have already dispatched ${args.tasks.length} initial tasks based on the idea's agentic architecture — here's the assignment plan:`,
    taskLines,
    ``,
    `Your role as CEO/Chief of Staff:`,
    `  1. Review each auto-assignment. If a task would be better handled by a different specialist, reassign it (use sessions_send to the correct agent and update the task row in Supabase).`,
    `  2. Monitor the spawned sub-sessions for the next hour — if any stall or error, escalate or re-route.`,
    `  3. Report back a one-paragraph summary of the delegation plan and any changes you made.`,
    ``,
    `Do not do the task work yourself — only oversight + course-correction.`,
  ].join('\n')
}
