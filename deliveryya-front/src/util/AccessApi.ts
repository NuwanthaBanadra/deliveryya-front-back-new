import axiosInstance from './AxiosUtil';
import type {
  AccessLookup,
  AccessRecord,
  ApiFeature,
  ApiRoute,
  ApiStandardResponse,
  CreateAccessRequest,
  CreateAccessResponse,
  GetAllAccessesRequest,
  GetAllApisRequest,
  GrantAccessToUserRequest,
  GrantAccessToUserRoleRequest,
  LinkAccessWithApiRequest,
  PaginatedResult,
  RemoveApiFeaturesForApiRequest,
  SetAccessRequest,
  SetApiFeaturesForApiRequest,
} from '../types/AccessModels';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value: unknown, fallback = ''): string => (
  typeof value === 'string' ? value : fallback
);

const getNestedRecord = (record: UnknownRecord | null, key: string): UnknownRecord | null => {
  const value = record?.[key];
  return isRecord(value) ? value : null;
};

const unwrapPageObject = (payload: unknown): UnknownRecord | null => {
  if (!isRecord(payload)) return null;

  const data = getNestedRecord(payload, 'data');
  const object = getNestedRecord(payload, 'object');
  const dataObject = getNestedRecord(data, 'object');

  return dataObject ?? object ?? data ?? payload;
};

const extractItems = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const pageObject = unwrapPageObject(payload);
  if (!pageObject) return [];

  const objectValue = pageObject.object;
  if (Array.isArray(pageObject.items)) return pageObject.items;
  if (Array.isArray(objectValue)) return objectValue;
  if (isRecord(objectValue) && Array.isArray(objectValue.items)) return objectValue.items;
  if (Array.isArray(pageObject.data)) return pageObject.data;

  return [];
};

const extractTotalCount = (payload: unknown, fallbackCount: number): number => {
  const pageObject = unwrapPageObject(payload);
  const candidates = [
    pageObject?.totalCount,
    pageObject?.totalItems,
    pageObject?.count,
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate, -1);
    if (value >= 0) return value;
  }

  return fallbackCount;
};

const extractPageNumber = (payload: unknown, fallback = 0): number => {
  const pageObject = unwrapPageObject(payload);
  return toNumber(pageObject?.pageNumber, fallback);
};

const extractCountPerPage = (payload: unknown, fallback: number): number => {
  const pageObject = unwrapPageObject(payload);
  return toNumber(pageObject?.countPerPage, fallback);
};

const normalizeLookup = (value: unknown): AccessLookup | null => {
  if (!isRecord(value)) return null;

  const id = toNumber(value.id, 0);
  if (id <= 0) return null;

  return {
    id,
    name: toText(value.name, `Item ${id}`),
  };
};

export const normalizeApiFeature = (value: unknown): ApiFeature => {
  const record = isRecord(value) ? value : {};
  const id = toNumber(record.id, 0);

  return {
    id,
    name: toText(record.name, id > 0 ? `Feature ${id}` : 'Feature'),
    desc: toText(record.desc ?? record.description, ''),
    apiId: toNumber(record.apiId, 0) || undefined,
  };
};

export const normalizeApiRoute = (value: unknown): ApiRoute => {
  const record = isRecord(value) ? value : {};
  const id = toNumber(record.id ?? record.apiId, 0);

  return {
    id,
    name: toText(record.name ?? record.apiName, id > 0 ? `API ${id}` : 'API Route'),
    desc: toText(record.desc ?? record.description, ''),
    apiMethod: normalizeLookup(record.apiMethod),
    apiFeatures: Array.isArray(record.apiFeatures)
      ? record.apiFeatures.map(normalizeApiFeature).filter((item) => item.id > 0)
      : [],
  };
};

export const normalizeAccessRecord = (value: unknown): AccessRecord => {
  const record = isRecord(value) ? value : {};
  const id = toNumber(record.id ?? record.accessId, 0);

  return {
    id,
    name: toText(record.name ?? record.accessName, id > 0 ? `Access ${id}` : 'Access'),
    desc: toText(record.desc ?? record.description, ''),
    accessLevel: normalizeLookup(record.accessLevel),
    accessType: normalizeLookup(record.accessType),
    apis: Array.isArray(record.apis)
      ? record.apis.map(normalizeApiRoute).filter((item) => item.id > 0)
      : [],
    createdAt: toText(record.createdAt, '') || null,
    updatedAt: toText(record.updatedAt, '') || null,
    createdBy: toText(record.createdBy, '') || null,
    updatedBy: toText(record.updatedBy, '') || null,
    exp: toText(record.exp, '') || null,
  };
};

const normalizePaginatedResult = <T,>(
  payload: unknown,
  items: T[],
  fallbackPage: number,
  fallbackPageSize: number
): PaginatedResult<T> => {
  const totalCount = extractTotalCount(payload, items.length);
  const countPerPage = extractCountPerPage(payload, fallbackPageSize);

  return {
    pageNumber: extractPageNumber(payload, fallbackPage),
    countPerPage,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / Math.max(1, countPerPage))),
    items,
  };
};

export interface AccessTypeOption {
  id: number | string;
  name: string;
}

export interface AccessLevelOption {
  id: number | string;
  name: string;
}

export async function createAccess(payload: CreateAccessRequest): Promise<CreateAccessResponse> {
  const res = await axiosInstance.post('/access/create-access', payload);
  return res.data as CreateAccessResponse;
}

export async function setAccess(payload: SetAccessRequest): Promise<ApiStandardResponse> {
  const res = await axiosInstance.post('/access/set-access', payload);
  return res.data as ApiStandardResponse;
}

