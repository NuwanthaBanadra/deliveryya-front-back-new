import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import ProductImageGallery from "./ProductImageGallery";
import ProductInfo, { type ProductStockOption } from "./ProductInfo";
import ProductFeatures from "./ProductFeatures";
import ProductDescription from "./ProductDescription";
import ProductReviews from "./ProductReviews";
import RelatedProducts from "./RelatedProducts";
import NavBar from "../home/NavBar";
import axiosInstance, { baseURL } from "../../util/AxiosUtil";
import { addToCart, getCartItems } from "../../util/CartUtil";
import { formatLkr } from "../../util/CurrencyUtil";
import { swalAlert } from "../../util/SwalUtil";
import type { ApiProduct, ProductFeedbackReview } from "../../types/EntitiesTypes";
import { createProductFeedback, getProductFeedbacks } from "../../util/FeedbackUtil";
import JwtUtil from "../../util/JwtUtil";

type PagedProductsResponse = {
    message?: string;
    object?: {
        items?: ApiProduct[];
    };
    exData?: {
        items?: ApiProduct[];
    };
};

type ApiStock = {
    id: number;
    productId?: number;
    qty?: number;
    sellingPrice?: number | null;
    showingPrice?: number | null;
    color?: string | null;
    sizes?: {
        id: number;
        name: string;
    } | null;
    unit?: {
        id: number;
        name: string;
    } | null;
    products?: {
        id: number;
    } | null;
};

type PagedStocksResponse = {
    message?: string;
    desc?: string;
    object?: {
        items?: ApiStock[];
    };
    exData?: {
        items?: ApiStock[];
    };
};

interface RelatedProduct {
    id: number;
    title: string;
    price: string;
    oldPrice: string;
    rating: number;
    img: string;
    discount: string;
}

