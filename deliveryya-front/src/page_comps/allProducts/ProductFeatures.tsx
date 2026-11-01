import { FaTruck, FaShieldAlt, FaUndo } from "react-icons/fa";
import { IoTimeOutline } from "react-icons/io5";

function ProductFeatures() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-[#E0F7F4] rounded-xl">
                <FaTruck className="text-[#00BFA5] text-2xl" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Free Delivery</p>
                    <p className="text-xs text-gray-600">On orders over LKR 50</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-purple-50 rounded-xl">
                <FaShieldAlt className="text-[#7E57C2] text-2xl" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Secure Payment</p>
                    <p className="text-xs text-gray-600">100% Protected</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-linear-to-br from-[#FEF3C7] to-[#FDE68A] rounded-xl border border-[#FBBF24]">
                <FaUndo className="text-[#C2410C] text-2xl" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Easy Returns</p>
                    <p className="text-xs text-gray-600">30-day policy</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-blue-50 rounded-xl">
                <IoTimeOutline className="text-blue-600 text-2xl" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Fast Shipping</p>
                    <p className="text-xs text-gray-600">2-3 business days</p>
                </div>
            </div>
        </div>
    );
}

export default ProductFeatures;
