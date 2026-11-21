import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

(pdfMake as unknown as { vfs: Record<string, string> }).vfs = pdfFonts as unknown as Record<string, string>;

export type SettlementPdfStatus = { id?: number; name?: string } | string | null;

export interface SettlementPdfOrder {
  id: number;
  orderCode?: string;
  createdAt?: string;
  createdDate?: string;
  orderDate?: string;
  createdOn?: string;
  date?: string;
  qty?: number;
  totalPrice?: number;
  collectivePrice?: number;
  deliveryFee?: number;
  paidAmount?: number;
  dontCollectDeliveryFeeFromCustomer?: boolean;
  deliveryStatus?: SettlementPdfStatus;
  paymentStatus?: SettlementPdfStatus;
  paymentType?: SettlementPdfStatus;
  deliveryTo?: { fullName?: string; city?: { name?: string } };
}

export interface SettlementReportPdfInput {
  scopeLabel: string;
  dateRangeLabel: string;
  reportType?: string;
  userRoleId?: number | null;
  appliedFilters?: string[];
  subjectDetails?: { name?: string; address?: string };
  orders: SettlementPdfOrder[];
}

type ComputedOrder = SettlementPdfOrder & {
  statusLabel: string;
  isReturned: boolean;
  isDelivered: boolean;
  productTotal: number;
  deliveryFeeTotal: number;
  customerCollectible: number;
  clientSettlement: number;
};

