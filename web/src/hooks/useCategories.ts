import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type CategoryRow = Database['public']['Tables']['item_categories']['Row']

export const categoriesQueryKey = ['categories'] as const

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase.from('item_categories').select('*').order('name')
      if (error) throw error
      return (data ?? []) as CategoryRow[]
    },
  })
}

export function useActiveCategoriesQuery() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase.from('item_categories').select('*').eq('is_active', true).order('name')
      if (error) throw error
      return (data ?? []) as CategoryRow[]
    },
  })
}

type CategoryPayload = { id?: string; name: string; description: string | null }

export function useUpsertCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CategoryPayload): Promise<CategoryRow> => {
      if (payload.id) {
        const { data, error } = await supabase
          .from('item_categories')
          .update({ name: payload.name, description: payload.description } as never)
          .eq('id', payload.id)
          .select('*')
          .single()
        if (error) throw error
        return data as CategoryRow
      }

      const { data, error } = await supabase
        .from('item_categories')
        .insert({ name: payload.name, description: payload.description } as never)
        .select('*')
        .single()
      if (error) throw error
      return data as CategoryRow
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['categories', 'active'] })
    },
  })
}

export function useArchiveCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, nextIsActive }: { id: string; nextIsActive: boolean }): Promise<CategoryRow> => {
      const { data, error } = await supabase
        .from('item_categories')
        .update({ is_active: nextIsActive, archived_at: nextIsActive ? null : new Date().toISOString() } as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as CategoryRow
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['categories', 'active'] })
    },
  })
}
