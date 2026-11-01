import { FaStar, FaQuoteLeft } from 'react-icons/fa';
import { IoRocketSharp } from 'react-icons/io5';

const testimonials = [
    {
        name: 'Anika Fernando',
        role: 'Home Cook & Food Blogger',
        avatar: 'AF',
        rating: 5,
        text: 'DeliveryYa Plus is a game-changer. Groceries at my door in 25 minutes — every single time. The live tracking is incredibly accurate and the riders are always polite!',
        tag: 'Plus Member',
        gradient: 'from-[#F59B0F] to-[#AC6C2A]',
    },
    {
        name: 'Ravindu Silva',
        role: 'Small Business Owner',
        avatar: 'RS',
        rating: 5,
        text: 'Running a small bakery, I rely on DeliveryYa Business to fulfil orders across the city. The warehouse feature eliminated my logistics headache completely.',
        tag: 'Business Plan',
        gradient: 'from-[#AC6C2A] to-[#8B5A28]',
    },
    {
        name: 'Tharushi Jayawardene',
        role: 'University Student',
        avatar: 'TJ',
        rating: 5,
        text: 'I barely have time between classes and the free Standard plan is perfect. Meals, stationery, everything in one app. The 24/7 support once helped me at midnight!',
        tag: 'Standard User',
        gradient: 'from-amber-500 to-[#F59B0F]',
    },
    {
        name: 'Kasun Perera',
        role: 'IT Professional',
        avatar: 'KP',
        rating: 5,
        text: 'Scheduled delivery is my favourite feature — I plan my office snacks for the whole week on Sunday. Never had a single miss. Absolutely reliable service.',
        tag: 'Plus Member',
        gradient: 'from-[#F59B0F] via-amber-500 to-[#AC6C2A]',
    },
    {
        name: 'Malsha Dissanayake',
        role: 'New Mother',
        avatar: 'MD',
        rating: 5,
        text: 'With a newborn at home, getting out is impossible. DeliveryYa has been my lifeline. Baby products, medicine, meals — all delivered safely and quickly. Bless this app!',
        tag: 'Plus Member',
        gradient: 'from-[#8B5A28] to-amber-700',
    },
    {
        name: 'Nimal Bandara',
        role: 'Restaurant Owner',
        avatar: 'NB',
        rating: 5,
        text: 'Since partnering with DeliveryYa for our restaurant, our online orders grew 3x. Their logistics are smooth, the dashboard is clean, and payouts are always on time.',
        tag: 'Business Plan',
        gradient: 'from-orange-500 to-[#AC6C2A]',
    },
];

function ServiceTestimonials() {
    return (
        <section className="bg-linear-to-br from-[#FFF4EE] via-white to-[#FFF4EE] py-20 px-4 overflow-hidden">
            {/* Decorative */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-10 right-10 w-72 h-72 bg-[#F59B0F] blur-3xl opacity-10 rounded-full"></div>
                <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#AC6C2A] blur-3xl opacity-10 rounded-full"></div>
            </div>

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-6 py-2 rounded-full mb-5 shadow-lg">
                        <IoRocketSharp className="w-4 h-4" />
                        <span className="text-sm font-bold">What People Say</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        Loved by{' '}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                            Thousands
                        </span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                        Real stories from real customers who trust DeliveryYa every day.
                    </p>
                    <div className="mt-6 w-20 h-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] mx-auto rounded-full"></div>
                </div>

                {/* Masonry-like grid */}
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
                    {testimonials.map((t, i) => (
                        <div
                            key={i}
                            className="break-inside-avoid group bg-white rounded-3xl p-7 shadow-sm border border-orange-100 hover:shadow-xl hover:border-[#F59B0F]/40 transition-all duration-400 hover:-translate-y-1 relative overflow-hidden"
                        >
                            {/* Quote icon */}
                            <FaQuoteLeft className="absolute top-5 right-6 w-8 h-8 text-orange-100 group-hover:text-orange-200 transition-colors duration-300" />

                            {/* Top: avatar + name */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${t.gradient} text-white font-black text-lg flex items-center justify-center shadow-lg shrink-0`}>
                                    {t.avatar}
                                </div>
                                <div>
                                    <p className="font-black text-gray-900 text-sm">{t.name}</p>
                                    <p className="text-gray-400 text-xs">{t.role}</p>
                                </div>
                            </div>

                            {/* Stars */}
                            <div className="flex gap-0.5 mb-3">
                                {Array.from({ length: t.rating }).map((_, si) => (
                                    <FaStar key={si} className="w-4 h-4 text-[#F59B0F]" />
                                ))}
                            </div>

                            {/* Text */}
                            <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>

                            {/* Tag */}
                            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full bg-linear-to-r ${t.gradient} text-white shadow`}>
                                {t.tag}
                            </span>

                            {/* Bottom bar */}
                            <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full bg-linear-to-r ${t.gradient} transition-all duration-500 rounded-b-3xl`}></div>
                        </div>
                    ))}
                </div>

                {/* Trust bar */}
                {/* <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-5">
                    {[
                        { value: '500K+', label: 'Happy Customers' },
                        { value: '4.9 / 5', label: 'Average Rating' },
                        { value: '1M+', label: 'Orders Delivered' },
                        { value: '98%', label: 'On-Time Rate' },
                    ].map((stat, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl p-5 text-center border border-orange-100 shadow-sm hover:shadow-md hover:border-[#F59B0F]/30 transition-all duration-300"
                        >
                            <div className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] mb-1">
                                {stat.value}
                            </div>
                            <div className="text-gray-500 text-xs font-semibold">{stat.label}</div>
                        </div>
                    ))}
                </div> */}
            </div>
        </section>
    );
}

export default ServiceTestimonials;
