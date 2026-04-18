import type { Metadata } from 'next'
import './globals.css'
import Sidebar from './_components/Sidebar'
import TopbarWrapper from './_components/TopbarWrapper'
import CommandPaletteGlobal from './_components/CommandPaletteGlobal'
import { CalmModeProvider } from './_components/CalmMode'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mission Control v7',
  description: 'CEO command center — Cabo Tropic / Culbertson / Xome Home et al.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          {/* 68px icon rail */}
          <Sidebar />

          {/* Main area: topbar + page content */}
          <div className="main">
            <TopbarWrapper />
            <div className="page">
              {children}
            </div>
          </div>
        </div>

        {/* Global ⌘K palette listener (outside .app so it's always present) */}
        <CommandPaletteGlobal />
        {/* Syncs body[data-calm="true"] from localStorage so CSS can freeze
            motion app-wide. Also respects prefers-reduced-motion at the CSS
            layer (see globals.css). */}
        <CalmModeProvider />
      </body>
    </html>
  )
}
