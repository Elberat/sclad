import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
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
import { useWarehousesQuery } from '@/hooks/useWarehouses'
import { cn } from '@/lib/utils'
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

type SelectOption = { id: string; name: string }
type ReceiptItemRow = { item_id: string; quantity: number }
type QueryKeyPrefix = readonly unknown[]

const OPERATION_TITLES: Record<OperationType, string> = {
  receipt: 'Приход',
  sale: 'Расход',
  transfer: 'Перемещение',
}

const ACTION_TITLES: Record<OperationType, string> = {
  receipt: 'Оформить приход',
  sale: 'Оформить расход',
  transfer: 'Переместить',
}

function operationSubmitClassName(type: OperationType) {
  if (type === 'receipt') return 'min-h-[48px] w-full bg-emerald-600 text-white hover:bg-emerald-700'
  if (type === 'sale') return 'min-h-[48px] w-full bg-rose-600 text-white hover:bg-rose-700'
  return 'min-h-[48px] w-full bg-blue-600 text-white hover:bg-blue-700'
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
    message: 'Склад-получатель должен отличаться от источника',
  })

function ItemCombobox({
  items,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  items: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const needle = query.trim().toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(needle))
  }, [items, query])

  const selected = items.find((item) => item.id === value)

  return (
    <div className={cn('rounded-md border border-input', disabled ? 'opacity-60' : '')}>
      <Command className="bg-transparent">
        <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} disabled={disabled} />
        <CommandList>
          <CommandEmpty>Ничего не найдено</CommandEmpty>
          {filtered.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.name} ${item.id}`}
              data-checked={item.id === value}
              onSelect={() => onChange(item.id)}
              disabled={disabled}
            >
              <div className="truncate">{item.name}</div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
      {selected ? <p className="border-t px-3 py-2 text-xs text-muted-foreground">Выбрано: {selected.name}</p> : null}
    </div>
  )
}

export function OperationDrawer({ type, defaultWarehouseId, defaultItemId, isOpen, onClose }: OperationDrawerProps) {
  const isLargeScreen = useMediaQuery('(min-width: 1024px)')
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
          name: [item.name, item.model, item.sku].filter(Boolean).join(' / '),
        })),
    [itemsQuery.data],
  )

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

  const saleWarehouseId = saleForm.watch('warehouse_id')
  const saleItemId = saleForm.watch('item_id')
  const transferSourceWarehouseId = transferForm.watch('source_warehouse_id')
  const transferItemId = transferForm.watch('item_id')

  const saleItemOptions = useMemo<SelectOption[]>(() => {
    if (!saleWarehouseId) return []

    return (itemsQuery.data ?? [])
      .filter((item) => item.is_active && item.inventory_balances.some((balance) => balance.warehouse_id === saleWarehouseId && balance.quantity > 0))
      .map((item) => ({
        id: item.id,
        name: [item.name, item.model, item.sku].filter(Boolean).join(' / '),
      }))
  }, [itemsQuery.data, saleWarehouseId])

  const transferItemOptions = useMemo<SelectOption[]>(() => {
    if (!transferSourceWarehouseId) return []

    return (itemsQuery.data ?? [])
      .filter((item) =>
        item.is_active && item.inventory_balances.some((balance) => balance.warehouse_id === transferSourceWarehouseId && balance.quantity > 0),
      )
      .map((item) => ({
        id: item.id,
        name: [item.name, item.model, item.sku].filter(Boolean).join(' / '),
      }))
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

    setSubmitError(null)
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

  const handleRpcError = (message: string) => {
    if (message.includes('insufficient_stock')) {
      const match = message.match(/(\d+)/)
      const available = match?.[1] ?? '0'
      setSubmitError(`Недостаточно товара: доступно ${available} шт`)
      return
    }
    setSubmitError(message)
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
      toast.success('Операция выполнена')
      await refreshAfterSuccess()
      closeDrawer()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить операцию'
      handleRpcError(message)
    }
  })

  const submitSale = saleForm.handleSubmit(async (values) => {
    try {
      setSubmitError(null)
      if (values.quantity > availableSaleBalance) {
        saleForm.setError('quantity', { message: 'Нельзя списать больше остатка' })
        return
      }
      const { error } = await supabase.rpc('create_sale', {
        p_warehouse_id: values.warehouse_id,
        p_item_id: values.item_id,
        p_quantity: Number(values.quantity),
        p_comment: null,
      } as never)
      if (error) throw error
      toast.success('Операция выполнена')
      await refreshAfterSuccess()
      closeDrawer()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить операцию'
      handleRpcError(message)
    }
  })

  const submitTransfer = transferForm.handleSubmit(async (values) => {
    try {
      setSubmitError(null)
      if (values.quantity > availableTransferBalance) {
        transferForm.setError('quantity', { message: 'Нельзя списать больше остатка' })
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
      toast.success('Операция выполнена')
      await refreshAfterSuccess()
      closeDrawer()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить операцию'
      handleRpcError(message)
    }
  })

  const sharedSheetContentClassName = isLargeScreen
    ? 'h-[100dvh] w-[min(560px,100vw)] max-w-[560px]'
    : 'h-[min(100dvh,920px)] w-full rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)] sm:h-[88dvh]'

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (!open ? closeDrawer() : undefined)}>
      <SheetContent side={isLargeScreen ? 'right' : 'bottom'} showCloseButton={false} className={sharedSheetContentClassName}>
        <SheetHeader className="border-b p-4 sm:p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle>{OPERATION_TITLES[type]}</SheetTitle>
              <SheetDescription>Заполните форму операции и подтвердите действие.</SheetDescription>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={closeDrawer} aria-label="Закрыть">
              <X className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {type === 'receipt' ? (
            <form onSubmit={submitReceipt} className="space-y-4">
              <div className="space-y-2">
                <Label>Склад</Label>
                <Controller
                  name="warehouse_id"
                  control={receiptForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(defaultWarehouseId)}>
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
                  <p className="text-xs text-destructive">{receiptForm.formState.errors.warehouse_id.message}</p>
                ) : null}
              </div>

              <div className="space-y-3">
                {receiptItemsArray.fields.map((field, index) => (
                  <div key={field.id} className="space-y-3 rounded-md border p-3 sm:p-4">
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
                              placeholder="Поиск товара (name/model/sku)"
                            />
                          )}
                        />
                        {receiptForm.formState.errors.items?.[index]?.item_id ? (
                          <p className="text-xs text-destructive">{receiptForm.formState.errors.items[index]?.item_id?.message}</p>
                        ) : null}
                      </>
                    ) : null}

                    <div className="grid gap-3 min-[480px]:grid-cols-[minmax(0,1fr)_auto] min-[480px]:items-end">
                      <div className="space-y-2">
                        <Label>Количество</Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          {...receiptForm.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {receiptForm.formState.errors.items?.[index]?.quantity ? (
                          <p className="text-xs text-destructive">{receiptForm.formState.errors.items[index]?.quantity?.message}</p>
                        ) : null}
                      </div>

                      {!hasFixedItem ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full min-[480px]:w-auto"
                          onClick={() => receiptItemsArray.remove(index)}
                          disabled={receiptItemsArray.fields.length === 1}
                        >
                          Удалить
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}

                {!hasFixedItem ? (
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => receiptItemsArray.append({ item_id: '', quantity: 1 })}>
                    + Добавить товар
                  </Button>
                ) : null}

                {typeof receiptForm.formState.errors.items?.message === 'string' ? (
                  <p className="text-xs text-destructive">{receiptForm.formState.errors.items.message}</p>
                ) : null}
              </div>

              <Button type="submit" className={operationSubmitClassName('receipt')} disabled={receiptForm.formState.isSubmitting}>
                {receiptForm.formState.isSubmitting ? 'Выполняем...' : ACTION_TITLES.receipt}
              </Button>
            </form>
          ) : null}

          {type === 'sale' ? (
            <form onSubmit={submitSale} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cn('space-y-2', hasFixedItem ? 'sm:col-span-2' : '')}>
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
                  {saleForm.formState.errors.warehouse_id ? (
                    <p className="text-xs text-destructive">{saleForm.formState.errors.warehouse_id.message}</p>
                  ) : null}
                </div>

                {!hasFixedItem ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Товар</Label>
                    <Controller
                      name="item_id"
                      control={saleForm.control}
                      render={({ field }) => (
                        <ItemCombobox
                          items={saleItemOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={saleWarehouseId ? 'Поиск товара (name/model/sku)' : 'Сначала выберите склад'}
                          disabled={!saleWarehouseId}
                        />
                      )}
                    />
                    {saleForm.formState.errors.item_id ? (
                      <p className="text-xs text-destructive">{saleForm.formState.errors.item_id.message}</p>
                    ) : null}
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
                      validate: (value) => value <= availableSaleBalance || 'Нельзя списать больше остатка',
                    })}
                  />
                  {saleForm.formState.errors.quantity ? (
                    <p className="text-xs text-destructive">{saleForm.formState.errors.quantity.message}</p>
                  ) : null}
                  {hasFixedItem && saleWarehouseId && saleItemId ? <p className="text-xs text-muted-foreground">В наличии: {availableSaleBalance} шт</p> : null}
                </div>
              </div>

              <Button type="submit" className={operationSubmitClassName('sale')} disabled={saleForm.formState.isSubmitting}>
                {saleForm.formState.isSubmitting ? 'Выполняем...' : ACTION_TITLES.sale}
              </Button>
            </form>
          ) : null}

          {type === 'transfer' ? (
            <form onSubmit={submitTransfer} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                    <p className="text-xs text-destructive">{transferForm.formState.errors.source_warehouse_id.message}</p>
                  ) : null}
                </div>

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
                    <p className="text-xs text-destructive">{transferForm.formState.errors.destination_warehouse_id.message}</p>
                  ) : null}
                </div>

                {!hasFixedItem ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Товар</Label>
                    <Controller
                      name="item_id"
                      control={transferForm.control}
                      render={({ field }) => (
                        <ItemCombobox
                          items={transferItemOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={transferSourceWarehouseId ? 'Поиск товара (name/model/sku)' : 'Сначала выберите склад-источник'}
                          disabled={!transferSourceWarehouseId}
                        />
                      )}
                    />
                    {transferForm.formState.errors.item_id ? (
                      <p className="text-xs text-destructive">{transferForm.formState.errors.item_id.message}</p>
                    ) : null}
                    {transferSourceWarehouseId && transferItemId ? (
                      <p className="text-xs text-muted-foreground">В наличии: {availableTransferBalance} шт</p>
                    ) : null}
                  </div>
                ) : null}

                <div className={cn('space-y-2', hasFixedItem ? 'sm:col-span-2' : '')}>
                  <Label>Количество</Label>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, availableTransferBalance)}
                    step={1}
                    {...transferForm.register('quantity', {
                      valueAsNumber: true,
                      validate: (value) => value <= availableTransferBalance || 'Нельзя списать больше остатка',
                    })}
                  />
                  {transferForm.formState.errors.quantity ? (
                    <p className="text-xs text-destructive">{transferForm.formState.errors.quantity.message}</p>
                  ) : null}
                  {hasFixedItem && transferSourceWarehouseId && transferItemId ? (
                    <p className="text-xs text-muted-foreground">В наличии: {availableTransferBalance} шт</p>
                  ) : null}
                </div>
              </div>

              <Button type="submit" className={operationSubmitClassName('transfer')} disabled={transferForm.formState.isSubmitting}>
                {transferForm.formState.isSubmitting ? 'Выполняем...' : ACTION_TITLES.transfer}
              </Button>
            </form>
          ) : null}

          {submitError ? <p className="mt-4 text-sm text-destructive">{submitError}</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
