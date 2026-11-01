import { ClipboardDocumentListIcon, XMarkIcon, BanknotesIcon, CurrencyDollarIcon, CheckCircleIcon, TagIcon, TruckIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { FiMapPin, FiPhone, FiMail, FiTruck, FiClock, FiCheckCircle, FiFlag } from 'react-icons/fi';
import axiosInstance from '../../../util/AxiosUtil';
import { swalAlert } from '../../../util/SwalUtil';
import PaymentProofPreview from './PaymentProofPreview';

type ApiResponse<T> = {
    status: number | null;
    message: string;
    desc: string;
    exData: unknown;
    object: T;
};

type AsyncOption = {
    value: number;
    label: string;
};

type VerificationStatus = {
    id: number;
    name: string;
};

type PaymentRecordPreview = {
    id: number;
    amount: number | null;
    desc: string;
    proofUrl: string;
    paymentTypeId?: number;
    verificationStatus: VerificationStatus;
    bankDetail: {
        id?: number;
        bankName?: string;
        accountNumber?: string;
    } | null;
};

type OrderItem = {
    totalPrice?: number | null;
    deliveryFee?: number | null;
    collectivePrice?: number | null;
    orderCode?: { code?: string | null } | null;
    deliveryTo?: { fullName?: string | null; city?: { name?: string | null } | null } | null;
    paymentStatus?: { name?: string | null } | null;
    paymentType?: { name?: string | null } | null;
    dontCollectDeliveryFeeFromCustomer?: boolean | null;
};

type UrgentJobTask = {
    id: number;
    location?: string | null;
    task?: string | null;
    beAt?: string | null;
    expectedTimeDuration?: number | null;
};

type UrgentJobItem = {
    id: number;
    job?: string | null;
    decs?: string | null;
    cost?: number | null;
    amount?: number | null;
    totalPrice?: number | null;
    mobile?: string | null;
    email?: string | null;
    jobCode?: string | null;
    trip?: number | null;
    vehicleType?: { name?: string | null } | null;
    jobStatus?: { name?: string | null } | null;
    verificationStatus?: { id?: number | null; name?: string | null } | null;
    items?: UrgentJobTask[] | null;
};

interface Props {
    code: string;
    userId: number | null;
    verificationStatuses: VerificationStatus[];
    loadBankDetailOptions: (inputValue: string) => Promise<AsyncOption[]>;
    paymentRecord: PaymentRecordPreview | null;
    onUpdated: () => void;
    onClose: () => void;
    isOpen: boolean;
}

const formatMoney = (value?: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `LKR ${value.toLocaleString()}`;
};

const formatDateTime = (value?: string | null): string => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
};

