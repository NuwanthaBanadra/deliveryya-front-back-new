import { ArrowPathIcon, BriefcaseIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, MagnifyingGlassIcon, PlusCircleIcon, TrashIcon, UserGroupIcon, XMarkIcon, } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import axiosInstance from '../../util/AxiosUtil';
import JwtUtil from '../../util/JwtUtil';
import { hasAccess } from '../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../util/FrontendAccess';
import { swalConfirm } from '../../util/SwalUtil';
import AgentJobRecordModal from './employeeAssignment/AgentJobRecordModal';
import NewAssignmentModal from './employeeAssignment/NewAssignmentModal';
import type { AssignmentRecord, DateFilter, EmployeeOption, EmployeeSelectOption, } from './employeeAssignment/types';

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

const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'lastMonth', label: 'Last Month' },
];

const JOB_STATUS_OPTIONS: EmployeeSelectOption[] = [
  { value: 'all', label: 'All Jobs' },
  { value: 'current', label: 'Current Jobs' },
  { value: 'completed', label: 'Completed Jobs' },
];



const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (...vals: unknown[]): string => {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDateRangeFromFilter = (filter: DateFilter): { fromDate: string | null; toDate: string | null } => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'today') {
    return {
      fromDate: todayStart.toISOString(),
      toDate: now.toISOString(),
    };
  }

  if (filter === 'yesterday') {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    return {
      fromDate: yesterdayStart.toISOString(),
      toDate: todayStart.toISOString(),
    };
  }

  if (filter === 'lastWeek') {
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(todayStart.getDate() - 7);
    return {
      fromDate: sevenDaysAgo.toISOString(),
      toDate: now.toISOString(),
    };
  }

  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(todayStart.getDate() - 30);
  return {
    fromDate: thirtyDaysAgo.toISOString(),
    toDate: now.toISOString(),
  };
};

const calcJobStats = (assignments: AssignmentRecord[]) => {
  const current = assignments.filter((a) => a.accepted === false || a.accepted === null).length;
  const completed = assignments.filter((a) => a.accepted === true).length;
  const total = assignments.length;
  return { current, completed, total };
};

const normalizeAssignment = (item: Record<string, unknown>, idx: number): AssignmentRecord => {
  // New structure from /get-agent-jobs endpoint
  return {
    id: Number(item.id) || idx,
    task: str(item.task) || '—',
    accepted: typeof item.accepted === 'boolean' ? item.accepted : null,
    createdAt: str(item.createdAt) || new Date().toISOString(),
    updatedAt: str(item.updatedAt) || new Date().toISOString(),
    tasks: Array.isArray(item.tasks)
      ? (item.tasks as Record<string, unknown>[]).map((task) => ({
          id: Number(task.id) || 0,
          task: str(task.task) || '',
          location: str(task.location) || '',
          isComplete: typeof task.isComplete === 'boolean' ? task.isComplete : false,
          beAt: str(task.beAt) || new Date().toISOString(),
        }))
      : [],
    employee: isRecord(item.employee)
      ? {
          id: Number(item.employee.id) || 0,
          userId: Number(item.employee.userId) || 0,
          firstName: str(item.employee.firstName) || '',
          lastName: str(item.employee.lastName) || '',
          mobile: str(item.employee.mobile) || '',
          whatsapp: str(item.employee.whatsapp) || undefined,
        }
      : {
          id: 0,
          userId: 0,
          firstName: '',
          lastName: '',
          mobile: '',
        },
    createdByUser: isRecord(item.createdByUser)
      ? {
          id: Number(item.createdByUser.id) || 0,
          firstName: str(item.createdByUser.firstName) || '',
          lastName: str(item.createdByUser.lastName) || '',
          email: str(item.createdByUser.email) || '',
        }
      : {
          id: 0,
          firstName: '',
          lastName: '',
          email: '',
        },
    urgentJob: item.urgentJob || null,
  };
};

