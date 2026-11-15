import { useRef, useEffect, useState } from "react";
import { MdDownload, MdSearch, MdPayment, MdDeliveryDining } from "react-icons/md";

const ServiceHowItWorks = () => {
  const steps = [
    // {
    //   id: 0,
    //   title: "Download App",
    //   description: "Get the DeliveryYa app on your smartphone and create an account in seconds.",
    //   icon: <MdDownload className="w-8 h-8" />,
    //   gradient: "from-blue-500 to-blue-600",
    // },
    {
      id: 1,
      title: "Search & Browse",
      description: "Browse through thousands of products and services available near you.",
      icon: <MdSearch className="w-8 h-8" />,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      id: 2,
      title: "Pay Securely",
      description: "Complete your payment safely with multiple payment method options.",
      icon: <MdPayment className="w-8 h-8" />,
      gradient: "from-orange-500 to-orange-600",
    },
    {
      id: 3,
      title: "Get Delivered",
      description: "Track your order in real-time and receive it at your doorstep.",
      icon: <MdDeliveryDining className="w-8 h-8" />,
      gradient: "from-green-500 to-green-600",
    },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;

      // Calculate progress based on section visibility
      const rect = container.getBoundingClientRect();
      const sectionProgress = Math.max(0, Math.min(100, (rect.top / window.innerHeight) * -100 + 100));
      setProgressWidth(Math.max(0, sectionProgress * 2.5));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={containerRef} className="relative py-20 px-4 bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-1/2 w-96 h-96 bg-orange-200/5 rounded-full blur-3xl -translate-x-1/2 -z-10"></div>

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            How <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A]">DeliveryYa</span> Works
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Four simple steps to get what you need delivered to your doorstep
          </p>
        </div>

        {/* Steps Grid */}
        <div className="relative">

          {/* Steps Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="group relative"
                style={{
                  animation: `slideInUp 0.7s ease-out forwards`,
                  animationDelay: `${idx * 150}ms`,
                }}
              >
                {/* Card */}
                <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full">
                  {/* Step Number */}
                  <div
                    className={`absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} text-white flex items-center justify-center font-black text-lg shadow-lg transform group-hover:scale-110 transition-transform duration-300`}
                  >
                    {step.id}
                  </div>

                  {/* Icon Container */}
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} text-white flex items-center justify-center mb-6 shadow-lg group-hover:rotate-6 group-hover:scale-110 transition-all duration-300`}
                  >
                    {step.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#F59B0F] transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {step.description}
                  </p>

                  {/* Animated Border */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F59B0F] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
                </div>

                {/* Connector Arrow (hidden on mobile) */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-24 -right-10 text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <button className="bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] text-white font-bold py-4 px-10 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            Get Started Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default ServiceHowItWorks;
