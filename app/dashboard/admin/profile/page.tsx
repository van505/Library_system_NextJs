'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { User, Mail, Phone, Lock, Shield, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Profile } from '@/lib/supabase'

export default function AdminProfilePage() {
  const supabase = createClient()
  const { profile, setProfile } = useAuthStore()
  const [email, setEmail] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [contactNumber, setContactNumber] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [changingPassword, setChangingPassword] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setEmail(user.email ?? '')
      if (profile) {
        setFullName(profile.full_name ?? '')
        setContactNumber(profile.contact_number ?? '')
      }
    }
    load()
  }, [profile, supabase])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, contact_number: contactNumber })
      .eq('id', profile.id)
      .select()
      .single()

    if (error) toast.error(error.message)
    else {
      setProfile(data as Profile)
      toast.success('Profile updated successfully!')
    }
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) toast.error(error.message)
    else {
      toast.success('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
    }
    setChangingPassword(false)
  }

  const initials = (profile?.full_name ?? 'A').charAt(0).toUpperCase()

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account settings and personal information.</p>
      </div>

      {/* Avatar & identity */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="size-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <span className="text-3xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{profile?.full_name ?? 'Administrator'}</h2>
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">
                <Shield className="size-3 mr-1" /> Admin
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Mail className="size-4" />{email}
            </div>
            {profile?.created_at && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="size-3.5" /> Member since {format(new Date(profile.created_at), 'MMMM d, yyyy')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><User className="size-4 text-indigo-600" /> Personal Information</CardTitle>
          <CardDescription>Update your display name and contact details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" className="rounded-xl" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number</Label>
                <Input id="contact" type="tel" className="rounded-xl" placeholder="+63 912 345 6789" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={email} disabled className="rounded-xl bg-slate-50 text-slate-400" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value="Administrator" disabled className="rounded-xl bg-slate-50 text-slate-400" />
              </div>
            </div>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Lock className="size-4 text-indigo-600" /> Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPass">New Password</Label>
                <Input id="newPass" type="password" className="rounded-xl" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPass">Confirm Password</Label>
                <Input id="confirmPass" type="password" className="rounded-xl" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <Button type="submit" variant="outline" className="rounded-xl border-slate-200" disabled={changingPassword || !newPassword}>
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
