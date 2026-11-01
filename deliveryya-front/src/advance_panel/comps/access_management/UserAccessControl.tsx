import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select, { type SingleValue } from 'react-select';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  EyeIcon,
  LockClosedIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import axiosInstance from '../../../util/AxiosUtil';
import {
  fetchAccessLevels,
  fetchAccessTypes,
  getAllAccesses,
  getGrantedAccessesByUserId,
  grantAccessToUser,
} from '../../../util/AccessApi';
import { swalAlert } from '../../../util/SwalUtil';
import { UserSearch } from '../career/UserSearch';
import type { UserSearchResult } from '../career/types';
import type { AccessRecord } from '../../../types/AccessModels';
import {
  allAccessLevelOption,
  allAccessTypeOption,
  getAccessSelectStyles,
  getPageSizeOption,
  toPageSizeOptions,
  type SelectOption,
} from './selectHelpers';

interface User {
  id: string;
  name: string;
  email: string;
  accessCount?: number;
}

interface BackendGrantedUser {
  id?: string | number;
  userId?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface BackendUser {
  id?: string | number;
  userId?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

type ExpiryFilter = 'all' | 'active' | 'expired';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_SELECT_OPTIONS = toPageSizeOptions(PAGE_SIZE_OPTIONS);

const EXPIRY_FILTER_OPTIONS: SelectOption<ExpiryFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

const normalizeGrantedUsers = (payload: unknown): User[] => {
  const data = payload as any;
  let items: BackendGrantedUser[] = [];

  if (Array.isArray(data)) items = data;
  else if (Array.isArray(data?.object?.items)) items = data.object.items;
  else if (Array.isArray(data?.object)) items = data.object;
  else if (Array.isArray(data?.data?.object?.items)) items = data.data.object.items;
  else if (Array.isArray(data?.data?.object)) items = data.data.object;
  else if (Array.isArray(data?.data)) items = data.data;

  return items.map((item, index) => {
    const id = String(item.id ?? item.userId ?? `user-${index}`);
    const fallbackName = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim();
    const name = fallbackName || item.email || `User ${index + 1}`;

    return {
      id,
      name,
      email: item.email ?? '-',
      accessCount: undefined,
    };
  });
};

const extractTotalCount = (payload: unknown, fallbackCount: number): number => {
  const data = payload as any;
  const candidates = [
    data?.object?.totalCount,
    data?.object?.totalItems,
    data?.object?.count,
    data?.data?.object?.totalCount,
    data?.data?.object?.totalItems,
    data?.data?.object?.count,
    data?.totalCount,
    data?.totalItems,
    data?.count,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (!Number.isNaN(value) && value >= 0) return value;
  }

  return fallbackCount;
};

const normalizeUser = (value: unknown, fallbackId: string): User => {
  const item = (value ?? {}) as BackendUser;
  const id = String(item.id ?? item.userId ?? fallbackId);
  const fullName = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim();

  return {
    id,
    name: fullName || item.email || `User ${id}`,
    email: item.email ?? '-',
  };
};

const toApiDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const getDefaultExpDate = (): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  date.setHours(23, 59, 59, 0);
  return date;
};

const getNeverExpiresDate = (): Date => new Date(2099, 11, 31, 23, 59, 59, 0);

const toDatetimeLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Never expires';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isExpired = (value?: string | null): boolean => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  pageSize,
  totalCount,
  isLoading,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 text-sm text-gray-600">
        Rows
        <div className="w-24">
          <Select<SelectOption<number>, false>
            value={getPageSizeOption(PAGE_SIZE_SELECT_OPTIONS, pageSize)}
            onChange={(option: SingleValue<SelectOption<number>>) => {
              if (option) onPageSizeChange(option.value);
            }}
            options={PAGE_SIZE_SELECT_OPTIONS}
            styles={getAccessSelectStyles<SelectOption<number>>()}
            isDisabled={isLoading}
            isSearchable={false}
            className="react-select-container"
            classNamePrefix="react-select"
          />
        </div>
      </label>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1 || isLoading}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-700">Page {Math.min(page, totalPages)} of {totalPages}</span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages || isLoading}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

