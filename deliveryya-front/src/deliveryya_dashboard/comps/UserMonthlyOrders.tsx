import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axiosInstance from '../../util/AxiosUtil';

interface MonthlyOrderSummary {
  year: number;
  month: number;
  monthName: string;
  orderCount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  completedOrders: number;
  pendingOrders: number;
}

interface OrderStatus {
  id?: number;
  name?: string;
}

interface MonthlyOrder {
  totalPrice?: number;
  paidAmount?: number;
  deliveryStatus?: OrderStatus | string;
  deliveryStatusId?: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function UserMonthlyOrders() {
  const PAGE_SIZE = 6;
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { userId?: string, userName?: string } | null;

  const userId = state?.userId;
  const userName = state?.userName;

  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyOrderSummary[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      Swal.fire('Error', 'User ID not provided. Please navigate from the manage-users page.', 'error');
      navigate('/deliverYya-cloud-console/manage-users');
      return;
    }

    fetchMonthlyOrders();
  }, [userId, navigate]);

  const fetchMonthlyOrders = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError('');

    try {
      const numericUserId = Number(userId);
      if (isNaN(numericUserId) || numericUserId <= 0) {
        throw new Error('Invalid User ID');
      }

      const token = localStorage.getItem('jwtToken');
      const currentYear = new Date().getFullYear();
      const summaries: MonthlyOrderSummary[] = [];

      // Fetch all orders for each of the last 12 months so monthly totals are complete.
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, new Date().getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        const formatDateForApi = (date: Date, isEndOfDay = false): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return isEndOfDay 
            ? `${year}-${month}-${day}T23:59:59`
            : `${year}-${month}-${day}T00:00:00`;
        };

        const monthOrders: MonthlyOrder[] = [];
        let pageNumber = 0;
        let totalPages = 1;

        while (pageNumber < totalPages && pageNumber < 500) {
          const requestBody = {
            pageNumber,
            countPerPage: 200,
            totalCount: 0,
            totalPages: 0,
            cityId: 0,
            orderId: 0,
            userId: 0,
            markerOrderId: 0,
            orderCode: '',
            sendingUserId: numericUserId,
            receivingUserId: 0,
            deliveryStatusId: 0,
            paymentStatusId: 0,
            paymentTypeId: 0,
            minPrice: 0,
            maxPrice: 0,
            fromDate: formatDateForApi(monthStart),
            toDate: formatDateForApi(monthEnd, true),
            dontCollectDeliveryFeeFromCustomer: false,
            search: '',
          };

          const response = await axiosInstance.post('/orders/get-orders', requestBody, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            withCredentials: true,
          });

          if (response.data.message?.toLowerCase() !== 'success') break;

          const payload = response.data?.object ?? response.data?.exData ?? response.data;
          const itemsArray: MonthlyOrder[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.items)
              ? payload.items
              : [];
          const eligibleMonthOrders = itemsArray.filter((order) => {
            const deliveryStatus = order.deliveryStatus;
            const statusName = typeof deliveryStatus === 'string'
              ? deliveryStatus
              : deliveryStatus?.name;
            const statusId = typeof deliveryStatus === 'object'
              ? deliveryStatus?.id
              : order.deliveryStatusId;

            return statusId === 9 || statusId === 10 ||
              /^returned$/i.test(statusName?.trim() || '') ||
              /^accepted\s*by\s*customer$/i.test(statusName?.trim() || '');
          });
          monthOrders.push(...eligibleMonthOrders);
          totalPages = Math.max(
            1,
            Number(payload?.totalPages ?? response.data?.totalPages ?? 1),
          );
          pageNumber += 1;
          if (itemsArray.length === 0) break;
        }

        if (monthOrders.length > 0) {
          const totalAmount = monthOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
          const paidAmount = monthOrders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);
          const completedOrders = monthOrders.filter((order) => {
            const deliveryStatus = order.deliveryStatus;
            const statusName = typeof deliveryStatus === 'string' ? deliveryStatus : deliveryStatus?.name;
            const statusId = typeof deliveryStatus === 'object' ? deliveryStatus?.id : order.deliveryStatusId;

            return statusId === 10 ||
              /^accepted\s*by\s*customer$/i.test(statusName?.trim() || '');
          }).length;
          const pendingOrders = monthOrders.length - completedOrders;

          summaries.push({
            year,
            month,
            monthName: MONTH_NAMES[month - 1],
            orderCount: monthOrders.length,
            totalAmount,
            paidAmount,
            pendingAmount: totalAmount - paidAmount,
            completedOrders,
            pendingOrders,
          });
        }
      }

      setMonthlySummaries(summaries);
      setPage(0);
    } catch (err: any) {
      console.error('Error fetching monthly orders:', err);
      const errorMessage = err?.response?.data?.desc || err?.message || 'Failed to fetch monthly orders';
      setError(errorMessage);
      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMonthDetails = (year: number, month: number) => {
    navigate('/deliverYya-cloud-console/settlement-report', {
      state: {
        userId,
        userName,
        year,
        month,
        monthName: MONTH_NAMES[month - 1],
      },
    });
  };

  const handleBack = () => {
    navigate('/deliverYya-cloud-console/manage-users');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
    }).format(amount);
  };

  const totalPages = Math.max(1, Math.ceil(monthlySummaries.length / PAGE_SIZE));
  const visibleSummaries = monthlySummaries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 pb-12 space-y-6">
      <div>
        <div className="flex flex-col gap-2 mb-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors w-fit"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="font-semibold">Back to Users</span>
          </button>

          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            Monthly Order Summary
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            View order history organized by month
          </p>
        </div>

        {userName && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 mb-6">
            <span className="text-sm font-semibold text-orange-900">Selected User:</span>
            <span className="text-sm font-bold text-gray-900">{userName}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={fetchMonthlyOrders}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {isLoading && monthlySummaries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex flex-col items-center">
              <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
              <p className="text-gray-600">Loading monthly orders...</p>
            </div>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="inline-flex flex-col items-center">
              <p className="text-red-600 font-bold mb-2">Error loading data</p>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : monthlySummaries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex flex-col items-center">
              <DocumentArrowDownIcon className="w-10 h-10 text-gray-400 mb-4" />
              <p className="text-xl font-black text-gray-900 mb-2">No orders found</p>
              <p className="text-gray-600">This user has no orders in the last 12 months</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Month
                  </th>
                  <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Total Orders
                  </th>
                  <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Completed
                  </th>
                  <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Pending
                  </th>
                  <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Total Amount
                  </th>
                  <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Paid Amount
                  </th>
                  <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Pending Amount
                  </th>
                  <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleSummaries.map((summary) => (
                  <tr key={`${summary.year}-${summary.month}`} className="hover:bg-orange-50/40 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-900">{summary.monthName}</p>
                      <p className="text-sm text-gray-500">{summary.year}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-orange-100 text-orange-800">
                        {summary.orderCount}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-emerald-100 text-emerald-800">
                        {summary.completedOrders}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-yellow-100 text-yellow-800">
                        {summary.pendingOrders}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(summary.totalAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(summary.paidAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-orange-600">
                      {formatCurrency(summary.pendingAmount)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewMonthDetails(summary.year, summary.month)}
                          className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all"
                          title="View Settlement Report"
                        >
                          <EyeIcon className="w-5 h-5 text-gray-700" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, monthlySummaries.length)} of {monthlySummaries.length} months
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0 || isLoading}
                  className="rounded-lg border-2 border-gray-200 bg-white p-2 transition hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
                </button>
                <span className="min-w-20 text-center text-sm font-semibold text-gray-700">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="rounded-lg border-2 border-gray-200 bg-white p-2 transition hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserMonthlyOrders;
