import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/shared/PageHeader'
import { OperationDrawer } from '@/components/warehouses/OperationDrawer'
import { usePermission } from '@/lib/permissions'

type OperationType = 'receipt' | 'sale' | 'transfer'

const OPERATION_LABELS: Record<OperationType, string> = {
  receipt: 'Приход',
  sale: 'Расход',
  transfer: 'Перемещение',
}

const OPERATION_DESCRIPTIONS: Record<OperationType, string> = {
  receipt: 'Добавьте товары, которые приехали на склад.',
  sale: 'Выберите товар, который нужно списать со склада.',
  transfer: 'Переместите товар с одного склада на другой.',
}

const OPERATION_PERMISSIONS: Record<OperationType, string> = {
  receipt: 'canDoReceipt',
  sale: 'canDoSale',
  transfer: 'canDoTransfer',
}

function isOperationType(value: string | undefined): value is OperationType {
  return value === 'receipt' || value === 'sale' || value === 'transfer'
}

export function OperationPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canUseOperation = usePermission(isOperationType(type) ? OPERATION_PERMISSIONS[type] : '')

  if (!isOperationType(type) || !canUseOperation) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="page-shell gap-3">
      <PageHeader title={OPERATION_LABELS[type]} description={OPERATION_DESCRIPTIONS[type]} />
      <OperationDrawer type={type} defaultWarehouseId={searchParams.get('warehouse') ?? undefined} isOpen onClose={() => navigate('/dashboard')} />
    </div>
  )
}
