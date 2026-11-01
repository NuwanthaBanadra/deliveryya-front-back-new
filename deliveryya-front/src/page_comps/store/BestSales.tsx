import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCrown, FaRegStar, FaShoppingCart, FaStar, FaStarHalfAlt } from "react-icons/fa";
import { HiTrendingUp } from "react-icons/hi";
import { MdVerified } from "react-icons/md";
import ProductCard, { type NewArrivalProduct } from "./ProductCard";
import axiosInstance from "../../util/AxiosUtil";
import { addToCart, getCartItems } from "../../util/CartUtil";
import { parseCurrencyToNumber } from "../../util/CurrencyUtil";
import { swalAlert } from "../../util/SwalUtil";
import {
    createGetProductsPayload,
    extractProductsPage,
    mapApiProductToCardProduct,
    mergeUniqueProducts,
    type ApiProduct,
    type PagedResponse,
} from "./productFeedUtils";

type Product = NewArrivalProduct & {
    id: number;
    price: string;
    img: string;
    rating: number;
    rank: number;
    badge: string;
};

const BEST_SALES_PAGE_SIZE = 6;
const badges = ["Top Pick", "#1 Seller", "Hot Item", "Popular", "Favorite", "Best Value"];

const renderStars = (rating: number) => {
    const roundedRating = Math.round(Math.min(5, Math.max(0, rating)) * 2) / 2;

    return [1, 2, 3, 4, 5].map((star) => {
        if (roundedRating >= star) {
            return <FaStar key={star} className="w-4 h-4 text-[#FFB84D]" />;
        }
        if (roundedRating >= star - 0.5) {
            return <FaStarHalfAlt key={star} className="w-4 h-4 text-[#FFB84D]" />;
        }
        return <FaRegStar key={star} className="w-4 h-4 text-gray-300" />;
    });
};

