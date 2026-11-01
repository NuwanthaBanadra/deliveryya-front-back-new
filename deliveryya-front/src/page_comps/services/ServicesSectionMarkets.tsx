import { FaShoppingBag, FaStore } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { MdLocalShipping, MdSecurity, MdAutoAwesome } from "react-icons/md";
import { BsCheckCircleFill } from "react-icons/bs";

const ServicesSectionMarkets = () => {
  const navigate = useNavigate();
  const benefits = [
    {
      icon: <FaStore className="w-5 h-5" />,
      title: "1000+ Markets",
      description: "Shop from thousands of verified local stores.",
    },
    {
      icon: <MdAutoAwesome className="w-5 h-5" />,
      title: "Quality Products",
      description: "All products verified and quality checked.",
    },
    {
      icon: <MdLocalShipping className="w-5 h-5" />,
      title: "Fast Delivery",
      description: "Get your orders within 30-60 minutes.",
    },
    {
      icon: <MdSecurity className="w-5 h-5" />,
      title: "Safe Payments",
      description: "Secure transactions with multiple payment options.",
    },
  ];

  const categories = [
    { name: "Groceries", emoji: "🥬" },
    { name: "Pharmacy", emoji: "💊" },
    { name: "Electronics", emoji: "📱" },
    { name: "Fashion", emoji: "👕" },
    { name: "Beauty", emoji: "💄" },
    { name: "Home", emoji: "🏠" },
  ];

  return (
    <section id="markets-service" className="relative py-20 px-4 bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden scroll-mt-28">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-200/10 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Visual */}
          <div className="relative h-96 md:h-full flex items-center justify-center animate-slideInLeft order-2 lg:order-1">
            <div className="relative w-full max-w-sm">
              {/* Category Grid */}
              <div className="grid grid-cols-2 gap-4">
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-center cursor-pointer animate-slideInUp"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="text-4xl mb-2">{cat.emoji}</div>
                    <p className="font-bold text-sm text-gray-900">{cat.name}</p>
                  </div>
                ))}
              </div>

              {/* Center Highlight */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 rounded-full bg-blue-400/20 blur-2xl"></div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="space-y-8 animate-slideInRight order-1 lg:order-2">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-900 px-4 py-2 rounded-full font-bold text-sm">
              <FaShoppingBag className="w-4 h-4" />
              Markets Service
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                Your Local
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
                  Marketplace
                </span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed max-w-lg">
                Shop from your favorite local markets, restaurants, groceries, pharmacies, and more. All in one app with instant delivery.
              </p>
            </div>

            {/* Benefits List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center">
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{benefit.title}</h4>
                    <p className="text-gray-600 text-xs">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate('/all-markets')}
              className="bg-gradient-to-r from-blue-400 to-purple-500 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-flex items-center gap-2"
            >
              <span>Start Shopping</span>
              <FaShoppingBag className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSectionMarkets;
