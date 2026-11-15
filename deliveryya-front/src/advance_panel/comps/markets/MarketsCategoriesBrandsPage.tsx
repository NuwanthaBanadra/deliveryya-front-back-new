import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Select from 'react-select';
import CategoryBrandsManager from '../my_market/category_brands';
import axiosInstance from '../../../util/AxiosUtil';

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type MarketRow = {
  id: number;
  name: string;
};

type MarketsApiResponse = {
  object?: unknown;
  exData?: unknown;
  message?: string;
  desc?: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
};

const extractItems = (raw: unknown): unknown[] => {
  const root = asRecord(raw);
  if (!root) return [];

  const object = root.object ?? root.exData ?? root;
  if (Array.isArray(object)) return object;

  const objectRecord = asRecord(object);
  if (!objectRecord) return [];
  return asArray(objectRecord.items);
};

const mapMarket = (raw: unknown): MarketRow | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asNumber(row.id);
  if (!id) return null;
  return {
    id,
    name: asString(row.name, `Market #${id}`),
  };
};

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '48px',
    borderRadius: '0.75rem',
    borderWidth: '2px',
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.15)' : 'none',
    '&:hover': { borderColor: '#FCD34D' },
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
  }),
};

function MarketsCategoriesBrandsPage() {
  const location = useLocation();
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [loadError, setLoadError] = useState('');

  const selectedMarketFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const parsed = Number(params.get('marketId') || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [location.search]);

  const marketOptions = useMemo<SelectOption<number>[]>(
    () => markets.map((market) => ({ value: market.id, label: market.name })),
    [markets],
  );

  const loadMarkets = useCallback(async () => {
    setIsLoadingMarkets(true);
    setLoadError('');

    try {
      const response = await axiosInstance.post<MarketsApiResponse>('/markets/get-markets', {
        pageNumber: 0,
        countPerPage: 100,
        marketCategoryId: null,
        marketId: null,
        userId: null,
        isActive: null,
        search: '',
      });

      const items = extractItems(response.data);
      const mappedMarkets = items.map(mapMarket).filter((item): item is MarketRow => item !== null);
      setMarkets(mappedMarkets);

      setSelectedMarketId((current) => current ?? (mappedMarkets[0]?.id ?? null));
    } catch (error: any) {
      setMarkets([]);
      setLoadError(error?.response?.data?.desc || error?.message || 'Failed to load markets.');
    } finally {
      setIsLoadingMarkets(false);
    }
  }, []);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    if (selectedMarketFromQuery) {
      setSelectedMarketId(selectedMarketFromQuery);
    }
  }, [selectedMarketFromQuery]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
              Categories, Brands & Products
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Choose a market to manage its categories, brand lists, and related products.
            </p>
          </div>

          <div className="w-full sm:w-80">
            <Select<SelectOption<number>, false>
              value={marketOptions.find((option) => option.value === selectedMarketId) ?? null}
              onChange={(option) => setSelectedMarketId(option ? option.value : null)}
              options={marketOptions}
              styles={selectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              isDisabled={isLoadingMarkets}
              placeholder={isLoadingMarkets ? 'Loading markets...' : 'Select a market'}
            />
          </div>
        </div>

        {loadError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {loadError}
          </div>
        )}
      </div>

      {selectedMarketId ? (
        <CategoryBrandsManager marketIdOverride={selectedMarketId} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
          No market selected.
        </div>
      )}
    </div>
  );
}

export default MarketsCategoriesBrandsPage;