export type DashboardPeriod = 'today' | 'week' | 'month';

export type OrderFilterStatus = 'all' | 'to-accept' | 'to-pickup' | 'on-delivery';

export interface Order {
    id: string;
    customer: string;
    amount: number;
    deliveryStatusId: number | null;
    deliveryStatusName: string;
    status: 'to-accept' | 'to-pickup' | 'on-delivery' | 'completed' | 'cancelled';
    paymentTypeId: number | null;
    paymentTypeName: string;
    payment: 'COD' | 'Paid';
    paymentStatusId: number | null;
    paymentStatusName: string;
    time: string;
    address: string;
}