interface GrantAccessModalProps {
  user: User;
  access: AccessRecord;
  currentExpiry?: string | null;
  isExistingGrant: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const GrantAccessModal: React.FC<GrantAccessModalProps> = ({
  user,
  access,
  currentExpiry,
  isExistingGrant,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [expiryMode, setExpiryMode] = useState<'date' | 'never'>('date');
  const [expiryDate, setExpiryDate] = useState(toDatetimeLocalString(getDefaultExpDate()));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (currentExpiry) {
      const parsed = new Date(currentExpiry);
      setExpiryMode(Number.isNaN(parsed.getTime()) ? 'date' : 'date');
      setExpiryDate(Number.isNaN(parsed.getTime()) ? toDatetimeLocalString(getDefaultExpDate()) : toDatetimeLocalString(parsed));
    } else if (isExistingGrant) {
      setExpiryMode('never');
      setExpiryDate(toDatetimeLocalString(getDefaultExpDate()));
    } else {
      setExpiryMode('date');
      setExpiryDate(toDatetimeLocalString(getDefaultExpDate()));
    }
  }, [currentExpiry, isExistingGrant, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const parsedUserId = Number(user.id);
    if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
      swalAlert('Invalid User ID', 'Unable to save changes due to invalid user id.', 'error');
      return;
    }

    let exp: string | null = null;
    if (expiryMode === 'date') {
      const parsedDate = new Date(expiryDate);
      if (Number.isNaN(parsedDate.getTime())) {
        swalAlert('Invalid expiry date', 'Please select a valid expiry date.', 'warning');
        return;
      }
      exp = toApiDateTime(parsedDate);
    } else {
      exp = toApiDateTime(getNeverExpiresDate());
    }

    try {
      setIsSaving(true);
      await grantAccessToUser({
        usersId: parsedUserId,
        accessIds: [access.id],
        grantAccess: true,
        exp,
      });
      swalAlert('Success', 'User access saved successfully.', 'success');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save user access:', error);
      swalAlert('Failed to save access', 'Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between rounded-t-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-4 text-white">
          <div>
            <h3 className="text-lg font-semibold">Set User Access</h3>
            <p className="mt-1 text-sm text-white/90">{user.name} / {access.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/20">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm font-semibold text-gray-900">{access.name}</div>
            {access.desc && <div className="mt-1 text-sm text-gray-600">{access.desc}</div>}
          </div>

          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-amber-50">
              <input
                type="radio"
                checked={expiryMode === 'date'}
                onChange={() => setExpiryMode('date')}
                className="text-[#F59B0F] focus:ring-[#F59B0F]"
              />
              <span className="text-sm font-medium text-gray-800">Use expiry date</span>
            </label>

            {expiryMode === 'date' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                />
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-amber-50">
              <input
                type="radio"
                checked={expiryMode === 'never'}
                onChange={() => setExpiryMode('never')}
                className="text-[#F59B0F] focus:ring-[#F59B0F]"
              />
              <span className="text-sm font-medium text-gray-800">Never expires</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Access'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserAccessList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');
  const [selectedSearchUser, setSelectedSearchUser] = useState<UserSearchResult | null>(null);

  const fetchUserAccessCount = async (userId: string): Promise<number> => {
    const parsedUserId = Number(userId);
    if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) return 0;

    try {
      const details = await getGrantedAccessesByUserId(parsedUserId);
      return details.length;
    } catch (err) {
      console.error('Failed to fetch user access count:', err);
      return 0;
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await axiosInstance.post('/access/get-all-access-granted-users', {
        pageNumber: page - 1,
        countPerPage: pageSize,
        accessId: null,
        expired: expiryFilter === 'expired' ? true : null,
        notExpired: expiryFilter === 'active' ? true : null,
        expiredFrom: null,
        expiredAt: null,
      });

      const normalizedUsers = normalizeGrantedUsers(response.data);
      setUsers(normalizedUsers);
      setTotalCount(extractTotalCount(response.data, normalizedUsers.length));

      const results = await Promise.allSettled(normalizedUsers.map((user) => fetchUserAccessCount(user.id)));
      const countsMap = new Map<string, number>();
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') countsMap.set(normalizedUsers[index].id, result.value);
      });
      setUsers((prev) => prev.map((user) => ({
        ...user,
        accessCount: countsMap.get(user.id) ?? user.accessCount ?? 0,
      })));
    } catch (error) {
      console.error('Failed to fetch users with granted access:', error);
      setUsers([]);
      setTotalCount(0);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, [expiryFilter, page, pageSize]);

  const openSelectedUser = () => {
    if (!selectedSearchUser) return;
    navigate(`/deliverYya-cloud-console/access-management/users/${selectedSearchUser.id}`);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md">
      <div className="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-4">
        <div className="flex items-center gap-3">
          <LockClosedIcon className="h-6 w-6 text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">User Access Control</h2>
            <p className="mt-1 text-sm text-white/90">Open one user to grant or update expiring access records.</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <UserSearch
            onUserSelected={(user) => setSelectedSearchUser(user)}
            onClearSelection={() => setSelectedSearchUser(null)}
            selectedUser={selectedSearchUser}
            title="Search User"
            description="Find a user by name, email, or NIC."
            placeholder="Search users..."
          />

          {selectedSearchUser && (
            <button
              type="button"
              onClick={openSelectedUser}
              className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 text-sm font-semibold text-white hover:shadow-md"
            >
              <EyeIcon className="h-4 w-4" />
              Open User Access
            </button>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="inline-flex w-fit items-center gap-2 text-sm text-gray-600">
            Expiry
            <div className="w-40">
              <Select<SelectOption<ExpiryFilter>, false>
                value={EXPIRY_FILTER_OPTIONS.find((option) => option.value === expiryFilter) ?? EXPIRY_FILTER_OPTIONS[0]}
                onChange={(option: SingleValue<SelectOption<ExpiryFilter>>) => {
                  setExpiryFilter(option?.value ?? 'all');
                  setPage(1);
                }}
                options={EXPIRY_FILTER_OPTIONS}
                styles={getAccessSelectStyles<SelectOption<ExpiryFilter>>()}
                isDisabled={isLoadingUsers}
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
          </label>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            isLoading={isLoadingUsers}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Email</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Access Count</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoadingUsers && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-[#AC6C2A]">Loading users...</td>
                </tr>
              )}

              {!isLoadingUsers && users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No users with granted access found.</td>
                </tr>
              )}

              {!isLoadingUsers && users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] font-semibold text-white">
                        {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">
                      {user.accessCount ?? 0} access{(user.accessCount ?? 0) !== 1 ? 'es' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => navigate(`/deliverYya-cloud-console/access-management/users/${user.id}`)}
                      className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 text-sm font-semibold text-white hover:shadow-md"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Manage Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-gray-600">Showing {users.length} of {totalCount} users with granted access</p>
      </div>
    </div>
  );
};

const UserAccessRoute: React.FC = () => {
  const navigate = useNavigate();
  const { userId = '' } = useParams();
  const numericUserId = Number(userId);

  const [user, setUser] = useState<User | null>(null);
  const [accesses, setAccesses] = useState<AccessRecord[]>([]);
  const [grantedAccesses, setGrantedAccesses] = useState<AccessRecord[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<AccessRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingAccesses, setIsLoadingAccesses] = useState(true);
  const [isLoadingGranted, setIsLoadingGranted] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [isExpiringAccessId, setIsExpiringAccessId] = useState<number | null>(null);
  const [accessTypeOptions, setAccessTypeOptions] = useState<SelectOption<number>[]>([allAccessTypeOption]);
  const [selectedAccessType, setSelectedAccessType] = useState<SelectOption<number>>(allAccessTypeOption);
  const [accessLevelOptions, setAccessLevelOptions] = useState<SelectOption<number>[]>([allAccessLevelOption]);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<SelectOption<number>>(allAccessLevelOption);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const loadUser = async () => {
      if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
        setIsLoadingUser(false);
        return;
      }

      try {
        setIsLoadingUser(true);
        const response = await axiosInstance.get(`/users/admin/get-user-by-id?id=${encodeURIComponent(userId)}`);
        setUser(normalizeUser(response.data?.object ?? response.data?.data?.object, userId));
      } catch (error) {
        console.error('Failed to fetch user details:', error);
        setUser({ id: userId, name: `User ${userId}`, email: '-' });
      } finally {
        setIsLoadingUser(false);
      }
    };

    void loadUser();
  }, [numericUserId, userId]);

