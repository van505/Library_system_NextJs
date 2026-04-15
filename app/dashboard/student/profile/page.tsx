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
import { User, Mail, Shield, Phone, CalendarDays, Key, BookOpen, Star, Hash, GraduationCap } from 'lucide-react'
import { format } from 'date-fns'

export default function StudentProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [savingSettings, setSavingSettings] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  // Profile data
  const [profile, setProfile] = React.useState<any>(null)
  const [email, setEmail] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [studentId, setStudentId] = React.useState('')
  const [gradeLevel, setGradeLevel] = React.useState('')
  const [contactNumber, setContactNumber] = React.useState('')

  // Stats
  const [totalBorrowed, setTotalBorrowed] = React.useState(0)
  const [favoriteGenre, setFavoriteGenre] = React.useState('None yet')

  // Password data
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
        setStudentId(data.student_id || '')
        setGradeLevel(data.grade_level || '')
        setContactNumber(data.contact_number || '')
      }

      // Load Stats
      const { data: tx } = await supabase.from('transactions').select('books(category_id, categories(name))').eq('borrower_id', user.id)
      if (tx) {
        setTotalBorrowed(tx.length)
        const genreCounts: Record<string, number> = {}
        tx.forEach(t => {
          const g = ((t.books as any)?.categories as any)?.name
          if (g) genreCounts[g] = (genreCounts[g] || 0) + 1
        })
        const match = Object.entries(genreCounts).sort((a,b) => b[1] - a[1])[0]
        if (match) setFavoriteGenre(match[0])
      }
    }
    setLoading(false)
  }

  React.useEffect(() => { loadProfile() }, [supabase])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSavingSettings(true)
    const { error } = await supabase.from('profiles').update({ 
      full_name: fullName, 
      contact_number: contactNumber,
      student_id: studentId,
      grade_level: gradeLevel
    }).eq('id', profile.id)
    
    setSavingSettings(false)
    if (error) toast.error(error.message)
    else { toast.success('Profile updated successfully'); loadProfile() }
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
      setNewPassword(''); setConfirmPassword('')
    }
  }

  if (loading) return <div className="p-6"><Skeleton className="h-[400px] max-w-4xl mx-auto rounded-2xl" /></div>
  if (!profile) return <div className="p-6 text-center text-slate-500">Could not load profile.</div>

  const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="size-24 md:size-32 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-3xl md:text-5xl font-bold shadow-lg shadow-emerald-200 shrink-0 border-4 border-white">
          {initials}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
           <div className="flex flex-wrap gap-2 justify-center md:justify-start">
             <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 px-3 py-1 shadow-none tracking-wide"><Shield className="size-3.5 mr-1.5"/> STUDENT</Badge>
             {profile.student_id && <Badge variant="outline" className="text-slate-600 px-3 py-1 bg-slate-50 border-slate-200"><Hash className="size-3.5 mr-1 text-slate-400"/> ID: {profile.student_id}</Badge>}
           </div>
           
           <div className="flex items-center justify-center md:justify-start gap-6 mt-6 pt-4 border-t border-slate-100">
             <div>
               <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Borrowed</p>
               <p className="text-2xl font-bold text-slate-900 flex items-center gap-2"><BookOpen className="size-5 text-emerald-500"/> {totalBorrowed}</p>
             </div>
             <div className="w-px h-10 bg-slate-200"></div>
             <div>
               <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Favorite Genre</p>
               <p className="text-xl font-bold text-slate-900 flex items-center gap-2 pr-2"><Star className="size-5 text-amber-400 fill-amber-400"/> {favoriteGenre}</p>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><User className="size-5 text-emerald-600" /> Personal Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e=>setFullName(e.target.value)} required className="rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Student ID</Label>
                    {/* Readonly if it's already set nicely, else editable */}
                    <Input value={studentId} onChange={e=>setStudentId(e.target.value)} disabled={!!profile.student_id} className={`rounded-xl bg-slate-50 border-slate-200 transition-colors ${profile.student_id ? 'text-slate-500 cursor-not-allowed opacity-70' : 'focus-visible:bg-white'}`} />
                  </div>
                  <div className="space-y-2">
                    <Label>Grade Level</Label>
                    <Input value={gradeLevel} onChange={e=>setGradeLevel(e.target.value)} placeholder="e.g. 10th Grade" className="rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white transition-colors" />
                  </div>
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={contactNumber} onChange={e=>setContactNumber(e.target.value)} placeholder="Parent or personal number" className="rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white transition-colors" />
              </div>
              <div className="space-y-2">
                <Label>School Email <span className="text-slate-400 text-xs font-normal">(Read-only)</span></Label>
                <Input value={email} readOnly className="rounded-xl bg-slate-100 border-transparent text-slate-500 cursor-not-allowed" />
              </div>
              <Button type="submit" disabled={savingSettings} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white mt-2 shadow-sm shadow-emerald-200">
                {savingSettings ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Key className="size-5 text-emerald-600" /> Security</CardTitle>
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
                <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  You will be logged out of other devices after changing your password. Keep your password safe and don't share it with other students.
                </p>
                <Button type="submit" disabled={savingPassword} className="w-full rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 shadow-sm">
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
