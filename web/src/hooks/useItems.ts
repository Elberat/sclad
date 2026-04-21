import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database'

export type ItemRow = Database['public']['Tables']['items']['Row']

type ItemListRow = ItemRow & {
  item_categories: { name: string } | null
  inventory_balances: { quantity: number; warehouse_id: string }[]
}

export type ItemListEntry = ItemListRow & { total_quantity: number }

export type ItemBalanceByWarehouse = {
  id: string
  quantity: number
  warehouses: { name: string } | null
}

export type ItemOperation = {
  id: string
  type: 'receipt' | 'sale' | 'transfer'
  quantity: number
  created_at: string
  comment: string | null
  profiles: { full_name: string | null; email: string } | null
}

export const itemsQueryKey = ['items'] as const

export function useItemsQuery() {
  return useQuery({
    queryKey: itemsQueryKey,
    queryFn: async (): Promise<ItemListEntry[]> => {
      const { data, error } = await supabase
        .from('items')
        .select('*, item_categories(name), inventory_balances(quantity, warehouse_id)')
        .order('name')
      if (error) throw error

      return ((data ?? []) as ItemListRow[]).map((item) => ({
        ...item,
        total_quantity: (item.inventory_balances ?? []).reduce((sum, balance) => sum + balance.quantity, 0),
      }))
    },
  })
}

export function useItemByIdQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['item', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<(ItemRow & { item_categories: { name: string } | null }) | null> => {
      const { data, error } = await supabase.from('items').select('*, item_categories(name)').eq('id', id!).maybeSingle()
      if (error) throw error
      if (!data) return null
      return data as ItemRow & { item_categories: { name: string } | null }
    },
  })
}

export function useItemBalancesByWarehouseQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['item-balances-by-warehouse', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ItemBalanceByWarehouse[]> => {
      const { data, error } = await supabase
        .from('inventory_balances')
        .select('id, quantity, warehouses(name)')
        .eq('item_id', id!)
        .order('quantity', { ascending: false })
      if (error) throw error
      return (data ?? []) as ItemBalanceByWarehouse[]
    },
  })
}

export function useItemOperationsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['item-operations', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ItemOperation[]> => {
      const { data, error } = await supabase
        .from('inventory_operations')
        .select('id, type, quantity, created_at, comment, profiles(full_name, email)')
        .eq('item_id', id!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as ItemOperation[]
    },
  })
}

type UpsertItemPayload = {
  id?: string
  name: string
  category_id: string
  model: string | null
  sku: string | null
  description: string | null
  purchase_price: string | null
  sale_price: string | null
  specs_json: Json | null
  image_url: string | null
}

export function useUpsertItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpsertItemPayload): Promise<ItemRow> => {
      if (payload.id) {
        const { data, error } = await supabase
          .from('items')
          .update(payload as never)
          .eq('id', payload.id)
          .select('*')
          .single()
        if (error) throw error
        return data as ItemRow
      }

      const { data, error } = await supabase.from('items').insert(payload as never).select('*').single()
      if (error) throw error
      return data as ItemRow
    },
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey })
      if (payload.id) await queryClient.invalidateQueries({ queryKey: ['item', payload.id] })
    },
  })
}

export function useArchiveItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, nextIsActive }: { id: string; nextIsActive: boolean }): Promise<ItemRow> => {
      const { data, error } = await supabase
        .from('items')
        .update({ is_active: nextIsActive, archived_at: nextIsActive ? null : new Date().toISOString() } as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as ItemRow
    },
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['item', item.id] })
    },
  })
}
