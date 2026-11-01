// pdfGenaretor/ReportPdfGenerator.ts

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { generateReportHeaderHtml, type ReportHeaderData } from './ReportHeaderTemplate';
import logoImage from '../../../assets/images/logo.jpeg';

// Register fonts for pdfmake
(pdfMake as any).vfs = pdfFonts as unknown as Record<string, string>;

// ==================== HELPER FUNCTIONS ====================

/**
 * Convert image URL to Base64
 */
export const convertImageUrlToBase64 = async (url: string): Promise<string> => {
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
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Render HTML to Canvas and convert to Base64 image
 */
export const renderHtmlToCanvas = async (html: string, width = 790, debug = false): Promise<HTMLCanvasElement> => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = `${width}px`;
    container.style.background = '#ffffff';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.boxSizing = 'border-box';
    container.innerHTML = html;
    document.body.appendChild(container);

    let canvas: HTMLCanvasElement | null = null;
    try {
        if ('fonts' in document) {
            await (document as Document & { fonts: FontFaceSet }).fonts.ready;
        }

        const html2canvas = (await import('html2canvas')).default;
        canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: false,
            foreignObjectRendering: false,
            windowWidth: width,
        });

        // Debug: append canvas to DOM for inspection
        if (debug && canvas) {
            canvas.style.position = 'fixed';
            canvas.style.left = '10px';
            canvas.style.top = '10px';
            canvas.style.zIndex = '9999';
            canvas.style.border = '2px solid red';
            document.body.appendChild(canvas);
            setTimeout(() => {
                if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
            }, 10000);
        }
        // Check if canvas is blank (all pixels transparent)
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const allTransparent = !imgData.data.some((v, i) => (i + 1) % 4 !== 0 && v !== 255);
                if (allTransparent) {
                    // eslint-disable-next-line no-console
                    console.warn('renderHtmlToCanvas: Canvas appears blank or fully transparent. Check HTML and resources.');
                }
            }
        }
        return canvas!;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('renderHtmlToCanvas error:', err);
        throw err;
    } finally {
        document.body.removeChild(container);
    }
};

export const convertHtmlToBase64Image = async (html: string, width = 790, debug = false): Promise<string> => {
    const canvas = await renderHtmlToCanvas(html, width, debug);
    return canvas.toDataURL('image/png');
};

/**
 * Print or download PDF
 */
export const printOrDownload = (
    pdf: ReturnType<typeof pdfMake.createPdf>,
    action: 'print' | 'download',
    filename: string,
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

            printWindow.onload = () => {
                setTimeout(tryPrint, 300);
            };

            setTimeout(tryPrint, 1200);
        }).catch(() => {
            resolve();
        });
    });
};

/**
 * Format currency with Rs.
 */
