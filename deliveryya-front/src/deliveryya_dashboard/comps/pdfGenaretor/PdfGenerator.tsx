import JsBarcode from 'jsbarcode';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import QRCode from 'qrcode';
import logoImage from '../../../assets/images/logo.jpeg';
import type { OrderDataForPdf } from '../../../util/PdfUtil';
import axiosInstance from '../../../util/AxiosUtil';
import {
    buildMultipleOrderSlipDocumentDefinition,
    buildOrderSlipDocumentDefinition,
    type OrderSlipBuildInput,
    type OrderSlipSenderDetails,
    type PartyPhoneSet,
} from './OrderSlipPdfDesign';

type GenerateAction = 'print' | 'download';

type SenderDetails = OrderSlipSenderDetails;

type AddressRecord = Record<string, any> | null;

export type OrderSlipGenerationProgress = {
    processed: number;
    total: number;
    orderCode: string;
};

interface GenerateMultipleOptions {
    onProgress?: (progress: OrderSlipGenerationProgress) => void;
}

interface GenerateSingleOptions {
    onPrepared?: () => void;
}

interface SenderCache {
    market: Map<number, SenderDetails>;
    user: Map<number, SenderDetails>;
}

(pdfMake as unknown as { vfs: Record<string, string> }).vfs =
    pdfFonts as unknown as Record<string, string>;

const DEFAULT_SENDER: SenderDetails = {
    type: 'unknown',
    name: '',
    email: '',
    phones: {},
    address: '',
    note: '',
};

const formatDate = (date: Date = new Date()): string =>
    date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const parseNumericId = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return undefined;
};

const toCleanString = (value: unknown): string => {
    if (typeof value === 'string') {
        return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return '';
};

const firstClean = (...values: unknown[]): string => {
    for (const value of values) {
        const cleanValue = toCleanString(value);
        if (cleanValue) {
            return cleanValue;
        }
    }
    return '';
};

const buildPhoneSet = (primary?: unknown, secondary?: unknown, whatsapp?: unknown): PartyPhoneSet => ({
    primary: toCleanString(primary),
    secondary: toCleanString(secondary),
    whatsapp: toCleanString(whatsapp),
});

const responsePayload = (response: { data?: any }): any =>
    response.data?.object ?? response.data?.exData ?? {};

const selectDefaultAddress = (payload: unknown): AddressRecord => {
    const list = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { items?: unknown[] })?.items)
            ? (payload as { items: unknown[] }).items
            : Array.isArray((payload as { content?: unknown[] })?.content)
                ? (payload as { content: unknown[] }).content
                : null;

    if (list) {
        return (
            list.find((item) => Boolean(item?.defaultAddress || item?.permanent)) ||
            list[0] ||
            null
        );
    }
    if (payload && typeof payload === 'object') {
        const nested = (payload as Record<string, any>).deliveryAddress;
        return nested && typeof nested === 'object'
            ? { ...nested, ...(payload as Record<string, any>) }
            : payload as AddressRecord;
    }
    return null;
};

const formatAddress = (addressRecord: AddressRecord, fallback?: unknown): string => {
    const cityName = firstClean(
        addressRecord?.city?.name,
        addressRecord?.cities?.name,
        addressRecord?.cityName,
        addressRecord?.location,
    );
    const street = firstClean(addressRecord?.address, fallback);
    return [street, cityName].filter(Boolean).join(', ');
};

