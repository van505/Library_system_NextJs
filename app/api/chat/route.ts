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

    // 2. Fetch ALL available books directly as requested
    const { data: availableBooks } = await supabase
      .from('books')
      .select('title, author, book_categories(categories(name))')
      .gt('available_copies', 0)

    let contextData = ''
    if (availableBooks && availableBooks.length > 0) {
      contextData = availableBooks.map(b => {
        const cats = ((b.book_categories ?? []) as any[])
          .map((bc: any) => bc.categories?.name)
          .filter(Boolean)
          .join(', ')
        return `"${b.title}" by ${b.author}${cats ? ` [Categories: ${cats}]` : ''}`
      }).join('\n')
    }

    // 3. Build prompt
    const systemPrompt = `You are Libby, a helpful AI library assistant.
User role: ${role}
Here is the strict list of currently AVAILABLE books in our library:
${contextData || 'No books currently available.'}

Guidelines:
1. ONLY recommend books from this available list above. 
2. If the user asks for a book, author, or genre not in the list, politely inform them it is not currently available and recommend a substitute from the list.
3. Be warm, concise, and helpful. Do not mention "based on the available list", just act naturally as the librarian.`

    // 4. Call Google Gemini API directly using REST
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    // Prepare Gemini chat history format. System prompt goes into a 'system_instruction' or prefix.
    const promptPayload = {
      system_instruction: {
        parts: { text: systemPrompt }
      },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    }

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promptPayload),
    })

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}))
      throw new Error(errData?.error?.message || 'Gemini API error: ' + geminiRes.status)
    }

    const geminiData = await geminiRes.json()
    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply: replyText })

  } catch (error: any) {
    console.error('Chat error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
