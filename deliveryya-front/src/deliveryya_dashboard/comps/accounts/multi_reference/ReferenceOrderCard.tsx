import { BanknotesIcon, CurrencyDollarIcon, ShoppingCartIcon, TagIcon, TruckIcon } from '@heroicons/react/24/outline';

type OrderItem = {
    totalPrice?: number | null;
    deliveryFee?: number | null;
    collectivePrice?: number | null;
    orderCode?: { code?: string | null } | null;
    deliveryTo?: { fullName?: string | null; city?: { name?: string | null } | null } | null;
    paymentType?: { name?: string | null } | null;
    dontCollectDeliveryFeeFromCustomer?: boolean | null;
};

type Props = {
    code: string;
    detail: OrderItem | null;
    error?: string;
};

const formatMoney = (value?: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `LKR ${value.toLocaleString()}`;
};

function ReferenceOrderCard({ code, detail, error }: Props) {
    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Order {code}</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-700">Order {code}</p>
                <p className="text-sm text-gray-500 mt-1">No details found.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-orange-200 bg-linear-to-br from-orange-50 via-white to-amber-50 p-4">
            <h4 className="mb-3 text-sm font-bold text-orange-900">Order: {detail.orderCode?.code || code}</h4>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-3 rounded-md bg-white p-3 border border-orange-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#F59B0F]">
                        <TagIcon className="h-5 w-5" />
                    </span>
                    <div>
                        <dt className="font-medium text-gray-600 text-xs">Order Code</dt>
                        <dd className="text-gray-900">{detail.orderCode?.code || code}</dd>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-white p-3 border border-orange-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706]">
                        <ShoppingCartIcon className="h-5 w-5" />
                    </span>
                    <div>
                        <dt className="font-medium text-gray-600 text-xs">Order Price</dt>
                        <dd className="text-gray-900">{formatMoney(detail.totalPrice)}</dd>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-white p-3 border border-orange-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#3730A3]">
                        <TruckIcon className="h-5 w-5" />
                    </span>
                    <div>
                        <dt className="font-medium text-gray-600 text-xs">Delivery Fee</dt>
                        <dd className="text-gray-900">{formatMoney(detail.deliveryFee)}</dd>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-white p-3 border border-orange-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
                        <CurrencyDollarIcon className="h-5 w-5" />
                    </span>
                    <div>
                        <dt className="font-medium text-gray-600 text-xs">Collective Price</dt>
                        <dd className="text-gray-900">{formatMoney(detail.collectivePrice)}</dd>
                    </div>
                </div>
                <div className="sm:col-span-2 flex items-center gap-3 rounded-md bg-white p-3 border border-orange-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#B45309]">
                        <BanknotesIcon className="h-5 w-5" />
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 w-full">
                        <div>
                            <dt className="font-medium text-gray-600 text-xs">Customer</dt>
                            <dd className="text-gray-900">{detail.deliveryTo?.fullName || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-gray-600 text-xs">Payment Type</dt>
                            <dd className="text-gray-900">{detail.paymentType?.name || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-gray-600 text-xs">City</dt>
                            <dd className="text-gray-900">{detail.deliveryTo?.city?.name || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-gray-600 text-xs">Collect Fee From Customer</dt>
                            <dd className="text-gray-900">{detail.dontCollectDeliveryFeeFromCustomer ? 'No' : 'Yes'}</dd>
                        </div>
                    </div>
                </div>
            </dl>
        </div>
    );
}

export default ReferenceOrderCard;
