import {
    ArrowTopRightOnSquareIcon,
    BuildingStorefrontIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ClipboardDocumentListIcon,
    EnvelopeIcon,
    ExclamationCircleIcon,
    HomeIcon,
    InformationCircleIcon,
    MapPinIcon,
    PhotoIcon,
    PhoneIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axiosInstance, { baseURL } from '../../util/AxiosUtil';
import JwtUtil from '../../util/JwtUtil';

type ApiResponse<T> = {
    status: number;
    message: string;
    desc: string;
    exData: unknown;
    object: T;
};

type Market = {
    id: number;
    name?: string;
    marketName?: string;
    description?: string;
    desc?: string;
    marketDescription?: string;
    code?: string;
    marketCode?: string;
    userId?: number;
    ownerId?: number;
    createdById?: number;
    logoUrl?: string;
    logoImageUrl?: string;
    logo?: string;
    logoImage?: string;
    profilePicUrl?: string;
    profileImageUrl?: string;
    imageUrl?: string;
    image?: string;
    coverUrl?: string;
    coverImgUrl?: string;
    coverImageUrl?: string;
    coverPhotoUrl?: string;
    coverImage?: string;
    cover?: string;
    bannerUrl?: string;
    email?: string;
    emailAddress?: string;
    contactEmail?: string;
    mobile?: string;
    phoneNumber?: string;
    phone?: string;
    contactNumber?: string;
    address?: string;
    location?: string;
    addressLine1?: string;
    city?: string;
    town?: string;
    district?: string;
    state?: string;
    first_num?: string;
    second_num?: string;
    whats_app?: string;
    infoMessage?: string;
    marketCategory?: {
        id?: number;
        name?: string;
    } | null;
    category?: {
        id?: number;
        name?: string;
    } | null;
    users?: {
        id?: number;
        firstName?: string;
        lastName?: string;
        name?: string;
        email?: string;
    } | null;
    owner?: {
        id?: number;
        firstName?: string;
        lastName?: string;
        name?: string;
        email?: string;
    } | null;
    isActive?: boolean;
    active?: boolean;
    status?: boolean | number | string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
};

type MarketsObject =
    | {
        pageNumber?: number;
        countPerPage?: number;
        totalCount?: number;
        totalPages?: number;
        items?: Market[];
    }
    | Market[];

type MarketEditForm = {
    name: string;
    location: string;
    address: string;
    desc: string;
    first_num: string;
    second_num: string;
    whats_app: string;
};

const DEFAULT_MARKET_COVER_IMAGE = '/icon_1.png';
const DEFAULT_MARKET_LOGO_IMAGE = '/icon_1.png';

const getLoggedInUserId = (): number | null => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;

    const decoded = JwtUtil.decodeToken(token);
    if (!decoded) return null;

    const jwtUserId = Number(decoded.userId);
    return Number.isFinite(jwtUserId) && jwtUserId > 0 ? jwtUserId : null;
};

