'use server'

import { createServiceSupabaseClient } from '@/lib/supabase-server'

/**
 * notifyAdmins — sends a notification to every admin user using the Service Role Client 
 * to bypass RLS.
 */
export async function notifyAdmins(
  _client: any, // Deprecated: Kept for backward compatibility with calling routes
  title: string,
  message: string,
  link?: string
): Promise<void> {
  const supabase = createServiceSupabaseClient()
  
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (!admins || admins.length === 0) return

  const notifications = admins.map((admin: { id: string }) => ({
    user_id: admin.id,
    title,
    message,
    type: 'info' as const,
    link: link ?? '/dashboard/admin',
  }))

  await supabase.from('notifications').insert(notifications)
}

/**
 * notifyUser — sends a notification to a specific user using Service Role to bypass RLS.
 */
export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'danger' = 'info',
  link?: string
): Promise<void> {
  const supabase = createServiceSupabaseClient()
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    link: link ?? null,
  })
}

/**
 * notifyRoles — sends a notification to all users matching specific roles.
 */
export async function notifyRoles(
  roles: string[],
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'danger' = 'info',
  link?: string
): Promise<void> {
  const supabase = createServiceSupabaseClient()
  const { data: users } = await supabase.from('profiles').select('id').in('role', roles)
  
  if (!users || users.length === 0) return
  
  const notifications = users.map(u => ({
    user_id: u.id,
    title,
    message,
    type,
    link: link ?? null,
  }))

  await supabase.from('notifications').insert(notifications)
}
