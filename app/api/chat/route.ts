import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages } = body
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 })
    }

    const latestMessage = messages[messages.length - 1]?.content || ''

    // 1. Get user session & role
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    let role = 'student'
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p) role = p.role
    }

    // 2. Extract keywords from the message
    const words = latestMessage.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)

    // 3. Build context from the catalog
    let contextData = ''

    if (words.length > 0) {
      const orConditions = words.map((w: string) => `title.ilike.%${w}%,author.ilike.%${w}%`).join(',')
      const { data: bData } = await supabase
        .from('books')
        .select('*, shelves(name, location), book_categories(categories(name))')
        .or(orConditions)
        .limit(10)

      if (bData && bData.length > 0) {
        contextData = bData.map(b => {
          const cats = ((b.book_categories ?? []) as any[])
            .map((bc: any) => bc.categories?.name)
            .filter(Boolean)
            .join(', ')
          return (
            `Book: "${b.title}" by ${b.author}. ` +
            `Status: ${b.available_copies} of ${b.total_copies} available. ` +
            (cats ? `Categories: ${cats}. ` : '') +
            (b.shelves ? `Location: ${(b.shelves as any).name} (${(b.shelves as any).location}). ` : '') +
            (role !== 'student' ? `[ID: ${b.id}] ` : '')
          )
        }).join('\n')
      }
    }

    // 4. Fallback: sample overview
    if (!contextData) {
      const { data: bData } = await supabase
        .from('books')
        .select('title, author, available_copies, book_categories(categories(name))')
        .limit(8)

      if (bData) {
        contextData = 'Quick sample of our catalog:\n' + bData.map(b => {
          const cats = ((b.book_categories ?? []) as any[])
            .map((bc: any) => bc.categories?.name)
            .filter(Boolean)
            .join(', ')
          return `"${b.title}" by ${b.author}${cats ? ` [${cats}]` : ''} (${b.available_copies} available)`
        }).join('\n')
      }
    }

    // 5. Build prompts
    const systemPrompt = `You are Libby, a friendly and knowledgeable school library assistant.
Answer the user based ONLY on the library data context provided.
User role: ${role}
${role !== 'student' ? 'You may include book IDs and borrower info if requested by staff/admin.' : 'Do not expose other student names.'}
Guidelines:
- If the book is not found, say it may not be in the catalog and suggest requesting it.
- Format your response cleanly with bullet points or line breaks where helpful.
- Be warm, concise, and helpful. Do not say "based on the context" or "according to the data".
- If asked about categories, list them clearly.

Library Data:
${contextData || 'No specific matching books found in the catalog.'}`

    // 6. Call Groq (OpenAI-compatible)
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: latestMessage },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}))
      throw new Error(errData?.error?.message || `Groq API error: ${groqRes.status}`)
    }

    const groqData = await groqRes.json()
    const replyText = groqData.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply: replyText })

  } catch (error: any) {
    console.error('Chat error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
