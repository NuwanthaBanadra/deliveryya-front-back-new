import axiosInstance from './AxiosUtil';

const LOCATION_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_EMBED_CENTER = '6.930421619204939,79.88772168273925';
const DEFAULT_EMBED_ZOOM = '11';

export interface GoogleMapsUrlLocation {
    lat?: number;
    lng?: number;
    placeId?: string;
    label?: string;
}

interface CacheEntry<T> {
    expiresAt: number;
    value: T;
}

interface DecodedShortLink {
    expandedUrl: string | null;
    markerLat?: number;
    markerLng?: number;
}

const resolvedLocationCache = new Map<string, CacheEntry<GoogleMapsUrlLocation | null>>();
const resolvedLocationRequests = new Map<string, Promise<GoogleMapsUrlLocation | null>>();
const shortLinkCache = new Map<string, CacheEntry<DecodedShortLink | null>>();

function getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const cached = cache.get(key);
    if (!cached) {
        return undefined;
    }

    if (cached.expiresAt < Date.now()) {
        cache.delete(key);
        return undefined;
    }

    return cached.value;
}

function setCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
    cache.set(key, {
        expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
        value,
    });
}

function parseCoordinatePair(value: string): { lat: number; lng: number } | null {
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

function parseNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function firstNonEmptyString(...values: unknown[]): string | null {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

export function buildMarkerLocationFromUrl(url: string): GoogleMapsUrlLocation | null {
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

export function isGoogleMapsShortUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        const host = parsedUrl.hostname.toLowerCase();
        const path = parsedUrl.pathname.toLowerCase();
        return host === 'maps.app.goo.gl' || (host === 'goo.gl' && path.startsWith('/maps'));
    } catch {
        return false;
    }
}

function decodeShortLinkResponse(data: unknown): DecodedShortLink | null {
    if (typeof data === 'string' && data.trim()) {
        return { expandedUrl: data.trim() };
    }

    const root = asRecord(data);
    if (!root) {
        return null;
    }

    const nestedData = asRecord(root.data);
    const object = asRecord(root.object);
    const nestedObject = asRecord(nestedData?.object);

    const expandedUrl = firstNonEmptyString(
        object?.expandedUrl,
        object?.decodedUrl,
        object?.longUrl,
        object?.url,
        root.expandedUrl,
        root.decodedUrl,
        root.longUrl,
        root.url,
        nestedObject?.expandedUrl,
        nestedObject?.decodedUrl,
        nestedObject?.longUrl,
        nestedObject?.url,
        nestedData?.expandedUrl,
        nestedData?.decodedUrl,
        nestedData?.longUrl,
        nestedData?.url,
    );

    const markerLat = parseNumber(object?.markerLat ?? root.markerLat ?? nestedObject?.markerLat ?? nestedData?.markerLat);
    const markerLng = parseNumber(object?.markerLng ?? root.markerLng ?? nestedObject?.markerLng ?? nestedData?.markerLng);

    if (!expandedUrl && (markerLat == null || markerLng == null)) {
        return null;
    }

    return {
        expandedUrl,
        markerLat,
        markerLng,
    };
}

async function decodeGoogleMapsShortUrl(url: string, signal: AbortSignal): Promise<DecodedShortLink | null> {
    const cached = getCachedValue(shortLinkCache, url);
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

        const decoded = decodeShortLinkResponse(response.data);
        setCachedValue(shortLinkCache, url, decoded);
        return decoded;
    } catch {
        setCachedValue(shortLinkCache, url, null);
        return null;
    }
}

