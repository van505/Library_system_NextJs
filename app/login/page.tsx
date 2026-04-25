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
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { BookOpen, Sparkles, ChevronLeft, ArrowRight } from 'lucide-react'


export default function LoginPage() {

  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Fetch profile to determine role-based redirect
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()



      if (profileError || !profile) {
        toast.success('Welcome!')
        window.location.href = '/dashboard'
        return
      }

      useAuthStore.getState().setProfile({ ...profile, id: data.user.id } as any)
      toast.success('Welcome back!')


      if (profile.role === 'admin') {
        router.push('/dashboard/admin')
      } else if (profile.role === 'staff') {
        router.push('/dashboard/staff')
      } else {
        router.push('/dashboard/student')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex text-slate-900 bg-[#f8fafc] font-sans selection:bg-indigo-500/30">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:px-24 relative z-10">

        {/* Subtle Background Effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 blur-[100px] rounded-[100%] pointer-events-none -z-10" />

        <div className="mx-auto w-full max-w-[380px]">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 mb-8 transition-colors group">
            <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
          </Link>

          <Link href="/" className="flex items-center gap-2 mb-10 group w-fit">
            <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="size-5 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">SchoolLib</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Welcome back</h1>
            <p className="text-slate-500 text-sm">Enter your credentials to securely access your account.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-slate-700">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.edu"
                required
                className="h-12 rounded-xl bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-semibold text-slate-700">Password</Label>
                <Link href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                className="h-12 rounded-xl bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-base font-bold shadow-lg transition-all mt-4 group" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign in to account'}
              {!loading && <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            Don't have an account?{' '}
            <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              Register as student
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative Premium Panel */}
      <div className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-fuchsia-600/20 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(to right, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 w-full max-w-lg">
          <Card className="bg-white/10 backdrop-blur-xl border-white/10 text-white rounded-[2rem] p-10 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" />
            <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 mb-8 shadow-inner">
              <Sparkles className="size-6 text-indigo-300" />
            </div>
            <h2 className="text-4xl font-black mb-4 leading-tight">Your digital <br />library pass.</h2>
            <p className="text-indigo-100/80 text-lg leading-relaxed mb-10">Access thousands of books, track your reading history, and ask our AI assistant for highly personalized recommendations.</p>

            <div className="flex items-center gap-4 text-sm font-medium text-white/80 bg-white/5 rounded-2xl p-4 border border-white/10 w-fit backdrop-blur-md">
              <div className="flex -space-x-3">
                {[
                  'https://i.pravatar.cc/100?img=1',
                  'https://i.pravatar.cc/100?img=2',
                  'https://i.pravatar.cc/100?img=3'
                ].map((img, i) => (
                  <img key={i} src={img} alt="User avatar" className="size-10 rounded-full border-2 border-slate-900 shadow-md" />
                ))}
              </div>
              <p>Join <strong className="text-white">2,000+</strong> students today.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
