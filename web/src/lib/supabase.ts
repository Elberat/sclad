import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const appEnv = import.meta.env.VITE_APP_ENV || import.meta.env.MODE
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient<Database>(
  supabaseUrl || 'https://missing-supabase-url.supabase.co',
  supabaseAnonKey || 'missing-supabase-anon-key',
)

export type Warehouse = Database['public']['Tables']['warehouses']['Row']
export type Item = Database['public']['Tables']['items']['Row']
export type Category = Database['public']['Tables']['item_categories']['Row']
export type InventoryBalance = Database['public']['Tables']['inventory_balances']['Row']
export type Operation = Database['public']['Tables']['inventory_operations']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export type OperationType = 'receipt' | 'sale' | 'transfer'
export type Role = 'viewer' | 'cashier' | 'warehouse_manager' | 'super_admin'

export type OperationWithRelations = Operation & {
  item: Pick<Item, 'id' | 'name' | 'model' | 'sku'>
  source_warehouse?: Pick<Warehouse, 'id' | 'name'>
  destination_warehouse?: Pick<Warehouse, 'id' | 'name'>
  created_by: Pick<Profile, 'id' | 'full_name' | 'email'>
}

export type ItemWithBalance = Item & {
  item_categories: { name: string }
  inventory_balances: { quantity: number; warehouse_id: string }[]
  total_quantity: number
}
