import {
  BellIcon,
  BriefcaseIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  HomeIcon,
  LockClosedIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useEffect, useState, useMemo } from 'react';
import Select from 'react-select';
import axiosInstance, { baseURL } from '../../../util/AxiosUtil';
import { swalAlert, swalConfirm, swalErrorModal } from '../../../util/SwalUtil';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import {
  canManageRoleLevel,
  fetchUserRoles,
  formatRoleName,
  getAssignableRoles,
  getCurrentUserRoleAccess,
  getRoleLevel,
  type UserRoleDetail,
} from '../../../util/UserRoleLevelAccess';

interface UserDetailModalProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
  onRefreshTable: () => void;
  onSendNotificationClick: (userId: string) => void;
  onViewNotificationsClick?: (userId: string) => void;
}

interface UserData {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  joinedAt?: string;
  createdDate?: string;
  dob?: string;
  profileImg?: string;
  profileImage?: string;
  profilePic?: string;
  userRole?: {
    id: number;
    name: string;
    level?: number | null;
    roleLevel?: number | null;
  };
  nic?: string;
  isActive?: boolean;
  isEmployee?: boolean;
  hasMarket?: boolean;
  isDeleted?: boolean;
  gender?: { id: number; name: string };
  verificationStatus?: { id: number; name: string };
  updatedBy?: string | number | null;
}

interface AddressCity {
  id?: number;
  name?: string;
  district?: {
    id?: number;
    name?: string;
  } | null;
}

interface UserAddress {
  id: number;
  address?: string | null;
  tag?: string | null;
  permanent?: boolean | null;
  defaultAddress?: boolean | null;
  primaryMobile?: string | null;
  secondaryMobile?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  location?: string | null;
  city?: AddressCity | null;
  cities?: AddressCity | null;
}

interface SelectOption {
  value: number;
  label: string;
  level?: number | null;
}

interface UpdateUserRoleOrDeletePayload {
  userId: number;
  userRoleId?: number;
  verificationStatusId?: number;
  isActive?: boolean;
  isEmployee?: boolean;
  hasMarket?: boolean;
  isDeleted?: boolean;
}

const updateUserRoleOrDelete = (payload: UpdateUserRoleOrDeletePayload) =>
  axiosInstance.post('/users/update-user-role-or-delete', payload);

const getAddressItems = (value: unknown): UserAddress[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is UserAddress => typeof item === 'object' && item !== null);
  }

  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items)) {
    return (value as { items: unknown[] }).items.filter((item): item is UserAddress => typeof item === 'object' && item !== null);
  }

  return [];
};

const getAddressCity = (address: UserAddress): AddressCity | null => address.cities || address.city || null;

const getAddressPhones = (address: UserAddress) => [
  { label: 'Primary', value: address.primaryMobile || address.phone || '' },
  { label: 'Secondary', value: address.secondaryMobile || '' },
  { label: 'WhatsApp', value: address.whatsapp || '' },
].filter((item) => item.value.trim());

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return '';
  const cleanedUrl = url.replace(/\\/g, '/').trim();
  if (!cleanedUrl || cleanedUrl === 'null' || cleanedUrl === 'undefined') return '';
  if (cleanedUrl.startsWith('data:')) return cleanedUrl;
  if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;

  const normalizedPath = cleanedUrl.replace(/^\/+/, '');
  if (normalizedPath.startsWith('uploads/')) {
    return `${baseURL}/${normalizedPath}`;
  }

  return `${baseURL}/uploads/${normalizedPath}`;
};

const formatRoleUpper = (role?: string | null, fallback = 'NO ROLE') =>
  (role?.trim() || fallback).toUpperCase();

const getUserDisplayName = (user?: UserData | null) => {
  if (!user) return 'Unknown User';
  const fullName = [user.firstName, user.lastName].filter((part) => part?.trim()).join(' ').trim();
  return fullName || user.name?.trim() || user.email?.trim() || `User #${user.id}`;
};

type UserFlagKey = 'isEmployee' | 'hasMarket';

