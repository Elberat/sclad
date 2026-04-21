import type { PropsWithChildren, ReactNode } from 'react'

import { usePermission } from '@/lib/permissions'

type RoleGateProps = PropsWithChildren<{
  permission: string
  fallback?: ReactNode
}>

export function RoleGate({ permission, fallback = null, children }: RoleGateProps) {
  const canAccess = usePermission(permission)
  if (!canAccess) return <>{fallback}</>
  return <>{children}</>
}
