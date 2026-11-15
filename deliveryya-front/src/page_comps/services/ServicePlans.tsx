import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import { IoRocketSharp } from 'react-icons/io5';
import { TbTruckDelivery } from 'react-icons/tb';
import { MdFlashOn } from 'react-icons/md';
import { Link } from 'react-router-dom';

interface Plan {
    name: string;
    tagline: string;
    price: string;
    period: string;
    icon: React.ReactNode;
    gradient: string;
    ring: string;
    featured: boolean;
    cta: string;
    features: { text: string; included: boolean }[];
}

const plans: Plan[] = [
    {
        name: 'Standard',
        tagline: 'Great for casual shoppers',
        price: 'Free',
        period: 'forever',
        icon: <TbTruckDelivery className="w-7 h-7" />,
        gradient: 'from-gray-100 to-gray-50',
        ring: 'border-gray-200',
        featured: false,
        cta: 'Get Started',
        features: [
            { text: 'Up to 5 orders / month', included: true },
            { text: 'Standard delivery (2-4 hrs)', included: true },
            { text: 'Live order tracking', included: true },
            { text: 'Email support', included: true },
            { text: 'Same-day delivery', included: false },
            { text: 'Free delivery on all orders', included: false },
            { text: 'Priority customer support', included: false },
            { text: 'Exclusive member discounts', included: false },
        ],
    },
    {
        name: 'DeliveryYa Plus',
        tagline: 'Best value for daily shoppers',
        price: '499',
        period: 'per month',
        icon: <IoRocketSharp className="w-7 h-7" />,
        gradient: 'from-[#F59B0F] to-[#AC6C2A]',
        ring: 'border-[#F59B0F]',
        featured: true,
        cta: 'Start Plus',
        features: [
            { text: 'Unlimited orders', included: true },
            { text: 'Express delivery (30-60 min)', included: true },
            { text: 'Live order tracking', included: true },
            { text: '24/7 priority support', included: true },
            { text: 'Same-day delivery', included: true },
            { text: 'Free delivery on all orders', included: true },
            { text: 'Priority customer support', included: true },
            { text: 'Exclusive member discounts', included: false },
        ],
    },
    {
        name: 'Business',
        tagline: 'Power tools for sellers & teams',
        price: '1,999',
        period: 'per month',
        icon: <MdFlashOn className="w-7 h-7" />,
        gradient: 'from-[#AC6C2A] to-[#8B5A28]',
        ring: 'border-[#AC6C2A]',
        featured: false,
        cta: 'Go Business',
        features: [
            { text: 'Unlimited orders', included: true },
            { text: 'Express delivery (30-60 min)', included: true },
            { text: 'Live order tracking', included: true },
            { text: '24/7 dedicated account manager', included: true },
            { text: 'Same-day delivery', included: true },
            { text: 'Free delivery on all orders', included: true },
            { text: 'Warehouse storage access', included: true },
            { text: 'Exclusive member discounts', included: true },
        ],
    },
];

function ServicePlans() {
    return (
        <section className="bg-white py-20 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-6 py-2 rounded-full mb-5 shadow-lg">
                        <MdFlashOn className="w-4 h-4" />
                        <span className="text-sm font-bold">Flexible Plans</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        Choose Your{' '}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                            Plan
                        </span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                        Whether you shop occasionally or run a business, there's a plan that fits perfectly.
                    </p>
                    <div className="mt-6 w-20 h-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-7 items-start">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`relative rounded-3xl border-2 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2
                                ${plan.featured
                                    ? `${plan.ring} shadow-2xl shadow-[#F59B0F]/20 scale-105`
                                    : `${plan.ring} shadow-sm hover:border-[#F59B0F]/40`
                                }`}
                        >
                            {plan.featured && (
                                <div className="absolute top-0 left-0 right-0 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white text-xs font-black text-center py-2 uppercase tracking-widest">
                                    ✦ Most Popular ✦
                                </div>
                            )}

                            {/* Header */}
                            <div className={`${plan.featured ? 'pt-10' : 'pt-0'} p-7 bg-linear-to-br ${plan.gradient} ${plan.featured ? 'text-white' : 'text-gray-800'}`}>
                                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg ${plan.featured ? 'bg-white/20 text-white' : 'bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] text-white'}`}>
                                    {plan.icon}
                                </div>
                                <h3 className="text-xl font-black mb-1">{plan.name}</h3>
                                <p className={`text-sm mb-5 ${plan.featured ? 'text-white/80' : 'text-gray-500'}`}>{plan.tagline}</p>
                                <div className="flex items-end gap-1">
                                    {plan.price === 'Free' ? (
                                        <span className="text-4xl font-black">Free</span>
                                    ) : (
                                        <>
                                            <span className={`text-sm font-bold mb-2 ${plan.featured ? 'text-white/70' : 'text-gray-500'}`}>LKR</span>
                                            <span className="text-4xl font-black">{plan.price}</span>
                                        </>
                                    )}
                                    <span className={`text-sm mb-1 ml-1 ${plan.featured ? 'text-white/70' : 'text-gray-400'}`}>/{plan.period}</span>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="bg-white p-7 space-y-3">
                                {plan.features.map((f, fi) => (
                                    <div key={fi} className={`flex items-center gap-3 text-sm ${f.included ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {f.included ? (
                                            <FaCheckCircle className="w-4 h-4 text-[#F59B0F] shrink-0" />
                                        ) : (
                                            <FaTimes className="w-4 h-4 text-gray-300 shrink-0" />
                                        )}
                                        <span className={f.included ? 'font-medium' : 'line-through'}>{f.text}</span>
                                    </div>
                                ))}

                                <div className="pt-4">
                                    <Link
                                        to="/store"
                                        className={`block w-full text-center font-black py-3.5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 text-sm shadow-lg
                                            ${plan.featured
                                                ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] text-white shadow-[#F59B0F]/30'
                                                : 'bg-gray-50 hover:bg-orange-50 border border-orange-200 text-[#AC6C2A] hover:border-[#F59B0F]'
                                            }`}
                                    >
                                        {plan.cta} →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-center text-gray-400 text-sm mt-8">
                    All plans include a 7-day free trial. No credit card required to start.
                </p>
            </div>
        </section>
    );
}

export default ServicePlans;
