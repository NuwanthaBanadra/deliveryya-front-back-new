import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaStar, FaStore, FaArrowRight, FaShoppingBag } from "react-icons/fa";
import { MdDeliveryDining, MdVerified, MdLocalOffer } from "react-icons/md";
import { BiTimeFive } from "react-icons/bi";
import { HiTrendingUp, HiShoppingCart } from "react-icons/hi";
import axiosInstance, { baseURL } from "../../util/AxiosUtil";

type ApiMarket = {
    id: number;
    name: string;
    location?: string;
    address?: string;
    logoUrl?: string;
    coverImgUrl?: string;
    desc?: string;
    infoMessage?: string;
    isActive?: boolean;
    marketCategory?: {
        id: number;
        name: string;
    } | null;
};

type PagedResponse<T> = {
    message?: string;
    desc?: string;
    object?: {
        items?: T[];
    };
    exData?: {
        items?: T[];
    };
};

type BestMarketsProps = {
    searchQuery?: string;
};

function BestMarkets({ searchQuery }: BestMarketsProps) {
    const navigate = useNavigate();
    const [markets, setMarkets] = useState<ApiMarket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const normalizeImageUrl = (url?: string) => {
        if (!url) return "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80";
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        if (url.startsWith("/")) {
            return baseURL + "/uploads" + url;
        }
        return baseURL + "/uploads/" + url;
    };

    const ratingForMarket = (marketId: number) => (4.5 + (marketId % 5) * 0.1).toFixed(1);

    const fetchMarkets = async (query = '') => {
        setIsLoading(true);
        setError(null);

        try {
            let response = await axiosInstance.post<PagedResponse<ApiMarket>>('/markets/get-markets', {
                pageNumber: 0,
                countPerPage: 6,
                isActive: true,
                marketId: null,
                userId: null,
                marketCategoryId: null,
                search: query.trim(),
                items: [],
            });

            let items = response.data.exData?.items || response.data.object?.items || [];

            // if (String(response.data.message || '').toLowerCase() !== 'success' || items.length === 0) {
            //     response = await axiosInstance.get<PagedResponse<ApiMarket>>('/markets/get-markets', {
            //         params: {
            //             pageNumber: 0,
            //             countPerPage: 6,
            //             isActive: true,
            //             marketId: null,
            //             userId: null,
            //             marketCategoryId: null,
            //             search: '',
            //         },
            //     });
            //     items = response.data.exData?.items || response.data.object?.items || [];
            // }

            setMarkets(items.filter((market) => market.isActive !== false));
        } catch (apiError) {
            console.error('Failed to load markets:', apiError);
            setError('Failed to load featured markets from backend.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMarkets(searchQuery ?? '');
    }, [searchQuery]);

    const featuredMarket = markets[0];
    const secondaryMarkets = markets.slice(1);

    return (
        <section className="relative overflow-hidden bg-linear-to-br from-orange-50 via-white to-[#FFF4EE] px-4 py-20">
            {/* Decorative Background Elements */}
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#F59B0F]/10 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#FF6347]/10 blur-3xl"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-2.5 text-white shadow-lg">
                        <HiShoppingCart className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-wider">Premium Stores</span>
                    </div>
                    <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-4">
                        Discover Our{" "}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] via-orange-500 to-[#AC6C2A]">
                            Best Markets
                        </span>
                    </h2>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Shop from verified sellers and enjoy exclusive deals with fast delivery
                    </p>
                </div>

                {isLoading && (
                    <div className="text-center py-16">
                        <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#F59B0F]"></div>
                        <p className="text-gray-600 mt-4">Loading featured markets...</p>
                    </div>
                )}

                {!isLoading && error && (
                    <div className="text-center py-12">
                        <p className="text-red-500 text-lg">{error}</p>
                        <button
                            onClick={() => {
                                void fetchMarkets(searchQuery ?? '')
                            }}
                            className="mt-4 rounded-xl bg-[#F59B0F] px-6 py-2 font-semibold text-white transition-all hover:bg-[#AC6C2A]"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!isLoading && !error && featuredMarket && (
                <div className="mb-16 group">
                    <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-linear-to-br from-white to-orange-50/40 shadow-2xl transition-all duration-500 hover:shadow-orange-200">
                        <div className="grid md:grid-cols-2 gap-0">
                            {/* Image Section */}
                            <div className="relative h-80 md:h-auto overflow-hidden">
                                <img
                                    src={normalizeImageUrl(featuredMarket.coverImgUrl || featuredMarket.logoUrl)}
                                    alt={featuredMarket.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-linear-to-r from-[#F59B0F]/25 to-transparent"></div>
                                
                                {/* Floating Badges on Image */}
                                <div className="absolute top-6 left-6 flex flex-col gap-3">
                                    <div className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-lg shadow-xl flex items-center gap-2">
                                        <MdLocalOffer className="w-5 h-5" />
                                        Featured Market
                                    </div>
                                    <div className="flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 font-bold text-white shadow-xl">
                                        <HiTrendingUp className="w-5 h-5" />
                                        Active Store
                                    </div>
                                </div>

                                {/* Rating Badge */}
                                <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FaStar className="w-5 h-5 text-yellow-400" />
                                        <span className="text-2xl font-bold text-gray-900">{ratingForMarket(featuredMarket.id)}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">Verified marketplace</p>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="p-8 md:p-12 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="rounded-2xl bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] p-3">
                                        <FaStore className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-3xl font-bold text-gray-900">{featuredMarket.name}</h3>
                                            <MdVerified className="h-6 w-6 text-[#F59B0F]" />
                                        </div>
                                        <p className="font-semibold text-[#AC6C2A]">{featuredMarket.marketCategory?.name || 'Marketplace'}</p>
                                    </div>
                                </div>

                                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                                    {featuredMarket.desc || featuredMarket.infoMessage || 'Explore verified stores with fast delivery and curated products.'}
                                </p>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="rounded-xl border border-orange-100 bg-linear-to-br from-orange-50 to-white p-4 text-center">
                                        <BiTimeFive className="mx-auto mb-2 h-6 w-6 text-[#F59B0F]" />
                                        <p className="text-sm text-gray-600 mb-1">Delivery</p>
                                        <p className="font-bold text-gray-900">Fast</p>
                                    </div>
                                    <div className="text-center p-4 bg-linear-to-br from-green-50 to-white rounded-xl border border-green-100">
                                        <MdDeliveryDining className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600 mb-1">Delivery Fee</p>
                                        <p className="font-bold text-green-600">Varies</p>
                                    </div>
                                    <div className="rounded-xl border border-orange-100 bg-linear-to-br from-orange-50 to-white p-4 text-center">
                                        <FaShoppingBag className="mx-auto mb-2 h-6 w-6 text-[#AC6C2A]" />
                                        <p className="text-sm text-gray-600 mb-1">Products</p>
                                        <p className="font-bold text-gray-900">Live</p>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={() => navigate(`/market/${featuredMarket.id}`)}
                                    className="group/btn flex w-full items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-[#AC6C2A] hover:to-[#8B5A28] hover:shadow-2xl"
                                >
                                    <span className="text-lg">Visit Store Now</span>
                                    <FaArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform duration-300" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* Other Markets Grid */}
                {!isLoading && !error && secondaryMarkets.length > 0 && (
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-3xl font-bold text-gray-900">
                            More <span className="text-[#AC6C2A]">Popular Stores</span>
                        </h3>
                        <div className="hidden cursor-pointer items-center gap-2 font-semibold text-[#F59B0F] transition-all duration-300 hover:gap-4 md:flex">
                            <span>Explore All</span>
                            <FaArrowRight className="w-4 h-4" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {secondaryMarkets.map((market, i) => (
                            <div
                                key={i}
                                className="group relative transform overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:border-orange-200 hover:shadow-2xl"
                            >
                                {/* Image */}
                                <div className="relative overflow-hidden h-48">
                                    <img
                                        src={normalizeImageUrl(market.coverImgUrl || market.logoUrl)}
                                        alt={market.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    
                                    {/* Quick Action Button on Hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button
                                            onClick={() => navigate(`/market/${market.id}`)}
                                            className="transform rounded-full bg-white px-6 py-2 font-bold text-[#F59B0F] shadow-xl transition-transform duration-300 group-hover:scale-100"
                                        >
                                            Quick View
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    {/* Store Name */}
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="flex-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-[#F59B0F]">
                                            {market.name}
                                        </h4>
                                        <MdVerified className="mt-1 h-5 w-5 shrink-0 text-[#F59B0F]" />
                                    </div>

                                    {/* Category Badge */}
                                    <span className="mb-4 inline-block rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-[#AC6C2A]">
                                        {market.marketCategory?.name || 'Marketplace'}
                                    </span>

                                    {/* Info Row */}
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <FaStar className="w-4 h-4 text-yellow-400" />
                                            <span className="font-bold text-gray-900">{ratingForMarket(market.id)}</span>
                                            <span className="text-xs text-gray-500">(verified)</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                            <BiTimeFive className="w-4 h-4" />
                                            <span className="font-medium">Fast</span>
                                        </div>
                                    </div>

                                    {/* Delivery Fee */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm text-gray-600">Delivery Fee</span>
                                        <div className="flex items-center gap-1">
                                            <MdDeliveryDining className="h-5 w-5 text-[#F59B0F]" />
                                            <span className="font-bold text-gray-900">Varies</span>
                                        </div>
                                    </div>

                                    {/* Visit Button */}
                                    <button
                                        onClick={() => navigate(`/market/${market.id}`)}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] py-3 font-bold text-white shadow-md transition-all duration-300 hover:from-[#AC6C2A] hover:to-[#8B5A28] hover:shadow-lg"
                                    >
                                        <FaStore className="w-4 h-4" />
                                        <span>Visit Store</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {/* View All CTA */}
                <div className="text-center mt-16">
                    <Link to="/all-markets" className="group inline-flex transform items-center gap-3 rounded-full border-2 border-[#F59B0F] bg-white px-16 py-5 font-bold text-gray-900 shadow-xl transition-all duration-300 hover:scale-105 hover:bg-linear-to-r hover:from-[#F59B0F] hover:to-[#AC6C2A] hover:text-white hover:shadow-2xl">
                        <span className="text-lg">Explore All Markets</span>
                        <FaArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default BestMarkets;
