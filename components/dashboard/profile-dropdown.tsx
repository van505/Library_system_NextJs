'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { User, Settings, LogOut, ChevronDown, Shield, GraduationCap } from 'lucide-react'

type Profile = {
  id: string
  full_name?: string | null
  role?: string | null
  avatar_url?: string | null
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  staff: 'bg-amber-100 text-amber-700',
  student: 'bg-indigo-100 text-indigo-700',
}

const roleIcons: Record<string, React.ElementType> = {
  admin: Shield,
  staff: User,
  student: GraduationCap,
}

export default function ProfileDropdown({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  const role = profile?.role ?? 'student'
  const name = profile?.full_name ?? 'User'
  const initial = name.charAt(0).toUpperCase()
  const profileHref = `/dashboard/${role}/profile`
  const RoleIcon = roleIcons[role] ?? User

  async function handleSignOut() {
    await supabase.auth.signOut()
    useAuthStore.getState().setProfile(null)
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200 shadow-sm overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={name} className="size-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-indigo-700">{initial}</span>
            )}
          </div>
          <ChevronDown className="size-3.5 text-slate-400 group-hover:text-slate-600 transition-colors hidden md:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border border-slate-200 p-1">
        {/* Header */}
        <DropdownMenuLabel className="px-3 py-2">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 ${roleColors[role] ?? 'bg-slate-100 text-slate-600'}`}>
            <RoleIcon className="size-2.5" />
            {role}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* My Profile */}
        <DropdownMenuItem
          className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer"
          onClick={() => router.push(profileHref)}
        >
          <User className="size-4 text-slate-500" />
          <span>My Profile</span>
        </DropdownMenuItem>

        {/* Settings */}
        <DropdownMenuItem
          className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer"
          onClick={() => router.push('/dashboard/settings')}
        >
          <Settings className="size-4 text-slate-500" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
