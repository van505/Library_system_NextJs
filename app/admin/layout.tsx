import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Manage books, shelves, and library inventory.',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
