import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ArrowPathIcon, CalendarDaysIcon, CheckCircleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, CurrencyDollarIcon, DocumentArrowDownIcon, EllipsisVerticalIcon, EyeIcon, FunnelIcon, MagnifyingGlassIcon, PrinterIcon, TrashIcon, XMarkIcon, } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from "react-select/async";
import axiosInstance from '../../util/AxiosUtil';
import {
    canAccessAccountsSection,
    getAccountsDataUserId,
    hasAccess,
    shouldHideAccountsMarketFilter,
} from '../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../util/FrontendAccess';
import { generateFinancialReportPDF, printFinancialReport } from '../../util/PdfUtil';
import { MdContentCopy } from 'react-icons/md';
import Swal from 'sweetalert2';
import PaymentRecordManageModal from './accounts/PaymentRecordManageModal';

// Payment Records Interfaces
// Generic API response wrapper — all backend responses share this envelope
type ApiResponse<T> = {
    status: number;
    message: string;
    desc: string;
    exData: unknown;
    object: T;
};

interface PaymentType {
    id: number;
    name: string;
}

interface Bank {
    id: number;
    name: string;
}

interface VerificationStatus {
    id: number;
    name: string;
}

interface BankDetail {
    id?: number;
    name?: string;
    bankName?: string;
    accountNumber?: string;
    [key: string]: unknown;
}

interface PaymentRecordItem {
    id?: number;
    code: string;
    note: string;
    amount: number;
    paymentRecordId?: number;
}

interface PaymentRecord {
    id: number;
    amount: number | null;
    desc: string;
    proofUrl: string;
    bankDetail: BankDetail | null;
    verificationStatus: VerificationStatus;
    orderCode: string | null;
    urgentJobCode: string | null;
    orderId: number | null;
    urgentJobId: number | null;
    isReturn: boolean;
    paymentType: PaymentType;
    createdAt: string;
    updatedAt: string;
    referencesCodes: string[];
    paymentRecordItems: PaymentRecordItem[];
    createdBy: string;
    madeBy: string;
    updatedBy: string;
}

type PaymentRecordsObject = {
    pageNumber: number;
    countPerPage: number;
    totalCount: number;
    totalPages: number;
    paymentRecodeId: number;
    bankId: number;
    orderId: number;
    bankDetailId: number;
    paymentTypeId: number;
    marketId: number | null;
    isReturn: boolean | null;
    verificationStatusId: number | null;
    clientId: number | null;
    createdById: number | null;
    code: string;
    minAmount: number | null;
    maxAmount: number | null;
    search: string;
    items: PaymentRecord[];
};

interface Market {
    id: number;
    name: string;
}

interface MarketsPaginatedRequest {
    pageNumber: number;
    countPerPage: number;
    totalCount: number;
    totalPages: number;
    marketCategoryId: number | null;
    marketId: number | null;
    userId: number | null;
    isActive: boolean | null;
    search: string;
}

type MarketsObject =
    | { pageNumber?: number; countPerPage?: number; totalCount?: number; totalPages?: number; items?: Market[] }
    | Market[];

type BankDetailItem = {
    id: number;
    accNumber?: string;
    accountNumber?: string;
    bank?: { id?: number; name?: string } | null;
    bankName?: string;
    branch?: string;
};

type BankDetailsObject = BankDetailItem[] | { items?: BankDetailItem[] };

export interface PaymentRecordsRequestBody {
    pageNumber: number;
    countPerPage: number;
    paymentRecodeId: number;
    bankId: number;
    orderId: number;
    clientId: number;
    bankDetailId: number;
    paymentTypeId: number;
    marketId: number | null;
    isReturn: boolean | null;
    verificationStatusId: number | null;
    createdById: number | null;
    code: string;
    fromDate: string | null;
    toDate: string | null;
    minAmount: number | null;
    maxAmount: number | null;
    search: string;
    items: unknown[];
}

const INITIAL_PAYMENT_QUERY: PaymentRecordsRequestBody = {
    pageNumber: 0,
    countPerPage: 10,
    paymentRecodeId: 0,
    bankId: 0,
    orderId: 0,
    clientId: 0,
    bankDetailId: 0,
    paymentTypeId: 0,
    marketId: null,
    isReturn: null,
    verificationStatusId: null,
    createdById: null,
    code: '',
    fromDate: null,
    toDate: null,
    minAmount: null,
    maxAmount: null,
    search: '',
    items: [],
};

type AsyncOption = {
    value: number;
    label: string;
};

const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';

    return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};
