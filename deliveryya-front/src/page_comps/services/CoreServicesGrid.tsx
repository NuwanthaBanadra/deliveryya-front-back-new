import { TbTruckDelivery } from 'react-icons/tb';
import { MdOutlineSpeed, MdSecurity, MdTrackChanges, MdSchedule, MdLocalOffer } from 'react-icons/md';
import { BiSupport } from 'react-icons/bi';
import { RiRefund2Line } from 'react-icons/ri';
import { AiOutlineGlobal } from 'react-icons/ai';
import { FaWarehouse } from 'react-icons/fa';
import { IoRocketSharp } from 'react-icons/io5';
import type { ReactNode } from 'react';

interface ServiceCard {
    icon: ReactNode;
    title: string;
    description: string;
    tags: string[];
    gradient: string;
    featured?: boolean;
}

const services: ServiceCard[] = [
    {
        icon: <TbTruckDelivery className="w-10 h-10" />,
        title: 'Express Delivery',
        description:
            'From restaurant meals to grocery runs — get anything at your door in as little as 30 minutes. Our rider network is always nearby.',
        tags: ['30-min Guarantee', 'GPS Tracked', 'Contactless'],
        gradient: 'from-[#F59B0F] to-[#AC6C2A]',
        featured: true,
    },
    {
        icon: <MdTrackChanges className="w-10 h-10" />,
        title: 'Live Order Tracking',
        description:
            'Watch your delivery move in real-time on an interactive map. No more guessing — know exactly when it arrives.',
        tags: ['Real-Time Map', 'ETA Updates', 'Notifications'],
        gradient: 'from-[#AC6C2A] to-[#8B5A28]',
    },
    {
        icon: <MdOutlineSpeed className="w-10 h-10" />,
        title: 'Same-Day Shipping',
        description:
            'Order before noon and have it at your doorstep the same day. Premium speed for when you truly can\'t wait.',
        tags: ['Cut-off 12 PM', 'Priority Queue', 'Weekend Included'],
        gradient: 'from-amber-500 to-[#F59B0F]',
    },
    {
        icon: <FaWarehouse className="w-10 h-10" />,
        title: 'Seller Warehousing',
        description:
            'Verified sellers can store stock in our regional hubs, enabling lightning-fast fulfilment with zero logistics overhead.',
        tags: ['Temp-Controlled', 'Insured Stock', 'Easy Onboarding'],
        gradient: 'from-[#F59B0F] via-amber-600 to-[#AC6C2A]',
        featured: true,
    },
    {
        icon: <MdSecurity className="w-10 h-10" />,
        title: 'Secure Payments',
        description:
            'Bank-grade encrypted transactions. Pay with cards, wallets, or cash on delivery — we handle security so you don\'t have to.',
        tags: ['256-bit Encryption', 'Multi-method', 'Fraud Shield'],
        gradient: 'from-[#8B5A28] to-amber-800',
    },
    {
        icon: <MdSchedule className="w-10 h-10" />,
        title: 'Scheduled Delivery',
        description:
            'Plan your delivery up to 7 days in advance. Perfect for gifts, office supplies, or recurring household orders.',
        tags: ['7-Day Calendar', 'Reminders', 'Recurring Orders'],
        gradient: 'from-yellow-500 to-[#F59B0F]',
    },
    {
        icon: <BiSupport className="w-10 h-10" />,
        title: '24/7 Live Support',
        description:
            'Our human-first support team is available every hour of every day via chat, call, or email — no bots, just real people.',
        tags: ['No-Bot Policy', 'Avg 2-min Reply', 'Multilingual'],
        gradient: 'from-[#F59B0F] to-orange-500',
    },
    {
        icon: <MdLocalOffer className="w-10 h-10" />,
        title: 'Deals & Subscriptions',
        description:
            'Save more with DeliveryYa Plus — unlimited free delivery, exclusive shop discounts, and early access to flash sales.',
        tags: ['Unlimited Delivery', 'Pro Discounts', 'Flash Access'],
        gradient: 'from-orange-500 to-[#AC6C2A]',
        featured: true,
    },
    {
        icon: <RiRefund2Line className="w-10 h-10" />,
        title: 'Easy Returns',
        description:
            'Changed your mind? Schedule a free return pickup within 7 days. Full refund processed within 48 hours.',
        tags: ['7-Day Window', 'Free Pickup', '48h Refund'],
        gradient: 'from-[#AC6C2A] to-amber-900',
    },
    {
        icon: <AiOutlineGlobal className="w-10 h-10" />,
        title: 'Nationwide Coverage',
        description:
            'Operating across 50+ cities with new zones added every month. Wherever you are, DeliveryYa has you covered.',
        tags: ['50+ Cities', 'Rural Reach', 'Expanding Monthly'],
        gradient: 'from-amber-600 to-[#F59B0F]',
    },
];

function CoreServicesGrid() {
    return (
        <section className="bg-white py-20 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-6 py-2 rounded-full mb-5 shadow-lg">
                        <IoRocketSharp className="w-4 h-4" />
                        <span className="text-sm font-bold">What We Offer</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        Our{' '}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                            Core Services
                        </span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                        A complete delivery ecosystem — handpicked features that make every order seamless for buyers and sellers alike.
                    </p>
                    <div className="mt-6 w-20 h-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] mx-auto rounded-full"></div>
                </div>

                {/* Bento-style grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {services.map((svc, i) => (
                        <div
                            key={i}
                            className={`group relative bg-white border rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 cursor-default
                                ${svc.featured ? 'border-[#F59B0F]/60 shadow-lg shadow-[#F59B0F]/10' : 'border-gray-100 shadow-sm'}`}
                        >
                            {/* Featured badge */}
                            {svc.featured && (
                                <div className="absolute top-4 right-4 z-10 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow">
                                    Popular
                                </div>
                            )}

                            {/* Gradient top bar */}
                            <div className={`h-1.5 w-full bg-linear-to-r ${svc.gradient}`}></div>

                            {/* Hover fill overlay */}
                            <div className={`absolute inset-0 bg-linear-to-br ${svc.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                            <div className="relative p-7">
                                {/* Icon */}
                                <div className={`inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-linear-to-br ${svc.gradient} text-white shadow-lg mb-5 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                    {svc.icon}
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-[#F59B0F] transition-colors duration-300">
                                    {svc.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-500 text-sm leading-relaxed mb-5">
                                    {svc.description}
                                </p>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2">
                                    {svc.tags.map((tag, ti) => (
                                        <span
                                            key={ti}
                                            className="text-xs font-semibold bg-orange-50 border border-orange-200 text-[#AC6C2A] px-3 py-1 rounded-full"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Animated underline */}
                                <div className={`mt-5 h-0.5 w-0 group-hover:w-full bg-linear-to-r ${svc.gradient} transition-all duration-500 rounded-full`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default CoreServicesGrid;
