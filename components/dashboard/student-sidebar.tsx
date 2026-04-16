'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Search, BookMarked,
  Bot, LogOut, Menu, X, GraduationCap,
  MessageSquare, User, ClipboardList
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'

type NavItemConfig = { label: string; href: string; icon: React.ElementType }

const studentNav: Record<string, NavItemConfig[]> = {
  MAIN: [{ label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard }],
  LIBRARY: [
    { label: 'Browse Books', href: '/dashboard/student/browse', icon: Search },
    { label: 'My Borrowed Books', href: '/dashboard/student/borrowed', icon: BookMarked },
    { label: 'Request a Book', href: '/dashboard/student/requests', icon: ClipboardList },
    { label: 'My Reviews', href: '/dashboard/student/reviews', icon: MessageSquare },
  ],
  TOOLS: [
    { label: 'AI Chat', href: '/dashboard/chat', icon: Bot },
  ],
  ACCOUNT: [
    { label: 'Profile', href: '/dashboard/student/profile', icon: User },
  ],
}

function NavItem({ item, onClick }: { item: NavItemConfig, onClick?: () => void }) {
  const pathname = usePathname()
  const exactRoutes = ['/dashboard/admin', '/dashboard/staff', '/dashboard/student']
  const isActive = exactRoutes.includes(item.href)
    ? pathname === item.href
    : pathname.startsWith(item.href)

  return (
    <Link prefetch={true} href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl text-sm font-medium transition-all group relative',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      )}
    >
      <item.icon className={cn('size-4 shrink-0 transition-colors', isActive ? 'text-primary-foreground' : 'text-slate-500 group-hover:text-primary')} />
      <span>{item.label}</span>
    </Link>
  )
}

function SidebarContent({ profile, onNavClick }: { profile: any, onNavClick?: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const sections = studentNav

  const handleLogout = async () => {
    await supabase.auth.signOut()
    useAuthStore.getState().setProfile(null)
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300">
      <div className="flex items-center gap-3 px-6 h-16 shrink-0 border-b border-slate-800">
        <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20 transition-colors">
          <BookOpen className="size-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-bold text-white tracking-tight leading-none">SchoolLib</p>
          <p className="text-[10px] text-slate-500 font-medium tracking-wide flex items-center gap-1 mt-0.5">
            <GraduationCap className="size-3 text-primary" />
            STUDENT PANEL
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-5 scrollbar-hide">
        {Object.entries(sections).map(([group, items]) => (
          <div key={group}>
            <p className="px-6 mb-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">{group}</p>
            <div className="flex flex-col gap-0.5 relative">
              {items.map(item => <NavItem key={item.href} item={item} onClick={onNavClick} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-2 rounded-xl transition-colors">
          <div className="size-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="size-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold uppercase">{(profile?.full_name ?? 'S').charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{profile?.full_name ?? 'Student'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{profile?.role ?? 'student'}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Sign Out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentSidebar({ profile }: { profile: any }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 shadow-xl z-20">
        <SidebarContent profile={profile} />
      </aside>

      <div className="lg:hidden fixed top-0 w-full h-16 bg-white border-b border-slate-200 z-30 flex items-center px-4">
        <button
          className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-200"
          onClick={() => setMobileOpen(true)} aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="ml-4 flex items-center gap-2">
           <BookOpen className="size-5 text-primary" />
           <span className="font-bold text-slate-900">SchoolLib</span>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-72 max-w-[80%] flex-col bg-slate-900 shadow-2xl">
            <button className="absolute -right-12 top-4 size-10 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md"
              onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="size-5" />
            </button>
            <SidebarContent profile={profile} onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
