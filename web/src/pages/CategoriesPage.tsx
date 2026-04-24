import { useMemo, useState } from 'react'
import { Boxes, Plus } from 'lucide-react'

import { CategoryFormModal } from '@/components/categories/CategoryFormModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { RoleGate } from '@/components/shared/RoleGate'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useArchiveCategoryMutation, useCategoriesQuery, type CategoryRow } from '@/hooks/useCategories'
import { createActionClassName, createArchiveActionClassName, createEditActionClassName } from '@/lib/utils'

type StatusFilter = 'active' | 'archived'

export function CategoriesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const categoriesQuery = useCategoriesQuery()
  const archiveMutation = useArchiveCategoryMutation()
  usePullToRefresh(['categories'])

  const filtered = useMemo(() => {
    const source = categoriesQuery.data ?? []
    return source.filter((category) => (statusFilter === 'active' ? category.is_active : !category.is_active))
  }, [categoriesQuery.data, statusFilter])

  const openCreateModal = () => {
    setEditingCategory(null)
    setModalOpen(true)
  }

  const openEditModal = (category: CategoryRow) => {
    setEditingCategory(category)
    setModalOpen(true)
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Категории"
        description="Управление категориями товаров."
        action={
          <RoleGate permission="canCreateCategory">
            <Button variant="outline" className={createActionClassName()} onClick={openCreateModal}>
              <Plus />
              Создать категорию
            </Button>
          </RoleGate>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusFilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
          Активные
        </StatusFilterButton>
        <StatusFilterButton active={statusFilter === 'archived'} onClick={() => setStatusFilter('archived')}>
          Архивные
        </StatusFilterButton>
      </div>

      {categoriesQuery.isLoading ? (
        <TableSkeleton columns={4} rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={statusFilter === 'active' ? 'Активных категорий нет' : 'Архивных категорий нет'}
          description={statusFilter === 'active' ? 'Создайте категории, чтобы быстрее группировать товары.' : 'Здесь появятся категории, которые вы архивируете.'}
          cta={
            statusFilter === 'active' ? (
              <RoleGate permission="canCreateCategory">
                <Button type="button" variant="outline" className={createActionClassName()} onClick={openCreateModal}>
                  <Plus />
                  Создать категорию
                </Button>
              </RoleGate>
            ) : null
          }
        />
      ) : (
        <div data-no-pull-refresh="true">
          <div className="mobile-list">
            {filtered.map((category) => (
              <div key={category.id} className="surface-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium leading-5">{category.name}</p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{category.description || 'Без описания'}</p>
                  </div>
                  <StatusBadge isActive={category.is_active} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
                  <RoleGate permission="canEditCategory">
                    <Button variant="outline" size="sm" className={createEditActionClassName()} onClick={() => openEditModal(category)}>
                      Редактировать
                    </Button>
                  </RoleGate>
                  <RoleGate permission="canArchiveCategory">
                    <ConfirmDialog
                      title={category.is_active ? 'Архивировать категорию?' : 'Восстановить категорию?'}
                      description={category.is_active ? 'Категория исчезнет из активных списков.' : 'Категория снова станет активной.'}
                      confirmText={category.is_active ? 'Архивировать' : 'Восстановить'}
                      onConfirm={() => void archiveMutation.mutateAsync({ id: category.id, nextIsActive: !category.is_active })}
                      trigger={
                        <Button variant="outline" size="sm" className={createArchiveActionClassName()}>
                          {category.is_active ? 'Архивировать' : 'Восстановить'}
                        </Button>
                      }
                    />
                  </RoleGate>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-md border md:block">
            <Table className="w-full table-fixed md:table-auto">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[44%] md:w-auto">Категория</TableHead>
                <TableHead className="hidden md:table-cell">Описание</TableHead>
                <TableHead className="w-[26%] md:w-auto">Статус</TableHead>
                <TableHead className="w-[30%] text-right md:w-auto">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="whitespace-normal break-words font-medium">
                    {category.name}
                    <p className="mt-1 text-xs font-normal text-muted-foreground md:hidden">{category.description || 'Без описания'}</p>
                  </TableCell>
                  <TableCell className="hidden max-w-[420px] whitespace-normal text-muted-foreground md:table-cell">
                    {category.description || 'Без описания'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge isActive={category.is_active} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap justify-end gap-2">
                      <RoleGate permission="canEditCategory">
                        <Button
                          variant="outline"
                          size="sm"
                          className={createEditActionClassName()}
                          onClick={() => openEditModal(category)}
                        >
                          <span className="hidden md:inline">Редактировать</span>
                          <span className="md:hidden">Изм.</span>
                        </Button>
                      </RoleGate>
                      <RoleGate permission="canArchiveCategory">
                        <ConfirmDialog
                          title={category.is_active ? 'Архивировать категорию?' : 'Восстановить категорию?'}
                          description={category.is_active ? 'Категория исчезнет из активных списков.' : 'Категория снова станет активной.'}
                          confirmText={category.is_active ? 'Архивировать' : 'Восстановить'}
                          onConfirm={() => void archiveMutation.mutateAsync({ id: category.id, nextIsActive: !category.is_active })}
                          trigger={
                            <Button variant="outline" size="sm" className={createArchiveActionClassName()}>
                              <span className="hidden md:inline">{category.is_active ? 'Архивировать' : 'Восстановить'}</span>
                              <span className="md:hidden">{category.is_active ? 'Арх.' : 'Восст.'}</span>
                            </Button>
                          }
                        />
                      </RoleGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </div>
      )}

      <CategoryFormModal open={modalOpen} onOpenChange={setModalOpen} category={editingCategory} />
    </div>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'text-emerald-700' : undefined}>
      {isActive ? 'Активная' : 'Архивная'}
    </Badge>
  )
}

function StatusFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="filter-segment"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
