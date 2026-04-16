import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getProfile } from '@/lib/supabase-server'
import { UserProvider } from '@/components/providers/user-provider'
import AdminSidebar from '@/components/dashboard/admin-sidebar'
import StaffSidebar from '@/components/dashboard/staff-sidebar'
import StudentSidebar from '@/components/dashboard/student-sidebar'
import ProfileDropdown from '@/components/dashboard/profile-dropdown'
import { Bell, Search, ChevronRight } from 'lucide-react'
import { NotificationsPanel } from '@/components/dashboard/notifications-panel'

// Dummy component to fetch unread requests if admin/staff
async function TopBarRight({ profile }: { profile: any }) {
  const isStaff = profile?.role === 'admin' || profile?.role === 'staff'
  let pendingBadge = 0

  if (isStaff) {
    const supabase = await createServerSupabaseClient()
    const { count } = await supabase.from('book_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    pendingBadge = count || 0
  }

  return (
    <div className="flex items-center gap-4 ml-auto">
      <div className="relative hidden md:flex items-center w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Global search..." 
          className="w-full h-9 pl-9 pr-4 rounded-full bg-slate-100 border-none text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm inset-shadow-sm" 
        />
      </div>
      <NotificationsPanel />
      <ProfileDropdown profile={profile} />
    </div>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getProfile(supabase, user.id)

  return (
    <UserProvider profile={profile}>
      <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
        {profile?.role === 'admin' ? (
          <AdminSidebar profile={profile} />
        ) : profile?.role === 'staff' ? (
          <StaffSidebar profile={profile} />
        ) : (
          <StudentSidebar profile={profile} />
        )}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Top Bar */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 shrink-0 lg:flex hidden z-10 sticky top-0 shadow-sm">
            <div className="flex items-center text-sm font-medium text-slate-400 gap-2">
               <span className="hover:text-slate-600 cursor-pointer transition-colors">SchoolLib</span>
               <ChevronRight className="size-4 shrink-0" />
               <span className="text-slate-900 capitalize tracking-wide">{profile?.role ?? 'Student'} Dashboard</span>
            </div>
            <TopBarRight profile={profile} />
          </header>

          <div className="lg:hidden h-16 shrink-0" /> {/* Mobile header spacer */}
          
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
