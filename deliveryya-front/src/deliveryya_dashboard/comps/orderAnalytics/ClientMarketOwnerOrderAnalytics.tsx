import { ArrowPathIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentIcon, CurrencyDollarIcon, DocumentArrowDownIcon, MagnifyingGlassIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StylesConfig } from 'react-select';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Swal from 'sweetalert2';
import axiosInstance from '../../../util/AxiosUtil';
import JwtUtil from '../../../util/JwtUtil';
import { getCurrentUserId } from '../../../util/AccessController';
import { getCurrentUserRoleId, ROLE_IDS } from '../../../util/RoleAccess';
import {
  runSettlementReportAction,
  runCustomReportAction,
  type SettlementReportInput,
  type CustomReportInput,
  type CustomReportColumnKey,
} from '../pdfGenaretor/templates/SettlementReport.tsx';

interface ApiCity {
  id: number;
  name: string;
}

interface ApiStatus {
  id: number;
  name: string;
}

interface ApiOrder {
  id: number;
  marketOrder?: {
    id?: number;
  } | null;
  sendingUserId?: number;
  discount: number;
  deliveryFee: number;
  collectivePrice: number;
  paidAmount?: number;
  dontCollectDeliveryFeeFromCustomer?: boolean;
  qty: number;
  totalPrice: number;
  deliveryStatus: ApiStatus;
  paymentStatus: ApiStatus;
  paymentType: ApiStatus;
  deliveryTo?: {
    fullName?: string;
    city?: ApiCity;
  };
  orderCode?: {
    code?: string;
  };
  createdAt?: string;
  createdDate?: string;
  orderDate?: string;
  createdOn?: string;
  date?: string;
}

interface OrdersResponse {
  message: string;
  desc?: string;
  object?: {
    items?: ApiOrder[];
    totalCount?: number;
    totalPages?: number;
    totalElements?: number;
    total?: number;
  };
}

interface CitiesApiResponse {
  message: string;
  object?: {
    items?: ApiCity[];
  };
}

interface OrdersRequestBody {
  pageNumber: number;
  countPerPage: number;
  totalCount: number;
  totalPages: number;
  cityId: number;
  orderId: number;
  userId: number;
  markerOrderId: number;
  orderCode: string;
  sendingUserId: number;
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
}

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type QuickDateFilter = 'all' | 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

type DeliveryStatus = {
  id: number;
  name: string;
};

type PaymentType = {
  id: number;
  name: string;
};

type PaymentStatus = {
  id: number;
  name: string;
};

