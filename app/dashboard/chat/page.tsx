'use client'

import * as React from 'react'
import { Send, Bot, User, Sparkles, BookOpen } from 'lucide-react'
import { useProfile } from '@/components/providers/user-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Message = { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }

const SUGGESTIONS = [
  'Where is Harry Potter?',
  'What Science books do you have?',
  'Show me available Fiction books',
  'Who has borrowed Romeo and Juliet?',
]

function TypingDots() {
  return (
    <div className="flex gap-1 px-1 py-0.5" aria-label="AI is typing">
      {[0, 1, 2].map(i => (
        <span key={i} className="size-1.5 rounded-full bg-current opacity-60 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }} />
      ))}
    </div>
  )
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-2.5 items-end', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('size-7 rounded-full flex items-center justify-center shrink-0 mb-0.5',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-[#1e2a45] text-slate-300 ring-1 ring-white/10')}>
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className={cn('max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-[#1e2a45] text-slate-100 ring-1 ring-white/10 rounded-bl-sm')}>
        {message.content.split('\n').map((line, i, arr) => (
          <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
        ))}
        <p className={cn('text-[10px] mt-1.5 select-none',
          isUser ? 'text-primary-foreground/60 text-right' : 'text-slate-500')}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function DashboardChatPage() {
  const profile = useProfile()
  const [messages, setMessages] = React.useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: `Hi! I'm Libby, your AI library assistant 📚\n\nAsk me where any book is located, its availability, or who currently has it borrowed${profile?.role !== 'student' ? ' (admin/staff view)' : ''}.`,
    timestamp: new Date(),
  }])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.reply, timestamp: new Date() }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: err instanceof Error ? `Sorry: ${err.message}` : 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0f172a]">
      {/* Header */}
      <div className="border-b border-white/10 px-5 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <BookOpen className="size-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Libby</p>
            <p className="text-xs text-slate-400">AI Library Assistant</p>
          </div>
        </div>
        <Badge variant="outline" className="border-white/20 text-slate-400 text-xs gap-1">
          <Sparkles className="size-3" />AI Powered
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
        {messages.map(msg => <Bubble key={msg.id} message={msg} />)}
        {loading && (
          <div className="flex gap-2.5 items-end">
            <div className="size-7 rounded-full bg-[#1e2a45] ring-1 ring-white/10 flex items-center justify-center shrink-0">
              <Bot className="size-3.5 text-slate-300" />
            </div>
            <div className="bg-[#1e2a45] ring-1 ring-white/10 rounded-2xl rounded-bl-sm px-4 py-3 text-slate-300">
              <TypingDots />
            </div>
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 mt-1">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-xs border border-white/15 rounded-full px-3 py-1.5 text-slate-400 hover:text-white hover:border-white/30 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-3 shrink-0 bg-[#0f172a]">
        <form onSubmit={e => { e.preventDefault(); sendMessage(input) }} className="flex gap-2 items-center">
          <Input
            id="chat-input" ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask about any book…" disabled={loading}
            className="flex-1 h-11 rounded-xl text-sm bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-primary" autoFocus />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="size-11 rounded-xl shrink-0">
            <Send className="size-4" />
          </Button>
        </form>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          Responses based on live library catalog
        </p>
      </div>
    </div>
  )
}