export function UserDetailModal({
  isOpen,
  userId,
  onClose,
  onRefreshTable,
  onSendNotificationClick,
  onViewNotificationsClick,
}: UserDetailModalProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [roleDetails, setRoleDetails] = useState<UserRoleDetail[]>([]);
  const [selectedRole, setSelectedRole] = useState<SelectOption | null>(null);
  const [verificationStatuses, setVerificationStatuses] = useState<SelectOption[]>([]);
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<SelectOption | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatedByUserEmail, setUpdatedByUserEmail] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const currentUserRoleAccess = useMemo(
    () => getCurrentUserRoleAccess(roleDetails),
    [roleDetails]
  );
  const canUpdateOrDeleteUsers = useMemo(
    () => hasAccess(FRONTEND_ACCESS_IDS.USER_ROLE_UPDATE_OR_DELETE),
    []
  );
  const canUseNotifications = useMemo(
    () => hasAccess(FRONTEND_ACCESS_IDS.NOTIFICATION_ACCESS),
    []
  );

  useEffect(() => {
    if (isOpen && userId) {
      loadUserData();
      loadUserAddresses();
      loadRoles();
      loadVerificationStatuses();
    } else {
      setUser(null);
      setRoleDetails([]);
      setRoles([]);
      setSelectedRole(null);
      setSelectedVerificationStatus(null);
      setUpdatedByUserEmail(null);
      setAddresses([]);
      setAddressError(null);
    }
  }, [isOpen, userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/users/admin/get-user-by-id?id=' + userId);
      
      const userData = res.data?.object || res.data;
      setUser(userData);

      // Fetch updatedBy user's email if updatedBy exists and is a number
      if (userData.updatedBy) {
        const updatedByValue = userData.updatedBy;
        const isNumber = typeof updatedByValue === 'number' || (typeof updatedByValue === 'string' && !isNaN(Number(updatedByValue)));
        
        if (isNumber) {
          try {
            const updaterRes = await axiosInstance.get('/users/admin/get-user-by-id?id=' + updatedByValue);
            const updaterData = updaterRes.data?.object || updaterRes.data;
            setUpdatedByUserEmail(updaterData?.email || null);
          } catch (err) {
            console.error('Error fetching updatedBy user data:', err);
            setUpdatedByUserEmail(null);
          }
        } else if (typeof updatedByValue === 'string') {
          // If it's already a string (email or name), use it directly
          setUpdatedByUserEmail(updatedByValue);
        }
      }
    } catch (err: any) {
      console.error('Error loading user details:', err);
      swalErrorModal('Error', err?.response?.data?.desc || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const loadUserAddresses = async () => {
    if (!userId) return;

    try {
      setIsLoadingAddresses(true);
      setAddressError(null);

      const response = await axiosInstance.get('/users/get-address-by-id-or-user-id', {
        params: { userId },
      });

      const addressPayload = response.data?.object ?? response.data?.exData ?? response.data;
      setAddresses(getAddressItems(addressPayload));
    } catch (err: any) {
      console.error('Error loading user addresses:', err);
      setAddresses([]);
      setAddressError(err?.response?.data?.desc || 'Failed to load user addresses');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const loadRoles = async () => {
    try {
      const userRoles = await fetchUserRoles();
      const roleAccess = getCurrentUserRoleAccess(userRoles);
      const assignableRoles = getAssignableRoles(userRoles, roleAccess);

      setRoleDetails(userRoles);
      setRoles(assignableRoles.map((role) => {
        const labelText = roleAccess.canManageAnyUserRole && role.level !== null
          ? `${formatRoleName(role.name)} (${role.level})`
          : formatRoleName(role.name);

        return { value: role.id, label: labelText, level: role.level };
      }));
      setSelectedRole((current) => (
        current && assignableRoles.some((role) => role.id === current.value)
          ? current
          : null
      ));
    } catch (err: any) {
      console.error('Error loading roles:', err);
      swalErrorModal('Error', err?.response?.data?.desc || 'Failed to load user roles');
    }
  };

  const loadVerificationStatuses = async () => {
    try {
      const res = await axiosInstance.get('/users/get-verification-statuses');
      const data = res.data?.object || res.data || [];
      if (Array.isArray(data)) {
        setVerificationStatuses(data.map((s: any) => ({ value: s.id, label: s.name })));
      }
    } catch (err: any) {
      console.error('Error loading verification statuses:', err);
      swalErrorModal('Error', err?.response?.data?.desc || 'Failed to load verification statuses');
    }
  };

  const viewedUserId = userId ? Number(userId) : null;
  const isViewingOwnUser = Boolean(
    viewedUserId &&
    currentUserRoleAccess.currentUserId &&
    viewedUserId === currentUserRoleAccess.currentUserId
  );
  const viewedUserRoleLevel = getRoleLevel(
    roleDetails,
    user?.userRole?.id,
    user?.userRole?.level ?? user?.userRole?.roleLevel
  );
  const canUpdateRoleOrVerification = Boolean(
    user &&
    canUpdateOrDeleteUsers &&
    !isViewingOwnUser &&
    canManageRoleLevel(currentUserRoleAccess, viewedUserRoleLevel)
  );
  const roleOrVerificationBlockReason = isViewingOwnUser
    ? 'You cannot update your own role or verification status.'
    : !canUpdateOrDeleteUsers
      ? 'You do not have access to update or delete users.'
      : currentUserRoleAccess.canManageAnyUserRole
        ? ''
        : viewedUserRoleLevel === null
          ? 'This user role level could not be verified from the latest role data.'
          : 'You can only update users whose role level is under your own role level.';

  const ensureCanUpdateRoleOrVerification = () => {
    if (canUpdateRoleOrVerification) {
      return true;
    }

    void swalAlert(
      'Action Not Allowed',
      roleOrVerificationBlockReason || 'You do not have permission to update this user.',
      'warning'
    );
    return false;
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !userId) return;
    if (!ensureCanUpdateRoleOrVerification()) return;

    const selectedRoleLevel = getRoleLevel(roleDetails, selectedRole.value, selectedRole.level);
    if (!canManageRoleLevel(currentUserRoleAccess, selectedRoleLevel)) {
      void swalAlert(
        'Role Not Allowed',
        'You can assign only roles that are under your own role level.',
        'warning'
      );
      return;
    }

    try {
      setIsUpdating(true);
      await updateUserRoleOrDelete({
        userId: Number(userId),
        userRoleId: selectedRole.value,
      });
      swalAlert('Success', 'Role updated successfully', 'success');
      onRefreshTable();
      loadUserData();
    } catch (err: any) {
      console.error('Error updating role:', err);
      swalErrorModal('Error', err?.response?.data?.desc || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateVerificationStatus = async () => {
    if (!selectedVerificationStatus || !userId) return;
    if (!ensureCanUpdateRoleOrVerification()) return;

    try {
      setIsUpdating(true);
      await updateUserRoleOrDelete({
        userId: Number(userId),
        verificationStatusId: selectedVerificationStatus.value,
      });
      swalAlert('Success', 'Verification status updated successfully', 'success');
      onRefreshTable();
      loadUserData();
    } catch (err: any) {
      console.error('Error updating verification status:', err);
      swalErrorModal('Error', err?.response?.data?.desc || 'Failed to update verification status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userId) return;
    if (!ensureCanUpdateRoleOrVerification()) return;

    const confirmed = await swalConfirm(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      'Yes, delete',
      'Cancel'
    );
    
    if (confirmed) {
      try {
        setIsUpdating(true);
        await updateUserRoleOrDelete({
          userId: Number(userId),
          isDeleted: true,
        });
        swalAlert('Success', 'User deleted successfully', 'success');
        onRefreshTable();
        onClose();
      } catch (err: any) {
        console.error('Error deleting user:', err);
        swalErrorModal('Error', err?.response?.data?.desc || 'Failed to delete user');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleToggleUserStatus = async () => {
    if (!userId || !user) return;
    if (!ensureCanUpdateRoleOrVerification()) return;

    const isCurrentlyActive = user.isActive ?? true;
    const actionText = isCurrentlyActive ? 'disable' : 'enable';
    const ActionText = isCurrentlyActive ? 'Disable' : 'Enable';

    const confirmed = await swalConfirm(
      `${ActionText} User`,
      `Are you sure you want to ${actionText} this user? ${isCurrentlyActive ? 'They will no longer be able to access the platform.' : 'They will regain access to the platform.'}`,
      `Yes, ${actionText}`,
      'Cancel'
    );
    
    if (confirmed) {
      try {
        setIsUpdating(true);
        await updateUserRoleOrDelete({
          userId: Number(userId),
          isActive: !isCurrentlyActive,
        });
        swalAlert('Success', `User ${actionText}d successfully`, 'success');
        onRefreshTable();
        loadUserData();
      } catch (err: any) {
        console.error(`Error ${actionText}ing user:`, err);
        swalErrorModal('Error', err?.response?.data?.desc || `Failed to ${actionText} user`);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleToggleUserFlag = async (flag: UserFlagKey) => {
    if (!userId || !user) return;
    if (!ensureCanUpdateRoleOrVerification()) return;

    const nextValue = !Boolean(user[flag]);
    const label = flag === 'isEmployee' ? 'employee access' : 'market access';

    try {
      setIsUpdating(true);
      await updateUserRoleOrDelete({
        userId: Number(userId),
        [flag]: nextValue,
      });
      await swalAlert('Updated', `${label} ${nextValue ? 'enabled' : 'disabled'} successfully.`, 'success');
      onRefreshTable();
      loadUserData();
    } catch (err: any) {
      console.error(`Error updating ${flag}:`, err);
      swalErrorModal('Error', err?.response?.data?.desc || `Failed to update ${label}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendResetPasswordEmail = async () => {
    console.log('Send Reset Password Email clicked for user:', userId);
  };

  const handleSendVerificationEmail = async () => {
    console.log('Send Verification Email clicked for user:', userId);
  };

  if (!isOpen) return null;

  const displayName = getUserDisplayName(user);
  const profileImageUrl = normalizeImageUrl(user?.profileImg || user?.profileImage || user?.profilePic || '');

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        
        <div className="relative border-b border-orange-100 bg-white">
          <div className="h-1.5 bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#9A5F11]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#D17F0A]"
            aria-label="Close user details"
            title="Close user details"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-4 px-5 py-4 pr-14 sm:flex-row sm:items-center">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 ring-1 ring-orange-200">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-8 w-8 text-[#D17F0A]" />
              )}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 truncate text-xl font-black text-gray-900">{loading ? 'Loading...' : displayName}</h2>
                {!loading && user?.isActive !== undefined && (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${
                    user.isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-red-50 text-red-700 ring-red-200'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>

              {!loading && (
                <div className="mt-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-600">{user?.email || 'No email available'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#AC6C2A] ring-1 ring-orange-100">
                      {formatRoleUpper(user?.userRole?.name)}
                    </span>
                    <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                      ID {user?.id || userId || '-'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 bg-gray-50 flex-1">
          {loading ? (
            <div className="flex justify-center p-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F59B0F] border-t-transparent"></div>
            </div>
          ) : user ? (
            <>
              {/* Main Details Grid - 3 columns for larger layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* First Name & Last Name */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-1 tracking-wide">First Name</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">{user.firstName || '—'}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-1 tracking-wide">Last Name</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">{user.lastName || '—'}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm md:col-span-1">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-1 tracking-wide">Email</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">{user.email || '—'}</p>
                  </div>
                </div>

                {/* Email Verified */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <CheckCircleIcon className={`h-5 w-5 ${user.emailVerified || user.isEmailVerified ? 'text-emerald-600' : 'text-amber-500'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Email Verified</p>
                      <p className={`text-sm font-bold ${user.emailVerified || user.isEmailVerified ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {user.emailVerified || user.isEmailVerified ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="bg-orange-50 p-2 rounded-lg">
                      <ShieldCheckIcon className="h-5 w-5 text-[#F59B0F]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Role</p>
                      <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">{formatRoleUpper(user.userRole?.name, '—')}</p>
                    </div>
                  </div>
                </div>

                {/* Active Status */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${user.isActive ? 'bg-green-50' : 'bg-red-50'}`}>
                      <CheckCircleIcon className={`h-5 w-5 ${user.isActive ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Active Status</p>
                      <p className={`text-sm font-bold ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Employee Status */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="bg-teal-50 p-2 rounded-lg">
                      <CheckCircleIcon className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Employee</p>
                      <p className={`text-sm font-bold ${user.isEmployee ? 'text-teal-600' : 'text-gray-500'}`}>
                        {user.isEmployee ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Market Status */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="bg-violet-50 p-2 rounded-lg">
                      <BuildingStorefrontIcon className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Market</p>
                      <p className={`text-sm font-bold ${user.hasMarket ? 'text-violet-600' : 'text-gray-500'}`}>
                        {user.hasMarket ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deleted Status */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${user.isDeleted ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <TrashIcon className={`h-5 w-5 ${user.isDeleted ? 'text-red-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Deleted</p>
                      <p className={`text-sm font-bold ${user.isDeleted ? 'text-red-600' : 'text-gray-600'}`}>
                        {user.isDeleted ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-1 tracking-wide">Gender</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">{user.gender?.name || '—'}</p>
                  </div>
                </div>

                {/* DOB */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-1 tracking-wide">Date of Birth</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">{user.dob ? new Date(user.dob).toLocaleDateString() : '—'}</p>
                  </div>
                </div>

                {/* NIC */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-1 tracking-wide">NIC</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">{user.nic || '—'}</p>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-1 tracking-wide">Verification Status</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">{user.verificationStatus?.name || '—'}</p>
                  </div>
                </div>

                {/* Updated By */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="bg-cyan-50 p-2 rounded-lg">
                      <EnvelopeIcon className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Updated By</p>
                      <p className="text-sm font-bold text-gray-800 whitespace-normal wrap-break-word">
                        {updatedByUserEmail || (user.updatedBy ? String(user.updatedBy) : '—')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#F59B0F] ring-1 ring-orange-100">
                      <HomeIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900">Addresses</h3>
                      <p className="text-xs font-semibold text-gray-500">
                        {isLoadingAddresses ? 'Loading saved addresses...' : `${addresses.length} saved address${addresses.length === 1 ? '' : 'es'}`}
                      </p>
                    </div>
                  </div>
                </div>

                {addressError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {addressError}
                  </div>
                )}

                {isLoadingAddresses ? (
                  <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F59B0F] border-t-transparent" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                    <p className="text-sm font-bold text-gray-800">No addresses saved</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">This user has not added an address yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => {
                      const city = getAddressCity(address);
                      const phoneItems = getAddressPhones(address);
                      const isDefault = Boolean(address.defaultAddress || address.permanent);

                      return (
                        <div
                          key={address.id}
                          className={`rounded-2xl border p-4 ${isDefault ? 'border-orange-200 bg-orange-50/50' : 'border-gray-100 bg-gray-50'}`}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-gray-900">{address.tag || 'Saved Address'}</span>
                                {isDefault && (
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#AC6C2A] ring-1 ring-orange-200">
                                    {address.permanent ? 'Permanent' : 'Default'}
                                  </span>
                                )}
                              </div>
                              <p className="whitespace-normal wrap-break-word text-sm font-semibold leading-5 text-gray-800">
                                {address.address || 'Address not provided'}
                              </p>
                              {address.location && (
                                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                                  <MapPinIcon className="h-3.5 w-3.5" />
                                  {address.location}
                                </p>
                              )}
                              {city?.name && (
                                <p className="mt-1 text-xs font-semibold text-gray-500">
                                  {city.name}{city.district?.name ? ` / ${city.district.name}` : ''}
                                </p>
                              )}
                            </div>

                            <div className="grid min-w-0 gap-1 text-xs sm:grid-cols-3 lg:w-64 lg:grid-cols-1">
                              {phoneItems.length > 0 ? (
                                phoneItems.map((item) => (
                                  <p key={`${address.id}-${item.label}`} className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-gray-700">
                                    <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                    <span className="text-gray-400">{item.label}:</span>
                                    <span className="break-all">{item.value}</span>
                                  </p>
                                ))
                              ) : (
                                <p className="font-semibold text-gray-500">No phone numbers saved</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions Box */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
                {!canUpdateRoleOrVerification && roleOrVerificationBlockReason && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    {roleOrVerificationBlockReason}
                  </div>
                )}

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">Quick Flags</p>
                    {isUpdating && <span className="text-[11px] font-bold text-[#F59B0F]">Saving...</span>}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleToggleUserFlag('isEmployee')}
                      disabled={isUpdating || !canUpdateRoleOrVerification}
                      aria-pressed={Boolean(user.isEmployee)}
                      className={`group flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.isEmployee
                          ? 'border-teal-200 bg-teal-50 text-teal-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200 hover:bg-teal-50/60'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <BriefcaseIcon className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-bold">Employee</span>
                      </span>
                      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${user.isEmployee ? 'bg-teal-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 h-3 w-3 rounded-full bg-white transition ${user.isEmployee ? 'left-5' : 'left-1'}`} />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleUserFlag('hasMarket')}
                      disabled={isUpdating || !canUpdateRoleOrVerification}
                      aria-pressed={Boolean(user.hasMarket)}
                      className={`group flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.hasMarket
                          ? 'border-violet-200 bg-violet-50 text-violet-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-violet-200 hover:bg-violet-50/60'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <BuildingStorefrontIcon className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-bold">Market</span>
                      </span>
                      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${user.hasMarket ? 'bg-violet-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 h-3 w-3 rounded-full bg-white transition ${user.hasMarket ? 'left-5' : 'left-1'}`} />
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Update User Role</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        options={roles}
                        value={selectedRole}
                        onChange={setSelectedRole}
                        placeholder={canUpdateRoleOrVerification ? 'Select new role...' : 'Role update unavailable'}
                        isDisabled={!canUpdateRoleOrVerification || isUpdating}
                        styles={{ control: (base, state) => ({ ...base, borderRadius: '0.75rem', borderColor: state.isFocused ? '#F59B0F' : '#e5e7eb', boxShadow: 'none' }) }}
                      />
                    </div>
                    <button
                      onClick={handleUpdateRole}
                      disabled={!selectedRole || isUpdating || !canUpdateRoleOrVerification}
                      className="px-4 py-2 bg-[#F59B0F] hover:bg-[#d98505] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 min-w-20"
                    >
                      {isUpdating ? 'Wait...' : 'Update'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Update Verification Status</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        options={verificationStatuses}
                        value={selectedVerificationStatus}
                        onChange={setSelectedVerificationStatus}
                        placeholder={canUpdateRoleOrVerification ? 'Select new status...' : 'Verification update unavailable'}
                        isDisabled={!canUpdateRoleOrVerification || isUpdating}
                        styles={{ control: (base, state) => ({ ...base, borderRadius: '0.75rem', borderColor: state.isFocused ? '#F59B0F' : '#e5e7eb', boxShadow: 'none' }) }}
                      />
                    </div>
                    <button
                      onClick={handleUpdateVerificationStatus}
                      disabled={!selectedVerificationStatus || isUpdating || !canUpdateRoleOrVerification}
                      className="px-4 py-2 bg-[#F59B0F] hover:bg-[#d98505] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 min-w-20"
                    >
                      {isUpdating ? 'Wait...' : 'Update'}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-gray-100 w-full" />

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {canUseNotifications && (
                    <>
                      <button
                        onClick={() => {
                          onClose();
                          if (onViewNotificationsClick) onViewNotificationsClick(user.id.toString());
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <BellIcon className="h-5 w-5" />
                        View Notifications
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onSendNotificationClick(user.id.toString());
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-indigo-100 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors"
                      >
                        <EnvelopeIcon className="h-5 w-5" />
                        Send Notification
                      </button>
                    </>
                  )}

                  {canUpdateRoleOrVerification && (
                    <button
                      onClick={handleToggleUserStatus}
                      disabled={isUpdating}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold transition-colors disabled:opacity-50 ${user.isActive ? 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                    >
                      <LockClosedIcon className="h-5 w-5" />
                      {user.isActive ? 'Disable User' : 'Enable User'}
                    </button>
                  )}

                  {canUpdateRoleOrVerification && (
                    <button
                      onClick={handleDeleteUser}
                      disabled={isUpdating}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-100 bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <TrashIcon className="h-5 w-5" />
                      Delete User
                    </button>
                  )}

                  {canUpdateRoleOrVerification && (
                    <>
                      <button
                        onClick={handleSendResetPasswordEmail}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-cyan-100 bg-cyan-50 text-cyan-700 font-semibold hover:bg-cyan-100 transition-colors disabled:opacity-50"
                      >
                        <EnvelopeIcon className="h-5 w-5" />
                        Reset Password
                      </button>

                      <button
                        onClick={handleSendVerificationEmail}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-green-100 bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        <EnvelopeIcon className="h-5 w-5" />
                        Verify Email
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-gray-500">Failed to load user data.</div>
          )}
        </div>
      </div>
    </div>
  );
}

