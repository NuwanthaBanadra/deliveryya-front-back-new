import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import logoTextUrl from '../../../assets/images/logo_text.png';

(pdfMake as any).vfs = pdfFonts as unknown as Record<string, string>;

export type OrderAnalyticsReportType = 'sales' | 'expense';

export interface OrderAnalyticsReportOrder {
  id: number;
  orderCode?: string;
  orderDate?: string;
  customerName?: string;
  cityName?: string;
  deliveryStatus?: string;
  paymentStatus?: string;
  paymentType?: string;
  deliveryFee: number;
  totalPrice: number;
  collectivePrice?: number;
  paidAmount?: number;
}

export interface OrderAnalyticsReportInput {
  reportType: OrderAnalyticsReportType;
  scopeLabel: string;
  reportContext?: 'delivery-company' | 'client-market-owner';
  dateRangeLabel: string;
  appliedFilters: string[];
  orders: OrderAnalyticsReportOrder[];
}

export type MixReportColumnKey =
  | 'orderCode'
  | 'date'
  | 'customerName'
  | 'cityName'
  | 'deliveryStatus'
  | 'paymentStatus'
  | 'paymentType'
  | 'deliveryFee'
  | 'totalPrice'
  | 'collectivePrice'
  | 'paidAmount';

export interface MixReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  appliedFilters: string[];
  orders: OrderAnalyticsReportOrder[];
  columns: MixReportColumnKey[];
  reportTitle?: string;
  reportSubtitle?: string;
}

