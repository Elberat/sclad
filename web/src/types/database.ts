export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'viewer' | 'cashier' | 'warehouse_manager' | 'super_admin'
          is_active: boolean
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role: 'viewer' | 'cashier' | 'warehouse_manager' | 'super_admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'viewer' | 'cashier' | 'warehouse_manager' | 'super_admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
      }
      warehouses: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
      }
      item_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
      }
      items: {
        Row: {
          id: string
          category_id: string
          name: string
          model: string | null
          sku: string | null
          description: string | null
          specs_json: Json | null
          purchase_price: string | null
          sale_price: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          model?: string | null
          sku?: string | null
          description?: string | null
          specs_json?: Json | null
          purchase_price?: string | null
          sale_price?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          model?: string | null
          sku?: string | null
          description?: string | null
          specs_json?: Json | null
          purchase_price?: string | null
          sale_price?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
      }
      inventory_balances: {
        Row: {
          id: string
          warehouse_id: string
          item_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          warehouse_id: string
          item_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          warehouse_id?: string
          item_id?: string
          quantity?: number
          updated_at?: string
        }
      }
      inventory_operations: {
        Row: {
          id: string
          type: 'receipt' | 'sale' | 'transfer'
          item_id: string
          source_warehouse_id: string | null
          destination_warehouse_id: string | null
          quantity: number
          comment: string | null
          created_by_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'receipt' | 'sale' | 'transfer'
          item_id: string
          source_warehouse_id?: string | null
          destination_warehouse_id?: string | null
          quantity: number
          comment?: string | null
          created_by_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'receipt' | 'sale' | 'transfer'
          item_id?: string
          source_warehouse_id?: string | null
          destination_warehouse_id?: string | null
          quantity?: number
          comment?: string | null
          created_by_user_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
