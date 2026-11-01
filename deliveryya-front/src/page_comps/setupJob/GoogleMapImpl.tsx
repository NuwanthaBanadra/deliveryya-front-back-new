import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Polyline, useJsApiLoader } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import { mapId, mapKey } from '../../util/AccessController';
import axiosInstance from '../../util/AxiosUtil';

const LIBRARIES: Libraries = ['places', 'marker'];
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 6.9271, lng: 79.8612 };
const LOCATION_CACHE_TTL_MS = 10 * 60 * 1000;

interface MarkerLocation {
    lat?: number;
    lng?: number;
    placeId?: string;
    label?: string;
}

interface PlaceDetailsCacheEntry {
    expiresAt: number;
    location: google.maps.LatLngLiteral;
    name?: string;
    address?: string;
}

interface MarkerLocationCacheEntry {
    expiresAt: number;
    value: MarkerLocation | null;
}

interface UrlExpansionCacheEntry {
    expiresAt: number;
    value: string | null;
}

const markerLocationCache = new Map<string, MarkerLocationCacheEntry>();
const markerLocationRequests = new Map<string, Promise<MarkerLocation | null>>();
const shortUrlExpansionCache = new Map<string, UrlExpansionCacheEntry>();
const placeDetailsCache = new Map<string, PlaceDetailsCacheEntry>();
const placeDetailsRequests = new Map<string, Promise<PlaceDetailsCacheEntry | null>>();

// ── AdvancedMarker ────────────────────────────────────────────────────────────
function AdvancedMarker({ map, position, }: { map: google.maps.Map | null; position: google.maps.LatLngLiteral; }) {
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

    useEffect(() => {
        if (!map) return;
        if (!markerRef.current) {
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map, position });
        } else {
            markerRef.current.position = position;
        }
    }, [map, position]);

    useEffect(() => () => {
        if (markerRef.current) {
            markerRef.current.map = null;
            markerRef.current = null;
        }
    }, []);

    return null;
}

function MultiMarkers({ map, locations }: { map: google.maps.Map | null; locations: MarkerLocation[]; }) {
    useEffect(() => {
        if (!map) return;
        if (locations.length === 0) return;

        const markers: google.maps.marker.AdvancedMarkerElement[] = [];
        const infoWindows: google.maps.InfoWindow[] = [];
        const bounds = new google.maps.LatLngBounds();
        let isCancelled = false;

        const attachInfoWindow = (
            marker: google.maps.marker.AdvancedMarkerElement,
            name?: string,
            address?: string
        ) => {
            if (!name && !address) {
                return;
            }

            const infoWindow = new google.maps.InfoWindow({
                content: `<div><strong>${name ?? 'Selected location'}</strong>${address ? `<br/>${address}` : ''}</div>`,
            });

            marker.addListener('click', () => {
                infoWindow.open({ map, anchor: marker });
            });

            infoWindows.push(infoWindow);
        };

        const extendBounds = (position: google.maps.LatLng | google.maps.LatLngLiteral) => {
            bounds.extend(position);
            map.fitBounds(bounds, 80);
        };

        const getCachedPlaceDetails = (placeId: string): PlaceDetailsCacheEntry | null => {
            const cached = placeDetailsCache.get(placeId);
            if (!cached) {
                return null;
            }

            if (cached.expiresAt < Date.now()) {
                placeDetailsCache.delete(placeId);
                return null;
            }

            return cached;
        };

        const resolvePlaceDetails = (placeId: string): Promise<PlaceDetailsCacheEntry | null> => {
            const cached = getCachedPlaceDetails(placeId);
            if (cached) {
                return Promise.resolve(cached);
            }

            const pending = placeDetailsRequests.get(placeId);
            if (pending) {
                return pending;
            }

            const request = (async (): Promise<PlaceDetailsCacheEntry | null> => {
                try {
                    const place = new google.maps.places.Place({ id: placeId });
                    await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });

                    if (!place.location) {
                        return null;
                    }

                    const resolved: PlaceDetailsCacheEntry = {
                        expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
                        location: {
                            lat: place.location.lat(),
                            lng: place.location.lng(),
                        },
                        name: place.displayName ?? undefined,
                        address: place.formattedAddress ?? undefined,
                    };

                    placeDetailsCache.set(placeId, resolved);
                    return resolved;
                } catch {
                    return null;
                } finally {
                    placeDetailsRequests.delete(placeId);
                }
            })();

            placeDetailsRequests.set(placeId, request);
            return request;
        };

        const renderPlaceMarker = (details: PlaceDetailsCacheEntry, fallbackLabel?: string) => {
            const marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: details.location,
            });

            markers.push(marker);
            attachInfoWindow(marker, details.name ?? fallbackLabel, details.address ?? fallbackLabel);
            extendBounds(details.location);
        };

        locations.forEach(loc => {
            if (loc.placeId) {
                const cached = getCachedPlaceDetails(loc.placeId);
                if (cached) {
                    renderPlaceMarker(cached, loc.label);
                    return;
                }

                void resolvePlaceDetails(loc.placeId).then((details) => {
                    if (isCancelled || !details) {
                        return;
                    }

                    renderPlaceMarker(details, loc.label);
                });
            } else if (loc.lat != null && loc.lng != null) {
                const marker = new google.maps.marker.AdvancedMarkerElement({
                    map,
                    position: { lat: loc.lat, lng: loc.lng },
                });

                markers.push(marker);
                attachInfoWindow(marker, loc.label, loc.label);
                extendBounds({ lat: loc.lat, lng: loc.lng });
            }
        });

        return () => {
            isCancelled = true;
            markers.forEach((marker) => {
                marker.map = null;
            });
            infoWindows.forEach((infoWindow) => {
                infoWindow.close();
            });
        };
    }, [map, locations]);

    return null;
}


