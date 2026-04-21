import { Outlet } from 'react-router-dom'

import { AppShell } from '@/layouts/AppShell'

export function AppLayout() {
  return (
    <AppShell>
      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
        <Outlet />
      </div>
    </AppShell>
  )
}
