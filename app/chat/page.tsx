'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bot, ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import axios from 'axios'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user', content: string }[]>([{
    role: 'assistant',
    content: "Hi! I'm Libby, your AI Librarian. Ask me about any books, subjects, or check if something is available on the shelves!"
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    // Only run once on mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q')
      if (q && messages.length === 1) { // messages.length === 1 means only the initial greeting is there
        // Clear param from URL
        window.history.replaceState({}, '', '/chat')

        const userMsg = q.trim()
        const newMessages: { role: 'assistant' | 'user', content: string }[] = [...messages, { role: 'user', content: userMsg }]
        setMessages(newMessages)
        setLoading(true)

        axios.post('/api/chat', { messages: newMessages })
          .then(res => setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]))
          .catch(e => toast.error(e.response?.data?.error || 'Failed to connect to AI'))
          .finally(() => setLoading(false))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array intentionally for mount only

  async function handleSend() {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    const newMessages: { role: 'assistant' | 'user', content: string }[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await axios.post('/api/chat', { messages: newMessages })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to connect to AI')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/"><ArrowLeft className="size-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Bot className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Libby AI</h1>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Online & Catalog Synced
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 mb-24 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200 mt-1">
                  <Bot className="size-4 text-indigo-700" />
                </div>
              )}
              <div className={`p-4 rounded-2xl max-w-[85%] text-[15px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                }`}>
                <div className="prose prose-sm leading-normal max-w-none prose-p:my-1 prose-a:text-indigo-400 whitespace-pre-wrap break-words">
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200 mt-1">
                <Bot className="size-4 text-indigo-700 mx-auto" />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tl-sm w-24 flex items-center justify-center shadow-sm">
                <div className="flex gap-1">
                  <div className="size-2 rounded-full bg-indigo-300 animate-bounce" />
                  <div className="size-2 rounded-full bg-indigo-300 animate-bounce [animation-delay:-.3s]" />
                  <div className="size-2 rounded-full bg-indigo-300 animate-bounce [animation-delay:-.5s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 fixed bottom-0 w-full left-0 z-20 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <Textarea
            className="min-h-[56px] max-h-32 resize-none rounded-xl text-base bg-slate-50 border-slate-200 focus-visible:ring-indigo-600 shadow-inner"
            placeholder="Message Libby..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button size="icon" className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-md shadow-indigo-600/20" onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="size-5" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
