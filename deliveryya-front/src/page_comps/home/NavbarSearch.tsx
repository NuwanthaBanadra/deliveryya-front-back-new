import { useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { FaSearch, FaStore } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { MdTaskAlt, MdTrackChanges } from 'react-icons/md';
import { TbTruckDelivery } from 'react-icons/tb';
import axiosInstance, { baseURL } from '../../util/AxiosUtil';
import { debounce } from '../../util/DebounceUtil';
import { normalizeProductImageUrl, type ApiProduct } from '../store/productFeedUtils';

type ApiMarket = {
    id: number;
    name: string;
    desc?: string;
    infoMessage?: string;
    logoUrl?: string;
    coverImgUrl?: string;
    marketCategory?: {
        id: number;
        name: string;
    } | null;
};

type PagedResponse<T> = {
    object?: { items?: T[] } | T[];
    exData?: { items?: T[] } | T[];
};

type NavbarSearchSuggestion = {
    id: number | string;
    type: 'product' | 'market' | 'service';
    label: string;
    description: string;
    href: string;
    imageUrl?: string;
    icon?: ReactNode;
};

type NavbarSearchProps = {
    compact?: boolean;
    onNavigate?: () => void;
};

const serviceSuggestions: NavbarSearchSuggestion[] = [
    {
        id: 'store',
        type: 'service',
        label: 'Our Store',
        description: 'Shop products from local markets or become a seller.',
        href: '/services#markets-service',
        icon: <FaStore className="h-5 w-5" />,
    },
    {
        id: 'delivery',
        type: 'service',
        label: 'DeliveryYa Delivery Service',
        description: 'Flexible delivery support for parcels, store orders, and customer requests.',
        href: '/services#delivery-service',
        icon: <TbTruckDelivery className="h-5 w-5" />,
    },
    {
        id: 'urgent-job',
        type: 'service',
        label: 'Urgent Job Facility',
        description: 'Create pickup, errand, drop-off, and custom task requests.',
        href: '/services#urgent-jobs-service',
        icon: <MdTaskAlt className="h-5 w-5" />,
    },
    {
        id: 'tracking',
        type: 'service',
        label: 'Live Order Tracking',
        description: 'Track supported orders with live Google Maps visibility.',
        href: '/services#delivery-service',
        icon: <MdTrackChanges className="h-5 w-5" />,
    },
];

const extractResponseItems = <T,>(response: PagedResponse<T>): T[] => {
    if (Array.isArray(response.object)) return response.object;
    if (Array.isArray(response.exData)) return response.exData;
    return response.object?.items ?? response.exData?.items ?? [];
};

const normalizeMarketImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${baseURL}/uploads${url}`;
    return `${baseURL}/uploads/${url}`;
};

const NavbarSearch = ({ compact = false, onNavigate }: NavbarSearchProps) => {
    const navigate = useNavigate();
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<NavbarSearchSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const requestIdRef = useRef(0);

    const fetchSuggestions = useMemo(
        () =>
            debounce(async (query: string) => {
                const normalizedQuery = query.trim();
                const requestId = requestIdRef.current + 1;
                requestIdRef.current = requestId;

                if (!normalizedQuery) {
                    setSuggestions([]);
                    setIsLoading(false);
                    setError('');
                    setHasSearched(false);
                    return;
                }

                setIsLoading(true);
                setError('');

                const serviceMatches = serviceSuggestions.filter((service) => {
                    const haystack = `${service.label} ${service.description}`.toLowerCase();
                    return haystack.includes(normalizedQuery.toLowerCase());
                });

                try {
                    const [productsResponse, marketsResponse] = await Promise.all([
                        axiosInstance.post<PagedResponse<ApiProduct>>('/products/get-products', {
                            pageNumber: 0,
                            countPerPage: 4,
                            totalCount: 0,
                            totalPages: 0,
                            getActiveStocksCount: true,
                            getProductPriceAsStocks: 'Middle',
                            search: normalizedQuery,
                            DEFAULT_GET_PRODUCT_PRICE_AS_STOCKS: 'Middle',
                        }),
                        axiosInstance.post<PagedResponse<ApiMarket>>('/markets/get-markets', {
                            pageNumber: 0,
                            countPerPage: 4,
                            isActive: true,
                            search: normalizedQuery,
                            items: [],
                        }),
                    ]);

                    const productSuggestions = extractResponseItems(productsResponse.data).map((product) => ({
                        id: product.id,
                        type: 'product' as const,
                        label: product.name?.trim() || 'Untitled Product',
                        description: product.category?.name || product.brand?.name || 'Product',
                        imageUrl: normalizeProductImageUrl(
                            product.productImages?.find((image) => image.isDefault)?.imageUrl
                            || product.productImages?.find((image) => image.isDefault)?.url
                            || product.productImages?.[0]?.imageUrl
                            || product.productImages?.[0]?.url
                        ),
                        href: `/product-details/${product.id}`,
                    }));

                    const marketSuggestions = extractResponseItems(marketsResponse.data).map((market) => ({
                        id: market.id,
                        type: 'market' as const,
                        label: market.name?.trim() || 'Untitled Market',
                        description: market.marketCategory?.name || market.desc || market.infoMessage || 'Market',
                        imageUrl: normalizeMarketImageUrl(market.coverImgUrl || market.logoUrl),
                        href: `/market/${market.id}`,
                    }));

                    if (requestId === requestIdRef.current) {
                        setSuggestions([...serviceMatches, ...productSuggestions, ...marketSuggestions]);
                    }
                } catch (err) {
                    console.error('Failed to load navbar search suggestions:', err);
                    if (requestId === requestIdRef.current) {
                        setSuggestions(serviceMatches);
                        setError(serviceMatches.length ? '' : 'Unable to load search results right now.');
                    }
                } finally {
                    if (requestId === requestIdRef.current) {
                        setIsLoading(false);
                        setHasSearched(true);
                    }
                }
            }, 250),
        []
    );

    const handleNavigate = (href: string) => {
        setIsDropdownOpen(false);
        setInputValue('');
        setSuggestions([]);
        onNavigate?.();
        navigate(href);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = inputValue.trim();
        if (!query) return;

        const matchingService = serviceSuggestions.find((service) => {
            const haystack = `${service.label} ${service.description}`.toLowerCase();
            return haystack.includes(query.toLowerCase());
        });

        if (matchingService) {
            handleNavigate(matchingService.href);
            return;
        }

        const search = `?${createSearchParams({ search: query }).toString()}`;
        handleNavigate(`/all-products${search}`);
    };

    const hasQuery = inputValue.trim().length > 0;
    const shouldShowDropdown = isDropdownOpen && hasQuery && (isLoading || Boolean(error) || hasSearched);

    return (
        <div className={compact ? 'w-full' : 'mx-auto max-w-4xl px-4 py-4'}>
            <div className="relative">
                <form onSubmit={handleSubmit}>
                    <FaSearch className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={inputValue}
                        onFocus={() => {
                            if (inputValue.trim()) setIsDropdownOpen(true);
                        }}
                        onChange={(event) => {
                            const value = event.target.value;
                            setInputValue(value);
                            setIsDropdownOpen(true);
                            void fetchSuggestions(value);
                        }}
                        placeholder="Search products, markets, and services..."
                        className={`w-full rounded-3xl border-2 border-gray-200 bg-white pl-14 pr-12 text-gray-800 outline-none transition-all focus:border-[#F59B0F] ${
                            compact ? 'py-3 text-sm shadow-sm' : 'py-3 shadow-lg'
                        }`}
                    />
                </form>

                {inputValue && (
                    <button
                        type="button"
                        onClick={() => {
                            setInputValue('');
                            setSuggestions([]);
                            setError('');
                            setHasSearched(false);
                            setIsDropdownOpen(false);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#F59B0F]"
                        aria-label="Clear search"
                    >
                        <IoClose className="h-5 w-5" />
                    </button>
                )}

                {shouldShowDropdown && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        {isLoading ? (
                            <div className="px-5 py-4 text-sm font-semibold text-gray-500">Searching...</div>
                        ) : error ? (
                            <div className="px-5 py-4 text-sm font-semibold text-red-500">{error}</div>
                        ) : suggestions.length === 0 ? (
                            <div className="px-5 py-4 text-sm font-semibold text-gray-500">No matching results found.</div>
                        ) : (
                            suggestions.map((suggestion) => (
                                <button
                                    key={`${suggestion.type}-${suggestion.id}`}
                                    type="button"
                                    onClick={() => handleNavigate(suggestion.href)}
                                    className="flex w-full items-center gap-4 border-b border-gray-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-orange-50"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50 text-[#F59B0F]">
                                        {suggestion.imageUrl ? (
                                            <img src={suggestion.imageUrl} alt={suggestion.label} className="h-full w-full object-cover" />
                                        ) : (
                                            suggestion.icon
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate font-bold text-gray-900">{suggestion.label}</p>
                                            <span className="rounded-full bg-[#FFF4EE] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#F59B0F]">
                                                {suggestion.type}
                                            </span>
                                        </div>
                                        <p className="truncate text-sm text-gray-500">{suggestion.description}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NavbarSearch;
