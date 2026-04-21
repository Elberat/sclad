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
import { useUpsertCategoryMutation, type CategoryRow } from '@/hooks/useCategories'

const categorySchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

type CategoryFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryRow | null
}

export function CategoryFormModal({ open, onOpenChange, category }: CategoryFormModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const mutation = useUpsertCategoryMutation()
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '', description: category?.description ?? '' },
  })

  useEffect(() => {
    form.reset({ name: category?.name ?? '', description: category?.description ?? '' })
  }, [category, form, open])

  const onSubmit = async (values: CategoryFormValues) => {
    await mutation.mutateAsync({
      id: category?.id,
      name: values.name.trim(),
      description: values.description?.trim() || null,
    })
    toast.success(category ? 'Категория обновлена' : 'Категория создана')
    onOpenChange(false)
  }

  const title = category ? 'Редактировать категорию' : 'Создать категорию'
  const description = category ? 'Обновите параметры категории.' : 'Добавьте новую категорию товаров.'

  const body = (
    <form className="flex min-h-0 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <div className="space-y-2">
          <Label htmlFor="category-name">Название</Label>
          <Input id="category-name" placeholder="Например, Кондиционеры" {...form.register('name')} />
          {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-description">Описание</Label>
          <Textarea id="category-description" rows={4} placeholder="Короткое описание для команды" {...form.register('description')} />
        </div>
      </div>
      <div className="mt-4 grid shrink-0 grid-cols-2 gap-2 border-t bg-background pt-4">
        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохраняем...' : 'Сохранить'}
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
          <div className="mt-2">{body}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90dvh] rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex min-h-0 flex-1 flex-col">{body}</div>
      </SheetContent>
    </Sheet>
  )
}
