import { ArrowPathIcon, CheckCircleIcon, ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ClipboardDocumentIcon, ClockIcon, EllipsisVerticalIcon, EyeIcon, FunnelIcon, MagnifyingGlassIcon, MapPinIcon, PencilSquareIcon, TrashIcon, TruckIcon, UserCircleIcon, UsersIcon, XMarkIcon, } from '@heroicons/react/24/outline';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import Swal from 'sweetalert2';
import axiosInstance from '../../../util/AxiosUtil';
import { getCurrentUserId, getCurrentUserRoleId, ROLE_IDS } from '../../../util/RoleAccess';
import { swalAlert } from '../../../util/SwalUtil';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';

type ComplainType = {
    id: number;
    name: string;
};

type ComplainStatus = {
    id: number;
    name: string;
};

type ComplaintItem = {
    id: number;
    subject: string;
    complain: string;
    orderId: number | null;
    orderCode: string;
    typeId: number;
    typeName: string;
    statusId: number | null;
    statusName: string;
    isSolve: boolean;
    createdAt: string;
    updatedAt: string;
    userName: string;
    userEmail: string;
};

type RelatedPartiesModalState = {
    complaintId: number;
    subject: string;
    complain: string;
    complainType: string;
    relatedCode: string;
    relatedKind: 'order' | 'urgent_job' | 'unknown';
    filer: {
        name: string;
        email?: string;
        contact: string;
        address: string;
        type?: string;
        note?: string;
        firstPhone?: string;
        secondPhone?: string;
        whatsapp?: string;
    };
    owner: RelatedPartyPerson | null;
    order: ComplaintOrderSnapshot | null;
    urgentJob: ComplaintUrgentJobSnapshot | null;
    deliveryTimeline: DeliveryTimelineItem[];
    market: {
        name: string;
        manager: string;
        ownerEmail: string;
        location: string;
        address: string;
        category: string;
        firstPhone: string;
        secondPhone: string;
        whatsapp: string;
        description: string;
        note: string;
        isActive: boolean | null;
    } | null;
};

type FilerLookupResult = {
    name: string;
    email?: string;
    contact: string;
    address: string;
    type?: string;
    note?: string;
    firstPhone?: string;
    secondPhone?: string;
    whatsapp?: string;
};

type RelatedPartyPerson = {
    name: string;
    email?: string;
    contact: string;
    address: string;
    type: 'third_party' | 'market' | 'client' | 'urgent_job_client' | 'complainant' | 'unknown';
    note?: string;
    firstPhone?: string;
    secondPhone?: string;
    whatsapp?: string;
};

type DeliveryTimelineItem = {
    id: number;
    status: string;
    assignedAt: string;
    name: string;
    location: string;
};

type ComplaintOrderDetailsResult = {
    filer: FilerLookupResult | null;
    owner: RelatedPartyPerson | null;
    order: ComplaintOrderSnapshot | null;
    marketOrderId: number | null;
};

type ComplaintOrderSnapshot = {
    orderCode: string;
    customerName: string;
    contact: string;
    address: string;
    city: string;
    location: string;
    primaryMobile: string;
    secondaryMobile: string;
    whatsapp: string;
    status: string;
    paymentStatus: string;
    paymentType: string;
    totalPrice: number | null;
    deliveryFee: number | null;
    qty: number | null;
    createdAt: string;
    note: string;
};

type ComplaintUrgentJobCheckpoint = {
    id: string;
    task: string;
    location: string;
    scheduledAt: string;
    expectedTimeDuration: number | null;
};

type ComplaintUrgentJobSnapshot = {
    id: string;
    jobCode: string;
    job: string;
    description: string;
    status: string;
    clientName: string;
    mobile: string;
    email: string;
    nic: string;
    vehicle: string;
    cost: number | null;
    tripDistance: number | null;
    createdAt: string;
    scheduledAt: string;
    checkpoints: ComplaintUrgentJobCheckpoint[];
};

type MarketDetailsLookupResult = {
    name: string;
    manager: string;
    ownerEmail: string;
    location: string;
    address: string;
    category: string;
    firstPhone: string;
    secondPhone: string;
    whatsapp: string;
    description: string;
    note: string;
    isActive: boolean | null;
    raw?: Record<string, unknown>;
};

type EditFormState = {
    id: number;
    subject: string;
    complain: string;
    orderId: number;
    orderCode: string;
    complainTypeId: number;
    isSolve: boolean;
};

type FilterState = {
    search: string;
    complainTypeId: number;
    complainStatusId: number;
    isSolve: 'all' | 'open' | 'solved';
};

const defaultFilters: FilterState = {
    search: '',
    complainTypeId: 0,
    complainStatusId: 0,
    isSolve: 'all',
};

type SelectOption<T extends string | number> = {
    value: T;
    label: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    return value as Record<string, unknown>;
};

const asString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }

    if (typeof value === 'number') {
        return String(value);
    }

    return fallback;
};

const asNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
};

const asBoolean = (value: unknown): boolean => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }

    return false;
};

const toCleanString = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
};

const joinPhones = (values: unknown[]): string => {
    const unique = Array.from(new Set(values.map(toCleanString).filter(Boolean)));
    return unique.length > 0 ? unique.join(' | ') : 'N/A';
};

const formatMarketPhones = (payload: Record<string, unknown>): string => {
    const first = toCleanString(payload.first_num);
    const second = toCleanString(payload.second_num);
    const whatsapp = toCleanString(payload.whats_app);

    const parts = [
        first ? `First: ${first}` : '',
        second ? `Second: ${second}` : '',
        whatsapp ? `WhatsApp: ${whatsapp}` : '',
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' | ') : 'N/A';
};

const extractPayload = (value: unknown): Record<string, unknown> => {
    const root = asRecord(value) ?? {};
    return asRecord(root.object) ?? root;
};

const extractArrayPayload = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
        return value;
    }

    const root = asRecord(value);
    if (!root) {
        return [];
    }

    if (Array.isArray(root.object)) {
        return root.object;
    }

    const payload = asRecord(root.object) ?? root;
    const candidates = [payload.items, payload.content, payload.rows, payload.list, payload.data];
    const found = candidates.find((item) => Array.isArray(item));

    return Array.isArray(found) ? found : [];
};

