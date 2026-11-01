import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  TruckIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  XCircleIcon,
  QrCodeIcon,
  PencilSquareIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import axiosInstance from '../../util/AxiosUtil';
import { ensureAccessDetails } from '../../util/AccessController';
import { getDeliveryStatusVisual } from '../../util/DeliveryStatusCatalog';
import { swalButtonClasses, swalColors } from './addOrders/swalColors';

interface OrderData {
  id: number;
  orderCode: {
    code: string;
    id: number;
    users?: {
      id?: number;
      firstName?: string;
      lastName?: string;
      email?: string;
      mobile?: string;
      userRoleId?: number;
      roleId?: number;
    };
  };
  totalPrice: number;
  collectivePrice: number;
  deliveryFee: number;
  qty: number;
  weight: number;
  paymentStatus: {
    id: number;
    name: string;
  };
  deliveryStatus: {
    id: number;
    name: string;
  };
  deliveryTo: {
    fullName: string;
    address: string;
    city?: {
      id?: number;
      name: string;
    };
    primaryMobile: string;
    secondaryMobile?: string;
    whatsapp?: string;
    googleMapLocation?: string;
    location?: string;
  } | null;
  marketOrder?: unknown;
  marketOrderId?: number;
  thirdPartyOrder?: unknown;
  thirdParty?: unknown;
  thirdPartyId?: number;
  user?: unknown;
  userId?: number;
  desc?: string;
  dontCollectDeliveryFeeFromCustomer?: boolean;
}

type PartyType = 'market' | 'third-party' | 'client';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
};

const asNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asPositiveNumber = (value: unknown): number | null => {
  const parsed = asNumber(value);
  return parsed != null && parsed > 0 ? parsed : null;
};

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

const combineName = (firstName: unknown, lastName: unknown): string => {
  const first = asString(firstName);
  const last = asString(lastName);
  return [first, last].filter(Boolean).join(' ').trim();
};

const getContactName = (record: Record<string, unknown> | null): string => {
  if (!record) return 'N/A';

  return (
    combineName(record.firstName, record.lastName) ||
    asString(record.fullName) ||
    asString(record.name) ||
    asString(record.userName) ||
    asString(record.username) ||
    'N/A'
  );
};

const buildMarketDetailsSummary = (
  marketDetails: Record<string, unknown>,
  ownerDetails: Record<string, unknown> | null = null
): Array<{ label: string; value: string }> => {
  const owner = asRecord(marketDetails.users) ?? asRecord(marketDetails.owner);
  const ownerFullName =
    combineName(ownerDetails?.firstName, ownerDetails?.lastName) ||
    combineName(owner?.firstName, owner?.lastName) ||
    'N/A';

  return [
    {
      label: 'Market Name',
      value: asString(marketDetails.name) || asString(marketDetails.marketName) || asString(marketDetails.title) || 'N/A',
    },
    { label: 'Address', value: asString(marketDetails.address) || 'N/A' },
    { label: 'Owner Full Name', value: ownerFullName },
    { label: 'Primary Mobile', value: asString(marketDetails.first_num) || 'N/A' },
    { label: 'Secondary Mobile', value: asString(marketDetails.second_num) || 'N/A' },
    { label: 'WhatsApp', value: asString(marketDetails.whats_app) || 'N/A' },
  ];
};

const getPartyType = (order: OrderData): PartyType => {
  const marketOrderRecord = asRecord(order.marketOrder);
  if (marketOrderRecord || asPositiveNumber(order.marketOrderId)) {
    return 'market';
  }

  const thirdPartyRecord = asRecord(order.thirdPartyOrder) ?? asRecord(order.thirdParty);
  if (thirdPartyRecord || asPositiveNumber(order.thirdPartyId)) {
    return 'third-party';
  }

  return 'client';
};

const getPartyLabel = (partyType: PartyType): string => {
  if (partyType === 'market') return 'Market Details';
  if (partyType === 'third-party') return 'Third Party Details';
  return 'Client Details';
};

const getPartySummary = (order: OrderData): Array<{ label: string; value: string }> => {
  const partyType = getPartyType(order);

  if (partyType === 'market') {
    const marketOrder = asRecord(order.marketOrder);
    const market = asRecord(marketOrder?.market) ?? asRecord(marketOrder?.markets) ?? marketOrder;
    const owner = asRecord(market?.owner) ?? asRecord(market?.users) ?? asRecord(marketOrder?.user);

    const marketName =
      asString(market?.name) ||
      asString(market?.marketName) ||
      asString(market?.title) ||
      'N/A';

    const ownerName = getContactName(owner);
    const email = asString(owner?.email) || asString(market?.email) || 'N/A';
    const mobile =
      asString(owner?.mobile) ||
      asString(owner?.primaryMobile) ||
      asString(market?.mobile) ||
      asString(market?.primaryMobile) ||
      asString(market?.first_num) ||
      'N/A';
    const address =
      asString(market?.address) ||
      asString(market?.addressLine1) ||
      asString(market?.location) ||
      'N/A';

    return [
      { label: 'Market Name', value: marketName },
      { label: 'Address', value: address },
      { label: 'Owner Full Name', value: ownerName },
      { label: 'Primary Mobile', value: mobile },
      { label: 'Secondary Mobile', value: asString(market?.second_num) || 'N/A' },
      { label: 'WhatsApp', value: asString(market?.whats_app) || 'N/A' },
    ];
  }

  if (partyType === 'third-party') {
    const thirdParty = asRecord(order.thirdPartyOrder) ?? asRecord(order.thirdParty);
    const contact = asRecord(thirdParty?.contact) ?? asRecord(thirdParty?.user) ?? thirdParty;

    const name = getContactName(contact);
    const company =
      asString(thirdParty?.companyName) ||
      asString(thirdParty?.name) ||
      asString(thirdParty?.thirdPartyName) ||
      'N/A';
    const email = asString(contact?.email) || asString(thirdParty?.email) || 'N/A';
    const mobile =
      asString(contact?.mobile) ||
      asString(contact?.primaryMobile) ||
      asString(thirdParty?.mobile) ||
      asString(thirdParty?.primaryMobile) ||
      'N/A';
    const address =
      asString(contact?.address) ||
      asString(thirdParty?.address) ||
      asString(thirdParty?.location) ||
      'N/A';

    return [
      { label: 'Company', value: company },
      { label: 'Contact', value: name },
      { label: 'Email', value: email },
      { label: 'Mobile', value: mobile },
      { label: 'Address', value: address },
    ];
  }

  const client = asRecord(order.orderCode?.users) ?? asRecord(order.user);
  const clientName = getContactName(client);
  const email = asString(client?.email) || 'N/A';
  const mobile = asString(client?.mobile) || asString(client?.primaryMobile) || 'N/A';
  return [
    { label: 'Client Name', value: clientName },
    { label: 'Email', value: email },
    { label: 'Mobile', value: mobile },
  ];
};

const getResponseRecord = (payload: unknown): Record<string, unknown> | null => {
  const root = asRecord(payload);
  return asRecord(root?.object) ?? asRecord(root?.exData) ?? null;
};

const getResponseItems = (payload: unknown): Record<string, unknown>[] => {
  const root = asRecord(payload);
  const objectNode = asRecord(root?.object);

  if (Array.isArray(objectNode?.items)) {
    return objectNode.items.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)));
  }

  if (Array.isArray(root?.object)) {
    return root.object.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)));
  }

  return [];
};

const getMarketOrderId = (order: OrderData): number | null => {
  return asPositiveNumber(order.marketOrderId) ?? asPositiveNumber(asRecord(order.marketOrder)?.id);
};