const buildUserPhoneSet = (user: Record<string, any>, addressRecord: AddressRecord): PartyPhoneSet => {
    const primary = firstClean(
        addressRecord?.primaryMobile,
        addressRecord?.mobile1,
        addressRecord?.firstMobile,
        addressRecord?.first_mob,
        addressRecord?.first_num,
        addressRecord?.phone,
        addressRecord?.phoneNumber,
        addressRecord?.mobileNumber,
        addressRecord?.mobile,
        user?.mobile,
        user?.primaryMobile,
        user?.mobile1,
        user?.firstMobile,
        user?.first_mob,
        user?.first_num,
        user?.phone,
        user?.phoneNumber,
        user?.mobileNumber,
    );
    const secondary = firstClean(
        addressRecord?.secondaryMobile,
        addressRecord?.secondMobile,
        addressRecord?.mobile2,
        addressRecord?.second_mob,
        addressRecord?.sec_mob,
        addressRecord?.second_num,
        addressRecord?.secondPhone,
        addressRecord?.secondaryPhone,
        addressRecord?.phone2,
        user?.secondaryMobile,
        user?.secondMobile,
        user?.mobile2,
        user?.second_mob,
        user?.sec_mob,
        user?.second_num,
        user?.secondaryPhone,
        user?.phone2,
    );
    const whatsapp = firstClean(
        addressRecord?.whatsapp,
        addressRecord?.whats_app,
        addressRecord?.whatsApp,
        addressRecord?.wa,
        user?.whatsapp,
        user?.whats_app,
        user?.whatsApp,
        user?.wa,
    );

    return buildPhoneSet(primary, secondary, whatsapp);
};

const buildSenderPhoneSet = (payload: Record<string, unknown>): PartyPhoneSet => buildPhoneSet(
    firstClean(
        payload.first_mob,
        payload.firstMob,
        payload.firstMobile,
        payload.first_num,
        payload.primaryMobile,
        payload.mobile1,
        payload.phone1,
        payload.mobile,
        payload.phone,
    ),
    firstClean(
        payload.sec_mob,
        payload.second_mob,
        payload.secondMob,
        payload.secondMobile,
        payload.second_num,
        payload.secondaryMobile,
        payload.mobile2,
        payload.phone2,
        payload.secondaryPhone,
    ),
    firstClean(
        payload.whatsapp,
        payload.whats_app,
        payload.whatsApp,
        payload.wa,
    ),
);

const hasAnyPhone = (phones: PartyPhoneSet): boolean =>
    Boolean(toCleanString(phones.primary) || toCleanString(phones.secondary) || toCleanString(phones.whatsapp));

const getReceiverWhatsapp = (orderData: OrderDataForPdf): string => {
    const dynamicOrder = orderData as OrderDataForPdf & {
        receiverWhatsapp?: string;
        whats_app?: string;
        whatsApp?: string;
        wa?: string;
        deliveryTo?: {
            receiverWhatsapp?: string;
            whatsapp?: string;
            whats_app?: string;
            whatsApp?: string;
            wa?: string;
        };
    };

    return firstClean(
        dynamicOrder.receiverWhatsapp,
        dynamicOrder.deliveryTo?.receiverWhatsapp,
        dynamicOrder.deliveryTo?.whatsapp,
        dynamicOrder.deliveryTo?.whats_app,
        dynamicOrder.deliveryTo?.whatsApp,
        dynamicOrder.deliveryTo?.wa,
        orderData.whatsapp,
        dynamicOrder.whats_app,
        dynamicOrder.whatsApp,
        dynamicOrder.wa,
    );
};

const getWhatsappLink = (whatsapp?: string): string => {
    if (!whatsapp) {
        return '';
    }
    const phone = whatsapp.replace(/\D/g, '').replace(/^0/, '');
    return phone ? `https://wa.me/94${phone}` : '';
};

const convertImageUrlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert image to Base64'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
    });
};

const generateQrBase64 = async (value: string): Promise<string> => {
    try {
        return await QRCode.toDataURL(value, {
            width: 180,
            margin: 1,
            errorCorrectionLevel: 'H',
        });
    } catch {
        return '';
    }
};

const generateBarcodeBase64 = (value: string): string => {
    try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, value, {
            format: 'CODE128',
            width: 2,
            height: 48,
            displayValue: false,
            margin: 4,
        });
        return canvas.toDataURL('image/png');
    } catch {
        return '';
    }
};

