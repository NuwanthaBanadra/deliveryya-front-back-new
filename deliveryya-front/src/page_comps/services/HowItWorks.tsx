import { TbTruckDelivery } from 'react-icons/tb';
import { FaShoppingBag, FaCheckCircle } from 'react-icons/fa';
import { MdTrackChanges } from 'react-icons/md';
import { IoRocketSharp } from 'react-icons/io5';

const steps = [
    {
        step: '01',
        icon: <FaShoppingBag className="w-8 h-8" />,
        title: 'Browse & Add to Cart',
        description:
            'Explore thousands of products from verified local stores. Add items to your cart in seconds — groceries, electronics, meals, and more.',
        highlights: ['10,000+ products', 'Verified sellers only', 'Best price guarantee'],
        gradient: 'from-[#F59B0F] to-amber-400',
    },
    {
        step: '02',
        icon: <MdTrackChanges className="w-8 h-8" />,
        title: 'Place & Confirm Order',
        description:
            'Choose your delivery slot, pick a payment method, and confirm. You\'ll get an instant confirmation with your unique order code.',
        highlights: ['Multiple pay options', 'Scheduled delivery', 'Instant email receipt'],
        gradient: 'from-[#AC6C2A] to-[#F59B0F]',
    },
    {
        step: '03',
        icon: <TbTruckDelivery className="w-8 h-8" />,
        title: 'We Pick & Pack',
        description:
            'Our warehouse team or  store partner picks, packs, and hands off to a rider — all quality-checked before leaving the door.',
        highlights: ['Quality checked', 'Tamper-proof packing', 'Photo confirmation'],
        gradient: 'from-[#8B5A28] to-[#AC6C2A]',
    },
    {
        step: '04',
        icon: <FaCheckCircle className="w-8 h-8" />,
        title: 'Delivered to Your Door',
        description:
            'Track live on the map and receive your order — contactless or with signature. Rate your experience and earn loyalty points.',
        highlights: ['Live GPS tracking', 'Contactless option', 'Earn reward points'],
        gradient: 'from-[#F59B0F] to-[#AC6C2A]',
    },
];

function HowItWorks() {
    return (
        <section className="bg-linear-to-br from-[#FFF4EE] via-white to-[#FFF4EE] py-20 px-4 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-6 py-2 rounded-full mb-5 shadow-lg">
                        <IoRocketSharp className="w-4 h-4" />
                        <span className="text-sm font-bold">Simple Process</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        How It{' '}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                            Works
                        </span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                        From first click to doorstep delivery — four simple steps that make ordering feel effortless.
                    </p>
                    <div className="mt-6 w-20 h-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] mx-auto rounded-full"></div>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Horizontal connector line (desktop) */}
                    <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-orange-200 to-transparent mx-32"></div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {steps.map((step, i) => (
                            <div key={i} className="relative group">
                                {/* Step card */}
                                <div className="bg-white rounded-3xl p-7 shadow-sm border border-orange-100 hover:shadow-xl hover:border-[#F59B0F]/40 transition-all duration-400 hover:-translate-y-2">
                                    {/* Step number + icon row */}
                                    <div className="flex items-center justify-between mb-6">
                                        {/* Number badge */}
                                        <div className={`text-4xl font-black text-transparent bg-clip-text bg-linear-to-br ${step.gradient} select-none`}>
                                            {step.step}
                                        </div>
                                        {/* Icon */}
                                        <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${step.gradient} text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
                                            {step.icon}
                                        </div>
                                    </div>

                                    {/* Text */}
                                    <h3 className="text-lg font-black text-gray-900 mb-3 group-hover:text-[#F59B0F] transition-colors duration-300">
                                        {step.title}
                                    </h3>
                                    <p className="text-gray-500 text-sm leading-relaxed mb-4">
                                        {step.description}
                                    </p>

                                    {/* Highlights */}
                                    <ul className="space-y-1.5">
                                        {step.highlights.map((hl, hi) => (
                                            <li key={hi} className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59B0F] shrink-0"></span>
                                                {hl}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Bottom bar */}
                                    <div className={`mt-5 h-1 w-0 group-hover:w-full bg-linear-to-r ${step.gradient} rounded-full transition-all duration-500`}></div>
                                </div>

                                {/* Arrow connector (between cards on desktop) */}
                                {i < steps.length - 1 && (
                                    <div className="hidden lg:flex absolute -right-5 top-16 z-10 items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-orange-200 shadow-md text-[#F59B0F]">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom CTA strip */}
                <div className="mt-16 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-[#F59B0F]/20">
                    <div className="text-white text-center md:text-left">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Ready to start?</p>
                        <h3 className="text-2xl md:text-3xl font-black">Your first delivery awaits.</h3>
                    </div>
                    <a
                        href="/store"
                        className="shrink-0 bg-white text-[#AC6C2A] font-black px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm"
                    >
                        Order Now →
                    </a>
                </div>
            </div>
        </section>
    );
}

export default HowItWorks;
