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
        <div className="size-24 md:size-32 rounded-full bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-3xl md:text-5xl font-bold shadow-lg shadow-primary/20 shrink-0 border-4 border-white">
          {initials}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
           <div className="flex flex-wrap gap-2 justify-center md:justify-start">
             <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-3 py-1 shadow-none"><Shield className="size-3.5 mr-1.5"/> {(profile.role || 'Staff').toUpperCase()}</Badge>
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
            <CardTitle className="text-xl flex items-center gap-2"><User className="size-5 text-primary" /> Personal Details</CardTitle>
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
              <Button type="submit" disabled={savingSettings} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:-translate-y-0.5 transition-transform mt-2">
                {savingSettings ? 'Saving...' : 'Save Details'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-primary"><Shield className="size-5" /> Staff Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
              <p className="font-semibold text-slate-800">Quick Tools Support</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">You have full staff access to oversee Book Catalog records, physical Borrow/Return processes, and enforce student limits seamlessly.</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
              <p className="font-semibold text-slate-800">Theme Synchronization</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Your dashboard dynamically adjusts to your chosen Accent Theme. For account security and password changes, please head to the centralized Application Settings tab.</p>                 
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
