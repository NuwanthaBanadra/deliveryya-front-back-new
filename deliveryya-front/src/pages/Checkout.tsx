import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCreditCard,
  FaMoneyBillWave,
  FaShoppingCart,
  FaTag,
  FaTruck,
  FaWallet
} from 'react-icons/fa';
import { MdLocalOffer, MdVerifiedUser } from 'react-icons/md';
import Footer from '../page_comps/home/Footer';
import NavBar from '../page_comps/home/NavBar';
import BankTransferSlipModal from '../page_comps/cart/BankTransferSlipModal';
import axiosInstance from '../util/AxiosUtil';
import { getCartItems, saveCartItems, type CartItem } from '../util/CartUtil';
import { formatLkr } from '../util/CurrencyUtil';
import { swalAlert } from '../util/SwalUtil';
import DeliveryAddressForm from '../deliveryya_dashboard/comps/addOrders/DeliveryAddressForm';
import JwtUtil from '../util/JwtUtil';
import type { DeliveryAddress } from '../deliveryya_dashboard/comps/addOrders/DeliveryAddressForm';

type CheckoutLocationState = {
  items?: CartItem[];
  source?: 'cart' | 'single-product';
};

type PaymentTypeOption = {
  id: number;
  name: string;
};

type PendingSlipPaymentContext = {
  orderId: number | null;
  amount: number;
  paymentTypeId: number;
};

type SavedDeliveryAddressOption = {
  id: string;
  title: string;
  line1: string;
  line2: string;
  value: DeliveryAddress;
};

