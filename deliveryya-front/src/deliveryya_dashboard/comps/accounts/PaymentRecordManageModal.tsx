import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import Select, { type CSSObjectWithLabel, type GroupBase, type StylesConfig } from 'react-select';
import AsyncSelect from 'react-select/async';
import {
    FiAlertTriangle,
    FiCheckCircle,
    FiCreditCard,
    FiDollarSign,
    FiEdit3,
    FiFileText,
    FiInfo,
    FiLoader,
    FiRepeat,
    FiShield,
    FiTag,
    FiTrash2,
} from 'react-icons/fi';
import axiosInstance from '../../../util/AxiosUtil';
import { swalAlert, swalConfirm, swalErrorModal } from '../../../util/SwalUtil';
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

type PaymentType = {
    id: number;
    name: string;
};

type BankDetail = {
    id?: number;
    name?: string;
    bankName?: string;
    accountNumber?: string;
    accNumber?: string;
    bank?: {
        name?: string;
    } | null;
    [key: string]: unknown;
};

type PaymentRecordItem = {
    id?: number;
    code: string;
    note: string;
    amount: number;
    paymentRecordId?: number;
};

type PaymentRecord = {
    id: number;
    amount: number | null;
    desc: string;
    proofUrl: string;
    bankDetail: BankDetail | null;
    verificationStatus: VerificationStatus;
    isReturn: boolean;
    paymentType: PaymentType;
    fromWallet?: WalletType | null;
    toWallet?: WalletType | null;
    fromUserId?: number | null;
    toUserId?: number | null;
    paymentRecordItems?: PaymentRecordItem[];
    createdAt?: string;
    updatedAt?: string;
    madeBy?: string;
};

type WalletType = 'AGENT' | 'COMPANY' | 'CLIENT' | 'CUSTOMER';

type OrderDetail = {
    orderCode?: { code?: string | null } | null;
    totalPrice?: number | null;
    collectivePrice?: number | null;
    deliveryFee?: number | null;
    paidAmount?: number | null;
    paymentStatus?: { name?: string | null } | null;
    paymentType?: { name?: string | null } | null;
};

type ModalMode = 'update' | 'status' | 'delete';

type Props = {
    isOpen: boolean;
    mode: ModalMode;
    allowedModes?: readonly ModalMode[];
    paymentRecord: PaymentRecord | null;
    userId: number | null;
    paymentTypes: PaymentType[];
    verificationStatuses: VerificationStatus[];
    loadBankDetailOptions: (inputValue: string) => Promise<AsyncOption[]>;
    canManagePaymentDirection?: boolean;
    onClose: () => void;
    onUpdated: (keepOpen?: boolean) => void;
};

type EditablePaymentItem = {
    id?: number;
    code: string;
    note: string;
    amount: string;
    paymentRecordId?: number;
};

