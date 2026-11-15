import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import { mapKey, mapId } from '../../../util/AccessController';

const LIBRARIES: Libraries = ['places', 'marker'];
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 6.9271, lng: 79.8612 };

/** Wrapper for google.maps.marker.AdvancedMarkerElement — no deprecated Marker */
function AdvancedMarker({
    map,
    position,
}: {
    map: google.maps.Map | null;
    position: google.maps.LatLngLiteral;
}) {
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

    useEffect(() => {
        if (!map) return;
        if (!markerRef.current) {
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map, position });
        } else {
            markerRef.current.position = position;
        }
    }, [map, position]);

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

interface Suggestion {
    name: string;
    address: string;
    prediction: google.maps.places.PlacePrediction;
}

interface PoiCard {
    name: string;
    address: string;
    placeId: string;
    pos: google.maps.LatLngLiteral;
    isLoading: boolean;
}

async function fetchPlaceSuggestions(query: string, signal: AbortSignal): Promise<Suggestion[]> {
    const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
    });
    if (signal.aborted) return [];
    return suggestions
        .filter(s => s.placePrediction != null)
        .map(s => {
            const p = s.placePrediction!;
            return {
                name: p.mainText?.text ?? p.text.text,
                address: p.secondaryText?.text ?? '',
                prediction: p,
            };
        });
}

interface MapLocationModalProps {
    isOpen: boolean;
    initialUrl: string;
    onClose: () => void;
    onConfirm: (url: string, address: string) => void;
    title?: string;
    subtitle?: string;
}

function extractLatLng(url: string): google.maps.LatLngLiteral | null {
    if (!url) return null;
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    return null;
}

