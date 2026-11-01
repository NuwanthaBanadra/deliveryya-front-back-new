import { MdEmail } from 'react-icons/md'
import { TbTruckDelivery } from 'react-icons/tb'

function Subscribe() {
    return (
        <>
            {/* Newsletter Section */}
            <div className="relative bg-white py-20 overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-linear-to-br from-[#FFF4EE] via-[#FFE5D9] to-[#FFF4EE]"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD4C4] rounded-full blur-3xl opacity-30"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFCBA4] rounded-full blur-3xl opacity-30"></div>

                <div className="relative max-w-480 mx-auto px-8 sm:px-12 lg:px-20 xl:px-32">
                    <div className="bg-linear-to-r from-[#F59B0F] via-[#AC6C2A] to-[#F59B0F] rounded-3xl shadow-2xl overflow-hidden">
                        <div className="grid lg:grid-cols-2 gap-8 items-center">
                            {/* Left Content */}
                            <div className="p-8 md:p-12 lg:p-16">
                                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                                    <TbTruckDelivery className="w-5 h-5 text-white" />
                                    <span className="text-sm font-bold text-white">Exclusive Offers</span>
                                </div>
                                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                                    Get Special Deals Delivered!
                                </h3>
                                <p className="text-white/90 text-lg mb-8">
                                    Join 100,000+ happy subscribers and get exclusive discounts, early access to sales, and delivery tips straight to your inbox.
                                </p>

                                {/* Features */}
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="flex items-center gap-2 text-white">
                                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                            <span className="text-sm">✓</span>
                                        </div>
                                        <span className="text-sm font-semibold">Exclusive Deals</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white">
                                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                            <span className="text-sm">✓</span>
                                        </div>
                                        <span className="text-sm font-semibold">Weekly Updates</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white">
                                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                            <span className="text-sm">✓</span>
                                        </div>
                                        <span className="text-sm font-semibold">No Spam</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white">
                                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                            <span className="text-sm">✓</span>
                                        </div>
                                        <span className="text-sm font-semibold">Unsubscribe Anytime</span>
                                    </div>
                                </div>

                                {/* Newsletter Form */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="email"
                                        placeholder="Enter your email address"
                                        className="flex-1 px-6 py-4 rounded-xl text-gray-900 font-medium focus:outline-hidden focus:ring-4 focus:ring-white/50 shadow-lg"
                                    />
                                    <button className="bg-gray-900 hover:bg-black text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 whitespace-nowrap">
                                        Subscribe Now
                                    </button>
                                </div>
                                <p className="text-white/70 text-xs mt-3">
                                    By subscribing, you agree to our Privacy Policy and consent to receive updates.
                                </p>
                            </div>

                            {/* Right Image/Graphics */}
                            <div className="hidden lg:flex items-center justify-center p-12 relative">
                                <div className="relative">
                                    {/* Decorative circles */}
                                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/20 rounded-full"></div>
                                    <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/10 rounded-full"></div>

                                    {/* Main graphic */}
                                    <div className="relative bg-white rounded-3xl p-8 shadow-2xl">
                                        <div className="text-center space-y-4">
                                            <div className="inline-flex items-center justify-center w-24 h-24 bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] rounded-2xl shadow-xl">
                                                <MdEmail className="w-12 h-12 text-white" />
                                            </div>
                                            <h4 className="text-2xl font-bold text-gray-900">Stay Updated!</h4>
                                            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                                                <div className="flex -space-x-2">
                                                    <div className="w-8 h-8 bg-[#F59B0F] rounded-full border-2 border-white"></div>
                                                    <div className="w-8 h-8 bg-[#AC6C2A] rounded-full border-2 border-white"></div>
                                                    <div className="w-8 h-8 bg-orange-500 rounded-full border-2 border-white"></div>
                                                </div>
                                                <span className="font-semibold">100K+ Subscribers</span>
                                            </div>
                                            <div className="pt-4 space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 bg-[#FFF4EE] px-4 py-2 rounded-lg">
                                                    <span className="text-lg">🎉</span>
                                                    <span>Get 20% off first order</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-700 bg-[#FFE5D9] px-4 py-2 rounded-lg">
                                                    <span className="text-lg">🚀</span>
                                                    <span>Free delivery vouchers</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </>
    )
}

export default Subscribe