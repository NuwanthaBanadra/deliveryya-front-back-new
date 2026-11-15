import {
  ArrowPathIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FunnelIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  TruckIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as SolidStarIcon } from '@heroicons/react/24/solid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import axiosInstance from '../../../util/AxiosUtil';
import JwtUtil from '../../../util/JwtUtil';
import { swalAlert } from '../../../util/SwalUtil';
import OrderFeedbackModal from './OrderFeedbackModal';
import BankTransferSlipModal from '../../../page_comps/cart/BankTransferSlipModal';

type DeliveryStatus = 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Rejected';
type OrderStage = 'incoming' | 'history';

type FeedbackEntry = {
  rating: number;
  comment: string;
  submittedAt: string;
};

type OrderLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type FulfillmentChecklist = {
  inventoryConfirmed: boolean;
  paymentReviewed: boolean;
  addressVerified: boolean;
  riderAssigned: boolean;
};

type OrderRecord = {
  id: number;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  city: string;
  address: string;
  paymentType: string;
  paymentStatus: string;
  deliveryStatus: DeliveryStatus;
  totalPrice: number;
  collectivePrice: number;
  paidAmount: number;
  deliveryFee: number;
  quantity: number;
  weight: number;
  stage: OrderStage;
  receivedAt: string;
  assignedHub: string;
  assignedRider: string;
  notes: string;
  items: OrderLine[];
  checklist: FulfillmentChecklist;
  marketOrder?: unknown;
  marketOrderId?: number;
  rejectionReason?: string;
  feedback?: FeedbackEntry;
};

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type PaymentRecordItem = {
  id?: number;
  code: string;
  note?: string;
  amount: number;
  paymentRecordId?: number;
};

type PaymentRecord = {
  id: number;
  amount: number | null;
  desc?: string;
  proofUrl?: string;
  isReturn: boolean;
  createdAt?: string;
  updatedAt?: string;
  madeBy?: string;
  orderCode?: string | null;
  urgentJobCode?: string | null;
  referencesCodes?: string[];
  paymentType?: {
    id?: number;
    name?: string;
  } | null;
  bankDetail?: {
    id?: number;
    name?: string;
    bankName?: string;
    accountNumber?: string;
    accNumber?: string;
  } | null;
  verificationStatus?: {
    id?: number;
    name?: string;
  } | null;
  paymentRecordItems?: PaymentRecordItem[];
};

type PaymentRecordsResponseObject = {
  pageNumber?: number;
  countPerPage?: number;
  totalCount?: number;
  totalPages?: number;
  items?: PaymentRecord[];
};

const rejectionReasons = [
  'Customer requested a return',
  'Item damaged during shipment',
  'Wrong item was packed',
  'Address issue after dispatch',
  'Delivery quality concern',
  'Other',
];

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return fallback;
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const normalizeDeliveryStatus = (value: string): DeliveryStatus => {
  const normalized = value.toLowerCase();

  if (normalized.includes('cancel')) {
    return 'Cancelled';
  }

  if (normalized.includes('reject') || normalized.includes('return')) {
    return 'Rejected';
  }

  if (normalized.includes('deliver')) {
    return 'Delivered';
  }

  if (normalized.includes('ship') || normalized.includes('dispatch') || normalized.includes('delivering')) {
    return 'Shipped';
  }

  return 'Pending';
};

const formatCurrency = (value: number) => `LKR ${value.toLocaleString()}`;

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const getMinutesOpen = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((Date.now() - parsed.getTime()) / 60000));
};

const getStatusClasses = (status: DeliveryStatus) => {
  switch (status) {
    case 'Pending':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case 'Shipped':
      return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
    case 'Delivered':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'Cancelled':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    case 'Rejected':
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
  }
};

const getVerificationClasses = (statusName?: string, statusId?: number) => {
  const normalized = statusName?.toLowerCase() ?? '';

  if (statusId === 1 || normalized.includes('verified') || normalized.includes('completed')) {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }

  if (statusId === 3 || normalized.includes('reject') || normalized.includes('fail')) {
    return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  }

  if (statusId === 2 || normalized.includes('pending') || normalized.includes('progress')) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }

  return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
};

const getPaymentRecordCodes = (record: PaymentRecord): string[] => {
  const itemCodes = (record.paymentRecordItems || [])
    .map((item) => item.code?.trim())
    .filter((code): code is string => Boolean(code));

  const fallbackCodes = [
    record.orderCode,
    record.urgentJobCode,
    ...(record.referencesCodes || []),
  ]
    .map((code) => code?.trim())
    .filter((code): code is string => Boolean(code));

  return Array.from(new Set([...itemCodes, ...fallbackCodes]));
};

