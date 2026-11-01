import { ClipboardDocumentListIcon, CurrencyDollarIcon, CheckCircleIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import axiosInstance from '../../../util/AxiosUtil';
import { swalAlert } from '../../../util/SwalUtil';
import PaymentProofPreview from './PaymentProofPreview';
import ReferenceOrderCard from './multi_reference/ReferenceOrderCard';
import ReferenceUrgentJobCard from './multi_reference/ReferenceUrgentJobCard';

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
    collectivePrice?: number | null;
    deliveryFee?: number | null;
    orderCode?: { code?: string | null } | null;
    deliveryTo?: { fullName?: string | null; city?: { name?: string | null } | null } | null;
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
    items?: UrgentJobTask[] | null;
};

type ReferenceDetail = {
    code: string;
    kind: 'order' | 'urgent';
    orderDetail: OrderItem | null;
    urgentJobDetail: UrgentJobItem | null;
    error: string | null;
};

interface Props {
    referencesCodes: string[];
    userId: number | null;
    verificationStatuses: VerificationStatus[];
    loadBankDetailOptions: (inputValue: string) => Promise<AsyncOption[]>;
    paymentRecord: PaymentRecordPreview | null;
    onUpdated: () => void;
    onClose: () => void;
    isOpen: boolean;
}

const resolveReferenceKind = (code: string): 'order' | 'urgent' => {
    const normalized = code.trim().toUpperCase();
    if (normalized.startsWith('ORD')) return 'order';
    return 'urgent';
};

const formatMoney = (value?: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `LKR ${value.toLocaleString()}`;
};

