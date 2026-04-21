import { useMemo, useState } from 'react'
import { Package, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ItemFormModal } from '@/components/items/ItemFormModal'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { RoleGate } from '@/components/shared/RoleGate'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useActiveCategoriesQuery } from '@/hooks/useCategories'
import { useItemsQuery } from '@/hooks/useItems'
import { useWarehousesQuery } from '@/hooks/useWarehouses'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

type StockFilter = 'all' | 'in-stock' | 'out-of-stock'
type StatusFilter = 'active' | 'archived'

export function ItemsPage() {
  const itemsQuery = useItemsQuery()
  const categoriesQuery = useActiveCategoriesQuery()
  const warehousesQuery = useWarehousesQuery()
  usePullToRefresh(['items'])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const hasActiveFilters =
    search.trim() !== '' || categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'active' || warehouseFilter !== 'all'

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (itemsQuery.data ?? []).filter((item) => {
      if (statusFilter === 'active' && !item.is_active) return false
      if (statusFilter === 'archived' && item.is_active) return false
      if (categoryFilter !== 'all' && item.category_id !== categoryFilter) return false
      if (stockFilter === 'in-stock' && item.total_quantity <= 0) return false
      if (stockFilter === 'out-of-stock' && item.total_quantity > 0) return false
      if (warehouseFilter !== 'all' && !item.inventory_balances.some((balance) => balance.warehouse_id === warehouseFilter)) return false

      if (!query) return true
      return (
        item.name.toLowerCase().includes(query) ||
        (item.model ?? '').toLowerCase().includes(query) ||
        (item.sku ?? '').toLowerCase().includes(query)
      )
    })
  }, [itemsQuery.data, search, statusFilter, categoryFilter, stockFilter, warehouseFilter])

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setStockFilter('all')
    setStatusFilter('active')
    setWarehouseFilter('all')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Товары"
        description="Номенклатура и остатки."
        action={
          <RoleGate permission="canCreateItem">
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus />
              Создать товар
            </Button>
          </RoleGate>
        }
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="items-search">Поиск</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="items-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Название, модель, SKU"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {(categoriesQuery.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Склад</Label>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Склад" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все склады</SelectItem>
                {(warehousesQuery.data ?? []).filter((warehouse) => warehouse.is_active).map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Наличие</Label>
            <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as StockFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Наличие" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="in-stock">Есть</SelectItem>
                <SelectItem value="out-of-stock">Нет</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="archived">Архивные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {itemsQuery.isLoading ? (
        <TableSkeleton columns={5} rows={6} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? 'Товары не найдены' : 'Добавьте первый товар'}
          description={hasActiveFilters ? 'Поменяйте или сбросьте фильтры.' : 'Создайте карточку товара, чтобы начать вести остатки.'}
          cta={
            hasActiveFilters ? (
              <Button type="button" variant="outline" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            ) : (
              <RoleGate permission="canCreateItem">
                <Button type="button" onClick={() => setIsModalOpen(true)}>
                  <Plus />
                  Создать товар
                </Button>
              </RoleGate>
            )
          }
        />
      ) : (
        <div data-no-pull-refresh="true">
          <div className="grid gap-3 md:hidden">
            {filteredItems.map((item) => (
              <Link key={item.id} to={`/items/${item.id}`} className="block rounded-md border bg-card p-4 shadow-sm active:bg-muted/60">
                <div className="flex items-start gap-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">N/A</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words font-medium leading-5">{item.name}</p>
                      <Badge
                        variant={item.is_active ? 'default' : 'secondary'}
                        className={item.is_active ? 'text-emerald-700' : 'text-muted-foreground'}
                      >
                        {item.is_active ? 'Активный' : 'Архивный'}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      <p>{item.model || 'Без модели'}</p>
                      <p>SKU: {item.sku || '-'}</p>
                      <p>{item.item_categories?.name || 'Без категории'}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Остаток</span>
                  <span className="text-lg font-semibold tabular-nums">{item.total_quantity}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-md border md:block">
            <Table className="w-full table-fixed md:table-auto">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="hidden w-[72px] md:table-cell">Фото</TableHead>
                <TableHead className="w-[48%] md:w-auto">Товар</TableHead>
                <TableHead className="hidden md:table-cell">Модель</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="hidden md:table-cell">Категория</TableHead>
                <TableHead className="w-[24%] text-right md:w-auto">Остаток</TableHead>
                <TableHead className="w-[28%] md:w-auto">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="hidden md:table-cell">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">N/A</div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">
                    <Link className="font-medium hover:underline" to={`/items/${item.id}`}>
                      {item.name}
                    </Link>
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground md:hidden">
                      <p>{item.model || 'Без модели'}</p>
                      <p>SKU: {item.sku || '-'}</p>
                      <p>{item.item_categories?.name || 'Без категории'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{item.model || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{item.sku || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{item.item_categories?.name || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{item.total_quantity}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Активный' : 'Архивный'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ItemFormModal open={isModalOpen} onOpenChange={setIsModalOpen} item={null} />
    </div>
  )
}
