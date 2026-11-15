import {
  ArrowPathIcon,
  BuildingStorefrontIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import axiosInstance, { baseURL } from '../../../util/AxiosUtil';

type MarketCategoryOption = {
  id: number;
  name: string;
};

type MarketOwner = {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
};

type MarketCategory = {
  id: number;
  name: string;
};

type MarketRow = {
  id: number;
  name: string;
  location: string;
  logoUrl: string;
  coverImgUrl: string;
  desc: string;
  infoMessage: string;
  isActive: boolean;
  users: MarketOwner | null;
  marketCategory: MarketCategory | null;
  createdAt: string;
};

type MarketsResponse = {
  object?: unknown;
  exData?: unknown;
  message?: string;
  desc?: string;
};

type EditFormState = {
  name: string;
  desc: string;
  location: string;
  logoUrl: string;
  coverImgUrl: string;
  infoMessage: string;
  isActive: boolean;
  userId: number;
  marketCategoryId: number;
};

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return fallback;
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return fallback;
};

const formatDate = (value: string): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const getOwnerName = (owner: MarketOwner | null): string => {
  if (!owner) return 'Unknown Owner';

  const combined = `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim();
  return combined || owner.name || `User #${owner.id}`;
};

const extractResponseRecord = (raw: unknown): Record<string, unknown> | null => {
  const root = asRecord(raw);
  if (!root) return null;

  const payload = root.object ?? root.exData ?? root;
  const payloadRecord = asRecord(payload);
  if (payloadRecord) {
    return payloadRecord;
  }

  const payloadArray = asArray(payload);
  if (payloadArray.length > 0) {
    return asRecord(payloadArray[0]);
  }

  return null;
};

const toMarketOwner = (value: unknown): MarketOwner | null => {
  const usersRecord = asRecord(value);
  if (!usersRecord) return null;

  const id = asNumber(usersRecord.id);
  if (!id) return null;

  return {
    id,
    firstName: asString(usersRecord.firstName, ''),
    lastName: asString(usersRecord.lastName, ''),
    name: asString(usersRecord.name, ''),
    email: asString(usersRecord.email, ''),
  };
};

const toMarketCategory = (value: unknown): MarketCategory | null => {
  const categoryRecord = asRecord(value);
  if (!categoryRecord) return null;

  const id = asNumber(categoryRecord.id);
  if (!id) return null;

  return {
    id,
    name: asString(categoryRecord.name, 'Uncategorized'),
  };
};

const extractItemsAndTotal = (raw: unknown): { items: unknown[]; total: number } => {
  const root = asRecord(raw);
  if (!root) return { items: [], total: 0 };

  const object = asRecord(root.object) ?? root;
  const exData = asRecord(root.exData);

  const objectItems = asArray(object.items);
  if (objectItems.length > 0) {
    return {
      items: objectItems,
      total: asNumber(object.totalCount ?? object.totalElements ?? object.total, objectItems.length),
    };
  }

  const exDataItems = asArray(exData?.items);
  if (exDataItems.length > 0) {
    return {
      items: exDataItems,
      total: asNumber(exData?.totalCount ?? exData?.totalElements ?? exData?.total, exDataItems.length),
    };
  }

  const directObjectArray = asArray(root.object);
  if (directObjectArray.length > 0) {
    return { items: directObjectArray, total: directObjectArray.length };
  }

  const directExDataArray = asArray(root.exData);
  if (directExDataArray.length > 0) {
    return { items: directExDataArray, total: directExDataArray.length };
  }

  return { items: [], total: 0 };
};

