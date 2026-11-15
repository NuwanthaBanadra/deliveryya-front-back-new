import { useEffect, useState } from "react";
import {
    FaShoppingCart,
    FaShare,
    FaCheckCircle,
    FaMinus,
    FaPlus,
    FaTag,
    FaBoxOpen,
    FaLink,
    FaWhatsapp,
    FaFacebookF,
    FaTwitter
} from "react-icons/fa";
import { MdStorefront } from "react-icons/md";
import { formatLkr } from "../../util/CurrencyUtil";

export type ProductStockOption = {
    id: number;
    qty: number;
    label: string;
    colorCode: string | null;
    colorName: string | null;
    sizeName: string | null;
    sellingPrice: number | null;
    showingPrice: number | null;
    inStock: boolean;
};

interface ProductInfoProps {
    brand: string | null;
    code: string | null;
    title: string | null;
    sellingPrice: string | number | null;
    showingPrice: string | number | null;
    marketId: number | null;
    stockOptions?: ProductStockOption[];
    selectedStockId?: number | null;
    onSelectStock?: (stockId: number) => void;
    isLoadingStocks?: boolean;
    onClearStock?: () => void;
    maxQuantity?: number | null;
    onAddToCart?: (quantity: number) => void | Promise<void>;
    onBuyNow?: (quantity: number) => void;
    isAddingToCart?: boolean;
}

