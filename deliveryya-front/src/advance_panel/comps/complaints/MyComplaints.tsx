import { useEffect, useState, useMemo, useRef } from 'react';
import Select from 'react-select';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import axiosInstance from '../../../util/AxiosUtil';
import { swalAlert, swalConfirm } from '../../../util/SwalUtil';
import { getCurrentUserId, hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';

type ComplainType = {
  id: number;
  name: string;
};

type ComplaintItem = {
  id: number;
  subject: string;
  complain: string;
  orderId: number | null;
  orderCode: string;
  typeId: number;
  typeName: string;
  statusId: number | null;
  statusName: string;
  isSolve: boolean;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
};

type FilterState = {
  search: string;
  complainTypeId: number;
  status: 'all' | 'open' | 'solved';
};

const defaultFilters: FilterState = {
  search: '',
  complainTypeId: 0,
  status: 'all',
};

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return fallback;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const asBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

const formatDateTime = (value: string): string => {
  if (!value || value === '-') {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const extractPayload = (value: unknown): Record<string, unknown> => {
  const root = asRecord(value) ?? {};
  return asRecord(root.object) ?? root;
};

const extractArrayPayload = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  const root = asRecord(value);
  if (!root) {
    return [];
  }
  if (Array.isArray(root.object)) {
    return root.object;
  }
  const payload = asRecord(root.object) ?? root;
  const candidates = [payload.items, payload.content, payload.rows, payload.list, payload.data];
  const found = candidates.find((item) => Array.isArray(item));
  return Array.isArray(found) ? found : [];
};

const mapComplaintItem = (value: unknown): ComplaintItem | null => {
  const item = asRecord(value);
  if (!item) {
    return null;
  }

  const type = asRecord(item.complainType);
  const status = asRecord(item.complainStatus);
  const user = asRecord(item.user);
  const order = asRecord(item.order);
  const orderCodeObject = asRecord(order?.orderCode) ?? asRecord(item.orderCode);

  const id = asNumber(item.id) ?? asNumber(item.complainId);
  if (!id) {
    return null;
  }

  const userName =
    asString(user?.name, '') ||
    `${asString(user?.firstName, '')} ${asString(user?.lastName, '')}`.trim() ||
    asString(item.userName, 'N/A') ||
    'N/A';

  return {
    id,
    subject: asString(item.subject, 'Untitled complaint'),
    complain: asString(item.complain, '') || asString(item.description, 'N/A') || 'N/A',
    orderId: asNumber(item.orderId) ?? asNumber(order?.id),
    orderCode: asString(orderCodeObject?.code, '') || asString(item.orderCode, 'N/A') || 'N/A',
    typeId: asNumber(type?.id) ?? 0,
    typeName: asString(type?.name, 'Unknown Type'),
    statusId: asNumber(status?.id),
    statusName: asString(status?.name, asBoolean(item.isSolve) ? 'Resolved' : 'Pending'),
    isSolve: asBoolean(item.isSolve),
    createdAt: asString(item.createdAt, '') || asString(item.createdDate, 'N/A') || 'N/A',
    updatedAt: asString(item.updatedAt, '') || asString(item.lastModifiedAt, 'N/A') || 'N/A',
    userName,
    userEmail: asString(user?.email, '') || asString(item.userEmail, 'N/A') || 'N/A',
  };
};

function MyComplaints() {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [complaintTypes, setComplaintTypes] = useState<ComplainType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedComplaintId, setExpandedComplaintId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const canDeleteComplaints = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.COMPLAINT_DELETE), []);

  const pageSizeOptions = [5, 10, 20, 50];
  const [pageNumber, setPageNumber] = useState(1);
  const [countPerPage, setCountPerPage] = useState(10);
  const [totalComplaints, setTotalComplaints] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalComplaints / countPerPage));

  const complaintTypeOptions = useMemo<SelectOption<number>[]>(
    () => complaintTypes.map((type) => ({ value: type.id, label: type.name })),
    [complaintTypes],
  );

  const statusOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: 'all', label: 'All Complaints' },
      { value: 'open', label: 'Open' },
      { value: 'solved', label: 'Resolved' },
    ],
    [],
  );

  const searchDebounceRef = useRef<number | null>(null);

  const getCustomSelectStyles = (hasError = false, isCompact = false) => ({
    control: (base: any, state: any) => ({
      ...base,
      padding: isCompact ? '0.05rem 0.125rem' : '0.375rem',
      borderWidth: '2px',
      minHeight: isCompact ? '38px' : '50px',
      borderColor: hasError ? '#EF4444' : (state.isFocused ? '#F59B0F' : '#E5E7EB'),
      borderRadius: isCompact ? '0.5rem' : '0.75rem',
      boxShadow: hasError
        ? (state.isFocused ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none')
        : (state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.2)' : 'none'),
      '&:hover': {
        borderColor: hasError ? '#DC2626' : '#FCD34D',
      },
      transition: 'all 0.3s',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
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
      zIndex: 9999,
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999,
    }),
  });

  const openCount = useMemo(() => complaints.filter((item) => !item.isSolve).length, [complaints]);
  const solvedCount = useMemo(() => complaints.filter((item) => item.isSolve).length, [complaints]);
  const inProgressCount = useMemo(
    () => complaints.filter((item) => item.statusName.toLowerCase().includes('progress')).length,
    [complaints],
  );

  const loadComplaints = async (
    nextPage: number = 1,
    nextCountPerPage?: number,
    activeFilters?: FilterState,
  ) => {
    setIsLoading(true);
    setError('');

    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      setError('Unable to determine current user. Please log in again.');
      setIsLoading(false);
      return;
    }

    // Resolve a safe countPerPage value: prefer explicit arg, then component state, then sensible default
    const resolvedCountPerPage = Number.isFinite(nextCountPerPage as number)
      ? (nextCountPerPage as number)
      : (Number.isFinite(countPerPage) ? countPerPage : 10);

    try {
      const payload: Record<string, unknown> = {
        placedUserId: currentUserId,
        pageNumber: Math.max(0, nextPage - 1),
        countPerPage: resolvedCountPerPage,
      };

      const usedFilters = activeFilters ?? filters; // prefer provided filters when calling directly

      if (usedFilters.search.trim()) payload.search = usedFilters.search.trim();
      if (usedFilters.complainTypeId) payload.complainTypeId = usedFilters.complainTypeId;
      if (usedFilters.status !== 'all') {
        payload.isSolve = usedFilters.status === 'solved';
      }

      const response = await axiosInstance.post('/complains/get-complains', payload);

      const respPayload = extractPayload(response.data);
      const rawItems = extractArrayPayload(respPayload);
      const items = rawItems.map((entry) => mapComplaintItem(entry)).filter((item): item is ComplaintItem => item !== null);

      setComplaints(items);

      const total = asNumber(respPayload.totalElements) ?? asNumber(respPayload.total) ?? asNumber(respPayload.totalCount) ?? items.length;
      setTotalComplaints(total);

      const apiCountPerPage = asNumber(respPayload.countPerPage) ?? asNumber(respPayload.pageSize) ?? resolvedCountPerPage;
      setCountPerPage(apiCountPerPage);
    } catch (err) {
      console.error('Failed to load complaints:', err);
      setError('Unable to load complaints. Please try again.');
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadComplaintTypes = async () => {
      try {
        const response = await axiosInstance.get('/complains/get-complain-types');
        const parsedTypes = extractArrayPayload(response.data)
          .map((entry) => {
            const item = asRecord(entry);
            if (!item) return null;
            const id = asNumber(item.id);
            if (!id) return null;
            return { id, name: asString(item.name, 'Unknown') };
          })
          .filter((item): item is ComplainType => item !== null);

        setComplaintTypes(parsedTypes);
      } catch (err) {
        console.error('Failed to load complaint types:', err);
      }
    };

    void loadComplaintTypes();
  }, []);

  useEffect(() => {
    void loadComplaints(pageNumber, countPerPage);
  }, [pageNumber, countPerPage, filters.status]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const resetFilters = async () => {
    setFilters(defaultFilters);
    setPageNumber(1);
    await loadComplaints(1, countPerPage);
  };

  const deleteComplaint = async (complaintId: number) => {
    if (!canDeleteComplaints) return;

    const confirmed = await swalConfirm(
      'Delete Complaint?',
      `Are you sure you want to delete complaint #${complaintId}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/complains/delete-complain-by-id?id=${complaintId}`);
      
      await swalAlert('Success', 'Complaint deleted successfully', 'success');
      setExpandedComplaintId(null);
      
      // Reload complaints after deletion
      await loadComplaints(pageNumber, countPerPage, filters);
    } catch (err) {
      console.error('Failed to delete complaint:', err);
      await swalAlert('Error', 'Failed to delete complaint. Please try again.', 'error');
    }
  };

  const getStatusClasses = (statusName: string, isSolve: boolean): string => {
    if (isSolve || statusName.toLowerCase().includes('resolve')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (statusName.toLowerCase().includes('progress')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (statusName.toLowerCase().includes('reject')) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  const activeFilters = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (filters.search) chips.push({ label: `Search: "${filters.search}"`, onRemove: () => setFilters((prev) => ({ ...prev, search: '' })) });
    if (filters.complainTypeId) {
      const typeName = complaintTypes.find((t) => t.id === filters.complainTypeId)?.name || `Type ${filters.complainTypeId}`;
      chips.push({ label: `Type: ${typeName}`, onRemove: () => setFilters((prev) => ({ ...prev, complainTypeId: 0 })) });
    }
    return chips;
  }, [filters, complaintTypes]);

  const showingRange = useMemo(() => {
    if (complaints.length === 0) {
      return { from: 0, to: 0 };
    }
    const from = (pageNumber - 1) * countPerPage + 1;
    const to = Math.min(totalComplaints, pageNumber * countPerPage);
    return { from, to };
  }, [complaints.length, pageNumber, countPerPage, totalComplaints]);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            My Complaints
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            View and track complaints you've submitted. Monitor their status and resolution progress.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Complaints</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{totalComplaints}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Open</p>
                <p className="text-3xl font-black text-amber-700 mt-1">{openCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <ClockIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">In Progress</p>
                <p className="text-3xl font-black text-blue-700 mt-1">{inProgressCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <UserCircleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Resolved</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{solvedCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={filters.search}
              onChange={(event) => {
                const value = event.target.value;
                const newFilters = { ...filters, search: value };
                setFilters(newFilters);
                setPageNumber(1);
                if (searchDebounceRef.current) {
                  window.clearTimeout(searchDebounceRef.current);
                }
                searchDebounceRef.current = window.setTimeout(() => {
                  void loadComplaints(1, countPerPage, newFilters);
                }, 450) as unknown as number;
              }}
              placeholder="Search by complaint subject, text, or order code..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm md:text-base"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Complaint Type</label>
              <Select<SelectOption<number>, false>
                value={complaintTypeOptions.find((option) => option.value === filters.complainTypeId) ?? null}
                onChange={(option) => {
                  const newFilters = { ...filters, complainTypeId: option ? option.value : 0 };
                  setFilters(newFilters);
                  setPageNumber(1);
                  void loadComplaints(1, countPerPage, newFilters);
                }}
                options={complaintTypeOptions}
                placeholder="All types"
                styles={getCustomSelectStyles(false)}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Status</label>
              <Select<SelectOption<string>, false>
                value={statusOptions.find((opt) => opt.value === filters.status) ?? null}
                onChange={(option) => {
                  const value = (option ? option.value : 'all') as 'all' | 'open' | 'solved';
                  const newFilters = { ...filters, status: value };
                  setFilters(newFilters);
                  setPageNumber(1);
                  void loadComplaints(1, countPerPage, newFilters);
                }}
                options={statusOptions}
                placeholder="All Complaints"
                styles={getCustomSelectStyles(false)}
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>

            <div className="flex items-end justify-end gap-3">
              <button
                onClick={() => void resetFilters()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Active:</span>
                {activeFilters.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 ring-1 ring-orange-200"
                  >
                    {chip.label}
                    <button
                      onClick={chip.onRemove}
                      title={`Remove ${chip.label}`}
                      className="hover:text-orange-600 transition-colors"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700">
              {isLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                <>
                  Showing <span className="font-bold text-gray-900">{showingRange.from}</span> to{' '}
                  <span className="font-bold text-gray-900">{showingRange.to}</span> of{' '}
                  <span className="font-bold text-gray-900">{totalComplaints}</span> complaints
                </>
              )}
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Per page:</span>
                <select
                  value={countPerPage}
                  onChange={(event) => {
                    setCountPerPage(Number(event.target.value));
                    setPageNumber(1);
                  }}
                  aria-label="Rows per page"
                  className="px-3 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 font-semibold text-sm focus:outline-none focus:border-[#F59B0F]"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1 || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                  title="Previous page"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                  {pageNumber} / {totalPages}
                </div>
                <button
                  onClick={() => setPageNumber(Math.min(totalPages, pageNumber + 1))}
                  disabled={pageNumber >= totalPages || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                  title="Next page"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
          <p className="font-bold">Error loading complaints</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading && complaints.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                <p className="text-gray-600">Loading your complaints...</p>
              </div>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                  <ChatBubbleLeftRightIcon className="w-10 h-10 text-[#F59B0F]" />
                </div>
                <p className="text-xl font-black text-gray-900 mb-2">No complaints found</p>
                <p className="text-gray-600 mb-6">You haven't submitted any complaints yet.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="hover:bg-orange-50/40 transition-colors"
                >
                  {/* Complaint Header Row */}
                  <div
                    onClick={() => setExpandedComplaintId(expandedComplaintId === complaint.id ? null : complaint.id)}
                    className="p-4 sm:p-5 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">
                          Complaint #{complaint.id}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusClasses(
                            complaint.statusName,
                            complaint.isSolve
                          )}`}
                        >
                          {complaint.statusName}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                          {complaint.typeName}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{complaint.subject}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        {complaint.orderCode && complaint.orderCode !== 'N/A' && (
                          <span>
                            Order: <span className="font-medium text-gray-700">{complaint.orderCode}</span>
                          </span>
                        )}
                        <span>
                          Submitted: <span className="font-medium text-gray-700">{formatDateTime(complaint.createdAt)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <ChevronDownIcon
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedComplaintId === complaint.id ? 'rotate-180' : ''
                          }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Detail Section */}
                  {expandedComplaintId === complaint.id && (
                    <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/30">
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59B0F]"></span>
                            Description
                          </h4>
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{complaint.complain}</p>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Complaint Type</h4>
                            <p className="text-sm font-semibold text-gray-800">{complaint.typeName}</p>
                          </div>
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Current Status</h4>
                            <p className="text-sm font-semibold text-gray-800">{complaint.statusName}</p>
                          </div>
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Submitted On</h4>
                            <p className="text-sm font-semibold text-gray-800">{formatDateTime(complaint.createdAt)}</p>
                          </div>
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Last Updated</h4>
                            <p className="text-sm font-semibold text-gray-800">{formatDateTime(complaint.updatedAt)}</p>
                          </div>
                        </div>

                        {canDeleteComplaints && (
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => void deleteComplaint(complaint.id)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 border border-red-200 transition-all"
                              title="Delete this complaint"
                            >
                              <TrashIcon className="w-4 h-4" />
                              Delete Complaint
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyComplaints;