  useEffect(() => {
    const loadAccessFilterOptions = async () => {
      try {
        const [loadedTypes, loadedLevels] = await Promise.all([
          fetchAccessTypes(),
          fetchAccessLevels(),
        ]);
        setAccessTypeOptions([
          allAccessTypeOption,
          ...loadedTypes
            .map((type) => ({
              value: Number(type.id),
              label: type.name,
            }))
            .filter((option) => Number.isFinite(option.value) && option.value > 0),
        ]);
        setAccessLevelOptions([
          allAccessLevelOption,
          ...loadedLevels
            .map((level) => ({
              value: Number(level.id),
              label: level.name,
            }))
            .filter((option) => Number.isFinite(option.value) && option.value > 0),
        ]);
      } catch (error) {
        console.error('Failed to load access filter options:', error);
        setAccessTypeOptions([allAccessTypeOption]);
        setAccessLevelOptions([allAccessLevelOption]);
      }
    };

    void loadAccessFilterOptions();
  }, []);

  useEffect(() => {
    const loadAccesses = async () => {
      try {
        setIsLoadingAccesses(true);
        const result = await getAllAccesses({
          pageNumber: page - 1,
          countPerPage: pageSize,
          includeLinkedApis: true,
          includeGrantMeta: false,
          accessTypeId: selectedAccessType.value > 0 ? selectedAccessType.value : null,
          accessLevelId: selectedAccessLevel.value > 0 ? selectedAccessLevel.value : null,
          search: debouncedSearchTerm || null,
        });
        setAccesses(result.items);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error('Failed to fetch accesses:', error);
        setAccesses([]);
        setTotalCount(0);
      } finally {
        setIsLoadingAccesses(false);
      }
    };

    void loadAccesses();
  }, [debouncedSearchTerm, page, pageSize, selectedAccessLevel, selectedAccessType]);

