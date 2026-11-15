import {
    BanknotesIcon, CreditCardIcon, CheckCircleIcon, CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import Select from 'react-select';
import StatCard from './StatCards';
import { CalendarDaysIcon } from '@heroicons/react/24/solid';

type PaymentTypeOption = {
    id: number;
    name: string;
};

type PaymentStatusOption = {
    id: number;
    name: string;
};

type FinancialFilters = {
    paymentTypeId: number | null;
    paymentStatusId: number | null;
    fromDate: string;
    toDate: string;
};

type SelectOption = {
    value: number | null;
    label: string;
};

type DateRangePreset = 'today' | 'last7' | 'last30' | 'last90' | 'custom';
type PaymentPreset = 'all' | 'codPending' | 'onlinePaid' | 'completed';

interface FinancialOverviewProps {
    stats: {
        totalRevenue: number;
        codPending: number;
        onlinePaidRevenue: number;
        completedPayments: number;
    };
    paymentTypes: PaymentTypeOption[];
    paymentStatuses: PaymentStatusOption[];
    filters: FinancialFilters;
    onFilterChange: (patch: Partial<FinancialFilters>) => void;
    onResetFilters: () => void;
}

const getDateRange = (preset: DateRangePreset): { fromDate: string; toDate: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toDate = today.toISOString().split('T')[0];

    if (preset === 'today') {
        return { fromDate: toDate, toDate };
    }

    const fromDate = new Date(today);
    if (preset === 'last7') {
        fromDate.setDate(fromDate.getDate() - 7);
    } else if (preset === 'last30') {
        fromDate.setDate(fromDate.getDate() - 30);
    } else if (preset === 'last90') {
        fromDate.setDate(fromDate.getDate() - 90);
    } else {
        return { fromDate: '', toDate: '' };
    }

    return { fromDate: fromDate.toISOString().split('T')[0], toDate };
};

const getDateRangePresetClass = (preset: DateRangePreset, isActive: boolean): string => {
    if (!isActive) return 'bg-gray-100 text-gray-700 hover:bg-gray-200';

    if (preset === 'today') return 'bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white shadow-lg shadow-orange-500/30';
    if (preset === 'last7') return 'bg-blue-600 text-white shadow-lg shadow-blue-500/30';
    if (preset === 'last30') return 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30';
    if (preset === 'last90') return 'bg-purple-600 text-white shadow-lg shadow-purple-500/30';
    if (preset === 'custom') return 'bg-gray-700 text-white shadow-lg shadow-gray-500/30';

    return 'bg-gray-700 text-white shadow-lg shadow-gray-500/30';
};

const getCurrentDateRangePreset = (fromDate: string, toDate: string): DateRangePreset => {
    if (!fromDate || !toDate) return 'custom';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Check for Today
    if (fromDate === todayStr && toDate === todayStr) return 'today';

    // Check for Last 7 Days
    const last7 = new Date(today);
    last7.setDate(last7.getDate() - 7);
    const last7Str = last7.toISOString().split('T')[0];
    if (fromDate === last7Str && toDate === todayStr) return 'last7';

    // Check for Last 30 Days
    const last30 = new Date(today);
    last30.setDate(last30.getDate() - 30);
    const last30Str = last30.toISOString().split('T')[0];
    if (fromDate === last30Str && toDate === todayStr) return 'last30';

    // Check for Last 90 Days
    const last90 = new Date(today);
    last90.setDate(last90.getDate() - 90);
    const last90Str = last90.toISOString().split('T')[0];
    if (fromDate === last90Str && toDate === todayStr) return 'last90';

    return 'custom';
};

const customSelectFieldStyles = {
    control: (base: any, state: any) => ({
        ...base,
        minHeight: '42px',
        borderWidth: '2px',
        borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
        borderRadius: '0.75rem',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
        '&:hover': { borderColor: '#FCD34D' },
        transition: 'all 0.2s',
        backgroundColor: 'white',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
        color: state.isSelected ? 'white' : '#1F2937',
        cursor: 'pointer',
    }),
    menu: (base: any) => ({
        ...base,
        zIndex: 9999,
        borderRadius: '0.75rem',
        overflow: 'hidden',
    }),
    menuPortal: (base: any) => ({
        ...base,
        zIndex: 9999,
    }),
};

const normalizeText = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, '');

const getPaymentPresetClass = (preset: PaymentPreset, isActive: boolean): string => {
    if (!isActive) return 'bg-gray-100 text-gray-700 hover:bg-gray-200';

    if (preset === 'all') return 'bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white shadow-lg shadow-orange-500/30';
    if (preset === 'codPending') return 'bg-rose-600 text-white shadow-lg shadow-rose-500/30';
    if (preset === 'onlinePaid') return 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30';
    if (preset === 'completed') return 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30';

    return 'bg-gray-700 text-white shadow-lg shadow-gray-500/30';
};