const getThirdPartySenderId = (order: OrderData): number | null => {
  const thirdPartyOrder = asRecord(order.thirdPartyOrder);
  const thirdParty = asRecord(order.thirdParty);

  return (
    asPositiveNumber(order.thirdPartyId) ??
    asPositiveNumber(thirdPartyOrder?.id) ??
    asPositiveNumber(thirdPartyOrder?.thirdPartyId) ??
    asPositiveNumber(thirdPartyOrder?.senderId) ??
    asPositiveNumber(thirdParty?.id)
  );
};

const getOrderUserId = (order: OrderData): number | null => {
  return (
    asPositiveNumber(asRecord(order.orderCode?.users)?.id) ??
    asPositiveNumber(asRecord(order.user)?.id) ??
    asPositiveNumber(order.userId)
  );
};

type CheckoutStatus = 'pending' | 'processing' | 'success' | 'error' | 'draft';

interface CheckoutQueueItem {
  order: OrderData;
  note: string;
  status: CheckoutStatus;
  statusMessage: string;
  targetDeliveryStatusId: number | null;
  isWeightUpdated?: boolean;
  sendNotification?: boolean;
}

interface CheckoutDraftItem {
  order: OrderData;
  note: string;
  statusMessage: string;
  lastAttemptAt: string;
}

interface DeliveryStatusOption {
  id: number;
  name: string;
}

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

const DELIVERY_STATUS_ACCESS_MAP: Record<number, number> = {
  1: 83,
  2: 84,
  3: 85,
  4: 86,
  5: 87,
  6: 88,
  7: 89,
  8: 90,
  9: 91,
  10: 92,
  11: 93,
  12: 94,
};

const DELIVERY_STATUS_NOTE_TEMPLATES: Record<number, string[]> = {
  1: ['Order is being processed at the branch.'],
  2: ['Order is ready to be picked up by the assigned rider.'],
  3: ['Package collected from the client and handed to delivery operations.'],
  4: ['Package is being verified by the company team.'],
  5: ['Rider is on the way to the delivery location.'],
  6: ['Rider has reached the customer doorstep.'],
  7: ['Order delivered by agent. Awaiting customer confirmation if needed.'],
  8: ['Order is returning to the branch.'],
  9: ['Order returned to branch.'],
  10: ['Customer accepted the order.'],
  11: ['Delivery is being rescheduled with the customer.'],
  12: ['Order is holding at branch until the next delivery action.'],
};

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

const AUTO_FEE_CHANGE_NOTE_REGEX =
  /^Delivery fee changed from LKR \d+(?:\.\d{2})? to LKR \d+(?:\.\d{2})?\.\s*/;

const stripAutoFeeChangeNote = (note: string) => note.replace(AUTO_FEE_CHANGE_NOTE_REGEX, '');

const buildAutoFeeChangeNote = (originalFee: number, updatedFee: number) =>
  `Delivery fee changed from LKR ${originalFee.toFixed(2)} to LKR ${updatedFee.toFixed(2)}.`;

const isPaymentCompleted = (paymentStatusName?: string) => {
  const normalized = (paymentStatusName || '').trim().toLowerCase();
  return (
    normalized === 'completed' ||
    normalized === 'paid' ||
    normalized === 'success' ||
    normalized === 'successful'
  );
};

const CHECKOUT_DRAFTS_STORAGE_KEY = 'deliveryya.orderCheckoutDrafts';

const getStoredCheckoutDrafts = (): CheckoutDraftItem[] => {
  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is CheckoutDraftItem => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const entry = item as Record<string, unknown>;
      const order = entry.order as Record<string, unknown> | undefined;
      const orderCode = order?.orderCode as Record<string, unknown> | undefined;

      return typeof orderCode?.code === 'string';
    });
  } catch {
    return [];
  }
};

