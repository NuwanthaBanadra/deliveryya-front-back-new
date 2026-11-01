import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import axiosInstance from '../../../util/AxiosUtil';
import DashboardHeader from './deliveryCompany/DashboardHeader';
import FinancialOverview from './deliveryCompany/FinancialOverview';
import JobRequestModal from './deliveryCompany/JobRequestModal';
import OrderStatusOverview from './deliveryCompany/OrderStatusOverview';
import PerformanceCharts from './deliveryCompany/PerformanceCharts';
import RecentOrders from './deliveryCompany/RecentOrders';
import RevenueCharts from './deliveryCompany/RevenueCharts';
import { type Order } from './deliveryCompany/types';

type ApiOrder = {
    id?: number;
    orderCode?: {
        code?: string;
    };
    deliveryTo?: {
        fullName?: string;
        address?: string;
        primaryMobile?: string;
        secondaryMobile?: string;
    };
    totalPrice?: number;
    deliveryFee?: number;
    collectivePrice?: number;
    createdAt?: string;
    paymentType?: {
        id?: number;
        name?: string;
    };
    paymentStatus?: {
        id?: number;
        name?: string;
    };
    deliveryStatus?: {
        id?: number;
        name?: string;
    };
};

type OrdersApiResponse = {
    message?: string;
    object?: {
        totalCount?: number;
        items?: ApiOrder[];
    };
};

type DeliveryStatus = {
    id: number;
    name: string;
};

type DeliveryStatusesApiResponse = {
    message?: string;
    object?: DeliveryStatus[];
};

type PaymentType = {
    id: number;
    name: string;
};

type PaymentStatus = {
    id: number;
    name: string;
};

type PaymentTypesApiResponse = {
    message?: string;
    object?: PaymentType[];
};

type PaymentStatusesApiResponse = {
    message?: string;
    object?: PaymentStatus[];
};

type FinancialFilters = {
    paymentTypeId: number | null;
    paymentStatusId: number | null;
    fromDate: string;
    toDate: string;
};

type Market = {
    id: number;
    name: string;
    users?: {
        id?: number | null;
    } | null;
};

type MarketsApiResponse = {
    status?: string | null;
    message?: string;
    desc?: string;
    exData?: unknown;
    object?: {
        items?: Market[];
    } | null;
};

type SelectOption<T extends string | number> = {
    value: T;
    label: string;
};

type MarketSelectOption = SelectOption<number> & {
    ownerUserId: number;
};

type ChartDatePreset = '7d' | '30d' | '90d' | 'all' | 'custom';
type ChartXAxisMode = 'day' | 'week' | 'month';
type ChartYAxisMetric = 'revenue' | 'orders';

const parseIdNameOptions = <T extends { id: number; name: string }>(
    payload: unknown
): T[] => {
    if (!Array.isArray(payload)) return [];

    return payload
        .map((item) => {
            const id = Number((item as { id?: unknown })?.id);
            const name = String((item as { name?: unknown })?.name || '').trim();

            if (!Number.isFinite(id) || !name) return null;

            return { id, name } as T;
        })
        .filter((item): item is T => item !== null);
};

type OrdersRequestBody = {
    pageNumber: number;
    countPerPage: number;
    totalCount: number;
    totalPages: number;
    cityId: number;
    orderId: number;
    userId: number;
    sendingUserId: number;
    markerOrderId: number;
    orderCode: string;
    receivingUserId: number;
    deliveryStatusId: number;
    paymentStatusId: number;
    paymentTypeId: number;
    minPrice: number;
    maxPrice: number;
    fromDate: string;
    toDate: string;
    dontCollectDeliveryFeeFromCustomer: boolean;
    search: string;
    thirdPartySendersId: number;
    searchThoughThirdPartyName: boolean;
    searchThoughThirdPartyNic: boolean;
    searchThoughThirdPartyNote: boolean;
    searchThoughThirdPartyAddress: boolean;
    searchThoughThirdPartyMobileNumbers: boolean;
    searchThoughDeliveryToFullName: boolean;
    searchThoughDeliveryToAddress: boolean;
    searchThoughDeliveryToMobileNumbers: boolean;
    searchThoughDeliveryTo: boolean;
    searchThoughMarketName: boolean;
    searchThoughMarketOrderName: boolean;
};

const DASHBOARD_ORDERS_PAGE_SIZE = 200;

const toPositiveInteger = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const normalizeStatusName = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, '');

