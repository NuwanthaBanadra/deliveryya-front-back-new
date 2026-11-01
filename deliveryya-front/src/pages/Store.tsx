import { useSearchParams } from 'react-router-dom'
import StoreSearch from '../page_comps/store/StoreSearch'
import Footer from '../page_comps/home/Footer'
import NavBar from '../page_comps/home/NavBar'
import StoreHero from '../page_comps/store/StoreHero'
import HotDeals from '../page_comps/store/HotDeals'
import NewArrivals from '../page_comps/store/NewArrivals'
import CategoryShowcase from '../page_comps/store/CategoryShowcase'
import BestSellers from '../page_comps/store/BestSales'
import BestMarkets from '../page_comps/store/BestMarkets'
import AllProducts from '../page_comps/store/AllProducts'
 

function Store() {
    const [searchParams] = useSearchParams();
    const storeSearchQuery = searchParams.get('search') ?? ''

    return (
        <div className='min-h-screen bg-white'>
            <NavBar />
            <StoreHero />
            <StoreSearch />
            <HotDeals />
            <NewArrivals />
            <CategoryShowcase />
            <BestSellers />
            <BestMarkets searchQuery={storeSearchQuery} />
            <AllProducts productCount={8} showAllProductsBtn={true} searchQuery={storeSearchQuery} />
            <Footer />
        </div>
    )
}

export default Store