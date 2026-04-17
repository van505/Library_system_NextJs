'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { BookOpen, ChevronLeft, KeyRound, MailCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-900 bg-[#f8fafc] font-sans selection:bg-indigo-500/30 p-4 relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-400/20 via-purple-400/10 to-fuchsia-400/20 blur-[100px] rounded-[100%] pointer-events-none -z-10" />
      <div className="absolute inset-0 z-[-5] opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-8 shadow-2xl shadow-indigo-900/5 relative z-10">
        
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 mb-8 transition-colors group">
          <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Back to Login
        </Link>

        {!submitted ? (
          <>
            <div className="size-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 shadow-inner border border-indigo-100">
              <KeyRound className="size-6 text-indigo-600" />
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Forgot Password</h1>
              <p className="text-slate-500 text-sm leading-relaxed">Enter your email address and we'll send you a secure link to reset your password.</p>
            </div>

            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-slate-700">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="student@school.edu" 
                  required 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 shadow-sm transition-all text-base" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-base font-bold shadow-lg transition-all" disabled={loading}>
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="size-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-sm">
              <MailCheck className="size-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Check your email</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              We have sent a password reset link to <strong className="text-slate-700">{email}</strong>. Please check your inbox and spam folder.
            </p>
            <Button className="w-full h-12 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold shadow-sm" asChild>
              <Link href="/login">Return to Login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
