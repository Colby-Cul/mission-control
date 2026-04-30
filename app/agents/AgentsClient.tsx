'use client'
import { useState } from 'react'
import AskAgentModal from '../_components/AskAgentModal'

interface AgentsClientProps {
  agentId: string
  agentName: string
}

export default function AgentsClient({ agentId, agentName }: AgentsClientProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          padding: '8px 0',
          borderRadius: 10,
          border: '1px solid rgba(59,130,246,0.3)',
          background: 'rgba(59,130,246,0.08)',
          color: 'var(--accent)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.18)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.6)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.08)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.3)'
        }}
      >
        ⚡ Invoke
      </button>
      <AskAgentModal
        open={open}
        onClose={() => setOpen(false)}
        contextType="agent"
        contextId={agentId}
        contextLabel={agentName}
      />
    </>
  )
}
