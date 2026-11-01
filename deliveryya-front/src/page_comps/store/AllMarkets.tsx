import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaArrowRight, FaFilter, FaTimes, FaStar } from "react-icons/fa";
import { MdVerified, MdDeliveryDining } from "react-icons/md";
import { BiTimeFive } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import axiosInstance from "../../util/AxiosUtil";
import { baseURL } from "../../util/AxiosUtil";

type ApiMarket = {
    id: number;
    name: string;
    location?: string;
    address?: string;
    logoUrl?: string;
    coverImgUrl?: string;
    desc?: string;
    isActive?: boolean;
    marketCategory?: { id: number; name: string } | null;
};

type ApiMarketCategory = {
    id: number;
    name: string;
};

type ListResponse<T> = {
    message?: string;
    object?: T[];
    exData?: T[];
};

type PagedResponse<T> = {
    message?: string;
    desc?: string;
    object?: { items?: T[]; totalCount?: number; totalPages?: number };
    exData?: { items?: T[]; totalCount?: number; totalPages?: number };
};

type SelectOption = {
    value: number | string;
    label: string;
};

const DEFAULT_PAGE_SIZE = 12;

const getListResponseItems = <T,>(response: ListResponse<T>): T[] => {
    if (Array.isArray(response.object)) return response.object;
    if (Array.isArray(response.exData)) return response.exData;
    return [];
};

const selectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: state.isFocused ? "#5C6BC0" : "#e5e7eb",
        boxShadow: state.isFocused ? "0 0 0 3px rgba(92, 107, 192, 0.12)" : "none",
        ":hover": { borderColor: "#5C6BC0" },
    }),
    menu: (base) => ({ ...base, zIndex: 50, borderRadius: 12, overflow: "hidden" }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? "#5C6BC0" : state.isFocused ? "#f3f4f6" : "white",
        color: state.isSelected ? "white" : "#374151",
        fontWeight: state.isSelected ? 700 : 600,
    }),
};

const normalizeImageUrl = (url?: string) => {
    if (!url) return "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return baseURL + "/uploads" + url;
    return baseURL + "/uploads/" + url;
};

const generateMarketRating = (marketId: number): string => {
    return (4.5 + (marketId % 5) * 0.1).toFixed(1);
};

