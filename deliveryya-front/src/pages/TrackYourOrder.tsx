import { useState } from 'react';
import NavBar from '../page_comps/home/NavBar';
import Footer from '../page_comps/home/Footer';
import TrackHero from '../page_comps/trackOrder/TrackHero';
import TrackNotFound from '../page_comps/trackOrder/TrackNotFound';
import axiosInstance from '../util/AxiosUtil';
import type { DeliveryTimelineItem, SenderDetails, OrderDetails } from '../page_comps/trackOrder/OrderTimeline';
import OrderTimeline from '../page_comps/trackOrder/OrderTimeline';

const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString();
    } catch {
        return dateString;
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

const formatMarketPhones = (payload: any): string => {
    const first = toCleanString(payload?.first_num);
    const second = toCleanString(payload?.second_num);
    const whatsapp = toCleanString(payload?.whats_app);

    const parts = [
        first ? `First: ${first}` : '',
        second ? `Second: ${second}` : '',
        whatsapp ? `WhatsApp: ${whatsapp}` : '',
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' | ') : 'N/A';
};

function TrackYourOrder() {
    const [searchedCode, setSearchedCode] = useState<string | null>(null);
    const [found, setFound] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [timeline, setTimeline] = useState<DeliveryTimelineItem[]>([]);
    const [senderDetails, setSenderDetails] = useState<SenderDetails | null>(null);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

    const handleSearch = async (code: string) => {
        const normalizedCode = code.toUpperCase().trim();
        setSearchedCode(normalizedCode);
        setFound(false);
        setIsLoading(true);
        setError(null);
        setTimeline([]);
        setSenderDetails(null);
        setOrderDetails(null);

        try {
            // First hit the get-orders endpoint to see if order exists and fetch details
            const orderResponse = await axiosInstance.post('/orders/get-orders', {
                pageNumber: 0,
                countPerPage: 10,
                orderCode: normalizedCode,
            });

            const items = orderResponse.data?.object?.items || [];
            if (items.length === 0) {
                // If not found
                setFound(false);
                setIsLoading(false);
                return;
            }

            setFound(true);
            const firstOrder = items[0];
            const deliveryTo = firstOrder.deliveryTo || {};
            const orderUser = firstOrder.user || {};

            // Sender resolution priority mirrors PlacedOrders:
            // 1) third-party sender, 2) market sender, 3) user sender fallback.
            const thirdParty = firstOrder.thirdPartySenders;
            const hasThirdPartySender = Boolean(
                toCleanString(thirdParty?.name) ||
                toCleanString(thirdParty?.address) ||
                toCleanString(thirdParty?.first_mob) ||
                toCleanString(thirdParty?.sec_mob) ||
                toCleanString(thirdParty?.whatsapp),
            );

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
                    name: thirdParty?.name || 'N/A',
                    contact: joinPhones([thirdParty?.first_mob, thirdParty?.sec_mob, thirdParty?.whatsapp]),
                    location: thirdParty?.address || 'N/A',
                    note: thirdParty?.note || '',
                    address: thirdParty?.address || 'N/A',
                    phone: joinPhones([thirdParty?.first_mob, thirdParty?.sec_mob, thirdParty?.whatsapp]),
                    firstPhone: toCleanString(thirdParty?.first_mob),
                    secondPhone: toCleanString(thirdParty?.sec_mob),
                    whatsapp: toCleanString(thirdParty?.whatsapp),
                    email: 'N/A',
                };
            }

            const orderCodeUserId = firstOrder.orderCode?.users?.id;
            const senderUserId = orderCodeUserId || firstOrder.user?.id || firstOrder.userId;
            if (!hasThirdPartySender && senderUserId) {
                let defaultUserAddress: any = null;
                try {
                    const userAddressRes = await axiosInstance.get(
                        `/users/get-address-by-id-or-user-id?defaultAddress=true&userId=${senderUserId}`,
                    );
                    const addresses = userAddressRes.data?.object || userAddressRes.data?.exData || [];
                    if (Array.isArray(addresses)) {
                        defaultUserAddress = addresses.find((item) => Boolean(item?.defaultAddress)) || addresses[0] || null;
                    }
                } catch {
                    defaultUserAddress = null;
                }

                try {
                    const userRes = await axiosInstance.get(`/users/admin/get-user-by-id?id=${senderUserId}`);
                    const userData = userRes.data?.object || userRes.data?.exData || {};
                    if (userData && Object.keys(userData).length > 0) {
                        const addressCity = defaultUserAddress?.city?.name ? `, ${defaultUserAddress.city.name}` : '';
                        const resolvedAddress = defaultUserAddress?.address
                            ? `${defaultUserAddress.address}${addressCity}`
                            : (userData.address || 'N/A');

                        resolvedSender = {
                            type: 'user',
                            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || `User #${senderUserId}`,
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
                            note: userData.nic || '',
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
                            firstPhone: toCleanString(
                                userData.mobile ||
                                userData.phone ||
                                defaultUserAddress?.phone ||
                                defaultUserAddress?.mobile ||
                                defaultUserAddress?.primaryMobile,
                            ),
                            secondPhone: toCleanString(defaultUserAddress?.secondaryMobile),
                            whatsapp: toCleanString(userData.whatsapp || defaultUserAddress?.whatsapp),
                            email: userData.email || 'N/A',
                        };
                    }
                } catch {
                    try {
                        const fallbackUserRes = await axiosInstance.post('/users/get-users', {
                            pageNumber: 0,
                            countPerPage: 10,
                            userId: senderUserId,
                        });
                        const userData = fallbackUserRes.data?.object?.items?.[0] || {};
                        if (userData && Object.keys(userData).length > 0) {
                            const addressCity = defaultUserAddress?.city?.name ? `, ${defaultUserAddress.city.name}` : '';
                            const resolvedAddress = defaultUserAddress?.address
                                ? `${defaultUserAddress.address}${addressCity}`
                                : (userData.address || 'N/A');

                            resolvedSender = {
                                type: 'user',
                                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || `User #${senderUserId}`,
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
                                note: userData.nic || '',
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
                                firstPhone: toCleanString(
                                    userData.mobile ||
                                    userData.phone ||
                                    defaultUserAddress?.phone ||
                                    defaultUserAddress?.mobile ||
                                    defaultUserAddress?.primaryMobile,
                                ),
                                secondPhone: toCleanString(defaultUserAddress?.secondaryMobile),
                                whatsapp: toCleanString(userData.whatsapp || defaultUserAddress?.whatsapp),
                                email: userData.email || 'N/A',
                            };
                        }
                    } catch {
                        console.error('Error fetching user fallback details');
                    }
                }
            }

            const marketOrderId = firstOrder.marketOrder?.id || firstOrder.marketOrderId;
            if (!hasThirdPartySender && marketOrderId) {
                try {
                    const marketRes = await axiosInstance.get(`/markets/get-markets-details-by-market-order-id?marketOrderId=${marketOrderId}`);
                    const marketData = marketRes.data?.object || marketRes.data?.exData || {};
                    if (marketData && Object.keys(marketData).length > 0) {
                        resolvedSender = {
                            type: 'market',
                            name: marketData.name || 'Market',
                            contact: formatMarketPhones(marketData),
                            location: marketData.address || marketData.location || 'N/A',
                            note: marketData.infoMessage || marketData.desc || '',
                            address: marketData.address || marketData.location || 'N/A',
                            phone: formatMarketPhones(marketData),
                            firstPhone: toCleanString(marketData.first_num),
                            secondPhone: toCleanString(marketData.second_num),
                            whatsapp: toCleanString(marketData.whats_app),
                            email: marketData?.users?.email || 'N/A',
                        };
                    }
                } catch {
                    console.error('Error fetching market details');
                }
            }

            setSenderDetails(resolvedSender);

            // Customer details
            setOrderDetails({
                customerName: deliveryTo.fullName || orderUser.name || 'N/A',
                contact: deliveryTo.primaryMobile || deliveryTo.secondaryMobile || deliveryTo.whatsapp || 'N/A',
                email: deliveryTo.user?.email || orderUser.email || 'N/A',
                address: [deliveryTo.address, deliveryTo.city?.name].filter(Boolean).join(', ') || 'N/A',
                deliveryMapLocation: deliveryTo.googleMapLocation || deliveryTo.location || ''
            });

            // Delivery timeline
            try {
                const historyRes = await axiosInstance.get(`/orders/get-delivery-history-by-order-code-or-id?orderCode=${encodeURIComponent(normalizedCode)}`);
                const historyItems = historyRes.data?.object || [];
                
                const timelineData: DeliveryTimelineItem[] = await Promise.all(historyItems.map(async (item: Record<string, unknown>, index: number) => {
                    const employeeStub = (item.employees as Record<string, unknown>) || {};
                    const employeeId = employeeStub.id;
                    let employeeName = 'Unassigned';
                    let employeeContact = 'N/A';
                    let employeeMobile = 'N/A';
                    let employeeWhatsApp = 'N/A';
                    
                    if (employeeId) {
                        try {
                            const empDetailsRes = await axiosInstance.get(`/employees/get-details-by-id?id=${employeeId}`);
                            const empData = empDetailsRes.data?.object;
                            if (empData && typeof empData === 'object') {
                                employeeName = `${empData.usersFirstName || ''} ${empData.usersLastName || ''}`.trim() || `Employee #${employeeId}`;
                                employeeMobile = toCleanString(empData.mobile) || 'N/A';
                                employeeWhatsApp = toCleanString(empData.whatsapp) || 'N/A';
                                employeeContact = joinPhones([employeeMobile, employeeWhatsApp]);
                            }
                        } catch {
                            try {
                                const empRes = await axiosInstance.get(`/employees/get-user-by-employee-id?id=${employeeId}`);
                                const empData = empRes.data?.object;
                                if (empData) {
                                    employeeName = `${empData.firstName || ''} ${empData.lastName || ''}`.trim() || empData.name || `Employee #${employeeId}`;
                                    employeeMobile = toCleanString(empData.mobile || empData.phone) || 'N/A';
                                    employeeWhatsApp = toCleanString(empData.whatsapp) || 'N/A';
                                    employeeContact = joinPhones([employeeMobile, employeeWhatsApp]);
                                }
                            } catch {
                                console.error('Failed to get employee info');
                            }
                        }
                    }
                    
                    const deliveryStatus = item.deliveryStatus as Record<string, unknown> | null;
                    return {
                        id: (item.id as number) || index + 1,
                        status: (deliveryStatus?.name as string) || 'Unknown Status',
                        statusId: deliveryStatus?.id ? Number(deliveryStatus.id) : undefined,
                        assignedAt: formatDateTime(item.createdAt as string),
                        name: employeeName,
                        employeeId: employeeId ? Number(employeeId) : undefined,
                        contact: employeeContact,
                        mobile: employeeMobile,
                        whatsapp: employeeWhatsApp,
                        note: item.note == null ? null : String(item.note),
                        location: employeeStub.location || 'N/A'
                    };
                }));
                
                setTimeline(timelineData);
            } catch {
                console.error('Failed to fetch delivery history');
            }

        } catch (error: unknown) {
            console.error(error);
            setFound(false);
            setError('An error occurred while fetching your order details.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <NavBar />
            <TrackHero onSearch={handleSearch} isSearched={searchedCode !== null} />

            {searchedCode !== null && (
                <>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <span className="text-orange-500 font-bold text-lg animate-pulse">Loading tracking details...</span>
                        </div>
                    ) : error ? (
                        <div className="py-10 text-center text-red-500 font-medium">
                            {error}
                        </div>
                    ) : found ? (
                        <>
                            <OrderTimeline timeline={timeline} senderDetails={senderDetails} orderDetails={orderDetails} />
                            {/* <TrackMap orderCode={searchedCode} /> */}
                        </>
                    ) : (
                        <TrackNotFound orderCode={searchedCode} />
                    )}
                </>
            )}

            <Footer />
        </div>
        // <SSETestComponent></SSETestComponent>
    );
}

export default TrackYourOrder;
