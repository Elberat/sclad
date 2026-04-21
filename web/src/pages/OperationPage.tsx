import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { OperationDrawer } from '@/components/warehouses/OperationDrawer'
import { usePermission } from '@/lib/permissions'

type OperationType = 'receipt' | 'sale' | 'transfer'

const OPERATION_LABELS: Record<OperationType, string> = {
  receipt: 'Приход',
  sale: 'Расход',
  transfer: 'Перемещение',
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
  const canUseOperation = usePermission(isOperationType(type) ? OPERATION_PERMISSIONS[type] : '')

  if (!isOperationType(type) || !canUseOperation) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{OPERATION_LABELS[type]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Выберите товар, склад и количество для операции.</p>
      </div>
      <OperationDrawer type={type} isOpen onClose={() => navigate('/dashboard')} />
    </div>
  )
}
