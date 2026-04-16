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
import { Settings, Moon, Sun, Monitor, Bell, Lock, BookOpen, Shield } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
  localStorage.setItem('theme', theme)
}

function applyAccent(accent: string) {
  const root = document.documentElement
  root.classList.remove('theme-rose', 'theme-emerald', 'theme-ocean') // 'indigo' is default (no class)
  if (accent !== 'indigo') root.classList.add(`theme-${accent}`)
  localStorage.setItem('accent-theme', accent)
}

export default function SettingsPage() {
  const supabase = createClient()
  const { profile } = useAuthStore()
  const role = profile?.role ?? 'student'

  const [activeTab, setActiveTab] = React.useState<'general' | 'security' | 'preferences'>('general')

  // ── Appearance ──────────────────────────────────────────────────────────
  const [theme, setTheme] = React.useState<Theme>('light')
  const [accent, setAccent] = React.useState('indigo')

  React.useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') ?? 'light') as Theme
    setTheme(savedTheme)
    applyTheme(savedTheme)

    const savedAccent = localStorage.getItem('accent-theme') ?? 'indigo'
    setAccent(savedAccent)
    applyAccent(savedAccent)
  }, [])

  function handleThemeChange(t: Theme) { setTheme(t); applyTheme(t) }
  function handleAccentChange(a: string) { setAccent(a); applyAccent(a) }

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
  const [currentPassword, setCurrentPassword] = React.useState('')
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
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } else toast.error(error.message)
    setChangingPw(false)
  }

  const themeOptions: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'security' as const, label: 'Security', icon: Shield },
    ...(role === 'student' ? [{ id: 'preferences' as const, label: 'Preferences', icon: BookOpen }] : []),
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Settings className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm">Manage your preferences and account.</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── General Tab ── */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Appearance */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Moon className="size-4 text-slate-600" /> Appearance</CardTitle>
              <CardDescription>Choose how the app looks. Theme applies across the full interface.</CardDescription>
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
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${active ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-primary/30 hover:bg-slate-50 text-slate-600'}`}>
                        <Icon className={`size-5 ${active ? 'text-primary' : 'text-slate-500'}`} />
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="pt-2">
                <Label className="text-sm font-medium text-slate-700 mb-3 block">Accent Color</Label>
                <div className="flex gap-3">
                  {[
                    { value: 'indigo', label: 'Indigo', color: 'bg-indigo-600' },
                    { value: 'rose', label: 'Rose', color: 'bg-rose-600' },
                    { value: 'emerald', label: 'Emerald', color: 'bg-emerald-600' },
                    { value: 'ocean', label: 'Ocean', color: 'bg-cyan-600' },
                  ].map(opt => {
                    const active = accent === opt.value
                    return (
                      <button key={opt.value} onClick={() => handleAccentChange(opt.value)} title={opt.label}
                        className={`size-8 rounded-full shadow-sm transition-all flex items-center justify-center border-2 ${active ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'} ${opt.color}`}>
                        {active && <div className="size-2 bg-white rounded-full" />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-4">
                <div><p className="text-sm font-medium text-slate-700">Language</p><p className="text-xs text-slate-500">Interface language</p></div>
                <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">English</span>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
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
              <Button onClick={saveNotifPrefs} disabled={savingNotif || !notifLoaded} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl mt-2 transition-transform hover:-translate-y-0.5">
                {savingNotif ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Security Tab ── */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Lock className="size-4 text-slate-600" /> Change Password</CardTitle>
              <CardDescription>Update your login password. Use a strong password of at least 8 characters.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="curr-pw">Current Password</Label>
                  <Input id="curr-pw" type="password" className="rounded-xl" placeholder="Your current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  <p className="text-xs text-slate-400">Note: Supabase handles re-authentication automatically on update.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw">New Password</Label>
                  <Input id="new-pw" type="password" className="rounded-xl" placeholder="Min. 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw">Confirm New Password</Label>
                  <Input id="confirm-pw" type="password" className="rounded-xl" placeholder="Re-enter new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={changingPw || !newPassword || !confirmPassword} className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 text-white">
                  {changingPw ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-100 shadow-sm bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-700"><Shield className="size-4" /> Active Session</CardTitle>
              <CardDescription>You are currently signed in on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Current Device</p>
                  <p className="text-xs text-slate-500 mt-0.5">Browser session — active now</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Preferences Tab (students only) ── */}
      {activeTab === 'preferences' && role === 'student' && (
        <div className="space-y-6">
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
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {days}d
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
