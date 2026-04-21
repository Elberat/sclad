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
import { useUpsertWarehouseMutation } from '@/hooks/useWarehouses'

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

export function WarehouseFormModal({ open, onOpenChange, warehouse }: WarehouseFormModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
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
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="warehouse-name">Название</Label>
        <Input id="warehouse-name" placeholder="Например, Основной склад" {...form.register('name')} />
        {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="warehouse-description">Описание</Label>
        <Textarea
          id="warehouse-description"
          placeholder="Краткое описание склада"
          rows={4}
          {...form.register('description')}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
        <Button type="submit" disabled={upsertWarehouse.isPending}>
          {upsertWarehouse.isPending ? 'Сохраняем...' : warehouse ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
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
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="mt-4">{formBody}</div>
      </SheetContent>
    </Sheet>
  )
}
