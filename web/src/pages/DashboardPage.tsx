import { useQuery } from '@tanstack/react-query'
import { ArrowRightLeft, Boxes, Building2, Package, ReceiptText, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoleGate } from '@/components/shared/RoleGate'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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

function operationTypeLabel(type: OperationType) {
  if (type === 'receipt') return 'Приход'
  if (type === 'sale') return 'Расход'
  return 'Перемещение'
}

function operationBadgeClassName(type: OperationType) {
  if (type === 'receipt') return 'rounded-md bg-emerald-50 px-2 py-1 text-emerald-700'
  if (type === 'sale') return 'rounded-md bg-rose-50 px-2 py-1 text-rose-700'
  return 'rounded-md bg-blue-50 px-2 py-1 text-blue-700'
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DashboardPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
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

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        <Button variant="outline" size="sm" className="md:hidden" onClick={handleSignOut}>
          Выйти
        </Button>
      </div>

      <div className="rounded-md border p-3 md:hidden">
        <p className="truncate text-sm font-medium">{profile?.full_name || profile?.email || 'Пользователь'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{profile?.role}</p>
      </div>

      <section className="grid grid-cols-2 overflow-hidden rounded-md border md:grid-cols-4">
        <MetricStat title="Склады" value={dashboardQuery.data?.activeWarehouses ?? 0} icon={Building2} />
        <MetricStat title="Товары" value={dashboardQuery.data?.activeItems ?? 0} icon={Package} />
        <MetricStat title="Категории" value={dashboardQuery.data?.activeCategories ?? 0} icon={Boxes} />
        <MetricStat title="Остаток" value={dashboardQuery.data?.totalBalance ?? 0} suffix="шт" icon={Scale} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Быстрые операции</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <RoleGate permission="canDoReceipt">
            <OperationLink to="/operations/receipt" type="receipt" icon={TrendingUp} label="Приход" />
          </RoleGate>
          <RoleGate permission="canDoTransfer">
            <OperationLink to="/operations/transfer" type="transfer" icon={ArrowRightLeft} label="Перемещение" />
          </RoleGate>
          <RoleGate permission="canDoSale">
            <OperationLink to="/operations/sale" type="sale" icon={TrendingDown} label="Расход" />
          </RoleGate>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Последние 10 операций</h2>
          <Button asChild variant="outline">
            <Link to="/history">Вся история</Link>
          </Button>
        </div>

        {dashboardQuery.isLoading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : (dashboardQuery.data?.latestOperations.length ?? 0) === 0 ? (
          <EmptyState icon={ReceiptText} title="Операций пока нет" description="Проведите приход, расход или перемещение, и здесь появится последняя активность." />
        ) : (
          <div data-no-pull-refresh="true">
            <div className="grid gap-3 md:hidden">
              {(dashboardQuery.data?.latestOperations ?? []).map((operation) => (
                <OperationCard key={operation.id} operation={operation} />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-md border md:block">
              <Table className="w-full table-fixed md:table-auto">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="hidden md:table-cell">Тип</TableHead>
                  <TableHead className="w-[44%] md:w-auto">Операция</TableHead>
                  <TableHead className="w-[24%] text-right md:w-auto">Кол-во</TableHead>
                  <TableHead className="hidden md:table-cell">Откуда</TableHead>
                  <TableHead className="hidden md:table-cell">Куда</TableHead>
                  <TableHead className="hidden md:table-cell">Сотрудник</TableHead>
                  <TableHead className="w-[32%] md:w-auto">Время</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboardQuery.data?.latestOperations ?? []).map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell className="hidden md:table-cell">
                      <Badge className={operationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      <div className="mb-1 md:hidden">
                        <Badge className={operationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
                      </div>
                      <Link to={operation.items ? `/items/${operation.items.id}` : '/items'} className="block font-medium underline">
                        {operation.items?.name ?? '-'}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {operation.items?.model || '-'} / {operation.items?.sku || '-'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground md:hidden">
                        {operation.source_warehouse?.name ?? '-'} {'->'} {operation.destination_warehouse?.name ?? '-'}
                      </p>
                      <p className="text-xs text-muted-foreground md:hidden">{operation.profiles?.full_name || operation.profiles?.email || 'Система'}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium">{operation.quantity}</TableCell>
                    <TableCell className="hidden md:table-cell">{operation.source_warehouse?.name ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{operation.destination_warehouse?.name ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{operation.profiles?.full_name || operation.profiles?.email || 'Система'}</TableCell>
                    <TableCell className="whitespace-normal text-xs md:text-sm">{formatDateTime(operation.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function OperationCard({ operation }: { operation: DashboardOperation }) {
  return (
    <div className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge className={operationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
          <Link to={operation.items ? `/items/${operation.items.id}` : '/items'} className="mt-2 block break-words font-medium underline">
            {operation.items?.name ?? '-'}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {operation.items?.model || '-'} / {operation.items?.sku || '-'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Кол-во</p>
          <p className="text-lg font-semibold tabular-nums">{operation.quantity}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 border-t pt-3 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Маршрут: </span>
          {operation.source_warehouse?.name ?? '-'} {'->'} {operation.destination_warehouse?.name ?? '-'}
        </p>
        <p>
          <span className="font-medium text-foreground">Сотрудник: </span>
          {operation.profiles?.full_name || operation.profiles?.email || 'Система'}
        </p>
        <p>
          <span className="font-medium text-foreground">Время: </span>
          {formatDateTime(operation.created_at)}
        </p>
      </div>
    </div>
  )
}

function quickOperationClassName(type: OperationType) {
  if (type === 'receipt') return 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
  if (type === 'sale') return 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800'
  return 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800'
}

function OperationLink({
  to,
  type,
  icon: Icon,
  label,
}: {
  to: string
  type: OperationType
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Button asChild variant="outline" className={`justify-start gap-2 ${quickOperationClassName(type)}`}>
      <Link to={to}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </Button>
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
    <div className="flex items-center gap-3 border-b border-r px-3 py-3 last:border-r-0 even:border-r-0 md:border-b-0 md:even:border-r md:last:border-r-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold leading-6 tabular-nums">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </p>
      </div>
    </div>
  )
}
