import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type WarehouseListRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  inventory_balances: { count: number }[] | null
}

export type WarehouseWithCount = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  itemsCount: number
}

export type WarehouseItemBalance = {
  id: string
  quantity: number
  item_id: string
  items: {
    id: string
    name: string
    model: string | null
    sku: string | null
    item_categories: { name: string } | null
  } | null
}

export type WarehouseOperation = {
  id: string
  type: 'receipt' | 'sale' | 'transfer'
  quantity: number
  created_at: string
  comment: string | null
  items: { name: string } | null
  profiles: { full_name: string | null; email: string } | null
}

export const warehousesQueryKey = ['warehouses'] as const

export function useWarehousesQuery() {
  return useQuery({
    queryKey: warehousesQueryKey,
    queryFn: async (): Promise<WarehouseWithCount[]> => {
      const { data, error } = await supabase.from('warehouses').select('*, inventory_balances(count)').order('name')
      if (error) throw error

      return ((data ?? []) as WarehouseListRow[]).map((warehouse) => ({
        id: warehouse.id,
        name: warehouse.name,
        description: warehouse.description,
        is_active: warehouse.is_active,
        itemsCount: warehouse.inventory_balances?.[0]?.count ?? 0,
      }))
    },
  })
}

export function useWarehouseByIdQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouse', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<WarehouseRow> => {
      const { data, error } = await supabase.from('warehouses').select('*').eq('id', id!).single()
      if (error) throw error
      return data as WarehouseRow
    },
  })
}

export function useWarehouseBalancesQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouse-balances', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<WarehouseItemBalance[]> => {
      const { data, error } = await supabase
        .from('inventory_balances')
        .select('id, quantity, item_id, items(id, name, model, sku, item_categories(name))')
        .eq('warehouse_id', id!)
        .gt('quantity', 0)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as WarehouseItemBalance[]
    },
  })
}

export function useWarehouseOperationsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouse-operations', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<WarehouseOperation[]> => {
      const { data, error } = await supabase
        .from('inventory_operations')
        .select('id, type, quantity, created_at, comment, items(name), profiles(full_name, email)')
        .or(`source_warehouse_id.eq.${id},destination_warehouse_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as WarehouseOperation[]
    },
  })
}

type WarehousePayload = { name: string; description: string | null; id?: string }
type WarehouseRow = Database['public']['Tables']['warehouses']['Row']

export function useUpsertWarehouseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: WarehousePayload): Promise<WarehouseRow> => {
      if (payload.id) {
        const { data, error } = await supabase
          .from('warehouses')
          .update({ name: payload.name, description: payload.description } as never)
          .eq('id', payload.id)
          .select('*')
          .single()
        if (error) throw error
        return data
      }

      const { data, error } = await supabase
        .from('warehouses')
        .insert({ name: payload.name, description: payload.description } as never)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey })
      if (payload.id) {
        await queryClient.invalidateQueries({ queryKey: ['warehouse', payload.id] })
      }
    },
  })
}

export function useArchiveWarehouseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, nextIsActive }: { id: string; nextIsActive: boolean }): Promise<WarehouseRow> => {
      const { data, error } = await supabase
        .from('warehouses')
        .update({ is_active: nextIsActive, archived_at: nextIsActive ? null : new Date().toISOString() } as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (warehouse) => {
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['warehouse', warehouse.id] })
    },
  })
}
