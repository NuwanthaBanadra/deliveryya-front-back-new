import { TbTruckDelivery } from "react-icons/tb";
import { MdOutlineSpeed, MdSecurity, MdTrackChanges } from "react-icons/md";
import { BiSupport } from "react-icons/bi";
import { FaShoppingBag } from "react-icons/fa";
import { RiRefund2Line } from "react-icons/ri";
import { AiOutlineGlobal } from "react-icons/ai";

function OurServices() {
    const services = [
        {
            icon: <TbTruckDelivery className="w-12 h-12" />,
            title: "Fast Delivery",
            description: "Get your orders delivered within 30-60 minutes. Lightning-fast service guaranteed.",
            color: "from-[#F59B0F] to-[#AC6C2A]",
            hoverColor: "hover:from-[#AC6C2A] hover:to-[#8B5A28]"
        },
        {
            icon: <MdOutlineSpeed className="w-12 h-12" />,
            title: "Express Shipping",
            description: "Same-day delivery available for urgent orders. Your time matters to us.",
            color: "from-[#F59B0F] via-orange-500 to-red-500",
            hoverColor: "hover:from-orange-600 hover:to-red-600"
        },
        {
            icon: <MdTrackChanges className="w-12 h-12" />,
            title: "Real-Time Tracking",
            description: "Track your delivery live on the map. Know exactly where your order is.",
            color: "from-[#AC6C2A] to-[#8B5A28]",
            hoverColor: "hover:from-[#8B5A28] hover:to-amber-900"
        },
        {
            icon: <MdSecurity className="w-12 h-12" />,
            title: "Secure Payment",
            description: "Multiple payment options with bank-level security. Your money is safe.",
            color: "from-[#F59B0F] to-yellow-500",
            hoverColor: "hover:from-yellow-500 hover:to-yellow-600"
        },
        {
            icon: <BiSupport className="w-12 h-12" />,
            title: "24/7 Support",
            description: "Round-the-clock customer service. We're always here to help you.",
            color: "from-orange-400 to-[#F59B0F]",
            hoverColor: "hover:from-[#F59B0F] hover:to-orange-600"
        },
        {
            icon: <FaShoppingBag className="w-12 h-12" />,
            title: "Wide Selection",
            description: "Thousands of products from local stores. Everything you need in one place.",
            color: "from-[#AC6C2A] via-amber-700 to-amber-800",
            hoverColor: "hover:from-amber-700 hover:to-amber-900"
        },
        {
            icon: <RiRefund2Line className="w-12 h-12" />,
            title: "Easy Returns",
            description: "Hassle-free returns and refunds. 100% satisfaction guaranteed.",
            color: "from-red-500 to-orange-500",
            hoverColor: "hover:from-red-600 hover:to-orange-600"
        },
        {
            icon: <AiOutlineGlobal className="w-12 h-12" />,
            title: "Nationwide Coverage",
            description: "We deliver across the country. Expanding to new cities every month.",
            color: "from-yellow-500 to-[#F59B0F]",
            hoverColor: "hover:from-[#F59B0F] hover:to-[#AC6C2A]"
        }
    ];

    return (
        <section className="bg-linear-to-br from-gray-50 to-gray-100 py-16 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                        Why Choose <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">DeliveryYa</span> ?
                    </h2>
                    <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
                        We provide seamless delivery services with cutting-edge technology 
                        to make your shopping experience extraordinary.
                    </p>
                    <div className="mt-6 w-24 h-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] mx-auto rounded-full"></div>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {services.map((service, index) => (
                        <div
                            key={index}
                            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
                        >
                            {/* Gradient Background on Hover */}
                            <div className={`absolute inset-0 bg-linear-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                            
                            {/* Content */}
                            <div className="relative p-6 flex flex-col items-center text-center">
                                {/* Icon Container */}
                                <div className={`mb-4 p-4 rounded-full bg-linear-to-br ${service.color} ${service.hoverColor} text-white transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                                    {service.icon}
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#F59B0F] transition-colors duration-300">
                                    {service.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {service.description}
                                </p>

                                {/* Decorative Element */}
                                <div className="mt-4 w-0 h-0.5 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] group-hover:w-full transition-all duration-500"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stats Section */}
                {/* <div className="mt-20 bg-linear-to-r from-[#F59B0F] via-[#AC6C2A] to-[#F59B0F] rounded-3xl p-8 md:p-12 shadow-2xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
                        <div className="space-y-2">
                            <div className="text-4xl md:text-5xl font-bold">500K+</div>
                            <div className="text-sm md:text-base opacity-90">Happy Customers</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl md:text-5xl font-bold">1M+</div>
                            <div className="text-sm md:text-base opacity-90">Orders Delivered</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl md:text-5xl font-bold">50+</div>
                            <div className="text-sm md:text-base opacity-90">Cities Covered</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl md:text-5xl font-bold">98%</div>
                            <div className="text-sm md:text-base opacity-90">Success Rate</div>
                        </div>
                    </div>
                </div> */}

                {/* Call to Action */}
                {/* <div className="mt-16 text-center">
                    <button className="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] text-white font-bold py-4 px-10 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                        Start Ordering Now
                    </button>
                </div> */}
            </div>
        </section>
    );
}

export default OurServices;