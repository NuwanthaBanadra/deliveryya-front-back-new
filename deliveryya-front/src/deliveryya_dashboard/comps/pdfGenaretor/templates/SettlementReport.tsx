/* eslint-disable react-refresh/only-export-components */
import html2canvas from 'html2canvas';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { ROLE_IDS } from '../../../../util/RoleAccess';

(pdfMake as unknown as { vfs: Record<string, string> }).vfs = pdfFonts as unknown as Record<string, string>;

export interface SettlementReportOrder {
    id: number;
    marketOrder?: {
        id?: number;
    } | null;
    orderCode?: string;
    createdAt?: string;
    createdDate?: string;
    orderDate?: string;
    createdOn?: string;
    date?: string;
    deliveryTo?: {
        fullName?: string;
        city?: { name?: string };
    };
    paymentStatus?: { id?: number; name?: string };
    paymentType?: { id?: number; name?: string };
    deliveryStatus?: { id?: number; name?: string };
    deliveryFee: number;
    collectivePrice: number;
    totalPrice?: number;
    paidAmount?: number;
}

export interface CommonReportInput {
    scopeLabel: string;
    dateRangeLabel: string;
    reportType: 'client-market' | 'delivery-company';
    userRoleId?: number | null;
    appliedFilters?: string[];
    subjectDetails?: {
        name?: string;
        address?: string;
    };
    orders: SettlementReportOrder[];
}

export type CustomReportColumnKey =
    | 'orderCode'
    | 'date'
    | 'customerName'
    | 'city'
    | 'paymentStatus'
    | 'paymentType'
    | 'deliveryStatus'
    | 'deliveryFee'
    | 'totalPrice'
    | 'collectivePrice';

export interface CustomReportInput {
    scopeLabel: string;
    dateRangeLabel: string;
    reportType: 'client-market' | 'delivery-company';
    userRoleId?: number | null;
    appliedFilters?: string[];
    subjectDetails?: {
        name?: string;
        address?: string;
    };
    selectedColumns: CustomReportColumnKey[];
    orders: SettlementReportOrder[];
}

export interface SettlementReportInput {
    scopeLabel: string;
    dateRangeLabel: string;
    reportType: 'client-market' | 'delivery-company';
    userRoleId?: number | null;
    appliedFilters?: string[];
    subjectDetails?: {
        name?: string;
        address?: string;
    };
    includePaidAmountInSettlement?: boolean;
    orders: SettlementReportOrder[];
}

type PdfAction = 'print' | 'download';

const DELIVERY_COMPANY_COLUMNS: CustomReportColumnKey[] = [
    'orderCode', 'date', 'customerName', 'paymentStatus', 'deliveryStatus', 'deliveryFee', 'totalPrice', 'collectivePrice',
];

const CLIENT_MARKET_COLUMNS: CustomReportColumnKey[] = [
    'orderCode', 'date', 'customerName', 'paymentStatus', 'deliveryStatus', 'totalPrice', 'collectivePrice',
];

