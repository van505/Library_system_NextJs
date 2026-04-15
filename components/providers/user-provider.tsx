'use client'

import * as React from 'react'
import type { Profile } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

const ProfileContext = React.createContext<Profile | null>(null)

export function UserProvider({
  profile,
  children,
}: {
  profile: Profile | null
  children: React.ReactNode
}) {
  // Hydrate Zustand store from the SSR-fetched profile so client
  // components that call useAuthStore() get the correct role immediately.
  const setProfile = useAuthStore((s) => s.setProfile)
  React.useEffect(() => {
    setProfile(profile)
  }, [profile, setProfile])

  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): Profile | null {
  return React.useContext(ProfileContext)
}
