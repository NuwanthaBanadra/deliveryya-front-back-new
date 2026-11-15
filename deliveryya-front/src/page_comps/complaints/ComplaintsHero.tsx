import { useEffect, useRef, useState } from 'react';

function ComplaintsHero() {
    const [index, setIndex] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const slides = [
        {
            gradient: 'from-orange-500/90 via-yellow-500/85 to-amber-600/90',
            image: 'https://images.pexels.com/photos/386148/pexels-photo-386148.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80',
        },
        {
            gradient: 'from-blue-500/90 via-cyan-500/85 to-teal-600/90',
            image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80',
        },
        {
            gradient: 'from-green-500/90 via-emerald-500/85 to-teal-600/90',
            image: 'https://i.postimg.cc/jSMgSYCQ/Whats-App-Image-2026-05-28-at-11-11-19-AM.jpg?auto=compress&cs=tinysrgb&w=1200&q=80',
        },
    ];

    const heroTitle = 'Support Desk';
    const heroDescription = 'Search your order, review details, and submit a complaint. Our team will follow up to resolve issues quickly.';

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

    return (
        <div className="relative w-full">
            <div
                className="relative overflow-hidden rounded-b-4xl shadow-2xl"
                style={{ height: 'clamp(140px, 30vh, 360px)' }}
            >
                <div
                    className="absolute inset-0 flex transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ transform: `translateX(-${index * 100}%)` }}
                >
                    {slides.map((slide, i) => (
                        <div key={i} className="relative w-full shrink-0 overflow-hidden">
                            <img
                                src={slide.image}
                                alt="Complaints background"
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
        </div>
    );
}

export default ComplaintsHero;
