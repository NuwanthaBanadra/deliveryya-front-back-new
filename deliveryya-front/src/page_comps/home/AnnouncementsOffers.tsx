import { useEffect, useRef, useState } from "react";
import { MdOutlineArrowBackIosNew, MdOutlineArrowForwardIos } from "react-icons/md";

interface Announcement {
  id: number;
  title: string;
  description: string;
  badge: string;
  gradient: string;
  icon: string;
  cta?: string;
}

const AnnouncementsOffers = () => {
  const [index, setIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const announcements: Announcement[] = [
    {
      id: 1,
      title: "Flash Sale Alert",
      description: "Get up to 50% off on selected items! Limited time offer - grab your favorite products now before they're gone.",
      badge: "🔥 Hot Deal",
      gradient: "from-red-500 via-red-400 to-orange-500",
      icon: "🛍️",
      cta: "Shop Now",
    },
    {
      id: 2,
      title: "Free Delivery Day",
      description: "Free delivery on all orders above Rs.500. No promo code needed. Valid until midnight tonight!",
      badge: "📦 Free Delivery",
      gradient: "from-green-500 via-emerald-400 to-teal-500",
      icon: "🚚",
      cta: "Order Now",
    },
    {
      id: 3,
      title: "Loyalty Rewards",
      description: "Earn 2x reward points on every purchase. Redeem your points for exclusive rewards and discounts.",
      badge: "⭐ Rewards",
      gradient: "from-purple-500 via-pink-400 to-red-500",
      icon: "🎁",
      cta: "Learn More",
    },
  ];

  const startAutoplay = () => {
    intervalRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, 6000);
  };

  const resetAutoplay = (newIndex: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIndex(newIndex);
    startAutoplay();
  };

  useEffect(() => {
    startAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [announcements.length]);

  return (
    <section className="relative bg-gradient-to-b from-white via-orange-50/30 to-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A]">
              Latest Offers
            </span>
            {" "}& Announcements
          </h2>
          <p className="text-gray-600 text-sm md:text-base">Don't miss out on amazing deals and important updates</p>
        </div>

        {/* Carousel Container */}
        <div className="relative overflow-hidden group">
          <div
            ref={carouselRef}
            className="flex transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {announcements.map((announcement, i) => (
              <div
                key={announcement.id}
                className="w-full shrink-0 px-2 md:px-6"
              >
                {/* Announcement Card */}
                <div
                  className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${announcement.gradient} p-8 md:p-10 text-white shadow-2xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl`}
                >
                  {/* Floating Background Elements */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl transform -translate-x-8 translate-y-8"></div>

                  {/* Content */}
                  <div className="relative z-10 flex items-center justify-between gap-6">
                    <div className="flex-1">
                      {/* Badge */}
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full mb-4">
                        <span className="text-lg">{announcement.icon}</span>
                        <span className="text-sm font-bold">{announcement.badge}</span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-2xl md:text-3xl font-black mb-3 drop-shadow-lg">
                        {announcement.title}
                      </h3>
                      <p className="text-white/90 text-sm md:text-base leading-relaxed mb-6 max-w-md">
                        {announcement.description}
                      </p>

                      {/* CTA Button */}
                      <button className="bg-white text-gray-900 font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 hover:scale-105">
                        {announcement.cta || "Learn More"}
                      </button>
                    </div>

                    {/* Large Icon */}
                    <div className="hidden md:flex items-center justify-center text-8xl opacity-20 transform -rotate-12">
                      {announcement.icon}
                    </div>
                  </div>

                  {/* Animated Border */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={() =>
              resetAutoplay(
                (index - 1 + announcements.length) % announcements.length
              )
            }
            className="absolute top-1/2 left-2 md:left-6 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white border border-white/30 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:scale-110 z-20"
            aria-label="Previous announcement"
          >
            <MdOutlineArrowBackIosNew className="w-5 h-5" />
          </button>
          <button
            onClick={() => resetAutoplay((index + 1) % announcements.length)}
            className="absolute top-1/2 right-2 md:right-6 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white border border-white/30 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:scale-110 z-20"
            aria-label="Next announcement"
          >
            <MdOutlineArrowForwardIos className="w-5 h-5" />
          </button>

          {/* Indicator Dots */}
          <div className="flex gap-2 justify-center mt-6">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={() => resetAutoplay(i)}
                className={`transition-all duration-500 rounded-full h-2 ${
                  i === index
                    ? "bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] w-8 shadow-lg"
                    : "bg-gray-300 hover:bg-gray-400 w-2"
                }`}
                aria-label={`Go to announcement ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnnouncementsOffers;
