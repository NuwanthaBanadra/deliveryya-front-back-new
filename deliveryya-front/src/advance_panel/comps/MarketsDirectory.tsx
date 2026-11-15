import { ArrowPathIcon, BuildingStorefrontIcon, ChatBubbleLeftRightIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentListIcon, ArrowTopRightOnSquareIcon as ExternalLinkIcon, EnvelopeIcon, HomeIcon, InformationCircleIcon, CheckCircleIcon, FunnelIcon, MagnifyingGlassIcon, MapPinIcon, PhoneIcon, WrenchScrewdriverIcon, XCircleIcon, XMarkIcon, } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Swal from 'sweetalert2';
import { hasAccess } from '../../util/AccessController';
import axiosInstance, { baseURL } from '../../util/AxiosUtil';
import { FRONTEND_ACCESS_IDS } from '../../util/FrontendAccess';
import CategoryBrandsManager from './my_market/category_brands';

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
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
  name?: string;
};

type MarketRow = {
  id: number;
  name: string;
  desc: string;
  address: string;
  location: string;
  first_num: string;
  second_num: string;
  whats_app: string;
  infoMessage: string;
  logoUrl: string;
  coverImgUrl: string;
  isActive: boolean;
  createdAt: string;
  users: MarketOwner | null;
  marketCategory: MarketCategory | null;
};

type ProductCategoryRow = {
  id: number;
  name: string;
  isActive: boolean;
};

type MarketsApiResponse = {
  object?: unknown;
  exData?: unknown;
  message?: string;
  desc?: string;
};

type MarketCategoriesApiResponse = {
  object?: unknown;
  exData?: unknown;
  message?: string;
  desc?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
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

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return fallback;
};

const extractItemsAndTotal = (raw: unknown): { items: unknown[]; totalCount: number } => {
  const root = asRecord(raw);
  if (!root) {
    return { items: [], totalCount: 0 };
  }

  const object = root.object ?? root.exData ?? root;

  if (Array.isArray(object)) {
    return { items: object, totalCount: object.length };
  }

  const objectRecord = asRecord(object);
  if (!objectRecord) {
    return { items: [], totalCount: 0 };
  }

  const items = asArray(objectRecord.items);
  const totalCount = asNumber(objectRecord.totalCount ?? objectRecord.totalElements ?? objectRecord.total, items.length);
  return { items, totalCount };
};

const toOwner = (raw: unknown): MarketOwner | null => {
  const owner = asRecord(raw);
  if (!owner) return null;
  const id = asNumber(owner.id);
  if (!id) return null;

  return {
    id,
    firstName: asString(owner.firstName, ''),
    lastName: asString(owner.lastName, ''),
    name: asString(owner.name, ''),
    email: asString(owner.email, ''),
  };
};

const toCategory = (raw: unknown): MarketCategory | null => {
  const category = asRecord(raw);
  if (!category) return null;
  const id = asNumber(category.id);
  if (!id) return null;

  return {
    id,
    name: asString(category.name, ''),
  };
};

const extractCategories = (raw: unknown): MarketCategory[] => {
  const root = asRecord(raw);
  if (!root) {
    return [];
  }

  const object = root.object ?? root.exData ?? root;

  if (Array.isArray(object)) {
    return object.map(toCategory).filter((item): item is MarketCategory => item !== null);
  }

  const objectRecord = asRecord(object);
  if (!objectRecord) {
    return [];
  }

  const items = asArray(objectRecord.items);
  return items.map(toCategory).filter((item): item is MarketCategory => item !== null);
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

const extractPagedItems = (raw: unknown): unknown[] => {
  const root = asRecord(raw);
  if (!root) {
    return [];
  }

  const objectRecord = asRecord(root.object);
  if (objectRecord) {
    const objectItems = asArray(objectRecord.items);
    if (objectItems.length > 0) {
      return objectItems;
    }
  }

  const exDataRecord = asRecord(root.exData);
  if (exDataRecord) {
    const exDataItems = asArray(exDataRecord.items);
    if (exDataItems.length > 0) {
      return exDataItems;
    }
  }

  return [];
};

const mapMarket = (raw: unknown): MarketRow | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asNumber(row.id);
  if (!id) return null;

  return {
    id,
    name: asString(row.name, 'Untitled Market'),
    desc: asString(row.desc, ''),
    address: asString(row.address, ''),
    location: asString(row.location, ''),
    first_num: asString(row.first_num, ''),
    second_num: asString(row.second_num, ''),
    whats_app: asString(row.whats_app, ''),
    infoMessage: asString(row.infoMessage, ''),
    logoUrl: asString(row.logoUrl, ''),
    coverImgUrl: asString(row.coverImgUrl, ''),
    isActive: asBoolean(row.isActive, false),
    createdAt: asString(row.createdAt, ''),
    users: toOwner(row.users),
    marketCategory: toCategory(row.marketCategory),
  };
};

