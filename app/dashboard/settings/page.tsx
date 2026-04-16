'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { Settings, Moon, Sun, Monitor, Bell, Lock, User, BookOpen } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
  localStorage.setItem('theme', theme)
}

export default function SettingsPage() {
  const supabase = createClient()
  const { profile } = useAuthStore()
  const role = profile?.role ?? 'student'

  // ── Appearance ──────────────────────────────────────────────────────────
  const [theme, setTheme] = React.useState<Theme>('light')

  React.useEffect(() => {
    const saved = (localStorage.getItem('theme') ?? 'light') as Theme
    setTheme(saved)
    applyTheme(saved)
  }, [])

  function handleThemeChange(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  // ── Notification Preferences ───────────────────────────────────────────
  const [notifEmail, setNotifEmail] = React.useState(true)
  const [notifReminders, setNotifReminders] = React.useState(true)
  const [notifOverdue, setNotifOverdue] = React.useState(true)
  const [savingNotif, setSavingNotif] = React.useState(false)
  const [notifLoaded, setNotifLoaded] = React.useState(false)

  React.useEffect(() => {
    async function loadPrefs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('notif_email, notif_reminders, notif_overdue').eq('id', user.id).single()
      if (data) {
        setNotifEmail(data.notif_email ?? true)
        setNotifReminders(data.notif_reminders ?? true)
        setNotifOverdue(data.notif_overdue ?? true)
      }
      setNotifLoaded(true)
    }
    loadPrefs()
  }, [supabase])

  async function saveNotifPrefs() {
    setSavingNotif(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSavingNotif(false); return }
    const { error } = await supabase.from('profiles').update({ notif_email: notifEmail, notif_reminders: notifReminders, notif_overdue: notifOverdue }).eq('id', user.id)
    if (!error) toast.success('Notification preferences saved!')
    else toast.error(error.message)
    setSavingNotif(false)
  }

  // ── Change Password ────────────────────────────────────────────────────
  const [oldPassword, setOldPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [changingPw, setChangingPw] = React.useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match.'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    setChangingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) {
      toast.success('Password changed successfully!')
      setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    } else toast.error(error.message)
    setChangingPw(false)
  }

  // ── Delete Account (students only) ─────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = React.useState('')
  const [deletingAccount, setDeletingAccount] = React.useState(false)

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm.'); return }
    setDeletingAccount(true)
    // Supabase doesn't allow clients to delete their own auth user by default —
    // this requires a server action or admin client. We show a toast instructing
    // them to contact admin, or implement via API route.
    toast.error('Account deletion requires admin assistance. Please contact your library administrator.')
    setDeletingAccount(false)
  }

  const themeOptions: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
          <Settings className="size-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm">Manage your preferences and account.</p>
        </div>
      </div>

      {/* ── Appearance ── */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Moon className="size-4 text-slate-600" /> Appearance</CardTitle>
          <CardDescription>Choose how SchoolLib looks to you. Theme is applied across the full interface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-3 block">Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(opt => {
                const Icon = opt.icon
                const active = theme === opt.value
                return (
                  <button key={opt.value} onClick={() => handleThemeChange(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'}`}>
                    <Icon className={`size-5 ${active ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <div><p className="text-sm font-medium text-slate-700">Language</p><p className="text-xs text-slate-500">Interface language</p></div>
            <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">English</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Notification Preferences ── */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4 text-slate-600" /> Notification Preferences</CardTitle>
          <CardDescription>Control which notifications you receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email', value: notifEmail, set: setNotifEmail },
            { key: 'reminders', label: 'Borrow Reminders', desc: 'Get reminded before your book is due', value: notifReminders, set: setNotifReminders },
            { key: 'overdue', label: 'Overdue Alerts', desc: 'Be notified when a book is overdue', value: notifOverdue, set: setNotifOverdue },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div><p className="text-sm font-medium text-slate-800">{item.label}</p><p className="text-xs text-slate-500">{item.desc}</p></div>
              <Switch checked={notifLoaded ? item.value : true} onCheckedChange={item.set} disabled={!notifLoaded} />
            </div>
          ))}
          <Button onClick={saveNotifPrefs} disabled={savingNotif || !notifLoaded} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-2">
            {savingNotif ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Account ── */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Lock className="size-4 text-slate-600" /> Change Password</CardTitle>
          <CardDescription>Update your login password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New Password</Label>
              <Input id="new-pw" type="password" className="rounded-xl" placeholder="Min. 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <Input id="confirm-pw" type="password" className="rounded-xl" placeholder="Re-enter new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={changingPw || !newPassword || !confirmPassword} className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 text-white mt-1">
              {changingPw ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Library Preferences (students only) ── */}
      {role === 'student' && (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-slate-600" /> Library Preferences</CardTitle>
            <CardDescription>Customize your borrowing experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div><p className="text-sm font-medium text-slate-800">Default Borrow Duration</p><p className="text-xs text-slate-500">Your preferred loan period when requesting books</p></div>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                {[7, 14].map(days => {
                  const saved = typeof window !== 'undefined' ? (localStorage.getItem('defaultBorrowDays') ?? '14') : '14'
                  const active = saved === String(days)
                  return (
                    <button key={days} onClick={() => { localStorage.setItem('defaultBorrowDays', String(days)); toast.success(`Default set to ${days} days.`) }}
                      className={`px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {days}d
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Danger Zone (students only) ── */}
      {role === 'student' && (
        <Card className="rounded-2xl border-red-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-red-600"><User className="size-4" /> Danger Zone</CardTitle>
            <CardDescription>Irreversible actions that affect your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm" className="text-sm text-slate-700">Type <strong>DELETE</strong> to confirm account deletion</Label>
              <Input id="delete-confirm" className="rounded-xl border-red-200 focus:ring-red-400" placeholder="DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            </div>
            <Button onClick={handleDeleteAccount} disabled={deletingAccount || deleteConfirm !== 'DELETE'} variant="outline" className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50">
              {deletingAccount ? 'Processing...' : 'Delete My Account'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
