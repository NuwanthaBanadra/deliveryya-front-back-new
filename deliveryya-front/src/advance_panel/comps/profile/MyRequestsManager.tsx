import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import axiosInstance, { baseURL } from '../../../util/AxiosUtil';
import { getCurrentUserId, hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import {
  extractItemsAndTotal,
  formatDate,
  getRequestSelectStyles,
  getSelectPortalTarget,
  loadRequestTypes,
  mapRequestRow,
  toRequestTypeOptions,
  type RequestType,
  type SelectOption,
  type UserRequestRow,
} from './userRequestUtils';
import RequestForUser from './RequestForUser';

type RequestStatusFilter = 'all' | 'pending' | 'accepted' | 'unread';

const STATUS_OPTIONS: SelectOption<RequestStatusFilter>[] = [
  { value: 'all', label: 'All Requests' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'unread', label: 'Unread' },
];

const ROWS_PER_PAGE_OPTIONS: SelectOption<number>[] = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
];

const getErrorMessage = (err: unknown, fallback: string): string => {
  const error = err as { response?: { data?: { desc?: string; message?: string } }; message?: string };
  return error?.response?.data?.desc || error?.response?.data?.message || error?.message || fallback;
};

function MyRequestsManager() {
  const currentUserId = getCurrentUserId();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UserRequestRow | null>(null);

  const [rows, setRows] = useState<UserRequestRow[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(0);
  const [countPerPage, setCountPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<number>(0);
  const [error, setError] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / countPerPage));
  const acceptedCount = useMemo(() => rows.filter((row) => row.isAccepted && !row.isDeleted).length, [rows]);
  const unreadCount = useMemo(() => rows.filter((row) => !row.isRead && !row.isDeleted).length, [rows]);
  const pendingCount = useMemo(() => rows.filter((row) => !row.isAccepted && !row.isDeleted).length, [rows]);
  const canDeleteOwnRequests = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.OWN_REQUEST_DELETE), []);

  const typeFilterOptions = useMemo<SelectOption<number>[]>(
    () => toRequestTypeOptions(requestTypes, true),
    [requestTypes],
  );

  const loadRequests = useCallback(async () => {
    if (!currentUserId) {
      setRows([]);
      setTotalCount(0);
      setError('Unable to load your requests because the current user id is missing.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        pageNumber,
        countPerPage,
        userId: currentUserId,
      };

      if (search) payload.search = search;
      if (typeFilter > 0) payload.userRequestTypeId = typeFilter;
      if (statusFilter === 'pending') payload.isAccepted = false;
      if (statusFilter === 'accepted') payload.isAccepted = true;
      if (statusFilter === 'unread') payload.isRead = false;

      const response = await axiosInstance.post('/users/get-user-requests', payload);
      const parsed = extractItemsAndTotal(response.data);
      const mapped = parsed.items.map(mapRequestRow).filter((row): row is UserRequestRow => row !== null);

      setRows(mapped);
      setTotalCount(parsed.total || mapped.length);
    } catch (err) {
      setRows([]);
      setTotalCount(0);
      setError(getErrorMessage(err, 'Failed to load your requests'));
    } finally {
      setIsLoading(false);
    }
  }, [countPerPage, currentUserId, pageNumber, search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPageNumber(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        setRequestTypes(await loadRequestTypes());
      } catch (err) {
        console.error('Failed to load request types:', err);
      }
    };

    void loadTypes();
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (showCreateModal || showDetailsModal) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreateModal, showDetailsModal]);

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('all');
    setTypeFilter(0);
    setCountPerPage(10);
    setPageNumber(0);
  };

  const handleDelete = async (row: UserRequestRow) => {
    if (!canDeleteOwnRequests || row.isRead) return;

    const ok = window.confirm(`Delete unread request #${row.id}?`);
    if (!ok) return;

    try {
      await axiosInstance.delete('/users/delete-request', { params: { userRequestId: row.id } });
      setRows((prevRows) => prevRows.filter((request) => request.id !== row.id));
      setTotalCount((current) => Math.max(0, current - 1));
      if (selectedRequest?.id === row.id) {
        setShowDetailsModal(false);
        setSelectedRequest(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete request'));
    }
  };

  const handleSubmitted = () => {
    setShowCreateModal(false);
    if (pageNumber === 0) {
      void loadRequests();
      return;
    }
    setPageNumber(0);
  };

  const verificationLinks = (ids: unknown[]) => ids.map((item, index) => {
    const path = typeof item === 'string' ? item : typeof item === 'number' ? String(item) : '';
    const href = path.startsWith('http') ? path : path ? `${baseURL}/uploads/${path}` : '#';
    const filename = path.split('/').pop() || `Document ${index + 1}`;
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

    return (
      <a
        key={`${path}-${index}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-100 hover:bg-gray-50"
        title={`Open ${filename}`}
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-blue-50 text-blue-700">
          {isImage ? <img src={href} alt={filename} className="h-8 w-8 object-cover" /> : <PaperClipIcon className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="flex max-w-[18rem] items-center gap-2 truncate">
            <span className="truncate">{filename}</span>
          </div>
          <div className="text-xs text-gray-500">Open</div>
        </div>
      </a>
    );
  });

  const startItem = totalCount === 0 ? 0 : pageNumber * countPerPage + 1;
  const endItem = Math.min(pageNumber * countPerPage + rows.length, totalCount);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mb-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-3xl font-black text-transparent md:text-4xl">
              My Requests
            </h1>
            <p className="text-sm text-gray-600 md:text-base">Track requests you submitted and create new requests for review.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl"
          >
            <PlusIcon className="h-5 w-5" />
            New Request
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Matching</p>
                <p className="mt-1 text-3xl font-black text-gray-900">{totalCount}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                <ClipboardDocumentListIcon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread Loaded</p>
                <p className="mt-1 text-3xl font-black text-orange-700">{unreadCount}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                <EyeIcon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Loaded</p>
                <p className="mt-1 text-3xl font-black text-gray-900">{pendingCount}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30">
                <ClipboardDocumentIcon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Accepted Loaded</p>
                <p className="mt-1 text-3xl font-black text-green-700">{acceptedCount}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <CheckCircleIcon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 md:hidden">
          <button
            type="button"
            onClick={() => setIsFiltersExpanded((current) => !current)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-all hover:border-[#F59B0F]"
          >
            <span className="font-semibold text-gray-900">Filters</span>
            <ChevronDownIcon className={`h-5 w-5 text-gray-600 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className={`${isFiltersExpanded ? 'block' : 'hidden'} mb-6 space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:block md:p-6`}>
          <div className="grid grid-cols-1 items-end gap-3 xl:grid-cols-12">
            <div className="relative xl:col-span-6">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search title, description, type..."
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-[#F59B0F] focus:bg-white"
              />
            </div>

            <div className="xl:col-span-3">
              <Select<SelectOption<RequestStatusFilter>, false>
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find((option) => option.value === statusFilter) ?? STATUS_OPTIONS[0]}
                onChange={(option) => {
                  setStatusFilter(option?.value ?? 'all');
                  setPageNumber(0);
                }}
                placeholder="Filter status..."
                isSearchable={false}
                menuPortalTarget={getSelectPortalTarget()}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={getRequestSelectStyles<SelectOption<RequestStatusFilter>>()}
              />
            </div>

            <div className="xl:col-span-3">
              <Select<SelectOption<number>, false>
                options={typeFilterOptions}
                value={typeFilterOptions.find((option) => option.value === typeFilter) ?? typeFilterOptions[0]}
                onChange={(option) => {
                  setTypeFilter(option?.value ?? 0);
                  setPageNumber(0);
                }}
                placeholder="Filter type..."
                isSearchable
                menuPortalTarget={getSelectPortalTarget()}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={getRequestSelectStyles<SelectOption<number>>()}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadRequests()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2 font-semibold text-white"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-6">
            {error}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 scrollbar-hide">
              <RequestForUser onClose={() => setShowCreateModal(false)} onSubmitted={handleSubmitted} />
            </div>
          </div>
        )}

        {showDetailsModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 scrollbar-hide">
              <div className="sticky top-0 border-b border-white/20 bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] px-6 py-6 text-white sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 p-2.5 shadow-inner ring-1 ring-white/30 backdrop-blur-md">
                      <ClipboardDocumentIcon className="h-7 w-7 text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/95">
                          Request #{selectedRequest.id}
                        </span>
                        {!selectedRequest.isRead && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#AC6C2A]">
                            Unread
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-black text-white">Request Details</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(false)}
                    className="rounded-xl border border-white/30 bg-white/10 p-2 text-white shadow-sm transition hover:bg-white/20"
                    title="Close modal"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="space-y-6 p-6 sm:p-8">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Title</h3>
                  <p className="text-lg font-bold text-gray-900">{selectedRequest.title}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Description</h3>
                  <p className="leading-relaxed text-gray-700">{selectedRequest.desc || '-'}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-purple-700">Request Type</h3>
                    <p className="font-bold text-gray-900">{selectedRequest.userRequestType?.name || '-'}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Created</h3>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-600">Documents</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.verificationDataIds.length > 0 ? verificationLinks(selectedRequest.verificationDataIds) : <span className="text-sm text-gray-500">No documents</span>}
                  </div>
                </div>

                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-green-700">Acceptance Status</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${
                      selectedRequest.isAccepted
                        ? 'bg-green-100 text-green-700 ring-green-300'
                        : 'bg-amber-100 text-amber-700 ring-amber-300'
                    }`}
                  >
                    {selectedRequest.isAccepted ? 'Accepted' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="sticky bottom-0 flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row-reverse sm:items-center sm:px-8">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Close
                </button>
                {canDeleteOwnRequests && !selectedRequest.isRead && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(selectedRequest)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-700">
            {isLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : (
              <>
                Showing <span className="font-bold text-gray-900">{startItem}-{endItem}</span> of{' '}
                <span className="font-bold text-gray-900">{totalCount}</span> requests
              </>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <span className="text-sm font-medium text-gray-600">Per page:</span>
              <div className="w-28">
                <Select<SelectOption<number>, false>
                  options={ROWS_PER_PAGE_OPTIONS}
                  value={ROWS_PER_PAGE_OPTIONS.find((option) => option.value === countPerPage) ?? ROWS_PER_PAGE_OPTIONS[1]}
                  onChange={(option) => {
                    setCountPerPage(option?.value ?? 10);
                    setPageNumber(0);
                  }}
                  isSearchable={false}
                  menuPortalTarget={getSelectPortalTarget()}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={getRequestSelectStyles<SelectOption<number>>()}
                  aria-label="Rows per page"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPageNumber((prev) => Math.max(0, prev - 1))}
                  disabled={pageNumber === 0 || isLoading}
                  className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white"
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
                </button>
                <div className="rounded-lg border-2 border-gray-200 bg-white px-4 py-1.5 text-sm font-bold text-gray-900">
                  {pageNumber + 1} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPageNumber((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
                  disabled={pageNumber + 1 >= totalPages || isLoading}
                  className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white"
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => void loadRequests()}
                disabled={isLoading}
                className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40"
                title="Refresh requests"
                aria-label="Refresh requests"
              >
                <ArrowPathIcon className={`h-5 w-5 text-gray-700 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-linear-to-r from-gray-50 to-gray-100">
                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Request</th>
                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Type</th>
                <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-700">Status</th>
                <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center font-medium text-gray-500">
                    Loading your requests...
                  </td>
                </tr>
              ) : (
                rows.map((request) => (
                  <tr
                    key={request.id}
                    className={`transition-colors ${
                      !request.isRead ? 'bg-orange-50/80 hover:bg-orange-100/70' : 'hover:bg-orange-50/40'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="max-w-[360px]">
                        <div className="flex items-center gap-2">
                          {!request.isRead && <span className="h-2.5 w-2.5 rounded-full bg-[#F59B0F]" aria-label="Unread request" />}
                          <p className="font-bold text-gray-900">{request.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(request.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">{request.userRequestType?.name || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${
                          request.isAccepted
                            ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        }`}
                      >
                        <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />
                        {request.isAccepted ? 'Accepted' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetailsModal(true);
                          }}
                          title="View request details"
                          aria-label="View request details"
                          className="inline-flex items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-2 text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {canDeleteOwnRequests && !request.isRead && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(request)}
                            title={`Delete request #${request.id}`}
                            aria-label={`Delete request #${request.id}`}
                            className="inline-flex items-center justify-center rounded-lg border-2 border-red-100 bg-white p-2 text-red-600 transition-all hover:border-red-200 hover:bg-red-50"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-2 text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50"
                          title="More options"
                          aria-label="More options"
                        >
                          <EllipsisHorizontalIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isLoading && rows.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-orange-100 to-orange-200">
                  <ClipboardDocumentListIcon className="h-10 w-10 text-[#F59B0F]" />
                </div>
                <p className="mb-2 text-xl font-black text-gray-900">No requests found</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyRequestsManager;
