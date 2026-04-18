import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    // 1. Verify the calling user is an admin
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse the new limit from request body
    const { limit } = await req.json()
    const newLimit = parseInt(limit)
    if (isNaN(newLimit) || newLimit < 1 || newLimit > 50) {
      return NextResponse.json({ error: 'Invalid limit value' }, { status: 400 })
    }

    // 3. Use service role client to bypass RLS for bulk profile update
    const serviceClient = createServiceSupabaseClient()

    // Update library_settings
    const { error: settingError } = await serviceClient
      .from('library_settings')
      .update({ setting_value: String(newLimit), updated_at: new Date().toISOString() })
      .eq('setting_key', 'default_borrow_limit')

    if (settingError) {
      return NextResponse.json({ error: settingError.message }, { status: 500 })
    }

    // Bulk update ALL student profiles (bypasses RLS via service role)
    const { error: profileError, count } = await serviceClient
      .from('profiles')
      .update({ borrow_limit: newLimit })
      .eq('role', 'student')
      .select('*', { count: 'exact', head: true })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, limit: newLimit, studentsUpdated: count ?? 0 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    )
  }
}
