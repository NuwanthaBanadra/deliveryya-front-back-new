import { TruckIcon } from '@heroicons/react/24/outline';
import StatCard from './StatCards';

interface OrderStatusOverviewProps {
    totalOrders: number;
    statusCards: Array<{
        id: number;
        name: string;
        count: number;
        bgColor: string;
        subtitle: string;
    }>;
    onStatusClick?: (deliveryStatusId: number) => void;
}

function OrderStatusOverview({ totalOrders, statusCards, onStatusClick }: OrderStatusOverviewProps) {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <TruckIcon className="w-7 h-7 text-[#FF6B35]" />
                Order Status Overview
            </h2>
            <p className="text-sm text-gray-600 mb-4">Total Orders: <span className="font-semibold text-gray-900">{totalOrders}</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {statusCards.map((card) => (
                    <StatCard
                        key={card.id}
                        title={card.name}
                        value={card.count}
                        icon={<TruckIcon className="w-8 h-8 text-white" />}
                        color="text-white"
                        bgColor={card.bgColor}
                        subtitle={card.subtitle}
                        onClick={onStatusClick ? () => onStatusClick(card.id) : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

export default OrderStatusOverview;
