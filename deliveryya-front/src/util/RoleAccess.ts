import JwtUtil from './JwtUtil';

type TokenPayload = Record<string, unknown>;

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const getDecodedTokenPayload = (): TokenPayload | null => {
  const token = localStorage.getItem('jwtToken');
  if (!token) return null;
  return (JwtUtil.decodeToken(token) as TokenPayload | null) ?? null;
};

// /users/get-user-roles - use
export const ROLE_IDS = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  OWNER: 3,
  MANAGER: 4,
  CLIENT: 5,
  CUSTOMER: 6,
  AGENT: 7,
  MARKET_OWNER: 8,
  CEO: 9,
  SECRETARY: 10,
  ACCOUNTS_MANAGER: 11,
  ACCOUNT_ASSISTANT: 12,
  HR_MANAGER: 13,
  HR_ASSISTANT: 14,
  MARKETS_MANAGER: 15,
} as const;

export const getCurrentUserRoleId = (): number | null => {
  const payload = getDecodedTokenPayload();

  const tokenRoleId = toPositiveInteger(
    payload?.roleId ?? payload?.userRoleId ?? payload?.user_role_id
  );
  if (tokenRoleId) {
    return tokenRoleId;
  }

  const localStorageRoleId = toPositiveInteger(
    localStorage.getItem('roleId') ??
    localStorage.getItem('userRoleId') ??
    localStorage.getItem('user_role_id')
  );

  return localStorageRoleId;
};

export const getCurrentUserId = (): number | null => {
  const payload = getDecodedTokenPayload();

  const tokenUserId = toPositiveInteger(payload?.userId ?? payload?.id);
  if (tokenUserId) {
    return tokenUserId;
  }

  const localStorageUserId = toPositiveInteger(localStorage.getItem('userId'));
  return localStorageUserId;
};

export const isCustomerRole = (roleId: number | null): boolean => {
  return roleId === ROLE_IDS.CUSTOMER;
};