const isReadyToPickupStatus = (value: string): boolean => {
    const normalized = normalizeStatusName(value);
    return normalized.includes('readytopickup') || normalized.includes('pickup');
};

const isOnTheWayStatus = (value: string): boolean => {
    const normalized = normalizeStatusName(value);
    return normalized.includes('ondelivery') || normalized.includes('delivering') || normalized.includes('intheway') || normalized.includes('ontheway');
};

const isCompletedStatus = (value: string): boolean => {
    const normalized = normalizeStatusName(value);
    return normalized.includes('completed') || normalized.includes('delivered') || normalized.includes('done') || normalized.includes('acceptedbycustomer');
};

const mapApiStatusToOrderStatus = (statusName: string | undefined): Order['status'] => {
    const safeName = statusName ?? '';
    const normalized = normalizeStatusName(safeName);

    if (isReadyToPickupStatus(safeName)) return 'to-pickup';
    if (isOnTheWayStatus(safeName)) return 'on-delivery';
    if (normalized.includes('acceptedbycustomer') || isCompletedStatus(safeName)) return 'completed';
    if (normalized.includes('cancelled') || normalized.includes('canceled') || normalized.includes('returned')) return 'cancelled';
    return 'to-accept';
};

const formatCurrency = (value: number): string => `LKR ${value.toLocaleString()}`;

const formatRelativeTime = (value: string | undefined): string => {
    if (!value) return 'N/A';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';

    const diffMs = Date.now() - parsed.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const createOrdersRequestBody = (pageNumber: number, sendingUserId: number): OrdersRequestBody => ({
    pageNumber,
    countPerPage: DASHBOARD_ORDERS_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    cityId: 0,
    orderId: 0,
    userId: 0,
    sendingUserId,
    markerOrderId: 0,
    orderCode: '',
    receivingUserId: 0,
    deliveryStatusId: 0,
    paymentStatusId: 0,
    paymentTypeId: 0,
    minPrice: 0,
    maxPrice: 0,
    fromDate: '',
    toDate: '',
    dontCollectDeliveryFeeFromCustomer: false,
    search: '',
    thirdPartySendersId: 0,
    searchThoughThirdPartyName: false,
    searchThoughThirdPartyNic: false,
    searchThoughThirdPartyNote: false,
    searchThoughThirdPartyAddress: false,
    searchThoughThirdPartyMobileNumbers: false,
    searchThoughDeliveryToFullName: false,
    searchThoughDeliveryToAddress: false,
    searchThoughDeliveryToMobileNumbers: false,
    searchThoughDeliveryTo: false,
    searchThoughMarketName: false,
    searchThoughMarketOrderName: false,
});

const fetchAllOrders = async (sendingUserId: number): Promise<ApiOrder[]> => {
    const allItems: ApiOrder[] = [];
    let pageNumber = 0;
    let expectedTotal = Number.POSITIVE_INFINITY;

    while (allItems.length < expectedTotal) {
        const response = await axiosInstance.post<OrdersApiResponse>('/orders/get-orders', createOrdersRequestBody(pageNumber, sendingUserId), {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
        });

        if (response.data.message?.toLowerCase() !== 'success') {
            throw new Error('Failed to load orders');
        }

        const batch = response.data.object?.items ?? [];
        const totalCount = response.data.object?.totalCount;

        if (typeof totalCount === 'number') {
            expectedTotal = totalCount;
        }

        allItems.push(...batch);

        if (batch.length < DASHBOARD_ORDERS_PAGE_SIZE) break;
        pageNumber += 1;
        if (pageNumber > 500) break;
    }

    return allItems;
};

const toOrderStatusLabel = (status: Order['status']): string => {
    switch (status) {
        case 'to-accept':
            return 'To Accept';
        case 'to-pickup':
            return 'To Pickup';
        case 'on-delivery':
            return 'On Delivery';
        case 'completed':
            return 'Completed';
        case 'cancelled':
            return 'Cancelled';
    }
};

const getStatusColor = (status: Order['status']): string => {
    switch (status) {
        case 'to-accept':
            return '#FF6B35';
        case 'to-pickup':
            return '#7E57C2';
        case 'on-delivery':
            return '#FFA726';
        case 'completed':
            return '#00BFA5';
        case 'cancelled':
            return '#EF5350';
    }
};

const toStatusLabel = (name: string): string => {
    const normalized = name.trim();
    if (!normalized) return 'Unknown';
    return normalized
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
};

const getStatusCardBackground = (statusName: string): string => {
    const normalized = normalizeStatusName(statusName);

    if (normalized.includes('pending') || normalized.includes('processing') || normalized.includes('accept')) return 'bg-gradient-to-br from-[#FF6B35] to-[#FF8C42]';
    if (normalized.includes('pickup')) return 'bg-gradient-to-br from-[#7E57C2] to-[#9575CD]';
    if (normalized.includes('delivering') || normalized.includes('ondelivery') || normalized.includes('intheway') || normalized.includes('ontheway')) return 'bg-gradient-to-br from-[#FFA726] to-[#FFB84D]';
    if (normalized.includes('completed') || normalized.includes('delivered') || normalized.includes('done') || normalized.includes('acceptedbycustomer')) return 'bg-gradient-to-br from-[#00BFA5] to-[#1DE9B6]';
    if (normalized.includes('cancelled') || normalized.includes('canceled') || normalized.includes('returned') || normalized.includes('return')) return 'bg-gradient-to-br from-[#EF5350] to-[#E57373]';

    return 'bg-gradient-to-br from-[#5C6BC0] to-[#7986CB]';
};

const getStatusSubtitle = (statusName: string): string => {
    const normalized = normalizeStatusName(statusName);

    if (normalized.includes('pending') || normalized.includes('processing') || normalized.includes('accept')) return 'Pending confirmation';
    if (normalized.includes('pickup')) return 'Awaiting collection';
    if (normalized.includes('delivering') || normalized.includes('ondelivery') || normalized.includes('intheway') || normalized.includes('ontheway')) return 'In transit';
    if (normalized.includes('completed') || normalized.includes('delivered') || normalized.includes('done') || normalized.includes('acceptedbycustomer')) return 'Successfully delivered';
    if (normalized.includes('cancelled') || normalized.includes('canceled') || normalized.includes('returned') || normalized.includes('return')) return 'Requires attention';

    return 'Current status count';
};

const toLocalDateKey = (value: Date): string => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toMonthKey = (value: Date): string => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const getWeekStart = (value: Date): Date => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    const diff = (day + 6) % 7;
    date.setDate(date.getDate() - diff);
    return date;
};

