import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaStar, FaStore, FaArrowLeft, FaPhone, FaMapMarkerAlt, FaShare, FaHeart } from "react-icons/fa";
import { MdVerified, MdDeliveryDining, MdLocalOffer } from "react-icons/md";
import { BiTimeFive } from "react-icons/bi";
import { HiTrendingUp } from "react-icons/hi";
import axiosInstance, { baseURL } from "../util/AxiosUtil";
import { addToCart } from "../util/CartUtil";
import { formatLkr, parseCurrencyToNumber } from "../util/CurrencyUtil";
import NavBar from "../page_comps/home/NavBar";
import Footer from "../page_comps/home/Footer";
import ProductCard, { type NewArrivalProduct } from "../page_comps/store/ProductCard";

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
    first_num?: string;
    second_num?: string;
    whats_app?: string;
    phone?: string;
    email?: string;
    marketCategory?: {
        id: number;
        name: string;
    } | null;
};

type Product = {
    id: number;
    name: string;
    description?: string;
    price?: number;
    showingPrice?: number;
    sellingPrice?: number;
    productImage?: string;
    productImageUrl?: string;
    productImages?: Array<{
        url?: string;
        imageUrl?: string;
    }>;
    color?: string;
    marketId?: number;
    isActive?: boolean;
    verified?: boolean;
    category?: {
        id: number;
        name?: string | null;
        markets?: { id: number } | null;
    } | null;
};

