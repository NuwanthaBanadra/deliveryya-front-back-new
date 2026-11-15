import { useEffect, useMemo, useState } from "react";
import { BiGridAlt } from "react-icons/bi";
import { BsListUl } from "react-icons/bs";
import { FaArrowRight, FaFilter, FaSearch, FaStar, FaTimes } from "react-icons/fa";
import { MdStorefront } from "react-icons/md";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import AsyncSelect from "react-select/async";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../util/AxiosUtil";
import { addToCart, getCartItems } from "../../util/CartUtil";
import { parseCurrencyToNumber } from "../../util/CurrencyUtil";
import { swalAlert } from "../../util/SwalUtil";
import ProductCard, { type NewArrivalProduct } from "./ProductCard";
import {
    createGetProductsPayload,
    extractProductsPage,
    mapApiProductToCardProduct,
    type ApiProduct,
    type PagedResponse,
} from "./productFeedUtils";

interface Props {
    products?: boolean;
    productCount?: number;
    className?: string;
    showAllProductsBtn?: boolean;
    searchQuery?: string;
}

type SelectOption = {
    value: number | string;
    label: string;
};

type ProductPriceMode = "Lowest" | "Middle" | "Highest";

type ApiMarketCategory = {
    id: number;
    name: string;
};

type ApiMarket = {
    id: number;
    name: string;
    isActive?: boolean | null;
    marketCategory?: ApiMarketCategory | null;
};

type ApiCategory = {
    id: number;
    name: string;
    isActive?: boolean | null;
    markets?: { id: number } | null;
    marketId?: number | null;
};

type ApiBrand = {
    id: number;
    name: string;
    marketId?: number | null;
    isActive?: boolean | null;
};

type ListResponse<T> = {
    message?: string | null;
    object?: T[] | null;
    exData?: T[] | null;
};

type Product = Omit<NewArrivalProduct, "marketId"> & {
    id: number;
    title: string;
    price: string;
    img: string;
    rating: number;
    stockQty: number;
    categoryId: number;
    brandId: number;
    marketId: number | null;
    getActiveStocksCount?: boolean;
    isActive: boolean;
};

type BooleanFilters = {
    orderByTopSales: boolean;
    orderByMaxPrice: boolean;
    orderByLowPrice: boolean;
    trendingProducts: boolean;
};

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_PRICE_MODE: ProductPriceMode = "Middle";

const ratingOptions: SelectOption[] = [
    { value: 0, label: "Any rating" },
    { value: 5, label: "5 stars" },
    { value: 4, label: "4+ stars" },
    { value: 3, label: "3+ stars" },
    { value: 2, label: "2+ stars" },
    { value: 1, label: "1+ star" },
];

const priceModeOptions: SelectOption[] = [
    { value: "Lowest", label: "Lowest stock price" },
    { value: "Middle", label: "Middle stock price" },
    { value: "Highest", label: "Highest stock price" },
];

const selectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: state.isFocused ? "#FF6B35" : "#e5e7eb",
        boxShadow: state.isFocused ? "0 0 0 3px rgba(255, 107, 53, 0.12)" : "none",
        ":hover": {
            borderColor: "#FF6B35",
        },
    }),
    menu: (base) => ({
        ...base,
        zIndex: 50,
        borderRadius: 12,
        overflow: "hidden",
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? "#FF6B35" : state.isFocused ? "#FFF4EE" : "white",
        color: state.isSelected ? "white" : "#374151",
        fontWeight: state.isSelected ? 700 : 600,
    }),
};

const getResponseItems = <T,>(response: PagedResponse<T>): T[] => {
    return response.object?.items ?? response.exData?.items ?? [];
};

const getListResponseItems = <T,>(response: ListResponse<T>): T[] => {
    if (Array.isArray(response.object)) return response.object;
    if (Array.isArray(response.exData)) return response.exData;
    return [];
};

const toPositiveInteger = (value: string): number | null => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toNumberOrNull = (value: string): number | null => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toStartDateTime = (value: string): string | null => {
    return value ? `${value}T00:00:00` : null;
};

const toEndDateTime = (value: string): string | null => {
    return value ? `${value}T23:59:59` : null;
};

