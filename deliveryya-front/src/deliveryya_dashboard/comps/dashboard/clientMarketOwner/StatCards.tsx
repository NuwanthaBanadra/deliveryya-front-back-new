import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { type ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: string;
    trendUp?: boolean;
    color: string;
    bgColor: string;
    subtitle?: string;
    onClick?: () => void;
}

function StatCard({ title, value, icon, trend, trendUp, color, bgColor, subtitle, onClick }: StatCardProps) {
    return (
        <div
            onClick={onClick}
            className={`${bgColor} rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 backdrop-blur-sm ${
                onClick ? 'cursor-pointer' : ''
            }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-white/80 text-sm font-medium mb-2">{title}</p>
                    <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
                    {subtitle && <p className="text-white/70 text-xs">{subtitle}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 ${trendUp ? 'text-green-300' : 'text-red-300'}`}>
                            <ArrowTrendingUpIcon className={`w-4 h-4 ${!trendUp && 'rotate-180'}`} />
                            <span className="text-sm font-semibold">{trend}</span>
                        </div>
                    )}
                </div>
                <div className={`p-4 ${color} bg-white/20 backdrop-blur-sm rounded-xl`}>{icon}</div>
            </div>
        </div>
    );
}

export default StatCard;
