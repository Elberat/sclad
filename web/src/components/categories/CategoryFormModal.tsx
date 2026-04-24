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
import { useViewportHeight } from '@/hooks/useViewportHeight'
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

function scrollFieldIntoView(event: React.FocusEvent<HTMLElement>) {
  window.setTimeout(() => {
    event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, 250)
}

function actionButtonClassName(kind: 'cancel' | 'submit', isCreate: boolean) {
  if (kind === 'submit') {
    return isCreate
      ? 'h-12 rounded-md border-emerald-700 bg-emerald-600 px-5 text-sm font-semibold tracking-[0.18em] text-white hover:bg-emerald-700'
      : 'h-12 rounded-md border-emerald-700 bg-emerald-600 px-5 text-sm font-semibold tracking-[0.18em] text-white hover:bg-emerald-700'
  }

  return 'h-12 rounded-md border-rose-700 bg-rose-600 px-5 text-sm font-semibold tracking-[0.14em] text-white hover:bg-rose-700'
}

export function CategoryFormModal({ open, onOpenChange, category }: CategoryFormModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const viewportHeight = useViewportHeight(open && !isDesktop)
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
  const isCreate = !category

  const body = (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-6 pt-1 sm:px-0">
        <div className="space-y-2">
          <Label htmlFor="category-name">Название</Label>
          <Input
            id="category-name"
            placeholder="Например, Кондиционеры"
            enterKeyHint="next"
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
          <Label htmlFor="category-description">Описание</Label>
          <Textarea
            id="category-description"
            rows={5}
            placeholder="Короткое описание для команды"
            enterKeyHint="done"
            {...form.register('description')}
            onFocus={scrollFieldIntoView}
          />
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto border-t bg-background/95 px-1 pt-4 pb-[calc(0.25rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-0">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" type="button" className={actionButtonClassName('cancel', isCreate)} onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" className={actionButtonClassName('submit', isCreate)} disabled={mutation.isPending}>
            {mutation.isPending ? 'Сохраняем...' : category ? 'Сохранить' : 'Создать'}
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
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-0"
        style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
      >
        <SheetHeader className="shrink-0 border-b px-4 pb-4 pt-5 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-4">{body}</div>
      </SheetContent>
    </Sheet>
  )
}
