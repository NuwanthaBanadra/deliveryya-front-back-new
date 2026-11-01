import {
  ArrowPathIcon,
  Bars3Icon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import AsyncSelect from 'react-select/async';
import axiosInstance from '../../../util/AxiosUtil';
import { debounce } from '../../../util/DebounceUtil';
import { swalAlert } from '../../../util/SwalUtil';

type ApiObject = {
  items?: unknown[];
  total?: number;
  count?: number;
  pageNumber?: number;
  currentPage?: number;
  countPerPage?: number;
  pageSize?: number;
};

type ApiResponse<T> = {
  object?: T;
};

type EmployeeOption = {
  value: string;
  label: string;
};

type PickupRequestRecord = {
  id: string;
  requesterName: string;
  message: string;
  location: string;
  createdAt: string;
  accepted: boolean | null;
  completed: boolean | null;
};

const PICKUP_REQUESTS_PER_PAGE = 10;

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
    minHeight: '42px',
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
    zIndex: 30,
  }),
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const asNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const asBoolean = (...values: unknown[]): boolean | null => {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return null;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getGoogleMapsSearchLink = (location: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;

const normalizeEmployee = (item: Record<string, unknown>, index: number): EmployeeOption => {
  const firstName = asString(item.firstName, item.fname);
  const lastName = asString(item.lastName, item.lname);
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const mobile = asString(item.mobile, item.phone);
  const name = asString(item.fullName, item.username, fullName) || `Employee ${index + 1}`;

  return {
    value: asString(item.id, item.employeeId) || `emp-${index + 1}`,
    label: mobile ? `${name} - ${mobile}` : name,
  };
};

const normalizePickupRequest = (item: Record<string, unknown>, index: number): PickupRequestRecord => {
  const requester = isRecord(item.user) ? item.user : null;
  const requesterName = [
    asString(requester?.firstName),
    asString(requester?.lastName),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: asString(item.id, item.pickupRequestId) || `pickup-${index + 1}`,
    requesterName: asString(requesterName, requester?.username, requester?.email) || 'Unknown requester',
    message: asString(item.message, item.details) || '-',
    location: asString(item.location, item.locationAddress) || '-',
    createdAt: asString(item.createdAt, item.updatedAt) || new Date().toISOString(),
    accepted: asBoolean(item.isAccepted, item.accepted),
    completed: asBoolean(item.isCompleted, item.completed),
  };
};

type SortableSelectedRequestRowProps = {
  request: PickupRequestRecord;
  index: number;
};

function SortableSelectedRequestRow({ request, index }: SortableSelectedRequestRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id: request.id });

  return (
    <tr
      ref={setNodeRef}
      className={`border-b border-gray-100 last:border-b-0 ${isDragging ? 'bg-orange-50 shadow-sm' : ''}`}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 transition-colors hover:border-amber-300 hover:text-amber-700 cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
        >
          <Bars3Icon className="h-4 w-4" />
          {index + 1}
        </button>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{request.requesterName}</td>
      <td className="px-4 py-3 text-sm text-gray-700 max-w-80 truncate" title={request.message}>{request.message}</td>
      <td className="px-4 py-3 text-sm text-gray-700 max-w-72" title={request.location}>
        {request.location === '-' ? (
          request.location
        ) : (
          <a
            href={getGoogleMapsSearchLink(request.location)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-amber-700 transition-colors hover:text-amber-800 hover:underline"
          >
            <MapPinIcon className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="min-w-0 truncate">{request.location}</span>
          </a>
        )}
      </td>
    </tr>
  );
}

function PickupRequestAssignments() {
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [requests, setRequests] = useState<PickupRequestRecord[]>([]);

  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedRequestOrder, setSelectedRequestOrder] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  const [pageNumber, setPageNumber] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / PICKUP_REQUESTS_PER_PAGE)),
    [totalItems]
  );
  const isRequestAssignable = useCallback(
    (request: PickupRequestRecord) => request.accepted !== true && request.completed !== true,
    []
  );
  const selectedRequestMap = useMemo(() => new Set(selectedRequestIds), [selectedRequestIds]);
  const requestStats = useMemo(() => {
    const completed = requests.filter((request) => request.completed === true).length;
    const accepted = requests.filter((request) => request.accepted === true && request.completed !== true).length;
    const pending = requests.length - completed - accepted;
    return {
      completed,
      accepted,
      pending,
    };
  }, [requests]);
  const assignableRequests = useMemo(
    () => requests.filter((request) => isRequestAssignable(request)),
    [requests, isRequestAssignable]
  );
  const allVisibleSelected = useMemo(
    () => assignableRequests.length > 0 && assignableRequests.every((request) => selectedRequestMap.has(request.id)),
    [assignableRequests, selectedRequestMap]
  );
  const showingRange = useMemo(() => {
    if (requests.length === 0) {
      return { from: 0, to: 0 };
    }
    const from = pageNumber * PICKUP_REQUESTS_PER_PAGE + 1;
    const to = from + requests.length - 1;
    return { from, to };
  }, [pageNumber, requests.length]);
  const selectedRequests = useMemo(
    () => requests.filter((request) => selectedRequestMap.has(request.id)),
    [requests, selectedRequestMap]
  );
  const selectedRequestsById = useMemo(
    () => new Map(selectedRequests.map((request) => [request.id, request])),
    [selectedRequests]
  );
  const orderedSelectedRequests = useMemo(() => {
    if (selectedRequests.length === 0) {
      return [];
    }

    const ordered = selectedRequestOrder
      .map((id) => selectedRequestsById.get(id))
      .filter((request): request is PickupRequestRecord => Boolean(request));

    if (ordered.length === selectedRequests.length) {
      return ordered;
    }

    const existingIds = new Set(ordered.map((request) => request.id));
    const missing = selectedRequests.filter((request) => !existingIds.has(request.id));
    return [...ordered, ...missing];
  }, [selectedRequestOrder, selectedRequests, selectedRequestsById]);

  const reorderSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const debouncedLoadEmployees = useMemo(
    () => debounce(async (inputValue: string, callback: (options: EmployeeOption[]) => void) => {
      const query = inputValue.trim();
      if (query.length < 2) {
        callback([]);
        return;
      }

      setIsLoadingEmployees(true);
      try {
        const response = await axiosInstance.post<ApiResponse<ApiObject>>('/users/get-users', {
          pageNumber: 0,
          countPerPage: 50,
          search: query,
          isActive: true,
          isEmployee: true,
        });

        const objectData = response.data.object;
        const rows = (isRecord(objectData) && Array.isArray(objectData.items) ? objectData.items : []).filter(isRecord);
        callback(rows.map((item, index) => normalizeEmployee(item, index)));
      } catch {
        callback([]);
        swalAlert('Employees', 'Could not load employee list.', 'warning');
      } finally {
        setIsLoadingEmployees(false);
      }
    }, 400),
    []
  );

  const loadEmployeeOptions = useCallback(
    (inputValue: string, callback: (options: EmployeeOption[]) => void) => {
      debouncedLoadEmployees(inputValue, callback);
    },
    [debouncedLoadEmployees]
  );

  const loadPickupRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    setLoadError(null);

    try {
      const response = await axiosInstance.post<ApiResponse<ApiObject>>('/agent-jobs/pickup-requests/get', {
        pageNumber,
        countPerPage: PICKUP_REQUESTS_PER_PAGE,
      });

      const objectData = response.data.object;
      const rows = (isRecord(objectData) && Array.isArray(objectData.items) ? objectData.items : []).filter(isRecord);
      const normalizedRows = rows.map((item, index) => normalizePickupRequest(item, index));

      const total = asNumber(
        isRecord(objectData) ? objectData.total : null,
        isRecord(objectData) ? objectData.count : null,
        normalizedRows.length,
      ) ?? normalizedRows.length;

      setRequests(normalizedRows);
      setTotalItems(total);

      setSelectedRequestIds((current) =>
        current.filter((id) => normalizedRows.some((request) => request.id === id && isRequestAssignable(request)))
      );
    } catch {
      setRequests([]);
      setTotalItems(0);
      setLoadError('Could not load pickup requests from the server.');
    } finally {
      setIsLoadingRequests(false);
    }
  }, [isRequestAssignable, pageNumber]);

  useEffect(() => {
    void loadPickupRequests();
  }, [loadPickupRequests]);

  useEffect(() => {
    if (!isAssignModalOpen) {
      return;
    }

    const availableIds = selectedRequests.map((request) => request.id);
    setSelectedRequestOrder((current) => {
      const filtered = current.filter((id) => availableIds.includes(id));
      const missing = availableIds.filter((id) => !filtered.includes(id));
      return [...filtered, ...missing];
    });
  }, [isAssignModalOpen, selectedRequests]);

  const toggleRequest = (requestId: string) => {
    const request = requests.find((item) => item.id === requestId);
    if (!request || !isRequestAssignable(request)) {
      return;
    }

    setSelectedRequestIds((current) =>
      current.includes(requestId)
        ? current.filter((id) => id !== requestId)
        : [...current, requestId]
    );
  };

  const toggleSelectAllVisible = () => {
    if (assignableRequests.length === 0) {
      return;
    }

    if (allVisibleSelected) {
      setSelectedRequestIds((current) => current.filter((id) => !assignableRequests.some((request) => request.id === id)));
      return;
    }

    setSelectedRequestIds((current) => {
      const merged = new Set(current);
      assignableRequests.forEach((request) => merged.add(request.id));
      return Array.from(merged);
    });
  };

  const openAssignModal = () => {
    if (selectedRequests.filter((request) => isRequestAssignable(request)).length === 0) {
      swalAlert('Assignment', 'Please select at least one pickup request.', 'warning');
      return;
    }
    setSelectedEmployee(null);
    setSelectedRequestOrder(selectedRequests.map((request) => request.id));
    setIsAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    if (isAssigning) return;
    setIsAssignModalOpen(false);
  };

  const handleAssign = async () => {
    if (!selectedEmployee) {
      swalAlert('Assignment', 'Please select an employee first.', 'warning');
      return;
    }
    if (selectedRequestIds.length === 0) {
      swalAlert('Assignment', 'Please select at least one pickup request.', 'warning');
      return;
    }

    const employeeId = Number(selectedEmployee.value);
    const assignableSelectedRequests = orderedSelectedRequests.filter((request) => isRequestAssignable(request));

    if (assignableSelectedRequests.length === 0) {
      swalAlert('Assignment', 'Selected pickup requests are not available on this page anymore. Please refresh and try again.', 'warning');
      return;
    }

    const assignmentTasks = assignableSelectedRequests.map((request) => {
      const pickupRequestId = Number(request.id);
      return {
        task: request.message,
        location: request.location,
        ...(Number.isFinite(pickupRequestId) ? { pickupRequestId } : { pickupRequestRef: request.id }),
      };
    });

    setIsAssigning(true);
    try {
      await axiosInstance.post('/agent-jobs/set-agent-job', {
        userId: Number.isFinite(employeeId) ? employeeId : selectedEmployee.value,
        urgentJobId: null,
        task: `Pickup requests assignment (${assignmentTasks.length})`,
        tasks: assignmentTasks,
      });

      swalAlert('Success', 'Employee assigned to selected pickup requests.', 'success');
      setSelectedRequestIds([]);
      setSelectedEmployee(null);
      setIsAssignModalOpen(false);
      await loadPickupRequests();
    } catch {
      swalAlert('Assignment Failed', 'Could not assign employee to selected pickup requests.', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSelectedRequestsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setSelectedRequestOrder((current) => {
      const oldIndex = current.findIndex((id) => id === active.id);
      const newIndex = current.findIndex((id) => id === over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            Pickup Request
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Select pickup requests and assign them to an employee.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Selected</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{selectedRequestIds.length}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending</p>
                <p className="text-3xl font-black text-amber-700 mt-1">{requestStats.pending}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <ExclamationTriangleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Accepted</p>
                <p className="text-3xl font-black text-blue-700 mt-1">{requestStats.accepted}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Completed</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{requestStats.completed}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <UserGroupIcon className="h-5 w-5" />
              <span>
                Selected requests: <strong>{selectedRequestIds.length}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900"
              >
                {allVisibleSelected ? 'Unselect Page' : 'Select Page'}
              </button>

              
              <button
                type="button"
                onClick={() => { void loadPickupRequests(); }}
                disabled={isLoadingRequests}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openAssignModal}
                disabled={selectedRequestIds.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                Assign Employee ({selectedRequestIds.length})
              </button>
            </div>
          </div>

          {loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-700">
            {isLoadingRequests ? (
              <span className="text-gray-500">Loading...</span>
            ) : (
              <>
                Showing <span className="font-bold text-gray-900">{showingRange.from}</span> to{' '}
                <span className="font-bold text-gray-900">{showingRange.to}</span> of{' '}
                <span className="font-bold text-gray-900">{totalItems}</span> pickup requests
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPageNumber((current) => Math.max(0, current - 1))}
              disabled={pageNumber === 0 || isLoadingRequests}
              className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
              title="Previous page"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
              {pageNumber + 1} / {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPageNumber((current) => Math.min(totalPages - 1, current + 1))}
              disabled={pageNumber >= totalPages - 1 || isLoadingRequests}
              className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
              title="Next page"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  <input
                    type="checkbox"
                    title="Select all on this page"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                  />
                </th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Requester</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Message</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Location</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Created</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingRequests ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                      <p className="text-gray-600">Loading pickup requests...</p>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                        <ExclamationTriangleIcon className="w-10 h-10 text-[#F59B0F]" />
                      </div>
                      <p className="text-xl font-black text-gray-900 mb-2">No pickup requests found</p>
                      <p className="text-gray-600">Try refreshing or changing the page size.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const checked = selectedRequestMap.has(request.id);
                  const statusText = request.completed
                    ? 'Completed'
                    : request.accepted
                      ? 'Accepted'
                      : 'Pending';
                  const statusClass = request.completed
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : request.accepted
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';

                  const isAssignable = isRequestAssignable(request);

                  return (
                    <tr key={request.id} className={`${isAssignable ? 'hover:bg-orange-50/30' : 'bg-gray-50/70'} transition-colors`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={checked}
                          title={`Select pickup request ${request.id}`}
                          onChange={() => toggleRequest(request.id)}
                          disabled={!isAssignable}
                          className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{request.requesterName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-80 truncate" title={request.message}>{request.message}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-72" title={request.location}>
                        {request.location === '-' ? (
                          request.location
                        ) : (
                          <a
                            href={getGoogleMapsSearchLink(request.location)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1.5 text-amber-700 transition-colors hover:text-amber-800 hover:underline"
                          >
                            <MapPinIcon className="h-4 w-4 shrink-0 text-amber-600" />
                            <span className="min-w-0 truncate">{request.location}</span>
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-700 whitespace-nowrap">{formatDateTime(request.createdAt)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${statusClass}`}>
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="relative bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-6 pb-5 pt-6">
              <button
                type="button"
                onClick={closeAssignModal}
                className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30 disabled:opacity-50"
                title="Close assignment modal"
                disabled={isAssigning}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Pickup Requests</p>
                  <h3 className="text-xl font-black text-white">Assign Employee</h3>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Employee
                </label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions={false}
                  value={selectedEmployee}
                  loadOptions={loadEmployeeOptions}
                  onChange={(selected) => setSelectedEmployee(selected as EmployeeOption | null)}
                  isClearable
                  isSearchable
                  isLoading={isLoadingEmployees}
                  loadingMessage={() => 'Loading employees...'}
                  noOptionsMessage={({ inputValue }) =>
                    inputValue.trim().length < 2
                      ? 'Type at least 2 characters'
                      : 'No employees found'
                  }
                  placeholder="Search employee by name or mobile"
                  styles={customSelectFieldStyles}
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
                  <p className="text-sm font-bold text-gray-800">
                    Selected Pickup Requests ({orderedSelectedRequests.length})
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Drag rows to change assignment order</p>
                </div>

                <div className="max-h-72 overflow-auto">
                  {orderedSelectedRequests.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-600">No pickup requests selected.</div>
                  ) : (
                    <DndContext
                      sensors={reorderSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleSelectedRequestsDragEnd}
                    >
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Order</th>
                            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Requester</th>
                            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Message</th>
                            <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Location</th>
                          </tr>
                        </thead>
                        <SortableContext
                          items={orderedSelectedRequests.map((request) => request.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <tbody className="divide-y divide-gray-100">
                            {orderedSelectedRequests.map((request, index) => (
                              <SortableSelectedRequestRow
                                key={request.id}
                                request={request}
                                index={index}
                              />
                            ))}
                          </tbody>
                        </SortableContext>
                      </table>
                    </DndContext>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={closeAssignModal}
                disabled={isAssigning}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleAssign(); }}
                disabled={isAssigning || !selectedEmployee || orderedSelectedRequests.length === 0}
                className="rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isAssigning ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PickupRequestAssignments;