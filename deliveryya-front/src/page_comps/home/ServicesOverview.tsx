import { TbTruckDelivery } from "react-icons/tb";
import { FaShoppingBag } from "react-icons/fa";
import { BsLightningFill } from "react-icons/bs";
import { MdArrowOutward } from "react-icons/md";

interface ServiceCard {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  hoverGradient: string;
  cta: string;
  href: string;
}

const ServicesOverview = () => {
  const services: ServiceCard[] = [
    {
      id: 1,
      title: "Urgent Jobs",
      description: "Quick tasks, same-day delivery, and time-sensitive work. Perfect for when you need something done fast.",
      icon: <BsLightningFill className="w-8 h-8" />,
      gradient: "from-yellow-400 to-orange-500",
      hoverGradient: "hover:from-orange-500 hover:to-red-500",
      cta: "Quick Task",
      href: "/urgent-job",
    },
    {
      id: 2,
      title: "Markets",
      description: "Browse thousands of products from local markets. Shop groceries, electronics, pharmacies, and more.",
      icon: <FaShoppingBag className="w-8 h-8" />,
      gradient: "from-blue-400 to-purple-500",
      hoverGradient: "hover:from-purple-500 hover:to-pink-500",
      cta: "Browse",
      href: "/store",
    },
    {
      id: 3,
      title: "Delivery",
      description: "Fast, reliable delivery service with real-time tracking. Track your order from pickup to doorstep.",
      icon: <TbTruckDelivery className="w-8 h-8" />,
      gradient: "from-green-400 to-emerald-500",
      hoverGradient: "hover:from-emerald-500 hover:to-teal-500",
      cta: "Track Order",
      href: "/track-your-order",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-white via-gray-50 to-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 leading-tight">
            Everything You Need,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A]">
              Delivered Through One Platform
            </span>
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Choose the service that fits your needs and get started in seconds
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {services.map((service, idx) => (
            <div
              key={service.id}
              className={`group relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 animate-slideInUp`}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              {/* Gradient Background Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
              ></div>

              {/* Content */}
              <div className="relative p-8 h-full flex flex-col justify-between">
                {/* Icon Container */}
                <div
                  className={`mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br ${service.gradient} text-white p-3.5 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
                >
                  {service.icon}
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-[#F59B0F] transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    {service.description}
                  </p>
                </div>

                {/* Animated Divider */}
                <div className="mb-6 h-1 w-0 group-hover:w-12 bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] transition-all duration-500 rounded-full"></div>

                {/* CTA Button */}
                <a
                  href={service.href}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-white bg-gradient-to-r ${service.gradient} ${service.hoverGradient} shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300`}
                >
                  <span>{service.cta}</span>
                  <MdArrowOutward className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </a>
              </div>

              {/* Floating Icon Background */}
              <div className="absolute -bottom-8 -right-8 text-gray-100 text-9xl opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
                {service.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 text-base mb-6">
            Explore all services and see what DeliveryYa can do for you
          </p>
          <a
            href="/services"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] shadow-lg hover:shadow-xl hover:from-[#AC6C2A] hover:to-[#8B5A28] transform hover:scale-105 transition-all duration-300"
          >
            <span>View All Services</span>
            <MdArrowOutward className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default ServicesOverview;