const mapMarketRow = (item: unknown): MarketRow | null => {
  const record = asRecord(item);
  if (!record) return null;

  const id = asNumber(record.id);
  if (!id) return null;

  const usersRecord = asRecord(record.users);
  const categoryRecord = asRecord(record.marketCategory) ?? asRecord(record.marketCategories) ?? asRecord(record.category);
  const categoryId = asNumber(record.marketCategoryId) ?? asNumber(categoryRecord?.id);
  const categoryName = asString(record.marketCategoryName, '') || asString(categoryRecord?.name, '');

  return {
    id,
    name: asString(record.name, 'Untitled Market'),
    location: asString(record.location, 'N/A'),
    logoUrl: asString(record.logoUrl, ''),
    coverImgUrl: asString(record.coverImgUrl, ''),
    desc: asString(record.desc, ''),
    infoMessage: asString(record.infoMessage, ''),
    isActive: asBoolean(record.isActive, false),
    users: usersRecord ? toMarketOwner(usersRecord) : null,
    marketCategory: categoryId
      ? {
        id: categoryId,
        name: categoryName || `Category #${categoryId}`,
      }
      : (categoryRecord ? toMarketCategory(categoryRecord) : null),
    createdAt: asString(record.createdAt, asString(record.createdDate, 'N/A')),
  };
};

const toEditForm = (market: MarketRow): EditFormState => ({
  name: market.name,
  desc: market.desc,
  location: market.location === 'N/A' ? '' : market.location,
  logoUrl: market.logoUrl,
  coverImgUrl: market.coverImgUrl,
  infoMessage: market.infoMessage,
  isActive: market.isActive,
  userId: market.users?.id ?? 0,
  marketCategoryId: market.marketCategory?.id ?? 0,
});

