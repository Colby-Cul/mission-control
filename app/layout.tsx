import type { Metadata } from 'next'
import './globals.css'
import { Shell } from './shell/Shell'

export const metadata: Metadata = {
  title: 'Mission Control v7',
  description: 'CEO command center — Cabo Tropic / Culbertson / Xome Home et al.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
