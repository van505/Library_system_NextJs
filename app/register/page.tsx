'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { BookOpen, Sparkles, ChevronLeft, ArrowRight } from 'lucide-react'

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
        toast.error('Profile setup had a minor issue; please update it from your dashboard.')
      } else {
        toast.success('Account created! Please sign in.')
      }

      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex text-slate-900 bg-[#f8fafc] font-sans selection:bg-indigo-500/30">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:px-24 relative z-10 py-12 overflow-y-auto">

        {/* Subtle Background Effects */}
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-purple-400/10 blur-[100px] rounded-[100%] pointer-events-none -z-10" />

        <div className="mx-auto w-full max-w-[400px]">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 mb-8 transition-colors group">
            <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
          </Link>

          <Link href="/" className="flex items-center gap-2 mb-8 group w-fit">
            <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="size-5 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">SchoolLib</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Create an account</h1>
            <p className="text-slate-500 text-sm">Join the platform to start borrowing books and using the AI.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="font-semibold text-slate-700">Full Name</Label>
              <Input id="fullName" required className="h-11 rounded-xl bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentId" className="font-semibold text-slate-700">Student ID <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input id="studentId" className="h-11 rounded-xl bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm" value={studentId} onChange={e => setStudentId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradeLevel" className="font-semibold text-slate-700">Grade Level <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input id="gradeLevel" placeholder="e.g. 10th" className="h-11 rounded-xl bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm" value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="email" className="font-semibold text-slate-700">Email address</Label>
              <Input id="email" type="email" required className="h-11 rounded-xl bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-slate-700">Password</Label>
              <Input id="password" type="password" required minLength={6} className="h-11 rounded-xl bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-base font-bold shadow-lg transition-all mt-6 group" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative Premium Panel */}
      <div className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(to right, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 w-full max-w-lg text-center">
          <Card className="bg-white/10 backdrop-blur-xl border-white/10 text-white rounded-[2rem] p-10 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <BookOpen className="size-16 text-indigo-300 mx-auto mb-6" />
            <h2 className="text-4xl font-black mb-4 leading-tight">Join SchoolLib<br />Today.</h2>
            <p className="text-indigo-100/80 text-lg leading-relaxed mb-6">
              Empower your learning journey. Borrow books, organize your reading lists, and utilize our next-gen AI librarian to find the exact resources you need.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
