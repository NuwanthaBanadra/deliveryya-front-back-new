import {ArrowPathIcon, MagnifyingGlassIcon, TruckIcon} from '@heroicons/react/24/outline';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation} from 'react-router-dom';
import axiosInstance from '../../../util/AxiosUtil';

interface DeliveryHistoryItem {
  deliveryId: number;
  orderId: number;
  orderCode?: string | null;
  recipientName?: string | null;
  recipientMobile?: string | null;
  address?: string | null;
  totalPrice?: number | null;
  collectivePrice?: number | null;
  paymentStatus?: string | null;
  deliveryStatusId: number;
  deliveryStatus?: string | null;
  note?: string | null;
  eventAt?: string | null;
}

const money = (amount?: number | null) => `LKR ${(amount ?? 0).toLocaleString('en-LK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const dateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-LK', {dateStyle: 'medium', timeStyle: 'short'});
};

export default function DeliveryHistory() {
  const location = useLocation();
  const routeState = location.state as {userId?: string; userName?: string} | null;
  const viewedUserId = routeState?.userId;
  const viewedUserName = routeState?.userName;
  const [rows, setRows] = useState<DeliveryHistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '7' | '9'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get<{object?: DeliveryHistoryItem[]}>('/orders/get-delivery-history', {
        params: viewedUserId ? {userId: viewedUserId} : undefined,
      });
      setRows(Array.isArray(response.data?.object) ? response.data.object : []);
    } catch {
      setError('Could not load delivery history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [viewedUserId]);

  useEffect(() => { void load(); }, [load]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'all' && String(row.deliveryStatusId) !== statusFilter) return false;
      if (!term) return true;
      return [row.orderCode, row.recipientName, row.recipientMobile, row.address, row.deliveryStatus]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [rows, search, statusFilter]);

  const deliveredCount = rows.filter((row) => row.deliveryStatusId === 7).length;
  const returnedCount = rows.filter((row) => row.deliveryStatusId === 9).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">Agent Jobs</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Delivery History</h1>
            <p className="mt-2 text-sm text-slate-600">{viewedUserName ? `Completed and returned orders delivered by ${viewedUserName}.` : 'Completed and returned orders attributed to your delivery activity.'}</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Matching orders</p><p className="mt-2 text-3xl font-black text-slate-900">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
            <p className="text-sm font-medium text-emerald-700">Delivered</p><p className="mt-2 text-3xl font-black text-emerald-800">{deliveredCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm">
            <p className="text-sm font-medium text-amber-700">Returned</p><p className="mt-2 text-3xl font-black text-amber-800">{returnedCount}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><h2 className="font-bold text-slate-900">Order activity</h2><p className="mt-1 text-sm text-slate-500">Only orders with completed payment are included.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders or recipients" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-400 sm:w-64" />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400">
                <option value="all">All statuses</option><option value="7">Delivered</option><option value="9">Returned</option>
              </select>
            </div>
          </div>

          {error && <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                <th className="px-5 py-3">Order</th><th className="px-5 py-3">Recipient</th><th className="px-5 py-3">Delivery result</th><th className="px-5 py-3">Completed at</th><th className="px-5 py-3 text-right">Order total</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && !error && filteredRows.map((row) => <tr key={row.deliveryId} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{row.orderCode || `Order #${row.orderId}`}</p><p className="mt-1 text-xs text-slate-500">#{row.orderId} · {row.paymentStatus || 'Completed payment'}</p></td>
                  <td className="px-5 py-4"><p className="font-semibold text-slate-800">{row.recipientName || '—'}</p><p className="mt-1 text-xs text-slate-500">{row.recipientMobile || row.address || 'No contact details'}</p></td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.deliveryStatusId === 7 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{row.deliveryStatus || (row.deliveryStatusId === 7 ? 'Delivered' : 'Returned')}</span>{row.note && <p className="mt-1 max-w-xs truncate text-xs text-slate-500" title={row.note}>{row.note}</p>}</td>
                  <td className="px-5 py-4 text-slate-600">{dateTime(row.eventAt)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900">{money(row.totalPrice)}</td>
                </tr>)}
                {loading && <tr><td colSpan={5} className="px-5 py-14 text-center text-slate-500">Loading delivery history…</td></tr>}
                {!loading && !error && filteredRows.length === 0 && <tr><td colSpan={5} className="px-5 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><TruckIcon className="h-6 w-6" /></div><p className="mt-3 font-bold text-slate-900">No matching deliveries</p><p className="mt-1 text-sm text-slate-500">Completed and returned orders will appear here.</p></td></tr>}
              </tbody>
            </table>
          </div>
          {!loading && !error && <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Showing {filteredRows.length} of {rows.length} delivery records</div>}
        </section>
      </div>
    </main>
  );
}
