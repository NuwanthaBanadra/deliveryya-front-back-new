import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select, { type SingleValue } from 'react-select';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import axiosInstance from '../../../util/AxiosUtil';
import {
  fetchAccessLevels,
  fetchAccessTypes,
  getAllAccesses,
  getGrantedAccessesByUserRoleId,
  grantAccessToUserRole,
} from '../../../util/AccessApi';
import { swalAlert } from '../../../util/SwalUtil';
import type { AccessRecord } from '../../../types/AccessModels';
import {
  allAccessLevelOption,
  allAccessTypeOption,
  getAccessSelectStyles,
  getPageSizeOption,
  toPageSizeOptions,
  type SelectOption,
} from './selectHelpers';

interface UserRole {
  id: string;
  name: string;
  accessTypes: string[];
}

interface BackendRole {
  id?: string | number;
  roleId?: string | number;
  name?: string;
  roleName?: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_SELECT_OPTIONS = toPageSizeOptions(PAGE_SIZE_OPTIONS);

const normalizeRoleList = (payload: unknown): BackendRole[] => {
  const data = payload as any;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.object?.items)) return data.object.items;
  if (Array.isArray(data?.object)) return data.object;
  if (Array.isArray(data?.data?.object?.items)) return data.data.object.items;
  if (Array.isArray(data?.data?.object)) return data.data.object;
  if (Array.isArray(data?.data)) return data.data;

  return [];
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

const getRoleName = (role: BackendRole, index: number): string => (
  String(role.name ?? role.roleName ?? `Role ${index + 1}`)
);

const getRoleId = (role: BackendRole, index: number): string => (
  String(role.id ?? role.roleId ?? role.name ?? role.roleName ?? `role-${index}`)
);

const isManageableRole = (role: BackendRole): boolean => {
  const roleName = String(role.name ?? role.roleName ?? '').trim().toLowerCase();
  return roleName !== 'supper admin' && roleName !== 'super admin';
};