const lookupMarketSender = async (
    marketOrderId: number,
    cache: SenderCache,
): Promise<SenderDetails> => {
    const cached = cache.market.get(marketOrderId);
    if (cached) {
        return cached;
    }

    const response = await axiosInstance.get(
        `/markets/get-markets-details-by-market-order-id?marketOrderId=${marketOrderId}`,
    );
    const payload = response.data?.object || response.data?.exData || {};
    const user = payload?.users || {};
    const sender: SenderDetails = {
        type: 'market',
        name: payload?.name || 'Market',
        email: toCleanString(user?.email),
        phones: buildPhoneSet(
            firstClean(payload?.first_num, payload?.first_mob, payload?.primaryMobile, user?.mobile, user?.primaryMobile, user?.phone),
            firstClean(payload?.second_num, payload?.second_mob, payload?.sec_mob, payload?.secondaryMobile, user?.secondaryMobile, user?.mobile2, user?.phone2),
            firstClean(payload?.whats_app, payload?.whatsapp, payload?.whatsApp, user?.whatsapp, user?.whats_app, user?.whatsApp),
        ),
        address: firstClean(payload?.address, payload?.location),
        note: firstClean(payload?.infoMessage, payload?.desc),
    };

    cache.market.set(marketOrderId, sender);
    return sender;
};

const lookupUserSender = async (userId: number, cache: SenderCache): Promise<SenderDetails> => {
    const cached = cache.user.get(userId);
    if (cached) {
        return cached;
    }

    let user: Record<string, any> = {};
    let defaultAddress: AddressRecord = null;

    try {
        const userResponse = await axiosInstance.get(`/users/admin/get-user-by-id?id=${userId}`);
        user = responsePayload(userResponse) || {};
    } catch {
        const fallback = await axiosInstance.post('/users/get-users', {
            pageNumber: 0,
            countPerPage: 10,
            userId,
        });
        user = fallback.data?.object?.items?.[0] || {};
    }

    try {
        const addressResponse = await axiosInstance.get(
            `/users/get-address-by-id-or-user-id?defaultAddress=true&userId=${userId}`,
        );
        defaultAddress = selectDefaultAddress(responsePayload(addressResponse));
    } catch {
        try {
            const addressResponse = await axiosInstance.get(
                `/users/get-address-by-id-or-user-id?userId=${userId}`,
            );
            defaultAddress = selectDefaultAddress(responsePayload(addressResponse));
        } catch {
            defaultAddress = null;
        }
    }

    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const sender: SenderDetails = {
        type: 'user',
        name: fullName || user?.name || `User #${userId}`,
        email: '',
        phones: buildUserPhoneSet(user, defaultAddress),
        address: formatAddress(defaultAddress, user?.address),
        note: '',
    };

    cache.user.set(userId, sender);
    return sender;
};

