import { ClockIcon, TruckIcon } from '@heroicons/react/24/outline';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface PerformanceChartsProps {
    orderStatusData: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    deliveryPerformance: Array<{
        hour: string;
        deliveries: number;
    }>;
}

function PerformanceCharts({ orderStatusData, deliveryPerformance }: PerformanceChartsProps) {
    return (
        <>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ClockIcon className="w-6 h-6 text-[#FF6B35]" />
                    Order Status Distribution
                </h3>
                <div className="[&_svg]:outline-none **:outline-none">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={orderStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {orderStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 lg:col-span-2">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TruckIcon className="w-6 h-6 text-[#FFA726]" />
                    Hourly Delivery Performance
                </h3>
                <div className="[&_svg]:outline-none **:outline-none">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={deliveryPerformance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="hour" stroke="#999" />
                            <YAxis stroke="#999" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                }}
                            />
                            <Bar dataKey="deliveries" fill="#FFA726" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
}

export default PerformanceCharts;
