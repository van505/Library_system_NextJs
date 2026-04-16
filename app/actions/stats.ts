'use server'

import { createClient } from '@supabase/supabase-js'

export async function getStudentCount() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'student')
    
  if (error) {
    console.error('Error fetching student count:', error)
    return 0
  }
  
  return count ?? 0
}
