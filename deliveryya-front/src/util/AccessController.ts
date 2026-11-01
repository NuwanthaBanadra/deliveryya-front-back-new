import type { DecodedUserData } from "../types/EntitiesTypes";
import axiosInstance from "./AxiosUtil";
import { FRONTEND_ACCESS_IDS } from "./FrontendAccess";
import JwtUtil from "./JwtUtil";

export const mapKey = "AIzaSyCB5IK8ojpbgFm5fyifo5-lyQ_-2colDgY";
// Create a Map ID in Google Cloud Console -> Google Maps Platform -> Map Management
export const mapId = "DEMO_MAP_ID";

const ACCESS_DETAILS_STORAGE_KEY = "accessDetailToken";
const ACCESS_DETAILS_JWT_KEY = "accessDetailTokenJwt";
export const ACCESS_DETAILS_UPDATED_EVENT = "deliveryya:access-details-updated";

let cachedJwtToken: string | null = null;
let cachedUserDetail: DecodedUserData | null = null;
let cachedAccessJwtToken: string | null = null;
let cachedAccessIds: number[] | null = null;
let hydrationPromise: Promise<number[]> | null = null;

const normalizeAccessIds = (value: unknown): number[] => {
  const values = Array.isArray(value) ? value : [];

  return Array.from(
    new Set(
      values
        .flatMap((item) => {
          if (typeof item === "number" || typeof item === "string") {
            return [Number(item)];
          }

          if (item && typeof item === "object") {
            const record = item as { id?: unknown; accessId?: unknown; accessIds?: unknown };
            if (Array.isArray(record.accessIds)) {
              return normalizeAccessIds(record.accessIds);
            }

            return [Number(record.id ?? record.accessId)];
          }

          return [];
        })
        .filter((item) => Number.isFinite(item) && item > 0)
    )
  );
};

const getJwtToken = (): string | null => localStorage.getItem("jwtToken");

export const hasValidAuthToken = (): boolean => {
  const jwtToken = getJwtToken();
  return Boolean(jwtToken && JwtUtil.validateToken(jwtToken));
};

const removeStoredAccessDetails = () => {
  localStorage.removeItem(ACCESS_DETAILS_STORAGE_KEY);
  localStorage.removeItem(ACCESS_DETAILS_JWT_KEY);
};

const getUserDetail = (): DecodedUserData | null => {
  const jwtToken = getJwtToken();
  if (jwtToken !== cachedJwtToken) {
    cachedJwtToken = jwtToken;
    cachedUserDetail = jwtToken ? JwtUtil.decodeToken(jwtToken) : null;
  }

  return cachedUserDetail;
};

const emitAccessDetailsUpdated = () => {
  window.dispatchEvent(new CustomEvent<number[]>(ACCESS_DETAILS_UPDATED_EVENT, {
    detail: cachedAccessIds ?? [],
  }));
};

const readStoredAccessIds = (): number[] | null => {
  const jwtToken = getJwtToken();
  if (!jwtToken || !JwtUtil.validateToken(jwtToken)) {
    clearAccessDetails();
    return [];
  }

  const storedJwtToken = localStorage.getItem(ACCESS_DETAILS_JWT_KEY);
  if (storedJwtToken !== jwtToken) {
    removeStoredAccessDetails();
    cachedAccessIds = null;
    cachedAccessJwtToken = null;
    return null;
  }

  if (cachedAccessIds !== null && cachedAccessJwtToken === jwtToken) {
    return cachedAccessIds;
  }

  cachedAccessIds = null;
  cachedAccessJwtToken = null;

  const storedValue = localStorage.getItem(ACCESS_DETAILS_STORAGE_KEY);
  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    cachedAccessIds = normalizeAccessIds(parsed);
    cachedAccessJwtToken = jwtToken;
    return cachedAccessIds;
  } catch {
    removeStoredAccessDetails();
    cachedAccessIds = null;
    cachedAccessJwtToken = null;
    return null;
  }
};

export const storeAccessDetails = (accessIds: unknown): number[] => {
  const normalizedAccessIds = normalizeAccessIds(accessIds);
  const jwtToken = getJwtToken();

  cachedAccessIds = jwtToken ? normalizedAccessIds : [];
  cachedAccessJwtToken = jwtToken;

  if (jwtToken) {
    localStorage.setItem(ACCESS_DETAILS_STORAGE_KEY, JSON.stringify(normalizedAccessIds));
    localStorage.setItem(ACCESS_DETAILS_JWT_KEY, jwtToken);
  } else {
    removeStoredAccessDetails();
  }

  emitAccessDetailsUpdated();
  return cachedAccessIds;
};

export const clearAccessDetails = () => {
  cachedAccessIds = [];
  cachedAccessJwtToken = null;
  hydrationPromise = null;
  removeStoredAccessDetails();
  emitAccessDetailsUpdated();
};

