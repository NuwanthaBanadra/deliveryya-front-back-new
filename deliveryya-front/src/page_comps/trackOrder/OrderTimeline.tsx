import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { ClockIcon, TruckIcon, UserCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { FaCheckCircle } from 'react-icons/fa';
import { CiStreamOn } from "react-icons/ci";
import type { Libraries } from '@react-google-maps/api';
import { baseURL } from '../../util/AxiosUtil';
import { mapId, mapKey } from '../../util/AccessController';
import { resolveGoogleMapsLocationFromUrl } from '../../util/GoogleMapsUrlUtil';
import { getDeliveryStatusVisual } from '../../util/DeliveryStatusCatalog';
import deliveryAgentIcon from '../../assets/images/icon_1.png';

const LIBRARIES: Libraries = ['marker', 'places'];
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 6.9271, lng: 79.8612 };

function AdvancedMarker({
    map,
    position,
    variant,
}: {
    map: google.maps.Map | null;
    position: google.maps.LatLngLiteral;
    variant: 'delivery' | 'live';
}) {
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const accent = variant === 'delivery' ? '#F59B0F' : '#10B981';
    const label = variant === 'delivery' ? 'D' : 'L';

    useEffect(() => {
        if (!map) return;

        if (!contentRef.current) {
            const element = document.createElement('div');
            element.style.width = '36px';
            element.style.height = '36px';
            element.style.borderRadius = '9999px';
            element.style.border = '3px solid white';
            element.style.display = 'flex';
            element.style.alignItems = 'center';
            element.style.justifyContent = 'center';
            element.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.25)';
            element.style.color = 'white';
            element.style.fontWeight = '800';
            element.style.fontSize = '13px';
            element.style.background = accent;
            element.textContent = label;
            contentRef.current = element;
        }

        if (variant === 'live') {
            if (!imageRef.current) {
                const image = document.createElement('img');
                image.src = deliveryAgentIcon;
                image.alt = 'Delivery agent';
                image.style.width = '30px';
                image.style.height = '30px';
                image.style.objectFit = 'contain';
                image.style.display = 'block';
                image.style.borderRadius = '9999px';
                image.style.backgroundColor = '#F59E0B';
                image.style.border = '3px solid #ffffff';
                image.style.padding = '2px';
                image.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.28)';
                image.style.filter = 'none';
                image.style.opacity = '1';
                imageRef.current = image;
            }

            contentRef.current.style.width = '46px';
            contentRef.current.style.height = '46px';
            contentRef.current.style.display = 'flex';
            contentRef.current.style.alignItems = 'center';
            contentRef.current.style.justifyContent = 'center';
            contentRef.current.style.borderRadius = '9999px';
            contentRef.current.style.background = 'transparent';
            contentRef.current.style.border = 'none';
            contentRef.current.style.boxShadow = '0 8px 16px rgba(15, 23, 42, 0.22)';
            contentRef.current.textContent = '';
            contentRef.current.replaceChildren(imageRef.current);
        } else {
            contentRef.current.style.width = '36px';
            contentRef.current.style.height = '36px';
            contentRef.current.style.borderRadius = '9999px';
            contentRef.current.style.border = '3px solid white';
            contentRef.current.style.display = 'flex';
            contentRef.current.style.alignItems = 'center';
            contentRef.current.style.justifyContent = 'center';
            contentRef.current.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.25), 0 0 0 7px rgba(245, 155, 15, 0.18)';
            contentRef.current.style.color = 'white';
            contentRef.current.style.fontWeight = '800';
            contentRef.current.style.fontSize = '13px';
            contentRef.current.style.background = accent;
            contentRef.current.textContent = label;
        }

        if (!markerRef.current) {
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({
                map,
                position,
                content: contentRef.current,
            });
        } else {
            markerRef.current.map = map;
            markerRef.current.position = position;
            markerRef.current.content = contentRef.current;
        }
    }, [map, position, accent, label, variant]);

    useEffect(() => {
        return () => {
            if (markerRef.current) {
                markerRef.current.map = null;
                markerRef.current = null;
            }
        };
    }, []);

    return null;
}


