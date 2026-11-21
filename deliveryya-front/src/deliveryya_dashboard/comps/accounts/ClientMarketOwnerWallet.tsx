import { ArrowPathIcon, BanknotesIcon, ChevronLeftIcon, ChevronRightIcon, CurrencyDollarIcon, DocumentTextIcon, EyeIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select, { type SingleValue, type StylesConfig } from 'react-select';
import axiosInstance from '../../../util/AxiosUtil';
import JwtUtil from '../../../util/JwtUtil';
import { debounce } from '../../../util/DebounceUtil';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import { getClientMarketOwnerWalletBalance, getClientMarketOwnerWalletHistoryPaginated, getClientMarketOwnerWalletOperationDetail, getPaymentRecordById } from '../../../util/WalletApi';
import type { PaginatedWalletHistoryDto, PaymentRecordSummaryDto, WalletRecordDto } from '../../../types/WalletTypes';
import { WalletOperationDetailModal } from './WalletOperationDetailModal';
import PaymentRecordDetailModal from './PaymentRecordDetailModal';

type Option = { id: number; name: string };
type FilterOption = { value: number; label: string };

const EMPTY_QUERY: PaginatedWalletHistoryDto = {
  pageNumber: 0, countPerPage: 10, totalCount: 0, totalPages: 0,
  fromDate: null, toDate: null, minAmount: null, maxAmount: null,
  paymentCategoryId: null, paymentStatusId: null, branchId: null,
  isExpense: null, search: '', items: [],
};

const selectStyles: StylesConfig<FilterOption, false> = {
  control: (base, state) => ({
    ...base, minHeight: 42, borderWidth: 2,
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    borderRadius: 12,
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245,155,15,.15)' : 'none',
    '&:hover': { borderColor: '#FCD34D' },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
  }),
};

const formatCurrency = (value: number | null) => value == null
  ? 'N/A'
  : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  : 'N/A';

