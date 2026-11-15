import {
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    TruckIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { type Order } from './types';

interface RecentOrdersProps {
    orders: Order[];
    deliveryStatuses: Array<{ id: number; name: string }>;
    paymentTypes: Array<{ id: number; name: string }>;
    paymentStatuses: Array<{ id: number; name: string }>;
}

type SelectOption<T extends string | number> = {
    value: T;
    label: string;
};

const customSelectFieldStyles = {
    control: (base: any, state: any) => ({
        ...base,
        minHeight: '48px',
        padding: '0.1rem',
        borderWidth: '2px',
        borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
        borderRadius: '0.75rem',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
        '&:hover': { borderColor: '#FCD34D' },
        transition: 'all 0.3s',
        backgroundColor: '#F9FAFB',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
        color: state.isSelected ? 'white' : '#1F2937',
        cursor: 'pointer',
    }),
};

function RecentOrders({ orders, deliveryStatuses, paymentTypes, paymentStatuses }: RecentOrdersProps) {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [deliveryStatusFilterId, setDeliveryStatusFilterId] = useState<number>(0);
    const [paymentTypeFilterId, setPaymentTypeFilterId] = useState<number>(0);
    const [paymentStatusFilterId, setPaymentStatusFilterId] = useState<number>(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

    const getStatusBadgeClass = (status: Order['status']) => {
        switch (status) {
            case 'to-accept':
                return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
            case 'to-pickup':
                return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';
            case 'on-delivery':
                return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
            case 'completed':
                return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
            case 'cancelled':
                return 'bg-red-50 text-red-700 ring-1 ring-red-200';
        }
    };

    const getStatusLabel = (status: Order['status']) => {
        switch (status) {
            case 'to-accept':
                return 'To Accept';
            case 'to-pickup':
                return 'To Pickup';
            case 'on-delivery':
                return 'On Delivery';
            case 'completed':
                return 'Completed';
            case 'cancelled':
                return 'Cancelled';
        }
    };

    const statusOptions = useMemo(
        () => [
            { value: 0, label: 'All delivery statuses' },
            ...deliveryStatuses.map((status) => ({
                value: status.id,
                label: status.name,
            })),
        ] satisfies SelectOption<number>[],
        [deliveryStatuses]
    );

    const paymentOptions = useMemo(
        () => [
            { value: 0, label: 'All payment types' },
            ...paymentTypes.map((type) => ({
                value: type.id,
                label: type.name,
            })),
        ] satisfies SelectOption<number>[],
        [paymentTypes]
    );

    const paymentStatusOptions = useMemo(
        () => [
            { value: 0, label: 'All payment statuses' },
            ...paymentStatuses.map((status) => ({
                value: status.id,
                label: status.name,
            })),
        ] satisfies SelectOption<number>[],
        [paymentStatuses]
    );

    const pageSizeSelectOptions = useMemo(() => [5, 10, 20, 50].map((size) => ({ value: size, label: String(size) })), []);

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        return orders.filter((order) => {
            if (deliveryStatusFilterId !== 0 && order.deliveryStatusId !== deliveryStatusFilterId) return false;
            if (paymentTypeFilterId !== 0 && order.paymentTypeId !== paymentTypeFilterId) return false;
            if (paymentStatusFilterId !== 0 && order.paymentStatusId !== paymentStatusFilterId) return false;

            if (!query) return true;

            return (
                order.id.toLowerCase().includes(query) ||
                order.customer.toLowerCase().includes(query) ||
                order.address.toLowerCase().includes(query) ||
                order.payment.toLowerCase().includes(query) ||
                order.deliveryStatusName.toLowerCase().includes(query) ||
                order.paymentTypeName.toLowerCase().includes(query) ||
                order.paymentStatusName.toLowerCase().includes(query) ||
                order.time.toLowerCase().includes(query)
            );
        });
    }, [orders, search, deliveryStatusFilterId, paymentTypeFilterId, paymentStatusFilterId]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredOrders.length / pageSize)), [filteredOrders.length, pageSize]);

    useEffect(() => {
        setPage((currentPage) => Math.min(currentPage, totalPages - 1));
    }, [totalPages]);

    const paginatedOrders = useMemo(() => {
        const start = page * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, page, pageSize]);

    const handleOrderCodeClick = (orderCode: string) => {
        navigate(`/deliverYya-cloud-console/placed-orders?orderCode=${encodeURIComponent(orderCode)}`);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h3 className="px-6 pt-6 text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ClockIcon className="w-7 h-7 text-[#FFA726]" />
                    Recent Orders
                </h3>

                <div className="md:hidden mb-4 px-6 pt-6 w-full">
                    <button
                        onClick={() => setIsFiltersExpanded((prev) => !prev)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-[#F59B0F] transition-all"
                    >
                        <span className="font-semibold text-gray-900">Order Filters</span>
                        <ChevronDownIcon className={`w-5 h-5 text-gray-600 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            <div className={`${isFiltersExpanded ? 'block' : 'hidden'} md:block px-6 pb-4`}>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(0);
                            }}
                            placeholder="Search by order code, customer, address, payment, status or time..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F]"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Select<SelectOption<number>, false>
                            value={statusOptions.find((option) => option.value === deliveryStatusFilterId) ?? statusOptions[0]}
                            onChange={(option) => {
                                setDeliveryStatusFilterId(option ? option.value : 0);
                                setPage(0);
                            }}
                            options={statusOptions}
                            styles={customSelectFieldStyles}
                        />

                        <Select<SelectOption<number>, false>
                            value={paymentOptions.find((option) => option.value === paymentTypeFilterId) ?? paymentOptions[0]}
                            onChange={(option) => {
                                setPaymentTypeFilterId(option ? option.value : 0);
                                setPage(0);
                            }}
                            options={paymentOptions}
                            styles={customSelectFieldStyles}
                        />

                        <Select<SelectOption<number>, false>
                            value={paymentStatusOptions.find((option) => option.value === paymentStatusFilterId) ?? paymentStatusOptions[0]}
                            onChange={(option) => {
                                setPaymentStatusFilterId(option ? option.value : 0);
                                setPage(0);
                            }}
                            options={paymentStatusOptions}
                            styles={customSelectFieldStyles}
                        />

                        <button
                            onClick={() => {
                                setSearch('');
                                setDeliveryStatusFilterId(0);
                                setPaymentTypeFilterId(0);
                                setPaymentStatusFilterId(0);
                                setPage(0);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="text-sm text-gray-700">
                            Showing <span className="font-bold text-gray-900">{paginatedOrders.length}</span> of{' '}
                            <span className="font-bold text-gray-900">{filteredOrders.length}</span> filtered orders
                        </div>

                        <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end">
                            <div className="flex items-center justify-between sm:justify-start gap-2">
                                <span className="text-sm text-gray-600 font-medium">Per page:</span>
                                <div className="w-28 sm:min-w-32 sm:w-auto">
                                    <CreatableSelect<SelectOption<number>, false>
                                        value={pageSizeSelectOptions.find((option) => option.value === pageSize) ?? { value: pageSize, label: String(pageSize) }}
                                        onChange={(option) => {
                                            const nextPageSize = option ? option.value : 10;
                                            setPageSize(nextPageSize);
                                            setPage(0);
                                        }}
                                        onCreateOption={(inputValue) => {
                                            const nextPageSize = Number(inputValue.trim());
                                            if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) return;
                                            setPageSize(nextPageSize);
                                            setPage(0);
                                        }}
                                        isValidNewOption={(inputValue) => {
                                            const nextPageSize = Number(inputValue.trim());
                                            if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) return false;
                                            return !pageSizeSelectOptions.some((option) => option.value === nextPageSize);
                                        }}
                                        formatCreateLabel={(inputValue) => `Use ${inputValue} rows`}
                                        options={pageSizeSelectOptions}
                                        styles={customSelectFieldStyles}
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        instanceId="delivery-company-recent-orders-page-size"
                                        aria-label="Per page"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-start gap-2">
                                <button
                                    onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                                    disabled={page <= 0}
                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                                </button>

                                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                                    {page + 1} / {totalPages}
                                </div>

                                <button
                                    onClick={() => setPage((currentPage) => Math.min(totalPages - 1, currentPage + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200"
                                >
                                    <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                            <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Order</th>
                            <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Customer</th>
                            <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Payment</th>
                            <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                            <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Amount</th>
                            <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-orange-50/40 transition-colors">
                                <td className="py-4 px-4">
                                    <button
                                        type="button"
                                        onClick={() => handleOrderCodeClick(order.id)}
                                        className="font-bold hover:text-[#AC6C2A] hover:underline transition-colors"
                                        title={`View details for ${order.id}`}
                                    >
                                        {order.id}
                                    </button>
                                </td>
                                <td className="py-4 px-4 min-w-65">
                                    <p className="font-semibold text-gray-900 text-sm">{order.customer}</p>
                                    <p className="text-xs text-gray-600 mt-1">{order.address}</p>
                                </td>
                                <td className="py-4 px-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${order.payment === 'COD' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'}`}>
                                        {order.payment}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadgeClass(order.status)}`}>
                                        {order.deliveryStatusName || getStatusLabel(order.status)}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right font-bold text-gray-900">
                                    LKR {order.amount.toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-center">
                                    <span className="text-sm text-gray-500">{order.time}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {paginatedOrders.length === 0 && (
                <div className="text-center py-12">
                    <TruckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No orders found for this filter</p>
                </div>
            )}
        </div>
    );
}

export default RecentOrders;