const formatDateTime = (value: string): string => {
    if (!value || value === '-') {
        return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
};

const formatCurrency = (value: number | null): string => (
    value === null ? 'N/A' : `LKR ${value.toLocaleString()}`
);

const getPartyTypeLabel = (type?: string): string => {
    switch (type) {
        case 'third_party':
            return 'Third Party Sender';
        case 'market':
            return 'Market Sender';
        case 'client':
            return 'Client Sender';
        case 'urgent_job_client':
            return 'Urgent Job Client';
        case 'complainant':
            return 'Complaint Owner';
        default:
            return 'Resolved Profile';
    }
};

const mapComplaintItem = (value: unknown): ComplaintItem | null => {
    const item = asRecord(value);
    if (!item) {
        return null;
    }

    const type = asRecord(item.complainType);
    const status = asRecord(item.complainStatus);
    const user = asRecord(item.user);
    const order = asRecord(item.order);
    const urgentJob = asRecord(item.urgentJob) ?? asRecord(item.job);
    const orderCodeObject = asRecord(order?.orderCode) ?? asRecord(item.orderCode);

    const id = asNumber(item.id) ?? asNumber(item.complainId);
    if (!id) {
        return null;
    }

    const userName =
        asString(user?.name, '') ||
        `${asString(user?.firstName, '')} ${asString(user?.lastName, '')}`.trim() ||
        asString(item.userName, 'N/A') ||
        'N/A';

    return {
        id,
        subject: asString(item.subject, 'Untitled complaint'),
        complain: asString(item.complain, '') || asString(item.description, 'N/A') || 'N/A',
        orderId: asNumber(item.orderId) ?? asNumber(order?.id),
        orderCode:
            asString(orderCodeObject?.code, '') ||
            asString(order?.jobCode, '') ||
            asString(order?.code, '') ||
            asString(urgentJob?.jobCode, '') ||
            asString(urgentJob?.code, '') ||
            asString(item.jobCode, '') ||
            asString(item.urgentJobCode, '') ||
            asString(item.code, '') ||
            asString(item.orderCode, 'N/A') ||
            'N/A',
        typeId: asNumber(type?.id) ?? 0,
        typeName: asString(type?.name, 'Unknown Type'),
        statusId: asNumber(status?.id),
        statusName: asString(status?.name, asBoolean(item.isSolve) ? 'Resolved' : 'Pending'),
        isSolve: asBoolean(item.isSolve),
        createdAt: asString(item.createdAt, '') || asString(item.createdDate, 'N/A') || 'N/A',
        updatedAt: asString(item.updatedAt, '') || asString(item.lastModifiedAt, 'N/A') || 'N/A',
        userName,
        userEmail: asString(user?.email, '') || asString(item.userEmail, 'N/A') || 'N/A',
    };
};

const extractComplaintPage = (
    data: unknown,
    fallbackPage: number,
    fallbackCount: number,
): { items: ComplaintItem[]; total: number; pageNumber: number; countPerPage: number } => {
    const payload = extractPayload(data);
    const rawItems = extractArrayPayload(payload);
    const items = rawItems.map((entry) => mapComplaintItem(entry)).filter((item): item is ComplaintItem => item !== null);

    const total =
        asNumber(payload.totalElements) ??
        asNumber(payload.total) ??
        asNumber(payload.totalCount) ??
        items.length;

    const pageNumber = asNumber(payload.pageNumber) ?? asNumber(payload.currentPage) ?? fallbackPage;
    const countPerPage = asNumber(payload.countPerPage) ?? asNumber(payload.pageSize) ?? asNumber(payload.size) ?? fallbackCount;

    return {
        items,
        total,
        pageNumber,
        countPerPage,
    };
};

function ComplaintsManager() {
    const pageSizeOptions = [5, 10, 20, 50];
    const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
    const [complainTypes, setComplainTypes] = useState<ComplainType[]>([]);
    const [complainStatuses, setComplainStatuses] = useState<ComplainStatus[]>([]);
    const [filters, setFilters] = useState<FilterState>(defaultFilters);
    const [pageNumber, setPageNumber] = useState(1);
    const [countPerPage, setCountPerPage] = useState(5);
    const [totalComplaints, setTotalComplaints] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [error, setError] = useState('');
    const [editingComplaint, setEditingComplaint] = useState<EditFormState | null>(null);
    const [selectedComplaintIds, setSelectedComplaintIds] = useState<number[]>([]);
    const [relatedPartiesModal, setRelatedPartiesModal] = useState<RelatedPartiesModalState | null>(null);
    const [isLoadingRelatedParties, setIsLoadingRelatedParties] = useState(false);
    const [relatedPartiesError, setRelatedPartiesError] = useState('');
    const canDeleteComplaints = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.COMPLAINT_DELETE), []);

    const totalPages = Math.max(1, Math.ceil(totalComplaints / countPerPage));

    const complainTypeOptions = useMemo(
        () => complainTypes.map((type) => ({ value: type.id, label: type.name })),
        [complainTypes],
    );
    const complainStatusOptions = useMemo(
        () => complainStatuses.map((status) => ({ value: status.id, label: status.name })),
        [complainStatuses],
    );

    const pageSizeSelectOptions: SelectOption<number>[] = useMemo(
        () => pageSizeOptions.map((size) => ({ value: size, label: String(size) })),
        [pageSizeOptions],
    );

    const getCustomSelectStyles = (hasError = false, isCompact = false) => ({
        control: (base: any, state: any) => ({
            ...base,
            padding: isCompact ? '0.05rem 0.125rem' : '0.375rem',
            borderWidth: '2px',
            minHeight: isCompact ? '38px' : '50px',
            borderColor: hasError ? '#EF4444' : (state.isFocused ? '#F59B0F' : '#E5E7EB'),
            borderRadius: isCompact ? '0.5rem' : '0.75rem',
            boxShadow: hasError
                ? (state.isFocused ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none')
                : (state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.2)' : 'none'),
            '&:hover': {
                borderColor: hasError ? '#DC2626' : '#FCD34D',
            },
            transition: 'all 0.3s',
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
            color: state.isSelected ? 'white' : '#1F2937',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: '#F59B0F',
            },
        }),
        placeholder: (base: any) => ({
            ...base,
            color: '#9CA3AF',
        }),
        menu: (base: any) => ({
            ...base,
            zIndex: 9999,
        }),
        menuPortal: (base: any) => ({
            ...base,
            zIndex: 9999,
        }),
    });

    const openCount = useMemo(
        () => complaints.filter((item) => !item.isSolve).length,
        [complaints],
    );
    const solvedCount = useMemo(
        () => complaints.filter((item) => item.isSolve).length,
        [complaints],
    );
    const inProgressCount = useMemo(
        () => complaints.filter((item) => item.statusName.toLowerCase().includes('progress')).length,
        [complaints],
    );
    const allVisibleSelected = useMemo(
        () => complaints.length > 0 && complaints.every((item) => selectedComplaintIds.includes(item.id)),
        [complaints, selectedComplaintIds],
    );

    const loadMetadata = async () => {
        const [typeResponse, statusResponse] = await Promise.all([
            axiosInstance.get('/complains/get-complain-types'),
            axiosInstance.get('/complains/get-complain-statuses'),
        ]);

        const types = extractArrayPayload(typeResponse.data)
            .map((entry) => {
                const item = asRecord(entry);
                const id = asNumber(item?.id);
                if (!item || !id) {
                    return null;
                }

                return {
                    id,
                    name: asString(item.name, `Type ${id}`),
                } as ComplainType;
            })
            .filter((item): item is ComplainType => item !== null);

        const statuses = extractArrayPayload(statusResponse.data)
            .map((entry) => {
                const item = asRecord(entry);
                const id = asNumber(item?.id);
                if (!item || !id) {
                    return null;
                }

                return {
                    id,
                    name: asString(item.name, `Status ${id}`),
                } as ComplainStatus;
            })
            .filter((item): item is ComplainStatus => item !== null);

        setComplainTypes(types);
        setComplainStatuses(statuses);
    };

    const loadComplaints = async (nextPage: number, activeFilters: FilterState, nextCountPerPage?: number) => {
        setIsLoading(true);
        setError('');

        // Resolve a safe countPerPage value: prefer explicit arg, then component state, then a sane default
        const resolvedCountPerPage = Number.isFinite(nextCountPerPage as number)
            ? (nextCountPerPage as number)
            : (Number.isFinite(countPerPage) ? countPerPage : 5);

        const currentUserRoleId = getCurrentUserRoleId();
        const currentUserId = getCurrentUserId();

        try {
            const payload: Record<string, unknown> = {
                pageNumber: Math.max(0, nextPage - 1),
                countPerPage: resolvedCountPerPage,
                ...(currentUserId && (currentUserRoleId === ROLE_IDS.CLIENT || currentUserRoleId === ROLE_IDS.MARKET_OWNER)
                    ? { userId: currentUserId }
                    : {}),
            };

            if (activeFilters.search.trim()) {
                payload.search = activeFilters.search.trim();
            }

            if (activeFilters.complainTypeId) {
                payload.complainTypeId = activeFilters.complainTypeId;
            }

            if (activeFilters.complainStatusId) {
                payload.complainStatusId = activeFilters.complainStatusId;
            }

            if (activeFilters.isSolve !== 'all') {
                payload.isSolve = activeFilters.isSolve === 'solved';
            }

            const response = await axiosInstance.post('/complains/get-complains', payload);
            const parsedPage = extractComplaintPage(response.data, nextPage, resolvedCountPerPage);
            const resolvedPageNumber = parsedPage.pageNumber > 0 ? parsedPage.pageNumber : nextPage;
            const apiCountPerPage = parsedPage.countPerPage > 0 ? parsedPage.countPerPage : resolvedCountPerPage;

            setComplaints(parsedPage.items);
            setTotalComplaints(parsedPage.total);
            setPageNumber(resolvedPageNumber);
            setCountPerPage(apiCountPerPage);
        } catch (err) {
            console.error('Complaint loading failed:', err);
            setComplaints([]);
            setTotalComplaints(0);
            setError('Unable to load complaints. Check the API response shape or your session token.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const bootstrap = async () => {
            setIsBootstrapping(true);

            try {
                await loadMetadata();
                await loadComplaints(1, defaultFilters);
            } catch (err) {
                console.error('Complaints manager bootstrap failed:', err);
                setError('Unable to load complaint metadata.');
            } finally {
                setIsBootstrapping(false);
            }
        };

        void bootstrap();
    }, []);

    useEffect(() => {
        if (!editingComplaint && !relatedPartiesModal) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSaving) {
                setEditingComplaint(null);
                setRelatedPartiesModal(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [editingComplaint, relatedPartiesModal, isSaving]);

    const applyFilters = async () => {
        await loadComplaints(1, filters);
    };

    const resetFilters = async () => {
        setFilters(defaultFilters);
        await loadComplaints(1, defaultFilters);
    };

    const handleCountPerPageChange = async (nextCountPerPage: number) => {
        if (!Number.isFinite(nextCountPerPage) || nextCountPerPage <= 0) {
            return;
        }

        setCountPerPage(nextCountPerPage);
        await loadComplaints(1, filters, nextCountPerPage);
    };

    const handleEditClick = (complaint: ComplaintItem) => {
        setEditingComplaint({
            id: complaint.id,
            subject: complaint.subject,
            complain: complaint.complain,
            orderId: complaint.orderId ?? 0,
            orderCode: complaint.orderCode,
            complainTypeId: complaint.typeId,
            isSolve: complaint.isSolve,
        });
    };

    const handleToggleComplaintSelection = (complaintId: number) => {
        setSelectedComplaintIds((previous) => (
            previous.includes(complaintId)
                ? previous.filter((id) => id !== complaintId)
                : [...previous, complaintId]
        ));
    };

    const handleToggleAllVisibleComplaints = () => {
        setSelectedComplaintIds((previous) => {
            if (complaints.length > 0 && complaints.every((item) => previous.includes(item.id))) {
                return previous.filter((id) => !complaints.some((item) => item.id === id));
            }

            const merged = new Set(previous);
            complaints.forEach((item) => merged.add(item.id));
            return Array.from(merged);
        });
    };

    const lookupUserPerson = async (
        userId: number,
        type: RelatedPartyPerson['type'],
        fallbackName = `User #${userId}`,
    ): Promise<RelatedPartyPerson | null> => {
        let defaultUserAddress: Record<string, unknown> | null = null;

        try {
            const userAddressRes = await axiosInstance.get(`/users/get-address-by-id-or-user-id?defaultAddress=true&userId=${userId}`);
            const addresses = userAddressRes.data?.object || userAddressRes.data?.exData || [];
            if (Array.isArray(addresses)) {
                defaultUserAddress = (addresses.find((item: unknown) => Boolean(asRecord(item)?.defaultAddress)) ?? addresses[0] ?? null) as Record<string, unknown> | null;
            }
        } catch {
            defaultUserAddress = null;
        }

        try {
            const userResponse = await axiosInstance.get(`/users/admin/get-user-by-id?id=${userId}`);
            const userById = asRecord(userResponse.data?.object || userResponse.data?.exData || {});
            if (!userById) {
                return null;
            }

            const city = asRecord(defaultUserAddress?.city);
            const resolvedAddress = asString(defaultUserAddress?.address, '')
                ? [asString(defaultUserAddress?.address, ''), asString(city?.name, '')].filter(Boolean).join(', ')
                : asString(userById.address, 'N/A');

            return {
                name: `${asString(userById.firstName, '')} ${asString(userById.lastName, '')}`.trim() || asString(userById.name, fallbackName),
                email: asString(userById.email, ''),
                contact: joinPhones([
                    userById.mobile,
                    userById.phone,
                    userById.whatsapp,
                    defaultUserAddress?.phone,
                    defaultUserAddress?.mobile,
                    defaultUserAddress?.primaryMobile,
                    defaultUserAddress?.secondaryMobile,
                    defaultUserAddress?.whatsapp,
                ]),
                address: resolvedAddress,
                type,
                note: asString(userById.nic, ''),
                firstPhone: toCleanString(userById.mobile || userById.phone || defaultUserAddress?.phone || defaultUserAddress?.mobile || defaultUserAddress?.primaryMobile),
                secondPhone: toCleanString(defaultUserAddress?.secondaryMobile),
                whatsapp: toCleanString(userById.whatsapp || defaultUserAddress?.whatsapp),
            };
        } catch (userError) {
            console.error(`Unable to load user details for user id ${userId}:`, userError);
            return null;
        }
    };

    const lookupComplaintOrderDetails = async (orderCode: string): Promise<ComplaintOrderDetailsResult | null> => {
        const normalizedOrderCode = orderCode.trim();
        if (!normalizedOrderCode || normalizedOrderCode === 'N/A') {
            return null;
        }

        const response = await axiosInstance.post('/orders/get-orders', {
            pageNumber: 0,
            countPerPage: 10,
            orderCode: normalizedOrderCode,
        });

        const payload = extractPayload(response.data);
        const orderItems = extractArrayPayload(payload);
        const firstOrder = asRecord(orderItems[0]);
        if (!firstOrder) {
            return null;
        }

        const marketOrder = asRecord(firstOrder?.marketOrder);
        const marketOrderId = asNumber(marketOrder?.id) ?? asNumber(firstOrder.marketOrderId);
        const deliveryTo = asRecord(firstOrder?.deliveryTo);
        const orderUser = asRecord(firstOrder?.user);
        const orderCodePayload = asRecord(firstOrder?.orderCode);
        const orderCodeUser = asRecord(orderCodePayload?.users);
        const deliveryCity = asRecord(deliveryTo?.city);
        const deliveryStatus = asRecord(firstOrder.deliveryStatus);
        const paymentStatus = asRecord(firstOrder.paymentStatus);
        const paymentType = asRecord(firstOrder.paymentType);

        const orderSnapshot: ComplaintOrderSnapshot = {
            orderCode: asString(orderCodePayload?.code, normalizedOrderCode),
            customerName: asString(deliveryTo?.fullName, asString(orderUser?.name, 'N/A')),
            contact: asString(deliveryTo?.primaryMobile, '') || asString(deliveryTo?.secondaryMobile, '') || asString(deliveryTo?.whatsapp, 'N/A'),
            address: [asString(deliveryTo?.address, ''), asString(deliveryCity?.name, '')].filter(Boolean).join(', ') || 'N/A',
            city: asString(deliveryCity?.name, 'N/A'),
            location: asString(deliveryTo?.location, '') || asString(deliveryTo?.googleMapLocation, ''),
            primaryMobile: asString(deliveryTo?.primaryMobile, ''),
            secondaryMobile: asString(deliveryTo?.secondaryMobile, ''),
            whatsapp: asString(deliveryTo?.whatsapp, ''),
            status: asString(deliveryStatus?.name, 'N/A'),
            paymentStatus: asString(paymentStatus?.name, 'N/A'),
            paymentType: asString(paymentType?.name, 'N/A'),
            totalPrice: asNumber(firstOrder.totalPrice),
            deliveryFee: asNumber(firstOrder.deliveryFee),
            qty: asNumber(firstOrder.qty),
            createdAt: asString(firstOrder.createdAt, '') || asString(firstOrder.createdDate, ''),
            note: asString(firstOrder.desc, '') || asString(firstOrder.note, ''),
        };

        const thirdParty = asRecord(firstOrder.thirdPartySenders);
        const hasThirdPartySender = Boolean(
            toCleanString(thirdParty?.name) ||
            toCleanString(thirdParty?.address) ||
            toCleanString(thirdParty?.first_mob) ||
            toCleanString(thirdParty?.sec_mob) ||
            toCleanString(thirdParty?.whatsapp),
        );

        const owner: RelatedPartyPerson | null = deliveryTo
            ? {
                name: asString(deliveryTo.fullName, 'N/A'),
                contact: joinPhones([deliveryTo.primaryMobile, deliveryTo.secondaryMobile, deliveryTo.whatsapp]),
                address: [asString(deliveryTo.address, ''), asString(deliveryCity?.name, '')].filter(Boolean).join(', ') || 'N/A',
                type: 'client',
                firstPhone: toCleanString(deliveryTo.primaryMobile),
                secondPhone: toCleanString(deliveryTo.secondaryMobile),
                whatsapp: toCleanString(deliveryTo.whatsapp),
                note: asString(deliveryTo.location, '') || asString(deliveryTo.googleMapLocation, ''),
            }
            : null;
        const senderUserId = asNumber(orderCodeUser?.id) ?? asNumber(orderUser?.id) ?? asNumber(firstOrder.userId);

        let resolvedSender: RelatedPartyPerson | null = null;

        if (hasThirdPartySender) {
            resolvedSender = {
                name: asString(thirdParty?.name, 'N/A'),
                contact: joinPhones([thirdParty?.first_mob, thirdParty?.sec_mob, thirdParty?.whatsapp]),
                address: asString(thirdParty?.address, 'N/A'),
                type: 'third_party',
                note: asString(thirdParty?.note, ''),
                firstPhone: toCleanString(thirdParty?.first_mob),
                secondPhone: toCleanString(thirdParty?.sec_mob),
                whatsapp: toCleanString(thirdParty?.whatsapp),
            };
        }

        if (!resolvedSender && marketOrderId) {
            try {
                const marketDetails = await lookupMarketDetails(marketOrderId);
                if (marketDetails?.raw) {
                    const marketPayload = marketDetails.raw;
                    resolvedSender = {
                        name: asString(marketPayload.name, 'Market'),
                        email: asString(asRecord(marketPayload.users)?.email, ''),
                        contact: formatMarketPhones(marketPayload),
                        address: asString(marketPayload.address, asString(marketPayload.location, 'N/A')),
                        type: 'market',
                        note: asString(marketPayload.infoMessage, asString(marketPayload.desc, '')),
                        firstPhone: toCleanString(marketPayload.first_num),
                        secondPhone: toCleanString(marketPayload.second_num),
                        whatsapp: toCleanString(marketPayload.whats_app),
                    };
                }
            } catch (marketError) {
                console.error('Unable to load sender market details:', marketError);
            }
        }

        if (!resolvedSender && senderUserId) {
            resolvedSender = await lookupUserPerson(senderUserId, 'client', `Client #${senderUserId}`);
        }

        return {
            filer: resolvedSender,
            owner,
            order: orderSnapshot,
            marketOrderId,
        };
    };

    const buildRelatedPartiesModal = (
        complaint: ComplaintItem,
        filerOverride?: Partial<RelatedPartiesModalState['filer']>,
    ): RelatedPartiesModalState => ({
        complaintId: complaint.id,
        subject: complaint.subject,
        complain: complaint.complain,
        complainType: complaint.typeName,
        relatedCode: complaint.orderCode,
        relatedKind: complaint.orderCode.toUpperCase().startsWith('UJC') ? 'urgent_job' : complaint.orderCode.toUpperCase().startsWith('ORD') ? 'order' : 'unknown',
        filer: {
            name: complaint.userName,
            ...(complaint.userEmail && complaint.userEmail !== 'N/A' ? { email: complaint.userEmail } : {}),
            contact: 'N/A',
            address: 'N/A',
            type: 'complainant',
            ...filerOverride,
        },
        owner: null,
        order: null,
        urgentJob: null,
        deliveryTimeline: [],
        market: null,
    });

    const lookupMarketDetails = async (marketOrderId: number): Promise<MarketDetailsLookupResult | null> => {
        if (!marketOrderId || marketOrderId <= 0) {
            return null;
        }

        const response = await axiosInstance.get(
            `/markets/get-markets-details-by-market-order-id?marketOrderId=${marketOrderId}`,
        );

        const payload = extractPayload(response.data);
        const marketUser = asRecord(payload.users);
        const marketCategory = asRecord(payload.marketCategory);

        const manager =
            `${asString(marketUser?.firstName, '')} ${asString(marketUser?.lastName, '')}`.trim() ||
            asString(marketUser?.name, '') ||
            (asNumber(marketUser?.id) ? `User #${asNumber(marketUser?.id)}` : 'N/A');

        return {
            name: asString(payload.name, 'N/A'),
            manager,
            ownerEmail: asString(marketUser?.email, 'N/A'),
            location: asString(payload.location, 'N/A'),
            address: asString(payload.address, 'N/A'),
            category: asString(marketCategory?.name, 'N/A'),
            firstPhone: toCleanString(payload.first_num),
            secondPhone: toCleanString(payload.second_num),
            whatsapp: toCleanString(payload.whats_app),
            description: asString(payload.desc, ''),
            note: asString(payload.infoMessage, '') || asString(payload.desc, ''),
            isActive: typeof payload.isActive === 'boolean' ? payload.isActive : null,
            raw: payload,
        };
    };

    const lookupUrgentJobDetails = async (jobCode: string): Promise<ComplaintUrgentJobSnapshot | null> => {
        const normalizedJobCode = jobCode.trim();
        if (!normalizedJobCode || normalizedJobCode === 'N/A') {
            return null;
        }

        const response = await axiosInstance.post('/urgent-jobs/get-urgent-jobs', {
            pageNumber: 0,
            countPerPage: 100,
            jobCode: normalizedJobCode,
            search: normalizedJobCode,
        });

        const jobItems = extractArrayPayload(response.data);
        const rawJob =
            jobItems
                .map((entry) => asRecord(entry))
                .find((entry) => {
                    const code = asString(entry?.jobCode, '') || asString(entry?.code, '');
                    return code.toUpperCase() === normalizedJobCode.toUpperCase();
                }) ??
            asRecord(jobItems[0]);
        if (!rawJob) {
            return null;
        }

        const checkpointsSource =
            (Array.isArray(rawJob.items) && rawJob.items) ||
            (Array.isArray(rawJob.missions) && rawJob.missions) ||
            (Array.isArray(rawJob.checkpoints) && rawJob.checkpoints) ||
            [];

        const checkpoints = checkpointsSource
            .map((entry, index) => {
                const checkpoint = asRecord(entry);
                if (!checkpoint) return null;

                return {
                    id: asString(checkpoint.id, '') || asString(checkpoint.jobItemId, '') || `checkpoint-${index + 1}`,
                    task: asString(checkpoint.task, '') || asString(checkpoint.name, '') || asString(checkpoint.title, `Checkpoint ${index + 1}`),
                    location: asString(checkpoint.locationAddress, '') || asString(checkpoint.location, '') || asString(checkpoint.address, 'Location not available'),
                    scheduledAt: formatDateTime(asString(checkpoint.beAt, '') || asString(checkpoint.scheduledAt, '') || asString(checkpoint.expectedAt, '')),
                    expectedTimeDuration: asNumber(checkpoint.expectedTimeDuration) ?? asNumber(checkpoint.duration) ?? asNumber(checkpoint.expectedMinutes),
                };
            })
            .filter((item): item is ComplaintUrgentJobCheckpoint => item !== null);

        const status =
            asString(asRecord(rawJob.status)?.name, '') ||
            asString(asRecord(rawJob.jobStatus)?.name, '') ||
            asString(asRecord(rawJob.urgentJobStatus)?.name, '') ||
            asString(rawJob.status, '') ||
            asString(rawJob.state, 'Pending');

        return {
            id: asString(rawJob.id, '') || asString(rawJob.urgentJobId, '') || normalizedJobCode,
            jobCode: asString(rawJob.jobCode, '') || asString(rawJob.code, normalizedJobCode),
            job: asString(rawJob.job, '') || asString(rawJob.title, '') || asString(rawJob.name, 'Urgent Job'),
            description: asString(rawJob.decs, '') || asString(rawJob.desc, '') || asString(rawJob.description, '') || asString(rawJob.note, 'No job description available.'),
            status,
            clientName: asString(rawJob.username, '') || asString(rawJob.userName, '') || asString(rawJob.customerName, 'Unknown client'),
            mobile: asString(rawJob.mobile, '') || asString(rawJob.phone, '') || asString(rawJob.primaryMobile, 'N/A'),
            email: asString(rawJob.email, '') || asString(rawJob.customerEmail, 'N/A'),
            nic: asString(rawJob.nic, '') || asString(rawJob.nationalId, ''),
            vehicle:
                asString(asRecord(rawJob.vehicleType)?.name, '') ||
                asString(asRecord(rawJob.vehicle)?.name, '') ||
                asString(rawJob.vehicleName, '') ||
                asString(rawJob.vehicleTypeName, 'Unassigned'),
            cost: asNumber(rawJob.cost) ?? asNumber(rawJob.price) ?? asNumber(rawJob.totalPrice),
            tripDistance: asNumber(rawJob.trip) ?? asNumber(rawJob.distance) ?? asNumber(rawJob.tripDistance),
            createdAt: asString(rawJob.createdAt, '') || asString(rawJob.createdDate, '') || asString(rawJob.createdOn, ''),
            scheduledAt: asString(rawJob.scheduledAt, '') || asString(rawJob.startAt, '') || checkpoints[0]?.scheduledAt || '',
            checkpoints,
        };
    };

    const lookupDeliveryTimeline = async (orderCode: string): Promise<DeliveryTimelineItem[]> => {
        const normalizedOrderCode = orderCode.trim();
        if (!normalizedOrderCode || normalizedOrderCode === 'N/A') {
            return [];
        }

        const historyResponse = await axiosInstance.get(
            `/orders/get-delivery-history-by-order-code-or-id?orderCode=${encodeURIComponent(normalizedOrderCode)}`,
        );

        const historyItems = extractArrayPayload(historyResponse.data);

        const timeline = await Promise.all(historyItems.map(async (item, index) => {
            const historyEntry = asRecord(item);
            const employeeStub = asRecord(historyEntry?.employees);
            const employeeId = asNumber(employeeStub?.id);
            const location = asString(employeeStub?.location, 'N/A');
            const deliveryStatus = asRecord(historyEntry?.deliveryStatus);
            let employeePayload: Record<string, unknown> | null = null;

            if (employeeId) {
                try {
                    const employeeResponse = await axiosInstance.get(`/employees/get-user-by-employee-id?id=${employeeId}`);
                    employeePayload = extractPayload(employeeResponse.data);
                } catch (employeeError) {
                    console.error(`Unable to load employee details for employee id ${employeeId}:`, employeeError);
                }
            }

            const firstName = asString(employeePayload?.firstName, '');
            const lastName = asString(employeePayload?.lastName, '');
            const fullName = `${firstName} ${lastName}`.trim();

            return {
                id: asNumber(historyEntry?.id) ?? index + 1,
                status: asString(deliveryStatus?.name, 'Unknown Status'),
                assignedAt: formatDateTime(asString(historyEntry?.createdAt, '')),
                name: fullName || asString(employeePayload?.name, '') || (employeeId ? `Employee #${employeeId}` : 'Unassigned'),
                note: historyEntry?.note == null ? null : asString(historyEntry?.note, ''),
                location,
            } as DeliveryTimelineItem;
        }));

        return timeline;
    };

    const handleOpenRelatedParties = async (complaint: ComplaintItem) => {
        setRelatedPartiesError('');
        setIsLoadingRelatedParties(true);
        setRelatedPartiesModal(buildRelatedPartiesModal(complaint));

        try {
            const normalizedCode = complaint.orderCode.trim().toUpperCase();

            if (normalizedCode.startsWith('UJC')) {
                const urgentJob = await lookupUrgentJobDetails(complaint.orderCode);

                setRelatedPartiesModal((previous) => {
                    if (!previous || previous.complaintId !== complaint.id) {
                        return previous;
                    }

                    return {
                        ...previous,
                        relatedKind: 'urgent_job',
                        urgentJob,
                        filer: urgentJob
                            ? {
                                ...previous.filer,
                                name: urgentJob.clientName,
                                email: urgentJob.email !== 'N/A' ? urgentJob.email : previous.filer.email,
                                contact: urgentJob.mobile,
                                address: urgentJob.checkpoints[0]?.location || 'N/A',
                                type: 'urgent_job_client',
                                note: urgentJob.nic ? `NIC: ${urgentJob.nic}` : '',
                            }
                            : previous.filer,
                    };
                });

                if (!urgentJob) {
                    setRelatedPartiesError('Urgent job details were not found. Showing complaint profile data instead.');
                }
                return;
            }

            const [orderDetailsResult, timelineResult] = await Promise.allSettled([
                lookupComplaintOrderDetails(complaint.orderCode),
                lookupDeliveryTimeline(complaint.orderCode),
            ]);

            const orderDetails = orderDetailsResult.status === 'fulfilled' ? orderDetailsResult.value : null;
            const filerDetails = orderDetails?.filer ?? null;
            const ownerDetails = orderDetails?.owner ?? null;
            const orderSnapshot = orderDetails?.order ?? null;
            const deliveryTimeline = timelineResult.status === 'fulfilled' ? timelineResult.value : [];

            let marketDetails: MarketDetailsLookupResult | null = null;

            if (orderDetails?.marketOrderId) {
                try {
                    marketDetails = await lookupMarketDetails(orderDetails.marketOrderId);
                } catch (marketError) {
                    console.error('Related parties market lookup failed:', marketError);
                }
            }

            if (orderDetailsResult.status === 'rejected') {
                console.error('Related parties order lookup failed:', orderDetailsResult.reason);
            }
            if (timelineResult.status === 'rejected') {
                console.error('Related parties delivery timeline lookup failed:', timelineResult.reason);
            }

            setRelatedPartiesModal((previous) => {
                if (!previous || previous.complaintId !== complaint.id) {
                    return previous;
                }

                return {
                    ...previous,
                    filer: filerDetails
                        ? {
                            ...previous.filer,
                            ...filerDetails,
                            ...(filerDetails.email || previous.filer.email
                                ? { email: filerDetails.email || previous.filer.email }
                                : {}),
                        }
                        : previous.filer,
                    owner: ownerDetails,
                    order: orderSnapshot,
                    deliveryTimeline,
                    market: marketDetails ? {
                        name: marketDetails.name,
                        manager: marketDetails.manager,
                        ownerEmail: marketDetails.ownerEmail,
                        location: marketDetails.location,
                        address: marketDetails.address,
                        category: marketDetails.category,
                        firstPhone: marketDetails.firstPhone,
                        secondPhone: marketDetails.secondPhone,
                        whatsapp: marketDetails.whatsapp,
                        description: marketDetails.description,
                        note: marketDetails.note,
                        isActive: marketDetails.isActive,
                    } : null,
                };
            });

            if (!filerDetails) {
                setRelatedPartiesError('Filer details were not found for this order. Showing complaint profile data instead.');
            }
        } catch (err) {
            console.error('Related parties lookup failed:', err);
            setRelatedPartiesError('Unable to load party details right now. Showing complaint profile data instead.');
        } finally {
            setIsLoadingRelatedParties(false);
        }
    };

    const handleCopyRelatedCode = async (orderCode: string) => {
        const code = orderCode.trim();
        if (!code || code === 'N/A') {
            await swalAlert('No code to copy', 'This complaint does not have a related order or urgent job code.', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(code);
            await Swal.fire({
                title: 'Code copied',
                text: `${code} has been copied to clipboard.`,
                icon: 'success',
                timer: 1400,
                showConfirmButton: false,
            });
        } catch (copyError) {
            console.error('Failed to copy related code:', copyError);
            await swalAlert('Copy failed', 'Unable to copy the code to clipboard.', 'error');
        }
    };

    const handleDeleteComplaint = async (complaint: ComplaintItem) => {
        if (!canDeleteComplaints) return;

        const result = await Swal.fire({
            title: 'Delete complaint?',
            text: `Complaint #${complaint.id} will be removed from the current queue view.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete complaint',
            cancelButtonText: 'Keep complaint',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        setComplaints((previous) => previous.filter((item) => item.id !== complaint.id));
        setSelectedComplaintIds((previous) => previous.filter((id) => id !== complaint.id));
        setTotalComplaints((previous) => Math.max(0, previous - 1));

        await swalAlert('Complaint removed', `Complaint #${complaint.id} was removed from the queue.`, 'success');
    };

    const submitUpdate = async () => {
        if (!editingComplaint) {
            return;
        }

        if (!editingComplaint.subject.trim() || !editingComplaint.complain.trim()) {
            await swalAlert('Missing details', 'Subject and complain text are required.', 'warning');
            return;
        }

        if (editingComplaint.subject.trim().length > 100) {
            await swalAlert('Subject too long', 'Subject must be 100 characters or fewer.', 'warning');
            return;
        }

        if (!editingComplaint.orderId || !editingComplaint.complainTypeId) {
            await swalAlert('Missing fields', 'Order ID and complain type are required.', 'warning');
            return;
        }

        const selectedType = complainTypes.find((type) => type.id === editingComplaint.complainTypeId);
        if (!selectedType) {
            await swalAlert('Invalid type', 'Select a valid complain type before saving.', 'warning');
            return;
        }

        setIsSaving(true);

        try {
            await axiosInstance.put('/complains/update-complain', {
                id: editingComplaint.id,
                subject: editingComplaint.subject.trim(),
                complain: editingComplaint.complain.trim(),
                isSolve: editingComplaint.isSolve,
                complainType: {
                    id: selectedType.id,
                    name: selectedType.name,
                },
                orderId: editingComplaint.orderId,
            });

            setEditingComplaint(null);
            await loadComplaints(pageNumber, filters);
            await swalAlert('Complaint updated', 'The complaint record was updated successfully.', 'success');
        } catch (err) {
            console.error('Complaint update failed:', err);
            await swalAlert('Update failed', 'Unable to update the complaint right now.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusClasses = (statusName: string, isSolve: boolean) => {
        if (isSolve || statusName.toLowerCase().includes('resolve')) {
            return 'bg-green-100 text-green-700 border-green-200';
        }

        if (statusName.toLowerCase().includes('progress')) {
            return 'bg-blue-100 text-blue-700 border-blue-200';
        }

        if (statusName.toLowerCase().includes('reject')) {
            return 'bg-red-100 text-red-700 border-red-200';
        }

        return 'bg-amber-100 text-amber-700 border-amber-200';
    };

    const activeFilters = useMemo(() => {
        const chips: { label: string; onRemove: () => void }[] = [];
        if (filters.search) chips.push({ label: `Search: "${filters.search}"`, onRemove: () => setFilters((prev) => ({ ...prev, search: '' })) });
        if (filters.complainTypeId) {
            const typeName = complainTypes.find((t) => t.id === filters.complainTypeId)?.name || `Type ${filters.complainTypeId}`;
            chips.push({ label: `Type: ${typeName}`, onRemove: () => setFilters((prev) => ({ ...prev, complainTypeId: 0 })) });
        }
        if (filters.complainStatusId) {
            const statusName = complainStatuses.find((s) => s.id === filters.complainStatusId)?.name || `Status ${filters.complainStatusId}`;
            chips.push({ label: `Status: ${statusName}`, onRemove: () => setFilters((prev) => ({ ...prev, complainStatusId: 0 })) });
        }
        return chips;
    }, [filters, complainTypes, complainStatuses]);

    const [showAdvanced, setShowAdvanced] = useState(false);

    const showingRange = useMemo(() => {
        if (complaints.length === 0) {
            return { from: 0, to: 0 };
        }

        const from = (pageNumber - 1) * countPerPage + 1;
        const to = Math.min(totalComplaints, pageNumber * countPerPage);
        return { from, to };
    }, [complaints.length, pageNumber, countPerPage, totalComplaints]);

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="mb-6">
                <div className="flex flex-col gap-2 mb-6">
                    <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
                        Complaints Management
                    </h1>
                    <p className="text-gray-600 text-sm md:text-base">
                        Review submitted complaints, filter by type and status, and update complaint records.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Total Complaints</p>
                                <p className="text-3xl font-black text-gray-900 mt-1">{totalComplaints}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Open</p>
                                <p className="text-3xl font-black text-gray-900 mt-1">{openCount}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                <ClockIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">In Progress</p>
                                <p className="text-3xl font-black text-gray-900 mt-1">{inProgressCount}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <TruckIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Solved</p>
                                <p className="text-3xl font-black text-emerald-700 mt-1">{solvedCount}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <CheckCircleIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            value={filters.search}
                            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                            placeholder="Search by complaint subject, text, or order code..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm md:text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Complaint Type</label>
                            <Select<SelectOption<number>, false>
                                value={complainTypeOptions.find((option) => option.value === filters.complainTypeId) ?? null}
                                onChange={(option) => setFilters((prev) => ({ ...prev, complainTypeId: option ? option.value : 0 }))}
                                options={complainTypeOptions}
                                placeholder="All types"
                                styles={getCustomSelectStyles(false)}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Status</label>
                            <Select<SelectOption<number>, false>
                                value={complainStatusOptions.find((option) => option.value === filters.complainStatusId) ?? null}
                                onChange={(option) => setFilters((prev) => ({ ...prev, complainStatusId: option ? option.value : 0 }))}
                                options={complainStatusOptions}
                                placeholder="All statuses"
                                styles={getCustomSelectStyles(false)}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Solve Status</label>
                            <Select<SelectOption<number>, false>
                                value={complainStatusOptions.find((option) => option.value === filters.complainStatusId) ?? null}
                                onChange={(option) => setFilters((prev) => ({ ...prev, complainStatusId: option ? option.value : 0 }))}
                                options={complainStatusOptions}
                                placeholder="All statuses"
                                styles={getCustomSelectStyles(false)}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            />
                            {/* <select
                                value={filters.isSolve}
                                onChange={(e) => setFilters((prev) => ({ ...prev, isSolve: e.target.value as 'all' | 'open' | 'solved' }))}
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                            >
                                <option value="all">All Complaints</option>
                                <option value="open">Open</option>
                                <option value="solved">Solved</option>
                            </select> */}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => void applyFilters()}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
                        >
                            <FunnelIcon className="w-4 h-4" />
                            Apply Filters
                        </button>
                        <button
                            onClick={() => loadComplaints(pageNumber, filters)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowAdvanced(prev => !prev)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${showAdvanced
                                ? 'border-[#F59B0F] bg-orange-50 text-[#D17F0A]'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:border-[#F59B0F]'
                                }`}
                        >
                            <FunnelIcon className="w-4 h-4" />
                            More Options
                            {showAdvanced ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            onClick={() => void resetFilters()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
                        >
                            Reset Filters
                        </button>
                    </div>

                    {activeFilters.length > 0 && (
                        <div className="border-t border-gray-100 pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Active:</span>
                                {activeFilters.map((chip) => (
                                    <span
                                        key={chip.label}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 ring-1 ring-orange-200"
                                    >
                                        {chip.label}
                                        <button
                                            onClick={chip.onRemove}
                                            title={`Remove ${chip.label}`}
                                            className="hover:text-orange-600 transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="text-sm text-gray-700">
                            {isLoading || isBootstrapping ? (
                                <span className="text-gray-500">Loading...</span>
                            ) : (
                                <>
                                    Showing <span className="font-bold text-gray-900">{showingRange.from}</span> to{' '}
                                    <span className="font-bold text-gray-900">{showingRange.to}</span> of{' '}
                                    <span className="font-bold text-gray-900">{totalComplaints}</span> complaints
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 font-medium">Per page:</span>
                                <select
                                    value={countPerPage}
                                    onChange={(event) => void handleCountPerPageChange(Number(event.target.value))}
                                    aria-label="Rows per page"
                                    title="Rows per page"
                                    className="px-3 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 font-semibold text-sm focus:outline-none focus:border-[#F59B0F]"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => void loadComplaints(pageNumber - 1, filters)}
                                    disabled={pageNumber <= 1 || isLoading}
                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                                    title="Previous page"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                                </button>
                                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                                    {pageNumber} / {totalPages}
                                </div>
                                <button
                                    onClick={() => void loadComplaints(pageNumber + 1, filters)}
                                    disabled={pageNumber >= totalPages || isLoading}
                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                                    title="Next page"
                                >
                                    <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
                    <p className="font-bold">Error loading complaints</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={handleToggleAllVisibleComplaints}
                                        aria-label="Select all visible complaints"
                                        className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                                    />
                                </th>
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Subject</th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Related Code</th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Type</th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Updated</th>
                                <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(isLoading || isBootstrapping) && complaints.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                                            <p className="text-gray-600">Loading complaints...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : complaints.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                                                <ChatBubbleLeftRightIcon className="w-10 h-10 text-[#F59B0F]" />
                                            </div>
                                            <p className="text-xl font-black text-gray-900 mb-2">No complaints found</p>
                                            <p className="text-gray-600 mb-6">Try adjusting the filters or check back later</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                complaints.map((complaint) => (
                                    <tr key={complaint.id} className="hover:bg-orange-50/40 transition-colors">
                                        <td className="py-4 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedComplaintIds.includes(complaint.id)}
                                                onChange={() => handleToggleComplaintSelection(complaint.id)}
                                                aria-label={`Select complaint ${complaint.id}`}
                                                className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                                            />
                                        </td>
                                        <td className="py-4 px-4 font-bold text-gray-900">{complaint.subject} </td>
                                        <td className="py-4 px-4 text-sm text-gray-700 text-center">
                                            <div className="inline-flex max-w-48 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                                                <span className="truncate font-semibold text-slate-800" title={complaint.orderCode}>{complaint.orderCode}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleCopyRelatedCode(complaint.orderCode)}
                                                    className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-white hover:text-[#8f5515]"
                                                    title="Copy related code"
                                                    aria-label={`Copy ${complaint.orderCode}`}
                                                >
                                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-700 text-center font-semibold">{complaint.typeName}</td>
                                        <td className="py-4 px-4 text-center">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusClasses(
                                                    complaint.statusName,
                                                    complaint.isSolve
                                                )}`}
                                            >
                                                {complaint.statusName}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600 text-center">
                                            {formatDateTime(complaint.updatedAt || complaint.createdAt)}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditClick(complaint)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#F59B0F] hover:text-[#8f5515]"
                                                    title="Edit complaint"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleOpenRelatedParties(complaint)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-[#8f5515] transition hover:border-[#F59B0F] hover:bg-orange-100"
                                                    title="View related parties"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </button>
                                                <Menu as="div" className="relative">
                                                    <MenuButton className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-gray-600 transition hover:border-[#F59B0F] hover:text-[#8f5515]">
                                                        <EllipsisVerticalIcon className="h-5 w-5" />
                                                    </MenuButton>
                                                    <MenuItems
                                                        anchor="bottom end"
                                                        className="z-70 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl outline-none"
                                                    >
                                                        {canDeleteComplaints ? (
                                                            <MenuItem>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void handleDeleteComplaint(complaint)}
                                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition data-focus:bg-red-50"
                                                                >
                                                                    <TrashIcon className="h-4 w-4" />
                                                                    Delete complaint
                                                                </button>
                                                            </MenuItem>
                                                        ) : (
                                                            <div className="px-3 py-2 text-xs font-semibold text-gray-400">No more actions</div>
                                                        )}
                                                    </MenuItems>
                                                </Menu>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingComplaint && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-70 flex items-center justify-center bg-gray-900/55 p-4"
                    onClick={() => {
                        if (!isSaving) {
                            setEditingComplaint(null);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="update-complaint-title"
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="border-b border-gray-200 bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] px-6 py-5 text-white sm:px-8">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 id="update-complaint-title" className="text-xl font-bold">
                                        Update Complaint
                                    </h3>
                                    <p className="mt-1 text-sm text-white/90">Editing complaint #{editingComplaint.id}</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setEditingComplaint(null)}
                                    className="rounded-xl border border-white/25 bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 px-6 py-6 sm:px-8">
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-gray-700">Subject</span>
                                <input
                                    value={editingComplaint.subject}
                                    onChange={(event) => setEditingComplaint((prev) => prev ? { ...prev, subject: event.target.value } : prev)}
                                    maxLength={100}
                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                                />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-gray-700">Complaint Type</span>
                                    <Select<SelectOption<number>, false>
                                        value={complainTypeOptions.find((option) => option.value === editingComplaint.complainTypeId) ?? null}
                                        onChange={(option) => setEditingComplaint((prev) => prev ? { ...prev, complainTypeId: option ? option.value : 0 } : prev)}
                                        options={complainTypeOptions}
                                        placeholder="Select complaint type"
                                        isDisabled
                                        styles={getCustomSelectStyles(false)}
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-gray-700">Order Code</span>
                                    <input
                                        type="text"
                                        value={editingComplaint.orderCode}
                                        readOnly
                                        disabled
                                        className="w-full cursor-not-allowed rounded-xl border-2 border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500 outline-none"
                                    />
                                </label>
                            </div>

                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-gray-700">Complaint Text</span>
                                <textarea
                                    value={editingComplaint.complain}
                                    onChange={(event) => setEditingComplaint((prev) => prev ? { ...prev, complain: event.target.value } : prev)}
                                    rows={7}
                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                                />
                            </label>

                            <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Mark as solved</p>
                                    <p className="mt-1 text-xs text-gray-500">Update the solve status when resolving.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={editingComplaint.isSolve}
                                    onChange={(event) => setEditingComplaint((prev) => prev ? { ...prev, isSolve: event.target.checked } : prev)}
                                    className="h-5 w-5 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                                />
                            </label>

                            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setEditingComplaint(null)}
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#F59B0F] hover:text-[#8f5515] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => void submitUpdate()}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f2937] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSaving ? (
                                        <ClockIcon className="h-4 w-4" />
                                    ) : (
                                        <CheckCircleIcon className="h-4 w-4" />
                                    )}
                                    {isSaving ? 'Saving Changes...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {relatedPartiesModal && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
                    onClick={() => {
                        if (!isLoadingRelatedParties) {
                            setRelatedPartiesModal(null);
                            setRelatedPartiesError('');
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="related-parties-title"
                        className="flex max-h-[92vh] w-[95vw] max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-[#F8FAFC] shadow-[0_30px_70px_rgba(15,23,42,0.35)] sm:w-full"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="shrink-0 border-b border-white/20 bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] px-5 py-5 text-white sm:px-8">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 p-2.5 shadow-inner ring-1 ring-white/30 backdrop-blur-md sm:h-14 sm:w-14">
                                        <UsersIcon className="h-full w-full text-white drop-shadow-md" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] text-[10px] font-bold uppercase tracking-[0.14em] text-white/95 sm:text-xs">
                                            Complaint #{relatedPartiesModal.complaintId}
                                        </div>
                                        <h3 id="related-parties-title" className="text-xl font-black leading-tight sm:text-2xl drop-shadow-md">
                                            Related Parties
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-white/90 sm:text-sm drop-shadow-sm">
                                            <span className="truncate">{relatedPartiesModal.complainType}</span>
                                            <span className="h-1 w-1 rounded-full bg-white/50"></span>
                                            <span className="max-w-50 truncate sm:max-w-md hidden xs:inline">{relatedPartiesModal.subject}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRelatedPartiesModal(null);
                                        setRelatedPartiesError('');
                                    }}
                                    disabled={isLoadingRelatedParties}
                                    className="rounded-xl border border-white/30 bg-white/10 p-2 text-white shadow-sm transition hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="relative flex-1 overflow-y-auto px-5 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
                            {isLoadingRelatedParties ? (
                                <div className="flex min-h-87.5 w-full flex-col items-center justify-center py-12">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 animate-ping rounded-full border-4 border-orange-100 opacity-20 drop-shadow-xl h-16 w-16 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                                        <ArrowPathIcon className="relative z-10 h-12 w-12 animate-spin text-orange-500 drop-shadow-md" />
                                    </div>
                                    <p className="text-base font-bold text-slate-800 tracking-wide uppercase">Assembling Details...</p>
                                    <p className="max-w-65 text-center text-xs font-medium text-slate-500 mt-2">
                                        Retrieving complaint, sender, order, or urgent job details from the database securely.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {relatedPartiesError && (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                                            {relatedPartiesError}
                                        </div>
                                    )}

                                    {/* Snapshot Banner */}
                                    <div className="rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
                                        <p className="font-bold text-slate-900 tracking-wide">Investigation Snapshot</p>
                                        <p className="mt-1 text-sm text-slate-500 font-medium">
                                            Review the complaint, linked {relatedPartiesModal.relatedKind === 'urgent_job' ? 'urgent job' : 'order'}, sender, and operational references for faster resolution.
                                        </p>
                                    </div>

                                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Complaint Details</p>
                                                <h4 className="mt-1 text-lg font-black text-slate-900">{relatedPartiesModal.subject}</h4>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">{relatedPartiesModal.complainType}</p>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-700">
                                                {relatedPartiesModal.relatedCode}
                                            </span>
                                        </div>
                                        <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{relatedPartiesModal.complain}</p>
                                    </section>

                                    {relatedPartiesModal.order && (
                                        <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm ring-1 ring-indigo-50">
                                            <div className="mb-4 flex items-center gap-3 border-b border-indigo-50 pb-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                                                    <TruckIcon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black tracking-wide text-slate-900">Order Details</p>
                                                    <p className="text-xs font-medium text-slate-500">Order time, payment, totals, and DeliveryTo snapshot</p>
                                                </div>
                                            </div>
                                            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Order Time</p>
                                                    <p className="mt-1 font-bold text-slate-900">{formatDateTime(relatedPartiesModal.order.createdAt)}</p>
                                                    <p className="text-xs font-semibold text-slate-600">{relatedPartiesModal.order.status}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Payment</p>
                                                    <p className="mt-1 font-bold text-slate-900">{relatedPartiesModal.order.paymentStatus}</p>
                                                    <p className="text-xs font-semibold text-slate-600">{relatedPartiesModal.order.paymentType}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Total</p>
                                                    <p className="mt-1 font-bold text-slate-900">{formatCurrency(relatedPartiesModal.order.totalPrice)}</p>
                                                    <p className="text-xs font-semibold text-slate-600">Delivery: {formatCurrency(relatedPartiesModal.order.deliveryFee)}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Quantity</p>
                                                    <p className="mt-1 font-bold text-slate-900">{relatedPartiesModal.order.qty ?? 'N/A'}</p>
                                                </div>
                                                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 sm:col-span-2 lg:col-span-4">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-500">DeliveryTo Details</p>
                                                            <p className="mt-1 font-black text-slate-900">{relatedPartiesModal.order.customerName}</p>
                                                            <p className="mt-1 text-sm font-medium text-slate-700">{relatedPartiesModal.order.address}</p>
                                                            {relatedPartiesModal.order.location && (
                                                                <p className="mt-1 text-xs font-semibold text-sky-700">{relatedPartiesModal.order.location}</p>
                                                            )}
                                                        </div>
                                                        <div className="min-w-50 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                                                            <p>Primary: {relatedPartiesModal.order.primaryMobile || 'N/A'}</p>
                                                            <p>Secondary: {relatedPartiesModal.order.secondaryMobile || 'N/A'}</p>
                                                            <p className="text-emerald-700">WhatsApp: {relatedPartiesModal.order.whatsapp || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {relatedPartiesModal.urgentJob && (
                                        <section className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm ring-1 ring-red-50">
                                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-red-50 pb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                                                        <ClockIcon className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black tracking-wide text-slate-900">Urgent Job Details</p>
                                                        <p className="text-xs font-medium text-slate-500">No delivery timeline is available for urgent jobs</p>
                                                    </div>
                                                </div>
                                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-red-700">
                                                    {relatedPartiesModal.urgentJob.status}
                                                </span>
                                            </div>
                                            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:col-span-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Job</p>
                                                    <p className="mt-1 font-bold text-slate-900">{relatedPartiesModal.urgentJob.job}</p>
                                                    <p className="mt-1 text-xs font-semibold text-slate-600">{relatedPartiesModal.urgentJob.description}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Created</p>
                                                    <p className="mt-1 font-bold text-slate-900">{formatDateTime(relatedPartiesModal.urgentJob.createdAt)}</p>
                                                    <p className="text-xs font-semibold text-slate-600">Scheduled: {formatDateTime(relatedPartiesModal.urgentJob.scheduledAt)}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Cost And Trip</p>
                                                    <p className="mt-1 font-bold text-slate-900">{formatCurrency(relatedPartiesModal.urgentJob.cost)}</p>
                                                    <p className="text-xs font-semibold text-slate-600">{relatedPartiesModal.urgentJob.tripDistance !== null ? `${relatedPartiesModal.urgentJob.tripDistance} km` : 'Trip not specified'}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Vehicle</p>
                                                    <p className="mt-1 font-bold text-slate-900">{relatedPartiesModal.urgentJob.vehicle}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Stops</p>
                                                    <p className="mt-1 font-bold text-slate-900">{relatedPartiesModal.urgentJob.checkpoints.length}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 space-y-2">
                                                {relatedPartiesModal.urgentJob.checkpoints.length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No checkpoints recorded for this urgent job.</div>
                                                ) : (
                                                    relatedPartiesModal.urgentJob.checkpoints.map((checkpoint, index) => (
                                                        <div key={checkpoint.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900">{index + 1}. {checkpoint.task}</p>
                                                                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                                                        <MapPinIcon className="h-3.5 w-3.5" />
                                                                        {checkpoint.location}
                                                                    </p>
                                                                </div>
                                                                <p className="text-xs font-bold text-slate-500">{checkpoint.scheduledAt}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </section>
                                    )}

                                    <div className={`grid gap-5 ${relatedPartiesModal.market ? 'lg:grid-cols-3' : relatedPartiesModal.owner ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                                        <section className="group overflow-hidden rounded-3xl border border-orange-200 bg-white/70 p-5 shadow-sm transition hover:shadow-md hover:bg-white ring-1 ring-orange-100/70">
                                            <div className="flex items-center gap-3 border-b border-orange-100 pb-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-orange-100 to-orange-50 text-[#9A3412] shadow-inner ring-1 ring-orange-200/50 group-hover:scale-105 transition-transform">
                                                    <UserCircleIcon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black tracking-wide text-slate-900">Sender Details</p>
                                                    <p className="text-xs font-medium text-slate-500">{getPartyTypeLabel(relatedPartiesModal.filer.type)}</p>
                                                </div>
                                            </div>
                                            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Name</p>
                                                    <p className="font-bold text-slate-900 truncate">{relatedPartiesModal.filer.name}</p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Contact</p>
                                                    <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.filer.contact}</p>
                                                </div>
                                                {relatedPartiesModal.filer.email && (
                                                    <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Email</p>
                                                        <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.filer.email}</p>
                                                    </div>
                                                )}
                                                <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Address</p>
                                                    <p className="text-sm font-medium text-slate-700">{relatedPartiesModal.filer.address}</p>
                                                </div>
                                                {relatedPartiesModal.filer.note && (
                                                    <div className="sm:col-span-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
                                                        {relatedPartiesModal.filer.note}
                                                    </div>
                                                )}
                                            </div>
                                        </section>

                                        {relatedPartiesModal.owner && (
                                            <section className="group overflow-hidden rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm transition hover:shadow-md hover:bg-white ring-1 ring-slate-100">
                                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-inner ring-1 ring-slate-200/70 group-hover:scale-105 transition-transform">
                                                        <UsersIcon className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black tracking-wide text-slate-900">Order Owner / DeliveryTo</p>
                                                        <p className="text-xs font-medium text-slate-500">Delivery recipient and location from the order</p>
                                                    </div>
                                                </div>
                                                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Name</p>
                                                        <p className="font-bold text-slate-900 truncate">{relatedPartiesModal.owner.name}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Primary</p>
                                                        <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.owner.firstPhone || 'N/A'}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Secondary</p>
                                                        <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.owner.secondPhone || 'N/A'}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-500 pb-1">WhatsApp</p>
                                                        <p className="font-bold text-emerald-700 truncate">{relatedPartiesModal.owner.whatsapp || 'N/A'}</p>
                                                    </div>
                                                    {relatedPartiesModal.owner.email && (
                                                        <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Email</p>
                                                            <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.owner.email}</p>
                                                        </div>
                                                    )}
                                                    <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Address</p>
                                                        <p className="text-sm font-medium text-slate-700">{relatedPartiesModal.owner.address}</p>
                                                    </div>
                                                </div>
                                            </section>
                                        )}

                                        {relatedPartiesModal.market && (
                                            <section className="group overflow-hidden rounded-3xl border border-emerald-200 bg-white/70 p-5 shadow-sm transition hover:shadow-md hover:bg-white ring-1 ring-emerald-100/70">
                                                <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-100 to-emerald-50 text-emerald-700 shadow-inner ring-1 ring-emerald-200/50 group-hover:scale-105 transition-transform">
                                                        <ChatBubbleLeftRightIcon className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black tracking-wide text-slate-900">Market Details</p>
                                                        <p className="text-xs font-medium text-slate-500">Linked market profile</p>
                                                    </div>
                                                </div>
                                                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Market</p>
                                                        <p className="font-bold text-slate-900 truncate">{relatedPartiesModal.market.name}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Owner</p>
                                                        <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.market.manager}</p>
                                                        {relatedPartiesModal.market.ownerEmail !== 'N/A' && (
                                                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{relatedPartiesModal.market.ownerEmail}</p>
                                                        )}
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Category</p>
                                                        <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.market.category}</p>
                                                        {relatedPartiesModal.market.isActive !== null && (
                                                            <p className={`mt-1 text-xs font-bold ${relatedPartiesModal.market.isActive ? 'text-emerald-700' : 'text-red-600'}`}>
                                                                {relatedPartiesModal.market.isActive ? 'Active' : 'Inactive'}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Primary</p>
                                                        <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.market.firstPhone || 'N/A'}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Secondary</p>
                                                        <p className="font-bold text-slate-700 truncate">{relatedPartiesModal.market.secondPhone || 'N/A'}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-white overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-500 pb-1">WhatsApp</p>
                                                        <p className="font-bold text-emerald-700 truncate">{relatedPartiesModal.market.whatsapp || 'N/A'}</p>
                                                    </div>
                                                    <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 pb-1">Address</p>
                                                        <p className="text-sm font-medium text-slate-700">{relatedPartiesModal.market.address}</p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-500">{relatedPartiesModal.market.location}</p>
                                                    </div>
                                                    {(relatedPartiesModal.market.note || relatedPartiesModal.market.description) && (
                                                        <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-inner">
                                                            {relatedPartiesModal.market.note || relatedPartiesModal.market.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </section>
                                        )}
                                    </div>

                                    {/* Timeline Section full width bottom */}
                                    {relatedPartiesModal.relatedKind !== 'urgent_job' && (
                                    <section className="overflow-hidden rounded-3xl border border-sky-200 bg-white p-6 shadow-sm ring-1 ring-sky-100/70">
                                        <div className="flex items-center gap-3 border-b border-sky-100 pb-4 mb-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-sky-100 to-sky-50 text-sky-700 shadow-inner ring-1 ring-sky-200/50 hover:scale-105 transition-transform">
                                                <TruckIcon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-base font-black tracking-wide text-slate-900">Delivery Timeline Progression</p>
                                                <p className="text-xs font-medium text-slate-500 mt-0.5">Status-ordered partner assignments from placement to fulfillment.</p>
                                            </div>
                                        </div>

                                        <div className="px-1 sm:px-4 py-2">
                                            {relatedPartiesModal.deliveryTimeline.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 rounded-2xl bg-sky-50 border border-sky-100 text-center">
                                                    <TruckIcon className="h-10 w-10 text-sky-200 mb-3" />
                                                    <p className="font-bold text-sky-800 tracking-wide text-sm">No Timeline Available</p>
                                                    <p className="text-xs text-sky-600 mt-1 max-w-xs px-4 text-center">There are no documented delivery steps or handler assignments for this order yet.</p>
                                                </div>
                                            ) : (
                                                /* Tree Wrapper */
                                                <div className="relative border-l-[3px] border-sky-100 ml-4 lg:ml-6 mt-6 pb-2 space-y-10">
                                                    {relatedPartiesModal.deliveryTimeline.map((entry, index) => (
                                                        <div key={entry.id} className="relative pl-7 sm:pl-10 lg:pl-12 group">
                                                            {/* Line Node UI */}
                                                            <div className="absolute -left-2.75 top-1.5 flex flex-col items-center">
                                                                <div className="flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-white bg-sky-500 shadow-md ring-4 ring-sky-50 group-hover:bg-sky-400 group-hover:scale-110 transition-all duration-300"></div>
                                                            </div>

                                                            {/* Step Detail Card */}
                                                            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md hover:border-sky-200">
                                                                <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
                                                                    <div>
                                                                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                                                                            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">STEP {index + 1}</span>
                                                                            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-700 shadow-inner">
                                                                                {entry.status}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-base font-black text-slate-900 tracking-wide drop-shadow-xs">{entry.name}</p>
                                                                    </div>

                                                                    <div className="mt-2 2xl:mt-0 2xl:text-right">
                                                                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50/80 px-3 py-1.5 border border-orange-100/50">
                                                                            <ClockIcon className="h-3.5 w-3.5 text-orange-500" />
                                                                            <p className="text-[11px] font-black text-orange-700 tracking-wide">{entry.assignedAt}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {entry.location && (
                                                                    <div className="mt-4 flex flex-col items-start 2xl:flex-row 2xl:items-center gap-3">
                                                                        <div className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                                                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                                                    <circle cx="12" cy="10" r="3"></circle>
                                                                                </svg>
                                                                            </div>
                                                                            <div className="flex-1 truncate">
                                                                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 leading-tight">Location</p>
                                                                                <p className="text-xs font-semibold text-slate-700 truncate" title={entry.location}>{entry.location}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                    )}

                                </div>
                            )}
                        </div>

                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

export default ComplaintsManager;