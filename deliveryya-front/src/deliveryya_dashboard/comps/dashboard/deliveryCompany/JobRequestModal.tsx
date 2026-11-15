import {
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    MapPinIcon,
    ScaleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import axiosInstance from '../../../../util/AxiosUtil';
import { getCurrentUserId } from '../../../../util/AccessController';
import { getCurrentUserRoleId, ROLE_IDS } from '../../../../util/RoleAccess';
import MapLocationModal from '../../addOrders/MapLocationModal';

interface JobRequestPayload {
    details: string;
    qty: number;
    approxWeight: string;
    locationMapUrl: string;
    locationAddress: string;
}

interface JobRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (jobRequest: JobRequestPayload) => Promise<void> | void;
}

type ApiResponse<T> = {
    object: T;
};

type Market = {
    location?: string;
    address?: string;
    addressLine1?: string;
    city?: string;
    town?: string;
    district?: string;
    state?: string;
    userId?: number;
    ownerId?: number;
    createdById?: number;
    user?: { id?: number };
    owner?: { id?: number };
};

type MarketsObject =
    | {
          items?: Market[];
      }
    | Market[];

type PickupRequestSetPayload = {
    userId: number;
    message: string;
    location: string;
    isAccepted: boolean;
    isCompleted: boolean;
};

const isMarketOwner = (): boolean => getCurrentUserRoleId() === ROLE_IDS.MARKET_OWNER;

const getValidUserId = (): number | null => {
    const userId = getCurrentUserId();
    return Number.isInteger(userId) && (userId ?? 0) > 0 ? userId : null;
};

const getMarketUserId = (market: Market): number | null => {
    const candidates = [market.userId, market.ownerId, market.createdById, market.user?.id, market.owner?.id];
    const found = candidates.find((value) => Number.isInteger(value) && (value ?? 0) > 0);
    return typeof found === 'number' ? found : null;
};

const getMarketAddress = (market: Market): string => {
    const chunks = [market.address, market.addressLine1, market.city, market.town, market.district, market.state]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);
    return chunks.join(', ');
};

