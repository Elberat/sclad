import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightLeft,
  Boxes,
  Building2,
  EllipsisVertical,
  LogOut,
  Package,
  Plus,
  ReceiptText,
  Scale,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { InstallAppButton } from '@/components/shared/InstallAppButton'
import { RoleGate } from '@/components/shared/RoleGate'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { WarehouseFormModal } from '@/components/warehouses/WarehouseFormModal'
import { OperationDrawer } from '@/components/warehouses/OperationDrawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { useWarehouseBalancesQuery, useWarehousesQuery } from '@/hooks/useWarehouses'
import { PERMISSIONS } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { createActionClassName, getOperationActionClassName, getOperationBadgeClassName } from '@/lib/utils'

type OperationType = 'receipt' | 'sale' | 'transfer'

type DashboardOperation = {
  id: string
  type: OperationType
  quantity: number
  created_at: string
  items: { id: string; name: string; model: string | null; sku: string | null } | null
  source_warehouse: { name: string } | null
  destination_warehouse: { name: string } | null
  profiles: { full_name: string | null; email: string } | null
}

const LAST_WAREHOUSE_STORAGE_KEY = 'stoqly:last-warehouse-id'

function operationTypeLabel(type: OperationType) {
  if (type === 'receipt') return 'Приход'
  if (type === 'sale') return 'Расход'
  return 'Перемещение'
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cleanOperationLabel(label: string) {
  return label.replace(/^[^\p{L}\p{N}]+/u, '').trim()
}

export function DashboardPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const canManageUsers = profile ? Boolean(PERMISSIONS[profile.role]?.canManageUsers) : false
  const [preferredWarehouseId, setPreferredWarehouseId] = useState(() => localStorage.getItem(LAST_WAREHOUSE_STORAGE_KEY) ?? '')
  const [search, setSearch] = useState('')
  const [activeOperation, setActiveOperation] = useState<OperationType | null>(null)
  const [isCreateWarehouseOpen, setIsCreateWarehouseOpen] = useState(false)

  const warehousesQuery = useWarehousesQuery()
  const activeWarehouses = useMemo(
    () => (warehousesQuery.data ?? []).filter((warehouse) => warehouse.is_active),
    [warehousesQuery.data],
  )
  const selectedWarehouseId = activeWarehouses.find((warehouse) => warehouse.id === preferredWarehouseId)?.id ?? activeWarehouses[0]?.id ?? ''
  const selectedWarehouse = activeWarehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ?? null

  const warehouseBalancesQuery = useWarehouseBalancesQuery(selectedWarehouseId || undefined)

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', selectedWarehouseId],
    queryFn: async () => {
      const [warehousesRes, itemsRes, categoriesRes, balancesRes, operationsRes] = await Promise.all([
        supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('item_categories').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('inventory_balances').select('quantity'),
        supabase
          .from('inventory_operations')
          .select(
            `*, items(id,name,model,sku),
            source_warehouse:warehouses!source_warehouse_id(name),
            destination_warehouse:warehouses!destination_warehouse_id(name),
            profiles(full_name,email)`,
          )
          .or(`source_warehouse_id.eq.${selectedWarehouseId},destination_warehouse_id.eq.${selectedWarehouseId}`)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (warehousesRes.error) throw warehousesRes.error
      if (itemsRes.error) throw itemsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (balancesRes.error) throw balancesRes.error
      if (operationsRes.error) throw operationsRes.error

      const totalBalance = ((balancesRes.data ?? []) as { quantity: number }[]).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)

      return {
        activeWarehouses: warehousesRes.count ?? 0,
        activeItems: itemsRes.count ?? 0,
        activeCategories: categoriesRes.count ?? 0,
        totalBalance,
        latestOperations: (operationsRes.data ?? []) as DashboardOperation[],
      }
    },
  })

  const handleWarehouseChange = (warehouseId: string) => {
    setPreferredWarehouseId(warehouseId)
    localStorage.setItem(LAST_WAREHOUSE_STORAGE_KEY, warehouseId)
  }

  const filteredBalances = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (warehouseBalancesQuery.data ?? []).filter((balance) => {
      if (!balance.items) return false
      if (!needle) return true

      return (
        balance.items.name.toLowerCase().includes(needle) ||
        (balance.items.model ?? '').toLowerCase().includes(needle) ||
        (balance.items.sku ?? '').toLowerCase().includes(needle)
      )
    })
  }, [search, warehouseBalancesQuery.data])

  const totalSelectedWarehouseQuantity = useMemo(
    () => (warehouseBalancesQuery.data ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0),
    [warehouseBalancesQuery.data],
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page-shell gap-5 xl:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Рабочее место склада</h1>
          <p className="mt-1 text-sm text-muted-foreground">Откройте склад, найдите товар и выполните операцию за несколько секунд.</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-foreground shadow-[var(--shadow-sm)] transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20">
            <EllipsisVertical className="h-4 w-4" />
            <span className="sr-only">Открыть меню пользователя</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="normal-case tracking-normal text-foreground">
              <div className="space-y-0.5">
                <p className="truncate text-sm font-semibold">{profile?.full_name || profile?.email || 'Пользователь'}</p>
                <p className="truncate text-xs text-muted-foreground">{profile?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <ThemeToggle />
            </div>
            <DropdownMenuSeparator />
            <InstallAppButton variant="ghost" className="w-full justify-start rounded-xl px-3" compact />
            {canManageUsers ? (
              <DropdownMenuItem onClick={() => navigate('/users')} className="normal-case text-sm tracking-normal">
                <Users className="h-4 w-4" />
                Пользователи
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => void handleSignOut()} variant="destructive" className="normal-case text-sm tracking-normal">
              <LogOut className="h-4 w-4" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {activeWarehouses.length === 0 ? (
        <>
          <EmptyState
            icon={Building2}
            title="Создайте первый склад, чтобы начать учет"
            description="После этого можно будет принимать товар, списывать остатки и перемещать позиции между складами."
            cta={
              <RoleGate permission="canCreateWarehouse">
                <Button type="button" variant="outline" className={createActionClassName()} onClick={() => setIsCreateWarehouseOpen(true)}>
                  <Plus />
                  Создать склад
                </Button>
              </RoleGate>
            }
          />
          <WarehouseFormModal open={isCreateWarehouseOpen} onOpenChange={setIsCreateWarehouseOpen} warehouse={null} />
        </>
      ) : (
        <>
          <section className="surface-card p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="stat-label">Склад</p>
                  <div className="mt-2 max-w-md">
                    <Select value={selectedWarehouseId} onValueChange={handleWarehouseChange}>
                      <SelectTrigger className="h-12 w-full rounded-xl text-left text-sm font-medium">
                        <SelectValue placeholder="Выберите склад" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeWarehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedWarehouse?.description ? <p className="mt-2 text-sm text-muted-foreground">{selectedWarehouse.description}</p> : null}
                </div>

                <div className="grid gap-2 min-[420px]:grid-cols-3 lg:w-[420px]">
                  <RoleGate permission="canDoReceipt">
                    <OperationActionButton type="receipt" icon={TrendingUp} label="+ Приход" onClick={() => setActiveOperation('receipt')} />
                  </RoleGate>
                  <RoleGate permission="canDoSale">
                    <OperationActionButton type="sale" icon={TrendingDown} label="− Расход" onClick={() => setActiveOperation('sale')} />
                  </RoleGate>
                  <RoleGate permission="canDoTransfer">
                    <OperationActionButton type="transfer" icon={ArrowRightLeft} label="⇄ Перемещение" onClick={() => setActiveOperation('transfer')} />
                  </RoleGate>
                </div>
              </div>

              <div className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
                <WarehouseMiniStat title="Позиций" value={warehouseBalancesQuery.data?.length ?? 0} />
                <WarehouseMiniStat title="Всего на складе" value={totalSelectedWarehouseQuantity} suffix="шт" />
                <WarehouseMiniStat title="Складов" value={dashboardQuery.data?.activeWarehouses ?? 0} />
                <WarehouseMiniStat title="Всего товаров" value={dashboardQuery.data?.activeItems ?? 0} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Товары на складе</h2>
                <p className="mt-1 text-sm text-muted-foreground">Показываем остатки по выбранному складу.</p>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 pl-9"
                  placeholder="Поиск по названию, модели или артикулу"
                />
              </div>
            </div>

            {warehouseBalancesQuery.isLoading ? (
              <TableSkeleton columns={4} rows={5} />
            ) : (warehouseBalancesQuery.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={Package}
                title="На этом складе пока нет товаров"
                description="Оформите приход или выберите другой склад."
                cta={
                  <RoleGate permission="canDoReceipt">
                    <Button type="button" variant="outline" className={getOperationActionClassName('receipt')} onClick={() => setActiveOperation('receipt')}>
                      <TrendingUp className="h-4 w-4" />
                      {operationTypeLabel('receipt')}
                    </Button>
                  </RoleGate>
                }
              />
            ) : filteredBalances.length === 0 ? (
              <EmptyState icon={Search} title="Товары не найдены" description="Попробуйте другой запрос или очистите поиск." />
            ) : (
              <div data-no-pull-refresh="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredBalances.map((balance) => (
                  <Link key={balance.id} to={balance.items ? `/items/${balance.items.id}` : '/items'} className="surface-card-interactive block p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-semibold leading-5">{balance.items?.name ?? 'Товар без названия'}</p>
                        {balance.items?.model || balance.items?.sku ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {[balance.items?.model ? `Модель: ${balance.items.model}` : null, balance.items?.sku ? `Артикул: ${balance.items.sku}` : null]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm text-muted-foreground">{balance.items?.item_categories?.name || 'Без категории'}</p>
                      </div>
                      <div className="rounded-xl bg-[color:var(--surface-strong)] px-3 py-2 text-right">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Остаток</p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">{balance.quantity > 0 ? `${balance.quantity} шт` : 'Нет в наличии'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card grid overflow-hidden min-[360px]:grid-cols-2 xl:grid-cols-4">
            <MetricStat title="Склады" value={dashboardQuery.data?.activeWarehouses ?? 0} icon={Building2} />
            <MetricStat title="Товары" value={dashboardQuery.data?.activeItems ?? 0} icon={Package} />
            <MetricStat title="Категории" value={dashboardQuery.data?.activeCategories ?? 0} icon={Boxes} />
            <MetricStat title="Общий остаток" value={dashboardQuery.data?.totalBalance ?? 0} suffix="шт" icon={Scale} />
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
              <h2 className="text-lg font-semibold">Последние операции</h2>
              <Button asChild variant="outline" className="w-full min-[560px]:w-auto">
                <Link to="/history">Вся история</Link>
              </Button>
            </div>

            {dashboardQuery.isLoading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : (dashboardQuery.data?.latestOperations.length ?? 0) === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Операций пока нет"
                description="Проведите приход, расход или перемещение, и здесь появится последняя активность."
              />
            ) : (
              <div data-no-pull-refresh="true">
                <div className="grid gap-3 sm:grid-cols-2 2xl:hidden">
                  {(dashboardQuery.data?.latestOperations ?? []).map((operation) => (
                    <OperationCard key={operation.id} operation={operation} />
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-border 2xl:block">
                  <Table className="w-full table-auto">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Тип</TableHead>
                        <TableHead>Операция</TableHead>
                        <TableHead className="text-right">Кол-во</TableHead>
                        <TableHead>Откуда</TableHead>
                        <TableHead>Куда</TableHead>
                        <TableHead>Сотрудник</TableHead>
                        <TableHead>Время</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dashboardQuery.data?.latestOperations ?? []).map((operation) => (
                        <TableRow key={operation.id}>
                          <TableCell>
                            <Badge className={getOperationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">
                            <Link to={operation.items ? `/items/${operation.items.id}` : '/items'} className="block font-medium underline decoration-border underline-offset-4 hover:text-primary">
                              {operation.items?.name ?? '-'}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {operation.items?.model || '-'} / {operation.items?.sku || '-'}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-medium">{operation.quantity}</TableCell>
                          <TableCell>{operation.source_warehouse?.name ?? '-'}</TableCell>
                          <TableCell>{operation.destination_warehouse?.name ?? '-'}</TableCell>
                          <TableCell>{operation.profiles?.full_name || operation.profiles?.email || 'Система'}</TableCell>
                          <TableCell className="whitespace-normal text-sm">{formatDateTime(operation.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </section>

          {activeOperation ? (
            <OperationDrawer
              type={activeOperation}
              defaultWarehouseId={selectedWarehouseId}
              isOpen
              onClose={() => setActiveOperation(null)}
            />
          ) : null}

          <WarehouseFormModal open={isCreateWarehouseOpen} onOpenChange={setIsCreateWarehouseOpen} warehouse={null} />
        </>
      )}
    </div>
  )
}

function OperationCard({ operation }: { operation: DashboardOperation }) {
  return (
    <div className="surface-card p-5">
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
        <div className="min-w-0">
          <Badge className={getOperationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
          <Link
            to={operation.items ? `/items/${operation.items.id}` : '/items'}
            className="mt-2 block break-words font-medium underline decoration-border underline-offset-4 hover:text-primary"
          >
            {operation.items?.name ?? '-'}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {operation.items?.model || '-'} / {operation.items?.sku || '-'}
          </p>
        </div>
        <div className="min-[420px]:text-right">
          <p className="stat-label">Кол-во</p>
          <p className="text-lg font-semibold tabular-nums">{operation.quantity}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground min-[720px]:grid-cols-2">
        <p>
          <span className="font-medium text-foreground">Маршрут: </span>
          {operation.source_warehouse?.name ?? '-'} {'->'} {operation.destination_warehouse?.name ?? '-'}
        </p>
        <p>
          <span className="font-medium text-foreground">Сотрудник: </span>
          {operation.profiles?.full_name || operation.profiles?.email || 'Система'}
        </p>
        <p className="min-[720px]:col-span-2">
          <span className="font-medium text-foreground">Время: </span>
          {formatDateTime(operation.created_at)}
        </p>
      </div>
    </div>
  )
}

function OperationActionButton({
  type,
  icon: Icon,
  label,
  onClick,
}: {
  type: OperationType
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <Button type="button" variant="default" className={`h-auto min-h-11 w-full justify-start px-4 py-3 text-left whitespace-normal ${getOperationActionClassName(type)}`} onClick={onClick}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{cleanOperationLabel(label)}</span>
    </Button>
  )
}

function WarehouseMiniStat({ title, value, suffix }: { title: string; value: number; suffix?: string }) {
  return (
    <div className="metric-tile">
      <p className="stat-label">{title}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value}
        {suffix ? ` ${suffix}` : ''}
      </p>
    </div>
  )
}

function MetricStat({
  title,
  value,
  suffix,
  icon: Icon,
}: {
  title: string
  value: number
  suffix?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 min-[360px]:border-r min-[360px]:even:border-r-0 xl:border-b-0 xl:border-r xl:last:border-r-0 xl:[&:nth-child(4)]:border-r-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-strong)] text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold leading-6 tabular-nums sm:text-xl">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </p>
      </div>
    </div>
  )
}

