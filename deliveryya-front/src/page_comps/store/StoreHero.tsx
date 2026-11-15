import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { MdLocalOffer, MdOutlineArrowBackIosNew, MdOutlineArrowForwardIos, MdVerified } from "react-icons/md";
import { FaShoppingBag, FaStore } from "react-icons/fa";
import { BiPackage } from "react-icons/bi";
import { TbCategory2 } from "react-icons/tb";

type StoreHeroAction = {
  label: string;
  to: string;
  variant?: "primary" | "secondary";
};

type StoreHeroChip = {
  icon: ReactNode;
  label: string;
  to: string;
};

type StoreHeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  icon: ReactNode;
  image: string;
  accent: string;
  align?: "left" | "right";
  actions: StoreHeroAction[];
  chips?: StoreHeroChip[];
  imageTiles: string[];
};

const categoryChips: StoreHeroChip[] = [
  { icon: <BiPackage className="h-4 w-4" />, label: "Products", to: "/all-products" },
  { icon: <FaStore className="h-4 w-4" />, label: "Markets", to: "/all-markets" },
  { icon: <MdLocalOffer className="h-4 w-4" />, label: "Deals", to: "/store" },
  { icon: <TbCategory2 className="h-4 w-4" />, label: "Categories", to: "/store" },
];

const slides: StoreHeroSlide[] = [
  {
    eyebrow: "DeliveryYa Store",
    title: "Find What You Need from Local Sellers",
    description:
      "Browse products, compare nearby markets, and discover everyday essentials from one simple store experience.",
    badge: "Local marketplace",
    icon: <FaShoppingBag className="h-5 w-5" />,
    image: "https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85",
    accent: "from-[#111827]/90 via-[#7c3f12]/72 to-[#f59b0f]/72",
    actions: [
      { label: "Shop Products", to: "/all-products" },
      { label: "View Markets", to: "/all-markets", variant: "secondary" },
    ],
    chips: categoryChips,
    imageTiles: [
      "https://images.pexels.com/photos/3962286/pexels-photo-3962286.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
      "https://images.pexels.com/photos/6347542/pexels-photo-6347542.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
      "https://images.pexels.com/photos/7674983/pexels-photo-7674983.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
    ],
  },
  {
    eyebrow: "Products",
    title: "Explore Fresh Finds and Daily Essentials",
    description:
      "From groceries and home needs to lifestyle products, the store helps users move quickly from search to checkout.",
    badge: "Product discovery",
    icon: <BiPackage className="h-5 w-5" />,
    image: "https://images.pexels.com/photos/6347542/pexels-photo-6347542.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85",
    accent: "from-[#0f172a]/90 via-[#065f46]/72 to-[#f59b0f]/72",
    align: "right",
    actions: [
      { label: "Browse Products", to: "/all-products" },
      { label: "See New Arrivals", to: "/store", variant: "secondary" },
    ],
    imageTiles: [
      "https://images.pexels.com/photos/3962286/pexels-photo-3962286.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
      "https://images.pexels.com/photos/5650049/pexels-photo-5650049.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
      "https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
    ],
  },
  {
    eyebrow: "Markets",
    title: "Meet Sellers Around You",
    description:
      "Discover markets, visit seller profiles, and support businesses that can bring their products closer to your doorstep.",
    badge: "Seller network",
    icon: <FaStore className="h-5 w-5" />,
    image: "https://images.pexels.com/photos/7674983/pexels-photo-7674983.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85",
    accent: "from-[#111827]/90 via-[#155e75]/75 to-[#f59b0f]/70",
    actions: [
      { label: "Explore Markets", to: "/all-markets" },
      { label: "Become a Seller", to: "/deliverYya-cloud-console/my-requests", variant: "secondary" },
    ],
    imageTiles: [
      "https://images.pexels.com/photos/7436476/pexels-photo-7436476.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
      "https://images.pexels.com/photos/7674983/pexels-photo-7674983.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
      "https://images.pexels.com/photos/6347542/pexels-photo-6347542.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
    ],
  },
  {
    eyebrow: "Deals and Trust",
    title: "Shop Offers with Confidence",
    description:
      "Look for hot deals, best sellers, and verified market listings while keeping the shopping journey clear and focused.",
    badge: "Smart shopping",
    icon: <MdVerified className="h-5 w-5" />,
    image: "https://images.pexels.com/photos/3962286/pexels-photo-3962286.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85",
    accent: "from-[#18181b]/90 via-[#be123c]/68 to-[#f97316]/72",
    align: "right",
    actions: [
      { label: "View Deals", to: "/store" },
      { label: "Best Sellers", to: "/all-products", variant: "secondary" },
    ],
    imageTiles: [
      "https://images.pexels.com/photos/5706277/pexels-photo-5706277.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
      "https://images.pexels.com/photos/6347542/pexels-photo-6347542.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
      "https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
    ],
  },
];

