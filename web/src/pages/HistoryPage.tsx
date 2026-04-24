import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ReceiptText } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useItemsQuery } from '@/hooks/useItems'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useWarehousesQuery } from '@/hooks/useWarehouses'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 50
type OperationType = 'receipt' | 'sale' | 'transfer'

type HistoryOperation = {
  id: string
  item_id: string
  type: OperationType
  quantity: number
  created_at: string
  comment: string | null
  items: { name: string; model: string | null; sku: string | null } | null
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const warehousesQuery = useWarehousesQuery()
  const itemsQuery = useItemsQuery()
  usePullToRefresh(['history-operations'])

  const page = Number(searchParams.get('page') ?? '1') || 1
  const warehouseId = searchParams.get('warehouseId') ?? ''
  const itemId = searchParams.get('itemId') ?? ''
  const type = (searchParams.get('type') ?? '') as '' | OperationType
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const hasActiveFilters = Boolean(warehouseId || itemId || type || dateFrom || dateTo)

  const operationsQuery = useQuery({
    queryKey: ['history-operations', { page, warehouseId, itemId, type, dateFrom, dateTo }],
    queryFn: async (): Promise<{ rows: HistoryOperation[]; count: number }> => {
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('inventory_operations')
        .select(
          `*, items(name,model,sku),
      source_warehouse:warehouses!source_warehouse_id(name),
      destination_warehouse:warehouses!destination_warehouse_id(name),
      profiles(full_name,email)`,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (warehouseId) {
        query = query.or(`source_warehouse_id.eq.${warehouseId},destination_warehouse_id.eq.${warehouseId}`)
      }
      if (itemId) query = query.eq('item_id', itemId)
      if (type) query = query.eq('type', type)
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

      const { data, count, error } = await query
      if (error) throw error
      return { rows: (data ?? []) as HistoryOperation[], count: count ?? 0 }
    },
  })

  const totalPages = Math.max(1, Math.ceil((operationsQuery.data?.count ?? 0) / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const pageButtons = useMemo(() => {
    const result: number[] = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)
    for (let index = start; index <= end; index += 1) result.push(index)
    return result
  }, [currentPage, totalPages])

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setSearchParams(next)
  }

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
  }

  const resetFilters = () => setSearchParams(new URLSearchParams())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">История</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Журнал операций по складу с фильтрацией и пагинацией.</p>
      </div>

      <Card size="sm">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
            <div>
              <CardTitle className="text-base">Фильтры</CardTitle>
              <CardDescription>Параметры сохраняются в URL, ссылкой можно делиться.</CardDescription>
            </div>
            {hasActiveFilters ? (
              <Button type="button" variant="outline" size="sm" className="w-full min-[520px]:w-auto" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Склад</Label>
            <Select value={warehouseId || 'all'} onValueChange={(value) => updateFilter('warehouseId', value === 'all' ? '' : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Все склады" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все склады</SelectItem>
                {(warehousesQuery.data ?? [])
                  .filter((warehouse) => warehouse.is_active)
                  .map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Товар</Label>
            <Select value={itemId || 'all'} onValueChange={(value) => updateFilter('itemId', value === 'all' ? '' : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Все товары" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все товары</SelectItem>
                {(itemsQuery.data ?? [])
                  .filter((item) => item.is_active)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={type || 'all'} onValueChange={(value) => updateFilter('type', value === 'all' ? '' : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="receipt">Приход</SelectItem>
                <SelectItem value="sale">Расход</SelectItem>
                <SelectItem value="transfer">Перемещение</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-from">Дата от</Label>
            <Input id="date-from" type="date" value={dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to">Дата до</Label>
            <Input id="date-to" type="date" value={dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} />
          </div>
        </CardContent>
      </Card>

      {operationsQuery.isLoading ? (
        <TableSkeleton columns={6} rows={6} />
      ) : (operationsQuery.data?.rows.length ?? 0) === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={hasActiveFilters ? 'Операции не найдены' : 'Операций пока нет'}
          description={hasActiveFilters ? 'Поменяйте или сбросьте фильтры.' : 'Здесь появится журнал приходов, расходов и перемещений.'}
          cta={
            hasActiveFilters ? (
              <Button type="button" variant="outline" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            ) : null
          }
        />
      ) : (
        <div data-no-pull-refresh="true">
          <div className="grid gap-3 md:hidden">
            {(operationsQuery.data?.rows ?? []).map((operation) => (
              <div key={operation.id} className="rounded-md border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge className={operationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
                    <Link to={operation.item_id ? `/items/${operation.item_id}` : '/items'} className="mt-2 block break-words font-medium underline">
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
                {(operationsQuery.data?.rows ?? []).map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell className="hidden md:table-cell">
                      <Badge className={operationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      <div className="mb-1 md:hidden">
                        <Badge className={operationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
                      </div>
                      <Link to={operation.item_id ? `/items/${operation.item_id}` : '/items'} className="block font-medium underline">
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

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious disabled={currentPage <= 1} onClick={() => goToPage(Math.max(1, currentPage - 1))} />
          </PaginationItem>
          {pageButtons.map((value) => (
            <PaginationItem key={value}>
              <PaginationLink isActive={value === currentPage} onClick={() => goToPage(value)}>
                {value}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext disabled={currentPage >= totalPages} onClick={() => goToPage(Math.min(totalPages, currentPage + 1))} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
