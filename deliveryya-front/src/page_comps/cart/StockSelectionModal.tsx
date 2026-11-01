import { useEffect, useState } from 'react';
import { FaTimes, FaCheckCircle } from 'react-icons/fa';
import axiosInstance from '../../util/AxiosUtil';
import { formatLkr } from '../../util/CurrencyUtil';

export type StockOption = {
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

type ApiStock = {
    id: number;
    productId?: number;
    qty?: number;
    sellingPrice?: number | null;
    showingPrice?: number | null;
    color?: string | null;
    sizes?: { id: number; name: string } | null;
    unit?: { id: number; name: string } | null;
    products?: { id: number } | null;
};

interface StockSelectionModalProps {
    /** Cart item that needs stock selection */
    cartItem: {
        id: number;
        productId?: number;
        title: string;
        img: string;
        quantity: number;
    };
    onConfirm: (stockOption: StockOption, quantity: number) => void;
    onCancel: () => void;
}

const isColorCode = (value: string): boolean => {
    const t = value.trim();
    return (
        /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t) ||
        /^rgba?\(/i.test(t) ||
        /^hsla?\(/i.test(t)
    );
};

export default function StockSelectionModal({ cartItem, onConfirm, onCancel }: StockSelectionModalProps) {
    const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
    const [pickedColorKey, setPickedColorKey] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(cartItem.quantity);

    const colorKey = (s: StockOption) => s.colorCode ?? '__nocolor__';

    useEffect(() => {
        const productId = cartItem.productId ?? cartItem.id;

        const createLabel = (stock: ApiStock): string => {
            const parts: string[] = [];
            if (stock.sizes?.name) parts.push(stock.sizes.name);
            if (stock.unit?.name) parts.push(stock.unit.name);
            const qty = Number(stock.qty ?? 0);
            const price = Number(stock.sellingPrice ?? stock.showingPrice ?? 0);
            const descriptor = parts.length > 0 ? parts.join(' / ') : `Stock #${stock.id}`;
            return `${descriptor} — Qty: ${Math.max(0, qty)} — ${formatLkr(price)}`;
        };

        const load = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const payload = {
                    pageNumber: 0,
                    countPerPage: 100,
                    productId,
                    stockId: null,
                };
                let res = await axiosInstance.post('/stocks/get-stocks', payload);
                let items: ApiStock[] = res.data?.exData?.items ?? res.data?.object?.items ?? [];
                if (String(res.data?.message ?? '').toLowerCase() !== 'success' || items.length === 0) {
                    res = await axiosInstance.get('/stocks/get-stocks', { params: payload });
                    items = res.data?.exData?.items ?? res.data?.object?.items ?? [];
                }

                const relevant = items.filter((s) => {
                    const pid = s.products?.id ?? s.productId;
                    return Number(pid) === productId;
                });
                const toMap = relevant.length > 0 ? relevant : items;

                const mapped: StockOption[] = toMap
                    .map((s): StockOption | null => {
                        const id = Number(s.id);
                        if (!Number.isFinite(id) || id <= 0) return null;
                        const qty = Math.max(0, Number(s.qty ?? 0));
                        const sp = Number(s.sellingPrice ?? 0);
                        const shp = Number(s.showingPrice ?? 0);
                        return {
                            id,
                            qty,
                            label: createLabel(s),
                            colorCode: s.color?.trim() || null,
                            colorName: s.color && !isColorCode(s.color) ? s.color.trim() : null,
                            sizeName: s.sizes?.name ?? null,
                            sellingPrice: Number.isFinite(sp) && sp > 0 ? sp : null,
                            showingPrice: Number.isFinite(shp) && shp > 0 ? shp : null,
                            inStock: qty > 0,
                        };
                    })
                    .filter((s): s is StockOption => s !== null);

                setStockOptions(mapped);

                const first = mapped.find((s) => s.inStock) ?? mapped[0] ?? null;
                if (first) {
                    setSelectedStockId(first.id);
                    setPickedColorKey(colorKey(first));
                }
            } catch {
                setLoadError('Failed to load stock options. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, [cartItem.id, cartItem.productId]);

    const selectedStock = stockOptions.find((s) => s.id === selectedStockId) ?? null;
    const hasAnyColor = stockOptions.some((s) => s.colorCode !== null);
    const uniqueColors = Array.from(new Map(stockOptions.map((s) => [colorKey(s), s])).values());
    const sizesForColor = !hasAnyColor
        ? stockOptions
        : pickedColorKey != null
            ? stockOptions.filter((s) => colorKey(s) === pickedColorKey)
            : [];

    const maxQty = selectedStock?.qty ?? null;

    const handleSelectColor = (key: string) => {
        setPickedColorKey(key);
        const first = stockOptions.find((s) => colorKey(s) === key && s.inStock)
            ?? stockOptions.find((s) => colorKey(s) === key);
        if (first) {
            setSelectedStockId(first.id);
            setQuantity(Math.min(quantity, first.qty || 1));
        }
    };

    const handleSelectSize = (stockId: number) => {
        setSelectedStockId(stockId);
        const s = stockOptions.find((o) => o.id === stockId);
        if (s) setQuantity(Math.min(quantity, s.qty || 1));
    };

    const handleConfirm = () => {
        if (!selectedStock) return;
        onConfirm(selectedStock, quantity);
    };

    const displayPrice = selectedStock?.sellingPrice ?? selectedStock?.showingPrice ?? null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-4">
                    <h2 className="text-base font-bold text-white">Select Stock Option</h2>
                    <button type="button" onClick={onCancel} aria-label="Close" title="Close" className="text-white/80 hover:text-white transition-colors">
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>

                {/* Product info strip */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-orange-50">
                    <img src={cartItem.img} alt={cartItem.title} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2">{cartItem.title}</p>
                </div>

                <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                    {isLoading && (
                        <p className="text-sm text-gray-500 py-6 text-center">Loading stock options...</p>
                    )}

                    {!isLoading && loadError && (
                        <p className="text-sm text-red-600 py-4 text-center">{loadError}</p>
                    )}

                    {!isLoading && !loadError && stockOptions.length === 0 && (
                        <p className="text-sm text-gray-500 py-4 text-center">No stock options found for this product.</p>
                    )}

                    {!isLoading && !loadError && stockOptions.length > 0 && (
                        <>
                            {/* Color selection */}
                            {hasAnyColor && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 mb-2">Color</p>
                                    <div className="flex flex-wrap gap-2">
                                        {uniqueColors.map((s) => {
                                            const key = colorKey(s);
                                            const isSelected = pickedColorKey === key;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => handleSelectColor(key)}
                                                    title={s.colorName ?? s.colorCode ?? 'Color'}
                                                    className={`h-8 w-8 rounded-full border-2 transition-all ${isSelected ? 'border-[#F59B0F] scale-110 shadow-md' : 'border-gray-300 hover:border-orange-300'}`}
                                                    style={s.colorCode ? { backgroundColor: s.colorCode } : {}}
                                                >
                                                    {!s.colorCode && (
                                                        <span className="text-xs font-semibold text-gray-700 truncate px-1">
                                                            {s.colorName ?? '?'}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Size / variant selection */}
                            {sizesForColor.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 mb-2">
                                        {sizesForColor[0].sizeName ? 'Size' : 'Option'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {sizesForColor.map((s) => {
                                            const isSelected = selectedStockId === s.id;
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    disabled={!s.inStock}
                                                    onClick={() => handleSelectSize(s.id)}
                                                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                                        isSelected
                                                            ? 'border-[#F59B0F] bg-orange-50 text-[#AC6C2A]'
                                                            : s.inStock
                                                                ? 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                                                                : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                                                    }`}
                                                >
                                                    {s.sizeName ?? s.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* No color + no size — simple list */}
                            {!hasAnyColor && sizesForColor.length === 0 && (
                                <div className="space-y-2">
                                    {stockOptions.map((s) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            disabled={!s.inStock}
                                            onClick={() => handleSelectSize(s.id)}
                                            className={`w-full rounded-xl border p-3 text-left text-xs transition-all ${
                                                selectedStockId === s.id
                                                    ? 'border-[#F59B0F] bg-orange-50'
                                                    : s.inStock
                                                        ? 'border-gray-200 bg-white hover:border-orange-300'
                                                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Price */}
                            {displayPrice !== null && (
                                <p className="text-lg font-bold text-[#AC6C2A]">{formatLkr(displayPrice)}</p>
                            )}

                            {/* Quantity */}
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-2">Quantity</p>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={quantity <= 1}
                                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                        className="w-8 h-8 rounded-lg bg-orange-100 text-[#AC6C2A] font-bold disabled:opacity-40 hover:bg-orange-200 transition-colors"
                                    >
                                        −
                                    </button>
                                    <span className="min-w-8 text-center font-semibold text-gray-800">{quantity}</span>
                                    <button
                                        type="button"
                                        disabled={maxQty !== null && quantity >= maxQty}
                                        onClick={() => setQuantity((q) => maxQty !== null ? Math.min(q + 1, maxQty) : q + 1)}
                                        className="w-8 h-8 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-bold disabled:opacity-40 transition-colors"
                                    >
                                        +
                                    </button>
                                    {maxQty !== null && (
                                        <span className="text-xs text-amber-700">Max: {maxQty}</span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!selectedStock || !selectedStock.inStock || isLoading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
                    >
                        <FaCheckCircle className="w-3.5 h-3.5" />
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
