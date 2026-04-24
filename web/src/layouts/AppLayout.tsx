import { Outlet, useLocation } from 'react-router-dom'

import { AppShell } from '@/layouts/AppShell'

export function AppLayout() {
  const location = useLocation()

  return (
    <AppShell>
      <div className="px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-6 xl:px-8">
        <div key={location.pathname} className="route-transition animate-route-enter">
          <Outlet />
        </div>
      </div>
    </AppShell>
  )
}
