'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { User, Mail, Shield, Phone, CalendarDays, Key } from 'lucide-react'
import { format } from 'date-fns'

export default function StaffProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [savingSettings, setSavingSettings] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  // Profile data
  const [profile, setProfile] = React.useState<any>(null)
  const [email, setEmail] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [contactNumber, setContactNumber] = React.useState('')

  // Password data
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

  async function loadProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setContactNumber(data.contact_number || '')
      }
    }
    setLoading(false)
  }

  React.useEffect(() => { loadProfile() }, [supabase])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSavingSettings(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, contact_number: contactNumber }).eq('id', profile.id)
    setSavingSettings(false)
    if (error) toast.error('Failed to update profile')
    else toast.success('Profile updated successfully')
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    
    if (error) toast.error(error.message)
    else {
      toast.success('Password updated successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }
  }

  if (loading) return <div className="p-6"><Skeleton className="h-[400px] max-w-4xl mx-auto rounded-2xl" /></div>
  if (!profile) return <div className="p-6 text-center text-slate-500">Could not load profile.</div>

  const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="size-24 md:size-32 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-3xl md:text-5xl font-bold shadow-lg shadow-indigo-200 shrink-0 border-4 border-white">
          {initials}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
           <div className="flex flex-wrap gap-2 justify-center md:justify-start">
             <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200 px-3 py-1 shadow-none"><Shield className="size-3.5 mr-1.5"/> {(profile.role || 'Staff').toUpperCase()}</Badge>
             <Badge variant="outline" className="text-slate-600 px-3 py-1 bg-slate-50 border-slate-200"><Mail className="size-3.5 mr-1.5 text-slate-400"/> {email}</Badge>
           </div>
           <p className="text-sm text-slate-500 flex items-center justify-center md:justify-start pt-2">
             <CalendarDays className="size-4 mr-2" /> Member since {format(new Date(profile.created_at || new Date()), 'MMMM yyyy')}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><User className="size-5 text-indigo-600" /> Personal Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e=>setFullName(e.target.value)} required className="rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white transition-colors" />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={contactNumber} onChange={e=>setContactNumber(e.target.value)} placeholder="+1 234 567 890" className="rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white transition-colors" />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-slate-400 text-xs font-normal">(Read-only)</span></Label>
                <Input value={email} readOnly className="rounded-xl bg-slate-100 border-transparent text-slate-500 cursor-not-allowed" />
              </div>
              <Button type="submit" disabled={savingSettings} className="w-full rounded-xl bg-slate-900 text-white mt-2">
                {savingSettings ? 'Saving...' : 'Save Details'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Key className="size-5 text-indigo-600" /> Security</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={6} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white transition-colors" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={6} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white transition-colors" />
              </div>
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-4 bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-100">
                  You will be logged out of other devices after changing your password.
                </p>
                <Button type="submit" disabled={savingPassword} className="w-full rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm">
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