// ── Types ─────────────────────────────────────────────────────────────────────
interface Suggestion {
    name: string;
    address: string;
    prediction: google.maps.places.PlacePrediction;
}

export interface SelectedLocation {
    lat: number;
    lng: number;
    placeId?: string;
    address?: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface GoogleMapImplProps {
    /** Called whenever the user places/moves a pin. */
    onLocationChange?: (location: SelectedLocation) => void;
    markerUrls?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseCoordinatePair(value: string): google.maps.LatLngLiteral | null {
    const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);

    if (!match) {
        return null;
    }

    const lat = Number(match[1]);
    const lng = Number(match[2]);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return null;
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return null;
    }

    return { lat, lng };
}

function buildMarkerLocationFromUrl(url: string): MarkerLocation | null {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
        return null;
    }

    const placeIdMatch = trimmedUrl.match(/place_id:([A-Za-z0-9_-]+)/i);
    if (placeIdMatch) {
        return { placeId: placeIdMatch[1], label: trimmedUrl };
    }

    const direct3dMatch = trimmedUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (direct3dMatch) {
        return {
            lat: Number(direct3dMatch[1]),
            lng: Number(direct3dMatch[2]),
            label: trimmedUrl,
        };
    }

    const atCoordinatesMatch = trimmedUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atCoordinatesMatch) {
        return {
            lat: Number(atCoordinatesMatch[1]),
            lng: Number(atCoordinatesMatch[2]),
            label: trimmedUrl,
        };
    }

    try {
        const parsedUrl = new URL(trimmedUrl);
        const placeId = parsedUrl.searchParams.get('query_place_id')
            ?? parsedUrl.searchParams.get('destination_place_id')
            ?? parsedUrl.searchParams.get('origin_place_id');

        if (placeId) {
            return { placeId, label: trimmedUrl };
        }

        const coordinateCandidates = [
            parsedUrl.searchParams.get('q'),
            parsedUrl.searchParams.get('query'),
            parsedUrl.searchParams.get('ll'),
            parsedUrl.searchParams.get('center'),
            parsedUrl.searchParams.get('destination'),
            parsedUrl.searchParams.get('origin'),
        ];

        for (const candidate of coordinateCandidates) {
            if (!candidate) {
                continue;
            }

            const coords = parseCoordinatePair(candidate);
            if (coords) {
                return { ...coords, label: trimmedUrl };
            }

            const nestedPlaceIdMatch = candidate.match(/place_id:([A-Za-z0-9_-]+)/i);
            if (nestedPlaceIdMatch) {
                return { placeId: nestedPlaceIdMatch[1], label: trimmedUrl };
            }
        }
    } catch {
        const coords = parseCoordinatePair(trimmedUrl);
        if (coords) {
            return { ...coords, label: trimmedUrl };
        }
    }

    return null;
}

function isGoogleMapsShortUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        const host = parsedUrl.hostname.toLowerCase();
        const path = parsedUrl.pathname.toLowerCase();
        return host === 'maps.app.goo.gl' || (host === 'goo.gl' && path.startsWith('/maps'));
    } catch {
        return false;
    }
}

function getCachedMarkerLocation(url: string): MarkerLocation | null | undefined {
    const cached = markerLocationCache.get(url);
    if (!cached) {
        return undefined;
    }

    if (cached.expiresAt < Date.now()) {
        markerLocationCache.delete(url);
        return undefined;
    }

    return cached.value;
}

function setCachedMarkerLocation(url: string, value: MarkerLocation | null): void {
    markerLocationCache.set(url, {
        expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
        value,
    });
}

