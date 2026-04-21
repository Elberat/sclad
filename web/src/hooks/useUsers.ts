import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase, type Profile, type Role } from '@/lib/supabase'

export const usersQueryKey = ['users'] as const

export type CreateUserPayload = {
  email: string
  full_name: string | null
  password: string
  role: Role
}

export function useUsersQuery() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateUserPayload): Promise<Profile> => {
      const { data, error } = await supabase.functions.invoke<{ profile: Profile; error?: string }>('admin-create-user', {
        body: payload,
      })
      if (error) throw await normalizeFunctionError(error)
      if (!data?.profile) throw new Error(data?.error ?? 'Пользователь не создан')
      return data.profile
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey })
    },
  })
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').update({ role } as never).eq('id', id).select('*').single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey })
    },
  })
}

export function useUpdateUserPasswordMutation() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const { error } = await supabase.functions.invoke('admin-update-user-password', {
        body: { id, password },
      })
      if (error) throw await normalizeFunctionError(error)
    },
  })
}

async function normalizeFunctionError(error: unknown) {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context

    if (context instanceof Response) {
      const payload = await context.json().catch(() => null)
      const code = typeof payload?.error === 'string' ? payload.error : null

      if (code === 'server_not_configured') return new Error('Edge Function не настроена: добавьте SUPABASE_SERVICE_ROLE_KEY')
      if (code === 'not_authenticated') return new Error('Сессия истекла. Войдите заново')
      if (code === 'forbidden') return new Error('Создавать пользователей может только super_admin')
      if (code === 'invalid_payload') return new Error('Проверьте email, пароль и роль')
      if (code) return new Error(code)
    }
  }

  if (error instanceof Error) return error
  return new Error('Не удалось выполнить Edge Function')
}

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: false, archived_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey })
    },
  })
}