const toNumberValue = (option: SelectOption | null): number | null => {
    if (!option) return null;
    const parsed = Number(option.value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toPriceMode = (option: SelectOption | null): ProductPriceMode => {
    if (option?.value === "Lowest" || option?.value === "Highest") {
        return option.value;
    }
    return DEFAULT_PRICE_MODE;
};

const mapProduct = (product: ApiProduct): Product => {
    const cardProduct = mapApiProductToCardProduct(product);
    const stockQty = cardProduct.stockQty ?? 0;

    return {
        ...cardProduct,
        id: product.id,
        title: cardProduct.title,
        price: cardProduct.price || "LKR 0.00",
        img: cardProduct.img || "",
        rating: cardProduct.rating ?? 0,
        reviews: stockQty,
        stockQty,
        category: cardProduct.category || "Uncategorized",
        categoryId: product.category?.id ?? 0,
        brandId: product.brand?.id ?? 0,
        marketId: Number.isFinite(Number(product.marketId)) ? Number(product.marketId) : null,
        isActive: product.isActive === true,
        inStock: stockQty > 0,
    };
};

function AllProducts({ productCount, showAllProductsBtn, className, searchQuery: externalSearchQuery }: Props) {
    const pageSize = productCount ?? DEFAULT_PAGE_SIZE;
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState(externalSearchQuery ?? '');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [marketCategoryOptions, setMarketCategoryOptions] = useState<SelectOption[]>([]);
    const [selectedMarketCategory, setSelectedMarketCategory] = useState<SelectOption | null>(null);
    const [selectedMarket, setSelectedMarket] = useState<SelectOption | null>(null);
    const [defaultMarketOptions, setDefaultMarketOptions] = useState<SelectOption[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
    const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<SelectOption | null>(null);
    const [selectedRating, setSelectedRating] = useState<SelectOption>(ratingOptions[0]);
    const [selectedPriceMode, setSelectedPriceMode] = useState<SelectOption>(priceModeOptions[1]);
    const [productIdFilter, setProductIdFilter] = useState('');
    const [fromPrice, setFromPrice] = useState('');
    const [toPrice, setToPrice] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [showInStockOnly, setShowInStockOnly] = useState(false);
    const [booleanFilters, setBooleanFilters] = useState<BooleanFilters>({
        orderByTopSales: false,
        orderByMaxPrice: false,
        orderByLowPrice: false,
        trendingProducts: false,
    });
    const [pageNumber, setPageNumber] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingFilters, setIsLoadingFilters] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [addingProductId, setAddingProductId] = useState<number | null>(null);

    const selectedMarketCategoryId = toNumberValue(selectedMarketCategory);
    const selectedMarketId = toNumberValue(selectedMarket);
    const selectedCategoryId = toNumberValue(selectedCategory);
    const selectedBrandId = toNumberValue(selectedBrand);
    const selectedRatingValue = toNumberValue(selectedRating);

    const loadMarketOptions = async (
        inputValue: string,
        marketCategoryId = selectedMarketCategoryId
    ): Promise<SelectOption[]> => {
        try {
            const response = await axiosInstance.post<PagedResponse<ApiMarket>>('/markets/get-markets', {
                pageNumber: 0,
                countPerPage: 10,
                marketCategoryId,
                marketId: null,
                userId: null,
                isActive: true,
                search: inputValue.trim(),
                items: [],
            });

            return getResponseItems(response.data)
                .filter((market) => market.isActive !== false)
                .map((market) => ({ value: market.id, label: market.name }))
                .filter((option) => option.label.trim().length > 0);
        } catch (apiError) {
            console.error('Failed to load market options:', apiError);
            return [];
        }
    };

    const loadMarketCategories = async () => {
        try {
            const response = await axiosInstance.get<ListResponse<ApiMarketCategory>>('/markets/get-market-categories');
            setMarketCategoryOptions(
                getListResponseItems(response.data).map((category) => ({
                    value: category.id,
                    label: category.name,
                }))
            );
        } catch (apiError) {
            console.error('Failed to load market categories:', apiError);
            setMarketCategoryOptions([]);
        }
    };

    const loadCategories = async (marketId: number | null) => {
        if (!marketId) {
            setCategoryOptions([]);
            return;
        }

        setIsLoadingFilters(true);

        try {
            const response = await axiosInstance.post<PagedResponse<ApiCategory>>('/products/get-categories', {
                pageNumber: 0,
                countPerPage: 100,
                marketId,
                categoryId: null,
                isActive: true,
                brandId: null,
                search: '',
            });

            const options = getResponseItems(response.data)
                .filter((category) => category.isActive !== false)
                .map((category) => ({ value: category.id, label: category.name }))
                .filter((option) => option.label.trim().length > 0);

            setCategoryOptions(options);
        } catch (apiError) {
            console.error('Failed to load categories:', apiError);
            setCategoryOptions([]);
        } finally {
            setIsLoadingFilters(false);
        }
    };

    const loadBrands = async (marketId: number | null, categoryId: number | null) => {
        if (!marketId || !categoryId) {
            setBrandOptions([]);
            return;
        }

        setIsLoadingFilters(true);

        try {
            const response = await axiosInstance.post<PagedResponse<ApiBrand>>('/products/get-brands', {
                pageNumber: 0,
                countPerPage: 100,
                marketId,
                categoryId,
                isActive: true,
                brandId: null,
                search: '',
            });

            const options = getResponseItems(response.data)
                .filter((brand) => brand.isActive !== false)
                .map((brand) => ({ value: brand.id, label: brand.name }))
                .filter((option) => option.label.trim().length > 0);

            setBrandOptions(options);
        } catch (apiError) {
            console.error('Failed to load brands:', apiError);
            setBrandOptions([]);
        } finally {
            setIsLoadingFilters(false);
        }
    };

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 350);

        return () => window.clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        setSearchQuery(externalSearchQuery ?? '');
    }, [externalSearchQuery]);

    useEffect(() => {
        void loadMarketCategories();
        void loadMarketOptions('', null).then(setDefaultMarketOptions);
    }, []);

    useEffect(() => {
        setSelectedMarket(null);
        setSelectedCategory(null);
        setSelectedBrand(null);
        setPageNumber(1);
        void loadMarketOptions('', selectedMarketCategoryId).then(setDefaultMarketOptions);
    }, [selectedMarketCategoryId]);

    useEffect(() => {
        setSelectedCategory(null);
        setSelectedBrand(null);
        setPageNumber(1);
        void loadCategories(selectedMarketId);
    }, [selectedMarketId]);

    useEffect(() => {
        setSelectedBrand(null);
        setPageNumber(1);
        void loadBrands(selectedMarketId, selectedCategoryId);
    }, [selectedCategoryId, selectedMarketId]);

    useEffect(() => {
        setPageNumber(1);
    }, [
        booleanFilters,
        debouncedSearch,
        fromDate,
        fromPrice,
        productIdFilter,
        selectedBrandId,
        selectedCategoryId,
        selectedPriceMode,
        selectedRatingValue,
        showInStockOnly,
        toDate,
        toPrice,
    ]);

    useEffect(() => {
        let isMounted = true;

        const fetchProducts = async () => {
            setIsLoading(true);
            setError(null);

            const payload = createGetProductsPayload({
                pageNumber: pageNumber - 1,
                countPerPage: pageSize,
                categoryId: selectedCategoryId,
                productId: toPositiveInteger(productIdFilter),
                brandId: selectedBrandId,
                marketId: selectedMarketId,
                isActive: true,
                getActiveStocksCount: true,
                orderByTopSales: booleanFilters.orderByTopSales || null,
                orderByMaxPrice: booleanFilters.orderByMaxPrice || null,
                orderByLowPrice: booleanFilters.orderByLowPrice || null,
                trendingProducts: booleanFilters.trendingProducts || null,
                fromPrice: toNumberOrNull(fromPrice),
                toPrice: toNumberOrNull(toPrice),
                orderByRate: selectedRatingValue && selectedRatingValue > 0 ? selectedRatingValue : null,
                fromDate: toStartDateTime(fromDate),
                toDate: toEndDateTime(toDate),
                getProductPriceAsStocks: toPriceMode(selectedPriceMode),
                search: debouncedSearch,
            });

            try {
                const response = await axiosInstance.post<PagedResponse<ApiProduct>>('/products/get-products', payload);
                const page = extractProductsPage(response.data, payload);
                const responseMessage = String(response.data.message || '').toLowerCase();

                if (responseMessage !== 'success' && page.items.length === 0) {
                    throw new Error(response.data.desc || 'Failed to load products.');
                }

                if (!isMounted) return;

                setProducts(
                    page.items
                        .filter((product) => product.isActive === true)
                        .map(mapProduct)
                );
                setTotalCount(page.totalCount);
                setTotalPages(page.totalPages);
            } catch (apiError) {
                console.error('Failed to load products:', apiError);
                if (!isMounted) return;
                setProducts([]);
                setTotalCount(0);
                setTotalPages(1);
                setError('Failed to load products from backend.');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void fetchProducts();

        return () => {
            isMounted = false;
        };
    }, [
        booleanFilters,
        debouncedSearch,
        fromDate,
        fromPrice,
        pageNumber,
        pageSize,
        productIdFilter,
        selectedBrandId,
        selectedCategoryId,
        selectedMarketId,
        selectedPriceMode,
        selectedRatingValue,
        toDate,
        toPrice,
    ]);

    const handleBooleanFilterChange = (key: keyof BooleanFilters) => {
        setBooleanFilters((current) => {
            const nextValue = !current[key];
            const nextFilters = { ...current, [key]: nextValue };

            if (key === 'orderByMaxPrice' && nextValue) {
                nextFilters.orderByLowPrice = false;
            }
            if (key === 'orderByLowPrice' && nextValue) {
                nextFilters.orderByMaxPrice = false;
            }

            return nextFilters;
        });
    };

    const handleAddToCart = async (product: Product) => {
        if (addingProductId === product.id) {
            return;
        }

        const availableStock = product.stockQty ?? 0;
        const currentQtyInCart = getCartItems().find((item) => item.id === product.id)?.quantity || 0;

        if (!product.inStock || availableStock <= 0) {
            await swalAlert('Out of Stock', 'This product is currently out of stock.', 'warning');
            return;
        }

        if (currentQtyInCart >= availableStock) {
            await swalAlert(
                'Stock Limit Reached',
                `Only ${availableStock} item(s) available. You already have ${currentQtyInCart} in your cart.`,
                'warning'
            );
            return;
        }

        setAddingProductId(product.id);

        try {
            const price = parseCurrencyToNumber(product.price);
            addToCart(
                {
                    id: product.id,
                    marketId: product.marketId ?? undefined,
                    title: product.title,
                    price: Number.isFinite(price) ? price : 0,
                    img: product.img,
                    seller: 'DeliveryYa Store',
                    inStock: true,
                },
                1
            );

            await swalAlert('Added to Cart', `${product.title} has been added to your cart.`, 'success');
        } finally {
            setAddingProductId((current) => (current === product.id ? null : current));
        }
    };

    const clearFilters = () => {
        setSelectedMarketCategory(null);
        setSelectedMarket(null);
        setSelectedCategory(null);
        setSelectedBrand(null);
        setSelectedRating(ratingOptions[0]);
        setSelectedPriceMode(priceModeOptions[1]);
        setProductIdFilter('');
        setFromPrice('');
        setToPrice('');
        setFromDate('');
        setToDate('');
        setShowInStockOnly(false);
        setSearchQuery('');
        setDebouncedSearch('');
        setBooleanFilters({
            orderByTopSales: false,
            orderByMaxPrice: false,
            orderByLowPrice: false,
            trendingProducts: false,
        });
        setPageNumber(1);
    };

    const handleOpenProduct = (productId: number) => {
        navigate(`/product-details/${productId}`);
    };

    const visibleProducts = useMemo(
        () => (showInStockOnly ? products.filter((product) => product.inStock) : products),
        [products, showInStockOnly]
    );

    const visiblePages = useMemo(() => {
        const pagesToShow = 5;
        const start = Math.max(1, pageNumber - Math.floor(pagesToShow / 2));
        const end = Math.min(totalPages, start + pagesToShow - 1);
        const adjustedStart = Math.max(1, end - pagesToShow + 1);
        return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
    }, [pageNumber, totalPages]);

    const activeFilterCount = [
        selectedMarketCategory,
        selectedMarket,
        selectedCategory,
        selectedBrand,
        selectedRatingValue && selectedRatingValue > 0,
        debouncedSearch,
        productIdFilter.trim(),
        fromPrice.trim(),
        toPrice.trim(),
        fromDate,
        toDate,
        showInStockOnly,
        selectedPriceMode.value !== DEFAULT_PRICE_MODE,
        booleanFilters.orderByTopSales,
        booleanFilters.orderByMaxPrice,
        booleanFilters.orderByLowPrice,
        booleanFilters.trendingProducts,
    ].filter(Boolean).length;

    const productCardClassName = viewMode === 'list' ? 'sm:flex sm:min-h-64' : '';
    const productImageClassName = viewMode === 'list' ? 'sm:w-64 sm:h-auto sm:shrink-0' : '';
    const productContentClassName = viewMode === 'list' ? 'sm:flex-1' : '';

    const booleanFilterControls: Array<{ key: keyof BooleanFilters; label: string; hint: string }> = [
        { key: 'orderByTopSales', label: 'Top sales', hint: 'Prioritize best sellers' },
        { key: 'trendingProducts', label: 'Trending', hint: 'Show trending products' },
        { key: 'orderByMaxPrice', label: 'Highest price', hint: 'Sort expensive first' },
        { key: 'orderByLowPrice', label: 'Lowest price', hint: 'Sort affordable first' },
    ];

    return (
        <section className={`relative bg-linear-to-br from-[#FFF4EE] via-white to-[#FFE5D9] py-16 px-4 ${className || ''}`} id="all-products">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-block">
                        <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-2">
                            All <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FF6B35] via-[#FF8C42] to-[#FFA726]">Products</span>
                        </h2>
                        <div className="h-1.5 bg-linear-to-r from-[#FF6B35] via-[#FF8C42] to-[#FFA726] rounded-full"></div>
                    </div>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Browse active products by market, category, brand, price, rating, and availability.
                    </p>
                </div>

                <div className="mb-6 max-w-3xl mx-auto">
                    <div className="relative group">
                        <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#FF6B35] transition-colors duration-300 w-5 h-5 z-10" />
                        <input
                            type="text"
                            placeholder="Search active products..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="w-full pl-14 pr-14 py-4 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#FF6B35]/50 focus:border-[#FF6B35] focus:outline-none shadow-lg hover:shadow-xl transition-all duration-300 text-gray-800 font-semibold placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear search"
                                title="Clear search"
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B35] transition-colors duration-300 z-10"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 mb-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <button
                            onClick={() => setShowFilters((current) => !current)}
                            className={`group flex items-center gap-2 ${showFilters ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]' : 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]'} hover:from-[#FF8C42] hover:to-[#FFA726] text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                        >
                            <FaFilter className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : 'group-hover:rotate-12'}`} />
                            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                            {activeFilterCount > 0 && (
                                <span className="bg-white text-[#FF6B35] rounded-full min-w-6 h-6 px-2 flex items-center justify-center text-xs font-black">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl shadow-inner border border-gray-200">
                            <button
                                onClick={() => setViewMode('grid')}
                                aria-label="Grid view"
                                title="Grid view"
                                className={`p-2.5 rounded-lg transition-all duration-300 ${viewMode === 'grid' ? 'bg-linear-to-r from-[#FF6B35] to-[#FF8C42] shadow-md' : 'hover:bg-white'}`}
                            >
                                <BiGridAlt className={`w-5 h-5 ${viewMode === 'grid' ? 'text-white' : 'text-gray-500'}`} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                aria-label="List view"
                                title="List view"
                                className={`p-2.5 rounded-lg transition-all duration-300 ${viewMode === 'list' ? 'bg-linear-to-r from-[#FF6B35] to-[#FF8C42] shadow-md' : 'hover:bg-white'}`}
                            >
                                <BsListUl className={`w-5 h-5 ${viewMode === 'list' ? 'text-white' : 'text-gray-500'}`} />
                            </button>
                        </div>

                        <div className="text-gray-600 text-sm font-medium bg-[#FFF4EE] px-4 py-2 rounded-xl border border-[#FF6B35]/20">
                            Showing <span className="font-black text-[#FF6B35]">{visibleProducts.length}</span> of <span className="font-black text-gray-800">{totalCount}</span> active products
                        </div>
                    </div>

                    {showFilters && (
                        <div className="pt-6 mt-6 border-t-2 border-gray-100 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Market Category</label>
                                    <Select<SelectOption, false>
                                        value={selectedMarketCategory}
                                        onChange={(selected: SingleValue<SelectOption>) => setSelectedMarketCategory(selected)}
                                        options={marketCategoryOptions}
                                        styles={selectStyles}
                                        placeholder="All market categories"
                                        isClearable
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                        <MdStorefront className="w-5 h-5 text-[#FF6B35]" />
                                        Market
                                    </label>
                                    <AsyncSelect<SelectOption, false>
                                        key={selectedMarketCategoryId ?? 'all-market-categories'}
                                        cacheOptions
                                        defaultOptions={defaultMarketOptions}
                                        loadOptions={(inputValue) => loadMarketOptions(inputValue)}
                                        value={selectedMarket}
                                        onChange={(selected: SingleValue<SelectOption>) => setSelectedMarket(selected)}
                                        styles={selectStyles}
                                        placeholder="Search active markets"
                                        isClearable
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Product Category</label>
                                    <Select<SelectOption, false>
                                        value={selectedCategory}
                                        onChange={(selected: SingleValue<SelectOption>) => setSelectedCategory(selected)}
                                        options={categoryOptions}
                                        styles={selectStyles}
                                        placeholder={selectedMarket ? "All product categories" : "Select market first"}
                                        isDisabled={!selectedMarket || isLoadingFilters}
                                        isClearable
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Brand</label>
                                    <Select<SelectOption, false>
                                        value={selectedBrand}
                                        onChange={(selected: SingleValue<SelectOption>) => setSelectedBrand(selected)}
                                        options={brandOptions}
                                        styles={selectStyles}
                                        placeholder={selectedCategory ? "All brands" : "Select category first"}
                                        isDisabled={!selectedCategory || isLoadingFilters}
                                        isClearable
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Product ID</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={productIdFilter}
                                        onChange={(event) => setProductIdFilter(event.target.value)}
                                        placeholder="Any product"
                                        className="w-full min-h-12 rounded-xl border-2 border-gray-200 bg-white px-3 font-semibold text-gray-700 outline-none transition-all hover:border-[#FF6B35] focus:border-[#FF6B35]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">From Price</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={fromPrice}
                                        onChange={(event) => setFromPrice(event.target.value)}
                                        placeholder="LKR min"
                                        className="w-full min-h-12 rounded-xl border-2 border-gray-200 bg-white px-3 font-semibold text-gray-700 outline-none transition-all hover:border-[#FF6B35] focus:border-[#FF6B35]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">To Price</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={toPrice}
                                        onChange={(event) => setToPrice(event.target.value)}
                                        placeholder="LKR max"
                                        className="w-full min-h-12 rounded-xl border-2 border-gray-200 bg-white px-3 font-semibold text-gray-700 outline-none transition-all hover:border-[#FF6B35] focus:border-[#FF6B35]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Price Basis</label>
                                    <Select<SelectOption, false>
                                        value={selectedPriceMode}
                                        onChange={(selected: SingleValue<SelectOption>) => setSelectedPriceMode(selected ?? priceModeOptions[1])}
                                        options={priceModeOptions}
                                        styles={selectStyles}
                                        isClearable={false}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">From Date</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(event) => setFromDate(event.target.value)}
                                        max={toDate || undefined}
                                        className="w-full min-h-12 rounded-xl border-2 border-gray-200 bg-white px-3 font-semibold text-gray-700 outline-none transition-all hover:border-[#FF6B35] focus:border-[#FF6B35]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">To Date</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(event) => setToDate(event.target.value)}
                                        min={fromDate || undefined}
                                        className="w-full min-h-12 rounded-xl border-2 border-gray-200 bg-white px-3 font-semibold text-gray-700 outline-none transition-all hover:border-[#FF6B35] focus:border-[#FF6B35]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                        <FaStar className="w-4 h-4 text-[#FFB84D]" />
                                        Minimum Rating
                                    </label>
                                    <Select<SelectOption, false>
                                        value={selectedRating}
                                        onChange={(selected: SingleValue<SelectOption>) => setSelectedRating(selected ?? ratingOptions[0])}
                                        options={ratingOptions}
                                        styles={selectStyles}
                                        isClearable={false}
                                    />
                                </div>

                                <div className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 px-4">
                                    <input
                                        id="all-products-in-stock"
                                        type="checkbox"
                                        checked={showInStockOnly}
                                        onChange={(event) => setShowInStockOnly(event.target.checked)}
                                        className="w-5 h-5 rounded border-2 border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35] cursor-pointer"
                                    />
                                    <label htmlFor="all-products-in-stock" className="text-sm font-medium text-gray-700">
                                        In stock only
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                {booleanFilterControls.map((filter) => (
                                    <label
                                        key={filter.key}
                                        className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 transition-all hover:border-[#FF6B35]/40 hover:bg-[#FFF4EE]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={booleanFilters[filter.key]}
                                            onChange={() => handleBooleanFilterChange(filter.key)}
                                            className="w-5 h-5 rounded border-2 border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35] cursor-pointer"
                                        />
                                        <span>
                                            <span className="block text-sm font-semibold text-gray-800">{filter.label}</span>
                                            <span className="block text-xs font-medium text-gray-500">{filter.hint}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={clearFilters}
                                    className="bg-gray-100 hover:bg-[#FF6B35] text-gray-700 hover:text-white font-bold py-3 px-5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 font-semibold">
                        {error}
                    </div>
                )}

                {isLoading && (
                    <div className="text-center py-8 text-gray-600 font-semibold">Loading products...</div>
                )}

                {!isLoading && !error && visibleProducts.length > 0 && (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
                        {visibleProducts.map((product) => {
                            const productCardData: NewArrivalProduct = {
                                id: product.id,
                                title: product.title,
                                price: product.price,
                                oldPrice: product.oldPrice,
                                rating: product.rating,
                                reviews: product.stockQty,
                                stockQty: product.stockQty,
                                img: product.img,
                                isNew: Boolean(fromDate || toDate),
                                category: product.category,
                                inStock: product.inStock,
                            };

                            return (
                                <ProductCard
                                    key={product.id}
                                    product={productCardData}
                                    onCardClick={() => handleOpenProduct(product.id)}
                                    onQuickView={() => handleOpenProduct(product.id)}
                                    onAddToCart={() => void handleAddToCart(product)}
                                    disableAddToCart={!product.inStock || addingProductId === product.id}
                                    className={productCardClassName}
                                    imageClassName={productImageClassName}
                                    contentClassName={productContentClassName}
                                />
                            );
                        })}
                    </div>
                )}

                {!isLoading && !error && visibleProducts.length === 0 && (
                    <div className="text-center py-16">
                        <div className="inline-block p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
                            <div className="w-24 h-24 mx-auto mb-6 bg-[#FFF4EE] rounded-full flex items-center justify-center">
                                <FaSearch className="w-12 h-12 text-[#FF6B35]" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2">No Products Found</h3>
                            <p className="text-gray-600 mb-6">Try adjusting your filters or search query.</p>
                            <button
                                onClick={clearFilters}
                                className="bg-linear-to-r from-[#FF6B35] to-[#FF8C42] hover:from-[#FF8C42] hover:to-[#FFA726] text-white font-bold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                )}

                {showAllProductsBtn && (
                    <div className="text-center mt-10">
                        <Link to="/all-products" className="group w-90 justify-center bg-white hover:bg-linear-to-r hover:from-[#F59B0F] hover:to-[#AC6C2A] text-gray-900 hover:text-white font-bold py-4 px-16 rounded-full border-2 border-[#5C6BC0] transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center gap-3 mx-auto">
                            <span className="text-lg">Explore All Products</span>
                            <FaArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                        </Link>
                    </div>
                )}

                {!showAllProductsBtn && totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
                        <button
                            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                            disabled={pageNumber <= 1 || isLoading}
                            className="bg-white hover:bg-linear-to-r hover:from-[#FF6B35] hover:to-[#FF8C42] text-gray-700 hover:text-white font-bold px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-transparent transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>

                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {visiblePages.map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setPageNumber(page)}
                                    className={`px-5 py-3 rounded-xl font-black transition-all duration-300 border-2 shadow-md hover:shadow-xl hover:scale-110 active:scale-95 ${page === pageNumber
                                        ? 'bg-linear-to-r from-[#FF6B35] via-[#FF8C42] to-[#FFA726] text-white border-transparent shadow-lg'
                                        : 'bg-white hover:bg-[#FFF4EE] text-gray-700 hover:text-[#FF6B35] border-gray-200 hover:border-[#FF6B35]/30'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
                            disabled={pageNumber >= totalPages || isLoading}
                            className="bg-white hover:bg-linear-to-r hover:from-[#FF6B35] hover:to-[#FF8C42] text-gray-700 hover:text-white font-bold px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-transparent transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}

                {!showAllProductsBtn && totalPages > 1 && (
                    <p className="mt-4 text-center text-sm font-semibold text-gray-500">
                        Page {pageNumber} of {totalPages}
                    </p>
                )}
            </div>
        </section>
    );
}

export default AllProducts;