export interface DeliveryTimelineItem {
    id: number;
    status: string;
    statusId?: number;
    assignedAt: string;
    name: string;
    employeeId?: number;
    contact?: string;
    mobile?: string;
    whatsapp?: string;
    note?: string | null;
    location: string;
}

export interface SenderDetails {
    type: 'third_party' | 'market' | 'user' | 'unknown';
    name: string;
    contact?: string;
    location?: string;
    note?: string;
    address?: string;
    phone?: string;
    firstPhone?: string;
    secondPhone?: string;
    whatsapp?: string;
    email?: string;
}

export interface OrderDetails {
    customerName: string;
    contact: string;
    email: string;
    address: string;
    deliveryMapLocation?: string;
}

interface OrderTimelineProps {
    timeline: DeliveryTimelineItem[];
    senderDetails: SenderDetails | null;
    orderDetails: OrderDetails | null;
}

export default function OrderTimeline({ timeline, senderDetails, orderDetails }: OrderTimelineProps) {
    const senderTypeLabel = senderDetails?.type ? senderDetails.type.replace('_', ' ') : 'unknown';
    const senderAddress = senderDetails?.address || senderDetails?.location || 'N/A';
    const senderFirstPhone = senderDetails?.firstPhone || '';
    const senderSecondPhone = senderDetails?.secondPhone || '';
    const senderWhatsApp = senderDetails?.whatsapp || '';
    const senderCombinedContact = senderDetails?.contact || senderDetails?.phone || 'N/A';
    const currentHandlingAgent = [...timeline].find((entry) => entry.name && entry.name !== 'Unassigned') || null;
    const currentAgentMobile = currentHandlingAgent?.mobile || currentHandlingAgent?.contact || 'N/A';
    const currentAgentWhatsApp = currentHandlingAgent?.whatsapp || 'N/A';
    const currentAgentId = currentHandlingAgent?.employeeId || null;
    const currentDeliveryStatus = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    const isTerminalStatus = currentDeliveryStatus?.statusId ? [10, 9, 7].includes(currentDeliveryStatus.statusId) : false;

    const [isLivePanelOpen, setIsLivePanelOpen] = useState(false);
    const [isLiveLoading, setIsLiveLoading] = useState(false);
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [liveError, setLiveError] = useState<string | null>(null);
    const [liveMessages, setLiveMessages] = useState<Array<{ latitude: string; longitude: string; receivedAt: string }>>([]);
    const [deliveryLocation, setDeliveryLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [deliveryLocationLoading, setDeliveryLocationLoading] = useState(false);
    const [focusTarget, setFocusTarget] = useState<'delivery' | 'deliverer'>('delivery');
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const liveSectionRef = useRef<HTMLElement | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const { isLoaded: isMapLoaded } = useJsApiLoader({
        googleMapsApiKey: mapKey,
        libraries: LIBRARIES,
    });

    const latestLiveLocation = liveMessages.length > 0 ? liveMessages[liveMessages.length - 1] : null;
    const assignedDelivererPosition = useMemo(() => {
        const raw = currentHandlingAgent?.location?.trim();
        if (!raw || raw === 'N/A') return null;

        const match = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
        if (!match) return null;

        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

        return { lat, lng };
    }, [currentHandlingAgent?.location]);

    const sseLivePosition = useMemo(() => {
        if (!latestLiveLocation) return null;

        const latitude = Number.parseFloat(latestLiveLocation.latitude);
        const longitude = Number.parseFloat(latestLiveLocation.longitude);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

        return { lat: latitude, lng: longitude };
    }, [latestLiveLocation]);

    const livePosition = sseLivePosition || assignedDelivererPosition;

    const activeMapCenter = focusTarget === 'deliverer'
        ? (livePosition || deliveryLocation || DEFAULT_CENTER)
        : (deliveryLocation || livePosition || DEFAULT_CENTER);
    const activeMapZoom = livePosition || deliveryLocation ? 15 : 11;

    const normalizedLiveEndpoint = useMemo(() => {
        if (!currentAgentId) return null;
        return `${baseURL}/api/v1/live-locations/subscribe?employeeId=${currentAgentId}`;
    }, [currentAgentId]);

    useEffect(() => {
        if (!isLivePanelOpen) {
            setDeliveryLocation(null);
            setDeliveryLocationLoading(false);
            return;
        }

        const mapLink = orderDetails?.deliveryMapLocation?.trim();
        if (!mapLink) {
            setDeliveryLocation(null);
            setDeliveryLocationLoading(false);
            return;
        }

        let isMounted = true;
        const abortController = new AbortController();

        setDeliveryLocationLoading(true);

        void resolveGoogleMapsLocationFromUrl(mapLink, abortController.signal)
            .then(async (resolved) => {
                if (!isMounted) return;
                if (resolved?.lat != null && resolved?.lng != null) {
                    setDeliveryLocation({ lat: resolved.lat, lng: resolved.lng });
                    return;
                }

                if (resolved?.placeId && typeof google !== 'undefined' && google.maps?.places) {
                    try {
                        const place = new google.maps.places.Place({ id: resolved.placeId });
                        await place.fetchFields({ fields: ['location'] });
                        if (!isMounted) return;

                        if (place.location) {
                            setDeliveryLocation({ lat: place.location.lat(), lng: place.location.lng() });
                            return;
                        }
                    } catch {
                        // Keep fallback null when place lookup fails.
                    }
                }

                if (isMounted) {
                    setDeliveryLocation(null);
                }
            })
            .finally(() => {
                if (isMounted) setDeliveryLocationLoading(false);
            });

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [isLivePanelOpen, orderDetails?.deliveryMapLocation]);

    useEffect(() => {
        if (mapInstance) {
            mapInstance.panTo(activeMapCenter);
        }
    }, [activeMapCenter, mapInstance]);

    useEffect(() => {
        if (!isLivePanelOpen) return;
        if (!liveSectionRef.current) return;

        liveSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [isLivePanelOpen]);

    useEffect(() => {
        if (!isLivePanelOpen) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            setIsLiveLoading(false);
            setIsLiveConnected(false);
            return;
        }

        if (!normalizedLiveEndpoint) {
            setIsLiveLoading(false);
            setIsLiveConnected(false);
            setLiveError('No handling agent is available for live tracking.');
            return;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setIsLiveLoading(true);
        setIsLiveConnected(false);
        setLiveError(null);
        setLiveMessages([]);
        setFocusTarget('delivery');

        const eventSource = new EventSource(normalizedLiveEndpoint);
        eventSourceRef.current = eventSource;

        const normalizeLocationData = (raw: unknown): { latitude: string; longitude: string } | null => {
            try {
                let source = typeof raw === 'string' ? raw.trim() : String(raw).trim();
                source = source.replace(/^\s*data\s*:\s*/i, '').trim();

                const parts = source.split(',').map((part) => part.trim());
                if (parts.length !== 2) return null;

                const [latitude, longitude] = parts;
                if (Number.isNaN(Number.parseFloat(latitude)) || Number.isNaN(Number.parseFloat(longitude))) {
                    return null;
                }

                return { latitude, longitude };
            } catch {
                return null;
            }
        };

        const handleLocationEvent = (event: MessageEvent) => {
            const parsedData = normalizeLocationData(event.data);
            if (!parsedData) return;

            setIsLiveLoading(false);
            setIsLiveConnected(true);
            setLiveMessages((previous) => [...previous, { ...parsedData, receivedAt: new Date().toLocaleTimeString() }]);
        };

        const handleOpen = () => {
            setIsLiveLoading(false);
            setIsLiveConnected(true);
        };

        const handleError = () => {
            setIsLiveLoading(false);
            setLiveError('Live location stream is unavailable right now.');
            setIsLiveConnected(false);
            eventSource.close();
            if (eventSourceRef.current === eventSource) {
                eventSourceRef.current = null;
            }
        };

        eventSource.addEventListener('open', handleOpen as EventListener);
        eventSource.addEventListener('location', handleLocationEvent as EventListener);
        eventSource.addEventListener('error', handleError);

        return () => {
            eventSource.removeEventListener('open', handleOpen as EventListener);
            eventSource.removeEventListener('location', handleLocationEvent as EventListener);
            eventSource.removeEventListener('error', handleError);
            eventSource.close();
            if (eventSourceRef.current === eventSource) {
                eventSourceRef.current = null;
            }
            setIsLiveConnected(false);
            setIsLiveLoading(false);
        };
    }, [isLivePanelOpen, normalizedLiveEndpoint]);

    return (
        <section className="bg-linear-to-b from-white via-gray-50 to-white py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
                        Delivery{' '}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                            Details
                        </span>
                    </h2>
                    <div className="w-16 h-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] mx-auto rounded-full"></div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    {/* Order Profile */}
                    {orderDetails && (
                        <section className="group overflow-hidden rounded-3xl border border-orange-200 bg-white/70 p-5 shadow-sm transition hover:shadow-md hover:bg-white ring-1 ring-orange-100/70">
                            <div className="flex items-center gap-3 border-b border-orange-100 pb-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-orange-100 to-orange-50 text-[#9A3412] shadow-inner ring-1 ring-orange-200/50 group-hover:scale-105 transition-transform">
                                    <UserCircleIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-black tracking-wide text-slate-900">Customer</p>
                                    <p className="text-xs font-medium text-slate-500">Order Delivery Profile</p>
                                </div>
                            </div>
                            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Name</p>
                                    <p className="font-bold text-slate-900 truncate">{orderDetails.customerName}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Contact</p>
                                    <p className="font-bold text-slate-700 truncate">{orderDetails.contact}</p>
                                </div>
                                {orderDetails.email && orderDetails.email !== 'N/A' && (
                                    <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Email</p>
                                        <p className="font-bold text-slate-700 truncate">{orderDetails.email}</p>
                                    </div>
                                )}
                                <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Address</p>
                                    <p className="text-sm font-medium text-slate-700">{orderDetails.address}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Sender Details */}
                    {senderDetails && (
                        <section className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
                            <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-slate-100/80 -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110" />

                            <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-inner ring-1 ring-slate-200/70 transition-transform group-hover:scale-105">
                                        {senderDetails.type === 'market' ? (
                                            <ChatBubbleLeftRightIcon className="h-6 w-6" />
                                        ) : (
                                            <UserCircleIcon className="h-6 w-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black tracking-wide text-slate-900">Sender Details</p>
                                        <p className="text-xs font-medium text-slate-500">Updated origin profile</p>
                                    </div>
                                </div>

                                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                    {senderTypeLabel}
                                </span>
                            </div>

                            <div className="relative z-10 mt-4 space-y-2 text-sm text-slate-700">
                                <p className="truncate font-bold text-slate-900" title={senderDetails.name}>{senderDetails.name || 'N/A'}</p>
                                <p className="text-xs leading-relaxed text-slate-600">{senderAddress}</p>

                                {(senderFirstPhone || senderSecondPhone) ? (
                                    <p className="truncate font-semibold text-slate-700">
                                        Contact: {[senderFirstPhone, senderSecondPhone].filter(Boolean).join(' | ')}
                                    </p>
                                ) : null}

                                {senderWhatsApp ? (
                                    <p className="truncate font-semibold text-emerald-700">WhatsApp: {senderWhatsApp}</p>
                                ) : null}

                                {!senderFirstPhone && !senderSecondPhone && !senderWhatsApp ? (
                                    <p className="truncate font-semibold text-slate-700">{senderCombinedContact}</p>
                                ) : null}

                                {senderDetails.email && senderDetails.email !== 'N/A' && (
                                    <p className="truncate text-slate-600">{senderDetails.email}</p>
                                )}

                                {senderDetails.note && senderDetails.note !== 'N/A' && (
                                    <p className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] text-orange-700">
                                        {senderDetails.note}
                                    </p>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                {currentHandlingAgent && (
                    <section className="overflow-hidden rounded-3xl border border-blue-200 bg-white p-5 shadow-sm ring-1 ring-blue-100/70">
                        <div className="flex items-center justify-between gap-4 border-b border-blue-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-blue-50 text-blue-700 shadow-inner ring-1 ring-blue-200/60">
                                    <UserCircleIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-black tracking-wide text-slate-900">Current Handling Agent</p>
                                    <p className="text-xs font-medium text-slate-500">Latest assigned delivery partner</p>
                                </div>
                            </div>
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                Live Assignment
                            </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-slate-700">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Agent Name</p>
                                <p className="truncate font-bold text-slate-900">{currentHandlingAgent.name}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Mobile Number</p>
                                <p className="truncate font-bold text-slate-700">{currentAgentMobile}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">WhatsApp Number</p>
                                <p className="truncate font-bold text-emerald-700">{currentAgentWhatsApp}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Timeline Section */}
                <section className="overflow-hidden rounded-3xl border border-[#F59B0F]/30 bg-white p-6 shadow-sm ring-1 ring-[#F59B0F]/10">
                    <div className="flex items-center gap-3 border-b border-orange-100 pb-4 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-orange-100 to-orange-50 text-[#F59B0F] shadow-inner ring-1 ring-orange-200/50 hover:scale-105 transition-transform">
                            <TruckIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-base font-black tracking-wide text-slate-900">Delivery Timeline Progression</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">Status-ordered partner assignments from placement to fulfillment.</p>
                        </div>
                        <div className="ml-auto">
                            <button
                                type="button"
                                disabled={isTerminalStatus}
                                onClick={() => {
                                    setIsLivePanelOpen((value) => !value);
                                    setIsLiveLoading(true);
                                }}
                                className="rounded-xl bg-amber-600 px-4 py-2 flex items-center gap-2 text-amber-50 font-medium shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-400"
                                title={isTerminalStatus ? 'Live tracking unavailable for completed orders' : 'View live location'}
                            >
                                <CiStreamOn /> {isLivePanelOpen ? 'Hide Live' : 'Live'}
                            </button>
                        </div>
                    </div>

                    <div className="px-1 sm:px-4 py-2">
                        {timeline.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 rounded-2xl bg-orange-50 border border-orange-100 text-center">
                                <TruckIcon className="h-10 w-10 text-orange-200 mb-3" />
                                <p className="font-bold text-orange-800 tracking-wide text-sm">No Timeline Available</p>
                                <p className="text-xs text-orange-600 mt-1 max-w-xs px-4 text-center">There are no documented delivery steps or handler assignments for this order yet.</p>
                            </div>
                        ) : (
                            <div className="relative border-l-[3px] border-orange-100 ml-4 lg:ml-6 mt-6 pb-2 space-y-10">
                                {timeline.map((entry, index) => {
                                    const statusVisual = getDeliveryStatusVisual(entry.status);
                                    const StatusIcon = statusVisual.icon;
                                    const isLast = index === timeline.length - 1;
                                    const isDelivered = entry.status.toLowerCase().includes('delivered');

                                    return (
                                        <div key={entry.id || index} className="relative pl-7 sm:pl-10 lg:pl-12 group">
                                            {/* Line Node UI */}
                                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white shadow-md ring-4 group-hover:scale-110 transition-all duration-300 ${statusVisual.nodeClassName} ${isLast ? 'animate-pulse' : ''}`}>
                                                    <StatusIcon className="w-4 h-4 text-white" />
                                                </div>
                                            </div>

                                            {/* Step Detail Card */}
                                            <div className={`rounded-2xl border bg-slate-50/50 p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md ${isLast && !isDelivered ? 'border-[#F59B0F]/40 hover:border-[#F59B0F]' : 'border-slate-100 hover:border-orange-200'}`}>
                                                <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                                                            {/* <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">STEP {index + 1}</span> */}
                                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] shadow-inner inline-flex items-center gap-1.5 transition-transform duration-300 group-hover:scale-105 ${statusVisual.badgeClassName}`}>
                                                                <StatusIcon className="w-3 h-3" />
                                                                {entry.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-base font-black text-slate-900 tracking-wide drop-shadow-xs">{entry.name}</p>
                                                        {entry.contact && entry.contact !== 'N/A' && (
                                                            <p className="mt-1 text-xs font-semibold text-slate-600">Mobile: {entry.contact}</p>
                                                        )}
                                                        {entry.note != null && (
                                                            <p className="mt-2 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] font-medium text-orange-700">
                                                                {entry.note}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="mt-2 2xl:mt-0 2xl:text-right">
                                                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50/80 px-3 py-1.5 border border-orange-100/50">
                                                            <ClockIcon className="h-3.5 w-3.5 text-orange-500" />
                                                            <p className="text-[11px] font-black text-orange-700 tracking-wide">{entry.assignedAt}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {isLivePanelOpen && (
                    <section ref={liveSectionRef} className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm ring-1 ring-emerald-100/70">
                        <div className="flex items-center justify-between gap-4 border-b border-emerald-100 px-5 py-4">
                            <div>
                                <p className="text-sm font-black tracking-wide text-slate-900">Live Location</p>
                                <p className="text-xs font-medium text-slate-500">
                                    {currentAgentId ? `Tracking employee #${currentAgentId}` : 'No active handling agent found.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${isLiveConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {isLiveConnected ? 'Connected' : 'Idle'}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={!deliveryLocation}
                                        onClick={() => setFocusTarget('delivery')}
                                        className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${focusTarget === 'delivery' ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-700 border border-orange-200'} disabled:cursor-not-allowed disabled:opacity-50`}
                                    >
                                        Delivery Location
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!livePosition}
                                        onClick={() => setFocusTarget('deliverer')}
                                        className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${focusTarget === 'deliverer' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} disabled:cursor-not-allowed disabled:opacity-50`}
                                    >
                                        Deliverer Location
                                    </button>
                                </div>
                            </div>
                        </div>

                        {liveError && (
                            <div className="mx-5 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {liveError}
                            </div>
                        )}

                        <div className="px-5 pb-5">
                            <div className="relative h-105 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                                {isMapLoaded ? (
                                    <GoogleMap
                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                        center={activeMapCenter}
                                        zoom={activeMapZoom}
                                        onLoad={(map) => {
                                            setMapInstance(map);
                                        }}
                                        onUnmount={() => setMapInstance(null)}
                                        options={{
                                            fullscreenControl: false,
                                            streetViewControl: false,
                                            mapTypeControl: false,
                                            mapId,
                                            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
                                        }}
                                    >
                                        {deliveryLocation ? <AdvancedMarker map={mapInstance} position={deliveryLocation} variant="delivery" /> : null}
                                        {livePosition ? <AdvancedMarker map={mapInstance} position={livePosition} variant="live" /> : null}
                                    </GoogleMap>
                                ) : (
                                    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 gap-3">
                                        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm text-gray-500">Loading map...</p>
                                    </div>
                                )}

                                {(isLiveLoading || deliveryLocationLoading) && isMapLoaded && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                                        <div className="text-center px-4">
                                            <div className="mx-auto mb-2 w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm font-semibold text-gray-700">
                                                {isLiveLoading ? 'Connecting live tracking...' : 'Resolving delivery location...'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </section>
    );
}