const getCustomSelectStyles = (hasError = false, isCompact = false) => ({
  control: (base: any, state: any) => ({
    ...base,
    padding: isCompact ? '0.15rem 0.25rem' : '0.35rem 0.45rem',
    borderWidth: '2px',
    minHeight: isCompact ? '48px' : '52px',
    borderColor: hasError ? '#EF4444' : (state.isFocused ? '#F59B0F' : '#D1D5DB'),
    borderRadius: '0.5rem',
    boxShadow: hasError
      ? (state.isFocused ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none')
      : (state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.2)' : 'none'),
    '&:hover': {
      borderColor: hasError ? '#DC2626' : '#FCD34D',
    },
    transition: 'all 0.3s',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
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
    zIndex: 9999,
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
});

function MarketRequestsManager() {
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [categories, setCategories] = useState<MarketCategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [pageNumber, setPageNumber] = useState(0);
  const [countPerPage, setCountPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [marketCategoryId, setMarketCategoryId] = useState<number>(0);
  const [userId, setUserId] = useState<string>('');
  const [isActive, setIsActive] = useState(false);

  const [editingMarket, setEditingMarket] = useState<MarketRow | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [statusUpdatingIds, setStatusUpdatingIds] = useState<number[]>([]);

  const totalPages = Math.max(1, Math.ceil(totalCount / countPerPage));

  const activeCount = useMemo(() => rows.filter((row) => row.isActive).length, [rows]);
  const marketCategoryOptions = useMemo<SelectOption<number>[]>(
    () => [{ value: 0, label: 'All Categories' }, ...categories.map((category) => ({ value: category.id, label: category.name }))],
    [categories],
  );
  const marketStatusOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ],
    [],
  );
  const pageSizeOptions = useMemo<SelectOption<number>[]>(
    () => [
      { value: 5, label: '5' },
      { value: 10, label: '10' },
      { value: 20, label: '20' },
    ],
    [],
  );

  const handleResetFilters = () => {
    setSearch('');
    setSearchInput('');
    setMarketCategoryId(0);
    setUserId('');
    setIsActive(false);
    setCountPerPage(10);
    setPageNumber(0);
  };

  const applyMarketPatch = (id: number, patch: Partial<MarketRow>) => {
    setRows((prevRows) => prevRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setEditingMarket((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  const handleDeleteMarket = (marketId: number) => {
    const confirmed = window.confirm(`Delete market #${marketId} from this list?`);
    if (!confirmed) {
      return;
    }

    setRows((prevRows) => prevRows.filter((row) => row.id !== marketId));
    setTotalCount((prevTotal) => Math.max(0, prevTotal - 1));
    setError('');
  };

  const handleToggleMarketStatus = async (market: MarketRow) => {
    const nextStatus = !market.isActive;
    setStatusUpdatingIds((prev) => [...prev, market.id]);
    setError('');

    try {
      await axiosInstance.post('/markets/update-market-status-info', {
        id: market.id,
        isActive: nextStatus,
      });

      applyMarketPatch(market.id, { isActive: nextStatus });
    } catch (err: any) {
      setError(err?.response?.data?.desc || err?.message || 'Failed to update market status');
    } finally {
      setStatusUpdatingIds((prev) => prev.filter((id) => id !== market.id));
    }
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPageNumber(0);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await axiosInstance.get('/markets/get-market-categories');
        const data = response.data as MarketsResponse;
        const payload = data.object ?? data.exData ?? data;
        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray((payload as Record<string, unknown>)?.items)
            ? (((payload as Record<string, unknown>).items as unknown[]) ?? [])
            : [];

        const mapped = arr
          .map((item) => {
            const record = asRecord(item);
            if (!record) return null;
            const id = asNumber(record.id);
            const name = asString(record.name, 'Unnamed');
            if (!id) return null;
            return { id, name };
          })
          .filter((item): item is MarketCategoryOption => item !== null);

        setCategories(mapped);
      } catch (err) {
        console.error('Failed to load market categories:', err);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    const loadMarkets = async () => {
      setIsLoading(true);
      setError('');

      try {
        const payload: Record<string, unknown> = {
          pageNumber,
          countPerPage,
          isActive,
          search,
        };

        if (marketCategoryId > 0) {
          payload.marketCategoryId = marketCategoryId;
        }

        const parsedUserId = Number(userId);
        if (Number.isFinite(parsedUserId) && parsedUserId > 0) {
          payload.userId = parsedUserId;
        }

        const response = await axiosInstance.post('/markets/get-markets', payload);
        const data = response.data as MarketsResponse;
        const parsed = extractItemsAndTotal(data);
        const mappedRows = parsed.items
          .map((item) => mapMarketRow(item))
          .filter((item): item is MarketRow => item !== null);

        const userIds = Array.from(
          new Set(
            mappedRows
              .map((market) => market.users?.id)
              .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0)
          )
        );

        const userEntries = await Promise.all(
          userIds.map(async (id) => {
            try {
              const userResponse = await axiosInstance.get('/users/get-user-by-id', { params: { id } });
              const userRecord = extractResponseRecord(userResponse.data);
              return [id, toMarketOwner(userRecord)] as const;
            } catch (lookupError) {
              console.warn(`Failed to load user ${id}:`, lookupError);
              return [id, null] as const;
            }
          })
        );

        const usersById = new Map<number, MarketOwner>(
          userEntries
            .filter((entry): entry is readonly [number, MarketOwner] => entry[1] !== null)
            .map(([id, owner]) => [id, owner])
        );

        const categoriesById = new Map<number, MarketCategory>(
          categories.map((category) => [
            category.id,
            {
              id: category.id,
              name: category.name,
            },
          ])
        );

        const enrichedRows = mappedRows.map((market) => {
          const ownerId = market.users?.id;
          const categoryId = market.marketCategory?.id;

          return {
            ...market,
            users: ownerId ? (usersById.get(ownerId) ?? market.users) : market.users,
            marketCategory: categoryId ? (categoriesById.get(categoryId) ?? market.marketCategory) : market.marketCategory,
          };
        });

        setRows(enrichedRows);
        setTotalCount(parsed.total || mappedRows.length);
      } catch (err: any) {
        console.error('Failed to load market requests:', err);
        setRows([]);
        setTotalCount(0);
        setError(err?.response?.data?.desc || err?.message || 'Failed to load market requests');
      } finally {
        setIsLoading(false);
      }
    };

    void loadMarkets();
  }, [pageNumber, countPerPage, marketCategoryId, userId, isActive, search, categories]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 sm:px-8 py-4 bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A]">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <BuildingStorefrontIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Market Requests</h1>
            </div>
            <p className="text-white/90 text-sm sm:text-base max-w-2xl">
              Review newly created market pages and inspect request details.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 sm:p-8">
          <div className="bg-linear-to-br from-[#F59B0F]/10 to-transparent rounded-xl p-4 border border-[#F59B0F]/20">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Loaded</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{rows.length}</p>
          </div>
          <div className="bg-linear-to-br from-green-500/10 to-transparent rounded-xl p-4 border border-green-500/20">
            <p className="text-xs text-gray-500 font-semibold uppercase">Active in Page</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{activeCount}</p>
          </div>
          <div className="bg-linear-to-br from-blue-500/10 to-transparent rounded-xl p-4 border border-blue-500/20">
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Matching</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{totalCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-4 xl:col-span-5 relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search market name, location, description"
                className="h-12 w-full pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59B0F]"
              />
            </div>

            <div className="lg:col-span-3 xl:col-span-3">
              <Select<SelectOption<number>, false>
                value={marketCategoryOptions.find((option) => option.value === marketCategoryId) ?? marketCategoryOptions[0]}
                onChange={(option) => {
                  setMarketCategoryId(option ? option.value : 0);
                  setPageNumber(0);
                }}
                options={marketCategoryOptions}
                placeholder="All Categories"
                styles={getCustomSelectStyles(false, true)}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>

            <div className="lg:col-span-2 xl:col-span-2">
              <Select<SelectOption<string>, false>
                value={marketStatusOptions.find((option) => option.value === String(isActive)) ?? marketStatusOptions[0]}
                onChange={(option) => {
                  setIsActive(option ? option.value === 'true' : false);
                  setPageNumber(0);
                }}
                options={marketStatusOptions}
                placeholder="Select status"
                styles={getCustomSelectStyles(false, true)}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>

            <div className="lg:col-span-1 xl:col-span-1 min-w-24">
              <Select<SelectOption<number>, false>
                value={pageSizeOptions.find((option) => option.value === countPerPage) ?? pageSizeOptions[1]}
                onChange={(option) => {
                  setCountPerPage(option ? option.value : 10);
                  setPageNumber(0);
                }}
                options={pageSizeOptions}
                placeholder="Rows"
                styles={getCustomSelectStyles(false, true)}
                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>

            <div className="lg:col-span-2 xl:col-span-1 flex justify-stretch xl:justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-12 w-full xl:w-auto px-5 rounded-lg border border-gray-300 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl text-center flex items-center justify-center gap-2"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>

          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Market</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-gray-500 font-medium">
                    Loading market requests...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-gray-500 font-medium">
                    No requests found for current filters.
                  </td>
                </tr>
              ) : (
                rows.map((market) => (
                  <tr key={market.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 shrink-0">
                          {market.logoUrl ? (
                            <img src={baseURL+ "/uploads/"+ market.logoUrl} alt={market.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BuildingStorefrontIcon className="w-5 h-5 text-[#F59B0F]" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{market.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-800">{getOwnerName(market.users)}</p>
                      <p className="text-xs text-gray-500">{market.users?.email || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center">{market.marketCategory?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-[220px] truncate" title={market.location}>
                      <a href={market.location || '#'} target="_blank" rel="noopener noreferrer">
                        {market.location || 'N/A'}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${market.isActive
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                      >
                        {market.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">{formatDate(market.createdAt)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleMarketStatus(market)}
                          disabled={statusUpdatingIds.includes(market.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm disabled:opacity-50"
                        >
                          {statusUpdatingIds.includes(market.id)
                            ? 'Updating...'
                            : market.isActive
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMarket(market.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm"
                          title="More options"
                          aria-label="More options"
                        >
                          <EllipsisHorizontalIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Page {pageNumber + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPageNumber((prev) => Math.max(0, prev - 1))}
              disabled={pageNumber === 0 || isLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPageNumber((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
              disabled={pageNumber + 1 >= totalPages || isLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketRequestsManager;
