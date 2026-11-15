import { FaUsers, FaStore, FaTrophy } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";
import { MdVerifiedUser, MdStar } from "react-icons/md";

function TeamStats() {
    const stats = [
        {
            icon: <FaUsers className="w-8 h-8" />,
            number: "200+",
            label: "Team Members",
            gradient: "from-blue-500 to-blue-600"
        },
        {
            icon: <FaStore className="w-8 h-8" />,
            number: "500+",
            label: "Verified Sellers",
            gradient: "from-yellow-500 to-orange-500"
        },
        {
            icon: <TbTruckDelivery className="w-8 h-8" />,
            number: "1M+",
            label: "Deliveries",
            gradient: "from-green-500 to-emerald-600"
        },
        {
            icon: <MdVerifiedUser className="w-8 h-8" />,
            number: "500K+",
            label: "Happy Customers",
            gradient: "from-purple-500 to-purple-600"
        },
        {
            icon: <MdStar className="w-8 h-8" />,
            number: "4.9/5",
            label: "Average Rating",
            gradient: "from-amber-500 to-yellow-600"
        },
        {
            icon: <FaTrophy className="w-8 h-8" />,
            number: "15+",
            label: "Awards Won",
            gradient: "from-orange-500 to-red-500"
        }
    ];

    return (
        <section className="bg-linear-to-b from-white to-gray-50 py-20">
            <div className="max-w-480 mx-auto px-8 sm:px-12 lg:px-20 xl:px-32">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        Our Impact in <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-500 to-orange-500">Numbers</span>
                    </h2>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Together, we're building something extraordinary
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="group relative bg-white border border-[#FFE5D9] shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 overflow-hidden"
                        >
                            <div className={`absolute inset-0 bg-linear-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                            <div className="relative p-8 text-center">
                                <div className={`inline-flex items-center justify-center w-16 h-16 bg-linear-to-br ${stat.gradient} rounded-2xl text-white mb-4 shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                                    {stat.icon}
                                </div>
                                <div className="text-4xl md:text-5xl font-black text-gray-900 mb-2">
                                    {stat.number}
                                </div>
                                <div className="text-gray-600 font-semibold">
                                    {stat.label}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Team Culture */}
                <div className="mt-16 bg-linear-to-r from-[#F59B0F] via-[#AC6C2A] to-[#F59B0F] rounded-3xl p-8 md:p-12 shadow-2xl text-white">
                    <div className="text-center space-y-4">
                        <h3 className="text-3xl md:text-4xl font-black">Join Our Growing Team</h3>
                        <p className="text-lg opacity-95 max-w-2xl mx-auto">
                            We're always looking for passionate individuals who want to revolutionize delivery services
                        </p>
                        <button className="bg-white hover:bg-gray-100 text-yellow-600 font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 mt-4">
                            View Open Positions
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default TeamStats;