const initialDeliveryAddress: DeliveryAddress = {
  recipientName: '',
  address: '',
  mobile1: '',
  mobile2: '',
  whatsapp: '',
  postalCode: '',
  city: '',
  cityId: null,
  googleMapLocation: '',
};

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as CheckoutLocationState | null) ?? null;

  const checkoutItems = useMemo(() => {
    if (state?.items && state.items.length > 0) {
      return state.items;
    }
    return getCartItems();
  }, [state]);

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(initialDeliveryAddress);
  const [savedDeliveryAddresses, setSavedDeliveryAddresses] = useState<SavedDeliveryAddressOption[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [deliveryErrors, setDeliveryErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({});
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeOption[]>([]);
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLoadingPaymentTypes, setIsLoadingPaymentTypes] = useState(false);
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [isSubmittingSlip, setIsSubmittingSlip] = useState(false);
  const [pendingSlipPaymentContext, setPendingSlipPaymentContext] = useState<PendingSlipPaymentContext | null>(null);

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + deliveryFee;
  const itemCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);

  const checkoutMarketId = useMemo(() => {
    const marketIds = checkoutItems
      .map((item) => Number(item.marketId))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (marketIds.length === 0) {
      return null;
    }

    const uniqueMarketIds = Array.from(new Set(marketIds));
    return uniqueMarketIds.length === 1 ? uniqueMarketIds[0] : null;
  }, [checkoutItems]);

  const BANK_TRANSFER_PAYMENT_TYPE_ID = 2;
  const isBankTransferSelected = selectedPaymentTypeId === BANK_TRANSFER_PAYMENT_TYPE_ID;

  const extractOrderId = (data: any): number | null => {
    const tryParse = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const sources: unknown[] = [data?.object, data?.exData, data?.data, data];

    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;

      const src = source as Record<string, any>;

      // Direct scalar IDs on the object
      for (const key of ['id', 'orderId', 'marketOrderId']) {
        const result = tryParse(src[key]);
        if (result) return result;
      }

      // Nested objects
      const result =
        tryParse(src.order?.id) ??
        tryParse(src.marketOrder?.id) ??
        tryParse(src.content?.id);
      if (result) return result;

      // Array of items — first element
      if (Array.isArray(source)) {
        const first = (source as any[])[0];
        const arrResult = tryParse(first?.id) ?? tryParse(first?.orderId);
        if (arrResult) return arrResult;
      }

      // Paginated items wrapper
      if (Array.isArray(src.items)) {
        const first = src.items[0];
        const itemResult = tryParse(first?.id) ?? tryParse(first?.orderId);
        if (itemResult) return itemResult;
      }
    }

    return null;
  };

  const extractOrderCode = (data: any): string | null => {
    const sources: unknown[] = [data?.object, data?.exData, data?.data, data];

    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;

      const src = source as Record<string, any>;
      const directCode = src.orderCode?.code ?? src.code;
      if (typeof directCode === 'string' && directCode.trim()) {
        return directCode.trim();
      }

      if (Array.isArray(src.items) && src.items.length > 0) {
        const first = src.items[0] as Record<string, any>;
        const itemCode = first?.orderCode?.code ?? first?.code;
        if (typeof itemCode === 'string' && itemCode.trim()) {
          return itemCode.trim();
        }
      }
    }

    return null;
  };

  const fetchOrderCodeByOrderId = async (orderId: number): Promise<string | null> => {
    try {
      const response = await axiosInstance.post('/orders/get-orders', {
        pageNumber: 0,
        countPerPage: 1,
        cityId: 0,
        orderId,
        userId: 0,
        markerOrderId: 0,
        deliveryStatusId: 0,
        paymentStatusId: 0,
        paymentTypeId: BANK_TRANSFER_PAYMENT_TYPE_ID,
        orderCodeUserId: 0,
        search: '',
      });

      const items = response.data?.object?.items;
      if (Array.isArray(items) && items.length > 0) {
        const item = items[0] as Record<string, any>;
        const code = item?.orderCode?.code ?? item?.code;
        if (typeof code === 'string' && code.trim()) {
          return code.trim();
        }
      }
    } catch (err) {
      console.warn('[Checkout] Fallback order code fetch failed:', err);
    }

    return null;
  };

  const fetchLatestOrderId = async (): Promise<number | null> => {
    try {
      const response = await axiosInstance.post('/orders/get-orders', {
        pageNumber: 0,
        countPerPage: 1,
        cityId: 0,
        orderId: 0,
        userId: 0,
        markerOrderId: 0,
        deliveryStatusId: 0,
        paymentStatusId: 0,
        paymentTypeId: BANK_TRANSFER_PAYMENT_TYPE_ID,
        orderCodeUserId: 0,
        search: '',
      });

      const items = response.data?.object?.items;
      if (Array.isArray(items) && items.length > 0) {
        const id = Number(items[0]?.id);
        return Number.isFinite(id) && id > 0 ? id : null;
      }
    } catch (err) {
      console.warn('[Checkout] Fallback order ID fetch failed:', err);
    }
    return null;
  };

  const uploadSlipToStorage = async (file: File): Promise<string> => {
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
  };

  const validateDeliveryAddress = (): Partial<Record<keyof DeliveryAddress, string>> => {
    const errors: Partial<Record<keyof DeliveryAddress, string>> = {};
    const normalizePhone = (value: string) => value.replace(/\D/g, '');
    const isValidMobile = (value: string) => /^(?:94|0)(70|76|78|74)\d{7}$/.test(value);

    if (!deliveryAddress.recipientName.trim()) {
      errors.recipientName = 'Recipient name is required';
    }
    if (!deliveryAddress.address.trim()) {
      errors.address = 'Delivery address is required';
    }
    if (!deliveryAddress.mobile1.trim()) {
      errors.mobile1 = 'At least one mobile number is required';
    } else if (!isValidMobile(normalizePhone(deliveryAddress.mobile1))) {
      errors.mobile1 = 'Mobile number must start with 070/074/076/078 or country code 94';
    }
    if (deliveryAddress.mobile2 && !isValidMobile(normalizePhone(deliveryAddress.mobile2))) {
      errors.mobile2 = 'Mobile number must start with 070/074/076/078 or country code 94';
    }
    if (deliveryAddress.whatsapp && !isValidMobile(normalizePhone(deliveryAddress.whatsapp))) {
      errors.whatsapp = 'Whatsapp number must start with 070/074/076/078 or country code 94';
    }
    if (!deliveryAddress.cityId) {
      errors.city = 'City is required';
    }

    return errors;
  };

  const handleDeliveryAddressChange = (next: DeliveryAddress) => {
    if (selectedSavedAddressId && selectedSavedAddressId !== 'new') {
      setSelectedSavedAddressId('new');
    }

    setDeliveryAddress(next);
    setDeliveryErrors((prev) => {
      if (!prev || Object.keys(prev).length === 0) {
        return prev;
      }

      const normalizePhone = (value: string) => value.replace(/\D/g, '');
      const isValidMobile = (value: string) => /^(?:94|0)(70|76|78|74)\d{7}$/.test(value);
      const updated = { ...prev };

      if (next.recipientName.trim()) {
        delete updated.recipientName;
      }
      if (next.address.trim()) {
        delete updated.address;
      }
      if (next.mobile1.trim() && isValidMobile(normalizePhone(next.mobile1))) {
        delete updated.mobile1;
      }
      if (!next.mobile2 || isValidMobile(normalizePhone(next.mobile2))) {
        delete updated.mobile2;
      }
      if (!next.whatsapp || isValidMobile(normalizePhone(next.whatsapp))) {
        delete updated.whatsapp;
      }
      if (next.cityId) {
        delete updated.city;
      }

      return updated;
    });
  };

  const handlePlaceOrder = async () => {
    if (isSubmittingOrder) {
      return;
    }

    const validationErrors = validateDeliveryAddress();
    if (Object.keys(validationErrors).length > 0) {
      setDeliveryErrors(validationErrors);
      await swalAlert('Missing details', 'Please fill in delivery details before placing your order.', 'warning');
      return;
    }

    if (!selectedPaymentTypeId) {
      await swalAlert('Payment required', 'Please select a payment method before placing your order.', 'warning');
      return;
    }

    const stocks = checkoutItems
      .map((item) => ({
        id: Number(item.stockId ?? item.id),
        qty: Number(item.quantity),
      }))
      .filter((stock) => Number.isFinite(stock.id) && stock.id > 0 && Number.isFinite(stock.qty) && stock.qty > 0);

    if (stocks.length === 0) {
      await swalAlert('Cart is empty', 'Please add at least one valid item before placing your order.', 'warning');
      return;
    }

    const recipientName = deliveryAddress.recipientName;

    // Payload structure follows docs: docs/api/set-market-order-endpint.md
    // deliveryTo: object, stocks: [{id, qty}], paymentType: {id, name}, cuponCode optional
    const payload = {
      deliveryTo: {
        id: deliveryAddress.id ?? null,
        address: deliveryAddress.address,
        primaryMobile: deliveryAddress.mobile1,
        secondaryMobile: deliveryAddress.mobile2 || '',
        whatsapp: deliveryAddress.whatsapp || '',
        fullName: recipientName,
        recipientName,
        name: recipientName,
        location: deliveryAddress.googleMapLocation || '',
        city: {
          id: deliveryAddress.cityId,
        },
        is_deleted: false,
      },
      stocks,
      cuponCode: '',
      paymentType: {
        id: selectedPaymentTypeId,
        // Include the payment type name when available (endpoint accepts object with id and name)
        name: paymentTypes.find((p) => p.id === selectedPaymentTypeId)?.name ?? undefined,
      },
    };

    try {
      setIsSubmittingOrder(true);
      const response = await axiosInstance.post('/orders/set-market-order', payload);
      const message = response.data?.message;

      if (message && String(message).toLowerCase() !== 'success') {
        await swalAlert('Order failed', response.data?.desc || 'Failed to place your order. Please try again.', 'error');
        return;
      }

      await swalAlert('Order placed', response.data?.desc || 'Your order has been placed successfully.', 'success');

      if (state?.source === 'cart') {
        saveCartItems([]);
      }

      if (isBankTransferSelected) {
        let createdOrderId = extractOrderId(response.data);

        if (!createdOrderId) {
          console.warn('[Checkout] Could not extract order ID from response, trying fallback fetch:', response.data);
          createdOrderId = await fetchLatestOrderId();
        }

        if (!createdOrderId) {
          console.warn('[Checkout] Could not resolve order ID via fallback either.');
        }

        setPendingSlipPaymentContext({
          orderId: createdOrderId,
          amount: total,
          paymentTypeId: BANK_TRANSFER_PAYMENT_TYPE_ID,
        });
        setIsSlipModalOpen(true);
      } else {
        navigate('/track-your-order');
      }
    } catch (error) {
      console.error('Failed to place market order:', error);
      const fallbackMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as any).response?.data?.desc
          : null;

      await swalAlert('Order failed', fallbackMessage || 'Failed to place your order. Please try again.', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSlipUploadSubmit = async (file: File, bankDetailId: number) => {
    if (!pendingSlipPaymentContext) {
      await swalAlert('Payment context missing', 'Order payment details are missing. Please place the order again.', 'error');
      return;
    }

    try {
      setIsSubmittingSlip(true);

      const proofUrl = await uploadSlipToStorage(file);
      const { orderId, amount, paymentTypeId } = pendingSlipPaymentContext;
      // Build payload matching backend DTO expectations
      const jwtToken = localStorage.getItem('jwtToken');
      const userDetail = jwtToken ? JwtUtil.decodeToken(jwtToken) : null;
      const userName =
        (userDetail && (`${userDetail.firstName || ''} ${userDetail.lastName || ''}`.trim())) ||
        userDetail?.email ||
        'system';

      const orderCode = extractOrderCode(location.state) ?? (orderId ? await fetchOrderCodeByOrderId(orderId) : null);

      if (!orderCode) {
        await swalAlert(
          'Order code missing',
          'Could not resolve the order code required for the payment record. Please retry after refreshing the order.',
          'error'
        );
        return;
      }

      // Minimal PaymentRecordItemsDto: include the order code and amount
      const paymentRecordItems = [
        {
          code: orderCode,
          note: `Advance payment for order${orderId ? ` #${orderId}` : ''}`,
          amount: amount,
        },
      ];

      const paymentPayload = {
        id: 0,
        amount,
        desc: `Advance payment for order${orderId ? ` #${orderId}` : ''}`,
        proofUrl,
        paymentRecordItems,
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
          name: paymentTypes.find((p) => p.id === paymentTypeId)?.name ?? undefined,
        },
        isReturn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userName,
        madeBy: userName,
        updatedBy: userName,
      };

      const paymentResponse = await axiosInstance.post('/payment/create-payment-record', paymentPayload);
      const paymentStatus = String(paymentResponse.data?.message || '').toLowerCase();

      if (paymentStatus && paymentStatus !== 'success') {
        throw new Error(paymentResponse.data?.desc || 'Failed to save payment record.');
      }

      await swalAlert('Slip received', 'Your payment slip was uploaded successfully. We will verify it shortly.', 'success');
      setPendingSlipPaymentContext(null);
      setIsSlipModalOpen(false);
      navigate('/track-your-order');
    } catch (error) {
      console.error('Failed to upload slip and create payment record:', error);
      const fallbackMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as any).response?.data?.desc
          : null;

      await swalAlert('Upload failed', fallbackMessage || 'Failed to submit payment slip. Please try again.', 'error');
    } finally {
      setIsSubmittingSlip(false);
    }
  };

  const handleCloseSlipModal = () => {
    if (isSubmittingSlip) {
      return;
    }

    setPendingSlipPaymentContext(null);
    setIsSlipModalOpen(false);
    navigate('/track-your-order');
  };

  useEffect(() => {
    let isMounted = true;

    const extractPaymentTypes = (data: any): PaymentTypeOption[] => {
      const payload = data?.object ?? data?.exData ?? data;
      const list =
        (Array.isArray(payload) && payload) ||
        (Array.isArray(payload?.items) && payload.items) ||
        (Array.isArray(payload?.content) && payload.content) ||
        [];

      return list
        .map((item: any) => ({
          id: Number(item?.id),
          name: String(item?.name ?? '').trim(),
        }))
        .filter((item: PaymentTypeOption) => Number.isFinite(item.id) && item.id > 0 && item.name.length > 0);
    };

    const loadPaymentTypes = async () => {
      try {
        setIsLoadingPaymentTypes(true);
        const response = await axiosInstance.get('/payment/get-payment-types');
        const types = extractPaymentTypes(response.data).filter((type) => type.id !== 3);

        if (!isMounted) return;

        setPaymentTypes(types);
        setSelectedPaymentTypeId((prev) => prev ?? types[0]?.id ?? null);
      } catch (error) {
        console.warn('Failed to load payment types:', error);
        if (!isMounted) return;
        setPaymentTypes([]);
        setSelectedPaymentTypeId(null);
      } finally {
        if (isMounted) {
          setIsLoadingPaymentTypes(false);
        }
      }
    };

    void loadPaymentTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const getAddressField = (source: Record<string, any>, keys: string[]): string => {
      for (const key of keys) {
        const value = source?.[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      return '';
    };

    const extractAddressList = (data: any): Record<string, any>[] => {
      const payload = data?.object ?? data?.exData ?? data;

      if (Array.isArray(payload)) {
        return payload as Record<string, any>[];
      }

      if (Array.isArray(payload?.items)) {
        return payload.items as Record<string, any>[];
      }

      if (Array.isArray(payload?.content)) {
        return payload.content as Record<string, any>[];
      }

      if (payload && typeof payload === 'object') {
        return [payload as Record<string, any>];
      }

      return [];
    };

    const mapAddressToDeliveryAddress = (addressData: Record<string, any>, userFullName?: string): DeliveryAddress => {
      const nestedAddress =
        addressData?.deliveryAddress && typeof addressData.deliveryAddress === 'object'
          ? (addressData.deliveryAddress as Record<string, any>)
          : {};

      const resolvedAddress = {
        ...nestedAddress,
        ...addressData,
      };

      const cityName =
        getAddressField(resolvedAddress, ['cityName', 'city']) ||
        getAddressField(resolvedAddress.city || {}, ['name', 'cityName']);
      const rawCityId = resolvedAddress?.cityId ?? resolvedAddress?.city?.id ?? resolvedAddress?.city;
      const cityId = Number(rawCityId) || null;

      return {
        recipientName: userFullName || getAddressField(resolvedAddress, ['fullName', 'recipientName', 'name']),
        mobile1: getAddressField(resolvedAddress, ['primaryMobile', 'mobile', 'phone', 'phoneNumber', 'mobileNumber']),
        mobile2: getAddressField(resolvedAddress, ['secondaryMobile']),
        whatsapp: getAddressField(resolvedAddress, ['whatsapp']),
        address: getAddressField(resolvedAddress, ['address', 'street', 'line1']),
        city: cityName,
        cityId,
        postalCode: getAddressField(resolvedAddress, ['postalCode', 'zipCode']),
        googleMapLocation: getAddressField(resolvedAddress, ['googleMapLocation']),
      };
    };

    const loadAddress = async () => {
      try {
        setIsLoadingAddress(true);
        const jwtToken = localStorage.getItem('jwtToken');
        const userDetail = jwtToken ? JwtUtil.decodeToken(jwtToken) : null;
        const userFullName = userDetail
          ? `${userDetail.firstName} ${userDetail.lastName}`.trim() || undefined
          : undefined;

        const response = await axiosInstance.get('/users/get-address-by-id-or-user-id');
        const addressList = extractAddressList(response.data);

        if (!isMounted) {
          return;
        }

        const mappedSavedAddresses = addressList
          .map((addressData, index) => {
            const mapped = mapAddressToDeliveryAddress(addressData, userFullName);
            const id = String(addressData?.id ?? addressData?.addressId ?? `saved-${index}`);

            if (!mapped.address && !mapped.mobile1 && !mapped.recipientName) {
              return null;
            }

            const line2Parts = [mapped.city, mapped.mobile1].filter(Boolean);

            return {
              id,
              title: mapped.recipientName || `Saved Address ${index + 1}`,
              line1: mapped.address || 'No street address',
              line2: line2Parts.join(' | '),
              value: mapped,
            } satisfies SavedDeliveryAddressOption;
          })
          .filter((item): item is SavedDeliveryAddressOption => item !== null);

        setSavedDeliveryAddresses(mappedSavedAddresses);

        if (mappedSavedAddresses.length > 0) {
          setSelectedSavedAddressId((prev) => prev ?? mappedSavedAddresses[0].id);
          setDeliveryAddress((prev) => {
            const hasExistingAddressData =
              Boolean(prev.recipientName.trim()) ||
              Boolean(prev.address.trim()) ||
              Boolean(prev.mobile1.trim()) ||
              Boolean(prev.cityId) ||
              Boolean(prev.city.trim());

            return hasExistingAddressData ? prev : mappedSavedAddresses[0].value;
          });
        }
      } catch (error) {
        console.warn('Failed to prefill address from user profile:', error);
        if (isMounted) {
          setSavedDeliveryAddresses([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAddress(false);
        }
      }
    };

    void loadAddress();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectSavedAddress = (selectedId: string) => {
    const selectedAddress = savedDeliveryAddresses.find((address) => address.id === selectedId);
    if (!selectedAddress) {
      return;
    }

    setSelectedSavedAddressId(selectedId);
    setDeliveryAddress(selectedAddress.value);
    setDeliveryErrors({});
  };

  const handleSelectNewAddress = () => {
    setSelectedSavedAddressId('new');
    setDeliveryAddress(initialDeliveryAddress);
    setDeliveryErrors({});
  };

  useEffect(() => {
    let isMounted = true;

    const loadDeliveryFee = async () => {
      if (!deliveryAddress.cityId || itemCount <= 0) {
        setDeliveryFee(0);
        return;
      }

      try {
        setIsLoadingDeliveryFee(true);
        const response = await axiosInstance.get('/delivery-fees/get-delivery-cost-by-city-id', {
          params: {
            id: deliveryAddress.cityId,
            weight: itemCount,
          },
        });

        const hasError = response.data?.message === 'Error' || response.data?.object == null;
        if (hasError) {
          if (isMounted) {
            setDeliveryFee(0);
          }
          return;
        }

        if (!isMounted) return;
        setDeliveryFee(Number(response.data?.object ?? 0));
      } catch (error) {
        console.warn('Failed to load delivery fee by city:', error);
        if (!isMounted) return;
        setDeliveryFee(0);
      } finally {
        if (isMounted) {
          setIsLoadingDeliveryFee(false);
        }
      }
    };

    void loadDeliveryFee();

    return () => {
      isMounted = false;
    };
  }, [deliveryAddress.cityId, itemCount]);

  const getPaymentIcon = (name: string) => {
    const normalized = name.toLowerCase();
    if (normalized.includes('cash')) return <FaMoneyBillWave />;
    if (normalized.includes('card')) return <FaCreditCard />;
    if (normalized.includes('wallet')) return <FaWallet />;
    return <FaCreditCard />;
  };

  // Only show Cash/COD and Bank Transfer payment options in the UI
  const filteredPaymentTypes = useMemo(() => {
    return paymentTypes.filter((p) => {
      const n = (p.name || '').toLowerCase();
      return n.includes('cash') || n.includes('cod') || n.includes('bank');
    });
  }, [paymentTypes]);

  useEffect(() => {
    if ((selectedPaymentTypeId === null || selectedPaymentTypeId === undefined) && filteredPaymentTypes.length > 0) {
      setSelectedPaymentTypeId(filteredPaymentTypes[0].id);
    }
  }, [filteredPaymentTypes]);

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-amber-50">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-[#F59B0F]"
          >
            <FaArrowLeft />
            Back
          </Link>
          <div className="mt-3 flex items-center gap-3 mb-2">
            <FaShoppingCart className="w-8 h-8 text-[#F59B0F]" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Secure Checkout</h1>
          </div>
          <p className="text-gray-600">Review your {itemCount} {itemCount === 1 ? 'item' : 'items'}, add delivery details, and place your order.</p>
        </div>

        {checkoutItems.length === 0 ? (
          <div className="rounded-2xl border border-orange-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">No items to checkout</h2>
            <p className="mt-2 text-gray-600">Add products to your cart or use Buy Now from a product page.</p>
            <Link
              to="/store"
              className="mt-5 inline-flex rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-3 font-semibold text-white"
            >
              Go to Store
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-linear-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-6 flex items-center gap-3 border border-orange-200">
              <div className="bg-white rounded-full p-2">
                <MdVerifiedUser className="w-6 h-6 text-[#F59B0F]" />
              </div>
              <div>
                <p className="font-semibold text-[#F59B0F]">Trusted Checkout Experience</p>
                <p className="text-xs text-gray-700">Your order details are encrypted and payment is processed securely.</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                {/* <h2 className="text-lg font-bold text-gray-900">Delivery Details</h2> */}
                {isLoadingAddress && (
                  <p className="mt-2 text-xs text-gray-500">Loading saved addresses...</p>
                )}
                {!isLoadingAddress && savedDeliveryAddresses.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {savedDeliveryAddresses.map((savedAddress) => (
                      <button
                        key={savedAddress.id}
                        type="button"
                        onClick={() => handleSelectSavedAddress(savedAddress.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          selectedSavedAddressId === savedAddress.id
                            ? 'border-[#F59B0F] bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-orange-300'
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-800">{savedAddress.title}</p>
                        <p className="mt-1 text-xs text-gray-600">{savedAddress.line1}</p>
                        {savedAddress.line2 && (
                          <p className="mt-1 text-xs text-gray-500">{savedAddress.line2}</p>
                        )}
                      </button>
                    ))}
                    {/* <button
                      type="button"
                      onClick={handleSelectNewAddress}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        selectedSavedAddressId === 'new'
                          ? 'border-[#F59B0F] bg-orange-50'
                          : 'border-dashed border-gray-300 bg-white hover:border-orange-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-800">+ New Address</p>
                      <p className="mt-1 text-xs text-gray-500">Enter different delivery details below</p>
                    </button> */}
                  </div>
                )}
                {!isLoadingAddress && savedDeliveryAddresses.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    No saved delivery addresses found. Please enter delivery details below.
                  </p>
                )}
                <DeliveryAddressForm
                  deliveryAddress={deliveryAddress}
                  onDeliveryAddressChange={handleDeliveryAddressChange}
                  errors={deliveryErrors}
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Payment Method</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {isLoadingPaymentTypes && (
                    <p className="text-sm text-gray-500 sm:col-span-3">Loading payment methods...</p>
                  )}

                  {!isLoadingPaymentTypes && filteredPaymentTypes.length === 0 && (
                    <p className="text-sm text-amber-700 sm:col-span-3">No payment methods available right now.</p>
                  )}

                  {filteredPaymentTypes.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPaymentTypeId(method.id)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        selectedPaymentTypeId === method.id
                          ? 'border-[#F59B0F] bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        {getPaymentIcon(method.name)}
                        {method.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <aside className="rounded-xl p-6 shadow-lg border border-gray-100 sticky top-24 bg-white">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaShoppingCart className="text-[#F59B0F]" />
                Order Summary
              </h2>

              <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
                {checkoutItems.map((item) => (
                  <div key={`${item.stockId ?? item.id}-${item.quantity}`} className="flex items-center gap-3 rounded-xl border border-orange-100 p-2.5">
                    <img src={item.img} alt={item.title} className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-500">Qty {item.quantity} x {formatLkr(item.price)}</p>
                    </div>
                    <p className="text-sm font-bold text-[#AC6C2A]">{formatLkr(item.quantity * item.price)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-orange-200 pt-4 text-sm">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>{formatLkr(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <FaTruck className="text-[#F59B0F]" />
                    Delivery
                  </span>
                  <span>
                    {isLoadingDeliveryFee
                      ? 'Calculating...'
                      : deliveryAddress.cityId
                        ? formatLkr(deliveryFee)
                        : 'Select city'}
                  </span>
                </div>


                <div className="flex justify-between border-t border-orange-200 pt-2 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatLkr(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isSubmittingOrder}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FaCheckCircle />
                {isSubmittingOrder ? 'Placing Order...' : 'Place Order'}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <FaCheckCircle className="text-[#F59B0F]" />
                <span>Secure checkout powered by DeliveryYa</span>
              </div>

              <div className="mt-6 p-4 bg-linear-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2">
                  <MdLocalOffer className="text-[#F59B0F] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-[#AC6C2A] mb-1">Special Offers</p>
                    <p className="text-xs text-gray-600">Get 10% off on your first order over LKR 100. Use code: FIRST10</p>
                  </div>
                </div>
              </div>
            </aside>
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                <div className="text-3xl mb-2">🚚</div>
                <p className="text-xs font-semibold text-gray-800 mb-1">Fast Delivery</p>
                <p className="text-xs text-gray-500">Within 30 minutes</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                <div className="text-3xl mb-2">🔒</div>
                <p className="text-xs font-semibold text-gray-800 mb-1">Secure Payment</p>
                <p className="text-xs text-gray-500">100% Protected</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-xs font-semibold text-gray-800 mb-1">Verified Sellers</p>
                <p className="text-xs text-gray-500">Trusted Partners</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                <div className="text-3xl mb-2">📦</div>
                <p className="text-xs font-semibold text-gray-800 mb-1">Easy Returns</p>
                <p className="text-xs text-gray-500">7-Day Return Policy</p>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />

      <BankTransferSlipModal
        isOpen={isSlipModalOpen}
        onClose={handleCloseSlipModal}
        onSubmit={handleSlipUploadSubmit}
        isSubmitting={isSubmittingSlip}
        marketId={checkoutMarketId ?? undefined}
      />
    </div>
  );
}

export default Checkout;