function MapLocationModal({ isOpen, initialUrl, onClose, onConfirm, title, subtitle }: MapLocationModalProps) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: mapKey,
        libraries: LIBRARIES,
    });

    const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);
    const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [poiCard, setPoiCard] = useState<PoiCard | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const searchAreaRef = useRef<HTMLDivElement | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) return;
        const parsed = extractLatLng(initialUrl);
        if (parsed) {
            setMarkerPos(parsed);
            setMapCenter(parsed);
        } else {
            setMarkerPos(null);
            setMapCenter(DEFAULT_CENTER);
        }
        setError('');
        setSearchQuery('');
        setSuggestions([]);
        setIsDropdownOpen(false);
        setSelectedPlaceId(null);
        setSelectedAddress('');
        setPoiCard(null);
    }, [isOpen, initialUrl]);

    // Close dropdown on outside click
    useEffect(() => {
        if (!isOpen) return;
        const onMouseDown = (e: MouseEvent) => {
            if (searchAreaRef.current && e.target instanceof Node && !searchAreaRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', onMouseDown, true);
        return () => document.removeEventListener('mousedown', onMouseDown, true);
    }, [isOpen]);

    // Pan map when center changes
    useEffect(() => {
        if (mapRef.current) mapRef.current.panTo(mapCenter);
    }, [mapCenter]);

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const iconEvent = e as google.maps.IconMouseEvent;

        if (iconEvent.placeId) {
            iconEvent.stop(); // suppress default Google bubble
            const roughPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            // Show loading card immediately so the user sees feedback
            setPoiCard({ name: '', address: '', placeId: iconEvent.placeId, pos: roughPos, isLoading: true });
            setIsDropdownOpen(false);
            try {
                const place = new google.maps.places.Place({ id: iconEvent.placeId });
                await place.fetchFields({ fields: ['location', 'id', 'displayName', 'formattedAddress'] });
                const pos = place.location
                    ? { lat: place.location.lat(), lng: place.location.lng() }
                    : roughPos;
                setMapCenter(pos);
                setPoiCard({
                    name: place.displayName ?? '',
                    address: place.formattedAddress ?? '',
                    placeId: place.id ?? iconEvent.placeId,
                    pos,
                    isLoading: false,
                });
            } catch {
                setPoiCard(null);
                setMarkerPos(roughPos);
                setSelectedPlaceId(null);
                setSelectedAddress('');
            }
            return;
        }

        // Plain map click — drop pin silently, dismiss any open card
        setPoiCard(null);
        setMarkerPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        setSelectedPlaceId(null);
        setSelectedAddress('');
        setError('');
    }, []);

    const runSearch = useCallback(async (query: string) => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setSuggestions([]);
            setIsSearching(false);
            return;
        }
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setIsSearching(true);
        try {
            const results = await fetchPlaceSuggestions(trimmed, controller.signal);
            if (!controller.signal.aborted) {
                setSuggestions(results);
                setIsDropdownOpen(true);
            }
        } catch {
            if (!controller.signal.aborted) setSuggestions([]);
        } finally {
            if (!controller.signal.aborted) setIsSearching(false);
        }
    }, []);

    // Debounced search as user types
    useEffect(() => {
        if (!isOpen) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (searchQuery.trim().length < 2) {
            setSuggestions([]);
            return;
        }
        debounceRef.current = setTimeout(() => { void runSearch(searchQuery); }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [isOpen, searchQuery, runSearch]);

    const handleSelectSuggestion = useCallback(async (s: Suggestion) => {
        setSuggestions([]);
        setIsDropdownOpen(false);
        setPoiCard(null);
        setSearchQuery(s.name + (s.address ? ', ' + s.address : ''));
        try {
            const place = s.prediction.toPlace();
            await place.fetchFields({ fields: ['location', 'id', 'displayName', 'formattedAddress'] });
            if (place.location) {
                const pos = { lat: place.location.lat(), lng: place.location.lng() };
                setMarkerPos(pos);
                setMapCenter(pos);
            }
            if (place.id) setSelectedPlaceId(place.id);
            if (place.formattedAddress) setSelectedAddress(place.formattedAddress);
            setError('');
        } catch {
            setError('Could not load place details. Please try again.');
        }
    }, []);

    const handleUseMyLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported in this browser.');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setIsLocating(false);
                const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMarkerPos(position);
                setMapCenter(position);
                setSelectedPlaceId(null);
                setSelectedAddress('');
                setPoiCard(null);
                setError('');
            },
            () => {
                setIsLocating(false);
                setError('Unable to access your location. Please pick from the map.');
            }
        );
    }, []);

    const handleConfirm = useCallback(() => {
        if (!markerPos) {
            setError('Please select a location on the map.');
            return;
        }
        const url = selectedPlaceId
            ? `https://www.google.com/maps/place/?q=place_id:${selectedPlaceId}`
            : `https://www.google.com/maps?q=${markerPos.lat},${markerPos.lng}`;
        onConfirm(url, selectedAddress);
    }, [markerPos, selectedPlaceId, selectedAddress, onConfirm]);

    const handleUsePoiLocation = useCallback(() => {
        if (!poiCard) return;
        setMarkerPos(poiCard.pos);
        setMapCenter(poiCard.pos);
        setSelectedPlaceId(poiCard.placeId);
        setSelectedAddress(poiCard.address);
        setPoiCard(null);
        setError('');
    }, [poiCard]);

    const handleClear = useCallback(() => {
        setMarkerPos(null);
        setSelectedPlaceId(null);
        setSelectedAddress('');
        setPoiCard(null);
        setSearchQuery('');
        setSuggestions([]);
        setError('');
    }, []);

    if (!isOpen || typeof document === 'undefined') return null;

    const mapUrl = selectedPlaceId
        ? `https://www.google.com/maps/place/?q=place_id:${selectedPlaceId}`
        : markerPos
            ? `https://www.google.com/maps?q=${markerPos.lat},${markerPos.lng}`
            : '';

    return createPortal(
        /* Backdrop */
        <div className="fixed inset-0 z-100000 bg-black/60 flex items-center justify-center p-4 sm:p-6">
            {/* Modal card */}
            <div className="relative flex flex-col w-full max-w-7xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden">

                {/* ── Header ─────────────────────────────── */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{title ?? 'Select Delivery Location'}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{subtitle ?? 'Search or click on the map, then confirm.'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="w-9 h-9 shrink-0 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all flex items-center justify-center text-base font-semibold"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Map + floating search ───────────────── */}
                <div className="relative flex-1 min-h-0">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={mapCenter}
                            zoom={13}
                            onLoad={handleMapLoad}
                            onClick={handleMapClick}
                            options={{
                                fullscreenControl: false,
                                streetViewControl: false,
                                mapTypeControl: false,
                                mapId: mapId,
                                zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
                            }}
                        >
                            {markerPos && <AdvancedMarker map={mapRef.current} position={markerPos} />}
                        </GoogleMap>
                    ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 gap-3">
                            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Loading map…</p>
                        </div>
                    )}

                    {/* Google Maps-style POI bottom card */}
                    {isLoaded && poiCard && (
                        <>
                            <style>{`@keyframes poi-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
                            <div
                                className="absolute bottom-0 left-0 right-0 z-30"
                                style={{ animation: 'poi-slide-up 0.22s cubic-bezier(0.4,0,0.2,1)' }}
                            >
                                <div className="bg-white rounded-t-3xl shadow-[0_-6px_40px_rgba(0,0,0,0.18)] border-t border-gray-100 overflow-hidden">
                                    {/* drag handle */}
                                    <div className="flex justify-center pt-3 pb-1">
                                        <div className="w-10 h-1 rounded-full bg-gray-300" />
                                    </div>

                                    {poiCard.isLoading ? (
                                        <div className="px-5 pb-5 pt-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-gray-100 rounded-full animate-pulse w-3/4" />
                                                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/2" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-5 pt-2 pb-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                            <path d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" fill="#EF4444" stroke="#EF4444" strokeWidth="1.5" />
                                                            <path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="white" />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-gray-900 text-base leading-tight">{poiCard.name || 'Selected Place'}</h4>
                                                        {poiCard.address && (
                                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{poiCard.address}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setPoiCard(null)}
                                                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors mt-0.5"
                                                    aria-label="Dismiss"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                        <path d="M18 6 6 18M6 6l12 12" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4">
                                                <a
                                                    href={`https://www.google.com/maps/place/?q=place_id:${poiCard.placeId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-gray-200 text-xs font-semibold text-gray-600 hover:border-gray-300 transition-colors shrink-0"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        <path d="M15 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        <path d="M10 14 21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                    </svg>
                                                    Open in Maps
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={handleUsePoiLocation}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 active:scale-95 transition-all"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    Deliver here
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Floating search bar */}
                    {isLoaded && (
                        <div ref={searchAreaRef} className="absolute top-3 left-3 right-3 z-20">
                            <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg px-3 py-2.5 border border-gray-100 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/10 transition-all">
                                <svg className="text-gray-400 shrink-0" width="17" height="17" viewBox="0 0 24 24" fill="none">
                                    <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); setError(''); }}
                                    onFocus={() => { if (suggestions.length > 0) setIsDropdownOpen(true); }}
                                    placeholder="Search for a location…"
                                    className="flex-1 py-0.5 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
                                />
                                {isSearching && (
                                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                                )}
                                {searchQuery && !isSearching && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(''); setSuggestions([]); setIsDropdownOpen(false); }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                                        aria-label="Clear search"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Suggestions dropdown */}
                            {isDropdownOpen && (isSearching || suggestions.length > 0) && (
                                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                    {isSearching && suggestions.length === 0 && (
                                        <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                            Searching…
                                        </div>
                                    )}
                                    {suggestions.length > 0 && (
                                        <div className="max-h-60 overflow-y-auto">
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => { void handleSelectSuggestion(s); }}
                                                    className="w-full text-left px-4 py-3 text-sm hover:bg-amber-50 transition-colors flex items-start gap-3 border-b last:border-b-0 border-gray-50"
                                                >
                                                    <svg className="mt-0.5 text-amber-400 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" stroke="currentColor" strokeWidth="2" />
                                                        <path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="2" />
                                                    </svg>
                                                    <span className="flex flex-col min-w-0">
                                                        <span className="font-medium text-gray-800 leading-snug truncate">{s.name}</span>
                                                        {s.address && <span className="text-xs text-gray-400 leading-snug truncate mt-0.5">{s.address}</span>}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────── */}
                <div className="px-5 py-4 border-t border-gray-100 shrink-0">
                    {error && (
                        <p className="mb-3 text-xs text-red-500 flex items-center gap-1.5">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            {error}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Left side actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={handleUseMyLocation}
                                disabled={isLocating}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLocating ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7Z" stroke="currentColor" strokeWidth="2" />
                                        <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                )}
                                {isLocating ? 'Locating…' : 'My Location'}
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800 active:scale-95 transition-all"
                            >
                                Clear
                            </button>
                            {mapUrl && (
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-amber-300 hover:text-amber-600 transition-all"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M15 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M10 14 21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Open in Maps
                                </a>
                            )}
                        </div>

                        {/* Right side actions */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-300 active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={!markerPos}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Confirm Location
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default MapLocationModal;

