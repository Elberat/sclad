import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useActiveCategoriesQuery } from '@/hooks/useCategories'
import { useUpsertItemMutation, type ItemRow } from '@/hooks/useItems'
import { supabase } from '@/lib/supabase'

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

export function ItemFormModal({ open, onOpenChange, item }: ItemFormModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
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
  }, [form, item, open])

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
    <form className="flex min-h-0 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-name">Название</Label>
          <Input id="item-name" {...form.register('name')} />
          {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Категория</Label>
          <Controller
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
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
            <p className="text-xs text-destructive">{form.formState.errors.category_id.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-model">Модель</Label>
          <Input id="item-model" {...form.register('model')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-sku">SKU</Label>
          <Input id="item-sku" {...form.register('sku')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="item-description">Описание</Label>
        <Textarea id="item-description" rows={3} {...form.register('description')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-purchase-price">Закупочная цена</Label>
          <Input id="item-purchase-price" {...form.register('purchase_price')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-sale-price">Цена продажи</Label>
          <Input id="item-sale-price" {...form.register('sale_price')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Фото</Label>
        <label
          htmlFor="item-photo-input"
          className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed p-4 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files?.[0]
            if (file) void uploadPhoto(file)
          }}
        >
          <Upload className="size-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{uploading ? 'Загрузка...' : 'Перетащите фото или нажмите для выбора'}</span>
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
            <Button type="button" variant="outline" size="sm" onClick={() => setUploadedPhoto({ key: itemImageKey, url: null })}>
              Удалить фото
            </Button>
          </div>
        ) : null}
      </div>
      </div>

      <div className="mt-4 flex shrink-0 justify-end gap-2 border-t bg-background pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
        <Button type="submit" disabled={upsertItem.isPending || uploading}>
          {upsertItem.isPending ? 'Сохраняем...' : 'Сохранить'}
        </Button>
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
      <SheetContent side="bottom" className="h-[90dvh] rounded-t-2xl pb-8">
        <SheetHeader className="shrink-0">
          <SheetTitle>{item ? 'Редактировать товар' : 'Создать товар'}</SheetTitle>
          <SheetDescription>Заполните карточку товара.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 px-8">{body}</div>
      </SheetContent>
    </Sheet>
  )
}
