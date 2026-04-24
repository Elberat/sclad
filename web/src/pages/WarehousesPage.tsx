import { useMemo, useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { RoleGate } from '@/components/shared/RoleGate'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { WarehouseFormModal } from '@/components/warehouses/WarehouseFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useWarehousesQuery, type WarehouseWithCount } from '@/hooks/useWarehouses'
import { createActionClassName } from '@/lib/utils'

type FilterMode = 'active' | 'archived' | 'all'

export function WarehousesPage() {
  const [filterMode, setFilterMode] = useState<FilterMode>('active')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const warehousesQuery = useWarehousesQuery()
  usePullToRefresh(['warehouses'])

  const filteredWarehouses = useMemo(() => {
    const warehouses = warehousesQuery.data ?? []

    if (filterMode === 'all') return warehouses
    if (filterMode === 'active') return warehouses.filter((warehouse) => warehouse.is_active)
    return warehouses.filter((warehouse) => !warehouse.is_active)
  }, [filterMode, warehousesQuery.data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Склады"
        description="Список складов и остатки по позициям."
        action={
          <RoleGate permission="canCreateWarehouse">
            <Button variant="outline" className={createActionClassName()} onClick={() => setIsCreateOpen(true)}>
              <Plus />
              Создать склад
            </Button>
          </RoleGate>
        }
      />

      <div className="flex gap-2">
        <SegmentButton active={filterMode === 'active'} onClick={() => setFilterMode('active')}>
          Активные
        </SegmentButton>
        <SegmentButton active={filterMode === 'archived'} onClick={() => setFilterMode('archived')}>
          Архивные
        </SegmentButton>
        <SegmentButton active={filterMode === 'all'} onClick={() => setFilterMode('all')}>
          Все
        </SegmentButton>
      </div>

      {warehousesQuery.isLoading ? (
        <TableSkeleton columns={4} rows={6} />
      ) : warehousesQuery.isError ? (
        <EmptyState
          icon={Building2}
          title="Не удалось загрузить склады"
          description="Попробуйте обновить страницу или проверьте подключение к базе."
        />
      ) : filteredWarehouses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Склады не найдены"
          description="Измените фильтр или создайте новый склад."
          cta={
            <RoleGate permission="canCreateWarehouse">
              <Button type="button" variant="outline" className={createActionClassName()} onClick={() => setIsCreateOpen(true)}>
                <Plus />
                Создать склад
              </Button>
            </RoleGate>
          }
        />
      ) : (
        <WarehousesTable warehouses={filteredWarehouses} />
      )}

      <WarehouseFormModal open={isCreateOpen} onOpenChange={setIsCreateOpen} warehouse={null} />
    </div>
  )
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={
        active
          ? 'border-amber-300 bg-amber-50 text-amber-900 shadow-sm hover:border-amber-400 hover:bg-amber-100'
          : 'border-border bg-background text-foreground shadow-none hover:border-amber-200 hover:bg-amber-50 hover:text-amber-900'
      }
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Активный' : 'Архивный'}</Badge>
}

function WarehousesTable({ warehouses }: { warehouses: WarehouseWithCount[] }) {
  return (
    <div data-no-pull-refresh="true" className="overflow-hidden rounded-md border">
      <Table className="w-full table-fixed md:table-auto">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[46%] md:w-auto">Склад</TableHead>
            <TableHead className="hidden md:table-cell">Описание</TableHead>
            <TableHead className="w-[24%] text-right md:w-auto">Позиций</TableHead>
            <TableHead className="w-[30%] md:w-auto">Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="whitespace-normal break-words">
                <Link className="font-medium hover:underline" to={`/warehouses/${warehouse.id}`}>
                  {warehouse.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground md:hidden">{warehouse.description || 'Без описания'}</p>
              </TableCell>
              <TableCell className="hidden max-w-sm truncate text-muted-foreground md:table-cell">{warehouse.description || 'Без описания'}</TableCell>
              <TableCell className="text-right font-medium">{warehouse.itemsCount}</TableCell>
              <TableCell>
                <StatusBadge isActive={warehouse.is_active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