const getOrderPaymentAmount = (record: PaymentRecord, orderCode: string) => {
  const matchingItems = (record.paymentRecordItems || []).filter(
    (item) => item.code?.trim().toUpperCase() === orderCode.toUpperCase(),
  );

  if (matchingItems.length > 0) {
    return matchingItems.reduce((sum, item) => sum + asNumber(item.amount), 0);
  }

  return asNumber(record.amount);
};

const getBankLabel = (record: PaymentRecord) => {
  if (!record.bankDetail) {
    return 'No bank detail';
  }

  const bankName = record.bankDetail.bankName || record.bankDetail.name || 'Bank detail';
  const accountNumber = record.bankDetail.accountNumber || record.bankDetail.accNumber;

  return accountNumber ? `${bankName} (${accountNumber})` : bankName;
};

const isBankTransferPaymentType = (paymentTypeName?: string) => {
  const normalizedName = (paymentTypeName || '').toLowerCase().replace(/\s+/g, ' ').trim();

  return (
    normalizedName.includes('bank transfer') ||
    normalizedName.includes('brank transfer') ||
    normalizedName.includes('banktransfer')
  );
};

const getMarketOrderIdFromOrder = (order: OrderRecord) => {
  const marketOrder = asRecord(order.marketOrder);
  return asNumber(marketOrder?.id, asNumber(order.marketOrderId, 0));
};

const createOrderItems = (label: string, quantity: number, totalPrice: number): OrderLine[] => {
  const safeQuantity = Math.max(1, quantity);
  const unitPrice = Math.max(1, Math.round(totalPrice / safeQuantity));

  return [
    {
      id: `${label}-${safeQuantity}`,
      name: label,
      quantity: safeQuantity,
      unitPrice,
    },
  ];
};

const getLoggedInUserId = (): number | null => {
  const localUserId = Number(localStorage.getItem('userId'));
  if (Number.isFinite(localUserId) && localUserId > 0) {
    return localUserId;
  }

  const token = localStorage.getItem('jwtToken');
  if (!token) {
    return null;
  }

  const decoded = JwtUtil.decodeToken(token) as Record<string, unknown> | null;
  if (!decoded) {
    return null;
  }

  const possibleUserId = decoded.userId ?? decoded.id;
  const parsedUserId = Number(possibleUserId);
  if (Number.isFinite(parsedUserId) && parsedUserId > 0) {
    return parsedUserId;
  }

  return null;
};

const mapOrder = (value: unknown, index: number): OrderRecord | null => {
  const item = asRecord(value);
  if (!item) {
    return null;
  }

  const deliveryTo = asRecord(item.deliveryTo);
  const orderCode = asRecord(item.orderCode);
  const deliveryStatus = asRecord(item.deliveryStatus);
  const paymentStatus = asRecord(item.paymentStatus);
  const paymentType = asRecord(item.paymentType);

  const id = asNumber(item.id, 0);
  if (!id) {
    return null;
  }

  const normalizedStatus = normalizeDeliveryStatus(asString(deliveryStatus?.name, 'Pending'));
  const totalPrice = asNumber(item.totalPrice) || asNumber(item.collectivePrice);
  const collectivePrice = asNumber(item.collectivePrice, totalPrice);
  const paidAmount = asNumber(item.paidAmount);
  const quantity = Math.max(1, asNumber(item.qty, 1));
  const description = asString(item.desc, `Order ${id}`);
  const marketOrder = asRecord(item.marketOrder);
  const marketOrderId = asNumber(marketOrder?.id, asNumber(item.marketOrderId, 0)) || undefined;
  const receivedAt =
    asString(item.updatedAt) ||
    asString(item.createdAt) ||
    new Date(Date.now() - index * 5400000).toISOString();

  const city = asString(asRecord(deliveryTo?.city)?.name, 'Unknown city');
  const address = asString(deliveryTo?.address, 'Address not available');
  const hasMapPin = Boolean(asString(deliveryTo?.googleMapLocation));
  const normalizedPaymentStatus = asString(paymentStatus?.name, 'Pending');

  const issueTags: string[] = [];
  if (normalizedPaymentStatus.toLowerCase().includes('pending')) {
    issueTags.push('Payment review');
  }
  if (!hasMapPin) {
    issueTags.push('Map pin missing');
  }
  if (totalPrice >= 10000 || quantity >= 5) {
    issueTags.push('Large basket');
  }
  if (normalizedStatus === 'Pending' && getMinutesOpen(receivedAt) >= 45) {
    issueTags.push('SLA risk');
  }

  return {
    id,
    orderCode: asString(orderCode?.code, `DY-${id}`),
    customerName: asString(deliveryTo?.fullName, 'Unknown customer'),
    customerPhone: asString(deliveryTo?.primaryMobile, '-'),
    city,
    address,
    paymentType: asString(paymentType?.name, 'Unknown'),
    paymentStatus: normalizedPaymentStatus,
    deliveryStatus: normalizedStatus,
    totalPrice,
    collectivePrice,
    paidAmount,
    deliveryFee: asNumber(item.deliveryFee),
    quantity,
    weight: asNumber(item.weight),
    stage: normalizedStatus === 'Cancelled' || normalizedStatus === 'Rejected' ? 'history' : 'incoming',
    receivedAt,
    assignedHub: `${city} Operations Hub`,
    assignedRider: normalizedStatus === 'Pending' ? 'Not assigned' : 'Assigned rider',
    notes: description,
    items: createOrderItems(description, quantity, totalPrice),
    checklist: {
      inventoryConfirmed: true,
      paymentReviewed: !normalizedPaymentStatus.toLowerCase().includes('pending'),
      addressVerified: hasMapPin || address.length > 12,
      riderAssigned: normalizedStatus !== 'Pending',
    },
    marketOrder: marketOrder ?? undefined,
    marketOrderId,
  };
};

