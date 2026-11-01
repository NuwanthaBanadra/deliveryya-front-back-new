import { useState } from "react";
import CartItem from "./CartItem";
import CartSummary from "./CartSummary";
import EmptyCart from "./EmptyCart";
import StockSelectionModal from "./StockSelectionModal";
import type { StockOption } from "./StockSelectionModal";
import { FaShoppingCart, FaArrowLeft } from "react-icons/fa";
import { MdVerifiedUser } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import { getCartItems, removeCartItem, updateCartItemQuantity, saveCartItems } from "../../util/CartUtil";
import { swalAlert } from "../../util/SwalUtil";
import type { CartItem as StoredCartItem } from "../../util/CartUtil";

type CartItemType = StoredCartItem;

/** Items that were added without a stock selection (from store/all-products quick-add) */
type PendingStockItem = {
    id: number;        // cartItemId, used as the modal's cartItem.id
    cartItemId: number;
    productId: number;
    title: string;
    img: string;
    quantity: number;
};

const CartMain = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState<CartItemType[]>(() => getCartItems());
    const [pendingStockQueue, setPendingStockQueue] = useState<PendingStockItem[]>([]);
    const [resolvedItems, setResolvedItems] = useState<CartItemType[]>([]);

    const handleQuantityChange = async (id: number, newQuantity: number) => {
        const currentItem = cartItems.find((item) => item.id === id);
        if (
            currentItem &&
            typeof currentItem.stockQty === "number" &&
            currentItem.stockQty > 0 &&
            newQuantity > currentItem.stockQty
        ) {
            await swalAlert(
                "Quantity limit",
                `Only ${currentItem.stockQty} item(s) are available for this product stock.`,
                "warning"
            );
            return;
        }

        const updatedItems = updateCartItemQuantity(id, newQuantity);
        setCartItems(updatedItems);
    };

    const handleRemoveItem = (id: number) => {
        const updatedItems = removeCartItem(id);
        setCartItems(updatedItems);
    };

    const handleCheckout = () => {
        const checkoutItems = cartItems.filter((item) => item.inStock && item.quantity > 0);

        // Items without a stockId need stock selection before checkout
        const needsStockSelection = checkoutItems.filter((item) => item.stockId == null);

        if (needsStockSelection.length > 0) {
            const queue: PendingStockItem[] = needsStockSelection.map((item) => ({
                id: item.id,
                cartItemId: item.id,
                productId: item.productId ?? item.id,
                title: item.title,
                img: item.img,
                quantity: item.quantity,
            }));
            // Items that already have a stock selection pass through unchanged
            const alreadyResolved = checkoutItems.filter((item) => item.stockId != null);
            setResolvedItems(alreadyResolved);
            setPendingStockQueue(queue);
            return;
        }

        navigate("/checkout", {
            state: { source: "cart", items: checkoutItems },
        });
    };

    const handleStockConfirm = (stockOption: StockOption, quantity: number) => {
        if (pendingStockQueue.length === 0) return;
        const [current, ...rest] = pendingStockQueue;

        const resolvedItem: CartItemType = {
            id: stockOption.id,
            productId: current.productId,
            stockId: stockOption.id,
            stockQty: stockOption.qty,
            title: current.title,
            price: stockOption.sellingPrice ?? stockOption.showingPrice ?? 0,
            quantity,
            img: current.img,
            seller: 'DeliveryYa Store',
            inStock: stockOption.inStock,
        };

        const nextResolved = [...resolvedItems, resolvedItem];

        if (rest.length > 0) {
            setResolvedItems(nextResolved);
            setPendingStockQueue(rest);
        } else {
            // All items resolved — persist updated stock items and proceed to checkout
            const updatedCart = cartItems.map((item) => {
                const resolved = nextResolved.find((r) => r.productId === (item.productId ?? item.id) && item.stockId == null);
                return resolved ?? item;
            });
            saveCartItems(updatedCart);
            setCartItems(updatedCart);
            setPendingStockQueue([]);
            setResolvedItems([]);
            navigate("/checkout", {
                state: { source: "cart", items: nextResolved.concat(resolvedItems.filter((r) => !nextResolved.some((n) => n.id === r.id))) },
            });
        }
    };

    const handleStockCancel = () => {
        setPendingStockQueue([]);
        setResolvedItems([]);
    };

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
        if (item.inStock) {
            return sum + (item.price * item.quantity);
        }
        return sum;
    }, 0);
    
    const deliveryFee = subtotal >= 50 ? 0 : 5.99;
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // If cart is empty, show empty state
    if (cartItems.length === 0) {
        return <EmptyCart />;
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-amber-50 py-8 px-4">
            {pendingStockQueue.length > 0 && (
                <StockSelectionModal
                    cartItem={pendingStockQueue[0]}
                    onConfirm={handleStockConfirm}
                    onCancel={handleStockCancel}
                />
            )}
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        to="/store"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-[#F59B0F] transition-colors duration-200 mb-4"
                    >
                        <FaArrowLeft />
                        <span className="font-medium">Continue Shopping</span>
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <FaShoppingCart className="w-8 h-8 text-[#F59B0F]" />
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                            Shopping Cart
                        </h1>
                    </div>
                    <p className="text-gray-600">
                        You have {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items List */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Verified Sellers Banner */}
                        <div className="bg-linear-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-6 flex items-center gap-3 border border-orange-200">
                            <div className="bg-white rounded-full p-2">
                                <MdVerifiedUser className="w-6 h-6 text-[#F59B0F]" />
                            </div>
                            <div>
                                <p className="font-semibold text-[#F59B0F]">All Verified Sellers</p>
                                <p className="text-xs text-gray-700">
                                    Shop with confidence from our trusted verified sellers
                                </p>
                            </div>
                        </div>

                        {/* Cart Items */}
                        {cartItems.map(item => (
                            <CartItem
                                key={item.id}
                                {...item}
                                onQuantityChange={handleQuantityChange}
                                onRemove={handleRemoveItem}
                            />
                        ))}

                        {/* Continue Shopping Button (Mobile) */}
                        <Link
                            to="/store"
                            className="lg:hidden w-full py-3 bg-white border-2 border-orange-200 text-gray-700 rounded-xl font-semibold hover:border-[#F59B0F] hover:text-[#F59B0F] transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <FaArrowLeft />
                            Continue Shopping
                        </Link>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <CartSummary
                            subtotal={subtotal}
                            deliveryFee={deliveryFee}
                            onCheckout={handleCheckout}
                            itemCount={itemCount}
                        />
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                        <div className="text-3xl mb-2">🚚</div>
                        <p className="text-xs font-semibold text-gray-800 mb-1">Fast Delivery</p>
                        <p className="text-xs text-gray-500">Within 30 minutes</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                        <div className="text-3xl mb-2">🔒</div>
                        <p className="text-xs font-semibold text-gray-800 mb-1">Secure Payment</p>
                        <p className="text-xs text-gray-500">100% Protected</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                        <div className="text-3xl mb-2">✅</div>
                        <p className="text-xs font-semibold text-gray-800 mb-1">Verified Sellers</p>
                        <p className="text-xs text-gray-500">Trusted Partners</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-orange-100">
                        <div className="text-3xl mb-2">📦</div>
                        <p className="text-xs font-semibold text-gray-800 mb-1">Easy Returns</p>
                        <p className="text-xs text-gray-500">7-Day Return Policy</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartMain;
