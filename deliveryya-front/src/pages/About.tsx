import AboutHero from '../page_comps/about/AboutHero'
import CoreValues from '../page_comps/about/CoreValues'
import JoinUs from '../page_comps/about/JoinUs'
import TeamStats from '../page_comps/about/TeamStats'
import VisionMission from '../page_comps/about/VisionMission'
import Footer from '../page_comps/home/Footer'
import NavBar from '../page_comps/home/NavBar'

function About() {
    return (
        <div className='min-h-screen bg-linear-to-b from-white via-[#FFF4EE] to-white text-[#1A1F3A]'>

            <NavBar />
            <AboutHero />
            <VisionMission />
            {/* <OurStory /> */}
            <CoreValues />
            {/* <TeamStats /> */}
            <JoinUs />
            <Footer />

        </div>
    )
}

export default About
