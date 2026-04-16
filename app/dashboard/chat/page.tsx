'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, User, Trash2, Library, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function LibbyChatPage() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hi there! I am Libby, your AI library assistant. How can I help you find your next great read today?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const chips = [
    "Where is Harry Potter?",
    "Do you have Science books?",
    "What's available today?",
    "Suggest a fantasy book"
  ]

  // Auto scroll to bottom
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text: string) {
    if (!text.trim()) return
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Send entire history but format according to the API we just wrote
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to communicate with Libby')
      
      const botMsg: Message = { id: (Date.now()+1).toString(), role: 'assistant', content: data.reply, timestamp: new Date() }
      setMessages(prev => [...prev, botMsg])

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setMessages([{ id: Date.now().toString(), role: 'assistant', content: 'Chat history cleared. How can I help you anew?', timestamp: new Date() }])
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] min-h-[600px] flex flex-col p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
         <div className="flex items-center gap-4">
           <div className="size-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
             <Bot className="size-6 text-primary" />
           </div>
           <div>
             <h1 className="font-bold text-slate-900 text-xl flex items-center gap-1.5"><Sparkles className="size-4 text-amber-400 fill-amber-400" /> Libby AI</h1>
             <p className="text-xs text-slate-500 font-medium tracking-wide">YOUR PERSONAL LIBRARY ASSISTANT</p>
           </div>
         </div>
         <Button variant="ghost" size="sm" onClick={handleClear} className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl px-3 h-10">
           <Trash2 className="size-4 mr-2" /> Clear UI
         </Button>
      </div>

      <Card className="flex-1 rounded-[2rem] border-slate-200 shadow-sm flex flex-col overflow-hidden bg-slate-50/50">
        <ScrollArea className="flex-1 p-4 md:p-8">
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 items-end ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`size-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-emerald-600' : 'bg-primary'}`}>
                  {m.role === 'user' ? <User className="size-4 text-white" /> : <Bot className="size-4 text-primary-foreground" />}
                </div>
                {/* Bubble */}
                <div className={`flex flex-col gap-1 max-w-[75%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm break-words whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}>
                    {m.content}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase px-1">
                    {format(m.timestamp, 'h:mm a')}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="size-10 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="size-5 text-primary-foreground"/>
                </div>
                <div className="bg-white border border-slate-200 rounded-[2rem] rounded-tl-sm px-6 py-5 shadow-sm flex items-center gap-1.5 h-[58px]">
                   <span className="size-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                   <span className="size-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                   <span className="size-2 bg-primary/60 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>
        </ScrollArea>

        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
           <div className="max-w-3xl mx-auto flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide shrink-0">
             {chips.map((c, i) => (
               <Button key={i} variant="outline" size="sm" onClick={() => handleSend(c)} disabled={loading} className="rounded-full bg-white text-primary border-primary/20 hover:bg-primary/10 shadow-sm whitespace-nowrap">
                 {c}
               </Button>
             ))}
           </div>
           <form 
             className="max-w-3xl mx-auto relative flex items-center" 
             onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
           >
             <Input 
               value={input} 
               onChange={e => setInput(e.target.value)} 
               placeholder="Ask Libby anything about the library..." 
               disabled={loading}
               className="h-16 pl-6 pr-16 rounded-full bg-slate-50 border-slate-200 shadow-inner text-base focus-visible:ring-indigo-500" 
             />
             <Button 
               type="submit" 
               disabled={loading || !input.trim()} 
               className="absolute right-2 size-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md p-0"
             >
               <Send className="size-5 ml-1" />
             </Button>
           </form>
           <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
              Libby uses Google Gemini 2.5 Flash · Results may vary
            </p>
        </div>
      </Card>
    </div>
  )
}
