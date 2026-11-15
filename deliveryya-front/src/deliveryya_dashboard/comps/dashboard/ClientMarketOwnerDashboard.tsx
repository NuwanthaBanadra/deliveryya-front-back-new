import { ArrowPathIcon, CalendarDaysIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { useNavigate } from 'react-router-dom';
import type { DecodedUserData } from '../../../types/EntitiesTypes';
import axiosInstance from '../../../util/AxiosUtil';
import JwtUtil from '../../../util/JwtUtil';
import { ROLE_IDS } from '../../../util/RoleAccess';
import DashboardHeader from './clientMarketOwner/DashboardHeader';
import FinancialOverview from './clientMarketOwner/FinancialOverview';
import OrderStatusOverview from './clientMarketOwner/OrderStatusOverview';
import PerformanceCharts from './clientMarketOwner/PerformanceCharts';
import RevenueCharts from './clientMarketOwner/RevenueCharts';
import ClockIcon from '@heroicons/react/24/solid/ClockIcon';

type ApiOrder = {
    id?: number;
    orderCode?: {
        code?: string;
    };
    deliveryTo?: {
        fullName?: string;
        address?: string;
        mobile?: string;
        primaryMobile?: string;
        secondaryMobile?: string;
    };
    totalPrice?: number;
    paymentType?: {
        id?: number;
        name?: string;
    };
    paymentStatus?: {
        id?: number;
        name?: string;
    };
    createdAt?: string;
    deliveryStatus?: {
        id?: number;
        name?: string;
    };
};

type DashboardOrderRow = {
    id: string;
    customer: string;
    mobile: string;
    amount: number;
    deliveryStatusId: number | null;
    deliveryStatusName: string;
    status: 'to-accept' | 'to-pickup' | 'on-delivery' | 'completed' | 'cancelled';
    statusLabel: string;
    paymentTypeId: number | null;
    paymentTypeName: string;
    payment: 'COD' | 'Paid';
    paymentStatusId: number | null;
    paymentStatusName: string;
    createdAt: string | null;
    address: string;
};

type SelectOption<T extends string | number> = {
    value: T;
    label: string;
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
    deliveryStatusId: number | null;
    paymentStatusId: number | null;
    paymentTypeId: number | null;
    orderCode: null;
    minPrice: null;
    maxPrice: null;
    fromDate: string | null;
    toDate: string | null;
    sendingUserId: number | null;
};

type FinancialFilters = {
    paymentTypeId: number | null;
    paymentStatusId: number | null;
    fromDate: string;
    toDate: string;
};

type ChartDatePreset = '7d' | '30d' | '90d' | 'all' | 'custom';
type ChartXAxisMode = 'day' | 'week' | 'month';
type ChartYAxisMetric = 'revenue' | 'orders';

const DASHBOARD_ORDERS_PAGE_SIZE = 200;

const normalizeStatusName = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, '');

const isReadyToPickupStatus = (value: string): boolean => {
    const normalized = normalizeStatusName(value);
    return normalized.includes('readytopickup') || normalized.includes('pickup');
};

const isOnTheWayStatus = (value: string): boolean => {
    const normalized = normalizeStatusName(value);
    return normalized.includes('ondelivery') || normalized.includes('delivering') || normalized.includes('intheway');
};

const isCompletedStatus = (value: string): boolean => {
    const normalized = normalizeStatusName(value);
    return normalized.includes('completed') || normalized.includes('delivered') || normalized.includes('done');
};

const mapApiStatusToOrderStatus = (statusName: string | undefined): DashboardOrderRow['status'] => {
    const safeName = statusName ?? '';
    const normalized = normalizeStatusName(safeName);

    if (isReadyToPickupStatus(safeName)) return 'to-pickup';
    if (isOnTheWayStatus(safeName)) return 'on-delivery';
    if (normalized.includes('acceptedbycustomer') || isCompletedStatus(safeName)) return 'completed';
    if (normalized.includes('cancelled') || normalized.includes('returned')) return 'cancelled';
    return 'to-accept';
};

