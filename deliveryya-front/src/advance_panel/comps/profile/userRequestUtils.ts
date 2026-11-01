import type { StylesConfig } from 'react-select';
import axiosInstance from '../../../util/AxiosUtil';

export type RequestType = { id: number; name: string };

export type UserInfo = {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  nic?: string;
};

export type SelectOption<T = string | number> = { value: T; label: string };

export type UserSelectOption = SelectOption<number> & {
  user: UserInfo;
};

export type UserRequestRow = {
  id: number;
  title: string;
  desc: string;
  isAccepted: boolean;
  isRead: boolean;
  isDeleted: boolean;
  verificationDataIds: unknown[];
  user: UserInfo | null;
  userRequestType: RequestType | null;
  createdAt: string;
};

export const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
);

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

export const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value === 1;
  return fallback;
};

const asDocArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
};

export const extractItemsAndTotal = (raw: unknown): { items: unknown[]; total: number } => {
  const root = asRecord(raw);
  if (!root) return { items: [], total: 0 };

  const object = asRecord(root.object);
  const exData = asRecord(root.exData);
  const data = asRecord(root.data);
  const dataObject = asRecord(data?.object);

  const candidates = [dataObject, object, exData, data, root];
  for (const candidate of candidates) {
    if (!candidate) continue;

    const items = asArray(candidate.items);
    if (items.length > 0 || typeof candidate.totalCount === 'number' || typeof candidate.totalElements === 'number') {
      return {
        items,
        total: asNumber(candidate.totalCount ?? candidate.totalElements ?? candidate.total ?? candidate.totalItems, items.length),
      };
    }
  }

  const objectArray = asArray(root.object);
  if (objectArray.length > 0) return { items: objectArray, total: objectArray.length };

  const exDataArray = asArray(root.exData);
  if (exDataArray.length > 0) return { items: exDataArray, total: exDataArray.length };

  const dataArray = asArray(root.data);
  if (dataArray.length > 0) return { items: dataArray, total: dataArray.length };

  return { items: [], total: 0 };
};

export const formatDate = (value: string): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const getUserName = (user: UserInfo | null): string => {
  if (!user) return 'Unknown User';
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || `User #${user.id}`;
};

export const mapUserInfo = (value: unknown, fallbackId?: unknown): UserInfo | null => {
  const record = asRecord(value);
  const id = asNumber(record?.id ?? record?.userId ?? fallbackId);
  if (!id) return null;

  return {
    id,
    firstName: asString(record?.firstName, ''),
    lastName: asString(record?.lastName, ''),
    email: asString(record?.email, ''),
    nic: asString(record?.nic, ''),
  };
};

export const mapRequestType = (value: unknown, fallbackId?: unknown, fallbackName?: unknown): RequestType | null => {
  const record = asRecord(value);
  const id = asNumber(record?.id ?? record?.requestTypeId ?? fallbackId);
  if (!id) return null;

  return {
    id,
    name: asString(record?.name ?? fallbackName, `Request Type #${id}`),
  };
};

export const mapRequestRow = (item: unknown): UserRequestRow | null => {
  const record = asRecord(item);
  if (!record) return null;

  const id = asNumber(record.id);
  if (!id) return null;

  const userRecord = record.user ?? record.users;
  const requestTypeRecord = record.userRequestType ?? record.requestType;

  return {
    id,
    title: asString(record.title, '-'),
    desc: asString(record.desc ?? record.description, ''),
    isAccepted: asBoolean(record.isAccepted ?? record.accepted, false),
    isRead: asBoolean(record.isRead ?? record.read, false),
    isDeleted: asBoolean(record.isDeleted ?? record.deleted, false),
    verificationDataIds: asDocArray(record.docUrls ?? record.verificationDataIds ?? record.verificationDataUrls),
    user: mapUserInfo(userRecord, record.userId ?? record.usersId),
    userRequestType: mapRequestType(
      requestTypeRecord,
      record.userRequestTypeId ?? record.requestTypeId,
      record.userRequestTypeName ?? record.requestTypeName,
    ),
    createdAt: asString(record.createdAt ?? record.createdDate, ''),
  };
};

export const getRequestSelectStyles = <Option,>(hasError = false): StylesConfig<Option, false> => ({
  control: (base, state) => ({
    ...base,
    minHeight: '48px',
    borderWidth: '2px',
    borderColor: hasError ? '#EF4444' : state.isFocused ? '#F59B0F' : '#E5E7EB',
    borderRadius: '0.75rem',
    boxShadow: hasError
      ? state.isFocused ? '0 0 0 3px rgba(239, 68, 68, 0.12)' : 'none'
      : state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.12)' : 'none',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: hasError ? '#DC2626' : '#F59B0F',
    },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FFF5E6' : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#F59B0F',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9CA3AF',
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    borderRadius: '0.75rem',
    overflow: 'hidden',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
});

export const getSelectPortalTarget = (): HTMLElement | null => (
  typeof document !== 'undefined' ? document.body : null
);

export const toRequestTypeOptions = (types: RequestType[], includeAll = false): SelectOption<number>[] => [
  ...(includeAll ? [{ value: 0, label: 'All Request Types' }] : []),
  ...types.map((type) => ({ value: type.id, label: type.name })),
];

export const loadRequestTypes = async (): Promise<RequestType[]> => {
  const response = await axiosInstance.get('/users/get-user-request-types');
  const parsed = extractItemsAndTotal(response.data);

  return parsed.items
    .map((item) => {
      const record = asRecord(item);
      const id = asNumber(record?.id);
      if (!id) return null;
      return {
        id,
        name: asString(record?.name, `Request Type #${id}`),
      };
    })
    .filter((item): item is RequestType => item !== null);
};

export const mapUserOption = (user: UserInfo): UserSelectOption => ({
  value: user.id,
  label: `${getUserName(user)}${user.email ? ` - ${user.email}` : ''}`,
  user,
});

export const loadUserSelectOptions = async (
  inputValue: string,
  pageNumber = 0,
  countPerPage = 25,
): Promise<{ options: UserSelectOption[]; total: number; hasMore: boolean }> => {
  const search = inputValue.trim();
  const response = await axiosInstance.post('/users/get-users', {
    pageNumber,
    countPerPage,
    isActive: true,
    search,
  });
  const parsed = extractItemsAndTotal(response.data);
  const options = parsed.items
    .map((item) => mapUserInfo(item))
    .filter((item): item is UserInfo => item !== null)
    .map(mapUserOption);

  return {
    options,
    total: parsed.total,
    hasMore: (pageNumber + 1) * countPerPage < parsed.total,
  };
};

export const getDefaultExpDate = (): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  date.setHours(23, 59, 59, 0);
  return date;
};

export const toDatetimeLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const toApiDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};