const formatCurrency = (value: number): string => `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatAmount = (value: number): string => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SUCCESS_DELIVERY_STATUS_IDS = new Set([7, 10]);
const RETURNED_DELIVERY_STATUS_ID = 9;
const INCLUDED_SETTLEMENT_STATUS_IDS = new Set([7, 9, 10]);
const DELIVERY_COMPANY_RECEIVED_PAYMENT_STATUS_IDS = new Set([2, 4]);
const MARKET_BANK_TRANSFER_PAYMENT_TYPE_IDS = new Set([2]);

const formatDate = (value?: string): string => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const normalizeOrderDate = (order: SettlementReportOrder): string => formatDate(order.createdAt ?? order.createdDate ?? order.orderDate ?? order.createdOn ?? order.date ?? undefined);
const toPositiveInteger = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getStatusName = (status?: { name?: string }): string => status?.name?.trim() || 'N/A';
const getStatusId = (status?: { id?: number }): number | null => toPositiveInteger(status?.id ?? null);
const toAmount = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeName = (value?: string): string => (value || '').trim().toLowerCase().replace(/\s+/g, '');
const isPaidAmountReceivedByDeliveryCompany = (order: SettlementReportOrder): boolean => {
    const paymentStatusId = getStatusId(order.paymentStatus);
    const paymentTypeId = getStatusId(order.paymentType);
    const paymentStatusName = normalizeName(order.paymentStatus?.name);
    const paymentTypeName = normalizeName(order.paymentType?.name);
    const isPaidToDeliveryCompany =
        (paymentStatusId !== null && DELIVERY_COMPANY_RECEIVED_PAYMENT_STATUS_IDS.has(paymentStatusId)) ||
        paymentStatusName.includes('completed') ||
        paymentStatusName.includes('paidbyagent');
    const isBankTransfer =
        (paymentTypeId !== null && MARKET_BANK_TRANSFER_PAYMENT_TYPE_IDS.has(paymentTypeId)) ||
        paymentTypeName.includes('banktransfer') ||
        paymentTypeName.includes('branktransfer');
    const isMarketBankTransfer = Boolean(order.marketOrder?.id) && isBankTransfer;

    return isPaidToDeliveryCompany && !isMarketBankTransfer;
};

const filterSettlementOrders = (orders: SettlementReportOrder[]): SettlementReportOrder[] => orders.filter((order) => {
    const deliveryStatusId = getStatusId(order.deliveryStatus);
    return !!deliveryStatusId && INCLUDED_SETTLEMENT_STATUS_IDS.has(deliveryStatusId);
});

const uniqueNames = (values: Array<string | undefined>): string[] => Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)));

const getReportAccentLabel = (reportType: 'client-market' | 'delivery-company'): string => (reportType === 'delivery-company' ? 'Delivery-side report' : 'Client-facing report');

const getDefaultCustomColumns = (reportType: 'client-market' | 'delivery-company'): CustomReportColumnKey[] => (reportType === 'delivery-company' ? DELIVERY_COMPANY_COLUMNS : CLIENT_MARKET_COLUMNS);
const filterCustomColumnsForReport = (input: Pick<CustomReportInput, 'reportType' | 'selectedColumns'>): CustomReportColumnKey[] => {
    const allowedColumns = new Set(getDefaultCustomColumns(input.reportType));
    const filtered = input.selectedColumns.filter((column) => allowedColumns.has(column));
    return filtered.length > 0 ? filtered : getDefaultCustomColumns(input.reportType);
};

const getSettlementLabels = (reportType: 'client-market' | 'delivery-company'): { valueLabel: string; settlementLabel: string; note: string } => (
    reportType === 'delivery-company'
        ? { valueLabel: 'Client Settlement', settlementLabel: 'Delivery Revenue', note: 'Delivery fee earned' }
        : { valueLabel: 'Gross Value', settlementLabel: 'Settlement', note: 'Client-facing settlement' }
);

const getCustomColumnDefinition = (columnKey: CustomReportColumnKey, reportType: 'client-market' | 'delivery-company'): { header: string; align: 'left' | 'center' | 'right' } => {
    const isDeliveryCompanyReport = reportType === 'delivery-company';
    const definitions: Record<CustomReportColumnKey, { header: string; align: 'left' | 'center' | 'right' }> = {
        orderCode: { header: 'Order Code', align: 'left' },
        date: { header: 'Date', align: 'center' },
        customerName: { header: 'Customer', align: 'left' },
        city: { header: 'City', align: 'left' },
        paymentStatus: { header: 'Payment', align: 'center' },
        paymentType: { header: 'Payment Type', align: 'center' },
        deliveryStatus: { header: 'Delivery Status', align: 'center' },
        deliveryFee: { header: 'Delivery Fee', align: 'right' },
        totalPrice: { header: isDeliveryCompanyReport ? 'Client Settlement' : 'Settlement', align: 'right' },
        collectivePrice: { header: isDeliveryCompanyReport ? 'Gross Collectible' : 'Gross Value', align: 'right' },
    };

    return definitions[columnKey];
};

const toDataUrl = async (assetPath: string): Promise<string> => {
    const response = await fetch(assetPath);
    if (!response.ok) throw new Error(`Unable to load asset: ${assetPath}`);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error(`Failed to convert asset to data URL: ${assetPath}`));
            }
        };
        reader.onerror = () => reject(reader.error ?? new Error(`Failed to read asset: ${assetPath}`));
        reader.readAsDataURL(blob);
    });
};

const resolveSubjectDetails = (
    input: SettlementReportInput | CommonReportInput
): Required<Pick<NonNullable<SettlementReportInput['subjectDetails']>, 'name' | 'address'>> => ({
    name: input.subjectDetails?.name?.trim() || 'N/A',
    address: input.subjectDetails?.address?.trim() || 'N/A',
});

const getSubjectKind = (userRoleId?: number | null): 'Market' | 'Client' => (userRoleId === ROLE_IDS.CLIENT ? 'Client' : 'Market');

const loadTemplate = async (path: string): Promise<HTMLElement> => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to load report header template: ${response.status}`);
    const html = await response.text();
    const template = document.createElement('template');
    template.innerHTML = html;
    const root = template.content.querySelector('#settlement-report-header') as HTMLElement | null;
    if (!root) throw new Error('Report header root was not found in the template.');
    return root.cloneNode(true) as HTMLElement;
};

const setTemplateText = (root: HTMLElement, id: string, value: string): void => {
    const element = root.querySelector(`#${id}`);
    if (element) element.textContent = value;
};

const setTemplateDisplay = (root: HTMLElement, id: string, display: string): void => {
    const element = root.querySelector(`#${id}`) as HTMLElement | null;
    if (element) element.style.display = display;
};

const setTemplateGridColumns = (root: HTMLElement, id: string, columns: string): void => {
    const element = root.querySelector(`#${id}`) as HTMLElement | null;
    if (element) element.style.gridTemplateColumns = columns;
};

const setTemplateImage = (root: HTMLElement, id: string, src: string): void => {
    const element = root.querySelector(`#${id}`);
    if (element instanceof HTMLImageElement) element.src = src;
};

const captureHtmlHeader = async (header: HTMLElement): Promise<string> => {
    header.style.position = 'fixed';
    header.style.left = '-12000px';
    header.style.top = '0';
    header.style.zIndex = '-1';
    document.body.appendChild(header);

    try {
        const canvas = await html2canvas(header, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
            width: header.scrollWidth,
            height: header.scrollHeight,
        });
        return canvas.toDataURL('image/png');
    } finally {
        document.body.removeChild(header);
    }
};