export async function linkAccessWithApi(payload: LinkAccessWithApiRequest): Promise<ApiStandardResponse> {
  const res = await axiosInstance.post('/access/link-access-with-api', {
    accessId: payload.accessId,
    apiId: payload.apiId,
    apiFeatureIds: payload.apiFeatureIds ?? [],
    grant: payload.grant ?? true,
  });
  return res.data as ApiStandardResponse;
}

export async function setApiFeaturesForApi(payload: SetApiFeaturesForApiRequest): Promise<ApiStandardResponse> {
  const res = await axiosInstance.post('/access/set-api-features-for-api', payload);
  return res.data as ApiStandardResponse;
}

export async function removeApiFeaturesForApi(payload: RemoveApiFeaturesForApiRequest): Promise<ApiStandardResponse> {
  const res = await axiosInstance.post('/access/remove-api-features-for-api', payload);
  return res.data as ApiStandardResponse;
}

export async function grantAccessToUserRole(payload: GrantAccessToUserRoleRequest): Promise<ApiStandardResponse> {
  const res = await axiosInstance.post('/access/grant-access-to-user-role', {
    userRoleId: payload.userRoleId,
    accessIds: payload.accessIds,
    grantAccess: payload.grantAccess ?? true,
  });
  return res.data as ApiStandardResponse;
}

export async function grantAccessToUser(payload: GrantAccessToUserRequest): Promise<ApiStandardResponse> {
  const requestBody: GrantAccessToUserRequest = {
    usersId: payload.usersId,
    accessIds: payload.accessIds,
    grantAccess: payload.grantAccess ?? true,
  };

  if (requestBody.grantAccess) {
    requestBody.exp = payload.exp ?? null;
  }

  const res = await axiosInstance.post('/access/grant-access-to-user', requestBody);
  return res.data as ApiStandardResponse;
}

export async function getAllAccesses(payload: GetAllAccessesRequest): Promise<PaginatedResult<AccessRecord>> {
  const res = await axiosInstance.post('/access/get-all', {
    accessId: null,
    accessTypeId: null,
    accessLevelId: null,
    userRoleId: null,
    userId: null,
    apiIds: [],
    includeLinkedApis: true,
    includeGrantMeta: true,
    search: null,
    ...payload,
  });
  const items = extractItems(res.data).map(normalizeAccessRecord).filter((item) => item.id > 0);
  return normalizePaginatedResult(res.data, items, payload.pageNumber, payload.countPerPage);
}

export async function getAllApis(payload: GetAllApisRequest): Promise<PaginatedResult<ApiRoute>> {
  const res = await axiosInstance.post('/access/get-all-apis', {
    accessId: null,
    search: null,
    ...payload,
  });
  const items = extractItems(res.data).map(normalizeApiRoute).filter((item) => item.id > 0);
  return normalizePaginatedResult(res.data, items, payload.pageNumber, payload.countPerPage);
}

export async function fetchApiFeatures(apiId?: number | null): Promise<ApiFeature[]> {
  const params = new URLSearchParams();
  if (apiId) params.set('apiId', String(apiId));

  const query = params.toString();
  const res = await axiosInstance.get(`/access/get-api-features${query ? `?${query}` : ''}`);
  return extractItems(res.data).map(normalizeApiFeature).filter((item) => item.id > 0);
}

export async function fetchAccessTypes(): Promise<AccessTypeOption[]> {
  try {
    const res = await axiosInstance.get('/access/get-access-types');
    return extractItems(res.data)
      .map(normalizeLookup)
      .filter((item): item is AccessLookup => item !== null)
      .map((item) => ({ id: item.id, name: item.name }));
  } catch (err) {
    console.error('Failed to fetch access types:', err);
    return [];
  }
}

export async function fetchAccessLevels(): Promise<AccessLevelOption[]> {
  try {
    const levelMap = new Map<number, AccessLevelOption>();
    const countPerPage = 200;
    let pageNumber = 0;
    let totalCount = 0;
    let loadedCount = 0;

    do {
      const res = await getAllAccesses({
        pageNumber,
        countPerPage,
        includeLinkedApis: false,
        includeGrantMeta: false,
        search: null,
      });

      res.items.forEach((item) => {
        if (item.accessLevel?.id) {
          levelMap.set(item.accessLevel.id, {
            id: item.accessLevel.id,
            name: item.accessLevel.name,
          });
        }
      });

      totalCount = res.totalCount;
      loadedCount += res.items.length;
      pageNumber += 1;
    } while (loadedCount < totalCount && pageNumber < 20);

    return Array.from(levelMap.values()).sort((a, b) => Number(a.id) - Number(b.id));
  } catch (err) {
    console.error('Failed to fetch access levels:', err);
    return [];
  }
}

export async function fetchAllAccesses(): Promise<AccessTypeOption[]> {
  try {
    const res = await getAllAccesses({
      pageNumber: 0,
      countPerPage: 200,
      includeLinkedApis: false,
      includeGrantMeta: false,
      search: null,
    });

    return res.items.map((item) => ({
      id: item.id,
      name: item.name,
    }));
  } catch (err) {
    console.error('Failed to fetch accesses:', err);
    return [];
  }
}

export async function getGrantedAccessesByUserRoleId(userRoleId: number): Promise<AccessRecord[]> {
  const res = await axiosInstance.get(
    `/access/get-granted-accesses-by-user-role-id?userRoleId=${encodeURIComponent(userRoleId)}`
  );
  return extractItems(res.data).map(normalizeAccessRecord).filter((item) => item.id > 0);
}

export async function getGrantedAccessesByUserId(userId: number): Promise<AccessRecord[]> {
  const res = await axiosInstance.get(
    `/access/get-granted-accesses-by-user-id?userId=${encodeURIComponent(userId)}`
  );
  return extractItems(res.data).map(normalizeAccessRecord).filter((item) => item.id > 0);
}