function PaymentRecodeSingleView({
    code,
    userId,
    verificationStatuses,
    loadBankDetailOptions,
    paymentRecord,
    onUpdated,
    onClose,
    isOpen = false,
}: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [orderDetail, setOrderDetail] = useState<OrderItem | null>(null);
    const [urgentJobDetail, setUrgentJobDetail] = useState<UrgentJobItem | null>(null);
    const [selectedVerificationStatusId, setSelectedVerificationStatusId] = useState<number | null>(null);
    const [selectedBankDetail, setSelectedBankDetail] = useState<AsyncOption | null>(null);
    const [paidAmount, setPaidAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const isOrderCode = code.toUpperCase().startsWith('ORD');
    const isVerifiedSelected = selectedVerificationStatusId === 1;

    useEffect(() => {
        if (!isOpen) return;

        setSelectedVerificationStatusId(paymentRecord?.verificationStatus?.id ?? null);
        setSelectedBankDetail(
            paymentRecord?.bankDetail?.id
                ? {
                    value: Number(paymentRecord.bankDetail.id),
                    label: `${paymentRecord.bankDetail.accountNumber || 'N/A'} / ${paymentRecord.bankDetail.bankName || 'Unknown Bank'}`,
                }
                : null
        );
        setPaidAmount(paymentRecord?.amount ? String(paymentRecord.amount) : '');
        setSubmitError(null);
    }, [isOpen, paymentRecord]);

    useEffect(() => {
        if (!isOpen || !code.trim()) return;

        let isMounted = true;

        const fetchDetails = async () => {
            setIsLoading(true);
            setDetailError(null);
            setOrderDetail(null);
            setUrgentJobDetail(null);

            try {
                if (isOrderCode) {
                    const requestBody = {
                        pageNumber: 0,
                        countPerPage: 10,
                        orderCode: code,
                        userId: userId || null,
                        search: '',
                    };

                    const response = await axiosInstance.post<ApiResponse<{ items?: OrderItem[] }>>('/orders/get-orders', requestBody);
                    const item = response.data.object?.items?.[0] || null;

                    if (isMounted) {
                        setOrderDetail(item);
                        if (!item) setDetailError('No order found for this code.');
                    }
                } else {
                    const requestBody = {
                        pageNumber: 0,
                        countPerPage: 10,
                        jobCode: code,
                        userId: userId || null,
                        search: '',
                    };

                    const response = await axiosInstance.post<ApiResponse<{ items?: UrgentJobItem[] }>>('/urgent-jobs/get-urgent-jobs', requestBody);
                    const item = response.data.object?.items?.[0] || null;

                    if (isMounted) {
                        setUrgentJobDetail(item);
                        if (!item) setDetailError('No urgent job found for this code.');
                    }
                }
            } catch (error) {
                if (isMounted) {
                    console.error('Failed to load details:', error);
                    setDetailError('Failed to load detail data for this payment record.');
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchDetails();

        return () => {
            isMounted = false;
        };
    }, [code, isOpen, isOrderCode, userId]);

    const verificationOptions = useMemo(
        () => verificationStatuses
            .filter((status) => status.id === 1 || status.id === 2 || status.id === 3)
            .map((status) => ({ value: status.id, label: status.name })),
        [verificationStatuses]
    );

    const verifiedAutoAmount = useMemo(() => {
        if (isOrderCode) {
            return orderDetail?.collectivePrice ?? null;
        }

        return urgentJobDetail?.cost ?? urgentJobDetail?.amount ?? urgentJobDetail?.totalPrice ?? paymentRecord?.amount ?? null;
    }, [isOrderCode, orderDetail?.collectivePrice, paymentRecord?.amount, urgentJobDetail?.amount, urgentJobDetail?.cost, urgentJobDetail?.totalPrice]);

    useEffect(() => {
        if (!isVerifiedSelected) return;
        if (verifiedAutoAmount === null || verifiedAutoAmount === undefined) return;
        setPaidAmount(String(verifiedAutoAmount));
    }, [isVerifiedSelected, verifiedAutoAmount]);

    const loadOnlyBankDetailOptions = useCallback(
        async (inputValue: string): Promise<AsyncOption[]> => {
            const options = await loadBankDetailOptions(inputValue);
            return options.filter((option) => option.value > 0);
        },
        [loadBankDetailOptions]
    );

    const handleUpdate = async () => {
        if (!paymentRecord?.id) {
            setSubmitError('Payment record id is missing.');
            return;
        }

        if (!selectedVerificationStatusId) {
            setSubmitError('Please select a verification status.');
            return;
        }

        const proofUrl = paymentRecord.proofUrl?.trim() || 'validation-proof-url';
        const desc = paymentRecord.desc?.trim() || 'Payment validation record';

        const payload: Record<string, unknown> = {
            id: paymentRecord.id,
            proofUrl,
            desc,
            verificationStatus: {
                id: selectedVerificationStatusId,
            },
        };

        if (selectedVerificationStatusId === 1) {
            const numericAmount = Number(paidAmount);
            if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                setSubmitError('Please provide a valid paid amount for verified records.');
                return;
            }

            if (!selectedBankDetail?.value || selectedBankDetail.value <= 0) {
                setSubmitError('Please select a paid bank detail for verified records.');
                return;
            }

            payload.amount = numericAmount;
            payload.bankDetail = { id: selectedBankDetail.value };
            payload.paymentType = { id: paymentRecord.paymentTypeId || 1 };
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const response = await axiosInstance.post<ApiResponse<unknown>>('/payment/update-payment-record', payload);
            const isSuccess = response.data.message?.toLowerCase() === 'success';
            if (!isSuccess) {
                setSubmitError(response.data.desc || 'Failed to update payment record.');
                return;
            }

            await swalAlert('Updated', 'Payment record updated successfully.', 'success');
            onUpdated();
        } catch (error) {
            console.error('Failed to update payment record:', error);
            setSubmitError('Failed to update payment record. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="relative bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#9A5F11] px-6 pb-5 pt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                        title="Close"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                            <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
                        </span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Accounts</p>
                            <h3 className="text-xl font-black text-white">
                                {isOrderCode ? 'Order Payment Detail' : 'Urgent Job Payment Detail'}
                            </h3>
                            <p className="text-xs text-white/80 mt-1">Code: {code}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                    {isLoading && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-semibold">
                            Loading detail data...
                        </div>
                    )}

                    {detailError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {detailError}
                        </div>
                    )}

                    <PaymentProofPreview proofUrl={paymentRecord?.proofUrl} />

                    {isOrderCode && orderDetail && (
                        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-orange-50 via-white to-amber-50 p-4">
                            <h4 className="mb-3 text-sm font-semibold text-gray-700">Order Snapshot</h4>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-3 rounded-md bg-white p-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#F59B0F]">
                                        <TagIcon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <dt className="font-medium text-gray-600 text-xs">Order Code</dt>
                                        <dd className="text-gray-900">{orderDetail.orderCode?.code || code}</dd>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-md bg-white p-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706]">
                                        <ShoppingCartIcon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <dt className="font-medium text-gray-600 text-xs">Order Price</dt>
                                        <dd className="text-gray-900">{formatMoney(orderDetail.totalPrice)}</dd>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-md bg-white p-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#3730A3]">
                                        <TruckIcon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <dt className="font-medium text-gray-600 text-xs">Delivery Fee</dt>
                                        <dd className="text-gray-900">{formatMoney(orderDetail.deliveryFee)}</dd>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-md bg-white p-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
                                        <CurrencyDollarIcon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <dt className="font-medium text-gray-600 text-xs">Collective Price</dt>
                                        <dd className="text-gray-900">{formatMoney(orderDetail.collectivePrice)}</dd>
                                    </div>
                                </div>
                                <div className="sm:col-span-2 flex items-center gap-3 rounded-md bg-white p-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#B45309]">
                                        <BanknotesIcon className="h-5 w-5" />
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 w-full">
                                        <div>
                                            <dt className="font-medium text-gray-600 text-xs">Customer</dt>
                                            <dd className="text-gray-900">{orderDetail.deliveryTo?.fullName || 'N/A'}</dd>
                                        </div>
                                        <div>
                                            <dt className="font-medium text-gray-600 text-xs">Payment Type</dt>
                                            <dd className="text-gray-900">{orderDetail.paymentType?.name || 'N/A'}</dd>
                                        </div>
                                        <div>
                                            <dt className="font-medium text-gray-600 text-xs">City</dt>
                                            <dd className="text-gray-900">{orderDetail.deliveryTo?.city?.name || 'N/A'}</dd>
                                        </div>
                                        <div>
                                            <dt className="font-medium text-gray-600 text-xs">Collect Fee From Customer</dt>
                                            <dd className="text-gray-900">
                                                {orderDetail.dontCollectDeliveryFeeFromCustomer ? 'No' : 'Yes'}
                                            </dd>
                                        </div>
                                    </div>
                                </div>
                            </dl>
                        </div>
                    )}

                    {!isOrderCode && urgentJobDetail && (
                        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-4 space-y-4">
                            <h4 className="text-sm font-semibold text-gray-700">Urgent Job Snapshot</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="rounded-xl bg-white border border-sky-100 p-3 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Job Code</p>
                                    <div className="flex items-center gap-2 text-sm font-bold text-sky-900">
                                        <FiFlag className="h-4 w-4" />
                                        <span>{urgentJobDetail.jobCode || code}</span>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white border border-sky-100 p-3 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Vehicle</p>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <FiTruck className="h-4 w-4 text-cyan-700" />
                                        <span>{urgentJobDetail.vehicleType?.name || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white border border-sky-100 p-3 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Distance</p>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <FiMapPin className="h-4 w-4 text-cyan-700" />
                                        <span>{urgentJobDetail.trip ?? 'N/A'} km</span>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white border border-sky-100 p-3 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Status</p>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <FiCheckCircle className="h-4 w-4 text-emerald-600" />
                                        <span>{urgentJobDetail.jobStatus?.name || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white border border-sky-100 p-4 shadow-sm">
                                <p className="text-xs text-gray-500 mb-1">Job</p>
                                <p className="text-base font-bold text-gray-900">{urgentJobDetail.job || 'N/A'}</p>
                                <p className="text-sm text-gray-600 mt-2">{urgentJobDetail.decs || 'No description available.'}</p>
                                <div className="mt-3 flex flex-col sm:flex-row gap-3 text-sm text-gray-700">
                                    <div className="inline-flex items-center gap-2">
                                        <FiPhone className="h-4 w-4 text-cyan-700" />
                                        <span>{urgentJobDetail.mobile || 'N/A'}</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                        <FiMail className="h-4 w-4 text-cyan-700" />
                                        <span>{urgentJobDetail.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-cyan-100 bg-white p-4">
                                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Task Route</p>
                                <div className="space-y-2">
                                    {(urgentJobDetail.items || []).map((task, index) => (
                                        <div key={task.id} className="rounded-lg bg-cyan-50/70 border border-cyan-100 px-3 py-3">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-800">{task.task || 'N/A'}</p>
                                                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600">
                                                        <FiMapPin className="h-3.5 w-3.5" />
                                                        {task.location || 'N/A'}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <FiClock className="h-3.5 w-3.5" />
                                                            {formatDateTime(task.beAt)}
                                                        </span>
                                                        <span>ETA {task.expectedTimeDuration ?? 'N/A'}h</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700">Verification</h4>
                        {submitError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {submitError}
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                                <Select
                                    options={verificationOptions}
                                    value={verificationOptions.find((option) => option.value === selectedVerificationStatusId) || null}
                                    onChange={(selected) => setSelectedVerificationStatusId(Number(selected?.value) || null)}
                                    placeholder="Select Verification Status"
                                    className="text-sm"
                                    styles={customSelectFieldStyles}
                                />
                            </div>

                            {isVerifiedSelected && (
                                <>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">Paid Bank Detail</label>
                                        <AsyncSelect
                                            cacheOptions
                                            defaultOptions
                                            loadOptions={loadOnlyBankDetailOptions}
                                            value={selectedBankDetail}
                                            onChange={(selected) => setSelectedBankDetail((selected as AsyncOption) || null)}
                                            placeholder="Select bank detail"
                                            className="text-sm"
                                            styles={customSelectFieldStyles}
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-xs font-medium text-gray-600">Paid Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                <CurrencyDollarIcon className="h-5 w-5" />
                                            </span>
                                            <input
                                                type="number"
                                                value={paidAmount}
                                                onChange={(event) => setPaidAmount(event.target.value)}
                                                placeholder="LKR 0.00"
                                                className="w-full h-11 rounded-lg border-2 border-gray-200 px-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59B0F]"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {!isVerifiedSelected && (
                                <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                    Paid amount and bank detail are required only when verification status is set to Verified.
                                </div>
                            )}

                            <div className="sm:col-span-2">
                                <button
                                    type="button"
                                    onClick={handleUpdate}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#F59B0F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D17F0A] disabled:opacity-50"
                                    disabled={isLoading || isSubmitting || !!detailError}
                                >
                                    <CheckCircleIcon className="h-4 w-4" />
                                    <span>{isSubmitting ? 'Updating...' : 'Update Payment Record'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PaymentRecodeSingleView;

const customSelectFieldStyles = {
    control: (base: any, state: any) => ({
        ...base,
        minHeight: 44,
        borderWidth: '2px',
        borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
        borderRadius: '0.55rem',
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
    }),
};