type HeaderContext = {
    templatePath: '/settlement-report-header.html' | '/common-report-header.html';
    subtitle: string;
    reportType: 'client-market' | 'delivery-company';
    showMarketDetails: boolean;
    subjectKind: 'Market' | 'Client';
    subjectDetails: { name: string; address: string };
    scopeLabel: string;
    dateRangeLabel: string;
    ordersCount: number;
    valueLabel: string;
    valueText: string;
    valueNote: string;
    settlementLabel: string;
    settlementText: string;
    settlementNote: string;
    extraLabel?: string;
    extraText?: string;
    extraNote?: string;
    deliveryChip: string;
    paymentChip: string;
    fallbackChip: string;
    appliedFilters: string;
    footerTime: string;
};

const buildHeaderImage = async (context: HeaderContext): Promise<string> => {
    const headerTemplate = await loadTemplate(context.templatePath);
    const logoBase64 = await toDataUrl('/logo-rounded.png');

    setTemplateImage(headerTemplate, 'sr-logo', logoBase64);
    setTemplateText(headerTemplate, 'sr-brand-subtitle', context.subtitle);
    setTemplateText(headerTemplate, 'sr-brand-date', context.dateRangeLabel);
    setTemplateText(headerTemplate, 'sr-report-badge', context.scopeLabel);
    setTemplateText(headerTemplate, 'sr-meta-line', context.footerTime);
    setTemplateText(headerTemplate, 'sr-meta-time', `Generated ${context.footerTime}`);
    setTemplateText(headerTemplate, 'sr-subject-label', context.subjectKind);
    setTemplateText(headerTemplate, 'sr-subject-section-title', context.subjectKind);
    setTemplateText(headerTemplate, 'sr-subject-name', context.subjectDetails.name);
    setTemplateText(headerTemplate, 'sr-subject-name-full', context.subjectDetails.name);
    setTemplateText(headerTemplate, 'sr-subject-address', context.subjectDetails.address);
    setTemplateText(headerTemplate, 'sr-subject-note', context.scopeLabel);
    setTemplateText(headerTemplate, 'sr-orders-count', String(context.ordersCount));
    setTemplateText(headerTemplate, 'sr-order-value-label', context.valueLabel);
    setTemplateText(headerTemplate, 'sr-order-value', context.valueText);
    setTemplateText(headerTemplate, 'sr-order-value-note', context.valueNote);
    setTemplateText(headerTemplate, 'sr-settlement-label', context.settlementLabel);
    setTemplateText(headerTemplate, 'sr-settlement', context.settlementText);
    setTemplateText(headerTemplate, 'sr-settlement-note', context.settlementNote);
    setTemplateText(headerTemplate, 'sr-extra-label', context.extraLabel || '');
    setTemplateText(headerTemplate, 'sr-extra-value', context.extraText || '');
    setTemplateText(headerTemplate, 'sr-extra-note', context.extraNote || '');
    setTemplateText(headerTemplate, 'sr-pill-delivery', context.deliveryChip);
    setTemplateText(headerTemplate, 'sr-pill-payment', context.paymentChip);
    setTemplateText(headerTemplate, 'sr-pill-fallback', context.fallbackChip);
    setTemplateText(headerTemplate, 'sr-applied-filters', context.appliedFilters);
    setTemplateText(headerTemplate, 'sr-footer-time', context.footerTime);

    if (context.subjectDetails.address === 'N/A') {
        setTemplateDisplay(headerTemplate, 'sr-subject-strip', 'none');
    }

    if (!context.extraText) {
        setTemplateDisplay(headerTemplate, 'sr-extra-card', 'none');
    }

    if (!context.showMarketDetails) {
        setTemplateDisplay(headerTemplate, 'sr-subject-card', 'none');
        setTemplateDisplay(headerTemplate, 'sr-subject-main', 'none');
        setTemplateDisplay(headerTemplate, 'sr-subject-strip', 'none');
        setTemplateGridColumns(headerTemplate, 'sr-subject-strip', '1fr');
    }

    setTemplateGridColumns(
        headerTemplate,
        'sr-info-grid',
        context.showMarketDetails
            ? (context.extraText ? '1.15fr repeat(4, 1fr)' : '1.15fr repeat(3, 1fr)')
            : (context.extraText ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)')
    );

    return captureHtmlHeader(headerTemplate);
};

const createTableStyles = (headerFontSize: number, bodyFontSize: number): TDocumentDefinitions['styles'] => ({
    tableHeader: { fontSize: headerFontSize, bold: true, color: 'white', fillColor: '#1f2937', margin: [3, 4, 3, 4], alignment: 'left' },
    tableHeaderCenter: { fontSize: headerFontSize, bold: true, color: 'white', fillColor: '#1f2937', alignment: 'center', margin: [3, 4, 3, 4] },
    tableHeaderRight: { fontSize: headerFontSize, bold: true, color: 'white', fillColor: '#1f2937', alignment: 'right', margin: [3, 4, 3, 4] },
    tableCellBold: { fontSize: bodyFontSize, bold: true, color: '#111827', margin: [3, 3, 3, 3] },
    tableCell: { fontSize: bodyFontSize, color: '#374151', margin: [3, 3, 3, 3] },
    tableCellMuted: { fontSize: bodyFontSize - 0.8, color: '#6b7280', margin: [3, 1, 3, 1] },
    tableCellBoldCenter: { fontSize: bodyFontSize - 0.2, bold: true, color: '#111827', alignment: 'center', margin: [3, 3, 3, 1] },
    tableCellMutedCenter: { fontSize: bodyFontSize - 0.4, color: '#6b7280', alignment: 'center', margin: [3, 1, 3, 3] },
    tableCellStatus: { fontSize: bodyFontSize - 0.2, bold: true, color: '#111827', fillColor: '#f3f4f6', alignment: 'center', margin: [2, 3, 2, 3] },
    tableCellNumber: { fontSize: bodyFontSize, bold: true, alignment: 'right', color: '#111827', margin: [3, 3, 3, 3] },
    totalsLabel: { fontSize: headerFontSize, bold: true, color: '#111827', fillColor: '#f8fafc', margin: [3, 4, 3, 4] },
    totalsNumber: { fontSize: headerFontSize, bold: true, color: '#111827', alignment: 'right', fillColor: '#f8fafc', margin: [3, 4, 3, 4] },
    filterText: { fontSize: 8, color: '#6b7280' },
    footerText: { fontSize: 8, color: '#9ca3af' },
}) as TDocumentDefinitions['styles'];