function BestSales() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [pageNumber, setPageNumber] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addingProductId, setAddingProductId] = useState<number | null>(null);

    const mapBestSaleProduct = (product: ApiProduct, index: number, pageIndex: number): Product => {
        const cardProduct = mapApiProductToCardProduct(product);
        return {
            ...cardProduct,
            id: product.id,
            price: cardProduct.price || "LKR 0.00",
            img: cardProduct.img || "",
            rating: cardProduct.rating ?? 0,
            rank: pageIndex * BEST_SALES_PAGE_SIZE + index + 1,
            badge: badges[index % badges.length],
        };
    };

    const fetchProducts = async (nextPageNumber = 0, append = false) => {
        if (append) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        const payload = createGetProductsPayload({
            pageNumber: nextPageNumber,
            countPerPage: BEST_SALES_PAGE_SIZE,
            getActiveStocksCount: true,
            orderByTopSales: true,
            isActive: true,
        });

        try {
            const response = await axiosInstance.post<PagedResponse<ApiProduct>>('/products/get-products', payload);
            const page = extractProductsPage(response.data, payload);
            const responseMessage = String(response.data.message || '').toLowerCase();

            if (responseMessage !== 'success' && page.items.length === 0) {
                throw new Error(response.data.desc || 'Failed to load best sales.');
            }

            const mappedProducts = page.items
                .filter((product) => product.isActive === true)
                .map((product, index) => mapBestSaleProduct(product, index, page.pageNumber));

            setProducts((currentProducts) =>
                append ? mergeUniqueProducts(currentProducts, mappedProducts) : mappedProducts
            );
            setPageNumber(page.pageNumber);
            setTotalPages(page.totalPages);
            setTotalCount(page.totalCount);
        } catch (apiError) {
            console.error('Failed to load best sales:', apiError);
            setError('Failed to load products from backend.');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
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

    useEffect(() => {
        void fetchProducts();
    }, []);

    const hasMoreProducts = pageNumber + 1 < totalPages;

    return (
        <section className="bg-linear-to-b from-white to-[#FFF4EE] py-16 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#FFA726] to-[#FFB84D] text-white px-6 py-2 rounded-full mb-4 shadow-lg">
                        <FaCrown className="w-5 h-5" />
                        <span className="font-bold">Customer Favorites</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                        Best <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FFA726] to-[#FFB84D]">Sales</span>
                    </h2>
                    <p className="text-gray-600 text-lg">Most loved products by our community</p>
                </div>

                {isLoading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFA726]"></div>
                        <p className="text-gray-600 mt-4">Loading best sales...</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="text-center py-12">
                        <p className="text-red-500 text-lg">{error}</p>
                        <button
                            onClick={() => void fetchProducts()}
                            className="mt-4 bg-[#FFA726] text-white font-semibold py-2 px-6 rounded-lg hover:bg-[#FFB84D] transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!isLoading && !error && products.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={{
                                    id: product.id,
                                    title: product.title,
                                    price: product.price,
                                    rating: product.rating,
                                    reviews: product.stockQty,
                                    stockQty: product.stockQty,
                                    img: product.img,
                                    isNew: false,
                                    inStock: product.inStock,
                                }}
                                onCardClick={() => navigate(`/product-details/${product.id}`)}
                                topLeftSlot={(
                                    <div className="absolute top-4 left-4 z-10 bg-linear-to-br from-[#FFA726] to-[#FFB84D] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg font-bold text-lg">
                                        #{product.rank}
                                    </div>
                                )}
                                topRightSlot={(
                                    <div className="absolute top-4 right-4 z-10 bg-white text-[#FFA726] px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                        <MdVerified className="w-3 h-3" />
                                        {product.badge}
                                    </div>
                                )}
                                mediaFooterSlot={(
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[#00BFA5]">
                                            <HiTrendingUp className="w-5 h-5" />
                                            <span className="text-sm font-bold">
                                                {(product.stockQty ?? 0).toLocaleString()} available
                                            </span>
                                        </div>
                                    </div>
                                )}
                                showHoverActions={false}
                                detailsSlot={(
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-[#FFA726] transition-colors line-clamp-2">
                                            {product.title}
                                        </h3>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    {renderStars(product.rating)}
                                                </div>
                                                <span className="font-bold text-gray-700">{product.rating.toFixed(1)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[#7E57C2] bg-[#F3E5F5] px-3 py-1 rounded-full">
                                                <FaCrown className="w-3 h-3" />
                                                <span className="text-xs font-bold">Premium</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div>
                                                <span className="text-3xl font-bold text-[#FF6B35]">
                                                    {product.price}
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">Free shipping</p>
                                            </div>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleAddToCart(product);
                                                }}
                                                disabled={!product.inStock || addingProductId === product.id}
                                                aria-label={`Add ${product.title} to cart`}
                                                title="Add to cart"
                                                className="bg-linear-to-r from-[#FF6B35] to-[#FF8C42] hover:from-[#FF5722] hover:to-[#FF6B35] text-white p-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-110 group disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <FaShoppingCart className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(`/product-details/${product.id}`);
                                            }}
                                            className="w-full bg-linear-to-r from-[#FFA726] to-[#FFB84D] hover:from-[#FF8C42] hover:to-[#FFA726] text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105"
                                        >
                                            Buy Now
                                        </button>
                                    </div>
                                )}
                            />
                        ))}
                    </div>
                )}

                {!isLoading && !error && products.length === 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
                        <p className="text-gray-600 text-lg">No best sales available at the moment.</p>
                    </div>
                )}

                {!isLoading && !error && products.length > 0 && (
                    <div className="mt-10 flex flex-col items-center gap-3">
                        <button
                            onClick={() => void fetchProducts(pageNumber + 1, true)}
                            disabled={!hasMoreProducts || isLoadingMore}
                            className="rounded-full bg-linear-to-r from-[#FFA726] to-[#FFB84D] px-7 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-[#FF8C42] hover:to-[#FFA726] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoadingMore ? 'Loading...' : hasMoreProducts ? 'Load More Best Sales' : 'All Best Sales Loaded'}
                        </button>
                        {totalCount > 0 && (
                            <p className="text-xs font-medium text-gray-500">
                                Showing {products.length.toLocaleString()} of {totalCount.toLocaleString()}
                            </p>
                        )}
                    </div>
                )}

                {/* {!isLoading && (
                    <div className="mt-16 bg-linear-to-r from-[#FFA726] to-[#FFB84D] rounded-2xl p-8 text-white shadow-xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                            <div>
                                <h3 className="text-4xl font-bold mb-2">50K+</h3>
                                <p className="text-white/90">Happy Customers</p>
                            </div>
                            <div>
                                <h3 className="text-4xl font-bold mb-2">98%</h3>
                                <p className="text-white/90">Satisfaction Rate</p>
                            </div>
                            <div>
                                <h3 className="text-4xl font-bold mb-2">24/7</h3>
                                <p className="text-white/90">Customer Support</p>
                            </div>
                        </div>
                    </div>
                )} */}
            </div>
        </section>
    );
}

export default BestSales;
