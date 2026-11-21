import {
    ArrowLeftIcon,
    ArrowTopRightOnSquareIcon,
    ArrowTrendingDownIcon,
    ArrowTrendingUpIcon,
    ArrowUpTrayIcon,
    CheckCircleIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import AsyncSelect from 'react-select/async';
import Select from 'react-select';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../../util/AxiosUtil';
import { getCompanyBankDetailOptions, type BankDetailOption } from '../../../services/BankDetailService';
import { swalAlert, swalErrorModal } from '../../../util/SwalUtil';
import { buildProofUploadFile, uploadProofToStorage } from '../../../util/PaymentProofUtil';
import JwtUtil from '../../../util/JwtUtil';

type ApiResponse<T> = { message?: string; desc?: string; object?: T };
type Option = { value: number; label: string; roleId?: number };
type WalletType = 'AGENT' | 'COMPANY' | 'CLIENT' | 'CUSTOMER';
type PaymentItem = {
    code: string;
    note: string;
    amount: string;
    selected: boolean;
    verified: boolean;
    verificationMessage: string;
};

const walletOptions: Array<{ value: WalletType; label: string }> = [
    { value: 'COMPANY', label: 'Company' },
    { value: 'AGENT', label: 'Agent' },
    { value: 'CLIENT', label: 'Client / Market owner' },
    { value: 'CUSTOMER', label: 'Customer' },
];

const selectStyles = {
    control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
        ...base,
        minHeight: 42,
        height: 42,
        borderRadius: 12,
        borderColor: state.isFocused ? '#F59B0F' : '#e2e8f0',
        boxShadow: state.isFocused ? '0 0 0 4px rgba(245, 155, 15, .12)' : 'none',
        '&:hover': { borderColor: '#fdba74' },
    }),
    valueContainer: (base: Record<string, unknown>) => ({
        ...base,
        minHeight: 40,
        padding: '0 12px',
    }),
    indicatorsContainer: (base: Record<string, unknown>) => ({
        ...base,
        height: 40,
    }),
    menu: (base: Record<string, unknown>) => ({
        ...base,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #fed7aa',
        boxShadow: '0 18px 34px rgba(15, 23, 42, 0.14)',
    }),
    menuList: (base: Record<string, unknown>) => ({
        ...base,
        paddingTop: 6,
        paddingBottom: 6,
        backgroundColor: '#ffffff',
    }),
    option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
        ...base,
        backgroundColor: state.isSelected ? '#FF6347' : state.isFocused ? '#fff7ed' : '#ffffff',
        color: state.isSelected ? '#ffffff' : '#111827',
        fontWeight: 600,
    }),
    placeholder: (base: Record<string, unknown>) => ({ ...base, color: '#94a3b8' }),
    singleValue: (base: Record<string, unknown>) => ({ ...base, color: '#111827' }),
};

const emptyItem = (): PaymentItem => ({
    code: '',
    note: '',
    amount: '',
    selected: true,
    verified: false,
    verificationMessage: '',
});

function PaymentRecordCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as {
        fromWallet?: WalletType;
        toWallet?: WalletType;
        toUserId?: string;
        toUserName?: string;
        orderCodes?: Array<{ code: string; amount: string; note: string }>;
        settlementReportFile?: File;
        description?: string;
    } | null;

    const [paymentTypes, setPaymentTypes] = useState<Option[]>([]);
    const [categories, setCategories] = useState<Option[]>([]);
    const [paymentType, setPaymentType] = useState<Option | null>(null);
    const [category, setCategory] = useState<Option | null>(null);
    const [bankDetail, setBankDetail] = useState<BankDetailOption | null>(null);
    const [fromWallet, setFromWallet] = useState<WalletType | null>(state?.fromWallet || null);
    const [toWallet, setToWallet] = useState<WalletType | null>(state?.toWallet || null);
    const [fromUser, setFromUser] = useState<Option | null>(null);
    const [toUser, setToUser] = useState<Option | null>(null);
    const [description, setDescription] = useState(state?.description || '');
    const isFromSettlement = Boolean(state?.orderCodes?.length);
    const [proofFiles, setProofFiles] = useState<File[]>(state?.settlementReportFile ? [state.settlementReportFile] : []);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [isReturn, setIsReturn] = useState(Boolean(state?.orderCodes?.length));
    const [items, setItems] = useState<PaymentItem[]>(
        state?.orderCodes && state.orderCodes.length > 0
            ? state.orderCodes.map((code) => ({
                code: code.code,
                note: code.note,
                amount: code.amount,
                selected: true,
                verified: false,
                verificationMessage: '',
            }))
            : [emptyItem()]
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        if (!isSubmitting) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSubmitting]);

    const fromUserRequired = fromWallet !== null && fromWallet !== 'COMPANY';
    const toUserRequired = toWallet !== null && toWallet !== 'COMPANY';
    const itemsTotal = useMemo(
        () => items
            .filter((item) => item.selected)
            .reduce((total, item) => total + (Number(item.amount) || 0), 0),
        [items],
    );
    const isOtherCategory = category?.value === 10;
    const bankDetailRequired = paymentType?.value === 2 || paymentType?.value === 3;
    const settlementReportPreviewUrl = useMemo(
        () => state?.settlementReportFile ? URL.createObjectURL(state.settlementReportFile) : '',
        [state?.settlementReportFile],
    );

    useEffect(() => () => {
        if (settlementReportPreviewUrl) URL.revokeObjectURL(settlementReportPreviewUrl);
    }, [settlementReportPreviewUrl]);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [typesResponse, categoriesResponse] = await Promise.all([
                    axiosInstance.get<ApiResponse<Array<{ id: number; name: string }>>>('/payment/get-payment-types'),
                    axiosInstance.get<ApiResponse<Array<{ id: number; name: string }>>>('/payment/get-payment-categories'),
                ]);
                setPaymentTypes((typesResponse.data.object || []).map((item) => ({ value: item.id, label: item.name })));
                setCategories((categoriesResponse.data.object || []).map((item) => ({ value: item.id, label: item.name })));
            } catch {
                await swalErrorModal('Unable to load payment options', 'Payment types and categories could not be loaded.');
            } finally {
                setIsLoading(false);
            }
        };
        void loadOptions();
    }, []);

    useEffect(() => {
        if (!isFromSettlement || categories.length === 0) return;
        setCategory(categories.find((option) => option.value === 9) || { value: 9, label: 'Settlement' });
        setFromWallet('COMPANY');
        setToWallet('CLIENT');
        setIsReturn(true);
    }, [categories, isFromSettlement]);

    useEffect(() => {
        if (!isFromSettlement || !bankDetailRequired || bankDetail) return;
        void getCompanyBankDetailOptions('').then((options) => setBankDetail(options[0] || null));
    }, [bankDetail, bankDetailRequired, isFromSettlement]);

    useEffect(() => {
        if (state?.toUserId && state?.toUserName) {
            setToUser({
                value: Number(state.toUserId),
                label: state.toUserName,
            });
        }
    }, [state]);

    const loadBankDetails = async (input: string) => getCompanyBankDetailOptions(input);

    const loadUsers = async (input: string, walletType: WalletType): Promise<Option[]> => {
        if (input.trim().length < 2) return [];
        try {
            const response = await axiosInstance.post<ApiResponse<{ items?: Array<{
                id: number;
                firstName?: string;
                lastName?: string;
                email?: string;
                userRole?: { id?: number; name?: string };
            }> }>>(
                '/users/get-users',
                { pageNumber: 0, countPerPage: 25, isActive: true, search: input.trim() },
            );
            return (response.data.object?.items || [])
                .filter((user) => {
                    const roleId = user.userRole?.id;
                    return walletType === 'AGENT'
                        ? roleId === 7
                        : roleId === 5 || roleId === 8;
                })
                .map((user) => ({
                    value: user.id,
                    roleId: user.userRole?.id,
                    label: `${`${user.firstName || ''} ${user.lastName || ''}`.trim() || `User #${user.id}`}${user.email ? ` - ${user.email}` : ''}${user.userRole?.name ? ` (${user.userRole.name})` : ''}`,
                }));
        } catch {
            return [];
        }
    };

    const updateItem = (index: number, patch: Partial<PaymentItem>) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };

    const verifySelectedItems = async () => {
        const selectedIndexes = items
            .map((item, index) => item.selected ? index : -1)
            .filter((index) => index >= 0);

        if (selectedIndexes.length === 0) {
            await swalAlert('Select items', 'Select at least one item to verify.', 'warning');
            return;
        }

        setIsVerifying(true);

        const results = await Promise.all(selectedIndexes.map(async (index) => {
            const code = items[index].code.trim().toUpperCase();
            try {
                const response = await axiosInstance.post<ApiResponse<{ code: string; label: string }>>(
                    '/payment/validate-payment-reference',
                    { code },
                );
                if (response.data.message?.toLowerCase() !== 'success' || !response.data.object) {
                    return {
                        index,
                        code,
                        verified: false,
                        message: response.data.desc || `Reference ${code} could not be found.`,
                    };
                }
                return {
                    index,
                    code: response.data.object.code,
                    verified: true,
                    message: 'Verified',
                };
            } catch (error) {
                const axiosError = error as { response?: { data?: { desc?: string } } };
                const message = axiosError.response?.data?.desc || `Reference ${code} does not exist.`;
                return { index, code, verified: false, message };
            }
        }));

        setItems((current) => current.map((item, index) => {
            const result = results.find((verifiedItem) => verifiedItem.index === index);
            return result
                ? { ...item, code: result.code, verified: result.verified, verificationMessage: result.message }
                : item;
        }));

        const validCount = results.filter((result) => result.verified).length;
        const invalidCount = results.length - validCount;
        if (invalidCount === 0) {
            await swalAlert('Verified', `${validCount} payment item reference${validCount === 1 ? '' : 's'} verified successfully.`, 'success');
        } else {
            await swalAlert(
                'Some references were not found',
                `${validCount} verified; ${invalidCount} shown below in yellow need attention.`,
                'warning',
            );
        }
        setIsVerifying(false);
    };

    const handleSubmit = async () => {
        const selectedItems = items.filter((item) => item.selected);
        const validItems = selectedItems
            .map((item) => ({ code: item.code.trim().toUpperCase(), note: item.note.trim(), amount: Number(item.amount) }));
        const amountValue = validItems.reduce((total, item) => total + item.amount, 0);

        if (!paymentType) return void swalAlert('Required field', 'Please select a payment type.', 'warning');
        if (!category) return void swalAlert('Required field', 'Please select a payment category.', 'warning');
        if (isFromSettlement && category.value !== 9) return void swalAlert('Invalid category', 'Settlement payments must use payment category 9.', 'warning');
        if (bankDetailRequired && !bankDetail) return void swalAlert('Required field', 'Please select a bank detail for this payment type.', 'warning');
        if (!bankDetailRequired) setBankDetail(null);
        if (isOtherCategory && !description.trim()) return void swalAlert('Required field', 'Description is required for the Other payment category.', 'warning');
        if (!description.trim()) return void swalAlert('Required field', 'Please enter a payment description.', 'warning');
        if (proofFiles.length === 0) return void swalAlert('Required field', 'Please upload at least one payment proof file.', 'warning');
        if (!Number.isFinite(amountValue) || amountValue < 0) return void swalAlert('Invalid amount', 'Enter a valid payment amount.', 'warning');
        if (selectedItems.length === 0) return void swalAlert('Select items', 'Select at least one payment item.', 'warning');
        if (validItems.length === 0 || validItems.some((item) => !item.code || !Number.isFinite(item.amount) || item.amount < 0)) return void swalAlert('Invalid items', 'Selected items must have a valid reference code and amount.', 'warning');
        if (fromUserRequired && !fromUser) return void swalAlert('From user required', 'Select the user who owns the from wallet.', 'warning');
        if (toUserRequired && !toUser) return void swalAlert('To user required', 'Select the user who owns the to wallet.', 'warning');
        if (!isFromSettlement) {
            if (fromUserRequired && fromWallet === 'AGENT' && fromUser?.roleId !== 7) return void swalAlert('Invalid agent', 'Agent wallet requires a user with role 7 (Agent).', 'warning');
            if (fromUserRequired && (fromWallet === 'CLIENT' || fromWallet === 'CUSTOMER') && fromUser?.roleId !== 5 && fromUser?.roleId !== 8) return void swalAlert('Invalid client', 'Client wallet requires role 5 (Client) or 8 (Market Owner).', 'warning');
            if (toUserRequired && toWallet === 'AGENT' && toUser?.roleId !== 7) return void swalAlert('Invalid agent', 'Agent wallet requires a user with role 7 (Agent).', 'warning');
            if (toUserRequired && (toWallet === 'CLIENT' || toWallet === 'CUSTOMER') && toUser?.roleId !== 5 && toUser?.roleId !== 8) return void swalAlert('Invalid client', 'Client wallet requires role 5 (Client) or 8 (Market Owner).', 'warning');
        }

        setIsSubmitting(true);
        setUploadProgress(0);
        try {
            const preparedProofFile = await buildProofUploadFile(proofFiles, 'custom-payment-record-proof');
            const proofUrl = await uploadProofToStorage(
                preparedProofFile,
                'payment-proofs',
                setUploadProgress,
            );

            const payload = {
                id: 0,
                amount: amountValue,
                desc: description.trim(),
                proofUrl,
                paymentRecordItems: validItems,
                paymentType: { id: paymentType.value },
                paymentCategory: { id: category.value },
                ...(bankDetailRequired && bankDetail ? { bankDetail: { id: bankDetail.value } } : {}),
                isReturn,
                fromWallet,
                toWallet,
                fromUserId: fromUserRequired ? fromUser?.value : null,
                toUserId: toUserRequired ? toUser?.value : null,
            };

            const usesMainBranchEndpoint = paymentType.value !== 2 && paymentType.value !== 3;
            let response;

            if (usesMainBranchEndpoint) {
                const branchId = JwtUtil.getBranchId();
                if (!branchId) {
                    throw new Error('Unable to resolve the active branch. Please sign in again and select a branch.');
                }

                response = await axiosInstance.post<ApiResponse<number>>(
                    '/payment/create-payment-record-for-agent-onhand-orders',
                    { ...payload, branchId },
                );
            } else {
                response = await axiosInstance.post<ApiResponse<number>>('/payment/create-payment-record', payload);
            }
            if (response.data.message?.toLowerCase() !== 'success') {
                throw new Error(response.data.desc || 'Payment record creation failed.');
            }
            await swalAlert('Created', 'Payment record created successfully.', 'success');
            navigate('/deliverYya-cloud-console/accounts');
        } catch (error) {
            await swalErrorModal('Creation failed', error instanceof Error ? error.message : 'Payment record could not be created.');
        } finally {
            setIsSubmitting(false);
            setUploadProgress(null);
        }
    };

    const fieldClass = 'h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100';
    const labelClass = 'mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500';

    if (isLoading) return <div className="p-8 text-slate-500">Loading payment options...</div>;

    return (
        <main className="min-h-full bg-[#fffaf4] px-4 py-6 md:px-8">
            <div className="mx-auto max-w-6xl">
                <button type="button" onClick={() => navigate('/deliverYya-cloud-console/accounts')} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-600">
                    <ArrowLeftIcon className="h-4 w-4" /> Back to accounts
                </button>
                <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Accounts</p>
                    <h1 className="mt-2 text-3xl font-black text-slate-900">Create payment record</h1>
                    <p className="mt-2 text-sm text-slate-500">Record a payment, attach its references, and route wallet entries to the correct user.</p>
                </div>

                <div className="space-y-5">
                    <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm md:p-7">
                        <div className="grid gap-5 md:grid-cols-2">
                            {isFromSettlement ? (
                                <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                                    Payment kind: Expense
                                </div>
                            ) : <div className="md:col-span-2">
                                <label className={labelClass}>Payment kind</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsReturn(false)}
                                        className={`h-[40px] rounded-xl text-sm font-bold transition ${!isReturn
                                            ? 'border border-[#15803D] bg-[#15803D] text-white shadow-sm'
                                            : 'border border-slate-200 bg-white text-slate-500 hover:border-[#86EFAC] hover:bg-[#F0FDF4] hover:text-[#166534]'}`}
                                    >
                                        <ArrowTrendingUpIcon className="mr-2 inline h-4 w-4" aria-hidden="true" />
                                        Income
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsReturn(true)}
                                        className={`h-[40px] rounded-xl text-sm font-bold transition ${isReturn
                                            ? 'border border-[#B91C1C] bg-[#B91C1C] text-white shadow-sm'
                                            : 'border border-slate-200 bg-white text-slate-500 hover:border-[#FCA5A5] hover:bg-[#FEF2F2] hover:text-[#991B1B]'}`}
                                    >
                                        <ArrowTrendingDownIcon className="mr-2 inline h-4 w-4" aria-hidden="true" />
                                        Expense
                                    </button>
                                </div>
                            </div>}
                            <div><label className={labelClass}>Payment type</label><Select options={paymentTypes} value={paymentType} onChange={(option) => { setPaymentType(option); if (option?.value !== 2 && option?.value !== 3) setBankDetail(null); }} styles={selectStyles} placeholder="Select payment type..." /></div>
                            <div><label className={labelClass}>Payment category</label><Select options={categories} value={category} onChange={(option) => setCategory(option)} isDisabled={isFromSettlement} styles={selectStyles} placeholder="Select payment category..." /></div>
                            <div>
                                <label className={labelClass}>Calculated amount</label>
                                <input className={`${fieldClass} bg-slate-50 font-bold text-slate-700`} type="number" min="0" value={itemsTotal.toFixed(2)} readOnly placeholder="0.00" />
                            </div>
                            <div>
                                <label className={labelClass}>Payment proof <span className="text-red-500">*</span></label>
                                <label className="flex h-[42px] cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm transition hover:border-orange-300 hover:bg-orange-50/40">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <ArrowUpTrayIcon className="h-4 w-4 shrink-0 text-[#D17F0A]" />
                                        <span className="truncate">{proofFiles.length ? `${proofFiles.length} file${proofFiles.length === 1 ? '' : 's'} selected` : 'Choose images or PDF'}</span>
                                    </span>
                                    {!isFromSettlement && <span className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">Browse</span>}
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        multiple
                                        disabled={isSubmitting || isFromSettlement}
                                        className="hidden"
                                        onChange={(event) => setProofFiles(Array.from(event.target.files || []))}
                                    />
                                </label>
                                {proofFiles.map((file, index) => (
                                    <button key={`${file.name}-${index}`} type="button" onClick={() => {
                                        const proofUrl = isFromSettlement && settlementReportPreviewUrl
                                            ? settlementReportPreviewUrl
                                            : URL.createObjectURL(file);
                                        window.open(proofUrl, '_blank', 'noopener,noreferrer');
                                        if (!(isFromSettlement && settlementReportPreviewUrl)) {
                                            window.setTimeout(() => URL.revokeObjectURL(proofUrl), 60_000);
                                        }
                                    }} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 underline">
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                        {isFromSettlement ? 'Open report' : `Open ${file.name} in new tab`}
                                    </button>
                                ))}
                                {proofFiles.length > 0 && (
                                    <div className="mt-2 max-h-20 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                        {proofFiles.map((file, index) => (
                                            <p key={`${file.name}-${index}`} className="truncate text-xs text-slate-600">• {file.name}</p>
                                        ))}
                                    </div>
                                )}
                                {isSubmitting && typeof uploadProgress === 'number' && (
                                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                        <div className="flex justify-between text-xs font-bold text-amber-800">
                                            <span>Uploading payment proof...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-amber-200">
                                            <div className="h-full bg-[#D17F0A] transition-all" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            {bankDetailRequired && <div><label className={labelClass}>Bank detail <span className="text-red-500">*</span></label><AsyncSelect<BankDetailOption, false> cacheOptions defaultOptions loadOptions={loadBankDetails} value={bankDetail} onChange={(option) => setBankDetail(option)} styles={selectStyles} placeholder="Select company bank detail..." isClearable /></div>}
                            <div><label className={labelClass}>From wallet</label><Select options={walletOptions} value={walletOptions.find((option) => option.value === fromWallet) || null} onChange={(option) => { setFromWallet(option?.value || null); setFromUser(null); }} isDisabled={isFromSettlement} styles={selectStyles} isClearable placeholder="Optional / Company" /></div>
                            {fromUserRequired && <div><label className={labelClass}>From user <span className="text-red-500">*</span></label><AsyncSelect<Option, false> cacheOptions loadOptions={(input) => loadUsers(input, fromWallet as WalletType)} value={fromUser} onChange={(option) => { setFromUser(option); if (option?.roleId === 7) setFromWallet('AGENT'); if (option?.roleId === 5 || option?.roleId === 8) setFromWallet('CLIENT'); }} styles={selectStyles} placeholder="Search agent, client, or market owner..." isClearable /></div>}
                            <div><label className={labelClass}>To wallet</label><Select options={walletOptions} value={walletOptions.find((option) => option.value === toWallet) || null} onChange={(option) => { setToWallet(option?.value || null); setToUser(null); }} isDisabled={isFromSettlement} styles={selectStyles} isClearable placeholder="Optional / Company" /></div>
                            {toUserRequired && <div><label className={labelClass}>To user <span className="text-red-500">*</span></label><AsyncSelect<Option, false> cacheOptions loadOptions={(input) => loadUsers(input, toWallet as WalletType)} value={toUser} isDisabled={isFromSettlement} onChange={(option) => { setToUser(option); if (option?.roleId === 7) setToWallet('AGENT'); if (option?.roleId === 5 || option?.roleId === 8) setToWallet('CLIENT'); }} styles={selectStyles} placeholder="Search agent, client, or market owner..." isClearable /></div>}
                            <div className="md:col-span-2"><label className={labelClass}>{isOtherCategory ? 'Description (required for Other)' : 'Description'}</label><textarea className={`${fieldClass} min-h-28 ${isFromSettlement ? 'cursor-not-allowed bg-slate-100' : ''}`} maxLength={150} value={description} readOnly={isFromSettlement} onChange={(event) => setDescription(event.target.value)} placeholder="Describe this payment record..." /></div>
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm md:p-7">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div><h2 className="text-xl font-black text-slate-900">Payment record references</h2><p className="mt-1 text-sm text-slate-500">Add extra payment references. Use verification only for order or urgent-job codes.</p></div>
                            <div className="flex flex-wrap gap-2">
                                {!isFromSettlement && <button type="button" onClick={() => void verifySelectedItems()} disabled={isVerifying} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"><CheckCircleIcon className="h-4 w-4" /> {isVerifying ? 'Verifying...' : 'Verify ORD / UJC codes'}</button>}
                                {!isFromSettlement && <button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-100"><PlusIcon className="h-4 w-4" /> Add reference</button>}
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="min-w-[720px] w-full border-collapse text-left">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">#</th>
                                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Reference code</th>
                                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Note</th>
                                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Amount</th>
                                        <th className="w-16 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {items.map((item, index) => <tr key={index} className="align-middle">
                                        <td className="px-4 py-3 text-sm font-bold text-slate-400">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                className={`${fieldClass} ${item.verificationMessage && !item.verified ? 'border-yellow-400 bg-yellow-50' : ''}`}
                                                value={item.code}
                                                readOnly={isFromSettlement}
                                                onChange={(event) => updateItem(index, {
                                                    code: event.target.value,
                                                    verified: false,
                                                    verificationMessage: '',
                                                })}
                                                placeholder="ORD... or UJC..."
                                            />
                                            {item.verificationMessage && (
                                                <p className={`mt-1.5 rounded-lg px-2 py-1 text-xs font-semibold ${item.verified
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {item.verificationMessage}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3"><input className={fieldClass} value={item.note} readOnly={isFromSettlement} onChange={(event) => updateItem(index, { note: event.target.value })} placeholder="Item note" /></td>
                                        <td className="px-4 py-3"><input className={fieldClass} type="number" min="0" value={item.amount} readOnly={isFromSettlement} onChange={(event) => updateItem(index, { amount: event.target.value })} placeholder="0.00" /></td>
                                        <td className="px-4 py-3 text-right">{!isFromSettlement && <button type="button" onClick={() => setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl p-2 text-red-500 hover:bg-red-50" title="Remove item"><TrashIcon className="h-5 w-5" /></button>}</td>
                                    </tr>)}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-5 flex flex-wrap justify-end gap-6 border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Selected items total <strong className="ml-2 text-slate-900">{itemsTotal.toFixed(2)}</strong></span><span className="text-slate-500">Calculated record amount <strong className="ml-2 text-slate-900">{itemsTotal.toFixed(2)}</strong></span></div>
                    </section>

                    <div className="flex justify-end gap-3 pb-8"><button type="button" onClick={() => navigate('/deliverYya-cloud-console/accounts')} disabled={isSubmitting} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button><button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting} className="rounded-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? (typeof uploadProgress === 'number' ? `Uploading proof ${uploadProgress}%` : 'Creating record...') : 'Create payment record'}</button></div>
                </div>
            </div>
        </main>
    );
}

export default PaymentRecordCreatePage;
