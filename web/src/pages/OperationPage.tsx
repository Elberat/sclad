import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/shared/PageHeader'
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
    <div className="page-shell gap-3">
      <PageHeader title={OPERATION_LABELS[type]} description="Выберите товар, склад и количество для операции." />
      <OperationDrawer type={type} isOpen onClose={() => navigate('/dashboard')} />
    </div>
  )
}
