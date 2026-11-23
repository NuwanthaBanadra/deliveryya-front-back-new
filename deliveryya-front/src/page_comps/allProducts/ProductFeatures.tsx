import { FaTruck, FaShieldAlt, FaUndo } from "react-icons/fa";
import { IoTimeOutline } from "react-icons/io5";

function ProductFeatures() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-[#FFF9F4] p-3">
                <FaTruck className="text-[#EA580C] text-2xl" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Free Delivery</p>
                    <p className="text-xs text-gray-600">On orders over LKR 50</p>
                </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <FaShieldAlt className="text-[#C2410C] text-2xl" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Secure Payment</p>
                    <p className="text-xs text-gray-600">100% Protected</p>
                </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <FaUndo className="text-[#C2410C] text-2xl" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Easy Returns</p>
                    <p className="text-xs text-gray-600">30-day policy</p>
                </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-[#FFF9F4] p-3">
                <IoTimeOutline className="text-[#F59B0F] text-2xl" />
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Fast Shipping</p>
                    <p className="text-xs text-gray-600">2-3 business days</p>
                </div>
            </div>
        </div>
    );
}

export default ProductFeatures;