function getCachedExpandedUrl(url: string): string | null | undefined {
    const cached = shortUrlExpansionCache.get(url);
    if (!cached) {
        return undefined;
    }

    if (cached.expiresAt < Date.now()) {
        shortUrlExpansionCache.delete(url);
        return undefined;
    }

    return cached.value;
}

function setCachedExpandedUrl(url: string, value: string | null): void {
    shortUrlExpansionCache.set(url, {
        expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
        value,
    });
}

async function expandGoogleMapsShortUrl(url: string, signal: AbortSignal): Promise<string | null> {
    const cached = getCachedExpandedUrl(url);
    if (cached !== undefined || signal.aborted) {
        return cached ?? null;
    }

    try {
        const response = await axiosInstance.get('/access/get-location-google-map-short-link', {
            params: { shortLink: url },
            signal,
        });

        if (signal.aborted) {
            return null;
        }

        const responseData = response.data as unknown;
        const value =
            typeof responseData === 'string'
                ? responseData
                : typeof responseData === 'object' && responseData !== null
                    ? ((responseData as { object?: { expandedUrl?: unknown } }).object?.expandedUrl
                        ?? (responseData as { object?: { decodedUrl?: unknown } }).object?.decodedUrl
                        ?? (responseData as { object?: { longUrl?: unknown } }).object?.longUrl
                        ?? (responseData as { object?: { url?: unknown } }).object?.url
                        ?? (responseData as { expandedUrl?: unknown }).expandedUrl
                        ?? (responseData as { decodedUrl?: unknown }).decodedUrl
                        ?? (responseData as { longUrl?: unknown }).longUrl
                        ?? (responseData as { url?: unknown }).url
                        ?? (responseData as { data?: { object?: { expandedUrl?: unknown } } }).data?.object?.expandedUrl
                        ?? (responseData as { data?: { object?: { decodedUrl?: unknown } } }).data?.object?.decodedUrl
                        ?? (responseData as { data?: { expandedUrl?: unknown } }).data?.expandedUrl
                        ?? (responseData as { data?: { decodedUrl?: unknown } }).data?.decodedUrl
                        ?? null)
                    : null;

        const normalizedValue = typeof value === 'string' && value.trim() ? value.trim() : null;
        setCachedExpandedUrl(url, normalizedValue);
        return normalizedValue;
    } catch {
        setCachedExpandedUrl(url, null);
        return null;
    }
}

async function resolveMarkerLocationFromUrl(url: string, signal: AbortSignal): Promise<MarkerLocation | null> {
    const cached = getCachedMarkerLocation(url);
    if (cached !== undefined || signal.aborted) {
        return cached ?? null;
    }

    const pending = markerLocationRequests.get(url);
    if (pending) {
        const value = await pending;
        return signal.aborted ? null : value;
    }

    const request = (async () => {
        const directMatch = buildMarkerLocationFromUrl(url);
        if (directMatch) {
            setCachedMarkerLocation(url, directMatch);
            return directMatch;
        }

        if (signal.aborted || !isGoogleMapsShortUrl(url)) {
            setCachedMarkerLocation(url, null);
            return null;
        }

        const expandedUrl = await expandGoogleMapsShortUrl(url, signal);
        if (!expandedUrl || signal.aborted) {
            setCachedMarkerLocation(url, null);
            return null;
        }

        const resolved = buildMarkerLocationFromUrl(expandedUrl);
        setCachedMarkerLocation(url, resolved);
        return resolved;
    })();

    markerLocationRequests.set(url, request);

    try {
        const value = await request;
        return signal.aborted ? null : value;
    } finally {
        markerLocationRequests.delete(url);
    }
}

