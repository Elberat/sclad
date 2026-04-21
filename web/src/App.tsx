import { Navigate, Route, Routes } from 'react-router-dom'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { AppLayout } from '@/layouts/AppLayout'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ItemDetailsPage } from '@/pages/ItemDetailsPage'
import { ItemsPage } from '@/pages/ItemsPage'
import { LoginPage } from '@/pages/LoginPage'
import { OperationPage } from '@/pages/OperationPage'
import { UsersPage } from '@/pages/UsersPage'
import { WarehouseDetailsPage } from '@/pages/WarehouseDetailsPage'
import { WarehousesPage } from '@/pages/WarehousesPage'
import { ProtectedRoute } from '@/router/ProtectedRoute'

function withPageBoundary(page: JSX.Element) {
  return <ErrorBoundary>{page}</ErrorBoundary>
}

function App() {
  const { profile } = useAuth()
  const isMobile = useMediaQuery('(max-width: 767px)')

  return (
    <>
      <Routes>
        <Route path="/login" element={withPageBoundary(<LoginPage />)} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={withPageBoundary(<DashboardPage />)} />
            <Route path="/warehouses" element={withPageBoundary(<WarehousesPage />)} />
            <Route path="/warehouses/:id" element={withPageBoundary(<WarehouseDetailsPage />)} />
            <Route path="/items" element={withPageBoundary(<ItemsPage />)} />
            <Route path="/items/:id" element={withPageBoundary(<ItemDetailsPage />)} />
            <Route path="/categories" element={withPageBoundary(<CategoriesPage />)} />
            <Route path="/history" element={withPageBoundary(<HistoryPage />)} />
            <Route path="/operations/:type" element={withPageBoundary(<OperationPage />)} />
            <Route
              path="/users"
              element={profile?.role === 'super_admin' ? withPageBoundary(<UsersPage />) : <Navigate to="/dashboard" replace />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster richColors position={isMobile ? 'bottom-center' : 'top-right'} />
    </>
  )
}

export default App