type DeliveryStatusesApiResponse = {
  message?: string;
  object?: DeliveryStatus[];
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

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const TABLE_COLUMN_DEFS: Array<{ key: CustomReportColumnKey; label: string; align?: 'left' | 'center' | 'right' }> = [
  { key: 'orderCode', label: 'Order', align: 'left' },
  { key: 'date', label: 'Date', align: 'center' },
  { key: 'customerName', label: 'Customer', align: 'left' },
  { key: 'paymentStatus', label: 'Payment', align: 'center' },
  { key: 'deliveryStatus', label: 'Status', align: 'center' },
  { key: 'collectivePrice', label: 'Collectible (LKR)', align: 'right' },
  { key: 'totalPrice', label: 'Settlement (LKR)', align: 'right' },
];

const createCustomSelectFieldStyles = <Option, IsMulti extends boolean = false>(): StylesConfig<Option, IsMulti> => ({
  control: (base, state) => ({
    ...base,
    padding: '0.2rem',
    borderWidth: '2px',
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    borderRadius: '0.75rem',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
    '&:hover': { borderColor: '#FCD34D' },
    transition: 'all 0.3s',
    backgroundColor: 'white',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
  }),
});

const monthSelectStyles = createCustomSelectFieldStyles<SelectOption<string>>() as StylesConfig<SelectOption<string>, false>;
const numericSelectStyles = createCustomSelectFieldStyles<SelectOption<number>>() as StylesConfig<SelectOption<number>, false>;

const formatCurrency = (value: number) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toAmount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const getStatusId = (status?: { id?: number }): number | null => toPositiveInteger(status?.id ?? null);

const SUCCESS_DELIVERY_STATUS_IDS = new Set([7, 10]);
const RETURNED_DELIVERY_STATUS_ID = 9;

const getOrderSettlementAmount = (order: ApiOrder): number => {
  const deliveryStatusId = getStatusId(order.deliveryStatus);
  const deliveryFee = Math.max(0, toAmount(order.deliveryFee));
  const collectivePrice = Math.max(0, toAmount(order.collectivePrice));

  if (deliveryStatusId === RETURNED_DELIVERY_STATUS_ID) return -deliveryFee;
  if (deliveryStatusId !== null && SUCCESS_DELIVERY_STATUS_IDS.has(deliveryStatusId)) {
    return Math.max(0, collectivePrice - deliveryFee);
  }

  return 0;
};

const getAnalyticsSettlementAmount = (order: ApiOrder): number => {
  const totalPrice = toAmount(order.totalPrice);
  if (totalPrice > 0) return totalPrice;

  const collectivePrice = Math.max(0, toAmount(order.collectivePrice));
  const deliveryFee = Math.max(0, toAmount(order.deliveryFee));
  return Math.max(0, collectivePrice - deliveryFee);
};

const copyOrderCodeToClipboard = async (orderCode: string) => {
  const code = orderCode.trim();
  if (!code || code === 'N/A') {
    await Swal.fire({
      icon: 'warning',
      title: 'No code to copy',
      text: 'This order does not have a valid order code.',
      confirmButtonColor: '#F59B0F',
    });
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
    await Swal.fire({
      icon: 'success',
      title: 'Code copied',
      text: `${code} has been copied to clipboard.`,
      timer: 1400,
      showConfirmButton: false,
      confirmButtonColor: '#F59B0F',
    });
  } catch (copyError) {
    console.error('Failed to copy order code:', copyError);
    await Swal.fire({
      icon: 'error',
      title: 'Copy failed',
      text: 'Unable to copy the order code to clipboard.',
      confirmButtonColor: '#F59B0F',
    });
  }
};

const formatDateForApi = (value: Date, endOfDay = false): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T${endOfDay ? '23:59:59' : '00:00:00'}`;
};

const extractOrdersPage = (
  data: OrdersResponse,
  fallbackPageNumber: number,
  fallbackPageSize: number
): { items: ApiOrder[]; totalCount: number | null; totalPages: number } => {
  const responseObject = data.object;
  const items = responseObject?.items || [];
  const totalCount = toPositiveInteger(responseObject?.totalCount ?? responseObject?.totalElements ?? responseObject?.total);
  const totalPagesFromResponse = toPositiveInteger(responseObject?.totalPages);

  if (totalPagesFromResponse) {
    return { items, totalCount, totalPages: totalPagesFromResponse };
  }

  if (totalCount) {
    return { items, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / fallbackPageSize)) };
  }

  return {
    items,
    totalCount: null,
    totalPages: items.length < fallbackPageSize ? Math.max(1, fallbackPageNumber + 1) : Math.max(1, fallbackPageNumber + 2),
  };
};

const getOrderDate = (order: ApiOrder): Date | null => {
  const rawValue = order.createdAt ?? order.createdDate ?? order.orderDate ?? order.createdOn ?? order.date ?? null;
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getStatusBadge = (statusName?: string) => {
  const normalized = statusName?.toLowerCase() ?? '';
  if (normalized.includes('deliver')) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (normalized.includes('pending') || normalized.includes('pennding')) return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
  if (normalized.includes('cancel')) return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  if (normalized.includes('return')) return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
  return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
};

const getQuickDateRangeText = (quickDateFilter: QuickDateFilter): string => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const mondayOffset = (now.getDay() + 6) % 7;
  const startOfThisWeek = new Date(startOfToday);
  startOfThisWeek.setDate(startOfToday.getDate() - mondayOffset);
  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
  endOfThisWeek.setHours(23, 59, 59, 999);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
  const endOfLastWeek = new Date(startOfThisWeek);
  endOfLastWeek.setMilliseconds(-1);

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const fmt = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (quickDateFilter === 'today') return `Today (${fmt(startOfToday)})`;
  if (quickDateFilter === 'thisWeek') return `This Week (${fmt(startOfThisWeek)} - ${fmt(endOfThisWeek)})`;
  if (quickDateFilter === 'lastWeek') return `Last Week (${fmt(startOfLastWeek)} - ${fmt(endOfLastWeek)})`;
  if (quickDateFilter === 'thisMonth') return `This Month (${fmt(startOfThisMonth)} - ${fmt(endOfThisMonth)})`;
  if (quickDateFilter === 'lastMonth') return `Last Month (${fmt(startOfLastMonth)} - ${fmt(endOfLastMonth)})`;
  return 'All dates';
};

function ClientMarketOwnerOrderAnalytics() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<ApiCity[]>([]);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState(0);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(0);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState(0);
  const [cityFilter, setCityFilter] = useState(0);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [quickDateFilter, setQuickDateFilter] = useState<QuickDateFilter>('all');
  const [, setTotalCount] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [allFilteredOrdersForSummary, setAllFilteredOrdersForSummary] = useState<ApiOrder[]>([]);
  const [, setIsFetchingSummary] = useState(false);
  const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatus[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([]);
  const [isGeneratingSettlementReport, setIsGeneratingSettlementReport] = useState(false);
  const [isGeneratingCommonReport, setIsGeneratingCommonReport] = useState(false);
  const [customReportColumns, setCustomReportColumns] = useState<CustomReportColumnKey[]>(['orderCode', 'date', 'customerName', 'paymentStatus', 'deliveryStatus', 'totalPrice', 'collectivePrice']);
  const [isCustomReportExpanded, setIsCustomReportExpanded] = useState(false);
  const [isTableColumnsOpen, setIsTableColumnsOpen] = useState(false);
  const tableColumnsMenuRef = useRef<HTMLDivElement | null>(null);
  const currentUserRoleId = getCurrentUserRoleId();
  const scopeLabel = useMemo(() => {
    const roleLabel = currentUserRoleId === ROLE_IDS.MARKET_OWNER ? 'Market Owner' : 'Client';
    const token = localStorage.getItem('jwtToken');
    const decoded = token ? JwtUtil.decodeToken(token) : null;
    const fullName = `${decoded?.firstName || ''} ${decoded?.lastName || ''}`.trim();
    return fullName ? `${fullName}` : roleLabel;
  }, [currentUserRoleId]);

  const userId = useMemo(() => getCurrentUserId(), []);
  const isAllMonthsSelected = selectedMonth === '';

  const resolvedDateRange = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const mondayOffset = (now.getDay() + 6) % 7;
    const startOfThisWeek = new Date(startOfToday);
    startOfThisWeek.setDate(startOfToday.getDate() - mondayOffset);
    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    if (quickDateFilter === 'today') {
      return { fromDate: formatDateForApi(startOfToday), toDate: formatDateForApi(endOfToday, true) };
    }
    if (quickDateFilter === 'thisWeek') {
      return { fromDate: formatDateForApi(startOfThisWeek), toDate: formatDateForApi(endOfThisWeek, true) };
    }
    if (quickDateFilter === 'lastWeek') {
      return { fromDate: formatDateForApi(startOfLastWeek), toDate: formatDateForApi(endOfLastWeek, true) };
    }
    if (quickDateFilter === 'thisMonth') {
      return { fromDate: formatDateForApi(startOfThisMonth), toDate: formatDateForApi(endOfThisMonth, true) };
    }
    if (quickDateFilter === 'lastMonth') {
      return { fromDate: formatDateForApi(startOfLastMonth), toDate: formatDateForApi(endOfLastMonth, true) };
    }

    if (selectedMonth) {
      const selected = Number(selectedMonth);
      const year = now.getFullYear();
      const monthStart = new Date(year, selected - 1, 1);
      const monthEnd = new Date(year, selected, 0);
      return { fromDate: formatDateForApi(monthStart), toDate: formatDateForApi(monthEnd, true) };
    }

    return {
      fromDate: startDate ? `${startDate}T00:00:00` : '',
      toDate: endDate ? `${endDate}T23:59:59` : '',
    };
  }, [quickDateFilter, selectedMonth, startDate, endDate]);

  const buildOrdersRequestBody = useCallback((pageNumber: number, countPerPage: number): OrdersRequestBody => {
    return {
      pageNumber,
      countPerPage,
      totalCount: 0,
      totalPages: 0,
      cityId: cityFilter,
      orderId: 0,
      userId: 0,
      markerOrderId: 0,
      orderCode: '',
      sendingUserId: userId ?? 0,
      receivingUserId: 0,
      deliveryStatusId: deliveryStatusFilter,
      paymentStatusId: paymentStatusFilter,
      paymentTypeId: paymentTypeFilter,
      minPrice: minPrice.trim() === '' ? 0 : Number(minPrice),
      maxPrice: maxPrice.trim() === '' ? 0 : Number(maxPrice),
      fromDate: resolvedDateRange.fromDate,
      toDate: resolvedDateRange.toDate,
      dontCollectDeliveryFeeFromCustomer: false,
      search: search.trim(),
    };
  }, [
    userId,
    cityFilter,
    deliveryStatusFilter,
    paymentStatusFilter,
    paymentTypeFilter,
    minPrice,
    maxPrice,
    search,
    resolvedDateRange.fromDate,
    resolvedDateRange.toDate,
  ]);

  const fetchAllFilteredOrders = useCallback(async (): Promise<ApiOrder[]> => {
    if (!userId) return [];

    const token = localStorage.getItem('jwtToken');
    const pageSize = 200;
    let pageNumber = 0;
    let resolvedTotalPages = 1;
    const allOrders: ApiOrder[] = [];

    try {
      while (pageNumber < resolvedTotalPages) {
        const response = await axiosInstance.post<OrdersResponse>('/orders/get-orders', buildOrdersRequestBody(pageNumber, pageSize), {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          withCredentials: true,
        });

        if (response.data.message?.toLowerCase() !== 'success') break;

        const parsedPage = extractOrdersPage(response.data, pageNumber, pageSize);
        allOrders.push(...parsedPage.items);
        resolvedTotalPages = Math.max(1, parsedPage.totalPages);

        if (parsedPage.items.length === 0) break;
        pageNumber += 1;
      }
    } catch (error) {
      console.error('Error fetching all filtered orders:', error);
    }

    return Array.from(new Map(allOrders.map((order) => [order.id, order])).values());
  }, [userId, buildOrdersRequestBody]);

  const handleGenerateSettlementReport = async (action: 'print' | 'download') => {
    if (!selectedMonth) {
      alert('Please select a month to generate the settlement report.');
      return;
    }

    setIsGeneratingSettlementReport(true);
    try {
      const reportOrders = await fetchAllFilteredOrders();
      const monthLabel = MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || selectedMonth;
      const reportAppliedFilters: string[] = [
        `Date: ${monthLabel} ${new Date().getFullYear()}`,
        ...(deliveryStatusFilter !== 0 ? [`Delivery Status: ${deliveryStatusOptions.find((option) => option.value === deliveryStatusFilter)?.label || deliveryStatusFilter}`] : []),
        ...(paymentStatusFilter !== 0 ? [`Payment Status: ${paymentStatusOptions.find((option) => option.value === paymentStatusFilter)?.label || paymentStatusFilter}`] : []),
        ...(paymentTypeFilter !== 0 ? [`Payment Type: ${paymentTypeOptions.find((option) => option.value === paymentTypeFilter)?.label || paymentTypeFilter}`] : []),
        ...(cityFilter !== 0 ? [`City: ${cityOptions.find((option) => option.value === cityFilter)?.label || cityFilter}`] : []),
        ...(search.trim() ? [`Search: ${search.trim()}`] : []),
      ];
      const reportInput: SettlementReportInput = {
        scopeLabel,
        dateRangeLabel: `${monthLabel} ${new Date().getFullYear()}`,
        reportType: 'client-market',
        userRoleId: currentUserRoleId,
        appliedFilters: reportAppliedFilters,
        subjectDetails: {
          name: scopeLabel,
          address: '',
        },
        orders: reportOrders.map((order) => ({
          id: order.id,
          marketOrder: order.marketOrder,
          orderCode: order.orderCode?.code,
          createdAt: order.createdAt,
          createdDate: order.createdDate,
          orderDate: order.orderDate,
          createdOn: order.createdOn,
          date: order.date,
          deliveryTo: order.deliveryTo,
          paymentStatus: order.paymentStatus,
          paymentType: order.paymentType,
          deliveryStatus: order.deliveryStatus,
          deliveryFee: order.deliveryFee,
          collectivePrice: order.collectivePrice,
          totalPrice: order.totalPrice,
        })),
      };

      await runSettlementReportAction(
        reportInput,
        action,
        `Settlement_Report_${scopeLabel.replace(/[^a-z0-9]+/gi, '_')}_${monthLabel.replace(/[^a-z0-9]+/gi, '_')}.pdf`
      );
    } catch (error) {
      console.error('Error preparing settlement report:', error);
      alert('Failed to prepare settlement report. Please try again.');
    } finally {
      setIsGeneratingSettlementReport(false);
    }
  };

  const handleGenerateCommonReport = async (action: 'print' | 'download') => {
    if (customReportColumns.length === 0) {
      alert('Please select at least one column to include in the report.');
      return;
    }

    setIsGeneratingCommonReport(true);
    try {
      const reportOrders = await fetchAllFilteredOrders();
      const monthLabel = MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || selectedMonth;
      const computedDateRangeLabel = selectedMonth
        ? `${monthLabel} ${new Date().getFullYear()}`
        : quickDateFilter !== 'all'
          ? getQuickDateRangeText(quickDateFilter)
          : (startDate || endDate)
            ? `${startDate || 'N/A'} - ${endDate || 'N/A'}`
            : 'All dates';
      const reportAppliedFilters: string[] = [
        `Date: ${computedDateRangeLabel}`,
        ...(deliveryStatusFilter !== 0 ? [`Delivery Status: ${deliveryStatusOptions.find((option) => option.value === deliveryStatusFilter)?.label || deliveryStatusFilter}`] : []),
        ...(paymentStatusFilter !== 0 ? [`Payment Status: ${paymentStatusOptions.find((option) => option.value === paymentStatusFilter)?.label || paymentStatusFilter}`] : []),
        ...(paymentTypeFilter !== 0 ? [`Payment Type: ${paymentTypeOptions.find((option) => option.value === paymentTypeFilter)?.label || paymentTypeFilter}`] : []),
        ...(cityFilter !== 0 ? [`City: ${cityOptions.find((option) => option.value === cityFilter)?.label || cityFilter}`] : []),
        ...(search.trim() ? [`Search: ${search.trim()}`] : []),
      ];

      const reportInput: CustomReportInput = {
        scopeLabel,
        dateRangeLabel: computedDateRangeLabel,
        reportType: 'client-market',
        userRoleId: currentUserRoleId,
        appliedFilters: reportAppliedFilters,
        selectedColumns: customReportColumns,
        subjectDetails: {
          name: scopeLabel,
          address: '',
        },
        orders: reportOrders.map((order) => ({
          id: order.id,
          marketOrder: order.marketOrder,
          orderCode: order.orderCode?.code,
          createdAt: order.createdAt,
          createdDate: order.createdDate,
          orderDate: order.orderDate,
          createdOn: order.createdOn,
          date: order.date,
          deliveryTo: order.deliveryTo,
          paymentStatus: order.paymentStatus,
          paymentType: order.paymentType,
          deliveryStatus: order.deliveryStatus,
          deliveryFee: order.deliveryFee,
          collectivePrice: order.collectivePrice,
          totalPrice: order.totalPrice,
        })),
      };

      await runCustomReportAction(
        reportInput,
        action,
        `Common_Report_${scopeLabel.replace(/[^a-z0-9]+/gi, '_')}_${Date.now()}.pdf`
      );
    } catch (error) {
      console.error('Error preparing common report:', error);
      alert('Failed to prepare common report. Please try again.');
    } finally {
      setIsGeneratingCommonReport(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setError('Unable to identify the logged-in user. Please sign in again.');
      setOrders([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('jwtToken');
      const response = await axiosInstance.post<OrdersResponse>('/orders/get-orders', buildOrdersRequestBody(page, pageSize), {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        withCredentials: true,
      });

      if (response.data.message?.toLowerCase() === 'success') {
        const parsedPage = extractOrdersPage(response.data, page, pageSize);
        setOrders(parsedPage.items);
        setTotalCount(parsedPage.totalCount);
        setTotalPages(parsedPage.totalPages);
      } else {
        setError(response.data.desc || 'Failed to load analytics data');
        setOrders([]);
        setTotalCount(null);
        setTotalPages(1);
      }
    } catch (fetchError) {
      console.error('Error loading order analytics:', fetchError);
      setError('Failed to connect to orders service');
      setOrders([]);
      setTotalCount(null);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    page,
    pageSize,
    buildOrdersRequestBody,
  ]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const loadSummaryData = async () => {
      setIsFetchingSummary(true);
      try {
        const allOrders = await fetchAllFilteredOrders();
        setAllFilteredOrdersForSummary(allOrders);
      } catch (error) {
        console.error('Error loading summary data:', error);
      } finally {
        setIsFetchingSummary(false);
      }
    };

    void loadSummaryData();
  }, [fetchAllFilteredOrders]);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    axiosInstance
      .post<CitiesApiResponse>(
        '/users/get-cities',
        { pageNumber: 0, countPerPage: 80 },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          withCredentials: true,
        }
      )
      .then((res) => {
        if (res.data.message?.toLowerCase() === 'success') {
          setAvailableCities(res.data.object?.items || []);
        }
      })
      .catch((err) => console.error('Failed to load cities:', err));
  }, []);

  useEffect(() => {
    const loadStatusesAndTypes = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        const headers = {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        const [deliveryStatusRes, paymentTypeRes, paymentStatusRes] = await Promise.all([
          axiosInstance.get<DeliveryStatusesApiResponse>('/orders/get-delivery-statuses', { headers, withCredentials: true }),
          axiosInstance.get<PaymentTypesApiResponse>('/payment/get-payment-types', { headers, withCredentials: true }),
          axiosInstance.get<PaymentStatusesApiResponse>('/payment/get-payment-statuses', { headers, withCredentials: true }),
        ]);

        setDeliveryStatuses(parseIdNameOptions<DeliveryStatus>(deliveryStatusRes.data?.object));
        setPaymentTypes(parseIdNameOptions<PaymentType>(paymentTypeRes.data?.object));
        setPaymentStatuses(parseIdNameOptions<PaymentStatus>(paymentStatusRes.data?.object));
      } catch (err) {
        console.error('Failed to load statuses and types:', err);
      }
    };

    void loadStatusesAndTypes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!tableColumnsMenuRef.current) return;
      if (!tableColumnsMenuRef.current.contains(event.target as Node)) {
        setIsTableColumnsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deliveryStatusOptions = useMemo(
    () => [
      { value: 0, label: 'All statuses' },
      ...deliveryStatuses.map((status) => ({ value: status.id, label: status.name })),
    ],
    [deliveryStatuses]
  );

  const paymentStatusOptions = useMemo(
    () => [
      { value: 0, label: 'All payment statuses' },
      ...paymentStatuses.map((status) => ({ value: status.id, label: status.name })),
    ],
    [paymentStatuses]
  );

  const paymentTypeOptions = useMemo(
    () => [
      { value: 0, label: 'All payment types' },
      ...paymentTypes.map((type) => ({ value: type.id, label: type.name })),
    ],
    [paymentTypes]
  );
  const cityOptions = useMemo(
    () => [{ value: 0, label: 'All cities' }, ...availableCities.map((city) => ({ value: city.id, label: city.name }))],
    [availableCities]
  );
  const pageSizeSelectOptions = useMemo(
    () => [5, 10, 20, 50].map((size) => ({ value: size, label: String(size) })),
    []
  );
  const visibleTableColumns = useMemo(() => TABLE_COLUMN_DEFS.filter((col) => customReportColumns.includes(col.key)), [customReportColumns]);
  const filteredOrders = useMemo(() => {
    if (cityFilter === 0) return orders;
    return orders.filter((order) => order.deliveryTo?.city?.id === cityFilter);
  }, [orders, cityFilter]);

  const summary = useMemo(() => {
    const summaryOrders = cityFilter === 0 ? allFilteredOrdersForSummary : allFilteredOrdersForSummary.filter((order) => order.deliveryTo?.city?.id === cityFilter);
    const totalOrders = summaryOrders.length;
    const grossCollectible = summaryOrders.reduce((sum, order) => sum + Math.max(0, toAmount(order.collectivePrice)), 0);
    const netSettlement = summaryOrders.reduce((sum, order) => sum + getAnalyticsSettlementAmount(order), 0);
    return { totalOrders, grossCollectible, netSettlement };
  }, [allFilteredOrdersForSummary, cityFilter]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">Order Analytics</h1>
          <p className="text-gray-600 text-sm md:text-base">Client / market owner analytics for orders sent by you.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Orders Placed</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{summary.totalOrders}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <TruckIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Gross Collectible <small>(LKR)</small></p>
                <p className="text-3xl font-black text-gray-900 mt-1">{formatCurrency(summary.grossCollectible)}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <CurrencyDollarIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Net Settlement <small>(LKR)</small></p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{formatCurrency(summary.netSettlement)}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CurrencyDollarIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-[#F59B0F] transition-all"
          >
            <span className="font-semibold text-gray-900">Filters</span>
            <ChevronDownIcon className={`w-5 h-5 text-gray-600 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Panel - Collapsed on mobile, always visible on md+ */}
        <div className={`${isFiltersExpanded ? 'block' : 'hidden'} md:block bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-3 mb-6`}>
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search by order code, customer, city or status..." className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select<SelectOption<string>, false> value={[{ value: '', label: 'All months' }, ...MONTH_OPTIONS].find((option) => option.value === selectedMonth) ?? { value: '', label: 'All months' }} onChange={(option) => { const value = option ? option.value : ''; setSelectedMonth(value); setQuickDateFilter('all'); if (value) { setStartDate(''); setEndDate(''); } }} options={[{ value: '', label: 'All months' }, ...MONTH_OPTIONS]} styles={monthSelectStyles} />
            {isAllMonthsSelected && (
              <>
                <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setQuickDateFilter('all'); }} max={endDate || undefined} className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F]" />
                <input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setQuickDateFilter('all'); }} min={startDate || undefined} className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F]" />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* <Select<SelectOption<number>, false> value={deliveryStatusOptions.find((option) => option.value === deliveryStatusFilter) ?? deliveryStatusOptions[0]} onChange={(option) => { setDeliveryStatusFilter(option ? option.value : 0); setPage(0); }} options={deliveryStatusOptions} styles={customSelectFieldStyles} />
            <Select<SelectOption<number>, false> value={paymentStatusOptions.find((option) => option.value === paymentStatusFilter) ?? paymentStatusOptions[0]} onChange={(option) => { setPaymentStatusFilter(option ? option.value : 0); setPage(0); }} options={paymentStatusOptions} styles={customSelectFieldStyles} />
            <Select<SelectOption<number>, false> value={paymentTypeOptions.find((option) => option.value === paymentTypeFilter) ?? paymentTypeOptions[0]} onChange={(option) => { setPaymentTypeFilter(option ? option.value : 0); setPage(0); }} options={paymentTypeOptions} styles={customSelectFieldStyles} />
            <Select<SelectOption<number>, false> value={cityOptions.find((option) => option.value === cityFilter) ?? cityOptions[0]} onChange={(option) => { setCityFilter(option ? option.value : 0); setPage(0); }} options={cityOptions} styles={customSelectFieldStyles} /> */}
            {/* <input type="number" min={0} value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Min total" className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm" />
            <input type="number" min={0} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Max total" className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm" /> */}

            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Delivery Status</p>
            <Select<SelectOption<number>, false> value={deliveryStatusOptions.find((option) => option.value === deliveryStatusFilter) ?? deliveryStatusOptions[0]} onChange={(option) => { setDeliveryStatusFilter(option ? option.value : 0); setPage(0); }} options={deliveryStatusOptions} styles={numericSelectStyles} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Payment Status</p>
            <Select<SelectOption<number>, false> value={paymentStatusOptions.find((option) => option.value === paymentStatusFilter) ?? paymentStatusOptions[0]} onChange={(option) => { setPaymentStatusFilter(option ? option.value : 0); setPage(0); }} options={paymentStatusOptions} styles={numericSelectStyles} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Payment Type</p>
            <Select<SelectOption<number>, false> value={paymentTypeOptions.find((option) => option.value === paymentTypeFilter) ?? paymentTypeOptions[0]} onChange={(option) => { setPaymentTypeFilter(option ? option.value : 0); setPage(0); }} options={paymentTypeOptions} styles={numericSelectStyles} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">City</p>
            <Select<SelectOption<number>, false> value={cityOptions.find((option) => option.value === cityFilter) ?? cityOptions[0]} onChange={(option) => { setCityFilter(option ? option.value : 0); setPage(0); }} options={cityOptions} styles={numericSelectStyles} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => void fetchOrders()} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"><ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</button>
            <button onClick={() => { setSearch(''); setSelectedMonth(''); setStartDate(''); setEndDate(''); setQuickDateFilter('all'); setDeliveryStatusFilter(0); setPaymentStatusFilter(0); setPaymentTypeFilter(0); setCityFilter(0); setMinPrice(''); setMaxPrice(''); setPage(0); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold">Reset Filters</button>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex-1">
          {/* <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Quick Filters</p> */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'today', label: 'Today' },
              { value: 'thisWeek', label: 'This Week' },
              { value: 'lastWeek', label: 'Last Week' },
              { value: 'thisMonth', label: 'This Month' },
              { value: 'lastMonth', label: 'Last Month' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setQuickDateFilter(filter.value as QuickDateFilter);
                  setSelectedMonth('');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${quickDateFilter === filter.value
                  ? filter.value === 'all'
                    ? 'bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white shadow-lg shadow-orange-500/30'
                    : filter.value === 'today'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : filter.value === 'thisWeek'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                        : filter.value === 'lastWeek'
                          ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/30'
                          : filter.value === 'thisMonth'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl p-4 shadow-sm border-2 border-orange-200 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F59B0F] flex items-center justify-center">
              <DocumentArrowDownIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Common Report</p>
              <p className="text-sm text-gray-600">Generate the common report at any time using the current view.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-auto">
            <button
              onClick={() => setIsCustomReportExpanded(!isCustomReportExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Select columns"
            >
              <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${isCustomReportExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => void handleGenerateCommonReport('download')}
                disabled={isGeneratingCommonReport || customReportColumns.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F59B0F] text-white hover:bg-[#E68A06] font-semibold transition-all disabled:opacity-50"
                title="Download Common PDF"
              >
                <DocumentArrowDownIcon className={`w-4 h-4 ${isGeneratingCommonReport ? 'animate-spin' : ''}`} />
                {isGeneratingCommonReport ? 'Preparing...' : 'Common Download'}
              </button>
              <button
                onClick={() => void handleGenerateCommonReport('print')}
                disabled={isGeneratingCommonReport || customReportColumns.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#F59B0F] text-[#F59B0F] font-semibold hover:bg-orange-50 transition-all disabled:opacity-50"
                title="Print Common"
              >
                <TruckIcon className="w-4 h-4" />
                Common Print
              </button>
            </div>
          </div>
        </div>

        {isCustomReportExpanded && (
          <div className="mt-4 pt-4 border-t border-orange-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { key: 'orderCode' as CustomReportColumnKey, label: 'Order Code' },
                { key: 'date' as CustomReportColumnKey, label: 'Date' },
                { key: 'customerName' as CustomReportColumnKey, label: 'Customer Name' },
                { key: 'paymentStatus' as CustomReportColumnKey, label: 'Payment Status' },
                { key: 'deliveryStatus' as CustomReportColumnKey, label: 'Delivery Status' },
                { key: 'totalPrice' as CustomReportColumnKey, label: 'Settlement' },
                { key: 'collectivePrice' as CustomReportColumnKey, label: 'Collectible' },
              ].map((col) => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-[#F59B0F] hover:bg-orange-50 transition-all">
                  <input
                    type="checkbox"
                    checked={customReportColumns.includes(col.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCustomReportColumns([...customReportColumns, col.key]);
                      } else {
                        setCustomReportColumns(customReportColumns.filter((c) => c !== col.key));
                      }
                    }}
                    className="w-4 h-4 rounded accent-[#F59B0F] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {Boolean(selectedMonth || quickDateFilter !== 'all' || startDate || endDate || deliveryStatusFilter !== 0 || paymentStatusFilter !== 0 || paymentTypeFilter !== 0 || cityFilter !== 0 || search.trim()) && (
        <div className="mt-4 bg-linear-to-r from-orange-50 to-yellow-50 rounded-2xl p-4 shadow-sm border-2 border-orange-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F59B0F] flex items-center justify-center">
                <DocumentArrowDownIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Settlement Report Ready</p>
                <p className="text-sm text-gray-600">Generate settlement reports when filters are applied.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => void handleGenerateSettlementReport('download')}
                disabled={isGeneratingSettlementReport || isGeneratingCommonReport || !selectedMonth}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F59B0F] text-white font-semibold hover:bg-[#E68A06] transition-all disabled:opacity-50"
                title="Download Settlement PDF"
              >
                <DocumentArrowDownIcon className={`w-4 h-4 ${isGeneratingSettlementReport ? 'animate-spin' : ''}`} />
                {isGeneratingSettlementReport ? 'Preparing...' : 'Settlement Download'}
              </button>
              <button
                onClick={() => void handleGenerateSettlementReport('print')}
                disabled={isGeneratingSettlementReport || isGeneratingCommonReport || !selectedMonth}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#F59B0F] text-[#F59B0F] font-semibold hover:bg-orange-50 transition-all disabled:opacity-50"
                title="Print Settlement"
              >
                <TruckIcon className="w-4 h-4" />
                Settlement Print
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-700">
            {isLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : (
              <>
                Showing <span className="font-bold text-gray-900">{filteredOrders.length}</span> of{' '}
                <span className="font-bold text-gray-900">{orders.length}</span> orders in this page
              </>
            )}
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end">
            <div className="relative mr-2" ref={tableColumnsMenuRef}>
              <button
                type="button"
                onClick={() => setIsTableColumnsOpen((s) => !s)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50"
                title="Select table columns"
              >
                Columns
                <ChevronDownIcon className={`w-4 h-4 text-gray-600 transition-transform ${isTableColumnsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTableColumnsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 bg-white rounded-2xl border border-gray-200 shadow-lg p-3">
                  <div className="text-xs font-bold text-gray-800 mb-2">Table Columns</div>
                  <div className="max-h-56 overflow-y-auto grid gap-2">
                    {TABLE_COLUMN_DEFS.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={customReportColumns.includes(col.key)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCustomReportColumns((prev) => {
                              if (checked) {
                                const nextSet = new Set(prev);
                                nextSet.add(col.key);
                                return TABLE_COLUMN_DEFS.filter((d) => nextSet.has(d.key)).map((d) => d.key);
                              }
                              return prev.filter((k) => k !== col.key);
                            });
                          }}
                          className="w-4 h-4 rounded accent-[#F59B0F] cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                  styles={numericSelectStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  instanceId="client-market-owner-page-size"
                  aria-label="Per page"
                />
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page <= 0 || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                  {page + 1} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <button
                onClick={() => void fetchOrders()}
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

      {error && <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700"><p className="font-bold">Error loading order analytics</p><p className="text-sm">{error}</p></div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                {visibleTableColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const orderDate = getOrderDate(order);
                return (
                  <tr key={order.id} className="hover:bg-orange-50/40 transition-colors">
                    {visibleTableColumns.map((col) => {
                      if (col.key === 'orderCode') {
                        return (
                          <td key={col.key} className="py-4 px-4">
                            <div className="inline-flex max-w-48 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                              <span className="min-w-0 truncate font-semibold text-slate-800" title={order.orderCode?.code || `ORD-${order.id}`}>
                                {order.orderCode?.code || `ORD-${order.id}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => void copyOrderCodeToClipboard(order.orderCode?.code || `ORD-${order.id}`)}
                                className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-white hover:text-[#8f5515]"
                                title="Copy order code"
                                aria-label={`Copy ${order.orderCode?.code || `ORD-${order.id}`}`}
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        );
                      }

                      if (col.key === 'date') {
                        return (
                          <td key={col.key} className="py-4 px-4 text-sm text-gray-700 text-center">{orderDate ? orderDate.toLocaleDateString() : 'N/A'}</td>
                        );
                      }

                      if (col.key === 'customerName') {
                        return (
                          <td key={col.key} className="py-4 px-4"><p className="font-semibold text-gray-900 text-sm">{order.deliveryTo?.fullName || 'N/A'}</p></td>
                        );
                      }

                      if (col.key === 'city') {
                        return (
                          <td key={col.key} className="py-4 px-4 text-sm text-gray-600">{order.deliveryTo?.city?.name || 'N/A'}</td>
                        );
                      }

                      if (col.key === 'paymentStatus') {
                        return (
                          <td key={col.key} className="py-4 px-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                                {order.paymentStatus?.name || 'Unknown'}
                              </span>
                              <span className="text-[11px] font-medium text-gray-500">
                                {order.paymentType?.name || 'N/A'}
                              </span>
                            </div>
                          </td>
                        );
                      }

                      if (col.key === 'paymentType') {
                        return (
                          <td key={col.key} className="py-4 px-4 text-center text-xs text-gray-600">{order.paymentType?.name || 'N/A'}</td>
                        );
                      }

                      if (col.key === 'deliveryStatus') {
                        return (
                          <td key={col.key} className="py-4 px-4 text-center"><span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadge(order.deliveryStatus?.name)}`}>{order.deliveryStatus?.name || 'Unknown'}</span></td>
                        );
                      }

                      if (col.key === 'deliveryFee') {
                        return (
                          <td key={col.key} className="py-4 px-4 text-right font-bold text-gray-900">{formatCurrency(order.deliveryFee || 0)}</td>
                        );
                      }

                      if (col.key === 'collectivePrice') {
                        return (
                          <td key={col.key} className="py-4 px-4 text-right font-bold text-gray-900">{formatCurrency(order.collectivePrice)}</td>
                        );
                      }

                      if (col.key === 'totalPrice') {
                        return (
                          <td key={col.key} className="py-4 px-4 text-right font-bold text-gray-900">{formatCurrency(getOrderSettlementAmount(order))}</td>
                        );
                      }

                      return <td key={col.key} className="py-4 px-4">N/A</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isLoading && filteredOrders.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4"><TruckIcon className="w-10 h-10 text-[#F59B0F]" /></div>
                <p className="text-xl font-black text-gray-900 mb-2">No orders found</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default ClientMarketOwnerOrderAnalytics;
