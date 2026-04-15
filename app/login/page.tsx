'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'

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

      // DEBUG: Remove after testing
      console.log('[login] user id:', data.user.id)
      console.log('[login] profile:', profile)
      console.log('[login] profileError:', profileError)

      if (profileError || !profile) {
        // No profile yet â€” let middleware handle /dashboard root
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
    <div className="min-h-screen flex text-slate-900 bg-white">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-10 group">
            <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <BookOpen className="size-5 text-indigo-600" />
            </div>
            <span className="font-bold text-xl tracking-tight">SchoolLib</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
            <p className="text-slate-500">Enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@school.edu" required className="h-11 rounded-xl bg-slate-50 border-slate-200" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required className="h-11 rounded-xl bg-slate-50 border-slate-200" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-base shadow-lg shadow-indigo-600/20 mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in to account'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Register as student
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900" />
        <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <Card className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 text-white rounded-3xl p-8 shadow-2xl">
          <BookOpen className="size-10 text-indigo-300 mb-6" />
          <h2 className="text-3xl font-bold mb-4">Your digital library pass.</h2>
          <p className="text-indigo-100 text-lg leading-relaxed mb-8">Access thousands of books, track your reading history, and ask our AI assistant for recommendations.</p>
          <div className="flex items-center gap-4 text-sm text-indigo-200">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => <div key={i} className="size-8 rounded-full bg-indigo-500 border-2 border-indigo-900" />)}
            </div>
            <p>Join 2,000+ students today.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
