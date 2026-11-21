import { ArrowPathIcon, ChevronLeftIcon, DocumentArrowDownIcon, PrinterIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import Swal from 'sweetalert2';
import axiosInstance from '../../util/AxiosUtil';
import { createSettlementReportPdfFile, runSettlementReportPdfAction, type SettlementReportPdfInput } from '../../util/pdf/SettlementReportPdf';
import { getCurrentUserId } from '../../util/AccessController';
import { ROLE_IDS } from '../../util/RoleAccess';

interface SelectOption {
  value: string;
  label: string;
}

const MONTH_OPTIONS: SelectOption[] = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const customSelectFieldStyles = {
  control: (base: any, state: any) => ({
    ...base,
    padding: '0.2rem',
    borderWidth: '2px',
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    borderRadius: '0.75rem',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
    '&:hover': {
      borderColor: '#FCD34D',
    },
    transition: 'all 0.3s',
    backgroundColor: 'white',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#F59B0F'
      : state.isFocused
        ? '#FEF3C7'
        : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#F59B0F',
    },
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#9CA3AF',
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(245, 155, 15, 0.2)',
  }),
};

function SettlementReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    userId?: string,
    userName?: string,
    year?: number,
    month?: number,
    monthName?: string
  } | null;

  const userId = state?.userId;
  const userName = state?.userName;
  const preSelectedYear = state?.year;
  const preSelectedMonth = state?.month;
  const preSelectedMonthName = state?.monthName;

  const [selectedMonth, setSelectedMonth] = useState(preSelectedMonth ? String(preSelectedMonth).padStart(2, '0') : '');
  const [selectedYear, setSelectedYear] = useState(preSelectedYear || new Date().getFullYear());
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!userId) {
      Swal.fire('Error', 'User ID not provided. Please navigate from the manage-users page.', 'error');
      navigate('/deliverYya-cloud-console/manage-users');
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (selectedMonth && userId) {
      fetchOrdersForMonth();
    }
  }, [selectedMonth, selectedYear, userId]);

  const fetchOrdersForMonth = async () => {
    if (!userId || !selectedMonth) return;

    setIsLoadingOrders(true);
    try {
      const numericUserId = Number(userId);
      if (isNaN(numericUserId) || numericUserId <= 0) {
        throw new Error('Invalid User ID');
      }

      const selected = Number(selectedMonth);
      const monthStart = new Date(selectedYear, selected - 1, 1);
      const monthEnd = new Date(selectedYear, selected, 0);

      const formatDateForApi = (date: Date, isEndOfDay = false): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return isEndOfDay
          ? `${year}-${month}-${day}T23:59:59`
          : `${year}-${month}-${day}T00:00:00`;
      };

      const token = localStorage.getItem('jwtToken');
      const pageSize = 200;
      let pageNumber = 0;
      let resolvedTotalPages = 1;
      const allOrders: any[] = [];

      while (pageNumber < resolvedTotalPages) {
        const requestBody = {
          pageNumber,
          countPerPage: pageSize,
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
        const itemsArray = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
        const eligibleOrders = itemsArray.filter((order: any) => {
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
        allOrders.push(...eligibleOrders);
        resolvedTotalPages = Math.max(
          1,
          Number(payload?.totalPages ?? response.data?.totalPages ?? 1),
        );

        if (itemsArray.length === 0) break;
        pageNumber += 1;
      }

      const uniqueOrders = Array.from(new Map(allOrders.map((order) => [order.id, order])).values());
      setOrders(uniqueOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      Swal.fire('Error', error?.response?.data?.desc || error?.message || 'Failed to fetch orders', 'error');
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleGenerateReport = async (action: 'download' | 'print') => {
    if (!selectedMonth) {
      Swal.fire('Warning', 'Please select a month to generate the settlement report.', 'warning');
      return;
    }

    if (!userId) {
      Swal.fire('Error', 'User ID not found.', 'error');
      return;
    }

    if (orders.length === 0) {
      Swal.fire('No Data', 'No orders found for the selected month.', 'info');
      return;
    }

    const numericUserId = Number(userId);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      Swal.fire('Error', 'Invalid User ID provided.', 'error');
      return;
    }

    try {
      setIsGenerating(true);

      const monthLabel = MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

      const currentUserId = getCurrentUserId();
      const currentUserRoleId = currentUserId ? ROLE_IDS.ADMIN : null;

      const reportInput: SettlementReportPdfInput = {
        scopeLabel: userName || `User ${userId}`,
        dateRangeLabel: `${monthLabel} ${selectedYear}`,
        reportType: 'delivery-company',
        userRoleId: currentUserRoleId,
        appliedFilters: [`Date: ${monthLabel} ${selectedYear}`, `User: ${userName || userId}`],
        subjectDetails: {
          name: userName || `User ${userId}`,
          address: '',
        },
        orders: orders.map((order: any) => ({
          id: order.id,
          marketOrder: order.marketOrder,
          orderCode: typeof order.orderCode === 'string' ? order.orderCode : order.orderCode?.code,
          createdAt: order.createdAt,
          createdDate: order.createdDate,
          orderDate: order.orderDate,
          createdOn: order.createdOn,
          date: order.date,
          deliveryTo: order.deliveryTo,
          qty: order.qty,
          paymentType: order.paymentType,
          paymentStatus: order.paymentStatus,
          deliveryStatus: order.deliveryStatus,
          deliveryFee: order.deliveryFee || 0,
          collectivePrice: order.collectivePrice || 0,
          totalPrice: order.totalPrice,
          paidAmount: order.paidAmount,
          dontCollectDeliveryFeeFromCustomer: order.dontCollectDeliveryFeeFromCustomer,
        })),
      };

      const filename = `Settlement_Report_${userName?.replace(/[^a-z0-9]+/gi, '_') || userId}_${monthLabel.replace(/[^a-z0-9]+/gi, '_')}_${selectedYear}.pdf`;

      await runSettlementReportPdfAction(reportInput, action, filename);

      Swal.fire(
        'Success',
        action === 'print'
          ? 'Settlement report is ready to print.'
          : 'Settlement report generated successfully.',
        'success',
      );
    } catch (error: any) {
      console.error('Error generating settlement report:', error);
      const errorMessage = error?.response?.data?.desc || error?.message || 'Failed to generate settlement report. Please check your network connection and try again.';
      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    navigate('/deliverYya-cloud-console/manage-users');
  };

  const handleBackToMonthlyOrders = () => {
    navigate('/deliverYya-cloud-console/user-monthly-orders', { state: { userId, userName } });
  };

  const handleCreatePaymentRecord = async () => {
    if (!selectedMonth) {
      Swal.fire('Warning', 'Please select a month to create a payment record.', 'warning');
      return;
    }

    if (!userId) {
      Swal.fire('Error', 'User ID not found.', 'error');
      return;
    }

    if (orders.length === 0) {
      Swal.fire('No Data', 'No orders found for the selected month.', 'info');
      return;
    }

    const monthLabel = MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || selectedMonth;
    const currentUserId = getCurrentUserId();
    const reportInput: SettlementReportPdfInput = {
      scopeLabel: userName || `User ${userId}`,
      dateRangeLabel: `${monthLabel} ${selectedYear}`,
      reportType: 'delivery-company',
      userRoleId: currentUserId ? ROLE_IDS.ADMIN : null,
      appliedFilters: [`Date: ${monthLabel} ${selectedYear}`, `User: ${userName || userId}`],
      subjectDetails: { name: userName || `User ${userId}`, address: '' },
      orders: orders.map((order: any) => ({
        id: order.id,
        marketOrder: order.marketOrder,
        orderCode: typeof order.orderCode === 'string' ? order.orderCode : order.orderCode?.code,
        createdAt: order.createdAt,
        createdDate: order.createdDate,
        orderDate: order.orderDate,
        createdOn: order.createdOn,
        date: order.date,
        deliveryTo: order.deliveryTo,
        qty: order.qty,
        paymentType: order.paymentType,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        deliveryFee: order.deliveryFee || 0,
        collectivePrice: order.collectivePrice || 0,
        totalPrice: order.totalPrice,
        paidAmount: order.paidAmount,
        dontCollectDeliveryFeeFromCustomer: order.dontCollectDeliveryFeeFromCustomer,
      })),
    };

    const filename = `Settlement_Report_${userName?.replace(/[^a-z0-9]+/gi, '_') || userId}_${monthLabel.replace(/[^a-z0-9]+/gi, '_')}_${selectedYear}.pdf`;
    try {
      setIsGenerating(true);
      const settlementReportFile = await createSettlementReportPdfFile(reportInput, filename);
      const orderCodes = orders.map((order) => ({
        code: typeof order.orderCode === 'string' ? order.orderCode : order.orderCode?.code || '',
        amount: String(order.paidAmount || order.totalPrice || 0),
        note: '',
      }));
      navigate('/deliverYya-cloud-console/accounts/create-payment-record', {
        state: {
          fromWallet: 'COMPANY',
          toWallet: 'CLIENT',
          toUserId: userId,
          toUserName: userName,
          orderCodes,
          settlementReportFile,
          description: `Settlement payment for ${userName || `User ${userId}`} - ${monthLabel} ${selectedYear}`,
        },
      });
    } catch (error: any) {
      console.error('Error preparing settlement payment record:', error);
      Swal.fire('Error', error?.message || 'Failed to create the settlement report.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusName = (status: unknown) => {
    if (typeof status === 'string') return status;
    if (status && typeof status === 'object' && 'name' in status && typeof status.name === 'string') {
      return status.name;
    }
    return 'Pending';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 space-y-6">
      <div>
        <div className="flex flex-col gap-2 mb-6">
          <button
            onClick={preSelectedMonth ? handleBackToMonthlyOrders : handleBack}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors w-fit"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="font-semibold">{preSelectedMonth ? 'Back to Monthly Orders' : 'Back to Users'}</span>
          </button>

          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            Settlement Report
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            {preSelectedMonth
              ? `View order details for ${preSelectedMonthName} ${selectedYear}`
              : 'Generate monthly settlement reports for specific users'
            }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
              Select Year
            </label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              min="2020"
              max="2030"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
              Select Month
            </label>
            <Select<SelectOption, false>
              value={MONTH_OPTIONS.find((option) => option.value === selectedMonth) ?? null}
              onChange={(option) => setSelectedMonth(option ? option.value : '')}
              options={MONTH_OPTIONS}
              isClearable
              placeholder="Select a month..."
              styles={customSelectFieldStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              instanceId="settlement-report-month"
              aria-label="Select Month"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleGenerateReport('download')}
            disabled={isGenerating || !selectedMonth || orders.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#AC6C2A]/25 transition hover:from-[#AC6C2A] hover:to-[#F59B0F] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            {isGenerating ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <DocumentArrowDownIcon className="h-4 w-4" />
            )}
            {isGenerating ? 'Preparing Report...' : 'Download Settlement Report'}
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateReport('print')}
            disabled={isGenerating || !selectedMonth || orders.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#F59B0F] px-6 py-3 text-sm font-bold text-[#D17F0A] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            <PrinterIcon className="h-4 w-4" />
            Print Settlement Report
          </button>
          <button
            type="button"
            onClick={() => void handleCreatePaymentRecord()}
            disabled={isGenerating || !selectedMonth || orders.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            {isGenerating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
            {isGenerating ? 'Preparing Settlement...' : 'Create Payment Record'}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3">
          <div className="flex items-start gap-3 text-sm text-orange-900">
            <DocumentArrowDownIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#D17F0A]" />
            <p>
              The settlement report will be generated for the selected month and year. Ensure you have selected the correct month before generating.
            </p>
          </div>
        </div>
      </div>

      {selectedMonth && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Order Details for {MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
          </h2>

          {isLoadingOrders ? (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                <p className="text-gray-600">Loading orders...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <DocumentArrowDownIcon className="w-10 h-10 text-gray-400 mb-4" />
                <p className="text-xl font-black text-gray-900 mb-2">No orders found</p>
                <p className="text-gray-600">No orders found for the selected month</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <p className="text-sm text-gray-600 font-medium">Total Orders</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{orders.length}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-sm text-gray-600 font-medium">Total Amount</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0))}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 font-medium">Paid Amount</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0))}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        Order Code
                      </th>
                      <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        Date
                      </th>
                      <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        Delivery Status
                      </th>
                      <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        Payment Status
                      </th>
                      <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        Total Price
                      </th>
                      <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                        Paid Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => {
                      const deliveryStatus = getStatusName(order.deliveryStatus);
                      const paymentStatus = getStatusName(order.paymentStatus);

                      return (
                        <tr key={order.id} className="hover:bg-orange-50/40 transition-colors">
                          <td className="py-4 px-4">
                            <p className="font-bold text-gray-900">{typeof order.orderCode === 'string' ? order.orderCode : order.orderCode?.code || '-'}</p>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {formatDate(order.createdAt || order.createdDate || order.orderDate || order.createdOn || order.date)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${deliveryStatus.toLowerCase() === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }`}>
                              {deliveryStatus}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${paymentStatus.toLowerCase() === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-orange-100 text-orange-800 border-orange-200'
                              }`}>
                              {paymentStatus}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-gray-900">
                            {formatCurrency(order.totalPrice || 0)}
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-emerald-600">
                            {formatCurrency(order.paidAmount || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SettlementReport;
