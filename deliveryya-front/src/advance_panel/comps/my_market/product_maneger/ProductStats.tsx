import {
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface StatsData {
  totalProducts: number;
  activeProducts: number;
  totalRevenue: number;
  totalSold: number;
  totalViews: number;
  averageRating: number;
  revenueChange: number; // percentage
  salesChange: number; // percentage
}

interface ProductStatsProps {
  stats: StatsData;
}

function ProductStats({ stats }: ProductStatsProps) {
  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      subValue: `${stats.activeProducts} Active`,
      icon: ShoppingBagIcon,
      gradient: 'from-[#F59B0F] to-[#AC6C2A]',
      bgGradient: 'from-orange-50 to-amber-50',
      iconColor: 'text-[#F59B0F]',
    },
    {
      title: 'Total Revenue (LKR)',
      value: `${stats.totalRevenue.toLocaleString()}`,
      change: stats.revenueChange,
      icon: CurrencyDollarIcon,
      gradient: 'from-[#00BFA5] to-[#1DE9B6]',
      bgGradient: 'from-teal-50 to-cyan-50',
      iconColor: 'text-[#00BFA5]',
    },
    {
      title: 'Total Sold',
      value: stats.totalSold.toLocaleString(),
      change: stats.salesChange,
      icon: ChartBarIcon,
      gradient: 'from-[#7E57C2] to-[#9575CD]',
      bgGradient: 'from-purple-50 to-violet-50',
      iconColor: 'text-[#7E57C2]',
    },
    {
      title: 'Total Views',
      value: stats.totalViews.toLocaleString(),
      subValue: `★ ${stats.averageRating.toFixed(1)} Rating`,
      icon: EyeIcon,
      gradient: 'from-[#FFA726] to-[#FFB84D]',
      bgGradient: 'from-amber-50 to-yellow-50',
      iconColor: 'text-[#FFB84D]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${stat.bgGradient} rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:scale-105`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            {stat.change !== undefined && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                  stat.change >= 0
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {stat.change >= 0 ? (
                  <ArrowTrendingUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3 h-3" />
                )}
                {Math.abs(stat.change)}%
              </div>
            )}
          </div>
          <div>
            <p className="text-gray-600 text-sm font-semibold mb-1">{stat.title}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${stat.iconColor} mb-1`}>
              {stat.value}
            </p>
            {stat.subValue && (
              <p className="text-xs text-gray-500 font-medium">{stat.subValue}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductStats;