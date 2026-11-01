import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ArrowPathIcon, BanknotesIcon, BellIcon, CheckCircleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ClockIcon, DocumentArrowDownIcon, DocumentCheckIcon, EllipsisVerticalIcon, EnvelopeIcon, EyeIcon, FunnelIcon, MagnifyingGlassIcon, NoSymbolIcon, TagIcon, TrashIcon, UserGroupIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select, { type SingleValue } from 'react-select';
import Swal from 'sweetalert2';
import axiosInstance from '../../../util/AxiosUtil';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import {
  fetchUserRoles,
  formatRoleName,
  getAssignableRoles,
  getCurrentUserRoleAccess,
  type UserRoleDetail,
} from '../../../util/UserRoleLevelAccess';
import { previewForceDeleteUser, forceDeleteUser } from '../../../util/ForceDeleteUtil';

import { SendNotificationModal } from './SendNotificationModal';
import { VerifyDocumentsModal } from './VerifyDocumentsModal';
import { UserBankDetailsModal } from './UserBankDetailsModal';
import { UserDetailModal } from './UserDetailModal';
import { ViewUserNotificationsModal } from './ViewUserNotificationsModal';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  verification: 'Verified' | 'Pending' | 'Rejected';
  account: 'Active' | 'Suspended' | 'Inactive';
  emailStatus: 'Verified' | 'Unverified';
  flags: string[];
}

interface BackendUserDto {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  isEmailVerified?: boolean;
  verificationStatus?: { id?: number; name?: string } | string;
  userRole?: { id?: number; name?: string; level?: number | null; roleLevel?: number | null };
  createdAt?: string;
  joinedAt?: string;
  createdDate?: string;
  dob?: string;
  flags?: string[];
}

interface SelectOption {
  value: string | number;
  label: string;
  level?: number | null;
}

interface VerificationStatus {
  id: number;
  name: string;
}

interface UpdateUserRoleOrDeletePayload {
  userId: number;
  userRoleId?: number;
  verificationStatusId?: number;
  isActive?: boolean;
  isDeleted?: boolean;
}

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

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
];

const formatRoleUpper = (role?: string | number | null, fallback = 'UNKNOWN') =>
  String(role ?? fallback).trim().toUpperCase();

const normalizeVerification = (status: string): UserData['verification'] => {
  const normalized = status.toLowerCase();
  if (normalized.includes('verified')) return 'Verified';
  if (normalized.includes('reject')) return 'Rejected';
  return 'Pending';
};

const formatDate = (value?: string): string => {
  if (!value) return 'Ã¢â‚¬"';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().split('T')[0];
};

const extractUsersAndTotal = (data: any): { users: BackendUserDto[]; total: number | null; totalPages: number | null } => {
  // Try common response patterns in order and also extract totalPages when present
  // Pattern 1: response.data.exData?.items
  if (data?.exData?.items && Array.isArray(data.exData.items)) {
    return {
      users: data.exData.items,
      total: Number.isFinite(Number(data.exData.total)) ? Number(data.exData.total) : null,
      totalPages: Number.isFinite(Number(data.exData.totalPages)) ? Number(data.exData.totalPages) : null,
    };
  }

  // Pattern 2: response.data.object?.items
  if (data?.object?.items && Array.isArray(data.object.items)) {
    return {
      users: data.object.items,
      total: Number.isFinite(Number(data.object.totalElements ?? data.object.total)) ? Number(data.object.totalElements ?? data.object.total) : null,
      totalPages: Number.isFinite(Number(data.object.totalPages)) ? Number(data.object.totalPages) : null,
    };
  }

  // Pattern 3: response.data.content (paginated response)
  if (data?.content && Array.isArray(data.content)) {
    return {
      users: data.content,
      total: Number.isFinite(Number(data.totalElements ?? data.total)) ? Number(data.totalElements ?? data.total) : null,
      totalPages: Number.isFinite(Number(data.totalPages)) ? Number(data.totalPages) : null,
    };
  }

  // Pattern 4: direct array
  if (Array.isArray(data)) {
    return { users: data, total: data.length, totalPages: Math.max(1, Math.ceil(data.length / 10)) };
  }

  // Pattern 5: wrapped direct array
  if (Array.isArray(data?.payload)) {
    return { users: data.payload, total: data.payload.length, totalPages: Math.max(1, Math.ceil(data.payload.length / 10)) };
  }

  // Fallback
  return { users: [], total: null, totalPages: null };
};

