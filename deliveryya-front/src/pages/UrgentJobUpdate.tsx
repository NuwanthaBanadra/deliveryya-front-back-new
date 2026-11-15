import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import axiosInstance from '../util/AxiosUtil'
import Footer from '../page_comps/home/Footer'
import JobDetails, { type UrgentJobFormPrefill } from '../page_comps/setupJob/UpdateJobDetails'
import { mapKey } from '../util/AccessController'
import { buildDefaultGoogleMapsEmbedLink, buildGoogleMapsDirectionsLinkFromUrls, buildGoogleMapsEmbedLinkFromUrls } from '../util/GoogleMapsUrlUtil'
import { decodeUrgentJobCodeFromUrl } from '../util/UrgentJobLinkUtil'

type ApiResponse<T> = {
    object?: T;
    desc?: string;
    message?: string;
    exData?: unknown;
};

type UrgentJobCheckpoint = {
    id?: string | number;
    task?: string | null;
    location?: string | null;
    beAt?: string | null;
    scheduledAt?: string | null;
    expectedTimeDuration?: number | null;
};

type UrgentJobLookupItem = {
    id?: string | number;
    job?: string | null;
    desc?: string | null;
    description?: string | null;
    cost?: number | null;
    username?: string | null;
    userName?: string | null;
    mobile?: string | null;
    nic?: string | null;
    email?: string | null;
    vehicleTypeId?: number | null;
    vehicleType?: { id?: number | null } | null;
    trip?: number | null;
    tripDistance?: number | null;
    items?: UrgentJobCheckpoint[] | null;
    checkpoints?: UrgentJobCheckpoint[] | null;
};

const normalizeUrgentJobPrefill = (item: UrgentJobLookupItem): UrgentJobFormPrefill => {
    const checkpoints = item.items || item.checkpoints || [];

    return {
        id: item.id !== undefined && item.id !== null ? String(item.id) : undefined,
        job: item.job || undefined,
        description: item.desc || item.description || undefined,
        cost: item.cost ?? undefined,
        username: item.username || item.userName || undefined,
        mobile: item.mobile || undefined,
        nic: item.nic || undefined,
        email: item.email || undefined,
        vehicleTypeId: item.vehicleTypeId ?? item.vehicleType?.id ?? undefined,
        tripDistance: item.trip ?? item.tripDistance ?? undefined,
        checkpoints: checkpoints.map((checkpoint) => ({
            task: checkpoint.task || undefined,
            location: checkpoint.location || undefined,
            scheduledAt: checkpoint.beAt || checkpoint.scheduledAt || null,
            expectedTimeDuration: checkpoint.expectedTimeDuration ?? null,
        })),
    };
};

function UrgentJobUpdate() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [locationUrls, setLocationUrls] = useState<string[]>([]);
    const defaultEmbedLink = useMemo(() => buildDefaultGoogleMapsEmbedLink(mapKey), []);
    const [embeddedLink, setEmbeddedLink] = useState<string>(defaultEmbedLink);
    const [directionsLink, setDirectionsLink] = useState<string | null>(null);
    const [isEmbedLoading, setIsEmbedLoading] = useState(false);
    const [prefillData, setPrefillData] = useState<UrgentJobFormPrefill | undefined>();
    const [isPrefillLoading, setIsPrefillLoading] = useState(false);
    const [prefillError, setPrefillError] = useState<string | null>(null);

    const statePrefillData = useMemo<UrgentJobFormPrefill | undefined>(() => {
        const state = location.state as { prefill?: UrgentJobFormPrefill } | null;
        return state?.prefill;
    }, [location.state]);

    useEffect(() => {
        if (statePrefillData) {
            setPrefillData(statePrefillData);
            setPrefillError(null);
            setIsPrefillLoading(false);
            return;
        }

        const encryptedJobCode = searchParams.get('jobCode')?.trim() || '';
        if (!encryptedJobCode) {
            setPrefillData(undefined);
            setPrefillError(null);
            setIsPrefillLoading(false);
            return;
        }

        const jobCode = decodeUrgentJobCodeFromUrl(encryptedJobCode);
        if (!jobCode) {
            setPrefillData(undefined);
            setPrefillError('The urgent job link is invalid or expired.');
            setIsPrefillLoading(false);
            return;
        }

        let isMounted = true;
        setIsPrefillLoading(true);
        setPrefillError(null);

        void axiosInstance.post<ApiResponse<{ items?: UrgentJobLookupItem[] }>>('/urgent-jobs/get-urgent-jobs', {
            pageNumber: 0,
            countPerPage: 10,
            jobCode,
            search: '',
        })
            .then((response) => {
                if (!isMounted) return;

                const item = response.data.object?.items?.[0];
                if (!item) {
                    setPrefillData(undefined);
                    setPrefillError(`No urgent job found for ${jobCode}.`);
                    return;
                }

                setPrefillData(normalizeUrgentJobPrefill(item));
            })
            .catch(() => {
                if (!isMounted) return;

                setPrefillData(undefined);
                setPrefillError('Failed to load urgent job details from the copied link.');
            })
            .finally(() => {
                if (isMounted) {
                    setIsPrefillLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [searchParams, statePrefillData]);

    useEffect(() => {
        const controller = new AbortController();

        if (locationUrls.length === 0) {
            setEmbeddedLink(defaultEmbedLink);
            setDirectionsLink(null);
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

        void buildGoogleMapsDirectionsLinkFromUrls(locationUrls, controller.signal)
            .then((nextLink) => {
                if (!controller.signal.aborted) {
                    setDirectionsLink(nextLink);
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setDirectionsLink(null);
                }
            });

        return () => controller.abort();
    }, [defaultEmbedLink, locationUrls]);

    return (
        <div className='min-h-screen bg-linear-to-b from-orange-50 via-white to-red-50/40'>
            <div id='job-details' className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12'>
                {prefillError && (
                    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {prefillError}
                    </div>
                )}
                {isPrefillLoading && (
                    <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                        Loading urgent job details from the shared link...
                    </div>
                )}
                <JobDetails onLocationsChange={setLocationUrls} initialData={prefillData ?? statePrefillData} isUpdateMode />
                <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-orange-200 bg-white px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Map Directions</p>
                        <h3 className="mt-1 text-lg font-black text-gray-900">Route from the loaded checkpoints</h3>
                    </div>
                    {directionsLink && (
                        <a
                            href={directionsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-xl border-2 border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition-all hover:border-orange-300 hover:bg-orange-100"
                        >
                            Open Directions in Google Maps
                        </a>
                    )}
                </div>

                <div className="relative h-180 md:h-200 rounded-3xl overflow-hidden border border-orange-200 shadow-xl shadow-orange-100/50 bg-white">
                    <iframe
                        className='rounded-2xl w-full h-full'
                        style={{ border: 0 }}
                        src={embeddedLink}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Urgent job directions map"
                    ></iframe>
                    {isEmbedLoading && (
                        <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                            <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 shadow-lg shadow-orange-100/50">
                                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-medium text-gray-700">Updating directions...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default UrgentJobUpdate
