import { FaShippingFast, FaStore } from "react-icons/fa";
import { IoRocketSharp } from "react-icons/io5";

function OurStory() {
    const timeline = [
        {
            year: "2020",
            title: "The Beginning",
            description: "Started with a vision to connect local stores with customers through efficient delivery.",
            icon: <IoRocketSharp className="w-6 h-6" />
        },
        {
            year: "2021",
            title: "Rapid Growth",
            description: "Expanded to 50+ verified sellers and completed 100,000 deliveries.",
            icon: <FaStore className="w-6 h-6" />
        },
        {
            year: "2022",
            title: "Technology Upgrade",
            description: "Launched real-time tracking and AI-powered delivery optimization.",
            icon: <FaShippingFast className="w-6 h-6" />
        },
        {
            year: "2024",
            title: "Market Leader",
            description: "500+ verified sellers, 1M+ deliveries, serving customers nationwide.",
            icon: <IoRocketSharp className="w-6 h-6" />
        }
    ];

    return (
        <section className="bg-linear-to-b from-white via-[#FFF4EE] to-white">
            <div className="max-w-480 mx-auto px-8 sm:px-12 lg:px-20 xl:px-32">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        Our <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-500 to-orange-500">Journey</span>
                    </h2>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        From a simple idea to a trusted delivery platform serving thousands
                    </p>
                </div>

                {/* Timeline */}
                <div className="relative">
                    {/* Center line */}
                    <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-linear-to-b from-yellow-500 via-orange-500 to-yellow-500"></div>

                    {/* Timeline items */}
                    <div className="space-y-12">
                        {timeline.map((item, index) => (
                            <div
                                key={index}
                                className={`flex flex-col md:flex-row gap-8 items-center ${
                                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                                }`}
                            >
                                {/* Content */}
                                <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                                    <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100">
                                        <div className="text-3xl font-black text-yellow-600 mb-2">{item.year}</div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                                        <p className="text-gray-600">{item.description}</p>
                                    </div>
                                </div>

                                {/* Icon */}
                                <div className="relative shrink-0">
                                    <div className="w-16 h-16 bg-linear-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg transform hover:scale-110 transition-all duration-300">
                                        {item.icon}
                                    </div>
                                </div>

                                {/* Spacer for alternating layout */}
                                <div className="hidden md:block flex-1"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default OurStory;