const mapProductCategory = (raw: unknown): ProductCategoryRow | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asNumber(row.id);
  if (!id) return null;

  return {
    id,
    name: asString(row.name, `Category ${id}`),
    isActive: asBoolean(row.isActive, true),
  };
};

const getOwnerName = (owner: MarketOwner | null): string => {
  if (!owner) return 'Unknown owner';
  const fullName = `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  if (owner.name?.trim()) return owner.name;
  return 'Unknown owner';
};

const getCategoryName = (category: MarketCategory | null): string => {
  if (!category) return 'Uncategorized';
  if (category.name?.trim()) return category.name;
  return 'Uncategorized';
};

const formatDateTime = (value: string): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const normalizeImageUrl = (url?: string | null): string => {
  if (!url) return '';
  const cleanedUrl = url.replace(/\\/g, '/').trim();
  if (!cleanedUrl) return '';
  if (cleanedUrl.startsWith('data:')) return cleanedUrl;
  if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;

  const normalizedPath = cleanedUrl.replace(/^\/+/, '');
  if (!normalizedPath) return '';

  return `${baseURL}/uploads/${normalizedPath}`;
};

const getMarketStatusClasses = (isActive: boolean): string => {
  if (isActive) {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }
  return 'bg-red-50 text-red-700 ring-1 ring-red-200';
};

const getApiErrorMessage = (error: any, fallback: string): string => {
  const data = error?.response?.data;
  const exData = data?.exData;

  if (exData && typeof exData === 'object' && !Array.isArray(exData)) {
    const firstDetail = Object.values(exData).find((value) => String(value || '').trim());
    if (firstDetail) return String(firstDetail);
  }

  if (typeof exData === 'string' && exData.trim()) return exData.trim();
  if (typeof data?.desc === 'string' && data.desc.trim()) return data.desc.trim();
  if (typeof data?.message === 'string' && data.message.trim() && data.message !== 'Error') return data.message.trim();
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
  return fallback;
};

const isExternalUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

const getMapHref = (location: string, address: string): { href: string; label: string } | null => {
  const trimmedLocation = location.trim();
  if (trimmedLocation) {
    return {
      href: isExternalUrl(trimmedLocation)
        ? trimmedLocation
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedLocation)}`,
      label: 'Open map',
    };
  }

  const trimmedAddress = address.trim();
  if (!trimmedAddress) return null;

  return {
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedAddress)}`,
    label: 'Search address on map',
  };
};

const renderMissingValue = (value: string): string => value.trim() || '-';

const getCustomSelectStyles = () => ({
  control: (base: any, state: any) => ({
    ...base,
    padding: '0.15rem 0.25rem',
    borderWidth: '2px',
    minHeight: '48px',
    borderColor: state.isFocused ? '#F59B0F' : '#D1D5DB',
    borderRadius: '0.5rem',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.2)' : 'none',
    '&:hover': {
      borderColor: '#FCD34D',
    },
    transition: 'all 0.2s',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
  }),
  menu: (base: any) => ({
    ...base,
    zIndex: 25,
  }),
});

function MarketsDirectory() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [marketCategories, setMarketCategories] = useState<MarketCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [categoriesError, setCategoriesError] = useState<string>('');
  const [pageNumber, setPageNumber] = useState(0);
  const [countPerPage, setCountPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [marketCategoryFilter, setMarketCategoryFilter] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedMarket, setSelectedMarket] = useState<MarketRow | null>(null);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const canManageMarketCatalog = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.MARKET_CATEGORIES), []);
  const [coverImageFailures, setCoverImageFailures] = useState<Record<number, boolean>>({});
  const [logoImageFailures, setLogoImageFailures] = useState<Record<number, boolean>>({});
  const [updatingMarketIds, setUpdatingMarketIds] = useState<Record<number, boolean>>({});
  const [marketStatusError, setMarketStatusError] = useState<string>('');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedMarketForStatus, setSelectedMarketForStatus] = useState<MarketRow | null>(null);
  const [infoMessage, setInfoMessage] = useState<string>('');

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / countPerPage)),
    [totalCount, countPerPage],
  );

  const pageSizeOptions = useMemo<SelectOption<number>[]>(
    () => [
      { value: 10, label: '10' },
      { value: 20, label: '20' },
      { value: 50, label: '50' },
    ],
    [],
  );

  const marketCategoryOptions = useMemo<SelectOption<number>[]>(
    () => [
      { value: 0, label: 'All categories' },
      ...marketCategories.map((category) => ({
        value: category.id,
        label: category.name?.trim() ? category.name : `Category #${category.id}`,
      })),
    ],
    [marketCategories],
  );

  const activeFilterOptions = useMemo<SelectOption<'all' | 'active' | 'inactive'>[]>(
    () => [
      { value: 'all', label: 'All statuses' },
      { value: 'active', label: 'Active only' },
      { value: 'inactive', label: 'Inactive only' },
    ],
    [],
  );

  const resolvedIsActive = useMemo(() => {
    if (activeFilter === 'active') return true;
    if (activeFilter === 'inactive') return false;
    return null;
  }, [activeFilter]);

  const activeMarketsOnPage = useMemo(
    () => markets.filter((market) => market.isActive).length,
    [markets],
  );

  const inactiveMarketsOnPage = useMemo(
    () => markets.filter((market) => !market.isActive).length,
    [markets],
  );

  const currentCategoryLabel = useMemo(() => {
    if (marketCategoryFilter === 0) return 'All categories';
    const matched = marketCategories.find((category) => category.id === marketCategoryFilter);
    if (!matched) return `Category #${marketCategoryFilter}`;
    return matched.name?.trim() ? matched.name : `Category #${matched.id}`;
  }, [marketCategoryFilter, marketCategories]);

  const showingRange = useMemo(() => {
    if (totalCount === 0 || markets.length === 0) {
      return { from: 0, to: 0 };
    }

    const from = pageNumber * countPerPage + 1;
    const to = Math.min(totalCount, pageNumber * countPerPage + markets.length);
    return { from, to };
  }, [countPerPage, markets.length, pageNumber, totalCount]);

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];

    if (search.trim()) {
      chips.push({
        label: `Search: "${search.trim()}"`,
        onRemove: () => {
          setSearch('');
          setPageNumber(0);
        },
      });
    }

    if (marketCategoryFilter !== 0) {
      chips.push({
        label: `Category: ${currentCategoryLabel}`,
        onRemove: () => {
          setMarketCategoryFilter(0);
          setPageNumber(0);
        },
      });
    }

    if (activeFilter !== 'all') {
      chips.push({
        label: `Status: ${activeFilter === 'active' ? 'Active only' : 'Inactive only'}`,
        onRemove: () => {
          setActiveFilter('all');
          setPageNumber(0);
        },
      });
    }

    return chips;
  }, [activeFilter, currentCategoryLabel, marketCategoryFilter, search]);

  const loadMarkets = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await axiosInstance.post<MarketsApiResponse>('/markets/get-markets', {
        pageNumber,
        countPerPage,
        marketCategoryId: marketCategoryFilter || null,
        marketId: null,
        userId: null,
        isActive: resolvedIsActive,
        search: search.trim(),
      });

      const { items, totalCount: backendTotalCount } = extractItemsAndTotal(response.data);
      const mappedRows = items.map(mapMarket).filter((item): item is MarketRow => item !== null);

      const userIdsToResolve = Array.from(
        new Set(
          mappedRows
            .map((market) => market.users?.id)
            .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0),
        ),
      );

      const userEntries = await Promise.all(
        userIdsToResolve.map(async (id) => {
          try {
            const userResponse = await axiosInstance.get('/users/get-user-by-id', { params: { id } });
            const userRecord = extractResponseRecord(userResponse.data);
            return [id, toOwner(userRecord)] as const;
          } catch (lookupError) {
            console.warn(`Failed to load user ${id}:`, lookupError);
            return [id, null] as const;
          }
        }),
      );

      const usersById = new Map<number, MarketOwner>(
        userEntries
          .filter((entry): entry is readonly [number, MarketOwner] => entry[1] !== null)
          .map(([id, owner]) => [id, owner]),
      );

      const categoriesById = new Map<number, MarketCategory>(
        marketCategories.map((category) => [category.id, category]),
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

      setMarkets(enrichedRows);
      setTotalCount(backendTotalCount || enrichedRows.length);
    } catch (error: any) {
      setMarkets([]);
      setTotalCount(0);
      setLoadError(error?.response?.data?.desc || error?.message || 'Failed to load markets.');
    } finally {
      setIsLoading(false);
    }
  }, [pageNumber, countPerPage, marketCategoryFilter, resolvedIsActive, search, marketCategories]);

  const selectedMarketMapLink = useMemo(
    () => (selectedMarket ? getMapHref(selectedMarket.location, selectedMarket.address) : null),
    [selectedMarket],
  );

  const loadMarketCategories = useCallback(async () => {
    setCategoriesError('');

    try {
      const response = await axiosInstance.get<MarketCategoriesApiResponse>('/markets/get-market-categories');
      const categories = extractCategories(response.data);
      setMarketCategories(categories);
    } catch (error: any) {
      setMarketCategories([]);
      setCategoriesError(error?.response?.data?.desc || error?.message || 'Failed to load market categories.');
    }
  }, []);

  const toggleMarketStatus = useCallback(async (market: MarketRow, isActive: boolean) => {
    const actionText = isActive ? 'activate' : 'deactivate';
    const result = await Swal.fire({
      icon: 'question',
      title: `Confirm ${actionText}`,
      text: `Are you sure you want to ${actionText} "${market.name}"?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setUpdatingMarketIds((prev) => ({ ...prev, [market.id]: true }));
    setMarketStatusError('');

    try {
      await axiosInstance.post('/markets/update-market-status-info', {
        id: market.id,
        isActive,
        infoMessage: market.infoMessage || '',
      });
      setMarkets((prev) =>
        prev.map((row) =>
          row.id === market.id
            ? { ...row, isActive }
            : row,
        ),
      );
      setSelectedMarket((prev) => (prev?.id === market.id ? { ...prev, isActive } : prev));
      Swal.fire({
        icon: 'success',
        title: 'Market status updated',
        text: `"${market.name}" has been ${isActive ? 'activated' : 'deactivated'}.`,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Failed to update market status.');
      setMarketStatusError(message);
      Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: message,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3500,
      });
    } finally {
      setUpdatingMarketIds((prev) => ({ ...prev, [market.id]: false }));
    }
  }, []);

  const updateMarketInfoMessage = useCallback(async () => {
    if (!selectedMarketForStatus) return;

    setUpdatingMarketIds((prev) => ({ ...prev, [selectedMarketForStatus.id]: true }));
    setMarketStatusError('');

    try {
      await axiosInstance.post('/markets/update-market-status-info', {
        id: selectedMarketForStatus.id,
        isActive: selectedMarketForStatus.isActive,
        infoMessage,
      });
      setMarkets((prev) =>
        prev.map((market) =>
          market.id === selectedMarketForStatus.id
            ? { ...market, infoMessage }
            : market,
        ),
      );
      setSelectedMarket((prev) =>
        prev?.id === selectedMarketForStatus.id ? { ...prev, infoMessage } : prev,
      );
      setIsStatusModalOpen(false);
      setSelectedMarketForStatus(null);
      setInfoMessage('');
      Swal.fire({
        icon: 'success',
        title: 'Info message saved',
        text: 'Market notice has been updated.',
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Failed to update info message.');
      setMarketStatusError(message);
      Swal.fire({
        icon: 'error',
        title: 'Save failed',
        text: message,
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3500,
      });
    } finally {
      setUpdatingMarketIds((prev) => ({ ...prev, [selectedMarketForStatus.id]: false }));
    }
  }, [selectedMarketForStatus, infoMessage]);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    setCoverImageFailures({});
    setLogoImageFailures({});
  }, [markets]);

  useEffect(() => {
    void loadMarketCategories();
  }, [loadMarketCategories]);

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setMarketCategoryFilter(0);
    setActiveFilter('all');
    setPageNumber(0);
  }, []);

  const refreshSelectedWorkspace = useCallback(() => {
    void loadMarkets();
    setCatalogRefreshKey((prev) => prev + 1);
  }, [loadMarkets]);

  const openStatusModal = useCallback((market: MarketRow) => {
    setSelectedMarketForStatus(market);
    setIsStatusModalOpen(true);
    setInfoMessage(market.infoMessage || '');
  }, []);

  const closeStatusModal = useCallback(() => {
    setIsStatusModalOpen(false);
    setSelectedMarketForStatus(null);
    setInfoMessage('');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            Markets Directory
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Explore all markets, manage category availability, and review ownership details in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Markets</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{totalCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#F59B0F] to-[#D17F0A] flex items-center justify-center shadow-lg shadow-orange-500/30">
                <BuildingStorefrontIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Active On Page</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{activeMarketsOnPage}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Inactive On Page</p>
                <p className="text-3xl font-black text-red-700 mt-1">{inactiveMarketsOnPage}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <XCircleIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPageNumber(0);
              }}
              placeholder="Search by market name, owner, description, or location..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm md:text-base"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select<SelectOption<number>, false>
              value={marketCategoryOptions.find((option) => option.value === marketCategoryFilter) ?? marketCategoryOptions[0]}
              onChange={(option) => {
                setMarketCategoryFilter(option ? option.value : 0);
                setPageNumber(0);
              }}
              options={marketCategoryOptions}
              styles={getCustomSelectStyles()}
              className="react-select-container"
              classNamePrefix="react-select"
            />

            <Select<SelectOption<'all' | 'active' | 'inactive'>, false>
              value={activeFilterOptions.find((option) => option.value === activeFilter) ?? activeFilterOptions[0]}
              onChange={(option) => {
                setActiveFilter(option ? option.value : 'all');
                setPageNumber(0);
              }}
              options={activeFilterOptions}
              styles={getCustomSelectStyles()}
              className="react-select-container"
              classNamePrefix="react-select"
            />

            <button
              type="button"
              onClick={handleResetFilters}
              className="h-12 px-4 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg inline-flex items-center justify-center transition-all"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Reset Filters
            </button>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                  Active:
                </span>
                {activeFilterChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 ring-1 ring-orange-200"
                  >
                    {chip.label}
                    <button
                      type="button"
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

          {categoriesError && (
            <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm font-medium">
              {categoriesError}
            </div>
          )}
        </div>

        {loadError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {loadError}
          </div>
        )}

        {marketStatusError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {marketStatusError}
          </div>
        )}

        <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700">
              {isLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                <>
                  Showing{' '}
                  <span className="font-bold text-gray-900">{showingRange.from}</span>{' '}
                  to{' '}
                  <span className="font-bold text-gray-900">{showingRange.to}</span>{' '}
                  of{' '}
                  <span className="font-bold text-gray-900">{totalCount}</span>{' '}
                  markets
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Per page:</span>
                <div className="w-28 sm:w-32">
                  <CreatableSelect<SelectOption<number>, false>
                    value={pageSizeOptions.find((option) => option.value === countPerPage) ?? { value: countPerPage, label: String(countPerPage) }}
                    onChange={(option) => {
                      const nextCountPerPage = option ? option.value : 10;
                      setCountPerPage(nextCountPerPage);
                      setPageNumber(0);
                    }}
                    onCreateOption={(inputValue) => {
                      const nextCountPerPage = Number(inputValue.trim());
                      if (!Number.isInteger(nextCountPerPage) || nextCountPerPage <= 0) return;
                      setCountPerPage(nextCountPerPage);
                      setPageNumber(0);
                    }}
                    isValidNewOption={(inputValue) => {
                      const nextCountPerPage = Number(inputValue.trim());
                      if (!Number.isInteger(nextCountPerPage) || nextCountPerPage <= 0) return false;
                      return !pageSizeOptions.some((option) => option.value === nextCountPerPage);
                    }}
                    formatCreateLabel={(inputValue) => `Use ${inputValue} rows`}
                    options={pageSizeOptions}
                    styles={getCustomSelectStyles()}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    instanceId="markets-directory-page-size"
                    aria-label="Per page"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadMarkets()}
                disabled={isLoading}
                className="h-12 px-4 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-60 inline-flex items-center gap-2"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPageNumber((prev) => Math.max(0, prev - 1))}
                  disabled={pageNumber === 0 || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                  title="Previous page"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                  {pageNumber + 1} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPageNumber((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
                  disabled={pageNumber + 1 >= totalPages || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                  title="Next page"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                  <BuildingStorefrontIcon className="w-10 h-10 text-[#F59B0F]" />
                </div>
                <p className="text-xl font-black text-gray-900 mb-2">Loading market details...</p>
                <p className="text-gray-600">Please wait while we fetch the latest data</p>
              </div>
            </div>
          ) : markets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                  <BuildingStorefrontIcon className="w-10 h-10 text-[#F59B0F]" />
                </div>
                <p className="text-xl font-black text-gray-900 mb-2">No markets found</p>
                <p className="text-gray-600">Try adjusting filters or search keywords</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {markets.map((market) => {
                const isUpdatingMarket = updatingMarketIds[market.id] === true;
                const isSelected = selectedMarket?.id === market.id;
                const mapLink = getMapHref(market.location, market.address);
                return (
                  <div
                    key={market.id}
                    className={`group rounded-2xl border overflow-hidden bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ${isSelected ? 'border-[#F59B0F] ring-2 ring-orange-200' : 'border-gray-200'}`}
                  >
                  <div className="h-28 bg-linear-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {normalizeImageUrl(market.coverImgUrl) && !coverImageFailures[market.id] ? (
                      <img
                        src={normalizeImageUrl(market.coverImgUrl)}
                        alt={market.name}
                        loading="lazy"
                        onError={() => {
                          setCoverImageFailures((prev) => ({ ...prev, [market.id]: true }));
                        }}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No cover image</div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3 z-10">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getMarketStatusClasses(market.isActive)}`}
                      >
                        {market.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex gap-3 items-start mb-3">
                      <div className="w-12 h-12 rounded-xl border border-gray-200 bg-orange-50 overflow-hidden shrink-0 shadow-sm">
                        {normalizeImageUrl(market.logoUrl) && !logoImageFailures[market.id] ? (
                          <img
                            src={normalizeImageUrl(market.logoUrl)}
                            alt={market.name}
                            loading="lazy"
                            onError={() => {
                              setLogoImageFailures((prev) => ({ ...prev, [market.id]: true }));
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BuildingStorefrontIcon className="w-6 h-6 text-[#F59B0F]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-base font-bold text-gray-900 line-clamp-2">{market.name}</h2>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">
                          {getCategoryName(market.marketCategory)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide mb-0.5">Market Owner</p>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{getOwnerName(market.users)}</p>
                      {market.users?.email && (
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{market.users.email}</p>
                      )}
                    </div>

                    {mapLink && (
                      <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                        <p className="text-[11px] text-amber-600 font-semibold uppercase tracking-wide mb-1">Map Location</p>
                        <a
                          href={mapLink.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-900 hover:underline transition-colors"
                        >
                          <MapPinIcon className="w-3.5 h-3.5" />
                          {mapLink.label}
                          <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    <div className="mb-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wide mb-0.5">Created</p>
                      <p className="text-xs font-medium text-gray-900 line-clamp-1">{formatDateTime(market.createdAt)}</p>
                    </div>

                    {market.desc && (
                      <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wide mb-1">About</p>
                        <p className="text-xs text-gray-700 line-clamp-2 whitespace-pre-wrap">{market.desc}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/deliverYya-cloud-console/markets/${market.id}`)}
                      className="mt-3 w-full h-10 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white text-sm font-semibold hover:shadow-lg transition-all"
                    >
                      Open Workspace
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleMarketStatus(market, !market.isActive)}
                      disabled={isUpdatingMarket}
                      className="mt-2 w-full h-10 rounded-xl border-2 border-gray-300 bg-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:border-orange-300 hover:bg-orange-50"
                    >
                      {isUpdatingMarket ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Updating...
                        </span>
                      ) : market.isActive ? (
                        'Deactivate Market'
                      ) : (
                        'Activate Market'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openStatusModal(market)}
                      className="mt-2 w-full h-10 rounded-xl border-2 border-gray-300 bg-white text-gray-700 text-sm font-semibold transition-all hover:border-orange-300 hover:bg-orange-50"
                    >
                      Add Info Message
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      {selectedMarket ? (
        <section className="mt-8 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="relative h-52 bg-gray-100 sm:h-64">
            {normalizeImageUrl(selectedMarket.coverImgUrl) && !coverImageFailures[selectedMarket.id] ? (
              <img
                src={normalizeImageUrl(selectedMarket.coverImgUrl)}
                alt={`${selectedMarket.name} cover`}
                className="h-full w-full object-cover"
                onError={() => setCoverImageFailures((prev) => ({ ...prev, [selectedMarket.id]: true }))}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-orange-50 to-amber-100 text-sm font-semibold text-orange-700">
                No cover image
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-orange-50 shadow-lg sm:h-24 sm:w-24">
                    {normalizeImageUrl(selectedMarket.logoUrl) && !logoImageFailures[selectedMarket.id] ? (
                      <img
                        src={normalizeImageUrl(selectedMarket.logoUrl)}
                        alt={`${selectedMarket.name} logo`}
                        className="h-full w-full object-cover"
                        onError={() => setLogoImageFailures((prev) => ({ ...prev, [selectedMarket.id]: true }))}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BuildingStorefrontIcon className="h-10 w-10 text-[#F59B0F]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 pb-1 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Selected Market</p>
                    <h2 className="mt-1 text-2xl font-black sm:text-3xl">{selectedMarket.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getMarketStatusClasses(selectedMarket.isActive)}`}>
                        {selectedMarket.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                        {getCategoryName(selectedMarket.marketCategory)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('selected-market-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-[#AC6C2A] shadow-sm transition hover:bg-orange-50"
                  >
                    <WrenchScrewdriverIcon className="h-4 w-4" />
                    Manage Categories, Brands & Products
                  </button>
                  <button
                    type="button"
                    onClick={() => refreshSelectedWorkspace()}
                    disabled={isLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/20 px-3 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/30 disabled:opacity-60"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Market Data
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                    <EnvelopeIcon className="h-4 w-4" />
                    Owner
                  </div>
                  <p className="mt-2 text-sm font-black text-gray-900">{getOwnerName(selectedMarket.users)}</p>
                  <p className="mt-1 break-all text-xs font-semibold text-gray-600">{selectedMarket.users?.email || '-'}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                    <ClipboardDocumentListIcon className="h-4 w-4" />
                    Created
                  </div>
                  <p className="mt-2 text-sm font-black text-gray-900">{formatDateTime(selectedMarket.createdAt)}</p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <CheckCircleIcon className="h-4 w-4" />
                    Status
                  </div>
                  <p className="mt-2 text-sm font-black text-gray-900">{selectedMarket.isActive ? 'Active Market' : 'Inactive Market'}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    <HomeIcon className="h-4 w-4" />
                    Physical Address
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-gray-800 whitespace-pre-wrap">
                    {renderMissingValue(selectedMarket.address)}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                    <MapPinIcon className="h-4 w-4" />
                    Google Map Location
                  </div>
                  <p className="mt-2 break-all text-sm font-semibold leading-6 text-gray-800">
                    {renderMissingValue(selectedMarket.location)}
                  </p>
                  {selectedMarketMapLink && (
                    <a
                      href={selectedMarketMapLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      {selectedMarketMapLink.label}
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                    <PhoneIcon className="h-4 w-4" />
                    Primary Phone
                  </div>
                  <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(selectedMarket.first_num)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                    <PhoneIcon className="h-4 w-4" />
                    Secondary Phone
                  </div>
                  <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(selectedMarket.second_num)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    WhatsApp
                  </div>
                  <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(selectedMarket.whats_app)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <InformationCircleIcon className="h-4 w-4" />
                  Market Description
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                  {renderMissingValue(selectedMarket.desc)}
                </p>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Info Message</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-orange-950 whitespace-pre-wrap">
                  {renderMissingValue(selectedMarket.infoMessage)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Actions</p>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleMarketStatus(selectedMarket, !selectedMarket.isActive)}
                    disabled={updatingMarketIds[selectedMarket.id] === true}
                    className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60"
                  >
                    {updatingMarketIds[selectedMarket.id] === true
                      ? 'Updating...'
                      : selectedMarket.isActive
                        ? 'Deactivate Market'
                        : 'Activate Market'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openStatusModal(selectedMarket)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50"
                  >
                    Update Info Message
                  </button>
                  {canManageMarketCatalog && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('selected-market-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-3 text-sm font-bold text-white transition hover:shadow-lg"
                    >
                      Manage Categories, Brands & Products
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={refreshSelectedWorkspace}
                    disabled={isLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Market Data
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {canManageMarketCatalog && (
            <div id="selected-market-catalog" className="border-t border-orange-100 bg-gray-50 p-4 sm:p-6">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Catalog Workspace</p>
                <h3 className="mt-1 text-xl font-black text-gray-900">Categories, Brands & Products</h3>
              </div>
              <CategoryBrandsManager
                key={`${selectedMarket.id}-${catalogRefreshKey}`}
                marketIdOverride={selectedMarket.id}
              />
            </div>
          )}
        </section>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
          <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-[#F59B0F]" />
          <p className="mt-3 text-lg font-black text-gray-900">Select a market to open its workspace</p>
          <p className="mt-1 text-sm text-gray-500">Market details, catalog management, stocks, and feedback will appear here.</p>
        </div>
      )}

      {isStatusModalOpen && selectedMarketForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={closeStatusModal}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">Update Info Message</h3>
              <button
                type="button"
                onClick={closeStatusModal}
                aria-label="Close"
                title="Close"
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-700 font-medium mb-1">Market</p>
                <p className="text-base font-bold text-gray-900">{selectedMarketForStatus.name}</p>
              </div>

              <div>
                <label htmlFor="infoMessage" className="block text-sm text-gray-700 font-medium mb-2">
                  Info Message
                </label>
                <textarea
                  id="infoMessage"
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value)}
                  placeholder="Enter a message..."
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeStatusModal}
                  className="flex-1 h-10 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void updateMarketInfoMessage()}
                  disabled={updatingMarketIds[selectedMarketForStatus.id] === true}
                  className="flex-1 h-10 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {updatingMarketIds[selectedMarketForStatus.id] === true ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Message'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketsDirectory;
