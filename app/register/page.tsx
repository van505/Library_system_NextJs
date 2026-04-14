'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { BookOpen } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    // 1. Sign up with Supabase Auth, passing metadata for the trigger
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'student',
        },
      },
    })

    if (authError) {
      toast.error(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      // 2. Explicitly insert row into profiles (trigger is a backup)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: fullName,
        role: 'student',
        student_id: studentId || null,
        grade_level: gradeLevel || null,
        is_active: true,
      })

      if (profileError) {
        // Trigger will handle it — just warn, still redirect
        toast.error('Profile setup had a minor issue; please update it from your dashboard.')
      } else {
        toast.success('Account created! Please sign in.')
      }

      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex text-slate-900 bg-white">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-10 group">
            <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <BookOpen className="size-5 text-indigo-600" />
            </div>
            <span className="font-bold text-xl tracking-tight">SchoolLib</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Create an account</h1>
            <p className="text-slate-500">Sign up to start borrowing books.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" required className="h-11 rounded-xl bg-slate-50" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Input id="studentId" className="h-11 rounded-xl bg-slate-50" value={studentId} onChange={e => setStudentId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Input id="gradeLevel" placeholder="e.g. Grade 10, Year 2..." className="h-11 rounded-xl bg-slate-50" value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" required className="h-11 rounded-xl bg-slate-50" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} className="h-11 rounded-xl bg-slate-50" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-4" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900" />
        <div className="relative z-10 text-white max-w-xs text-center">
          <BookOpen className="size-16 text-indigo-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3">Join SchoolLib</h2>
          <p className="text-indigo-200">Access the school library catalog, track your borrowed books, and chat with our AI librarian.</p>
        </div>
      </div>
    </div>
  )
}
