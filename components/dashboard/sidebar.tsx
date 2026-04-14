'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Library, Users, ArrowLeftRight,
  Bot, Settings, Search, BookMarked, LogOut, Menu, X, GraduationCap,
  MessageSquare, Bell, User
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'

type NavItemConfig = { label: string; href: string; icon: React.ElementType }

const adminNav = {
  MAIN: [{ label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard }],
  LIBRARY: [
    { label: 'Books', href: '/dashboard/admin/books', icon: BookOpen },
    { label: 'Shelves', href: '/dashboard/admin/shelves', icon: Library },
    { label: 'Transactions', href: '/dashboard/admin/transactions', icon: ArrowLeftRight },
    { label: 'Requests', href: '/dashboard/admin/requests', icon: MessageSquare },
  ],
  MANAGE: [
    { label: 'Announcements', href: '/dashboard/admin/announcements', icon: Bell },
    { label: 'Staff Users', href: '/dashboard/admin/staff', icon: Users },
  ]
}

const staffNav = {
  MAIN: [{ label: 'Dashboard', href: '/dashboard/staff', icon: LayoutDashboard }],
  LIBRARY: [
    { label: 'Books', href: '/dashboard/admin/books', icon: BookOpen },
    { label: 'Transactions', href: '/dashboard/admin/transactions', icon: ArrowLeftRight },
    { label: 'Requests', href: '/dashboard/admin/requests', icon: MessageSquare },
  ]
}

const studentNav = {
  MAIN: [{ label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard }],
  LIBRARY: [
    { label: 'Browse Catalog', href: '/dashboard/student/browse', icon: Search },
    { label: 'My Borrowed', href: '/dashboard/student/borrowed', icon: BookMarked },
    { label: 'My Reviews', href: '/dashboard/student/reviews', icon: MessageSquare },
  ]
}

function getNavConfig(role: string) {
  if (role === 'admin') return adminNav
  if (role === 'staff') return staffNav
  return studentNav
}

function NavItem({ item, onClick }: { item: NavItemConfig, onClick?: () => void }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || (item.href !== '/dashboard/admin' && item.href !== '/dashboard/staff' && item.href !== '/dashboard/student' && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl text-sm font-medium transition-all group',
        isActive
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      )}
    >
      <div className={cn('w-1 h-4 rounded-full absolute left-0 transition-opacity', isActive ? 'bg-white opacity-100' : 'opacity-0')} />
      <item.icon className={cn('size-4 shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400')} />
      <span>{item.label}</span>
    </Link>
  )
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { profile } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const sections = getNavConfig(profile?.role ?? 'student')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    useAuthStore.getState().setProfile(null)
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 shrink-0 border-b border-slate-800">
        <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
          <BookOpen className="size-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-white tracking-tight leading-none">SchoolLib</p>
          <p className="text-[10px] text-slate-500 font-medium tracking-wide flex items-center gap-1 mt-0.5">
            <GraduationCap className="size-3 text-indigo-400" />
            LIBRARY SYSTEM
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-hide">
        {Object.entries(sections).map(([group, items]) => (
          <div key={group}>
            <p className="px-6 mb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">{group}</p>
            <div className="flex flex-col gap-1 relative">
              {items.map(item => <NavItem key={item.href} item={item} onClick={onNavClick} />)}
            </div>
          </div>
        ))}

        <div>
          <p className="px-6 mb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">TOOLS</p>
          <div className="flex flex-col gap-1 relative">
            <NavItem item={{ label: 'AI Chat', href: '/dashboard/chat', icon: Bot }} onClick={onNavClick} />
          </div>
        </div>
        
        {profile?.role === 'student' && (
          <div>
            <p className="px-6 mb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">ACCOUNT</p>
            <div className="flex flex-col gap-1 relative">
              <NavItem item={{ label: 'Profile', href: '/dashboard/student/profile', icon: User }} onClick={onNavClick} />
            </div>
          </div>
        )}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-2 rounded-xl transition-colors">
          <div className="size-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Avatar" className="size-full rounded-full object-cover" />
            ) : (
               <span className="text-xs font-bold text-indigo-300">{(profile?.full_name ?? 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{profile?.role ?? 'student'}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group" title="Sign Out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 shadow-xl z-20">
        <SidebarContent />
      </aside>

      {/* ── Mobile hamburger + Topbar shadow matching space ── */}
      <div className="lg:hidden fixed top-0 w-full h-16 bg-white border-b border-slate-200 z-30 flex items-center px-4">
        <button
          className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-200"
          onClick={() => setMobileOpen(true)} aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="ml-4 flex items-center gap-2">
          <BookOpen className="size-5 text-indigo-600" />
          <span className="font-bold text-slate-900">SchoolLib</span>
        </div>
      </div>

      {/* ── Mobile slide-over ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-72 max-w-[80%] flex-col bg-slate-900 shadow-2xl transition-transform ease-in-out duration-300">
            <button className="absolute -right-12 top-4 size-10 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md"
              onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="size-5" />
            </button>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