const extractOrders = (data: unknown): OrderRecord[] => {
  const root = asRecord(data);
  const payload = asRecord(root?.object) ?? root;
  const items = asArray(payload?.items);

  return items
    .map((entry, index) => mapOrder(entry, index))
    .filter((entry): entry is OrderRecord => entry !== null);
};

const buildOrdersRequest = (
  receivingUserId: number,
  options?: { searchQuery: string; statusFilter: 'all' | DeliveryStatus; activeTab: 'incoming' | 'history' }
) => {
  const payload: Record<string, unknown> = {
    pageNumber: 0,
    countPerPage: 50,
    cityId: null,
    orderId: null,
    userId: null,
    markerOrderId: null,
    deliveryStatusId: null,
    paymentStatusId: null,
    paymentTypeId: null,
    orderCode: null,
    sendingUserId: null,
    receivingUserId,
    minPrice: null,
    maxPrice: null,
    search: null,
  };

  if (!options) {
    return payload;
  }

  const normalizedSearch = options.searchQuery.trim();
  if (normalizedSearch) {
    payload.search = normalizedSearch;
  }

  if (options.statusFilter !== 'all') {
    payload.deliveryStatus = options.statusFilter;
  } else if (options.activeTab === 'history') {
    payload.deliveryStatus = 'Delivered';
  }

  return payload;
};

const buildPaymentRecordsRequest = (orderCode: string) => ({
  pageNumber: 0,
  countPerPage: 25,
  paymentRecodeId: 0,
  bankId: 0,
  orderId: 0,
  clientId: null,
  bankDetailId: 0,
  paymentTypeId: 0,
  marketId: null,
  isReturn: null,
  verificationStatusId: null,
  createdById: null,
  code: orderCode,
  fromDate: null,
  toDate: null,
  minAmount: null,
  maxAmount: null,
  search: orderCode,
  items: [],
});

