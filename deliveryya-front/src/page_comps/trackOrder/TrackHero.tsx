import { useEffect, useRef, useState } from 'react';
import { MdSearch } from 'react-icons/md';

interface TrackHeroProps {
    onSearch: (code: string) => void;
    isSearched: boolean;
}

function TrackHero({ onSearch, isSearched }: TrackHeroProps) {
    const [index, setIndex] = useState(0);
    const [orderCode, setOrderCode] = useState('');
    const [error, setError] = useState('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const slides = [
        {
            gradient: 'from-orange-500/90 via-yellow-500/85 to-amber-600/90',
            image: 'https://images.pexels.com/photos/5729186/pexels-photo-5729186.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80',
        },
        {
            gradient: 'from-blue-500/90 via-cyan-500/85 to-teal-600/90',
            image: 'https://i.postimg.cc/MG2sjFs9/Whats-App-Image-2026-05-27-at-10-35-23-PM.jpg?auto=compress&cs=tinysrgb&w=1200&q=80',
        },
        {
            gradient: 'from-green-500/90 via-emerald-500/85 to-teal-600/90',
            image: 'https://i.postimg.cc/CKdvZrfW/Whats-App-Image-2026-05-27-at-10-53-48-PM.jpg?auto=compress&cs=tinysrgb&w=1200&q=80',
        },
    ];

    const heroTitle = 'Track Your Order';
    const heroDescription =
        'Use your order code to follow delivery progress with a simple, real-time tracking view and all the details you need in one place.';

    const startAutoplay = () => {
        intervalRef.current = setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length);
        }, 6000);
    };

    useEffect(() => {
        startAutoplay();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [slides.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderCode.trim()) {
            setError('Please enter a valid order code.');
            return;
        }
        setError('');
        onSearch(orderCode.trim());
    };

    return (
        <div className="relative w-full">
            <div
                className="relative overflow-hidden rounded-b-4xl sm:rounded-b-[3rem] shadow-2xl"
                style={{ height: 'clamp(160px, 40vh, 440px)' }}
            >
                <div
                    className="absolute inset-0 flex transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ transform: `translateX(-${index * 100}%)` }}
                >
                    {slides.map((slide, i) => (
                        <div key={i} className="relative w-full shrink-0 overflow-hidden">
                            <img
                                src={slide.image}
                                alt="Track order background"
                                className={`h-full w-full object-cover transition-transform duration-10000 ease-linear ${
                                    i === index ? 'scale-110' : 'scale-100'
                                }`}
                            />
                            <div className={`absolute inset-0 bg-linear-to-br ${slide.gradient} mix-blend-multiply`} />
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                            <div className="absolute inset-0 bg-linear-to-r from-black/40 via-transparent to-transparent" />
                        </div>
                    ))}
                </div>

                <div className="relative z-10 flex h-full items-center justify-center">
                    <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
                        <div className="max-w-2xl lg:max-w-3xl mx-auto text-center space-y-5 sm:space-y-6 md:space-y-8">
                            <div className="space-y-3 sm:space-y-4">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] text-white drop-shadow-xl tracking-tight">
                                    {heroTitle}
                                </h1>
                                <p className="text-base sm:text-lg md:text-xl text-gray-100 font-medium leading-relaxed max-w-xl mx-auto text-center drop-shadow-sm">
                                    {heroDescription}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Form */}
            <div id="track-search" className="relative bg-linear-to-b from-white via-orange-50/30 to-white py-16 sm:py-20 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Enter Your Order Code</h2>
                        <p className="text-gray-600 mb-8">You'll receive a tracking code in your email or SMS after placing an order.</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <MdSearch className="w-6 h-6 text-gray-400 group-focus-within:text-[#F59B0F] transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={orderCode}
                                        onChange={(e) => {
                                            setOrderCode(e.target.value);
                                            setError('');
                                        }}
                                        placeholder="Ex: ORD-00001-00008"
                                        className={`w-full pl-12 pr-4 py-4 md:py-5 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:outline-none ${
                                            error
                                                ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                                                : 'border-gray-300 hover:border-gray-400 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 bg-white'
                                        }`}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="px-8 md:px-12 py-4 md:py-5 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 active:scale-95 whitespace-nowrap"
                                >
                                    <span className="hidden sm:inline">Search</span>
                                    <MdSearch className="w-6 h-6 sm:hidden" />
                                </button>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-slideInDown">
                                    <p className="text-red-700 font-semibold">{error}</p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TrackHero;
