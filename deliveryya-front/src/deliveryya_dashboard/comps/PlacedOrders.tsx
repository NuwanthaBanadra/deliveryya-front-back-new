import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems, Transition, TransitionChild } from '@headlessui/react';
import { ArrowPathIcon, ArrowUturnLeftIcon, CheckCircleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, ClipboardDocumentIcon, EllipsisVerticalIcon, ExclamationCircleIcon, MapPinIcon, MagnifyingGlassIcon, PhoneIcon, EnvelopeIcon, UserIcon, DocumentArrowDownIcon, PrinterIcon, TruckIcon, XCircleIcon, } from '@heroicons/react/24/outline';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { FaMapMarkedAlt, FaRoute, FaUserClock } from 'react-icons/fa';
import { FaCloudArrowUp } from 'react-icons/fa6';
import type { OrderDataForPdf } from '../../util/PdfUtil';
import { MdOutlineClear } from 'react-icons/md';
import axiosInstance, { baseURL } from '../../util/AxiosUtil';
import { hasAccess, hasDeliveryCompanyPlacedOrdersAccess } from '../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../util/FrontendAccess';
import JwtUtil from '../../util/JwtUtil';
import { getDeliveryStatusVisual } from '../../util/DeliveryStatusCatalog';
import { generateMultipleOrderSlipsPdfMake, generateOrderSlipPdfMake, type OrderSlipGenerationProgress } from './pdfGenaretor/PdfGenerator';
import OrderTimeline, { type DeliveryTimelineItem, type SenderDetails, type OrderDetails } from '../../page_comps/trackOrder/OrderTimeline';
import BankTransferSlipModal from '../../page_comps/cart/BankTransferSlipModal';
import {
  runSettlementReportAction,
  runCustomReportAction,
  type SettlementReportInput,
  type CustomReportInput,
  type CustomReportColumnKey,
} from './pdfGenaretor/templates/SettlementReport';
import { getCurrentUserId } from '../../util/AccessController';
import { getCurrentUserRoleId, ROLE_IDS } from '../../util/RoleAccess';

type QuickDateFilter = 'all' | 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

// API Types matching backend response
interface ApiCity {
  id: number;
  name: string;
}

interface ApiDeliveryTo {
  id: number;
  address: string;
  primaryMobile: string;
  secondaryMobile?: string;
  whatsapp?: string;
  fullName: string;
  city: ApiCity;
  googleMapLocation?: string;
  location?: string;
}

interface ApiOrderCode {
  id: number;
  code: string;
  users?: {
    id: number;
    firstName?: string;
    lastName?: string;
  };
  user?: {
    id: number;
    firstName?: string;
    lastName?: string;
  };
  userId?: number;
}

interface ApiStatus {
  id: number;
  name: string;
}

interface ApiOrder {
  id: number;
  marketOrder?: unknown;
  discount: number;
  stock?: unknown;
  paymentStatus: ApiStatus;
  paymentType: ApiStatus;
  deliveryFee: number;
  collectivePrice: number;
  qty: number;
  totalPrice: number;
  desc?: string;
  deliveryStatus: ApiStatus;
  weight: number;
  deliveryTo: ApiDeliveryTo;
  orderCode: ApiOrderCode;
  thirdPartySenders?: {
    id?: number;
    name?: string;
    address?: string;
    note?: string;
    first_mob?: string;
    sec_mob?: string;
    whatsapp?: string;
  };
  user?: unknown;
  userId?: number;
}

interface ApiResponse {
  status: string | null;
  message: string;
  desc: string;
  exData: unknown;
  object: {
    pageNumber: number;
    countPerPage: number;
    totalCount: number;
    totalPages: number;
    cityId: number;
    orderId: number;
    userId: number;
    markerOrderId: number;
    deliveryStatusId: number;
    paymentStatusId: number;
    paymentTypeId: number;
    orderCodeUserId: number;
    search: string;
    items: ApiOrder[];
  };
}

interface OrdersRequestBody {
  pageNumber: number;
  countPerPage: number;
  cityId: number;
  orderId: number;
  userId: number;
  markerOrderId: number;
  deliveryStatusId: number;
  paymentStatusId: number;
  paymentTypeId: number;
  orderCodeUserId: number;
  search: string;
  thirdPartySendersId?: number;
  searchThoughThirdPartyName?: boolean;
  searchThoughThirdPartyNic?: boolean;
  searchThoughThirdPartyNote?: boolean;
  searchThoughThirdPartyAddress?: boolean;
  searchThoughThirdPartyMobileNumbers?: boolean;
  searchThoughDeliveryToFullName?: boolean;
  searchThoughDeliveryToAddress?: boolean;
  searchThoughDeliveryToMobileNumbers?: boolean;
  searchThoughDeliveryTo?: boolean;
  searchThoughMarketName?: boolean;
  searchThoughMarketOrderName?: boolean;
  orderCode?: string;
  sendingUserId?: number;
  receivingUserId?: number;
  minPrice?: number;
  maxPrice?: number;
  fromDate?: string;
  toDate?: string;
  dontCollectDeliveryFeeFromCustomer?: boolean;
}

