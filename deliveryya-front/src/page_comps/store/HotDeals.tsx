import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFire } from "react-icons/fa";
import axiosInstance from "../../util/AxiosUtil";
import { addToCart, getCartItems } from "../../util/CartUtil";
import { parseCurrencyToNumber } from "../../util/CurrencyUtil";
import { swalAlert } from "../../util/SwalUtil";
import ProductCard, { type NewArrivalProduct } from "./ProductCard";
import {
    createGetProductsPayload,
    extractProductsPage,
    mapApiProductToCardProduct,
    mergeUniqueProducts,
    type ApiProduct,
    type PagedResponse,
} from "./productFeedUtils";

const HOT_DEALS_PAGE_SIZE = 4;

function HotDeals() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<NewArrivalProduct[]>([]);
    const [pageNumber, setPageNumber] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addingProductId, setAddingProductId] = useState<number | null>(null);

    const fetchProducts = async (nextPageNumber = 0, append = false) => {
        if (append) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        const payload = createGetProductsPayload({
            pageNumber: nextPageNumber,
            countPerPage: HOT_DEALS_PAGE_SIZE,
            orderByTopSales: true,
            getActiveStocksCount: true,
            isActive: true,
        });

        try {
            const response = await axiosInstance.post<PagedResponse<ApiProduct>>('/products/get-products', payload);
            const page = extractProductsPage(response.data, payload);
            const responseMessage = String(response.data.message || '').toLowerCase();

            if (responseMessage !== 'success' && page.items.length === 0) {
                throw new Error(response.data.desc || 'Failed to load hot deals.');
            }

            const mappedProducts = page.items
                .filter((product) => product.isActive === true)
                .map((product) => mapApiProductToCardProduct(product));

            setProducts((currentProducts) =>
                append ? mergeUniqueProducts(currentProducts, mappedProducts) : mappedProducts
            );
            setPageNumber(page.pageNumber);
            setTotalPages(page.totalPages);
            setTotalCount(page.totalCount);
        } catch (apiError) {
            console.error('Failed to load products:', apiError);
            setError('Failed to load products from backend.');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleAddToCart = async (product: NewArrivalProduct) => {
        if (!product.id || addingProductId === product.id) {
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
                    img: product.img ?? '',
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
        <section className="bg-linear-to-b from-white to-gray-50 py-16 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-red-500 to-[#FF6B35] text-white px-6 py-2 rounded-full mb-4 animate-pulse shadow-lg">
                        <FaFire className="w-5 h-5" />
                        <span className="font-bold">Flash Deals - Limited Time</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                        Today's <span className="text-transparent bg-clip-text bg-linear-to-r from-red-500 to-[#FF6B35]">Hot Deals</span>
                    </h2>
                    <p className="text-gray-600 text-lg">Grab these amazing deals before they're gone!</p>
                </div>

                {isLoading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                        <p className="text-gray-600 mt-4">Loading hot deals...</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="text-center py-12">
                        <p className="text-red-500 text-lg">{error}</p>
                        <button
                            onClick={() => void fetchProducts()}
                            className="mt-4 bg-red-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-600 transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!isLoading && !error && products.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onCardClick={() => navigate(`/product-details/${product.id}`)}
                                onQuickView={() => navigate(`/product-details/${product.id}`)}
                                onAddToCart={() => void handleAddToCart(product)}
                                disableAddToCart={!product.inStock || addingProductId === product.id}
                            />
                        ))}
                    </div>
                )}

                {!isLoading && !error && products.length === 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
                        <p className="text-gray-600 text-lg">No hot deals available at the moment.</p>
                    </div>
                )}

                {!isLoading && !error && products.length > 0 && (
                    <div className="mt-10 flex flex-col items-center gap-3">
                        <button
                            onClick={() => void fetchProducts(pageNumber + 1, true)}
                            disabled={!hasMoreProducts || isLoadingMore}
                            className="rounded-full bg-linear-to-r from-[#FF6B35] to-[#FF8C42] px-7 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-[#FF5722] hover:to-[#FF6B35] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoadingMore ? 'Loading...' : hasMoreProducts ? 'Load More Deals' : 'All Hot Deals Loaded'}
                        </button>
                        {totalCount > 0 && (
                            <p className="text-xs font-medium text-gray-500">
                                Showing {products.length.toLocaleString()} of {totalCount.toLocaleString()}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export default HotDeals;