async function fetchSuggestions(query: string, signal: AbortSignal): Promise<Suggestion[]> {
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

// ── Component ─────────────────────────────────────────────────────────────────
function GoogleMapImpl({ onLocationChange, markerUrls = [] }: GoogleMapImplProps) {
    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: mapKey, libraries: LIBRARIES });

    const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);
    const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [markerLocations, setMarkerLocations] = useState<MarkerLocation[]>([]);

    const mapRef = useRef<google.maps.Map | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchAreaRef = useRef<HTMLDivElement | null>(null);

    // Parse marker URLs, including best-effort support for Google short links.
    useEffect(() => {
        let isCancelled = false;
        const controller = new AbortController();

        const resolveMarkerLocations = async () => {
            if (markerUrls.length === 0) {
                setMarkerLocations([]);
                return;
            }

            const resolved = await Promise.all(
                markerUrls.map(url => resolveMarkerLocationFromUrl(url, controller.signal))
            );

            if (!isCancelled) {
                setMarkerLocations(resolved.filter((location): location is MarkerLocation => location != null));
            }
        };

        void resolveMarkerLocations();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [markerUrls]);

    // Close dropdown when clicking outside the search box
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (searchAreaRef.current && e.target instanceof Node && !searchAreaRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', onMouseDown, true);
        return () => document.removeEventListener('mousedown', onMouseDown, true);
    }, []);

    // Pan map when center changes
    useEffect(() => {
        if (mapRef.current) mapRef.current.panTo(mapCenter);
    }, [mapCenter]);

    // Debounced autocomplete search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (searchQuery.trim().length < 2) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(async () => {
            if (abortRef.current) abortRef.current.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setIsSearching(true);
            try {
                const results = await fetchSuggestions(searchQuery.trim(), controller.signal);
                if (!controller.signal.aborted) { setSuggestions(results); setIsDropdownOpen(true); }
            } catch {
                if (!controller.signal.aborted) setSuggestions([]);
            } finally {
                if (!controller.signal.aborted) setIsSearching(false);
            }
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery]);

    const handleMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setMarkerPos(pos);
        setIsDropdownOpen(false);
        onLocationChange?.({ ...pos });
    }, [onLocationChange]);

    const handleSelectSuggestion = useCallback(async (s: Suggestion) => {
        setSuggestions([]);
        setIsDropdownOpen(false);
        setSearchQuery(s.name + (s.address ? ', ' + s.address : ''));
        try {
            const place = s.prediction.toPlace();
            await place.fetchFields({ fields: ['location', 'id', 'displayName', 'formattedAddress'] });
            if (place.location) {
                const pos = { lat: place.location.lat(), lng: place.location.lng() };
                setMarkerPos(pos);
                setMapCenter(pos);
                onLocationChange?.({ ...pos, placeId: place.id ?? undefined, address: place.formattedAddress ?? undefined });
            }
        } catch { /* ignore */ }
    }, [onLocationChange]);
    
    return (
        <div className="relative w-full h-full" tabIndex={0}>
            {/* Map */}
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

                    {markerLocations.length > 0 && <MultiMarkers map={mapRef.current} locations={markerLocations} />}
                </GoogleMap>
            ) : (
                <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 gap-3">
                    <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading map...</p>
                </div>
            )}

            {/* Floating search bar */}
            {isLoaded && (<></>
                // <div ref={searchAreaRef} className="absolute top-3 left-3 right-3 z-20">
                //     <div className="flex items-center gap-2 sm:w-100 w-full bg-white rounded-2xl shadow-lg px-3 py-2.5 border border-gray-100 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/10 transition-all">
                //         <svg className="text-gray-400 shrink-0" width="17" height="17" viewBox="0 0 24 24" fill="none">
                //             <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
                //             <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                //         </svg>
                //         <input
                //             type="text"
                //             value={searchQuery}
                //             onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                //             onFocus={() => { if (suggestions.length > 0) setIsDropdownOpen(true); }}
                //             placeholder="Search for a location..."
                //             className="flex-1 py-0.5 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
                //         />
                //         {isSearching && (
                //             <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                //         )}
                //         {searchQuery && !isSearching && (
                //             <button
                //                 type="button"
                //                 onClick={() => { setSearchQuery(''); setSuggestions([]); setIsDropdownOpen(false); }}
                //                 className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                //                 aria-label="Clear search"
                //             >
                //                 <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                //                     <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                //                 </svg>
                //             </button>
                //         )}
                //     </div>

                //     {/* Suggestions dropdown */}
                //     {isDropdownOpen && (isSearching || suggestions.length > 0) && (
                //         <div className="absolute left-0 right-0 sm:w-100 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                //             {isSearching && suggestions.length === 0 && (
                //                 <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                //                     <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                //                     Searching...
                //                 </div>
                //             )}
                //             {suggestions.length > 0 && (
                //                 <div className="max-h-60 overflow-y-auto">
                //                     {suggestions.map((s, i) => (
                //                         <button
                //                             key={i}
                //                             type="button"
                //                             onMouseDown={e => e.preventDefault()}
                //                             onClick={() => { void handleSelectSuggestion(s); }}
                //                             className="w-full text-left px-4 py-3 text-sm hover:bg-amber-50 transition-colors flex items-start gap-3 border-b last:border-b-0 border-gray-50"
                //                         >
                //                             <svg className="mt-0.5 text-amber-400 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none">
                //                                 <path d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" stroke="currentColor" strokeWidth="2" />
                //                                 <path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="2" />
                //                             </svg>
                //                             <span className="flex flex-col min-w-0">
                //                                 <span className="font-medium text-gray-800 leading-snug truncate">{s.name}</span>
                //                                 {s.address && <span className="text-xs text-gray-400 leading-snug truncate mt-0.5">{s.address}</span>}
                //                             </span>
                //                         </button>
                //                     ))}
                //                 </div>
                //             )}
                //         </div>
                //     )}
                // </div>
            )}

        </div>
    );
}

export default GoogleMapImpl;
