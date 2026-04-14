import { type NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'

// GET — list all staff members (admin only)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'staff')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// POST — create a new staff user (admin only)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { fullName, email, password } = await request.json()
  if (!fullName || !email || !password)
    return Response.json({ error: 'fullName, email, and password are required' }, { status: 400 })

  // Use service role to create the auth user
  const adminSupabase = createServiceSupabaseClient()
  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError) return Response.json({ error: authError.message }, { status: 400 })

  // The DB trigger creates a profile with role='student' — update to 'staff'
  const { data: updatedProfile, error: profileError } = await adminSupabase
    .from('profiles')
    .upsert({ id: newUser.user.id, full_name: fullName, role: 'staff' })
    .select()
    .single()

  if (profileError) return Response.json({ error: profileError.message }, { status: 500 })
  return Response.json(updatedProfile)
}

// DELETE — remove a staff user (admin only)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const adminSupabase = createServiceSupabaseClient()
  const { error } = await adminSupabase.auth.admin.deleteUser(id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ success: true })
}