const tileShapes = [
  "col-span-7 row-span-2 [clip-path:polygon(0_8%,96%_0,100%_88%,10%_100%)]",
  "col-span-5 [clip-path:polygon(12%_0,100%_12%,88%_100%,0_82%)]",
  "col-span-5 row-span-2 [clip-path:polygon(0_14%,90%_0,100%_100%,12%_90%)]",
];

const StoreHero = () => {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const startAutoplay = () => {
    intervalRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
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
  }, []);

  return (
    <section className="relative w-full">
      <div className="relative overflow-hidden rounded-b-[2rem] shadow-2xl sm:rounded-b-[3rem]">
        <div
          className="flex transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.title}
              className="relative flex min-h-[530px] w-full shrink-0 items-center overflow-hidden pb-20 pt-6 sm:min-h-[570px] sm:py-18 lg:min-h-[600px]"
            >
              <div className="absolute inset-0">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className={`h-full w-full object-cover transition-transform duration-[10000ms] ease-linear ${
                    slideIndex === index ? "scale-110" : "scale-100"
                  }`}
                />
                <div className={`absolute inset-0 bg-linear-to-br ${slide.accent} mix-blend-multiply`} />
                <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/25 to-black/10" />
              </div>

              <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(350px,0.78fr)] lg:px-14">
                <div className={`${slide.align === "right" ? "lg:order-2 lg:ml-auto lg:text-right" : ""}`}>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-md ${
                      slide.align === "right" ? "lg:ml-auto" : ""
                    }`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">{slide.icon}</span>
                    {slide.badge}
                  </div>

                  <div className="mt-5 space-y-3">
                    <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-amber-200">
                      {slide.eyebrow}
                    </p>
                    <h1 className="max-w-[12ch] text-balance text-4xl font-black leading-[1.05] text-white drop-shadow-xl sm:text-5xl lg:text-6xl">
                      {slide.title}
                    </h1>
                    <p className="max-w-xl text-pretty text-base font-medium leading-7 text-slate-100 sm:text-lg">
                      {slide.description}
                    </p>
                  </div>

                  <div className={`mt-6 flex flex-wrap gap-3 ${slide.align === "right" ? "lg:justify-end" : ""}`}>
                    {slide.actions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => navigate(action.to)}
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold shadow-xl transition duration-300 hover:-translate-y-0.5 sm:text-base ${
                          action.variant === "secondary"
                            ? "border border-white/35 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
                            : "bg-white text-[#9a5c13] hover:bg-amber-50"
                        }`}
                      >
                        {action.label}
                        <MdOutlineArrowForwardIos className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>

                  {slide.chips && (
                    <div className="mt-5 flex max-w-2xl flex-wrap gap-2">
                      {slide.chips.map((chip) => (
                        <button
                          key={chip.label}
                          onClick={() => navigate(chip.to)}
                          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3.5 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-black/30"
                        >
                          <span className="text-amber-100">{chip.icon}</span>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${slide.align === "right" ? "lg:order-1" : ""}`}>
                  <div className="relative mx-auto grid max-w-[450px] grid-cols-12 grid-rows-[108px_90px_108px] gap-2.5 sm:grid-rows-[134px_104px_134px] lg:max-w-none">
                    {slide.imageTiles.map((image, tileIndex) => (
                      <div
                        key={image}
                        className={`${tileShapes[tileIndex]} overflow-hidden border-4 border-white/25 bg-white/10 shadow-2xl`}
                      >
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                    <div className="col-span-7 flex items-center gap-3 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-md">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f59b0f] text-white">
                        {slide.icon}
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a5c13]">Store</p>
                        <p className="text-base font-black leading-tight sm:text-lg">{slide.badge}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => resetAutoplay((index - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/25 p-3 text-white shadow-xl backdrop-blur-md transition duration-300 hover:bg-white/20 sm:left-6"
          aria-label="Previous store slide"
        >
          <MdOutlineArrowBackIosNew className="h-5 w-5" />
        </button>
        <button
          onClick={() => resetAutoplay((index + 1) % slides.length)}
          className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/25 p-3 text-white shadow-xl backdrop-blur-md transition duration-300 hover:bg-white/20 sm:right-6"
          aria-label="Next store slide"
        >
          <MdOutlineArrowForwardIos className="h-5 w-5" />
        </button>

        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 shadow-xl backdrop-blur-md">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.badge}
              onClick={() => resetAutoplay(slideIndex)}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                slideIndex === index ? "w-9 bg-white" : "w-2.5 bg-white/45 hover:bg-white/75"
              }`}
              aria-label={`Go to ${slide.eyebrow} slide`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoreHero;
