import NavBar from '../page_comps/home/NavBar';
import Footer from '../page_comps/home/Footer';
import ServicesHero from '../page_comps/services/ServicesHero';
import ServicesSectionUrgentJobs from '../page_comps/services/ServicesSectionUrgentJobs';
import ServicesSectionMarkets from '../page_comps/services/ServicesSectionMarkets';
import ServicesSectionDelivery from '../page_comps/services/ServicesSectionDelivery';
import ServiceHowItWorks from '../page_comps/services/ServiceHowItWorks';
import ServicesWhyChoose from '../page_comps/services/ServicesWhyChoose';
import ServicesFAQ from '../page_comps/services/ServicesFAQ';
import ServicesCTA from '../page_comps/services/ServicesCTA';
import { checkAccess } from '../util/AccessController';

function Services() {
    return (
        <div className="min-h-screen bg-white text-base md:text-lg">
            <NavBar />
            <ServicesHero />
            <ServicesSectionUrgentJobs />
            <ServicesSectionMarkets />
            <ServicesSectionDelivery />
            <ServiceHowItWorks />
            <ServicesWhyChoose />
            <ServicesFAQ />
            <ServicesCTA />
            <Footer />
        </div>
    );
}

export default Services;
