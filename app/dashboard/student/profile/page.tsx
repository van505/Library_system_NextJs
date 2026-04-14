'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Save, Library, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function StudentProfilePage() {
  const { profile, setProfile } = useAuthStore()
  const supabase = createClient()
  const [form, setForm] = React.useState({ fullName: '', contactNumber: '', gradeLevel: '', studentId: '', avatarUrl: '' })
  const [saving, setSaving] = React.useState(false)
  const [passwordForm, setPasswordForm] = React.useState({ newPassword: '', confirmPassword: '' })
  const [stats, setStats] = React.useState({ totalBorrowed: 0, favoriteGenre: 'N/A' })

  React.useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name || '',
        contactNumber: profile.contact_number || '',
        gradeLevel: profile.grade_level || '',
        studentId: profile.student_id || '',
        avatarUrl: profile.avatar_url || ''
      })
      loadStats()
    }
  }, [profile])

  async function loadStats() {
    const { data } = await supabase.from('transactions').select('books(genre)').eq('borrower_id', profile!.id)
    if (data && data.length > 0) {
      const genres: Record<string, number> = {}
      data.forEach((tx: any) => {
        if (tx.books?.genre) genres[tx.books.genre] = (genres[tx.books.genre] || 0) + 1
      })
      let fav = 'N/A'
      let max = 0
      Object.keys(genres).forEach(g => {
        if (genres[g] > max) { max = genres[g]; fav = g }
      })
      setStats({ totalBorrowed: data.length, favoriteGenre: fav })
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase.from('profiles').update({
      full_name: form.fullName,
      contact_number: form.contactNumber,
      grade_level: form.gradeLevel,
      student_id: form.studentId || null,
      avatar_url: form.avatarUrl
    }).eq('id', profile!.id).select().single()

    if (error) toast.error(error.message)
    else {
      toast.success('Profile updated successfully')
      setProfile(data as any)
    }
    setSaving(false)
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
    if (error) toast.error(error.message)
    else {
      toast.success('Password updated successfully')
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    }
  }

  if (!profile) return null

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-600 mt-1">Manage your account and view reading stats</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden text-center p-8">
            <div className="size-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mx-auto mb-4 border border-indigo-200 shadow-sm overflow-hidden">
               {form.avatarUrl ? <img src={form.avatarUrl} className="size-full object-cover" /> :
               <User className="size-10" />}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
            <p className="text-sm text-slate-500 capitalize">{profile.role}</p>
            {profile.student_id && <p className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit mx-auto mt-3">{profile.student_id}</p>}
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><Library className="size-4" /> Reading Stats</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">Total Borrowed</span>
                <span className="font-bold text-slate-900">{stats.totalBorrowed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Favorite Genre</span>
                <span className="font-bold text-slate-900">{stats.favoriteGenre}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="col-span-2"><Label>Full Name *</Label><Input required value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} className="mt-1.5 rounded-xl border-slate-200" /></div>
                <div><Label>Contact Number</Label><Input value={form.contactNumber} onChange={e=>setForm({...form, contactNumber:e.target.value})} className="mt-1.5 rounded-xl border-slate-200" /></div>
                <div><Label>Grade Level</Label>
                  <select value={form.gradeLevel} onChange={e=>setForm({...form, gradeLevel:e.target.value})} className="w-full mt-1.5 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 bg-white">
                    <option value="">Select level...</option>
                    {['7','8','9','10','11','12'].map(lvl => <option key={lvl} value={`Grade ${lvl}`}>Grade {lvl}</option>)}
                  </select>
                </div>
                <div><Label>Student ID</Label><Input value={form.studentId} disabled={!!profile.student_id} onChange={e=>setForm({...form, studentId:e.target.value})} className="mt-1.5 rounded-xl border-slate-200 disabled:opacity-50" /></div>
                <div><Label>Avatar Image URL</Label><Input value={form.avatarUrl} onChange={e=>setForm({...form, avatarUrl:e.target.value})} className="mt-1.5 rounded-xl border-slate-200" /></div>
                <div className="col-span-2 text-right mt-2">
                  <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><Save className="size-4 mr-2" /> Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><Label>New Password</Label><Input type="password" required minLength={6} value={passwordForm.newPassword} onChange={e=>setPasswordForm({...passwordForm, newPassword:e.target.value})} className="mt-1.5 rounded-xl border-slate-200" /></div>
                <div><Label>Confirm Password</Label><Input type="password" required minLength={6} value={passwordForm.confirmPassword} onChange={e=>setPasswordForm({...passwordForm, confirmPassword:e.target.value})} className="mt-1.5 rounded-xl border-slate-200" /></div>
                <div className="col-span-2 text-right mt-2">
                  <Button type="submit" variant="outline" className="text-indigo-700 hover:bg-indigo-50 border-indigo-200 rounded-xl">Update Password</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
