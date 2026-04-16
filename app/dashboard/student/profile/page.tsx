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
      const { data: tx } = await supabase.from('transactions').select('status, books(category_id, categories(name))').eq('borrower_id', user.id)
      if (tx) {
        const returnedTxs = tx.filter(t => t.status === 'returned')
        setTotalBorrowed(returnedTxs.length)
        const genreCounts: Record<string, number> = {}
        returnedTxs.forEach(t => {
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
             <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-3 py-1 shadow-none tracking-wide"><Shield className="size-3.5 mr-1.5"/> STUDENT</Badge>
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
            <CardTitle className="text-xl flex items-center gap-2"><User className="size-5 text-primary" /> Personal Details</CardTitle>
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
              <Button type="submit" disabled={savingSettings} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground mt-2 shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5">
                {savingSettings ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm bg-gradient-to-br from-primary/5 to-white">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-primary"><BookOpen className="size-5 text-primary" /> Reading Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <BookOpen className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Books Read</p>
                <p className="text-2xl font-black text-slate-900">{totalBorrowed}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Star className="size-6 fill-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Favorite Genre</p>
                <p className="text-xl font-bold text-slate-900">{favoriteGenre}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="size-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <CalendarDays className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Member Since</p>
                <p className="text-lg font-bold text-slate-900">{profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'Recently'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