function SingleProductView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<ApiProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [stockOptions, setStockOptions] = useState<ProductStockOption[]>([]);
    const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
    const [isLoadingStocks, setIsLoadingStocks] = useState(false);
    const [reviews, setReviews] = useState<ProductFeedbackReview[]>([]);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [totalFeedbacks, setTotalFeedbacks] = useState(0);
    const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const jwtToken = localStorage.getItem("jwtToken");
    const isAuthenticated = Boolean(jwtToken && JwtUtil.validateToken(jwtToken));

    const parsePriceValue = (price: string | number | null): number => {
        if (typeof price === "number" && Number.isFinite(price)) {
            return price;
        }

        if (typeof price === "string") {
            const parsed = Number.parseFloat(price.replace(/[^0-9.]/g, ""));
            return Number.isFinite(parsed) ? parsed : 0;
        }

        return 0;
    };

    const normalizeImageUrl = (url?: string | null) => {
        if (!url) return '';
        const cleanedUrl = url.replace(/\\/g, '/').trim();
        if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;
        if (cleanedUrl.startsWith('/')) return `${baseURL}/uploads${cleanedUrl}`;
        return `${baseURL}/uploads/${cleanedUrl}`;
    };

    const isColorCode = (value: string): boolean => {
        const trimmed = value.trim();
        return (
            /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed) ||
            /^rgba?\(/i.test(trimmed) ||
            /^hsla?\(/i.test(trimmed)
        );
    };

    useEffect(() => {
        if (!id) {
            setError("No product ID provided.");
            setLoading(false);
            return;
        }

        const productId = Number(id);
        if (!Number.isFinite(productId)) {
            setError("Invalid product ID.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setStockOptions([]);
        setSelectedStockId(null);

        const payload = {
            pageNumber: 0,
            countPerPage: 1,
            isActive: true,
            getActiveStocksCount: true,
            productId,
        };

        const loadProduct = async () => {
            try {
                let response = await axiosInstance.post<PagedProductsResponse>( "/products/get-products",
                    payload
                );

                let items = response.data.exData?.items || response.data.object?.items || [];
              
                const selectedProduct = items.find((item) => item.id === productId) || items[0] || null;

                if (!selectedProduct) {
                    setError("Product not found.");
                    setProduct(null);
                    return;
                }

                setProduct(selectedProduct);
            } catch {
                setError("Failed to load product. Please try again.");
                setProduct(null);
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [id]);

    useEffect(() => {
        const loadStocks = async () => {
            if (!product?.id) {
                setStockOptions([]);
                setSelectedStockId(null);
                return;
            }

            setIsLoadingStocks(true);

            const payload = {
                pageNumber: 0,
                countPerPage: 100,
                marketId: product.marketId ?? 0,
                productId: product.id,
                isActive: true,
                stockId: null,
            };

            const createStockLabel = (stock: ApiStock): string => {
                const parts: string[] = [];
                if (stock.sizes?.name) {
                    parts.push(stock.sizes.name);
                }
                if (stock.unit?.name) {
                    parts.push(stock.unit.name);
                }

                const qty = Number(stock.qty ?? 0);
                const price = Number(stock.sellingPrice ?? stock.showingPrice ?? 0);
                const descriptor = parts.length > 0 ? parts.join(" / ") : `Stock #${stock.id}`;
                return `${descriptor} - Qty: ${Math.max(0, qty)} - ${formatLkr(price)}`;
            };

            try {
                let response = await axiosInstance.post<PagedStocksResponse>("/stocks/get-stocks", payload);
                let items = response.data.exData?.items || response.data.object?.items || [];

                const relevantStocks = items.filter((stock) => {
                    const stockProductId = stock.products?.id ?? stock.productId;
                    return Number(stockProductId) === product.id;
                });
                const stocksToMap = relevantStocks.length > 0 ? relevantStocks : items;

                const mappedOptions = stocksToMap
                    .map((stock): ProductStockOption | null => {
                        const stockId = Number(stock.id);
                        const qty = Number(stock.qty ?? 0);
                        const sellingPrice = Number(stock.sellingPrice ?? 0);
                        const showingPrice = Number(stock.showingPrice ?? 0);

                        if (!Number.isFinite(stockId) || stockId <= 0) {
                            return null;
                        }

                        return {
                            id: stockId,
                            qty: Number.isFinite(qty) ? Math.max(0, qty) : 0,
                            label: createStockLabel(stock),
                            colorCode: stock.color?.trim() || null,
                            colorName:
                                stock.color && !isColorCode(stock.color)
                                    ? stock.color.trim()
                                    : null,
                            sizeName: stock.sizes?.name ?? null,
                            sellingPrice: Number.isFinite(sellingPrice) && sellingPrice > 0 ? sellingPrice : null,
                            showingPrice: Number.isFinite(showingPrice) && showingPrice > 0 ? showingPrice : null,
                            inStock: qty > 0,
                        };
                    })
                    .filter((stock): stock is ProductStockOption => stock !== null);

                setStockOptions(mappedOptions);

                const firstAvailableStock = mappedOptions.find((stock) => stock.inStock);
                setSelectedStockId(firstAvailableStock?.id ?? mappedOptions[0]?.id ?? null);
            } catch {
                setStockOptions([]);
                setSelectedStockId(null);
            } finally {
                setIsLoadingStocks(false);
            }
        };

        void loadStocks();
    }, [product?.id, product?.marketId]);

    useEffect(() => {
        const loadFeedbacks = async () => {
            if (!product?.id) {
                setReviews([]);
                setFeedbackRating(0);
                setTotalFeedbacks(0);
                return;
            }

            setIsLoadingFeedbacks(true);
            try {
                const result = await getProductFeedbacks({
                    pageNumber: 0,
                    countPerPage: 20,
                    productId: product.id,
                    userId: null,
                    search: null,
                    fromDate: null,
                    toDate: null,
                });

                setReviews(result.reviews);
                setFeedbackRating(result.averageRating);
                setTotalFeedbacks(result.totalCount);
            } catch {
                setReviews([]);
                setFeedbackRating(0);
                setTotalFeedbacks(0);
            } finally {
                setIsLoadingFeedbacks(false);
            }
        };

        void loadFeedbacks();
    }, [product?.id]);

   
    /* ───────────── Loading State ───────────── */
    if (loading) {
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-linear-to-b from-amber-100 via-orange-50 to-white flex flex-col items-center justify-center gap-5 mt-20">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-[#FBBF24]/30 border-t-[#F59B0F] animate-spin"></div>
                        <FaSpinner className="absolute inset-0 m-auto text-[#C2410C] text-3xl animate-pulse" />
                    </div>
                    <p className="text-gray-500 font-medium text-lg">Loading product details…</p>
                </div>
            </>
        );
    }

    /* ───────────── Error State ───────────── */
    if (error || !product) {
        return (
            <>
                <NavBar />
                <div className="min-h-screen bg-linear-to-b from-amber-100 via-orange-50 to-white flex flex-col items-center justify-center gap-6 mt-20 px-4">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border-2 border-red-100">
                        <FaExclamationTriangle className="text-red-400 text-3xl" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Product Not Found</h2>
                        <p className="text-gray-500">{error || "The product you're looking for doesn't exist."}</p>
                    </div>
                    <Link
                        to="/store"
                        className="inline-flex items-center gap-2 bg-linear-to-r from-[#C2410C] via-[#EA580C] to-[#F59B0F] text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#F59B0F]/40 hover:scale-105 transition-all"
                    >
                        <FaArrowLeft />
                        Back to Store
                    </Link>
                </div>
            </>
        );
    }

    /* ───────────── Product Images ───────────── */
    const productImages =
        product.productImages
            ?.map((img) => normalizeImageUrl(img.url))
            .filter((url): url is string => Boolean(url && url.trim())) ?? [];

    const selectedStock = stockOptions.find((stock) => stock.id === selectedStockId) ?? null;

    const getDisplayTitle = () => {
        const baseTitle = product.name || `Product #${product.id}`;
        return selectedStock ? `${baseTitle} (${selectedStock.label})` : baseTitle;
    };

    const handleAddToCart = async (quantity: number) => {
        if (!product || isAddingToCart) {
            return;
        }

        if (!selectedStockId || !selectedStock) {
            await swalAlert("Stock required", "Please select a stock option before adding to cart.", "warning");
            return;
        }

        if (!selectedStock.inStock) {
            await swalAlert("Out of stock", "The selected stock option is currently unavailable.", "warning");
            return;
        }

        if (quantity > selectedStock.qty) {
            await swalAlert("Quantity limit", `Only ${selectedStock.qty} item(s) are available for the selected stock.`, "warning");
            return;
        }

        const existingQtyInCart = getCartItems().find((item) => item.id === selectedStockId)?.quantity || 0;
        if (existingQtyInCart + quantity > selectedStock.qty) {
            const remainingQty = Math.max(0, selectedStock.qty - existingQtyInCart);
            await swalAlert(
                "Quantity limit",
                `You already have ${existingQtyInCart} in cart. You can only add ${remainingQty} more for this stock.`,
                "warning"
            );
            return;
        }

        setIsAddingToCart(true);
        try {
            const sellingPrice = selectedStock.sellingPrice ?? parsePriceValue(product.sellingPrice);
            const showingPrice = selectedStock.showingPrice ?? parsePriceValue(product.showingPrice);
            const unitPrice = sellingPrice || showingPrice;

            addToCart(
                {
                    id: selectedStockId,
                    productId: product.id,
                    stockId: selectedStockId,
                    marketId: product.marketId ?? undefined,
                    stockQty: selectedStock.qty,
                    title: getDisplayTitle(),
                    price: unitPrice,
                    img: productImages[0] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
                    seller: product.brand?.name || "DeliveryYa Store",
                    inStock: true,
                },
                quantity
            );

            await swalAlert(
                "Added to Cart",
                `${product.name || "Product"} has been added to your cart.`,
                "success"
            );
        } catch {
            await swalAlert("An Error Occured", "Unable to add product to cart. Please try again.", "error");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const handleBuyNow = (quantity: number) => {
        if (!product) {
            return;
        }

        if (!selectedStockId || !selectedStock || !selectedStock.inStock) {
            void swalAlert("Stock required", "Please select an available stock option to continue.", "warning");
            return;
        }

        if (quantity > selectedStock.qty) {
            void swalAlert("Quantity limit", `Only ${selectedStock.qty} item(s) are available for the selected stock.`, "warning");
            return;
        }

        const sellingPrice = selectedStock.sellingPrice ?? parsePriceValue(product.sellingPrice);
        const showingPrice = selectedStock.showingPrice ?? parsePriceValue(product.showingPrice);
        const unitPrice = sellingPrice || showingPrice;

        navigate("/checkout", {
            state: {
                source: "single-product",
                items: [
                    {
                        id: selectedStockId,
                        productId: product.id,
                        stockId: selectedStockId,
                        marketId: product.marketId ?? undefined,
                        title: getDisplayTitle(),
                        price: unitPrice,
                        quantity,
                        img: productImages[0] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
                        seller: product.brand?.name || "DeliveryYa Store",
                        inStock: true,
                    },
                ],
            },
        });
    };

    const handleSubmitFeedback = async (rating: number, comment: string) => {
        if (!product?.id) {
            await swalAlert("Product unavailable", "Unable to identify the product for feedback.", "error");
            return;
        }

        if (!isAuthenticated) {
            await swalAlert("Sign in required", "Please sign in before submitting feedback.", "warning");
            navigate("/sign-in");
            return;
        }

        setIsSubmittingFeedback(true);
        try {
            await createProductFeedback({
                productId: product.id,
                rating,
                comment,
            });

            const refreshed = await getProductFeedbacks({
                pageNumber: 0,
                countPerPage: 20,
                productId: product.id,
                userId: null,
                search: null,
                fromDate: null,
                toDate: null,
            });

            setReviews(refreshed.reviews);
            setFeedbackRating(refreshed.averageRating);
            setTotalFeedbacks(refreshed.totalCount);
            await swalAlert("Feedback sent", "Thank you for sharing your feedback.", "success");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to submit feedback.";
            await swalAlert("Submission failed", message, "error");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    return (
        <>
            <NavBar />

            <div className="relative min-h-screen overflow-x-hidden bg-linear-to-b from-amber-100 via-orange-50 to-white">
                <div className="pointer-events-none absolute -top-20 -left-24 h-72 w-72 rounded-full bg-[#F59B0F]/20 blur-3xl" />
                <div className="pointer-events-none absolute top-40 -right-24 h-80 w-80 rounded-full bg-[#FB923C]/20 blur-3xl" />
                {/* Breadcrumb */}
                <div className="bg-white/85 backdrop-blur-sm border-b border-[#FBBF24]/30 sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                            <Link to="/" className="hover:text-[#F59B0F] transition-colors font-medium">Home</Link>
                            <span className="text-gray-300">/</span>
                            <Link to="/store" className="hover:text-[#F59B0F] transition-colors font-medium">Store</Link>
                            <span className="text-gray-300">/</span>
                            <Link to="/all-products" className="hover:text-[#F59B0F] transition-colors font-medium">All Products</Link>
                            <span className="text-gray-300">/</span>
                            <span className="min-w-0 max-w-48 truncate text-[#C2410C] font-semibold sm:max-w-xs">
                                {product.name || `Product #${product.id}`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                    {/* ── Main Product Section ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 mb-16">
                        {/* Left — Image Gallery */}
                        <ProductImageGallery
                            images={productImages}
                            title={product.name ?? "Product"}
                        />

                        {/* Right — Product Info */}
                        <div className="space-y-6">
                            <ProductInfo
                                brand={product.brand?.name ?? null}
                                code={product.code}
                                title={product.name}
                                sellingPrice={selectedStock?.sellingPrice ?? product.sellingPrice}
                                showingPrice={selectedStock?.showingPrice ?? product.showingPrice}
                                marketId={product.marketId}
                                stockOptions={stockOptions}
                                selectedStockId={selectedStockId}
                                onSelectStock={setSelectedStockId}
                                onClearStock={() => setSelectedStockId(null)}
                                isLoadingStocks={isLoadingStocks}
                                maxQuantity={selectedStock?.qty ?? null}
                                onAddToCart={handleAddToCart}
                                onBuyNow={handleBuyNow}
                                isAddingToCart={isAddingToCart}
                            />
                            <ProductFeatures />
                        </div>
                    </div>

                    {/* ── Description & Delivery ── */}
                    <ProductDescription description={product.desc} />

                    {/* ── Customer Reviews ── */}
                    <ProductReviews
                        rating={feedbackRating}
                        reviews={reviews}
                        totalReviews={totalFeedbacks}

                        isLoading={isLoadingFeedbacks}
                        isSubmitting={isSubmittingFeedback}
                        canSubmitFeedback={isAuthenticated}
                        onSubmitFeedback={handleSubmitFeedback}
                    />

                    {/* ── You May Also Like ── */}
                    {/* <RelatedProducts products={relatedProducts} /> */}
                </div>
            </div>
        </>
    );
}

export default SingleProductView;