function ReceivingOrders() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'incoming' | 'history'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DeliveryStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState(rejectionReasons[0]);
  const [rejectionNote, setRejectionNote] = useState('');
  const [feedbackOrderId, setFeedbackOrderId] = useState<number | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [bankSlipOrder, setBankSlipOrder] = useState<OrderRecord | null>(null);
  const [bankSlipMarketId, setBankSlipMarketId] = useState<number | null>(null);
  const [isBankSlipSubmitting, setIsBankSlipSubmitting] = useState(false);
  const userId = useMemo(() => getLoggedInUserId(), []);

  const loadOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setLoadError('Unable to identify the logged-in user. Please sign in again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await axiosInstance.post('/orders/get-orders', buildOrdersRequest(userId, {
        searchQuery,
        statusFilter,
        activeTab,
      }));

      const normalizedOrders = extractOrders(response.data);
      setOrders((previous) => {
        const feedbackByCode = new Map(previous.map((order) => [order.orderCode, order.feedback]));

        return normalizedOrders.map((order) => ({
          ...order,
          feedback: feedbackByCode.get(order.orderCode),
        }));
      });
    } catch (error) {
      console.error('Receiving orders load failed:', error);
      setOrders([]);
      setLoadError('Unable to load your receiving orders right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, searchQuery, statusFilter, activeTab]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const feedbackOrder = useMemo(
    () => orders.find((order) => order.id === feedbackOrderId) ?? null,
    [orders, feedbackOrderId],
  );

  const paymentOrder = useMemo(
    () => orders.find((order) => order.id === paymentOrderId) ?? null,
    [orders, paymentOrderId],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadOrders();
    }, 350);

    return () => clearTimeout(timeout);
  }, [loadOrders, refreshTick]);

  const incomingOrders = useMemo(
    () => orders.filter((order) => order.stage === 'incoming' || ['Pending', 'Shipped', 'Delivered'].includes(order.deliveryStatus)),
    [orders],
  );

  const historyOrders = useMemo(
    () => orders.filter((order) => order.deliveryStatus === 'Delivered'),
    [orders],
  );

  const visibleOrders = useMemo(() => {
    const baseOrders = activeTab === 'incoming' ? incomingOrders : historyOrders;
    return baseOrders;
  }, [activeTab, historyOrders, incomingOrders]);

  const queueStats = useMemo(() => {
    const handoffReady = incomingOrders.filter(
      (order) => order.checklist.inventoryConfirmed && order.checklist.addressVerified && order.checklist.paymentReviewed,
    ).length;
    const feedbackPending = historyOrders.filter((order) => !order.feedback).length;

    return {
      totalIncoming: incomingOrders.length,
      handoffReady,
      feedbackPending,
    };
  }, [historyOrders, incomingOrders]);

  const paymentSummary = useMemo(() => {
    if (!paymentOrder) {
      return {
        recordTotal: 0,
        verifiedTotal: 0,
        recordCount: 0,
      };
    }

    return paymentRecords.reduce(
      (summary, record) => {
        const amount = getOrderPaymentAmount(record, paymentOrder.orderCode);
        const signedAmount = record.isReturn ? -amount : amount;
        const statusName = record.verificationStatus?.name?.toLowerCase() ?? '';
        const isVerified = record.verificationStatus?.id === 1 || statusName.includes('verified') || statusName.includes('completed');

        return {
          recordTotal: summary.recordTotal + signedAmount,
          verifiedTotal: summary.verifiedTotal + (isVerified ? signedAmount : 0),
          recordCount: summary.recordCount + 1,
        };
      },
      {
        recordTotal: 0,
        verifiedTotal: 0,
        recordCount: 0,
      },
    );
  }, [paymentOrder, paymentRecords]);

  const statusFilterOptions: SelectOption<'all' | DeliveryStatus>[] = useMemo(
    () => [
      { value: 'all', label: 'All statuses' },
      { value: 'Pending', label: 'Pending' },
      { value: 'Shipped', label: 'Shipped' },
      { value: 'Delivered', label: 'Delivered' },
      { value: 'Cancelled', label: 'Cancelled' },
      { value: 'Rejected', label: 'Rejected' },
    ],
    [],
  );

  const rejectionReasonOptions: SelectOption<string>[] = useMemo(
    () => rejectionReasons.map((reason) => ({ value: reason, label: reason })),
    [],
  );

  const getCustomSelectStyles = (isCompact = false) => ({
    control: (base: any, state: any) => ({
      ...base,
      padding: isCompact ? '0.125rem' : '0.375rem',
      borderWidth: state.isFocused ? '2px' : '1px',
      minHeight: isCompact ? '46px' : '52px',
      borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
      borderRadius: '0.75rem',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.2)' : 'none',
      '&:hover': {
        borderColor: '#FCD34D',
      },
      transition: 'all 0.3s',
      backgroundColor: '#F9FAFB',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
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
      zIndex: 9999,
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999,
    }),
  });
  const refreshOrders = () => {
    setRefreshTick((prev) => prev + 1);
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

  const openBankSlipModal = useCallback(async (order: OrderRecord) => {
    if (!isBankTransferPaymentType(order.paymentType)) {
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

      const orderCode = bankSlipOrder.orderCode || `ORD-${bankSlipOrder.id}`;
      const paymentTypeName = bankSlipOrder.paymentType || 'Bank Transfer';
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
          id: 0,
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
      refreshOrders();
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
  }, [bankSlipOrder, bankSlipMarketId, refreshOrders, uploadSlipToStorage]);

  const loadPaymentRecordsForOrder = useCallback(async (order: OrderRecord) => {
    setIsLoadingPayments(true);
    setPaymentError(null);

    try {
      const response = await axiosInstance.post<{ object?: PaymentRecordsResponseObject }>(
        '/payment/get-payment-records',
        buildPaymentRecordsRequest(order.orderCode),
      );

      const records = response.data.object?.items || [];
      const orderRecords = records.filter((record) =>
        getPaymentRecordCodes(record).some((code) => code.toUpperCase() === order.orderCode.toUpperCase()),
      );

      setPaymentRecords(orderRecords);
    } catch (error) {
      console.error('Payment records load failed:', error);
      setPaymentRecords([]);
      setPaymentError('Unable to load payment records for this order right now.');
    } finally {
      setIsLoadingPayments(false);
    }
  }, []);

  const openPaymentsModal = (order: OrderRecord) => {
    setPaymentOrderId(order.id);
    setPaymentRecords([]);
    void loadPaymentRecordsForOrder(order);
  };

  const closePaymentsModal = () => {
    setPaymentOrderId(null);
    setPaymentRecords([]);
    setPaymentError(null);
  };

  const handleCancelOrder = async (order: OrderRecord) => {
    if (order.deliveryStatus !== 'Pending') {
      await swalAlert('Cancellation blocked', 'Only pending delivery orders can be cancelled from this queue.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Cancel this order?',
      text: `${order.orderCode} will move to order history as cancelled.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancel order',
      cancelButtonText: 'Keep order',
      confirmButtonColor: '#dc2626',
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await axiosInstance.delete('/orders/drop-order-by-id', {
        params: {
          orderId: order.id,
        },
      });

      if (response.data?.message?.toLowerCase() !== 'success') {
        throw new Error(response.data?.desc || 'Failed to delete order');
      }

      await swalAlert('Order deleted', `${order.orderCode} was deleted successfully.`, 'success');
      refreshOrders();
    } catch (error) {
      console.error('Order delete failed:', error);
      await swalAlert('Delete failed', 'Unable to delete this order right now. Please try again.', 'error');
    }
  };

  const openRejectModal = async (order: OrderRecord) => {
    if (order.deliveryStatus !== 'Shipped' && order.deliveryStatus !== 'Delivered') {
      await swalAlert('Rejection blocked', 'Only shipped or delivered orders can be rejected with a reason.', 'warning');
      return;
    }

    setRejectionReason(rejectionReasons[0]);
    setRejectionNote('');
    setRejectingOrderId(order.id);
  };

  const submitRejection = async () => {
    if (!rejectingOrderId) {
      return;
    }

    const needsCustomReason = rejectionReason === 'Other' && !rejectionNote.trim();
    if (needsCustomReason) {
      await swalAlert('Reason required', 'Please enter the rejection reason before saving.', 'warning');
      return;
    }

    setOrders((previous) =>
      previous.map((entry) =>
        entry.id === rejectingOrderId
          ? {
            ...entry,
            deliveryStatus: 'Rejected',
            stage: 'history',
            rejectionReason: rejectionReason === 'Other' ? rejectionNote.trim() : rejectionReason,
            notes: rejectionNote.trim() ? rejectionNote.trim() : entry.notes,
          }
          : entry,
      ),
    );

    setRejectingOrderId(null);
    await swalAlert('Order rejected', 'The order was rejected and moved to history with the selected reason.', 'success');
  };

  const openFeedbackModal = (order: OrderRecord) => {
    setFeedbackOrderId(order.id);
  };

  return (
    <>
      <OrderFeedbackModal
        isOpen={feedbackOrderId !== null}
        orderCode={feedbackOrder?.orderCode ?? ''}
        initialRating={feedbackOrder?.feedback?.rating ?? 5}
        initialComment={feedbackOrder?.feedback?.comment ?? ''}
        onClose={() => setFeedbackOrderId(null)}
        onSubmit={async (rating, comment) => {
          setOrders((previous) =>
            previous.map((entry) =>
              entry.id === feedbackOrderId
                ? {
                  ...entry,
                  feedback: {
                    rating,
                    comment,
                    submittedAt: new Date().toISOString(),
                  },
                }
                : entry,
            ),
          );

          await swalAlert('Feedback saved', 'Order feedback was recorded successfully.', 'success');
        }}
      />
      <div className="min-h-screen bg-gray-50 pb-10">
        <div className="space-y-6">

          <div className="bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <TruckIcon className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Receiving Orders Hub</h1>
                </div>
                <p className="text-white/90 text-sm sm:text-base">
                  Monitor incoming order intake, inspect details, cancel or reject based on delivery status, and follow up on completed orders with feedback.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Incoming queue</p>
                  <p className="mt-2 text-3xl font-black text-gray-900">{queueStats.totalIncoming}</p>
                </div>
                <div className="rounded-2xl bg-orange-100 p-3 text-[#AC6C2A]">
                  <TruckIcon className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Handoff ready</p>
                  <p className="mt-2 text-3xl font-black text-emerald-600">{queueStats.handoffReady}</p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircleIcon className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Feedback pending</p>
                  <p className="mt-2 text-3xl font-black text-sky-600">{queueStats.feedbackPending}</p>
                </div>
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-600">
                  <ChatBubbleLeftRightIcon className="h-7 w-7" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex shrink-0 rounded-2xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('incoming')}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${activeTab === 'incoming' ? 'bg-white text-[#AC6C2A] shadow-sm' : 'text-gray-500'}`}
                >
                  Incoming orders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${activeTab === 'history' ? 'bg-white text-[#AC6C2A] shadow-sm' : 'text-gray-500'}`}
                >
                  Order history
                </button>
              </div>

              <div className="relative min-w-0 flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by code, customer, city"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#F59B0F] focus:bg-white"
                />
              </div>

              <div className="relative shrink-0">
                <div className="min-w-55 pl-8">
                  <Select<SelectOption<'all' | DeliveryStatus>, false>
                    value={statusFilterOptions.find((option) => option.value === statusFilter) ?? null}
                    onChange={(option) => setStatusFilter(option ? option.value : 'all')}
                    options={statusFilterOptions}
                    placeholder="All statuses"

                    styles={getCustomSelectStyles(true)}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={refreshOrders}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#F59B0F] hover:text-[#F59B0F]"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm font-medium text-gray-500">
                  Loading orders...
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center text-sm font-medium text-rose-700">
                  {loadError}
                </div>
              ) : visibleOrders.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm font-medium text-gray-500">
                  {orders.length === 0
                    ? 'No receiving orders were found for the logged-in user.'
                    : 'No orders match the current filters.'}
                </div>
              ) : (
                visibleOrders.map((order) => {
                  const canCancel = order.deliveryStatus === 'Pending';
                  const canReject = order.deliveryStatus === 'Shipped' || order.deliveryStatus === 'Delivered';
                  const checklistScore = Object.values(order.checklist).filter(Boolean).length;

                  return (
                    <div key={order.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-4 xl:flex-1">
                          <div className="flex flex-wrap items-start gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-xl font-black text-gray-900">{order.orderCode}</h2>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(order.deliveryStatus)}`}>
                                  {order.deliveryStatus}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-gray-500">
                                Received {formatDateTime(order.receivedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">

                            <div className="rounded-2xl bg-gray-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Delivery</p>
                              <p className="mt-2 text-sm font-bold text-gray-900">{order.city}</p>
                              <p className="mt-1 text-sm text-gray-500">{order.address}</p>
                            </div>

                            <div className="rounded-2xl bg-gray-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Order value</p>
                              <p className="mt-2 text-sm font-bold text-gray-900">{formatCurrency(order.totalPrice)}</p>
                              <p className="mt-1 text-sm text-gray-500">
                                Paid {formatCurrency(order.paidAmount)} of {formatCurrency(order.collectivePrice)}
                              </p>
                              <p className="mt-1 text-xs text-gray-400">{order.quantity} items / {order.weight.toFixed(1)} kg</p>
                              {isBankTransferPaymentType(order.paymentType) && (
                                <button
                                  type="button"
                                  onClick={() => void openBankSlipModal(order)}
                                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                  title="Open bank transfer slip upload"
                                >
                                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                                  Upload Slip
                                </button>
                              )}
                            </div>

                          </div>

                        </div>

                        <div className="flex w-full flex-col gap-3 xl:w-64">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-[#F59B0F] hover:text-[#F59B0F]"
                          >
                            <EyeIcon className="h-5 w-5" />
                            View details
                          </button>

                          <button
                            type="button"
                            onClick={() => openPaymentsModal(order)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                          >
                            <BanknotesIcon className="h-5 w-5" />
                            Payments
                          </button>

                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => void handleCancelOrder(order)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
                            >
                              <XCircleIcon className="h-5 w-5" />
                              Delete order
                            </button>
                          )}

                          {canReject && (
                            <button
                              type="button"
                              onClick={() => void openRejectModal(order)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
                            >
                              <ShieldExclamationIcon className="h-5 w-5" />
                              Reject with reason
                            </button>
                          )}

                          {activeTab === 'history' && (
                            <button
                              type="button"
                              onClick={() => openFeedbackModal(order)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                            >
                              <ChatBubbleLeftRightIcon className="h-5 w-5" />
                              {order.feedback ? 'Edit feedback' : 'Add feedback'}
                            </button>
                          )}
                        </div>
                      </div>

                      {activeTab === 'history' && order.feedback && (
                        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1 text-amber-400">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <SolidStarIcon
                                  key={`${order.id}-feedback-star-${index}`}
                                  className={`h-5 w-5 ${index < order.feedback!.rating ? 'opacity-100' : 'opacity-20'}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-sky-700">
                              Submitted {formatDateTime(order.feedback.submittedAt)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-gray-700">{order.feedback.comment}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <BankTransferSlipModal
        isOpen={bankSlipOrder !== null}
        onClose={closeBankSlipModal}
        onSubmit={handleBankSlipSubmit}
        isSubmitting={isBankSlipSubmitting}
        marketId={bankSlipMarketId ?? undefined}
      />

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/55 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-gray-900">{selectedOrder.orderCode}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(selectedOrder.deliveryStatus)}`}>
                    {selectedOrder.deliveryStatus}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Order details, receiving checklist, customer info, and history notes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[1.5fr,1fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-black text-gray-900">Items summary</h3>
                  <div className="mt-4 space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.name}</p>
                          <p className="mt-1 text-xs text-gray-500">Qty {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900">Receiving notes</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{selectedOrder.notes || 'No additional notes recorded.'}</p>

                  {selectedOrder.rejectionReason && (
                    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#AC6C2A]">
                      Rejection reason: {selectedOrder.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900">Customer & delivery</h3>
                  <div className="mt-4 space-y-4 text-sm text-gray-600">
                    <div>
                      <p className="font-bold text-gray-900">{selectedOrder.customerName}</p>
                      <p className="mt-1">{selectedOrder.customerPhone}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="mt-0.5 h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-900">{selectedOrder.city}</p>
                        <p className="mt-1">{selectedOrder.address}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-gray-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Payment</p>
                        <p className="mt-2 text-sm font-bold text-gray-900">{selectedOrder.paymentType}</p>
                        <p className="mt-1 text-sm text-gray-500">{selectedOrder.paymentStatus}</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Value</p>
                        <p className="mt-2 text-sm font-bold text-gray-900">{formatCurrency(selectedOrder.totalPrice)}</p>
                        <p className="mt-1 text-sm text-gray-500">Paid {formatCurrency(selectedOrder.paidAmount)}</p>
                        <p className="mt-1 text-xs text-gray-400">Delivery fee {formatCurrency(selectedOrder.deliveryFee)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900">Operational checklist</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    {[
                      ['Inventory confirmed', selectedOrder.checklist.inventoryConfirmed],
                      ['Payment reviewed', selectedOrder.checklist.paymentReviewed],
                      ['Address verified', selectedOrder.checklist.addressVerified],
                      ['Rider assigned', selectedOrder.checklist.riderAssigned],
                    ].map(([label, state]) => (
                      <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                        <span className="font-semibold text-gray-700">{label}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${state ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {state ? 'Ready' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900">Quick actions</h3>
                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={() => openPaymentsModal(selectedOrder)}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Show payment records
                    </button>

                    {selectedOrder.deliveryStatus === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => void handleCancelOrder(selectedOrder)}
                        className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
                      >
                        Delete pending order
                      </button>
                    )}

                    {(selectedOrder.deliveryStatus === 'Shipped' || selectedOrder.deliveryStatus === 'Delivered') && (
                      <button
                        type="button"
                        onClick={() => void openRejectModal(selectedOrder)}
                        className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
                      >
                        Reject with reason
                      </button>
                    )}

                    {selectedOrder.stage === 'history' && (
                      <button
                        type="button"
                        onClick={() => openFeedbackModal(selectedOrder)}
                        className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
                      >
                        {selectedOrder.feedback ? 'Edit feedback' : 'Add feedback'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                      <BanknotesIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Payment records</p>
                      <h2 className="text-2xl font-black text-gray-900">{paymentOrder.orderCode}</h2>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    Payment entries linked to this order, including verification status, proof, bank detail, and applied amount.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadPaymentRecordsForOrder(paymentOrder)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:border-[#F59B0F] hover:text-[#F59B0F]"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={closePaymentsModal}
                    className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Order paid amount</p>
                  <p className="mt-2 text-lg font-black text-gray-900">{formatCurrency(paymentOrder.paidAmount)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Linked record total</p>
                  <p className="mt-2 text-lg font-black text-emerald-700">{formatCurrency(paymentSummary.recordTotal)}</p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-600">Verified total</p>
                  <p className="mt-2 text-lg font-black text-sky-700">{formatCurrency(paymentSummary.verifiedTotal)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Remaining balance</p>
                  <p className="mt-2 text-lg font-black text-amber-800">
                    {formatCurrency(Math.max(0, paymentOrder.collectivePrice - paymentOrder.paidAmount))}
                  </p>
                </div>
              </div>

              {isLoadingPayments ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm font-medium text-gray-500">
                  Loading payment records...
                </div>
              ) : paymentError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center text-sm font-semibold text-rose-700">
                  <ExclamationTriangleIcon className="mx-auto mb-3 h-8 w-8" />
                  {paymentError}
                </div>
              ) : paymentRecords.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm font-medium text-gray-500">
                  <CurrencyDollarIcon className="mx-auto mb-3 h-9 w-9 text-gray-300" />
                  No payment records were found for this order code.
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentRecords.map((record) => {
                    const orderAmount = getOrderPaymentAmount(record, paymentOrder.orderCode);
                    const statusName = record.verificationStatus?.name || 'Unknown';
                    const statusClass = getVerificationClasses(statusName, record.verificationStatus?.id);
                    const recordCodes = getPaymentRecordCodes(record);

                    return (
                      <div key={record.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-gray-900">Record #{record.id}</h3>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
                                {statusName}
                              </span>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.isReturn ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                                {record.isReturn ? 'Return' : 'Payment'}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-gray-600">{record.desc || 'No description recorded.'}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-500">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1">
                                <ClockIcon className="h-4 w-4" />
                                {formatDateTime(record.createdAt || record.updatedAt || '')}
                              </span>
                              <span className="rounded-lg bg-gray-100 px-2.5 py-1">
                                Made by {record.madeBy || 'Unknown'}
                              </span>
                              <span className="rounded-lg bg-gray-100 px-2.5 py-1">
                                {record.paymentType?.name || 'Unknown type'}
                              </span>
                              <span className="rounded-lg bg-gray-100 px-2.5 py-1">
                                {getBankLabel(record)}
                              </span>
                            </div>
                          </div>

                          <div className="w-full rounded-2xl bg-gray-50 p-4 lg:w-72">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Applied to this order</p>
                            <p className={`mt-2 text-2xl font-black ${record.isReturn ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {record.isReturn ? '-' : ''}{formatCurrency(orderAmount)}
                            </p>
                            <p className="mt-2 text-sm text-gray-500">Record amount {formatCurrency(asNumber(record.amount))}</p>
                            {record.proofUrl ? (
                              <a
                                href={record.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-[#F59B0F] hover:text-[#F59B0F]"
                              >
                                <DocumentArrowDownIcon className="h-5 w-5" />
                                View proof
                              </a>
                            ) : (
                              <p className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-400">
                                No proof attached
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Linked references</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {recordCodes.map((code) => (
                              <span
                                key={`${record.id}-${code}`}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${code.toUpperCase() === paymentOrder.orderCode.toUpperCase() ? 'bg-[#F59B0F] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/55 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Reject order</h2>
                <p className="mt-2 text-sm text-gray-500">Select the rejection reason and record any supporting notes.</p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingOrderId(null)}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">Reason</label>
                <Select<SelectOption<string>, false>
                  value={rejectionReasonOptions.find((option) => option.value === rejectionReason) ?? null}
                  onChange={(option) => setRejectionReason(option ? option.value : rejectionReasons[0])}
                  options={rejectionReasonOptions}
                  styles={getCustomSelectStyles(false)}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">Notes</label>
                <textarea
                  value={rejectionNote}
                  onChange={(event) => setRejectionNote(event.target.value)}
                  rows={4}
                  placeholder="Add the customer-facing or internal note for this rejection."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#F59B0F] focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRejectingOrderId(null)}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void submitRejection()}
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Save rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ReceivingOrders;
