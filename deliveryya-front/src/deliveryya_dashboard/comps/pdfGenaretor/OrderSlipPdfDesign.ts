import type { Content, ContentColumns, ContentTable, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OrderDataForPdf } from '../../../util/PdfUtil';

export type PartyPhoneSet = {
    primary?: string;
    secondary?: string;
    whatsapp?: string;
};

export type OrderSlipSenderDetails = {
    type: 'market' | 'user' | 'third_party' | 'unknown';
    name?: string;
    email?: string;
    phones: PartyPhoneSet;
    address?: string;
    note?: string;
};

export type OrderSlipAssets = {
    logoBase64: string;
    barcodeImage: string;
    whatsappQr: string;
    locationQr: string;
};

export type OrderSlipBuildInput = {
    orderData: OrderDataForPdf;
    sender: OrderSlipSenderDetails;
    assets: OrderSlipAssets;
    generatedAt: string;
    barcodeValue: string;
};

const colors = {
    ink: '#211407',
    muted: '#6d6256',
    line: '#d8c8ad',
    brand: '#f5a500',
    brandSoft: '#fff5d8',
    brandPale: '#fffbef',
    success: '#16794c',
    danger: '#a32020',
    dark: '#251708',
};

const clean = (value: unknown): string => {
    const normalize = (text: string) => {
        const trimmed = text.trim();
        return trimmed.toLowerCase() === 'n/a' ? '' : trimmed;
    };

    if (typeof value === 'string') {
        return normalize(value);
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return normalize(String(value));
    }
    return '';
};