type Stock = {
    id: number;
    productId?: number;
    marketId?: number;
    totalQty?: number;
    availableQty?: number;
    qty?: number;
    color?: string;
    showingPrice?: number;
    sellingPrice?: number;
    products?: {
        id?: number;
        productImages?: Array<{
            url?: string;
            imageUrl?: string;
        }>;
    };
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

type GetProductsPayload = {
    pageNumber: number;
    countPerPage: number;
    marketId: number;
    categoryId?: number | null;
    brandId?: number | null;
    productId?: number | null;
    search?: string;
};

function MarketProfile() {
    const { marketId } = useParams<{ marketId: string }>();
    const navigate = useNavigate();

    const [market, setMarket] = useState<ApiMarket | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [stocks, setStocks] = useState<Map<number, Stock>>(new Map());
    const [stockRowsByProductId, setStockRowsByProductId] = useState<Map<number, Stock[]>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);

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

    const ratingForMarket = (id: number) => (4.5 + (id % 5) * 0.1).toFixed(1);
    const marketCategoryName = market?.marketCategory?.name || "Marketplace";
    const marketContacts = [
        { label: "Primary", value: market?.first_num },
        { label: "Secondary", value: market?.second_num },
        { label: "WhatsApp", value: market?.whats_app },
    ].filter((contact) => Boolean(contact.value?.trim()));

    const handleCopyMarketLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            alert("Market link copied");
        } catch {
            alert("Could not copy the market link");
        }
    };

    const fetchMarketDetails = async () => {
        if (!marketId || isNaN(Number(marketId))) {
            setError("Invalid market ID");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Fetch market details
            let marketResponse = await axiosInstance.post<PagedResponse<ApiMarket>>(
                "/markets/get-markets",
                {
                    pageNumber: 0,
                    countPerPage: 1,
                    marketId: Number(marketId),
                    isActive: true,
                }
            );

            let marketItems = marketResponse.data.exData?.items || marketResponse.data.object?.items || [];

            const marketData = marketItems[0];
            if (!marketData) {
                setError("Market not found");
                setIsLoading(false);
                return;
            }

            setMarket(marketData);

            // Fetch products for this market
            const productPayload: GetProductsPayload = {
                pageNumber: 0,
                countPerPage: 100,
                marketId: Number(marketId),
                categoryId: null,
                brandId: null,
                productId: null,
                search: "",
            };

            let productResponse = await axiosInstance.post<PagedResponse<Product>>(
                "/products/get-products",
                productPayload
            );

            const productMessage = String(productResponse.data.message || "").toLowerCase();
            let productItems = productResponse.data.exData?.items || productResponse.data.object?.items || [];

            const targetMarketId = Number(marketId);

            // Some backend responses may include mixed-market data; enforce market filtering on client side.
            const filteredProducts = productItems.filter(
                (p) => p.isActive !== false && Number(p.marketId) === targetMarketId
            );

            setProducts(filteredProducts);

            // Fetch stocks for all products
            if (filteredProducts.length > 0) {
                try {
                    const stockPayload = {
                        pageNumber: 0,
                        countPerPage: 1000,
                        marketId: targetMarketId,
                    };

                    let stockResponse = await axiosInstance.post<PagedResponse<Stock>>("/stocks/get-stocks", stockPayload);

                    let stockItems = stockResponse.data.exData?.items || stockResponse.data.object?.items || [];

                    const stockMap = new Map<number, Stock>();
                    const stockRowsMap = new Map<number, Stock[]>();
                    const validProductIds = new Set(filteredProducts.map((p) => p.id));

                    stockItems.forEach((stock: Stock) => {
                        const stockProductIdRaw = stock.products?.id ?? stock.productId;
                        const stockProductId = Number(stockProductIdRaw);

                        if (Number.isFinite(stockProductId) && validProductIds.has(stockProductId)) {
                            stockMap.set(stockProductId, stock);

                            const existingRows = stockRowsMap.get(stockProductId) || [];
                            existingRows.push(stock);
                            stockRowsMap.set(stockProductId, existingRows);
                        }
                    });

                    setStocks(stockMap);
                    setStockRowsByProductId(stockRowsMap);
                } catch (stockError) {
                    console.warn("Could not fetch stock data:", stockError);
                }
            } else {
                setStocks(new Map());
                setStockRowsByProductId(new Map());
            }
        } catch (apiError) {
            console.error("Failed to load market details:", apiError);
            setError("Failed to load market details. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMarketDetails();
    }, [marketId]);

    const getAvailableStockForProduct = (productId: number): number => {
        const stockRows = stockRowsByProductId.get(productId) || [];
        if (stockRows.length === 0) {
            const stock = stocks.get(productId);
            return stock ? Math.max(0, stock.availableQty ?? stock.totalQty ?? stock.qty ?? 0) : 0;
        }

        return stockRows.reduce(
            (total, stock) => total + Math.max(0, stock.availableQty ?? stock.totalQty ?? stock.qty ?? 0),
            0
        );
    };

    const getColorsForProduct = (product: Product): string[] => {
        const stockRows = stockRowsByProductId.get(product.id) || [];
        const stockColors = stockRows
            .map((stock) => stock.color?.trim())
            .filter((value): value is string => Boolean(value));

        const directColor = product.color ? [product.color.trim()] : [];
        const mergedColors = [...directColor, ...stockColors];

        return Array.from(new Set(mergedColors)).slice(0, 4);
    };

    const handleAddToCart = (product: Product) => {
        const availableStock = getAvailableStockForProduct(product.id);
        if (availableStock <= 0) {
            alert("This product is out of stock");
            return;
        }

        const numericSelling = parseCurrencyToNumber((product as any).sellingPrice ?? product.sellingPrice);
        const numericShowing = parseCurrencyToNumber((product as any).showingPrice ?? product.showingPrice);
        const numericPrice = parseCurrencyToNumber((product as any).price ?? product.price);
        const currentPriceNum = numericSelling || numericShowing || numericPrice || 0;

        const imgUrl =
            product.productImageUrl ||
            product.productImage ||
            product.productImages?.[0]?.url ||
            product.productImages?.[0]?.imageUrl ||
            undefined;

        const cartItem = {
            id: product.id,
            marketId: Number(marketId),
            title: product.name,
            price: currentPriceNum,
            img: normalizeImageUrl(imgUrl),
            seller: market?.name || "Marketplace",
            inStock: availableStock > 0,
        };

        addToCart(cartItem);
        alert("Added to cart!");
    };

    const DEFAULT_MARKET_COVER_IMAGE = '/icon_1.png';
    const DEFAULT_MARKET_LOGO_IMAGE = '/icon_1.png';

    const coverImageUrl = market
        ? normalizeImageUrl(market.coverImgUrl || (market as any).coverUrl || market.logoUrl)
        : DEFAULT_MARKET_COVER_IMAGE;

    const logoImageUrl = market
        ? normalizeImageUrl(market.logoUrl || (market as any).profileImageUrl || (market as any).profilePicUrl)
        : DEFAULT_MARKET_LOGO_IMAGE;

    const isMarketActive = market ? (market.isActive === undefined ? true : Boolean(market.isActive)) : false;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#5C6BC0]"></div>
                    <p className="text-gray-600 mt-4">Loading market details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <p className="text-red-500 text-lg mb-4">{error}</p>
                    <button
                        onClick={() => navigate("/store")}
                        className="bg-[#5C6BC0] text-white font-semibold py-2 px-6 rounded-lg hover:bg-[#4A5FB0] transition-all"
                    >
                        Back to Store
                    </button>
                </div>
            </div>
        );
    }

    if (!market) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <p className="text-gray-600 text-lg mb-4">Market not found</p>
                    <button
                        onClick={() => navigate("/store")}
                        className="bg-[#5C6BC0] text-white font-semibold py-2 px-6 rounded-lg hover:bg-[#4A5FB0] transition-all"
                    >
                        Back to Store
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <NavBar />

            <div className="relative bg-linear-to-br from-[#FFF7ED] via-white to-[#FFFBF0] pt-8">
                {/* Decorative Background Elements (theme accents) */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#F59B0F]/8 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#AC6C2A]/8 rounded-full blur-3xl"></div>

                <div className="max-w-7xl mx-auto px-4 relative z-10 pb-16">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate("/store")}
                        className="inline-flex items-center gap-2 bg-transparent text-[#F59B0F] hover:text-[#AC6C2A] transition-colors font-semibold mb-8"
                    >
                        <FaArrowLeft className="w-5 h-5" />
                        Back to Store
                    </button>

                    {isLoading && (
                        <div className="text-center py-24">
                            <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#F59B0F]"></div>
                            <p className="text-gray-600 mt-4">Loading market details...</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-24">
                            <p className="text-red-500 text-lg mb-4">{error}</p>
                            <button
                                onClick={() => navigate("/store")}
                                className="inline-flex items-center gap-2.5 justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] shadow-md hover:shadow-xl transition-all"
                            >
                                Back to Store
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && market && (
                        <>
                            {/* Market Header + Contact (MyMarket-style) */}
                            <div className="bg-white rounded-2xl shadow-md border border-orange-100 mb-8 overflow-hidden">

                                <div className="relative">
                                    <img
                                        src={coverImageUrl}
                                        alt={market.name}
                                        className="w-full h-44 sm:h-56 object-cover"
                                    />

                                    <div className="absolute inset-0 bg-linear-to-t from-black/35 to-transparent" />

                                    <div className="absolute left-5 sm:left-6 -bottom-12 sm:-bottom-14 z-20 h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-white bg-orange-100 shadow-lg overflow-hidden flex items-center justify-center text-[#A9641B] text-2xl font-bold">
                                        <img
                                            src={logoImageUrl}
                                            alt={`${market.name} logo`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>

                                <div className="px-5 sm:px-6 pb-6 pt-14 sm:pt-2">
                                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

                                        <div className="flex items-end gap-2">
                                            <div className="pb-1 pl-26.5 sm:pl-31">
                                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 ">
                                                    {market.name}
                                                </h3>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                                        <MdLocalOffer className="h-4 w-4" />
                                                        {marketCategoryName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold bg-orange-50 text-orange-800">
                                                <MdVerified className={`w-5 h-5 ${isMarketActive ? 'text-emerald-600' : 'text-red-500'}`} />
                                                {isMarketActive ? 'Active Market' : 'Inactive Market'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                                                <MdLocalOffer className="h-4 w-4 text-orange-500" />
                                                Market Details
                                            </p>
                                            <p className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                                                <span>{market.desc || 'No description available'}</span>
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                                                <FaPhone className="h-4 w-4 text-orange-500" />
                                                Contact & Location
                                            </p>
                                            <div className="space-y-3">
                                                <div className="rounded-lg bg-gray-50 p-3">
                                                    <div className="flex items-start gap-2 text-sm text-gray-700">
                                                        <FaMapMarkerAlt className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                                                        <div>
                                                            <p className="font-semibold text-gray-900">Location</p>
                                                            <p className="mt-1 text-gray-600">{market.address || market.location || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    {marketContacts.length > 0 ? (
                                                        marketContacts.map((contact) => (
                                                            <div key={contact.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{contact.label}</p>
                                                                <p className="mt-2 text-sm font-semibold text-gray-900">{contact.value}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
                                                            <p className="text-sm text-gray-600">No phone details available</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {!isLoading && !error && market && products.length > 0 && (
                        <div>
                            {/* Products Header */}
                            <div className="text-center mb-16">
                                <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-6 py-2.5 rounded-full mb-4 shadow-lg">
                                    <FaStore className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase tracking-wider">Products from {market.name}</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                                    Explore <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] via-[#AC6C2A] to-[#F59B0F]">Featured Items</span>
                                </h2>
                                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                                    Discover quality products from this verified seller
                                </p>
                            </div>

                            {/* Products Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                                {products.map((product) => {
                                    const availableStock = getAvailableStockForProduct(product.id);
                                    const numericSelling = parseCurrencyToNumber((product as any).sellingPrice ?? product.sellingPrice);
                                    const numericShowing = parseCurrencyToNumber((product as any).showingPrice ?? product.showingPrice);
                                    const numericPrice = parseCurrencyToNumber((product as any).price ?? product.price);
                                    const currentPriceNum = numericSelling || numericShowing || numericPrice || 0;
                                    const isInStock = availableStock > 0;

                                    const imgUrl =
                                        product.productImageUrl ||
                                        product.productImage ||
                                        product.productImages?.[0]?.url ||
                                        product.productImages?.[0]?.imageUrl ||
                                        null;

                                    const productColorsForCard = getColorsForProduct(product);

                                    const productCardData: NewArrivalProduct = {
                                        id: product.id,
                                        title: product.name,
                                        price: formatLkr(currentPriceNum),
                                        rating: 4.5,
                                        reviews: availableStock,
                                        img: normalizeImageUrl(imgUrl || undefined),
                                        isNew: true,
                                        colors:
                                            productColorsForCard.length > 0
                                                ? productColorsForCard
                                                : ["#1A1F3A", "#FF6B35", "#00BFA5"],
                                        oldPrice:
                                            numericShowing > 0 && numericShowing > currentPriceNum
                                                ? formatLkr(numericShowing)
                                                : undefined,
                                        inStock: isInStock,
                                    };

                                    return (
                                        <ProductCard
                                            key={product.id}
                                            product={productCardData}
                                            onCardClick={() => navigate(`/product-details/${product.id}`)}
                                            onQuickView={() => navigate(`/product-details/${product.id}`)}
                                            onAddToCart={() => handleAddToCart(product)}
                                            disableAddToCart={!isInStock}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && market && products.length === 0 && (
                        <div className="text-center py-24">
                            <FaStore className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg">No products available from this market yet.</p>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default MarketProfile;
