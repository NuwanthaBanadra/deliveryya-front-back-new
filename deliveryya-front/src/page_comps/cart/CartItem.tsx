import { FaMinus, FaPlus, FaTrash } from "react-icons/fa";
import { formatLkr } from "../../util/CurrencyUtil";

interface CartItemProps {
    id: number;
    stockQty?: number;
    title: string;
    price: number;
    quantity: number;
    img: string;
    seller: string;
    inStock: boolean;
    onQuantityChange: (id: number, quantity: number) => void;
    onRemove: (id: number) => void;
}

const CartItem = ({ id, stockQty, title, price, quantity, img, seller, inStock, onQuantityChange, onRemove }: CartItemProps) => {
    const handleIncrement = () => {
        if (typeof stockQty === "number" && stockQty > 0 && quantity >= stockQty) {
            return;
        }
        onQuantityChange(id, quantity + 1);
    };

    const handleDecrement = () => {
        if (quantity > 1) {
            onQuantityChange(id, quantity - 1);
        }
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
            <div className="flex gap-4">
                {/* Product Image */}
                <div className="relative shrink-0">
                    <img
                        src={img}
                        alt={title}
                        className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-lg"
                    />
                    {!inStock && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">Out of Stock</span>
                        </div>
                    )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 text-sm md:text-base line-clamp-1">
                                {title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Seller: <span className="text-[#F59B0F]">{seller}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => onRemove(id)}
                            className="text-gray-400 hover:text-[#F59B0F] transition-colors duration-200 p-2"
                            aria-label="Remove item"
                        >
                            <FaTrash className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Price and Quantity Controls */}
                    <div className="flex justify-between items-center mt-3 md:mt-4">
                        {/* Price */}
                        <div>
                            <p className="text-lg md:text-xl font-bold bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] bg-clip-text text-transparent">
                                {formatLkr(price * quantity)}
                            </p>
                            <p className="text-xs text-gray-500">{formatLkr(price)} each</p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 md:gap-3">
                            <button
                                type="button"
                                onClick={handleDecrement}
                                disabled={quantity <= 1 || !inStock}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-100 text-[#AC6C2A] hover:bg-linear-to-r hover:from-[#F59B0F] hover:to-[#AC6C2A] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                            >
                                <FaMinus className="w-3 h-3" />
                            </button>
                            <span className="font-semibold text-gray-800 min-w-8 text-center">
                                {quantity}
                            </span>
                            <button
                                type="button"
                                onClick={handleIncrement}
                                disabled={!inStock || (typeof stockQty === "number" && stockQty > 0 && quantity >= stockQty)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white hover:from-[#AC6C2A] hover:to-[#8B5A28] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Increase quantity"
                            >
                                <FaPlus className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {typeof stockQty === "number" && stockQty > 0 && (
                        <p className="mt-2 text-xs text-amber-700">Max available: {stockQty}</p>
                    )}

                    {/* Stock Status */}
                    {!inStock && (
                        <div className="mt-2">
                            <span className="text-xs text-[#AC6C2A] font-medium">This item is currently unavailable</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CartItem;
