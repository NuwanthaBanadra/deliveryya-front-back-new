import { TbTruckDelivery, TbMap2 } from "react-icons/tb";
import { useNavigate } from 'react-router-dom';
import { MdLocationOn, MdLocalPhone, MdAccessTime, MdVerified } from "react-icons/md";
import { BsCheckCircleFill } from "react-icons/bs";

const ServicesSectionDelivery = () => {
  const navigate = useNavigate();
  const benefits = [
    {
      icon: <MdAccessTime className="w-5 h-5" />,
      title: "Real-Time Tracking",
      description: "Watch your order on the map in real-time.",
    },
    {
      icon: <TbMap2 className="w-5 h-5" />,
      title: "Island-wide Coverage",
      description: "We deliver across the entire island.",
    },
    {
      icon: <MdLocalPhone className="w-5 h-5" />,
      title: "Direct Contact",
      description: "Connect directly with your delivery partner.",
    },
    {
      icon: <MdVerified className="w-5 h-5" />,
      title: "Insured Delivery",
      description: "All deliveries are fully insured.",
    },
  ];

  const trackingSteps = [
    { label: "Order Placed", icon: "✓" },
    { label: "Assigned", icon: "👤" },
    { label: "Picked Up", icon: "📦" },
    { label: "On the Way", icon: "🚚" },
    { label: "Delivered", icon: "🏠" },
  ];

  return (
    <section id="delivery-service" className="relative py-20 px-4 overflow-hidden scroll-mt-28">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-200/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-200/10 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-slideInLeft">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-900 px-4 py-2 rounded-full font-bold text-sm">
              <TbTruckDelivery className="w-4 h-4" />
              Delivery Service
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                Track Your Package
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-teal-600">
                  Every Step
                </span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed max-w-lg">
                From warehouse to your doorstep, track your delivery in real-time. Know exactly where your order is and when it will arrive.
              </p>
            </div>

            {/* Benefits List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 animate-slideInUp"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 text-white flex items-center justify-center">
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
              onClick={() => navigate('/track-your-order')}
              className="bg-gradient-to-r from-green-400 to-teal-500 hover:from-teal-500 hover:to-cyan-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-flex items-center gap-2"
            >
              <span>Track Order</span>
              <TbTruckDelivery className="w-5 h-5" />
            </button>
          </div>

          {/* Right Visual - Tracking Timeline */}
          <div className="relative animate-slideInRight">
            {/* Vertical Timeline */}
            <div className="space-y-6">
              {trackingSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  {/* Timeline Dot */}
                  <div className="relative flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 text-white flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </div>
                    {idx < trackingSteps.length - 1 && (
                      <div className="w-1 h-12 bg-gradient-to-b from-green-400 to-transparent mt-1"></div>
                    )}
                  </div>

                  {/* Timeline Content */}
                  <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 flex-1 transform hover:scale-105">
                    <h4 className="font-bold text-gray-900">{step.label}</h4>
                    <p className="text-sm text-gray-600">Step {idx + 1} of 5</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Map Icon */}
            <div className="absolute -bottom-4 -right-4 opacity-10 text-9xl">
              <TbMap2 className="w-40 h-40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSectionDelivery;
