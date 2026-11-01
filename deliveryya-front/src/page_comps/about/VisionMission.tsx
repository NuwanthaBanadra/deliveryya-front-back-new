import { IoEyeSharp, IoRocketSharp } from "react-icons/io5";
import { FaHandshake } from "react-icons/fa";

function VisionMission() {
    return (
        <section className="bg-white py-20">
            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 space-y-12">
                {/* Vision Section - hero/raw style */}
                <div className="relative flex flex-col lg:flex-row items-center gap-8">
                    <div className="lg:w-1/2">
                        <h2 className="text-4xl md:text-5xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                            Our Vision
                        </h2>

                        <p className="mt-6 text-gray-600 text-lg max-w-xl">
                            To revolutionize the e-commerce delivery ecosystem by creating a seamless connection between verified sellers and customers, making quality products accessible to everyone within minutes.
                        </p>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-yellow-500 mt-2"></div>
                                <p className="text-gray-700">Become the #1 trusted delivery platform globally</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-orange-500 mt-2"></div>
                                <p className="text-gray-700">Empower 10,000+ local businesses by 2030</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-yellow-500 mt-2"></div>
                                <p className="text-gray-700">Set industry standards for delivery excellence</p>
                            </div>
                        </div>

                    </div>

                    <div className="lg:w-1/2 flex justify-end">
                        <div className="w-full max-w-lg">
                            <img src="https://i.postimg.cc/Rh5Zg7qb/Thinking-Character.jpg" alt="Our Vision" className="w-full rounded-3xl shadow-2xl object-cover h-80" />
                        </div>
                    </div>
                </div>

                {/* Mission Section - hero/raw style (mirrored) */}
                <div className="relative flex flex-col lg:flex-row items-center gap-8">
                    <div className="lg:w-1/2 order-2 lg:order-1">
                        <img src="https://i.postimg.cc/761Fy0mK/Mission.jpg" alt="Mission" className="w-full rounded-3xl shadow-2xl object-cover h-80" />
                    </div>

                    <div className="lg:w-1/2 order-1 lg:order-2">
                        <h2 className="text-4xl md:text-5xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                            Our Mission
                        </h2>

                        <p className="mt-6 text-gray-600 text-lg max-w-xl">
                            To provide a transparent, efficient, and reliable multi-store e-commerce platform where verified sellers can thrive and customers receive their orders with unmatched speed and care.
                        </p>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#F59B0F] mt-2"></div>
                                <p className="text-gray-700">Verify and support quality sellers</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#F59B0F] mt-2"></div>
                                <p className="text-gray-700">Deliver excellence in under 30 minutes</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#F59B0F] mt-2"></div>
                                <p className="text-gray-700">Build lasting customer trust</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#F59B0F] mt-2"></div>
                                <p className="text-gray-700">Support seller growth</p>
                            </div>
                        </div>

                    </div>
                </div>

               
            </div>

             {/* Core Commitment */}
                <div className="mt-12 bg-linear-to-r from-[#F59B0F] via-[#AC6C2A] to-[#F59B0F] rounded-3xl p-8 md:p-12 mx-5 lg:mx-40 shadow-2xl">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-white">
                        <div className="shrink-0">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <FaHandshake className="w-10 h-10" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl md:text-3xl font-black mb-3">Our Core Commitment</h3>
                            <p className="text-lg opacity-95 leading-relaxed">
                                We bridge the gap between verified sellers and customers through cutting-edge delivery management technology, ensuring every transaction is secure, fast, and transparent.
                            </p>
                        </div>
                    </div>
                </div>
        </section>
    );
}

export default VisionMission;
