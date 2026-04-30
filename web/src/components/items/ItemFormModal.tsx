import { zodResolver } from '@hookform/resolvers/zod'
import { Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useActiveCategoriesQuery } from '@/hooks/useCategories'
import { useUpsertItemMutation, type ItemRow } from '@/hooks/useItems'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useViewportBottomInset, useViewportHeight } from '@/hooks/useViewportHeight'
import { supabase } from '@/lib/supabase'
import { createCancelActionClassName, createSubmitActionClassName } from '@/lib/utils'

const itemSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  category_id: z.string().min(1, 'Категория обязательна'),
  model: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  purchase_price: z.string().optional(),
  sale_price: z.string().optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

type ItemFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: ItemRow | null
}

function scrollFieldIntoView(event: React.FocusEvent<HTMLElement>) {
  window.setTimeout(() => {
    event.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, 360)
}

export function ItemFormModal({ open, onOpenChange, item }: ItemFormModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const viewportHeight = useViewportHeight(open && !isDesktop)
  const viewportBottomInset = useViewportBottomInset(open && !isDesktop)
  const categoriesQuery = useActiveCategoriesQuery()
  const upsertItem = useUpsertItemMutation()
  const itemImageKey = item?.id ?? 'new'
  const [uploadedPhoto, setUploadedPhoto] = useState<{ key: string; url: string | null }>({
    key: itemImageKey,
    url: item?.image_url ?? null,
  })
  const uploadedUrl = uploadedPhoto.key === itemImageKey ? uploadedPhoto.url : item?.image_url ?? null
  const [uploading, setUploading] = useState(false)
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name ?? '',
      category_id: item?.category_id ?? '',
      model: item?.model ?? '',
      sku: item?.sku ?? '',
      description: item?.description ?? '',
      purchase_price: item?.purchase_price ?? '',
      sale_price: item?.sale_price ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      name: item?.name ?? '',
      category_id: item?.category_id ?? '',
      model: item?.model ?? '',
      sku: item?.sku ?? '',
      description: item?.description ?? '',
      purchase_price: item?.purchase_price ?? '',
      sale_price: item?.sale_price ?? '',
    })
    const resetUploadedPhoto = window.setTimeout(() => {
      setUploadedPhoto({
        key: itemImageKey,
        url: item?.image_url ?? null,
      })
    }, 0)

    return () => window.clearTimeout(resetUploadedPhoto)
  }, [form, item, itemImageKey, open])

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('not_authenticated')
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('invalid_file_type')
      }

      const extension = file.name.split('.').pop() || 'jpg'
      const path = `items/${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from('item-photos').upload(path, file, { upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('item-photos').getPublicUrl(path)
      setUploadedPhoto({ key: itemImageKey, url: data.publicUrl })
      toast.success('Фото загружено')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message === 'not_authenticated') {
        toast.error('Войдите в систему заново и повторите загрузку')
      } else if (message === 'invalid_file_type') {
        toast.error('Выберите файл изображения')
      } else if (message.includes('row-level security') || message.includes('Unauthorized')) {
        toast.error('Нет прав на загрузку фото. Проверьте Storage policies для item-photos')
      } else {
        toast.error('Не удалось загрузить фото')
      }
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (values: ItemFormValues) => {
    await upsertItem.mutateAsync({
      id: item?.id,
      name: values.name.trim(),
      category_id: values.category_id,
      model: values.model?.trim() || null,
      sku: values.sku?.trim() || null,
      description: values.description?.trim() || null,
      purchase_price: values.purchase_price?.trim() || null,
      sale_price: values.sale_price?.trim() || null,
      specs_json: null,
      image_url: uploadedUrl,
    })
    toast.success(item ? 'Товар обновлён' : 'Товар создан')
    onOpenChange(false)
  }

  const body = (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-6 pt-1 sm:px-0">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="item-name">Название</Label>
            <Input
              id="item-name"
              enterKeyHint="next"
              autoComplete="off"
              {...form.register('name')}
              onFocus={scrollFieldIntoView}
            />
            {form.formState.errors.name ? (
              <p className="error-banner text-xs">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Controller
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 w-full text-base" onFocus={scrollFieldIntoView}>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categoriesQuery.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.category_id ? (
              <p className="error-banner text-xs">
                {form.formState.errors.category_id.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="item-model">Модель</Label>
            <Input id="item-model" enterKeyHint="next" {...form.register('model')} onFocus={scrollFieldIntoView} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-sku">SKU</Label>
            <Input id="item-sku" enterKeyHint="next" {...form.register('sku')} onFocus={scrollFieldIntoView} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-description">Описание</Label>
          <Textarea id="item-description" rows={4} {...form.register('description')} onFocus={scrollFieldIntoView} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="item-purchase-price">Закупочная цена</Label>
            <Input id="item-purchase-price" inputMode="decimal" enterKeyHint="next" {...form.register('purchase_price')} onFocus={scrollFieldIntoView} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-sale-price">Цена продажи</Label>
            <Input id="item-sale-price" inputMode="decimal" enterKeyHint="done" {...form.register('sale_price')} onFocus={scrollFieldIntoView} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Фото</Label>
          <label
            htmlFor="item-photo-input"
            className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-center transition-colors hover:border-foreground/40 hover:bg-muted/30"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files?.[0]
              if (file) void uploadPhoto(file)
            }}
          >
            <Upload className="size-5 text-muted-foreground" />
            <span className="max-w-[16rem] text-sm text-muted-foreground">
              {uploading ? 'Загрузка...' : 'Перетащите фото или нажмите для выбора'}
            </span>
          </label>

          <Input
            id="item-photo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void uploadPhoto(file)
            }}
          />

          {uploadedUrl ? (
            <div className="space-y-2">
              <img src={uploadedUrl} alt="Фото товара" className="h-32 w-32 rounded-md object-cover" />
              <Button type="button" variant="outline" size="sm" className="rounded-md" onClick={() => setUploadedPhoto({ key: itemImageKey, url: null })}>
                Удалить фото
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto border-t bg-background/95 px-1 pt-4 pb-[calc(0.25rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-0">
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className={createCancelActionClassName()} onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" className={createSubmitActionClassName()} disabled={upsertItem.isPending || uploading}>
            {upsertItem.isPending ? 'Сохраняем...' : item ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </div>
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid max-h-[90dvh] max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader className="pr-10">
            <DialogTitle>{item ? 'Редактировать товар' : 'Создать товар'}</DialogTitle>
            <DialogDescription>Заполните карточку товара.</DialogDescription>
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
        showCloseButton={false}
        className="w-full max-h-[100dvh] overflow-hidden rounded-t-2xl border-t pb-0"
        style={{
          height: viewportHeight ? `${viewportHeight}px` : '100dvh',
          bottom: viewportBottomInset ? `${viewportBottomInset}px` : '0px',
        }}
      >
        <SheetHeader className="shrink-0 border-b bg-background px-4 pb-4 pt-5 text-left">
          <SheetTitle>{item ? 'Редактировать товар' : 'Создать товар'}</SheetTitle>
          <SheetDescription>Заполните карточку товара.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-4">{body}</div>
      </SheetContent>
    </Sheet>
  )
}
