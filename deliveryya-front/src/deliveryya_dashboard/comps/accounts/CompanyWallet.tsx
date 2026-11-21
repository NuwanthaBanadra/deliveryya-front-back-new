import {
    ArrowPathIcon,
    BanknotesIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CurrencyDollarIcon,
    DocumentTextIcon,
    EllipsisVerticalIcon,
    EyeIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import {Menu, MenuButton, MenuItem, MenuItems} from '@headlessui/react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Select, {type SingleValue, type StylesConfig} from 'react-select';
import AsyncSelect from 'react-select/async';
import {hasAccess} from '../../../util/AccessController';
import {FRONTEND_ACCESS_IDS} from '../../../util/FrontendAccess';
import axiosInstance from '../../../util/AxiosUtil';
import {
    getCompanyWalletBalance,
    getCompanyWalletHistoryPaginated,
    getCompanyWalletOperationDetail,
    getPaymentRecordById,
} from '../../../util/WalletApi';
import {debounce} from '../../../util/DebounceUtil';
import type {
    PaginatedWalletHistoryDto,
    PaymentRecordSummaryDto,
    WalletBalanceResponse,
    WalletOperationDetailResponse,
    WalletPaginatedHistoryResponse,
    WalletRecordDto,
} from '../../../types/WalletTypes';
import {WalletOperationDetailModal} from './WalletOperationDetailModal';
import PaymentRecordDetailModal from './PaymentRecordDetailModal';

type Option = { id: number; name: string };
type ApiListResponse = { message?: string; object?: Option[] };

const EMPTY_QUERY: PaginatedWalletHistoryDto = {
    pageNumber: 0,
    countPerPage: 10,
    totalCount: 0,
    totalPages: 0,
    fromDate: null,
    toDate: null,
    minAmount: null,
    maxAmount: null,
    paymentCategoryId: null,
    paymentStatusId: null,
    branchId: null,
    isExpense: null,
    search: '',
    items: [],
};

const currency = (value: number | null) =>
    value == null ? 'N/A' : value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

const date = (value: string | null) =>
    value ? new Date(value).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'}) : 'N/A';

type FilterOption = { value: number; label: string; };

const createWalletSelectStyles = <Option, >(): StylesConfig<Option, false> => ({
    control: (base, state) => ({
        ...base,
        minHeight: '42px',
        borderWidth: '2px',
        borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
        borderRadius: '0.75rem',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
        '&:hover': {borderColor: '#FCD34D'},
        transition: 'all 0.3s',
        backgroundColor: 'white',
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
        color: state.isSelected ? 'white' : '#1F2937',
        cursor: 'pointer',
    }),
    menu: (base) => ({...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 50}),
});

const walletSelectStyles = createWalletSelectStyles<FilterOption>();

export default function CompanyWallet() {
    const navigate = useNavigate();
    const allowed = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.COMPANY_WALLET), []);
    const [balance, setBalance] = useState<number | null>(null);
    const [rows, setRows] = useState<WalletRecordDto[]>([]);
    const [query, setQuery] = useState(EMPTY_QUERY);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [categories, setCategories] = useState<Option[]>([]);
    const [statuses, setStatuses] = useState<Option[]>([]);
    const [branches, setBranches] = useState<Option[]>([]);
    const [loading, setLoading] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detail, setDetail] = useState<WalletRecordDto | null>(null);
    const [paymentRecord, setPaymentRecord] = useState<PaymentRecordSummaryDto | null>(null);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        if (!allowed) navigate('/403', {replace: true});
    }, [allowed, navigate]);

    const loadOptions = useCallback(async () => {
        try {
            const [categoryResponse, statusResponse] = await Promise.all([
                axiosInstance.get<ApiListResponse>('/payment/get-payment-categories'),
                axiosInstance.get<ApiListResponse>('/payment/get-payment-statuses'),
            ]);
            setCategories(categoryResponse.data.object || []);
            setStatuses(statusResponse.data.object || []);
            const branchResponse = await axiosInstance.post<{
                object?: { items?: Array<{ id: number; name: string }> }
            }>('/branches/get-branches', {
                pageNumber: 0,
                countPerPage: 500,
                search: '',
                items: [],
            });
            setBranches((branchResponse.data.object?.items || []).map((branch) => ({
                id: branch.id,
                name: branch.name
            })));
        } catch (loadError) {
            console.error('Error loading wallet filter options:', loadError);
        }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response: WalletPaginatedHistoryResponse = await getCompanyWalletHistoryPaginated(query);
            if (response.message?.toLowerCase() !== 'success') throw new Error(response.desc || 'Failed to load wallet history');
            setRows(response.object?.items || []);
            setTotalCount(response.object?.totalCount || 0);
            setTotalPages(response.object?.totalPages || 1);
        } catch (loadError) {
            console.error('Error loading wallet history:', loadError);
            setError(loadError instanceof Error ? loadError.message : 'Failed to load wallet history');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [query]);

    const loadBalance = useCallback(async () => {
        setBalanceLoading(true);
        try {
            const response: WalletBalanceResponse = await getCompanyWalletBalance();
            setBalance(response.message?.toLowerCase() === 'success' ? response.object : null);
        } catch (loadError) {
            console.error('Error loading company wallet balance:', loadError);
            setBalance(null);
        } finally {
            setBalanceLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!allowed) return;
        void loadOptions();
        void loadBalance();
    }, [allowed, loadBalance, loadOptions]);

    useEffect(() => {
        if (allowed) void load();
    }, [allowed, load]);

    const update = useCallback((patch: Partial<PaginatedWalletHistoryDto>) => {
        setQuery((current) => ({...current, ...patch, pageNumber: 0}));
    }, []);

    const reset = useCallback(() => {
        setSearchText('');
        setQuery(EMPTY_QUERY);
    }, []);
    const refresh = useCallback(async () => Promise.all([load(), loadBalance()]), [load, loadBalance]);

    const openDetail = useCallback(async (id: number) => {
        try {
            const response: WalletOperationDetailResponse = await getCompanyWalletOperationDetail(id);
            if (response.message?.toLowerCase() === 'success') {
                const walletRecord = response.object;
                const creatorId = Number(walletRecord.createdBy);
                if (Number.isInteger(creatorId) && creatorId > 0) {
                    try {
                        const userResponse = await axiosInstance.get<{
                            object?: { firstName?: string; lastName?: string; nic?: string }
                        }>(`/users/admin/get-user-by-id?id=${creatorId}`);
                        const user = userResponse.data.object;
                        const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
                        setDetail({...walletRecord, createdByName: fullName || null, createdByNic: user?.nic || null});
                        return;
                    } catch (userError) {
                        console.error('Error loading wallet record creator:', userError);
                    }
                }
                setDetail(walletRecord);
            } else setError(response.desc || 'Failed to load operation detail');
        } catch (loadError) {
            console.error('Error loading wallet operation detail:', loadError);
            setError('Failed to load operation detail');
        }
    }, []);

    const openPaymentRecord = useCallback(async (paymentRecordId: number | null) => {
        if (!paymentRecordId) {
            setError('This wallet record is not linked to a payment record.');
            return;
        }
        try {
            const response = await getPaymentRecordById(paymentRecordId);
            if (response.message?.toLowerCase() === 'success') {
                setPaymentRecord(response.object?.items?.[0] || null);
            } else {
                setError(response.desc || 'Failed to load payment record');
            }
        } catch (loadError) {
            console.error('Error loading payment record:', loadError);
            setError('Failed to load payment record');
        }
    }, []);

    const debouncedSearch = useMemo(
        () => debounce((value: string) => update({search: value}), 400),
        [update]
    );

    const debounceAsync = useCallback(<T, >(fn: (input: string) => Promise<T[]>, delay = 400) => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        return (input: string): Promise<T[]> => {
            if (timer) clearTimeout(timer);
            return new Promise<T[]>((resolve, reject) => {
                timer = setTimeout(() => fn(input).then(resolve).catch(reject), delay);
            });
        };
    }, []);

    const loadBranchOptions = useMemo(() => debounceAsync(async (input: string): Promise<FilterOption[]> => {
        const response = await axiosInstance.post<{
            object?: { items?: Array<{ id: number; name: string }> }
        }>('/branches/get-branches', {
            pageNumber: 0,
            countPerPage: 25,
            search: input,
            items: [],
        });
        return (response.data.object?.items || []).map((branch) => ({value: branch.id, label: branch.name}));
    }, 400), [debounceAsync]);

    const loadCategoryOptions = useMemo(() => debounceAsync(async (input: string): Promise<FilterOption[]> => {
        const normalized = input.trim().toLowerCase();
        return categories
            .filter((option) => !normalized || option.name.toLowerCase().includes(normalized))
            .map((option) => ({value: option.id, label: option.name}));
    }, 300), [categories, debounceAsync]);

    const loadStatusOptions = useMemo(() => debounceAsync(async (input: string): Promise<FilterOption[]> => {
        const normalized = input.trim().toLowerCase();
        return statuses
            .filter((option) => !normalized || option.name.toLowerCase().includes(normalized))
            .map((option) => ({value: option.id, label: option.name}));
    }, 300), [statuses, debounceAsync]);

    if (!allowed) return null;

    const incomeTotal = rows.filter((row) => !row.isExpense).reduce((sum, row) => sum + (row.amount || 0), 0);
    const expenseTotal = rows.filter((row) => row.isExpense).reduce((sum, row) => sum + (row.amount || 0), 0);

    return (
        <div className="min-h-screen space-y-6 bg-gray-50 pb-12">
            <div className="mb-2">
                <h1 className="bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-3xl font-black text-transparent md:text-4xl">Company
                    Wallet</h1>
                <p className="mt-1 text-sm text-gray-600 md:text-base">Monitor company wallet balance, movements, and
                    linked payment records.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        label: 'Current balance',
                        value: currency(balance),
                        icon: CurrencyDollarIcon,
                        iconClass: 'from-orange-500 to-orange-600'
                    },
                    {
                        label: 'Records found',
                        value: String(totalCount),
                        icon: BanknotesIcon,
                        iconClass: 'from-blue-500 to-blue-600'
                    },
                    {
                        label: 'Income on this page',
                        value: currency(incomeTotal),
                        icon: ArrowPathIcon,
                        iconClass: 'from-emerald-500 to-emerald-600'
                    },
                    {
                        label: 'Expenses on this page',
                        value: currency(expenseTotal),
                        icon: ArrowPathIcon,
                        iconClass: 'from-red-500 to-red-600'
                    },
                ].map((card) => (
                    <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div><p className="text-sm font-medium text-gray-600">{card.label}</p><p
                                className="mt-1 text-2xl font-black text-gray-900">{card.value}</p></div>
                            <div
                                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${card.iconClass} shadow-lg`}>
                                <card.icon className="h-7 w-7 text-white"/>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="md:hidden">
                <button type="button" onClick={() => setShowFilters((value) => !value)}
                        className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-semibold text-gray-900">
                    <span>Filters</span><FunnelIcon
                    className={`h-5 w-5 text-gray-600 transition-transform ${showFilters ? 'rotate-180' : ''}`}/>
                </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {[
                        {label: 'All', start: null, end: null},
                        {
                            label: 'Today',
                            start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
                            end: new Date().toISOString()
                        },
                        {
                            label: 'This week',
                            start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString(),
                            end: new Date().toISOString()
                        },
                        {
                            label: 'This month',
                            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
                            end: new Date().toISOString()
                        },
                    ].map((range) => (
                        <button key={range.label} type="button"
                                onClick={() => update({fromDate: range.start, toDate: range.end})}
                                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-orange-100 hover:text-orange-700">{range.label}</button>
                    ))}
                </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Wallet records</h2>
                        <p className="mt-1 text-sm text-gray-500">{totalCount} records found</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setShowFilters((value) => !value)}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                            <FunnelIcon className="h-4 w-4"/> {showFilters ? 'Hide filters' : 'Show filters'}
                        </button>
                        <button type="button" onClick={() => void refresh()} disabled={loading || balanceLoading}
                                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-lg disabled:opacity-60">
                            <ArrowPathIcon
                                className={`h-4 w-4 ${loading || balanceLoading ? 'animate-spin' : ''}`}/> Refresh
                        </button>
                    </div>
                </div>

            </section>

            {showFilters && (
                <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-6">
                    <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Filters</h2>
                            <p className="mt-1 text-sm text-gray-500">Narrow wallet records using the fields below.</p>
                        </div>
                        <button type="button" onClick={reset}
                                className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-600">
                            <XMarkIcon className="h-4 w-4"/> Clear all
                        </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="relative sm:col-span-2">
                            <MagnifyingGlassIcon className="absolute left-3 top-9 h-4 w-4 text-gray-400"/>
                            <span
                                className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Search</span>
                            <input value={searchText} onChange={(event) => {
                                setSearchText(event.target.value);
                                debouncedSearch(event.target.value);
                            }} placeholder="Code, reference, note..."
                                   className="w-full rounded-xl border-0 bg-white py-2.5 pl-9 pr-3 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400"/>
                        </label>
                        <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">From date</span><input
                            type="datetime-local" value={query.fromDate?.slice(0, 16) || ''}
                            onChange={(event) => update({fromDate: event.target.value ? new Date(event.target.value).toISOString() : null})}
                            className="w-full rounded-xl border-0 bg-white py-2.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400"/></label>
                        <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">To date</span><input
                            type="datetime-local" value={query.toDate?.slice(0, 16) || ''}
                            onChange={(event) => update({toDate: event.target.value ? new Date(event.target.value).toISOString() : null})}
                            className="w-full rounded-xl border-0 bg-white py-2.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400"/></label>
                        <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Minimum amount</span><input
                            type="number" min="0" value={query.minAmount ?? ''}
                            onChange={(event) => update({minAmount: event.target.value ? Number(event.target.value) : null})}
                            className="w-full rounded-xl border-0 bg-white py-2.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400"/></label>
                        <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Maximum amount</span><input
                            type="number" min="0" value={query.maxAmount ?? ''}
                            onChange={(event) => update({maxAmount: event.target.value ? Number(event.target.value) : null})}
                            className="w-full rounded-xl border-0 bg-white py-2.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400"/></label>
                        <label><span
                            className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Direction</span><Select<FilterOption, false>
                            isClearable isSearchable={false} styles={walletSelectStyles}
                            options={[{value: 0, label: 'Income / credit'}, {value: 1, label: 'Expense / debit'}]}
                            value={query.isExpense == null ? null : {
                                value: query.isExpense ? 1 : 0,
                                label: query.isExpense ? 'Expense / debit' : 'Income / credit'
                            }} onChange={(option) => update({isExpense: option ? option.value === 1 : null})}
                            placeholder="All movements"/></label>
                        <label><span
                            className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Category</span><AsyncSelect<FilterOption, false>
                            cacheOptions defaultOptions isClearable isSearchable loadOptions={loadCategoryOptions}
                            styles={walletSelectStyles}
                            value={categories.filter((option) => option.id === query.paymentCategoryId).map((option) => ({
                                value: option.id,
                                label: option.name
                            }))[0] || null}
                            onChange={(option: SingleValue<FilterOption>) => update({paymentCategoryId: option?.value || null})}
                            placeholder="All categories"/></label>
                        <label><span
                            className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Status</span><AsyncSelect<FilterOption, false>
                            cacheOptions defaultOptions isClearable isSearchable loadOptions={loadStatusOptions}
                            styles={walletSelectStyles}
                            value={statuses.filter((option) => option.id === query.paymentStatusId).map((option) => ({
                                value: option.id,
                                label: option.name
                            }))[0] || null}
                            onChange={(option: SingleValue<FilterOption>) => update({paymentStatusId: option?.value || null})}
                            placeholder="All statuses"/></label>
                        <label><span
                            className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Branch</span><AsyncSelect<FilterOption, false>
                            cacheOptions defaultOptions isClearable isSearchable loadOptions={loadBranchOptions}
                            styles={walletSelectStyles}
                            value={branches.filter((option) => option.id === query.branchId).map((option) => ({
                                value: option.id,
                                label: option.name
                            }))[0] || null} onChange={(option: SingleValue<FilterOption>) => {
                            update({branchId: option?.value || null});
                            if (option) setBranches((current) => current.some((item) => item.id === option.value) ? current : [...current, {
                                id: option.value,
                                name: option.label
                            }]);
                        }} placeholder="All branches"/></label>
                    </div>
                </section>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-gray-700">Showing <span
                        className="font-bold text-gray-900">{rows.length}</span> of <span
                        className="font-bold text-gray-900">{totalCount}</span> records in this page
                    </div>
                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-600">Per page:</span>
                            <div className="w-28"><Select<FilterOption, false>
                                value={{value: query.countPerPage, label: String(query.countPerPage)}}
                                onChange={(option) => setQuery((current) => ({
                                    ...current,
                                    countPerPage: option?.value || 10,
                                    pageNumber: 0
                                }))} options={[5, 10, 20, 50].map((size) => ({value: size, label: String(size)}))}
                                styles={walletSelectStyles} isSearchable={false} instanceId="company-wallet-page-size"/>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <button type="button" onClick={() => setQuery((current) => ({
                                ...current,
                                pageNumber: Math.max(0, current.pageNumber - 1)
                            }))} disabled={query.pageNumber === 0 || loading}
                                    className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40">
                                <ChevronLeftIcon className="h-5 w-5 text-gray-700"/></button>
                            <div
                                className="min-w-20 rounded-lg border-2 border-gray-200 bg-white px-4 py-1.5 text-center text-sm font-bold text-gray-900">{query.pageNumber + 1} / {totalPages}</div>
                            <button type="button" onClick={() => setQuery((current) => ({
                                ...current,
                                pageNumber: Math.min(totalPages - 1, current.pageNumber + 1)
                            }))} disabled={query.pageNumber >= totalPages - 1 || loading}
                                    className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40">
                                <ChevronRightIcon className="h-5 w-5 text-gray-700"/></button>
                            <button type="button" onClick={() => void refresh()} disabled={loading || balanceLoading}
                                    className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40">
                                <ArrowPathIcon
                                    className={`h-5 w-5 text-gray-700 ${loading || balanceLoading ? 'animate-spin' : ''}`}/>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {error && <div
                className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead
                            className="bg-gray-50 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">Movement</th>
                            <th className="px-5 py-4">Amount</th>
                            <th className="px-5 py-4">Balance</th>
                            <th className="px-5 py-4">Reference</th>
                            <th className="px-5 py-4">Category</th>
                            <th className="px-5 py-4 text-right">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {loading ? <tr>
                            <td colSpan={7} className="px-5 py-16 text-center"><ArrowPathIcon
                                className="mx-auto h-8 w-8 animate-spin text-orange-500"/></td>
                        </tr> : rows.length === 0 ? <tr>
                            <td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-500"><BanknotesIcon
                                className="mx-auto mb-2 h-10 w-10 text-gray-300"/>No wallet records match these filters.
                            </td>
                        </tr> : rows.map((row) => <tr key={row.id} className="hover:bg-orange-50/30">
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{date(row.createdAt)}</td>
                            <td className="px-5 py-4"><span
                                className={`rounded-full px-3 py-1 text-xs font-black ${row.isExpense ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.isExpense ? 'Expense' : 'Income'}</span>
                                <p className="mt-1 text-xs text-gray-400">{row.code || row.ref || 'No reference'}</p>
                            </td>
                            <td className={`whitespace-nowrap px-5 py-4 text-sm font-black ${row.isExpense ? 'text-red-600' : 'text-emerald-600'}`}>{row.isExpense ? '-' : '+'}{currency(row.amount)}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-gray-800">{currency(row.balance)}</td>
                            <td className="max-w-52 truncate px-5 py-4 text-sm text-gray-600">{row.ref || row.note || 'N/A'}</td>
                            <td className="px-5 py-4 text-sm text-gray-600">{row.paymentCategory?.name || 'N/A'}</td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button type="button" onClick={() => void openDetail(row.id)}
                                            className="rounded-xl p-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                                            title="View wallet record"><EyeIcon className="h-5 w-5"/></button>
                                    {row.paymentRecordId && <button type="button"
                                                                    onClick={() => void openPaymentRecord(row.paymentRecordId)}
                                                                    className="rounded-xl p-2 text-orange-600 hover:bg-orange-50"
                                                                    title="Open linked payment record"><DocumentTextIcon
                                        className="h-5 w-5"/></button>}<Menu as="div" className="relative"><MenuButton
                                    className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
                                    title="More options"><EllipsisVerticalIcon
                                    className="h-5 w-5"/></MenuButton><MenuItems anchor="bottom end"
                                                                                 className="z-50 w-52 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl"><MenuItem>
                                    <button type="button" onClick={() => void openDetail(row.id)}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-700">
                                        <EyeIcon className="h-4 w-4"/><span>View wallet record</span></button>
                                </MenuItem>{row.paymentRecordId && <MenuItem>
                                    <button type="button" onClick={() => void openPaymentRecord(row.paymentRecordId)}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-700">
                                        <DocumentTextIcon className="h-4 w-4"/><span>Open payment record</span></button>
                                </MenuItem>}</MenuItems></Menu></div>
                            </td>
                        </tr>)}
                        </tbody>
                    </table>
                </div>
            </section>
            <WalletOperationDetailModal
                isOpen={detail !== null}
                operation={detail}
                onOpenPaymentRecord={detail?.paymentRecordId
                    ? () => {
                        void openPaymentRecord(detail.paymentRecordId);
                    }
                    : undefined}
                onClose={() => setDetail(null)}
            />
            <PaymentRecordDetailModal isOpen={paymentRecord !== null} record={paymentRecord}
                                      onClose={() => setPaymentRecord(null)}/>
        </div>
    );
}
