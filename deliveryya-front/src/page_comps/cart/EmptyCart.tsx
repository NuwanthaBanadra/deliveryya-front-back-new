import { FaShoppingCart, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

const EmptyCart = () => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                {/* Empty Cart Icon */}
                <div className="relative inline-block mb-6">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200 flex items-center justify-center">
                        <FaShoppingCart className="w-16 h-16 md:w-20 md:h-20 text-[#F59B0F]" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-12 h-12 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">0</span>
                    </div>
                </div>

                {/* Heading */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                    Your Cart is Empty
                </h2>

                {/* Description */}
                <p className="text-gray-600 mb-8 leading-relaxed">
                    Looks like you haven't added anything to your cart yet. 
                    Start shopping and discover amazing products from verified sellers!
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/store"
                        className="px-8 py-4 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white rounded-xl font-semibold hover:from-[#AC6C2A] hover:to-[#8B5A28] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        <FaShoppingCart />
                        Start Shopping
                    </Link>
                    <Link
                        to="/"
                        className="px-8 py-4 bg-white border-2 border-orange-200 text-gray-700 rounded-xl font-semibold hover:border-[#F59B0F] hover:text-[#F59B0F] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                        <FaArrowLeft />
                        Back to Home
                    </Link>
                </div>

                {/* Decorative Elements */}
                <div className="mt-12 grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl mb-2">🚚</div>
                        <p className="text-xs text-gray-600 font-medium">Fast Delivery</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl mb-2">🔒</div>
                        <p className="text-xs text-gray-600 font-medium">Secure Payment</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl mb-2">✨</div>
                        <p className="text-xs text-gray-600 font-medium">Quality Products</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmptyCart;