const formatCurrency = (value: number): string =>
  `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatAmount = (value: number): string =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDateTime = (value?: string): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const metricValue = (order: OrderAnalyticsReportOrder, reportType: OrderAnalyticsReportType): number => {
  if (reportType === 'expense') return Number(order.deliveryFee || 0);
  const collective = Number(order.collectivePrice || 0);
  if (collective > 0) return Number(order.totalPrice || 0) - collective;
  return Number(order.deliveryFee || 0);
};

const getStatusSign = (statusName?: string): number => {
  if (/returned/i.test(statusName || '')) return -1;
  return 1;
};

const buildFiltersSentence = (appliedFilters: string[]): string => {
  const filterLabels = appliedFilters.filter((label) => !/^date:/i.test(label)).join(', ');
  if (filterLabels) {
    return `This report shows a summary of orders related to this date range and the selected filters: ${filterLabels}.`;
  }
  return 'This report shows a summary of orders related to this date range.';
};

const getMixColumnTitle = (column: MixReportColumnKey): string => {
  switch (column) {
    case 'orderCode': return 'Order';
    case 'date': return 'Date';
    case 'customerName': return 'Customer';
    case 'cityName': return 'City';
    case 'deliveryStatus': return 'Delivery Status';
    case 'paymentStatus': return 'Payment Status';
    case 'paymentType': return 'Payment Type';
    case 'deliveryFee': return 'Delivery Fee (LKR)';
    case 'totalPrice': return 'Total (LKR)';
    case 'collectivePrice': return 'To Receive (LKR)';
    case 'paidAmount': return 'Paid Amount (LKR)';
    default: return column;
  }
};

const getMixColumnValue = (order: OrderAnalyticsReportOrder, column: MixReportColumnKey): string => {
  const statusSign = getStatusSign(order.deliveryStatus);
  switch (column) {
    case 'orderCode': return order.orderCode || `ORD-${order.id}`;
    case 'date': return formatDateTime(order.orderDate);
    case 'customerName': return order.customerName || 'N/A';
    case 'cityName': return order.cityName || 'N/A';
    case 'deliveryStatus': return compactStatusLabel(order.deliveryStatus);
    case 'paymentStatus': return order.paymentStatus || 'N/A';
    case 'paymentType': return order.paymentType || 'N/A';
    case 'deliveryFee': return formatAmount(statusSign * Number(order.deliveryFee || 0));
    case 'totalPrice': return formatAmount(statusSign * Number(order.totalPrice || 0));
    case 'collectivePrice': return formatAmount(statusSign * Number(order.collectivePrice || 0));
    case 'paidAmount': return formatAmount(statusSign * Number(order.paidAmount || 0));
    default: return 'N/A';
  }
};

const getMixColumnWidth = (column: MixReportColumnKey): number | '*' => {
  if (isMixPriceColumn(column)) return 64;
  return '*';
};

const isMixPriceColumn = (column: MixReportColumnKey): boolean => (
  column === 'deliveryFee' ||
  column === 'totalPrice' ||
  column === 'collectivePrice' ||
  column === 'paidAmount'
);

const isMixCenterColumn = (column: MixReportColumnKey): boolean => (
  column === 'date' ||
  column === 'deliveryStatus' ||
  column === 'paymentStatus' ||
  column === 'paymentType'
);

const getMixHeaderStyle = (column: MixReportColumnKey): 'th' | 'thCenter' | 'thRight' => {
  if (isMixPriceColumn(column)) return 'thRight';
  if (isMixCenterColumn(column)) return 'thCenter';
  return 'th';
};

const getMixCellStyle = (column: MixReportColumnKey): 'cellStrong' | 'cellCenter' | 'cellNum' => {
  if (isMixPriceColumn(column)) return 'cellNum';
  if (isMixCenterColumn(column)) return 'cellCenter';
  return 'cellStrong';
};

const getStatusBadgeColors = (statusName?: string): { bg: string; text: string } => {
  const normalized = (statusName || '').toLowerCase();
  if (normalized.includes('deliver')) return { bg: '#dcfce7', text: '#166534' };
  if (normalized.includes('pending') || normalized.includes('pennding')) return { bg: '#fef3c7', text: '#92400e' };
  if (normalized.includes('cancel')) return { bg: '#fee2e2', text: '#991b1b' };
  if (normalized.includes('return')) return { bg: '#ffedd5', text: '#9a3412' };
  return { bg: '#f3f4f6', text: '#374151' };
};

const getProfitTone = (value: number): { text: string; bg: string; border: string; icon: string } => {
  if (value > 0) return { text: '#047857', bg: '#dcfce7', border: '#86efac', icon: '+' };
  if (value < 0) return { text: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: '-' };
  return { text: '#4b5563', bg: '#f3f4f6', border: '#d1d5db', icon: '0' };
};

const compactStatusLabel = (statusName?: string): string => {
  const source = statusName || 'N/A';
  if (/ready\s*to\s*pickup/i.test(source)) return 'Ready Pickup';
  return source;
};

const toDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to load report logo'));
    reader.readAsDataURL(blob);
  });
};

const statCard = (
  title: string,
  value: string,
  cardColor: string,
  borderColor: string,
  labelStyle: string,
  valueStyle: string
): Content => ({
  table: {
    widths: ['*'],
    body: [[
      {
        stack: [
          { text: title, style: labelStyle },
          { text: value, style: valueStyle },
        ],
        fillColor: cardColor,
        margin: [10, 8, 10, 8],
      },
    ]],
  },
  layout: {
    hLineColor: () => borderColor,
    vLineColor: () => borderColor,
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  },
});

const printOrDownload = (
  pdf: ReturnType<typeof pdfMake.createPdf>,
  action: 'print' | 'download',
  filename: string
): Promise<void> => {
  return new Promise((resolve) => {
    if (action === 'download') {
      pdf.download(filename);
      resolve();
      return;
    }

    pdf.getBlob().then((blob: Blob) => {
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

      printWindow.onload = () => setTimeout(tryPrint, 300);
      setTimeout(tryPrint, 1200);
    }).catch(() => resolve());
  });
};

export const generateOrderAnalyticsReportPdf = async (
  input: OrderAnalyticsReportInput,
  action: 'print' | 'download' = 'download'
): Promise<void> => {
  const { reportType, scopeLabel, reportContext, dateRangeLabel, appliedFilters, orders } = input;
  const logoTextDataUrl = await toDataUrl(logoTextUrl);
  const isDeliveryCompanyScope = reportContext === 'delivery-company' || /delivery company/i.test(scopeLabel);
  const hideMetricSection = reportContext === 'client-market-owner' && reportType === 'sales';

  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const totalDeliveryFee = orders.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0);
  const totalMetric = isDeliveryCompanyScope
    ? totalDeliveryFee
    : orders.reduce((sum, order) => sum + metricValue(order, reportType), 0);

  const metricTitle = isDeliveryCompanyScope
    ? 'Delivery Profit'
    : reportType === 'expense'
      ? 'Expense'
      : 'Profit';
  const reportTitle = isDeliveryCompanyScope
    ? 'Delivery Profit Report'
    : reportType === 'expense'
      ? 'Expense Report'
      : 'Sales Report';
  const reportSubtitle = isDeliveryCompanyScope
    ? 'Delivery fee is treated as profit for this report.'
    : reportType === 'expense'
      ? 'Operational delivery cost summary for the selected period.'
      : 'Revenue summary for the selected period.';

  const metricTone = isDeliveryCompanyScope || reportType === 'sales'
    ? getProfitTone(totalMetric)
    : { text: '#9a3412', bg: '#ffedd5', border: '#fdba74', icon: '•' };
  const metricCardValue = isDeliveryCompanyScope || reportType === 'sales'
    ? `${metricTone.icon} ${formatAmount(Math.abs(totalMetric))}`
    : formatAmount(totalMetric);

  const includeCollectiveColumn = isDeliveryCompanyScope;
  const includeMetricColumn = !hideMetricSection;

  const headerRow: TableCell[] = [
    { text: 'Order', style: 'th' },
    { text: 'Date', style: 'th' },
    { text: 'Customer / City', style: 'th' },
    { text: 'Payment', style: 'th' },
    // { text: 'Status', style: 'thCenter' },
    { text: 'Fee (LKR)', style: 'thRight' },
    { text: 'Total (LKR)', style: 'thRight' },
    ...(includeCollectiveColumn ? [{ text: 'Collective (LKR)', style: 'thRight' as const }] : []),
    ...(includeMetricColumn ? [{ text: `${metricTitle} (LKR)`, style: 'thRight' as const }] : []),
  ];

  const rows: TableCell[][] = orders.map((order) => {
    const rowMetric = isDeliveryCompanyScope ? Number(order.deliveryFee || 0) : metricValue(order, reportType);
    const rowMetricTone = isDeliveryCompanyScope || reportType === 'sales'
      ? getProfitTone(rowMetric)
      : { text: '#9a3412', bg: '#ffedd5', border: '#fdba74', icon: '' };
    const statusTone = getStatusBadgeColors(order.deliveryStatus);

    return [
      { text: order.orderCode || `ORD-${order.id}`, style: 'cellStrong' },
      { text: formatDateTime(order.orderDate), style: 'cell' },
      {
        stack: [
          { text: order.customerName || 'N/A', style: 'cellStrong' },
          { text: order.cityName || 'N/A', style: 'cellMuted' },
        ],
      },
      {
        stack: [
          { text: order.paymentStatus || 'N/A', style: 'cellStrong' },
          { text: order.paymentType || 'N/A', style: 'cellMuted' },
        ],
      },
      // {
      //   text: compactStatusLabel(order.deliveryStatus),
      //   alignment: 'center',
      //   color: statusTone.text,
      //   fillColor: statusTone.bg,
      //   bold: true,
      //   fontSize: 7,
      //   noWrap: true,
      //   margin: [2, 3, 2, 3],
      // },
      { text: formatAmount(order.deliveryFee), style: 'cellNum' },
      { text: formatAmount(order.totalPrice), style: 'cellNumStrong' },
      ...(includeCollectiveColumn ? [{ text: formatAmount(Number(order.collectivePrice || 0)), style: 'cellNum' as const }] : []),
      ...(includeMetricColumn
        ? [{
            text: `${isDeliveryCompanyScope || reportType === 'sales' ? `${rowMetricTone.icon} ${formatAmount(Math.abs(rowMetric))}` : formatAmount(rowMetric)}`,
            style: 'cellNumStrong' as const,
            color: rowMetricTone.text,
          }]
        : []),
    ];
  });

  const totalCollectivePrice = orders.reduce((sum, order) => sum + Number(order.collectivePrice || 0), 0);

  const footerRow: TableCell[] = [
    { text: 'GRAND TOTALS', colSpan: 4, style: 'totalsLabel' },
    { text: '' },
    { text: '' },
    { text: '' },
    { text: formatAmount(totalDeliveryFee), style: 'totalsNum' },
    { text: formatAmount(totalSales), style: 'totalsNum' },
    ...(includeCollectiveColumn ? [{ text: formatAmount(totalCollectivePrice), style: 'totalsNum' as const }] : []),
    ...(includeMetricColumn
      ? [{
          text: `${isDeliveryCompanyScope || reportType === 'sales' ? `${metricTone.icon} ${formatAmount(Math.abs(totalMetric))}` : formatAmount(totalMetric)}`,
          style: 'totalsMetric' as const,
          color: metricTone.text,
        }]
      : []),
  ];

  const analyticsTableWidths = includeCollectiveColumn
    ? [65, 48, 96, 64, 50, 56, 56, 60]
    : includeMetricColumn
      ? [80, 70, 110, 62, 58, 64, 60]
      : [85, 75, 126, 75, 75, 75];

  const statsRow: TableCell[] = [
    {
      stack: [
        { text: 'Total Orders', style: 'statLabel' },
        { text: String(totalOrders), style: 'statValue', alignment: 'right' as const },
      ],
      fillColor: '#f8fafc',
      margin: [10, 8, 10, 8],
    },
    {
      stack: [
        { text: 'Total Sales (LKR)', style: 'statLabelPrimary' },
        { text: formatAmount(totalSales), style: 'statValuePrimary', alignment: 'right' as const },
      ],
      fillColor: '#fff7ed',
      margin: [10, 8, 10, 8],
    },
  ];

  if (includeMetricColumn) {
    statsRow.push({
      stack: [
        { text: `${metricTitle} (LKR)`, style: 'statLabel' },
        { text: metricCardValue, style: 'statValueContext', alignment: 'right' as const },
      ],
      fillColor: metricTone.bg,
      margin: [10, 8, 10, 8],
    });
  }

  const appliedFiltersText = appliedFilters.length > 0 ? appliedFilters.join('  •  ') : 'None';

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [16, 20, 16, 20],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'Generated by DELIVERYYA', style: 'footerText' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right' },
      ],
      margin: [20, 0, 20, 8],
    }),
    content: [
      {
        table: {
          widths: ['*', 160],
          body: [[
            {
              stack: [
                { image: logoTextDataUrl, width: 160, margin: [0, 0, 0, 2] },
                { text: `${scopeLabel} - ${reportTitle}`, style: 'title' },
                { text: reportSubtitle, style: 'subtitle' },
              ],
              border: [false, false, false, false],
            },
            {
              stack: [
                { text: 'Generated', style: 'metaLabel', alignment: 'right' },
                { text: new Date().toLocaleString(), style: 'metaValue', alignment: 'right' },
                { text: `Range: ${dateRangeLabel}`, style: 'metaValue', alignment: 'right', margin: [0, 2, 0, 0] },
              ],
              border: [false, false, false, false],
            },
          ]],
        },
        layout: 'noBorders',
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 563, y2: 0, lineWidth: 2, lineColor: '#f59b0f' },
        ],
        margin: [0, 6, 0, 10],
      },
      {
        table: {
          widths: includeMetricColumn ? ['*', '*', '*'] : ['*', '*'],
          body: [statsRow],
        },
        layout: {
          hLineColor: (index: number) => (index === 0 || index === 1 ? '#d1d5db' : '#d1d5db'),
          vLineColor: (index: number) => {
            if (index === 2) return '#f59b0f';
            if (includeMetricColumn && index === 3) return metricTone.border;
            return '#d1d5db';
          },
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                // { text: 'Applied Filters', style: 'filterTitle' },
                { text: appliedFiltersText, style: 'filterBody' },
              ],
              margin: [10, 8, 10, 8],
              fillColor: '#f1f5f9',
            },
          ]],
        },
        layout: {
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: analyticsTableWidths,
          body: [headerRow, ...rows, footerRow],
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return '#e9eef5';
            if (rowIndex === rows.length + 1) return metricTone.bg;
            return rowIndex % 2 === 0 ? '#f7fbff' : '#ffffff';
          },
          hLineColor: () => '#d6e0ea',
          vLineColor: () => '#e2e8f0',
          hLineWidth: (rowIndex: number) => (rowIndex === 0 || rowIndex === 1 || rowIndex === rows.length + 1 ? 1 : 0.5),
          vLineWidth: () => 0.4,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
    ],
    styles: {
      footerText: { fontSize: 8, color: '#94a3b8' },
      brand: { fontSize: 20, bold: true, color: '#111827' },
      title: { fontSize: 13, bold: true, color: '#1f2937', margin: [0, 2, 0, 2] },
      subtitle: { fontSize: 9, color: '#6b7280' },
      metaLabel: { fontSize: 9, color: '#6b7280', bold: true },
      metaValue: { fontSize: 9, color: '#374151' },
      statLabel: { fontSize: 9, bold: true, color: '#64748b' },
      statLabelPrimary: { fontSize: 9, bold: true, color: '#92400e' },
      statValue: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
      statValuePrimary: { fontSize: 18, bold: true, color: '#111827', margin: [0, 2, 0, 0] },
      statValueContext: { fontSize: 18, bold: true, color: metricTone.text, margin: [0, 2, 0, 0] },
      filterTitle: { fontSize: 11, bold: true, color: '#334155', margin: [0, 0, 0, 3] },
      filterBody: { fontSize: 9, color: '#475569', lineHeight: 1.2 },
      th: { fontSize: 8, bold: true, color: '#0f172a' },
      thCenter: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'center' },
      thRight: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'right' },
      cell: { fontSize: 7.5, color: '#1f2937' },
      cellStrong: { fontSize: 7.5, color: '#111827', bold: true },
      cellMuted: { fontSize: 6.8, color: '#64748b' },
      cellNum: { fontSize: 7.5, color: '#111827', alignment: 'right', bold: true },
      cellNumStrong: { fontSize: 7.5, color: '#111827', alignment: 'right', bold: true },
      totalsLabel: { fontSize: 9, bold: true, alignment: 'left', color: '#0f172a' },
      totalsNum: { fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' },
      totalsMetric: { fontSize: 9, bold: true, alignment: 'right' },
    },
  };

  const pdf = pdfMake.createPdf(docDefinition);
  const filename = `Order-Analytics-${reportType}-${Date.now()}.pdf`;
  await printOrDownload(pdf, action, filename);
};

export interface CollectivePriceReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  appliedFilters: string[];
  orders: OrderAnalyticsReportOrder[];
}

export interface IncompletePaymentReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  appliedFilters: string[];
  orders: OrderAnalyticsReportOrder[];
}

export const generateCollectivePriceReportPdf = async (
  input: CollectivePriceReportInput,
  action: 'print' | 'download' = 'download'
): Promise<void> => {
  const { scopeLabel, dateRangeLabel, appliedFilters, orders } = input;
  const logoTextDataUrl = await toDataUrl(logoTextUrl);
  const totalOrders = orders.length;
  const totalToReceive = orders.reduce((sum, order) => sum + (getStatusSign(order.deliveryStatus) * Number(order.collectivePrice || 0)), 0);
  const totalPaidAmount = orders.reduce((sum, order) => sum + (getStatusSign(order.deliveryStatus) * Number(order.paidAmount || 0)), 0);
  const totalSales = orders.reduce((sum, order) => sum + (getStatusSign(order.deliveryStatus) * Number(order.totalPrice || 0)), 0);

  const rows: TableCell[][] = orders.map((order) => [
    { text: order.orderCode || `ORD-${order.id}`, style: 'cellStrong' },
    { text: formatDateTime(order.orderDate), style: 'cell' },
    { stack: [{ text: order.customerName || 'N/A', style: 'cellStrong' }, { text: order.cityName || 'N/A', style: 'cellMuted' }] },
    { stack: [{ text: order.paymentStatus || 'N/A', style: 'cellStrong' }, { text: order.paymentType || 'N/A', style: 'cellMuted' }] },
    { text: formatAmount(getStatusSign(order.deliveryStatus) * Number(order.totalPrice || 0)), style: 'cellNum' },
    { text: formatAmount(getStatusSign(order.deliveryStatus) * Number(order.collectivePrice || 0)), style: 'cellNum' },
    { text: formatAmount(getStatusSign(order.deliveryStatus) * Number(order.paidAmount || 0)), style: 'cellNum' },
  ]);

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [16, 20, 16, 20],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'Generated by DELIVERYYA', style: 'footerText' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right' },
      ],
      margin: [20, 0, 20, 8],
    }),
    content: [
      {
        table: {
          widths: ['*', 160],
          body: [[
            {
              stack: [
                { image: logoTextDataUrl, width: 160, margin: [0, 0, 0, 2] },
                { text: `${scopeLabel} - Settlement Report`, style: 'title' },
                { text: 'Shows total to receive and paid amounts. Returned orders are shown as negative values.', style: 'subtitle' },
              ],
              border: [false, false, false, false],
            },
            {
              stack: [
                { text: 'Generated', style: 'metaLabel', alignment: 'right' },
                { text: new Date().toLocaleString(), style: 'metaValue', alignment: 'right' },
                { text: `Range: ${dateRangeLabel}`, style: 'metaValue', alignment: 'right', margin: [0, 2, 0, 0] },
              ],
              border: [false, false, false, false],
            },
          ]],
        },
        layout: 'noBorders',
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 563, y2: 0, lineWidth: 2, lineColor: '#f59b0f' }],
        margin: [0, 6, 0, 10],
      },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [[
            { stack: [{ text: 'Orders Included', style: 'statLabel' }, { text: String(totalOrders), style: 'statValue', alignment: 'right' }], fillColor: '#f8fafc', margin: [10, 8, 10, 8] },
            { stack: [{ text: 'Total To Receive (LKR)', style: 'statLabelPrimary' }, { text: formatAmount(totalToReceive), style: 'statValuePrimary', alignment: 'right' }], fillColor: '#f0f4ff', margin: [10, 8, 10, 8] },
            { stack: [{ text: 'Total Paid Amount (LKR)', style: 'statLabel' }, { text: formatAmount(totalPaidAmount), style: 'statValue', alignment: 'right' }], fillColor: '#f8fafc', margin: [10, 8, 10, 8] },
          ]],
        },
        layout: {
          hLineColor: () => '#d1d5db',
          vLineColor: () => '#d1d5db',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ['*'],
          body: [[{ stack: [{ text: buildFiltersSentence(appliedFilters), style: 'filterBody' }], margin: [10, 8, 10, 8], fillColor: '#f1f5f9' }]],
        },
        layout: {
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [66, 56, 118, 60, 60, 66, 66],
          body: [
            [
              { text: 'Order', style: 'th' },
              { text: 'Date', style: 'th' },
              { text: 'Customer / City', style: 'th' },
              { text: 'Payment', style: 'th' },
              { text: 'Total (LKR)', style: 'thRight' },
              { text: 'To Receive (LKR)', style: 'thRight' },
              { text: 'Paid Amount (LKR)', style: 'thRight' },
            ],
            ...rows,
            [
              { text: 'GRAND TOTALS', colSpan: 4, style: 'totalsLabel' },
              {},
              {},
              {},
              { text: formatAmount(totalSales), style: 'totalsNum' },
              { text: formatAmount(totalToReceive), style: 'totalsNum' },
              { text: formatAmount(totalPaidAmount), style: 'totalsNum' },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#e9eef5' : rowIndex === rows.length + 1 ? '#f0f4ff' : rowIndex % 2 === 0 ? '#f7fbff' : '#ffffff'),
          hLineColor: () => '#d6e0ea',
          vLineColor: () => '#e2e8f0',
          hLineWidth: (rowIndex: number) => (rowIndex === 0 || rowIndex === rows.length + 1 ? 1 : 0.5),
          vLineWidth: () => 0.4,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
    ],
    styles: {
      footerText: { fontSize: 8, color: '#94a3b8' },
      title: { fontSize: 13, bold: true, color: '#1f2937', margin: [0, 2, 0, 2] },
      subtitle: { fontSize: 9, color: '#6b7280' },
      metaLabel: { fontSize: 9, color: '#6b7280', bold: true },
      metaValue: { fontSize: 9, color: '#374151' },
      statLabel: { fontSize: 9, bold: true, color: '#64748b' },
      statLabelPrimary: { fontSize: 9, bold: true, color: '#1e40af' },
      statValue: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
      statValuePrimary: { fontSize: 18, bold: true, color: '#1e40af', margin: [0, 2, 0, 0] },
      filterBody: { fontSize: 9, color: '#475569', lineHeight: 1.2 },
      th: { fontSize: 8, bold: true, color: '#0f172a' },
      thRight: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'right' },
      cell: { fontSize: 7.5, color: '#1f2937' },
      cellStrong: { fontSize: 7.5, color: '#111827', bold: true },
      cellMuted: { fontSize: 6.8, color: '#64748b' },
      cellNum: { fontSize: 7.5, color: '#111827', alignment: 'right', bold: true },
      totalsLabel: { fontSize: 9, bold: true, alignment: 'left', color: '#0f172a' },
      totalsNum: { fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' },
    },
  };

  const pdf = pdfMake.createPdf(docDefinition);
  await printOrDownload(pdf, action, `Settlement-Report-${Date.now()}.pdf`);
};

export const generateMixOrderReportPdf = async (
  input: MixReportInput,
  action: 'print' | 'download' = 'download'
): Promise<void> => {
  const { scopeLabel, dateRangeLabel, appliedFilters, orders, columns, reportTitle, reportSubtitle } = input;
  const logoTextDataUrl = await toDataUrl(logoTextUrl);
  let activeColumns: MixReportColumnKey[] = columns.length > 0
    ? columns
    : ['orderCode', 'date', 'customerName', 'cityName', 'deliveryStatus', 'paymentStatus', 'paymentType', 'deliveryFee', 'totalPrice', 'collectivePrice', 'paidAmount'];
  
  // Consolidate customer and city into a single column
  const hasCustomerName = activeColumns.includes('customerName');
  const hasCityName = activeColumns.includes('cityName');
  const hasCustomerCityColumn = hasCustomerName || hasCityName;
  
  if (hasCustomerCityColumn) {
    activeColumns = activeColumns.filter(col => col !== 'customerName' && col !== 'cityName');
    // Insert the combined column after 'date' if present, otherwise at position 1
    const dateIndex = activeColumns.indexOf('date');
    const insertIndex = dateIndex >= 0 ? dateIndex + 1 : 1;
    activeColumns.splice(insertIndex, 0, 'customerName' as MixReportColumnKey); // Use customerName as a marker for the combined column
  }

  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const totalPaidAmount = orders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);

  const rows: TableCell[][] = orders.map((order) =>
    activeColumns.map((column) => {
      // Special handling for combined customer/city column (marked by customerName when consolidated)
      if (column === 'customerName' && hasCustomerCityColumn) {
        return {
          stack: [
            { text: order.customerName || 'N/A', style: 'cellCustomer', margin: [0, 0, 0, 1] },
            { text: order.cityName || 'N/A', style: 'cellCity', margin: [0, 0, 0, 0] },
          ],
          margin: [0, 0, 0, 0],
        } as TableCell;
      }
      return {
        text: getMixColumnValue(order, column),
        style: getMixCellStyle(column),
      };
    })
  );

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [16, 20, 16, 20],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'Generated by DELIVERYYA', style: 'footerText' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right' },
      ],
      margin: [20, 0, 20, 8],
    }),
    content: [
      {
        table: {
          widths: ['*', 160],
          body: [[
            {
              stack: [
                { image: logoTextDataUrl, width: 160, margin: [0, 0, 0, 2] },
                { text: `${scopeLabel} - ${reportTitle || 'Order Summary Report'}`, style: 'title' },
                { text: reportSubtitle || 'A summary report with selected columns.', style: 'subtitle' },
              ],
              border: [false, false, false, false],
            },
            {
              stack: [
                { text: 'Generated', style: 'metaLabel', alignment: 'right' },
                { text: new Date().toLocaleString(), style: 'metaValue', alignment: 'right' },
                { text: `Range: ${dateRangeLabel}`, style: 'metaValue', alignment: 'right', margin: [0, 2, 0, 0] },
              ],
              border: [false, false, false, false],
            },
          ]],
        },
        layout: 'noBorders',
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 563, y2: 0, lineWidth: 2, lineColor: '#f59b0f' }], margin: [0, 6, 0, 10] },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [[
            { stack: [{ text: 'Orders', style: 'statLabel' }, { text: String(totalOrders), style: 'statValue', alignment: 'right' }], fillColor: '#f8fafc', margin: [10, 8, 10, 8] },
            { stack: [{ text: 'Total Sales (LKR)', style: 'statLabelPrimary' }, { text: formatAmount(totalSales), style: 'statValuePrimary', alignment: 'right' }], fillColor: '#fff7ed', margin: [10, 8, 10, 8] },
            { stack: [{ text: 'Total Paid Amount (LKR)', style: 'statLabel' }, { text: formatAmount(totalPaidAmount), style: 'statValue', alignment: 'right' }], fillColor: '#f8fafc', margin: [10, 8, 10, 8] },
          ]],
        },
        layout: {
          hLineColor: () => '#d1d5db',
          vLineColor: () => '#d1d5db',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ['*'],
          body: [[{ stack: [{ text: buildFiltersSentence(appliedFilters), style: 'filterBody' }], margin: [10, 8, 10, 8], fillColor: '#f1f5f9' }]],
        },
        layout: {
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: activeColumns.map((column) => getMixColumnWidth(column)),
          body: [
            activeColumns.map((column) => {
              // Display combined header for customer/city column
              if (column === 'customerName' && hasCustomerCityColumn) {
                return { text: 'Customer / City', style: 'th' };
              }
              return { text: getMixColumnTitle(column), style: getMixHeaderStyle(column) };
            }),
            ...rows,
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#e9eef5' : rowIndex % 2 === 0 ? '#f7fbff' : '#ffffff'),
          hLineColor: () => '#d6e0ea',
          vLineColor: () => '#e2e8f0',
          hLineWidth: (rowIndex: number) => (rowIndex === 0 ? 1 : 0.5),
          vLineWidth: () => 0.4,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
    ],
    styles: {
      footerText: { fontSize: 8, color: '#94a3b8' },
      title: { fontSize: 13, bold: true, color: '#1f2937', margin: [0, 2, 0, 2] },
      subtitle: { fontSize: 9, color: '#6b7280' },
      metaLabel: { fontSize: 9, color: '#6b7280', bold: true },
      metaValue: { fontSize: 9, color: '#374151' },
      statLabel: { fontSize: 9, bold: true, color: '#64748b' },
      statLabelPrimary: { fontSize: 9, bold: true, color: '#92400e' },
      statValue: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
      statValuePrimary: { fontSize: 18, bold: true, color: '#111827', margin: [0, 2, 0, 0] },
      filterBody: { fontSize: 9, color: '#475569', lineHeight: 1.2 },
      th: { fontSize: 8, bold: true, color: '#0f172a' },
      thCenter: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'center' },
      thRight: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'right' },
      cellStrong: { fontSize: 7.5, color: '#111827', bold: true },
      cellCenter: { fontSize: 7.5, color: '#111827', alignment: 'center' },
      cellNum: { fontSize: 7.5, color: '#111827', alignment: 'right', bold: true },
      cellCustomer: { fontSize: 8, color: '#111827', bold: true, lineHeight: 1.05 },
      cellCity: { fontSize: 7.2, color: '#64748b', lineHeight: 1.0 },
    },
  };

  const pdf = pdfMake.createPdf(docDefinition);
  await printOrDownload(pdf, action, `Order-Summary-Report-${Date.now()}.pdf`);
};

export const generateIncompletePaymentReportPdf = async (
  input: IncompletePaymentReportInput,
  action: 'print' | 'download' = 'download'
): Promise<void> => {
  const { scopeLabel, dateRangeLabel, appliedFilters, orders } = input;
  const logoTextDataUrl = await toDataUrl(logoTextUrl);
  const totalOrders = orders.length;
  const totalCollectivePrice = orders.reduce((sum, order) => sum + Number(order.collectivePrice || 0), 0);
  const totalPaidAmount = orders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);

  const rows: TableCell[][] = orders.map((order) => [
    { text: order.orderCode || `ORD-${order.id}`, style: 'cellStrong' },
    { text: formatDateTime(order.orderDate), style: 'cell' },
    { stack: [{ text: order.customerName || 'N/A', style: 'cellStrong' }, { text: order.cityName || 'N/A', style: 'cellMuted' }] },
    { stack: [{ text: order.deliveryStatus || 'N/A', style: 'cellStrong' }, { text: order.paymentStatus || 'N/A', style: 'cellMuted' }] },
    { text: formatAmount(Number(order.collectivePrice || 0)), style: 'cellNum' },
    { text: formatAmount(Number(order.paidAmount || 0)), style: 'cellNum' },
  ]);

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [16, 20, 16, 20],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'Generated by DELIVERYYA', style: 'footerText' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right' },
      ],
      margin: [20, 0, 20, 8],
    }),
    content: [
      {
        table: {
          widths: ['*', 160],
          body: [[
            {
              stack: [
                { image: logoTextDataUrl, width: 160, margin: [0, 0, 0, 2] },
                { text: `${scopeLabel} - Incomplete Payment Report`, style: 'title' },
                { text: 'Tracks paid amounts for orders that are not yet fully completed.', style: 'subtitle' },
              ],
              border: [false, false, false, false],
            },
            {
              stack: [
                { text: 'Generated', style: 'metaLabel', alignment: 'right' },
                { text: new Date().toLocaleString(), style: 'metaValue', alignment: 'right' },
                { text: `Range: ${dateRangeLabel}`, style: 'metaValue', alignment: 'right', margin: [0, 2, 0, 0] },
              ],
              border: [false, false, false, false],
            },
          ]],
        },
        layout: 'noBorders',
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 563, y2: 0, lineWidth: 2, lineColor: '#f59b0f' }], margin: [0, 6, 0, 10] },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [[
            { stack: [{ text: 'Incomplete Orders', style: 'statLabel' }, { text: String(totalOrders), style: 'statValue', alignment: 'right' }], fillColor: '#f8fafc', margin: [10, 8, 10, 8] },
            { stack: [{ text: 'Total To Receive (LKR)', style: 'statLabelPrimary' }, { text: formatAmount(totalCollectivePrice), style: 'statValuePrimary', alignment: 'right' }], fillColor: '#fff7ed', margin: [10, 8, 10, 8] },
            { stack: [{ text: 'Total Paid Amount (LKR)', style: 'statLabel' }, { text: formatAmount(totalPaidAmount), style: 'statValue', alignment: 'right' }], fillColor: '#f8fafc', margin: [10, 8, 10, 8] },
          ]],
        },
        layout: {
          hLineColor: () => '#d1d5db',
          vLineColor: () => '#d1d5db',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ['*'],
          body: [[{ stack: [{ text: buildFiltersSentence(appliedFilters), style: 'filterBody' }], margin: [10, 8, 10, 8], fillColor: '#f1f5f9' }]],
        },
        layout: {
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [68, 55, 120, 55, 64, 70],
          body: [
            [
              { text: 'Order', style: 'th' },
              { text: 'Date', style: 'th' },
              { text: 'Customer / City', style: 'th' },
              { text: 'Status', style: 'th' },
              { text: 'To Receive (LKR)', style: 'thRight' },
              { text: 'Paid Amount (LKR)', style: 'thRight' },
            ],
            ...rows,
            [
              { text: 'GRAND TOTALS', colSpan: 4, style: 'totalsLabel' },
              {},
              {},
              {},
              { text: formatAmount(totalCollectivePrice), style: 'totalsNum' },
              { text: formatAmount(totalPaidAmount), style: 'totalsNum' },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#e9eef5' : rowIndex === rows.length + 1 ? '#fff7ed' : rowIndex % 2 === 0 ? '#f7fbff' : '#ffffff'),
          hLineColor: () => '#d6e0ea',
          vLineColor: () => '#e2e8f0',
          hLineWidth: (rowIndex: number) => (rowIndex === 0 || rowIndex === rows.length + 1 ? 1 : 0.5),
          vLineWidth: () => 0.4,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
    ],
    styles: {
      footerText: { fontSize: 8, color: '#94a3b8' },
      title: { fontSize: 13, bold: true, color: '#1f2937', margin: [0, 2, 0, 2] },
      subtitle: { fontSize: 9, color: '#6b7280' },
      metaLabel: { fontSize: 9, color: '#6b7280', bold: true },
      metaValue: { fontSize: 9, color: '#374151' },
      statLabel: { fontSize: 9, bold: true, color: '#64748b' },
      statLabelPrimary: { fontSize: 9, bold: true, color: '#92400e' },
      statValue: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
      statValuePrimary: { fontSize: 18, bold: true, color: '#111827', margin: [0, 2, 0, 0] },
      filterBody: { fontSize: 9, color: '#475569', lineHeight: 1.2 },
      th: { fontSize: 8, bold: true, color: '#0f172a' },
      thRight: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'right' },
      cellStrong: { fontSize: 7.5, color: '#111827', bold: true },
      cellMuted: { fontSize: 6.8, color: '#64748b' },
      cellNum: { fontSize: 7.5, color: '#111827', alignment: 'right', bold: true },
      totalsLabel: { fontSize: 9, bold: true, alignment: 'left', color: '#0f172a' },
      totalsNum: { fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' },
    },
  };

  const pdf = pdfMake.createPdf(docDefinition);
  await printOrDownload(pdf, action, `Incomplete-Payment-Report-${Date.now()}.pdf`);
};
