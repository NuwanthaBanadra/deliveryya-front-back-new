import { useMemo } from 'react'
import { getOrderAnalyticsAccessMode } from '../../util/AccessController'
import ClientMarketOwnerOrderAnalytics from './orderAnalytics/ClientMarketOwnerOrderAnalytics'
import DeliveryCompanyOrderAnalytics from './orderAnalytics/DeliveryCompanyOrderAnalytics'

function OrderAnalytics() {
  const viewMode = useMemo(() => getOrderAnalyticsAccessMode(), [])

  if (viewMode === 'client-market-owner') {
    return <ClientMarketOwnerOrderAnalytics />
  }

  if (viewMode === 'delivery-company') {
    return <DeliveryCompanyOrderAnalytics />
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      You do not have permission to view Order Analytics.
    </div>
  )
}

export default OrderAnalytics
