import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { notificationIds } = body // if empty, mark all as read

    let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      query = query.in('id', notificationIds)
    }

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    // Verify caller is admin/staff
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (p?.role === 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { userId, title, message, type, link } = body

    const { data, error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type: type || 'info',
      link: link || null
    }).select().single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