const getPaymentDate = (record: PaymentRecord): Date | null => {
    const rawValue = record.createdAt ?? null;

    if (!rawValue) return null;

    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getFormattedDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch {
        return dateString;
    }
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

const getStatusBadge = (statusId?: number, statusName?: string) => {
    if (statusId === 1) {
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    }
    if (statusId === 2) {
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    }
    if (statusId === 3) {
        return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    }

    const normalized = statusName?.toLowerCase() ?? '';
    if (normalized.includes('verified')) {
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    }
    if (normalized.includes('pending') || normalized.includes('progress')) {
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    }
    if (normalized.includes('failed') || normalized.includes('rejected')) {
        return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    }

    return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
};

const getRowBackground = (isReturn: boolean): string => {
    if (isReturn) {
        return 'bg-red-50';
    }
    return 'bg-emerald-50';
};

const getRecordCodes = (record: PaymentRecord): string[] => {
    const itemCodes = (record.paymentRecordItems || [])
        .map((item) => item.code?.trim())
        .filter((code): code is string => Boolean(code));

    if (itemCodes.length > 0) return itemCodes;

    const fallback = [record.urgentJobCode, record.orderCode, ...(record.referencesCodes || [])]
        .map((code) => code?.trim())
        .filter((code): code is string => Boolean(code));

    return fallback;
};

// Wraps an async loader so rapid keystrokes only fire one request after the user pauses.
function debounceAsync<T>(fn: (arg: string) => Promise<T>, delay: number): (arg: string) => Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    return (arg: string): Promise<T> =>
        new Promise((resolve, reject) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(arg).then(resolve).catch(reject), delay);
        });
}

