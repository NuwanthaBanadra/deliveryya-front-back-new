import {
    ArrowLeftIcon,
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon as ExternalLinkIcon,
    BuildingStorefrontIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ClipboardDocumentListIcon,
    EnvelopeIcon,
    HomeIcon,
    InformationCircleIcon,
    MapPinIcon,
    PhoneIcon,
    PhotoIcon,
    WrenchScrewdriverIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import axiosInstance, { baseURL } from '../../../util/AxiosUtil';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import CategoryBrandsManager from '../my_market/category_brands';

type MarketOwner = {
    id: number;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
};

type MarketCategory = {
    id: number;
    name?: string;
};

type MarketRow = {
    id: number;
    name: string;
    desc: string;
    address: string;
    location: string;
    first_num: string;
    second_num: string;
    whats_app: string;
    infoMessage: string;
    logoUrl: string;
    coverImgUrl: string;
    isActive: boolean;
    createdAt: string;
    users: MarketOwner | null;
    marketCategory: MarketCategory | null;
};

type MarketsApiResponse = {
    object?: unknown;
    exData?: unknown;
    message?: string;
    desc?: string;
};

type MarketEditForm = {
    name: string;
    location: string;
    address: string;
    desc: string;
    first_num: string;
    second_num: string;
    whats_app: string;
    infoMessage: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
        return value;
    }
    return [];
};

const asNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
};

const asString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') {
        return value === 1;
    }
    return fallback;
};

const extractItemsAndTotal = (raw: unknown): { items: unknown[]; totalCount: number } => {
    const root = asRecord(raw);
    if (!root) {
        return { items: [], totalCount: 0 };
    }

    const object = root.object ?? root.exData ?? root;

    if (Array.isArray(object)) {
        return { items: object, totalCount: object.length };
    }

    const objectRecord = asRecord(object);
    if (!objectRecord) {
        return { items: [], totalCount: 0 };
    }

    const items = asArray(objectRecord.items);
    const totalCount = asNumber(objectRecord.totalCount ?? objectRecord.totalElements ?? objectRecord.total, items.length);
    return { items, totalCount };
};

const toOwner = (raw: unknown): MarketOwner | null => {
    const owner = asRecord(raw);
    if (!owner) return null;
    const id = asNumber(owner.id);
    if (!id) return null;

    return {
        id,
        firstName: asString(owner.firstName, ''),
        lastName: asString(owner.lastName, ''),
        name: asString(owner.name, ''),
        email: asString(owner.email, ''),
    };
};

const toCategory = (raw: unknown): MarketCategory | null => {
    const category = asRecord(raw);
    if (!category) return null;
    const id = asNumber(category.id);
    if (!id) return null;

    return {
        id,
        name: asString(category.name, ''),
    };
};

const mapMarket = (raw: unknown): MarketRow | null => {
    const row = asRecord(raw);
    if (!row) return null;
    const id = asNumber(row.id);
    if (!id) return null;

    return {
        id,
        name: asString(row.name, 'Untitled Market'),
        desc: asString(row.desc, ''),
        address: asString(row.address, ''),
        location: asString(row.location, ''),
        first_num: asString(row.first_num, ''),
        second_num: asString(row.second_num, ''),
        whats_app: asString(row.whats_app, ''),
        infoMessage: asString(row.infoMessage, ''),
        logoUrl: asString(row.logoUrl, ''),
        coverImgUrl: asString(row.coverImgUrl, ''),
        isActive: asBoolean(row.isActive, false),
        createdAt: asString(row.createdAt, ''),
        users: toOwner(row.users),
        marketCategory: toCategory(row.marketCategory),
    };
};

