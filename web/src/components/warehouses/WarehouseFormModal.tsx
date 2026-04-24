import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useViewportBottomInset, useViewportHeight } from '@/hooks/useViewportHeight'
import { useUpsertWarehouseMutation } from '@/hooks/useWarehouses'
import { createCancelActionClassName, createSubmitActionClassName } from '@/lib/utils'

const warehouseSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
})

type WarehouseFormValues = z.infer<typeof warehouseSchema>

type WarehouseFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse?: { id: string; name: string; description: string | null } | null
}

function scrollFieldIntoView(event: React.FocusEvent<HTMLElement>) {
  window.setTimeout(() => {
    event.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, 360)
}

export function WarehouseFormModal({ open, onOpenChange, warehouse }: WarehouseFormModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const viewportHeight = useViewportHeight(open && !isDesktop)
  const viewportBottomInset = useViewportBottomInset(open && !isDesktop)
  const upsertWarehouse = useUpsertWarehouseMutation()

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name ?? '',
      description: warehouse?.description ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      name: warehouse?.name ?? '',
      description: warehouse?.description ?? '',
    })
  }, [form, warehouse, open])

  const onSubmit = async (values: WarehouseFormValues) => {
    await upsertWarehouse.mutateAsync({
      id: warehouse?.id,
      name: values.name.trim(),
      description: values.description?.trim() || null,
    })

    toast.success(warehouse ? 'Склад обновлён' : 'Склад создан')
    onOpenChange(false)
  }

  const title = warehouse ? 'Редактировать склад' : 'Создать склад'
  const description = warehouse ? 'Измените данные склада.' : 'Заполните данные для нового склада.'

  const formBody = (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-6 pt-1 sm:px-0">
        <div className="space-y-2">
          <Label htmlFor="warehouse-name">Название</Label>
          <Input
            id="warehouse-name"
            placeholder="Например, Основной склад"
            enterKeyHint="next"
            autoComplete="organization"
            {...form.register('name')}
            onFocus={scrollFieldIntoView}
          />
          {form.formState.errors.name ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="warehouse-description">Описание</Label>
          <Textarea
            id="warehouse-description"
            placeholder="Краткое описание склада"
            rows={5}
            enterKeyHint="done"
            {...form.register('description')}
            onFocus={scrollFieldIntoView}
          />
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto border-t bg-background/95 px-1 pt-4 pb-[calc(0.25rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-0">
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className={createCancelActionClassName()} onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" className={createSubmitActionClassName()} disabled={upsertWarehouse.isPending}>
            {upsertWarehouse.isPending ? 'Сохраняем...' : warehouse ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </div>
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid max-h-[90dvh] max-w-xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader className="pr-10">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {formBody}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="w-full max-h-[100dvh] overflow-hidden rounded-t-2xl border-t pb-0"
        style={{
          height: viewportHeight ? `${viewportHeight}px` : '100dvh',
          bottom: viewportBottomInset ? `${viewportBottomInset}px` : '0px',
        }}
      >
        <SheetHeader className="shrink-0 border-b bg-background px-4 pb-4 pt-5 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-4">{formBody}</div>
      </SheetContent>
    </Sheet>
  )
}


