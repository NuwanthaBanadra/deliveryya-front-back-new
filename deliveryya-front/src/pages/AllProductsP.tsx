import Footer from "../page_comps/home/Footer"
import NavBar from "../page_comps/home/NavBar"
import AllProducts from "../page_comps/store/AllProducts"
import { useEffect } from "react"
import { FaSearch } from "react-icons/fa"
import { TbTruckDelivery } from "react-icons/tb"
import { useLocation, useSearchParams } from "react-router-dom"

function AllProductsP() {
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const searchQuery = searchParams.get('search') ?? ''

    useEffect(() => {
        if (!location.state || !(location.state as { scrollToResults?: boolean }).scrollToResults) {
            return
        }

        const scrollToResults = window.setTimeout(() => {
            const resultsSection = document.getElementById('all-products')
            resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)

        return () => {
            window.clearTimeout(scrollToResults)
        }
    }, [location.state, searchQuery])

    return (
        <div className='min-h-screen bg-white'>
            <NavBar />

            <section className='relative mt-0 flex w-full items-center justify-center overflow-hidden bg-[#0A0500] px-4 pb-32 pt-20 text-center md:pb-48 md:pt-28 lg:pb-56 lg:pt-36'>
                <div className='absolute inset-0'>
                    <img
                        src='https://images.pexels.com/photos/4483610/pexels-photo-4483610.jpeg?auto=compress&cs=tinysrgb&w=2000&h=1000&dpr=2'
                        alt='All products catalog'
                        className='h-full w-full object-cover opacity-40 mix-blend-overlay'
                    />
                    <div className='absolute inset-0 bg-linear-to-b from-gray-900/60 via-gray-900/80 to-[#AC6C2A]/30'></div>
                </div>

                <div className='pointer-events-none absolute inset-0 overflow-hidden'>
                    <div className='absolute left-1/2 top-0 h-120 w-full max-w-4xl -translate-x-1/2 rounded-full bg-[#F59B0F] opacity-20 blur-[120px]'></div>
                </div>

                <div className='relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 sm:px-6 lg:px-8'>
                    <div className='mb-8 inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-white/10 px-5 py-2.5 shadow-lg backdrop-blur-md transition-transform hover:scale-105'>
                        <TbTruckDelivery className='h-5 w-5 text-orange-400' />
                        <span className='text-xs font-bold tracking-widest text-orange-50 uppercase md:text-sm'>
                            Premium Product Catalog
                        </span>
                    </div>

                    <h1 className='mb-6 text-5xl leading-[1.1] font-black tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]'>
                        DeliveryYa All <br />
                        <span className='bg-linear-to-r from-[#F59B0F] via-orange-400 to-[#AC6C2A] bg-clip-text text-transparent drop-shadow-sm'>
                            Active Products
                        </span>
                    </h1>

                    <p className='mb-10 max-w-2xl text-lg leading-relaxed font-medium text-gray-300 sm:text-xl md:text-2xl'>
                        Use powerful filters for markets, categories, brands, rating, and pricing to find exactly what you need in seconds.
                    </p>

                    <a
                        href=''
                        className='group flex w-full items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-10 py-4 text-base font-black text-white shadow-2xl shadow-[#F59B0F]/30 transition-all hover:scale-[1.03] hover:from-[#AC6C2A] hover:to-[#8B5A28] active:scale-95 sm:w-auto md:py-5 md:text-lg'
                    >
                        <FaSearch className='h-5 w-5 transition-transform group-hover:-translate-y-1 md:h-6 md:w-6' />
                        Explore Catalog
                    </a>
                </div>

                <div className='absolute bottom-0 left-0 w-full translate-y-px transform overflow-hidden leading-0'>
                    <svg viewBox='0 0 1440 120' preserveAspectRatio='none' className='relative block h-10 w-full md:h-20 lg:h-32.5'>
                        <defs>
                            <linearGradient id='all-products-wave-gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                                <stop offset='0%' stopColor='#FFF4EE' />
                                <stop offset='50%' stopColor='#FFF9F4' />
                                <stop offset='100%' stopColor='white' />
                            </linearGradient>
                        </defs>
                        <path fill='url(#all-products-wave-gradient)' d='M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,53.3C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z'></path>
                    </svg>
                </div>
            </section>

            <AllProducts searchQuery={searchQuery} />

            <Footer />
        </div>
    )
}

export default AllProductsP