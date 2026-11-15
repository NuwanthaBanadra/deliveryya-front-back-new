import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import {
    Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface RevenueChartsProps {
    data: Array<{
        name: string;
        revenue: number;
        orders: number;
    }>;
    yAxisMetric?: 'revenue' | 'orders';
    yAxisMax?: number | null;
}

const formatCompactNumber = (value: number): string => {
    const absoluteValue = Math.abs(value);

    if (absoluteValue >= 1_000_000) {
        const scaled = value / 1_000_000;
        return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}m`;
    }

    if (absoluteValue >= 1_000) {
        const scaled = value / 1_000;
        return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}k`;
    }

    return String(value);
};

function RevenueCharts({ data, yAxisMetric = 'revenue', yAxisMax = null }: RevenueChartsProps) {
    const yAxisLabel = yAxisMetric === 'orders' ? 'Orders' : 'Revenue';
    const yAxisColor = yAxisMetric === 'orders' ? '#F59B0F' : '#00BFA5';

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-6 h-6 text-[#00BFA5]" />
                Revenue & Orders Trend
            </h3>
            <div className="[&_svg]:outline-none **:outline-none">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="delivery-colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={yAxisColor} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={yAxisColor} stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#999" />
                        <YAxis
                            stroke="#999"
                            width={56}
                            tickFormatter={formatCompactNumber}
                            domain={[0, yAxisMax ?? 'auto']}
                        />
                        <Tooltip
                            formatter={(value, name) => {
                                const numericValue = typeof value === 'number' ? value : Number(value);
                                return [
                                    Number.isFinite(numericValue) ? formatCompactNumber(numericValue) : value,
                                    name === yAxisMetric ? yAxisLabel : name,
                                ];
                            }}
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey={yAxisMetric}
                            stroke={yAxisColor}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#delivery-colorRevenue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default RevenueCharts;
