import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FaShoppingBag, FaStore } from "react-icons/fa";
import { MdOutlineArrowBackIosNew, MdOutlineArrowForwardIos, MdTaskAlt, MdTrackChanges } from "react-icons/md";
import { TbMapPinShare, TbTruckDelivery } from "react-icons/tb";

type HeroAction = {
    label: string;
    to: string;
    variant?: "primary" | "secondary";
};

type ServiceChip = {
    icon: ReactNode;
    title: string;
    to: string;
};

type HeroSlide = {
    eyebrow: string;
    title: string;
    description: string;
    badge: string;
    icon: ReactNode;
    image: string;
    accent: string;
    align?: "left" | "right";
    actions: HeroAction[];
    chips?: ServiceChip[];
    imageTiles: string[];
};

const serviceChips: ServiceChip[] = [
    { icon: <FaStore className="h-4 w-4" />, title: "Store", to: "/store" },
    { icon: <TbTruckDelivery className="h-4 w-4" />, title: "Delivery", to: "/services" },
    { icon: <MdTaskAlt className="h-4 w-4" />, title: "Urgent Jobs", to: "/urgent-job" },
    { icon: <TbMapPinShare className="h-4 w-4" />, title: "Live Tracking", to: "/track-your-order" },
];

const slides: HeroSlide[] = [
    {
        eyebrow: "DeliveryYa Services",
        title: "Shop, Sell, Deliver, and Track",
        description:
            "One place for local shopping, seller access, DeliveryYa delivery, urgent task requests, and live order tracking.",
        badge: "Four services in one flow",
        icon: <FaShoppingBag className="h-5 w-5" />,
        image: "https://images.pexels.com/photos/7674983/pexels-photo-7674983.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85",
        accent: "from-[#111827]/90 via-[#7c3f12]/70 to-[#f59b0f]/75",
        actions: [
            { label: "Explore Store", to: "/store" },
            { label: "Track Order", to: "/track-your-order", variant: "secondary" },
        ],
        chips: serviceChips,
        imageTiles: [
            "https://images.pexels.com/photos/7436476/pexels-photo-7436476.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/6867959/pexels-photo-6867959.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/7706408/pexels-photo-7706408.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
        ],
    },
    {
        eyebrow: "Our Store",
        title: "Buy Local or Become a Seller",
        description:
            "Customers can shop DeliveryYa stores, and business owners can register to sell their products online.",
        badge: "Marketplace access",
        icon: <FaStore className="h-5 w-5" />,
        image: "https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85",
        accent: "from-[#0f172a]/90 via-[#065f46]/70 to-[#f59b0f]/70",
        align: "right",
        actions: [
            { label: "Shop Store", to: "/store" },
            { label: "Become a Seller", to: "/deliverYya-cloud-console/my-requests", variant: "secondary" },
        ],
        imageTiles: [
            "https://images.pexels.com/photos/7436476/pexels-photo-7436476.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/7674983/pexels-photo-7674983.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/6347542/pexels-photo-6347542.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
        ],
    },
    {
        eyebrow: "DeliveryYa Delivery",
        title: "Flexible Delivery for Real Orders",
        description:
            "Send parcels, store orders, and one-time requests. Delivery times can vary by distance, order type, and availability.",
        badge: "Delivery service",
        icon: <TbTruckDelivery className="h-5 w-5" />,
        image: "https://images.pexels.com/photos/4392040/pexels-photo-4392040.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85",
        accent: "from-[#111827]/90 via-[#92400e]/70 to-[#dc2626]/70",
        actions: [
            { label: "View Service", to: "/services" },
            // { label: "One-Time Order", to: "/one-time-order", variant: "secondary" },
        ],
        imageTiles: [
            "https://images.pexels.com/photos/6869064/pexels-photo-6869064.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/7363190/pexels-photo-7363190.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
        ],
    },
    {
        eyebrow: "Urgent Job Facility",
        title: "Create a Task. We Handle the Run.",
        description:
            "Request pickups, errands, drop-offs, or custom tasks when a normal store order does not fit your need.",
        badge: "Task requests",
        icon: <MdTaskAlt className="h-5 w-5" />,
        image: "https://i.postimg.cc/CKdvZrfW/Whats-App-Image-2026-05-27-at-10-53-48-PM.jpg",
        accent: "from-[#18181b]/90 via-[#be123c]/70 to-[#f97316]/70",
        align: "right",
        actions: [
            { label: "Request Job", to: "/urgent-job", variant: "secondary"  },
            // { label: "Update Job", to: "/urgent-job-update", variant: "secondary" },
        ],
        imageTiles: [
            "https://images.pexels.com/photos/7706408/pexels-photo-7706408.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/4246119/pexels-photo-4246119.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
        ],
    },
    {
        eyebrow: "Live Order Tracking",
        title: "Track Orders on Google Maps",
        description:
            "Follow supported orders with live map visibility, delivery status, and location updates while your order moves.",
        badge: "Map tracking",
        icon: <MdTrackChanges className="h-5 w-5" />,
        image: "https://images.pexels.com/photos/7706408/pexels-photo-7706408.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85",
        accent: "from-[#020617]/90 via-[#155e75]/75 to-[#f59b0f]/70",
        actions: [
            { label: "Track Order", to: "/track-your-order" },
            { label: "View Services", to: "/services", variant: "secondary" },
        ],
        imageTiles: [
            "https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/7706408/pexels-photo-7706408.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
            "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=700&q=85",
        ],
    },
];

const tileShapes = [
    "col-span-7 row-span-2 [clip-path:polygon(0_10%,100%_0,92%_100%,8%_88%)]",
    "col-span-5 [clip-path:polygon(8%_0,100%_14%,88%_100%,0_86%)]",
    "col-span-5 row-span-2 [clip-path:polygon(14%_0,100%_8%,86%_92%,0_100%)]",
];

const Hero = () => {
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
                            className="relative flex min-h-[560px] w-full shrink-0 items-center overflow-hidden  sm:py-20 pt-5 pb-20 sm:min-h-[590px] lg:min-h-[620px]"
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

                            <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)] lg:px-14">
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

                                    <div
                                        className={`mt-6 flex flex-wrap gap-3 ${
                                            slide.align === "right" ? "lg:justify-end" : ""
                                        }`}
                                    >
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
                                                    key={chip.title}
                                                    onClick={() => navigate(chip.to)}
                                                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3.5 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-black/30"
                                                >
                                                    <span className="text-amber-100">{chip.icon}</span>
                                                    {chip.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className={`${slide.align === "right" ? "lg:order-1" : ""}`}>
                                    <div className="relative mx-auto grid max-w-[460px] grid-cols-12 grid-rows-[112px_92px_112px] gap-2.5 sm:grid-rows-[140px_108px_140px] lg:max-w-none">
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
                                                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a5c13]">DeliveryYa</p>
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
                    aria-label="Previous hero slide"
                >
                    <MdOutlineArrowBackIosNew className="h-5 w-5" />
                </button>
                <button
                    onClick={() => resetAutoplay((index + 1) % slides.length)}
                    className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/25 p-3 text-white shadow-xl backdrop-blur-md transition duration-300 hover:bg-white/20 sm:right-6"
                    aria-label="Next hero slide"
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

export default Hero;