export async function resolveGoogleMapsLocationFromUrl(url: string, signal: AbortSignal): Promise<GoogleMapsUrlLocation | null> {
    const cached = getCachedValue(resolvedLocationCache, url);
    if (cached !== undefined || signal.aborted) {
        return cached ?? null;
    }

    const pending = resolvedLocationRequests.get(url);
    if (pending) {
        const value = await pending;
        return signal.aborted ? null : value;
    }

    const request = (async () => {
        const directMatch = buildMarkerLocationFromUrl(url);
        if (directMatch) {
            setCachedValue(resolvedLocationCache, url, directMatch);
            return directMatch;
        }

        if (signal.aborted || !isGoogleMapsShortUrl(url)) {
            setCachedValue(resolvedLocationCache, url, null);
            return null;
        }

        const decoded = await decodeGoogleMapsShortUrl(url, signal);
        if (!decoded || signal.aborted) {
            setCachedValue(resolvedLocationCache, url, null);
            return null;
        }

        if (decoded.markerLat != null && decoded.markerLng != null) {
            const resolved = {
                lat: decoded.markerLat,
                lng: decoded.markerLng,
                label: decoded.expandedUrl ?? url,
            } satisfies GoogleMapsUrlLocation;
            setCachedValue(resolvedLocationCache, url, resolved);
            return resolved;
        }

        const resolved = decoded.expandedUrl ? buildMarkerLocationFromUrl(decoded.expandedUrl) : null;
        setCachedValue(resolvedLocationCache, url, resolved);
        return resolved;
    })();

    resolvedLocationRequests.set(url, request);

    try {
        const value = await request;
        return signal.aborted ? null : value;
    } finally {
        resolvedLocationRequests.delete(url);
    }
}

function toEmbedLocationValue(location: GoogleMapsUrlLocation): string | null {
    if (location.lat != null && location.lng != null) {
        return `${location.lat},${location.lng}`;
    }

    if (location.placeId) {
        return `place_id:${location.placeId}`;
    }

    return null;
}

export function buildDefaultGoogleMapsEmbedLink(mapKey: string): string {
    const params = new URLSearchParams({
        key: mapKey,
        center: DEFAULT_EMBED_CENTER,
        zoom: DEFAULT_EMBED_ZOOM,
    });

    return `https://www.google.com/maps/embed/v1/view?${params.toString()}`;
}

export async function buildGoogleMapsEmbedLinkFromUrls(
    markerUrls: string[],
    mapKey: string,
    signal: AbortSignal,
): Promise<string> {
    const defaultLink = buildDefaultGoogleMapsEmbedLink(mapKey);
    const normalizedUrls = markerUrls.map((url) => url.trim()).filter(Boolean);

    if (!mapKey || normalizedUrls.length === 0 || signal.aborted) {
        return defaultLink;
    }

    const resolvedLocations = (await Promise.all(
        normalizedUrls.map((url) => resolveGoogleMapsLocationFromUrl(url, signal)),
    )).filter((location): location is GoogleMapsUrlLocation => location != null);

    if (signal.aborted) {
        return defaultLink;
    }

    const embedPoints = resolvedLocations
        .map((location) => toEmbedLocationValue(location))
        .filter((location): location is string => Boolean(location));

    if (embedPoints.length === 0) {
        return defaultLink;
    }

    if (embedPoints.length === 1) {
        const params = new URLSearchParams({
            key: mapKey,
            q: embedPoints[0],
        });
        return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
    }

    const params = new URLSearchParams({
        key: mapKey,
        origin: embedPoints[0],
        destination: embedPoints[embedPoints.length - 1],
        mode: 'driving',
    });

    if (embedPoints.length > 2) {
        params.set('waypoints', embedPoints.slice(1, -1).join('|'));
    }

    return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}

export async function buildGoogleMapsDirectionsLinkFromUrls(
    markerUrls: string[],
    signal: AbortSignal,
): Promise<string> {
    const normalizedUrls = markerUrls.map((url) => url.trim()).filter(Boolean);

    if (normalizedUrls.length === 0 || signal.aborted) {
        return 'https://www.google.com/maps';
    }

    const resolvedLocations = (await Promise.all(
        normalizedUrls.map((url) => resolveGoogleMapsLocationFromUrl(url, signal)),
    )).filter((location): location is GoogleMapsUrlLocation => location != null);

    if (signal.aborted || resolvedLocations.length === 0) {
        return 'https://www.google.com/maps';
    }

    const directionsPoints = resolvedLocations
        .map((location) => toEmbedLocationValue(location))
        .filter((location): location is string => Boolean(location));

    if (directionsPoints.length === 0) {
        return 'https://www.google.com/maps';
    }

    if (directionsPoints.length === 1) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsPoints[0])}`;
    }

    const origin = encodeURIComponent(directionsPoints[0]);
    const destination = encodeURIComponent(directionsPoints[directionsPoints.length - 1]);
    const waypointsRaw = directionsPoints.slice(1, -1);
    const waypoints = waypointsRaw.length > 0 ? `&waypoints=${waypointsRaw.map((location) => encodeURIComponent(location)).join('%7C')}` : '';

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
}