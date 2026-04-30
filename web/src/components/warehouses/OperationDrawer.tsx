import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, PackageSearch, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useItemsQuery } from '@/hooks/useItems'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useViewportBottomInset, useViewportHeight } from '@/hooks/useViewportHeight'
import { useWarehousesQuery } from '@/hooks/useWarehouses'
import { cn, createOperationSubmitActionClassName } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type OperationType = 'receipt' | 'sale' | 'transfer'
type ReceiptFormValues = z.output<typeof receiptSchema>
type SaleFormValues = z.output<typeof saleSchema>
type TransferFormValues = z.output<typeof transferSchema>

type OperationDrawerProps = {
  type: OperationType
  defaultWarehouseId?: string
  defaultItemId?: string
  isOpen: boolean
  onClose: () => void
}

type SelectOption = {
  id: string
  name: string
  model: string | null
  sku: string | null
  categoryName?: string | null
  quantity?: number
}

type ReceiptItemRow = { item_id: string; quantity: number }
type QueryKeyPrefix = readonly unknown[]

const OPERATION_TITLES: Record<OperationType, string> = {
  receipt: 'Приход',
  sale: 'Расход',
  transfer: 'Перемещение',
}

const OPERATION_DESCRIPTIONS: Record<OperationType, string> = {
  receipt: 'Добавьте товары, которые приехали на склад.',
  sale: 'Выберите товар, который нужно списать со склада.',
  transfer: 'Переместите товар с одного склада на другой.',
}

const ACTION_TITLES: Record<OperationType, string> = {
  receipt: 'Оформить приход',
  sale: 'Оформить расход',
  transfer: 'Переместить',
}

const SUCCESS_MESSAGES: Record<OperationType, string> = {
  receipt: 'Приход оформлен',
  sale: 'Расход оформлен',
  transfer: 'Перемещение выполнено',
}

const ERROR_MESSAGES: Record<OperationType, string> = {
  receipt: 'Не удалось оформить приход',
  sale: 'Не удалось оформить расход',
  transfer: 'Не удалось выполнить перемещение',
}

function operationSubmitClassName(type: OperationType) {
  return createOperationSubmitActionClassName(type, 'min-h-[48px] w-full')
}

const itemQuantitySchema = z.object({
  item_id: z.string().min(1, 'Выберите товар'),
  quantity: z.coerce.number().int('Введите целое число').min(1, 'Количество должно быть больше 0'),
})

const receiptSchema = z.object({
  warehouse_id: z.string().min(1, 'Выберите склад'),
  items: z.array(itemQuantitySchema).min(1, 'Добавьте хотя бы один товар'),
})

const saleSchema = z.object({
  warehouse_id: z.string().min(1, 'Выберите склад'),
  item_id: z.string().min(1, 'Выберите товар'),
  quantity: z.coerce.number().int('Введите целое число').min(1, 'Количество должно быть больше 0'),
})

const transferSchema = z
  .object({
    source_warehouse_id: z.string().min(1, 'Выберите склад-источник'),
    destination_warehouse_id: z.string().min(1, 'Выберите склад-получатель'),
    item_id: z.string().min(1, 'Выберите товар'),
    quantity: z.coerce.number().int('Введите целое число').min(1, 'Количество должно быть больше 0'),
  })
  .refine((value) => value.source_warehouse_id !== value.destination_warehouse_id, {
    path: ['destination_warehouse_id'],
    message: 'Выберите другой склад-получатель',
  })

function getItemSearchText(item: SelectOption) {
  return [item.name, item.model, item.sku, item.categoryName].filter(Boolean).join(' ').toLowerCase()
}

