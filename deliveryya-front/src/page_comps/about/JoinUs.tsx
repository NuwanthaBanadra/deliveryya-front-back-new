import { FaStore, FaShippingFast } from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";

function JoinUs() {
    const opportunities = [
        {
            icon: <FaStore className="w-12 h-12" />,
            title: "Become a Seller",
            description: "Join our network of verified sellers and reach thousands of customers",
            benefits: ["Free verification", "Marketing support", "Dashboard analytics"],
            cta: "Start Selling",
            gradient: "from-[#F59B0F] to-[#AC6C2A]",
            iconBg: "from-[#F59B0F] to-[#FF8C42]",
            hoverColor: "hover:text-[#F59B0F]"
        },
        {
            icon: <FaShippingFast className="w-12 h-12" />,
            title: "Join as Driver",
            description: "Earn money on your schedule with our flexible delivery system",
            benefits: ["Flexible hours", "Competitive pay", "Weekly payouts"],
            cta: "Become a Driver",
            gradient: "from-[#AC6C2A] to-[#8B5A28]",
            iconBg: "from-[#AC6C2A] to-[#F59B0F]",
            hoverColor: "hover:text-[#AC6C2A]"
        },
        {
            icon: <MdSupportAgent className="w-12 h-12" />,
            title: "Work With Us",
            description: "Build your career with a fast-growing delivery technology company",
            benefits: ["Great culture", "Growth opportunities", "Competitive benefits"],
            cta: "View Careers",
            gradient: "from-[#FF8C42] to-[#F59B0F]",
            iconBg: "from-[#FF8C42] to-[#AC6C2A]",
            hoverColor: "hover:text-[#FF8C42]"
        }
    ];

    return (
        <section className="bg-linear-to-b from-white via-[#FFF4EE] to-white py-20">
            <div className="max-w-480 mx-auto px-8 sm:px-12 lg:px-20 xl:px-32">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        Join the <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">DeliveryYa</span> Family
                    </h2>
                    <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
                        Whether you're a seller, driver, or looking for a career, we have opportunities for you
                    </p>
                </div>

                {/* Opportunities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {opportunities.map((opp, index) => (
                        <div
                            key={index}
                            className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 overflow-hidden border border-[#FFE5D9]"
                        >
                            {/* Gradient overlay */}
                            <div className={`absolute inset-0 bg-linear-to-br ${opp.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                            <div className="relative p-8">
                                {/* Icon */}
                                <div className={`inline-flex items-center justify-center w-20 h-20 bg-linear-to-br ${opp.iconBg} rounded-2xl text-white mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                                    {opp.icon}
                                </div>

                                {/* Title */}
                                <h3 className={`text-2xl font-bold text-gray-900 mb-3 transition-colors ${opp.hoverColor}`}>
                                    {opp.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-600 mb-6 leading-relaxed">
                                    {opp.description}
                                </p>

                                {/* Benefits */}
                                <div className="space-y-2 mb-6">
                                    {opp.benefits.map((benefit, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-gray-700">
                                            <div className={`w-2 h-2 bg-linear-to-r ${opp.gradient} rounded-full`}></div>
                                            <span className="text-sm font-semibold">{benefit}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Button */}
                                <button className={`w-full bg-linear-to-r ${opp.gradient} hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105`}>
                                    {opp.cta} →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default JoinUs;
