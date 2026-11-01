import { TbTruckDelivery } from 'react-icons/tb';
import { IoRocketSharp } from 'react-icons/io5';
import { MdTrackChanges } from 'react-icons/md';
import { FaShoppingBag, FaStore } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import JwtUtil from '../../util/JwtUtil';

function ServicesCTA() {
    const token = localStorage.getItem('jwtToken');
    const isLoggedIn = token ? JwtUtil.validateToken(token) : false;

    return (
        <section className="relative bg-linear-to-br from-[#0f0c0a] via-[#1a1006] to-[#0f0c0a] py-24 px-4 overflow-hidden">
            {/* Animated Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F59B0F] rounded-full blur-3xl opacity-15 pointer-events-none animate-float"></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#AC6C2A] rounded-full blur-3xl opacity-15 pointer-events-none animate-float" style={{ animationDelay: '-1s' }}></div>
            <div className="absolute top-1/3 right-0 w-72 h-72 bg-orange-500 rounded-full blur-3xl opacity-10 pointer-events-none animate-bounce-slow"></div>

            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(245,155,15,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(245,155,15,0.4) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            ></div>

            <div className="relative max-w-5xl mx-auto text-center space-y-8 animate-slideInUp">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-[#F59B0F]/20 border border-[#F59B0F]/40 text-[#F59B0F] px-6 py-3 rounded-full backdrop-blur-sm animate-glow">
                    <IoRocketSharp className="w-4 h-4 animate-rotateSlow" />
                    <span className="text-sm font-bold tracking-widest uppercase">Get Started Today</span>
                </div>

                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-none">
                    Ready to{' '}
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] via-amber-400 to-[#AC6C2A]">
                        Experience
                    </span>
                    <br />
                    the Difference?
                </h2>

                <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                    Join over 500,000 customers who trust DeliveryYa for fast, reliable delivery every single day. Sign up free — no credit card needed.
                </p>

                {/* CTA group with animations */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                    <Link
                        to="/sign-up"
                        className="group inline-flex items-center gap-3 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] text-white font-black px-10 py-5 rounded-2xl shadow-2xl shadow-[#F59B0F]/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95 text-base"
                    >
                        <FaShoppingBag className="w-5 h-5 group-hover:animate-bounce" />
                        Create Free Account
                    </Link>
                    <Link
                        to="/store"
                        className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white/50 text-white font-bold px-10 py-5 rounded-2xl backdrop-blur-sm transition-all duration-300 text-base transform hover:scale-105 hover:-translate-y-1"
                    >
                        <TbTruckDelivery className="w-5 h-5" />
                        Browse Store
                    </Link>
                </div>

                {/* Feature strips with staggered animations */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                    {[
                        { icon: <TbTruckDelivery className="w-4 h-4" />, label: 'Free first delivery' },
                        { icon: <MdTrackChanges className="w-4 h-4" />, label: 'Live GPS tracking' },
                        { icon: <FaStore className="w-4 h-4" />, label: '10,000+ products' },
                        { icon: <IoRocketSharp className="w-4 h-4" />, label: 'Cancel anytime' },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 bg-white/10 border border-white/20 hover:border-white/40 text-gray-200 text-xs font-semibold px-5 py-2.5 rounded-full backdrop-blur-sm transition-all duration-300 transform hover:scale-110 hover:bg-white/20 cursor-default"
                            style={{
                                animation: `slideInDown 0.6s ease-out forwards`,
                                animationDelay: `${i * 100}ms`,
                            }}
                        >
                            <span className="text-[#F59B0F]">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </div>

                {/* Seller banner with hover effects */}
                <div className="mt-16 bg-white/5 border border-white/10 hover:border-[#F59B0F]/30 backdrop-blur-sm rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 transform hover:shadow-2xl hover:shadow-[#F59B0F]/20 hover:bg-white/[0.08]">
                    <div className="text-left">
                        <p className="text-[#F59B0F] text-xs font-black uppercase tracking-widest mb-1">For Businesses</p>
                        <h3 className="text-white text-xl font-black">Want to sell on DeliveryYa?</h3>
                        <p className="text-gray-400 text-sm mt-1">Join 500+ verified sellers and reach thousands of customers instantly.</p>
                    </div>
                    <Link
                        to={isLoggedIn ? '/deliverYya-cloud-console/request-for-market' : '/sign-in'}
                        className="shrink-0 inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-black px-7 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 text-sm transform active:scale-95"
                    >
                        <FaStore className="w-4 h-4" />
                        Become a Seller
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default ServicesCTA;