function ItemCombobox({
  items,
  value,
  onChange,
  placeholder,
  disabled,
  emptyMessage,
}: {
  items: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  emptyMessage: string
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => getItemSearchText(item).includes(needle))
  }, [items, query])

  const selected = items.find((item) => item.id === value)

  return (
    <div className={cn('overflow-hidden rounded-xl border border-input bg-background', disabled ? 'opacity-60' : '')}>
      <Command className="bg-transparent">
        <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} disabled={disabled} />
        <CommandList className="max-h-72">
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          {filtered.map((item) => (
            <CommandItem
              key={item.id}
              value={getItemSearchText(item)}
              data-checked={item.id === value}
              onSelect={() => onChange(item.id)}
              disabled={disabled}
              className="items-start gap-3 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words text-sm font-semibold leading-5 text-foreground">{item.name}</p>
                  {typeof item.quantity === 'number' ? (
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">{item.quantity} шт</span>
                  ) : null}
                </div>
                {item.model || item.sku ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[item.model ? `Модель: ${item.model}` : null, item.sku ? `Артикул: ${item.sku}` : null].filter(Boolean).join(' • ')}
                  </p>
                ) : null}
                {item.categoryName ? <p className="mt-1 text-xs text-muted-foreground">{item.categoryName}</p> : null}
                {typeof item.quantity === 'number' ? <p className="mt-1 text-xs text-muted-foreground">В наличии: {item.quantity} шт</p> : null}
              </div>
              <Check className={cn('mt-0.5 h-4 w-4 shrink-0 text-primary', item.id === value ? 'opacity-100' : 'opacity-0')} />
            </CommandItem>
          ))}
        </CommandList>
      </Command>
      {selected ? (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          Выбрано: <span className="font-medium text-foreground">{selected.name}</span>
        </p>
      ) : null}
    </div>
  )
}

function DrawerFooter({
  onCancel,
  submitLabel,
  submitClassName,
  isSubmitting,
  error,
}: {
  onCancel: () => void
  submitLabel: string
  submitClassName: string
  isSubmitting: boolean
  error: string | null
}) {
  return (
    <div className="sticky bottom-0 mt-auto border-t bg-background/95 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5 lg:px-6">
      {error ? <p className="error-banner mb-3">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" className={submitClassName} disabled={isSubmitting}>
          {isSubmitting ? 'Сохраняем...' : submitLabel}
        </Button>
      </div>
    </div>
  )
}

function InlineState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof PackageSearch | typeof TriangleAlert
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
      <Icon className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  )
}

function getFriendlyErrorMessage(type: OperationType, error: unknown) {
  const rawMessage = error instanceof Error ? error.message : ''

  if (rawMessage.includes('insufficient_stock')) {
    const match = rawMessage.match(/(\d+)/)
    const available = match?.[1] ?? '0'
    return `На складе доступно только ${available} шт`
  }

  if (rawMessage.includes('same warehouse') || rawMessage.includes('source_warehouse_id') || rawMessage.includes('destination_warehouse_id')) {
    return 'Выберите другой склад-получатель'
  }

  if (rawMessage.includes('violates row-level security') || rawMessage.includes('permission')) {
    return 'Недостаточно прав для выполнения операции'
  }

  return ERROR_MESSAGES[type]
}