export default function ClientMarketOwnerWallet() {
  const navigate = useNavigate();
  const allowed = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.CLIENT_MARKET_OWNER_WALLET), []);
  const userId = useMemo(() => {
    const token = localStorage.getItem('jwtToken');
    const decoded = token ? JwtUtil.decodeToken(token) : null;
    const id = Number(decoded?.userId);
    return Number.isInteger(id) && id > 0 ? id : null;
  }, []);

  const [balance, setBalance] = useState<number | null>(null);
  const [rows, setRows] = useState<WalletRecordDto[]>([]);
  const [query, setQuery] = useState<PaginatedWalletHistoryDto>(EMPTY_QUERY);
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState<Option[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<WalletRecordDto | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecordSummaryDto | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!allowed) navigate('/403', { replace: true });
  }, [allowed, navigate]);

  const loadOptions = useCallback(async () => {
    try {
      const [categoryResponse, statusResponse] = await Promise.all([
        axiosInstance.get<{ object?: Option[] }>('/payment/get-payment-categories'),
        axiosInstance.get<{ object?: Option[] }>('/payment/get-payment-statuses'),
      ]);
      setCategories(categoryResponse.data.object || []);
      setStatuses(statusResponse.data.object || []);
    } catch (optionError) {
      console.error('Failed to load wallet filters:', optionError);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    if (!userId) return;
    setBalanceLoading(true);
    try {
      const response = await getClientMarketOwnerWalletBalance(userId);
      setBalance(response.message?.toLowerCase() === 'success' ? response.object : null);
    } catch (balanceError) {
      console.error('Failed to load wallet balance:', balanceError);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getClientMarketOwnerWalletHistoryPaginated(userId, query);
      if (response.message?.toLowerCase() !== 'success') {
        throw new Error(response.desc || 'Failed to load wallet history');
      }
      setRows(response.object?.items || []);
      setTotalCount(response.object?.totalCount || 0);
      setTotalPages(response.object?.totalPages || 1);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load wallet history');
    } finally {
      setLoading(false);
    }
  }, [query, userId]);

  useEffect(() => {
    if (!allowed || !userId) return;
    void loadOptions();
    void loadBalance();
  }, [allowed, loadBalance, loadOptions, userId]);

  useEffect(() => {
    if (allowed && userId) void load();
  }, [allowed, load, userId]);

  const update = useCallback((patch: Partial<PaginatedWalletHistoryDto>) => {
    setQuery((current) => ({ ...current, ...patch, pageNumber: 0 }));
  }, []);

  const reset = useCallback(() => {
    setSearchText('');
    setQuery(EMPTY_QUERY);
  }, []);

  const refresh = useCallback(() => Promise.all([load(), loadBalance()]), [load, loadBalance]);

  const openDetail = useCallback(async (id: number) => {
    if (!userId) return;
    try {
      const response = await getClientMarketOwnerWalletOperationDetail(userId, id);
      if (response.message?.toLowerCase() !== 'success') {
        setError(response.desc || 'Failed to load wallet detail');
        return;
      }
      const operation = response.object;
      const creatorId = Number(operation.createdBy);
      if (Number.isInteger(creatorId) && creatorId > 0) {
        try {
          const creatorResponse = await axiosInstance.get<{ object?: { firstName?: string; lastName?: string; nic?: string } }>(`/users/admin/get-user-by-id?id=${creatorId}`);
          const creator = creatorResponse.data.object;
          setDetail({
            ...operation,
            createdByName: `${creator?.firstName || ''} ${creator?.lastName || ''}`.trim() || null,
            createdByNic: creator?.nic || null,
          });
          return;
        } catch (creatorError) {
          console.error('Failed to resolve wallet creator:', creatorError);
        }
      }
      setDetail(operation);
    } catch (detailError) {
      console.error('Failed to load wallet detail:', detailError);
      setError('Failed to load wallet detail');
    }
  }, [userId]);

  const openPaymentRecord = useCallback(async (paymentRecordId: number | null) => {
    if (!paymentRecordId) {
      setError('This wallet record is not linked to a payment record.');
      return;
    }
    try {
      const response = await getPaymentRecordById(paymentRecordId);
      setPaymentRecord(response.message?.toLowerCase() === 'success'
        ? response.object?.items?.[0] || null
        : null);
    } catch (paymentError) {
      console.error('Failed to load payment record:', paymentError);
      setError('Failed to load payment record');
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((value: string) => update({ search: value }), 400),
    [update],
  );
  const categoryOptions = useMemo(() => categories.map((item) => ({ value: item.id, label: item.name })), [categories]);
  const statusOptions = useMemo(() => statuses.map((item) => ({ value: item.id, label: item.name })), [statuses]);
  const incomeTotal = useMemo(() => rows.filter((row) => !row.isExpense).reduce((sum, row) => sum + (row.amount || 0), 0), [rows]);
  const expenseTotal = useMemo(() => rows.filter((row) => row.isExpense).reduce((sum, row) => sum + (row.amount || 0), 0), [rows]);

  if (!allowed) return null;
  if (!userId) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">Unable to identify your wallet. Please log in again.</div>;

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 pb-12">
      <div>
        <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">Client / Market Owner Wallet</h1>
        <p className="mt-1 text-sm md:text-base text-gray-600">Review incoming and outgoing wallet movements linked to payments.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Current balance', value: formatCurrency(balance), icon: CurrencyDollarIcon, cls: 'from-orange-500 to-orange-600' },
          { label: 'Records found', value: String(totalCount), icon: BanknotesIcon, cls: 'from-blue-500 to-blue-600' },
          { label: 'Income on page', value: formatCurrency(incomeTotal), icon: ArrowPathIcon, cls: 'from-emerald-500 to-emerald-600' },
          { label: 'Expenses on page', value: formatCurrency(expenseTotal), icon: ArrowPathIcon, cls: 'from-red-500 to-red-600' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-gray-600">{card.label}</p><p className="mt-1 text-2xl font-black text-gray-900">{balanceLoading && card.label === 'Current balance' ? '...' : card.value}</p></div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${card.cls} shadow-lg`}><card.icon className="h-7 w-7 text-white" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All', start: null, end: null },
            { label: 'Today', start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), end: new Date().toISOString() },
            { label: 'This week', start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString(), end: new Date().toISOString() },
            { label: 'This month', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(), end: new Date().toISOString() },
          ].map((range) => (
            <button key={range.label} type="button" onClick={() => update({ fromDate: range.start, toDate: range.end })} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-orange-100 hover:text-orange-700">{range.label}</button>
          ))}
        </div>
      </div>

      <div className="md:hidden">
        <button type="button" onClick={() => setShowFilters((current) => !current)} className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-semibold">
          <span>Filters</span><FunnelIcon className={`h-5 w-5 text-gray-600 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
            <div><h2 className="text-lg font-black text-gray-900">Filters</h2><p className="mt-1 text-sm text-gray-500">Search and filter wallet movements.</p></div>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-600"><XMarkIcon className="h-4 w-4" /> Clear all</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative sm:col-span-2">
              <MagnifyingGlassIcon className="absolute left-3 top-9 h-4 w-4 text-gray-400" />
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Search</span>
              <input value={searchText} onChange={(event) => { setSearchText(event.target.value); debouncedSearch(event.target.value); }} placeholder="Code, reference, note..." className="w-full rounded-xl border-0 bg-white py-2.5 pl-9 pr-3 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400" />
            </label>
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">From date</span><input type="datetime-local" value={query.fromDate?.slice(0, 16) || ''} onChange={(event) => update({ fromDate: event.target.value ? new Date(event.target.value).toISOString() : null })} className="w-full rounded-xl border-0 bg-white py-2.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400" /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">To date</span><input type="datetime-local" value={query.toDate?.slice(0, 16) || ''} onChange={(event) => update({ toDate: event.target.value ? new Date(event.target.value).toISOString() : null })} className="w-full rounded-xl border-0 bg-white py-2.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400" /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Minimum amount</span><input type="number" min="0" value={query.minAmount ?? ''} onChange={(event) => update({ minAmount: event.target.value ? Number(event.target.value) : null })} className="w-full rounded-xl border-0 bg-white py-2.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400" /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Maximum amount</span><input type="number" min="0" value={query.maxAmount ?? ''} onChange={(event) => update({ maxAmount: event.target.value ? Number(event.target.value) : null })} className="w-full rounded-xl border-0 bg-white py-2.5 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-orange-400" /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Direction</span><Select<FilterOption, false> isClearable isSearchable={false} styles={selectStyles} value={query.isExpense == null ? null : { value: query.isExpense ? 1 : 0, label: query.isExpense ? 'Expense / debit' : 'Income / credit' }} onChange={(option: SingleValue<FilterOption>) => update({ isExpense: option ? option.value === 1 : null })} options={[{ value: 0, label: 'Income / credit' }, { value: 1, label: 'Expense / debit' }]} placeholder="All movements" /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Category</span><Select<FilterOption, false> isClearable isSearchable styles={selectStyles} options={categoryOptions} value={categoryOptions.find((option) => option.value === query.paymentCategoryId) || null} onChange={(option: SingleValue<FilterOption>) => update({ paymentCategoryId: option?.value || null })} placeholder="All categories" /></label>
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Status</span><Select<FilterOption, false> isClearable isSearchable styles={selectStyles} options={statusOptions} value={statusOptions.find((option) => option.value === query.paymentStatusId) || null} onChange={(option: SingleValue<FilterOption>) => update({ paymentStatusId: option?.value || null })} placeholder="All statuses" /></label>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-700">Showing <span className="font-bold text-gray-900">{rows.length}</span> of <span className="font-bold text-gray-900">{totalCount}</span> records</div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            <span className="text-sm text-gray-600">Per page:</span>
            <div className="w-28"><Select<FilterOption, false> isSearchable={false} styles={selectStyles} options={[5, 10, 20, 50].map((size) => ({ value: size, label: String(size) }))} value={{ value: query.countPerPage, label: String(query.countPerPage) }} onChange={(option) => setQuery((current) => ({ ...current, countPerPage: option?.value || 10, pageNumber: 0 }))} /></div>
            <button type="button" onClick={() => setQuery((current) => ({ ...current, pageNumber: Math.max(0, current.pageNumber - 1) }))} disabled={query.pageNumber === 0 || loading} className="rounded-lg border-2 border-gray-200 p-2 disabled:opacity-40"><ChevronLeftIcon className="h-5 w-5" /></button>
            <div className="rounded-lg border-2 border-gray-200 px-4 py-1.5 text-sm font-bold">{query.pageNumber + 1} / {totalPages}</div>
            <button type="button" onClick={() => setQuery((current) => ({ ...current, pageNumber: Math.min(totalPages - 1, current.pageNumber + 1) }))} disabled={query.pageNumber >= totalPages - 1 || loading} className="rounded-lg border-2 border-gray-200 p-2 disabled:opacity-40"><ChevronRightIcon className="h-5 w-5" /></button>
            <button type="button" onClick={() => void refresh()} disabled={loading || balanceLoading} className="rounded-lg border-2 border-gray-200 p-2 disabled:opacity-40"><ArrowPathIcon className={`h-5 w-5 ${loading || balanceLoading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="min-w-full">
          <thead className="bg-gray-50 text-left text-xs font-black uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Movement</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Balance</th><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Category</th><th className="px-5 py-4 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center"><ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-orange-500" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-500"><BanknotesIcon className="mx-auto mb-2 h-10 w-10 text-gray-300" />No wallet records found.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="hover:bg-orange-50/30">
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{formatDate(row.createdAt)}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${row.isExpense ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.isExpense ? 'Expense' : 'Income'}</span></td>
                <td className={`whitespace-nowrap px-5 py-4 text-sm font-black ${row.isExpense ? 'text-red-600' : 'text-emerald-600'}`}>{row.isExpense ? '-' : '+'}{formatCurrency(row.amount)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-gray-900">{formatCurrency(row.balance)}</td>
                <td className="max-w-52 truncate px-5 py-4 text-sm text-gray-600">{row.ref || row.code || 'N/A'}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{row.paymentCategory?.name || 'N/A'}</td>
                <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><button type="button" onClick={() => void openDetail(row.id)} className="rounded-xl p-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600" title="View wallet record"><EyeIcon className="h-5 w-5" /></button>{row.paymentRecordId && <button type="button" onClick={() => void openPaymentRecord(row.paymentRecordId)} className="rounded-xl p-2 text-orange-600 hover:bg-orange-50" title="Open payment record"><DocumentTextIcon className="h-5 w-5" /></button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <WalletOperationDetailModal isOpen={detail !== null} operation={detail} onOpenPaymentRecord={detail?.paymentRecordId ? () => void openPaymentRecord(detail.paymentRecordId) : undefined} onClose={() => setDetail(null)} />
      <PaymentRecordDetailModal isOpen={paymentRecord !== null} record={paymentRecord} onClose={() => setPaymentRecord(null)} />
    </div>
  );
}