const setStoredCheckoutDrafts = (drafts: CheckoutDraftItem[]) => {
  try {
    if (drafts.length === 0) {
      window.localStorage.removeItem(CHECKOUT_DRAFTS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(CHECKOUT_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Ignore storage write failures (quota/private mode) and keep runtime flow uninterrupted.
  }
};

const OrderCheckout = () => {
  const [orderCode, setOrderCode] = useState('');
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [checkoutQueue, setCheckoutQueue] = useState<CheckoutQueueItem[]>([]);
  const [error, setError] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanError, setScanError] = useState('');
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
  const [selectedRecipientOrderCode, setSelectedRecipientOrderCode] = useState('');
  const [selectedRecipientOrder, setSelectedRecipientOrder] = useState<OrderData | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<OrderData['deliveryTo']>(null);
  const [recipientPartySummary, setRecipientPartySummary] = useState<Array<{ label: string; value: string }>>([]);
  const [isLoadingRecipientPartyDetails, setIsLoadingRecipientPartyDetails] = useState(false);
  const [recipientPartyDetailsError, setRecipientPartyDetailsError] = useState('');
  const [editingOrderCode, setEditingOrderCode] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editDeliveryFee, setEditDeliveryFee] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSendNotification, setEditSendNotification] = useState(false);
  const [originalDeliveryFee, setOriginalDeliveryFee] = useState<number | null>(null);
  const [updateModalError, setUpdateModalError] = useState('');
  const [isLoadingDeliveryCost, setIsLoadingDeliveryCost] = useState(false);
  const [deliveryStatusOptions, setDeliveryStatusOptions] = useState<DeliveryStatusOption[]>([]);
  const [isLoadingDeliveryStatuses, setIsLoadingDeliveryStatuses] = useState(false);
  const [selectedBulkDeliveryStatusId, setSelectedBulkDeliveryStatusId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const lastDetectedValueRef = useRef('');
  const stableDetectionCountRef = useRef(0);
  const hasAcceptedScanRef = useRef(false);
  const recipientPartyDetailsRequestRef = useRef(0);

  const normalizeScannedCode = (rawValue: string) =>
    rawValue
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();

  const acceptScannedCode = (rawValue: string) => {
    const value = normalizeScannedCode(rawValue);

    if (!value || value.length < 4) {
      return false;
    }

    if (lastDetectedValueRef.current === value) {
      stableDetectionCountRef.current += 1;
    } else {
      lastDetectedValueRef.current = value;
      stableDetectionCountRef.current = 1;
    }

    if (stableDetectionCountRef.current < 2) {
      return false;
    }

    hasAcceptedScanRef.current = true;
    setOrderCode(value);
    setError('');
    setIsScannerOpen(false);
    stopScanner();
    return true;
  };

  const stopScanner = () => {
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }

    lastDetectedValueRef.current = '';
    stableDetectionCountRef.current = 0;
    hasAcceptedScanRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  useEffect(() => {
    const drafts = getStoredCheckoutDrafts();
    if (!drafts.length) {
      return;
    }

    setCheckoutQueue((current) => {
      if (current.length > 0) {
        return current;
      }

      return drafts.map((draft) => ({
        order: draft.order,
        note: draft.note,
        status: 'draft',
        statusMessage: draft.statusMessage || 'Draft saved locally',
        targetDeliveryStatusId: null,
        isWeightUpdated: false,
        sendNotification: false,
      }));
    });
  }, []);

  useEffect(() => {
    if (selectedBulkDeliveryStatusId == null) {
      return;
    }

    setCheckoutQueue((prev) =>
      prev.map((item) => ({
        ...item,
        targetDeliveryStatusId: selectedBulkDeliveryStatusId,
      }))
    );
  }, [selectedBulkDeliveryStatusId]);

  useEffect(() => {
    const fetchDeliveryStatuses = async () => {
      setIsLoadingDeliveryStatuses(true);
      try {
        const [response, accessIds] = await Promise.all([
          axiosInstance.get('/orders/get-delivery-statuses'),
          ensureAccessDetails(),
        ]);
        const rawStatuses = response.data?.object;
        if (!Array.isArray(rawStatuses)) {
          setDeliveryStatusOptions([]);
          setSelectedBulkDeliveryStatusId(null);
          return;
        }

        const allowedAccessIds = new Set(accessIds);
        console.log('Access IDs:', accessIds);
        console.log('Raw statuses:', rawStatuses);
        const parsedStatuses = rawStatuses
          .map((status): DeliveryStatusOption | null => {
            const statusRecord = status as {
              id?: unknown;
              name?: unknown;
              delivery_status_id?: unknown;
              deliveryStatusId?: unknown;
              delivery_status_name?: unknown;
              deliveryStatusName?: unknown;
            };
            const id = Number(statusRecord.id ?? statusRecord.delivery_status_id ?? statusRecord.deliveryStatusId);
            const name = String(statusRecord.name ?? statusRecord.delivery_status_name ?? statusRecord.deliveryStatusName ?? '').trim();
            if (!Number.isFinite(id) || !name) {
              return null;
            }
            return { id, name };
          })
          .filter((status): status is DeliveryStatusOption => {
            if (status === null) {
              return false;
            }

            // Temporarily disable access filtering to allow all statuses
            // const requiredAccessId = DELIVERY_STATUS_ACCESS_MAP[status.id];
            // const hasAccess = requiredAccessId ? allowedAccessIds.has(requiredAccessId) : false;
            // console.log(`Status ${status.id} (${status.name}): requiredAccessId=${requiredAccessId}, hasAccess=${hasAccess}`);
            // return hasAccess;
            return true;
          });

        setDeliveryStatusOptions(parsedStatuses);

        if (parsedStatuses.length > 0) {
          const preferredStatus =
            parsedStatuses.find((status) => status.name.toLowerCase() === 'shipped') ??
            parsedStatuses[0];
          setSelectedBulkDeliveryStatusId(preferredStatus.id);
        } else {
          setSelectedBulkDeliveryStatusId(null);
        }
      } catch (err) {
        console.error('Error fetching delivery statuses:', err);
        setDeliveryStatusOptions([]);
        setSelectedBulkDeliveryStatusId(null);
      } finally {
        setIsLoadingDeliveryStatuses(false);
      }
    };

    fetchDeliveryStatuses();
  }, []);

  useEffect(() => {
    if (!isUpdateModalOpen || originalDeliveryFee == null) {
      return;
    }

    const parsedDeliveryFee = Number(editDeliveryFee);

    setEditNote((currentNote) => {
      const manualNote = stripAutoFeeChangeNote(currentNote);

      if (
        !Number.isFinite(parsedDeliveryFee) ||
        parsedDeliveryFee < 0 ||
        parsedDeliveryFee === originalDeliveryFee
      ) {
        setEditSendNotification(false);
        return manualNote;
      }

      const autoFeeChangeNote = buildAutoFeeChangeNote(originalDeliveryFee, parsedDeliveryFee);
      return `${autoFeeChangeNote} ${manualNote}`.trim();
    });
  }, [editDeliveryFee, isUpdateModalOpen, originalDeliveryFee]);

  const fetchOrderByCode = async (codeToSearch: string): Promise<OrderData> => {
    const trimmedCode = codeToSearch.trim();

    if (!trimmedCode) {
      throw new Error('Please enter an order code');
    }

    try {
      const response = await axiosInstance.post('/orders/get-orders', {
        pageNumber: 0,
        countPerPage: 100,
        sort: 'id,desc',
      });

      const orders = (response.data?.object?.items || []) as OrderData[];
      const foundOrder = orders.find((order) => order.orderCode?.code === trimmedCode);

      if (foundOrder) {
        return foundOrder;
      }

      throw new Error('Order not found. Please check the order code.');
    } catch (err) {
      console.error('Error fetching orders:', err);
      throw new Error('Failed to fetch orders. Please try again.');
    }
  };

  const updateQueueItem = (
    orderCodeValue: string,
    updates: Partial<Pick<CheckoutQueueItem, 'status' | 'statusMessage' | 'note'>>
  ) => {
    setCheckoutQueue((prev) =>
      prev.map((item) =>
        item.order.orderCode.code === orderCodeValue
          ? {
              ...item,
              ...updates,
            }
          : item
      )
    );
  };

  const saveCheckoutDraft = (queueItem: CheckoutQueueItem, statusMessage: string) => {
    const draft: CheckoutDraftItem = {
      order: queueItem.order,
      note: queueItem.note,
      statusMessage,
      lastAttemptAt: new Date().toISOString(),
    };

    const existingDrafts = getStoredCheckoutDrafts();
    const filtered = existingDrafts.filter(
      (item) => item.order.orderCode.code !== queueItem.order.orderCode.code
    );
    setStoredCheckoutDrafts([...filtered, draft]);
  };

  const removeCheckoutDraft = (orderCodeValue: string) => {
    const existingDrafts = getStoredCheckoutDrafts();
    const filtered = existingDrafts.filter((item) => item.order.orderCode.code !== orderCodeValue);
    setStoredCheckoutDrafts(filtered);
  };

  const handleLoadOrderForCheckout = async () => {
    const codeToSearch = orderCode.trim().toUpperCase();

    if (!codeToSearch) {
      setError('Please enter an order code');
      return;
    }

    if (checkoutQueue.some((item) => item.order.orderCode.code === codeToSearch)) {
      setError('This order is already added to the checkout list.');
      return;
    }

    setIsLoadingOrder(true);
    setError('');

    try {
      const order = await fetchOrderByCode(codeToSearch);
      const statusName = order.deliveryStatus?.name?.toLowerCase();

      if (statusName === 'delivered') {
        throw new Error('This order has already been delivered');
      }

      if (statusName === 'cancelled') {
        throw new Error('This order has been cancelled');
      }

      if (statusName === 'returned') {
        throw new Error('This order has been returned');
      }

      if (statusName === 'shipped' || statusName === 'in transit') {
        throw new Error('This order is already checked out');
      }

      const addOrderToQueue = () => {
        setCheckoutQueue((prev) => [
          ...prev,
          {
            order,
            note: '',
            status: 'pending',
            statusMessage: 'Ready',
            targetDeliveryStatusId: selectedBulkDeliveryStatusId,
            isWeightUpdated: false,
            sendNotification: false,
          },
        ]);
        setOrderCode('');
        setError('');
      };

      if (!order.deliveryTo) {
        const result = await Swal.fire({
          title: 'Warning',
          text: 'This order has no delivery information. Add it to checkout list anyway?',
          icon: 'warning',
          confirmButtonText: 'Add Order',
          cancelButtonText: 'Cancel',
          showCancelButton: true,
          confirmButtonColor: swalColors.success,
          cancelButtonColor: swalColors.cancel,
        });

        if (result.isConfirmed) {
          addOrderToQueue();
        }
      } else {
        addOrderToQueue();
      }
    } catch (err: unknown) {
      const typedError = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Error fetching order:', err);
      setError(
        typedError?.response?.data?.message || typedError?.message || 'Failed to fetch order. Please try again.'
      );
    } finally {
      setIsLoadingOrder(false);
    }
  };

const handleConfirmOrdersSequentially = async () => {
  const ordersToProcess = checkoutQueue.filter(
    (item) => item.status === 'pending' || item.status === 'error' || item.status === 'draft'
  );

  if (!ordersToProcess.length) {
    setError('No pending orders to confirm.');
    return;
  }

  const confirmResult = await Swal.fire({
    title: 'Confirm Checkout',
    text: `Confirm ${ordersToProcess.length} order(s) one by one automatically?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Start Confirmation',
    cancelButtonText: 'Cancel',
    confirmButtonColor: swalColors.success,
    cancelButtonColor: swalColors.cancel,
  });

  if (!confirmResult.isConfirmed) {
    return;
  }

  setIsCheckingOut(true);
  setError('');

  let successCount = 0;
  let failCount = 0;

  for (const queueItem of ordersToProcess) {
    const code = queueItem.order.orderCode.code;
    const selectedRowStatusId = queueItem.targetDeliveryStatusId;

    if (!selectedRowStatusId) {
      failCount += 1;
      updateQueueItem(code, {
        status: 'draft',
        statusMessage: 'Please select a delivery status for this order before confirming.',
      });
      saveCheckoutDraft(queueItem, 'Please select a delivery status for this order before confirming.');
      continue;
    }

    const selectedRowStatus = deliveryStatusOptions.find((status) => status.id === selectedRowStatusId);
    if (!selectedRowStatus) {
      failCount += 1;
      updateQueueItem(code, {
        status: 'draft',
        statusMessage: 'Selected delivery status is invalid. Please choose again.',
      });
      saveCheckoutDraft(queueItem, 'Selected delivery status is invalid. Please choose again.');
      continue;
    }

    updateQueueItem(code, { status: 'processing', statusMessage: 'Processing...' });

    try {
      const payload: {
        orderCode: string;
        deliveryStatusId: number;
        weight: number;
        deliveryFee: number;
        isWeightUpdated: boolean;
        sendNotification: boolean;
        note?: string;
      } = {
        orderCode: code,
        deliveryStatusId: selectedRowStatus.id,
        weight: Number(queueItem.order.weight),
        deliveryFee: Number(queueItem.order.deliveryFee),
        isWeightUpdated: Boolean(queueItem.isWeightUpdated),
        sendNotification: Boolean(queueItem.sendNotification),
      };

      const trimmedNote = queueItem.note.trim();
      if (trimmedNote) {
        // Truncate note to 150 characters if needed
        payload.note = trimmedNote.length > 150 
          ? trimmedNote.substring(0, 150) 
          : trimmedNote;
      }

      const response = await axiosInstance.post('/orders/order-checkout-v2', payload);

      
      if (response.data?.status === 200 || response.status === 200) {
        successCount += 1;
        removeCheckoutDraft(code);
        setCheckoutQueue((prev) =>
          prev.map((item) =>
            item.order.orderCode.code === code
              ? {
                  ...item,
                  status: 'success',
                  statusMessage: 'Confirmed',
                  order: {
                    ...item.order,
                    deliveryStatus: {
                      id: selectedRowStatus.id,
                      name: selectedRowStatus.name,
                    },
                  },
                }
              : item
          )
        );
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (err: unknown) {
      const typedError = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Error during checkout:', err);
      failCount += 1;
      
      // Check if it's the note length validation error
      const errorMessage = typedError?.response?.data?.message || typedError?.message || 'Confirmation failed';
      const isNoteLengthError = errorMessage.includes('note') && errorMessage.includes('150');
      const draftMessage = isNoteLengthError
        ? 'Note exceeds 150 characters. Draft saved locally.'
        : `${errorMessage}. Draft saved locally.`;

      saveCheckoutDraft(queueItem, draftMessage);
      
      updateQueueItem(code, {
        status: 'draft',
        statusMessage: draftMessage,
      });
    }
  }

  setIsCheckingOut(false);

  await Swal.fire({
    title: failCount > 0 ? 'Checkout Completed with Errors' : 'Checkout Completed',
    text:
      failCount > 0
        ? `${successCount} order(s) confirmed, ${failCount} order(s) failed. Failed orders are kept for retry.`
        : `${successCount} order(s) confirmed successfully.`,
    icon: failCount > 0 ? 'warning' : 'success',
    confirmButtonText: 'OK',
    confirmButtonColor: failCount > 0 ? swalColors.warning : swalColors.success,
  });
};

  const loadCameras = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setScanError('Camera access is not supported in this browser.');
      return;
    }

    setScanError('');

    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter((device) => device.kind === 'videoinput');

      if (!videoDevices.length || videoDevices.every((device) => !device.label)) {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach((track) => track.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter((device) => device.kind === 'videoinput');
      }

      setCameras(videoDevices);

      if (videoDevices.length > 0) {
        const preferredCamera =
          videoDevices.find((device) => /back|rear|environment/i.test(device.label)) ??
          videoDevices[0];

        setSelectedCameraId(preferredCamera.deviceId);
        await startScanner(preferredCamera.deviceId);
      } else {
        await startScanner();
      }
    } catch (err) {
      console.error('Error loading cameras:', err);
      setScanError('Unable to access cameras. Please allow camera permissions.');
    }
  };

  const handleToggleScanner = async () => {
    if (isScannerOpen) {
      setIsScannerOpen(false);
      setSelectedCameraId('');
      stopScanner();
      return;
    }

    setIsScannerOpen(true);
    await loadCameras();
  };

  const startScanner = async (deviceId?: string) => {
    setIsStartingScanner(true);
    setScanError('');
    stopScanner();

    try {
      let stream: MediaStream;
      try {
        const baseVideoConstraint = deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30, max: 60 },
              focusMode: 'continuous',
            }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30, max: 60 },
              focusMode: 'continuous',
            };

        stream = await navigator.mediaDevices.getUserMedia({
          video: baseVideoConstraint,
        });
      } catch (err) {
        const fallbackVideoConstraint = deviceId
          ? {
              deviceId: { ideal: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: 'environment' },
            }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            };
        stream = await navigator.mediaDevices.getUserMedia({ video: fallbackVideoConstraint });
      }

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error('Camera preview is not available.');
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const reader = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 180,
      });

      zxingControlsRef.current = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result, decodeError, controls) => {
          if (hasAcceptedScanRef.current) {
            return;
          }

          if (result?.getText()) {
            const isAccepted = acceptScannedCode(result.getText());
            if (isAccepted) {
              controls.stop();
            }
            return;
          }

          if (decodeError) {
            const errorName = (decodeError as { name?: string }).name;
            if (
              errorName !== 'NotFoundException' &&
              errorName !== 'ChecksumException' &&
              errorName !== 'FormatException'
            ) {
              console.error('Barcode scan error:', decodeError);
            }
          }
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setScanError('Unable to start camera. Please check permissions and try again.');
    } finally {
      setIsStartingScanner(false);
    }
  };

  const handleClearOrder = () => {
    setOrderCode('');
    setCheckoutQueue([]);
    setError('');
    setStoredCheckoutDrafts([]);
  };

  const handleRemoveFromQueue = (orderCodeValue: string) => {
    removeCheckoutDraft(orderCodeValue);
    setCheckoutQueue((prev) => prev.filter((item) => item.order.orderCode.code !== orderCodeValue));
  };

  const loadRecipientPartySummary = async (
    order: OrderData
  ): Promise<Array<{ label: string; value: string }>> => {
    const partyType = getPartyType(order);

    if (partyType === 'market') {
      const marketOrderId = getMarketOrderId(order);
      if (!marketOrderId) {
        return getPartySummary(order);
      }

      const response = await axiosInstance.get('/markets/get-markets-details-by-market-order-id', {
        params: { marketOrderId },
      });

      const marketDetails = getResponseRecord(response.data);
      if (!marketDetails) {
        return getPartySummary(order);
      }

      const owner = asRecord(marketDetails.users) ?? asRecord(marketDetails.owner);
      const ownerId = asPositiveNumber(owner?.id);
      let ownerDetails: Record<string, unknown> | null = null;

      if (ownerId) {
        try {
          const userResponse = await axiosInstance.get('/users/get-user-by-id', {
            params: { id: ownerId },
          });
          ownerDetails = getResponseRecord(userResponse.data);
        } catch (userError) {
          console.error('Error loading market owner details:', userError);
        }
      }

      return buildMarketDetailsSummary(marketDetails, ownerDetails);
    }

    if (partyType === 'third-party') {
      const thirdPartyId = getThirdPartySenderId(order);
      if (!thirdPartyId) {
        return getPartySummary(order);
      }

      const response = await axiosInstance.post('/orders/get-third-party-senders', {
        pageNumber: 0,
        countPerPage: 10,
        id: thirdPartyId,
      });

      const senders = getResponseItems(response.data);
      const thirdPartySender =
        senders.find((sender) => asPositiveNumber(sender.id) === thirdPartyId) ?? senders[0] ?? null;

      if (!thirdPartySender) {
        return getPartySummary(order);
      }

      const contact = asRecord(thirdPartySender.contact) ?? asRecord(thirdPartySender.user) ?? thirdPartySender;

      return [
        {
          label: 'Company',
          value:
            asString(thirdPartySender.companyName) ||
            asString(thirdPartySender.name) ||
            asString(thirdPartySender.thirdPartyName) ||
            'N/A',
        },
        { label: 'Contact', value: getContactName(contact) },
        { label: 'Email', value: asString(contact?.email) || asString(thirdPartySender.email) || 'N/A' },
        {
          label: 'Mobile',
          value:
            asString(contact?.mobile) ||
            asString(contact?.primaryMobile) ||
            asString(thirdPartySender.mobile) ||
            asString(thirdPartySender.primaryMobile) ||
            'N/A',
        },
        {
          label: 'Address',
          value:
            asString(contact?.address) ||
            asString(thirdPartySender.address) ||
            asString(thirdPartySender.location) ||
            'N/A',
        },
      ];
    }

    const userId = getOrderUserId(order);
    if (!userId) {
      return getPartySummary(order);
    }

    const response = await axiosInstance.get('/users/get-user-by-id', {
      params: { id: userId },
    });

    const user = getResponseRecord(response.data);
    if (!user) {
      return getPartySummary(order);
    }

    return [
      { label: 'Client Name', value: getContactName(user) },
      { label: 'Email', value: asString(user.email) || 'N/A' },
      {
        label: 'Mobile',
        value: asString(user.mobile) || asString(user.primaryMobile) || asString(user.phone) || 'N/A',
      },
      {
        label: 'Address',
        value: asString(user.address) || asString(user.location) || asString(user.addressLine1) || 'N/A',
      },
    ];
  };

  const handleOpenRecipientModal = async (item: CheckoutQueueItem) => {
    const requestId = recipientPartyDetailsRequestRef.current + 1;
    recipientPartyDetailsRequestRef.current = requestId;

    setSelectedRecipientOrderCode(item.order.orderCode.code);
    setSelectedRecipientOrder(item.order);
    setSelectedRecipient(item.order.deliveryTo);
    setRecipientPartySummary(getPartySummary(item.order));
    setRecipientPartyDetailsError('');
    setIsLoadingRecipientPartyDetails(true);
    setIsRecipientModalOpen(true);

    try {
      const summary = await loadRecipientPartySummary(item.order);
      if (requestId !== recipientPartyDetailsRequestRef.current) {
        return;
      }
      setRecipientPartySummary(summary);
    } catch (err) {
      if (requestId !== recipientPartyDetailsRequestRef.current) {
        return;
      }
      console.error('Error loading recipient party details:', err);
      setRecipientPartyDetailsError('Unable to load live sender details. Showing available order data.');
      setRecipientPartySummary(getPartySummary(item.order));
    } finally {
      if (requestId === recipientPartyDetailsRequestRef.current) {
        setIsLoadingRecipientPartyDetails(false);
      }
    }
  };

  const handleCloseRecipientModal = () => {
    recipientPartyDetailsRequestRef.current += 1;
    setIsRecipientModalOpen(false);
    setSelectedRecipientOrderCode('');
    setSelectedRecipientOrder(null);
    setSelectedRecipient(null);
    setRecipientPartySummary([]);
    setIsLoadingRecipientPartyDetails(false);
    setRecipientPartyDetailsError('');
  };

  const handleOpenUpdateModal = (item: CheckoutQueueItem) => {
    setEditingOrderCode(item.order.orderCode.code);
    setEditWeight(String(item.order.weight ?? ''));
    setEditDeliveryFee(String(item.order.deliveryFee ?? ''));
    setEditNote(stripAutoFeeChangeNote(item.note ?? ''));
    setEditSendNotification(Boolean(item.sendNotification));
    setOriginalDeliveryFee(item.order.deliveryFee ?? 0);
    setUpdateModalError('');
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setEditingOrderCode('');
    setEditWeight('');
    setEditDeliveryFee('');
    setEditNote('');
    setEditSendNotification(false);
    setOriginalDeliveryFee(null);
    setUpdateModalError('');
    setIsLoadingDeliveryCost(false);
  };

  const handleFetchDeliveryCost = async () => {
    const parsedWeight = Number(editWeight);

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setUpdateModalError('Enter a valid weight greater than 0 before calculating delivery fee.');
      return;
    }

    const editingItem = checkoutQueue.find((item) => item.order.orderCode.code === editingOrderCode);
    const cityId = editingItem?.order.deliveryTo?.city?.id;

    if (!cityId) {
      setUpdateModalError('City is required to calculate delivery fee for this order.');
      return;
    }

    setIsLoadingDeliveryCost(true);
    setUpdateModalError('');

    try {
      const response = await axiosInstance.get('/delivery-fees/get-delivery-cost-by-city-id', {
        params: {
          id: cityId,
          weight: parsedWeight,
        },
      });

      const hasError = response.data?.message === 'Error' || response.data?.object == null;
      if (hasError) {
        setUpdateModalError(response.data?.desc || 'Delivery fee not available for selected city.');
        return;
      }

      const deliveryCost = Number(response.data?.object ?? 0);
      setEditDeliveryFee(deliveryCost.toString());
    } catch (err) {
      console.error('Error fetching delivery cost:', err);
      setUpdateModalError('Failed to fetch delivery fee. Please try again.');
    } finally {
      setIsLoadingDeliveryCost(false);
    }
  };

  const handleSaveOrderUpdates = () => {
    const parsedWeight = Number(editWeight);
    const parsedDeliveryFee = Number(editDeliveryFee);

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setUpdateModalError('Weight must be a valid number greater than 0.');
      return;
    }

    if (!Number.isFinite(parsedDeliveryFee) || parsedDeliveryFee < 0) {
      setUpdateModalError('Delivery fee must be a valid number equal to or greater than 0.');
      return;
    }

    const trimmedNote = editNote.trim();
    if (trimmedNote.length > 150) {
      setUpdateModalError('Note cannot exceed 150 characters.');
      return;
    }

    setCheckoutQueue((prev) =>
      prev.map((item) =>
        item.order.orderCode.code === editingOrderCode
          ? (() => {
              const didWeightChange =
                item.order.weight !== parsedWeight || item.order.deliveryFee !== parsedDeliveryFee;
              const didDeliveryFeeChange = item.order.deliveryFee !== parsedDeliveryFee;

              return {
                ...item,
                order: {
                  ...item.order,
                  weight: parsedWeight,
                  deliveryFee: parsedDeliveryFee,
                },
                note: trimmedNote,
                isWeightUpdated: didWeightChange ? true : Boolean(item.isWeightUpdated),
                sendNotification: didDeliveryFeeChange ? editSendNotification : false,
                statusMessage:
                  item.status === 'pending' || item.status === 'draft'
                    ? 'Updated and ready'
                    : item.statusMessage,
              };
            })()
          : item
      )
    );

    removeCheckoutDraft(editingOrderCode);
    handleCloseUpdateModal();
  };

  const handleDeliveryStatusChange = (orderCodeValue: string, nextStatusId: number) => {
    setCheckoutQueue((prev) =>
      prev.map((item) =>
        item.order.orderCode.code === orderCodeValue
          ? {
              ...item,
              targetDeliveryStatusId: nextStatusId,
            }
          : item
      )
    );
  };

  const shouldSkipDeliveryFeeCollection = (order: OrderData): boolean => {
    return order.dontCollectDeliveryFeeFromCustomer === true;
  };

  const renderOrderDeliveryStatusBadge = (deliveryStatusName?: string) => {
    const statusText = (deliveryStatusName || '').trim() || 'N/A';
    const statusVisual = getDeliveryStatusVisual(deliveryStatusName || '');
    const StatusIcon = statusVisual.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusVisual.badgeClassName}`}
      >
        <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{statusText}</span>
      </span>
    );
  };

  const hasOrdersToConfirm = checkoutQueue.some(
    (item) => item.status === 'pending' || item.status === 'error' || item.status === 'draft'
  );

  const checkoutStatusSummary = checkoutQueue.reduce(
    (summary, item) => {
      const collectivePrice = Number(item.order.collectivePrice) || 0;
      const deliveryFee = Number(item.order.deliveryFee) || 0;
      const paymentCompleted = isPaymentCompleted(item.order.paymentStatus?.name);
      const shouldCollectDeliveryFee = deliveryFee > 0 && !paymentCompleted;

      summary.totalCollectivePrice += collectivePrice;
      summary.totalDeliveryFee += deliveryFee;

      if (shouldCollectDeliveryFee) {
        summary.collectableDeliveryFeeTotal += deliveryFee;
        summary.collectableOrderCodes.push(item.order.orderCode.code);
      } else {
        summary.nonCollectableDeliveryFeeTotal += deliveryFee;
        summary.nonCollectableOrderCodes.push(item.order.orderCode.code);
      }

      return summary;
    },
    {
      totalCollectivePrice: 0,
      totalDeliveryFee: 0,
      collectableDeliveryFeeTotal: 0,
      nonCollectableDeliveryFeeTotal: 0,
      collectableOrderCodes: [] as string[],
      nonCollectableOrderCodes: [] as string[],
    }
  );

  const parsedEditDeliveryFee = Number(editDeliveryFee);
  const isDeliveryFeeUpdatedInModal =
    originalDeliveryFee != null &&
    Number.isFinite(parsedEditDeliveryFee) &&
    parsedEditDeliveryFee >= 0 &&
    parsedEditDeliveryFee !== originalDeliveryFee;
  const editingQueueItem = checkoutQueue.find((item) => item.order.orderCode.code === editingOrderCode);
  const editingDeliveryStatusId = editingQueueItem?.targetDeliveryStatusId ?? null;
  const editingDeliveryStatusName =
    deliveryStatusOptions.find((status) => status.id === editingDeliveryStatusId)?.name ?? '';
  const quickNoteTemplates = editingDeliveryStatusId
    ? DELIVERY_STATUS_NOTE_TEMPLATES[editingDeliveryStatusId] ?? []
    : [];

  const deliveryStatusSelectOptions: SelectOption<number>[] = deliveryStatusOptions.map((status) => ({
    value: status.id,
    label: status.name,
  }));

  const cameraSelectOptions: SelectOption<string>[] = cameras.map((camera, index) => ({
    value: camera.deviceId,
    label: camera.label || `Camera ${index + 1}`,
  }));

  const recipientPartyType = selectedRecipientOrder ? getPartyType(selectedRecipientOrder) : 'client';
  const recipientPartySummaryToDisplay =
    recipientPartySummary.length > 0
      ? recipientPartySummary
      : selectedRecipientOrder
        ? getPartySummary(selectedRecipientOrder)
        : [];

  return (
    <div className="bg-gray-50 pb-12">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#F59B0F] to-[#D17F0A] shadow-lg shadow-orange-500/30">
              <TruckIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
              Order Checkout
            </h1>
          </div>
          <p className="text-gray-600 text-sm md:text-base">
            Load orders, review fees, and confirm checkout with delivery status updates.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Orders Loaded</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">{checkoutQueue.length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <TruckIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Collective Price <small>(LKR)</small></p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {checkoutStatusSummary.totalCollectivePrice.toFixed(2)}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <CurrencyDollarIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Delivery Fee <small>(LKR)</small></p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {checkoutStatusSummary.totalDeliveryFee.toFixed(2)}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <CurrencyDollarIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Delivery Fee To Collect <small>(LKR)</small></p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {checkoutStatusSummary.collectableDeliveryFeeTotal.toFixed(2)}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircleIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Collect Delivery Fee</p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {checkoutStatusSummary.collectableOrderCodes.length > 0
                  ? checkoutStatusSummary.collectableOrderCodes.join(', ')
                  : 'No orders'}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-700">No Delivery Fee Collection</p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {checkoutStatusSummary.nonCollectableOrderCodes.length > 0
                  ? checkoutStatusSummary.nonCollectableOrderCodes.join(', ')
                  : 'No orders'}
              </p>
            </div>
          </div> */}

          <p className="mt-2 text-xs text-gray-500">
            Delivery fee collection is marked based on payment status: completed/paid orders are treated as already settled.
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-6 shadow-sm border border-gray-100 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Batch Delivery Status
            </label>
            <div className="w-full sm:w-80">
              <Select<SelectOption<number>, false>
                value={
                  deliveryStatusSelectOptions.find(
                    (option) => option.value === selectedBulkDeliveryStatusId
                  ) ?? null
                }
                onChange={(selectedOption) => {
                  setSelectedBulkDeliveryStatusId(selectedOption ? selectedOption.value : null);
                  setError('');
                }}
                options={deliveryStatusSelectOptions}
                styles={customSelectFieldStyles}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                instanceId="order-checkout-batch-delivery-status"
                aria-label="Select batch delivery status"
                placeholder={isLoadingDeliveryStatuses ? 'Loading statuses...' : 'Select delivery status'}
                isDisabled={isLoadingDeliveryStatuses || isCheckingOut}
              />
            </div>
            <p className="mt-2 text-xs text-gray-600">
              This status is auto-loaded into each row's checkout delivery status selector.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Order Code
            </label>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={orderCode}
                    onChange={(e) => {
                      setOrderCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoadOrderForCheckout()}
                    placeholder="Enter order code (e.g., ORD-2026-0001)"
                    className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all"
                    disabled={isLoadingOrder || isCheckingOut}
                  />
                  <button
                    type="button"
                    onClick={handleToggleScanner}
                    disabled={isLoadingOrder || isCheckingOut}
                    className="px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-[#D17F0A] hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-60"
                    aria-label="Open barcode scanner"
                    title="Open barcode scanner"
                  >
                    <QrCodeIcon className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleLoadOrderForCheckout}
                  disabled={isLoadingOrder || !orderCode.trim() || isCheckingOut}
                  className="px-6 py-3 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg hover:shadow-orange-400/30 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  {isLoadingOrder ? 'Loading Order...' : 'Load Order'}
                </button>
              </div>

              {isScannerOpen && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <label
                        htmlFor="order-code-camera"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Select Camera
                      </label>
                      <Select<SelectOption<string>, false>
                        inputId="order-code-camera"
                        value={
                          cameraSelectOptions.find((option) => option.value === selectedCameraId) ?? null
                        }
                        onChange={(selectedOption) => {
                          const deviceId = selectedOption?.value ?? '';
                          setSelectedCameraId(deviceId);
                          if (deviceId) {
                            startScanner(deviceId);
                          }
                        }}
                        options={cameraSelectOptions}
                        styles={customSelectFieldStyles}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        instanceId="order-checkout-camera"
                        placeholder="Choose a camera"
                        aria-label="Select camera"
                        isDisabled={isStartingScanner}
                      />

                      {cameras.length === 0 && !scanError && (
                        <p className="text-sm text-gray-600 mt-2">
                          No cameras detected yet. Allow camera permissions and try again.
                        </p>
                      )}

                      {scanError && (
                        <p className="text-sm text-red-700 mt-2">{scanError}</p>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        Hold the barcode steady and centered. The scanner confirms the same code across frames before filling the order code.
                      </p>
                    </div>

                    <div className="flex-1">
                      <div className="relative w-full overflow-hidden rounded-lg bg-black/80 aspect-video">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          playsInline
                        />
                        {isStartingScanner && (
                          <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/50">
                            Starting camera...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
              <ExclamationCircleIcon className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Orders Queue */}
        {checkoutQueue.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-4 bg-linear-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex items-center gap-3">
              <CurrencyDollarIcon className="w-6 h-6 text-[#F59B0F] shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Checkout Queue</h3>
                <p className="text-sm text-gray-600">
                  Loaded orders are shown below. Notes are optional and can be added per order.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-6 md:p-8">
              <div className="md:hidden space-y-3">
                {checkoutQueue.map((item) => (
                  <div
                    key={item.order.orderCode.code}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 break-all">{item.order.orderCode.code}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.order.qty} item(s), {item.order.weight} kg
                        </p>
                      </div>
                      {renderOrderDeliveryStatusBadge(item.order.deliveryStatus?.name)}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">Amount</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {item.order.totalPrice.toFixed(2)} LKR
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">Collective</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {item.order.collectivePrice.toFixed(2)} LKR
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 col-span-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">Delivery Fee</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {item.order.deliveryFee.toFixed(2)} LKR
                        </p>
                        {shouldSkipDeliveryFeeCollection(item.order) && (
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                            Don&apos;t collect from customer
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Checkout Delivery Status
                      </p>
                      <Select<SelectOption<number>, false>
                        value={
                          deliveryStatusSelectOptions.find(
                            (option) => option.value === item.targetDeliveryStatusId
                          ) ?? null
                        }
                        onChange={(selectedOption) => {
                          if (selectedOption) {
                            handleDeliveryStatusChange(item.order.orderCode.code, selectedOption.value);
                          }
                        }}
                        options={deliveryStatusSelectOptions}
                        styles={customSelectFieldStyles}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        instanceId={`order-checkout-row-status-mobile-${item.order.orderCode.code}`}
                        placeholder={isLoadingDeliveryStatuses ? 'Loading statuses...' : 'Select status'}
                        isDisabled={
                          isLoadingDeliveryStatuses || isCheckingOut || item.status === 'processing'
                        }
                        aria-label={`Checkout delivery status for order ${item.order.orderCode.code}`}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenRecipientModal(item)}
                        aria-label={`View recipient details for order ${item.order.orderCode.code}`}
                        title={`View recipient details for ${item.order.orderCode.code}`}
                        className="inline-flex items-center justify-center rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUpdateModal(item)}
                        disabled={item.status === 'processing' || isCheckingOut}
                        aria-label={`Update order ${item.order.orderCode.code}`}
                        title={`Update ${item.order.orderCode.code}`}
                        className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-2 text-[#F59B0F] hover:bg-amber-100 transition-colors disabled:opacity-60"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.order.orderCode.code)}
                        disabled={item.status === 'processing' || isCheckingOut}
                        aria-label={`Remove order ${item.order.orderCode.code}`}
                        title={`Remove ${item.order.orderCode.code}`}
                        className={swalButtonClasses.cancel.replace('px-4 py-2', 'p-2')}
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-linear-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Order</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Collective Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Delivery Fee</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Order Delivery Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Checkout Delivery Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {checkoutQueue.map((item) => (
                      <tr key={item.order.orderCode.code} className="hover:bg-orange-50/40 transition-colors">
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-gray-900">{item.order.orderCode.code}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.order.qty} item(s), {item.order.weight} kg</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm font-semibold text-gray-900 text-right">{item.order.totalPrice.toFixed(2)} LKR</p>
                          <p className="text-xs text-gray-500 text-right">Total Price</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm font-semibold text-gray-900 text-right">{item.order.collectivePrice.toFixed(2)} LKR</p>
                          <p className="text-xs text-gray-500 text-right">Collective Price</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm font-semibold text-gray-900 text-right">{item.order.deliveryFee.toFixed(2)} LKR</p>
                          {shouldSkipDeliveryFeeCollection(item.order) && (
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700 text-right">
                              Don&apos;t collect
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {renderOrderDeliveryStatusBadge(item.order.deliveryStatus?.name)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Select<SelectOption<number>, false>
                            value={
                              deliveryStatusSelectOptions.find(
                                (option) => option.value === item.targetDeliveryStatusId
                              ) ?? null
                            }
                            onChange={(selectedOption) => {
                              if (selectedOption) {
                                handleDeliveryStatusChange(item.order.orderCode.code, selectedOption.value);
                              }
                            }}
                            options={deliveryStatusSelectOptions}
                            styles={customSelectFieldStyles}
                            className="react-select-container min-w-44"
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            instanceId={`order-checkout-row-status-${item.order.orderCode.code}`}
                            placeholder={isLoadingDeliveryStatuses ? 'Loading statuses...' : 'Select status'}
                            isDisabled={
                              isLoadingDeliveryStatuses || isCheckingOut || item.status === 'processing'
                            }
                            aria-label={`Checkout delivery status for order ${item.order.orderCode.code}`}
                          />
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenRecipientModal(item)}
                              aria-label={`View recipient details for order ${item.order.orderCode.code}`}
                              title={`View recipient details for ${item.order.orderCode.code}`}
                              className="inline-flex items-center justify-center rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-700 hover:bg-sky-100 transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenUpdateModal(item)}
                              disabled={item.status === 'processing' || isCheckingOut}
                              aria-label={`Update order ${item.order.orderCode.code}`}
                              title={`Update ${item.order.orderCode.code}`}
                              className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-2 text-[#F59B0F] hover:bg-amber-100 transition-colors disabled:opacity-60"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromQueue(item.order.orderCode.code)}
                              disabled={item.status === 'processing' || isCheckingOut}
                              aria-label={`Remove order ${item.order.orderCode.code}`}
                              title={`Remove ${item.order.orderCode.code}`}
                              className={swalButtonClasses.cancel.replace('px-4 py-2', 'p-2')}
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleConfirmOrdersSequentially}
                  disabled={isLoadingOrder || isCheckingOut || !hasOrdersToConfirm}
                  className="flex-1 px-6 py-3 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg hover:shadow-orange-400/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  {isCheckingOut ? 'Confirming Orders...' : 'Confirm Orders Sequentially'}
                </button>
                <button
                  onClick={handleClearOrder}
                  disabled={isLoadingOrder || isCheckingOut}
                  className="px-6 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 hover:border-[#F59B0F] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <XCircleIcon className="w-5 h-5" />
                  Clear List
                </button>
              </div>

              {checkoutQueue.some((item) => item.status === 'error') && (
                <p className="mt-3 text-sm text-red-700">
                  Some orders failed. Fix issues if needed and click “Confirm Orders Sequentially” again to retry only failed/pending orders.
                </p>
              )}

              {checkoutQueue.some((item) => item.status === 'draft') && (
                <p className="mt-2 text-sm text-purple-700">
                  Draft items are saved to local storage when confirmation fails due to network/backend issues.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {checkoutQueue.length === 0 && !isLoadingOrder && !error && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
            <div className="w-16 h-16 bg-linear-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TruckIcon className="w-8 h-8 text-[#F59B0F]" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No Orders Added</h3>
            <p className="text-gray-600">Enter order codes above to build a checkout list and confirm orders one by one automatically.</p>
          </div>
        )}

        {isUpdateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={handleCloseUpdateModal}
              aria-hidden="true"
            />

            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
              <div className="relative bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#9A5F11] px-6 pb-5 pt-6">
                <button
                  type="button"
                  onClick={handleCloseUpdateModal}
                  className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                  aria-label="Close update modal"
                  title="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                    <PencilSquareIcon className="h-6 w-6 text-white" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Order Checkout</p>
                    <h3 className="text-xl font-black text-white">Update Order Charges</h3>
                    <p className="text-xs text-white/80 mt-1">Order: {editingOrderCode || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg)</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editWeight}
                      onChange={(e) => {
                        setEditWeight(e.target.value);
                        setUpdateModalError('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59B0F] focus:border-transparent"
                      placeholder="Enter updated weight"
                    />
                    <button
                      type="button"
                      onClick={handleFetchDeliveryCost}
                      disabled={isLoadingDeliveryCost}
                      className="shrink-0 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-[#B45309] font-medium hover:bg-amber-100 transition-colors disabled:opacity-60"
                    >
                      {isLoadingDeliveryCost ? 'Calculating...' : 'Get Fee'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Fee (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editDeliveryFee}
                    onChange={(e) => {
                      setEditDeliveryFee(e.target.value);
                      setUpdateModalError('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59B0F] focus:border-transparent"
                    placeholder="Enter updated delivery fee"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
                  <textarea
                    value={editNote}
                    onChange={(e) => {
                      const newNote = e.target.value;
                      if (newNote.length <= 150) {
                        setEditNote(newNote);
                        setUpdateModalError('');
                      }
                    }}
                    rows={3}
                    maxLength={150}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59B0F] focus:border-transparent"
                    placeholder="Optional note for this order"
                  />
                  <p className="text-xs text-gray-500 text-right mt-1">{editNote.length}/150</p>
                  {quickNoteTemplates.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                          Quick notes{editingDeliveryStatusName ? ` for ${editingDeliveryStatusName}` : ''}
                        </p>
                        <p className="text-[11px] font-medium text-amber-700">
                          Click to load, then edit if needed.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {quickNoteTemplates.map((template) => (
                          <button
                            key={template}
                            type="button"
                            onClick={() => {
                              setEditNote(template.slice(0, 150));
                              setUpdateModalError('');
                            }}
                            className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-amber-800 transition hover:border-[#F59B0F] hover:bg-orange-50"
                          >
                            {template}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={editSendNotification}
                      onChange={(e) => setEditSendNotification(e.target.checked)}
                      disabled={!isDeliveryFeeUpdatedInModal}
                      className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                    />
                    Send notification for delivery fee update
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    {isDeliveryFeeUpdatedInModal
                      ? 'Enable this if customer should be notified about the fee change.'
                      : 'This option is available only when Delivery Fee is changed.'}
                  </p>
                </div>
              </div>

              {updateModalError && (
                <div className="mx-6 mt-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {updateModalError}
                </div>
              )}

              <div className="mt-5 border-t border-gray-100 px-6 py-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSaveOrderUpdates}
                  className={swalButtonClasses.confirm.replace('px-4 py-2', 'flex-1 px-6 py-3')}
                >
                  Save Updates
                </button>
                <button
                  type="button"
                  onClick={handleCloseUpdateModal}
                  className={swalButtonClasses.cancel.replace('px-4 py-2', 'px-6 py-3')}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isRecipientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={handleCloseRecipientModal}
              aria-hidden="true"
            />

            <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
              <div className="relative bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#9A5F11] px-6 pb-5 pt-6">
                <button
                  type="button"
                  onClick={handleCloseRecipientModal}
                  className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                  aria-label="Close recipient details modal"
                  title="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                    <MapPinIcon className="h-6 w-6 text-white" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Order Checkout</p>
                    <h3 className="text-xl font-black text-white">Order Details</h3>
                    <p className="text-xs text-white/80 mt-1">Order: {selectedRecipientOrderCode || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 pr-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-500/80 [&::-webkit-scrollbar-thumb:hover]:bg-amber-600">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Order Summary</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Order Code</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{selectedRecipientOrderCode || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Items / Weight</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {selectedRecipientOrder ? `${selectedRecipientOrder.qty} item(s), ${selectedRecipientOrder.weight} kg` : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {selectedRecipientOrder ? `${selectedRecipientOrder.totalPrice.toFixed(2)} LKR` : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Fee</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {selectedRecipientOrder ? `${selectedRecipientOrder.deliveryFee.toFixed(2)} LKR` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Recipient Details</p>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${recipientPartyType === 'market' ? 'bg-emerald-100 text-emerald-700' : recipientPartyType === 'third-party' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                      {recipientPartyType === 'market' ? 'Market Order' : recipientPartyType === 'third-party' ? 'Third Party' : 'Client Order'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Full Name</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{selectedRecipient?.fullName || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Address</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedRecipient?.address || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">City</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedRecipient?.city?.name || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Primary Mobile</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedRecipient?.primaryMobile || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Secondary Mobile</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedRecipient?.secondaryMobile || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">WhatsApp</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedRecipient?.whatsapp || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{getPartyLabel(recipientPartyType)}</p>
                  {isLoadingRecipientPartyDetails && (
                    <p className="mt-2 text-xs font-medium text-amber-700">Loading live sender details...</p>
                  )}
                  {recipientPartyDetailsError && (
                    <p className="mt-2 text-xs font-medium text-red-700">{recipientPartyDetailsError}</p>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {recipientPartySummaryToDisplay.map((entry) => (
                      <div key={entry.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{entry.label}</p>
                        <p className="mt-1 text-sm text-gray-900 wrap-break-word">{entry.value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRecipient?.location && selectedRecipient.location !== selectedRecipient.googleMapLocation && (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Location</p>
                    <p className="text-sm text-gray-900 mt-1 break-all">{selectedRecipient.location}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={handleCloseRecipientModal}
                  className={swalButtonClasses.cancel.replace('px-4 py-2', 'w-full px-6 py-3 sm:w-auto')}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCheckout;