function Accounts() {
    const navigate = useNavigate();
    const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
    const [manageModalState, setManageModalState] = useState<{
        show: boolean;
        mode: 'update' | 'status' | 'delete';
        record: PaymentRecord | null;
    }>({ show: false, mode: 'update', record: null });
    const [totalCount, setTotalCount] = useState(0);
    const [backendTotalPages, setBackendTotalPages] = useState(1);
    const [banks, setBanks] = useState<Bank[]>([]);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [verificationStatuses, setVerificationStatuses] = useState<VerificationStatus[]>([]);
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
    const [query, setQuery] = useState<PaymentRecordsRequestBody>(INITIAL_PAYMENT_QUERY);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const isAllMonthsSelected = selectedMonth === '';
    const canAccessAccounts = useMemo(() => canAccessAccountsSection(), []);
    const hideMarketFilter = useMemo(() => shouldHideAccountsMarketFilter(), []);
    const canManagePaymentRecordStatusOrDelete = useMemo(
        () => hasAccess(FRONTEND_ACCESS_IDS.PAYMENT_RECORD_STATUS_OR_DELETE),
        []
    );
    const canManagePaymentDirection = useMemo(
        () => hasAccess(FRONTEND_ACCESS_IDS.PAYMENT_RECORD_DIRECTION),
        []
    );

    const userId = useMemo(() => getAccountsDataUserId(), []);
    const apiUserId = useMemo(() => (userId && userId > 0 ? userId : null), [userId]);

    useEffect(() => {
        if (!canAccessAccounts) {
            navigate('/403', { replace: true });
        }
    }, [canAccessAccounts, navigate]);

    const updateQuery = useCallback((patch: Partial<PaymentRecordsRequestBody>) => {
        setQuery((current) => ({ ...current, ...patch }));
    }, []);

    const updateQueryAndResetPage = useCallback((patch: Partial<PaymentRecordsRequestBody>) => {
        setQuery((current) => ({ ...current, ...patch, pageNumber: 0 }));
    }, []);

    useEffect(() => {
        if (hideMarketFilter && query.marketId !== null) {
            updateQueryAndResetPage({ marketId: null });
        }
    }, [hideMarketFilter, query.marketId, updateQueryAndResetPage]);

    useEffect(() => {
        if (!canManagePaymentDirection && query.isReturn !== null) {
            updateQueryAndResetPage({ isReturn: null });
        }
    }, [canManagePaymentDirection, query.isReturn, updateQueryAndResetPage]);

    const fetchBanks = useCallback(async () => {
        try {
            const token = localStorage.getItem('jwtToken');
            const response = await axiosInstance.get<ApiResponse<Bank[]>>(`/markets/get-banks`);

            if (response.data.message?.toLowerCase() === 'success') {
                setBanks(response.data.object || []);
            } else {
                console.warn('Failed to load banks');
                setBanks([]);
            }
        } catch (fetchError) {
            console.error('Error loading banks:', fetchError);
            setBanks([]);
        }
    }, []);

    const fetchMarkets = useCallback(async () => {
        try {
            const requestBody: MarketsPaginatedRequest = {
                pageNumber: 0,
                countPerPage: 20,
                totalCount: 0,
                totalPages: 0,
                marketCategoryId: null,
                marketId: null,
                userId: apiUserId,
                isActive: true,
                search: '',
            };

            const response = await axiosInstance.post<ApiResponse<MarketsObject>>('/markets/get-markets', requestBody);
            const marketsObject = response.data.object;
            const marketItems = Array.isArray(marketsObject)
                ? marketsObject
                : marketsObject?.items || [];
            setMarkets(marketItems);
        } catch (fetchError) {
            console.error('Error loading markets:', fetchError);
            setMarkets([]);
        }
    }, [apiUserId]);

    const fetchVerificationStatuses = useCallback(async () => {
        try {
            const response = await axiosInstance.get<ApiResponse<VerificationStatus[]>>('/users/get-verification-statuses');

            if (response.data.message?.toLowerCase() === 'success') {
                const allowedStatuses = (response.data.object || []).filter((status) => status.id === 1 || status.id === 2 || status.id === 3);
                setVerificationStatuses(allowedStatuses);
            } else {
                console.warn('Failed to load verification statuses');
                setVerificationStatuses([]);
            }
        } catch (fetchError) {
            console.error('Error loading verification statuses:', fetchError);
            setVerificationStatuses([]);
        }
    }, []);

    const fetchPaymentTypes = useCallback(async () => {
        try {
            const response = await axiosInstance.get<ApiResponse<PaymentType[]>>('/payment/get-payment-types');

            if (response.data.message?.toLowerCase() === 'success') {
                setPaymentTypes(response.data.object || []);
            } else {
                console.warn('Failed to load payment types');
                setPaymentTypes([]);
            }
        } catch (fetchError) {
            console.error('Error loading payment types:', fetchError);
            setPaymentTypes([]);
        }
    }, []);

    const fetchPaymentRecords = useCallback(async () => {
        if (userId === null) {
            setError('Unable to identify the logged-in user. Please sign in again.');
            setPaymentRecords([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        const requestBody = {
            ...query,
            search: query.search.trim(),
            clientId: apiUserId,
            paymentRecodeId: query.paymentRecodeId || null,
            bankId: query.bankId || null,
            orderId: query.orderId || null,
            bankDetailId: query.bankDetailId || null,
            paymentTypeId: query.paymentTypeId || null,
            code: query.code.trim(),
        };

        try {
            const response = await axiosInstance.post<ApiResponse<PaymentRecordsObject>>(`/payment/get-payment-records`, requestBody);

            if (response.data.message?.toLowerCase() === 'success') {
                const responseObject = response.data.object;
                const items = responseObject?.items || [];
                setPaymentRecords(items);
                setTotalCount(responseObject?.totalCount ?? items.length);
                setBackendTotalPages(Math.max(1, responseObject?.totalPages ?? 1));
            } else {
                setError(response.data.desc || 'Failed to load payment records');
                setPaymentRecords([]);
                setTotalCount(0);
                setBackendTotalPages(1);
            }
        } catch (fetchError) {
            console.error('Error loading payment records:', fetchError);
            setError('Failed to connect to payment service');
            setPaymentRecords([]);
            setTotalCount(0);
            setBackendTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    }, [apiUserId, query, userId]);

    useEffect(() => {
        if (!canAccessAccounts) return;

        fetchPaymentRecords();
        fetchBanks();
        if (!hideMarketFilter) {
            fetchMarkets();
        }
        fetchVerificationStatuses();
        fetchPaymentTypes();
    }, [canAccessAccounts, hideMarketFilter, fetchPaymentRecords, fetchBanks, fetchMarkets, fetchVerificationStatuses, fetchPaymentTypes]);

    const filterOptions = useMemo(() => {
        return { verificationStatuses, banks, paymentTypes };
    }, [verificationStatuses, banks, paymentTypes]);

    const loadMarketOptions = useCallback(async (inputValue: string): Promise<AsyncOption[]> => {
        const search = inputValue.trim();
        const requestBody: MarketsPaginatedRequest = {
            pageNumber: 0,
            countPerPage: 20,
            totalCount: 0,
            totalPages: 0,
            marketCategoryId: null,
            marketId: query.marketId,
            userId: apiUserId,
            isActive: true,
            search,
        };

        try {
            const response = await axiosInstance.post<ApiResponse<MarketsObject>>('/markets/get-markets', requestBody);
            const marketsObject = response.data.object;
            const marketItems = Array.isArray(marketsObject)
                ? marketsObject
                : marketsObject?.items || [];

            return [
                { value: 0, label: 'All markets' },
                ...marketItems.map((market) => ({ value: market.id, label: market.name })),
            ];
        } catch {
            const normalized = search.toLowerCase();
            const fallback = markets
                .filter((market) => !normalized || market.name.toLowerCase().includes(normalized))
                .map((market) => ({ value: market.id, label: market.name }));
            return [{ value: 0, label: 'All markets' }, ...fallback];
        }
    }, [apiUserId, markets, query.marketId]);

    const loadBankDetailOptions = useCallback(async (inputValue: string): Promise<AsyncOption[]> => {
        const requestBody = {
            pageNumber: 0,
            countPerPage: 10,
            totalCount: 0,
            totalPages: 0,
            marketId: query.marketId ?? 0,
            userId: apiUserId,
            bankId: query.bankId || 0,
            search: inputValue.trim(),
        };

        try {
            const response = await axiosInstance.post<ApiResponse<BankDetailsObject>>('/markets/get-bank-details', requestBody);
            const objectData = response.data.object;
            const details = Array.isArray(objectData) ? objectData : objectData?.items || [];

            const mapped = details.map((detail) => {
                const accountNumber = detail.accNumber || detail.accountNumber || 'N/A';
                const bankName = detail.bank?.name || detail.bankName || 'Unknown Bank';
                return {
                    value: detail.id,
                    label: `${bankName} (${accountNumber})`,
                };
            });

            return [{ value: 0, label: 'All bank details' }, ...mapped];
        } catch (fetchError) {
            console.error('Failed to load bank details options:', fetchError);
            return [{ value: 0, label: 'All bank details' }];
        }
    }, [apiUserId, query.marketId, query.bankId]);

    // Debounced versions — only fire after 350 ms of typing silence
    const debouncedLoadMarketOptions = useMemo(
        () => debounceAsync(loadMarketOptions, 500),
        [loadMarketOptions]
    );

    const debouncedLoadBankDetailOptions = useMemo(
        () => debounceAsync(loadBankDetailOptions, 500),
        [loadBankDetailOptions]
    );

    useEffect(() => {
        if (selectedMonth) {
            const year = new Date().getFullYear();
            const month = selectedMonth;
            const nextMonthNumber = Number(month) + 1;
            const nextMonth = String(nextMonthNumber).padStart(2, '0');
            const nextYear = nextMonthNumber === 13 ? year + 1 : year;
            updateQueryAndResetPage({
                fromDate: `${year}-${month}-01T00:00:00`,
                toDate: `${nextYear}-${nextMonthNumber === 13 ? '01' : nextMonth}-01T00:00:00`,
            });
            return;
        }

        updateQueryAndResetPage({
            fromDate: startDate ? `${startDate}T00:00:00` : null,
            toDate: endDate ? `${endDate}T23:59:59` : null,
        });
    }, [selectedMonth, startDate, endDate, updateQueryAndResetPage]);

    const filteredRecords = useMemo(() => {
        // Records are already filtered by the backend
        return paymentRecords;
    }, [paymentRecords]);

    const activeFilters = useMemo(() => {
        const chips: { label: string; onRemove: () => void }[] = [];
        if (query.search)
            chips.push({ label: `Search: "${query.search}"`, onRemove: () => updateQueryAndResetPage({ search: '' }) });
        if (selectedMonth)
            chips.push({
                label: `Month: ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label ?? selectedMonth}`,
                onRemove: () => {
                    setSelectedMonth('');
                    setStartDate('');
                    setEndDate('');
                },
            });
        if (startDate)
            chips.push({ label: `From: ${startDate}`, onRemove: () => setStartDate('') });
        if (endDate)
            chips.push({ label: `To: ${endDate}`, onRemove: () => setEndDate('') });
        if (query.bankId)
            chips.push({
                label: `Bank: ${banks.find((b) => b.id === query.bankId)?.name ?? query.bankId}`,
                onRemove: () => updateQueryAndResetPage({ bankId: 0 }),
            });
        if (query.verificationStatusId)
            chips.push({
                label: `Status: ${verificationStatuses.find((s) => s.id === query.verificationStatusId)?.name ?? query.verificationStatusId}`,
                onRemove: () => updateQueryAndResetPage({ verificationStatusId: null }),
            });
        if (query.paymentTypeId)
            chips.push({
                label: `Pay Type: ${filterOptions.paymentTypes.find((p) => p.id === query.paymentTypeId)?.name ?? query.paymentTypeId}`,
                onRemove: () => updateQueryAndResetPage({ paymentTypeId: 0 }),
            });
        if (canManagePaymentDirection && query.isReturn !== null)
            chips.push({
                label: `Type: ${query.isReturn ? 'Outgoing' : 'Incoming'}`,
                onRemove: () => updateQueryAndResetPage({ isReturn: null }),
            });
        if (query.minAmount !== null)
            chips.push({
                label: `Min: LKR ${query.minAmount}`,
                onRemove: () => updateQueryAndResetPage({ minAmount: null }),
            });
        if (query.maxAmount !== null)
            chips.push({
                label: `Max: LKR ${query.maxAmount}`,
                onRemove: () => updateQueryAndResetPage({ maxAmount: null }),
            });
        if (query.paymentRecodeId)
            chips.push({
                label: `Payment ID: ${query.paymentRecodeId}`,
                onRemove: () => updateQueryAndResetPage({ paymentRecodeId: 0 }),
            });
        if (query.orderId)
            chips.push({
                label: `Order ID: ${query.orderId}`,
                onRemove: () => updateQueryAndResetPage({ orderId: 0 }),
            });
        if (query.bankDetailId)
            chips.push({
                label: `Bank Detail ID: ${query.bankDetailId}`,
                onRemove: () => updateQueryAndResetPage({ bankDetailId: 0 }),
            });
        if (query.clientId)
            chips.push({
                label: `Client ID: ${query.clientId}`,
                onRemove: () => updateQueryAndResetPage({ clientId: 0 }),
            });
        if (query.marketId)
            chips.push({
                label: `Market ID: ${query.marketId}`,
                onRemove: () => updateQueryAndResetPage({ marketId: null }),
            });
        return chips;
    }, [query, selectedMonth, startDate, endDate, banks, verificationStatuses, filterOptions.paymentTypes, canManagePaymentDirection, updateQueryAndResetPage]);

    const financialReportPayload = useMemo(() => {
        const dateRangeLabel = selectedMonth
            ? `${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label ?? selectedMonth} ${new Date().getFullYear()}`
            : startDate && endDate
                ? `${startDate} to ${endDate}`
                : startDate
                    ? `From ${startDate}`
                    : endDate
                        ? `Until ${endDate}`
                        : 'All dates';

        return {
            transactions: filteredRecords.map((record) => ({
                id: record.id,
                amount: record.amount || 0,
                flowType: record.isReturn ? 'Outgoing' : 'Incoming',
                paymentStatus: record.verificationStatus?.name || 'Unknown',
                paymentType: record.paymentType?.name || 'Unknown',
                accountHolder: record.madeBy || 'N/A',
                note: record.desc || 'N/A',
                referenceCode: getRecordCodes(record)[0] || '-',
                createdAt: record.createdAt,
            })),
            activeFilters: activeFilters.map((chip) => ({ label: chip.label })),
            reportScopeLabel: 'Payment Records',
            dateRangeLabel,
        };
    }, [filteredRecords, activeFilters, selectedMonth, startDate, endDate]);

    const handleDownloadReport = async () => {
        if (filteredRecords.length === 0 || isGeneratingReport) return;
        try {
            setIsGeneratingReport(true);
            await generateFinancialReportPDF(financialReportPayload, true);
        } catch (reportError) {
            console.error('Failed to generate report PDF:', reportError);
            setError('Unable to generate the PDF report right now. Please try again.');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handlePrintReport = async () => {
        if (filteredRecords.length === 0 || isGeneratingReport) return;
        try {
            setIsGeneratingReport(true);
            await printFinancialReport(financialReportPayload);
        } catch (reportError) {
            console.error('Failed to print report:', reportError);
            setError('Unable to open print preview. Please allow popups and try again.');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const summary = useMemo(() => {
        const totalRecords = filteredRecords.length;
        const incomingRecords = filteredRecords.filter((r) => !r.isReturn);
        const outgoingRecords = filteredRecords.filter((r) => r.isReturn);
        const totalAmount = filteredRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
        const incomingAmount = incomingRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
        const outgoingAmount = outgoingRecords.reduce((sum, record) => sum + (record.amount || 0), 0);

        return {
            totalRecords,
            totalAmount,
            incomingAmount,
            outgoingAmount,
        };
    }, [filteredRecords]);

    const totalPages = Math.max(1, backendTotalPages);

    useEffect(() => {
        setQuery((current) => ({ ...current, pageNumber: Math.min(current.pageNumber, totalPages - 1) }));
    }, [totalPages]);

    const paginatedRecords = filteredRecords;

    const showingRange = useMemo(() => {
        if (totalCount === 0 || paginatedRecords.length === 0) {
            return { from: 0, to: 0 };
        }

        const from = query.pageNumber * query.countPerPage + 1;
        const to = Math.min(totalCount, query.pageNumber * query.countPerPage + paginatedRecords.length);
        return { from, to };
    }, [totalCount, paginatedRecords.length, query.pageNumber, query.countPerPage]);

    const handlePaymentRecordUpdated = useCallback(() => {
        fetchPaymentRecords();
        setManageModalState({ show: false, mode: 'update', record: null });
    }, [fetchPaymentRecords]);

    const copyText = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Copied to clipboard",
                showConfirmButton: false,
                timer: 1500,
                background: "#f9fafb",
                color: "#111827",
            });
        } catch (err) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to copy",
                showConfirmButton: false,
                timer: 1500,
                background: "#fef2f2",
                color: "#7f1d1d",
            });
        }
    };

    if (!canAccessAccounts) {
        return null;
    }


    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="mb-6">
                <div className="flex flex-col gap-2 mb-6">
                    <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
                        Payment Records
                    </h1>
                    <p className="text-gray-600 text-sm md:text-base">
                        View and manage your payment records and transactions.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Total Records</p>
                                <p className="text-3xl font-black text-gray-900 mt-1">
                                    {summary.totalRecords}
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                <CurrencyDollarIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Incoming</p>
                                <p className="text-3xl font-black text-emerald-700 mt-1">
                                    {formatCurrency(summary.incomingAmount)}
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <CheckCircleIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Outgoing</p>
                                <p className="text-3xl font-black text-red-700 mt-1">
                                    {formatCurrency(summary.outgoingAmount)}
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                                <CurrencyDollarIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            value={query.search}
                            onChange={(event) => updateQueryAndResetPage({ search: event.target.value })}
                            placeholder="Search by order code, job code, name or status..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm md:text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">
                                Month
                            </label>
                            <Select
                                options={[
                                    { value: '', label: 'All months' },
                                    ...MONTH_OPTIONS,
                                ]}
                                value={{
                                    value: selectedMonth,
                                    label: selectedMonth
                                        ? MONTH_OPTIONS.find((m) => m.value === selectedMonth)
                                            ?.label || selectedMonth
                                        : 'All months',
                                }}
                                onChange={(selected) => {
                                    const nextMonth = selected?.value || '';
                                    setSelectedMonth(nextMonth);
                                    if (nextMonth !== '') {
                                        setStartDate('');
                                        setEndDate('');
                                    }
                                }}
                                styles={customSelectFieldStyles}
                                placeholder="Select month..."
                                className="react-select-container"
                                classNamePrefix="react-select"
                            />
                        </div>

                        {isAllMonthsSelected && (
                            <>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">
                                        From date
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(event) => setStartDate(event.target.value)}
                                        max={endDate || undefined}
                                        aria-label="From date"
                                        title="From date"
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F]"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">
                                        To date
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(event) => setEndDate(event.target.value)}
                                        min={startDate || undefined}
                                        aria-label="To date"
                                        title="To date"
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F]"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchPaymentRecords}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
                        >
                            <ArrowPathIcon
                                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                            />
                            Refresh
                        </button>
                        <button
                            onClick={handlePrintReport}
                            disabled={
                                isLoading ||
                                isGeneratingReport ||
                                filteredRecords.length === 0
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
                            title="Print the currently filtered report"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Print Report
                        </button>
                        <button
                            onClick={handleDownloadReport}
                            disabled={
                                isLoading ||
                                isGeneratingReport ||
                                filteredRecords.length === 0
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
                            title="Download PDF for the currently filtered report"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            Download PDF
                        </button>
                        <button
                            onClick={() => setShowAdvanced((prev) => !prev)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${showAdvanced
                                ? 'border-[#F59B0F] bg-orange-50 text-[#D17F0A]'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:border-[#F59B0F]'
                                }`}
                        >
                            <FunnelIcon className="w-4 h-4" />
                            Advanced Filters
                            {showAdvanced ? (
                                <ChevronUpIcon className="w-3.5 h-3.5" />
                            ) : (
                                <ChevronDownIcon className="w-3.5 h-3.5" />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                updateQuery({ ...INITIAL_PAYMENT_QUERY });
                                setSelectedMonth('');
                                setStartDate('');
                                setEndDate('');
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
                        >
                            Reset Filters
                        </button>
                    </div>

                    {showAdvanced && (
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Advanced Filters
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Bank
                                    </label>
                                    <Select
                                        options={[
                                            { value: 0, label: 'All banks' },
                                            ...filterOptions.banks.map((bank) => ({
                                                value: bank.id,
                                                label: bank.name,
                                            })),
                                        ]}
                                        value={{
                                            value: query.bankId || 0,
                                            label:
                                                query.bankId
                                                    ? filterOptions.banks.find((b) => b.id === query.bankId)?.name || `Bank #${query.bankId}`
                                                    : 'All banks',
                                        }}
                                        onChange={(selected) =>
                                            updateQueryAndResetPage({ bankId: Number(selected?.value || 0), bankDetailId: 0 })
                                        }
                                        styles={customSelectFieldStyles}
                                        placeholder="Select bank..."
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Verification Status
                                    </label>
                                    <Select
                                        options={[
                                            { value: null, label: 'All statuses' },
                                            ...filterOptions.verificationStatuses.map((s) => ({
                                                value: s.id,
                                                label: s.name,
                                            })),
                                        ]}
                                        value={{
                                            value: query.verificationStatusId,
                                            label:
                                                query.verificationStatusId
                                                    ? filterOptions.verificationStatuses.find((s) => s.id === query.verificationStatusId)?.name || 'All statuses'
                                                    : 'All statuses',
                                        }}
                                        onChange={(selected) =>
                                            updateQueryAndResetPage({ verificationStatusId: selected?.value ?? null })
                                        }
                                        styles={customSelectFieldStyles}
                                        placeholder="Select verification status..."
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Payment Type
                                    </label>
                                    <Select
                                        options={[
                                            { value: 0, label: 'All payment types' },
                                            ...filterOptions.paymentTypes.map((s) => ({
                                                value: s.id,
                                                label: s.name,
                                            })),
                                        ]}
                                        value={{
                                            value: query.paymentTypeId,
                                            label:
                                                filterOptions.paymentTypes.find((p) => p.id === query.paymentTypeId)?.name || 'All payment types',
                                        }}
                                        onChange={(selected) =>
                                            updateQueryAndResetPage({ paymentTypeId: Number(selected?.value || 0) })
                                        }
                                        styles={customSelectFieldStyles}
                                        placeholder="Select payment type..."
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                {canManagePaymentDirection && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                            Payment Direction
                                        </label>
                                        <Select
                                            options={[
                                                { value: null, label: 'All types' },
                                                { value: false, label: 'Incoming' },
                                                { value: true, label: 'Outgoing' },
                                            ]}
                                            value={{
                                                value: query.isReturn,
                                                label:
                                                    query.isReturn === null
                                                        ? 'All types'
                                                        : query.isReturn
                                                            ? 'Outgoing'
                                                            : 'Incoming',
                                            }}
                                            onChange={(selected) =>
                                                updateQueryAndResetPage({ isReturn: selected?.value ?? null })
                                            }
                                            styles={customSelectFieldStyles}
                                            placeholder="Select type..."
                                            className="react-select-container"
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Min Amount (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.minAmount ?? ''}
                                        onChange={(e) => updateQueryAndResetPage({ minAmount: e.target.value === '' ? null : Number(e.target.value) })}
                                        placeholder="e.g. 1000"
                                        aria-label="Minimum amount"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Max Amount (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.maxAmount ?? ''}
                                        onChange={(e) => updateQueryAndResetPage({ maxAmount: e.target.value === '' ? null : Number(e.target.value) })}
                                        placeholder="e.g. 50000"
                                        aria-label="Maximum amount"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div>
                                {/* <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Payment ID
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.paymentRecodeId || ''}
                                        onChange={(e) => updateQueryAndResetPage({ paymentRecodeId: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        placeholder="e.g. 101"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Order ID
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.orderId || ''}
                                        onChange={(e) => updateQueryAndResetPage({ orderId: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        placeholder="e.g. 450"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div> */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Bank Detail
                                    </label>
                                    <AsyncSelect
                                        cacheOptions
                                        defaultOptions
                                        loadOptions={debouncedLoadBankDetailOptions}
                                        value={{
                                            value: query.bankDetailId || 0,
                                            label: query.bankDetailId ? `Bank Detail #${query.bankDetailId}` : 'All bank details',
                                        }}
                                        onChange={(selected: any) => updateQueryAndResetPage({ bankDetailId: Number(selected?.value || 0) })}
                                        styles={customSelectFieldStyles}
                                        placeholder="Select bank detail..."
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                {/* <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Client ID
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.clientId || ''}
                                        onChange={(e) => updateQueryAndResetPage({ clientId: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        placeholder="e.g. 99"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div> */}
                                {!hideMarketFilter && (<div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Select Market
                                    </label>

                                    <AsyncSelect
                                        cacheOptions
                                        defaultOptions
                                        loadOptions={debouncedLoadMarketOptions}
                                        value={{
                                            value: query.marketId || 0,
                                            label:
                                                query.marketId
                                                    ? markets.find((market) => market.id === query.marketId)?.name || `Market #${query.marketId}`
                                                    : 'All markets',
                                        }}
                                        onChange={(selected: any) => updateQueryAndResetPage({ marketId: Number(selected?.value || 0) || null })}
                                        styles={customSelectFieldStyles}
                                        placeholder="Select market..."
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                    />
                                </div>)}
                            </div>
                        </div>
                    )}

                    {activeFilters.length > 0 && (
                        <div className="border-t border-gray-100 pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                                    Active:
                                </span>
                                {activeFilters.map((chip) => (
                                    <span
                                        key={chip.label}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 ring-1 ring-orange-200"
                                    >
                                        {chip.label}
                                        <button
                                            onClick={chip.onRemove}
                                            title={`Remove ${chip.label}`}
                                            className="hover:text-orange-600 transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="text-sm text-gray-700">
                            {isLoading ? (
                                <span className="text-gray-500">Loading...</span>
                            ) : (
                                <>
                                    Showing{' '}
                                    <span className="font-bold text-gray-900">
                                        {showingRange.from}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-bold text-gray-900">
                                        {showingRange.to}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-bold text-gray-900">
                                        {totalCount}
                                    </span>{' '}
                                    records
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 font-medium">
                                    Per page:
                                </span>
                                <div style={{ minWidth: 90 }}>
                                    <Select
                                        options={[
                                            { value: 10, label: '10' },
                                            { value: 20, label: '20' },
                                            { value: 50, label: '50' },
                                        ]}
                                        value={{ value: query.countPerPage, label: String(query.countPerPage) }}
                                        onChange={(selected) =>
                                            setQuery((current) => ({
                                                ...current,
                                                countPerPage: Number(selected?.value || 10),
                                                pageNumber: 0,
                                            }))
                                        }
                                        styles={customSelectFieldStyles}
                                        placeholder="Rows per page"
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        aria-label="Rows per page"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() =>
                                        setQuery((current) => ({ ...current, pageNumber: Math.max(0, current.pageNumber - 1) }))
                                    }
                                    disabled={query.pageNumber === 0 || isLoading}
                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                                    title="Previous page"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                                </button>
                                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                                    {query.pageNumber + 1} / {totalPages}
                                </div>
                                <button
                                    onClick={() =>
                                        setQuery((current) => ({
                                            ...current,
                                            pageNumber: Math.min(totalPages - 1, current.pageNumber + 1),
                                        }))
                                    }
                                    disabled={query.pageNumber >= totalPages - 1 || isLoading}
                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                                    title="Next page"
                                >
                                    <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
                    <p className="font-bold">Error loading payment records</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Order/Job Code
                                </th>
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Date
                                </th>
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Made By
                                </th>
                                <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Amount <small>(LKR)</small>
                                </th>
                                {/* <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Type
                                </th> */}
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Verification Status
                                </th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedRecords.map((record) => (
                                <tr
                                    key={record.id}
                                    className={`${getRowBackground(record.isReturn)} transition-colors hover:opacity-75`}
                                >
                                    <td className="py-4 px-4 font-semibold text-sm flex items-center gap-2">
                                        {getRecordCodes(record).join(', ') || '-'}
                                        <button
                                            onClick={() => copyText(getRecordCodes(record).join(', ') || '-')}
                                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                                            title="Copy to clipboard"
                                        >
                                            <MdContentCopy className="text-gray-600 hover:text-gray-800" />
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 text-sm">
                                        {getFormattedDate(record.createdAt)}
                                    </td>
                                    <td className="py-4 px-4 text-sm font-medium">
                                        {record.madeBy}
                                    </td>
                                    <td className="py-4 px-4 text-sm font-bold text-right">
                                        {formatCurrency(record.amount)}
                                    </td>
                                    {/* <td className="py-4 px-4 text-center">
                                        <span
                                            className={`py-2 px-4 rounded-2xl font-medium text-xs ${record.isReturn
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                                }`}
                                        >
                                            {record.isReturn ? 'Outgoing' : 'Incoming'}
                                        </span>
                                    </td> */}
                                    <td className="py-4 px-4 text-center">
                                        <span
                                            className={`py-2 px-4 rounded-2xl font-medium text-xs ${getStatusBadge(
                                                record.verificationStatus?.id,
                                                record.verificationStatus?.name
                                            )}`}
                                        >
                                            {record.verificationStatus?.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setManageModalState({
                                                        show: true,
                                                        mode: 'update',
                                                        record,
                                                    });
                                                }}
                                                className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#F59B0F] transition-all"
                                                title="View details"
                                                aria-label="View details"
                                            >
                                                <EyeIcon className="w-5 h-5 text-gray-700" />
                                            </button>

                                            {canManagePaymentRecordStatusOrDelete && (
                                                <button
                                                    onClick={() => {
                                                        setManageModalState({
                                                            show: true,
                                                            mode: 'delete',
                                                            record,
                                                        });
                                                    }}
                                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                                    title="Delete"
                                                    aria-label="Delete record"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}

                                            <Menu as="div" className="relative">
                                                <MenuButton className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#F59B0F] transition-all">
                                                    <EllipsisVerticalIcon className="w-5 h-5 text-gray-700" />
                                                </MenuButton>
                                                <MenuItems className="absolute right-0 z-100 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-100 data-closed:opacity-0 overflow-hidden">
                                                    <div className="p-1">
                                                        <MenuItem>
                                                            {({ active }) => (
                                                                <button
                                                                    onClick={() => {
                                                                        setManageModalState({
                                                                            show: true,
                                                                            mode: 'update',
                                                                            record,
                                                                        });
                                                                    }}
                                                                    className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-700 rounded-lg transition ${active
                                                                        ? 'bg-gray-100'
                                                                        : ''
                                                                        }`}
                                                                >
                                                                    <EyeIcon className="w-4 h-4" />
                                                                    View details
                                                                </button>
                                                            )}
                                                        </MenuItem>

                                                        <MenuItem>
                                                            {({ active }) => (
                                                                <button
                                                                    onClick={() => {
                                                                        if (!record.proofUrl) return;

                                                                        const link = document.createElement('a');
                                                                        link.href = record.proofUrl;
                                                                        link.target = '_blank';
                                                                        link.rel = 'noopener noreferrer';
                                                                        link.click();
                                                                    }}
                                                                    className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-green-600 rounded-lg transition ${active
                                                                        ? 'bg-green-50'
                                                                        : ''
                                                                        }`}
                                                                    title="Download proof"
                                                                >
                                                                    <DocumentArrowDownIcon className="w-4 h-4" />
                                                                    Download Proof
                                                                </button>
                                                            )}
                                                        </MenuItem>

                                                        {canManagePaymentRecordStatusOrDelete && (
                                                            <>
                                                                <MenuItem>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() => {
                                                                                setManageModalState({
                                                                                    show: true,
                                                                                    mode: 'status',
                                                                                    record,
                                                                                });
                                                                            }}
                                                                            className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-orange-600 rounded-lg transition ${active
                                                                                ? 'bg-orange-50'
                                                                                : ''
                                                                                }`}
                                                                        >
                                                                            <PrinterIcon className="w-4 h-4" />
                                                                            Update Status
                                                                        </button>
                                                                    )}
                                                                </MenuItem>

                                                                <MenuItem>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() => {
                                                                                setManageModalState({
                                                                                    show: true,
                                                                                    mode: 'delete',
                                                                                    record,
                                                                                });
                                                                            }}
                                                                            className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg transition ${active
                                                                                ? 'bg-red-50'
                                                                                : ''
                                                                                }`}
                                                                        >
                                                                            <TrashIcon className="w-4 h-4" />
                                                                            Delete
                                                                        </button>
                                                                    )}
                                                                </MenuItem>
                                                            </>
                                                        )}
                                                    </div>
                                                </MenuItems>
                                            </Menu>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {!isLoading && paginatedRecords.length === 0 && (
                        <div className="py-16 text-center">
                            <div className="inline-flex flex-col items-center">
                                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                                    <CurrencyDollarIcon className="w-10 h-10 text-[#F59B0F]" />
                                </div>
                                <p className="text-xl font-black text-gray-900 mb-2">
                                    No payment records found
                                </p>
                                <p className="text-gray-600 mb-6">
                                    Try adjusting the filters or date range
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <PaymentRecordManageModal
                isOpen={manageModalState.show}
                mode={manageModalState.mode}
                allowedModes={canManagePaymentRecordStatusOrDelete ? ['update', 'status', 'delete'] : ['update']}
                paymentRecord={manageModalState.record}
                userId={userId}
                paymentTypes={paymentTypes}
                verificationStatuses={verificationStatuses}
                loadBankDetailOptions={debouncedLoadBankDetailOptions}
                canManagePaymentDirection={canManagePaymentDirection}
                onUpdated={handlePaymentRecordUpdated}
                onClose={() => setManageModalState({ show: false, mode: 'update', record: null })}
            />
        </div>
    );
}

export default Accounts;

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
    }),
}; 
