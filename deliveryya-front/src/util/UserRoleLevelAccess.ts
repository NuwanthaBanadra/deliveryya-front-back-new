import axiosInstance from './AxiosUtil';
import JwtUtil from './JwtUtil';
import { ROLE_IDS } from './RoleAccess';

export type UserRoleDetail = {
  id: number;
  name: string;
  level: number | null;
};

export type CurrentUserRoleAccess = {
  currentUserId: number | null;
  currentUserRoleId: number | null;
  currentUserRoleLevel: number | null;
  canManageAnyUserRole: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const toInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = toInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const asString = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const extractList = (data: unknown): unknown[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if (!isRecord(data)) {
    return [];
  }

  const directCandidates = [
    data.object,
    data.data,
    data.exData,
    data.payload,
    data.content,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (isRecord(candidate)) {
      const nestedCandidates = [candidate.items, candidate.content, candidate.data];
      const nestedList = nestedCandidates.find(Array.isArray);
      if (nestedList) {
        return nestedList;
      }
    }
  }

  return [];
};

const normalizeRole = (role: unknown): UserRoleDetail | null => {
  if (!isRecord(role)) {
    return null;
  }

  const id = toPositiveInteger(role.id ?? role.roleId ?? role.userRoleId);
  if (!id) {
    return null;
  }

  const name = asString(role.name ?? role.roleName) ?? `Role ${id}`;
  const level = toPositiveInteger(role.level ?? role.roleLevel ?? role.userRoleLevel);

  return { id, name, level };
};

export const fetchUserRoles = async (): Promise<UserRoleDetail[]> => {
  const response = await axiosInstance.get('/users/get-user-roles');

  return extractList(response.data)
    .map(normalizeRole)
    .filter((role): role is UserRoleDetail => role !== null);
};

export const formatRoleName = (roleName: string): string => {
  return roleName
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const isAdminOrSuperAdminRole = (roleId: number | null): boolean => {
  return roleId === ROLE_IDS.SUPER_ADMIN || roleId === ROLE_IDS.ADMIN;
};

export const getRoleLevel = (
  roles: readonly UserRoleDetail[],
  roleId: unknown,
  fallbackLevel?: unknown
): number | null => {
  const parsedRoleId = toPositiveInteger(roleId);
  const matchedRole = parsedRoleId
    ? roles.find((role) => role.id === parsedRoleId)
    : undefined;

  return matchedRole?.level ?? toPositiveInteger(fallbackLevel);
};

export const getCurrentUserRoleAccess = (
  roles: readonly UserRoleDetail[]
): CurrentUserRoleAccess => {
  const token = localStorage.getItem('jwtToken');
  const decoded = token ? JwtUtil.decodeToken(token) : null;
  const currentUserId = toPositiveInteger(decoded?.userId);
  const currentUserRoleId = toPositiveInteger(decoded?.roleId);
  const currentUserRoleLevel = getRoleLevel(roles, currentUserRoleId);

  return {
    currentUserId,
    currentUserRoleId,
    currentUserRoleLevel,
    canManageAnyUserRole: isAdminOrSuperAdminRole(currentUserRoleId),
  };
};

export const canManageRoleLevel = (
  access: CurrentUserRoleAccess,
  targetRoleLevel: number | null
): boolean => {
  if (access.canManageAnyUserRole) {
    return true;
  }

  if (access.currentUserRoleLevel === null || targetRoleLevel === null) {
    return false;
  }

  return targetRoleLevel > access.currentUserRoleLevel;
};

export const getAssignableRoles = (
  roles: readonly UserRoleDetail[],
  access: CurrentUserRoleAccess
): UserRoleDetail[] => {
  if (access.canManageAnyUserRole) {
    return [...roles];
  }

  return roles.filter((role) => canManageRoleLevel(access, role.level));
};
