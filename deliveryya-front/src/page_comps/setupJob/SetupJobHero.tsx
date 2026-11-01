import {
    ArrowRightIcon,
    BoltIcon,
    MapPinIcon,
    Bars3CenterLeftIcon,
    PaperAirplaneIcon
} from '@heroicons/react/24/outline';

function SetupJobHero() {
    return (
        <section className="relative overflow-hidden bg-white pt-12 pb-16 md:pt-20 md:pb-24">
            {/* Soft Background Accent */}
            <div className="absolute inset-0 pointer-events-none select-none">
                <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-linear-to-bl from-orange-100/50 to-transparent rounded-bl-full"></div>
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-[#F59B0F]/10 blur-[80px] rounded-full"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
                    
                    {/* Content Section */}
                    <div className="w-full lg:w-5/12 flex flex-col justify-center text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-[#F59B0F] text-sm font-bold mx-auto lg:mx-0 mb-6 shadow-sm w-fit">
                            <BoltIcon className="w-4 h-4" />
                            Dispatch Mission Control
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.15] mb-6">
                            Coordinate <br/>
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                                Urgent Deliveries
                            </span><br/>
                            In Seconds.
                        </h1>

                        <p className="text-base md:text-lg text-gray-500 mb-8 leading-relaxed">
                            Bypass the traditional booking flow. Build highly specific urgent missions with smart routing, instant dispatch, and structured customer notes.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <a
                                href="#job-details"
                                className="group w-full sm:w-auto flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl hover:shadow-gray-900/20"
                            >
                                Configure Job
                                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                            <div className="w-full sm:w-auto flex items-center justify-center gap-2 text-gray-600 font-bold px-6 py-4">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59B0F] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F59B0F]"></span>
                                </span>
                                System Ready
                            </div>
                        </div>
                    </div>

                    {/* Image & UI Layout Section */}
                    <div className="w-full lg:w-7/12 relative">
                        {/* Interactive UI Mockup overlapping Image */}
                        <div className="relative pl-0 md:pl-12 lg:pl-16">
                            <div className="relative rounded-4xl overflow-hidden shadow-2xl border bg-white aspect-[4/3] md:aspect-[16/10] w-full">
                                <img 
                                    src="https://images.pexels.com/photos/4392040/pexels-photo-4392040.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                                    alt="Courier arriving with package" 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-linear-to-tr from-gray-900/60 to-transparent pointer-events-none"></div>
                                
                                <div className="absolute bottom-6 left-6 right-6 pt-4 border-t border-white/20 text-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-lg md:text-xl">Priority Pick-up</p>
                                            <p className="text-sm text-gray-300">Driver En Route</p>
                                        </div>
                                        <div className="bg-[#F59B0F] p-3 rounded-full shadow-lg">
                                            <PaperAirplaneIcon className="w-6 h-6 text-white transform -rotate-45 relative -top-0.5 right-0.5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Setup Cards */}
                            <div className="hidden md:flex absolute -left-6 top-12 bg-white p-5 rounded-2xl shadow-xl shadow-orange-900/5 border border-gray-100 flex-col gap-4 w-64 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-50 p-2 rounded-lg text-[#F59B0F]">
                                        <MapPinIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-2 w-20 bg-gray-200 rounded-full mb-2"></div>
                                        <div className="h-2 w-32 bg-gray-100 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center text-xs font-bold text-gray-400">
                                    <div className="w-1 h-4 bg-gray-200 rounded-full ml-4"></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-50 p-2 rounded-lg text-[#F59B0F]">
                                        <MapPinIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-2 w-24 bg-gray-200 rounded-full mb-2"></div>
                                        <div className="h-2 w-28 bg-gray-100 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="hidden md:flex absolute -bottom-8 right-12 bg-white px-6 py-4 rounded-xl shadow-xl border border-gray-50 items-center gap-4 z-10 animate-bounce" style={{ animationDuration: '3s' }}>
                                <Bars3CenterLeftIcon className="w-6 h-6 text-[#AC6C2A]" />
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Status</p>
                                    <p className="text-sm font-black text-gray-900">Job Verified</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>
    );
}

export default SetupJobHero;
