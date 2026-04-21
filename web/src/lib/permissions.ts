import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/lib/supabase'

type PermissionMap = Record<string, boolean>

export const PERMISSIONS: Record<Role, PermissionMap> = {
  viewer: {
    canViewWarehouses: true,
    canCreateWarehouse: false,
    canEditWarehouse: false,
    canArchiveWarehouse: false,
    canViewItems: true,
    canCreateItem: false,
    canEditItem: false,
    canArchiveItem: false,
    canViewCategories: true,
    canCreateCategory: false,
    canEditCategory: false,
    canArchiveCategory: false,
    canDoReceipt: false,
    canDoSale: false,
    canDoTransfer: false,
    canViewHistory: true,
    canManageUsers: false,
  },
  cashier: {
    canViewWarehouses: true,
    canCreateWarehouse: false,
    canEditWarehouse: false,
    canArchiveWarehouse: false,
    canViewItems: true,
    canCreateItem: false,
    canEditItem: false,
    canArchiveItem: false,
    canViewCategories: true,
    canCreateCategory: false,
    canEditCategory: false,
    canArchiveCategory: false,
    canDoReceipt: false,
    canDoSale: true,
    canDoTransfer: false,
    canViewHistory: true,
    canManageUsers: false,
  },
  warehouse_manager: {
    canViewWarehouses: true,
    canCreateWarehouse: true,
    canEditWarehouse: true,
    canArchiveWarehouse: true,
    canViewItems: true,
    canCreateItem: true,
    canEditItem: true,
    canArchiveItem: true,
    canViewCategories: true,
    canCreateCategory: true,
    canEditCategory: true,
    canArchiveCategory: true,
    canDoReceipt: true,
    canDoSale: true,
    canDoTransfer: true,
    canViewHistory: true,
    canManageUsers: false,
  },
  super_admin: {
    canViewWarehouses: true,
    canCreateWarehouse: true,
    canEditWarehouse: true,
    canArchiveWarehouse: true,
    canViewItems: true,
    canCreateItem: true,
    canEditItem: true,
    canArchiveItem: true,
    canViewCategories: true,
    canCreateCategory: true,
    canEditCategory: true,
    canArchiveCategory: true,
    canDoReceipt: true,
    canDoSale: true,
    canDoTransfer: true,
    canViewHistory: true,
    canManageUsers: true,
  },
}

export function usePermission(key: string): boolean {
  const { profile } = useAuth()
  if (!profile) return false
  return Boolean(PERMISSIONS[profile.role]?.[key])
}