const formatCurrency = (value: number): string => `${value.toLocaleString()}.00`;

const formatOrderDate = (value: string | null): string => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString();
};

const statusLabelByValue: Record<DashboardOrderRow['status'], string> = {
    'to-accept': 'To Accept',
    'to-pickup': 'To Pickup',
    'on-delivery': 'On Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const getStatusBadgeClass = (status: DashboardOrderRow['status']): string => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    if (status === 'to-accept') return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    if (status === 'cancelled') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    if (status === 'to-pickup') return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';
    return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
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

const getOrderStatusChartColor = (statusName: string): string => {
    const normalized = normalizeStatusName(statusName);
    const fallbackPalette = ['#93C5FD', '#A7F3D0', '#FDE68A', '#FCA5A5', '#C4B5FD', '#FDBA74', '#67E8F9'];

    if (normalized.includes('pending') || normalized.includes('pennding') || normalized.includes('processing')) return '#FACC15';
    if (normalized.includes('acceptedbycustomer') || normalized.includes('accepted')) return '#A78BFA';
    if (normalized.includes('delivering') || normalized.includes('ondelivery') || normalized.includes('intheway') || normalized.includes('ontheway')) return '#60A5FA';
    if (normalized.includes('delivered') || normalized.includes('completed') || normalized.includes('done') || normalized.includes('deliveredbyagent')) return '#34D399';
    if (normalized.includes('return')) return '#FB923C';
    if (normalized.includes('cancelled') || normalized.includes('canceled')) return '#F87171';

    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) {
        hash = (hash + normalized.charCodeAt(i)) % fallbackPalette.length;
    }

    return fallbackPalette[hash] ?? '#9CA3AF';
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

const buildRevenueTrendData = (
    orders: DashboardOrderRow[],
    startDate: Date,
    endDate: Date,
    xAxisMode: ChartXAxisMode
): Array<{ name: string; revenue: number; orders: number }> => {
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
        buckets[bucketIndex].revenue += Number(order.amount ?? 0);
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

const buildOrdersRequestBody = (
    pageNumber: number,
    deliveryStatusId: number | null,
    paymentStatusId: number | null,
    paymentTypeId: number | null,
    fromDate: string | null,
    toDate: string | null,
    sendingUserId: number | null
): OrdersRequestBody => ({
    pageNumber,
    countPerPage: DASHBOARD_ORDERS_PAGE_SIZE,
    deliveryStatusId,
    paymentStatusId,
    paymentTypeId,
    orderCode: null,
    minPrice: null,
    maxPrice: null,
    fromDate,
    toDate,
    sendingUserId,
});

const fetchAllOrders = async (
    deliveryStatusId: number | null,
    paymentStatusId: number | null,
    paymentTypeId: number | null,
    fromDate: string | null,
    toDate: string | null,
    sendingUserId: number | null
): Promise<ApiOrder[]> => {
    const allItems: ApiOrder[] = [];
    let pageNumber = 0;
    let expectedTotal = Number.POSITIVE_INFINITY;

    while (allItems.length < expectedTotal) {
        const response = await axiosInstance.post<OrdersApiResponse>(
            '/orders/get-orders',
            buildOrdersRequestBody(pageNumber, deliveryStatusId, paymentStatusId, paymentTypeId, fromDate, toDate, sendingUserId)
        );

        if (response.data.message?.toLowerCase() !== 'success') {
            throw new Error('Failed to load orders');
        }

        const batch = response.data.object?.items ?? [];
        const totalCount = response.data.object?.totalCount;

        if (typeof totalCount === 'number') {
            expectedTotal = totalCount;
        }

        allItems.push(...batch);

        if (batch.length < DASHBOARD_ORDERS_PAGE_SIZE) {
            break;
        }

        pageNumber += 1;

        if (pageNumber > 500) {
            break;
        }
    }

    return allItems;
};

function ClientMarketOwnerDashboard() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [deliveryStatusFilterId, setDeliveryStatusFilterId] = useState<number>(0);
    const [paymentTypeFilterId, setPaymentTypeFilterId] = useState<number>(0);
    const [paymentStatusFilterId, setPaymentStatusFilterId] = useState<number>(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [dashboardStats, setDashboardStats] = useState({
        totalOrders: 0,
        toPickup: 0,
        onDelivery: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0,
        codPending: 0,
        totalCustomers: 0,
    });
    const [dashboardOrders, setDashboardOrders] = useState<DashboardOrderRow[]>([]);
    const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatus[]>([]);
    const [statusOrderCounts, setStatusOrderCounts] = useState<Record<number, number>>({});
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
    const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([]);
    const [financialFilters, setFinancialFilters] = useState<FinancialFilters>({
        paymentTypeId: null,
        paymentStatusId: null,
        fromDate: '',
        toDate: '',
    });
    const [financialStats, setFinancialStats] = useState({
        totalRevenue: 0,
        codPending: 0,
        onlinePaidRevenue: 0,
        completedPayments: 0,
    });
    const [chartDatePreset, setChartDatePreset] = useState<ChartDatePreset>('all');
    const [chartFromDate, setChartFromDate] = useState('');
    const [chartToDate, setChartToDate] = useState('');
    const [chartXAxisMode, setChartXAxisMode] = useState<ChartXAxisMode>('day');
    const [chartYAxisMetric, setChartYAxisMetric] = useState<ChartYAxisMetric>('revenue');
    const [chartYMaxInput, setChartYMaxInput] = useState('');

    const decodedToken = useMemo(() => {
        const token = localStorage.getItem('jwtToken');
        if (!token) return null;
        return JwtUtil.decodeToken(token) as DecodedUserData | null;
    }, []);

    const hasMarket = decodedToken?.has_market === true;
    const currentUserId = decodedToken?.userId ?? null;
    const currentUserRoleId = decodedToken?.roleId ?? null;

    const updateFinancialFilters = useCallback((patch: Partial<FinancialFilters>) => {
        setFinancialFilters((current) => ({ ...current, ...patch }));
    }, []);

    const fetchUserOrders = useCallback(async () => {
        if (!currentUserId) return;

        if (!(hasMarket || currentUserRoleId === ROLE_IDS.CLIENT || currentUserRoleId === ROLE_IDS.MARKET_OWNER)) return;

        setIsLoading(true);
        setError(null);

        try {
            const [statusResponse, paymentTypesResponse, paymentStatusesResponse, allOrders] = await Promise.all([
                axiosInstance.get<DeliveryStatusesApiResponse>('/orders/get-delivery-statuses'),
                axiosInstance.get<PaymentTypesApiResponse>('/payment/get-payment-types'),
                axiosInstance.get<PaymentStatusesApiResponse>('/payment/get-payment-statuses'),
                fetchAllOrders(null, null, null, null, null, currentUserId),
            ]);

            setPaymentTypes(parseIdNameOptions<PaymentType>(paymentTypesResponse.data?.object));
            setPaymentStatuses(parseIdNameOptions<PaymentStatus>(paymentStatusesResponse.data?.object));

            const fetchedStatuses = parseIdNameOptions<DeliveryStatus>(statusResponse.data?.object);
            setDeliveryStatuses(fetchedStatuses);

            if (fetchedStatuses.length > 0) {
                const perStatusResults = await Promise.all(
                    fetchedStatuses.map(async (status) => {
                        try {
                            const statusItems = await fetchAllOrders(status.id, null, null, null, null, currentUserId);
                            const statusCount = statusItems.length;
                            return { statusId: status.id, count: statusCount };
                        } catch {
                            return { statusId: status.id, count: 0 };
                        }
                    })
                );

                const nextCounts = perStatusResults.reduce<Record<number, number>>((acc, item) => {
                    acc[item.statusId] = item.count;
                    return acc;
                }, {});
                setStatusOrderCounts(nextCounts);
            } else {
                setStatusOrderCounts({});
            }

            const items = allOrders;
            const totalOrders = items.length;

            const toPickup = items.filter((order) => isReadyToPickupStatus(order.deliveryStatus?.name ?? '')).length;
            const onDelivery = items.filter((order) => isOnTheWayStatus(order.deliveryStatus?.name ?? '')).length;
            const completed = items.filter((order) => {
                const statusName = order.deliveryStatus?.name ?? '';
                const normalizedName = normalizeStatusName(statusName);
                return normalizedName.includes('acceptedbycustomer') || isCompletedStatus(statusName);
            }).length;
            const cancelled = items.filter((order) => {
                const normalized = normalizeStatusName(order.deliveryStatus?.name ?? '');
                return normalized.includes('cancelled') || normalized.includes('returned');
            }).length;
            const totalCustomers = new Set(items.map((order) => (order.deliveryTo?.fullName ?? '').trim()).filter(Boolean)).size;

            setDashboardStats((prev) => ({
                ...prev,
                totalOrders,
                toPickup,
                onDelivery,
                completed,
                cancelled,
                totalRevenue: items.reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0),
                codPending: items
                    .filter((order) => normalizeStatusName(order.paymentType?.name ?? '').includes('cod'))
                    .reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0),
                totalCustomers,
            }));

            const resolvedPaymentTypes = paymentTypesResponse.data.message?.toLowerCase() === 'success'
                ? paymentTypesResponse.data.object ?? []
                : [];
            const resolvedPaymentStatuses = paymentStatusesResponse.data.message?.toLowerCase() === 'success'
                ? paymentStatusesResponse.data.object ?? []
                : [];

            const codTypeId = resolvedPaymentTypes.find((type) => normalizeStatusName(type.name).includes('cod'))?.id ?? null;
            const onlineTypeId = resolvedPaymentTypes.find((type) => normalizeStatusName(type.name).includes('online'))?.id ?? null;
            const pendingStatusId = resolvedPaymentStatuses.find((status) => normalizeStatusName(status.name).includes('pending'))?.id ?? null;
            const paidStatuses = resolvedPaymentStatuses
                .filter((status) => {
                    const normalized = normalizeStatusName(status.name);
                    return normalized.includes('completed') || normalized.includes('paidbycustomer') || normalized.includes('paidbyagent');
                })
                .map((status) => status.id);

            const financialFromDate = financialFilters.fromDate ? `${financialFilters.fromDate}T00:00:00` : null;
            const financialToDate = financialFilters.toDate ? `${financialFilters.toDate}T23:59:59` : null;

            const selectedPaymentTypeId = financialFilters.paymentTypeId;
            const selectedPaymentStatusId = financialFilters.paymentStatusId;

            const filteredOrdersPromise = fetchAllOrders(
                null,
                selectedPaymentStatusId,
                selectedPaymentTypeId,
                financialFromDate,
                financialToDate,
                currentUserId
            );

            const codPendingEligible = (!selectedPaymentTypeId || selectedPaymentTypeId === codTypeId)
                && (!selectedPaymentStatusId || selectedPaymentStatusId === pendingStatusId);

            const codPendingPromise = codTypeId && pendingStatusId && codPendingEligible
                ? fetchAllOrders(null, pendingStatusId, codTypeId, financialFromDate, financialToDate, currentUserId)
                : Promise.resolve([] as ApiOrder[]);

            const onlineEligible = !selectedPaymentTypeId || selectedPaymentTypeId === onlineTypeId;
            const targetPaidStatuses = selectedPaymentStatusId
                ? paidStatuses.includes(selectedPaymentStatusId)
                    ? [selectedPaymentStatusId]
                    : []
                : paidStatuses;

            const onlinePaidPromise = onlineTypeId && onlineEligible
                ? Promise.all(
                    targetPaidStatuses.map((statusId) =>
                        fetchAllOrders(null, statusId, onlineTypeId, financialFromDate, financialToDate, currentUserId)
                    )
                )
                : Promise.resolve([] as ApiOrder[][]);

            const [filteredOrders, codPendingOrders, onlinePaidOrdersByStatus] = await Promise.all([
                filteredOrdersPromise,
                codPendingPromise,
                onlinePaidPromise,
            ]);

            const onlinePaidOrders = (onlinePaidOrdersByStatus as ApiOrder[][]).flat();

            setFinancialStats({
                totalRevenue: filteredOrders.reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0),
                codPending: codPendingOrders.reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0),
                onlinePaidRevenue: onlinePaidOrders.reduce((sum, order) => sum + Number(order.totalPrice ?? 0), 0),
                completedPayments: filteredOrders.length,
            });

            const mappedOrders: DashboardOrderRow[] = items
                .slice()
                .sort((a, b) => {
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
                })
                .map((order) => {
                    const status = mapApiStatusToOrderStatus(order.deliveryStatus?.name);
                    const primaryMobile = order.deliveryTo?.primaryMobile ?? order.deliveryTo?.mobile ?? '';
                    const secondaryMobile = order.deliveryTo?.secondaryMobile ?? '';
                    const mobile = [primaryMobile, secondaryMobile].filter(Boolean).join(' | ') || 'N/A';

                    return {
                        id: order.orderCode?.code ?? `ORD-${order.id ?? 'N/A'}`,
                        customer: order.deliveryTo?.fullName ?? 'Unknown Customer',
                        mobile,
                        amount: Number(order.totalPrice ?? 0),
                        deliveryStatusId: typeof order.deliveryStatus?.id === 'number' ? order.deliveryStatus.id : null,
                        deliveryStatusName: order.deliveryStatus?.name ?? statusLabelByValue[status],
                        status,
                        statusLabel: order.deliveryStatus?.name ?? statusLabelByValue[status],
                        paymentTypeId: typeof order.paymentType?.id === 'number' ? order.paymentType.id : null,
                        paymentTypeName: order.paymentType?.name ?? 'Unknown',
                        payment: normalizeStatusName(order.paymentType?.name ?? '').includes('cod') ? 'COD' : 'Paid',
                        paymentStatusId: typeof order.paymentStatus?.id === 'number' ? order.paymentStatus.id : null,
                        paymentStatusName: order.paymentStatus?.name ?? 'Unknown',
                        createdAt: order.createdAt ?? null,
                        address: order.deliveryTo?.address ?? 'No address',
                    };
                });

            setDashboardOrders(mappedOrders);
        } catch {
            setDashboardOrders([]);
            setDeliveryStatuses([]);
            setStatusOrderCounts({});
            setPaymentTypes([]);
            setPaymentStatuses([]);
            setFinancialStats({
                totalRevenue: 0,
                codPending: 0,
                onlinePaidRevenue: 0,
                completedPayments: 0,
            });
            setError('Failed to connect to orders service.');
        } finally {
            setIsLoading(false);
        }
    }, [hasMarket, currentUserId, decodedToken, financialFilters.fromDate, financialFilters.paymentStatusId, financialFilters.paymentTypeId, financialFilters.toDate]);

    useEffect(() => {
        void fetchUserOrders();
    }, [fetchUserOrders]);

    const navigateToPlacedOrders = (deliveryStatusId: number | null) => {
        navigate(`/deliverYya-cloud-console/placed-orders?deliveryStatusId=${deliveryStatusId ?? 0}`);
    };

    const navigateToPlacedOrder = (orderCode: string) => {
        navigate(`/deliverYya-cloud-console/placed-orders?orderCode=${encodeURIComponent(orderCode)}`);
    };

    const orderStatusCards = useMemo(
        () =>
            deliveryStatuses.map((status) => ({
                id: status.id,
                name: toStatusLabel(status.name),
                count: statusOrderCounts[status.id] ?? 0,
            })),
        [deliveryStatuses, statusOrderCounts]
    );

    const deliveryStatusOptions = useMemo(
        () => [
            { value: 0, label: 'All delivery statuses' },
            ...deliveryStatuses.map((status) => ({ value: status.id, label: toStatusLabel(status.name) })),
        ] satisfies SelectOption<number>[],
        [deliveryStatuses]
    );

    const paymentTypeOptions = useMemo(
        () => [
            { value: 0, label: 'All payment types' },
            ...paymentTypes.map((type) => ({ value: type.id, label: toStatusLabel(type.name) })),
        ] satisfies SelectOption<number>[],
        [paymentTypes]
    );

    const paymentStatusOptions = useMemo(
        () => [
            { value: 0, label: 'All payment statuses' },
            ...paymentStatuses.map((status) => ({ value: status.id, label: toStatusLabel(status.name) })),
        ] satisfies SelectOption<number>[],
        [paymentStatuses]
    );

    const pageSizeSelectOptions = useMemo(() => [5, 10, 20, 50].map((size) => ({ value: size, label: String(size) })), []);

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        return dashboardOrders.filter((order) => {
            if (deliveryStatusFilterId !== 0 && order.deliveryStatusId !== deliveryStatusFilterId) return false;
            if (paymentTypeFilterId !== 0 && order.paymentTypeId !== paymentTypeFilterId) return false;
            if (paymentStatusFilterId !== 0 && order.paymentStatusId !== paymentStatusFilterId) return false;

            if (!query) return true;

            return (
                order.id.toLowerCase().includes(query) ||
                order.customer.toLowerCase().includes(query) ||
                order.address.toLowerCase().includes(query) ||
                order.mobile.toLowerCase().includes(query) ||
                order.deliveryStatusName.toLowerCase().includes(query) ||
                order.paymentTypeName.toLowerCase().includes(query) ||
                order.paymentStatusName.toLowerCase().includes(query) ||
                order.payment.toLowerCase().includes(query)
            );
        });
    }, [dashboardOrders, search, deliveryStatusFilterId, paymentTypeFilterId, paymentStatusFilterId]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredOrders.length / pageSize)), [filteredOrders.length, pageSize]);

    useEffect(() => {
        setPage((currentPage) => Math.min(currentPage, totalPages - 1));
    }, [totalPages]);

    const paginatedOrders = useMemo(() => {
        const start = page * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, page, pageSize]);

    const chartDateRange = useMemo(() => {
        const validDateValues = dashboardOrders
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
    }, [chartDatePreset, chartFromDate, chartToDate, dashboardOrders]);

    const chartFilteredOrders = useMemo(
        () =>
            dashboardOrders.filter((order) => {
                if (!order.createdAt) return false;
                const createdAt = new Date(order.createdAt);
                if (Number.isNaN(createdAt.getTime())) return false;
                return createdAt >= chartDateRange.start && createdAt <= chartDateRange.end;
            }),
        [chartDateRange.end, chartDateRange.start, dashboardOrders]
    );

    const chartYMax = useMemo(() => {
        const parsedMax = Number(chartYMaxInput);
        return Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : null;
    }, [chartYMaxInput]);

    const revenueData = useMemo(
        () => buildRevenueTrendData(chartFilteredOrders, chartDateRange.start, chartDateRange.end, chartXAxisMode),
        [chartDateRange.end, chartDateRange.start, chartFilteredOrders, chartXAxisMode]
    );

    const chartDatePresetOptions = useMemo(
        () => [
            { value: 'all', label: 'All Time' },
            { value: '90d', label: 'Last 90 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '7d', label: 'Last 7 Days' },
            { value: 'custom', label: 'Custom Range' },
        ] satisfies SelectOption<ChartDatePreset>[],
        []
    );

    const chartXAxisOptions = useMemo(
        () => [
            { value: 'day', label: 'X: Daily' },
            { value: 'week', label: 'X: Weekly' },
            { value: 'month', label: 'X: Monthly' },
        ] satisfies SelectOption<ChartXAxisMode>[],
        []
    );

    const chartYAxisMetricOptions = useMemo(
        () => [
            { value: 'revenue', label: 'Y: Revenue' },
            { value: 'orders', label: 'Y: Orders' },
        ] satisfies SelectOption<ChartYAxisMetric>[],
        []
    );

    const orderStatusData = useMemo(
        () => {
            const statusKeys: DashboardOrderRow['status'][] = ['to-accept', 'to-pickup', 'on-delivery', 'completed', 'cancelled'];
            const counts = chartFilteredOrders.reduce<Record<DashboardOrderRow['status'], number>>(
                (acc, order) => {
                    acc[order.status] += 1;
                    return acc;
                },
                {
                    'to-accept': 0,
                    'to-pickup': 0,
                    'on-delivery': 0,
                    completed: 0,
                    cancelled: 0,
                }
            );

            const colorByStatus: Record<DashboardOrderRow['status'], string> = {
                'to-accept': '#FACC15',
                'to-pickup': '#A78BFA',
                'on-delivery': '#60A5FA',
                completed: '#34D399',
                cancelled: '#F87171',
            };

            return statusKeys
                .map((status) => ({
                    name: statusLabelByValue[status],
                    value: counts[status],
                    color: colorByStatus[status],
                }))
                .filter((status) => status.value > 0);
        },
        [chartFilteredOrders]
    );

    return (
        <div className="min-h-screen pb-8">
            <DashboardHeader />

            <OrderStatusOverview
                totalOrders={dashboardStats.totalOrders}
                statusCards={orderStatusCards}
                onStatusClick={(deliveryStatusId) => {
                    navigateToPlacedOrders(deliveryStatusId);
                }}
            />

            <FinancialOverview
                stats={{
                    totalRevenue: financialStats.totalRevenue,
                    codPending: financialStats.codPending,
                    onlinePaidRevenue: financialStats.onlinePaidRevenue,
                    completedPayments: financialStats.completedPayments,
                }}
                paymentTypes={paymentTypes}
                paymentStatuses={paymentStatuses}
                filters={financialFilters}
                onFilterChange={updateFinancialFilters}
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Date Range</p>
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
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">X-Axis Mode</p>
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
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Y-Axis Metric</p>
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
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Custom Y Max</p>
                        <input
                            type="number"
                            min={1}
                            value={chartYMaxInput}
                            onChange={(event) => setChartYMaxInput(event.target.value)}
                            placeholder="Custom Y max (optional)"
                            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                        />
                    </div>


                    <div className="flex items-center justify-end">
                        <button
                            onClick={() => {
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
                // deliveryPerformance={deliveryPerformance}
                />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <h3 className="px-6 pt-6 text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ClockIcon className="w-7 h-7 text-[#FFA726]" />
                        Recent Orders
                    </h3>

                    <div className="md:hidden mb-4 px-6 pt-6 w-full">
                        <button
                            onClick={() => setIsFiltersExpanded((prev) => !prev)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-[#F59B0F] transition-all"
                        >
                            <span className="font-semibold text-gray-900">Order Filters</span>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-600 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className={`${isFiltersExpanded ? 'block' : 'hidden'} md:block px-6 pb-4`}>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(0);
                                }}
                                placeholder="Search by order code, customer, address, mobile, payment or status..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <Select<SelectOption<number>, false>
                                value={deliveryStatusOptions.find((option) => option.value === deliveryStatusFilterId) ?? deliveryStatusOptions[0]}
                                onChange={(option) => {
                                    setDeliveryStatusFilterId(option ? option.value : 0);
                                    setPage(0);
                                }}
                                options={deliveryStatusOptions}
                                styles={customSelectFieldStyles}
                            />

                            <Select<SelectOption<number>, false>
                                value={paymentTypeOptions.find((option) => option.value === paymentTypeFilterId) ?? paymentTypeOptions[0]}
                                onChange={(option) => {
                                    setPaymentTypeFilterId(option ? option.value : 0);
                                    setPage(0);
                                }}
                                options={paymentTypeOptions}
                                styles={customSelectFieldStyles}
                            />

                            <Select<SelectOption<number>, false>
                                value={paymentStatusOptions.find((option) => option.value === paymentStatusFilterId) ?? paymentStatusOptions[0]}
                                onChange={(option) => {
                                    setPaymentStatusFilterId(option ? option.value : 0);
                                    setPage(0);
                                }}
                                options={paymentStatusOptions}
                                styles={customSelectFieldStyles}
                            />

                            <button
                                onClick={() => {
                                    setSearch('');
                                    setDeliveryStatusFilterId(0);
                                    setPaymentTypeFilterId(0);
                                    setPaymentStatusFilterId(0);
                                    setPage(0);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="text-sm text-gray-700">
                                {isLoading ? (
                                    <span className="text-gray-500">Loading...</span>
                                ) : (
                                    <>
                                        Showing <span className="font-bold text-gray-900">{paginatedOrders.length}</span> of{' '}
                                        <span className="font-bold text-gray-900">{filteredOrders.length}</span> filtered orders
                                    </>
                                )}
                            </div>

                            <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end">
                                <div className="flex items-center justify-between sm:justify-start gap-2">
                                    <span className="text-sm text-gray-600 font-medium">Per page:</span>
                                    <div className="w-28 sm:min-w-32 sm:w-auto">
                                        <CreatableSelect<SelectOption<number>, false>
                                            value={pageSizeSelectOptions.find((option) => option.value === pageSize) ?? { value: pageSize, label: String(pageSize) }}
                                            onChange={(option) => {
                                                const nextPageSize = option ? option.value : 10;
                                                setPageSize(nextPageSize);
                                                setPage(0);
                                            }}
                                            onCreateOption={(inputValue) => {
                                                const nextPageSize = Number(inputValue.trim());
                                                if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) return;
                                                setPageSize(nextPageSize);
                                                setPage(0);
                                            }}
                                            isValidNewOption={(inputValue) => {
                                                const nextPageSize = Number(inputValue.trim());
                                                if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) return false;
                                                return !pageSizeSelectOptions.some((option) => option.value === nextPageSize);
                                            }}
                                            formatCreateLabel={(inputValue) => `Use ${inputValue} rows`}
                                            options={pageSizeSelectOptions}
                                            styles={customSelectFieldStyles}
                                            className="react-select-container"
                                            classNamePrefix="react-select"
                                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                            instanceId="client-market-owner-dashboard-page-size"
                                            aria-label="Per page"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-start gap-2">
                                    <button
                                        onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                                        disabled={page <= 0 || isLoading}
                                        className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200"
                                    >
                                        <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                                    </button>

                                    <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                                        {page + 1} / {totalPages}
                                    </div>

                                    <button
                                        onClick={() => setPage((currentPage) => Math.min(totalPages - 1, currentPage + 1))}
                                        disabled={page >= totalPages - 1 || isLoading}
                                        className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200"
                                    >
                                        <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                                    </button>

                                    <button
                                        onClick={() => void fetchUserOrders()}
                                        disabled={isLoading}
                                        className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                                        title="Refresh orders"
                                    >
                                        <ArrowPathIcon className={`w-5 h-5 text-gray-700 ${isLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                        <p className="font-bold">Error loading dashboard orders</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Order</th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Customer</th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Payment</th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Total <small>(LKR)</small></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-orange-50/40 transition-colors">
                                    <td className="py-4 px-4">
                                        <button
                                            type="button"
                                            onClick={() => navigateToPlacedOrder(order.id)}
                                            className="font-bold text-gray-900 hover:text-[#AC6C2A] hover:underline transition-colors"
                                            title={`View details for ${order.id}`}
                                        >
                                            {order.id}
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-700 text-center">{formatOrderDate(order.createdAt)}</td>
                                    <td className="py-4 px-4 min-w-65">
                                        <p className="font-semibold text-gray-900 text-sm">{order.customer}</p>
                                        <p className="text-xs text-gray-600 mt-1">{order.address}</p>
                                        <p className="text-xs text-gray-700 mt-0.5 font-medium">Mobile: {order.mobile}</p>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${order.payment === 'COD' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'}`}>
                                            {order.payment}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadgeClass(order.status)}`}>
                                            {order.statusLabel || statusLabelByValue[order.status]}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCurrency(order.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!isLoading && paginatedOrders.length === 0 && (
                    <div className="text-center py-12">
                        <TruckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No orders found for this filter</p>
                    </div>
                )}
            </div>

        </div >
    );
}

export default ClientMarketOwnerDashboard;