  useEffect(() => {
    const loadGrantedAccesses = async () => {
      if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
        setGrantedAccesses([]);
        setIsLoadingGranted(false);
        return;
      }

      try {
        setIsLoadingGranted(true);
        const details = await getGrantedAccessesByUserId(numericUserId);
        setGrantedAccesses(details);
      } catch (error) {
        console.error('Failed to fetch granted user accesses:', error);
        setGrantedAccesses([]);
      } finally {
        setIsLoadingGranted(false);
      }
    };

    void loadGrantedAccesses();
  }, [numericUserId, reloadKey]);

  const grantedByAccessId = useMemo(() => {
    const map = new Map<number, AccessRecord>();
    grantedAccesses.forEach((access) => map.set(access.id, access));
    return map;
  }, [grantedAccesses]);

  const handleExpireNow = async (access: AccessRecord) => {
    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
      swalAlert('Invalid User ID', 'Unable to expire access due to invalid user id.', 'error');
      return;
    }

    try {
      setIsExpiringAccessId(access.id);
      await grantAccessToUser({
        usersId: numericUserId,
        accessIds: [access.id],
        grantAccess: false,
      });
      swalAlert('Success', 'Access expiry updated.', 'success');
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to expire user access:', error);
      swalAlert('Failed to expire access', 'Please try again.', 'error');
    } finally {
      setIsExpiringAccessId(null);
    }
  };

  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Invalid user route. Please go back and select a user again.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md">
      <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/deliverYya-cloud-console/access-management/users')}
            className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50"
            aria-label="Back to users"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="rounded-xl bg-amber-50 p-2 text-[#AC6C2A] ring-1 ring-amber-200">
            <LockClosedIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isLoadingUser ? 'Loading user...' : user?.name ?? `User ${userId}`}
            </h2>
            <p className="text-sm text-gray-500">{user?.email ?? '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-[#8A541D]">
          <ClockIcon className="h-4 w-4" />
          {grantedAccesses.length} direct access{grantedAccesses.length !== 1 ? 'es' : ''}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(190px,240px)_minmax(190px,240px)] xl:max-w-5xl">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search accesses..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
            />
            <Select<SelectOption<number>, false>
              value={selectedAccessType}
              onChange={(option: SingleValue<SelectOption<number>>) => {
                setSelectedAccessType(option ?? allAccessTypeOption);
                setPage(1);
              }}
              options={accessTypeOptions}
              styles={getAccessSelectStyles<SelectOption<number>>()}
              placeholder="Filter by access type"
              className="react-select-container"
              classNamePrefix="react-select"
            />
            <Select<SelectOption<number>, false>
              value={selectedAccessLevel}
              onChange={(option: SingleValue<SelectOption<number>>) => {
                setSelectedAccessLevel(option ?? allAccessLevelOption);
                setPage(1);
              }}
              options={accessLevelOptions}
              styles={getAccessSelectStyles<SelectOption<number>>()}
              placeholder="Filter by access level"
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            isLoading={isLoadingAccesses}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Access</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">API Scope</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Expiry</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {(isLoadingAccesses || isLoadingGranted) && (
                <tr>
                  <td colSpan={5} className="px-6 py-5 text-sm text-[#AC6C2A]">Loading user access details...</td>
                </tr>
              )}

              {!isLoadingAccesses && !isLoadingGranted && accesses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-5 text-sm text-gray-500">No accesses found.</td>
                </tr>
              )}

              {!isLoadingAccesses && !isLoadingGranted && accesses.map((access) => {
                const granted = grantedByAccessId.get(access.id);
                const expired = isExpired(granted?.exp);

                return (
                  <tr key={access.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{access.name}</div>
                      <div className="max-w-xl text-xs text-gray-500">{access.desc || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div>{access.accessType?.name ?? '-'}</div>
                      <div className="text-xs text-gray-400">{access.accessLevel?.name ?? '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {access.apis.length} linked API{access.apis.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4">
                      {granted ? (
                        <div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${expired ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                            {expired ? 'Expired' : 'Granted'}
                          </span>
                          <div className="mt-1 text-xs text-gray-500">{formatDateTime(granted.exp)}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not granted</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAccess(granted ?? access)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          {granted ? <CalendarDaysIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                          {granted ? 'Edit Expiry' : 'Grant'}
                        </button>
                        {granted && !expired && (
                          <button
                            type="button"
                            onClick={() => void handleExpireNow(access)}
                            disabled={isExpiringAccessId === access.id}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isExpiringAccessId === access.id ? 'Expiring...' : 'Expire Now'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Showing {accesses.length} of {totalCount} accesses. User grants are saved one access at a time so expiry dates stay independent.
        </p>
      </div>

      {user && selectedAccess && (
        <GrantAccessModal
          isOpen={selectedAccess !== null}
          user={user}
          access={selectedAccess}
          currentExpiry={grantedByAccessId.get(selectedAccess.id)?.exp}
          isExistingGrant={grantedByAccessId.has(selectedAccess.id)}
          onClose={() => setSelectedAccess(null)}
          onSaved={() => setReloadKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
};

const UserAccessControl: React.FC = () => {
  const { userId } = useParams();
  return userId ? <UserAccessRoute /> : <UserAccessList />;
};

export default UserAccessControl;