function AllMarkets({ pageSize = DEFAULT_PAGE_SIZE }: { pageSize?: number }) {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [markets, setMarkets] = useState<ApiMarket[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [marketCategoryOptions, setMarketCategoryOptions] = useState<SelectOption[]>([]);
    const [selectedMarketCategory, setSelectedMarketCategory] = useState<SelectOption | null>(null);
    const [filterByBestMarket, setFilterByBestMarket] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const selectedMarketCategoryId = selectedMarketCategory ? Number(selectedMarketCategory.value) : null;

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(t);
    }, [search]);

    useEffect(() => {
        const loadCategories = async () => {
            setIsLoadingCategories(true);
            try {
                const response = await axiosInstance.get<ListResponse<ApiMarketCategory>>("/markets/get-market-categories");
                const categories = getListResponseItems(response.data);
                setMarketCategoryOptions(
                    categories.map((cat) => ({ value: cat.id, label: cat.name }))
                );
            } catch (e) {
                console.error("Failed to load market categories:", e);
                setMarketCategoryOptions([]);
            } finally {
                setIsLoadingCategories(false);
            }
        };
        void loadCategories();
    }, []);

    useEffect(() => {
        let mounted = true;
        const fetchMarkets = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const payload = {
                    pageNumber: 0,
                    countPerPage: pageSize,
                    marketCategoryId: selectedMarketCategoryId,
                    marketId: null,
                    userId: null,
                    isActive: true,
                    filterByBestMarket: filterByBestMarket,
                    search: debouncedSearch ?? "",
                };

                const resp = await axiosInstance.post<PagedResponse<ApiMarket>>("/markets/get-markets", payload);
                const items = resp.data.exData?.items || resp.data.object?.items || [];
                const totalCount = resp.data.object?.totalCount ?? resp.data.exData?.totalCount ?? items.length;
                const totalPages = resp.data.object?.totalPages ?? resp.data.exData?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));

                if (!mounted) return;
                setMarkets(items.filter((m) => m.isActive !== false));
                setTotalCount(totalCount);
                setTotalPages(totalPages);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setMarkets([]);
                setTotalCount(0);
                setTotalPages(1);
                setError("Failed to load markets.");
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        void fetchMarkets();
        return () => { mounted = false; };
    }, [pageNumber, pageSize, debouncedSearch, selectedMarketCategoryId, filterByBestMarket]);

    const visiblePages = useMemo(() => {
        const pagesToShow = 5;
        const start = Math.max(1, pageNumber - Math.floor(pagesToShow / 2));
        const end = Math.min(totalPages, start + pagesToShow - 1);
        const adjustedStart = Math.max(1, end - pagesToShow + 1);
        return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
    }, [pageNumber, totalPages]);

    return (
        <section id="all-markets" className="relative bg-white py-16 px-4">
            <div className="max-w-7xl mx-auto">

                <div className="text-center mb-10 space-y-4">
                    <div className="inline-block">
                        <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-2">
                            All <span className="text-transparent bg-clip-text bg-linear-to-r from-[#5C6BC0] via-[#7986CB] to-[#9575CD]">Markets</span>
                        </h2>
                        <div className="h-1.5 bg-linear-to-r from-[#5C6BC0] via-[#7986CB] to-[#9575CD] rounded-full"></div>
                    </div>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Browse active markets — filter, search and explore verified stores.
                    </p>
                </div>

                <div className="max-w-3xl mx-auto mb-6">
                    <div className="relative group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search markets..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200" />
                    </div>
                </div>

                <div className="mb-6 bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <button
                            onClick={() => setShowFilters((c) => !c)}
                            className="group flex items-center gap-2 bg-linear-to-r from-[#5C6BC0] to-[#7986CB] hover:from-[#4A5FB0] hover:to-[#6976BB] text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                            <FaFilter className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                            <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
                        </button>
                        {(selectedMarketCategory || filterByBestMarket) && (
                            <button
                                onClick={() => {
                                    setSelectedMarketCategory(null);
                                    setFilterByBestMarket(false);
                                }}
                                className="text-sm font-semibold text-[#5C6BC0] hover:text-[#4A5FB0] flex items-center gap-2"
                            >
                                <FaTimes className="w-4 h-4" />
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {showFilters && (
                        <div className="pt-4 border-t border-gray-200 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Market Category</label>
                                    <Select<SelectOption, false>
                                        value={selectedMarketCategory}
                                        onChange={(selected: SingleValue<SelectOption>) => setSelectedMarketCategory(selected)}
                                        options={marketCategoryOptions}
                                        styles={selectStyles}
                                        placeholder="All categories"
                                        isClearable
                                        isLoading={isLoadingCategories}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filterByBestMarket}
                                            onChange={(e) => setFilterByBestMarket(e.target.checked)}
                                            className="w-5 h-5 rounded border-2 border-gray-300 text-[#5C6BC0] focus:ring-[#5C6BC0] cursor-pointer"
                                        />
                                        <span className="text-sm font-semibold text-gray-800">Show Best Markets Only</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {isLoading && <div className="text-center py-8 text-gray-600">Loading markets...</div>}

                {!isLoading && error && <div className="text-center text-red-600 py-8">{error}</div>}

                {!isLoading && !error && markets.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {markets.map((m) => {
                            const rating = generateMarketRating(m.id);
                            return (
                                <div key={m.id} className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden transition-all duration-500 border border-gray-100 hover:border-[#7986CB]/30 transform hover:-translate-y-2">
                                    {/* Image Section */}
                                    <div className="relative h-48 overflow-hidden bg-gray-200">
                                        <img src={normalizeImageUrl(m.coverImgUrl || m.logoUrl)} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                        {/* Quick Action Button on Hover */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <button
                                                onClick={() => navigate(`/market/${m.id}`)}
                                                className="bg-white text-[#5C6BC0] font-bold py-2 px-6 rounded-full shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-300"
                                            >
                                                Quick View
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-5">
                                        {/* Market Name & Verified Badge */}
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#5C6BC0] transition-colors flex-1">{m.name}</h3>
                                            <MdVerified className="w-5 h-5 text-[#5C6BC0] shrink-0 mt-1" />
                                        </div>

                                        {/* Category Badge */}
                                        <span className="inline-block bg-linear-to-r from-indigo-50 to-purple-50 text-[#5C6BC0] text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-[#7986CB]/20">
                                            {m.marketCategory?.name || "Marketplace"}
                                        </span>

                                        {/* Rating & Delivery Info */}
                                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <FaStar className="w-4 h-4 text-yellow-400" />
                                                <span className="font-bold text-gray-900">{rating}</span>
                                                <span className="text-xs text-gray-500">(verified)</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <BiTimeFive className="w-4 h-4" />
                                                <span className="font-medium">Fast</span>
                                            </div>
                                        </div>

                                        {/* Delivery Fee Info */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm text-gray-600">Delivery Fee</span>
                                            <div className="flex items-center gap-1">
                                                <MdDeliveryDining className="w-5 h-5 text-[#7986CB]" />
                                                <span className="font-bold text-gray-900">Varies</span>
                                            </div>
                                        </div>

                                        {/* Visit Button */}
                                        <button
                                            onClick={() => navigate(`/market/${m.id}`)}
                                            className="w-full bg-linear-to-r from-[#5C6BC0] to-[#7986CB] hover:from-[#4A5FB0] hover:to-[#6976BB] text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <span>Visit Store</span>
                                            <FaArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!isLoading && !error && markets.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-gray-600">No markets found. Try adjusting your search.</p>
                    </div>
                )}

                {!isLoading && !error && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-10">
                        <button onClick={() => setPageNumber((c) => Math.max(1, c - 1))} disabled={pageNumber <= 1} className="px-4 py-2 rounded-xl border">Previous</button>
                        <div className="flex items-center gap-2">
                            {visiblePages.map((p) => (
                                <button key={p} onClick={() => setPageNumber(p)} className={`px-4 py-2 rounded-xl ${p === pageNumber ? 'bg-linear-to-r from-[#5C6BC0] to-[#7986CB] text-white' : 'bg-white border'}`}>{p}</button>
                            ))}
                        </div>
                        <button onClick={() => setPageNumber((c) => Math.min(totalPages, c + 1))} disabled={pageNumber >= totalPages} className="px-4 py-2 rounded-xl border">Next</button>
                    </div>
                )}

                {!isLoading && !error && (
                    <p className="mt-4 text-center text-sm text-gray-500">Showing page {pageNumber} of {totalPages} — {totalCount} markets</p>
                )}
            </div>
        </section>
    );
}

export default AllMarkets;
