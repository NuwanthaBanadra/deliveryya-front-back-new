import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    TruckIcon,
} from '@heroicons/react/24/outline';
import StatCard from './StatCards';

type StatusCard = {
    id: number;
    name: string;
    count: number;
};

interface OrderStatusOverviewProps {
    totalOrders: number;
    statusCards: StatusCard[];
    onStatusClick: (deliveryStatusId: number | null) => void;
}

const cardGradients = [
    'bg-gradient-to-br from-[#7E57C2] to-[#9575CD]',
    'bg-gradient-to-br from-[#FFA726] to-[#FFB84D]',
    'bg-gradient-to-br from-[#00BFA5] to-[#1DE9B6]',
    'bg-gradient-to-br from-[#FF6B35] to-[#FF8C42]',
    'bg-gradient-to-br from-[#F59B0F] to-[#D17F0A]',
    'bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8]',
];

function OrderStatusOverview({ totalOrders, statusCards, onStatusClick }: OrderStatusOverviewProps) {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <TruckIcon className="w-7 h-7 text-[#FF6B35]" />
                Order Status Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                <StatCard
                    title="Total Orders"
                    value={totalOrders}
                    icon={<ExclamationTriangleIcon className="w-8 h-8 text-white" />}
                    color="text-white"
                    bgColor="bg-gradient-to-br from-[#FF6B35] to-[#FF8C42]"
                    subtitle="All orders"
                    onClick={() => onStatusClick(null)}
                />
                {statusCards.map((statusCard, index) => (
                    <StatCard
                        key={statusCard.id}
                        title={statusCard.name}
                        value={statusCard.count}
                        icon={
                            statusCard.name.toLowerCase().includes('accept') || statusCard.name.toLowerCase().includes('deliver')
                                ? <CheckCircleIcon className="w-8 h-8 text-white" />
                                : <TruckIcon className="w-8 h-8 text-white" />
                        }
                        color="text-white"
                        bgColor={cardGradients[index % cardGradients.length]}
                        subtitle="Orders in this status"
                        onClick={() => onStatusClick(statusCard.id)}
                    />
                ))}
            </div>
        </div>
    );
}

export default OrderStatusOverview;