const formatCurrency = (value: number): string => {
    return `Rs. ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format date
 */
const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return 'N/A';
    }
};

/**
 * Get status color
 */
const getStatusColor = (status: string): { bg: string; text: string } => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) {
        return { bg: '#dcfce7', text: '#166534' };
    }
    if (statusLower.includes('pending') || statusLower.includes('pennding')) {
        return { bg: '#fef3c7', text: '#92400e' };
    }
    if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
        return { bg: '#fee2e2', text: '#991b1b' };
    }
    if (statusLower.includes('return')) {
        return { bg: '#ffedd5', text: '#9a3412' };
    }
    if (statusLower.includes('delivering')) {
        return { bg: '#dbeafe', text: '#1e40af' };
    }
    return { bg: '#f3f4f6', text: '#374151' };
};

// ==================== DATA INTERFACES ====================

// Sales Report Data (from OrderAnalytics)
export interface SalesReportOrder {
    id: number;
    deliveryFee: number;
    collectivePrice: number;
    totalPrice: number;
    deliveryStatus: { name: string };
    paymentStatus: { name: string };
    paymentType: { name: string };
    deliveryTo: {
        fullName: string;
        city: { name: string };
    };
    orderCode: { code: string };
    createdAt?: string;
    createdDate?: string;
    orderDate?: string;
    createdOn?: string;
    date?: string;
}

export interface SalesReportData {
    orders: SalesReportOrder[];
    activeFilters: Array<{ label: string }>;
    reportScopeLabel?: string;
}

// Order Report Data (for Delivery Company)
export interface OrderReportOrder {
    id: number;
    orderCode: string;
    customerName: string;
    city: string;
    orderDate: string;
    items: number;
    weight: number;
    totalAmount: number;
    deliveryStatus: string;
    paymentStatus: string;
    paymentType: string;
    deliveryFee: number;
    profit?: number;
}

export interface OrderReportData {
    orders: OrderReportOrder[];
    activeFilters: Array<{ label: string }>;
    reportScopeLabel?: string;
    dateRange: string;
    summary: {
        totalOrders: number;
        totalRevenue: number;
        totalDeliveryFee: number;
        totalProfit?: number;
        avgOrderValue: number;
        pendingOrders: number;
        deliveredOrders: number;
        cancelledOrders: number;
        returningOrders: number;
    };
}

// ==================== HTML BUILDERS ====================

/**
 * Build complete HTML for the report
 */
const buildReportHtml = async (
    headerData: ReportHeaderData,
    tableHtml: string,
    logoBase64: string
): Promise<string> => {
    const headerHtml = generateReportHeaderHtml(headerData, logoBase64);

    return `
        <div style="width:790px;padding:25px;background:#ffffff;font-family:Arial, Helvetica, sans-serif;box-sizing:border-box;margin:0 auto;">
            ${headerHtml}
            
            <!-- Data Table -->
            <div style="margin-top:20px;overflow-x:auto;width:100%;">
                ${tableHtml}
            </div>

            <!-- Footer -->
            <div style="margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center;">
                <div style="margin-bottom:4px;">This is a system-generated report from Deliveryya. For any queries, please contact support@deliveryya.lk</div>
                <div>© ${new Date().getFullYear()} Deliveryya - All rights reserved</div>
            </div>
        </div>
    `;
};

/**
 * Build Sales Report HTML table - FIXED TABLE STRUCTURE
 */
const buildSalesReportTable = (orders: SalesReportOrder[]): string => {
    if (orders.length === 0) {
        return `
            <div style="padding:40px;text-align:center;background:#f9fafb;border-radius:12px;border:1px dashed #e5e7eb;">
                <div style="font-size:16px;color:#6b7280;margin-bottom:8px;">No orders found</div>
                <div style="font-size:12px;color:#9ca3af;">Try adjusting your filters</div>
            </div>
        `;
    }

    // Fixed column count for proper colspan
    const columnCount = 9;

    const tableHeader = `
        <thead>
            <tr style="background:#f3f4f6;">
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Order #</th>
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Date</th>
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Customer</th>
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">City</th>
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Payment</th>
                <th style="padding:12px 8px;text-align:center;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Status</th>
                <th style="padding:12px 8px;text-align:right;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Delivery Fee</th>
                <th style="padding:12px 8px;text-align:right;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Total</th>
                <th style="padding:12px 8px;text-align:right;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Profit</th>
            </tr>
        </thead>
    `;

    let totalSum = 0;
    let feeSum = 0;
    let profitSum = 0;

    const tableRows = orders.map((order, index) => {
        const orderDate = order.createdAt || order.createdDate || order.orderDate || order.createdOn || order.date;
        const formattedDate = formatDate(orderDate);
        const paymentStatus = order.paymentStatus?.name || 'Unknown';
        const paymentType = order.paymentType?.name || 'Unknown';
        const deliveryStatus = order.deliveryStatus?.name || 'Unknown';
        const statusColors = getStatusColor(deliveryStatus);
        const profit = order.collectivePrice > 0 
            ? order.totalPrice - order.collectivePrice 
            : order.deliveryFee;

        totalSum += order.totalPrice;
        feeSum += order.deliveryFee;
        profitSum += profit;

        return `
            <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-weight:500;font-size:11px;">${order.orderCode?.code || `ORD-${order.id}`}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#4b5563;">${formattedDate}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:500;">${order.deliveryTo?.fullName || 'N/A'}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#4b5563;">${order.deliveryTo?.city?.name || 'N/A'}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;">
                    <div style="font-weight:500;">${paymentStatus}</div>
                    <div style="font-size:10px;color:#6b7280;">${paymentType}</div>
                </td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">
                    <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:500;background:${statusColors.bg};color:${statusColors.text};">${deliveryStatus}</span>
                </td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:11px;">${formatCurrency(order.deliveryFee)}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:11px;">${formatCurrency(order.totalPrice)}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:11px;color:#059669;">${formatCurrency(profit)}</td>
            </tr>
        `;
    }).join('');

    // Add summary row with proper colspan
    const summaryRow = `
        <tr style="background:#f3f4f6;font-weight:700;">
            <td colspan="${columnCount - 3}" style="padding:12px 8px;text-align:right;font-size:11px;border-top:2px solid #d1d5db;border-bottom:2px solid #d1d5db;">Totals:</td>
            <td style="padding:12px 8px;text-align:right;border-top:2px solid #d1d5db;border-bottom:2px solid #d1d5db;font-size:12px;font-weight:700;">${formatCurrency(feeSum)}</td>
            <td style="padding:12px 8px;text-align:right;border-top:2px solid #d1d5db;border-bottom:2px solid #d1d5db;font-size:12px;font-weight:700;">${formatCurrency(totalSum)}</td>
            <td style="padding:12px 8px;text-align:right;border-top:2px solid #d1d5db;border-bottom:2px solid #d1d5db;font-size:12px;font-weight:700;color:#059669;">${formatCurrency(profitSum)}</td>
        </tr>
    `;

    return `
        <table style="width:100%;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;font-size:11px;">
            ${tableHeader}
            <tbody>
                ${tableRows}
            </tbody>
            <tfoot>
                ${summaryRow}
            </tfoot>
        </table>
    `;
};

/**
 * Build Order Report HTML table
 */
const buildOrderReportTable = (orders: OrderReportOrder[]): string => {
    if (orders.length === 0) {
        return `
            <div style="padding:40px;text-align:center;background:#f9fafb;border-radius:12px;border:1px dashed #e5e7eb;">
                <div style="font-size:16px;color:#6b7280;margin-bottom:8px;">No orders found</div>
                <div style="font-size:12px;color:#9ca3af;">Try adjusting your filters</div>
            </div>
        `;
    }

    const tableHeader = `
        <thead>
            <tr style="background:#f3f4f6;">
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Order #</th>
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Date</th>
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Customer</th>
                <th style="padding:12px 8px;text-align:left;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">City</th>
                <th style="padding:12px 8px;text-align:center;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Items</th>
                <th style="padding:12px 8px;text-align:center;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Weight</th>
                <th style="padding:12px 8px;text-align:center;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Status</th>
                <th style="padding:12px 8px;text-align:right;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Amount</th>
                <th style="padding:12px 8px;text-align:right;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Delivery Fee</th>
                <th style="padding:12px 8px;text-align:right;font-weight:600;font-size:11px;color:#374151;border-bottom:2px solid #d1d5db;">Profit</th>
            </tr>
        </thead>
    `;

    let totalAmountSum = 0;
    let totalFeeSum = 0;
    let totalProfitSum = 0;

    const tableRows = orders.map((order, index) => {
        const statusColors = getStatusColor(order.deliveryStatus);
        
        totalAmountSum += order.totalAmount;
        totalFeeSum += order.deliveryFee;
        totalProfitSum += order.profit || 0;

        return `
            <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-weight:500;font-size:11px;">${order.orderCode}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#4b5563;">${order.orderDate}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:500;">${order.customerName}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#4b5563;">${order.city}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${order.items}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${order.weight.toFixed(1)} kg</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">
                    <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:500;background:${statusColors.bg};color:${statusColors.text};">${order.deliveryStatus}</span>
                </td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:11px;">${formatCurrency(order.totalAmount)}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:11px;">${formatCurrency(order.deliveryFee)}</td>
                <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:11px;color:#059669;">${formatCurrency(order.profit || 0)}</td>
            </tr>
        `;
    }).join('');

    // Add summary row
    const summaryRow = `
        <tr style="background:#f3f4f6;font-weight:700;">
            <td colspan="7" style="padding:12px 8px;text-align:right;font-size:11px;border-top:2px solid #d1d5db;border-bottom:2px solid #d1d5db;">Totals:</td>
            <td style="padding:12px 8px;text-align:right;border-top:2px solid #d1d5db;border-bottom:2px solid #d1d5db;font-size:12px;font-weight:700;">${formatCurrency(totalAmountSum)}</td>
            <td style="padding:12px 8px;text-align:right;border-top:2px solid #d1d5db;border-bottom:2px solid #d1d5db;font-size:12px;font-weight:700;">${formatCurrency(totalFeeSum)}</td>
            <td style="padding:12px 8px;text-align:right;border-top:2px solid #d1d5db;border-bottom:2px solid #d1d5db;font-size:12px;font-weight:700;color:#059669;">${formatCurrency(totalProfitSum)}</td>
        </tr>
    `;

    return `
        <table style="width:100%;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;font-size:11px;">
            ${tableHeader}
            <tbody>
                ${tableRows}
            </tbody>
            <tfoot>
                ${summaryRow}
            </tfoot>
        </table>
    `;
};

// ==================== MAIN PDF GENERATORS ====================

/**
 * Generate Sales Report PDF (for OrderAnalytics component)
 */
export const generateSalesReportPdfMake = async (
    reportData: SalesReportData,
    action: 'print' | 'download' = 'download'
): Promise<void> => {
    try {
        const { orders, activeFilters, reportScopeLabel = 'Report' } = reportData;

        // Calculate summary metrics
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
        const totalDeliveryFee = orders.reduce((sum, o) => sum + o.deliveryFee, 0);
        const totalProfit = orders.reduce((sum, o) => {
            if (o.collectivePrice > 0) {
                return sum + (o.totalPrice - o.collectivePrice);
            }
            return sum + o.deliveryFee;
        }, 0);
        
        const deliveredCount = orders.filter(o => o.deliveryStatus?.name?.toLowerCase().includes('delivered')).length;
        const pendingCount = orders.filter(o => o.deliveryStatus?.name?.toLowerCase().includes('pending')).length;
        const cancelledCount = orders.filter(o => o.deliveryStatus?.name?.toLowerCase().includes('cancelled')).length;

        // Get date range from orders
        const validDates = orders
            .map(o => o.createdAt || o.createdDate || o.orderDate)
            .filter((d): d is string => !!d)
            .map(d => new Date(d))
            .sort((a, b) => a.getTime() - b.getTime());
        
        let dateRange = 'All dates';
        if (validDates.length > 0) {
            const startDate = validDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const endDate = validDates[validDates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            dateRange = `${startDate} - ${endDate}`;
        } else if (orders.length > 0) {
            dateRange = 'Date not available';
        }

        // Prepare header data
        const headerData: ReportHeaderData = {
            title: 'Delivery Company Profit Report',
            reportType: 'Sales Report',
            generatedDate: new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            dateRange,
            totalOrders,
            totalRevenue: formatCurrency(totalRevenue),
            summaryMetrics: [
                { label: 'Total Orders', value: totalOrders.toString(), color: '#fef3c7' },
                { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: '#dbeafe' },
                { 
                    label: 'Total Profit', 
                    value: formatCurrency(totalProfit),
                    color: '#dcfce7'
                },
                { label: 'Avg Order Value', value: formatCurrency(totalRevenue / (totalOrders || 1)), color: '#f3e8ff' }
            ],
            appliedFilters: activeFilters.length > 0 ? activeFilters : [{ label: 'No filters applied' }],
            scopeLabel: reportScopeLabel
        };

        // Build table HTML
        const tableHtml = buildSalesReportTable(orders);

        // Generate PDF
        const logoBase64 = await convertImageUrlToBase64(logoImage);
        const fullHtml = await buildReportHtml(headerData, tableHtml, logoBase64);
        const reportImage = await convertHtmlToBase64Image(fullHtml);

        const docDefinition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageMargins: [20, 20, 20, 20],
            content: [
                {
                    image: reportImage,
                    width: 555,
                },
            ],
        };

        const pdf = pdfMake.createPdf(docDefinition);
        const filename = `Deliveryya-Delivery-Sales-Report-${Date.now()}.pdf`;
        await printOrDownload(pdf, action, filename);
    } catch (error) {
        console.error('Error generating sales report:', error);
        throw error;
    }
};

/**
 * Generate Order Report PDF (for Delivery Company)
 */
export const generateOrderReportPdfMake = async (
    reportData: OrderReportData,
    action: 'print' | 'download' = 'download'
): Promise<void> => {
    try {
        const { orders, activeFilters, reportScopeLabel = 'Delivery Company', dateRange, summary } = reportData;

        // Prepare header data
        const headerData: ReportHeaderData = {
            title: 'Delivery Order Report',
            reportType: 'Order Report',
            generatedDate: new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            dateRange,
            totalOrders: summary.totalOrders,
            totalRevenue: formatCurrency(summary.totalRevenue),
            summaryMetrics: [
                { label: 'Total Orders', value: summary.totalOrders.toString(), color: '#fef3c7' },
                { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue), color: '#dbeafe' },
                { label: 'Delivery Fee', value: formatCurrency(summary.totalDeliveryFee), color: '#dcfce7' },
                { label: 'Avg Order', value: formatCurrency(summary.avgOrderValue), color: '#f3e8ff' },
                { label: 'Delivered', value: summary.deliveredOrders.toString(), color: '#d1fae5' },
                { label: 'Pending', value: summary.pendingOrders.toString(), color: '#fed7aa' }
            ],
            appliedFilters: activeFilters.length > 0 ? activeFilters : [{ label: 'No filters applied' }],
            scopeLabel: reportScopeLabel
        };

        // Build table HTML
        const tableHtml = buildOrderReportTable(orders);

        // Generate PDF
        const logoBase64 = await convertImageUrlToBase64(logoImage);
        const fullHtml = await buildReportHtml(headerData, tableHtml, logoBase64);
        const reportImage = await convertHtmlToBase64Image(fullHtml);

        const docDefinition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageMargins: [20, 20, 20, 20],
            content: [
                {
                    image: reportImage,
                    width: 555,
                },
            ],
        };

        const pdf = pdfMake.createPdf(docDefinition);
        const filename = `Deliveryya-Order-Report-${Date.now()}.pdf`;
        await printOrDownload(pdf, action, filename);
    } catch (error) {
        console.error('Error generating order report:', error);
        throw error;
    }
};