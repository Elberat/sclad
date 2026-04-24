import { useMemo, useState } from 'react'
import { ArrowRightLeft, Building2, Package, ReceiptText, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { RoleGate } from '@/components/shared/RoleGate'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { OperationDrawer } from '@/components/warehouses/OperationDrawer'
import { WarehouseFormModal } from '@/components/warehouses/WarehouseFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useArchiveWarehouseMutation,
  useWarehouseBalancesQuery,
  useWarehouseByIdQuery,
  useWarehouseOperationsQuery,
  type WarehouseOperation,
} from '@/hooks/useWarehouses'
import { createArchiveActionClassName, createEditActionClassName } from '@/lib/utils'

type OperationFilter = 'all' | 'receipt' | 'sale' | 'transfer'

export function WarehouseDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [search, setSearch] = useState('')
  const [operationFilter, setOperationFilter] = useState<OperationFilter>('all')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [operationType, setOperationType] = useState<'receipt' | 'sale' | 'transfer' | null>(null)
  const warehouseQuery = useWarehouseByIdQuery(id)
  const balancesQuery = useWarehouseBalancesQuery(id)
  const operationsQuery = useWarehouseOperationsQuery(id)
  const archiveMutation = useArchiveWarehouseMutation()

  const hasPositiveBalance = useMemo(
    () => (balancesQuery.data ?? []).some((balance) => balance.quantity > 0),
    [balancesQuery.data],
  )

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return balancesQuery.data ?? []

    return (balancesQuery.data ?? []).filter((balance) => {
      const name = balance.items?.name?.toLowerCase() ?? ''
      const model = balance.items?.model?.toLowerCase() ?? ''
      const sku = balance.items?.sku?.toLowerCase() ?? ''
      return name.includes(query) || model.includes(query) || sku.includes(query)
    })
  }, [balancesQuery.data, search])

  const filteredOperations = useMemo(() => {
    const operations = operationsQuery.data ?? []
    if (operationFilter === 'all') return operations
    return operations.filter((operation) => operation.type === operationFilter)
  }, [operationFilter, operationsQuery.data])

  if (!id) {
    return <EmptyState icon={Building2} title="Склад не найден" description="Проверьте корректность ссылки." />
  }

  const handleArchiveToggle = async () => {
    if (!warehouseQuery.data) return
    const nextIsActive = !warehouseQuery.data.is_active
    await archiveMutation.mutateAsync({ id: warehouseQuery.data.id, nextIsActive })
    toast.success(nextIsActive ? 'Склад восстановлен' : 'Склад архивирован')
  }

  const archiveAction =
    warehouseQuery.data && warehouseQuery.data.is_active ? (
      hasPositiveBalance ? (
        <ConfirmDialog
          title="Архивация заблокирована"
          description="Нельзя архивировать склад с остатками"
          confirmText="Понятно"
          cancelText="Закрыть"
          onConfirm={() => toast.error('Нельзя архивировать склад с остатками')}
          trigger={
            <Button variant="outline" className={createArchiveActionClassName()} disabled={archiveMutation.isPending}>
              Архивировать
            </Button>
          }
        />
      ) : (
        <ConfirmDialog
          title="Архивировать склад?"
          description="Склад перестанет отображаться в активных списках."
          confirmText="Архивировать"
          onConfirm={() => void handleArchiveToggle()}
          trigger={
            <Button variant="outline" className={createArchiveActionClassName()} disabled={archiveMutation.isPending}>
              Архивировать
            </Button>
          }
        />
      )
    ) : (
      <Button variant="outline" className={createArchiveActionClassName()} onClick={() => void handleArchiveToggle()} disabled={archiveMutation.isPending}>
        Восстановить
      </Button>
    )

  return (
    <div className="space-y-5">
      {warehouseQuery.isLoading ? (
        <TableSkeleton columns={2} rows={2} />
      ) : warehouseQuery.isError || !warehouseQuery.data ? (
        <EmptyState icon={Building2} title="Склад не найден" description="Возможно, он был удалён или недоступен." />
      ) : (
        <div className="rounded-md border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight">{warehouseQuery.data.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{warehouseQuery.data.description || 'Без описания'}</p>
            </div>
            <Badge variant={warehouseQuery.data.is_active ? 'default' : 'secondary'}>
              {warehouseQuery.data.is_active ? 'Активный' : 'Архивный'}
            </Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <RoleGate permission="canEditWarehouse">
              <Button variant="outline" size="sm" className={createEditActionClassName()} onClick={() => setIsEditOpen(true)}>
                Редактировать
              </Button>
            </RoleGate>
            <RoleGate permission="canArchiveWarehouse">{archiveAction}</RoleGate>
          </div>
        </div>
      )}

      {warehouseQuery.data ? (
        <WarehouseFormModal
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          warehouse={{
            id: warehouseQuery.data.id,
            name: warehouseQuery.data.name,
            description: warehouseQuery.data.description,
          }}
        />
      ) : null}

      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[auto_minmax(280px,380px)] md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Товары на складе</h2>
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Поиск по названию, модели или SKU"
            />
          </div>
        </div>

        {balancesQuery.isLoading ? (
          <TableSkeleton columns={5} rows={6} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Товаров нет"
            description={search ? 'По вашему запросу ничего не найдено.' : 'На складе пока нет товаров.'}
          />
        ) : (
          <div data-no-pull-refresh="true">
            <div className="grid gap-3 md:hidden">
              {filteredItems.map((balance) => (
                <Link
                  key={balance.id}
                  to={balance.items?.id ? `/items/${balance.items.id}` : '/items'}
                  className="block rounded-md border bg-card p-4 shadow-sm active:bg-muted/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium leading-5">{balance.items?.name || 'Без названия'}</p>
                      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        <p>{balance.items?.model || 'Без модели'}</p>
                        <p>SKU: {balance.items?.sku || '-'}</p>
                        <p>{balance.items?.item_categories?.name || 'Без категории'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Остаток</p>
                      <p className="text-lg font-semibold tabular-nums">{balance.quantity}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-md border md:block">
              <Table className="w-full table-fixed md:table-auto">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[58%] md:w-auto">Товар</TableHead>
                  <TableHead className="hidden md:table-cell">Модель</TableHead>
                  <TableHead className="hidden md:table-cell">SKU</TableHead>
                  <TableHead className="hidden md:table-cell">Категория</TableHead>
                  <TableHead className="w-[42%] text-right md:w-auto">Остаток</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((balance) => (
                  <TableRow key={balance.id}>
                    <TableCell className="whitespace-normal break-words">
                      <span className="font-medium">{balance.items?.name || 'Без названия'}</span>
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground md:hidden">
                        <p>{balance.items?.model || '-'} / {balance.items?.sku || '-'}</p>
                        <p>{balance.items?.item_categories?.name || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{balance.items?.model || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{balance.items?.sku || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{balance.items?.item_categories?.name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{balance.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Быстрые действия</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <RoleGate permission="canDoReceipt">
            <Button variant="outline" size="sm" className={quickOperationButtonClassName('receipt')} onClick={() => setOperationType('receipt')}>
              <TrendingUp className="size-4" />
              Приход
            </Button>
          </RoleGate>
          <RoleGate permission="canDoTransfer">
            <Button variant="outline" size="sm" className={quickOperationButtonClassName('transfer')} onClick={() => setOperationType('transfer')}>
              <ArrowRightLeft className="size-4" />
              Перемещение
            </Button>
          </RoleGate>
          <RoleGate permission="canDoSale">
            <Button variant="outline" size="sm" className={quickOperationButtonClassName('sale')} onClick={() => setOperationType('sale')}>
              <TrendingDown className="size-4" />
              Расход
            </Button>
          </RoleGate>
        </div>
        {operationType ? (
          <OperationDrawer
            type={operationType}
            defaultWarehouseId={id}
            isOpen={Boolean(operationType)}
            onClose={() => setOperationType(null)}
          />
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Последние операции</h2>
          <Button asChild variant="outline" size="sm">
            <Link to={`/history?warehouseId=${id}`}>Все операции</Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <OperationFilterBadge value={operationFilter} filter="all" onClick={setOperationFilter}>
            Все
          </OperationFilterBadge>
          <OperationFilterBadge value={operationFilter} filter="receipt" onClick={setOperationFilter}>
            Приход
          </OperationFilterBadge>
          <OperationFilterBadge value={operationFilter} filter="transfer" onClick={setOperationFilter}>
            Перемещение
          </OperationFilterBadge>
          <OperationFilterBadge value={operationFilter} filter="sale" onClick={setOperationFilter}>
            Расход
          </OperationFilterBadge>
        </div>
        {operationsQuery.isLoading ? (
          <TableSkeleton columns={4} rows={5} />
        ) : filteredOperations.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Операции отсутствуют" description="По выбранному фильтру ничего не найдено." />
        ) : (
          <OperationsTable operations={filteredOperations} />
        )}
      </section>
    </div>
  )
}

function OperationFilterBadge({
  value,
  filter,
  onClick,
  children,
}: {
  value: OperationFilter
  filter: OperationFilter
  onClick: (value: OperationFilter) => void
  children: string
}) {
  const isActive = value === filter
  return (
    <button type="button" onClick={() => onClick(filter)}>
      <Badge variant={isActive ? 'default' : 'secondary'}>{children}</Badge>
    </button>
  )
}

function operationIcon(type: WarehouseOperation['type']) {
  if (type === 'receipt') return <TrendingUp className="size-4 text-emerald-600" />
  if (type === 'sale') return <TrendingDown className="size-4 text-rose-600" />
  return <ArrowRightLeft className="size-4 text-blue-600" />
}

function operationTypeLabel(type: WarehouseOperation['type']) {
  if (type === 'receipt') return 'Приход'
  if (type === 'sale') return 'Расход'
  return 'Перемещение'
}

function operationBadgeClassName(type: WarehouseOperation['type']) {
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

function quickOperationButtonClassName(type: WarehouseOperation['type']) {
  if (type === 'receipt') return 'gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
  if (type === 'sale') return 'gap-2 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800'
  return 'gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800'
}

function OperationsTable({ operations }: { operations: WarehouseOperation[] }) {
  return (
    <div data-no-pull-refresh="true">
      <div className="grid gap-3 md:hidden">
        {operations.map((operation) => (
          <div key={operation.id} className="rounded-md border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge className={operationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
                <p className="mt-2 break-words font-medium leading-5">{operation.items?.name || 'Без товара'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{operation.profiles?.full_name || operation.profiles?.email || 'Система'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Кол-во</p>
                <p className="text-lg font-semibold tabular-nums">{operation.quantity}</p>
              </div>
            </div>
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Время: </span>
              {formatDateTime(operation.created_at)}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-md border md:block">
        <Table className="w-full table-fixed md:table-auto">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="hidden md:table-cell">Тип</TableHead>
            <TableHead className="w-[58%] md:w-auto">Операция</TableHead>
            <TableHead className="w-[22%] text-right md:w-auto">Кол-во</TableHead>
            <TableHead className="hidden md:table-cell">Пользователь</TableHead>
            <TableHead className="w-[20%] md:hidden"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operations.map((operation) => (
            <TableRow key={operation.id}>
              <TableCell className="hidden md:table-cell">
                <span className="inline-flex items-center gap-2">
                  {operationIcon(operation.type)}
                  {operationTypeLabel(operation.type)}
                </span>
              </TableCell>
              <TableCell className="whitespace-normal break-words">
                <div className="mb-1 flex items-center gap-2 md:hidden">
                  {operationIcon(operation.type)}
                  <span className="text-xs font-medium uppercase tracking-wider">{operationTypeLabel(operation.type)}</span>
                </div>
                <span className="font-medium">{operation.items?.name || 'Без товара'}</span>
                <p className="mt-1 text-xs text-muted-foreground md:hidden">
                  {operation.profiles?.full_name || operation.profiles?.email || 'Система'}
                </p>
              </TableCell>
              <TableCell className="text-right font-medium">{operation.quantity}</TableCell>
              <TableCell className="hidden md:table-cell">{operation.profiles?.full_name || operation.profiles?.email || 'Система'}</TableCell>
              <TableCell className="md:hidden" />
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  )
}
