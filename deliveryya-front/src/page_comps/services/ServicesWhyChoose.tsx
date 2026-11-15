import { MdVerifiedUser, MdSpeed, MdLocalShipping, MdSecurity, MdSupport, MdTrendingUp } from "react-icons/md";

const ServicesWhyChoose = () => {
  const features = [
    {
      icon: <MdVerifiedUser className="w-8 h-8" />,
      title: "Verified Partners",
      description: "All partners undergo strict verification and quality checks.",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      icon: <MdSpeed className="w-8 h-8" />,
      title: "Lightning Fast",
      description: "Quick processing and fastest delivery times in the industry.",
      gradient: "from-orange-500 to-orange-600",
    },
    {
      icon: <MdLocalShipping className="w-8 h-8" />,
      title: "Reliable Service",
      description: "99.8% on-time delivery rate with live tracking.",
      gradient: "from-green-500 to-green-600",
    },
    {
      icon: <MdSecurity className="w-8 h-8" />,
      title: "Secure Payments",
      description: "Multiple payment options with bank-level encryption.",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      icon: <MdSupport className="w-8 h-8" />,
      title: "24/7 Support",
      description: "Round-the-clock customer support in your language.",
      gradient: "from-red-500 to-red-600",
    },
    {
      icon: <MdTrendingUp className="w-8 h-8" />,
      title: "Growing Network",
      description: "Expanding to new areas and adding new services every month.",
      gradient: "from-pink-500 to-pink-600",
    },
  ];

  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-200/5 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A]">
              DeliveryYa
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Experience the difference with Sri Lanka's most trusted delivery platform
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-8"
              style={{
                animation: `slideInUp 0.7s ease-out forwards`,
                animationDelay: `${idx * 100}ms`,
              }}
            >
              {/* Gradient Background on Hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
              ></div>

              {/* Icon Container */}
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white flex items-center justify-center mb-6 shadow-lg group-hover:scale-125 group-hover:rotate-6 transition-all duration-300`}
              >
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#F59B0F] transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {feature.description}
              </p>

              {/* Animated Bottom Border */}
              <div
                className={`h-1 w-0 group-hover:w-full bg-gradient-to-r ${feature.gradient} transition-all duration-500 rounded-full`}
              ></div>

              {/* Floating Icon Background */}
              <div className="absolute -bottom-8 -right-8 text-gray-100 text-6xl opacity-5 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none">
                {feature.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Stats */}
        {/* <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 bg-gradient-to-r from-[#F59B0F]/10 to-[#AC6C2A]/10 rounded-3xl p-8 md:p-12">
          {[
            { value: "500K+", label: "Happy Users" },
            { value: "1M+", label: "Orders Delivered" },
            { value: "50+", label: "Cities Covered" },
            { value: "98%", label: "Satisfaction Rate" },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-3xl md:text-4xl font-black text-[#F59B0F] mb-2">
                {stat.value}
              </div>
              <div className="text-sm md:text-base text-gray-700 font-semibold">
                {stat.label}
              </div>
            </div>
          ))}
        </div> */}
      </div>
    </section>
  );
};

export default ServicesWhyChoose;
