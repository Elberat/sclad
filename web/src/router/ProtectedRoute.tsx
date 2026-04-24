import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AppLoader } from '@/components/shared/AppLoader'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <AppLoader fullScreen label="Подготавливаем рабочее пространство" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
