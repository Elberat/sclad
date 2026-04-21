import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'

import type { Profile } from '@/lib/supabase'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured')
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      throw error
    }
    return data as Profile
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      setProfile(null)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      if (!isSupabaseConfigured) {
        setUser(null)
        setProfile(null)
        setIsLoading(false)
        return
      }

      try {
        const { data } = await supabase.auth.getSession()
        const currentUser = data.session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const nextProfile = await fetchProfile(currentUser.id)
          if (!nextProfile.is_active) {
            await signOut()
            toast.error('Аккаунт деактивирован')
            return
          }
          setProfile(nextProfile)
        } else {
          setProfile(null)
        }
      } catch {
        setProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [fetchProfile, signOut])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)

      if (!nextUser) {
        setProfile(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      void (async () => {
        try {
          const nextProfile = await fetchProfile(nextUser.id)
          if (!nextProfile.is_active) {
            await signOut()
            toast.error('Аккаунт деактивирован')
            return
          }
          setProfile(nextProfile)
        } catch {
          setProfile(null)
        } finally {
          setIsLoading(false)
        }
      })()
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile, signOut])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      signIn,
      signOut,
    }),
    [isLoading, profile, signIn, signOut, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
