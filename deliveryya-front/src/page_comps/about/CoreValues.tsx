import { IoShieldCheckmark } from "react-icons/io5";
import { MdSpeed, MdVerifiedUser } from "react-icons/md";
import { FaHandshake, FaHeart, FaLightbulb } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";

function CoreValues() {
    const values = [
        {
            icon: <IoShieldCheckmark className="w-10 h-10" />,
            title: "Trust & Transparency",
            description: "We verify every seller and ensure transparent transactions for complete peace of mind.",
            gradient: "from-blue-500 to-blue-600"
        },
        {
            icon: <MdSpeed className="w-10 h-10" />,
            title: "Speed & Efficiency",
            description: "Lightning-fast delivery within 30 minutes without compromising quality or safety.",
            gradient: "from-yellow-500 to-orange-500"
        },
        {
            icon: <MdVerifiedUser className="w-10 h-10" />,
            title: "Quality Assurance",
            description: "Rigorous seller verification and product quality checks at every step.",
            gradient: "from-green-500 to-emerald-600"
        },
        {
            icon: <FaHandshake className="w-10 h-10" />,
            title: "Partnership",
            description: "Building strong relationships with sellers to grow together sustainably.",
            gradient: "from-purple-500 to-purple-600"
        },
        {
            icon: <FaHeart className="w-10 h-10" />,
            title: "Customer First",
            description: "Every decision we make prioritizes customer satisfaction and experience.",
            gradient: "from-pink-500 to-rose-600"
        },
        {
            icon: <FaLightbulb className="w-10 h-10" />,
            title: "Innovation",
            description: "Constantly evolving our technology to provide the best delivery solutions.",
            gradient: "from-amber-500 to-orange-600"
        }
    ];

    return (
        <section className="bg-linear-to-b from-gray-50 to-white py-20">
            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-yellow-500 to-orange-500 text-white px-6 py-2 rounded-full mb-6 shadow-lg">
                        <TbTruckDelivery className="w-5 h-5" />
                        <span className="font-bold text-sm">What We Stand For</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        Our Core <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-500 to-orange-500">Values</span>
                    </h2>
                    <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
                        The principles that guide every delivery, every partnership, and every decision we make.
                    </p>
                </div>

                {/* Values Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {values.map((value, index) => (
                        <div
                            key={index}
                            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 overflow-hidden"
                        >
                            {/* Gradient background on hover */}
                            <div className={`absolute inset-0 bg-linear-to-br ${value.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                            <div className="relative p-8">
                                {/* Icon */}
                                <div
                                    className="inline-flex items-center justify-center w-20 h-20 bg-linear-to-br from-yellow-500 to-orange-500 text-white rounded-2xl mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                                >
                                    {value.icon}
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-yellow-600 transition-colors duration-300">
                                    {value.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-600 leading-relaxed">
                                    {value.description}
                                </p>

                                {/* Decorative line */}
                                <div className="mt-6 w-0 h-1 bg-linear-to-r from-yellow-500 to-orange-500 group-hover:w-full transition-all duration-500"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default CoreValues;