function PaymentRecordMultiReferenceView({
    referencesCodes,
    userId,
    verificationStatuses,
    loadBankDetailOptions,
    paymentRecord,
    onUpdated,
    onClose,
    isOpen,
}: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [referenceDetails, setReferenceDetails] = useState<ReferenceDetail[]>([]);
    const [selectedVerificationStatusId, setSelectedVerificationStatusId] = useState<number | null>(null);
    const [selectedBankDetail, setSelectedBankDetail] = useState<AsyncOption | null>(null);
    const [paidAmount, setPaidAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [expandedCodes, setExpandedCodes] = useState<string[]>([]);

    const normalizedCodes = useMemo(
        () => referencesCodes.map((code) => code.trim()).filter((code) => code.length > 0),
        [referencesCodes]
    );

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
        setExpandedCodes([]);
    }, [isOpen, paymentRecord]);

    const toggleExpanded = useCallback((code: string) => {
        setExpandedCodes((current) => {
            if (current.includes(code)) {
                return current.filter((item) => item !== code);
            }
            return [...current, code];
        });
    }, []);

    useEffect(() => {
        if (!isOpen || normalizedCodes.length === 0) return;

        let isMounted = true;

        const fetchDetails = async () => {
            setIsLoading(true);
            setDetailError(null);
            setReferenceDetails([]);

            try {
                const detailResults = await Promise.all(
                    normalizedCodes.map(async (code): Promise<ReferenceDetail> => {
                        const kind = resolveReferenceKind(code);

                        try {
                            if (kind === 'order') {
                                const response = await axiosInstance.post<ApiResponse<{ items?: OrderItem[] }>>('/orders/get-orders', {
                                    pageNumber: 0,
                                    countPerPage: 10,
                                    orderCode: code,
                                    userId: userId || null,
                                    search: '',
                                });

                                const item = response.data.object?.items?.[0] || null;
                                return {
                                    code,
                                    kind,
                                    orderDetail: item,
                                    urgentJobDetail: null,
                                    error: item ? null : 'No order found for this code.',
                                };
                            }

                            const response = await axiosInstance.post<ApiResponse<{ items?: UrgentJobItem[] }>>('/urgent-jobs/get-urgent-jobs', {
                                pageNumber: 0,
                                countPerPage: 10,
                                jobCode: code,
                                userId: userId || null,
                                search: '',
                            });
                            const item = response.data.object?.items?.[0] || null;

                            return {
                                code,
                                kind,
                                orderDetail: null,
                                urgentJobDetail: item,
                                error: item ? null : 'No urgent job found for this code.',
                            };
                        } catch {
                            return {
                                code,
                                kind,
                                orderDetail: null,
                                urgentJobDetail: null,
                                error: 'Failed to load detail data for this reference code.',
                            };
                        }
                    })
                );

                if (!isMounted) return;

                setReferenceDetails(detailResults);
                if (detailResults.every((item) => item.error)) {
                    setDetailError('Unable to load data for all reference codes.');
                }
            } catch {
                if (!isMounted) return;
                setDetailError('Failed to load reference details. Please try again.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchDetails();

        return () => {
            isMounted = false;
        };
    }, [isOpen, normalizedCodes, userId]);

    const verificationOptions = useMemo(
        () => verificationStatuses
            .filter((status) => status.id === 1 || status.id === 2 || status.id === 3)
            .map((status) => ({ value: status.id, label: status.name })),
        [verificationStatuses]
    );

    const totals = useMemo(() => {
        const orderGrandTotal = referenceDetails.reduce((sum, item) => {
            if (item.kind !== 'order') return sum;
            return sum + (item.orderDetail?.totalPrice || 0);
        }, 0);

        const deliveryChargesTotal = referenceDetails.reduce((sum, item) => {
            if (item.kind !== 'order') return sum;
            return sum + (item.orderDetail?.deliveryFee || 0);
        }, 0);

        const collectibleOrderValue = referenceDetails.reduce((sum, item) => {
            if (item.kind !== 'order') return sum;
            return sum + (item.orderDetail?.collectivePrice || 0);
        }, 0);

        const urgentJobChargesTotal = referenceDetails.reduce((sum, item) => {
            if (item.kind !== 'urgent') return sum;
            return sum + (item.urgentJobDetail?.cost || item.urgentJobDetail?.amount || item.urgentJobDetail?.totalPrice || 0);
        }, 0);

        const suggestedSettlementAmount = collectibleOrderValue + urgentJobChargesTotal;

        return {
            orderGrandTotal,
            deliveryChargesTotal,
            collectibleOrderValue,
            urgentJobChargesTotal,
            suggestedSettlementAmount,
        };
    }, [referenceDetails]);

    const verifiedAutoAmount = useMemo(() => {
        if (totals.suggestedSettlementAmount > 0) return totals.suggestedSettlementAmount;
        return paymentRecord?.amount ?? null;
    }, [paymentRecord?.amount, totals.suggestedSettlementAmount]);

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

        const payload: Record<string, unknown> = {
            id: paymentRecord.id,
            proofUrl: paymentRecord.proofUrl?.trim() || 'validation-proof-url',
            desc: paymentRecord.desc?.trim() || 'Payment validation record',
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
        } catch {
            setSubmitError('Failed to update payment record. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
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
                            <h3 className="text-xl font-black text-white">Multi Reference Payment Detail</h3>
                            <p className="text-xs text-white/80 mt-1">
                                {normalizedCodes.length} references linked to one payment proof
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 140px)' }}>
                    {isLoading && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-semibold">
                            Loading order and urgent job details...
                        </div>
                    )}

                    {detailError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {detailError}
                        </div>
                    )}

                    <PaymentProofPreview proofUrl={paymentRecord?.proofUrl} />

                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                        <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">Reference Codes</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {normalizedCodes.map((code) => (
                                <span
                                    key={code}
                                    className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-200"
                                >
                                    {code}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-orange-200 bg-linear-to-br from-orange-50 via-white to-amber-50 p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Financial Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="rounded-lg bg-white border border-orange-100 p-3">
                                <p className="text-xs text-gray-500">Order Gross Total</p>
                                <p className="mt-1 text-sm font-bold text-gray-900">{formatMoney(totals.orderGrandTotal)}</p>
                            </div>
                            <div className="rounded-lg bg-white border border-orange-100 p-3">
                                <p className="text-xs text-gray-500">Delivery Charges Total</p>
                                <p className="mt-1 text-sm font-bold text-gray-900">{formatMoney(totals.deliveryChargesTotal)}</p>
                            </div>
                            <div className="rounded-lg bg-white border border-orange-100 p-3">
                                <p className="text-xs text-gray-500">Collectible Order Value</p>
                                <p className="mt-1 text-sm font-bold text-gray-900">{formatMoney(totals.collectibleOrderValue)}</p>
                            </div>
                            <div className="rounded-lg bg-white border border-orange-100 p-3">
                                <p className="text-xs text-gray-500">Urgent Job Charges Total</p>
                                <p className="mt-1 text-sm font-bold text-gray-900">{formatMoney(totals.urgentJobChargesTotal)}</p>
                            </div>
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                                <p className="text-xs text-emerald-700">Suggested Settlement Amount</p>
                                <p className="mt-1 text-sm font-black text-emerald-800">{formatMoney(totals.suggestedSettlementAmount)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {referenceDetails.map((item) => {
                            const isExpanded = expandedCodes.includes(item.code);
                            const previewAmount = item.kind === 'order'
                                ? item.orderDetail?.collectivePrice ?? item.orderDetail?.totalPrice
                                : item.urgentJobDetail?.cost ?? item.urgentJobDetail?.amount ?? item.urgentJobDetail?.totalPrice;

                            return (
                                <div key={item.code} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpanded(item.code)}
                                        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-orange-50 transition-colors"
                                        aria-expanded={isExpanded}
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900">
                                                {item.kind === 'order' ? 'Order' : 'Urgent Job'}: {item.code}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {item.error ? item.error : `Reference amount: ${formatMoney(previewAmount)}`}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-orange-700">
                                            {isExpanded ? 'Collapse' : 'Expand'}
                                            {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div className="p-3 border-t border-gray-100 bg-gray-50">
                                            {item.kind === 'order' ? (
                                                <ReferenceOrderCard
                                                    code={item.code}
                                                    detail={item.orderDetail}
                                                    error={item.error || undefined}
                                                />
                                            ) : (
                                                <ReferenceUrgentJobCard
                                                    code={item.code}
                                                    detail={item.urgentJobDetail}
                                                    error={item.error || undefined}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700">Confirm or Reject Payment</h4>
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
                                                placeholder={formatMoney(verifiedAutoAmount)}
                                                className="w-full h-11 rounded-lg border-2 border-gray-200 px-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59B0F]"
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Suggested settlement amount: {formatMoney(verifiedAutoAmount)}
                                        </p>
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
                                    disabled={isLoading || isSubmitting || normalizedCodes.length === 0}
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

export default PaymentRecordMultiReferenceView;

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
