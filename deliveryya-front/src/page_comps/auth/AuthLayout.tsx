import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbTruckDelivery } from 'react-icons/tb';
import { IoArrowBack } from 'react-icons/io5';
import logoImage from '../../assets/images/logo.jpeg';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
}

function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const backgroundImages = [
        'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=1200&q=80',
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80',
        'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=1200&q=80'
    ];

    const slideGradients = [
        'from-[#FF6B35]/90 via-[#FF8C42]/85 to-[#FFA726]/90',
        'from-[#FFA726]/90 via-[#FF8C42]/85 to-[#FF6B35]/90',
        'from-[#FF8C42]/90 via-[#FFA726]/85 to-[#FFB84D]/90'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % backgroundImages.length);
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(interval);
    }, [backgroundImages.length]);

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
            {/* Animated Background Slideshow */}
            <div className="absolute inset-0 z-0">
                {backgroundImages.map((image, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                            index === currentSlide ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                        <img
                            src={image}
                            alt={`Background ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        {/* Dynamic Gradient Overlay based on slide */}
                        <div className={`absolute inset-0 bg-linear-to-br ${slideGradients[index]}`}></div>
                        {/* Additional overlay for better contrast */}
                        <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                ))}
            </div>

            {/* Animated Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD4C4] rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFCBA4] rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Slide Indicators */}
            {/* <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {backgroundImages.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`transition-all duration-300 rounded-full ${
                            index === currentSlide
                                ? 'bg-linear-to-r from-[#FF6B35] to-[#FFA726] w-8 h-2 shadow-lg'
                                : 'bg-white/50 hover:bg-[#FFB84D] w-2 h-2'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div> */}

            {/* Back to Home */}
            <div className="relative w-full max-w-7xl z-10">
                {/* Card with glassmorphism effect */}
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center justify-center gap-3 mb-8 group">
                        <div className="relative w-20 h-16 rounded-xl overflow-hidden shadow-lg ring-2 ring-[#FF6B35] group-hover:ring-[#FF8C42] transition-all duration-300 bg-white">
                            <img 
                                src={logoImage} 
                                alt="DeliveryYa Logo" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {/* <div>
                            <h1 className='font-black text-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] bg-clip-text text-transparent'>
                                DeliveryYa
                            </h1>
                        </div> */}
                    </Link>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-4xl font-black text-[#1A1F3A] mb-3">
                            {title}
                        </h2>
                        <p className="text-[#2C3E50] text-base">
                            {subtitle}
                        </p>
                    </div>

                    {/* Content */}
                    {children}

                    {/* Back to Home inside card */}
                    <div className="mt-6">
                        <Link
                            to="/"
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] shadow-md transition-all hover:shadow-lg hover:scale-[1.01]"
                        >
                            <IoArrowBack className="w-5 h-5" />
                            <span>Back to Home</span>
                        </Link>
                    </div>
                </div>

                {/* Trust Indicators */}
                <div className="mt-8 flex items-center justify-center gap-8 text-sm text-white backdrop-blur-sm bg-white/10 py-3 px-6 rounded-full">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#1DE9B6] rounded-full animate-pulse"></div>
                        <span className="font-semibold">Secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TbTruckDelivery className="w-4 h-4 text-[#FFB84D]" />
                        <span className="font-semibold">Fast Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        <span className="font-semibold">Trusted</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthLayout;
