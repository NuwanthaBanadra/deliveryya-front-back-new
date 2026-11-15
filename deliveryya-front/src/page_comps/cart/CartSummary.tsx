import { FaShoppingBag, FaTruck, FaTag } from "react-icons/fa";
import { MdLocalOffer } from "react-icons/md";
import { formatLkr } from "../../util/CurrencyUtil";

interface CartSummaryProps {
    subtotal: number;
    deliveryFee: number;
    onCheckout: () => void;
    itemCount: number;
}

const CartSummary = ({ subtotal, deliveryFee, onCheckout, itemCount }: CartSummaryProps) => {
    const total = subtotal + deliveryFee;
    const freeDeliveryThreshold = 50;
    const remainingForFreeDelivery = freeDeliveryThreshold - subtotal;

    return (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 sticky top-24">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaShoppingBag className="text-[#F59B0F]" />
                Order Summary
            </h2>

            {/* Free Delivery Progress */}
            {subtotal < freeDeliveryThreshold && deliveryFee > 0 && (
                <div className="mb-6 p-4 bg-linear-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                        <FaTruck className="text-[#F59B0F]" />
                        <p className="text-sm font-medium text-gray-700">
                            Add {formatLkr(remainingForFreeDelivery)} more for free delivery!
                        </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] transition-all duration-300"
                            style={{ width: `${Math.min((subtotal / freeDeliveryThreshold) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-gray-600">
                    <span className="text-sm">Subtotal ({itemCount} items)</span>
                    <span className="font-semibold">{formatLkr(subtotal)}</span>
                </div>

                {/* <div className="flex justify-between items-center text-gray-600">
                    <span className="text-sm flex items-center gap-1">
                        <FaTruck className="text-[#F59B0F]" />
                        Delivery Fee
                    </span>
                    {deliveryFee === 0 ? (
                        <span className="font-semibold text-[#F59B0F]">FREE</span>
                    ) : (
                        <span className="font-semibold">{formatLkr(deliveryFee)}</span>
                    )}
                </div> */}

                <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-800">Total</span>
                        <span className="text-2xl font-bold bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] bg-clip-text text-transparent">
                            {formatLkr(total)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Promo Code Section */}
            {/* <div className="mb-6">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Enter promo code"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59B0F]/30 focus:border-[#F59B0F]"
                    />
                    <button className="px-4 py-2 bg-orange-100 text-[#AC6C2A] rounded-lg hover:bg-orange-200 transition-colors duration-200 font-medium">
                        Apply
                    </button>
                </div>
            </div> */}

            {/* Checkout Button */}
            <button
                onClick={onCheckout}
                className="w-full py-4 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white rounded-xl font-semibold hover:from-[#AC6C2A] hover:to-[#8B5A28] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
                Proceed to Checkout
            </button>

            {/* Security Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <svg className="w-4 h-4 text-[#F59B0F]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure checkout powered by DeliveryYa</span>
            </div>

            {/* Additional Info */}
            <div className="mt-6 p-4 bg-linear-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2">
                    <MdLocalOffer className="text-[#F59B0F] mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-medium text-[#AC6C2A] mb-1">Special Offers</p>
                        <p className="text-xs text-gray-600">
                            Get 10% off on your first order over LKR 100. Use code: FIRST10
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartSummary;