const findIdByKeywords = (
    options: Array<{ id: number; name: string }>,
    keywords: string[]
): number | null => {
    const match = options.find((option) => {
        const normalized = normalizeText(option.name);
        return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
    });
    return match?.id ?? null;
};

const resolvePresetIds = (
    paymentTypes: PaymentTypeOption[],
    paymentStatuses: PaymentStatusOption[]
): {
    codTypeId: number | null;
    onlineTypeId: number | null;
    pendingStatusId: number | null;
    completedStatusId: number | null;
} => ({
    codTypeId: findIdByKeywords(paymentTypes, ['cod', 'cashondelivery']),
    onlineTypeId: findIdByKeywords(paymentTypes, ['online', 'card', 'bank', 'transfer']),
    pendingStatusId: findIdByKeywords(paymentStatuses, ['pending']),
    completedStatusId: findIdByKeywords(paymentStatuses, ['completed', 'paid', 'success']),
});

const getPaymentPresetPatch = (
    preset: PaymentPreset,
    resolvedIds: {
        codTypeId: number | null;
        onlineTypeId: number | null;
        pendingStatusId: number | null;
        completedStatusId: number | null;
    }
): Partial<FinancialFilters> => {
    if (preset === 'all') {
        return { paymentTypeId: null, paymentStatusId: null };
    }

    if (preset === 'codPending') {
        return {
            paymentTypeId: resolvedIds.codTypeId,
            paymentStatusId: resolvedIds.pendingStatusId,
        };
    }

    if (preset === 'onlinePaid') {
        return {
            paymentTypeId: resolvedIds.onlineTypeId,
            paymentStatusId: resolvedIds.completedStatusId,
        };
    }

    return {
        paymentTypeId: null,
        paymentStatusId: resolvedIds.completedStatusId,
    };
};

const getActivePaymentPreset = (
    filters: FinancialFilters,
    resolvedIds: {
        codTypeId: number | null;
        onlineTypeId: number | null;
        pendingStatusId: number | null;
        completedStatusId: number | null;
    }
): PaymentPreset | 'custom' => {
    const { paymentTypeId, paymentStatusId } = filters;

    if (paymentTypeId === null && paymentStatusId === null) return 'all';
    if (paymentTypeId === resolvedIds.codTypeId && paymentStatusId === resolvedIds.pendingStatusId) return 'codPending';
    if (paymentTypeId === resolvedIds.onlineTypeId && paymentStatusId === resolvedIds.completedStatusId) return 'onlinePaid';
    if (paymentTypeId === null && paymentStatusId === resolvedIds.completedStatusId) return 'completed';

    return 'custom';
};