const money = (value: number): string => `LKR ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const amount = (value: number): string => value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const safeNumber = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getStatus = (status?: SettlementPdfStatus): { id: number | null; name: string } => {
  if (typeof status === 'string') {
    const name = status.trim() || 'Unknown';
    return { id: null, name };
  }
  return {
    id: status?.id == null ? null : safeNumber(status.id),
    name: status?.name?.trim() || 'Unknown',
  };
};

const getDisplayName = (value?: SettlementPdfStatus): string => {
  if (typeof value === 'string') return value.trim() || '—';
  return value?.name?.trim() || '—';
};

const getDate = (order: SettlementPdfOrder): string => {
  const value = order.createdAt || order.createdDate || order.orderDate || order.createdOn || order.date;
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' });
};

const loadRoundedLogo = async (): Promise<string> => {
  const response = await fetch('/logo-rounded.png');
  if (!response.ok) throw new Error('Unable to load the DELIVERYYA logo for the settlement report.');
  const imageBlob = await response.blob();
  const objectUrl = URL.createObjectURL(imageBlob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    const canvasWidth = 600;
    const canvasHeight = Math.round(canvasWidth * image.naturalHeight / image.naturalWidth);
    const cornerRadius = 34;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare the logo image for the settlement report.');

    context.beginPath();
    context.moveTo(cornerRadius, 0);
    context.lineTo(canvasWidth - cornerRadius, 0);
    context.arcTo(canvasWidth, 0, canvasWidth, cornerRadius, cornerRadius);
    context.lineTo(canvasWidth, canvasHeight - cornerRadius);
    context.arcTo(canvasWidth, canvasHeight, canvasWidth - cornerRadius, canvasHeight, cornerRadius);
    context.lineTo(cornerRadius, canvasHeight);
    context.arcTo(0, canvasHeight, 0, canvasHeight - cornerRadius, cornerRadius);
    context.lineTo(0, cornerRadius);
    context.arcTo(0, 0, cornerRadius, 0, cornerRadius);
    context.clip();

    const scale = Math.min(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (canvasWidth - width) / 2, (canvasHeight - height) / 2, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const computeOrder = (order: SettlementPdfOrder): ComputedOrder => {
  const status = getStatus(order.deliveryStatus);
  const normalizedStatus = status.name.toLowerCase().replace(/[\s_-]+/g, '');
  const isReturned = status.id === 9 || normalizedStatus === 'returned';
  const isDelivered = status.id === 10 || normalizedStatus === 'acceptedbycustomer' || normalizedStatus === 'delivered';
  const productTotal = Math.max(0, safeNumber(order.totalPrice));
  const deliveryFeeTotal = Math.max(0, safeNumber(order.deliveryFee));
  const customerCollectible = Math.max(0, safeNumber(order.collectivePrice));
  const clientSettlement = isReturned
    ? -deliveryFeeTotal
    : isDelivered
      ? Math.max(0, customerCollectible - deliveryFeeTotal)
      : 0;

  return {
    ...order,
    statusLabel: status.name,
    isReturned,
    isDelivered,
    productTotal,
    deliveryFeeTotal,
    customerCollectible,
    clientSettlement,
  };
};

const buildDocument = async (input: SettlementReportPdfInput): Promise<TDocumentDefinitions> => {
  const logoDataUrl = await loadRoundedLogo();
  const orders = input.orders.map(computeOrder);
  const deliveredOrders = orders.filter((order) => order.isDelivered);
  const returnedOrders = orders.filter((order) => order.isReturned);
  const productTotal = orders.reduce((sum, order) => sum + order.productTotal, 0);
  const companyFeeTotal = deliveredOrders.reduce((sum, order) => sum + order.deliveryFeeTotal, 0);
  const returnedFeeTotal = returnedOrders.reduce((sum, order) => sum + order.deliveryFeeTotal, 0);
  const customerCollectibleTotal = deliveredOrders.reduce((sum, order) => sum + order.customerCollectible, 0);
  const clientSettlementTotal = orders.reduce((sum, order) => sum + order.clientSettlement, 0);
  const generatedAt = new Date().toLocaleString('en-LK', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const header: TableCell[] = [
    { text: 'Order code', style: 'tableHeader' },
    { text: 'Date', style: 'tableHeader' },
    { text: 'Customer / city', style: 'tableHeader' },
    { text: 'Order type', style: 'tableHeader' },
    { text: 'Delivery status', style: 'tableHeader' },
    { text: 'Goods value', style: 'tableHeaderRight' },
    { text: 'Delivery fee', style: 'tableHeaderRight' },
    { text: 'Client balance', style: 'tableHeaderRight' },
  ];

  const rows: TableCell[][] = orders.map((order) => {
    const signedSettlement = order.clientSettlement < 0
      ? `-${amount(Math.abs(order.clientSettlement))}`
      : amount(order.clientSettlement);
    return [
      { text: order.orderCode || `ORD-${order.id}`, style: 'codeCell' },
      { text: getDate(order), style: 'bodyCell' },
      {
        text: [order.deliveryTo?.fullName || 'Customer not recorded', order.deliveryTo?.city?.name].filter(Boolean).join('\n'),
        style: 'bodyCell',
      },
      { text: getDisplayName(order.paymentType), style: 'bodyCell' },
      { text: order.statusLabel, style: 'bodyCell' },
      { text: amount(order.productTotal), style: 'numberCell' },
      { text: amount(order.deliveryFeeTotal), style: 'numberCell' },
      { text: signedSettlement, style: 'numberCell' },
    ];
  });

  const totalsRow: TableCell[] = [
    { text: 'TOTAL', colSpan: 5, style: 'totalsLabel' },
    { text: '' }, { text: '' }, { text: '' }, { text: '' },
    { text: amount(productTotal), style: 'totalsNumber' },
    { text: amount(orders.reduce((sum, order) => sum + order.deliveryFeeTotal, 0)), style: 'totalsNumber' },
    { text: amount(clientSettlementTotal), style: 'totalsNumber' },
  ];

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [28, 30, 28, 40],
    defaultStyle: { font: 'Roboto', fontSize: 8, color: '#253247' },
    styles: {
      brand: { fontSize: 10, bold: true, color: '#b45309', characterSpacing: 1.1 },
      title: { fontSize: 22, bold: true, color: '#172033', margin: [0, 5, 0, 2] },
      subtitle: { fontSize: 9, color: '#64748b' },
      sectionTitle: { fontSize: 10, bold: true, color: '#172033', margin: [0, 12, 0, 7] },
      label: { fontSize: 7, bold: true, color: '#64748b', characterSpacing: 0.5 },
      value: { fontSize: 10, bold: true, color: '#172033', margin: [0, 3, 0, 0] },
      metricValue: { fontSize: 14, bold: true, color: '#172033', margin: [0, 4, 0, 0] },
      metricNote: { fontSize: 7, color: '#64748b', margin: [0, 3, 0, 0] },
      tableHeader: { fontSize: 7, bold: true, color: '#ffffff', fillColor: '#243247', margin: [3, 5, 3, 5] },
      tableHeaderRight: { fontSize: 7, bold: true, color: '#ffffff', fillColor: '#243247', alignment: 'right', margin: [3, 5, 3, 5] },
      codeCell: { fontSize: 7, bold: true, color: '#172033', margin: [2, 4, 2, 4] },
      bodyCell: { fontSize: 7, color: '#334155', margin: [2, 4, 2, 4] },
      numberCell: { fontSize: 7, color: '#334155', alignment: 'right', margin: [2, 4, 2, 4] },
      totalsLabel: { fontSize: 7, bold: true, color: '#172033', fillColor: '#f1f5f9', margin: [3, 6, 3, 6] },
      totalsNumber: { fontSize: 7, bold: true, color: '#172033', alignment: 'right', fillColor: '#f1f5f9', margin: [3, 6, 3, 6] },
      note: { fontSize: 7, color: '#64748b', lineHeight: 1.25 },
      footer: { fontSize: 7, color: '#64748b' },
    },
    footer: (pageNumber: number, pageCount: number) => ({
      margin: [28, 10, 28, 0],
      columns: [
        { text: 'DELIVERYYA  •  Settlement statement', style: 'footer' },
        { text: `Page ${pageNumber} of ${pageCount}`, alignment: 'right', style: 'footer' },
      ],
    }),
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'DELIVERYYA  /  ACCOUNTS', style: 'brand' },
              { text: 'Settlement report', style: 'title' },
              { text: `Handled orders for ${input.dateRangeLabel}`, style: 'subtitle' },
            ],
          },
          { image: logoDataUrl, width: 88, height: 40, alignment: 'right' },
        ],
        columnGap: 12,
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          widths: ['*'],
          body: [[{
            columns: [
              { width: '*', stack: [{ text: 'SETTLEMENT FOR', style: 'label' }, { text: input.subjectDetails?.name || input.scopeLabel || 'Client', style: 'value' }] },
              { width: 170, stack: [{ text: 'GENERATED', style: 'label' }, { text: generatedAt, style: 'value' }], alignment: 'right' },
            ],
            margin: [10, 8, 10, 8] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          fillColor: () => '#f8fafc',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 14, 0, 12] as [number, number, number, number],
      },
      {
        columns: [
          { width: '*', stack: [{ text: 'ORDERS HANDLED', style: 'label' }, { text: `${orders.length}`, style: 'metricValue' }, { text: `${deliveredOrders.length} completed  •  ${returnedOrders.length} returned`, style: 'metricNote' }] },
          { width: '*', stack: [{ text: 'COMPANY DELIVERY FEES', style: 'label' }, { text: money(companyFeeTotal), style: 'metricValue' }, { text: 'Retained on completed deliveries', style: 'metricNote' }] },
          { width: '*', stack: [{ text: 'CLIENT SETTLEMENT', style: 'label' }, { text: money(clientSettlementTotal), style: 'metricValue' }, { text: 'After delivery fees and return deductions', style: 'metricNote' }] },
        ],
        columnGap: 8,
        margin: [0, 0, 0, 8],
      },
      { text: 'Order breakdown', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: [58, 48, '*', 58, 60, 66, 62, 70],
          body: [header, ...rows, totalsRow],
          dontBreakRows: true,
          keepWithHeaderRows: 1,
        },
        layout: {
          hLineColor: (index: number) => index === 1 ? '#cbd5e1' : '#e2e8f0',
          vLineColor: () => '#e2e8f0',
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          fillColor: (rowIndex: number) => rowIndex > 0 && rowIndex % 2 === 0 ? '#f8fafc' : null,
          paddingLeft: () => 2,
          paddingRight: () => 2,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
      { text: 'Settlement calculation', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', 110],
          body: [
            [{ text: 'Customer collectible on completed orders', style: 'bodyCell' }, { text: money(customerCollectibleTotal), style: 'numberCell' }],
            [{ text: 'Less: company delivery fees on completed orders', style: 'bodyCell' }, { text: `(${money(companyFeeTotal)})`, style: 'numberCell' }],
            ...(returnedFeeTotal > 0 ? [[{ text: 'Less: delivery fee deductions for returned orders', style: 'bodyCell' }, { text: `(${money(returnedFeeTotal)})`, style: 'numberCell' }] as TableCell[]] : []),
            [{ text: 'NET SETTLEMENT PAYABLE TO CLIENT', style: 'totalsLabel' }, { text: money(clientSettlementTotal), style: 'totalsNumber' }],
          ],
        },
        layout: {
          hLineColor: () => '#e2e8f0', vLineColor: () => '#e2e8f0',
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          paddingLeft: () => 5, paddingRight: () => 5, paddingTop: () => 4, paddingBottom: () => 4,
        },
      },
      {
        text: 'Calculation basis: goods value is shown separately from delivery fees. Customer collectible is the order’s recorded collective price (goods plus delivery fee when charged to the customer). Completed-order client settlement is customer collectible less the company delivery fee. Returned-order delivery fees are deducted from the client settlement.',
        style: 'note',
        margin: [0, 9, 0, 0],
      },
      ...(input.appliedFilters?.length ? [{ text: `Report filters: ${input.appliedFilters.join('  •  ')}`, style: 'note', margin: [0, 5, 0, 0] as [number, number, number, number] }] : []),
    ],
  };
};

export const createSettlementReportPdfFile = async (input: SettlementReportPdfInput, filename: string): Promise<File> => {
  const docDefinition = await buildDocument(input);
  const blob = await pdfMake.createPdf(docDefinition).getBlob();
  return new File([blob], filename, { type: 'application/pdf' });
};

export const runSettlementReportPdfAction = async (
  input: SettlementReportPdfInput,
  action: 'download' | 'print',
  filename: string,
): Promise<void> => {
  const docDefinition = await buildDocument(input);
  const pdf = pdfMake.createPdf(docDefinition);
  if (action === 'download') {
    pdf.download(filename);
    return;
  }
  pdf.print();
};