const stripHtml = (value?: string): string => clean(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const money = (amount: number): string => `Rs. ${Number(amount || 0).toFixed(2)}`;

const firstClean = (...values: unknown[]): string => {
    for (const value of values) {
        const cleanValue = clean(value);
        if (cleanValue) {
            return cleanValue;
        }
    }
    return '';
};

const limitText = (value: string, maxLength: number): string => {
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, maxLength - 3).trim()}...`;
};

const getReceiverPhones = (orderData: OrderDataForPdf): PartyPhoneSet => {
    const dynamicOrder = orderData as OrderDataForPdf & {
        deliveryTo?: {
            primaryMobile?: unknown;
            secondaryMobile?: unknown;
            secondMobile?: unknown;
            secondary_mobile?: unknown;
            second_mobile?: unknown;
            sec_mob?: unknown;
            second_mob?: unknown;
            receiverMobile1?: unknown;
            receiverMobile2?: unknown;
            receiverWhatsapp?: unknown;
            mobile1?: unknown;
            mobile2?: unknown;
            mobile?: unknown;
            phone?: unknown;
            phone1?: unknown;
            phone2?: unknown;
            whatsapp?: unknown;
            whats_app?: unknown;
            whatsApp?: unknown;
            wa?: unknown;
        };
        receiverMobile1?: unknown;
        receiverMobile2?: unknown;
        receiverWhatsapp?: unknown;
        primaryMobile?: unknown;
        secondaryMobile?: unknown;
        secondMobile?: unknown;
        secondary_mobile?: unknown;
        second_mobile?: unknown;
        sec_mob?: unknown;
        second_mob?: unknown;
        mobile?: unknown;
        phone?: unknown;
        phone1?: unknown;
        phone2?: unknown;
        whats_app?: unknown;
        whatsApp?: unknown;
        wa?: unknown;
    };
    const deliveryTo = dynamicOrder.deliveryTo || {};

    return {
        primary: firstClean(
            dynamicOrder.receiverMobile1,
            deliveryTo.receiverMobile1,
            deliveryTo.primaryMobile,
            dynamicOrder.primaryMobile,
            orderData.mobile1,
            deliveryTo.mobile1,
            deliveryTo.phone1,
            dynamicOrder.phone1,
            deliveryTo.mobile,
            deliveryTo.phone,
            dynamicOrder.mobile,
            dynamicOrder.phone,
        ),
        secondary: firstClean(
            dynamicOrder.receiverMobile2,
            deliveryTo.receiverMobile2,
            deliveryTo.secondaryMobile,
            deliveryTo.secondMobile,
            deliveryTo.secondary_mobile,
            deliveryTo.second_mobile,
            deliveryTo.sec_mob,
            deliveryTo.second_mob,
            dynamicOrder.secondaryMobile,
            dynamicOrder.secondMobile,
            dynamicOrder.secondary_mobile,
            dynamicOrder.second_mobile,
            dynamicOrder.sec_mob,
            dynamicOrder.second_mob,
            orderData.mobile2,
            deliveryTo.mobile2,
            deliveryTo.phone2,
            dynamicOrder.phone2,
        ),
        whatsapp: firstClean(
            dynamicOrder.receiverWhatsapp,
            deliveryTo.receiverWhatsapp,
            deliveryTo.whatsapp,
            deliveryTo.whats_app,
            deliveryTo.whatsApp,
            deliveryTo.wa,
            orderData.whatsapp,
            dynamicOrder.whats_app,
            dynamicOrder.whatsApp,
            dynamicOrder.wa,
        ),
    };
};

const phoneRows = (phones: PartyPhoneSet): Content[] => {
    const rows: Array<[string, string?]> = [
        [clean(phones.primary)],
        [clean(phones.secondary)],
        [clean(phones.whatsapp), colors.success],
    ];

    return rows
        .filter(([value]) => Boolean(value))
        .map(([value, color]) => ({
            text: value,
            style: 'phoneValue',
            color: color || colors.ink,
            margin: [0, 1, 0, 0],
        }));
};

const detailLine = (label: string, value?: string): Content | null => {
    const safeValue = clean(value);
    if (!safeValue) {
        return null;
    }

    return {
        columns: [
            { text: label, width: 42, style: 'tinyLabel' },
            { text: safeValue, width: '*', style: 'smallValue' },
        ],
        columnGap: 4,
        margin: [0, 1.5, 0, 0],
    };
};

const infoStrip = (text: string): Content => ({
    table: {
        widths: ['*'],
        body: [[{
            text,
            style: 'confidentialText',
            fillColor: colors.brandPale,
            margin: [7, 4, 7, 4],
        }]],
    },
    layout: {
        hLineColor: () => colors.line,
        vLineColor: () => colors.line,
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
    },
    margin: [0, 7, 0, 0],
} as ContentTable);

const partyPanel = (
    title: string,
    name: string,
    address: string,
    phones: PartyPhoneSet,
    extraLines: Content[],
): Content => {
    const stack: Content[] = [
        {
            text: title,
            style: 'sectionTitle',
            fillColor: colors.dark,
            color: colors.brand,
            margin: [0, 0, 0, 4],
        },
    ];

    if (clean(name)) {
        stack.push({ text: name, style: 'partyName' });
    }

    if (clean(address)) {
        stack.push({ text: address, style: 'address', margin: [0, 1, 0, 3] });
    }

    const phonesContent = phoneRows(phones);
    if (phonesContent.length > 0) {
        stack.push({
            stack: phonesContent,
            margin: [0, 2, 0, 0],
        });
    }

    if (extraLines.length > 0) {
        stack.push(...extraLines);
    }

    return {
        table: {
            widths: ['*'],
            body: [[{ stack, margin: [7, 0, 7, 7] }]],
        },
        layout: {
            hLineColor: () => colors.line,
            vLineColor: () => colors.line,
            hLineWidth: () => 0.8,
            vLineWidth: () => 0.8,
        },
    } as ContentTable;
};

const metricCell = (label: string, value: string, highlight = false): Content => ({
    stack: [
        { text: label, style: 'metricLabel' },
        { text: value, style: highlight ? 'metricValueHot' : 'metricValue' },
    ],
    fillColor: highlight ? '#fff0aa' : colors.brandSoft,
    margin: [5, 5, 5, 5],
});

const qrCard = (title: string, image: string, value: string): Content | null => {
    if (!image) {
        return null;
    }

    return {
        table: {
            widths: [54],
            body: [[{
                stack: [
                    { text: title, style: 'qrTitle' },
                    { image, width: 44, height: 44, alignment: 'center', margin: [0, 2, 0, 1] },
                    { text: value, style: 'qrCaption' },
                ],
                margin: [4, 4, 4, 4],
            }]],
        },
        layout: {
            hLineColor: () => colors.line,
            vLineColor: () => colors.line,
            hLineWidth: () => 0.8,
            vLineWidth: () => 0.8,
        },
    } as ContentTable;
};

const buildSlipContent = (input: OrderSlipBuildInput): Content[] => {
    const { orderData, sender, assets, generatedAt, barcodeValue } = input;
    const receiverPhones = getReceiverPhones(orderData);
    const description = limitText(stripHtml(orderData.description), 180);
    const receiverExtra = [
        detailLine('City', clean(orderData.city)),
        detailLine('Postal', clean(orderData.postalCode)),
    ].filter(Boolean) as Content[];
    const senderExtra: Content[] = [];

    const qrCards = [
        qrCard('WhatsApp', assets.whatsappQr, clean(receiverPhones.whatsapp)),
        qrCard('Location', assets.locationQr, 'Map pin'),
    ].filter(Boolean) as Content[];

    const content: Content[] = [
        {
            table: {
                widths: [135, '*', 170],
                body: [[
                    {
                        columns: [
                            assets.logoBase64 ? { image: assets.logoBase64, width: 42, height: 32 } : { text: '' },
                            {
                                stack: [
                                    { text: 'DeliveryYa', style: 'brandName' },
                                    { text: 'COD ORDER SLIP', style: 'brandSub' },
                                ],
                                margin: [8, 1, 0, 0],
                            },
                        ],
                        fillColor: colors.brand,
                        margin: [8, 8, 4, 7],
                    },
                    {
                        stack: [
                            { text: 'Collective Amount', style: 'collectLabel' },
                            { text: money(orderData.collectivePrice), style: 'collectValue' },
                        ],
                        fillColor: colors.brand,
                        alignment: 'center',
                        margin: [4, 9, 4, 6],
                    },
                    {
                        stack: [
                            { text: `Generated: ${generatedAt}`, style: 'generated' },
                            assets.barcodeImage
                                ? { image: assets.barcodeImage, width: 145, height: 34, alignment: 'right', margin: [0, 2, 0, 1] }
                                : { text: '' },
                            { text: barcodeValue, style: 'codeText' },
                        ],
                        fillColor: colors.brand,
                        margin: [4, 7, 8, 5],
                    },
                ]],
            },
            layout: 'noBorders',
        },
        {
            table: {
                widths: ['*', '*', 45, 64, '*'],
                body: [[
                    metricCell('Order Price', money(orderData.orderPrice)),
                    metricCell('Delivery Fee', money(orderData.deliveryFee)),
                    metricCell('Qty', String(orderData.quantity || 0)),
                    metricCell('Weight', `${Number(orderData.weight || 0).toFixed(2)} kg`),
                    metricCell('Total COD', money(orderData.collectivePrice), true),
                ]],
            },
            layout: {
                hLineColor: () => colors.line,
                vLineColor: () => colors.line,
                hLineWidth: () => 0.6,
                vLineWidth: () => 0.6,
            },
        } as ContentTable,
        {
            columns: [
                partyPanel('SENDER DETAILS', clean(sender.name), clean(sender.address), sender.phones, senderExtra),
                partyPanel('RECEIVER DETAILS', clean(orderData.recipientName), clean(orderData.address), receiverPhones, receiverExtra),
            ],
            columnGap: 8,
            margin: [0, 7, 0, 0],
        } as ContentColumns,
    ];

    if (description) {
        content.push({
            table: {
                widths: ['*'],
                body: [[{
                    stack: [
                        { text: 'PACKAGE DETAILS', style: 'noteTitle' },
                        { text: description, style: 'noteText' },
                    ],
                    margin: [7, 5, 7, 6],
                    fillColor: colors.brandPale,
                }]],
            },
            layout: {
                hLineColor: () => colors.line,
                vLineColor: () => colors.line,
                hLineWidth: () => 0.8,
                vLineWidth: () => 0.8,
            },
            margin: [0, 7, 0, 0],
        } as ContentTable);
    }

    content.push(infoStrip('Confidential dispatch document. Use only for order handover and delivery verification.'));

    if (qrCards.length > 0) {
        content.push({
            columns: [
                ...qrCards,
                {
                    stack: [
                        { text: 'Thank you for choosing DeliveryYa.', style: 'footerTitle' },
                        { text: 'Please verify the order code, sender contact, receiver contact, and address before handover.', style: 'footerText' },
                    ],
                    width: '*',
                    margin: [8, 11, 0, 0],
                },
            ],
            columnGap: 6,
            margin: [0, 7, 0, 0],
        } as ContentColumns);
    }

    content.push({
        table: {
            widths: ['*'],
            body: [[{
                columns: [
                    { text: 'DeliveryYa (Pvt) Ltd', style: 'companyName' },
                    { text: 'Thank you for using DeliveryYa', style: 'companyThanks' },
                ],
                fillColor: colors.dark,
                margin: [8, 5, 8, 5],
            }]],
        },
        layout: 'noBorders',
        margin: [0, 7, 0, 0],
    } as ContentTable);

    return content;
};

export const buildOrderSlipDocumentDefinition = (
    input: OrderSlipBuildInput,
    options?: { pageBreakBefore?: boolean },
): TDocumentDefinitions => ({
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [20, 18, 20, 18],
    content: [
        {
            stack: buildSlipContent(input),
            margin: [0, 0, 0, 0],
            pageBreak: options?.pageBreakBefore ? 'before' : undefined,
        },
    ],
    defaultStyle: {
        font: 'Roboto',
        color: colors.ink,
        fontSize: 8.2,
    },
    styles: {
        brandName: { fontSize: 18, bold: true, color: colors.ink },
        brandSub: { fontSize: 7, bold: true, color: '#5d3300', characterSpacing: 1.5 },
        generated: { fontSize: 6.8, color: '#4a2800', alignment: 'right' },
        codeText: { fontSize: 9.5, bold: true, characterSpacing: 1.2, alignment: 'right' },
        collectLabel: { fontSize: 7, bold: true, color: '#5d3300', characterSpacing: 0.8 },
        collectValue: { fontSize: 17, bold: true, color: colors.danger },
        metricLabel: { fontSize: 6.7, bold: true, color: '#7a4400' },
        metricValue: { fontSize: 10.5, bold: true, color: colors.ink },
        metricValueHot: { fontSize: 12, bold: true, color: colors.danger },
        sectionTitle: { fontSize: 7.2, bold: true, characterSpacing: 1.1 },
        partyName: { fontSize: 12.5, bold: true, color: colors.ink },
        address: { fontSize: 8, color: '#3f3428', lineHeight: 1.15 },
        tinyLabel: { fontSize: 6.7, bold: true, color: colors.muted },
        smallValue: { fontSize: 7.3, color: colors.ink },
        phoneValue: { fontSize: 8.1, bold: true },
        noteTitle: { fontSize: 7.2, bold: true, color: '#7a4400', characterSpacing: 1 },
        noteText: { fontSize: 8.1, color: '#3f3428', lineHeight: 1.15, margin: [0, 3, 0, 0] },
        confidentialText: { fontSize: 7.2, color: colors.muted, italics: true },
        qrTitle: { fontSize: 6.8, bold: true, color: colors.muted, alignment: 'center' },
        qrCaption: { fontSize: 5.5, color: colors.muted, alignment: 'center' },
        footerTitle: { fontSize: 9.2, bold: true, color: colors.ink },
        footerText: { fontSize: 7.2, color: colors.muted, lineHeight: 1.15 },
        companyName: { fontSize: 8.4, bold: true, color: colors.brand },
        companyThanks: { fontSize: 8, color: '#fff6d9', alignment: 'right' },
    },
});

export const buildMultipleOrderSlipDocumentDefinition = (
    inputs: OrderSlipBuildInput[],
): TDocumentDefinitions => ({
    ...buildOrderSlipDocumentDefinition(inputs[0]),
    content: inputs.map((input, index) => ({
        stack: buildSlipContent(input),
        margin: [0, 0, 0, index % 2 === 0 ? 12 : 0],
        pageBreak: index > 0 && index % 2 === 0 ? 'before' : undefined,
        unbreakable: true,
    } as Content)),
});