const getOwnerName = (owner: MarketOwner | null): string => {
    if (!owner) return 'Unknown owner';
    const fullName = `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim();
    if (fullName) return fullName;
    if (owner.name?.trim()) return owner.name;
    return 'Unknown owner';
};

const getCategoryName = (category: MarketCategory | null): string => {
    if (!category) return 'Uncategorized';
    if (category.name?.trim()) return category.name;
    return 'Uncategorized';
};

const formatDateTime = (value: string): string => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
};

const normalizeImageUrl = (url?: string | null): string => {
    if (!url) return '';
    const cleanedUrl = url.replace(/\\/g, '/').trim();
    if (!cleanedUrl) return '';
    if (cleanedUrl.startsWith('data:')) return cleanedUrl;
    if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;

    const normalizedPath = cleanedUrl.replace(/^\/+/, '');
    if (!normalizedPath) return '';

    return `${baseURL}/uploads/${normalizedPath}`;
};

const getMarketStatusClasses = (isActive: boolean): string => {
    if (isActive) {
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    }
    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
};

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

const isExternalUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

const getMapHref = (location: string, address: string): { href: string; label: string } | null => {
    const trimmedLocation = location.trim();
    if (trimmedLocation) {
        return {
            href: isExternalUrl(trimmedLocation)
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

const renderMissingValue = (value: string): string => value.trim() || '-';

const normalizePhone = (value: string): string => value.replace(/\D/g, '');

const isValidPhone = (value: string): boolean => /^(?:94|0)?\d{9}$/.test(value);

const extractResponseRecord = (raw: unknown): Record<string, unknown> | null => {
    const root = asRecord(raw);
    if (!root) return null;

    const payload = root.object ?? root.exData ?? root;
    const payloadRecord = asRecord(payload);
    if (payloadRecord) {
        return payloadRecord;
    }

    const payloadArray = asArray(payload);
    if (payloadArray.length > 0) {
        return asRecord(payloadArray[0]);
    }

    return null;
};

function MarketWorkspace() {
    const navigate = useNavigate();
    const { marketId } = useParams<{ marketId: string }>();
    const canManageMarketCatalog = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.MARKET_CATEGORIES), []);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const [selectedMarket, setSelectedMarket] = useState<MarketRow | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [marketStatusError, setMarketStatusError] = useState('');
    const [marketEditError, setMarketEditError] = useState('');
    const [coverImageFailures, setCoverImageFailures] = useState<Record<number, boolean>>({});
    const [logoImageFailures, setLogoImageFailures] = useState<Record<number, boolean>>({});
    const [updatingMarketIds, setUpdatingMarketIds] = useState<Record<number, boolean>>({});
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedMarketForStatus, setSelectedMarketForStatus] = useState<MarketRow | null>(null);
    const [infoMessage, setInfoMessage] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedMarketForEdit, setSelectedMarketForEdit] = useState<MarketRow | null>(null);
    const [marketEditForm, setMarketEditForm] = useState<MarketEditForm>({
        name: '',
        location: '',
        address: '',
        desc: '',
        first_num: '',
        second_num: '',
        whats_app: '',
        infoMessage: '',
    });
    const [editLogoPreview, setEditLogoPreview] = useState('');
    const [editCoverPreview, setEditCoverPreview] = useState('');
    const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
    const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
    const [isSavingMarketEdit, setIsSavingMarketEdit] = useState(false);
    const [isUploadingEditLogo, setIsUploadingEditLogo] = useState(false);
    const [isUploadingEditCover, setIsUploadingEditCover] = useState(false);
    const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);

    const selectedMarketMapLink = useMemo(
        () => (selectedMarket ? getMapHref(selectedMarket.location, selectedMarket.address) : null),
        [selectedMarket],
    );

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

    const loadMarket = useCallback(async () => {
        const parsedMarketId = Number(marketId);
        if (!marketId || !Number.isFinite(parsedMarketId) || parsedMarketId <= 0) {
            setError('Invalid market ID.');
            setSelectedMarket(null);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await axiosInstance.post<MarketsApiResponse>('/markets/get-markets', {
                pageNumber: 0,
                countPerPage: 1,
                marketId: parsedMarketId,
                userId: null,
                isActive: null,
                search: '',
            });

            const { items } = extractItemsAndTotal(response.data);
            const mappedRows = items.map(mapMarket).filter((item): item is MarketRow => item !== null);
            const marketRecord = mappedRows[0] ?? null;

            if (!marketRecord) {
                setSelectedMarket(null);
                setError('Market not found.');
                return;
            }

            const ownerId = marketRecord.users?.id;
            const categoryId = marketRecord.marketCategory?.id;

            const [resolvedOwner, resolvedCategory] = await Promise.all([
                ownerId
                    ? axiosInstance.get('/users/get-user-by-id', { params: { id: ownerId } })
                        .then((userResponse) => toOwner(extractResponseRecord(userResponse.data)))
                        .catch(() => null)
                    : Promise.resolve(null),
                Promise.resolve(categoryId ? marketRecord.marketCategory : null),
            ]);

            setSelectedMarket({
                ...marketRecord,
                users: resolvedOwner ?? marketRecord.users,
                marketCategory: resolvedCategory ?? marketRecord.marketCategory,
            });
            setSelectedMarketForStatus((current) => (current?.id === marketRecord.id ? {
                ...marketRecord,
                users: resolvedOwner ?? marketRecord.users,
                marketCategory: resolvedCategory ?? marketRecord.marketCategory,
            } : current));
        } catch (requestError: any) {
            setSelectedMarket(null);
            setError(getApiErrorMessage(requestError, 'Failed to load market details.'));
        } finally {
            setIsLoading(false);
        }
    }, [marketId]);

    useEffect(() => {
        void loadMarket();
    }, [loadMarket]);

    const toggleMarketStatus = useCallback(async (market: MarketRow, isActive: boolean) => {
        const actionText = isActive ? 'activate' : 'deactivate';
        const result = await Swal.fire({
            icon: 'question',
            title: `Confirm ${actionText}`,
            text: `Are you sure you want to ${actionText} "${market.name}"?`,
            showCancelButton: true,
            confirmButtonText: 'Yes, proceed',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;

        setUpdatingMarketIds((prev) => ({ ...prev, [market.id]: true }));
        setMarketStatusError('');

        try {
            await axiosInstance.post('/markets/update-market-status-info', {
                id: market.id,
                isActive,
                infoMessage: market.infoMessage || '',
            });
            setSelectedMarket((prev) => (prev?.id === market.id ? { ...prev, isActive } : prev));
            setSelectedMarketForStatus((prev) => (prev?.id === market.id ? { ...prev, isActive } : prev));
            Swal.fire({
                icon: 'success',
                title: 'Market status updated',
                text: `"${market.name}" has been ${isActive ? 'activated' : 'deactivated'}.`,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2500,
            });
        } catch (requestError: any) {
            const message = getApiErrorMessage(requestError, 'Failed to update market status.');
            setMarketStatusError(message);
            Swal.fire({
                icon: 'error',
                title: 'Update failed',
                text: message,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3500,
            });
        } finally {
            setUpdatingMarketIds((prev) => ({ ...prev, [market.id]: false }));
        }
    }, []);

    const openStatusModal = useCallback((market: MarketRow) => {
        setSelectedMarketForStatus(market);
        setIsStatusModalOpen(true);
        setInfoMessage(market.infoMessage || '');
    }, []);

    const closeStatusModal = useCallback(() => {
        setIsStatusModalOpen(false);
        setSelectedMarketForStatus(null);
        setInfoMessage('');
    }, []);

    const openEditModal = useCallback((market: MarketRow) => {
        setSelectedMarketForEdit(market);
        setMarketEditForm({
            name: market.name || '',
            location: market.location || '',
            address: market.address || '',
            desc: market.desc || '',
            first_num: market.first_num || '',
            second_num: market.second_num || '',
            whats_app: market.whats_app || '',
            infoMessage: market.infoMessage || '',
        });
        setEditLogoPreview(normalizeImageUrl(market.logoUrl));
        setEditCoverPreview(normalizeImageUrl(market.coverImgUrl));
        setEditLogoFile(null);
        setEditCoverFile(null);
        setMarketEditError('');
        setIsEditModalOpen(true);
    }, []);

    const closeEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setSelectedMarketForEdit(null);
        setMarketEditForm({
            name: '',
            location: '',
            address: '',
            desc: '',
            first_num: '',
            second_num: '',
            whats_app: '',
            infoMessage: '',
        });
        setEditLogoPreview('');
        setEditCoverPreview('');
        setEditLogoFile(null);
        setEditCoverFile(null);
        setMarketEditError('');
        if (logoInputRef.current) logoInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
    }, []);

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

    const updateMarketInfoMessage = useCallback(async () => {
        if (!selectedMarketForStatus) return;

        setUpdatingMarketIds((prev) => ({ ...prev, [selectedMarketForStatus.id]: true }));
        setMarketStatusError('');

        try {
            await axiosInstance.post('/markets/update-market-status-info', {
                id: selectedMarketForStatus.id,
                isActive: selectedMarketForStatus.isActive,
                infoMessage,
            });
            setSelectedMarket((prev) =>
                prev?.id === selectedMarketForStatus.id ? { ...prev, infoMessage } : prev,
            );
            setSelectedMarketForStatus((prev) =>
                prev?.id === selectedMarketForStatus.id ? { ...prev, infoMessage } : prev,
            );
            setIsStatusModalOpen(false);
            setSelectedMarketForStatus(null);
            setInfoMessage('');
            Swal.fire({
                icon: 'success',
                title: 'Info message saved',
                text: 'Market notice has been updated.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2500,
            });
        } catch (requestError: any) {
            const message = getApiErrorMessage(requestError, 'Failed to update info message.');
            setMarketStatusError(message);
            Swal.fire({
                icon: 'error',
                title: 'Save failed',
                text: message,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3500,
            });
        } finally {
            setUpdatingMarketIds((prev) => ({ ...prev, [selectedMarketForStatus.id]: false }));
        }
    }, [selectedMarketForStatus, infoMessage]);

    const updateMarketDetails = useCallback(async () => {
        if (!selectedMarketForEdit) return;

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
            const [logoUrl, coverImgUrl] = await Promise.all([
                editLogoFile ? uploadMarketImages([editLogoFile], 'logo') : Promise.resolve(selectedMarketForEdit.logoUrl),
                editCoverFile ? uploadMarketImages([editCoverFile], 'cover') : Promise.resolve(selectedMarketForEdit.coverImgUrl),
            ]);

            const response = await axiosInstance.post('/markets/update-market', {
                id: selectedMarketForEdit.id,
                name: nextName,
                location: nextLocation,
                address: nextAddress,
                logoUrl,
                coverImgUrl,
                desc: nextDesc,
                first_num: normalizedFirstNum,
                second_num: normalizedSecondNum,
                whats_app: normalizedWhatsApp,
                users: selectedMarketForEdit.users ? { id: selectedMarketForEdit.users.id } : null,
                infoMessage: marketEditForm.infoMessage.trim(),
                isActive: selectedMarketForEdit.isActive,
                marketCategory: selectedMarketForEdit.marketCategory ? {
                    id: selectedMarketForEdit.marketCategory.id,
                    name: selectedMarketForEdit.marketCategory.name || '',
                } : null,
            });

            const responseRecord = extractResponseRecord(response.data);
            const updatedMarket = responseRecord ? (mapMarket(responseRecord) ?? null) : null;
            const nextSelectedMarket = updatedMarket ?? {
                ...selectedMarketForEdit,
                name: nextName,
                location: nextLocation,
                address: nextAddress,
                logoUrl,
                coverImgUrl,
                desc: nextDesc,
                first_num: normalizedFirstNum,
                second_num: normalizedSecondNum,
                whats_app: normalizedWhatsApp,
                infoMessage: marketEditForm.infoMessage.trim(),
            };

            setSelectedMarket((prev) => (prev?.id === selectedMarketForEdit.id ? nextSelectedMarket : prev));
            setSelectedMarketForStatus((prev) => (
                prev?.id === selectedMarketForEdit.id
                    ? { ...nextSelectedMarket, infoMessage: marketEditForm.infoMessage.trim() }
                    : prev
            ));
            setMarketStatusError('');
            setSelectedMarketForEdit(null);
            setIsEditModalOpen(false);
            setEditLogoFile(null);
            setEditCoverFile(null);
            setEditLogoPreview('');
            setEditCoverPreview('');
            if (logoInputRef.current) logoInputRef.current.value = '';
            if (coverInputRef.current) coverInputRef.current.value = '';
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
    }, [editCoverFile, editLogoFile, marketEditForm, selectedMarketForEdit, uploadMarketImages]);

    const refreshWorkspace = useCallback(() => {
        void loadMarket();
        setCatalogRefreshKey((prev) => prev + 1);
    }, [loadMarket]);

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm">
                <div className="inline-flex flex-col items-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-orange-100 to-orange-200">
                        <BuildingStorefrontIcon className="h-10 w-10 text-[#F59B0F]" />
                    </div>
                    <p className="mb-2 text-xl font-black text-gray-900">Loading market details...</p>
                    <p className="text-gray-600">Please wait while we fetch the workspace data.</p>
                </div>
            </div>
        );
    }

    if (error || !selectedMarket) {
        return (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
                <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-[#F59B0F]" />
                <p className="mt-3 text-lg font-black text-gray-900">{error || 'Market not found.'}</p>
                <p className="mt-1 text-sm text-gray-500">Open a market from the directory to load its workspace.</p>
                <button
                    type="button"
                    onClick={() => navigate('/deliverYya-cloud-console/markets')}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 text-sm font-bold text-white transition hover:shadow-lg"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Markets
                </button>
            </div>
        );
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="relative h-52 bg-gray-100 sm:h-64">
                {normalizeImageUrl(selectedMarket.coverImgUrl) && !coverImageFailures[selectedMarket.id] ? (
                    <img
                        src={normalizeImageUrl(selectedMarket.coverImgUrl)}
                        alt={`${selectedMarket.name} cover`}
                        className="h-full w-full object-cover"
                        onError={() => setCoverImageFailures((prev) => ({ ...prev, [selectedMarket.id]: true }))}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-orange-50 to-amber-100 text-sm font-semibold text-orange-700">
                        No cover image
                    </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5">
                    <button
                        type="button"
                        onClick={() => navigate('/deliverYya-cloud-console/markets')}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/95 px-3 text-sm font-bold text-[#AC6C2A] shadow-sm transition hover:bg-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back
                    </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-end gap-4">
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-orange-50 shadow-lg sm:h-24 sm:w-24">
                                {normalizeImageUrl(selectedMarket.logoUrl) && !logoImageFailures[selectedMarket.id] ? (
                                    <img
                                        src={normalizeImageUrl(selectedMarket.logoUrl)}
                                        alt={`${selectedMarket.name} logo`}
                                        className="h-full w-full object-cover"
                                        onError={() => setLogoImageFailures((prev) => ({ ...prev, [selectedMarket.id]: true }))}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <BuildingStorefrontIcon className="h-10 w-10 text-[#F59B0F]" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 pb-1 text-white">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Selected Market</p>
                                <h2 className="mt-1 text-2xl font-black sm:text-3xl">{selectedMarket.name}</h2>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getMarketStatusClasses(selectedMarket.isActive)}`}>
                                        {selectedMarket.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                                        {getCategoryName(selectedMarket.marketCategory)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => document.getElementById('selected-market-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-[#AC6C2A] shadow-sm transition hover:bg-orange-50"
                            >
                                <WrenchScrewdriverIcon className="h-4 w-4" />
                                Manage Categories, Brands & Products
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                                <EnvelopeIcon className="h-4 w-4" />
                                Owner
                            </div>
                            <p className="mt-2 text-sm font-black text-gray-900">{getOwnerName(selectedMarket.users)}</p>
                            <p className="mt-1 break-all text-xs font-semibold text-gray-600">{selectedMarket.users?.email || '-'}</p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                                <ClipboardDocumentListIcon className="h-4 w-4" />
                                Created
                            </div>
                            <p className="mt-2 text-sm font-black text-gray-900">{formatDateTime(selectedMarket.createdAt)}</p>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                                <CheckCircleIcon className="h-4 w-4" />
                                Status
                            </div>
                            <p className="mt-2 text-sm font-black text-gray-900">{selectedMarket.isActive ? 'Active Market' : 'Inactive Market'}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                                <HomeIcon className="h-4 w-4" />
                                Physical Address
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-gray-800">
                                {renderMissingValue(selectedMarket.address)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                                <MapPinIcon className="h-4 w-4" />
                                Google Map Location
                            </div>
                            <p className="mt-2 break-all text-sm font-semibold leading-6 text-gray-800">
                                {renderMissingValue(selectedMarket.location)}
                            </p>
                            {selectedMarketMapLink && (
                                <a
                                    href={selectedMarketMapLink.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                                >
                                    <MapPinIcon className="h-4 w-4" />
                                    {selectedMarketMapLink.label}
                                    <ExternalLinkIcon className="h-3.5 w-3.5" />
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
                            <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(selectedMarket.first_num)}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                                <PhoneIcon className="h-4 w-4" />
                                Secondary Phone
                            </div>
                            <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(selectedMarket.second_num)}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                WhatsApp
                            </div>
                            <p className="mt-2 text-sm font-black text-gray-900">{renderMissingValue(selectedMarket.whats_app)}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                            <InformationCircleIcon className="h-4 w-4" />
                            Market Description
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                            {renderMissingValue(selectedMarket.desc)}
                        </p>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Info Message</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-orange-950">
                            {renderMissingValue(selectedMarket.infoMessage)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Actions</p>
                        <div className="mt-3 grid gap-2">
                            <button
                                type="button"
                                onClick={() => openEditModal(selectedMarket)}
                                className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-[#F59B0F] bg-white px-3 text-sm font-bold text-[#AC6C2A] transition hover:bg-orange-50"
                            >
                                Update Market Details
                            </button>
                            <button
                                type="button"
                                onClick={() => void toggleMarketStatus(selectedMarket, !selectedMarket.isActive)}
                                disabled={updatingMarketIds[selectedMarket.id] === true}
                                className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60"
                            >
                                {updatingMarketIds[selectedMarket.id] === true
                                    ? 'Updating...'
                                    : selectedMarket.isActive
                                        ? 'Deactivate Market'
                                        : 'Activate Market'}
                            </button>
                            <button
                                type="button"
                                onClick={() => openStatusModal(selectedMarket)}
                                className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50"
                            >
                                Update Info Message
                            </button>
                            {canManageMarketCatalog && (
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('selected-market-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    className="inline-flex h-10 items-center justify-center rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-3 text-sm font-bold text-white transition hover:shadow-lg"
                                >
                                    Manage Categories, Brands & Products
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={refreshWorkspace}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50"
                            >
                                <ArrowPathIcon className="h-4 w-4" />
                                Refresh Market Data
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {marketStatusError && (
                <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 sm:mx-6">
                    {marketStatusError}
                </div>
            )}

            {marketEditError && (
                <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 sm:mx-6">
                    {marketEditError}
                </div>
            )}

            {canManageMarketCatalog && (
                <div id="selected-market-catalog" className="border-t border-orange-100 bg-gray-50 p-4 sm:p-6">
                    <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Catalog Workspace</p>
                        <h3 className="mt-1 text-xl font-black text-gray-900">Categories, Brands & Products</h3>
                    </div>
                    <CategoryBrandsManager
                        key={`${selectedMarket.id}-${catalogRefreshKey}`}
                        marketIdOverride={selectedMarket.id}
                    />
                </div>
            )}

            {isEditModalOpen && selectedMarketForEdit && (
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

                        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
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
                                        <button
                                            type="button"
                                            onClick={() => logoInputRef.current?.click()}
                                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50"
                                        >
                                            Change Logo
                                        </button>
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
                                        <button
                                            type="button"
                                            onClick={() => coverInputRef.current?.click()}
                                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50"
                                        >
                                            Change Cover Image
                                        </button>
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
                                            <label htmlFor="edit-market-name" className="mb-2 block text-sm font-medium text-gray-700">
                                                Market Name
                                            </label>
                                            <input
                                                id="edit-market-name"
                                                type="text"
                                                value={marketEditForm.name}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, name: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="edit-market-location" className="mb-2 block text-sm font-medium text-gray-700">
                                                Google Map Location
                                            </label>
                                            <input
                                                id="edit-market-location"
                                                type="text"
                                                value={marketEditForm.location}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, location: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label htmlFor="edit-market-address" className="mb-2 block text-sm font-medium text-gray-700">
                                                Market Address
                                            </label>
                                            <textarea
                                                id="edit-market-address"
                                                value={marketEditForm.address}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, address: event.target.value }))}
                                                rows={3}
                                                className="w-full resize-none rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label htmlFor="edit-market-desc" className="mb-2 block text-sm font-medium text-gray-700">
                                                Market Description
                                            </label>
                                            <textarea
                                                id="edit-market-desc"
                                                value={marketEditForm.desc}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, desc: event.target.value }))}
                                                rows={5}
                                                className="w-full resize-none rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="edit-first-num" className="mb-2 block text-sm font-medium text-gray-700">
                                                Primary Phone
                                            </label>
                                            <input
                                                id="edit-first-num"
                                                type="text"
                                                value={marketEditForm.first_num}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, first_num: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="edit-second-num" className="mb-2 block text-sm font-medium text-gray-700">
                                                Secondary Phone
                                            </label>
                                            <input
                                                id="edit-second-num"
                                                type="text"
                                                value={marketEditForm.second_num}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, second_num: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="edit-whats-app" className="mb-2 block text-sm font-medium text-gray-700">
                                                WhatsApp
                                            </label>
                                            <input
                                                id="edit-whats-app"
                                                type="text"
                                                value={marketEditForm.whats_app}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, whats_app: event.target.value }))}
                                                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label htmlFor="edit-info-message" className="mb-2 block text-sm font-medium text-gray-700">
                                                Info Message
                                            </label>
                                            <textarea
                                                id="edit-info-message"
                                                value={marketEditForm.infoMessage}
                                                onChange={(event) => setMarketEditForm((prev) => ({ ...prev, infoMessage: event.target.value }))}
                                                rows={4}
                                                className="w-full resize-none rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                        <span className="rounded-full bg-gray-100 px-3 py-1">Category: {getCategoryName(selectedMarketForEdit.marketCategory)}</span>
                                        <span className="rounded-full bg-gray-100 px-3 py-1">Status: {selectedMarketForEdit.isActive ? 'Active' : 'Inactive'}</span>
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

            {isStatusModalOpen && selectedMarketForStatus && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                        onClick={closeStatusModal}
                        aria-hidden="true"
                    />

                    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-4 text-white">
                            <h3 className="text-lg font-bold">Update Info Message</h3>
                            <button
                                type="button"
                                onClick={closeStatusModal}
                                aria-label="Close"
                                title="Close"
                                className="rounded-lg bg-white/20 p-1.5 transition-colors hover:bg-white/30"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 p-6">
                            <div>
                                <p className="mb-1 text-sm font-medium text-gray-700">Market</p>
                                <p className="text-base font-bold text-gray-900">{selectedMarketForStatus.name}</p>
                            </div>

                            <div>
                                <label htmlFor="infoMessage" className="mb-2 block text-sm font-medium text-gray-700">
                                    Info Message
                                </label>
                                <textarea
                                    id="infoMessage"
                                    value={infoMessage}
                                    onChange={(event) => setInfoMessage(event.target.value)}
                                    placeholder="Enter a message..."
                                    className="w-full resize-none rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                    rows={4}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeStatusModal}
                                    className="h-10 flex-1 rounded-lg border-2 border-gray-300 bg-white font-semibold text-gray-700 transition-all hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void updateMarketInfoMessage()}
                                    disabled={updatingMarketIds[selectedMarketForStatus.id] === true}
                                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {updatingMarketIds[selectedMarketForStatus.id] === true ? 'Saving...' : 'Save Message'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default MarketWorkspace;