export const fetchAccessDetails = async (forceRefresh = false): Promise<number[]> => {
  const jwtToken = getJwtToken();

  if (!jwtToken) {
    clearAccessDetails();
    return [];
  }

  if (!JwtUtil.validateToken(jwtToken)) {
    clearAccessDetails();
    return [];
  }

  if (!forceRefresh) {
    const storedAccessIds = readStoredAccessIds();
    if (storedAccessIds !== null) {
      return storedAccessIds;
    }
  }

  if (!hydrationPromise || forceRefresh) {
    hydrationPromise = axiosInstance
      .get("/access/get-access-details")
      .then((response) => storeAccessDetails(response.data?.object ?? []))
      .catch((error) => {
        console.error("Failed to fetch access details:", error);
        removeStoredAccessDetails();
        cachedAccessIds = null;
        cachedAccessJwtToken = null;
        emitAccessDetailsUpdated();
        return [];
      })
      .finally(() => {
        hydrationPromise = null;
      });
  }

  return hydrationPromise;
};

export const ensureAccessDetails = async (): Promise<number[]> => {
  if (!hasValidAuthToken()) {
    clearAccessDetails();
    return [];
  }

  const storedAccessIds = readStoredAccessIds();
  if (storedAccessIds !== null) {
    return storedAccessIds;
  }

  return fetchAccessDetails();
};

export const initializeAccessDetails = async (): Promise<number[]> => {
  return fetchAccessDetails(true);
};

export const getAccessIds = (): number[] => {
  if (!hasValidAuthToken()) {
    clearAccessDetails();
    return [];
  }

  const accessIds = readStoredAccessIds();
  if (accessIds !== null) {
    return accessIds;
  }

  void fetchAccessDetails();
  return [];
};

export const hasAccess = (accessId: number): boolean => {
  const parsedAccessId = Number(accessId);
  if (!Number.isFinite(parsedAccessId) || parsedAccessId <= 0) {
    return false;
  }

  return getAccessIds().includes(parsedAccessId);
};

export const checkAccess = hasAccess;

export const hasAnyAccess = (accessIds: readonly number[]): boolean => {
  return accessIds.some((accessId) => hasAccess(accessId));
};

export function getCurrentUserFromJwt(): DecodedUserData | null {
  return getUserDetail();
}

export type ConsoleSideAccessMode = "delivery-company" | "client-market-owner" | "none";

export function getCurrentUserId(): number | null {
  const userDetail = getUserDetail();
  const localUserId = Number(localStorage.getItem("userId"));
  if (Number.isFinite(localUserId) && localUserId > 0) {
    return localUserId;
  }

  const jwtUserId = Number(userDetail?.userId);
  return jwtUserId > 0 ? jwtUserId : null;
}

export function getDashboardAccessMode(): ConsoleSideAccessMode {
  if (hasAccess(FRONTEND_ACCESS_IDS.DASHBOARD_CLIENT_MARKET_OWNER)) {
    return "client-market-owner";
  }

  if (hasAccess(FRONTEND_ACCESS_IDS.DASHBOARD_DELIVERY_COMPANY)) {
    return "delivery-company";
  }

  return "none";
}

export function getOrderAnalyticsAccessMode(): ConsoleSideAccessMode {
  if (hasAccess(FRONTEND_ACCESS_IDS.ORDER_ANALYTICS_CLIENT_MARKET_OWNER)) {
    return "client-market-owner";
  }

  if (hasAccess(FRONTEND_ACCESS_IDS.ORDER_ANALYTICS_DELIVERY_COMPANY)) {
    return "delivery-company";
  }

  return "none";
}

export function hasDeliveryCompanyPlacedOrdersAccess(): boolean {
  return hasAccess(FRONTEND_ACCESS_IDS.VIEW_PLACED_ORDERS);
}

export function canAccessAccountsSection(): boolean {
  return hasAnyAccess([
    FRONTEND_ACCESS_IDS.ACCOUNTS_PANEL,
    FRONTEND_ACCESS_IDS.ACCOUNTS_DELIVERY_COMPANY,
    FRONTEND_ACCESS_IDS.ACCOUNTS_CLIENT_MARKET_OWNER,
  ]);
}

export function getAccountsAccessMode(): ConsoleSideAccessMode {
  if (hasAccess(FRONTEND_ACCESS_IDS.ACCOUNTS_CLIENT_MARKET_OWNER)) {
    return "client-market-owner";
  }

  if (hasAccess(FRONTEND_ACCESS_IDS.ACCOUNTS_DELIVERY_COMPANY)) {
    return "delivery-company";
  }

  return hasAccess(FRONTEND_ACCESS_IDS.ACCOUNTS_PANEL) ? "delivery-company" : "none";
}

export function shouldHideAccountsMarketFilter(): boolean {
  return getAccountsAccessMode() === "client-market-owner";
}

export function getAccountsDataUserId(): number | null {
  if (getAccountsAccessMode() !== "client-market-owner") {
    return 0;
  }

  return getCurrentUserId();
}