export function OperationDrawer({ type, defaultWarehouseId, defaultItemId, isOpen, onClose }: OperationDrawerProps) {
  const isLargeScreen = useMediaQuery('(min-width: 1024px)')
  const viewportHeight = useViewportHeight(isOpen && !isLargeScreen)
  const viewportBottomInset = useViewportBottomInset(isOpen && !isLargeScreen)
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const hasFixedItem = Boolean(defaultItemId)

  const warehousesQuery = useWarehousesQuery()
  const itemsQuery = useItemsQuery()

  const activeWarehouses = useMemo(
    () => (warehousesQuery.data ?? []).filter((warehouse) => warehouse.is_active),
    [warehousesQuery.data],
  )

  const itemOptions = useMemo<SelectOption[]>(
    () =>
      (itemsQuery.data ?? [])
        .filter((item) => item.is_active)
        .map((item) => ({
          id: item.id,
          name: item.name,
          model: item.model,
          sku: item.sku,
          categoryName: item.item_categories?.name ?? null,
        })),
    [itemsQuery.data],
  )

  const getWarehouseItemBalance = (warehouseId: string | undefined, itemId: string | undefined) => {
    if (!warehouseId || !itemId) return 0

    const item = (itemsQuery.data ?? []).find((entry) => entry.id === itemId)
    const balance = item?.inventory_balances.find((entry) => entry.warehouse_id === warehouseId)

    return balance?.quantity ?? 0
  }

  const receiptForm = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema) as never,
    defaultValues: {
      warehouse_id: defaultWarehouseId ?? '',
      items: [{ item_id: defaultItemId ?? '', quantity: 1 }],
    },
  })

  const saleForm = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as never,
    defaultValues: {
      warehouse_id: defaultWarehouseId ?? '',
      item_id: defaultItemId ?? '',
      quantity: 1,
    },
  })

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema) as never,
    defaultValues: {
      source_warehouse_id: defaultWarehouseId ?? '',
      destination_warehouse_id: '',
      item_id: defaultItemId ?? '',
      quantity: 1,
    },
  })

  const receiptItemsArray = useFieldArray({ control: receiptForm.control, name: 'items' })
  const receiptItems = useWatch({ control: receiptForm.control, name: 'items' })
  const receiptWarehouseId = useWatch({ control: receiptForm.control, name: 'warehouse_id' })
  const saleWarehouseId = useWatch({ control: saleForm.control, name: 'warehouse_id' })
  const saleItemId = useWatch({ control: saleForm.control, name: 'item_id' })
  const transferSourceWarehouseId = useWatch({ control: transferForm.control, name: 'source_warehouse_id' })
  const transferItemId = useWatch({ control: transferForm.control, name: 'item_id' })

  const saleItemOptions = useMemo<SelectOption[]>(() => {
    if (!saleWarehouseId) return []

    return (itemsQuery.data ?? [])
      .filter((item) => item.is_active)
      .map((item) => {
        const quantity = item.inventory_balances.find((balance) => balance.warehouse_id === saleWarehouseId)?.quantity ?? 0
        return {
          id: item.id,
          name: item.name,
          model: item.model,
          sku: item.sku,
          categoryName: item.item_categories?.name ?? null,
          quantity,
        }
      })
      .filter((item) => item.quantity > 0)
  }, [itemsQuery.data, saleWarehouseId])

  const transferItemOptions = useMemo<SelectOption[]>(() => {
    if (!transferSourceWarehouseId) return []

    return (itemsQuery.data ?? [])
      .filter((item) => item.is_active)
      .map((item) => {
        const quantity = item.inventory_balances.find((balance) => balance.warehouse_id === transferSourceWarehouseId)?.quantity ?? 0
        return {
          id: item.id,
          name: item.name,
          model: item.model,
          sku: item.sku,
          categoryName: item.item_categories?.name ?? null,
          quantity,
        }
      })
      .filter((item) => item.quantity > 0)
  }, [itemsQuery.data, transferSourceWarehouseId])

  const saleBalanceQuery = useQuery({
    queryKey: ['inventory-balance', saleWarehouseId, saleItemId],
    enabled: type === 'sale' && Boolean(saleWarehouseId && saleItemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_balances')
        .select('quantity')
        .eq('warehouse_id', saleWarehouseId)
        .eq('item_id', saleItemId)
        .maybeSingle()

      if (error) throw error
      return (data as { quantity: number } | null)?.quantity ?? 0
    },
  })

  const transferBalanceQuery = useQuery({
    queryKey: ['inventory-balance', transferSourceWarehouseId, transferItemId],
    enabled: type === 'transfer' && Boolean(transferSourceWarehouseId && transferItemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_balances')
        .select('quantity')
        .eq('warehouse_id', transferSourceWarehouseId)
        .eq('item_id', transferItemId)
        .maybeSingle()

      if (error) throw error
      return (data as { quantity: number } | null)?.quantity ?? 0
    },
  })

  const availableSaleBalance = saleBalanceQuery.data ?? 0
  const availableTransferBalance = transferBalanceQuery.data ?? 0

  useEffect(() => {
    if (!isOpen) return

    receiptForm.reset({
      warehouse_id: defaultWarehouseId ?? '',
      items: [{ item_id: defaultItemId ?? '', quantity: 1 }],
    })
    saleForm.reset({
      warehouse_id: defaultWarehouseId ?? '',
      item_id: defaultItemId ?? '',
      quantity: 1,
    })
    transferForm.reset({
      source_warehouse_id: defaultWarehouseId ?? '',
      destination_warehouse_id: '',
      item_id: defaultItemId ?? '',
      quantity: 1,
    })
  }, [defaultItemId, defaultWarehouseId, isOpen, receiptForm, saleForm, transferForm])

  useEffect(() => {
    if (type !== 'sale' || hasFixedItem) return
    if (!saleWarehouseId) {
      saleForm.setValue('item_id', '')
      return
    }
    if (saleItemId && !saleItemOptions.some((item) => item.id === saleItemId)) {
      saleForm.setValue('item_id', '')
    }
  }, [hasFixedItem, saleForm, saleItemId, saleItemOptions, saleWarehouseId, type])

  useEffect(() => {
    if (type !== 'transfer' || hasFixedItem) return
    if (!transferSourceWarehouseId) {
      transferForm.setValue('item_id', '')
      return
    }
    if (transferItemId && !transferItemOptions.some((item) => item.id === transferItemId)) {
      transferForm.setValue('item_id', '')
    }
  }, [hasFixedItem, transferForm, transferItemId, transferItemOptions, transferSourceWarehouseId, type])

  useEffect(() => {
    if (type !== 'sale') return
    if (!saleItemId || !saleWarehouseId) return
    const quantity = saleForm.getValues('quantity')
    if (quantity > availableSaleBalance) {
      saleForm.setValue('quantity', Math.max(1, availableSaleBalance))
    }
  }, [availableSaleBalance, saleForm, saleItemId, saleWarehouseId, type])

  useEffect(() => {
    if (type !== 'transfer') return
    if (!transferItemId || !transferSourceWarehouseId) return
    const quantity = transferForm.getValues('quantity')
    if (quantity > availableTransferBalance) {
      transferForm.setValue('quantity', Math.max(1, availableTransferBalance))
    }
  }, [availableTransferBalance, transferForm, transferItemId, transferSourceWarehouseId, type])

  const closeDrawer = () => {
    setSubmitError(null)
    onClose()
  }

  const handleSubmitError = (operationType: OperationType, error: unknown) => {
    console.error(error)
    const message = getFriendlyErrorMessage(operationType, error)
    setSubmitError(message)
    toast.error(message)
  }

  const refreshAfterSuccess = async () => {
    const affectedQueryKeys: QueryKeyPrefix[] = [
      ['warehouses'],
      ['warehouse'],
      ['warehouse-balances'],
      ['warehouse-operations'],
      ['items'],
      ['item'],
      ['item-balances-by-warehouse'],
      ['item-operations'],
      ['inventory-balance'],
      ['history-operations'],
      ['dashboard'],
    ]

    await Promise.all(affectedQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey, refetchType: 'none' })))
    await Promise.all(affectedQueryKeys.map((queryKey) => queryClient.refetchQueries({ queryKey, type: 'active' })))
  }

  const submitReceipt = receiptForm.handleSubmit(async (values) => {
    try {
      setSubmitError(null)
      const payload: ReceiptItemRow[] = values.items.map((entry: ReceiptFormValues['items'][number]) => ({
        item_id: entry.item_id,
        quantity: Number(entry.quantity),
      }))
      const { error } = await supabase.rpc('create_receipt', {
        p_warehouse_id: values.warehouse_id,
        p_items: payload,
        p_comment: null,
      } as never)
      if (error) throw error

      toast.success(SUCCESS_MESSAGES.receipt)
      await refreshAfterSuccess()
      closeDrawer()
    } catch (error) {
      handleSubmitError('receipt', error)
    }
  })

  const submitSale = saleForm.handleSubmit(async (values) => {
    try {
      setSubmitError(null)
      if (values.quantity > availableSaleBalance) {
        saleForm.setError('quantity', { message: `На складе доступно только ${availableSaleBalance} шт` })
        return
      }

      const { error } = await supabase.rpc('create_sale', {
        p_warehouse_id: values.warehouse_id,
        p_item_id: values.item_id,
        p_quantity: Number(values.quantity),
        p_comment: null,
      } as never)
      if (error) throw error

      toast.success(SUCCESS_MESSAGES.sale)
      await refreshAfterSuccess()
      closeDrawer()
    } catch (error) {
      handleSubmitError('sale', error)
    }
  })

  const submitTransfer = transferForm.handleSubmit(async (values) => {
    try {
      setSubmitError(null)
      if (values.quantity > availableTransferBalance) {
        transferForm.setError('quantity', { message: `На складе доступно только ${availableTransferBalance} шт` })
        return
      }

      const { error } = await supabase.rpc('create_transfer', {
        p_source_warehouse_id: values.source_warehouse_id,
        p_destination_warehouse_id: values.destination_warehouse_id,
        p_item_id: values.item_id,
        p_quantity: Number(values.quantity),
        p_comment: null,
      } as never)
      if (error) throw error

      toast.success(SUCCESS_MESSAGES.transfer)
      await refreshAfterSuccess()
      closeDrawer()
    } catch (error) {
      handleSubmitError('transfer', error)
    }
  })

  const sharedSheetContentClassName = isLargeScreen
    ? 'h-[100dvh] w-[min(560px,100vw)] max-w-[560px]'
    : 'w-full max-h-[100dvh] overflow-hidden rounded-t-2xl border-t pb-0'

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (!open ? closeDrawer() : undefined)}>
      <SheetContent
        side={isLargeScreen ? 'right' : 'bottom'}
        showCloseButton={false}
        className={sharedSheetContentClassName}
        style={!isLargeScreen && viewportHeight ? { height: `${viewportHeight}px`, bottom: `${viewportBottomInset}px` } : undefined}
      >
        <SheetHeader className="sticky top-0 z-10 border-b bg-background p-4 sm:p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle>{OPERATION_TITLES[type]}</SheetTitle>
              <SheetDescription>{OPERATION_DESCRIPTIONS[type]}</SheetDescription>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={closeDrawer} aria-label="Закрыть">
              <X className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {type === 'receipt' ? (
            <form onSubmit={submitReceipt} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-8 sm:p-5 lg:p-6">
                <div className="space-y-2">
                  <Label>Склад</Label>
                  <Controller
                    name="warehouse_id"
                    control={receiptForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите склад" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeWarehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {receiptForm.formState.errors.warehouse_id ? (
                    <p className="field-error">{receiptForm.formState.errors.warehouse_id.message}</p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {receiptItemsArray.fields.map((field, index) => {
                    const selectedItemId = receiptItems?.[index]?.item_id
                    const currentBalance = getWarehouseItemBalance(receiptWarehouseId, selectedItemId)

                    return (
                      <div key={field.id} className="space-y-3 rounded-xl border p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">Товар {index + 1}</p>
                          {!hasFixedItem && receiptItemsArray.fields.length > 1 ? (
                            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => receiptItemsArray.remove(index)}>
                              Удалить
                            </Button>
                          ) : null}
                        </div>

                        {!hasFixedItem ? (
                          <>
                            <Controller
                              name={`items.${index}.item_id`}
                              control={receiptForm.control}
                              render={({ field: itemField }) => (
                                <ItemCombobox
                                  items={itemOptions}
                                  value={itemField.value}
                                  onChange={itemField.onChange}
                                  placeholder="Поиск по названию, модели или артикулу"
                                  emptyMessage="Товары не найдены"
                                />
                              )}
                            />
                            {receiptForm.formState.errors.items?.[index]?.item_id ? (
                              <p className="field-error">{receiptForm.formState.errors.items[index]?.item_id?.message}</p>
                            ) : null}
                          </>
                        ) : null}

                        {selectedItemId && receiptWarehouseId ? (
                          <p className="text-xs text-muted-foreground">Сейчас на складе: {currentBalance} шт</p>
                        ) : null}

                        <div className="space-y-2">
                          <Label>Количество</Label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            {...receiptForm.register(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                          {receiptForm.formState.errors.items?.[index]?.quantity ? (
                            <p className="field-error">{receiptForm.formState.errors.items[index]?.quantity?.message}</p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}

                  {!hasFixedItem ? (
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => receiptItemsArray.append({ item_id: '', quantity: 1 })}>
                      + Добавить товар
                    </Button>
                  ) : null}

                  {typeof receiptForm.formState.errors.items?.message === 'string' ? (
                    <p className="field-error">{receiptForm.formState.errors.items.message}</p>
                  ) : null}
                </div>
              </div>

              <DrawerFooter
                onCancel={closeDrawer}
                submitLabel={ACTION_TITLES.receipt}
                submitClassName={operationSubmitClassName('receipt')}
                isSubmitting={receiptForm.formState.isSubmitting}
                error={submitError}
              />
            </form>
          ) : null}

          {type === 'sale' ? (
            <form onSubmit={submitSale} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-8 sm:p-5 lg:p-6">
                <div className="space-y-2">
                  <Label>Склад</Label>
                  <Controller
                    name="warehouse_id"
                    control={saleForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите склад" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeWarehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {saleForm.formState.errors.warehouse_id ? <p className="field-error">{saleForm.formState.errors.warehouse_id.message}</p> : null}
                </div>

                {!hasFixedItem ? (
                  <div className="space-y-2">
                    <Label>Товар</Label>
                    {!saleWarehouseId ? (
                      <InlineState icon={PackageSearch} title="Сначала выберите склад" description="После этого появятся товары, которые есть на складе." />
                    ) : saleItemOptions.length === 0 ? (
                      <InlineState icon={PackageSearch} title="На этом складе пока нет товаров" description="Выберите другой склад или сначала оформите приход." />
                    ) : (
                      <Controller
                        name="item_id"
                        control={saleForm.control}
                        render={({ field }) => (
                          <ItemCombobox
                            items={saleItemOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Поиск по названию, модели или артикулу"
                            emptyMessage="Товары не найдены"
                          />
                        )}
                      />
                    )}
                    {saleForm.formState.errors.item_id ? <p className="field-error">{saleForm.formState.errors.item_id.message}</p> : null}
                    {saleWarehouseId && saleItemId ? <p className="text-xs text-muted-foreground">В наличии: {availableSaleBalance} шт</p> : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>Количество</Label>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, availableSaleBalance)}
                    step={1}
                    {...saleForm.register('quantity', {
                      valueAsNumber: true,
                      validate: (value) => value <= availableSaleBalance || `На складе доступно только ${availableSaleBalance} шт`,
                    })}
                  />
                  {saleForm.formState.errors.quantity ? <p className="field-error">{saleForm.formState.errors.quantity.message}</p> : null}
                  {hasFixedItem && saleWarehouseId && saleItemId ? <p className="text-xs text-muted-foreground">В наличии: {availableSaleBalance} шт</p> : null}
                </div>
              </div>

              <DrawerFooter
                onCancel={closeDrawer}
                submitLabel={ACTION_TITLES.sale}
                submitClassName={operationSubmitClassName('sale')}
                isSubmitting={saleForm.formState.isSubmitting}
                error={submitError}
              />
            </form>
          ) : null}

          {type === 'transfer' ? (
            <form onSubmit={submitTransfer} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-8 sm:p-5 lg:p-6">
                <div className="space-y-2">
                  <Label>Склад-источник</Label>
                  <Controller
                    name="source_warehouse_id"
                    control={transferForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите склад" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeWarehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {transferForm.formState.errors.source_warehouse_id ? (
                    <p className="field-error">{transferForm.formState.errors.source_warehouse_id.message}</p>
                  ) : null}
                </div>

                {!hasFixedItem ? (
                  <div className="space-y-2">
                    <Label>Товар</Label>
                    {!transferSourceWarehouseId ? (
                      <InlineState icon={PackageSearch} title="Сначала выберите склад-источник" description="Потом можно будет выбрать товар для перемещения." />
                    ) : transferItemOptions.length === 0 ? (
                      <InlineState
                        icon={PackageSearch}
                        title="На этом складе пока нет товаров для перемещения"
                        description="Выберите другой склад или сначала оформите приход."
                      />
                    ) : (
                      <Controller
                        name="item_id"
                        control={transferForm.control}
                        render={({ field }) => (
                          <ItemCombobox
                            items={transferItemOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Поиск по названию, модели или артикулу"
                            emptyMessage="Товары не найдены"
                          />
                        )}
                      />
                    )}
                    {transferForm.formState.errors.item_id ? <p className="field-error">{transferForm.formState.errors.item_id.message}</p> : null}
                    {transferSourceWarehouseId && transferItemId ? (
                      <p className="text-xs text-muted-foreground">В наличии: {availableTransferBalance} шт</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>Склад-получатель</Label>
                  <Controller
                    name="destination_warehouse_id"
                    control={transferForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите склад" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeWarehouses
                            .filter((warehouse) => warehouse.id !== transferSourceWarehouseId)
                            .map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {transferForm.formState.errors.destination_warehouse_id ? (
                    <p className="field-error">{transferForm.formState.errors.destination_warehouse_id.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Количество</Label>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, availableTransferBalance)}
                    step={1}
                    {...transferForm.register('quantity', {
                      valueAsNumber: true,
                      validate: (value) => value <= availableTransferBalance || `На складе доступно только ${availableTransferBalance} шт`,
                    })}
                  />
                  {transferForm.formState.errors.quantity ? <p className="field-error">{transferForm.formState.errors.quantity.message}</p> : null}
                  {hasFixedItem && transferSourceWarehouseId && transferItemId ? (
                    <p className="text-xs text-muted-foreground">В наличии: {availableTransferBalance} шт</p>
                  ) : null}
                </div>
              </div>

              <DrawerFooter
                onCancel={closeDrawer}
                submitLabel={ACTION_TITLES.transfer}
                submitClassName={operationSubmitClassName('transfer')}
                isSubmitting={transferForm.formState.isSubmitting}
                error={submitError}
              />
            </form>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
