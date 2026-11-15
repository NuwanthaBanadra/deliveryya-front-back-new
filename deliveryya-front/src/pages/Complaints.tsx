import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import Select from 'react-select';
import Footer from '../page_comps/home/Footer';
import NavBar from '../page_comps/home/NavBar';
import ComplaintsHero from '../page_comps/complaints/ComplaintsHero';
import OrderTimeline, { type DeliveryTimelineItem, type OrderDetails, type SenderDetails } from '../page_comps/trackOrder/OrderTimeline';
import axiosInstance from '../util/AxiosUtil';
import JwtUtil from '../util/JwtUtil';
import { buildUserProfileFromSession } from '../util/UserProfileUtil';
import { swalAlert } from '../util/SwalUtil';
import { generateComplaintReceiptPDF, type ComplaintDataForPdf } from '../util/PdfUtil';
import { TbTruckDelivery } from 'react-icons/tb';

type ComplainType = {
    id: number;
    name: string;
};

type SelectOption = {
    value: number;
    label: string;
};

type FoundOrder = {
    orderId: number | null;
    orderCode: string;
    customerName: string;
    customerPhone: string;
    currentStatus: string;
    totalAmount: string;
    createdAt: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }
    return value as Record<string, unknown>;
};

const asString = (value: unknown, fallback: string = ''): string => {
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

const formatDate = (value: string): string => {
    if (!value || value === '-') {
        return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString();
};

const formatDateTime = (value: string): string => {
    if (!value) return 'N/A';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
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

const parseFoundOrder = (payload: unknown, searchedCode: string): FoundOrder => {
    const order = asRecord(payload);
    if (!order) {
        return {
            orderId: null,
            orderCode: searchedCode,
            customerName: '-',
            customerPhone: '-',
            currentStatus: 'Unknown',
            totalAmount: '-',
            createdAt: '-',
        };
    }

    // Extract order code from nested object
    const orderCodeObj = asRecord(order.orderCode);
    const orderCodeStr = asString(orderCodeObj?.code, asString(order.orderCode, searchedCode));

    // Extract delivery info from deliveryTo object
    const deliveryTo = asRecord(order.deliveryTo);
    const customerName = asString(deliveryTo?.fullName, '-') || '-';
    const customerPhone = asString(deliveryTo?.primaryMobile, '') || asString(deliveryTo?.secondaryMobile, '-') || '-';

    // Extract delivery status
    const deliveryStatus = asRecord(order.deliveryStatus);
    const currentStatus = asString(deliveryStatus?.name, 'Pending');

    // Extract total price
    const totalAmount = asString(order.totalPrice, asString(order.totalAmount, '-'));

    return {
        orderId: asNumber(order.id) ?? asNumber(order.orderId),
        orderCode: orderCodeStr,
        customerName,
        customerPhone,
        currentStatus,
        totalAmount,
        createdAt: asString(order.createdAt, '') || asString(order.createdDate, '-'),
    };
};

const parseFoundJob = (payload: unknown, searchedCode: string): FoundOrder => {
    const job = asRecord(payload);
    if (!job) {
        return {
            orderId: null,
            orderCode: searchedCode,
            customerName: 'N/A',
            customerPhone: 'N/A',
            currentStatus: 'Unknown',
            totalAmount: 'N/A',
            createdAt: '-',
        };
    }

    return {
        orderId: asNumber(job.id) ?? null,
        orderCode: asString(job.jobCode, searchedCode),
        customerName: asString(job.username, asString(job.userName, 'N/A')) || asString(job.username, 'N/A'),
        customerPhone: asString(job.mobile, 'N/A'),
        currentStatus: asString(asRecord(job.jobStatus)?.name, 'Unknown'),
        totalAmount: asString(job.cost, asString(job.price, 'N/A')),
        createdAt: asString(job.createdAt, asString(job.createdDate, '-')),
    };
};

function Complaints() {
    const navigate = useNavigate();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [orderCode, setOrderCode] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTypes, setIsLoadingTypes] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [foundOrder, setFoundOrder] = useState<FoundOrder | null>(null);
    const [complainTypes, setComplainTypes] = useState<ComplainType[]>([]);
    const [latestComplainId, setLatestComplainId] = useState<number | null>(null);
    const [latestComplaintData, setLatestComplaintData] = useState<ComplaintDataForPdf | null>(null);
    const [timeline, setTimeline] = useState<DeliveryTimelineItem[]>([]);
    const [senderDetails, setSenderDetails] = useState<SenderDetails | null>(null);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [timelineError, setTimelineError] = useState<string | null>(null);

    const [subject, setSubject] = useState('');
    const [complaintTypeId, setComplaintTypeId] = useState<number>(0);
    const [complaintText, setComplaintText] = useState('');

    const hasOrder = useMemo(() => foundOrder !== null, [foundOrder]);
    const selectedTypeName = complainTypes.find((type) => type.id === complaintTypeId)?.name ?? 'Complaint Type';
    const complaintTypeOptions = useMemo<SelectOption[]>(
        () => complainTypes.map((type) => ({ value: type.id, label: type.name })),
        [complainTypes],
    );

    const resetTimelineState = () => {
        setTimeline([]);
        setSenderDetails(null);
        setOrderDetails(null);
        setTimelineError(null);
        setIsTimelineLoading(false);
    };

    const loadTimelineDetails = async (rawOrder: Record<string, unknown>, searchedCode: string) => {
        setIsTimelineLoading(true);
        setTimelineError(null);

        const deliveryTo = asRecord(rawOrder.deliveryTo);
        const orderUser = asRecord(rawOrder.user);
        const thirdParty = asRecord(rawOrder.thirdPartySenders);

        const hasThirdPartySender = Boolean(
            toCleanString(thirdParty?.name) ||
            toCleanString(thirdParty?.address) ||
            toCleanString(thirdParty?.first_mob) ||
            toCleanString(thirdParty?.sec_mob) ||
            toCleanString(thirdParty?.whatsapp),
        );

        const deliveryCity = asRecord(deliveryTo?.city);
        const deliveryUser = asRecord(deliveryTo?.user);

        const resolvedOrderDetails: OrderDetails = {
            customerName: asString(deliveryTo?.fullName, asString(orderUser?.name, 'N/A')),
            contact: asString(deliveryTo?.primaryMobile, '') || asString(deliveryTo?.secondaryMobile, '') || asString(deliveryTo?.whatsapp, 'N/A'),
            email: asString(deliveryUser?.email, asString(orderUser?.email, 'N/A')),
            address: [asString(deliveryTo?.address, ''), asString(deliveryCity?.name, '')].filter(Boolean).join(', ') || 'N/A',
            deliveryMapLocation: asString(deliveryTo?.googleMapLocation, '') || asString(deliveryTo?.location, ''),
        };

        let resolvedSender: SenderDetails = {
            type: 'unknown',
            name: 'N/A',
            contact: 'N/A',
            location: 'N/A',
            note: '',
            address: 'N/A',
            phone: 'N/A',
            firstPhone: '',
            secondPhone: '',
            whatsapp: '',
            email: 'N/A',
        };

        if (hasThirdPartySender) {
            resolvedSender = {
                type: 'third_party',
                name: asString(thirdParty?.name, 'N/A'),
                contact: joinPhones([thirdParty?.first_mob, thirdParty?.sec_mob, thirdParty?.whatsapp]),
                location: asString(thirdParty?.address, 'N/A'),
                note: asString(thirdParty?.note, ''),
                address: asString(thirdParty?.address, 'N/A'),
                phone: joinPhones([thirdParty?.first_mob, thirdParty?.sec_mob, thirdParty?.whatsapp]),
                firstPhone: toCleanString(thirdParty?.first_mob),
                secondPhone: toCleanString(thirdParty?.sec_mob),
                whatsapp: toCleanString(thirdParty?.whatsapp),
                email: 'N/A',
            };
        }

        const orderCodeUser = asRecord(asRecord(rawOrder.orderCode)?.users);
        const senderUserId = asNumber(orderCodeUser?.id) || asNumber(orderUser?.id) || asNumber(rawOrder.userId);

        if (!hasThirdPartySender && senderUserId) {
            let defaultUserAddress: Record<string, unknown> | null = null;

            try {
                const userAddressRes = await axiosInstance.get(`/users/get-address-by-id-or-user-id?defaultAddress=true&userId=${senderUserId}`);
                const addresses = userAddressRes.data?.object || userAddressRes.data?.exData || [];
                if (Array.isArray(addresses)) {
                    defaultUserAddress = (addresses.find((item: unknown) => asRecord(item)?.defaultAddress) ?? addresses[0] ?? null) as Record<string, unknown> | null;
                }
            } catch {
                defaultUserAddress = null;
            }

            try {
                const userRes = await axiosInstance.get(`/users/admin/get-user-by-id?id=${senderUserId}`);
                const userData = asRecord(userRes.data?.object || userRes.data?.exData || {});
                if (userData) {
                    const addressCity = defaultUserAddress?.city && typeof defaultUserAddress.city === 'object' ? asString((defaultUserAddress.city as Record<string, unknown>).name, '') : '';
                    const resolvedAddress = asString(defaultUserAddress?.address, '')
                        ? `${asString(defaultUserAddress?.address, '')}${addressCity ? `, ${addressCity}` : ''}`
                        : asString(userData.address, 'N/A');

                    resolvedSender = {
                        type: 'user',
                        name: `${asString(userData.firstName, '')} ${asString(userData.lastName, '')}`.trim() || asString(userData.name, `User #${senderUserId}`),
                        contact: joinPhones([
                            userData.mobile,
                            userData.phone,
                            userData.whatsapp,
                            defaultUserAddress?.phone,
                            defaultUserAddress?.mobile,
                            defaultUserAddress?.primaryMobile,
                            defaultUserAddress?.secondaryMobile,
                            defaultUserAddress?.whatsapp,
                        ]),
                        location: resolvedAddress,
                        note: asString(userData.nic, ''),
                        address: resolvedAddress,
                        phone: joinPhones([
                            userData.mobile,
                            userData.phone,
                            userData.whatsapp,
                            defaultUserAddress?.phone,
                            defaultUserAddress?.mobile,
                            defaultUserAddress?.primaryMobile,
                            defaultUserAddress?.secondaryMobile,
                            defaultUserAddress?.whatsapp,
                        ]),
                        firstPhone: toCleanString(userData.mobile || userData.phone || defaultUserAddress?.phone || defaultUserAddress?.mobile || defaultUserAddress?.primaryMobile),
                        secondPhone: toCleanString(defaultUserAddress?.secondaryMobile),
                        whatsapp: toCleanString(userData.whatsapp || defaultUserAddress?.whatsapp),
                        email: asString(userData.email, 'N/A'),
                    };
                }
            } catch {
                try {
                    const fallbackUserRes = await axiosInstance.post('/users/get-users', {
                        pageNumber: 0,
                        countPerPage: 10,
                        userId: senderUserId,
                    });
                    const userData = asRecord(fallbackUserRes.data?.object?.items?.[0] || {});
                    if (userData) {
                        const addressCity = defaultUserAddress?.city && typeof defaultUserAddress.city === 'object' ? asString((defaultUserAddress.city as Record<string, unknown>).name, '') : '';
                        const resolvedAddress = asString(defaultUserAddress?.address, '')
                            ? `${asString(defaultUserAddress?.address, '')}${addressCity ? `, ${addressCity}` : ''}`
                            : asString(userData.address, 'N/A');

                        resolvedSender = {
                            type: 'user',
                            name: `${asString(userData.firstName, '')} ${asString(userData.lastName, '')}`.trim() || asString(userData.name, `User #${senderUserId}`),
                            contact: joinPhones([
                                userData.mobile,
                                userData.phone,
                                userData.whatsapp,
                                defaultUserAddress?.phone,
                                defaultUserAddress?.mobile,
                                defaultUserAddress?.primaryMobile,
                                defaultUserAddress?.secondaryMobile,
                                defaultUserAddress?.whatsapp,
                            ]),
                            location: resolvedAddress,
                            note: asString(userData.nic, ''),
                            address: resolvedAddress,
                            phone: joinPhones([
                                userData.mobile,
                                userData.phone,
                                userData.whatsapp,
                                defaultUserAddress?.phone,
                                defaultUserAddress?.mobile,
                                defaultUserAddress?.primaryMobile,
                                defaultUserAddress?.secondaryMobile,
                                defaultUserAddress?.whatsapp,
                            ]),
                            firstPhone: toCleanString(userData.mobile || userData.phone || defaultUserAddress?.phone || defaultUserAddress?.mobile || defaultUserAddress?.primaryMobile),
                            secondPhone: toCleanString(defaultUserAddress?.secondaryMobile),
                            whatsapp: toCleanString(userData.whatsapp || defaultUserAddress?.whatsapp),
                            email: asString(userData.email, 'N/A'),
                        };
                    }
                } catch {
                    console.error('Failed to get user fallback details');
                }
            }
        }

        const marketOrderId = asNumber(asRecord(rawOrder.marketOrder)?.id) || asNumber(rawOrder.marketOrderId);
        if (!hasThirdPartySender && marketOrderId) {
            try {
                const marketRes = await axiosInstance.get(`/markets/get-markets-details-by-market-order-id?marketOrderId=${marketOrderId}`);
                const marketData = asRecord(marketRes.data?.object || marketRes.data?.exData || {});
                if (marketData) {
                    resolvedSender = {
                        type: 'market',
                        name: asString(marketData.name, 'Market'),
                        contact: formatMarketPhones(marketData),
                        location: asString(marketData.address, asString(marketData.location, 'N/A')),
                        note: asString(marketData.infoMessage, asString(marketData.desc, '')),
                        address: asString(marketData.address, asString(marketData.location, 'N/A')),
                        phone: formatMarketPhones(marketData),
                        firstPhone: toCleanString(marketData.first_num),
                        secondPhone: toCleanString(marketData.second_num),
                        whatsapp: toCleanString(marketData.whats_app),
                        email: asString((marketData.users as Record<string, unknown> | null)?.email, 'N/A'),
                    };
                }
            } catch {
                console.error('Error fetching market details');
            }
        }

        setSenderDetails(resolvedSender);
        setOrderDetails(resolvedOrderDetails);

        try {
            const historyRes = await axiosInstance.get(`/orders/get-delivery-history-by-order-code-or-id?orderCode=${encodeURIComponent(searchedCode)}`);
            const historyItems = Array.isArray(historyRes.data?.object) ? historyRes.data.object : [];

            const timelineData: DeliveryTimelineItem[] = await Promise.all(
                historyItems.map(async (item: Record<string, unknown>, index: number) => {
                    const employeeStub = asRecord(item.employees) ?? {};
                    const employeeId = asNumber(employeeStub.id);
                    let employeeName = 'Unassigned';
                    let employeeContact = 'N/A';
                    let employeeMobile = 'N/A';
                    let employeeWhatsApp = 'N/A';

                    if (employeeId) {
                        try {
                            const empDetailsRes = await axiosInstance.get(`/employees/get-details-by-id?id=${employeeId}`);
                            const empData = asRecord(empDetailsRes.data?.object);
                            if (empData) {
                                employeeName = `${asString(empData.usersFirstName, '')} ${asString(empData.usersLastName, '')}`.trim() || `Employee #${employeeId}`;
                                employeeMobile = asString(empData.mobile, 'N/A');
                                employeeWhatsApp = asString(empData.whatsapp, 'N/A');
                                employeeContact = joinPhones([employeeMobile, employeeWhatsApp]);
                            }
                        } catch {
                            try {
                                const empRes = await axiosInstance.get(`/employees/get-user-by-employee-id?id=${employeeId}`);
                                const empData = asRecord(empRes.data?.object);
                                if (empData) {
                                    employeeName = `${asString(empData.firstName, '')} ${asString(empData.lastName, '')}`.trim() || asString(empData.name, `Employee #${employeeId}`);
                                    employeeMobile = asString(empData.mobile || empData.phone, 'N/A');
                                    employeeWhatsApp = asString(empData.whatsapp, 'N/A');
                                    employeeContact = joinPhones([employeeMobile, employeeWhatsApp]);
                                }
                            } catch {
                                console.error('Failed to get employee info');
                            }
                        }
                    }

                    const deliveryStatus = asRecord(item.deliveryStatus);
                    return {
                        id: asNumber(item.id) || index + 1,
                        status: asString(deliveryStatus?.name, 'Unknown Status'),
                        statusId: asNumber(deliveryStatus?.id),
                        assignedAt: formatDateTime(asString(item.createdAt, '')),
                        name: employeeName,
                        employeeId: employeeId || undefined,
                        contact: employeeContact,
                        mobile: employeeMobile,
                        whatsapp: employeeWhatsApp,
                        note: item.note == null ? null : String(item.note),
                        location: asString(employeeStub.location, 'N/A'),
                    };
                }),
            );

            setTimeline(timelineData);
        } catch (error) {
            console.error('Failed to fetch delivery history', error);
            setTimeline([]);
            setTimelineError('Timeline data is not available right now.');
        } finally {
            setIsTimelineLoading(false);
        }
    };

    const getCustomSelectStyles = (hasError = false) => ({
        control: (base: any, state: any) => ({
            ...base,
            padding: '0.375rem',
            borderWidth: '2px',
            borderColor: hasError ? '#EF4444' : (state.isFocused ? '#F59B0F' : '#f3d9b5'),
            borderRadius: '0.75rem',
            minHeight: '52px',
            boxShadow: hasError
                ? (state.isFocused ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none')
                : (state.isFocused ? '0 0 0 2px rgba(245, 155, 15, 0.2)' : 'none'),
            '&:hover': {
                borderColor: hasError ? '#DC2626' : '#e9bf8a',
            },
            transition: 'all 0.3s',
            backgroundColor: (!hasOrder || isSubmitting || isLoadingTypes || !complainTypes.length) ? '#f3f4f6' : '#ffffff',
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

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        const isLoggedIn = token && JwtUtil.validateToken(token);

        if (!isLoggedIn) {
            setIsLoginModalOpen(true);
        }
    }, []);

    useEffect(() => {
        const loadComplainTypes = async () => {
            setIsLoadingTypes(true);
            try {
                const response = await axiosInstance.get('/complains/get-complain-types');
                const parsedTypes = extractArrayPayload(response.data)
                    .map((entry) => {
                        const item = asRecord(entry);
                        if (!item) {
                            return null;
                        }

                        const id = asNumber(item.id);
                        if (!id) {
                            return null;
                        }

                        return {
                            id,
                            name: asString(item.name, `Type ${id}`),
                        } as ComplainType;
                    })
                    .filter((item): item is ComplainType => item !== null);

                setComplainTypes(parsedTypes);
                if (parsedTypes.length) {
                    setComplaintTypeId(parsedTypes[0].id);
                }
            } catch (error) {
                console.error('Complain type loading failed:', error);
                await swalAlert('Load Failed', 'Unable to load complaint types.', 'error');
            } finally {
                setIsLoadingTypes(false);
            }
        };

        void loadComplainTypes();
    }, []);

    const findOrderByCode = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = orderCode.trim().toUpperCase();
        if (!trimmed) {
            await swalAlert('Order code required', 'Please enter your order code to find order details.', 'warning');
            return;
        }

        setIsSearching(true);
        setFoundOrder(null);
        setLatestComplainId(null);
        setLatestComplaintData(null);
        resetTimelineState();

        try {
            // If job code (starts with UJC) use urgent jobs endpoint
            if (trimmed.toUpperCase().startsWith('UJC')) {
                const response = await axiosInstance.post('/urgent-jobs/get-urgent-jobs', {
                    pageNumber: 0,
                    countPerPage: 100,
                    jobCode: trimmed,
                });

                const jobsList = extractArrayPayload(response.data);
                if (!jobsList.length) {
                    await swalAlert('Job Not Found', 'No urgent job found for this code. Please check and try again.', 'error');
                    setIsSearching(false);
                    return;
                }

                const parsedJob = parseFoundJob(jobsList[0], trimmed);
                setFoundOrder(parsedJob);
                // No delivery timeline available for urgent jobs
                resetTimelineState();
                setTimelineError('Timeline not available for urgent job records.');
                await swalAlert('Job Found', `Job ${parsedJob.orderCode} is ready for complaint submission.`, 'success');
                setIsSearching(false);
                return;
            }

            const response = await axiosInstance.post('/orders/get-orders', {
                pageNumber: 0,
                countPerPage: 10,
                orderCode: trimmed,
            });

            const ordersList = extractArrayPayload(response.data);
            if (!ordersList.length) {
                await swalAlert('Order Not Found', 'No order found for this code. Please check and try again.', 'error');
                setIsSearching(false);
                return;
            }

            const parsedOrder = parseFoundOrder(ordersList[0], trimmed);
            setFoundOrder(parsedOrder);
            setIsSearching(false);

            const rawOrder = asRecord(ordersList[0]);
            if (rawOrder) {
                await loadTimelineDetails(rawOrder, trimmed);
            }

            await swalAlert('Order Found', `Order ${parsedOrder.orderCode} is ready for complaint submission.`, 'success');
        } catch (error) {
            console.error('Order/job search failed:', error);
            await swalAlert('Not Found', 'No record found for this code. Please check and try again.', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const submitComplaint = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!foundOrder) {
            await swalAlert('Search first', 'Please find an order before creating a complaint.', 'warning');
            return;
        }

        if (!subject.trim() || !complaintText.trim()) {
            await swalAlert('Missing details', 'Please fill subject and complaint description.', 'warning');
            return;
        }

        if (subject.trim().length > 100) {
            await swalAlert('Subject too long', 'Subject must be 100 characters or fewer.', 'warning');
            return;
        }

        if (!foundOrder.orderCode) {
            await swalAlert('Code Missing', 'This record does not include a valid order or job code.', 'warning');
            return;
        }

        if (!complaintTypeId) {
            await swalAlert('Type Required', 'Please select a complaint type.', 'warning');
            return;
        }

        const selectedType = complainTypes.find((type) => type.id === complaintTypeId);
        if (!selectedType) {
            await swalAlert('Type Missing', 'Invalid complaint type selected.', 'warning');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            subject: subject.trim(),
            complain: complaintText.trim(),
            complainType: {
                id: selectedType.id,
                name: selectedType.name,
            },
            code: foundOrder.orderCode,
        };

        try {
            const response = await axiosInstance.post('/complains/set-complain', payload);
            const responsePayload = extractPayload(response.data);
            const createdComplain = asRecord(responsePayload);
            const complainId = asNumber(createdComplain?.id) ?? asNumber(createdComplain?.complainId);
            setLatestComplainId(complainId);

            // Store complaint data for PDF generation
            if (complainId && foundOrder) {
                const complaintData: ComplaintDataForPdf = {
                    complainId,
                    orderCode: foundOrder.orderCode,
                    subject: subject.trim(),
                    complainType: selectedType.name,
                    description: complaintText.trim(),
                    createdDate: new Date().toISOString(),
                    customerName: foundOrder.customerName,
                    customerPhone: foundOrder.customerPhone,
                };
                setLatestComplaintData(complaintData);
            }

            setSubject('');
            setComplaintText('');

            await swalAlert(
                'Complain Created',
                complainId ? `Complain #${complainId} created successfully.` : 'Complain created successfully.',
                'success'
            );
        } catch (error) {
            console.error('Complaint submission failed:', error);
            await swalAlert('Submit Failed', 'Unable to create complain. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadComplaintReceipt = async () => {
        if (!latestComplaintData) return;

        setIsGeneratingPDF(true);
        try {
            await generateComplaintReceiptPDF(latestComplaintData, true);
        } catch (error) {
            console.error('PDF generation failed:', error);
            await swalAlert('PDF Generation Failed', 'Unable to generate complaint receipt PDF.', 'error');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const printComplaintReceipt = async () => {
        if (!latestComplaintData) return;

        setIsGeneratingPDF(true);
        try {
            const doc = await generateComplaintReceiptPDF(latestComplaintData, false);
            doc.autoPrint();

            const printWindow = window.open(doc.output('bloburl'), '_blank');
            if (!printWindow) {
                await swalAlert('Popup Blocked', 'Please allow popups for this site to print the receipt.', 'warning');
            }
        } catch (error) {
            console.error('PDF print failed:', error);
            await swalAlert('Print Failed', 'Unable to print complaint receipt PDF.', 'error');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-[#fff7ea] via-[#fffdf7] to-white">
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
                                To file complaints and track your deliveries, you need to sign in to your account. This helps us provide you better support.
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

            <ComplaintsHero />

            <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8">

                {/* <div className="relative max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-28 overflow-hidden">

                    <div className="relative text-center space-y-8">

                        <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg max-w-full">
                            <TbTruckDelivery className="w-5 h-5" />
                            <span className="font-bold text-xs sm:text-sm tracking-wide">Order Complaint & Tracking</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-gray-900 leading-tight">
                            Support {' '}
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                                Desk
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                            Search your order by code, review the order summary, and submit a complaint using the live complain endpoints.
                            Transfer tracking is shown as a sample layout until the backend endpoint is available.
                        </p>
                    </div>

                </div> */}

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
                        <h2 className="text-xl font-extrabold text-gray-900">1. Find Order by Code</h2>
                        <p className="mt-2 text-sm text-gray-600">Enter your order code to load order data.</p>

                        <form onSubmit={findOrderByCode} className="mt-5 space-y-4">
                            <label className="block text-sm font-semibold text-gray-800" htmlFor="order-code">
                                Order Code
                            </label>
                            <div className="flex gap-3">
                                <input
                                    id="order-code"
                                    value={orderCode}
                                    onChange={(e) => setOrderCode(e.target.value)}
                                    placeholder="Ex: ORD-00001-00008"
                                    className="flex-1 rounded-xl border-2 border-[#f3d9b5] px-4 py-3 outline-none transition focus:border-[#F59B0F]"
                                />
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 whitespace-nowrap"
                                >
                                    {isSearching ? 'Searching...' : 'Find'}
                                </button>
                            </div>
                        </form>

                        {foundOrder && (
                            <div className="mt-6 rounded-2xl border border-[#F59B0F]/35 bg-[#fffaf3] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#AC6C2A]">Order Found</p>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-gray-500">Order ID</p>
                                        <p className="font-bold text-gray-800">{foundOrder.orderId ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Order Code</p>
                                        <p className="font-bold text-gray-800">{foundOrder.orderCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Customer</p>
                                        <p className="font-bold text-gray-800">{foundOrder.customerName}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Phone</p>
                                        <p className="font-bold text-gray-800">{foundOrder.customerPhone}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Total</p>
                                        <p className="font-bold text-gray-800">Rs.{foundOrder.totalAmount}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Created</p>
                                        <p className="font-bold text-gray-800">{formatDate(foundOrder.createdAt)}</p>
                                    </div>
                                </div>
                                <p className="mt-4 inline-flex rounded-full bg-[#F59B0F]/15 px-3 py-1 text-xs font-bold text-[#8f5515]">
                                    Current Status: {foundOrder.currentStatus}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
                        <h2 className="text-xl font-extrabold text-gray-900">2. Create Complain</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Add a short subject, choose the complaint type, and describe the issue in detail.
                        </p>

                        <form onSubmit={submitComplaint} className="mt-5 grid gap-4">
                            <label className="text-sm font-semibold text-gray-800" htmlFor="complaint-title">
                                Subject
                            </label>
                            <input
                                id="complaint-title"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={!hasOrder || isSubmitting || isLoadingTypes}
                                maxLength={100}
                                placeholder="Ex: Package was damaged when received"
                                className="w-full rounded-xl border-2 border-[#f3d9b5] px-4 py-3 outline-none transition focus:border-[#F59B0F] disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                            <p className="text-xs text-gray-500">{subject.trim().length}/100 characters</p>

                            <label className="text-sm font-semibold text-gray-800" htmlFor="complaint-type">
                                Complaint Type
                            </label>
                            <Select<SelectOption, false>
                                inputId="complaint-type"
                                value={complaintTypeOptions.find((option) => option.value === complaintTypeId) ?? null}
                                onChange={(option) => setComplaintTypeId(option ? option.value : 0)}
                                options={complaintTypeOptions}
                                placeholder={isLoadingTypes ? 'Loading complaint types...' : 'Select complaint type'}
                                isClearable
                                isDisabled={!hasOrder || isSubmitting || isLoadingTypes || !complainTypes.length}
                                isLoading={isLoadingTypes}
                                noOptionsMessage={() => (isLoadingTypes ? 'Loading...' : 'No types found')}
                                styles={getCustomSelectStyles(false)}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            />

                            <label className="text-sm font-semibold text-gray-800" htmlFor="complaint-text">
                                Complaint
                            </label>
                            <textarea
                                id="complaint-text"
                                value={complaintText}
                                onChange={(e) => setComplaintText(e.target.value)}
                                disabled={!hasOrder || isSubmitting || isLoadingTypes}
                                rows={5}
                                placeholder="Explain your complaint in detail"
                                className="w-full rounded-xl border-2 border-[#f3d9b5] px-4 py-3 outline-none transition focus:border-[#F59B0F] disabled:cursor-not-allowed disabled:bg-gray-100"
                            />

                            <button
                                type="submit"
                                disabled={!hasOrder || isSubmitting || isLoadingTypes || !complainTypes.length}
                                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#1f2937] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                            </button>
                        </form>

                        {latestComplainId && (
                            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                                <p className="text-sm font-bold text-green-800">Complain created: #{latestComplainId}</p>
                                <p className="mt-1 text-sm text-green-700">
                                    {selectedTypeName} complaint submitted successfully for order {foundOrder?.orderCode ?? '-'}.
                                </p>

                                {latestComplaintData && (
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={downloadComplaintReceipt}
                                            disabled={isGeneratingPDF}
                                            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {isGeneratingPDF ? 'Generating PDF...' : '📥 Download Receipt'}
                                        </button>
                                        <button
                                            onClick={printComplaintReceipt}
                                            disabled={isGeneratingPDF}
                                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {isGeneratingPDF ? 'Generating PDF...' : '🖨️ Print Receipt'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8">
                    {isTimelineLoading && !foundOrder ? (
                        <div className="rounded-3xl border border-orange-100 bg-white px-6 py-10 text-center shadow-lg ring-1 ring-gray-100">
                            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
                            <p className="text-sm font-semibold text-gray-700">Loading order timeline...</p>
                        </div>
                    ) : foundOrder ? (
                        <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-lg ring-1 ring-gray-100">
                            <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#AC6C2A]">3. Delivery Timeline</p>
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <h2 className="text-xl font-extrabold text-gray-900">Full order history and live tracking</h2>
                                        <p className="mt-1 text-sm text-gray-600">
                                            The timeline now sits in its own section so the complaint flow stays clean and the tracking content can stay detailed.
                                        </p>
                                    </div>
                                    <div className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#8f5515]">
                                        Order {foundOrder.orderCode}
                                    </div>
                                </div>
                            </div>

                            {timelineError && (
                                <div className="mx-6 mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-8">
                                    {timelineError}
                                </div>
                            )}

                            <div className="px-0 pb-2">
                                <OrderTimeline timeline={timeline} senderDetails={senderDetails} orderDetails={orderDetails} />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-orange-200 bg-white px-6 py-10 text-center shadow-sm ring-1 ring-gray-100">
                            <p className="text-sm font-semibold text-gray-700">Search an order to reveal the delivery timeline here.</p>
                            <p className="mt-1 text-xs text-gray-500">The full timeline is shown below the complaint form so the layout stays readable.</p>
                        </div>
                    )}
                </div>

            </section>

            <Footer />
        </div>
    );
}

export default Complaints;