const mapBackendUserToTableUser = (user: BackendUserDto): UserData => {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  const verificationText =
    typeof user.verificationStatus === 'string'
      ? user.verificationStatus
      : user.verificationStatus?.name ?? 'Pending';
  const roleString = formatRoleUpper(user.userRole?.name);

  return {
    id: String(user.id),
    name: fullName || user.name || 'Unknown User',
    email: user.email || 'Ã¢â‚¬"',
    role: roleString,
    verification: normalizeVerification(verificationText),
    account: user.isActive ? 'Active' : 'Inactive',
    emailStatus: user.emailVerified || user.isEmailVerified ? 'Verified' : 'Unverified',
    flags: Array.isArray(user.flags) ? user.flags : []
  };
};

const getParsedDate = (value: string): Date | null => {
  if (!value || value === 'Ã¢â‚¬"') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const makeOptions = (values: string[]): SelectOption[] =>
  values
    .filter((value) => value.trim().length > 0)
    .map((value) => ({ value, label: value }));

const updateUserRoleOrDelete = (payload: UpdateUserRoleOrDeletePayload) =>
  axiosInstance.post('/users/update-user-role-or-delete', payload);

function BooleanFilterGroup({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">{label}</label>
      <div className="flex bg-gray-50 p-1 rounded-xl h-10 border-2 border-gray-200 shadow-inner">
        <button
          onClick={() => onChange(null)}
          className={`flex-1 text-xs font-bold rounded-lg transition-all ${
            value === null ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => onChange(true)}
          className={`flex-1 text-xs font-bold rounded-lg transition-all ${
            value === true ? 'bg-green-500 text-white shadow-md' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(false)}
          className={`flex-1 text-xs font-bold rounded-lg transition-all ${
            value === false ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

function AdminUserStatusTable() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const canUpdateOrDeleteUsers = useMemo(
    () => hasAccess(FRONTEND_ACCESS_IDS.USER_ROLE_UPDATE_OR_DELETE),
    []
  );
  const canUseNotifications = useMemo(
    () => hasAccess(FRONTEND_ACCESS_IDS.NOTIFICATION_ACCESS),
    []
  );

  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [genders, setGenders] = useState<SelectOption[]>([]);
  const [verificationStatuses, setVerificationStatuses] = useState<SelectOption[]>([]);

  const [roleFilter, setRoleFilter] = useState<number | ''>('');
  const [verificationFilter, setVerificationFilter] = useState<number | ''>('');
  const [genderFilter, setGenderFilter] = useState<number | ''>('');

  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState<boolean | null>(null);
  const [hasMarketFilter, setHasMarketFilter] = useState<boolean | null>(null);
  const [isEmployeeFilter, setIsEmployeeFilter] = useState<boolean | null>(null);
  
  const [flagFilter, setFlagFilter] = useState('');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationUserIds, setNotificationUserIds] = useState<string[]>([]);

  const [isVerifyDocumentsModalOpen, setIsVerifyDocumentsModalOpen] = useState(false);
  const [verifyDocumentsUserId, setVerifyDocumentsUserId] = useState<string | number | null>(null);
  const [verifyDocumentsUserLabel, setVerifyDocumentsUserLabel] = useState('');

  const [viewNotificationsUserId, setViewNotificationsUserId] = useState<string | null>(null);
  const [isViewNotificationsModalOpen, setIsViewNotificationsModalOpen] = useState(false);

  const [bankDetailsUserId, setBankDetailsUserId] = useState<string | null>(null);
  const [isBankDetailsModalOpen, setIsBankDetailsModalOpen] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const isAllMonthsSelected = selectedMonth === '';

  const setFromOptionNum = (
    setter: (value: number | '') => void,
    option: SingleValue<SelectOption>
  ) => {
    setter(option?.value ? Number(option.value) : '');
  };

  const loadFilterOptions = useCallback(async () => {
    try {
      const [vwRes, roleDetails, gdRes] = await Promise.all([
        axiosInstance.get('/users/get-verification-statuses').catch(console.error),
        fetchUserRoles().catch((err) => {
          console.error('Error loading user roles:', err);
          return [] as UserRoleDetail[];
        }),
        axiosInstance.get('/users/get-genders').catch(console.error),
      ]);

      const currentUserRoleAccess = getCurrentUserRoleAccess(roleDetails);

      if (vwRes?.data) {
        const statuses = Array.isArray(vwRes.data) ? vwRes.data : vwRes.data?.data || vwRes.data?.object || [];
        setVerificationStatuses(statuses.map((s: any) => ({ value: s.id, label: s.name })));
      }

      const filteredRoles = getAssignableRoles(roleDetails, currentUserRoleAccess);
      setRoles(filteredRoles.map((role) => {
        const labelText = currentUserRoleAccess.canManageAnyUserRole && role.level !== null
          ? `${formatRoleUpper(formatRoleName(role.name))} (${role.level})`
          : formatRoleUpper(formatRoleName(role.name));

        return { value: role.id, label: labelText, level: role.level };
      }));

      if (gdRes?.data) {
        const gendersData = Array.isArray(gdRes.data) ? gdRes.data : gdRes.data?.data || gdRes.data?.object || [];
        setGenders(gendersData.map((g: any) => ({ value: g.id, label: g.name })));
      }
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  }, []);

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const payload: Record<string, unknown> = {
        pageNumber: page,
        countPerPage: pageSize,
        sortBy: 'id',
        sortDirection: 'ASC',
        search: searchQuery.trim() || null,
      };

      // if (selectedMonth) {
      //   payload.month = Number(selectedMonth);
      // }

      // if (startDate) {
      //   payload.startDate = `${startDate}T00:00:00`;
      // }

      // if (endDate) {
      //   payload.endDate = `${endDate}T23:59:59`;
      // }

      if (roleFilter !== '') {
        payload.userRoleId = roleFilter;
      }

      if (verificationFilter !== '') {
        payload.verificationStatusId = verificationFilter;
      }

      if (genderFilter !== '') {
        payload.genderId = genderFilter;
      }

      if (isActiveFilter !== null) {
        payload.isActive = isActiveFilter;
      }

      if (emailVerifiedFilter !== null) {
        payload.emailVerified = emailVerifiedFilter;
      }

      if (hasMarketFilter !== null) {
        payload.hasMarket = hasMarketFilter;
      }

      if (isEmployeeFilter !== null) {
        payload.isEmployee = isEmployeeFilter;
      }

      // if (flagFilter) {
      //   payload.flagFilter = flagFilter;
      // }

      const response = await axiosInstance.post('/users/get-users', payload);

      const { users: backendUsers, total, totalPages: respTotalPages } = extractUsersAndTotal(response.data);

      const tableUsers = backendUsers.map((user) => mapBackendUserToTableUser(user));

      setUsers(tableUsers);
      setTotalUsers(total ?? tableUsers.length);

      // Resolve total pages using server-provided value when available,
      // otherwise infer using total count or heuristics similar to Order Analytics.
      if (respTotalPages != null && Number.isFinite(respTotalPages)) {
        setTotalPages(respTotalPages);
      } else if (total != null && Number.isFinite(Number(total))) {
        setTotalPages(Math.max(1, Math.ceil((total as number) / pageSize)));
      } else {
        setTotalPages(tableUsers.length < pageSize ? Math.max(1, page + 1) : Math.max(1, page + 2));
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      setUsers([]);
      setTotalUsers(0);
      setError(err?.response?.data?.desc || err?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    searchQuery,
    roleFilter,
    verificationFilter,
    genderFilter,
    isActiveFilter,
    emailVerifiedFilter,
    hasMarketFilter,
    isEmployeeFilter,
    flagFilter,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadUsers();
    }, 350);

    return () => clearTimeout(timeout);
  }, [
    page,
    pageSize,
    searchQuery,
    roleFilter,
    verificationFilter,
    genderFilter,
    isActiveFilter,
    emailVerifiedFilter,
    hasMarketFilter,
    isEmployeeFilter,
    flagFilter,
    refreshTick,
    loadUsers,
  ]);

  const filterOptions = useMemo(() => {
    return {
      flags: [
        { value: 'flagged', label: 'Flagged Only' },
        { value: 'clean', label: 'No Flags' },
      ],
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (flagFilter === 'flagged') {
      return users.filter((user) => user.account !== 'Active' || user.flags.length > 0);
    }

    if (flagFilter === 'clean') {
      return users.filter((user) => user.account === 'Active' && user.flags.length === 0);
    }

    return users;
  }, [users, flagFilter]);

  const activeFilters = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];

    if (searchQuery) chips.push({ label: `Search: "${searchQuery}"`, onRemove: () => setSearchQuery('') });
    
    if (roleFilter !== '') {
      const roleLabel = roles.find(r => r.value === roleFilter)?.label || roleFilter;
      chips.push({ label: `Role: ${roleLabel}`, onRemove: () => setRoleFilter('') });
    }
    if (verificationFilter !== '') {
      const verLabel = verificationStatuses.find(v => v.value === verificationFilter)?.label || verificationFilter;
      chips.push({ label: `Verification: ${verLabel}`, onRemove: () => setVerificationFilter('') });
    }
    if (genderFilter !== '') {
      const genLabel = genders.find(g => g.value === genderFilter)?.label || genderFilter;
      chips.push({ label: `Gender: ${genLabel}`, onRemove: () => setGenderFilter('') });
    }

    if (isActiveFilter !== null) {
      chips.push({ label: `Active: ${isActiveFilter ? 'Yes' : 'No'}`, onRemove: () => setIsActiveFilter(null) });
    }
    if (emailVerifiedFilter !== null) {
      chips.push({ label: `Email Verified: ${emailVerifiedFilter ? 'Yes' : 'No'}`, onRemove: () => setEmailVerifiedFilter(null) });
    }
    if (hasMarketFilter !== null) {
      chips.push({ label: `Has Market: ${hasMarketFilter ? 'Yes' : 'No'}`, onRemove: () => setHasMarketFilter(null) });
    }
    if (isEmployeeFilter !== null) {
      chips.push({ label: `Is Employee: ${isEmployeeFilter ? 'Yes' : 'No'}`, onRemove: () => setIsEmployeeFilter(null) });
    }
    
    // if (flagFilter) {
    //   chips.push({
    //     label: `Flag: ${flagFilter === 'flagged' ? 'Flagged Only' : 'No Flags'}`,
    //     onRemove: () => setFlagFilter(''),
    //   });
    // }

    return chips;
  }, [
    searchQuery,
    roleFilter,
    verificationFilter,
    genderFilter,
    isActiveFilter,
    emailVerifiedFilter,
    hasMarketFilter,
    isEmployeeFilter,
    flagFilter,
    roles,
    verificationStatuses,
    genders
  ]);

  useEffect(() => {
    setPage(0);
  }, [
    searchQuery,
    roleFilter,
    verificationFilter,
    genderFilter,
    isActiveFilter,
    emailVerifiedFilter,
    hasMarketFilter,
    isEmployeeFilter,
    flagFilter,
    pageSize,
  ]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, totalPages) - 1));
  }, [totalPages]);

  const paginatedUsers = users;

  const showingRange = useMemo(() => {
    if (totalUsers === 0) {
      return { from: 0, to: 0 };
    }

    const from = page * pageSize + 1;
    const to = Math.min(totalUsers, (page + 1) * pageSize);
    return { from, to };
  }, [totalUsers, page, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setVerificationFilter('');
    setGenderFilter('');
    setIsActiveFilter(null);
    setEmailVerifiedFilter(null);
    setHasMarketFilter(null);
    setIsEmployeeFilter(null);
    setFlagFilter('');
  };

  const handleExportUsers = () => {
    if (filteredUsers.length === 0) return;

    const header = ['ID', 'Name', 'Email', 'Role', 'Verification', 'Account', 'Email Status', 'Flags'];
    const rows = filteredUsers.map((user) => [
      user.id,
      user.name,
      user.email,
      formatRoleUpper(user.role),
      user.verification,
      user.account,
      user.emailStatus,
      user.flags.join(' | '),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'admin-users.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAccountBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Suspended':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Inactive':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEmailBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Unverified':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailModalOpen(true);
  };

  const handleSendNotification = (userIds: string | string[]) => {
    if (!canUseNotifications) return;

    const ids = Array.isArray(userIds) ? userIds : [userIds];
    setNotificationUserIds(ids);
    setIsNotificationModalOpen(true);
  };

  const handleViewNotifications = (userId: string) => {
    if (!canUseNotifications) return;

    setViewNotificationsUserId(userId);
    setIsViewNotificationsModalOpen(true);
  };

  const handleViewBankDetails = (userId: string) => {
    setBankDetailsUserId(userId);
    setIsBankDetailsModalOpen(true);
  };

  const handleViewDiscounts = (user: UserData) => {
    navigate('/deliverYya-cloud-console/discounts', { state: { userId: user.id, userName: user.name } });
  };

  const handleViewVerifyDocuments = (user: UserData) => {
    setVerifyDocumentsUserId(user.id);
    setVerifyDocumentsUserLabel(`${user.name} (${user.email})`);
    setIsVerifyDocumentsModalOpen(true);
  };

  const handleDisableUser = async (userId: string) => {
    if (!canUpdateOrDeleteUsers) {
      Swal.fire('Action Not Allowed', 'You do not have access to update or delete users.', 'warning');
      return;
    }

    const parsedUserId = Number(userId);
    if (!Number.isFinite(parsedUserId) || parsedUserId < 1) {
      Swal.fire('Error!', 'Invalid user selected.', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Disable User?',
      text: 'This action will disable the user account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F59B0F',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Disable',
    });

    if (result.isConfirmed) {
      try {
        await updateUserRoleOrDelete({
          userId: parsedUserId,
          isActive: false,
        });
        Swal.fire('Success!', 'User disabled successfully.', 'success');
        setRefreshTick((prev) => prev + 1);
      } catch (err: any) {
        Swal.fire('Error!', err?.response?.data?.desc || 'Failed to disable user.', 'error');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!canUpdateOrDeleteUsers) {
      Swal.fire('Action Not Allowed', 'You do not have access to update or delete users.', 'warning');
      return;
    }

    const parsedUserId = Number(userId);
    if (!Number.isFinite(parsedUserId) || parsedUserId < 1) {
      Swal.fire('Error!', 'Invalid user selected.', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Delete User?',
      text: 'This action cannot be undone.',
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Delete',
    });

    if (result.isConfirmed) {
      try {
        await updateUserRoleOrDelete({
          userId: parsedUserId,
          isDeleted: true,
        });
        Swal.fire('Deleted!', 'User deleted successfully.', 'success');
        setRefreshTick((prev) => prev + 1);
      } catch (err: any) {
        Swal.fire('Error!', err?.response?.data?.desc || 'Failed to delete user.', 'error');
      }
    }
  };

  const handleForceDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    if (!canUpdateOrDeleteUsers) {
      Swal.fire('Action Not Allowed', 'You do not have access to update or delete users.', 'warning');
      return;
    }

    const parsedUserId = Number(userId);
    if (!Number.isFinite(parsedUserId) || parsedUserId < 1) {
      Swal.fire('Error!', 'Invalid user selected.', 'error');
      return;
    }

    try {
      const preview = (await previewForceDeleteUser(parsedUserId)).object!;

      let message = `<div class="text-left">`;

      if (preview.blockingReason) {
        message += `<p class="text-red-600 font-bold mb-4"><strong>⚠️ Warning:</strong> ${preview.blockingReason}</p>`;
      }

      if (Object.keys(preview.relatedRecordCounts).length > 0) {
        message += `<p class="font-bold mb-2">Related Records Found:</p>`;
        message += `<div class="bg-gray-50 p-3 rounded-lg mb-4">`;
        message += `<table class="w-full text-sm">`;
        message += `<thead><tr class="border-b"><th class="text-left py-1">Table</th><th class="text-right py-1">Count</th></tr></thead>`;
        message += `<tbody>`;
        for (const [table, count] of Object.entries(preview.relatedRecordCounts)) {
          message += `<tr class="border-b last:border-0"><td class="py-1">${table}</td><td class="text-right py-1 font-semibold">${count}</td></tr>`;
        }
        message += `</tbody></table></div>`;
      }

      if (preview.recordsToBeDeleted.length > 0) {
        message += `<p class="font-bold mb-2">Records That Will Be Deleted:</p>`;
        message += `<ul class="list-disc list-inside bg-red-50 p-3 rounded-lg text-sm">`;
        preview.recordsToBeDeleted.forEach((record) => {
          message += `<li class="mb-1">${record}</li>`;
        });
        message += `</ul>`;
      }

      if (preview.recordsToBeDetached.length > 0) {
        message += `<p class="font-bold mb-2 mt-4">Records That Will Be Detached:</p>`;
        message += `<ul class="list-disc list-inside bg-yellow-50 p-3 rounded-lg text-sm">`;
        preview.recordsToBeDetached.forEach((record) => {
          message += `<li class="mb-1">${record}</li>`;
        });
        message += `</ul>`;
      }

      message += `</div>`;

      const result = await Swal.fire({
        title: 'Confirm Force Delete',
        html: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, permanently delete!',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
      });

      if (result.isConfirmed) {
        await forceDeleteUser({ entityId: parsedUserId, confirmed: true });
        Swal.fire({
          title: 'Deleted!',
          text: 'User has been permanently deleted.',
          icon: 'success',
        });
        setRefreshTick((prev) => prev + 1);
      }
    } catch (error: any) {
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.desc || error.message || 'Failed to delete',
        icon: 'error',
      });
    }
  };

  const handleSendResetPasswordEmail = async (userId: string) => {
    try {
      await axiosInstance.post(`/users/${userId}/send-reset-password-email`);
      Swal.fire('Success!', 'Reset password email sent.', 'success');
    } catch (err: any) {
      Swal.fire('Error!', err?.response?.data?.desc || 'Failed to send email.', 'error');
    }
  };

  const handleSendVerificationEmail = async (userId: string) => {
    try {
      await axiosInstance.post(`/users/${userId}/send-verification-email`);
      Swal.fire('Success!', 'Verification email sent.', 'success');
    } catch (err: any) {
      Swal.fire('Error!', err?.response?.data?.desc || 'Failed to send email.', 'error');
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAllOnPage = () => {
    const pageUserIds = paginatedUsers.map((user) => user.id);
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      const allSelected = pageUserIds.every((id) => newSet.has(id));

      if (allSelected) {
        pageUserIds.forEach((id) => newSet.delete(id));
      } else {
        pageUserIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  };

  const isAllPageSelected = useMemo(() => {
    if (paginatedUsers.length === 0) return false;
    return paginatedUsers.every((user) => selectedUsers.has(user.id));
  }, [paginatedUsers, selectedUsers]);

  const summary = useMemo(() => {
    const verifiedCount = filteredUsers.filter((user) => user.verification === 'Verified').length;
    const pendingCount = filteredUsers.filter((user) => user.verification === 'Pending').length;
    const flaggedCount = filteredUsers.filter((user) => user.account !== 'Active' || user.flags.length > 0).length;

    return {
      verifiedCount,
      pendingCount,
      flaggedCount,
    };
  }, [filteredUsers]);

  const selectedBankDetailsUser = useMemo(
    () => users.find((user) => user.id === bankDetailsUserId) ?? null,
    [users, bankDetailsUserId]
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12 space-y-6">
      <div>
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            User Management Analytics
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Monitor user verification, account health, and email status with smart filtering.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Users Loaded</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{users.length}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Verified</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{summary.verifiedCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{summary.pendingCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <ClockIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Flagged</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{summary.flaggedCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <XCircleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div> */}
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by user ID, name, email, role or status..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm md:text-base"
            />
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Month</label>
              <Select
                options={MONTH_OPTIONS}
                value={MONTH_OPTIONS.find((month) => month.value === selectedMonth) ?? null}
                onChange={(option) => {
                  const nextMonth = option?.value ?? '';
                  setSelectedMonth(nextMonth);
                  if (nextMonth !== '') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                isClearable
                placeholder="All months"
                styles={customSelectFieldStyles}
              />
            </div>

            {isAllMonthsSelected && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">From date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    max={endDate || undefined}
                    aria-label="From date"
                    title="From date"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">To date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    min={startDate || undefined}
                    aria-label="To date"
                    title="To date"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F]"
                  />
                </div>
              </>
            )}
          </div> */}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setRefreshTick((prev) => prev + 1)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleExportUsers}
              disabled={filteredUsers.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
              title="Download currently filtered users as CSV"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Export CSV
            </button>

            <button
              onClick={() => setShowAdvanced((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${showAdvanced
                  ? 'border-[#F59B0F] bg-orange-50 text-[#D17F0A]'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:border-[#F59B0F]'
                }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Advanced Filters
              {showAdvanced ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Reset Filters
            </button>
          </div>

          {showAdvanced && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Advanced Filters</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">Role</label>
                  <Select
                    options={roles}
                    value={roles.find((item) => item.value === roleFilter) ?? null}
                    onChange={(option) => setFromOptionNum(setRoleFilter, option)}
                    isClearable
                    placeholder="All roles"
                    styles={customSelectFieldStyles}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">Verification Status</label>
                  <Select
                    options={verificationStatuses}
                    value={verificationStatuses.find((item) => item.value === verificationFilter) ?? null}
                    onChange={(option) => setFromOptionNum(setVerificationFilter, option)}
                    isClearable
                    placeholder="All statuses"
                    styles={customSelectFieldStyles}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">Gender</label>
                  <Select
                    options={genders}
                    value={genders.find((item) => item.value === genderFilter) ?? null}
                    onChange={(option) => setFromOptionNum(setGenderFilter, option)}
                    isClearable
                    placeholder="All genders"
                    styles={customSelectFieldStyles}
                  />
                </div>

                {/* <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">Flag State</label>
                  <Select
                    options={filterOptions.flags}
                    value={filterOptions.flags.find((item) => item.value === flagFilter) ?? null}
                    onChange={(option) => {
                      setFlagFilter(option?.value ? String(option.value) : '');
                    }}
                    isClearable
                    placeholder="All users"
                    styles={customSelectFieldStyles}
                  />
                </div> */}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-gray-50 pt-4">
                <BooleanFilterGroup label="Account Active" value={isActiveFilter} onChange={setIsActiveFilter} />
                <BooleanFilterGroup label="Email Verified" value={emailVerifiedFilter} onChange={setEmailVerifiedFilter} />
                <BooleanFilterGroup label="Has Market" value={hasMarketFilter} onChange={setHasMarketFilter} />
                <BooleanFilterGroup label="Is Employee" value={isEmployeeFilter} onChange={setIsEmployeeFilter} />
              </div>
            </div>
          )}

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
                  <span className="font-bold text-gray-900">{totalUsers}</span> users
                </>
              )}
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="flex items-center gap-2 min-w-40">
                <span className="text-sm text-gray-600 font-medium">Per page:</span>
                <div className="flex-1">
                  <Select
                    options={PAGE_SIZE_OPTIONS}
                    value={PAGE_SIZE_OPTIONS.find((item) => Number(item.value) === pageSize) ?? PAGE_SIZE_OPTIONS[0]}
                    onChange={(option) => setPageSize(Number(option?.value ?? '10'))}
                    styles={customSelectFieldStyles}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0 || isLoading}
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
                  disabled={page >= totalPages - 1 || isLoading}
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
          <p className="font-bold">Error loading users</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {selectedUsers.size > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-200 bg-linear-to-r from-orange-50 to-orange-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm">
              <span className="font-bold text-gray-900">{selectedUsers.size}</span>
              <span className="text-gray-600"> user{selectedUsers.size > 1 ? 's' : ''} selected</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 transition-all"
              >
                Clear Selection
              </button>
              {canUseNotifications && (
                <button
                  onClick={() => handleSendNotification(Array.from(selectedUsers))}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  Send Notification
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleSelectAllOnPage}
                    className="w-5 h-5 rounded border-2 border-gray-300 cursor-pointer accent-[#F59B0F]"
                    title="Select all on this page"
                  />
                </th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Verification</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Account</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Email</th>
                {/* <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Flags</th> */}
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                      <p className="text-gray-600">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-orange-50/40 transition-colors">
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-5 h-5 rounded border-2 border-gray-300 cursor-pointer accent-[#F59B0F]"
                        aria-label={`Select user ${user.name}`}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-800">{formatRoleUpper(user.role)}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getVerificationBadge(
                          user.verification
                        )}`}
                      >
                        {user.verification}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getAccountBadge(
                          user.account
                        )}`}
                      >
                        {user.account}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getEmailBadge(
                          user.emailStatus
                        )}`}
                      >
                        {user.emailStatus}
                      </span>
                    </td>
                    {/* <td className="py-4 px-4">
                      {user.flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {user.flags.map((flag) => (
                            <span
                              key={flag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">No flags</span>
                      )}
                    </td> */}
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#F59B0F] transition-all"
                          title="View User"
                        >
                          <EyeIcon className="w-5 h-5 text-gray-700" />
                        </button>
                        {canUseNotifications && (
                          <button
                            onClick={() => handleSendNotification(user.id)}
                            className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-500 transition-all"
                            title="Send Notification"
                          >
                            <EnvelopeIcon className="w-5 h-5 text-gray-700" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewBankDetails(user.id)}
                          className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-500 transition-all"
                          title="View Bank Details"
                        >
                          <BanknotesIcon className="w-5 h-5 text-gray-700" />
                        </button>
                        {/* <button
                          onClick={() => handleViewNotifications(user.id)}
                          className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-500 transition-all"
                          title="View Notifications"
                        >
                          <BellIcon className="w-5 h-5 text-gray-700" />
                        </button> */}
                        <Menu as="div" className="relative">
                          <MenuButton className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#F59B0F] transition-all">
                            <EllipsisVerticalIcon className="w-5 h-5 text-gray-700" />
                          </MenuButton>
                          <MenuItems className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:opacity-0 overflow-hidden">
                            <div className="p-1">
                              {canUseNotifications && (
                                <MenuItem>
                                  <button
                                    onClick={() => handleViewNotifications(user.id)}
                                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  >
                                    <BellIcon className="w-4 h-4" />
                                    View Notifications
                                  </button>
                                </MenuItem>
                              )}
                              <MenuItem>
                                <button
                                  onClick={() => handleViewVerifyDocuments(user)}
                                  className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                >
                                  <DocumentCheckIcon className="w-4 h-4" />
                                  Verify Documents
                                </button>
                              </MenuItem>
                              <MenuItem>
                                <button
                                  onClick={() => handleViewBankDetails(user.id)}
                                  className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                >
                                  <BanknotesIcon className="w-4 h-4" />
                                  View Bank Details
                                </button>
                              </MenuItem>
                              <MenuItem>
                                <button
                                  onClick={() => handleViewDiscounts(user)}
                                  className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                >
                                  <TagIcon className="w-4 h-4" />
                                  View Discounts
                                </button>
                              </MenuItem>

                              {canUpdateOrDeleteUsers && (
                                <>
                                  <MenuItem>
                                    <button
                                      onClick={() => handleDisableUser(user.id)}
                                      disabled={user.account !== 'Active'}
                                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <NoSymbolIcon className="w-4 h-4" />
                                      Disable User
                                    </button>
                                  </MenuItem>
                                  <MenuItem>
                                    <button
                                      onClick={() => handleForceDeleteUser(user.id, user.name, user.email)}
                                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                      Delete User
                                    </button>
                                  </MenuItem>
                                </>
                              )}

                            </div>
                          </MenuItems>
                        </Menu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!isLoading && !error && paginatedUsers.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                  <UserGroupIcon className="w-10 h-10 text-[#F59B0F]" />
                </div>
                <p className="text-xl font-black text-gray-900 mb-2">No users found</p>
                <p className="text-gray-600 mb-6">Try adjusting the search or filter selection</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <UserDetailModal
        isOpen={isDetailModalOpen}
        userId={selectedUserId}
        onClose={() => setIsDetailModalOpen(false)}
        onRefreshTable={() => setRefreshTick((prev) => prev + 1)}
        onSendNotificationClick={(userId) => {
          setIsDetailModalOpen(false);
          handleSendNotification(userId);
        }}
        onViewNotificationsClick={(userId) => {
          setIsDetailModalOpen(false);
          handleViewNotifications(userId);
        }}
      />

      <UserBankDetailsModal
        isOpen={isBankDetailsModalOpen}
        userId={bankDetailsUserId}
        userName={selectedBankDetailsUser ? `${selectedBankDetailsUser.name} (${selectedBankDetailsUser.email})` : undefined}
        onClose={() => setIsBankDetailsModalOpen(false)}
      />

      {canUseNotifications && (
        <SendNotificationModal
          isOpen={isNotificationModalOpen}
          userIds={notificationUserIds}
          onClose={() => setIsNotificationModalOpen(false)}
        />
      )}

      <VerifyDocumentsModal
        isOpen={isVerifyDocumentsModalOpen}
        userId={verifyDocumentsUserId}
        userLabel={verifyDocumentsUserLabel}
        onClose={() => setIsVerifyDocumentsModalOpen(false)}
      />

      {canUseNotifications && (
        <ViewUserNotificationsModal
          isOpen={isViewNotificationsModalOpen}
          userId={viewNotificationsUserId}
          userEmail={users.find(u => String(u.id) === String(viewNotificationsUserId))?.email || 'Unknown Email'}
          onClose={() => setIsViewNotificationsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default AdminUserStatusTable;