interface ApiUserItem {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

type UserFilterOption = {
  value: number;
  label: string;
};

interface UsersApiResponse {
  status: number | string | null;
  message: string;
  desc: string;
  exData: unknown;
  object?: {
    items?: ApiUserItem[];
  };
}

interface DeliveryStatusesApiResponse {
  message?: string;
  object?: Array<{ id?: unknown; name?: unknown }>;
}

interface PaymentStatusesApiResponse {
  message?: string;
  object?: Array<{ id?: unknown; name?: unknown }>;
}

interface PaymentTypesApiResponse {
  message?: string;
  object?: Array<{ id?: unknown; name?: unknown }>;
}

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type SearchScopeKey =
  | 'searchThoughThirdPartyName'
  | 'searchThoughThirdPartyNic'
  | 'searchThoughThirdPartyNote'
  | 'searchThoughThirdPartyAddress'
  | 'searchThoughThirdPartyMobileNumbers'
  | 'searchThoughDeliveryToFullName'
  | 'searchThoughDeliveryToAddress'
  | 'searchThoughDeliveryToMobileNumbers'
  | 'searchThoughDeliveryTo'
  | 'searchThoughMarketName'
  | 'searchThoughMarketOrderName';

const SEARCH_SCOPE_OPTIONS: Array<{ key: SearchScopeKey; label: string; description: string }> = [
  {
    key: 'searchThoughThirdPartyName',
    label: 'Third party name',
    description: 'Search matches in the sender name',
  },
  {
    key: 'searchThoughThirdPartyNic',
    label: 'Third party NIC',
    description: 'Search matches against sender NIC values',
  },
  {
    key: 'searchThoughThirdPartyNote',
    label: 'Third party note',
    description: 'Search matches notes attached to the sender',
  },
  {
    key: 'searchThoughThirdPartyAddress',
    label: 'Third party address',
    description: 'Search matches sender address values',
  },
  {
    key: 'searchThoughThirdPartyMobileNumbers',
    label: 'Third party mobile numbers',
    description: 'Search matches sender mobile numbers',
  },
  {
    key: 'searchThoughDeliveryToFullName',
    label: 'Recipient name',
    description: 'Search matches the delivery recipient full name',
  },
  {
    key: 'searchThoughDeliveryToAddress',
    label: 'Recipient address',
    description: 'Search matches the delivery address',
  },
  {
    key: 'searchThoughDeliveryToMobileNumbers',
    label: 'Recipient mobile numbers',
    description: 'Search matches recipient phone numbers',
  },
  {
    key: 'searchThoughDeliveryTo',
    label: 'Recipient details',
    description: 'Search across all recipient fields together',
  },
  {
    key: 'searchThoughMarketName',
    label: 'Market name',
    description: 'Search matches the market name',
  },
  {
    key: 'searchThoughMarketOrderName',
    label: 'Market order name',
    description: 'Search matches the market order item names',
  },
];

const createDefaultSearchScopeState = (): Record<SearchScopeKey, boolean> => (
  SEARCH_SCOPE_OPTIONS.reduce((acc, option) => {
    acc[option.key] = true;
    return acc;
  }, {} as Record<SearchScopeKey, boolean>)
);

const customSelectFieldStyles = {
  control: (base: any, state: any) => ({
    ...base,
    padding: '0.2rem',
    borderWidth: '2px',
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    borderRadius: '0.75rem',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
    '&:hover': {
      borderColor: '#FCD34D',
    },
    transition: 'all 0.3s',
    backgroundColor: 'white',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#F59B0F'
      : state.isFocused
        ? '#FEF3C7'
        : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#F59B0F',
    },
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#9CA3AF',
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(245, 155, 15, 0.2)',
    zIndex: 9999,
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
};

// Fallback delivery status options for filter
const DEFAULT_DELIVERY_STATUS_OPTIONS = [
  { id: 0, name: 'All', label: 'All' },
  { id: 1, name: 'pending', label: 'Pending' },
  { id: 2, name: 'delivering', label: 'Delivering' },
  { id: 3, name: 'delivered', label: 'Delivered' },
  { id: 4, name: 'returning', label: 'Returning' },
  { id: 5, name: 'returned', label: 'Returned' },
  { id: 6, name: 'cancelled', label: 'Cancelled' },
];

const toStatusLabel = (name: string): string => {
  const normalized = name.trim();
  if (!normalized) return 'Unknown';
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

function getStatusPill(_statusId: number, statusName: string) {
  const visual = getDeliveryStatusVisual(statusName || '');
  const StatusIcon = visual.icon;

  return {
    label: visual.id === 0 ? (statusName || 'Unknown') : visual.name,
    className: `${visual.badgeClassName} ring-1 ring-black/5`,
    icon: <StatusIcon className="w-4 h-4" />,
  };
}

function getPaymentStatusPill(statusId: number, statusName: string) {
  const normalizedName = statusName?.toLowerCase() || '';

  if (normalizedName.includes('pending') || normalizedName.includes('pennding')) {
    return {
      label: 'Pending',
      className: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
    };
  }
  if (normalizedName.includes('paid')) {
    return {
      label: 'Paid',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    };
  }
  if (normalizedName.includes('failed')) {
    return {
      label: 'Failed',
      className: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    };
  }

  return {
    label: statusName || 'Unknown',
    className: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200',
  };
}

const toCleanString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
};

const PLACED_ORDERS_STATS_RANGE_STORAGE_KEY = 'deliveryya:placed-orders:stats-range';

// Order Analytics - Month options
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

// Order Analytics - Helper functions
const formatDateForApi = (value: Date, endOfDay = false): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T${endOfDay ? '23:59:59' : '00:00:00'}`;
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

const toDateInputValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultStatsDateRange = () => {
  const now = new Date();
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 1);
  return { fromDate: toDateInputValue(from), toDate: toDateInputValue(now) };
};

const readStoredStatsDateRange = (storageKey: string) => {
  const fallback = getDefaultStatsDateRange();
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<{ fromDate: string; toDate: string }>;
    return {
      fromDate: parsed.fromDate || fallback.fromDate,
      toDate: parsed.toDate || fallback.toDate,
    };
  } catch {
    return fallback;
  }
};

const joinPhones = (values: unknown[]): string => {
  const unique = Array.from(new Set(values.map(toCleanString).filter(Boolean)));
  return unique.length > 0 ? unique.join(' | ') : 'N/A';
};

const formatMarketPhones = (payload: any): string => {
  const first = toCleanString(payload?.first_num);
  const second = toCleanString(payload?.second_num);
  const whatsapp = toCleanString(payload?.whats_app);

  const parts = [
    first ? `First: ${first}` : '',
    second ? `Second: ${second}` : '',
    whatsapp ? `WhatsApp: ${whatsapp}` : '',
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : 'N/A';
};

const isBankTransferPaymentType = (paymentTypeName?: string, paymentTypeId?: number) => {
  const normalizedName = (paymentTypeName || '').toLowerCase().replace(/\s+/g, ' ').trim();

  return (
    paymentTypeId === 2 ||
    normalizedName.includes('bank transfer') ||
    normalizedName.includes('brank transfer') ||
    normalizedName.includes('banktransfer')
  );
};

const getMarketOrderIdFromOrder = (order: ApiOrder) =>
  (order.marketOrder as { id?: number } | undefined)?.id || (order as { marketOrderId?: number }).marketOrderId || 0;

function ExpandedOrderDetails({ order, formatCurrency }: { order: ApiOrder, formatCurrency: (v: number) => string }) {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [marketOrder, setMarketOrder] = useState<any>(null);
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [senderDetails, setSenderDetails] = useState<{
    type: 'third_party' | 'market' | 'user' | 'unknown';
    name: string;
    address: string;
    phone: string;
    firstPhone: string;
    secondPhone: string;
    whatsapp: string;
    email: string;
    note: string;
  }>({
    type: 'unknown',
    name: 'N/A',
    address: 'N/A',
    phone: 'N/A',
    firstPhone: '',
    secondPhone: '',
    whatsapp: '',
    email: 'N/A',
    note: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  const hidePlacedBy = !hasDeliveryCompanyPlacedOrdersAccess();

  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return '';
    const cleanedUrl = url.replace(/\\/g, '/').trim();
    if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;
    if (cleanedUrl.startsWith('/')) return `${baseURL}/uploads${cleanedUrl}`;
    return `${baseURL}/uploads/${cleanedUrl}`;
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchDetails() {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('jwtToken');
        const headers = {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        const thirdParty = order.thirdPartySenders;
        const hasThirdPartySender = Boolean(
          toCleanString(thirdParty?.name) ||
          toCleanString(thirdParty?.address) ||
          toCleanString(thirdParty?.first_mob) ||
          toCleanString(thirdParty?.sec_mob) ||
          toCleanString(thirdParty?.whatsapp),
        );

        let resolvedSender: {
          type: 'third_party' | 'market' | 'user' | 'unknown';
          name: string;
          address: string;
          phone: string;
          firstPhone: string;
          secondPhone: string;
          whatsapp: string;
          email: string;
          note: string;
        } = {
          type: 'unknown',
          name: 'N/A',
          address: 'N/A',
          phone: 'N/A',
          firstPhone: '',
          secondPhone: '',
          whatsapp: '',
          email: 'N/A',
          note: '',
        };

        if (hasThirdPartySender) {
          resolvedSender = {
            type: 'third_party',
            name: thirdParty?.name || 'N/A',
            address: thirdParty?.address || 'N/A',
            phone: joinPhones([thirdParty?.first_mob, thirdParty?.sec_mob, thirdParty?.whatsapp]),
            firstPhone: toCleanString(thirdParty?.first_mob),
            secondPhone: toCleanString(thirdParty?.sec_mob),
            whatsapp: toCleanString(thirdParty?.whatsapp),
            email: 'N/A',
            note: thirdParty?.note || '',
          };
        }

        // Fetch User Details
        const userId = order.orderCode?.users?.id;
        let fetchedUser: any = null;
        let defaultUserAddress: any = null;
        if (userId) {
          const userRes = await axiosInstance.get('/users/admin/get-user-by-id', {
            params: { id: userId },
          });
          if (userRes.data?.object && isMounted) {
            setUserDetails(userRes.data.object);
          }
          fetchedUser = userRes.data?.object || null;

          try {
            const userAddressRes = await axiosInstance.get(
              `/users/get-address-by-id-or-user-id?defaultAddress=true&userId=${userId}`,
              { headers },
            );
            const addresses = userAddressRes.data?.object || userAddressRes.data?.exData || [];
            if (Array.isArray(addresses)) {
              defaultUserAddress = addresses.find((item) => Boolean(item?.defaultAddress)) || addresses[0] || null;
            }
          } catch {
            defaultUserAddress = null;
          }

          if (!hasThirdPartySender && fetchedUser) {
            const userName = `${fetchedUser?.firstName || ''} ${fetchedUser?.lastName || ''}`.trim();
            const addressCity = defaultUserAddress?.city?.name ? `, ${defaultUserAddress.city.name}` : '';
            const userAddress = defaultUserAddress?.address
              ? `${defaultUserAddress.address}${addressCity}`
              : (fetchedUser?.address || 'N/A');

            resolvedSender = {
              type: 'user',
              name: userName || 'User',
              address: userAddress,
              phone: joinPhones([
                fetchedUser?.mobile,
                fetchedUser?.phone,
                fetchedUser?.whatsapp,
                defaultUserAddress?.phone,
                defaultUserAddress?.mobile,
                defaultUserAddress?.primaryMobile,
                defaultUserAddress?.secondaryMobile,
                defaultUserAddress?.whatsapp,
              ]),
              firstPhone: toCleanString(
                fetchedUser?.mobile ||
                fetchedUser?.phone ||
                defaultUserAddress?.phone ||
                defaultUserAddress?.mobile ||
                defaultUserAddress?.primaryMobile,
              ),
              secondPhone: toCleanString(defaultUserAddress?.secondaryMobile),
              whatsapp: toCleanString(fetchedUser?.whatsapp || defaultUserAddress?.whatsapp),
              email: fetchedUser?.email || 'N/A',
              note: fetchedUser?.nic || '',
            };
          }
        }

        // Fetch Market Order Details
        const mOrderId = (order as any).marketOrder?.id || (order as any).marketOrderId;
        if (mOrderId) {
          const mRes = await axiosInstance.get('/orders/get-market-order-details-by-id', {
            params: { id: mOrderId },
          });
          const mData = mRes.data?.object || mRes.data?.exData;
          if (mData && isMounted) {
            setMarketOrder(mData);

            if (mData.items && mData.items.length > 0) {
              const stockPromises = mData.items.map(async (item: any) => {
                const stockId = item.stockId || item.stock?.id || item.stocks?.id || item.productId || item.products?.id;
                if (!stockId) return item;
                const payload = { pageNumber: 0, countPerPage: 1, stockId };
                try {
                  let sRes = await axiosInstance.post('/stocks/get-stocks', payload);
                  let sItems = sRes.data?.exData?.items || sRes.data?.object?.items;
                  if (!sItems || sItems.length === 0) {
                    sRes = await axiosInstance.get('/stocks/get-stocks', { params: payload });
                    sItems = sRes.data?.exData?.items || sRes.data?.object?.items;
                  }
                  return { ...item, stockDetails: sItems?.[0] || null };
                } catch {
                  return item;
                }
              });
              const resolvedItems = await Promise.all(stockPromises);
              if (isMounted) setMarketItems(resolvedItems);
            }
          }

          if (!hasThirdPartySender) {
            try {
              const marketSenderRes = await axiosInstance.get(
                `/markets/get-markets-details-by-market-order-id?marketOrderId=${mOrderId}`,
                { headers },
              );
              const marketPayload = marketSenderRes.data?.object || marketSenderRes.data?.exData || {};
              const marketUser = marketPayload?.users || {};

              resolvedSender = {
                type: 'market',
                name: marketPayload?.name || 'Market',
                address: marketPayload?.address || marketPayload?.location || 'N/A',
                phone: formatMarketPhones(marketPayload),
                firstPhone: toCleanString(marketPayload?.first_num),
                secondPhone: toCleanString(marketPayload?.second_num),
                whatsapp: toCleanString(marketPayload?.whats_app),
                email: marketUser?.email || 'N/A',
                note: marketPayload?.infoMessage || marketPayload?.desc || '',
              };
            } catch {
              // Keep previously resolved sender details.
            }
          }
        }

        if (isMounted) {
          setSenderDetails(resolvedSender);
        }
      } catch (err) {
        console.error('Error fetching expanded info', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchDetails();
    return () => { isMounted = false; };
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 p-4 bg-linear-to-br from-gray-50 to-orange-50/30">
        <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
        <span className="text-gray-500 font-medium animate-pulse">Loading detailed insights...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-linear-to-br from-gray-50 to-orange-50/20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100/50 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white">
              <MapPinIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recipient</p>
          </div>
          <p className="font-black text-gray-900 text-xl leading-tight truncate" title={order.deliveryTo?.fullName}>{order.deliveryTo?.fullName || 'N/A'}</p>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-600 flex items-center group/item"><PhoneIcon className="w-4 h-4 mr-2 text-gray-400 group-hover/item:text-orange-500 transition-colors" />{order.deliveryTo?.primaryMobile || 'N/A'}</p>
            {order.deliveryTo?.secondaryMobile && (
              <p className="text-sm font-semibold text-gray-500 flex items-center group/item"><PhoneIcon className="w-4 h-4 mr-2 text-gray-300 group-hover/item:text-orange-400 transition-colors" />{order.deliveryTo.secondaryMobile}</p>
            )}
            {order.deliveryTo?.whatsapp && (
              <p className="text-xs font-bold text-green-700 flex items-center mt-3 bg-green-50 px-2.5 py-1.5 rounded-lg w-fit border border-green-100">
                WhatsApp: {order.deliveryTo.whatsapp}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-500 group-hover:text-white">
              <MapPinIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Address</p>
          </div>
          <p className="font-semibold text-gray-800 leading-snug">{order.deliveryTo?.address || 'N/A'}</p>
          <p className="text-sm text-gray-500 mt-2 font-medium bg-gray-50 inline-block px-2 py-1 rounded">{order.deliveryTo?.city?.name || 'N/A'}</p>
          {order.desc && (
            <div className="mt-4 text-xs text-orange-800 bg-orange-50/80 px-3 py-2 rounded-xl border border-orange-100 shadow-inner">
              <div dangerouslySetInnerHTML={{ __html: order.desc }} className="prose prose-sm prose-orange" />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100/50 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
              <ClockIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pricing</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
              <span className="text-gray-600 font-medium">Items</span>
              <span className="font-bold text-gray-900">{formatCurrency(order.collectivePrice)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                <span className="text-green-700 font-medium">Discount</span>
                <span className="font-bold text-green-700">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
              <span className="text-gray-600 font-medium">Delivery</span>
              <span className="font-bold text-gray-900">{formatCurrency(order.deliveryFee)}</span>
            </div>
            <div className="h-px bg-linear-to-r from-transparent via-gray-200 to-transparent my-3" />
            <div className="flex justify-between items-end">
              <span className="font-black text-gray-400 uppercase tracking-wider text-xs">Total</span>
              <span className="font-black text-[#F59B0F] text-xl drop-shadow-sm">{formatCurrency(order.totalPrice)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gray-100/80 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              Sender Details
            </p>
            <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full border border-gray-200 uppercase">
              {senderDetails.type.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-2 text-sm text-gray-700 relative z-10">
            <p className="font-bold text-gray-900 truncate" title={senderDetails.name}>{senderDetails.name}</p>
            <p className="text-xs text-gray-600 leading-relaxed">{senderDetails.address}</p>
            {(senderDetails.firstPhone || senderDetails.secondPhone) ? (
              <p className="flex items-center">
                <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                Contact : {[senderDetails.firstPhone, senderDetails.secondPhone].filter(Boolean).join(' | ')}
              </p>
            ) : null}
            {senderDetails.whatsapp ? (
              <p className="flex items-center text-green-700"><PhoneIcon className="w-4 h-4 mr-2 text-green-600" />WhatsApp: {senderDetails.whatsapp}</p>
            ) : null}
            {!senderDetails.firstPhone && !senderDetails.secondPhone && !senderDetails.whatsapp ? (
              <p className="flex items-center"><PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />{senderDetails.phone || 'N/A'}</p>
            ) : null}
            {senderDetails.email && senderDetails.email !== 'N/A' && (
              <p className="flex items-center"><EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400" />{senderDetails.email}</p>
            )}
            {senderDetails.note && (
              <p className="text-[11px] text-orange-700 bg-orange-50 rounded-lg px-2 py-1 border border-orange-100">
                {senderDetails.note}
              </p>
            )}
          </div>

          {!hidePlacedBy && senderDetails.type === 'third_party' && userDetails && (
            <div className="mt-4 pt-3 border-t border-gray-100 relative z-10">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Placed By</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                  {userDetails.profileImg ? (
                    <img src={userDetails.profileImg} alt="Placed by" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm text-gray-500">{userDetails.firstName?.[0] || 'U'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate" title={`${userDetails.firstName || ''} ${userDetails.lastName || ''}`}>
                    {(userDetails.firstName || 'User')} {userDetails.lastName || ''}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{userDetails.email || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {marketOrder && marketItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mt-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-[#F59B0F] to-purple-600" />
          <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shadow-inner">
              <TruckIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-gray-800 text-lg uppercase tracking-wide">Market Order Details</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Order ID: {marketOrder.id} &bull; Items: {marketOrder.qty}</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase">Subtotal</p>
                <p className="font-black text-gray-800">{formatCurrency(marketOrder.price)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {marketItems.map((item, idx) => (
              <div key={item.id || idx} className="flex flex-col bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden hover:border-purple-300 hover:shadow-md transition-all duration-300 group">
                <div className="p-4 flex gap-4">
                  {item.stockDetails?.products?.productImages?.[0]?.url ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-white border border-gray-100 shadow-sm relative">
                      <img
                        src={normalizeImageUrl(item.stockDetails.products.productImages[0].url)}
                        alt="Product"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-gray-400">
                      <TruckIcon className="w-8 h-8 opacity-50" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="font-bold text-gray-900 leading-tight mb-1 truncate text-sm" title={item.stockDetails?.products?.name || 'Unknown Product'}>
                      {item.stockDetails?.products?.name || 'Unknown Product'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.stockDetails?.color && (
                        <span className="px-1.5 py-0.5 bg-white border border-gray-200 shadow-sm text-gray-700 text-[10px] font-bold rounded uppercase">
                          Color: {item.stockDetails.color}
                        </span>
                      )}
                      {item.stockDetails?.sizes?.name && (
                        <span className="px-1.5 py-0.5 bg-white border border-gray-200 shadow-sm text-gray-700 text-[10px] font-bold rounded uppercase">
                          Size: {item.stockDetails.sizes.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-bold border border-purple-100">
                        Qty: <span className="text-sm">{item.qty}</span>
                        {item.stockDetails?.unit?.name && <span className="ml-1">{item.stockDetails.unit.name}</span>}
                      </div>
                      <p className="font-black text-purple-700">{formatCurrency(item.price)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlacedOrders() {
  const [searchParams] = useSearchParams();
  const isDeliveryCompanySide = useMemo(() => hasDeliveryCompanyPlacedOrdersAccess(), []);
  const canFilterSendingUsers = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.PLACED_ORDERS_SENDING_USER_FILTER), []);
  const initialOrderCodeFilter = useMemo(() => searchParams.get('orderCode')?.trim() || '', [searchParams]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [searchInput, setSearchInput] = useState(initialOrderCodeFilter);
  const [debouncedSearch, setDebouncedSearch] = useState(initialOrderCodeFilter);
  const [searchScopes, setSearchScopes] = useState<Record<SearchScopeKey, boolean>>(() => createDefaultSearchScopeState());
  const [isSearchScopeOpen, setIsSearchScopeOpen] = useState(false);
  const [deliveryStatusOptions, setDeliveryStatusOptions] = useState(DEFAULT_DELIVERY_STATUS_OPTIONS);
  const [paymentStatusOptions, setPaymentStatusOptions] = useState<SelectOption<number>[]>([{ value: 0, label: 'All' }]);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState<SelectOption<number>[]>([{ value: 0, label: 'All' }]);
  const initialDeliveryStatusFilter = useMemo(() => {
    const rawValue = Number(searchParams.get('deliveryStatusId'));
    return Number.isInteger(rawValue) && rawValue >= 0 ? rawValue : 0;
  }, [searchParams]);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState(initialDeliveryStatusFilter);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(0);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statsDateRange, setStatsDateRange] = useState(() => readStoredStatsDateRange(PLACED_ORDERS_STATS_RANGE_STORAGE_KEY));
  const [selectedSendingUser, setSelectedSendingUser] = useState<UserFilterOption | null>(null);
  const [page, setPage] = useState(0); // 0-indexed for API
  const [pageSize, setPageSize] = useState(10);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsOrders, setStatsOrders] = useState<ApiOrder[]>([]);
  const [showAllStatCards, setShowAllStatCards] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const canDeleteOrDropOrders = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.ORDER_DELETE_OR_DROP), []);
  const [bulkPdfProgress, setBulkPdfProgress] = useState<{ processed: number; total: number; orderCode: string } | null>(null);
  const [usersById, setUsersById] = useState<Record<number, { fullName: string; email: string }>>({});
  const [timelineModalOrder, setTimelineModalOrder] = useState<ApiOrder | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isTimelineModalLoading, setIsTimelineModalLoading] = useState(false);
  const [timelineModalError, setTimelineModalError] = useState<string | null>(null);
  const [timelineModalTimeline, setTimelineModalTimeline] = useState<DeliveryTimelineItem[]>([]);
  const [timelineModalSender, setTimelineModalSender] = useState<SenderDetails | null>(null);
  const [timelineModalOrderDetails, setTimelineModalOrderDetails] = useState<OrderDetails | null>(null);
  const [bankSlipOrder, setBankSlipOrder] = useState<ApiOrder | null>(null);
  const [bankSlipMarketId, setBankSlipMarketId] = useState<number | null>(null);
  const [isBankSlipSubmitting, setIsBankSlipSubmitting] = useState(false);
  const searchScopeMenuRef = useRef<HTMLDivElement | null>(null);

  // Order Analytics features - Quick date filters and month selection
  const [quickDateFilter, setQuickDateFilter] = useState<QuickDateFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Report generation states
  const [isGeneratingSettlementReport, setIsGeneratingSettlementReport] = useState(false);
  const [isGeneratingCommonReport, setIsGeneratingCommonReport] = useState(false);
  const [customReportColumns, setCustomReportColumns] = useState<CustomReportColumnKey[]>([
    'orderCode', 'date', 'customerName', 'paymentStatus', 'deliveryStatus', 'deliveryFee', 'totalPrice', 'collectivePrice'
  ]);
  const [isCustomReportExpanded, setIsCustomReportExpanded] = useState(false);
  const [isTableColumnsOpen, setIsTableColumnsOpen] = useState(false);
  const tableColumnsMenuRef = useRef<HTMLDivElement | null>(null);

  const currentUserRoleId = getCurrentUserRoleId();
  const userId = getCurrentUserId();

  const deliveryStatusSelectOptions: SelectOption<number>[] = useMemo(
    () => deliveryStatusOptions.map((status) => ({ value: status.id, label: status.label })),
    [deliveryStatusOptions]
  );

  const paymentTypeSelectOptions: SelectOption<number>[] = useMemo(
    () => paymentTypeOptions,
    [paymentTypeOptions]
  );

  const fromDateValue = startDate ? `${startDate}T00:00:00` : '';
  const toDateValue = endDate ? `${endDate}T23:59:59` : '';

  // Resolve date range based on quick date filter, month selection, or custom dates
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
  const loggedInUserId = useMemo(() => {
    const jwtToken = localStorage.getItem('jwtToken');
    const decodedUser = jwtToken ? (JwtUtil.decodeToken(jwtToken) as Record<string, unknown> | null) : null;
    const tokenUserId = Number(decodedUser?.userId || 0);
    const storedUserId = Number(localStorage.getItem('userId') || 0);
    return Number.isFinite(tokenUserId) && tokenUserId > 0 ? tokenUserId : (Number.isFinite(storedUserId) ? storedUserId : 0);
  }, []);
  const effectiveSendingUserId = canFilterSendingUsers ? (selectedSendingUser?.value ?? 0) : loggedInUserId;

  const pageSizeSelectOptions: SelectOption<number>[] = useMemo(
    () => [5, 10, 20, 50].map((size) => ({ value: size, label: String(size) })),
    []
  );

  const copyOrderCodeToClipboard = useCallback(async (orderCode: string) => {
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
  }, []);

  const activeSearchScopeCount = useMemo(
    () => SEARCH_SCOPE_OPTIONS.filter((option) => searchScopes[option.key]).length,
    [searchScopes]
  );

  const loadSendingUserOptions = useCallback(async (inputValue: string): Promise<UserFilterOption[]> => {
    if (!canFilterSendingUsers) return [];

    try {
      const response = await axiosInstance.post<UsersApiResponse>(
        '/users/get-users',
        {
          pageNumber: 0,
          countPerPage: 20,
          isActive: true,
          search: inputValue.trim(),
        },
      );

      const users = response.data.object?.items || [];
      return users
        .map((user) => {
          const userId = Number(user.id);
          if (!Number.isFinite(userId) || userId <= 0) return null;
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          return {
            value: userId,
            label: fullName ? `${fullName}${user.email ? ` (${user.email})` : ''}` : user.email || `User #${userId}`,
          };
        })
        .filter((option): option is UserFilterOption => option !== null);
    } catch (lookupError) {
      console.error('Failed to load sending users:', lookupError);
      return [];
    }
  }, [canFilterSendingUsers]);

  useEffect(() => {
    setDeliveryStatusFilter(initialDeliveryStatusFilter);
  }, [initialDeliveryStatusFilter]);

  useEffect(() => {
    localStorage.setItem(PLACED_ORDERS_STATS_RANGE_STORAGE_KEY, JSON.stringify(statsDateRange));
  }, [statsDateRange]);

  useEffect(() => {
    setSearchInput(initialOrderCodeFilter);
    setDebouncedSearch(initialOrderCodeFilter);
    setPage(0);

    if (!initialOrderCodeFilter) {
      setExpanded({});
      return;
    }

    setExpanded({ [initialOrderCodeFilter]: true });
  }, [initialOrderCodeFilter]);

  useEffect(() => {
    const fetchDeliveryStatuses = async () => {
      try {
        const response = await axiosInstance.get<DeliveryStatusesApiResponse>('/orders/get-delivery-statuses');
        const rawStatuses = response.data?.object;
        if (!Array.isArray(rawStatuses)) {
          setDeliveryStatusOptions(DEFAULT_DELIVERY_STATUS_OPTIONS);
          return;
        }

        const parsedStatuses = rawStatuses
          .map((status) => {
            const id = Number(status?.id);
            const name = String(status?.name || '').trim();

            if (!Number.isFinite(id) || !name) {
              return null;
            }

            return {
              id,
              name,
              label: toStatusLabel(name),
            };
          })
          .filter((status): status is { id: number; name: string; label: string } => status !== null);

        const nextOptions = [{ id: 0, name: 'All', label: 'All' }, ...parsedStatuses];
        setDeliveryStatusOptions(nextOptions);

        if (!nextOptions.some((status) => status.id === initialDeliveryStatusFilter)) {
          setDeliveryStatusFilter(0);
        }
      } catch (statusError) {
        console.error('Error fetching delivery statuses:', statusError);
        setDeliveryStatusOptions(DEFAULT_DELIVERY_STATUS_OPTIONS);
      }
    };

    fetchDeliveryStatuses();
  }, [initialDeliveryStatusFilter]);

  useEffect(() => {
    const fetchPaymentStatuses = async () => {
      try {
        const response = await axiosInstance.get<PaymentStatusesApiResponse>('/payment/get-payment-statuses');
        const rawStatuses = response.data?.object;

        if (!Array.isArray(rawStatuses)) {
          setPaymentStatusOptions([{ value: 0, label: 'All' }]);
          return;
        }

        const parsedStatuses = rawStatuses
          .map((status) => {
            const id = Number(status?.id);
            const name = String(status?.name || '').trim();

            if (!Number.isFinite(id) || !name) {
              return null;
            }

            return {
              value: id,
              label: toStatusLabel(name),
            };
          })
          .filter((status): status is SelectOption<number> => status !== null);

        setPaymentStatusOptions([{ value: 0, label: 'All' }, ...parsedStatuses]);
      } catch (statusError) {
        console.error('Error fetching payment statuses:', statusError);
        setPaymentStatusOptions([{ value: 0, label: 'All' }]);
      }
    };

    fetchPaymentStatuses();
  }, []);

  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const response = await axiosInstance.get<PaymentTypesApiResponse>('/payment/get-payment-types');
        const rawTypes = response.data?.object;

        if (!Array.isArray(rawTypes)) {
          setPaymentTypeOptions([{ value: 0, label: 'All' }]);
          return;
        }

        const parsedTypes = rawTypes
          .map((type) => {
            const id = Number(type?.id);
            const name = String(type?.name || '').trim();

            if (!Number.isFinite(id) || !name) {
              return null;
            }

            return {
              value: id,
              label: toStatusLabel(name),
            };
          })
          .filter((type): type is SelectOption<number> => type !== null);

        setPaymentTypeOptions([{ value: 0, label: 'All' }, ...parsedTypes]);
      } catch (typeError) {
        console.error('Error fetching payment types:', typeError);
        setPaymentTypeOptions([{ value: 0, label: 'All' }]);
      }
    };

    fetchPaymentTypes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchScopeMenuRef.current) return;
      if (!searchScopeMenuRef.current.contains(event.target as Node)) {
        setIsSearchScopeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const requestBody: OrdersRequestBody = {
      pageNumber: page,
      countPerPage: pageSize,
      cityId: 0,
      orderId: 0,
      userId: 0,
      markerOrderId: 0,
      deliveryStatusId: deliveryStatusFilter,
      paymentStatusId: paymentStatusFilter,
      paymentTypeId: paymentTypeFilter,
      orderCodeUserId: 0,
      search: debouncedSearch,
      fromDate: resolvedDateRange.fromDate,
      toDate: resolvedDateRange.toDate,
      sendingUserId: effectiveSendingUserId,
      ...(isDeliveryCompanySide
        ? {
          thirdPartySendersId: 0,
          ...searchScopes,
        }
        : {}),
    };

    try {
      const response = await axiosInstance.post<ApiResponse>('/orders/get-orders', requestBody);

      if (response.data.message === 'success') {
        setOrders(response.data.object.items || []);
        setTotalCount(response.data.object.totalCount);
        setTotalPages(Math.max(1, response.data.object.totalPages));
      } else {
        setError(response.data.desc || 'Failed to fetch orders');
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to connect to orders service');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, deliveryStatusFilter, paymentStatusFilter, paymentTypeFilter, debouncedSearch, resolvedDateRange.fromDate, resolvedDateRange.toDate, searchScopes, isDeliveryCompanySide, effectiveSendingUserId]);

  // Fetch orders when filters change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch all filtered orders for report generation
  const fetchAllFilteredOrders = useCallback(async (): Promise<ApiOrder[]> => {
    const token = localStorage.getItem('jwtToken');
    const pageSize = 200;
    let pageNumber = 0;
    let resolvedTotalPages = 1;
    const allOrders: ApiOrder[] = [];

    try {
      while (pageNumber < resolvedTotalPages) {
        const requestBody: OrdersRequestBody = {
          pageNumber,
          countPerPage: pageSize,
          cityId: 0,
          orderId: 0,
          userId: 0,
          markerOrderId: 0,
          deliveryStatusId: deliveryStatusFilter,
          paymentStatusId: paymentStatusFilter,
          paymentTypeId: paymentTypeFilter,
          orderCodeUserId: 0,
          search: debouncedSearch,
          fromDate: resolvedDateRange.fromDate,
          toDate: resolvedDateRange.toDate,
          sendingUserId: effectiveSendingUserId,
          ...(isDeliveryCompanySide
            ? {
              thirdPartySendersId: 0,
              ...searchScopes,
            }
            : {}),
        };

        const response = await axiosInstance.post<ApiResponse>('/orders/get-orders', requestBody, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          withCredentials: true,
        });

        if (response.data.message?.toLowerCase() !== 'success') break;

        const responseObject = response.data.object;
        const pageItems = responseObject?.items || [];
        allOrders.push(...pageItems);
        resolvedTotalPages = Math.max(1, Number(responseObject?.totalPages) || 1);

        if (pageItems.length === 0) break;
        pageNumber += 1;
      }
    } catch (error) {
      console.error('Error fetching all filtered orders:', error);
    }

    return Array.from(new Map(allOrders.map((order) => [order.id, order])).values());
  }, [
    deliveryStatusFilter,
    paymentStatusFilter,
    paymentTypeFilter,
    debouncedSearch,
    resolvedDateRange.fromDate,
    resolvedDateRange.toDate,
    effectiveSendingUserId,
    isDeliveryCompanySide,
    searchScopes,
  ]);

  const fetchStatsOrders = useCallback(async () => {
    setIsStatsLoading(true);

    const allOrders: ApiOrder[] = [];
    let pageNumber = 0;
    let resolvedTotalPages = 1;
    const statsPageSize = 200;

    try {
      while (pageNumber < resolvedTotalPages) {
        const requestBody: OrdersRequestBody = {
          pageNumber,
          countPerPage: statsPageSize,
          cityId: 0,
          orderId: 0,
          userId: 0,
          markerOrderId: 0,
          deliveryStatusId: deliveryStatusFilter,
          paymentStatusId: paymentStatusFilter,
          paymentTypeId: paymentTypeFilter,
          orderCodeUserId: 0,
          search: debouncedSearch,
          fromDate: statsDateRange.fromDate ? `${statsDateRange.fromDate}T00:00:00` : '',
          toDate: statsDateRange.toDate ? `${statsDateRange.toDate}T23:59:59` : '',
          sendingUserId: effectiveSendingUserId,
          ...(isDeliveryCompanySide
            ? {
              thirdPartySendersId: 0,
              ...searchScopes,
            }
            : {}),
        };

        const response = await axiosInstance.post<ApiResponse>('/orders/get-orders', requestBody);
        if (response.data.message?.toLowerCase() !== 'success') break;

        const responseObject = response.data.object;
        const pageItems = responseObject?.items || [];
        allOrders.push(...pageItems);
        resolvedTotalPages = Math.max(1, Number(responseObject?.totalPages) || 1);

        if (pageItems.length === 0 || pageItems.length < statsPageSize) break;
        pageNumber += 1;
      }

      setStatsOrders(Array.from(new Map(allOrders.map((order) => [order.id, order])).values()));
    } catch (statsError) {
      console.error('Failed to load placed order stats:', statsError);
      setStatsOrders([]);
    } finally {
      setIsStatsLoading(false);
    }
  }, [
    deliveryStatusFilter,
    paymentStatusFilter,
    paymentTypeFilter,
    debouncedSearch,
    statsDateRange.fromDate,
    statsDateRange.toDate,
    effectiveSendingUserId,
    isDeliveryCompanySide,
    searchScopes,
  ]);

  // Report generation handlers
  const handleGenerateSettlementReport = async (action: 'print' | 'download') => {
    if (!selectedMonth) {
      alert('Please select a month to generate the settlement report.');
      return;
    }

    setIsGeneratingSettlementReport(true);
    try {
      const reportOrders = await fetchAllFilteredOrders();
      const monthLabel = MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || selectedMonth;
      const token = localStorage.getItem('jwtToken');
      const decoded = token ? JwtUtil.decodeToken(token) : null;
      const fullName = `${decoded?.firstName || ''} ${decoded?.lastName || ''}`.trim();
      const scopeLabel = fullName || (currentUserRoleId === ROLE_IDS.MARKET_OWNER ? 'Market Owner' : 'Client');

      const reportAppliedFilters: string[] = [
        `Date: ${monthLabel} ${new Date().getFullYear()}`,
        ...(deliveryStatusFilter !== 0 ? [`Delivery Status: ${deliveryStatusOptions.find((option) => option.id === deliveryStatusFilter)?.label || deliveryStatusFilter}`] : []),
        ...(paymentStatusFilter !== 0 ? [`Payment Status: ${paymentStatusOptions.find((option) => option.value === paymentStatusFilter)?.label || paymentStatusFilter}`] : []),
        ...(paymentTypeFilter !== 0 ? [`Payment Type: ${paymentTypeOptions.find((option) => option.value === paymentTypeFilter)?.label || paymentTypeFilter}`] : []),
        ...(debouncedSearch.trim() ? [`Search: ${debouncedSearch.trim()}`] : []),
      ];

      const reportInput: SettlementReportInput = {
        scopeLabel,
        dateRangeLabel: `${monthLabel} ${new Date().getFullYear()}`,
        reportType: isDeliveryCompanySide ? 'delivery-company' : 'client-market',
        userRoleId: currentUserRoleId,
        appliedFilters: reportAppliedFilters,
        subjectDetails: {
          name: scopeLabel,
          address: '',
        },
        orders: reportOrders.map((order) => ({
          id: order.id,
          marketOrder: order.marketOrder as { id?: number } | null,
          orderCode: order.orderCode?.code,
          createdAt: (order as { createdAt?: string }).createdAt,
          createdDate: (order as { createdDate?: string }).createdDate,
          orderDate: (order as { orderDate?: string }).orderDate,
          createdOn: (order as { createdOn?: string }).createdOn,
          date: (order as { date?: string }).date,
          deliveryTo: order.deliveryTo,
          paymentStatus: order.paymentStatus,
          paymentType: order.paymentType,
          deliveryStatus: order.deliveryStatus,
          deliveryFee: order.deliveryFee,
          collectivePrice: order.collectivePrice,
          totalPrice: order.totalPrice,
          paidAmount: (order as { paidAmount?: number }).paidAmount,
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

      const token = localStorage.getItem('jwtToken');
      const decoded = token ? JwtUtil.decodeToken(token) : null;
      const fullName = `${decoded?.firstName || ''} ${decoded?.lastName || ''}`.trim();
      const scopeLabel = fullName || (isDeliveryCompanySide ? 'Delivery Company' : (currentUserRoleId === ROLE_IDS.MARKET_OWNER ? 'Market Owner' : 'Client'));

      const reportAppliedFilters: string[] = [
        `Date: ${computedDateRangeLabel}`,
        ...(deliveryStatusFilter !== 0 ? [`Delivery Status: ${deliveryStatusOptions.find((option) => option.id === deliveryStatusFilter)?.label || deliveryStatusFilter}`] : []),
        ...(paymentStatusFilter !== 0 ? [`Payment Status: ${paymentStatusOptions.find((option) => option.value === paymentStatusFilter)?.label || paymentStatusFilter}`] : []),
        ...(paymentTypeFilter !== 0 ? [`Payment Type: ${paymentTypeOptions.find((option) => option.value === paymentTypeFilter)?.label || paymentTypeFilter}`] : []),
        ...(debouncedSearch.trim() ? [`Search: ${debouncedSearch.trim()}`] : []),
      ];

      const reportInput: CustomReportInput = {
        scopeLabel,
        dateRangeLabel: computedDateRangeLabel,
        reportType: isDeliveryCompanySide ? 'delivery-company' : 'client-market',
        userRoleId: currentUserRoleId,
        appliedFilters: reportAppliedFilters,
        selectedColumns: customReportColumns,
        subjectDetails: {
          name: scopeLabel,
          address: '',
        },
        orders: reportOrders.map((order) => ({
          id: order.id,
          marketOrder: order.marketOrder as { id?: number } | null,
          orderCode: order.orderCode?.code,
          createdAt: (order as { createdAt?: string }).createdAt,
          createdDate: (order as { createdDate?: string }).createdDate,
          orderDate: (order as { orderDate?: string }).orderDate,
          createdOn: (order as { createdOn?: string }).createdOn,
          date: (order as { date?: string }).date,
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

  const fetchUserDetails = useCallback(async (userIds: number[]) => {
    if (userIds.length === 0) return;

    try {
      const responses = await Promise.all(
        userIds.map((userId) =>
          axiosInstance.post<UsersApiResponse>(
            '/users/get-users',
            {
              pageNumber: 0,
              countPerPage: 10,
              userId,
            },
          )
        )
      );

      const mappedUsers: Record<number, { fullName: string; email: string }> = {};

      responses.forEach((response) => {
        if (response.data.message?.toLowerCase() !== 'success') return;

        const user = response.data.object?.items?.[0];
        if (!user?.id) return;

        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
        mappedUsers[user.id] = {
          fullName,
          email: user.email || 'N/A',
        };
      });

      if (Object.keys(mappedUsers).length > 0) {
        setUsersById((prev) => ({ ...prev, ...mappedUsers }));
      }
    } catch (lookupError) {
      console.error('Failed to load user details for placed orders:', lookupError);
    }
  }, []);

  useEffect(() => {
    const missingUserIds = Array.from(
      new Set(
        orders
          .map((order) => order.orderCode?.users?.id)
          .filter((id): id is number => typeof id === 'number' && id > 0 && !usersById[id])
      )
    );

    if (missingUserIds.length === 0) return;

    void fetchUserDetails(missingUserIds);
  }, [orders, usersById, fetchUserDetails]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, deliveryStatusFilter, paymentStatusFilter, paymentTypeFilter, startDate, endDate, pageSize]);

  // Format currency helper
  const formatCurrency = (value: number) => `LKR ${value.toLocaleString()}`;

  // Convert API order to PDF data format
  const convertOrderToPdfData = (order: ApiOrder): OrderDataForPdf => {
    const deliveryTo = order.deliveryTo || ({} as ApiDeliveryTo);
    const deliveryToRecord = deliveryTo as ApiDeliveryTo & Record<string, unknown>;
    const receiverMobile1 = toCleanString(
      deliveryToRecord.primaryMobile ||
      deliveryToRecord.mobile1 ||
      deliveryToRecord.mobile ||
      deliveryToRecord.phone ||
      deliveryToRecord.phone1,
    );
    const receiverMobile2 = toCleanString(
      deliveryToRecord.secondaryMobile ||
      deliveryToRecord.secondMobile ||
      deliveryToRecord.secondary_mobile ||
      deliveryToRecord.second_mobile ||
      deliveryToRecord.sec_mob ||
      deliveryToRecord.second_mob ||
      deliveryToRecord.mobile2 ||
      deliveryToRecord.phone2,
    );
    const receiverWhatsapp = toCleanString(
      deliveryToRecord.whatsapp ||
      deliveryToRecord.whats_app ||
      deliveryToRecord.whatsApp ||
      deliveryToRecord.wa,
    );
    const marketOrderId = Number(
      (order.marketOrder as { id?: number } | undefined)?.id ||
      (order as { marketOrderId?: number }).marketOrderId ||
      0,
    ) || undefined;
    const orderCodeUserId = Number(
      order.orderCode?.users?.id ||
      order.orderCode?.user?.id ||
      order.orderCode?.userId ||
      0,
    ) || undefined;

    return {
      orderId: String(order.id),
      orderCode: order.orderCode?.code || `ORD-${order.id}`,
      orderPrice: order.totalPrice,
      collectivePrice: order.collectivePrice,
      deliveryFee: order.deliveryFee,
      quantity: order.qty,
      weight: order.weight,
      description: order.desc,
      recipientName: deliveryTo.fullName || 'N/A',
      address: deliveryTo.address || 'N/A',
      city: deliveryTo.city?.name || 'N/A',
      postalCode: '',
      mobile1: receiverMobile1 || 'N/A',
      mobile2: receiverMobile2,
      whatsapp: receiverWhatsapp,
      receiverMobile1,
      receiverMobile2,
      receiverWhatsapp,
      googleMapLocation: deliveryTo.googleMapLocation || deliveryTo.location,
      orderCodeUserId,
      marketOrderId,
      orderCodeDetails: order.orderCode,
      deliveryTo,
      senderName: order.thirdPartySenders?.name,
      senderPhone: order.thirdPartySenders?.first_mob,
      senderPhone2: order.thirdPartySenders?.sec_mob,
      senderWhatsapp: order.thirdPartySenders?.whatsapp,
      senderAddress: order.thirdPartySenders?.address,
      senderType: order.thirdPartySenders ? 'third_party' : undefined,
      thirdPartySender: order.thirdPartySenders
        ? {
          id: order.thirdPartySenders.id,
          name: order.thirdPartySenders.name,
          address: order.thirdPartySenders.address,
          note: order.thirdPartySenders.note,
          first_mob: order.thirdPartySenders.first_mob,
          sec_mob: order.thirdPartySenders.sec_mob,
          whatsapp: order.thirdPartySenders.whatsapp,
        }
        : undefined,
    };
  };

  const uploadSlipToStorage = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('files', file);

    const response = await axiosInstance.post('/storage/upload?path=payment-proofs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && (response.data.message === 'Success' || response.data.message === 'success')) {
      const uploadedPaths: string[] = Array.isArray(response.data.object) ? response.data.object : [];

      if (!uploadedPaths.length) {
        throw new Error('No uploaded file path was returned by the storage service.');
      }

      return uploadedPaths[0];
    }

    throw new Error(response.data?.desc || 'Failed to upload slip.');
  }, []);

  const closeBankSlipModal = () => {
    if (isBankSlipSubmitting) return;
    setBankSlipOrder(null);
    setBankSlipMarketId(null);
  };

  const openBankSlipModal = useCallback(async (order: ApiOrder) => {
    if (!isBankTransferPaymentType(order.paymentType?.name)) {
      return;
    }

    const marketOrderId = getMarketOrderIdFromOrder(order);
    if (!marketOrderId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Bank details unavailable',
        text: 'This bank transfer order is missing its market order reference.',
        confirmButtonColor: '#F59B0F',
      });
      return;
    }

    try {
      const marketResponse = await axiosInstance.get('/markets/get-markets-details-by-market-order-id', {
        params: { marketOrderId },
      });

      const marketPayload = marketResponse.data?.object || marketResponse.data?.exData || marketResponse.data?.data || {};
      const resolvedMarketId = Number(marketPayload?.id || marketPayload?.marketId || marketPayload?.market?.id || 0);

      if (!Number.isFinite(resolvedMarketId) || resolvedMarketId <= 0) {
        throw new Error('Unable to resolve the market for this order.');
      }

      setBankSlipMarketId(resolvedMarketId);
      setBankSlipOrder(order);
    } catch (error) {
      console.error('Failed to resolve market for bank slip upload:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Unable to open slip upload',
        text: 'Could not resolve the market details for this order.',
        confirmButtonColor: '#F59B0F',
      });
    }
  }, []);

  const handleBankSlipSubmit = useCallback(async (file: File, bankDetailId: number) => {
    if (!bankSlipOrder || !bankSlipMarketId) {
      await Swal.fire({
        icon: 'error',
        title: 'Missing order context',
        text: 'Please reopen the slip upload from the order list.',
        confirmButtonColor: '#F59B0F',
      });
      return;
    }

    try {
      setIsBankSlipSubmitting(true);

      const proofUrl = await uploadSlipToStorage(file);
      const jwtToken = localStorage.getItem('jwtToken');
      const decodedUser = jwtToken ? (JwtUtil.decodeToken(jwtToken) as Record<string, unknown> | null) : null;
      const userName = decodedUser
        ? `${String(decodedUser.firstName || '')} ${String(decodedUser.lastName || '')}`.trim() || String(decodedUser.email || 'system')
        : 'system';

      const orderCode = bankSlipOrder.orderCode?.code || `ORD-${bankSlipOrder.id}`;
      const paymentTypeId = bankSlipOrder.paymentType?.id || 0;
      const paymentTypeName = bankSlipOrder.paymentType?.name || 'Bank Transfer';
      const amount = bankSlipOrder.totalPrice;

      const paymentPayload = {
        id: 0,
        amount,
        desc: `Bank transfer slip for order ${orderCode}`,
        proofUrl,
        paymentRecordItems: [
          {
            code: orderCode,
            note: `Bank transfer slip for order ${orderCode}`,
            amount,
          },
        ],
        bankDetail: {
          id: bankDetailId,
          name: undefined,
        },
        verificationStatus: {
          id: 1,
          name: 'PENDING',
        },
        paymentType: {
          id: paymentTypeId,
          name: paymentTypeName,
        },
        isReturn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userName,
        madeBy: userName,
        updatedBy: userName,
      };

      const paymentResponse = await axiosInstance.post('/payment/create-payment-record', paymentPayload);
      if (String(paymentResponse.data?.message || '').toLowerCase() !== 'success') {
        throw new Error(paymentResponse.data?.desc || 'Failed to save payment record.');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Slip received',
        text: `Payment slip uploaded for ${orderCode}.`,
        timer: 1600,
        showConfirmButton: false,
        confirmButtonColor: '#F59B0F',
      });

      setBankSlipOrder(null);
      setBankSlipMarketId(null);
      fetchOrders();
    } catch (error) {
      console.error('Failed to upload bank transfer slip:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Upload failed',
        text: 'Failed to submit the bank transfer slip. Please try again.',
        confirmButtonColor: '#F59B0F',
      });
    } finally {
      setIsBankSlipSubmitting(false);
    }
  }, [bankSlipOrder, bankSlipMarketId, fetchOrders, uploadSlipToStorage]);

  // Generate PDF for single order
  const generateSingleOrderPDF = useCallback(async (order: ApiOrder) => {
    try {
      const orderData = convertOrderToPdfData(order);
      await generateOrderSlipPdfMake(orderData, 'download');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate PDF',
        confirmButtonColor: '#F59B0F',
      });
    }
  }, []);

  // Print PDF for single order
  const printSingleOrderPDF = useCallback(async (order: ApiOrder) => {
    console.log(order);

    try {
      const orderData = convertOrderToPdfData(order);
      await generateOrderSlipPdfMake(orderData, 'print');
    } catch (error) {
      console.error('Error printing PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to print PDF',
        confirmButtonColor: '#F59B0F',
      });
    }
  }, []);

  // Generate PDF for multiple orders
  const generateMultipleOrdersPDF = useCallback(async () => {
    if (selectedOrders.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Orders Selected',
        text: 'Please select at least one order to generate PDF',
        confirmButtonColor: '#F59B0F',
      });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const selectedOrderList = orders.filter((o) => selectedOrders.has(o.id));
      const ordersData = selectedOrderList.map(convertOrderToPdfData);
      setBulkPdfProgress({ processed: 0, total: ordersData.length, orderCode: '' });

      await generateMultipleOrderSlipsPdfMake(ordersData, 'download', {
        onProgress: ({ processed, total, orderCode }: OrderSlipGenerationProgress) => {
          setBulkPdfProgress({ processed, total, orderCode });
        },
      });

      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'PDF Generated',
        text: `Successfully generated PDF for ${selectedOrderList.length} order(s)`,
        confirmButtonColor: '#F59B0F',
        timer: 2000,
        showConfirmButton: false,
      });

      // Clear selection
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('Error generating PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate PDF',
        confirmButtonColor: '#F59B0F',
      });
    } finally {
      setIsGeneratingPDF(false);
      setBulkPdfProgress(null);
    }
  }, [selectedOrders, orders]);

  // Print PDF for multiple orders
  const printMultipleOrdersPDF = useCallback(async () => {
    if (selectedOrders.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Orders Selected',
        text: 'Please select at least one order to print',
        confirmButtonColor: '#F59B0F',
      });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const selectedOrderList = orders.filter((o) => selectedOrders.has(o.id));
      const ordersData = selectedOrderList.map(convertOrderToPdfData);
      setBulkPdfProgress({ processed: 0, total: ordersData.length, orderCode: '' });

      await generateMultipleOrderSlipsPdfMake(ordersData, 'print', {
        onProgress: ({ processed, total, orderCode }: OrderSlipGenerationProgress) => {
          setBulkPdfProgress({ processed, total, orderCode });
        },
      });

      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Print Dialog Opened',
        text: `Opening print dialog for ${selectedOrderList.length} order(s)`,
        confirmButtonColor: '#F59B0F',
        timer: 2000,
        showConfirmButton: false,
      });

      // Clear selection
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('Error printing PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to print PDF',
        confirmButtonColor: '#F59B0F',
      });
    } finally {
      setIsGeneratingPDF(false);
      setBulkPdfProgress(null);
    }
  }, [selectedOrders, orders]);

  const showingRange = useMemo(() => {
    if (totalCount === 0) return { from: 0, to: 0 };
    const from = page * pageSize + 1;
    const to = Math.min(totalCount, (page + 1) * pageSize);
    return { from, to };
  }, [totalCount, page, pageSize]);

  const orderStatusCards = useMemo(() => {
    const countsByStatusId = statsOrders.reduce<Record<number, number>>((acc, order) => {
      const statusId = Number(order.deliveryStatus?.id || 0);
      if (!Number.isFinite(statusId) || statusId <= 0) return acc;
      acc[statusId] = (acc[statusId] || 0) + 1;
      return acc;
    }, {});

    const cards = deliveryStatusOptions
      .filter((status) => status.id !== 0)
      .map((status) => ({
        id: status.id,
        label: status.label,
        count: countsByStatusId[status.id] || 0,
        visual: getDeliveryStatusVisual(status.name),
      }));

    const unknownCount = statsOrders.filter((order) => !order.deliveryStatus?.id).length;
    if (unknownCount > 0) {
      cards.push({
        id: -1,
        label: 'Unknown',
        count: unknownCount,
        visual: getDeliveryStatusVisual(''),
      });
    }

    return cards;
  }, [statsOrders, deliveryStatusOptions]);

  const visibleOrderStatusCards = showAllStatCards ? orderStatusCards : orderStatusCards.slice(0, 8);

  const toggleExpanded = (orderCode: string) => {
    setExpanded((prev) => ({ ...prev, [orderCode]: !prev[orderCode] }));
  };

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length && orders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  const openTimelineModal = async (order: ApiOrder) => {
    setTimelineModalOrder(order);
    setIsTimelineModalOpen(true);
    setIsTimelineModalLoading(true);
    setTimelineModalError(null);
    setTimelineModalTimeline([]);
    setTimelineModalSender(null);

    const deliveryTo = order.deliveryTo || ({} as ApiDeliveryTo);
    setTimelineModalOrderDetails({
      customerName: deliveryTo.fullName || 'N/A',
      contact: deliveryTo.primaryMobile || deliveryTo.secondaryMobile || deliveryTo.whatsapp || 'N/A',
      email: 'N/A',
      address: [deliveryTo.address, deliveryTo.city?.name].filter(Boolean).join(', ') || 'N/A',
      deliveryMapLocation: deliveryTo.googleMapLocation || deliveryTo.location || '',
    });

    try {
      const thirdParty = order.thirdPartySenders;
      const hasThirdPartySender = Boolean(
        toCleanString(thirdParty?.name) ||
        toCleanString(thirdParty?.address) ||
        toCleanString(thirdParty?.first_mob) ||
        toCleanString(thirdParty?.sec_mob) ||
        toCleanString(thirdParty?.whatsapp),
      );

      let resolvedSender: SenderDetails = {
        type: 'unknown',
        name: 'N/A',
        contact: 'N/A',
        location: 'N/A',
        note: '',
        address: 'N/A',
        phone: 'N/A',
        firstPhone: '',
        secondPhone: '',
        whatsapp: '',
        email: 'N/A',
      };

      if (hasThirdPartySender) {
        resolvedSender = {
          type: 'third_party',
          name: thirdParty?.name || 'N/A',
          contact: joinPhones([thirdParty?.first_mob, thirdParty?.sec_mob, thirdParty?.whatsapp]),
          location: thirdParty?.address || 'N/A',
          note: thirdParty?.note || '',
          address: thirdParty?.address || 'N/A',
          phone: joinPhones([thirdParty?.first_mob, thirdParty?.sec_mob, thirdParty?.whatsapp]),
          firstPhone: toCleanString(thirdParty?.first_mob),
          secondPhone: toCleanString(thirdParty?.sec_mob),
          whatsapp: toCleanString(thirdParty?.whatsapp),
          email: 'N/A',
        };
      }

      const orderCodeUserId = order.orderCode?.users?.id;
      const senderUserId = orderCodeUserId || order.userId;
      if (!hasThirdPartySender && senderUserId) {
        let defaultUserAddress: any = null;

        try {
          const userAddressRes = await axiosInstance.get(
            `/users/get-address-by-id-or-user-id?defaultAddress=true&userId=${senderUserId}`,
          );
          const addresses = userAddressRes.data?.object || userAddressRes.data?.exData || [];
          if (Array.isArray(addresses)) {
            defaultUserAddress = addresses.find((item) => Boolean(item?.defaultAddress)) || addresses[0] || null;
          }
        } catch {
          defaultUserAddress = null;
        }

        try {
          const userRes = await axiosInstance.get(`/users/admin/get-user-by-id?id=${senderUserId}`);
          const userData = userRes.data?.object || userRes.data?.exData || {};
          if (userData && Object.keys(userData).length > 0) {
            const addressCity = defaultUserAddress?.city?.name ? `, ${defaultUserAddress.city.name}` : '';
            const resolvedAddress = defaultUserAddress?.address
              ? `${defaultUserAddress.address}${addressCity}`
              : (userData.address || 'N/A');

            resolvedSender = {
              type: 'user',
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || `User #${senderUserId}`,
              contact: joinPhones([
                userData.mobile,
                userData.phone,
                userData.whatsapp,
                defaultUserAddress?.phone,
                defaultUserAddress?.mobile,
                defaultUserAddress?.primaryMobile,
                defaultUserAddress?.secondaryMobile,
                defaultUserAddress?.whatsapp,
              ]),
              location: resolvedAddress,
              note: userData.nic || '',
              address: resolvedAddress,
              phone: joinPhones([
                userData.mobile,
                userData.phone,
                userData.whatsapp,
                defaultUserAddress?.phone,
                defaultUserAddress?.mobile,
                defaultUserAddress?.primaryMobile,
                defaultUserAddress?.secondaryMobile,
                defaultUserAddress?.whatsapp,
              ]),
              firstPhone: toCleanString(
                userData.mobile ||
                userData.phone ||
                defaultUserAddress?.phone ||
                defaultUserAddress?.mobile ||
                defaultUserAddress?.primaryMobile,
              ),
              secondPhone: toCleanString(defaultUserAddress?.secondaryMobile),
              whatsapp: toCleanString(userData.whatsapp || defaultUserAddress?.whatsapp),
              email: userData.email || 'N/A',
            };
          }
        } catch {
          // Keep fallback sender values when user lookup fails.
        }
      }

      const marketOrderId = (order.marketOrder as { id?: number } | undefined)?.id || (order as { marketOrderId?: number }).marketOrderId;
      if (!hasThirdPartySender && marketOrderId) {
        try {
          const marketRes = await axiosInstance.get(`/markets/get-markets-details-by-market-order-id?marketOrderId=${marketOrderId}`);
          const marketData = marketRes.data?.object || marketRes.data?.exData || {};
          if (marketData && Object.keys(marketData).length > 0) {
            resolvedSender = {
              type: 'market',
              name: marketData.name || 'Market',
              contact: formatMarketPhones(marketData),
              location: marketData.address || marketData.location || 'N/A',
              note: marketData.infoMessage || marketData.desc || '',
              address: marketData.address || marketData.location || 'N/A',
              phone: formatMarketPhones(marketData),
              firstPhone: toCleanString(marketData.first_num),
              secondPhone: toCleanString(marketData.second_num),
              whatsapp: toCleanString(marketData.whats_app),
              email: marketData?.users?.email || 'N/A',
            };
          }
        } catch {
          // Keep previous sender data when market lookup fails.
        }
      }

      setTimelineModalSender(resolvedSender);

      const modalOrderCode = order.orderCode?.code;
      if (modalOrderCode) {
        const historyRes = await axiosInstance.get(`/orders/get-delivery-history-by-order-code-or-id?orderCode=${encodeURIComponent(modalOrderCode)}`);
        const historyItems = historyRes.data?.object || [];

        const timelineData: DeliveryTimelineItem[] = await Promise.all(
          historyItems.map(async (item: Record<string, unknown>, index: number) => {
            const employeeStub = (item.employees as Record<string, unknown>) || {};
            const employeeId = employeeStub.id;
            let employeeName = 'Unassigned';
            let employeeContact = 'N/A';
            let employeeMobile = 'N/A';
            let employeeWhatsApp = 'N/A';

            if (employeeId) {
              try {
                const empDetailsRes = await axiosInstance.get(`/employees/get-details-by-id?id=${employeeId}`);
                const empData = empDetailsRes.data?.object;
                if (empData && typeof empData === 'object') {
                  employeeName = `${empData.usersFirstName || ''} ${empData.usersLastName || ''}`.trim() || `Employee #${employeeId}`;
                  employeeMobile = toCleanString(empData.mobile) || 'N/A';
                  employeeWhatsApp = toCleanString(empData.whatsapp) || 'N/A';
                  employeeContact = joinPhones([employeeMobile, employeeWhatsApp]);
                }
              } catch {
                try {
                  const empRes = await axiosInstance.get(`/employees/get-user-by-employee-id?id=${employeeId}`);
                  const empData = empRes.data?.object;
                  if (empData) {
                    employeeName = `${empData.firstName || ''} ${empData.lastName || ''}`.trim() || empData.name || `Employee #${employeeId}`;
                    employeeMobile = toCleanString(empData.mobile || empData.phone) || 'N/A';
                    employeeWhatsApp = toCleanString(empData.whatsapp) || 'N/A';
                    employeeContact = joinPhones([employeeMobile, employeeWhatsApp]);
                  }
                } catch {
                  // Keep fallback employee values when lookups fail.
                }
              }
            }

            const deliveryStatus = item.deliveryStatus as Record<string, unknown> | null;
            return {
              id: (item.id as number) || index + 1,
              status: (deliveryStatus?.name as string) || 'Unknown Status',
              statusId: deliveryStatus?.id ? Number(deliveryStatus.id) : undefined,
              assignedAt: formatDateTime(item.createdAt as string),
              name: employeeName,
              employeeId: employeeId ? Number(employeeId) : undefined,
              contact: employeeContact,
              mobile: employeeMobile,
              whatsapp: employeeWhatsApp,
              note: item.note == null ? null : String(item.note),
              location: (employeeStub.location as string) || 'N/A',
            };
          })
        );

        setTimelineModalTimeline(timelineData);
      }
    } catch (modalLoadError) {
      console.error('Failed to load timeline modal data:', modalLoadError);
      setTimelineModalError('Unable to load timeline details right now.');
    } finally {
      setIsTimelineModalLoading(false);
    }
  };

  const closeTimelineModal = () => {
    setIsTimelineModalOpen(false);
    setTimelineModalOrder(null);
    setTimelineModalError(null);
    setTimelineModalTimeline([]);
    setTimelineModalSender(null);
    setTimelineModalOrderDetails(null);
  };

  const handleUpdateDeliveryStatus = useCallback(async (orderId: number, orderCode: string, deliveryStatusId: number, actionLabel: string, confirmText: string, confirmButtonColor: string, successText: string) => {
    const res = await Swal.fire({
      title: `${actionLabel} this order?`,
      text: `Order ${orderCode} will be updated to ${successText.toLowerCase()}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Keep',
      confirmButtonColor,
    });

    if (!res.isConfirmed) return;

    try {
      const response = await axiosInstance.put('/orders/update-delivery-status-by_order-id', null, {
        params: {
          orderId,
          deliveryStatusId,
        },
      });

      if (response.data?.message?.toLowerCase() !== 'success') {
        throw new Error(response.data?.desc || `Failed to ${actionLabel.toLowerCase()} order`);
      }

      await Swal.fire({
        title: 'Updated',
        text: `Order ${orderCode} is now ${successText.toLowerCase()}.`,
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
      });

      fetchOrders();
    } catch (updateError) {
      console.error(`Failed to ${actionLabel.toLowerCase()} order:`, updateError);
      await Swal.fire({
        title: 'Error',
        text: `Failed to ${actionLabel.toLowerCase()} order.`,
        icon: 'error',
        confirmButtonColor,
      });
    }
  }, [fetchOrders]);

  // const handleReturn = async (orderId: number, orderCode: string) => {
  //   await handleUpdateDeliveryStatus(orderId, orderCode, 4, 'Mark as returning', 'Yes, return', '#f59e0b', 'returning');
  // };

  // const handleCancel = async (orderId: number, orderCode: string) => {
  //   await handleUpdateDeliveryStatus(orderId, orderCode, 6, 'Cancel', 'Yes, cancel', '#ef4444', 'cancelled');
  // };

  const handleDelete = async (orderId: number, orderCode: string) => {
    if (!canDeleteOrDropOrders) return;

    const res = await Swal.fire({
      title: 'Delete this order?',
      text: `Order ${orderCode} will be permanently removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Keep',
      confirmButtonColor: '#dc2626',
    });

    if (!res.isConfirmed) return;

    try {
      const response = await axiosInstance.delete('/orders/drop-order-by-id', {
        params: {
          orderId,
        },
      });

      if (response.data?.message?.toLowerCase() !== 'success') {
        throw new Error(response.data?.desc || 'Failed to delete order');
      }

      await Swal.fire({
        title: 'Deleted',
        text: `Order ${orderCode} has been deleted.`,
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
      });

      fetchOrders();
    } catch (deleteError) {
      console.error('Failed to delete order:', deleteError);
      await Swal.fire({
        title: 'Error',
        text: 'Failed to delete order.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  const handleTrack = async (orderCode: string) => {
    await Swal.fire({
      title: 'Order Tracking',
      html: `<div style="text-align:left">
        <div style="margin-bottom:10px">Order <b>${orderCode}</b></div>
        <div style="color:#6b7280">Connect to tracking page when ready.</div>
      </div>`,
      icon: 'info',
      confirmButtonText: 'OK',
      confirmButtonColor: '#F59B0F',
    });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchScopes(createDefaultSearchScopeState());
    setIsSearchScopeOpen(false);
    setDeliveryStatusFilter(0);
    setPaymentStatusFilter(0);
    setPaymentTypeFilter(0);
    setStartDate('');
    setEndDate('');
    setSelectedSendingUser(null);
    setPage(0);
    setQuickDateFilter('all');
    setSelectedMonth('');
  };

  // Click outside handlers for menus
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

  // Table column definitions for custom report
  const TABLE_COLUMN_DEFS: Array<{ key: CustomReportColumnKey; label: string }> = [
    { key: 'orderCode', label: 'Order Code' },
    { key: 'date', label: 'Date' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'city', label: 'City' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'paymentType', label: 'Payment Type' },
    { key: 'deliveryStatus', label: 'Delivery Status' },
    { key: 'deliveryFee', label: 'Delivery Fee' },
    { key: 'totalPrice', label: 'Total Price' },
    { key: 'collectivePrice', label: 'Collective Price' },
  ];

  return (
    <div className=" bg-gray-50 pb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            Current Orders
          </h1>
          <p className="text-gray-600 text-sm md:text-base">Track and manage all active deliveries in real-time</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white/70 p-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Delivery stats</p>
              <p className="text-xs text-gray-500">
                {isStatsLoading ? 'Loading stats...' : `Showing ${statsOrders.length} orders from the saved stats date range`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="date"
                value={statsDateRange.fromDate}
                onChange={(event) => setStatsDateRange((current) => ({ ...current, fromDate: event.target.value }))}
                max={statsDateRange.toDate || undefined}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-[#F59B0F] focus:outline-none"
                aria-label="Stats from date"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={statsDateRange.toDate}
                onChange={(event) => setStatsDateRange((current) => ({ ...current, toDate: event.target.value }))}
                min={statsDateRange.fromDate || undefined}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-[#F59B0F] focus:outline-none"
                aria-label="Stats to date"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Orders</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{statsOrders.length}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <TruckIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {visibleOrderStatusCards.map((card) => {
            const StatusIcon = card.visual.icon;
            return (
              <div key={card.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-600 font-medium" title={card.label}>{card.label}</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{card.count}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${card.visual.nodeClassName}`}>
                    <StatusIcon className="w-7 h-7" />
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          {orderStatusCards.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllStatCards((current) => !current)}
              className="self-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#F59B0F] hover:text-[#D17F0A]"
            >
              {showAllStatCards ? 'Show fewer stats' : `View all ${orderStatusCards.length} stats`}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
          {/* Search Bar */}
          <div className={`flex flex-col gap-3 ${isDeliveryCompanySide ? 'lg:flex-row lg:items-start' : ''}`}>
            <div className="relative flex-1 min-w-0">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by order code, recipient, market, or sender..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-base"
              />
            </div>

            {isDeliveryCompanySide && (
              <div ref={searchScopeMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSearchScopeOpen((prev) => !prev)}
                  className="inline-flex h-12.5 w-full lg:w-auto items-center justify-between gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-white"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isSearchScopeOpen ? 'rotate-180' : ''}`} />
                    <span>Scopes</span>
                  </span>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                    {activeSearchScopeCount}
                  </span>
                </button>

                {isSearchScopeOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">Search scope</p>
                      <p className="text-xs text-gray-500">Toggle the fields included in the query</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {SEARCH_SCOPE_OPTIONS.map((option) => {
                        const enabled = searchScopes[option.key];
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setSearchScopes((prev) => ({ ...prev, [option.key]: !prev[option.key] }))}
                            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${enabled ? 'bg-orange-50/70' : 'hover:bg-gray-50'}`}
                          >
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-[11px] font-black ${enabled ? 'border-[#F59B0F] bg-[#F59B0F] text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                              ✓
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                              <span className="block text-xs leading-5 text-gray-500">{option.description}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {canFilterSendingUsers && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Sending User</p>
              <AsyncSelect<UserFilterOption, false>
                cacheOptions
                defaultOptions
                loadOptions={loadSendingUserOptions}
                value={selectedSendingUser}
                onChange={(option) => {
                  setSelectedSendingUser(option ?? null);
                  setPage(0);
                }}
                styles={customSelectFieldStyles}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                instanceId="placed-orders-sending-user"
                placeholder="All sending users"
                isClearable
              />
            </div>
          )}

          {/* Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Delivery Status</p>
              <Select<SelectOption<number>, false>
                value={deliveryStatusSelectOptions.find((option) => option.value === deliveryStatusFilter) ?? deliveryStatusSelectOptions[0]}
                onChange={(option) => setDeliveryStatusFilter(option ? option.value : 0)}
                options={deliveryStatusSelectOptions}
                styles={customSelectFieldStyles}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                instanceId="placed-orders-delivery-status"
                aria-label="Delivery Status"
                isSearchable={false}
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Payment Status</p>
              <Select<SelectOption<number>, false>
                value={paymentStatusOptions.find((option) => option.value === paymentStatusFilter) ?? paymentStatusOptions[0]}
                onChange={(option) => setPaymentStatusFilter(option ? option.value : 0)}
                options={paymentStatusOptions}
                styles={customSelectFieldStyles}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                instanceId="placed-orders-payment-status"
                aria-label="Payment Status"
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Payment Type</p>
              <Select<SelectOption<number>, false>
                value={paymentTypeSelectOptions.find((option) => option.value === paymentTypeFilter) ?? paymentTypeSelectOptions[0]}
                onChange={(option) => setPaymentTypeFilter(option ? option.value : 0)}
                options={paymentTypeSelectOptions}
                styles={customSelectFieldStyles}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                instanceId="placed-orders-payment-type"
                aria-label="Payment Type"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">From Date</p>
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setQuickDateFilter('all');
                  setSelectedMonth('');
                }}
                disabled={quickDateFilter !== 'all' || selectedMonth !== ''}
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 focus:border-[#F59B0F] focus:bg-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">To Date</p>
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setQuickDateFilter('all');
                  setSelectedMonth('');
                }}
                disabled={quickDateFilter !== 'all' || selectedMonth !== ''}
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 focus:border-[#F59B0F] focus:bg-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Quick Date Filter</p>
              <Select<SelectOption<QuickDateFilter>, false>
                value={[
                  { value: 'all' as QuickDateFilter, label: 'All' },
                  { value: 'today' as QuickDateFilter, label: 'Today' },
                  { value: 'thisWeek' as QuickDateFilter, label: 'This Week' },
                  { value: 'lastWeek' as QuickDateFilter, label: 'Last Week' },
                  { value: 'thisMonth' as QuickDateFilter, label: 'This Month' },
                  { value: 'lastMonth' as QuickDateFilter, label: 'Last Month' },
                ].find((option) => option.value === quickDateFilter)}
                onChange={(option) => {
                  setQuickDateFilter(option ? option.value : 'all');
                  setSelectedMonth('');
                  setStartDate('');
                  setEndDate('');
                }}
                options={[
                  { value: 'all' as QuickDateFilter, label: 'All' },
                  { value: 'today' as QuickDateFilter, label: 'Today' },
                  { value: 'thisWeek' as QuickDateFilter, label: 'This Week' },
                  { value: 'lastWeek' as QuickDateFilter, label: 'Last Week' },
                  { value: 'thisMonth' as QuickDateFilter, label: 'This Month' },
                  { value: 'lastMonth' as QuickDateFilter, label: 'Last Month' },
                ]}
                styles={customSelectFieldStyles}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                instanceId="placed-orders-quick-date"
                aria-label="Quick Date Filter"
                isSearchable={false}
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Select Month</p>
              <Select<SelectOption<string>, false>
                value={selectedMonth ? MONTH_OPTIONS.find((m) => m.value === selectedMonth) : null}
                onChange={(option) => {
                  setSelectedMonth(option ? option.value : '');
                  setQuickDateFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                options={MONTH_OPTIONS}
                isClearable
                placeholder="Select a month..."
                styles={customSelectFieldStyles}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                instanceId="placed-orders-month"
                aria-label="Select Month"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-[#D17F0A] transition-all hover:border-[#F59B0F] hover:bg-orange-100"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Report Generation Section */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col gap-2 mb-2">
            <h2 className="text-xl font-bold text-gray-900">Report Generation</h2>
            <p className="text-sm text-gray-600">Generate settlement and custom reports for your orders</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Settlement Report</p>
              <button
                type="button"
                onClick={() => handleGenerateSettlementReport('download')}
                disabled={isGeneratingSettlementReport || !selectedMonth}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                {isGeneratingSettlementReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Custom Report</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateCommonReport('download')}
                  disabled={isGeneratingCommonReport}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  {isGeneratingCommonReport ? 'Generating...' : 'Generate'}
                </button>
                <div ref={tableColumnsMenuRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTableColumnsOpen((prev) => !prev)}
                    className="inline-flex h-12.5 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-white"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${isTableColumnsOpen ? 'rotate-180' : ''}`} />
                      <span>Columns</span>
                    </span>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                      {customReportColumns.length}
                    </span>
                  </button>

                  {isTableColumnsOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">Report Columns</p>
                        <p className="text-xs text-gray-500">Select columns to include in custom report</p>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-2">
                        {TABLE_COLUMN_DEFS.map((column) => {
                          const enabled = customReportColumns.includes(column.key);
                          return (
                            <button
                              key={column.key}
                              type="button"
                              onClick={() => {
                                setCustomReportColumns((prev) =>
                                  enabled
                                    ? prev.filter((col) => col !== column.key)
                                    : [...prev, column.key]
                                );
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${enabled ? 'bg-orange-50/70' : 'hover:bg-gray-50'}`}
                            >
                              <span className="text-sm font-semibold text-gray-900">{column.label}</span>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-[11px] font-black ${enabled ? 'border-[#F59B0F] bg-[#F59B0F] text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                                ✓
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination Controls Top */}
        <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700">
              {isLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                <>
                  Showing <span className="font-bold text-gray-900">{showingRange.from}</span> to{' '}
                  <span className="font-bold text-gray-900">{showingRange.to}</span> of{' '}
                  <span className="font-bold text-gray-900">{totalCount}</span> orders
                </>
              )}
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Per page:</span>
                <div className="min-w-23">
                  <Select<SelectOption<number>, false>
                    value={pageSizeSelectOptions.find((option) => option.value === pageSize) ?? pageSizeSelectOptions[1]}
                    onChange={(option) => setPageSize(option ? option.value : 10)}
                    options={pageSizeSelectOptions}
                    styles={customSelectFieldStyles}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    instanceId="placed-orders-page-size"
                    aria-label="Per page"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page <= 0 || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                  {page + 1} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchOrders}
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

      {/* Selected Orders Info and Batch Download */}
      {selectedOrders.size > 0 && (
        <div className="mt-4 bg-linear-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#F59B0F] to-[#D17F0A] flex items-center justify-center shadow-md shadow-orange-400/30">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-orange-900">{selectedOrders.size} Order(s) Selected</p>
                <p className="text-sm text-orange-700">Generate or print a combined PDF for all selected orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedOrders(new Set())}
                className="px-3 py-2 rounded-xl border-2 border-orange-300 bg-white text-orange-700 font-semibold hover:bg-orange-50 transition-all"
              >
                <MdOutlineClear className="w-5 h-5" />
              </button>
              <button
                onClick={printMultipleOrdersPDF}
                disabled={isGeneratingPDF}
                className="px-6 py-2 rounded-xl border-2 border-[#F59B0F] bg-white text-[#D17F0A] font-semibold hover:bg-orange-50 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PrinterIcon className="w-5 h-5" />
                ({selectedOrders.size})
              </button>
              <button
                onClick={generateMultipleOrdersPDF}
                disabled={isGeneratingPDF}
                className="px-6 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg hover:shadow-orange-400/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Download PDF ({selectedOrders.size})
              </button>
            </div>
          </div>
          {isGeneratingPDF && bulkPdfProgress && (
            <div className="mt-4 rounded-xl border border-orange-200 bg-white p-3">
              <div className="flex items-center justify-between text-sm font-semibold text-orange-800 mb-2">
                <span>Generating slips {bulkPdfProgress.processed}/{bulkPdfProgress.total}</span>
                <span>{Math.round((bulkPdfProgress.processed / Math.max(1, bulkPdfProgress.total)) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-[#F59B0F] to-[#D17F0A] transition-all duration-300"
                  style={{ width: `${(bulkPdfProgress.processed / Math.max(1, bulkPdfProgress.total)) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-orange-700">
                Current order: {bulkPdfProgress.orderCode || 'Preparing...'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-bold text-red-800">Error loading orders</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={fetchOrders}
              className="ml-auto px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Orders Table - Responsive for All Screen Sizes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === orders.length && orders.length > 0}
                    onChange={toggleSelectAll}
                    disabled={orders.length === 0}
                    className="w-4 h-4 rounded border-2 border-gray-300 cursor-pointer"
                    title="Select all orders"
                  />
                </th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  Order code
                </th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  Customer & City
                </th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  Payment
                </th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  Items
                </th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  Total <small>(LKR)</small>
                </th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                      <p className="text-gray-600">Loading orders...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const orderCodeStr = order.orderCode?.code || `ORD-${order.id}`;
                  const isOpen = Boolean(expanded[orderCodeStr]);
                  const deliveryPill = getStatusPill(order.deliveryStatus?.id, order.deliveryStatus?.name);
                  const paymentPill = getPaymentStatusPill(order.paymentStatus?.id, order.paymentStatus?.name);
                  const orderPlacedByUserId = order.orderCode?.users?.id;
                  const lookedUpUser = orderPlacedByUserId ? usersById[orderPlacedByUserId] : undefined;
                  const fallbackUserName = `${order.orderCode?.users?.firstName || 'User'} ${order.orderCode?.users?.lastName || ''}`.trim();
                  const placedByName = lookedUpUser?.fullName || fallbackUserName || 'User';
                  const placedByEmail = lookedUpUser?.email || 'N/A';

                  return (
                    <Fragment key={order.id}>
                      <tr className="hover:bg-orange-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="w-4 h-4 rounded border-2 border-gray-300 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleExpanded(orderCodeStr)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOpen
                                ? 'bg-linear-to-br from-[#F59B0F] to-[#D17F0A] text-white shadow-lg shadow-orange-500/30'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                              <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className="inline-flex max-w-48 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                              <span className="min-w-0 truncate font-semibold text-slate-800" title={orderCodeStr}>{orderCodeStr}</span>
                              <button
                                type="button"
                                onClick={() => void copyOrderCodeToClipboard(orderCodeStr)}
                                className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-white hover:text-[#8f5515]"
                                title="Copy order code"
                                aria-label={`Copy ${orderCodeStr}`}
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-start gap-2">
                            <MapPinIcon className="w-5 h-5 text-[#F59B0F] mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{order.deliveryTo?.fullName || 'N/A'}</p>
                              <p className="text-xs text-gray-500 mt-1">{order.deliveryTo?.city?.name || 'N/A'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div>
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold mb-1 ${paymentPill.className}`}>
                              {paymentPill.label}
                            </span>
                            <p className="text-sm font-semibold text-gray-900">{order.paymentType?.name || 'N/A'}</p>

                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="text-sm">
                            <p className="font-bold text-gray-900">{order.qty} item(s)</p>
                            <p className="text-gray-600">{order.weight?.toFixed(1) || '0.0'} kg</p>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <p className="font-bold text-gray-900 text-lg">{formatCurrency(order.totalPrice)}</p>
                          <p className="text-xs text-gray-500">+{formatCurrency(order.deliveryFee)} delivery</p>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${deliveryPill.className}`}
                          >
                            {deliveryPill.icon}
                            {deliveryPill.label}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => printSingleOrderPDF(order)}
                              className="p-2 rounded-lg border-2 border-[#F59B0F] text-[#D17F0A] bg-white hover:bg-orange-50 hover:shadow-md transition-all"
                              title="Print order PDF"
                            >
                              <PrinterIcon className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() => generateSingleOrderPDF(order)}
                              className="p-2 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white hover:shadow-lg hover:shadow-orange-400/30 transition-all"
                              title="Download order PDF"
                            >
                              <DocumentArrowDownIcon className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() => openTimelineModal(order)}
                              className="p-2 rounded-lg bg-linear-to-r from-amber-700 to-amber-800 text-white hover:shadow-lg transition-all"
                              title="Track order"
                            >
                              <MapPinIcon className="w-5 h-5" />
                            </button>

                            <Menu as="div" className="relative">
                              <MenuButton className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#F59B0F] transition-all">
                                <EllipsisVerticalIcon className="w-5 h-5 text-gray-700" />
                              </MenuButton>
                              <MenuItems className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:opacity-0 overflow-hidden">
                                <div className="p-1">
                                  <MenuItem>
                                    <button
                                      onClick={() => toggleExpanded(orderCodeStr)}
                                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                    >
                                      <ChevronDownIcon className="w-4 h-4" />
                                      {isOpen ? 'Hide' : 'View'} details
                                    </button>
                                  </MenuItem>
                                  {/* <MenuItem>
                                    <button
                                      onClick={() => openTimelineModal(order)}
                                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                    >
                                      <ClockIcon className="w-4 h-4" />
                                      View timeline
                                    </button>
                                  </MenuItem> */}
                                  <MenuItem>
                                    <button
                                      onClick={() => generateSingleOrderPDF(order)}
                                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-green-600 hover:bg-green-100 rounded-lg transition"
                                      title="Download order PDF"
                                    >
                                      <DocumentArrowDownIcon className="w-4 h-4" />
                                      Generate PDF
                                    </button>
                                  </MenuItem>
                                  {isBankTransferPaymentType(order.paymentType?.name) && (
                                    <MenuItem>
                                      <button
                                        onClick={() => void openBankSlipModal(order)}
                                        className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 rounded-lg transition"
                                      >
                                        <FaCloudArrowUp className="w-4 h-4" />
                                        Upload bank slip
                                      </button>
                                    </MenuItem>
                                  )}
                                  {/* <MenuItem>
                                    <button
                                      onClick={() => handleReturn(order.id, orderCodeStr)}
                                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                    >
                                      <ArrowUturnLeftIcon className="w-4 h-4" />
                                      Return
                                    </button>
                                  </MenuItem> */}
                                  {canDeleteOrDropOrders && (
                                    <MenuItem>
                                      <button
                                        onClick={() => handleDelete(order.id, orderCodeStr)}
                                        className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
                                      >
                                        <XCircleIcon className="w-4 h-4" />
                                        Delete
                                      </button>
                                    </MenuItem>
                                  )}
                                </div>
                              </MenuItems>
                            </Menu>
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <Transition
                              show={isOpen}
                              as={Fragment}
                              enter="transition ease-out duration-200"
                              enterFrom="opacity-0 -translate-y-1"
                              enterTo="opacity-100 translate-y-0"
                              leave="transition ease-in duration-150"
                              leaveFrom="opacity-100 translate-y-0"
                              leaveTo="opacity-0 -translate-y-1"
                            >
                              <div>
                                <ExpandedOrderDetails order={order} formatCurrency={formatCurrency} />
                              </div>
                            </Transition>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {!isLoading && orders.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                  <TruckIcon className="w-10 h-10 text-[#F59B0F]" />
                </div>
                <p className="text-xl font-black text-gray-900 mb-2">No orders found</p>
                <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-bold hover:shadow-lg transition-all"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BankTransferSlipModal
        isOpen={bankSlipOrder !== null}
        onClose={closeBankSlipModal}
        onSubmit={handleBankSlipSubmit}
        isSubmitting={isBankSlipSubmitting}
        marketId={bankSlipMarketId ?? undefined}
      />

      <Transition show={isTimelineModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-100" onClose={closeTimelineModal}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-[2px]" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto p-2 sm:p-4 lg:p-6">
            <div className="flex min-h-full items-center justify-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-3 scale-[0.98]"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-3 scale-[0.98]"
              >
                <DialogPanel className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-orange-200 bg-[linear-gradient(180deg,#FFF9F4_0%,#FFFFFF_52%,#FFFDF9_100%)] shadow-[0_30px_90px_rgba(255,99,71,0.16)]">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-[#F59B0F] via-[#FB923C] to-[#AC6C2A]" />

                  <div className="flex flex-col gap-4 border-b border-orange-100 bg-white/90 px-4 py-4 backdrop-blur sm:px-5 sm:py-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg shadow-[#AC6C2A]/25">
                        <FaRoute className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Delivery timeline</p>
                        <DialogTitle className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                          Order Timeline
                        </DialogTitle>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                          {timelineModalOrder ? `Order ${timelineModalOrder.orderCode?.code || `ORD-${timelineModalOrder.id}`}` : 'Selected order'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                            <FaMapMarkedAlt className="h-3.5 w-3.5 text-[#F59B0F]" />
                            Tracking details
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                            <FaUserClock className="h-3.5 w-3.5 text-[#AC6C2A]" />
                            Live history
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeTimelineModal}
                      aria-label="Close modal"
                      title="Close modal"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full border border-orange-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-slate-900"
                    >
                      <MdOutlineClear className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
                    {isTimelineModalLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-orange-100 bg-white/70 py-16 text-center">
                        <ArrowPathIcon className="h-9 w-9 animate-spin text-[#F59B0F]" />
                        <p className="text-sm font-semibold text-slate-600">Loading timeline details...</p>
                      </div>
                    ) : timelineModalError ? (
                      <div className="px-0 py-1 sm:px-1">
                        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                          {timelineModalError}
                        </div>
                      </div>
                    ) : (
                      <OrderTimeline
                        timeline={timelineModalTimeline}
                        senderDetails={timelineModalSender}
                        orderDetails={timelineModalOrderDetails}
                      />
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default PlacedOrders;
