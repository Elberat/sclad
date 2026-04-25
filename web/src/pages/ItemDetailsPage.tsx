import { useMemo, useState } from 'react'
import { ArrowRightLeft, Edit, Package, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ItemFormModal } from '@/components/items/ItemFormModal'
import { AppLoader } from '@/components/shared/AppLoader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { RoleGate } from '@/components/shared/RoleGate'
import { OperationDrawer } from '@/components/warehouses/OperationDrawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useArchiveItemMutation,
  useItemBalancesByWarehouseQuery,
  useItemByIdQuery,
  useItemOperationsQuery,
  type ItemOperation,
} from '@/hooks/useItems'
import {
  createArchiveActionClassName,
  createEditActionClassName,
  getOperationActionClassName,
  getOperationBadgeClassName,
  getOperationIconClassName,
} from '@/lib/utils'

export function ItemDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [operationType, setOperationType] = useState<'receipt' | 'sale' | 'transfer' | null>(null)
  const itemQuery = useItemByIdQuery(id)
  const balancesQuery = useItemBalancesByWarehouseQuery(id)
  const operationsQuery = useItemOperationsQuery(id)
  const archiveMutation = useArchiveItemMutation()

  const totalQuantity = useMemo(
    () => (balancesQuery.data ?? []).reduce((sum, balance) => sum + balance.quantity, 0),
    [balancesQuery.data],
  )

  if (!id) return <EmptyState icon={Package} title="Товар не найден" description="Проверьте ссылку." />
  if (itemQuery.isLoading) return <AppLoader label="Загружаем карточку товара" />
  if (!itemQuery.data) return <EmptyState icon={Package} title="Товар не найден" description="Запись отсутствует или недоступна." />

  const item = itemQuery.data

  return (
    <div className="page-shell">
      <Card className="overflow-visible">
        <CardHeader>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
            <div className="flex min-w-0 gap-4">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-24 w-24 shrink-0 rounded-xl object-cover md:h-28 md:w-28" />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground md:h-28 md:w-28">
                  Нет фото
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="break-words">{item.name}</CardTitle>
                  <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Активный' : 'Архивный'}</Badge>
                </div>
                <CardDescription>
                  {item.model || '-'} / {item.sku || '-'}
                </CardDescription>
                <p className="mt-2 text-sm text-muted-foreground">Категория: {item.item_categories?.name || 'Без категории'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:min-w-[360px]">
              <MetricTile label="Остаток" value={`${totalQuantity} шт`} tone={totalQuantity > 0 ? 'default' : 'muted'} />
              <MetricTile label="Закупка" value={item.purchase_price || '-'} />
              <MetricTile label="Продажа" value={item.sale_price || '-'} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <RoleGate permission="canEditItem">
              <Button variant="outline" className={createEditActionClassName()} onClick={() => setIsEditOpen(true)}>
                <Edit className="size-4" />
                Редактировать
              </Button>
            </RoleGate>
            <RoleGate permission="canArchiveItem">
              <ConfirmDialog
                title={item.is_active ? 'Архивировать товар?' : 'Восстановить товар?'}
                confirmText={item.is_active ? 'Архивировать' : 'Восстановить'}
                onConfirm={() =>
                  void archiveMutation
                    .mutateAsync({ id: item.id, nextIsActive: !item.is_active })
                    .then(() => toast.success(item.is_active ? 'Товар архивирован' : 'Товар восстановлен'))
                }
                trigger={<Button variant="outline" className={createArchiveActionClassName()}>{item.is_active ? 'Архивировать' : 'Восстановить'}</Button>}
              />
            </RoleGate>
          </div>
        </CardContent>
      </Card>

      <ItemFormModal open={isEditOpen} onOpenChange={setIsEditOpen} item={item} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Остатки по складам</h2>
        {(balancesQuery.data ?? []).length === 0 ? (
          <EmptyState icon={Package} title="Нет остатков" description="Товар не числится ни на одном складе" />
        ) : (
          <div data-no-pull-refresh="true">
            <div className="mobile-list">
              {(balancesQuery.data ?? []).map((balance) => (
                <div key={balance.id} className="surface-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 break-words font-medium">{balance.warehouses?.name || '-'}</p>
                    <p className="text-lg font-semibold tabular-nums">{balance.quantity}</p>
                  </div>
                </div>
              ))}
              <div className="surface-card bg-muted/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">Итого</p>
                  <p className="text-lg font-semibold tabular-nums">{totalQuantity} шт</p>
                </div>
              </div>
            </div>

            <div className="hidden overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Склад</TableHead>
                    <TableHead className="text-right">Количество</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(balancesQuery.data ?? []).map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell>{balance.warehouses?.name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{balance.quantity}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-bold">Итого</TableCell>
                    <TableCell className="text-right font-bold">{totalQuantity} шт</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Быстрые действия</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <RoleGate permission="canDoReceipt">
            <Button variant="default" className={getOperationActionClassName('receipt')} onClick={() => setOperationType('receipt')}>
              <TrendingUp className="size-4" />
              Приход
            </Button>
          </RoleGate>
          <RoleGate permission="canDoTransfer">
            <Button variant="default" className={getOperationActionClassName('transfer')} onClick={() => setOperationType('transfer')}>
              <ArrowRightLeft className="size-4" />
              Перемещение
            </Button>
          </RoleGate>
          <RoleGate permission="canDoSale">
            <Button variant="default" className={getOperationActionClassName('sale')} onClick={() => setOperationType('sale')}>
              <TrendingDown className="size-4" />
              Расход
            </Button>
          </RoleGate>
        </div>
        {operationType ? (
          <OperationDrawer
            type={operationType}
            defaultItemId={id}
            isOpen={Boolean(operationType)}
            onClose={() => setOperationType(null)}
          />
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">История по товару</h2>
          <Button asChild variant="outline">
            <Link to={`/history?itemId=${id}`}>Все операции</Link>
          </Button>
        </div>
        {(operationsQuery.data ?? []).length === 0 ? (
          <EmptyState icon={ReceiptText} title="Операций нет" description="Для товара пока не было движений." />
        ) : (
          <div data-no-pull-refresh="true">
            <div className="mobile-list">
              {(operationsQuery.data ?? []).map((operation) => (
                <div key={operation.id} className="surface-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge className={getOperationBadgeClassName(operation.type)}>{operationTypeLabel(operation.type)}</Badge>
                      <p className="mt-2 text-xs text-muted-foreground">{operation.profiles?.full_name || operation.profiles?.email || 'Система'}</p>
                    </div>
                    <div className="text-right">
                      <p className="stat-label">Кол-во</p>
                      <p className="text-lg font-semibold tabular-nums">{operation.quantity}</p>
                    </div>
                  </div>
                  <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Время: </span>
                    {formatDateTime(operation.created_at)}
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Количество</TableHead>
                    <TableHead>Пользователь</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(operationsQuery.data ?? []).map((operation) => (
                    <TableRow key={operation.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          {operationIcon(operation.type)}
                          {operationTypeLabel(operation.type)}
                        </span>
                      </TableCell>
                      <TableCell>{operation.quantity}</TableCell>
                      <TableCell>{operation.profiles?.full_name || operation.profiles?.email || 'Система'}</TableCell>
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

function operationIcon(type: ItemOperation['type']) {
  if (type === 'receipt') return <TrendingUp className={`size-4 ${getOperationIconClassName(type)}`} />
  if (type === 'sale') return <TrendingDown className={`size-4 ${getOperationIconClassName(type)}`} />
  return <ArrowRightLeft className={`size-4 ${getOperationIconClassName(type)}`} />
}

function operationTypeLabel(type: ItemOperation['type']) {
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

function MetricTile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'muted' }) {
  return (
    <div className="metric-tile">
      <p className="stat-label">{label}</p>
      <p className={`mt-1 break-words text-base font-semibold tabular-nums ${tone === 'muted' ? 'text-muted-foreground' : ''}`}>{value}</p>
    </div>
  )
}
