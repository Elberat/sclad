import type { ReactNode } from 'react'
import { Boxes, Building2, History, LayoutDashboard, Package, Users } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { InstallAppButton } from '@/components/shared/InstallAppButton'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/lib/permissions'

type NavItem = {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission: string
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Дашборд', icon: LayoutDashboard, permission: 'canViewHistory' },
  { path: '/warehouses', label: 'Склады', icon: Building2, permission: 'canViewWarehouses' },
  { path: '/items', label: 'Товары', icon: Package, permission: 'canViewItems' },
  { path: '/categories', label: 'Категории', icon: Boxes, permission: 'canViewCategories' },
  { path: '/history', label: 'История', icon: History, permission: 'canViewHistory' },
  { path: '/users', label: 'Пользователи', icon: Users, permission: 'canManageUsers' },
]

function NavItemLink({ item, mobile }: { item: NavItem; mobile?: boolean }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        mobile
          ? `relative flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-1 border-t-2 px-1 text-[11px] transition-all duration-200 ease-out active:scale-[0.98] ${
              isActive
                ? 'border-primary bg-[color:var(--surface-strong)] text-primary shadow-[var(--shadow-sm)]'
                : 'border-transparent text-muted-foreground hover:-translate-y-0.5 hover:bg-muted hover:text-foreground'
            }`
          : `flex min-h-[44px] items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all duration-200 ease-out active:scale-[0.99] ${
              isActive
                ? 'border-primary/20 bg-primary/10 text-primary shadow-[var(--shadow-sm)]'
                : 'border-transparent text-muted-foreground hover:-translate-y-0.5 hover:bg-muted hover:text-foreground hover:shadow-[var(--shadow-sm)]'
            }`
      }
    >
      <item.icon className="h-5 w-5" />
      <span className="max-w-full truncate">{item.label}</span>
    </NavLink>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const permittedNavItems = NAV_ITEMS.filter((item) => (profile ? PERMISSIONS[profile.role]?.[item.permission] : false))
  const mobileNavItems = permittedNavItems.filter((item) => item.path !== '/users')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-border bg-card/95 md:flex md:flex-col">
        <div className="border-b border-border px-5 py-4 text-base font-semibold tracking-tight">Sclad</div>
        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {permittedNavItems.map((item) => (
            <NavItemLink key={item.path} item={item} />
          ))}
        </nav>
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div className="text-sm">
            <p className="font-medium">{profile?.full_name || profile?.email || 'Пользователь'}</p>
            <p className="text-xs text-muted-foreground">{profile?.role}</p>
          </div>
          <ThemeToggle />
          <InstallAppButton variant="outline" className="w-full" compact />
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Выйти
          </Button>
        </div>
      </aside>

      <main className="pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div
          className="grid h-[60px] items-stretch pb-[env(safe-area-inset-bottom)]"
          style={{ gridTemplateColumns: `repeat(${Math.max(mobileNavItems.length, 1)}, minmax(0, 1fr))` }}
        >
          {mobileNavItems.map((item) => (
            <NavItemLink key={item.path} item={item} mobile />
          ))}
        </div>
      </nav>
    </div>
  )
}