function FinancialOverview({ stats, paymentTypes, paymentStatuses, filters, onFilterChange, onResetFilters }: FinancialOverviewProps) {
    const currentPreset = useMemo(() => getCurrentDateRangePreset(filters.fromDate, filters.toDate), [filters.fromDate, filters.toDate]);
    const resolvedPresetIds = useMemo(() => resolvePresetIds(paymentTypes, paymentStatuses), [paymentTypes, paymentStatuses]);
    const activePaymentPreset = useMemo(
        () => getActivePaymentPreset(filters, resolvedPresetIds),
        [filters, resolvedPresetIds]
    );

    const paymentTypeOptions = useMemo<SelectOption[]>(
        () => [{ value: null, label: 'All pay types' }, ...paymentTypes.map((item) => ({ value: item.id, label: item.name }))],
        [paymentTypes]
    );

    const paymentStatusOptions = useMemo<SelectOption[]>(
        () => [{ value: null, label: 'All pay statuses' }, ...paymentStatuses.map((item) => ({ value: item.id, label: item.name }))],
        [paymentStatuses]
    );

    const handleDatePresetClick = (preset: DateRangePreset) => {
        if (preset === 'custom') {
            onFilterChange({ fromDate: '', toDate: '' });
        } else {
            const { fromDate, toDate } = getDateRange(preset);
            onFilterChange({ fromDate, toDate });
        }
    };

    const handlePaymentPresetClick = (preset: PaymentPreset) => {
        onFilterChange(getPaymentPresetPatch(preset, resolvedPresetIds));
    };

    return (
        <div className="mb-8">
            <div className="mb-6 flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <BanknotesIcon className="w-7 h-7 text-[#FFA726]" />
                    Financial Overview
                </h2>

                {/* Date Range Preset Buttons */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <CalendarDaysIcon className="h-5 w-5 text-[#F59B0F]" />
                        Date Range
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => handleDatePresetClick('today')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getDateRangePresetClass('today', currentPreset === 'today')}`}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDatePresetClick('last7')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getDateRangePresetClass('last7', currentPreset === 'last7')}`}
                        >
                            Last 7 Days
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDatePresetClick('last30')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getDateRangePresetClass('last30', currentPreset === 'last30')}`}
                        >
                            Last 30 Days
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDatePresetClick('last90')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getDateRangePresetClass('last90', currentPreset === 'last90')}`}
                        >
                            Last Quarter
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDatePresetClick('custom')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getDateRangePresetClass('custom', currentPreset === 'custom')}`}
                        >
                            Custom Range
                        </button>
                    </div>
                </div>

                {/* Payment Type & Status Filters */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <CalendarDaysIcon className="h-5 w-5 text-[#F59B0F]" />
                        Payment Filters
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => handlePaymentPresetClick('all')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getPaymentPresetClass('all', activePaymentPreset === 'all')}`}
                        >
                            All Transactions
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePaymentPresetClick('codPending')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getPaymentPresetClass('codPending', activePaymentPreset === 'codPending')}`}
                        >
                            COD Pending
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePaymentPresetClick('onlinePaid')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getPaymentPresetClass('onlinePaid', activePaymentPreset === 'onlinePaid')}`}
                        >
                            Online Paid
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePaymentPresetClick('completed')}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${getPaymentPresetClass('completed', activePaymentPreset === 'completed')}`}
                        >
                            Completed Payments
                        </button>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        <Select<SelectOption, false>
                            value={paymentTypeOptions.find((option) => option.value === filters.paymentTypeId) ?? paymentTypeOptions[0]}
                            onChange={(option) => onFilterChange({ paymentTypeId: option?.value ?? null })}
                            options={paymentTypeOptions}
                            styles={customSelectFieldStyles}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            instanceId="financial-payment-type"
                            aria-label="Financial payment type"
                        />

                        <Select<SelectOption, false>
                            value={paymentStatusOptions.find((option) => option.value === filters.paymentStatusId) ?? paymentStatusOptions[0]}
                            onChange={(option) => onFilterChange({ paymentStatusId: option?.value ?? null })}
                            options={paymentStatusOptions}
                            styles={customSelectFieldStyles}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            instanceId="financial-payment-status"
                            aria-label="Financial payment status"
                        />

                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(event) => onFilterChange({ fromDate: event.target.value })}
                            max={filters.toDate || undefined}
                            className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#F59B0F] focus:outline-none"
                            title="From date"
                            aria-label="Financial from date"
                        />

                        <input
                            type="date"
                            value={filters.toDate}
                            onChange={(event) => onFilterChange({ toDate: event.target.value })}
                            min={filters.fromDate || undefined}
                            className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#F59B0F] focus:outline-none"
                            title="To date"
                            aria-label="Financial to date"
                        />

                        <button
                            type="button"
                            onClick={onResetFilters}
                            className="rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2 text-sm font-semibold text-white"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`LKR ${stats.totalRevenue.toLocaleString()}`}
                    icon={<BanknotesIcon className="w-8 h-8 text-white" />}
                    color="text-white"
                    bgColor="bg-gradient-to-br from-[#00BFA5] to-[#00897B]"
                    subtitle="Paid statuses"
                />
                <StatCard
                    title="COD Pending"
                    value={`LKR ${stats.codPending.toLocaleString()}`}
                    icon={<CreditCardIcon className="w-8 h-8 text-white" />}
                    color="text-white"
                    bgColor="bg-gradient-to-br from-[#FF6F91] to-[#FF9AAC]"
                    subtitle="COD + Pending"
                />
                <StatCard
                    title="Online Paid Revenue"
                    value={`LKR ${stats.onlinePaidRevenue.toLocaleString()}`}
                    icon={<CurrencyDollarIcon className="w-8 h-8 text-white" />}
                    color="text-white"
                    bgColor="bg-gradient-to-br from-[#5C6BC0] to-[#7986CB]"
                    subtitle="Online + Paid statuses"
                />
                <StatCard
                    title="Completed Payments"
                    value={stats.completedPayments}
                    icon={<CheckCircleIcon className="w-8 h-8 text-white" />}
                    color="text-white"
                    bgColor="bg-gradient-to-br from-[#26A69A] to-[#4DB6AC]"
                    subtitle="Completed/Paid orders"
                />
            </div>
        </div>
    );
}

export default FinancialOverview;