function ProductInfo({
    brand,
    code,
    title,
    sellingPrice,
    showingPrice,
    marketId,
    stockOptions = [],
    selectedStockId = null,
    onSelectStock,
    isLoadingStocks = false,
    onClearStock,
    maxQuantity = null,
    onAddToCart,
    onBuyNow,
    isAddingToCart = false,
}: ProductInfoProps) {
    const [quantity, setQuantity] = useState(1);
    const [pickedColorKey, setPickedColorKey] = useState<string | null>(null);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const colorKey = (s: ProductStockOption) => s.colorCode ?? "__nocolor__";

    useEffect(() => {
        if (selectedStockId == null) {
            setPickedColorKey(null);
            return;
        }
        const stock = stockOptions.find((s) => s.id === selectedStockId);
        if (stock) setPickedColorKey(colorKey(stock));
    }, [selectedStockId]);

    const normalizedMaxQuantity =
        typeof maxQuantity === "number" && Number.isFinite(maxQuantity) && maxQuantity > 0
            ? Math.floor(maxQuantity)
            : null;

    useEffect(() => {
        if (normalizedMaxQuantity !== null && quantity > normalizedMaxQuantity) {
            setQuantity(normalizedMaxQuantity);
        }
    }, [normalizedMaxQuantity, quantity]);

    const parsePriceValue = (price: string | number | null): number | null => {
        if (typeof price === "number") {
            return Number.isFinite(price) ? price : null;
        }

        if (typeof price === "string") {
            const numeric = Number.parseFloat(price.replace(/[^0-9.]/g, ""));
            return Number.isFinite(numeric) ? numeric : null;
        }

        return null;
    };

    const sellingPriceValue = parsePriceValue(sellingPrice);
    const showingPriceValue = parsePriceValue(showingPrice);
    const selectedStock = stockOptions.find((stock) => stock.id === selectedStockId) ?? null;
    const stockSelectionRequired = stockOptions.length > 0;
    const hasSelectedStock = !stockSelectionRequired || selectedStock !== null;
    const isSelectedStockInStock = selectedStock ? selectedStock.inStock : true;
    const areActionsDisabled = isAddingToCart || !hasSelectedStock || !isSelectedStockInStock;
    const hasAnyColor = stockOptions.some((s) => s.colorCode !== null);
    const uniqueColors = Array.from(new Map(stockOptions.map((s) => [colorKey(s), s])).values());
    const sizesForColor = !hasAnyColor
        ? stockOptions
        : pickedColorKey != null
            ? stockOptions.filter((s) => colorKey(s) === pickedColorKey)
            : [];
    const hasDiscount = sellingPriceValue !== null && showingPriceValue !== null && showingPriceValue > sellingPriceValue;
    const discountPercent = hasDiscount
        ? Math.round(((showingPriceValue! - sellingPriceValue!) / showingPriceValue!) * 100)
        : null;

    const handleQuantityChange = (action: "increase" | "decrease") => {
        if (action === "increase") {
            setQuantity((q) => {
                if (normalizedMaxQuantity !== null) {
                    return Math.min(q + 1, normalizedMaxQuantity);
                }
                return q + 1;
            });
        }
        else if (action === "decrease" && quantity > 1) setQuantity((q) => q - 1);
    };

    const formatPrice = (price: number | null) =>
        price !== null ? formatLkr(price) : "—";

    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = title || "DeliveryYa Product";

    useEffect(() => {
        if (!isShareMenuOpen) {
            return;
        }

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest("[data-share-menu-root='true']")) {
                setIsShareMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsShareMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isShareMenuOpen]);

    const openShareWindow = (url: string) => {
        if (!url) return;
        window.open(url, "_blank", "noopener,noreferrer");
        setIsShareMenuOpen(false);
    };

    const handleCopyShareLink = async () => {
        if (!shareUrl) return;

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
            }
        } catch {
            // If clipboard is blocked by browser permissions, keep menu open and allow other options.
        }
    };

    return (
        <div className="space-y-5">
            {/* Brand & Code badges */}
            <div className="flex flex-wrap items-center gap-2">
                {brand && (
                    <span className="inline-flex items-center gap-1.5 bg-linear-to-r from-[#FEF3C7] to-[#FDE68A] text-[#92400E] text-xs font-bold px-3 py-1.5 rounded-full border border-[#FBBF24]/50 shadow-sm">
                        <MdStorefront className="text-[#C2410C]" />
                        {brand}
                    </span>
                )}
                {code && (
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 text-xs font-mono px-3 py-1.5 rounded-full border border-gray-200">
                        <FaTag className="text-xs" />
                        {code}
                    </span>
                )}
                {marketId && (
                    <span className="inline-flex items-center gap-1.5 bg-[#F0FDF4] text-[#15803D] text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
                        <FaBoxOpen className="text-xs" />
                        Market #{marketId}
                    </span>
                )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight break-words">
                {title || "Unnamed Product"}
            </h1>

            {/* Price block */}
            <div className="bg-linear-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] p-5 rounded-2xl border border-[#F59B0F]/40 shadow-md">
                {sellingPriceValue !== null ? (
                    <div className="flex items-end gap-4 flex-wrap">
                        <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-[#92400E] via-[#C2410C] to-[#EA580C] break-all">
                            {formatPrice(sellingPriceValue)}
                        </span>
                        {hasDiscount && (
                            <>
                                <span className="text-base sm:text-xl text-gray-400 line-through font-medium">
                                    {formatPrice(showingPriceValue)}
                                </span>
                                <span className="bg-linear-to-r from-[#DC2626] to-[#EA580C] text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                                    -{discountPercent}% OFF
                                </span>
                            </>
                        )}
                    </div>
                ) : showingPriceValue !== null ? (
                    <div className="flex items-end gap-3">
                        <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-[#92400E] via-[#C2410C] to-[#EA580C] break-all">
                            {formatPrice(showingPriceValue)}
                        </span>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">Price not available</p>
                )}
            </div>

            {/* Availability */}
            <div className="flex items-center gap-3 p-4 bg-[#F0FDF4] border border-green-200 rounded-2xl">
                <FaCheckCircle className={`text-xl flex-shrink-0 ${isSelectedStockInStock ? "text-green-500" : "text-red-500"}`} />
                <div>
                    <span className={`font-semibold text-sm ${isSelectedStockInStock ? "text-green-800" : "text-red-800"}`}>
                        {isSelectedStockInStock ? "In Stock" : "Out of Stock"}
                    </span>
                    <p className={`text-xs mt-0.5 ${isSelectedStockInStock ? "text-green-600" : "text-red-600"}`}>
                        {stockSelectionRequired && !selectedStock
                            ? "Select a stock option to continue"
                            : selectedStock
                                ? `${selectedStock.qty} item(s) available`
                                : "Ready to ship"}
                    </p>
                </div>
            </div>

            {/* Stock selector — Step 1: Color, Step 2: Size */}
            <div className="space-y-5">
                {/* Loading */}
                {isLoadingStocks && (
                    <div className="rounded-xl border-2 border-dashed border-[#FBBF24]/40 bg-[#FFF8E7] px-4 py-3 text-sm text-gray-600">
                        Loading stock options…
                    </div>
                )}

                {/* Empty */}
                {!isLoadingStocks && stockOptions.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        No stock options available
                    </div>
                )}

                {/* Step 1 – Color swatches */}
                {!isLoadingStocks && hasAnyColor && stockOptions.length > 0 && (
                    <div>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-gray-800 font-semibold text-sm">Color</span>
                            {pickedColorKey ? (
                                <span className="text-xs font-medium text-[#C2410C]">
                                    {uniqueColors.find((s) => colorKey(s) === pickedColorKey)?.colorName ?? pickedColorKey}
                                </span>
                            ) : (
                                <span className="text-xs text-amber-600 italic">Select a color to see available sizes</span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            {uniqueColors.map((stock) => {
                                const key = colorKey(stock);
                                const isPickedColor = pickedColorKey === key;
                                const stocksForColor = stockOptions.filter((s) => colorKey(s) === key);
                                const anyInStock = stocksForColor.some((s) => s.inStock);

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        title={stock.colorName ?? stock.colorCode ?? "Color"}
                                        disabled={!anyInStock}
                                        onClick={() => {
                                            setPickedColorKey(key);
                                            if (stocksForColor.length === 1) {
                                                onSelectStock?.(stocksForColor[0].id);
                                            } else {
                                                onClearStock?.();
                                            }
                                        }}
                                        className={`group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 w-18 transition-all disabled:pointer-events-none disabled:opacity-35 ${
                                            isPickedColor
                                                ? "border-[#F59B0F] bg-[#FFF8E7] shadow-md shadow-[#F59B0F]/25"
                                                : "border-gray-200 bg-white hover:border-[#F59B0F]/50 hover:shadow-sm"
                                        }`}
                                    >
                                        <span
                                            className={`h-9 w-9 rounded-full shadow-sm transition-transform group-hover:scale-105 ${isPickedColor ? "ring-2 ring-[#F59B0F] ring-offset-1" : "ring-1 ring-gray-200"}`}
                                            style={{ backgroundColor: stock.colorCode ?? "#e5e7eb" }}
                                        />
                                        <span className="text-[10px] font-medium text-gray-600 text-center leading-tight w-full truncate">
                                            {stock.colorName ?? stock.colorCode ?? "—"}
                                        </span>
                                        {isPickedColor && (
                                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#F59B0F] border-2 border-white flex items-center justify-center">
                                                <FaCheckCircle className="text-white text-[8px]" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 2 – Size / variant buttons */}
                {!isLoadingStocks && sizesForColor.length > 0 && (
                    <div>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-gray-800 font-semibold text-sm">
                                {hasAnyColor ? "Size" : "Stock Option"}
                            </span>
                            {selectedStock && (
                                <span className="text-xs font-medium text-[#C2410C]">
                                    {selectedStock.sizeName ?? "Standard"}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {sizesForColor.map((stock) => {
                                const isSelected = selectedStockId === stock.id;
                                const displayPrice = stock.sellingPrice ?? stock.showingPrice;

                                return (
                                    <button
                                        key={stock.id}
                                        type="button"
                                        disabled={!stock.inStock}
                                        onClick={() => onSelectStock?.(stock.id)}
                                        className={`relative rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed ${
                                            isSelected
                                                ? "border-[#F59B0F] bg-linear-to-br from-[#FFFBEB] to-[#FEF3C7] text-gray-900 shadow-md shadow-[#F59B0F]/20"
                                                : stock.inStock
                                                    ? "border-gray-200 bg-white text-gray-700 hover:border-[#F59B0F]/50 hover:shadow-sm hover:bg-[#FFFBEB]/40"
                                                    : "border-gray-200 bg-gray-50 text-gray-400 line-through"
                                        }`}
                                    >
                                        <span>{stock.sizeName || "Standard"}</span>
                                        {displayPrice != null && (
                                            <span className={`ml-1.5 text-xs font-normal ${isSelected ? "text-amber-700" : "text-gray-400"}`}>
                                                {formatLkr(displayPrice)}
                                            </span>
                                        )}
                                        {isSelected && (
                                            <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-[#F59B0F] border-2 border-white" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Quantity selector */}
            <div>
                <label className="block text-gray-800 font-semibold text-sm mb-3">Quantity</label>
                <div className="flex items-center gap-4">
                    <div className="flex w-full sm:w-auto items-center bg-white border-2 border-[#FBBF24]/40 rounded-xl overflow-hidden shadow-sm">
                        <button
                            type="button"
                            title="Decrease quantity"
                            onClick={() => handleQuantityChange("decrease")}
                            disabled={quantity <= 1}
                            className="px-4 py-3 text-gray-600 hover:bg-[#FFF8E7] hover:text-[#C2410C] transition-colors disabled:opacity-40"
                        >
                            <FaMinus className="text-xs" />
                        </button>
                        <span className="flex-1 sm:flex-none px-4 sm:px-6 py-3 font-bold text-gray-900 border-x-2 border-[#FBBF24]/30 min-w-[56px] text-center bg-[#FFFBEB]">
                            {quantity}
                        </span>
                        <button
                            type="button"
                            title="Increase quantity"
                            onClick={() => handleQuantityChange("increase")}
                            disabled={normalizedMaxQuantity !== null && quantity >= normalizedMaxQuantity}
                            className="px-4 py-3 text-gray-600 hover:bg-[#FFF8E7] hover:text-[#C2410C] transition-colors"
                        >
                            <FaPlus className="text-xs" />
                        </button>
                    </div>
                </div>
                {normalizedMaxQuantity !== null && (
                    <p className="mt-2 text-xs text-amber-700">Maximum available quantity: {normalizedMaxQuantity}</p>
                )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 pt-1">
                <button
                    type="button"
                    onClick={() => onAddToCart?.(quantity)}
                    disabled={areActionsDisabled}
                    className="w-full bg-linear-to-r from-[#C2410C] via-[#EA580C] to-[#F59B0F] text-white py-4 px-6 rounded-2xl font-bold text-base shadow-lg shadow-[#F59B0F]/40 hover:shadow-2xl hover:shadow-[#F59B0F]/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <FaShoppingCart />
                    {isAddingToCart ? "Adding..." : "Add to Cart"}
                </button>
                <div className="relative w-full sm:w-auto" data-share-menu-root="true">
                    {isShareMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-3 z-30 w-56 rounded-xl border border-orange-200 bg-white p-2.5 shadow-xl shadow-orange-100">
                            <div className="mb-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Share this product</div>
                            <button
                                type="button"
                                onClick={handleCopyShareLink}
                                className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-2"
                            >
                                <FaLink className="text-[#C2410C]" />
                                {copied ? "Link copied" : "Copy link"}
                            </button>
                            <button
                                type="button"
                                onClick={() => openShareWindow(`https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`)}
                                className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-2"
                            >
                                <FaWhatsapp className="text-green-600" />
                                WhatsApp
                            </button>
                            <button
                                type="button"
                                onClick={() => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
                                className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-2"
                            >
                                <FaFacebookF className="text-blue-600" />
                                Facebook
                            </button>
                            <button
                                type="button"
                                onClick={() => openShareWindow(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`)}
                                className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-2"
                            >
                                <FaTwitter className="text-[#1D9BF0]" />
                                X (Twitter)
                            </button>
                            <span className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-orange-200 bg-white" />
                        </div>
                    )}

                    <button
                        type="button"
                        title="Share product"
                        onClick={() => setIsShareMenuOpen((prev) => !prev)}
                        aria-label="Open share options"
                        className="w-full sm:w-auto p-4 rounded-2xl border-2 border-[#FBBF24]/40 bg-white hover:border-[#F59B0F] hover:shadow-md hover:shadow-[#F59B0F]/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <FaShare className="text-gray-500 text-xl" />
                    </button>
                </div>
            </div>

            {/* Buy Now */}
            <button
                type="button"
                onClick={() => onBuyNow?.(quantity)}
                disabled={areActionsDisabled}
                className="w-full bg-linear-to-r from-[#15803D] via-[#16A34A] to-[#22C55E] hover:from-[#166534] hover:via-[#15803D] hover:to-[#16A34A] text-white py-4 px-6 rounded-2xl font-bold text-base shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
                Buy Now
            </button>
        </div>
    );
}

export default ProductInfo;
