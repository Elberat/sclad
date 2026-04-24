import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/shared/PageHeader'
import { OperationDrawer } from '@/components/warehouses/OperationDrawer'
import { usePermission } from '@/lib/permissions'

type OperationType = 'receipt' | 'sale' | 'transfer'

const OPERATION_LABELS: Record<OperationType, string> = {
  receipt: 'РџСЂРёС…РѕРґ',
  sale: 'Р Р°СЃС…РѕРґ',
  transfer: 'РџРµСЂРµРјРµС‰РµРЅРёРµ',
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
      <PageHeader title={OPERATION_LABELS[type]} description="Р’С‹Р±РµСЂРёС‚Рµ С‚РѕРІР°СЂ, СЃРєР»Р°Рґ Рё РєРѕР»РёС‡РµСЃС‚РІРѕ РґР»СЏ РѕРїРµСЂР°С†РёРё." />
      <OperationDrawer type={type} isOpen onClose={() => navigate('/dashboard')} />
    </div>
  )
}
