import ContactUs from '../page_comps/home/ContactUs'
import Footer from '../page_comps/home/Footer'
import Hero from '../page_comps/home/Hero'
import HotSales from '../page_comps/home/HotSales'
import NavBar from '../page_comps/home/NavBar'
import OurServices from '../page_comps/home/OurServices'
import Subscribe from '../page_comps/home/Subscribe'
import AnnouncementsOffers from '../page_comps/home/AnnouncementsOffers'
import ServicesOverview from '../page_comps/home/ServicesOverview'
import UrgentJobsHomeSection from '../page_comps/home/UrgentJobsHomeSection'

function Home() {
    return (
        <div className='min-h-screen bg-white'>
            <NavBar />
            <Hero />
            {/* <AnnouncementsOffers /> */}
            <ServicesOverview />
            <UrgentJobsHomeSection />
            <OurServices />
            <HotSales />
            <Subscribe />
            <ContactUs />
            <Footer />
        </div>
    )
}

export default Home