function JobRequestModal({ isOpen, onClose, onSubmit }: JobRequestModalProps) {
    const [jobRequest, setJobRequest] = useState<JobRequestPayload>({
        details: '',
        qty: 1,
        approxWeight: '',
        locationMapUrl: '',
        locationAddress: '',
    });
    const [isMapModalLocationOpen, setIsMapModalLocationOpen] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [locationPrefillError, setLocationPrefillError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreated, setIsCreated] = useState(false);

    const resetForm = () => {
        setJobRequest({ details: '', qty: 1, approxWeight: '', locationMapUrl: '', locationAddress: '' });
    };

    const resetAll = () => {
        resetForm();
        setIsMapModalLocationOpen(false);
        setFormError(null);
        setLocationPrefillError(null);
        setIsCreated(false);
        setIsSubmitting(false);
    };

    useEffect(() => {
        const prefillMarketOwnerLocation = async () => {
            if (!isOpen || !isMarketOwner()) return;

            const userId = getValidUserId();
            if (!userId) return;

            setLocationPrefillError(null);

            try {
                const response = await axiosInstance.post<ApiResponse<MarketsObject>>('/markets/get-markets', {
                    pageNumber: 0,
                    countPerPage: 10,
                    userId,
                    isActive: true,
                });
                const objectData = response.data.object;
                const marketItems = Array.isArray(objectData)
                    ? objectData
                    : Array.isArray(objectData?.items)
                    ? objectData.items
                    : [];

                const market = marketItems.find((item) => getMarketUserId(item) === userId) ?? marketItems[0] ?? null;
                const mapUrl = String(market?.location ?? '').trim();
                if (!mapUrl) return;

                setJobRequest((prev) => ({
                    ...prev,
                    locationMapUrl: mapUrl,
                    locationAddress: prev.locationAddress || getMarketAddress(market ?? {}),
                }));
            } catch {
                setLocationPrefillError('Could not auto-load market location. You can still select it manually.');
            }
        };

        void prefillMarketOwnerLocation();
    }, [isOpen]);

    const handleClose = () => {
        resetAll();
        onClose();
    };

    const handleCreateJobRequest = async () => {
        if (!jobRequest.details.trim()) return setFormError('Please fill job details.');
        if (!Number.isFinite(jobRequest.qty) || jobRequest.qty <= 0) return setFormError('Quantity must be greater than 0.');
        if (!jobRequest.approxWeight.trim()) return setFormError('Please enter approximate total weight.');
        if (!jobRequest.locationMapUrl.trim()) return setFormError('Please pick location.');

        const userId = getValidUserId();
        if (!userId) return setFormError('Unable to identify current user. Please sign in again.');

        const payload: JobRequestPayload = {
            details: jobRequest.details.trim(),
            qty: jobRequest.qty,
            approxWeight: jobRequest.approxWeight.trim(),
            locationMapUrl: jobRequest.locationMapUrl.trim(),
            locationAddress: jobRequest.locationAddress.trim(),
        };

        const requestBody: PickupRequestSetPayload = {
            userId,
            message: `${payload.details}\nQty: ${payload.qty}\nApprox Weight: ${payload.approxWeight}`,
            location: payload.locationAddress || payload.locationMapUrl,
            isAccepted: false,
            isCompleted: false,
        };

        setIsSubmitting(true);
        setFormError(null);

        try {
            if (onSubmit) {
                await onSubmit(payload);
            } else {
                await axiosInstance.post('/agent-jobs/pickup-requests/set', requestBody);
            }
            setIsCreated(true);
        } catch {
            setIsCreated(false);
            setFormError('Unable to send job request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="relative bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-6 pb-5 pt-6">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                        title="Close job request modal"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                            <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
                        </span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Client Request</p>
                            <h3 className="text-xl font-black text-white">Pickup Request</h3>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    <ClipboardDocumentListIcon className="h-3.5 w-3.5" /> Job Details
                                </label>
                                <textarea
                                    value={jobRequest.details}
                                    onChange={(event) => {
                                        setJobRequest((prev) => ({ ...prev, details: event.target.value }));
                                        setFormError(null);
                                        setIsCreated(false);
                                    }}
                                    rows={3}
                                    placeholder="Enter request details"
                                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#F59B0F] focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-gray-400">Qty</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={jobRequest.qty}
                                        placeholder="1"
                                        title="Job request quantity"
                                        onChange={(event) => {
                                            setJobRequest((prev) => ({ ...prev, qty: Number(event.target.value) }));
                                            setFormError(null);
                                            setIsCreated(false);
                                        }}
                                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#F59B0F] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                        <ScaleIcon className="h-3.5 w-3.5" /> Apx Total Weight
                                    </label>
                                    <input
                                        type="text"
                                        value={jobRequest.approxWeight}
                                        onChange={(event) => {
                                            setJobRequest((prev) => ({ ...prev, approxWeight: event.target.value }));
                                            setFormError(null);
                                            setIsCreated(false);
                                        }}
                                        placeholder="e.g. 4.8 kg"
                                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#F59B0F] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    <MapPinIcon className="h-3.5 w-3.5 text-amber-500" /> Location
                                </label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        value={jobRequest.locationMapUrl}
                                        readOnly
                                        placeholder="Select location"
                                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 pr-36 text-sm text-gray-600 outline-none transition-all duration-300 placeholder:text-gray-400 hover:border-amber-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsMapModalLocationOpen(true)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                                    >
                                        Select
                                    </button>
                                </div>
                                {jobRequest.locationAddress && <p className="mt-2 text-xs text-gray-500">{jobRequest.locationAddress}</p>}
                            </div>

                            {formError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
                            {locationPrefillError && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">{locationPrefillError}</div>}
                            {isCreated && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">Job request sent successfully.</div>}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateJobRequest}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg"
                    >
                        <CalendarDaysIcon className="h-4 w-4" />
                        {isSubmitting ? 'Sending...' : 'Create Request'}
                    </button>
                </div>

                <MapLocationModal
                    isOpen={isMapModalLocationOpen}
                    initialUrl={jobRequest.locationMapUrl}
                    onClose={() => setIsMapModalLocationOpen(false)}
                    onConfirm={(url, address) => {
                        setJobRequest((prev) => ({ ...prev, locationMapUrl: url, locationAddress: address }));
                        setFormError(null);
                        setIsCreated(false);
                        setIsMapModalLocationOpen(false);
                    }}
                    title="Select Location"
                    subtitle="Click on the map to set the location"
                />
            </div>
        </div>
    );
}

export default JobRequestModal;