const buildPaymentCell = (order: SettlementReportOrder): TableCell => ({
    stack: [
        { text: getStatusName(order.paymentStatus), style: 'tableCellBoldCenter' },
        { text: getStatusName(order.paymentType), style: 'tableCellMutedCenter' },
    ],
});

type SettlementComputation = {
    collectibleAmount: number;
    deliveryFeeAmount: number;
    settlementAmount: number;
    deliveryStatusId: number | null;
};

const getSettlementComputation = (order: SettlementReportOrder): SettlementComputation => {
    const deliveryStatusId = getStatusId(order.deliveryStatus);
    const deliveryFeeAmount = Math.max(0, toAmount(order.deliveryFee));
    const collectiveAmount = Math.max(0, toAmount(order.collectivePrice));

    if (deliveryStatusId === RETURNED_DELIVERY_STATUS_ID) {
        return {
            collectibleAmount: 0,
            deliveryFeeAmount,
            settlementAmount: -deliveryFeeAmount,
            deliveryStatusId,
        };
    }

    if (deliveryStatusId && SUCCESS_DELIVERY_STATUS_IDS.has(deliveryStatusId)) {
        const settlementAmount = Math.max(0, collectiveAmount - deliveryFeeAmount);
        return {
            collectibleAmount: collectiveAmount,
            deliveryFeeAmount,
            settlementAmount,
            deliveryStatusId,
        };
    }

    return {
        collectibleAmount: 0,
        deliveryFeeAmount,
        settlementAmount: 0,
        deliveryStatusId,
    };
};

const getOrderSettlementAmount = (order: SettlementReportOrder): number => getSettlementComputation(order).settlementAmount;

const buildSettlementRows = (reportOrders: SettlementReportOrder[], reportType: 'client-market' | 'delivery-company') => {
    const isDeliveryCompanyReport = reportType === 'delivery-company';

    const tableHeaderRow: TableCell[] = isDeliveryCompanyReport
        ? [
            { text: 'Order Code', style: 'tableHeader' },
            { text: 'Date', style: 'tableHeaderCenter' },
            { text: 'Customer', style: 'tableHeader' },
            { text: 'Payment', style: 'tableHeaderCenter' },
            { text: 'Delivery Status', style: 'tableHeaderCenter' },
            { text: 'Delivery Fee', style: 'tableHeaderRight' },
            { text: 'Client Settlement', style: 'tableHeaderRight' },
            { text: 'Gross Collectible', style: 'tableHeaderRight' },
        ]
        : [
            { text: 'Order Code', style: 'tableHeader' },
            { text: 'Date', style: 'tableHeaderCenter' },
            { text: 'Customer', style: 'tableHeader' },
            { text: 'Payment', style: 'tableHeaderCenter' },
            { text: 'Delivery Status', style: 'tableHeaderCenter' },
            { text: 'Settlement', style: 'tableHeaderRight' },
            { text: 'Gross Value', style: 'tableHeaderRight' },
        ];

    const orderRows: TableCell[][] = reportOrders.map((order) => (
        isDeliveryCompanyReport
            ? [
                { text: order.orderCode || `ORD-${order.id}`, style: 'tableCellBold' },
                { text: normalizeOrderDate(order), style: 'tableCell' },
                { text: order.deliveryTo?.fullName || 'N/A', style: 'tableCellBold' },
                buildPaymentCell(order),
                { text: getStatusName(order.deliveryStatus), style: 'tableCellStatus' },
                { text: formatAmount(getSettlementComputation(order).deliveryFeeAmount), style: 'tableCellNumber' },
                { text: formatAmount(getSettlementComputation(order).settlementAmount), style: 'tableCellNumber' },
                { text: formatAmount(getSettlementComputation(order).collectibleAmount), style: 'tableCellNumber' },
            ]
            : [
                { text: order.orderCode || `ORD-${order.id}`, style: 'tableCellBold' },
                { text: normalizeOrderDate(order), style: 'tableCell' },
                { text: order.deliveryTo?.fullName || 'N/A', style: 'tableCellBold' },
                buildPaymentCell(order),
                { text: getStatusName(order.deliveryStatus), style: 'tableCellStatus' },
                { text: formatAmount(getSettlementComputation(order).settlementAmount), style: 'tableCellNumber' },
                { text: formatAmount(getSettlementComputation(order).collectibleAmount), style: 'tableCellNumber' },
            ]
    ));

    const totals = reportOrders.reduce((accumulator, order) => ({
        totalOrderValue: accumulator.totalOrderValue + getSettlementComputation(order).settlementAmount,
        totalCollectivePrice: accumulator.totalCollectivePrice + getSettlementComputation(order).collectibleAmount,
        totalDeliveryFee: accumulator.totalDeliveryFee + getSettlementComputation(order).deliveryFeeAmount,
    }), { totalOrderValue: 0, totalCollectivePrice: 0, totalDeliveryFee: 0 });

    const totalsRow: TableCell[] = isDeliveryCompanyReport
        ? [
            { text: 'TOTALS', colSpan: 5, style: 'totalsLabel' },
            { text: '' },
            { text: '' },
            { text: '' },
            { text: '' },
            { text: formatAmount(totals.totalDeliveryFee), style: 'totalsNumber' },
            { text: formatAmount(totals.totalOrderValue), style: 'totalsNumber' },
            { text: formatAmount(totals.totalCollectivePrice), style: 'totalsNumber' },
        ]
        : [
            { text: 'TOTALS', colSpan: 5, style: 'totalsLabel' },
            { text: '' },
            { text: '' },
            { text: '' },
            { text: '' },
            { text: formatAmount(totals.totalOrderValue), style: 'totalsNumber' },
            { text: formatAmount(totals.totalCollectivePrice), style: 'totalsNumber' },
        ];

    const columnCount = isDeliveryCompanyReport ? 8 : 7;
    const noDataRow: TableCell[] = Array.from({ length: columnCount }, (_, index) => index === 0
        ? { text: 'No live settlement orders matched the selected filters.', colSpan: columnCount, style: 'tableCellMutedCenter', margin: [4, 8, 4, 8] }
        : { text: '' });

    return {
        tableHeaderRow,
        orderRows,
        noDataRow,
        totalsRow,
        widths: isDeliveryCompanyReport ? [68, 54, '*', 72, 60, 56, 64, 68] : [72, 54, '*', 76, 62, 68, 70],
    };
};