const resolveSenderDetails = async (
    orderData: OrderDataForPdf,
    cache: SenderCache,
): Promise<SenderDetails> => {
    const dynamicOrder = orderData as OrderDataForPdf & {
        thirdPartySenders?: OrderDataForPdf['thirdPartySender'];
        thirdPartyDetails?: OrderDataForPdf['thirdPartySender'];
        thirdPartySenderDetails?: OrderDataForPdf['thirdPartySender'];
        orderCode?: OrderDataForPdf['orderCodeDetails'];
    };
    const thirdParty =
        dynamicOrder.thirdPartySender ||
        dynamicOrder.thirdPartySenders ||
        dynamicOrder.thirdPartyDetails ||
        dynamicOrder.thirdPartySenderDetails;
    const thirdPartyPhones = thirdParty ? buildSenderPhoneSet(thirdParty as Record<string, unknown>) : {};
    const hasThirdParty = Boolean(
        thirdParty && (
            toCleanString(thirdParty.name) ||
            toCleanString(thirdParty.address) ||
            hasAnyPhone(thirdPartyPhones)
        ),
    );

    if (hasThirdParty && thirdParty) {
        return {
            type: 'third_party',
            name: thirdParty.name || '',
            email: '',
            phones: thirdPartyPhones,
            address: thirdParty.address || '',
            note: '',
        };
    }

    const marketOrderId = parseNumericId(orderData.marketOrderId);
    if (marketOrderId) {
        try {
            return await lookupMarketSender(marketOrderId, cache);
        } catch {
            return {
                ...DEFAULT_SENDER,
                type: 'market',
            };
        }
    }

    const orderCodeDetails = orderData.orderCodeDetails || dynamicOrder.orderCode;
    const userId = parseNumericId(
        orderData.orderCodeUserId ||
        orderCodeDetails?.users?.id ||
        orderCodeDetails?.user?.id ||
        orderCodeDetails?.userId,
    );
    if (userId) {
        try {
            return await lookupUserSender(userId, cache);
        } catch {
            return {
                ...DEFAULT_SENDER,
                type: 'user',
                name: `User #${userId}`,
            };
        }
    }

    if (orderData.senderName || orderData.senderEmail || orderData.senderPhone || orderData.senderAddress) {
        return {
            type: orderData.senderType || 'unknown',
            name: orderData.senderName || '',
            email: orderData.senderEmail || '',
            phones: buildPhoneSet(
                orderData.senderPhone,
                (orderData as OrderDataForPdf & { senderPhone2?: string; senderSecondPhone?: string }).senderPhone2 ||
                (orderData as OrderDataForPdf & { senderPhone2?: string; senderSecondPhone?: string }).senderSecondPhone,
                (orderData as OrderDataForPdf & { senderWhatsapp?: string }).senderWhatsapp,
            ),
            address: orderData.senderAddress || '',
            note: '',
        };
    }

    return DEFAULT_SENDER;
};

const buildOrderSlipInput = async (
    orderData: OrderDataForPdf,
    logoBase64: string,
    cache: SenderCache,
): Promise<OrderSlipBuildInput> => {
    const sender = await resolveSenderDetails(orderData, cache);
    const receiverWhatsapp = getReceiverWhatsapp(orderData);
    const whatsappLink = getWhatsappLink(receiverWhatsapp);

    const [whatsappQr, locationQr] = await Promise.all([
        whatsappLink ? generateQrBase64(whatsappLink) : Promise.resolve(''),
        orderData.googleMapLocation ? generateQrBase64(orderData.googleMapLocation) : Promise.resolve(''),
    ]);

    const barcodeValue = orderData.orderCode || orderData.orderId || '-';
    const barcodeImage = generateBarcodeBase64(barcodeValue);

    return {
        orderData,
        sender,
        generatedAt: formatDate(),
        barcodeValue,
        assets: {
            logoBase64,
            barcodeImage,
            whatsappQr,
            locationQr,
        },
    };
};

const printOrDownload = (
    pdf: ReturnType<typeof pdfMake.createPdf>,
    action: GenerateAction,
    filename: string,
): Promise<void> => {
    return new Promise((resolve) => {
        if (action === 'download') {
            pdf.download(filename);
            resolve();
            return;
        }

        pdf.getBlob()
            .then((blob: Blob) => {
                const blobUrl = URL.createObjectURL(blob);
                const printWindow = window.open(blobUrl, '_blank');
                if (!printWindow) {
                    URL.revokeObjectURL(blobUrl);
                    resolve();
                    return;
                }

                const tryPrint = () => {
                    printWindow.focus();
                    printWindow.print();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
                    resolve();
                };

                printWindow.onload = () => {
                    setTimeout(tryPrint, 300);
                };

                setTimeout(tryPrint, 1200);
            })
            .catch(() => {
                resolve();
            });
    });
};