const toWeekKey = (value: Date): string => toLocalDateKey(getWeekStart(value));

const addBucketStep = (date: Date, xAxisMode: ChartXAxisMode): Date => {
    const next = new Date(date);
    if (xAxisMode === 'month') {
        next.setMonth(next.getMonth() + 1);
        return next;
    }
    if (xAxisMode === 'week') {
        next.setDate(next.getDate() + 7);
        return next;
    }
    next.setDate(next.getDate() + 1);
    return next;
};

const toBucketLabel = (date: Date, xAxisMode: ChartXAxisMode): string => {
    if (xAxisMode === 'month') {
        return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
    if (xAxisMode === 'week') {
        return `Week of ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getBucketKey = (date: Date, xAxisMode: ChartXAxisMode): string => {
    if (xAxisMode === 'month') return toMonthKey(date);
    if (xAxisMode === 'week') return toWeekKey(date);
    return toLocalDateKey(date);
};

interface RevenueDataPoint {
    name: string;
    revenue: number;
    orders: number;
}

const buildRevenueTrendData = (
    orders: ApiOrder[],
    startDate: Date,
    endDate: Date,
    xAxisMode: ChartXAxisMode
): RevenueDataPoint[] => {
    const safeStartDate = new Date(startDate);
    const safeEndDate = new Date(endDate);
    safeStartDate.setHours(0, 0, 0, 0);
    safeEndDate.setHours(0, 0, 0, 0);

    const normalizedStartDate = xAxisMode === 'week'
        ? getWeekStart(safeStartDate)
        : xAxisMode === 'month'
            ? new Date(safeStartDate.getFullYear(), safeStartDate.getMonth(), 1)
            : safeStartDate;

    const buckets: Array<{ key: string; name: string; revenue: number; orders: number }> = [];
    let cursor = new Date(normalizedStartDate);

    while (cursor.getTime() <= safeEndDate.getTime()) {
        buckets.push({
            key: getBucketKey(cursor, xAxisMode),
            name: toBucketLabel(cursor, xAxisMode),
            revenue: 0,
            orders: 0,
        });

        const nextCursor = addBucketStep(cursor, xAxisMode);
        if (nextCursor.getTime() <= cursor.getTime()) {
            break;
        }
        cursor = nextCursor;
    }

    if (buckets.length === 0) {
        const fallbackKey = getBucketKey(normalizedStartDate, xAxisMode);
        buckets.push({
            key: fallbackKey,
            name: toBucketLabel(normalizedStartDate, xAxisMode),
            revenue: 0,
            orders: 0,
        });
    }

    const bucketIndexByKey = buckets.reduce<Record<string, number>>((acc, bucket, index) => {
        acc[bucket.key] = index;
        return acc;
    }, {});

    orders.forEach((order) => {
        if (!order.createdAt) return;

        const createdAt = new Date(order.createdAt);
        if (Number.isNaN(createdAt.getTime())) return;

        createdAt.setHours(0, 0, 0, 0);
        const key = getBucketKey(createdAt, xAxisMode);
        const bucketIndex = bucketIndexByKey[key];

        if (typeof bucketIndex !== 'number') return;

        buckets[bucketIndex].orders += 1;
        buckets[bucketIndex].revenue += Number(order.totalPrice ?? 0);
    });

    return buckets.map(({ name, revenue, orders: orderCount }) => ({
        name,
        revenue,
        orders: orderCount,
    }));
};

const customSelectFieldStyles = {
    control: (base: any, state: any) => ({
        ...base,
        height: '48px',
        minHeight: '48px',
        borderWidth: '2px',
        borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
        borderRadius: '0.75rem',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
        '&:hover': { borderColor: '#FCD34D' },
        transition: 'all 0.3s',
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
    }),
    valueContainer: (base: any) => ({
        ...base,
        height: '100%',
        padding: '0 0.85rem',
        display: 'flex',
        alignItems: 'center',
    }),
    input: (base: any) => ({
        ...base,
        margin: 0,
        padding: 0,
    }),
    placeholder: (base: any) => ({
        ...base,
        margin: 0,
    }),
    singleValue: (base: any) => ({
        ...base,
        margin: 0,
    }),
    indicatorsContainer: (base: any) => ({
        ...base,
        height: '100%',
    }),
    dropdownIndicator: (base: any) => ({
        ...base,
        paddingTop: 0,
        paddingBottom: 0,
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
        color: state.isSelected ? 'white' : '#1F2937',
        cursor: 'pointer',
    }),
};

function DeliveryCompanyDashboard() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isJobRequestModalOpen, setIsJobRequestModalOpen] = useState(false);
    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatus[]>([]);
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
    const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([]);
    const [financialFilters, setFinancialFilters] = useState<FinancialFilters>({
        paymentTypeId: null,
        paymentStatusId: null,
        fromDate: '',
        toDate: '',
    });
    const [selectedMarketId, setSelectedMarketId] = useState(0);
    const [chartDatePreset, setChartDatePreset] = useState<ChartDatePreset>('all');
    const [chartFromDate, setChartFromDate] = useState('');
    const [chartToDate, setChartToDate] = useState('');
    const [chartXAxisMode, setChartXAxisMode] = useState<ChartXAxisMode>('day');
    const [chartYAxisMetric, setChartYAxisMetric] = useState<ChartYAxisMetric>('revenue');
    const [chartYMaxInput, setChartYMaxInput] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

    const marketOptions = useMemo<MarketSelectOption[]>(() => {
        const marketEntries = markets
            .map((market) => ({
                value: market.id,
                label: market.name,
                ownerUserId: toPositiveInteger(market.users?.id ?? null),
            }))
            .filter((option) => option.ownerUserId > 0);

        return [{ value: 0, label: 'All Markets', ownerUserId: 0 }, ...marketEntries];
    }, [markets]);

    const selectedMarketOwnerUserId = useMemo(() => {
        if (selectedMarketId === 0) return 0;
        return marketOptions.find((option) => option.value === selectedMarketId)?.ownerUserId ?? 0;
    }, [marketOptions, selectedMarketId]);

    const navigateToPlacedOrders = (deliveryStatusId: number | null) => {
        navigate(`/deliverYya-cloud-console/placed-orders?deliveryStatusId=${deliveryStatusId ?? 0}`);
    };

    const loadDashboardOrders = useCallback(async (sendingUserId: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const [statusResponse, paymentTypesResponse, paymentStatusesResponse, marketsResponse, allItems] = await Promise.all([
                axiosInstance.get<DeliveryStatusesApiResponse>('/orders/get-delivery-statuses'),
                axiosInstance.get<PaymentTypesApiResponse>('/payment/get-payment-types'),
                axiosInstance.get<PaymentStatusesApiResponse>('/payment/get-payment-statuses'),
                axiosInstance.post<MarketsApiResponse>('/markets/get-markets', {
                    pageNumber: 0,
                    countPerPage: 100,
                    isActive: true
                }),
                fetchAllOrders(sendingUserId),
            ]);

            setDeliveryStatuses(parseIdNameOptions<DeliveryStatus>(statusResponse.data?.object));
            setPaymentTypes(parseIdNameOptions<PaymentType>(paymentTypesResponse.data?.object));
            setPaymentStatuses(parseIdNameOptions<PaymentStatus>(paymentStatusesResponse.data?.object));
            setMarkets(Array.isArray(marketsResponse.data.object?.items) ? marketsResponse.data.object?.items ?? [] : []);

            setOrders(allItems);
        } catch {
            setMarkets([]);
            setDeliveryStatuses([]);
            setPaymentTypes([]);
            setPaymentStatuses([]);
            setOrders([]);
            setError('Failed to load delivery dashboard data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDashboardOrders(selectedMarketOwnerUserId);
    }, [loadDashboardOrders, selectedMarketOwnerUserId]);

    const mappedOrders = useMemo<Order[]>(() => {
        return orders
            .slice()
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            })
            .map((order) => {
                const status = mapApiStatusToOrderStatus(order.deliveryStatus?.name);
                const mobile = [order.deliveryTo?.primaryMobile, order.deliveryTo?.secondaryMobile].filter(Boolean).join(' | ');

                return {
                    id: order.orderCode?.code ?? `ORD-${order.id ?? 'N/A'}`,
                    customer: order.deliveryTo?.fullName ?? 'Unknown Customer',
                    amount: Number(order.totalPrice ?? 0),
                    deliveryStatusId: typeof order.deliveryStatus?.id === 'number' ? order.deliveryStatus.id : null,
                    deliveryStatusName: order.deliveryStatus?.name ?? 'Unknown',
                    status,
                    paymentTypeId: typeof order.paymentType?.id === 'number' ? order.paymentType.id : null,
                    paymentTypeName: order.paymentType?.name ?? 'Unknown',
                    payment: normalizeStatusName(order.paymentType?.name ?? '').includes('cod') ? 'COD' : 'Paid',
                    paymentStatusId: typeof order.paymentStatus?.id === 'number' ? order.paymentStatus.id : null,
                    paymentStatusName: order.paymentStatus?.name ?? 'Unknown',
                    time: formatRelativeTime(order.createdAt),
                    address: [order.deliveryTo?.address, mobile ? `Mobile: ${mobile}` : ''].filter(Boolean).join(' | ') || 'N/A',
                };
            });
    }, [orders]);

    const dashboardStats = useMemo(() => {
        const toAccept = orders.filter((order) => mapApiStatusToOrderStatus(order.deliveryStatus?.name) === 'to-accept').length;
        const toPickup = orders.filter((order) => mapApiStatusToOrderStatus(order.deliveryStatus?.name) === 'to-pickup').length;
        const onDelivery = orders.filter((order) => mapApiStatusToOrderStatus(order.deliveryStatus?.name) === 'on-delivery').length;
        const completed = orders.filter((order) => mapApiStatusToOrderStatus(order.deliveryStatus?.name) === 'completed').length;
        const cancelled = orders.filter((order) => mapApiStatusToOrderStatus(order.deliveryStatus?.name) === 'cancelled').length;
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0);
        const codPending = orders
            .filter((order) => normalizeStatusName(order.paymentType?.name ?? '').includes('cod'))
            .reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0);
        const totalCustomers = new Set(orders.map((order) => (order.deliveryTo?.fullName ?? '').trim()).filter(Boolean)).size;

        return {
            toAccept,
            toPickup,
            onDelivery,
            completed,
            cancelled,
            totalRevenue,
            codPending,
            totalCustomers,
        };
    }, [orders]);

    const financialFilteredOrders = useMemo(() => {
        return orders.filter((order) => {
            if (financialFilters.paymentTypeId !== null && order.paymentType?.id !== financialFilters.paymentTypeId) {
                return false;
            }

            if (financialFilters.paymentStatusId !== null && order.paymentStatus?.id !== financialFilters.paymentStatusId) {
                return false;
            }

            if (financialFilters.fromDate || financialFilters.toDate) {
                if (!order.createdAt) return false;

                const createdAt = new Date(order.createdAt);
                if (Number.isNaN(createdAt.getTime())) return false;

                const fromDate = financialFilters.fromDate ? new Date(`${financialFilters.fromDate}T00:00:00`) : null;
                const toDate = financialFilters.toDate ? new Date(`${financialFilters.toDate}T23:59:59`) : null;

                if (fromDate && createdAt < fromDate) return false;
                if (toDate && createdAt > toDate) return false;
            }

            return true;
        });
    }, [financialFilters.fromDate, financialFilters.paymentStatusId, financialFilters.paymentTypeId, financialFilters.toDate, orders]);

    const financialOverviewStats = useMemo(() => {
        const totalRevenue = financialFilteredOrders.reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0);
        const codPending = financialFilteredOrders
            .filter((order) => normalizeStatusName(order.paymentType?.name ?? '').includes('cod'))
            .reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0);
        const completedPayments = financialFilteredOrders.filter((order) => {
            const normalized = normalizeStatusName(order.paymentStatus?.name ?? '');
            return normalized.includes('completed') || normalized.includes('paid') || normalized.includes('success');
        }).length;
        const totalCustomers = new Set(financialFilteredOrders.map((order) => (order.deliveryTo?.fullName ?? '').trim()).filter(Boolean)).size;

        return {
            totalRevenue,
            codPending,
            completedPayments,
            totalCustomers,
        };
    }, [financialFilteredOrders]);

    const statusCards = useMemo(
        () =>
            deliveryStatuses.map((status) => {
                const count = orders.filter((order) => {
                    const orderStatus = order.deliveryStatus;
                    if (!orderStatus) return false;
                    if (typeof orderStatus.id === 'number' && orderStatus.id === status.id) return true;
                    return normalizeStatusName(orderStatus.name ?? '') === normalizeStatusName(status.name);
                }).length;

                return {
                    id: status.id,
                    name: toStatusLabel(status.name),
                    count,
                    bgColor: getStatusCardBackground(status.name),
                    subtitle: getStatusSubtitle(status.name),
                };
            }),
        [deliveryStatuses, orders]
    );

    const orderStatusData = useMemo(
        () => [
            { name: 'To Accept', value: dashboardStats.toAccept, color: getStatusColor('to-accept') },
            { name: 'To Pickup', value: dashboardStats.toPickup, color: getStatusColor('to-pickup') },
            { name: 'On Delivery', value: dashboardStats.onDelivery, color: getStatusColor('on-delivery') },
            { name: 'Completed', value: dashboardStats.completed, color: getStatusColor('completed') },
            { name: 'Cancelled', value: dashboardStats.cancelled, color: getStatusColor('cancelled') },
        ].filter((item) => item.value > 0),
        [dashboardStats]
    );

    const deliveryPerformance = useMemo(() => {
        const buckets = Array.from({ length: 24 }, (_, hour) => ({
            hour: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
            deliveries: 0,
        }));

        orders.forEach((order) => {
            if (!order.createdAt) return;
            const parsed = new Date(order.createdAt);
            if (Number.isNaN(parsed.getTime())) return;
            buckets[parsed.getHours()].deliveries += 1;
        });

        return buckets;
    }, [orders]);

    const chartDateRange = useMemo(() => {
        const validDateValues = orders
            .map((order) => order.createdAt)
            .filter((value): value is string => Boolean(value))
            .map((value) => new Date(value))
            .filter((date) => !Number.isNaN(date.getTime()));

        const now = new Date();
        now.setHours(23, 59, 59, 999);

        const defaultStart = new Date(now);
        defaultStart.setDate(defaultStart.getDate() - 29);
        defaultStart.setHours(0, 0, 0, 0);

        if (validDateValues.length === 0) {
            return { start: defaultStart, end: now };
        }

        const minDate = new Date(Math.min(...validDateValues.map((date) => date.getTime())));
        minDate.setHours(0, 0, 0, 0);

        const maxDate = new Date(Math.max(...validDateValues.map((date) => date.getTime())));
        maxDate.setHours(23, 59, 59, 999);

        if (chartDatePreset === 'all') {
            return { start: minDate, end: maxDate };
        }

        if (chartDatePreset === 'custom') {
            const parsedFrom = chartFromDate ? new Date(`${chartFromDate}T00:00:00`) : null;
            const parsedTo = chartToDate ? new Date(`${chartToDate}T23:59:59`) : null;

            if (
                parsedFrom &&
                parsedTo &&
                !Number.isNaN(parsedFrom.getTime()) &&
                !Number.isNaN(parsedTo.getTime()) &&
                parsedFrom.getTime() <= parsedTo.getTime()
            ) {
                return { start: parsedFrom, end: parsedTo };
            }

            return { start: minDate, end: maxDate };
        }

        const daysByPreset: Record<Exclude<ChartDatePreset, 'all' | 'custom'>, number> = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
        };

        const selectedDays = daysByPreset[chartDatePreset as Exclude<ChartDatePreset, 'all' | 'custom'>] ?? 30;
        const presetStart = new Date(maxDate);
        presetStart.setDate(presetStart.getDate() - (selectedDays - 1));
        presetStart.setHours(0, 0, 0, 0);

        return { start: presetStart < minDate ? minDate : presetStart, end: maxDate };
    }, [chartDatePreset, chartFromDate, chartToDate, orders]);

    const chartFilteredOrders = useMemo(
        () =>
            orders.filter((order) => {
                if (!order.createdAt) return false;
                const createdAt = new Date(order.createdAt);
                if (Number.isNaN(createdAt.getTime())) return false;
                return createdAt >= chartDateRange.start && createdAt <= chartDateRange.end;
            }),
        [chartDateRange.end, chartDateRange.start, orders]
    );

    const chartYMax = useMemo(() => {
        const parsedMax = Number(chartYMaxInput);
        return Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : null;
    }, [chartYMaxInput]);

    const revenueData = useMemo(
        () => buildRevenueTrendData(chartFilteredOrders, chartDateRange.start, chartDateRange.end, chartXAxisMode),
        [chartDateRange.end, chartDateRange.start, chartFilteredOrders, chartXAxisMode]
    );

    const recentOrders = useMemo(() => mappedOrders.slice(0, 25), [mappedOrders]);

    const quickLinks = useMemo(
        () => [
            { label: 'Placed Orders', path: '/deliverYya-cloud-console/placed-orders' },
            { label: 'Order Analytics', path: '/deliverYya-cloud-console/order-analytics' },
            { label: 'Order Checkout', path: '/deliverYya-cloud-console/order-checkout' },
            { label: 'Urgent Jobs', path: '/deliverYya-cloud-console/urgent-jobs' },
            { label: 'Add Orders', path: '/deliverYya-cloud-console/add-orders' },
        ],
        []
    );

    return (
        <div className="min-h-screen pb-8">
            <DashboardHeader selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />

            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {quickLinks.map((item) => (
                        <button
                            key={item.path}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className="inline-flex items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-[#B85F1D] transition hover:border-orange-300 hover:bg-orange-100 sm:text-sm"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => setIsJobRequestModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-[#00BFA5] to-[#1DE9B6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                >
                    New Pickup Request
                </button>
            </div>

            {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <p className="font-bold">Error loading delivery dashboard</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {isLoading && (
                <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 text-sm font-medium text-gray-600 shadow-sm">
                    Loading delivery dashboard data...
                </div>
            )}

            <OrderStatusOverview
                totalOrders={orders.length}
                statusCards={statusCards}
                onStatusClick={(deliveryStatusId) => {
                    navigateToPlacedOrders(deliveryStatusId);
                }}
            />

            <FinancialOverview
                stats={{
                    totalRevenue: financialOverviewStats.totalRevenue,
                    codPending: financialOverviewStats.codPending,
                    completedPayments: financialOverviewStats.completedPayments,
                    totalCustomers: financialOverviewStats.totalCustomers,
                }}
                paymentTypes={paymentTypes}
                paymentStatuses={paymentStatuses}
                filters={financialFilters}
                onFilterChange={(patch) => setFinancialFilters((previous) => ({ ...previous, ...patch }))}
                onResetFilters={() =>
                    setFinancialFilters({
                        paymentTypeId: null,
                        paymentStatusId: null,
                        fromDate: '',
                        toDate: '',
                    })
                }
            />

            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <CalendarDaysIcon className="h-5 w-5 text-[#F59B0F]" />
                    Chart Filters
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    <div className="flex-1">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Market</p>
                        <Select<MarketSelectOption, false>
                            value={marketOptions.find((option) => option.value === selectedMarketId) ?? marketOptions[0]}
                            onChange={(option) => setSelectedMarketId(option ? option.value : 0)}
                            options={marketOptions}
                            styles={customSelectFieldStyles}
                        />
                    </div>

                    <div className="flex-1">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Date Range</p>
                        <Select<SelectOption<ChartDatePreset>, false>
                            value={
                                [
                                    { value: 'all' as const, label: 'All Time' },
                                    { value: '90d' as const, label: 'Last 90 Days' },
                                    { value: '30d' as const, label: 'Last 30 Days' },
                                    { value: '7d' as const, label: 'Last 7 Days' },
                                    { value: 'custom' as const, label: 'Custom Range' },
                                ].find((option) => option.value === chartDatePreset) || {
                                    value: 'all' as const,
                                    label: 'All Time',
                                }
                            }
                            onChange={(option) => setChartDatePreset(option ? option.value : 'all')}
                            options={[
                                { value: 'all' as const, label: 'All Time' },
                                { value: '90d' as const, label: 'Last 90 Days' },
                                { value: '30d' as const, label: 'Last 30 Days' },
                                { value: '7d' as const, label: 'Last 7 Days' },
                                { value: 'custom' as const, label: 'Custom Range' },
                            ]}
                            styles={customSelectFieldStyles}
                        />
                    </div>
                    <div className="flex-1">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">X-Axis Mode</p>
                        <Select<SelectOption<ChartXAxisMode>, false>
                            value={
                                [
                                    { value: 'day' as const, label: 'X: Daily' },
                                    { value: 'week' as const, label: 'X: Weekly' },
                                    { value: 'month' as const, label: 'X: Monthly' },
                                ].find((option) => option.value === chartXAxisMode) || {
                                    value: 'day' as const,
                                    label: 'X: Daily',
                                }
                            }
                            onChange={(option) => setChartXAxisMode(option ? option.value : 'day')}
                            options={[
                                { value: 'day' as const, label: 'X: Daily' },
                                { value: 'week' as const, label: 'X: Weekly' },
                                { value: 'month' as const, label: 'X: Monthly' },
                            ]}
                            styles={customSelectFieldStyles}
                        />
                    </div>
                    <div className="flex-1">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Y-Axis Metric</p>
                        <Select<SelectOption<ChartYAxisMetric>, false>
                            value={
                                [
                                    { value: 'revenue' as const, label: 'Y: Revenue' },
                                    { value: 'orders' as const, label: 'Y: Orders' },
                                ].find((option) => option.value === chartYAxisMetric) || {
                                    value: 'revenue' as const,
                                    label: 'Y: Revenue',
                                }
                            }
                            onChange={(option) => setChartYAxisMetric(option ? option.value : 'revenue')}
                            options={[
                                { value: 'revenue' as const, label: 'Y: Revenue' },
                                { value: 'orders' as const, label: 'Y: Orders' },
                            ]}
                            styles={customSelectFieldStyles}
                        />
                    </div>
                    <div className="flex-1">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Custom Y Max</p>
                        <input
                            type="number"
                            min={1}
                            value={chartYMaxInput}
                            onChange={(event) => setChartYMaxInput(event.target.value)}
                            placeholder="Custom Y max (optional)"
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                        />
                    </div>


                    <div className="flex items-end justify-end">
                        <button
                            onClick={() => {
                                setSelectedMarketId(0);
                                setChartDatePreset('all');
                                setChartFromDate('');
                                setChartToDate('');
                                setChartXAxisMode('day');
                                setChartYAxisMetric('revenue');
                                setChartYMaxInput('');
                            }}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold"
                        >
                            Reset
                        </button>
                    </div>

                </div>

                {chartDatePreset === 'custom' && (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                            type="date"
                            value={chartFromDate}
                            onChange={(event) => setChartFromDate(event.target.value)}
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                            aria-label="Chart start date"
                        />
                        <input
                            type="date"
                            value={chartToDate}
                            onChange={(event) => setChartToDate(event.target.value)}
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                            aria-label="Chart end date"
                        />
                    </div>
                )}


            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <RevenueCharts
                    data={revenueData}
                    yAxisMetric={chartYAxisMetric}
                    yAxisMax={chartYMax}
                />
                <PerformanceCharts
                    orderStatusData={orderStatusData}
                    deliveryPerformance={deliveryPerformance}
                />
            </div>

            <RecentOrders
                orders={recentOrders}
                deliveryStatuses={deliveryStatuses}
                paymentTypes={paymentTypes}
                paymentStatuses={paymentStatuses}
            />

            <JobRequestModal
                isOpen={isJobRequestModalOpen}
                onClose={() => setIsJobRequestModalOpen(false)}
            />
        </div>
    );
}

export default DeliveryCompanyDashboard;
