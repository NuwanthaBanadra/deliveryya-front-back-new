import { FaTruck, FaShieldAlt } from "react-icons/fa";
import { MdLocalShipping } from "react-icons/md";

interface ProductDescriptionProps {
    description: string | null;
}

function ProductDescription({ description }: ProductDescriptionProps) {
    return (
        <div className="bg-white rounded-3xl shadow-lg p-4 sm:p-6 lg:p-8 mb-12 lg:mb-16 border border-[#FBBF24]/15 overflow-hidden">
            <div className="space-y-8">
                {/* Description */}
                {description && (
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-linear-to-b from-[#EA580C] via-[#F59B0F] to-[#FBBF24] rounded-full shadow shadow-[#F59B0F]/50"></span>
                            Product Description
                        </h2>
                        <div
                            className="pl-0 sm:pl-5 product-desc-html break-words [&_img]:max-w-full [&_img]:h-auto [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto"
                            dangerouslySetInnerHTML={{ __html: description }}
                        />
                    </div>
                )}

                {/* Delivery Info */}
                {/* <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-linear-to-b from-[#EA580C] via-[#F59B0F] to-[#FBBF24] rounded-full shadow shadow-[#F59B0F]/50"></span>
                        Delivery Information
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-5 sm:p-6 bg-linear-to-br from-[#D1FAE5] to-[#A7F3D0] rounded-2xl text-center border border-[#34D399]/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <MdLocalShipping className="text-[#059669] text-4xl mx-auto mb-3" />
                            <h3 className="font-bold text-gray-900 mb-1">Standard Delivery</h3>
                            <p className="text-gray-600 text-sm">2-3 Business Days</p>
                            <p className="text-[#059669] font-bold mt-2">FREE</p>
                        </div>
                        <div className="p-5 sm:p-6 bg-linear-to-br from-[#FEF3C7] via-[#FDE68A] to-[#FCD34D] rounded-2xl text-center border border-[#FBBF24]/60 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <FaTruck className="text-[#C2410C] text-4xl mx-auto mb-3" />
                            <h3 className="font-bold text-gray-900 mb-1">Express Delivery</h3>
                            <p className="text-gray-600 text-sm">Next Day Delivery</p>
                            <p className="text-transparent bg-clip-text bg-linear-to-r from-[#C2410C] to-[#EA580C] font-bold mt-2">LKR 9.99</p>
                        </div>
                        <div className="p-5 sm:p-6 bg-linear-to-br from-[#EDE9FE] to-[#DDD6FE] rounded-2xl text-center border border-[#A78BFA]/40 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 sm:col-span-2 lg:col-span-1">
                            <FaShieldAlt className="text-[#7C3AED] text-4xl mx-auto mb-3" />
                            <h3 className="font-bold text-gray-900 mb-1">Protected Delivery</h3>
                            <p className="text-gray-600 text-sm">Insurance Included</p>
                            <p className="text-[#7C3AED] font-bold mt-2">+LKR 4.99</p>
                        </div>
                    </div>
                </div> */}
            </div>
        </div>
    );
}

export default ProductDescription;