const getValueByPath = (source: Record<string, unknown>, path: string): unknown => {
    return path.split('.').reduce<unknown>((current, key) => {
        if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, source);
};

const getFirstNonEmpty = (source: Market, paths: string[], fallback = 'N/A'): string => {
    for (const path of paths) {
        const value = getValueByPath(source, path);
        if (value !== null && value !== undefined && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return fallback;
};

const getFirstNonEmptyOrNull = (source: Market, paths: string[]): string | null => {
    for (const path of paths) {
        const value = getValueByPath(source, path);
        if (value !== null && value !== undefined && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return null;
};

const getMediaValue = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const cleaned = value.trim();
        return cleaned ? cleaned : null;
    }

    if (value && typeof value === 'object') {
        const mediaObject = value as Record<string, unknown>;
        const candidateKeys = ['url', 'imageUrl', 'fileUrl', 'path', 'secure_url', 'coverUrl', 'coverImgUrl', 'coverImageUrl', 'logoUrl'];

        for (const key of candidateKeys) {
            const candidate = mediaObject[key];
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        }
    }

    return null;
};

const normalizeAssetUrl = (url: string): string => {
    const cleanedUrl = url.replace(/\\/g, '/').trim();

    if (
        cleanedUrl.startsWith('http://')
        || cleanedUrl.startsWith('https://')
        || cleanedUrl.startsWith('data:')
        || cleanedUrl.startsWith('blob:')
    ) {
        return cleanedUrl;
    }

    const normalizedPath = cleanedUrl.replace(/^\/+/, '');

    if (normalizedPath.startsWith('uploads/')) {
        return `${baseURL}/${normalizedPath}`;
    }

    return `${baseURL}/uploads/${normalizedPath}`;
};

const getImageUrl = (source: Market, paths: string[]): string | null => {
    for (const path of paths) {
        const raw = getValueByPath(source, path);
        const mediaValue = getMediaValue(raw);

        if (mediaValue) {
            return normalizeAssetUrl(mediaValue);
        }
    }

    return null;
};

const getNumberFromPaths = (source: Market, paths: string[]): number | null => {
    for (const path of paths) {
        const raw = getValueByPath(source, path);
        const numeric = Number(raw);
        if (Number.isFinite(numeric) && numeric > 0) {
            return numeric;
        }
    }
    return null;
};

const getActiveStatus = (source: Market): boolean => {
    const raw = getValueByPath(source, 'isActive')
        ?? getValueByPath(source, 'active')
        ?? getValueByPath(source, 'status');

    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw === 1;
    if (typeof raw === 'string') {
        const normalized = raw.toLowerCase().trim();
        return normalized === '1' || normalized === 'true' || normalized === 'active' || normalized === 'enabled';
    }
    return false;
};

const renderMissingValue = (value: string | null | undefined): string => {
    const normalized = String(value ?? '').trim();
    return normalized || '-';
};

const formatDateTime = (value: string | null | undefined): string => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
};

const getStatusClasses = (isActive: boolean): string => {
    if (isActive) {
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    }
    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
};

const getCategoryName = (market: Market): string => {
    return getFirstNonEmpty(market, ['marketCategory.name', 'category.name', 'categoryName', 'marketCategoryName'], 'Uncategorized');
};

const getOwnerName = (market: Market): string => {
    const firstName = getFirstNonEmpty(market, ['users.firstName', 'owner.firstName'], '');
    const lastName = getFirstNonEmpty(market, ['users.lastName', 'owner.lastName'], '');
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    if (fullName) return fullName;
    return getFirstNonEmpty(market, ['users.name', 'owner.name', 'ownerName', 'createdByName'], 'Unknown owner');
};

const getMapHref = (location: string, address: string): { href: string; label: string } | null => {
    const trimmedLocation = location.trim();
    if (trimmedLocation) {
        return {
            href: /^https?:\/\//i.test(trimmedLocation)
                ? trimmedLocation
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedLocation)}`,
            label: 'Open map',
        };
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) return null;

    return {
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedAddress)}`,
        label: 'Search address on map',
    };
};

const normalizePhone = (value: string): string => value.replace(/\D/g, '');

const isValidPhone = (value: string): boolean => /^(?:94|0)?\d{9}$/.test(value);

const getApiErrorMessage = (error: any, fallback: string): string => {
    const data = error?.response?.data;
    const exData = data?.exData;

    if (exData && typeof exData === 'object' && !Array.isArray(exData)) {
        const firstDetail = Object.values(exData).find((value) => String(value || '').trim());
        if (firstDetail) return String(firstDetail);
    }

    if (typeof exData === 'string' && exData.trim()) return exData.trim();
    if (typeof data?.desc === 'string' && data.desc.trim()) return data.desc.trim();
    if (typeof data?.message === 'string' && data.message.trim() && data.message !== 'Error') return data.message.trim();
    if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
    return fallback;
};

const getAssetPayloadValue = (source: Market, paths: string[]): string => {
    for (const path of paths) {
        const raw = getValueByPath(source, path);
        const mediaValue = getMediaValue(raw);
        if (mediaValue) return mediaValue;
    }
    return '';
};

function MyMarket() {
    const navigate = useNavigate();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [isLoadingMarket, setIsLoadingMarket] = useState(false);
    const [marketError, setMarketError] = useState<string | null>(null);
    const [marketEditError, setMarketEditError] = useState('');
    const [market, setMarket] = useState<Market | null>(null);
    const [isCoverImageFailed, setIsCoverImageFailed] = useState(false);
    const [isLogoImageFailed, setIsLogoImageFailed] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [marketEditForm, setMarketEditForm] = useState<MarketEditForm>({
        name: '',
        location: '',
        address: '',
        desc: '',
        first_num: '',
        second_num: '',
        whats_app: '',
    });
    const [editLogoPreview, setEditLogoPreview] = useState('');
    const [editCoverPreview, setEditCoverPreview] = useState('');
    const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
    const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
    const [isSavingMarketEdit, setIsSavingMarketEdit] = useState(false);
    const [isUploadingEditLogo, setIsUploadingEditLogo] = useState(false);
    const [isUploadingEditCover, setIsUploadingEditCover] = useState(false);

    const userId = useMemo(() => getLoggedInUserId(), []);

    useEffect(() => {
        const fetchMarket = async () => {
            if (!userId) {
                setMarketError('Unable to identify logged in user. Please sign in again.');
                setMarket(null);
                return;
            }

            setIsLoadingMarket(true);
            setMarketError(null);

            const requestBody = {
                pageNumber: 0,
                countPerPage: 10,
                userId,
            };

            try {
                const response = await axiosInstance.post<ApiResponse<MarketsObject>>('/markets/get-markets', requestBody);
                const objectData = response.data.object;
                const marketItems = Array.isArray(objectData)
                    ? objectData
                    : Array.isArray(objectData?.items)
                        ? objectData.items
                        : objectData && typeof objectData === 'object' && 'id' in objectData
                            ? [objectData as Market]
                            : [];

                const relevantMarket = marketItems.find((item) => {
                    const marketUserId = getNumberFromPaths(item, ['userId', 'ownerId', 'createdById', 'user.id', 'owner.id']);
                    return marketUserId === userId;
                }) || marketItems[0] || null;
                setMarket(relevantMarket);

                if (!relevantMarket) {
                    setMarketError('No market found for your account.');
                }
            } catch (error) {
                console.error('Failed to load market details:', error);
                setMarketError('Failed to load market details. Please try again.');
                setMarket(null);
            } finally {
                setIsLoadingMarket(false);
            }
        };

        fetchMarket();
    }, [userId]);

    useEffect(() => {
        setIsCoverImageFailed(false);
        setIsLogoImageFailed(false);
    }, [market?.id]);

    const coverImageUrl = useMemo(
        () => (market ? getImageUrl(market, ['coverImgUrl', 'coverImageUrl', 'coverUrl', 'coverPhotoUrl', 'coverImage', 'cover', 'bannerUrl']) : null),
        [market],
    );

    const logoImageUrl = useMemo(
        () => (market ? getImageUrl(market, ['logoUrl', 'logoImageUrl', 'logo', 'logoImage', 'profileImageUrl', 'profilePicUrl', 'imageUrl', 'image']) : null),
        [market],
    );

    const resolvedCoverImageUrl = !coverImageUrl || isCoverImageFailed ? DEFAULT_MARKET_COVER_IMAGE : coverImageUrl;
    const resolvedLogoImageUrl = !logoImageUrl || isLogoImageFailed ? DEFAULT_MARKET_LOGO_IMAGE : logoImageUrl;
    const isMarketActive = market ? getActiveStatus(market) : false;
    const infoMessage = market ? getFirstNonEmptyOrNull(market, ['infoMessage']) : null;
    const canManageMarket = Boolean(market) && isMarketActive;
    const marketName = market ? getFirstNonEmpty(market, ['name', 'marketName'], 'Untitled Market') : '';
    const marketDescription = market ? getFirstNonEmpty(market, ['desc', 'description', 'marketDescription'], '') : '';
    const marketAddress = market ? getFirstNonEmpty(market, ['address', 'addressLine1'], '') : '';
    const marketLocation = market ? getFirstNonEmpty(market, ['location'], '') : '';
    const marketMapLink = market ? getMapHref(marketLocation, marketAddress) : null;
    const ownerEmail = market ? getFirstNonEmpty(market, ['users.email', 'owner.email', 'email', 'emailAddress', 'contactEmail'], '') : '';
    const primaryPhone = market ? getFirstNonEmpty(market, ['first_num', 'mobile', 'phoneNumber', 'phone', 'contactNumber'], '') : '';
    const secondaryPhone = market ? getFirstNonEmpty(market, ['second_num', 'secondaryPhone', 'secondaryPhoneNumber'], '') : '';
    const whatsApp = market ? getFirstNonEmpty(market, ['whats_app', 'whatsapp', 'whatsApp'], '') : '';

    const uploadMarketImages = useCallback(async (files: File[], type: 'logo' | 'cover'): Promise<string> => {
        if (type === 'logo') {
            setIsUploadingEditLogo(true);
        } else {
            setIsUploadingEditCover(true);
        }

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));

            const response = await axiosInstance.post('/storage/upload?path=markets', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data && (response.data.message === 'Success' || response.data.message === 'success')) {
                const uploadedPaths: string[] = Array.isArray(response.data.object) ? response.data.object : [];
                if (!uploadedPaths.length) {
                    throw new Error(`No ${type} image path returned from upload service`);
                }
                return uploadedPaths[0];
            }

            throw new Error(response.data?.desc || `Failed to upload ${type} image`);
        } finally {
            if (type === 'logo') {
                setIsUploadingEditLogo(false);
            } else {
                setIsUploadingEditCover(false);
            }
        }
    }, []);

    const closeEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setMarketEditError('');
        setEditLogoPreview('');
        setEditCoverPreview('');
        setEditLogoFile(null);
        setEditCoverFile(null);
        if (logoInputRef.current) logoInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
    }, []);

    const openEditModal = useCallback(() => {
        if (!market) return;

        setMarketEditForm({
            name: marketName,
            location: marketLocation,
            address: marketAddress,
            desc: marketDescription,
            first_num: primaryPhone,
            second_num: secondaryPhone,
            whats_app: whatsApp,
        });
        setEditLogoPreview(logoImageUrl ?? '');
        setEditCoverPreview(coverImageUrl ?? '');
        setEditLogoFile(null);
        setEditCoverFile(null);
        setMarketEditError('');
        setIsEditModalOpen(true);
    }, [coverImageUrl, logoImageUrl, market, marketAddress, marketDescription, marketLocation, marketName, primaryPhone, secondaryPhone, whatsApp]);

    const handleEditLogoSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMarketEditError('Please select an image file for the logo.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMarketEditError('Logo size must be less than 5MB.');
            return;
        }

        setEditLogoFile(file);
        setMarketEditError('');

        const reader = new FileReader();
        reader.onloadend = () => {
            setEditLogoPreview(String(reader.result || ''));
        };
        reader.readAsDataURL(file);
    }, []);

    const handleEditCoverSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMarketEditError('Please select an image file for the cover.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setMarketEditError('Cover image size must be less than 10MB.');
            return;
        }

        setEditCoverFile(file);
        setMarketEditError('');

        const reader = new FileReader();
        reader.onloadend = () => {
            setEditCoverPreview(String(reader.result || ''));
        };
        reader.readAsDataURL(file);
    }, []);

    const updateMarketDetails = useCallback(async () => {
        if (!market) return;

        const nextName = marketEditForm.name.trim();
        const nextLocation = marketEditForm.location.trim();
        const nextAddress = marketEditForm.address.trim();
        const nextDesc = marketEditForm.desc.trim();
        const nextFirstNum = marketEditForm.first_num.trim();

        if (!nextName) {
            setMarketEditError('Market name is required.');
            return;
        }

        if (!nextDesc) {
            setMarketEditError('Market description is required.');
            return;
        }

        if (!nextAddress) {
            setMarketEditError('Market address is required.');
            return;
        }

        if (!nextFirstNum) {
            setMarketEditError('Primary contact number is required.');
            return;
        }

        const normalizedFirstNum = normalizePhone(nextFirstNum);
        if (!isValidPhone(normalizedFirstNum)) {
            setMarketEditError('Primary contact number is invalid.');
            return;
        }

        const normalizedSecondNum = marketEditForm.second_num.trim() ? normalizePhone(marketEditForm.second_num.trim()) : '';
        if (normalizedSecondNum && !isValidPhone(normalizedSecondNum)) {
            setMarketEditError('Secondary contact number is invalid.');
            return;
        }

        const normalizedWhatsApp = marketEditForm.whats_app.trim() ? normalizePhone(marketEditForm.whats_app.trim()) : '';
        if (normalizedWhatsApp && !isValidPhone(normalizedWhatsApp)) {
            setMarketEditError('WhatsApp contact number is invalid.');
            return;
        }

        setIsSavingMarketEdit(true);
        setMarketEditError('');

        try {
            const currentLogoUrl = getAssetPayloadValue(market, ['logoUrl', 'logoImageUrl', 'logo', 'logoImage', 'profileImageUrl', 'profilePicUrl', 'imageUrl', 'image']);
            const currentCoverImgUrl = getAssetPayloadValue(market, ['coverImgUrl', 'coverImageUrl', 'coverUrl', 'coverPhotoUrl', 'coverImage', 'cover', 'bannerUrl']);
            const [logoUrl, coverImgUrl] = await Promise.all([
                editLogoFile ? uploadMarketImages([editLogoFile], 'logo') : Promise.resolve(currentLogoUrl),
                editCoverFile ? uploadMarketImages([editCoverFile], 'cover') : Promise.resolve(currentCoverImgUrl),
            ]);

            const response = await axiosInstance.post('/markets/update-market', {
                id: market.id,
                name: nextName,
                location: nextLocation,
                address: nextAddress,
                logoUrl,
                coverImgUrl,
                desc: nextDesc,
                first_num: normalizedFirstNum,
                second_num: normalizedSecondNum,
                whats_app: normalizedWhatsApp,
                users: market.users?.id ? { id: market.users.id } : userId ? { id: userId } : null,
                infoMessage: market.infoMessage ?? '',
                isActive: isMarketActive,
                marketCategory: market.marketCategory?.id ? {
                    id: market.marketCategory.id,
                    name: market.marketCategory.name || '',
                } : null,
            });

            const responseMarket = response.data?.object && typeof response.data.object === 'object' && 'id' in response.data.object
                ? response.data.object as Market
                : null;
            const nextMarket: Market = responseMarket ?? {
                ...market,
                name: nextName,
                location: nextLocation,
                address: nextAddress,
                logoUrl,
                coverImgUrl,
                desc: nextDesc,
                first_num: normalizedFirstNum,
                second_num: normalizedSecondNum,
                whats_app: normalizedWhatsApp,
            };

            setMarket(nextMarket);
            setIsCoverImageFailed(false);
            setIsLogoImageFailed(false);
            closeEditModal();
            Swal.fire({
                icon: 'success',
                title: 'Market updated',
                text: 'Market details have been saved successfully.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2500,
            });
        } catch (requestError: any) {
            setMarketEditError(getApiErrorMessage(requestError, 'Failed to update market details.'));
        } finally {
            setIsSavingMarketEdit(false);
        }
    }, [closeEditModal, editCoverFile, editLogoFile, isMarketActive, market, marketEditForm, uploadMarketImages, userId]);

    return (
        <div className="min-h-screen pb-8">

            <section className="mb-8 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">

                {isLoadingMarket && (
                    <div className="animate-pulse p-5 sm:p-6">
                        <div className="h-44 rounded-2xl bg-gray-100" />
                        <div className="mt-6 flex items-center gap-4">
                            <div className="h-24 w-24 rounded-full bg-gray-100" />
                            <div className="space-y-2 flex-1">
                                <div className="h-5 w-44 rounded bg-gray-100" />
                                <div className="h-4 w-32 rounded bg-gray-100" />
                            </div>
                        </div>
                    </div>
                )}

                {!isLoadingMarket && marketError && (
                    <div className="p-5 sm:p-6">
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                            <ExclamationCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{marketError}</p>
                        </div>
                    </div>
                )}

                {!isLoadingMarket && !marketError && market && (
                    <>
                        <div className="relative h-52 bg-gray-100 sm:h-64">
                            {resolvedCoverImageUrl ? (
                                <img
                                    src={resolvedCoverImageUrl}
                                    alt={`${marketName} cover`}
                                    className="h-full w-full object-cover"
                                    onError={() => setIsCoverImageFailed(true)}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-orange-50 to-amber-100 text-sm font-semibold text-orange-700">
                                    No cover image
                                </div>
                            )}

                            <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/20 to-transparent" />

                            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="flex items-end gap-4">
                                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-orange-50 shadow-lg sm:h-24 sm:w-24">
                                            {resolvedLogoImageUrl ? (
                                                <img
                                                    src={resolvedLogoImageUrl}
                                                    alt={`${marketName} logo`}
                                                    className="h-full w-full object-cover"
                                                    onError={() => setIsLogoImageFailed(true)}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <BuildingStorefrontIcon className="h-10 w-10 text-[#F59B0F]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 pb-1 text-white">
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">My Market</p>
                                            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{marketName}</h2>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(isMarketActive)}`}>
                                                    {isMarketActive ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                                                    {getCategoryName(market)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {canManageMarket && (
                                        <button
                                            type="button"
                                            onClick={() => navigate('categories')}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-[#AC6C2A] shadow-sm transition hover:bg-orange-50"
                                        >
                                            Manage Categories, Brands & Products
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="space-y-5">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                                            <EnvelopeIcon className="h-4 w-4" />
                                            Owner
                                        </div>
                                        <p className="mt-2 text-sm font-black text-gray-900">{getOwnerName(market)}</p>
                                        <p className="mt-1 break-all text-xs font-semibold text-gray-600">{renderMissingValue(ownerEmail)}</p>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                                            <ClipboardDocumentListIcon className="h-4 w-4" />
                                            Created
                                        </div>
                                        <p className="mt-2 text-sm font-black text-gray-900">{formatDateTime(market.createdAt)}</p>
                                    </div>

                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                                            <CheckCircleIcon className="h-4 w-4" />
                                            Status
                                        </div>
                                        <p className="mt-2 text-sm font-black text-gray-900">{isMarketActive ? 'Active Market' : 'Inactive Market'}</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                                            <HomeIcon className="h-4 w-4" />
                                            Physical Address
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-gray-800">
                                            {renderMissingValue(marketAddress)}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                                            <MapPinIcon className="h-4 w-4" />
                                            Google Map Location
                                        </div>
                                        <p className="mt-2 break-all text-sm font-semibold leading-6 text-gray-800">
                                            {renderMissingValue(marketLocation)}
                                        </p>
                                        {marketMapLink && (
                                            <a
                                                href={marketMapLink.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                                            >
                                                <MapPinIcon className="h-4 w-4" />
                                                {marketMapLink.label}
                                                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-3">
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                                            <PhoneIcon className="h-4 w-4" />
                                            Primary Phone
                                        </div>
                                        <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(primaryPhone)}</p>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                                            <PhoneIcon className="h-4 w-4" />
                                            Secondary Phone
                                        </div>
                                        <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(secondaryPhone)}</p>
                                    </div>

                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                            WhatsApp
                                        </div>
                                        <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(whatsApp)}</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                                        <InformationCircleIcon className="h-4 w-4" />
                                        Market Description
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                        {renderMissingValue(marketDescription)}
                                    </p>
                                </div>
                            </div>

                            <aside className="space-y-4">
                                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Info Message</p>
                                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-orange-950">
                                        {renderMissingValue(infoMessage)}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Market Details</p>
                                    <div className="mt-3 space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Category</p>
                                            <p className="mt-1 font-black text-gray-900">{getCategoryName(market)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Last Updated</p>
                                            <p className="mt-1 font-black text-gray-900">{formatDateTime(market.updatedAt)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Actions</p>
                                    <button
                                        type="button"
                                        onClick={openEditModal}
                                        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border-2 border-[#F59B0F] bg-white px-3 text-sm font-bold text-[#AC6C2A] transition hover:bg-orange-50"
                                    >
                                        Update Market Details
                                    </button>
                                </div>
                            </aside>
                        </div>
                    </>
                )}
            </section>

            {!isLoadingMarket && !marketError && market && !isMarketActive && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                    <p className="text-sm font-semibold">This market is disabled.</p>
                    <p className="mt-1 text-sm">Manage Products, Categories, and Brands are unavailable until the market is active.</p>
                </div>
            )}

            {/* {!isLoadingMarket && !marketError && canManageMarket && (
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('')}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#F59B0F] hover:text-[#F59B0F]"
                    >
                        Manage Products
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('categories')}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#F59B0F] hover:text-[#F59B0F]"
                    >
                        Categories & Brands
                    </button>
                </div>
            )} */}

            {canManageMarket && <Outlet context={{ marketId: market?.id ?? null }} />}

            {isEditModalOpen && market && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                        onClick={closeEditModal}
                        aria-hidden="true"
                    />

                    <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-4 text-white">
                            <div>
                                <h3 className="text-lg font-bold">Update Market Details</h3>
                                <p className="text-xs text-white/80">Edit profile information, logo, and cover image.</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                aria-label="Close"
                                title="Close"
                                className="rounded-lg bg-white/20 p-1.5 transition-colors hover:bg-white/30"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[80vh] space-y-6 overflow-y-auto p-6">
                            {marketEditError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                                    {marketEditError}
                                </div>
                            )}

                            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Logo</p>
                                        <div className="mt-3 h-40 w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
                                            {editLogoPreview ? (
                                                <img src={editLogoPreview} alt="Market logo preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                                    <BuildingStorefrontIcon className="h-10 w-10" />
                                                </div>
                                            )}
                                        </div>
                                        {/* <button
                                            type="button"
                                            onClick={() => logoInputRef.current?.click()}
                                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50"
                                        >
                                            Change Logo
                                        </button> */}
                                        <input
                                            ref={logoInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEditLogoSelect}
                                            className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#AC6C2A] hover:file:bg-orange-200"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            {editLogoFile ? `Selected: ${editLogoFile.name}` : 'No logo file selected'}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Cover Image</p>
                                        <div className="mt-3 h-40 w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
                                            {editCoverPreview ? (
                                                <img src={editCoverPreview} alt="Market cover preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                                    <PhotoIcon className="h-10 w-10" />
                                                </div>
                                            )}
                                        </div>
                                        {/* <button
                                            type="button"
                                            onClick={() => coverInputRef.current?.click()}
                                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50"
                                        >
                                            Change Cover Image
                                        </button> */}
                                        <input
                                            ref={coverInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEditCoverSelect}
                                            className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#AC6C2A] hover:file:bg-orange-200"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            {editCoverFile ? `Selected: ${editCoverFile.name}` : 'No cover image file selected'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="owner-edit-market-name" className="mb-2 block text-sm font-medium text-gray-700">
                                                Market Name
                                            </label>
                                            <input
                                                id="owner-edit-market-name"
                                                type="text"
                                                value={marketEditForm.name}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, name: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="owner-edit-market-location" className="mb-2 block text-sm font-medium text-gray-700">
                                                Google Map Location
                                            </label>
                                            <input
                                                id="owner-edit-market-location"
                                                type="text"
                                                value={marketEditForm.location}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, location: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label htmlFor="owner-edit-market-address" className="mb-2 block text-sm font-medium text-gray-700">
                                                Market Address
                                            </label>
                                            <textarea
                                                id="owner-edit-market-address"
                                                value={marketEditForm.address}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, address: event.target.value }))}
                                                rows={3}
                                                className="w-full resize-none rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label htmlFor="owner-edit-market-desc" className="mb-2 block text-sm font-medium text-gray-700">
                                                Market Description
                                            </label>
                                            <textarea
                                                id="owner-edit-market-desc"
                                                value={marketEditForm.desc}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, desc: event.target.value }))}
                                                rows={5}
                                                className="w-full resize-none rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="owner-edit-first-num" className="mb-2 block text-sm font-medium text-gray-700">
                                                Primary Phone
                                            </label>
                                            <input
                                                id="owner-edit-first-num"
                                                type="text"
                                                value={marketEditForm.first_num}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, first_num: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="owner-edit-second-num" className="mb-2 block text-sm font-medium text-gray-700">
                                                Secondary Phone
                                            </label>
                                            <input
                                                id="owner-edit-second-num"
                                                type="text"
                                                value={marketEditForm.second_num}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, second_num: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="owner-edit-whats-app" className="mb-2 block text-sm font-medium text-gray-700">
                                                WhatsApp
                                            </label>
                                            <input
                                                id="owner-edit-whats-app"
                                                type="text"
                                                value={marketEditForm.whats_app}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, whats_app: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                        <span className="rounded-full bg-gray-100 px-3 py-1">Category: {getCategoryName(market)}</span>
                                        <span className="rounded-full bg-gray-100 px-3 py-1">Status: {isMarketActive ? 'Active' : 'Inactive'}</span>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            className="h-11 flex-1 rounded-lg border-2 border-gray-300 bg-white font-semibold text-gray-700 transition-all hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void updateMarketDetails()}
                                            disabled={isSavingMarketEdit || isUploadingEditLogo || isUploadingEditCover}
                                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isSavingMarketEdit || isUploadingEditLogo || isUploadingEditCover ? (
                                                <>
                                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    {isUploadingEditLogo || isUploadingEditCover ? 'Uploading...' : 'Saving...'}
                                                </>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default MyMarket;