const buildSettlementReportDocDefinition = async (input: SettlementReportInput, overrideOrders?: SettlementReportOrder[]): Promise<TDocumentDefinitions> => {
    const allSelectedOrders = overrideOrders ?? input.orders;
    const reportOrders = filterSettlementOrders(allSelectedOrders);
    const currentDateTime = new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const subjectDetails = resolveSubjectDetails(input);
    const subjectKind = getSubjectKind(input.userRoleId);
    const isDeliveryCompanyReport = input.reportType === 'delivery-company';
    const selectedPaidAmountTotal = allSelectedOrders.reduce((sum, order) => (
        isPaidAmountReceivedByDeliveryCompany(order) ? sum + Math.max(0, toAmount(order.paidAmount)) : sum
    ), 0);
    const settlementMetrics = reportOrders.reduce((accumulator, order) => {
        const computed = getSettlementComputation(order);
        const isReturned = computed.deliveryStatusId === RETURNED_DELIVERY_STATUS_ID;
        const isSuccessful = computed.deliveryStatusId !== null && SUCCESS_DELIVERY_STATUS_IDS.has(computed.deliveryStatusId);

        return {
            successfulCollectible: accumulator.successfulCollectible + (isSuccessful ? computed.collectibleAmount : 0),
            successfulDeliveryFees: accumulator.successfulDeliveryFees + (isSuccessful ? computed.deliveryFeeAmount : 0),
            successfulSettlement: accumulator.successfulSettlement + (isSuccessful ? computed.settlementAmount : 0),
            returnedDeliveryFees: accumulator.returnedDeliveryFees + (isReturned ? computed.deliveryFeeAmount : 0),
            netSettlementBeforePaid: accumulator.netSettlementBeforePaid + computed.settlementAmount,
        };
    }, {
        successfulCollectible: 0,
        successfulDeliveryFees: 0,
        successfulSettlement: 0,
        returnedDeliveryFees: 0,
        netSettlementBeforePaid: 0,
    });
    const includePaidAmount = isDeliveryCompanyReport && Boolean(input.includePaidAmountInSettlement);
    const finalSettlementBalance = settlementMetrics.netSettlementBeforePaid - (includePaidAmount ? selectedPaidAmountTotal : 0);
    const headerValueLabel = includePaidAmount ? 'Settlement Before Received' : 'Settlement Balance';
    const headerValueNote = includePaidAmount ? 'Before received amount adjustment' : 'From delivered, accepted, and returned orders';
    const headerSettlementLabel = isDeliveryCompanyReport
        ? (finalSettlementBalance >= 0 ? 'Final Payable to Client' : 'Payable to Delivery Company')
        : (finalSettlementBalance >= 0 ? 'Payable to You' : 'Delivery Fee Payable');
    const finalStatementLabel = isDeliveryCompanyReport
        ? (finalSettlementBalance >= 0 ? 'Final balance payable to client / market' : 'Final balance payable to delivery company')
        : (finalSettlementBalance >= 0 ? 'Final settlement payable to you' : 'Final delivery fee payable');

    const headerImage = await buildHeaderImage({
        templatePath: '/settlement-report-header.html',
        subtitle: 'Settlement Report',
        reportType: input.reportType,
        showMarketDetails: true,
        subjectKind,
        subjectDetails,
        scopeLabel: input.scopeLabel,
        dateRangeLabel: input.dateRangeLabel,
        ordersCount: reportOrders.length,
        valueLabel: headerValueLabel,
        valueText: formatCurrency(settlementMetrics.netSettlementBeforePaid),
        valueNote: headerValueNote,
        settlementLabel: headerSettlementLabel,
        settlementText: formatCurrency(Math.abs(finalSettlementBalance)),
        settlementNote: includePaidAmount ? 'After received amount deduction' : 'Current balance',
        extraLabel: includePaidAmount ? 'Received Amount' : (isDeliveryCompanyReport ? 'Gross Collectible' : 'Gross Value'),
        extraText: includePaidAmount ? formatCurrency(selectedPaidAmountTotal) : formatCurrency(settlementMetrics.successfulCollectible),
        extraNote: includePaidAmount ? 'Recorded for delivery company, excluding market bank transfers' : 'Successful order collectible total',
        deliveryChip: input.reportType === 'delivery-company'
            ? `Delivery status: ${uniqueNames(reportOrders.map((order) => order.deliveryStatus?.name)).join(', ') || 'Delivered, Ready to Pickup, Returning'}`
            : `Delivery status: ${uniqueNames(reportOrders.map((order) => order.deliveryStatus?.name)).join(', ') || 'N/A'}`,
        paymentChip: `Payment status: ${uniqueNames(reportOrders.map((order) => order.paymentStatus?.name)).join(', ') || 'Paid'}`,
        fallbackChip: includePaidAmount ? 'Received amount included' : (reportOrders.length > 0 ? getReportAccentLabel(input.reportType) : 'No matching live orders'),
        appliedFilters: `Applied filters: ${(input.appliedFilters && input.appliedFilters.length > 0 ? input.appliedFilters : [`Date: ${input.dateRangeLabel}`]).join(' | ')}`,
        footerTime: currentDateTime,
    });

    const table = buildSettlementRows(reportOrders, input.reportType);
    const styles = createTableStyles(8, 8.5);
    const statementRows: TableCell[][] = [
        [
            { text: 'Successful orders collectible', style: 'tableCell' },
            { text: formatAmount(settlementMetrics.successfulCollectible), style: 'tableCellNumber' },
        ],
        [
            { text: 'Less delivery fees on delivered / accepted orders', style: 'tableCell' },
            { text: formatAmount(-settlementMetrics.successfulDeliveryFees), style: 'tableCellNumber' },
        ],
        [
            { text: 'Net from delivered / accepted orders', style: 'tableCellBold' },
            { text: formatAmount(settlementMetrics.successfulSettlement), style: 'tableCellNumber' },
        ],
        [
            { text: 'Less returned-order delivery fees', style: 'tableCell' },
            { text: formatAmount(-settlementMetrics.returnedDeliveryFees), style: 'tableCellNumber' },
        ],
        [
            { text: includePaidAmount ? 'Settlement before received amount' : 'Settlement balance', style: 'tableCellBold' },
            { text: formatAmount(settlementMetrics.netSettlementBeforePaid), style: 'tableCellNumber' },
        ],
        ...(includePaidAmount ? [[
            { text: 'Less amount already received in system for selected orders', style: 'tableCell' },
            { text: formatAmount(-selectedPaidAmountTotal), style: 'tableCellNumber' },
        ] as TableCell[]] : []),
        [
            { text: finalStatementLabel, style: 'totalsLabel' },
            { text: formatAmount(Math.abs(finalSettlementBalance)), style: 'totalsNumber' },
        ],
    ];

    return {
        pageSize: 'A4',
        pageMargins: [18, 18, 18, 24],
        defaultStyle: { fontSize: 8.5, color: '#1f2937' },
        styles,
        footer: (currentPage: number, pageCount: number) => ({
            columns: [
                { text: 'Generated by DELIVERYYA', style: 'footerText' },
                { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right' },
            ],
            margin: [18, 0, 18, 8],
        }),
        content: [
            { image: headerImage, width: 559, margin: [0, 0, 0, 12] },
            { text: reportOrders.length > 0 ? 'Settlement data is shown below.' : (includePaidAmount ? 'No settlement-status orders were found; the received amount adjustment is shown in the statement.' : 'No live matching orders were found for the selected filters.'), style: 'filterText', margin: [0, 0, 0, 8] },
            {
                table: { headerRows: 1, widths: table.widths, body: [table.tableHeaderRow, ...(reportOrders.length > 0 ? table.orderRows : [table.noDataRow]), table.totalsRow], dontBreakRows: true },
                layout: {
                    hLineColor: (index: number) => (index === 0 ? '#1f2937' : '#e5e7eb'),
                    vLineColor: () => '#e5e7eb',
                    hLineWidth: (index: number) => (index === 0 ? 1.2 : 0.7),
                    vLineWidth: () => 0.8,
                    paddingLeft: () => 2,
                    paddingRight: () => 2,
                    paddingTop: () => 3,
                    paddingBottom: () => 3,
                },
                margin: [0, 0, 0, 10],
            },
            { text: 'Settlement Statement', style: 'tableCellBold', margin: [0, 0, 0, 6] },
            {
                table: {
                    headerRows: 0,
                    widths: ['*', 140],
                    body: statementRows,
                },
                layout: {
                    hLineColor: () => '#e5e7eb',
                    vLineColor: () => '#e5e7eb',
                    hLineWidth: () => 0.7,
                    vLineWidth: () => 0.7,
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                },
                margin: [0, 0, 0, 10],
            },
            { text: `Applied filters: ${(input.appliedFilters && input.appliedFilters.length > 0 ? input.appliedFilters : [`Date: ${input.dateRangeLabel}`]).join(' | ')}`, style: 'filterText', margin: [0, 2, 0, 0] },
            { text: currentDateTime, style: 'footerText', margin: [0, 2, 0, 0] },
        ],
    };
};

const buildCommonReportDocDefinition = async (input: CommonReportInput, overrideOrders?: SettlementReportOrder[]): Promise<TDocumentDefinitions> => {
    const selectedColumns: CustomReportColumnKey[] = input.reportType === 'delivery-company' ? DELIVERY_COMPANY_COLUMNS : CLIENT_MARKET_COLUMNS;
    return buildCustomReportDocDefinition({
        scopeLabel: input.scopeLabel,
        dateRangeLabel: input.dateRangeLabel,
        reportType: input.reportType,
        userRoleId: input.userRoleId,
        appliedFilters: input.appliedFilters,
        subjectDetails: input.subjectDetails,
        selectedColumns,
        orders: input.orders,
    }, overrideOrders);
};

const buildCustomReportDocDefinition = async (input: CustomReportInput, overrideOrders?: SettlementReportOrder[]): Promise<TDocumentDefinitions> => {
    const reportOrders = overrideOrders ?? input.orders;
    const currentDateTime = new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const subjectDetails = resolveSubjectDetails(input);
    const subjectKind = getSubjectKind(input.userRoleId);
    const selectedColumns = filterCustomColumnsForReport(input);
    const tableFontSize = selectedColumns.length > 8 ? 6.2 : selectedColumns.length > 6 ? 6.8 : 7.6;
    const tableHeaderFontSize = tableFontSize + 0.2;
    const tableAvailableWidth = 535;
    const columnWeights: Record<CustomReportColumnKey, number> = {
        orderCode: 1.35,
        date: 0.95,
        customerName: 1.6,
        city: 1.0,
        paymentStatus: 1.0,
        paymentType: 0.95,
        deliveryStatus: 1.15,
        deliveryFee: 0.85,
        totalPrice: 0.9,
        collectivePrice: 1.0,
    };
    const totals = reportOrders.reduce((accumulator, order) => ({
        orderValue: accumulator.orderValue + getOrderSettlementAmount(order),
        collectiveValue: accumulator.collectiveValue + Number(order.collectivePrice || 0),
        deliveryFee: accumulator.deliveryFee + Number(order.deliveryFee || 0),
    }), { orderValue: 0, collectiveValue: 0, deliveryFee: 0 });

    const headerImage = await buildHeaderImage({
        templatePath: '/common-report-header.html',
        subtitle: 'Custom Report',
        reportType: input.reportType,
        showMarketDetails: input.userRoleId !== null && input.userRoleId !== undefined,
        subjectKind,
        subjectDetails,
        scopeLabel: input.scopeLabel,
        dateRangeLabel: input.dateRangeLabel,
        ordersCount: reportOrders.length,
        valueLabel: getSettlementLabels(input.reportType).valueLabel,
        valueText: formatCurrency(input.reportType === 'delivery-company' ? totals.orderValue : totals.collectiveValue),
        valueNote: input.reportType === 'delivery-company' ? 'Payable to client / market' : 'Gross order value',
        settlementLabel: getSettlementLabels(input.reportType).settlementLabel,
        settlementText: formatCurrency(input.reportType === 'delivery-company' ? totals.deliveryFee : totals.orderValue),
        settlementNote: getSettlementLabels(input.reportType).note,
        extraLabel: input.reportType === 'delivery-company' ? 'Gross Collectible' : undefined,
        extraText: input.reportType === 'delivery-company' ? formatCurrency(totals.collectiveValue) : undefined,
        extraNote: input.reportType === 'delivery-company' ? 'Customer collectible total' : undefined,
        deliveryChip: `Delivery status: ${uniqueNames(reportOrders.map((order) => order.deliveryStatus?.name)).join(', ') || 'N/A'}`,
        paymentChip: `Payment status: ${uniqueNames(reportOrders.map((order) => order.paymentStatus?.name)).join(', ') || 'N/A'}`,
        fallbackChip: reportOrders.length > 0 ? getReportAccentLabel(input.reportType) : 'No matching live orders',
        appliedFilters: `Applied filters: ${(input.appliedFilters && input.appliedFilters.length > 0 ? input.appliedFilters : [`Date: ${input.dateRangeLabel}`]).join(' | ')}`,
        footerTime: currentDateTime,
    });

    const tableHeaderRow: TableCell[] = selectedColumns.map((columnKey) => {
        const definition = getCustomColumnDefinition(columnKey, input.reportType);
        const styleKey = definition.align === 'left' ? 'tableHeader' : definition.align === 'center' ? 'tableHeaderCenter' : 'tableHeaderRight';
        return { text: definition.header, style: styleKey };
    });

    const orderRows: TableCell[][] = reportOrders.map((order) => selectedColumns.map((columnKey) => {
        switch (columnKey) {
            case 'orderCode': return { text: order.orderCode || `ORD-${order.id}`, style: 'tableCellBold' };
            case 'date': return { text: normalizeOrderDate(order), style: 'tableCell' };
            case 'customerName': return { text: order.deliveryTo?.fullName || 'N/A', style: 'tableCellBold' };
            case 'city': return { text: order.deliveryTo?.city?.name || 'N/A', style: 'tableCell' };
            case 'paymentStatus': return buildPaymentCell(order);
            case 'paymentType': return { text: getStatusName(order.paymentType), style: 'tableCellMutedCenter' };
            case 'deliveryStatus': return { text: getStatusName(order.deliveryStatus), style: 'tableCellStatus' };
            case 'deliveryFee': return { text: formatAmount(order.deliveryFee || 0), style: 'tableCellNumber' };
            case 'totalPrice': return { text: formatAmount(getOrderSettlementAmount(order)), style: 'tableCellNumber' };
            case 'collectivePrice': return { text: formatAmount(order.collectivePrice || 0), style: 'tableCellNumber' };
            default: return { text: 'N/A', style: 'tableCell' };
        }
    }));

    const noDataRow: TableCell[] = selectedColumns.length > 0
        ? Array.from({ length: selectedColumns.length }, (_, index) => index === 0
            ? { text: 'No live orders matched the selected filters.', colSpan: selectedColumns.length, style: 'tableCellMutedCenter', margin: [4, 8, 4, 8] }
            : { text: '' })
        : [{ text: 'No live orders matched the selected filters.', style: 'tableCellMutedCenter', margin: [4, 8, 4, 8] }];

    const totalsRow: TableCell[] = selectedColumns.map((columnKey, index) => {
        if (index < selectedColumns.length - 3) return { text: index === 0 ? 'TOTALS' : '', style: 'totalsLabel' };
        if (columnKey === 'deliveryFee') return { text: formatAmount(totals.deliveryFee), style: 'totalsNumber' };
        if (columnKey === 'totalPrice') return { text: formatAmount(totals.orderValue), style: 'totalsNumber' };
        if (columnKey === 'collectivePrice') return { text: formatAmount(totals.collectiveValue), style: 'totalsNumber' };
        return { text: '', style: 'totalsLabel' };
    });

    const totalWeight = selectedColumns.reduce((sum, columnKey) => sum + columnWeights[columnKey], 0);
    const colWidths = selectedColumns.map((columnKey) => Math.max(42, Math.floor((columnWeights[columnKey] / totalWeight) * tableAvailableWidth)));

    return {
        pageSize: 'A4',
        pageMargins: [12, 12, 12, 18],
        defaultStyle: { fontSize: tableFontSize, color: '#1f2937' },
        styles: createTableStyles(tableHeaderFontSize, tableFontSize),
        footer: (currentPage: number, pageCount: number) => ({
            columns: [
                { text: 'Generated by DELIVERYYA', style: 'filterText' },
                { text: `Page ${currentPage} of ${pageCount}`, style: 'filterText', alignment: 'right' },
            ],
            margin: [18, 0, 18, 8],
        }),
        content: [
            { image: headerImage, width: 559, margin: [0, 0, 0, 12] },
            { text: reportOrders.length > 0 ? 'Custom report with selected columns.' : 'No live matching orders were found for the selected filters.', style: 'filterText', margin: [0, 0, 0, 8] },
            {
                table: { headerRows: 1, widths: colWidths, body: [tableHeaderRow, ...(reportOrders.length > 0 ? orderRows : [noDataRow]), totalsRow], dontBreakRows: true },
                layout: {
                    hLineColor: (index: number) => (index === 0 ? '#1f2937' : '#e5e7eb'),
                    vLineColor: () => '#e5e7eb',
                    hLineWidth: (index: number) => (index === 0 ? 1.2 : 0.7),
                    vLineWidth: () => 0.8,
                    paddingLeft: () => 2,
                    paddingRight: () => 2,
                    paddingTop: () => 3,
                    paddingBottom: () => 3,
                },
                margin: [0, 0, 0, 10],
            },
            { text: `Applied filters: ${(input.appliedFilters && input.appliedFilters.length > 0 ? input.appliedFilters : [`Date: ${input.dateRangeLabel}`]).join(' | ')}`, style: 'filterText', margin: [0, 2, 0, 0] },
            { text: currentDateTime, style: 'filterText', margin: [0, 2, 0, 0] },
        ],
    };
};

export const runSettlementReportAction = async (input: SettlementReportInput, action: PdfAction, filename: string, overrideOrders?: SettlementReportOrder[]): Promise<void> => {
    const docDefinition = await buildSettlementReportDocDefinition(input, overrideOrders);
    const pdf = pdfMake.createPdf(docDefinition);
    if (action === 'download') {
        pdf.download(filename);
        return;
    }
    pdf.print();
};

export const runCommonReportAction = async (input: CommonReportInput, action: PdfAction, filename: string, overrideOrders?: SettlementReportOrder[]): Promise<void> => {
    const docDefinition = await buildCommonReportDocDefinition(input, overrideOrders);
    const pdf = pdfMake.createPdf(docDefinition);
    if (action === 'download') {
        pdf.download(filename);
        return;
    }
    pdf.print();
};

export const runCustomReportAction = async (input: CustomReportInput, action: PdfAction, filename: string, overrideOrders?: SettlementReportOrder[]): Promise<void> => {
    const docDefinition = await buildCustomReportDocDefinition(input, overrideOrders);
    const pdf = pdfMake.createPdf(docDefinition);
    if (action === 'download') {
        pdf.download(filename);
        return;
    }
    pdf.print();
};

function SettlementReport() {
    return null;
}

export default SettlementReport;