const UserRolesList: React.FC = () => {
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingRoleAccessDetails, setIsLoadingRoleAccessDetails] = useState(true);

  const fetchRoleAccesses = async (roleId: string): Promise<string[]> => {
    const parsedRoleId = Number(roleId);
    if (!Number.isFinite(parsedRoleId) || parsedRoleId <= 0) return [];

    try {
      const accesses = await getGrantedAccessesByUserRoleId(parsedRoleId);
      return Array.from(new Set(accesses.map((item) => String(item.id))));
    } catch (error) {
      console.error(`Failed to fetch granted accesses for role ${roleId}:`, error);
      return [];
    }
  };

  const fetchRoles = async () => {
    try {
      setIsLoadingRoles(true);
      setIsLoadingRoleAccessDetails(true);

      const response = await axiosInstance.get('/users/get-user-roles');
      const mappedRoles: UserRole[] = normalizeRoleList(response.data)
        .filter(isManageableRole)
        .map((role, index) => ({
          id: getRoleId(role, index),
          name: getRoleName(role, index),
          accessTypes: [],
        }));

      const hydrated = await Promise.all(
        mappedRoles.map(async (role) => ({
          ...role,
          accessTypes: await fetchRoleAccesses(role.id),
        }))
      );

      setUserRoles(hydrated);
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      setUserRoles([]);
    } finally {
      setIsLoadingRoleAccessDetails(false);
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    void fetchRoles();
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md">
      <div className="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-4">
        <div className="flex items-center gap-3">
          <UserGroupIcon className="h-6 w-6 text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">User Roles and Permissions</h2>
            <p className="mt-1 text-sm text-white/90">Open a role to manage its access route.</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoadingRoles && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-[#AC6C2A]">
            Loading roles...
          </div>
        )}

        {isLoadingRoleAccessDetails && !isLoadingRoles && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-[#AC6C2A]">
            Loading role access details...
          </div>
        )}

        {!isLoadingRoles && userRoles.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            No roles found.
          </div>
        )}

        {userRoles.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Role Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Permissions</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {userRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold uppercase text-gray-900">{role.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {role.accessTypes.length} permission{role.accessTypes.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/deliverYya-cloud-console/access-management/roles/${role.id}`)}
                        className="rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 text-sm font-semibold text-white hover:shadow-md"
                      >
                        Manage Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const RoleAccessRoute: React.FC = () => {
  const navigate = useNavigate();
  const { roleId = '' } = useParams();
  const numericRoleId = Number(roleId);

  const [roleName, setRoleName] = useState(`Role ${roleId}`);
  const [accesses, setAccesses] = useState<AccessRecord[]>([]);
  const [selectedAccessIds, setSelectedAccessIds] = useState<string[]>([]);
  const [initialAccessIds, setInitialAccessIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingAccesses, setIsLoadingAccesses] = useState(true);
  const [isHydratingSelection, setIsHydratingSelection] = useState(true);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
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
    const loadRoleName = async () => {
      try {
        const response = await axiosInstance.get('/users/get-user-roles');
        const role = normalizeRoleList(response.data)
          .filter(isManageableRole)
          .find((item, index) => getRoleId(item, index) === roleId);

        if (role) setRoleName(getRoleName(role, 0));
      } catch (error) {
        console.error('Failed to fetch role name:', error);
      }
    };

    if (roleId) void loadRoleName();
  }, [roleId]);

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
        console.error('Failed to fetch access types:', error);
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
      if (!Number.isFinite(numericRoleId) || numericRoleId <= 0) {
        setSelectedAccessIds([]);
        setInitialAccessIds([]);
        setIsHydratingSelection(false);
        return;
      }

      try {
        setIsHydratingSelection(true);
        const grantedAccesses = await getGrantedAccessesByUserRoleId(numericRoleId);
        const ids = Array.from(new Set(grantedAccesses.map((item) => String(item.id))));
        setSelectedAccessIds(ids);
        setInitialAccessIds(ids);
      } catch (error) {
        console.error('Failed to fetch role granted accesses:', error);
        setSelectedAccessIds([]);
        setInitialAccessIds([]);
      } finally {
        setIsHydratingSelection(false);
      }
    };

    void loadGrantedAccesses();
  }, [numericRoleId]);

  const hasUnsavedChanges = useMemo(() => {
    const initial = new Set(initialAccessIds);
    const current = new Set(selectedAccessIds);
    if (initial.size !== current.size) return true;

    for (const id of initial) {
      if (!current.has(id)) return true;
    }

    return false;
  }, [initialAccessIds, selectedAccessIds]);

  const isAllSelected = useMemo(() => (
    totalCount > 0 && selectedAccessIds.length >= totalCount
  ), [selectedAccessIds.length, totalCount]);

  const handleAccessToggle = (accessId: string) => {
    setSelectedAccessIds((prev) => (
      prev.includes(accessId)
        ? prev.filter((id) => id !== accessId)
        : [...prev, accessId]
    ));
  };

  const fetchAllAccessIds = async (): Promise<string[]> => {
    const allIds: string[] = [];
    let currentPage = 0;
    let total = 0;

    do {
      const result = await getAllAccesses({
        pageNumber: currentPage,
        countPerPage: 100,
        includeLinkedApis: false,
        includeGrantMeta: false,
        accessTypeId: selectedAccessType.value > 0 ? selectedAccessType.value : null,
        accessLevelId: selectedAccessLevel.value > 0 ? selectedAccessLevel.value : null,
        search: debouncedSearchTerm || null,
      });
      allIds.push(...result.items.map((item) => String(item.id)));
      total = result.totalCount;
      currentPage += 1;
    } while (allIds.length < total);

    return Array.from(new Set(allIds));
  };

  const handleSelectAllToggle = async () => {
    if (isAllSelected) {
      setSelectedAccessIds([]);
      return;
    }

    try {
      setIsSelectingAll(true);
      const allIds = await fetchAllAccessIds();
      setSelectedAccessIds(allIds);
    } catch (error) {
      console.error('Failed to select all access types:', error);
      swalAlert('Failed to select all access types', 'Please try again.', 'error');
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!Number.isFinite(numericRoleId) || numericRoleId <= 0) {
      swalAlert('Invalid role id', 'Please go back and open the role again.', 'error');
      return;
    }

    try {
      setIsSavingChanges(true);
      const selected = new Set(selectedAccessIds);
      const initial = new Set(initialAccessIds);
      const addedAccessIds = selectedAccessIds
        .filter((id) => !initial.has(id))
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);
      const removedAccessIds = initialAccessIds
        .filter((id) => !selected.has(id))
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (addedAccessIds.length > 0) {
        await grantAccessToUserRole({
          userRoleId: numericRoleId,
          accessIds: addedAccessIds,
          grantAccess: true,
        });
      }

      if (removedAccessIds.length > 0) {
        await grantAccessToUserRole({
          userRoleId: numericRoleId,
          accessIds: removedAccessIds,
          grantAccess: false,
        });
      }

      setInitialAccessIds(selectedAccessIds);
      swalAlert('Success', 'Role access updated successfully.', 'success');
    } catch (error) {
      console.error('Failed to update role access:', error);
      swalAlert('Failed to update access', 'Please try again.', 'error');
    } finally {
      setIsSavingChanges(false);
    }
  };

  if (!Number.isFinite(numericRoleId) || numericRoleId <= 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Invalid role route. Please go back and select a role again.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md">
      <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/deliverYya-cloud-console/access-management/roles')}
            className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50"
            aria-label="Back to roles"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="rounded-xl bg-amber-50 p-2 text-[#AC6C2A] ring-1 ring-amber-200">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase text-gray-900">{roleName}</h2>
            <p className="text-sm text-gray-500">Manage role-level access grants on a full page.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={isSavingChanges || isHydratingSelection || isSelectingAll || !hasUnsavedChanges}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircleIcon className="h-4 w-4" />
          {isSavingChanges ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(190px,240px)_minmax(190px,240px)_auto] xl:max-w-6xl xl:items-center">
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
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={isAllSelected}
                disabled={isHydratingSelection || isSelectingAll || isSavingChanges}
                onChange={() => void handleSelectAllToggle()}
                className="h-4 w-4 rounded text-[#F59B0F] focus:ring-[#F59B0F] disabled:opacity-50"
              />
              Select all accesses
            </label>
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
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Granted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {(isLoadingAccesses || isHydratingSelection) && (
                <tr>
                  <td colSpan={4} className="px-6 py-5 text-sm text-[#AC6C2A]">Loading access permissions...</td>
                </tr>
              )}

              {!isLoadingAccesses && !isHydratingSelection && accesses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-5 text-sm text-gray-500">No accesses found.</td>
                </tr>
              )}

              {!isLoadingAccesses && !isHydratingSelection && accesses.map((access) => {
                const isGranted = selectedAccessIds.includes(String(access.id));

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
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isGranted}
                        disabled={isSavingChanges}
                        onChange={() => handleAccessToggle(String(access.id))}
                        className="h-5 w-5 cursor-pointer rounded text-[#F59B0F] focus:ring-[#F59B0F] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Showing {accesses.length} of {totalCount} accesses. {selectedAccessIds.length} selected for this role.
        </p>
      </div>
    </div>
  );
};

const UserRolesPermissions: React.FC = () => {
  const { roleId } = useParams();
  return roleId ? <RoleAccessRoute /> : <UserRolesList />;
};

export default UserRolesPermissions;