const getRoleId = (item: Record<string, unknown>): number | null => {
  const role = isRecord(item.userRole) ? item.userRole : null;
  const roleIdRaw = str(item.userRoleId, role?.id);
  const parsed = Number(roleIdRaw);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAgentJobsScope = (): { roleId: number | null; userId: number | null } => {
  const token = localStorage.getItem('jwtToken');
  if (!token) return { roleId: null, userId: null };

  const decoded = JwtUtil.decodeToken(token);
  if (!decoded) return { roleId: null, userId: null };

  const roleId = Number(decoded.roleId);
  const localUserId = Number(localStorage.getItem('userId'));
  const jwtUserId = Number(decoded.userId);
  const effectiveUserId = Number.isFinite(localUserId) && localUserId > 0
    ? localUserId
    : (Number.isFinite(jwtUserId) && jwtUserId > 0 ? jwtUserId : null);

  const isLimitedRole = roleId === 5 || roleId === 6 || roleId === 7;
  return {
    roleId: Number.isFinite(roleId) ? roleId : null,
    userId: isLimitedRole ? effectiveUserId : null,
  };
};

function JobAssignmentManager() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<DateFilter>('today');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [jobStatus, setJobStatus] = useState<'all' | 'current' | 'completed'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal states
  const [viewRecord, setViewRecord] = useState<AssignmentRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isUpdatingAcceptance, setIsUpdatingAcceptance] = useState(false);
  const [acceptanceError, setAcceptanceError] = useState<string | null>(null);
  const canDeleteAgentJobs = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.AGENT_JOB_DELETE), []);

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const loadEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const { roleId: loggedInRoleId } = getAgentJobsScope();
      const loggedInRoleIdNum = Number(loggedInRoleId);
      if (!Number.isFinite(loggedInRoleIdNum)) {
        setEmployees([]);
        return;
      }

      const res = await axiosInstance.post<{ object?: unknown }>('/users/get-users', {
        pageNumber: 0,
        countPerPage: 500,
        isActive: true,
        isEmployee: true,
      });
      const obj = res.data?.object;
      const rows = (isRecord(obj) && Array.isArray(obj.items) ? obj.items : [])
        .filter(isRecord)
        .filter((item) => {
          const employeeRoleId = getRoleId(item);
          return employeeRoleId !== null && employeeRoleId > loggedInRoleIdNum;
        });
      setEmployees(rows.map((item, i) => {
        const fn = str(item.firstName, item.fname);
        const ln = str(item.lastName, item.lname);
        return {
          id: str(item.id, item.employeeId) || `emp-${i}`,
          name: str(item.fullName, item.username, [fn, ln].filter(Boolean).join(' ')) || `Employee ${i + 1}`,
          mobile: str(item.mobile, item.phone) || 'N/A',
        };
      }));
    } catch {
      /* failed to load employees */
    } finally {
      setIsLoadingEmployees(false);
    }
  }, []);

  const loadAssignments = useCallback(async (
    filters?: { search: string; jobStatus: 'all' | 'current' | 'completed'; activeFilter: DateFilter }
  ) => {
    setIsLoadingAssignments(true);
    setLoadError(null);
    try {
      const { roleId, userId } = getAgentJobsScope();
      const appliedFilters = filters ?? { search, jobStatus, activeFilter };
      const accepted =
        appliedFilters.jobStatus === 'all'
          ? null
          : appliedFilters.jobStatus === 'completed';

      const { fromDate, toDate } = getDateRangeFromFilter(appliedFilters.activeFilter);
      const normalizedSearch = appliedFilters.search.trim();

      const res = await axiosInstance.post<{ object?: unknown }>('/agent-jobs/get-agent-jobs', {
        pageNumber: 0,
        countPerPage: 500,
        roleId,
        userId,
        accepted,
        search: normalizedSearch || null,
        fromDate,
        toDate,
      });
      const obj = res.data?.object;
      const items = (isRecord(obj) && Array.isArray(obj.items) ? obj.items : []).filter(isRecord);
      setAssignments(items.map((item, i) => normalizeAssignment(item, i)));
    } catch {
      setLoadError('Could not load agent jobs from the server.');
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [activeFilter, jobStatus, search]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadAssignments({ search, jobStatus, activeFilter });
    }, 350);

    return () => clearTimeout(timeout);
  }, [search, jobStatus, activeFilter, refreshTick, loadAssignments]);

  const filteredAssignments = assignments;

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));

  useEffect(() => {
    setPage(0);
  }, [search, activeFilter, jobStatus]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  const paginatedAssignments = useMemo(() => {
    const start = page * pageSize;
    return filteredAssignments.slice(start, start + pageSize);
  }, [filteredAssignments, page, pageSize]);

  const showingRange = useMemo(() => {
    if (filteredAssignments.length === 0) {
      return { from: 0, to: 0 };
    }
    const from = page * pageSize + 1;
    const to = Math.min(filteredAssignments.length, (page + 1) * pageSize);
    return { from, to };
  }, [filteredAssignments.length, page, pageSize]);

  const jobStats = useMemo(() => calcJobStats(assignments), [assignments]);

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (search) chips.push({ label: `Search: "${search}"`, onRemove: () => setSearch('') });
    if (activeFilter !== 'today') {
      const label = DATE_FILTER_OPTIONS.find((o) => o.value === activeFilter)?.label ?? activeFilter;
      chips.push({ label: `Filter: ${label}`, onRemove: () => setActiveFilter('today') });
    }
    if (jobStatus !== 'all') {
      const label = JOB_STATUS_OPTIONS.find((o) => o.value === jobStatus)?.label ?? jobStatus;
      chips.push({ label: `Status: ${label}`, onRemove: () => setJobStatus('all') });
    }
    return chips;
  }, [search, activeFilter, jobStatus]);

  const resetFilters = () => {
    setSearch('');
    setActiveFilter('today');
    setJobStatus('all');
  };

  const handleCloseViewModal = () => {
    setAcceptanceError(null);
    setViewRecord(null);
  };

  const handleOpenNewAssignmentModal = () => {
    setIsModalOpen(true);
  };

  const handleCancelNewAssignmentModal = () => {
    setIsModalOpen(false);
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!canDeleteAgentJobs) return;

    const confirmed = await swalConfirm(
      'Delete Assignment',
      'Are you sure you want to delete this assignment? This action cannot be undone.',
      'Yes, Delete',
      'Cancel',
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await axiosInstance.delete('/agent-jobs/delete', {
        data: { jobIds: [id] },
      });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      /* deletion failed — keep row in list */
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateAcceptance = async (accepted: boolean) => {
    if (!viewRecord) return;

    const currentId = viewRecord.id;
    if (!Number.isFinite(currentId)) {
      setAcceptanceError('Invalid agent job ID.');
      return;
    }

    setAcceptanceError(null);
    setIsUpdatingAcceptance(true);
    try {
      await axiosInstance.put('/agent-jobs/update-acceptance', [
        {
          agentJobId: currentId,
          accepted,
        },
      ]);

      setAssignments((prev) => prev.map((assignment) => (
        assignment.id === currentId
          ? { ...assignment, accepted }
          : assignment
      )));

      setViewRecord((prev) => (
        prev && prev.id === currentId
          ? { ...prev, accepted }
          : prev
      ));
    } catch {
      setAcceptanceError('Failed to update assignment status. Please try again.');
    } finally {
      setIsUpdatingAcceptance(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            Job Assignments
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Set and manage job assignments for workers.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Current Jobs</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{jobStats.current}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Completed Jobs</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{jobStats.completed}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Jobs</p>
                <p className="text-3xl font-black text-blue-700 mt-1">{jobStats.total}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <BriefcaseIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNewAssignmentModal}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Create Job
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by employee, task, or creator..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm md:text-base"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">Job Status</label>
              <Select
                options={JOB_STATUS_OPTIONS}
                value={JOB_STATUS_OPTIONS.find((opt) => opt.value === jobStatus) ?? JOB_STATUS_OPTIONS[0]}
                onChange={(selected) => setJobStatus((selected?.value as 'all' | 'current' | 'completed') ?? 'all')}
                isClearable={false}
                styles={customSelectFieldStyles}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">Date Range</label>
              <div className="flex flex-wrap items-center gap-2">
                {DATE_FILTER_OPTIONS.map((option) => {
                  const isActive = activeFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setActiveFilter(option.value)}
                      className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${isActive
                        ? 'bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white shadow-md'
                        : 'border border-gray-200 bg-white text-gray-700 hover:border-[#F59B0F] hover:bg-orange-50'
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => { void loadEmployees(); setRefreshTick((prev) => prev + 1); }}
              disabled={isLoadingEmployees || isLoadingAssignments}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoadingAssignments || isLoadingEmployees ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all text-sm"
            >
              Reset Filters
            </button>
          </div>

          {/* Active Filters Display */}
          {activeFilterChips.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Active:</span>
                {activeFilterChips.map((chip) => (
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

        {/* Error Message */}
        {loadError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Pagination Info */}
        <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700">
              {isLoadingAssignments ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                <>
                  Showing <span className="font-bold text-gray-900">{showingRange.from}</span> to{' '}
                  <span className="font-bold text-gray-900">{showingRange.to}</span> of{' '}
                  <span className="font-bold text-gray-900">{filteredAssignments.length}</span> assignments
                </>
              )}
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  aria-label="Rows per page"
                  title="Rows per page"
                  className="px-3 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 font-semibold text-sm focus:outline-none focus:border-[#F59B0F]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0 || isLoadingAssignments}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                  title="Previous page"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                  {page + 1} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  disabled={page >= totalPages - 1 || isLoadingAssignments}
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

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Employee</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Task</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Created By</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Assigned At</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingAssignments && paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                      <p className="text-gray-600">Loading assignments...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                        <UserGroupIcon className="w-10 h-10 text-[#F59B0F]" />
                      </div>
                      <p className="text-xl font-black text-gray-900 mb-2">No assignments found</p>
                      <p className="text-gray-600">Try adjusting your filters or create a new assignment</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAssignments.map((assignment) => {
                  const employeeName = `${assignment.employee.firstName} ${assignment.employee.lastName}`.trim() || 'Unknown Employee';
                  const creatorName = `${assignment.createdByUser.firstName} ${assignment.createdByUser.lastName}`.trim() || 'Unknown';
                  const acceptedLabel =
                    assignment.accepted === true
                      ? 'Accepted'
                      : assignment.accepted === false
                        ? 'Pending'
                        : 'Unknown';
                  const badgeClass =
                    assignment.accepted === true
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : assignment.accepted === false
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
                  return (
                    <tr key={assignment.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">{employeeName}</p>
                        <p className="text-xs text-gray-500 mt-1">{assignment.employee.mobile || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-48 truncate" title={assignment.task}>{assignment.task}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{creatorName}</td>
                      <td className="px-4 py-4 text-center text-sm text-gray-700">{formatDateTime(assignment.createdAt)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${badgeClass}`}>
                          {acceptedLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setAcceptanceError(null);
                              setViewRecord(assignment);
                            }}
                            title="View details"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canDeleteAgentJobs && (
                            <button
                              type="button"
                              onClick={() => { void handleDeleteAssignment(assignment.id); }}
                              disabled={deletingId === assignment.id}
                              title="Delete assignment"
                              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AgentJobRecordModal
        record={viewRecord}
        employeeMap={employeeMap}
        acceptanceError={acceptanceError}
        isUpdatingAcceptance={isUpdatingAcceptance}
        onClose={handleCloseViewModal}
        onUpdateAcceptance={(accepted) => { void handleUpdateAcceptance(accepted); }}
      />

      <NewAssignmentModal
        isOpen={isModalOpen}
        onClose={handleCancelNewAssignmentModal}
        onSuccess={() => {
          setIsModalOpen(false);
          setRefreshTick((prev) => prev + 1);
        }}
      />
    </div>
  );
}

export default JobAssignmentManager;
