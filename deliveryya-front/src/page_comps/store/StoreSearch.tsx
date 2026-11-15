import { useEffect, useMemo, useRef, useState } from 'react'
import { createSearchParams, useNavigate, useSearchParams } from 'react-router-dom'
import { FaSearch } from 'react-icons/fa'
import { IoSearchSharp } from 'react-icons/io5'
import axiosInstance, { baseURL } from '../../util/AxiosUtil'
import { debounce } from '../../util/DebounceUtil'
import { normalizeProductImageUrl, type ApiProduct } from './productFeedUtils'

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

type SearchSuggestion = {
    id: number;
    type: 'product' | 'market';
    label: string;
    description: string;
    imageUrl: string;
    href: string;
};

const StoreSearch = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [inputValue, setInputValue] = useState(searchParams.get('search') ?? '')
    const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([])
    const [searchSuggestionsLoading, setSearchSuggestionsLoading] = useState(false)
    const [searchSuggestionsError, setSearchSuggestionsError] = useState<string | null>(null)
    const [hasSearched, setHasSearched] = useState(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const searchBoxRef = useRef<HTMLDivElement | null>(null)
    const suggestionRequestIdRef = useRef(0)

    const extractResponseItems = <T,>(response: PagedResponse<T>): T[] => {
        if (Array.isArray(response.object)) {
            return response.object
        }
        if (Array.isArray(response.exData)) {
            return response.exData
        }
        return response.object?.items ?? response.exData?.items ?? []
    }

    const normalizeMarketImageUrl = (url?: string | null) => {
        if (!url) {
            return 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80'
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
        }

        if (url.startsWith('/')) {
            return `${baseURL}/uploads${url}`
        }

        return `${baseURL}/uploads/${url}`
    }

    const fetchStoreSuggestions = useMemo(
        () =>
            debounce(async (query: string) => {
                const normalizedQuery = query.trim()
                const requestId = suggestionRequestIdRef.current + 1
                suggestionRequestIdRef.current = requestId

                if (!normalizedQuery) {
                    setSearchSuggestions([])
                    setSearchSuggestionsLoading(false)
                    setSearchSuggestionsError(null)
                    setHasSearched(false)
                    return
                }

                setSearchSuggestionsLoading(true)
                setSearchSuggestionsError(null)

                try {
                    const [productsResponse, marketsResponse] = await Promise.all([
                        axiosInstance.post<PagedResponse<ApiProduct>>('/products/get-products', {
                            pageNumber: 0,
                            countPerPage: 5,
                            totalCount: 0,
                            totalPages: 0,
                            getActiveStocksCount: true,
                            getProductPriceAsStocks: 'Middle',
                            search: normalizedQuery,
                            DEFAULT_GET_PRODUCT_PRICE_AS_STOCKS: 'Middle',
                        }),
                        axiosInstance.post<PagedResponse<ApiMarket>>('/markets/get-markets', {
                            pageNumber: 0,
                            countPerPage: 5,
                            isActive: true,
                            search: normalizedQuery,
                            items: [],
                        }),
                    ])

                    const productItems = extractResponseItems(productsResponse.data)
                    const marketItems = extractResponseItems(marketsResponse.data)

                    if (marketItems.length === 0) {
                        // Log markets response shape to help diagnose why markets aren't returned
                        // Useful during development; can be removed later
                        console.debug('StoreSearch: marketsResponse.data', marketsResponse.data)
                    }

                    const productSuggestions = productItems.map((product) => ({
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
                    }))

                    const marketSuggestions = marketItems.map((market) => ({
                        id: market.id,
                        type: 'market' as const,
                        label: market.name?.trim() || 'Untitled Market',
                        description: market.marketCategory?.name || market.desc || market.infoMessage || 'Market',
                        imageUrl: normalizeMarketImageUrl(market.coverImgUrl || market.logoUrl),
                        href: `/market/${market.id}`,
                    }))

                    if (requestId === suggestionRequestIdRef.current) {
                        setSearchSuggestions([...productSuggestions, ...marketSuggestions])
                    }
                } catch (error) {
                    console.error('Failed to load store suggestions:', error)
                    if (requestId === suggestionRequestIdRef.current) {
                        setSearchSuggestions([])
                        setSearchSuggestionsError('Failed to load results. Please try again.')
                    }
                } finally {
                    if (requestId === suggestionRequestIdRef.current) {
                        setSearchSuggestionsLoading(false)
                        setHasSearched(true)
                    }
                }
            }, 300),
        []
    )

    useEffect(() => {
        const queryFromUrl = searchParams.get('search') ?? ''
        setInputValue((currentValue) => (currentValue === queryFromUrl ? currentValue : queryFromUrl))
        if (queryFromUrl.trim()) {
            setIsDropdownOpen(true)
            void fetchStoreSuggestions(queryFromUrl)
        } else {
            setSearchSuggestions([])
            setSearchSuggestionsLoading(false)
            setSearchSuggestionsError(null)
            setHasSearched(false)
            setIsDropdownOpen(false)
        }
    }, [searchParams])

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null
            if (target && searchBoxRef.current && !searchBoxRef.current.contains(target)) {
                setIsDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handlePointerDown)

        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
        }
    }, [])

    const navigateToAllProductsSearch = (query: string) => {
        const trimmedQuery = query.trim()
        const search = trimmedQuery ? `?${createSearchParams({ search: trimmedQuery }).toString()}` : ''
        navigate({ pathname: '/all-products', search }, { state: { scrollToResults: true } })
    }

    const handleSuggestionClick = () => {
        const query = inputValue.trim()
        setIsDropdownOpen(false)
        setSearchSuggestions([])
        setSearchSuggestionsError(null)
        navigateToAllProductsSearch(query)
    }

    const hasQuery = inputValue.trim().length > 0
    const shouldShowDropdown = isDropdownOpen && hasQuery && (searchSuggestionsLoading || Boolean(searchSuggestionsError) || hasSearched)

    return (
        <section className="relative bg-white px-4 py-4">
            <div className="max-w-7xl mx-auto">
                <div className="max-w-4xl mx-auto relative">
                    <div ref={searchBoxRef} className="relative">
                        <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={inputValue}
                            onFocus={() => {
                                if (inputValue.trim()) {
                                    setIsDropdownOpen(true)
                                }
                            }}
                            onChange={(event) => {
                                const v = event.target.value
                                setInputValue(v)
                                setIsDropdownOpen(true)
                                void fetchStoreSuggestions(v)
                            }}
                            placeholder="Search products and markets..."
                            className="w-full rounded-3xl border-2 border-gray-200 bg-white py-3 pl-14 pr-12 text-gray-800 shadow-md outline-none transition-all focus:border-[#F59B0F]"
                        />
                        {inputValue && (
                            <button
                                type="button"
                                onClick={() => {
                                    setInputValue('')
                                    setSearchSuggestions([])
                                    setSearchSuggestionsError(null)
                                    setHasSearched(false)
                                    setIsDropdownOpen(false)
                                }}
                                aria-label="Clear search"
                                title="Clear search"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F59B0F] transition-colors"
                            >
                                <IoSearchSharp className="h-5 w-5" />
                            </button>
                        )}

                        {shouldShowDropdown && (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                                {searchSuggestionsLoading ? (
                                    <div className="px-5 py-4 text-sm font-semibold text-gray-500">Searching...</div>
                                ) : searchSuggestionsError ? (
                                    <div className="px-5 py-4 text-sm font-semibold text-red-500">{searchSuggestionsError}</div>
                                ) : searchSuggestions.length === 0 ? (
                                    <div className="px-5 py-4 text-sm font-semibold text-gray-500">No matching products or markets found.</div>
                                ) : (
                                    searchSuggestions.map((suggestion) => (
                                        <button
                                            key={`${suggestion.type}-${suggestion.id}`}
                                            type="button"
                                            onClick={handleSuggestionClick}
                                            className="flex w-full items-center gap-4 border-b border-gray-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-orange-50"
                                        >
                                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                                <img
                                                    src={suggestion.imageUrl}
                                                    alt={suggestion.label}
                                                    className="h-full w-full object-cover"
                                                />
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
            </div>
        </section>
    )
}

export default StoreSearch
