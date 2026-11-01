import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, CurrencyDollarIcon, EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import {
  getCompanyWalletBalance,
  getCompanyWalletHistoryPaginated,
  getCompanyWalletOperationDetail,
} from '../../../util/WalletApi';
import type {
  WalletRecordDto,
  PaginatedWalletHistoryDto,
  WalletBalanceResponse,
  WalletPaginatedHistoryResponse,
  WalletOperationDetailResponse,
} from '../../../types/WalletTypes';
import WalletOperationDetailModal from './WalletOperationDetailModal';

const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const INITIAL_QUERY: PaginatedWalletHistoryDto = {
  pageNumber: 0,
  countPerPage: 10,
  totalCount: 0,
  totalPages: 0,
  fromDate: null,
  toDate: null,
  minAmount: null,
  maxAmount: null,
  search: '',
  items: [],
};

export default function CompanyWallet() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletRecordDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState<PaginatedWalletHistoryDto>(INITIAL_QUERY);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailModalState, setDetailModalState] = useState<{
    show: boolean;
    operation: WalletRecordDto | null;
  }>({ show: false, operation: null });

  const canAccessCompanyWallet = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.COMPANY_WALLET), []);

  useEffect(() => {
    if (!canAccessCompanyWallet) {
      navigate('/403', { replace: true });
    }
  }, [canAccessCompanyWallet, navigate]);

  const fetchBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    setError(null);

    try {
      const response: WalletBalanceResponse = await getCompanyWalletBalance();
      if (response.message?.toLowerCase() === 'success') {
        setBalance(response.object);
      } else {
        setError(response.desc || 'Failed to load wallet balance');
        setBalance(null);
      }
    } catch (fetchError) {
      console.error('Error loading wallet balance:', fetchError);
      setError('Failed to connect to wallet service');
      setBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: WalletPaginatedHistoryResponse = await getCompanyWalletHistoryPaginated(query);
      if (response.message?.toLowerCase() === 'success') {
        const responseObject = response.object;
        setTransactions(responseObject?.items || []);
        setTotalCount(responseObject?.totalCount ?? 0);
        setTotalPages(responseObject?.totalPages ?? 1);
      } else {
        setError(response.desc || 'Failed to load wallet history');
        setTransactions([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (fetchError) {
      console.error('Error loading wallet history:', fetchError);
      setError('Failed to connect to wallet service');
      setTransactions([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!canAccessCompanyWallet) return;
    fetchBalance();
    fetchTransactions();
  }, [canAccessCompanyWallet, fetchBalance, fetchTransactions]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchBalance(), fetchTransactions()]);
  }, [fetchBalance, fetchTransactions]);

  const handlePageChange = useCallback((newPage: number) => {
    setQuery((current) => ({ ...current, pageNumber: newPage }));
  }, []);

  const handleSearch = useCallback((searchTerm: string) => {
    setQuery((current) => ({ ...current, search: searchTerm, pageNumber: 0 }));
  }, []);

  const handleViewDetail = useCallback(async (operationId: number) => {
    try {
      const response: WalletOperationDetailResponse = await getCompanyWalletOperationDetail(operationId);
      if (response.message?.toLowerCase() === 'success') {
        setDetailModalState({ show: true, operation: response.object });
      } else {
        setError(response.desc || 'Failed to load operation detail');
      }
    } catch (fetchError) {
      console.error('Error loading operation detail:', fetchError);
      setError('Failed to connect to wallet service');
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setDetailModalState({ show: false, operation: null });
  }, []);

  const updateQuery = useCallback((patch: Partial<PaginatedWalletHistoryDto>) => {
    setQuery((current) => ({ ...current, ...patch, pageNumber: 0 }));
  }, []);

  if (!canAccessCompanyWallet) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Company Wallet Balance</h2>
        </div>
        <div className="px-6 py-8">
          {isLoadingBalance ? (
            <div className="flex items-center justify-center">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : balance !== null ? (
            <div className="flex items-center space-x-4">
              <CurrencyDollarIcon className="h-16 w-16 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Current Balance</p>
                <p className="text-4xl font-bold text-gray-900">{formatCurrency(balance)}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Unable to load balance</p>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
        </div>

        {/* Search and Filters */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by code, reference, or note..."
                  value={query.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isLoadingBalance}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(isLoading || isLoadingBalance) ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-5 w-5" />
              )}
              <span className="ml-2">Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resulting Balance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={transaction.isExpense ? 'bg-red-50' : 'bg-green-50'}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        transaction.isExpense
                          ? 'bg-red-50 text-red-700 ring-red-600/20'
                          : 'bg-green-50 text-green-700 ring-green-600/20'
                      }`}>
                        {transaction.isExpense ? 'Expense' : 'Income'}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm font-semibold ${
                      transaction.isExpense ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.amount !== null ? formatCurrency(transaction.amount) : '-'}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm font-semibold ${
                      transaction.isExpense ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(transaction.balance)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {transaction.code || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {transaction.ref || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {transaction.paymentCategory?.name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetail(transaction.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {query.pageNumber * query.countPerPage + 1} to{' '}
              {Math.min((query.pageNumber + 1) * query.countPerPage, totalCount)} of {totalCount} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(query.pageNumber - 1)}
                disabled={query.pageNumber === 0}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
                Previous
              </button>
              <button
                onClick={() => handlePageChange(query.pageNumber + 1)}
                disabled={query.pageNumber >= totalPages - 1}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <WalletOperationDetailModal
        isOpen={detailModalState.show}
        operation={detailModalState.operation}
        onClose={handleCloseModal}
      />
    </div>
  );
}
