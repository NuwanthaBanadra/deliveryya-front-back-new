import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../util/AxiosUtil'
import NavBar from '../page_comps/home/NavBar'
import Footer from '../page_comps/home/Footer'
import JobDetails, { type UrgentJobFormPrefill } from '../page_comps/setupJob/JobDetails'
import SetupJobHero from '../page_comps/setupJob/SetupJobHero'
import { mapKey } from '../util/AccessController'
import { buildDefaultGoogleMapsEmbedLink, buildGoogleMapsEmbedLinkFromUrls } from '../util/GoogleMapsUrlUtil'
import JwtUtil from '../util/JwtUtil'
import { buildUserProfileFromSession } from '../util/UserProfileUtil'

type ApiResponse<T> = {
    object?: T;
    desc?: string;
    message?: string;
};

type LoggedInUserDetails = {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string;
    nic?: string;
};

const buildPrefillFromUser = (user: LoggedInUserDetails): UrgentJobFormPrefill => {
    const fullName = `${user.firstName?.trim() || ''} ${user.lastName?.trim() || ''}`.trim();

    return {
        username: fullName || user.email?.trim() || '',
        mobile: user.mobile?.trim() || '',
        nic: user.nic?.trim() || '',
        email: user.email?.trim() || '',
    };
};

function SetupJob() {
    const navigate = useNavigate();
    const [locationUrls, setLocationUrls] = useState<string[]>([]);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const defaultEmbedLink = useMemo(() => buildDefaultGoogleMapsEmbedLink(mapKey), []);
    const [embeddedLink, setEmbeddedLink] = useState<string>(defaultEmbedLink);
    const [isEmbedLoading, setIsEmbedLoading] = useState(false);
    const [initialJobData, setInitialJobData] = useState<UrgentJobFormPrefill | undefined>(() => {
        const sessionProfile = buildUserProfileFromSession();

        return sessionProfile
            ? {
                username: sessionProfile.name,
                email: sessionProfile.email,
            }
            : undefined;
    });

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        const isLoggedIn = token && JwtUtil.validateToken(token);
        
        if (!isLoggedIn) {
            setIsLoginModalOpen(true);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (!token || !JwtUtil.validateToken(token)) {
            setInitialJobData(undefined);
            return;
        }

        const controller = new AbortController();

        void axiosInstance.get<ApiResponse<LoggedInUserDetails>>('/users/get-user-by-id', {
            signal: controller.signal,
        })
            .then((response) => {
                if (controller.signal.aborted) {
                    return;
                }

                const userData = (response.data.object ?? response.data) as LoggedInUserDetails;
                if (!userData) {
                    return;
                }

                setInitialJobData((current) => ({
                    ...current,
                    ...buildPrefillFromUser(userData),
                }));
            })
            .catch(() => {
                if (controller.signal.aborted) {
                    return;
                }

                // Keep the session-derived fallback if the profile request fails.
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        if (locationUrls.length === 0) {
            setEmbeddedLink(defaultEmbedLink);
            setIsEmbedLoading(false);
            return () => controller.abort();
        }

        setIsEmbedLoading(true);

        void buildGoogleMapsEmbedLinkFromUrls(locationUrls, mapKey, controller.signal)
            .then((nextLink) => {
                if (!controller.signal.aborted) {
                    setEmbeddedLink(nextLink);
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setEmbeddedLink(defaultEmbedLink);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsEmbedLoading(false);
                }
            });

        return () => controller.abort();
    }, [defaultEmbedLink, locationUrls]);

    return (
        <div className='min-h-screen bg-linear-to-b from-orange-50 via-white to-red-50/40'>
            {isLoginModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-md rounded-3xl bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-orange-50 to-amber-50 px-6 py-8 text-center">
                            <div className="mb-4 flex justify-center">
                                <div className="rounded-full bg-orange-100 p-4">
                                    <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">Login Required</h2>
                        </div>
                        
                        <div className="px-6 py-8">
                            <p className="mb-6 text-center text-gray-600">
                                To create and manage urgent jobs, you need to sign in to your account. This ensures we can track your deliveries and keep you updated.
                            </p>
                            
                            <button
                                onClick={() => navigate('/sign-in')}
                                className="w-full rounded-xl bg-gray-900 px-6 py-3 font-bold text-white transition-all hover:bg-gray-800 active:scale-95"
                            >
                                Sign In Now
                            </button>
                            
                            <div className="mt-4 text-center">
                                <p className="text-sm text-gray-500">
                                    Don't have an account?{' '}
                                    <button
                                        onClick={() => navigate('/sign-up')}
                                        className="font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                                    >
                                        Create one here
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <NavBar />
            <SetupJobHero />
            <div id='job-details' className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12'>
                <JobDetails onLocationsChange={setLocationUrls} initialData={initialJobData} />
                <div className="relative h-180 md:h-200 rounded-3xl overflow-hidden border border-orange-200 shadow-xl shadow-orange-100/50 bg-white">
                    <iframe
                        className='rounded-2xl w-full h-full'
                        style={{ border: 0 }}
                        src={embeddedLink}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Delivery route preview"
                    ></iframe>
                    {isEmbedLoading && (
                        <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                            <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 shadow-lg shadow-orange-100/50">
                                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-medium text-gray-700">Updating route preview...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default SetupJob
