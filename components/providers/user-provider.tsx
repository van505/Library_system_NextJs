'use client'

import * as React from 'react'
import type { Profile } from '@/lib/supabase'

const ProfileContext = React.createContext<Profile | null>(null)

export function UserProvider({
  profile,
  children,
}: {
  profile: Profile | null
  children: React.ReactNode
}) {
  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): Profile | null {
  return React.useContext(ProfileContext)
}