export const buildOrderSlipPreviewHtml = async (orderData: OrderDataForPdf): Promise<string> => {
    const logoBase64 = await convertImageUrlToBase64(logoImage);
    const cache: SenderCache = { market: new Map(), user: new Map() };
    const input = await buildOrderSlipInput(orderData, logoBase64, cache);
    const docDefinition = buildOrderSlipDocumentDefinition(input);
    const pdf = pdfMake.createPdf(docDefinition);
    const dataUrl = await pdf.getDataUrl();

    return `
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <style>
                    html, body { margin: 0; height: 100%; background: #f3f4f6; }
                    iframe { width: 100%; height: 100%; border: 0; background: white; }
                </style>
            </head>
            <body>
                <iframe title="Order Slip PDF Preview" src="${dataUrl}"></iframe>
            </body>
        </html>
    `;
};

export const generateOrderSlipPdfMake = async (
    orderData: OrderDataForPdf,
    action: GenerateAction = 'download',
    options?: GenerateSingleOptions,
): Promise<void> => {
    const cache: SenderCache = { market: new Map(), user: new Map() };
    const logoBase64 = await convertImageUrlToBase64(logoImage);
    const input = await buildOrderSlipInput(orderData, logoBase64, cache);

    options?.onPrepared?.();

    const docDefinition: TDocumentDefinitions = buildOrderSlipDocumentDefinition(input);

    const pdf = pdfMake.createPdf(docDefinition);
    await printOrDownload(pdf, action, `Order-${orderData.orderCode || 'Slip'}.pdf`);
};

export const generateMultipleOrderSlipsPdfMake = async (
    ordersData: OrderDataForPdf[],
    action: GenerateAction = 'download',
    options?: GenerateMultipleOptions,
): Promise<void> => {
    if (ordersData.length === 0) {
        return;
    }

    const cache: SenderCache = { market: new Map(), user: new Map() };
    const logoBase64 = await convertImageUrlToBase64(logoImage);
    const inputs: OrderSlipBuildInput[] = [];

    for (let i = 0; i < ordersData.length; i++) {
        const orderData = ordersData[i];
        inputs.push(await buildOrderSlipInput(orderData, logoBase64, cache));

        options?.onProgress?.({
            processed: i + 1,
            total: ordersData.length,
            orderCode: orderData.orderCode || orderData.orderId || String(i + 1),
        });
    }

    const docDefinition: TDocumentDefinitions = buildMultipleOrderSlipDocumentDefinition(inputs);

    const pdf = pdfMake.createPdf(docDefinition);
    const filename = `Orders-${new Date().getTime()}.pdf`;
    await printOrDownload(pdf, action, filename);
};

function PdfGenerator() {
    const sampleOrder: OrderDataForPdf = {
        orderId: '',
        orderCode: 'DY-10025',
        orderPrice: 2450,
        collectivePrice: 2450,
        deliveryFee: 450,
        quantity: 2,
        weight: 1.5,
        description: 'Handle with care. Call before delivery.',
        recipientName: 'Sample Customer',
        address: 'No 15, Main Street, Colombo 05',
        city: 'Colombo',
        postalCode: '00500',
        mobile1: '0771234567',
        mobile2: '0717654321',
        whatsapp: '0771234567',
        googleMapLocation: 'https://maps.google.com/?q=6.9271,79.8612',
        senderName: 'Deliveryya Main Office',
        senderEmail: 'ops@deliveryya.com',
        senderPhone: '0112223344',
        senderAddress: 'No 1, Sample Road, Colombo',
        senderType: 'user',
    };

    return (
        <div className="p-6 flex gap-3">
            <button
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={() => void generateOrderSlipPdfMake(sampleOrder, 'download')}
            >
                Download Sample PDF
            </button>
            <button
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-black text-white font-semibold"
                onClick={() => void generateOrderSlipPdfMake(sampleOrder, 'print')}
            >
                Print Sample PDF
            </button>
        </div>
    );
}

export default PdfGenerator;