const modeConfig: Record<ModalMode, { title: string; subtitle: string; icon: ReactNode; actionLabel: string; accent: string }> = {
    update: {
        title: 'Edit payment record',
        subtitle: 'Adjust the record details, supporting items, and proof without overwhelming the form.',
        icon: <FiEdit3 className="h-5 w-5" />,
        actionLabel: 'Save changes',
        accent: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    status: {
        title: 'Verify payment status',
        subtitle: 'Check linked orders first, then choose the verification status with confidence.',
        icon: <FiShield className="h-5 w-5" />,
        actionLabel: 'Apply verification',
        accent: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    delete: {
        title: 'Delete payment record',
        subtitle: 'This is a permanent action. Use it only when the record should be removed.',
        icon: <FiTrash2 className="h-5 w-5" />,
        actionLabel: 'Delete record',
        accent: 'bg-red-50 text-red-700 border-red-200',
    },
};

const modeTabs: Array<{ mode: ModalMode; label: string; description: string; icon: ReactNode }> = [
    {
        mode: 'update',
        label: 'Update',
        description: 'Change amounts, items, or proof',
        icon: <FiEdit3 className="h-4 w-4" />,
    },
    {
        mode: 'status',
        label: 'Verify',
        description: 'Review linked orders and status',
        icon: <FiShield className="h-4 w-4" />,
    },
    {
        mode: 'delete',
        label: 'Delete',
        description: 'Remove the record permanently',
        icon: <FiTrash2 className="h-4 w-4" />,
    },
];

const DEFAULT_ALLOWED_PAYMENT_RECORD_MODES: readonly ModalMode[] = ['update', 'status', 'delete'];

const formatMoney = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return 'LKR 0.00';
    return `LKR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return 'N/A';
    }
};

const brandPrimary = '#FF6347';
const brandFocus = '#F59B0F';

const getBankDetailLabel = (bankDetail: BankDetail): string => {
    const bankName = bankDetail.bankName || bankDetail.bank?.name || bankDetail.name || 'Unknown Bank';
    const accountNumber = bankDetail.accountNumber || bankDetail.accNumber;
    return accountNumber ? `${bankName} (${accountNumber})` : bankName;
};

function PaymentRecordManageModal({ isOpen, mode, allowedModes = DEFAULT_ALLOWED_PAYMENT_RECORD_MODES, paymentRecord, userId, paymentTypes, verificationStatuses, loadBankDetailOptions, canManagePaymentDirection = false, onClose, onUpdated, }: Props) {
    const [activeMode, setActiveMode] = useState<ModalMode>(mode);
    const [desc, setDesc] = useState('');
    const [proofUrl, setProofUrl] = useState('');
    const [isReturn, setIsReturn] = useState<boolean>(false);
    const [paymentTypeId, setPaymentTypeId] = useState<number | null>(null);
    const [selectedBankDetail, setSelectedBankDetail] = useState<AsyncOption | null>(null);
    const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
    const [selectedFromUser, setSelectedFromUser] = useState<AsyncOption | null>(null);
    const [selectedToUser, setSelectedToUser] = useState<AsyncOption | null>(null);
    const [items, setItems] = useState<EditablePaymentItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
    const [showLinkedOrders, setShowLinkedOrders] = useState(false);

    const fieldLabelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500';
    const inputClass = 'w-full h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100';
    const textareaClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100';
    const cardClass = 'rounded-[28px] border border-slate-200 bg-white/95 shadow-sm';

    useEffect(() => {
        if (!isOpen || !paymentRecord) return;

        setActiveMode(allowedModes.includes(mode) ? mode : allowedModes[0] ?? 'update');
        setDesc(paymentRecord.desc || '');
        setProofUrl(paymentRecord.proofUrl || '');
        setIsReturn(Boolean(paymentRecord.isReturn));
        setPaymentTypeId(paymentRecord.paymentType?.id ?? null);
        setSelectedStatusId(paymentRecord.verificationStatus?.id ?? null);
        setSelectedFromUser(paymentRecord.fromUserId ? { value: paymentRecord.fromUserId, label: `From user #${paymentRecord.fromUserId}` } : null);
        setSelectedToUser(paymentRecord.toUserId ? { value: paymentRecord.toUserId, label: `To user #${paymentRecord.toUserId}` } : null);
        setIsSubmitting(false);
        setShowLinkedOrders(false);

        setSelectedBankDetail(
            paymentRecord.bankDetail?.id
                ? {
                    value: Number(paymentRecord.bankDetail.id),
                    label: getBankDetailLabel(paymentRecord.bankDetail),
                }
                : null
        );

        setItems(
            (paymentRecord.paymentRecordItems || []).map((item) => ({
                id: item.id,
                code: item.code || '',
                note: item.note || '',
                amount: String(item.amount ?? 0),
                paymentRecordId: item.paymentRecordId,
            }))
        );
    }, [allowedModes, isOpen, mode, paymentRecord]);

    const selectStyles: StylesConfig<AsyncOption, false, GroupBase<AsyncOption>> = {
        control: (base: CSSObjectWithLabel, state: { isFocused: boolean }) => ({
            ...base,
            minHeight: '42px',
            height: '42px',
            borderRadius: '0.75rem',
            borderWidth: '1px',
            borderColor: state.isFocused ? brandFocus : '#fed7aa',
            boxShadow: state.isFocused ? '0 0 0 4px rgba(245, 155, 15, 0.14)' : 'none',
            backgroundColor: '#ffffff',
            '&:hover': { borderColor: '#fdba74' },
        }),
        valueContainer: (base: CSSObjectWithLabel) => ({
            ...base,
            minHeight: '40px',
            padding: '0 12px',
        }),
        indicatorsContainer: (base: CSSObjectWithLabel) => ({
            ...base,
            height: '40px',
        }),
        menu: (base: CSSObjectWithLabel) => ({
            ...base,
            borderRadius: '0.75rem',
            overflow: 'hidden',
            border: '1px solid #fed7aa',
            boxShadow: '0 18px 34px rgba(15, 23, 42, 0.14)',
        }),
        menuList: (base: CSSObjectWithLabel) => ({
            ...base,
            paddingTop: 6,
            paddingBottom: 6,
            backgroundColor: '#ffffff',
        }),
        option: (base: CSSObjectWithLabel, state: { isSelected: boolean; isFocused: boolean }) => ({
            ...base,
            backgroundColor: state.isSelected ? brandPrimary : state.isFocused ? '#fff7ed' : '#ffffff',
            color: state.isSelected ? '#ffffff' : '#111827',
            fontWeight: 600,
        }),
        placeholder: (base: CSSObjectWithLabel) => ({ ...base, color: '#94a3b8' }),
        singleValue: (base: CSSObjectWithLabel) => ({ ...base, color: '#111827' }),
    };

    const notifyValidation = async (message: string) => {
        await swalAlert('Validation', message, 'warning');
    };

    const notifyMainError = async (message: string) => {
        await swalErrorModal('Operation Failed', message);
    };

    const isVerifiedStatus = (status?: VerificationStatus | null) =>
        status?.name?.trim().toLowerCase() === 'verified' || status?.id === 1;
    const isVerifiedStatusId = (statusId: number | null) =>
        isVerifiedStatus(verificationStatuses.find((status) => status.id === statusId));

    const sanitizedItems = useMemo(() => {
        return items
            .map((item) => ({
                id: item.id,
                code: item.code.trim().toUpperCase(),
                note: item.note.trim(),
                amount: Number(item.amount),
                paymentRecordId: item.paymentRecordId,
            }))
            .filter((item) => item.code && Number.isFinite(item.amount) && item.amount >= 0);
    }, [items]);

    const itemsTotal = useMemo(() => {
        return sanitizedItems.reduce((sum, item) => sum + item.amount, 0);
    }, [sanitizedItems]);

    const amountValue = useMemo(() => itemsTotal, [itemsTotal]);

    const amountDifference = useMemo(() => {
        return itemsTotal - amountValue;
    }, [itemsTotal, amountValue]);

    const orderCodes = useMemo(() => {
        const unique = new Set<string>();
        for (const item of items) {
            const code = item.code.trim().toUpperCase();
            if (code.startsWith('ORD')) unique.add(code);
        }
        return Array.from(unique);
    }, [items]);

    useEffect(() => {
        if (!isOpen || !showLinkedOrders || (activeMode !== 'update' && activeMode !== 'status')) {
            setOrderDetails([]);
            return;
        }

        if (orderCodes.length === 0) {
            setOrderDetails([]);
            return;
        }

        let isMounted = true;

        const fetchOrders = async () => {
            setIsLoadingOrders(true);
            try {
                const results = await Promise.all(
                    orderCodes.map(async (orderCode) => {
                        const requestBody = {
                            pageNumber: 0,
                            countPerPage: 10,
                            userId: userId || null,
                            orderCode,
                            search: '',
                        };

                        const response = await axiosInstance.post<ApiResponse<{ items?: OrderDetail[] }>>('/orders/get-orders', requestBody);
                        return response.data.object?.items?.[0] || null;
                    })
                );

                if (isMounted) {
                    setOrderDetails(results.filter((item): item is OrderDetail => item !== null));
                }
            } catch {
                if (isMounted) {
                    void swalAlert('Heads up', 'Some linked order details could not be loaded right now.', 'warning');
                    setOrderDetails([]);
                }
            } finally {
                if (isMounted) setIsLoadingOrders(false);
            }
        };

        void fetchOrders();

        return () => {
            isMounted = false;
        };
    }, [isOpen, activeMode, orderCodes, userId, showLinkedOrders]);

    const orderSummary = useMemo(() => {
        const totalPrice = orderDetails.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const collective = orderDetails.reduce((sum, order) => sum + (order.collectivePrice || 0), 0);
        const deliveryFee = orderDetails.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
        const paidAmount = orderDetails.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
        const suggestedForPaymentRecord = Math.max(0, collective - paidAmount);

        return {
            totalPrice,
            collective,
            deliveryFee,
            paidAmount,
            suggestedForPaymentRecord,
        };
    }, [orderDetails]);

    const loadOnlyBankDetails = async (inputValue: string): Promise<AsyncOption[]> => {
        const options = await loadBankDetailOptions(inputValue);
        return options.filter((option) => option.value > 0);
    };

    const loadWalletUsers = async (inputValue: string, walletType: WalletType | null): Promise<AsyncOption[]> => {
        if (!walletType || walletType === 'COMPANY' || inputValue.trim().length < 2) return [];
        try {
            const response = await axiosInstance.post<ApiResponse<{ items?: Array<{
                id: number;
                firstName?: string;
                lastName?: string;
                email?: string;
                userRole?: { id?: number; name?: string };
            }> }>>('/users/get-users', {
                pageNumber: 0,
                countPerPage: 25,
                isActive: true,
                search: inputValue.trim(),
            });
            return (response.data.object?.items || [])
                .filter((user) => {
                    const roleId = user.userRole?.id;
                    return walletType === 'AGENT'
                        ? roleId === 7
                        : roleId === 5 || roleId === 8;
                })
                .map((user) => ({
                    value: user.id,
                    label: `${`${user.firstName || ''} ${user.lastName || ''}`.trim() || `User #${user.id}`}${user.email ? ` - ${user.email}` : ''}${user.userRole?.name ? ` (${user.userRole.name})` : ''}`,
                }));
        } catch {
            return [];
        }
    };

    const handleUpdateRecord = async () => {
        if (!paymentRecord?.id) return;
        if (!paymentTypeId) {
            await notifyValidation('Please choose a payment type.');
            return;
        }
        if (!desc.trim()) {
            await notifyValidation('A short description is required.');
            return;
        }
        if (!proofUrl.trim()) {
            await notifyValidation('Please add the proof URL.');
            return;
        }
        if (paymentRecord.fromWallet && paymentRecord.fromWallet !== 'COMPANY' && !selectedFromUser) {
            await notifyValidation('Please select the from-wallet user.');
            return;
        }
        if (paymentRecord.toWallet && paymentRecord.toWallet !== 'COMPANY' && !selectedToUser) {
            await notifyValidation('Please select the to-wallet user.');
            return;
        }
        if ((paymentRecord.paymentRecordItems || []).length > 0 && sanitizedItems.length === 0) {
            await notifyValidation('This record has payment items, but none of them have a valid amount.');
            return;
        }

        if (!Number.isFinite(amountValue) || amountValue < 0) {
            await notifyValidation('Amount must be a valid number.');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            id: paymentRecord.id,
            amount: amountValue,
            desc: desc.trim(),
            proofUrl: proofUrl.trim(),
            paymentType: { id: paymentTypeId },
            bankDetail: selectedBankDetail?.value ? { id: selectedBankDetail.value } : null,
            isReturn: canManagePaymentDirection ? isReturn : paymentRecord.isReturn,
            fromWallet: paymentRecord.fromWallet ?? null,
            toWallet: paymentRecord.toWallet ?? null,
            fromUserId: paymentRecord.fromWallet && paymentRecord.fromWallet !== 'COMPANY'
                ? selectedFromUser?.value ?? null
                : null,
            toUserId: paymentRecord.toWallet && paymentRecord.toWallet !== 'COMPANY'
                ? selectedToUser?.value ?? null
                : null,
            paymentRecordItems: sanitizedItems,
        };

        try {
            const response = await axiosInstance.post<ApiResponse<unknown>>('/payment/update-payment-record', payload);
            setIsSubmitting(false);

            if (response.data.message?.toLowerCase() !== 'success') {
                await notifyMainError(response.data.desc || 'Failed to update the payment record.');
                return;
            }

            void swalAlert('Updated', 'Payment record saved successfully.', 'success');
            onUpdated(!isVerifiedStatus(paymentRecord.verificationStatus));
        } catch {
            setIsSubmitting(false);
            await notifyMainError('Failed to update the payment record. Please try again.');
        }
    };

    const handleUpdateVerificationStatus = async () => {
        if (!paymentRecord?.id) return;
        if (!selectedStatusId) {
            await notifyValidation('Please select a verification status.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await axiosInstance.post<ApiResponse<unknown>>('/payment/update-payment-verification-status-or-delete', {
                paymentRecordId: paymentRecord.id,
                verificationStatusId: selectedStatusId,
            });
            setIsSubmitting(false);

            if (response.data.message?.toLowerCase() !== 'success') {
                await notifyMainError(response.data.desc || 'Failed to update verification status.');
                return;
            }

            void swalAlert('Updated', 'Verification status updated successfully.', 'success');
            onUpdated(!isVerifiedStatusId(selectedStatusId));
        } catch {
            setIsSubmitting(false);
            await notifyMainError('Failed to update verification status. Please try again.');
        }
    };

    const handleDeleteRecord = async () => {
        if (!paymentRecord?.id) return;

        const confirmed = await swalConfirm(
            'Delete Payment Record',
            'This will permanently remove the payment record. Continue?',
            'Delete',
            'Cancel'
        );

        if (!confirmed) return;

        setIsSubmitting(true);

        try {
            const response = await axiosInstance.post<ApiResponse<unknown>>('/payment/update-payment-verification-status-or-delete', {
                paymentRecordId: paymentRecord.id,
                isDeleted: true,
            });
            setIsSubmitting(false);

            if (response.data.message?.toLowerCase() !== 'success') {
                await notifyMainError(response.data.desc || 'Failed to delete payment record.');
                return;
            }

            void swalAlert('Deleted', 'Payment record deleted successfully.', 'success');
            onUpdated();
        } catch {
            setIsSubmitting(false);
            await notifyMainError('Failed to delete payment record. Please try again.');
        }
    };

    if (!paymentRecord) return null;

    const availableModeTabs = modeTabs.filter((tab) => allowedModes.includes(tab.mode));
    const currentMeta = modeConfig[activeMode];
    const recordDirection = paymentRecord.isReturn ? 'Outgoing' : 'Incoming';
    const paymentTypeName = paymentRecord.paymentType?.name || 'N/A';
    const verificationName = paymentRecord.verificationStatus?.name || 'N/A';
    const bankLabel = paymentRecord.bankDetail
        ? getBankDetailLabel(paymentRecord.bankDetail)
        : 'No bank detail attached';

    const amountDeltaLabel = amountDifference === 0
        ? 'Balanced with the item total'
        : amountDifference > 0
            ? `Below item total by ${formatMoney(amountDifference)}`
            : `Above item total by ${formatMoney(Math.abs(amountDifference))}`;

    const sectionTitle = (icon: ReactNode, title: string, subtitle: string) => (
        <div className="mb-4 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-sm shadow-[#AC6C2A]/25">
                {icon}
            </div>
            <div>
                <h4 className="text-lg font-black text-slate-900">{title}</h4>
                <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>
        </div>
    );

    const metricCard = (label: string, value: string, tone: 'neutral' | 'amber' | 'rose' = 'neutral') => {
        const toneClass =
            tone === 'amber'
                ? 'border-orange-200 bg-orange-50 text-orange-900'
                : tone === 'rose'
                    ? 'border-red-200 bg-red-50 text-red-900'
                    : 'border-orange-100 bg-white text-slate-900';

        return (
            <div className={`rounded-2xl border px-3 py-2.5 ${toneClass}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{label}</div>
                <div className="mt-1 text-sm font-bold">{value}</div>
            </div>
        );
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={isSubmitting ? () => undefined : onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto p-3 sm:p-4">
                    <div className="flex min-h-full items-center justify-center">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 scale-[0.98]"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-4 scale-[0.98]"
                        >
                            <DialogPanel className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-orange-200 bg-slate-50 shadow-[0_30px_90px_rgba(255,99,71,0.18)]">
                                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]" />

                                <div className="flex flex-col gap-3 border-b border-orange-100 bg-white/90 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between md:px-5">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg shadow-[#AC6C2A]/25">
                                            {currentMeta.icon}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Payment records</p>
                                            <h3 className="mt-1 text-2xl font-black text-slate-900">Manage record #{paymentRecord.id}</h3>
                                            <p className="mt-0.5 max-w-2xl text-xs text-slate-600">{currentMeta.subtitle}</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                                    <FiCreditCard className="h-3 w-3 text-[#F59B0F]" />
                                                    {paymentTypeName}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                                    <FiShield className="h-3 w-3 text-[#FF6347]" />
                                                    {verificationName}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                                    <FiTag className="h-3 w-3 text-[#FF4500]" />
                                                    {recordDirection}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="self-start rounded-full border border-orange-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                        title="Close"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
                                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-orange-200 bg-white/90 p-2 shadow-sm">
                                        {availableModeTabs.map((tab) => (
                                            <button
                                                key={tab.mode}
                                                type="button"
                                                onClick={() => setActiveMode(tab.mode)}
                                                disabled={isSubmitting}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${activeMode === tab.mode ? 'bg-[#F59B0F] text-white shadow-sm' : 'text-slate-600 hover:bg-orange-50'}`}
                                            >
                                                {tab.icon}
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid gap-4">
                                        <aside className="hidden">
                                            <div className={`${cardClass} border-orange-200 bg-[linear-gradient(180deg,#FFFDF9_0%,#FFFFFF_100%)] p-4`}>
                                                <div className="mb-4 flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Snapshot</p>
                                                        <h4 className="mt-1 text-lg font-black text-slate-900">Record at a glance</h4>
                                                    </div>
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                                        <FiInfo className="h-3.5 w-3.5 text-[#F59B0F]" />
                                                        Quick view
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    {metricCard('Amount', formatMoney(paymentRecord.amount), 'amber')}
                                                    {metricCard('Direction', recordDirection)}
                                                    {metricCard('Type', paymentTypeName)}
                                                    {metricCard('Verification', verificationName)}
                                                    {metricCard('Bank detail', bankLabel)}
                                                </div>

                                                <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-sm text-slate-600">
                                                    <p className="font-semibold text-slate-900">Description</p>
                                                    <p className="mt-1 leading-6">{paymentRecord.desc || 'No description provided.'}</p>
                                                </div>
                                            </div>

                                            <div className={`${cardClass} border-orange-200 bg-white/95 p-3`}>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mode</p>
                                                <h4 className="mt-1 text-lg font-black text-slate-900">Choose the task</h4>
                                                <div className="mt-3 grid gap-1.5">
                                                {availableModeTabs.map((tab) => {
                                                        const isActive = activeMode === tab.mode;

                                                        return (
                                                            <button
                                                                key={tab.mode}
                                                                type="button"
                                                                onClick={() => setActiveMode(tab.mode)}
                                                                disabled={isSubmitting}
                                                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${isActive ? 'border-transparent bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg shadow-[#AC6C2A]/25' : 'border-orange-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/70'}`}
                                                            >
                                                                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? 'bg-white/15 text-white' : 'bg-orange-100 text-[#FF6347]'}`}>
                                                                    {tab.icon}
                                                                </span>
                                                                <span className="min-w-0">
                                                                    <span className="block text-sm font-bold">{tab.label}</span>
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className={`${cardClass} border-orange-200 bg-white/95 p-4`}>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Activity</p>
                                                <h4 className="mt-1 text-lg font-black text-slate-900">Record details</h4>
                                                <div className="mt-4 space-y-3 text-sm text-slate-700">
                                                    <p><span className="font-semibold text-slate-900">Created:</span> {formatDateTime(paymentRecord.createdAt)}</p>
                                                    <p><span className="font-semibold text-slate-900">Updated:</span> {formatDateTime(paymentRecord.updatedAt)}</p>
                                                    <p><span className="font-semibold text-slate-900">Made by:</span> {paymentRecord.madeBy || 'N/A'}</p>
                                                    <div className="rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-slate-600">
                                                        Keep the actions on the right side focused on one goal at a time. The summary above gives you the most important context first.
                                                    </div>
                                                </div>
                                            </div>
                                        </aside>

                                        <main className="mx-auto w-full max-w-4xl space-y-3">
                                            <div className="grid gap-2 sm:grid-cols-4">
                                                {metricCard('Amount', formatMoney(paymentRecord.amount), 'amber')}
                                                {metricCard('Items', String(items.length))}
                                                {metricCard('Bank', bankLabel)}
                                                {metricCard('Direction', recordDirection)}
                                            </div>
                                            <details className="rounded-2xl border border-orange-200 bg-white px-4 py-3 shadow-sm">
                                                <summary className="cursor-pointer text-sm font-bold text-slate-800">View payment proof</summary>
                                                <div className="mt-3">
                                                    <PaymentProofPreview proofUrl={paymentRecord.proofUrl} compact />
                                                </div>
                                            </details>

                                            {(activeMode === 'update' || activeMode === 'status') && (
                                                <div className={`${cardClass} border-orange-200 bg-white/95 p-4`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowLinkedOrders((current) => !current)}
                                                        className="flex w-full items-center justify-between gap-3 text-left"
                                                    >
                                                        <span className="flex items-center gap-3">
                                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#F59B0F]">
                                                                <FiInfo className="h-4 w-4" />
                                                            </span>
                                                            <span>
                                                                <span className="block text-base font-black text-slate-900">Linked orders</span>
                                                                <span className="block text-xs text-slate-500">{orderCodes.length} order reference{orderCodes.length === 1 ? '' : 's'} · click to review</span>
                                                            </span>
                                                        </span>
                                                        <span className="text-xs font-bold text-orange-700">{showLinkedOrders ? 'Hide' : 'Review'}</span>
                                                    </button>

                                                    {showLinkedOrders && orderCodes.length > 0 && (
                                                        <div className="mb-4 flex flex-wrap gap-2">
                                                            {orderCodes.map((code) => (
                                                                <span key={code} className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                                                    <FiTag className="h-3.5 w-3.5 text-[#FF6347]" />
                                                                    {code}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {showLinkedOrders && isLoadingOrders ? (
                                                        <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                                                            <FiLoader className="h-4 w-4 animate-spin text-[#F59B0F]" />
                                                            Loading linked order details...
                                                        </div>
                                                    ) : showLinkedOrders && orderDetails.length === 0 ? (
                                                        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-4 text-sm text-slate-600">
                                                            No linked <span className="font-semibold">ORD</span> codes were found in the items yet. Add one or more order codes to enable verification support.
                                                        </div>
                                                    ) : showLinkedOrders ? (
                                                        <div className="space-y-4">
                                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                                                {metricCard('Total price', formatMoney(orderSummary.totalPrice))}
                                                                {metricCard('Collective', formatMoney(orderSummary.collective))}
                                                                {metricCard('Delivery fee', formatMoney(orderSummary.deliveryFee))}
                                                                {metricCard('Paid amount', formatMoney(orderSummary.paidAmount))}
                                                                {metricCard('Suggested record amount', formatMoney(orderSummary.suggestedForPaymentRecord), 'amber')}
                                                            </div>

                                                            <div className="overflow-x-auto rounded-2xl border border-orange-100">
                                                                <table className="min-w-full text-left text-sm">
                                                                    <thead className="bg-orange-50 text-slate-600">
                                                                        <tr>
                                                                            <th className="px-4 py-3 font-semibold">Code</th>
                                                                            <th className="px-4 py-3 font-semibold">Total</th>
                                                                            <th className="px-4 py-3 font-semibold">Collective</th>
                                                                            <th className="px-4 py-3 font-semibold">Delivery fee</th>
                                                                            <th className="px-4 py-3 font-semibold">Payment type</th>
                                                                            <th className="px-4 py-3 font-semibold">Paid</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-orange-50 bg-white text-slate-700">
                                                                        {orderDetails.map((order, index) => (
                                                                            <tr key={`${order.orderCode?.code || 'order'}-${index}`}>
                                                                                <td className="px-4 py-3 font-semibold text-slate-900">{order.orderCode?.code || '-'}</td>
                                                                                <td className="px-4 py-3">{formatMoney(order.totalPrice)}</td>
                                                                                <td className="px-4 py-3">{formatMoney(order.collectivePrice)}</td>
                                                                                <td className="px-4 py-3">{formatMoney(order.deliveryFee)}</td>
                                                                                <td className="px-4 py-3">{order.paymentType?.name || 'N/A'}</td>
                                                                                <td className="px-4 py-3">{formatMoney(order.paidAmount)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}

                                            <Transition
                                                appear
                                                show={activeMode === 'update'}
                                                enter="transition-all duration-300"
                                                enterFrom="opacity-0 translate-y-2"
                                                enterTo="opacity-100 translate-y-0"
                                                leave="transition-all duration-200"
                                                leaveFrom="opacity-100 translate-y-0"
                                                leaveTo="opacity-0 translate-y-2"
                                            >
                                                <div className={`${cardClass} border-orange-200 bg-white/95 p-4`}>
                                                    {sectionTitle(<FiEdit3 className="h-5 w-5" />, 'Update details', 'Make the smallest accurate change needed, then verify the total against the items below.')}

                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <div>
                                                            <label className={fieldLabelClass}>Calculated amount</label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={amountValue.toFixed(2)}
                                                                readOnly
                                                                className={`${inputClass} bg-slate-50 font-bold text-slate-700`}
                                                                placeholder="Calculated from items"
                                                            />
                                                        </div>

                                                        {canManagePaymentDirection ? (
                                                            <div>
                                                                <label className={fieldLabelClass}>Payment kind</label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsReturn(false)}
                                                                        className={`h-[40px] rounded-xl text-sm font-bold transition ${!isReturn
                                                                            ? 'border border-[#15803D] bg-[#15803D] text-white shadow-sm'
                                                                            : 'border border-slate-200 bg-white text-slate-500 hover:border-[#86EFAC] hover:bg-[#F0FDF4] hover:text-[#166534]'}`}
                                                                    >
                                                                        <ArrowTrendingUpIcon className="mr-1.5 inline h-4 w-4" aria-hidden="true" />Income
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsReturn(true)}
                                                                        className={`h-[40px] rounded-xl text-sm font-bold transition ${isReturn
                                                                            ? 'border border-[#B91C1C] bg-[#B91C1C] text-white shadow-sm'
                                                                            : 'border border-slate-200 bg-white text-slate-500 hover:border-[#FCA5A5] hover:bg-[#FEF2F2] hover:text-[#991B1B]'}`}
                                                                    >
                                                                        <ArrowTrendingDownIcon className="mr-1.5 inline h-4 w-4" aria-hidden="true" />Expense
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <label className={fieldLabelClass}>Payment kind</label>
                                                                <div className="flex h-[42px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
                                                                    {paymentRecord.isReturn ? 'Expense' : 'Income'}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div>
                                                            <label className={fieldLabelClass}>Payment type</label>
                                                            <Select
                                                                options={paymentTypes.map((type) => ({ value: type.id, label: type.name }))}
                                                                value={paymentTypeId ? { value: paymentTypeId, label: paymentTypes.find((type) => type.id === paymentTypeId)?.name || String(paymentTypeId) } : null}
                                                                onChange={(selected) => setPaymentTypeId(selected?.value ?? null)}
                                                                placeholder="Select payment type..."
                                                                styles={selectStyles}
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className={fieldLabelClass}>Bank detail</label>
                                                            <AsyncSelect
                                                                cacheOptions
                                                                defaultOptions
                                                                loadOptions={loadOnlyBankDetails}
                                                                value={selectedBankDetail}
                                                                onChange={(selected) => setSelectedBankDetail(selected)}
                                                                placeholder="Attach a bank detail..."
                                                                styles={selectStyles}
                                                            />
                                                        </div>

                                                        {paymentRecord.fromWallet && paymentRecord.fromWallet !== 'COMPANY' && (
                                                            <div>
                                                                <label className={fieldLabelClass}>From user</label>
                                                                <AsyncSelect
                                                                    cacheOptions
                                                                    loadOptions={(inputValue) => loadWalletUsers(inputValue, paymentRecord.fromWallet ?? null)}
                                                                    value={selectedFromUser}
                                                                    onChange={(selected) => setSelectedFromUser(selected)}
                                                                    placeholder="Search from-wallet user..."
                                                                    styles={selectStyles}
                                                                    isClearable
                                                                />
                                                            </div>
                                                        )}

                                                        {paymentRecord.toWallet && paymentRecord.toWallet !== 'COMPANY' && (
                                                            <div>
                                                                <label className={fieldLabelClass}>To user</label>
                                                                <AsyncSelect
                                                                    cacheOptions
                                                                    loadOptions={(inputValue) => loadWalletUsers(inputValue, paymentRecord.toWallet ?? null)}
                                                                    value={selectedToUser}
                                                                    onChange={(selected) => setSelectedToUser(selected)}
                                                                    placeholder="Search to-wallet user..."
                                                                    styles={selectStyles}
                                                                    isClearable
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-4">
                                                        <label className={fieldLabelClass}>
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <FiFileText className="h-4 w-4" />
                                                                Description
                                                            </span>
                                                        </label>
                                                        <textarea
                                                            value={desc}
                                                            onChange={(event) => setDesc(event.target.value)}
                                                            rows={4}
                                                            maxLength={150}
                                                            className={textareaClass}
                                                            placeholder="Add a short, clear note about this payment"
                                                        />
                                                    </div>

                                                    <div className="mt-4 rounded-3xl border border-orange-100 bg-orange-50/40">
                                                        <div className="flex items-center justify-between gap-3 border-b border-orange-100 px-4 py-3">
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900">Payment items</p>
                                                                <p className="mt-0.5 text-xs text-slate-500">Linked item codes and notes are fixed here; only recorded amounts can be adjusted.</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3 p-4">
                                                            {items.length === 0 && (
                                                                <div className="rounded-2xl border border-dashed border-orange-200 bg-white px-4 py-5 text-sm text-slate-500">
                                                                    No payment items are attached to this record.
                                                                </div>
                                                            )}

                                                            {items.map((item, index) => (
                                                                <div key={`${index}-${item.code}`} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-12 md:items-center">
                                                                    <div className="md:col-span-3">
                                                                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Code</p>
                                                                        <div className="flex min-h-[48px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800">
                                                                            {item.code || 'N/A'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="md:col-span-6">
                                                                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Note</p>
                                                                        <div className="flex min-h-[48px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
                                                                            {item.note || 'No note'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="md:col-span-3">
                                                                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Amount</p>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={item.amount}
                                                                            onChange={(event) => {
                                                                                const next = [...items];
                                                                                next[index] = { ...next[index], amount: event.target.value };
                                                                                setItems(next);
                                                                            }}
                                                                            placeholder="Amount"
                                                                            className={inputClass}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                                        {metricCard('Items total', formatMoney(itemsTotal), 'amber')}
                                                        {metricCard('Current amount', formatMoney(amountValue))}
                                                        {metricCard('Balance check', amountDeltaLabel, amountDifference === 0 ? 'amber' : amountDifference < 0 ? 'rose' : 'neutral')}
                                                    </div>

                                                    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${amountDifference === 0 ? 'border-orange-200 bg-orange-50 text-orange-900' : amountDifference < 0 ? 'border-red-200 bg-red-50 text-red-900' : 'border-orange-200 bg-orange-50/70 text-orange-900'}`}>
                                                        <div className="inline-flex items-center gap-2 font-semibold">
                                                            <FiDollarSign className="h-4 w-4 text-[#FF6347]" />
                                                            Calculated record amount: {formatMoney(itemsTotal)}
                                                        </div>
                                                        <p className="mt-1 text-sm leading-6 opacity-90">
                                                            The record amount is calculated automatically from the payment item amounts and cannot be entered manually.
                                                        </p>
                                                    </div>

                                                    <div className="sticky bottom-0 -mx-4 mt-4 flex justify-end border-t border-orange-100 bg-white/95 px-4 py-3 backdrop-blur">
                                                        <button
                                                            type="button"
                                                            onClick={handleUpdateRecord}
                                                            disabled={isSubmitting}
                                                            className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#AC6C2A]/25 transition hover:-translate-y-0.5 hover:from-[#AC6C2A] hover:to-[#F59B0F] disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <FiCheckCircle className="h-4 w-4" />
                                                            Save changes
                                                        </button>
                                                    </div>
                                                </div>
                                            </Transition>

                                            <Transition
                                                appear
                                                show={activeMode === 'status'}
                                                enter="transition-all duration-300"
                                                enterFrom="opacity-0 translate-y-2"
                                                enterTo="opacity-100 translate-y-0"
                                                leave="transition-all duration-200"
                                                leaveFrom="opacity-100 translate-y-0"
                                                leaveTo="opacity-0 translate-y-2"
                                            >
                                                <div className={`${cardClass} border-orange-200 bg-white/95 p-5`}>
                                                    {sectionTitle(<FiShield className="h-5 w-5" />, 'Verification status', 'Check the supporting numbers first, then apply the status change.')}

                                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                                                        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-sm text-slate-600">
                                                            <p className="font-semibold text-slate-900">What to look at</p>
                                                            <ul className="mt-2 space-y-2 leading-6">
                                                                <li>• Compare the linked order totals with the payment amount.</li>
                                                                <li>• Confirm the proof URL and attached bank detail are correct.</li>
                                                                <li>• Choose the verification status only after the record is clear.</li>
                                                            </ul>
                                                        </div>

                                                        <div>
                                                            <label className={fieldLabelClass}>Verification status</label>
                                                            <Select
                                                                options={verificationStatuses.map((status) => ({ value: status.id, label: status.name }))}
                                                                value={selectedStatusId ? { value: selectedStatusId, label: verificationStatuses.find((status) => status.id === selectedStatusId)?.name || String(selectedStatusId) } : null}
                                                                onChange={(selected) => setSelectedStatusId(selected?.value ?? null)}
                                                                placeholder="Select status..."
                                                                styles={selectStyles}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                                        {metricCard('Items total', formatMoney(itemsTotal))}
                                                        {metricCard('Record amount', formatMoney(amountValue), 'amber')}
                                                        {metricCard('Order suggestion', formatMoney(orderSummary.suggestedForPaymentRecord))}
                                                    </div>

                                                    <div className="sticky bottom-0 -mx-4 mt-4 flex justify-end border-t border-orange-100 bg-white/95 px-4 py-3 backdrop-blur">
                                                        <button
                                                            type="button"
                                                            onClick={handleUpdateVerificationStatus}
                                                            disabled={isSubmitting}
                                                            className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-orange-800 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <FiRepeat className="h-4 w-4 text-[#FF6347]" />
                                                            Apply verification
                                                        </button>
                                                    </div>
                                                </div>
                                            </Transition>

                                            <Transition
                                                appear
                                                show={activeMode === 'delete'}
                                                enter="transition-all duration-300"
                                                enterFrom="opacity-0 translate-y-2"
                                                enterTo="opacity-100 translate-y-0"
                                                leave="transition-all duration-200"
                                                leaveFrom="opacity-100 translate-y-0"
                                                leaveTo="opacity-0 translate-y-2"
                                            >
                                                <div className={`${cardClass} border-orange-200 bg-white/95 p-5`}>
                                                    {sectionTitle(<FiTrash2 className="h-5 w-5" />, 'Delete record', 'This clears the record permanently, so the interface makes the risk explicit.')}

                                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                                        <div className="inline-flex items-center gap-2 font-semibold">
                                                            <FiAlertTriangle className="h-4 w-4" />
                                                            Permanent deletion warning
                                                        </div>
                                                        <p className="mt-2 leading-6">
                                                            If the backend blocks the delete action, you will see the reason after confirmation. Only continue when the record should truly be removed.
                                                        </p>
                                                    </div>

                                                    <div className="sticky bottom-0 -mx-4 mt-4 flex justify-end border-t border-red-100 bg-white/95 px-4 py-3 backdrop-blur">
                                                        <button
                                                            type="button"
                                                            onClick={handleDeleteRecord}
                                                            disabled={isSubmitting}
                                                            className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#AC6C2A]/25 transition hover:-translate-y-0.5 hover:from-[#AC6C2A] hover:to-[#F59B0F] disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <FiTrash2 className="h-4 w-4" />
                                                            Delete record
                                                        </button>
                                                    </div>
                                                </div>
                                            </Transition>
                                        </main>
                                    </div>
                                </div>

                                {isSubmitting && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
                                        <div className="w-[min(92%,420px)] rounded-[28px] border border-orange-200 bg-white px-6 py-5 text-center shadow-2xl shadow-[#FF6347]/10 animate-pulse">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#FF6347]">
                                                <FiLoader className="h-6 w-6 animate-spin" />
                                            </div>
                                            <p className="font-black text-slate-900">Processing</p>
                                            <p className="mt-1 text-sm text-slate-600">{currentMeta.title}</p>
                                        </div>
                                    </div>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export default PaymentRecordManageModal;
