import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import logoImage from '../assets/images/logo.jpeg';
import logoTextImage from '../assets/images/logo_text.png';

// Types for order data
export interface OrderDataForPdf {
    orderId: string;
    orderCode: string;
    orderPrice: number;
    collectivePrice: number;
    deliveryFee: number;
    quantity: number;
    weight: number;
    description?: string;
    recipientName: string;
    address: string;
    city: string;
    postalCode?: string;
    mobile1: string;
    mobile2?: string;
    whatsapp?: string;
    receiverMobile1?: string;
    receiverMobile2?: string;
    receiverWhatsapp?: string;
    googleMapLocation?: string;
    orderCodeUserId?: number;
    marketOrderId?: number;
    orderCodeDetails?: {
        id?: number;
        code?: string;
        users?: { id?: number; firstName?: string; lastName?: string };
        user?: { id?: number; firstName?: string; lastName?: string };
        userId?: number;
    };
    deliveryTo?: {
        primaryMobile?: string;
        secondaryMobile?: string;
        secondMobile?: string;
        secondary_mobile?: string;
        second_mobile?: string;
        sec_mob?: string;
        second_mob?: string;
        mobile1?: string;
        mobile2?: string;
        mobile?: string;
        phone?: string;
        whatsapp?: string;
        whats_app?: string;
    };
    thirdPartySender?: {
        id?: number;
        name?: string;
        address?: string;
        note?: string;
        first_mob?: string;
        sec_mob?: string;
        whatsapp?: string;
    };
    senderName?: string;
    senderEmail?: string;
    senderPhone?: string;
    senderPhone2?: string;
    senderWhatsapp?: string;
    senderAddress?: string;
    senderType?: 'market' | 'user' | 'third_party' | 'unknown';
    senderNote?: string;
}

// Types for complaint data
export interface ComplaintDataForPdf {
    complainId: number;
    orderCode: string;
    subject: string;
    complainType: string;
    description: string;
    createdDate: string;
    customerName: string;
    customerPhone: string;
}

/**
 * Strip HTML tags from a string
 */
const stripHtmlTags = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
};

/**
 * Generate barcode as base64 image
 */
const generateBarcodeImage = async (value: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, value, {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 12,
                margin: 5,
            });
            resolve(canvas.toDataURL('image/png'));
        } catch (error) {
            console.error('Error generating barcode:', error);
            reject(error);
        }
    });
};

/**
 * Generate QR code as base64 image
 */
const generateQRCodeImage = async (value: string): Promise<string> => {
    try {
        return await QRCode.toDataURL(value, {
            width: 120,
            margin: 1,
            errorCorrectionLevel: 'H',
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        return '';
    }
};

/**
 * Get WhatsApp link from phone number
 */
const getWhatsappLink = (whatsapp?: string): string => {
    if (!whatsapp) return '';
    const phone = whatsapp.replace(/\D/g, '').replace(/^0/, '');
    return phone ? `https://wa.me/94${phone}` : '';
};

/**
 * Convert image URL to base64
 */
const loadImageAsBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
    });
};

/**
 * Generate a single order PDF slip using jsPDF
 * This method creates a professional order slip with barcode, QR codes, and order details
 * 
 * @param orderData - The order data to generate PDF for
 * @param shouldDownload - Whether to immediately download the PDF (default: true)
 * @returns The jsPDF instance for further manipulation if needed
 */
export const generateOrderSlipPDF = async (
    orderData: OrderDataForPdf,
    shouldDownload: boolean = true
): Promise<jsPDF> => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5', // A5 landscape = 210mm x 148mm (half of A4)
    });

    // Render the order on the first page
    await renderOrderOnCurrentPage(doc, orderData);

    // Download if requested
    if (shouldDownload) {
        doc.save(`Order-${orderData.orderCode}.pdf`);
    }

    return doc;
};

/**
 * Generate multiple order slips in a single PDF (each order on a new page)
 * 
 * @param ordersData - Array of order data to generate PDFs for
 * @param filename - Custom filename for the PDF (default: 'Orders.pdf')
 */
export const generateMultipleOrderSlipsPDF = async (
    ordersData: OrderDataForPdf[],
    filename: string = 'Orders.pdf'
): Promise<void> => {
    if (ordersData.length === 0) {
        throw new Error('No orders to generate PDF for');
    }

    // Generate first order
    const doc = await generateOrderSlipPDF(ordersData[0], false);

    // Add remaining orders (each on a new page)
    for (let i = 1; i < ordersData.length; i++) {
        doc.addPage('a5', 'landscape');

        // We need to regenerate each page's content manually
        // Clone the rendering logic for each subsequent order
        await renderOrderOnCurrentPage(doc, ordersData[i]);
    }

    doc.save(filename);
};

/**
 * Generate multiple order slips in a single PDF and return the doc object (for printing)
 * 
 * @param ordersData - Array of order data to generate PDFs for
 * @returns The jsPDF instance for further manipulation (e.g., autoPrint)
 */
export const generateMultipleOrderSlipsPDFForPrint = async (
    ordersData: OrderDataForPdf[]
): Promise<jsPDF> => {
    if (ordersData.length === 0) {
        throw new Error('No orders to generate PDF for');
    }

    // Generate first order
    const doc = await generateOrderSlipPDF(ordersData[0], false);

    // Add remaining orders (each on a new page)
    for (let i = 1; i < ordersData.length; i++) {
        doc.addPage('a5', 'landscape');

        // We need to regenerate each page's content manually
        // Clone the rendering logic for each subsequent order
        await renderOrderOnCurrentPage(doc, ordersData[i]);
    }

    return doc;
};

/**
 * Helper function to render an order on the current page of a jsPDF document
 * This is used internally by generateMultipleOrderSlipsPDF
 */
const renderOrderOnCurrentPage = async (doc: jsPDF, orderData: OrderDataForPdf): Promise<void> => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 8;
    const contentWidth = pageWidth - 2 * margin;

    try {
        // Load images
        const logoBase64 = await loadImageAsBase64(logoImage);
        const barcodeBase64 = await generateBarcodeImage(orderData.orderCode);

        // Optional: WhatsApp QR
        let whatsappQR = '';
        if (orderData.whatsapp) {
            const whatsappLink = getWhatsappLink(orderData.whatsapp);
            if (whatsappLink) {
                whatsappQR = await generateQRCodeImage(whatsappLink);
            }
        }

        // Optional: Location QR
        let locationQR = '';
        if (orderData.googleMapLocation) {
            locationQR = await generateQRCodeImage(orderData.googleMapLocation);
        }

        // Current date
        const orderDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        // Total amount
        const totalAmount = orderData.orderPrice + orderData.deliveryFee;
        const safeDescription = orderData.description ? stripHtmlTags(orderData.description) : '';

        // --- HEADER SECTION ---
        let yPos = margin;

        // Logo (left + centered brand mark)
        doc.addImage(logoBase64, 'PNG', margin, yPos, 16, 16);
        doc.addImage(logoBase64, 'PNG', (pageWidth / 2) - 8, yPos, 16, 16);

        // Slip title and date under the centered logo
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('COD Order Slip', pageWidth / 2, yPos + 11, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(orderDate, pageWidth / 2, yPos + 15, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Barcode (right)
        doc.addImage(barcodeBase64, 'PNG', pageWidth - margin - 40, yPos, 40, 16);

        yPos += 20;

        // Horizontal line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 4;

        // --- MAIN CONTENT GRID ---
        const leftColWidth = contentWidth * 0.65;
        const rightColX = margin + leftColWidth + 4;
        const rightColWidth = contentWidth * 0.35 - 4;

        // LEFT COLUMN - Order Details
        let leftY = yPos;

        // Order Details Section
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('Order Details', margin, leftY);
        doc.setDrawColor(156, 163, 175);
        doc.line(margin, leftY + 1, margin + leftColWidth, leftY + 1);
        leftY += 5;

        // Order details grid (2 columns)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const detailsStartY = leftY;
        const col1X = margin + 2;
        const col2X = margin + leftColWidth / 2 + 2;

        // Column 1
        doc.setDrawColor(255, 167, 38);
        doc.setLineWidth(0.5);
        doc.line(col1X - 2, detailsStartY - 1, col1X - 2, detailsStartY + 18);

        doc.setTextColor(107, 114, 128);
        doc.text('Price:', col1X, detailsStartY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Rs. ${orderData.orderPrice.toFixed(2)}`, col1X, detailsStartY + 4);

        doc.setFont('helvetica', 'normal');
        doc.line(col1X - 2, detailsStartY + 8, col1X - 2, detailsStartY + 27);
        doc.setTextColor(107, 114, 128);
        doc.text('Qty:', col1X, detailsStartY + 11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`${orderData.quantity}`, col1X, detailsStartY + 15);

        // Column 2
        doc.line(col2X - 2, detailsStartY - 1, col2X - 2, detailsStartY + 18);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text('Fee:', col2X, detailsStartY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Rs. ${orderData.deliveryFee.toFixed(2)}`, col2X, detailsStartY + 4);

        doc.setFont('helvetica', 'normal');
        doc.line(col2X - 2, detailsStartY + 8, col2X - 2, detailsStartY + 27);
        doc.setTextColor(107, 114, 128);
        doc.text('Wt:', col2X, detailsStartY + 11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`${orderData.weight.toFixed(2)} kg`, col2X, detailsStartY + 15);

        leftY += 20;

        // Total box
        doc.setFillColor(254, 243, 199); // Amber-100
        doc.setDrawColor(255, 167, 38);
        doc.roundedRect(margin, leftY, leftColWidth, 8, 1, 1, 'FD');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Total:', margin + 2, leftY + 5);
        doc.setTextColor(180, 83, 9);
        doc.text(`Rs. ${totalAmount.toFixed(2)}`, margin + leftColWidth - 2, leftY + 5, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        leftY += 12;

        // Delivery Information Section
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('Delivery To', margin, leftY);
        doc.setDrawColor(156, 163, 175);
        doc.line(margin, leftY + 1, margin + leftColWidth, leftY + 1);
        leftY += 5;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text(orderData.recipientName, margin, leftY);
        leftY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        const addressLines = doc.splitTextToSize(orderData.address, leftColWidth - 4);
        doc.text(addressLines, margin, leftY);
        leftY += addressLines.length * 4;

        doc.setFont('helvetica', 'bold');
        doc.text(`City: `, margin, leftY);
        doc.setFont('helvetica', 'normal');
        doc.text(orderData.city, margin + 10, leftY);

        if (orderData.postalCode) {
            doc.setFont('helvetica', 'bold');
            doc.text('PIN: ', margin + leftColWidth / 2, leftY);
            doc.setFont('helvetica', 'normal');
            doc.text(orderData.postalCode, margin + leftColWidth / 2 + 10, leftY);
        }
        leftY += 6;

        // Mobile numbers box
        doc.setFillColor(239, 246, 255); // Blue-50
        doc.setDrawColor(147, 197, 253);
        doc.roundedRect(margin, leftY, leftColWidth, orderData.mobile2 ? 10 : 6, 1, 1, 'FD');

        doc.setTextColor(55, 65, 81);
        doc.setFont('helvetica', 'bold');
        doc.text('Mobile No. 1: ', margin + 2, leftY + 4);
        doc.setFont('helvetica', 'normal');
        doc.text(orderData.mobile1, margin + 25, leftY + 4);

        if (orderData.mobile2) {
            doc.setFont('helvetica', 'bold');
            doc.text('Mobile No. 2: ', margin + 2, leftY + 8);
            doc.setFont('helvetica', 'normal');
            doc.text(orderData.mobile2, margin + 25, leftY + 8);
            leftY += 12;
        } else {
            leftY += 8;
        }

        // Description (if any)
        if (safeDescription) {
            doc.setFillColor(249, 250, 251); // Gray-50
            doc.setDrawColor(209, 213, 219);
            const descLines = doc.splitTextToSize(safeDescription, leftColWidth - 4);
            const descHeight = Math.min(descLines.length * 4 + 2, 15);
            doc.roundedRect(margin, leftY, leftColWidth, descHeight, 1, 1, 'FD');

            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('Note: ', margin + 2, leftY + 4);
            doc.setFont('helvetica', 'normal');
            const noteX = margin + 2 + doc.getTextWidth('Note: ');
            doc.text(descLines.slice(0, 3), noteX, leftY + 4); // Limit to 3 lines
        }

        // RIGHT COLUMN - QR Codes
        let rightY = yPos;

        // WhatsApp QR
        if (whatsappQR) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('WhatsApp', rightColX + rightColWidth / 2, rightY, { align: 'center' });
            rightY += 4;

            doc.setDrawColor(209, 213, 219);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(rightColX + (rightColWidth - 32) / 2, rightY, 32, 32, 1, 1, 'FD');
            doc.addImage(whatsappQR, 'PNG', rightColX + (rightColWidth - 30) / 2, rightY + 1, 30, 30);
            rightY += 36;
        }

        // Location QR
        if (locationQR) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Location', rightColX + rightColWidth / 2, rightY, { align: 'center' });
            rightY += 4;

            doc.setDrawColor(209, 213, 219);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(rightColX + (rightColWidth - 32) / 2, rightY, 32, 32, 1, 1, 'FD');
            doc.addImage(locationQR, 'PNG', rightColX + (rightColWidth - 30) / 2, rightY + 1, 30, 30);
        }

        // Border around the entire page
        doc.setDrawColor(209, 213, 219);
        doc.setLineWidth(0.5);
        doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

    } catch (error) {
        console.error('Error rendering order on page:', error);
        throw error;
    }
};

/**
 * Generate a complaint receipt PDF (token/ticket)
 * Creates a professional complaint receipt that customers can download or print
 * 
 * @param complaintData - The complaint data to generate PDF for
 * @param shouldDownload - Whether to immediately download the PDF (default: true)
 * @returns The jsPDF instance for further manipulation if needed
 */
export const generateComplaintReceiptPDF = async (
    complaintData: ComplaintDataForPdf,
    shouldDownload: boolean = true
): Promise<jsPDF> => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    try {
        // Load logo
        const logoBase64 = await loadImageAsBase64(logoImage);

        // Generate QR code for complaint ID
        const complaintQR = await generateQRCodeImage(`COMPLAINT-${complaintData.complainId}`);

        const createdDate = new Date(complaintData.createdDate).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const drawField = (
            label: string,
            value: string,
            x: number,
            y: number,
            width: number,
            labelWidth = 22,
        ) => {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(label, x, y);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            const lines = doc.splitTextToSize(value || '-', width - labelWidth);
            doc.text(lines, x + labelWidth, y);
            return Math.max(4.5, lines.length * 4.2);
        };

        let yPos = margin;

        // Header block
        doc.addImage(logoBase64, 'PNG', margin, yPos, 16, 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Complaint Receipt', margin + 21, yPos + 9);

        doc.setFontSize(8.5);
        doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, pageWidth - margin, yPos + 5, { align: 'right' });
        doc.text(`Receipt ID: CP-${complaintData.complainId}`, pageWidth - margin, yPos + 10, { align: 'right' });

        yPos += 20;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;

        // Tracking section with QR
        const qrSize = 28;
        const trackingBlockHeight = qrSize + 6;
        doc.setDrawColor(120, 120, 120);
        doc.rect(margin, yPos, contentWidth, trackingBlockHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('Tracking Information', margin + 3, yPos + 6);

        doc.setFontSize(13);
        doc.text(`#${complaintData.complainId}`, margin + 3, yPos + 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Created: ${createdDate}`, margin + 3, yPos + 19);

        if (complaintQR) {
            const qrX = pageWidth - margin - qrSize - 3;
            const qrY = yPos + 3;
            doc.addImage(complaintQR, 'PNG', qrX, qrY, qrSize, qrSize);
        }

        yPos += trackingBlockHeight + 6;

        // Customer + order section
        const twoColGap = 6;
        const leftColX = margin;
        const leftColWidth = (contentWidth - twoColGap) / 2;
        const rightColX = leftColX + leftColWidth + twoColGap;
        const rightColWidth = leftColWidth;
        const infoBlockHeight = 34;

        doc.setDrawColor(120, 120, 120);
        doc.rect(leftColX, yPos, leftColWidth, infoBlockHeight);
        doc.rect(rightColX, yPos, rightColWidth, infoBlockHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Customer', leftColX + 3, yPos + 6);
        doc.text('Order', rightColX + 3, yPos + 6);

        let leftY = yPos + 12;
        leftY += drawField('Name:', complaintData.customerName, leftColX + 3, leftY, leftColWidth - 6);
        leftY += 4;
        drawField('Phone:', complaintData.customerPhone, leftColX + 3, leftY, leftColWidth - 6);

        let rightY = yPos + 12;
        rightY += drawField('Order:', complaintData.orderCode, rightColX + 3, rightY, rightColWidth - 6);
        rightY += 4;
        drawField('Type:', complaintData.complainType, rightColX + 3, rightY, rightColWidth - 6);

        yPos += infoBlockHeight + 6;

        // Subject and description section
        const cleanedDescription = stripHtmlTags(complaintData.description || '');
        const subjectLines = doc.splitTextToSize(complaintData.subject || '-', contentWidth - 30);
        const descriptionLines = doc.splitTextToSize(cleanedDescription || '-', contentWidth - 6);
        const descriptionHeight = Math.max(36, descriptionLines.length * 4.2 + 10);

        doc.setDrawColor(120, 120, 120);
        doc.rect(margin, yPos, contentWidth, 12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Subject:', margin + 3, yPos + 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(subjectLines, margin + 25, yPos + 7);

        yPos += 16;

        doc.setDrawColor(120, 120, 120);
        doc.rect(margin, yPos, contentWidth, descriptionHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Description', margin + 3, yPos + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(descriptionLines, margin + 3, yPos + 12);

        yPos += descriptionHeight + 8;

        // Footer note and support
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 60);
        doc.text('Keep this receipt for your records. Use the complaint ID for status checks and support requests.', pageWidth / 2, yPos, {
            align: 'center',
            maxWidth: contentWidth,
        });

        yPos += 8;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Support:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text('support@deliveryya.lk  |  +94 (0)112 234 567  |  www.deliveryya.lk', margin + 17, yPos);

        // Monochrome border around the page
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.5);
        doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

    } catch (error) {
        console.error('Error generating complaint receipt PDF:', error);
        throw error;
    }

    // Download if requested
    if (shouldDownload) {
        doc.save(`Complaint-${complaintData.complainId}.pdf`);
    }

    return doc;
};

// ─── Sales Report ─────────────────────────────────────────────────────────────

export interface SalesReportOrder {
    id: number;
    deliveryFee: number;
    collectivePrice: number;
    totalPrice: number;
    deliveryStatus: { name: string };
    paymentStatus: { name: string };
    paymentType: { name: string };
    deliveryTo: { fullName: string; city: { name: string } };
    orderCode: { code: string };
    createdAt?: string;
    createdDate?: string;
    orderDate?: string;
    createdOn?: string;
    date?: string;
}

export interface SalesReportData {
    orders: SalesReportOrder[];
    isClientDeliveryFeeView: boolean;
    activeFilters: { label: string }[];
    reportScopeLabel?: string;
}

const getSROrderDate = (o: SalesReportOrder): string => {
    const raw = o.createdAt ?? o.createdDate ?? o.orderDate ?? o.createdOn ?? o.date ?? null;
    if (!raw) return 'N/A';
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getSRProfit = (o: SalesReportOrder): number =>
    o.collectivePrice > 0 ? o.totalPrice - o.collectivePrice : (o.deliveryFee || 0);

export const generateSalesReportPDF = async (
    reportData: SalesReportData,
    shouldDownload = true,
): Promise<jsPDF> => {

    const { orders, isClientDeliveryFeeView, activeFilters, reportScopeLabel } = reportData;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const mg = 14;
    const cw = pageW - mg * 2;
    const rowH = 7;

    const fmt = (v: number) => `LKR ${v.toLocaleString()}`;

    const colors = {
        ink: [17, 24, 39] as [number, number, number],
        muted: [100, 116, 139] as [number, number, number],
        line: [203, 213, 225] as [number, number, number],
        brandBg: [255, 244, 230] as [number, number, number],
        brandAccent: [234, 88, 12] as [number, number, number],
        panelBg: [248, 250, 252] as [number, number, number],
        tableHeaderBg: [226, 232, 240] as [number, number, number],
        tableHeaderText: [15, 23, 42] as [number, number, number],
        zebra: [252, 253, 255] as [number, number, number],
    };

    const generatedAt = new Date().toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // ===== DATA =====
    const totalOrders = orders.length;
    const totalSales = orders.reduce((s, o) => s + o.totalPrice, 0);
    const totalDeliveryFee = orders.reduce((s, o) => s + (o.deliveryFee || 0), 0);

    const getProfit = (o: SalesReportOrder) =>
        o.collectivePrice > 0
            ? o.totalPrice - o.collectivePrice
            : (o.deliveryFee || 0);

    const totalProfit = orders.reduce((s, o) => s + getProfit(o), 0);

    const avgOrderValue = totalOrders ? totalSales / totalOrders : 0;

    const statusMap = new Map<string, number>();
    orders.forEach(o => {
        const n = o.deliveryStatus?.name || 'Unknown';
        statusMap.set(n, (statusMap.get(n) || 0) + 1);
    });

    const deliveredCount = statusMap.get('Delivered') || 0;
    const completionRate = totalOrders
        ? Math.round((deliveredCount / totalOrders) * 100)
        : 0;

    let logoBase64 = '';
    try {
        logoBase64 = await loadImageAsBase64(logoImage);
    } catch (error) {
        console.error('Unable to load report logo:', error);
    }

    // ===== PAGE FLOW =====
    let y = mg;

    const checkPage = (need: number) => {
        if (y + need > pageH - mg) {
            doc.addPage();
            y = mg;
        }
    };

    // ===== HEADER / BRAND BAND =====
    const headerH = 26;
    doc.setFillColor(...colors.brandBg);
    doc.roundedRect(mg, y, cw, headerH, 3, 3, 'F');
    doc.setDrawColor(...colors.line);
    doc.roundedRect(mg, y, cw, headerH, 3, 3, 'S');

    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', mg + 3, y + 3, 14, 14);
    }

    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.ink);
    doc.text(
        isClientDeliveryFeeView ? 'Order Sales Report' : 'Sales & Profit Report',
        logoBase64 ? mg + 20 : mg + 4,
        y + 10
    );

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text(`Generated ${generatedAt}`, pageW - mg - 3, y + 8, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(...colors.brandAccent);
    doc.text(`${reportScopeLabel || (isClientDeliveryFeeView ? 'Market Owner' : 'Delivery Company')}`, logoBase64 ? mg + 20 : mg + 4, y + 16);

    y += headerH + 6;

    // ===== APPLIED FILTERS =====
    const appliedFiltersText =
        activeFilters.length > 0
            ? activeFilters.map((f) => f.label).join(' | ')
            : 'None (All records in current access scope)';

    const filterLines = doc.splitTextToSize(`Applied Filters: ${appliedFiltersText}`, cw - 4);
    const filterBoxHeight = Math.max(10, filterLines.length * 4 + 5);
    checkPage(filterBoxHeight + 2);

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(mg, y, cw, filterBoxHeight, 2, 2, 'F');
    doc.setDrawColor(147, 197, 253);
    doc.roundedRect(mg, y, cw, filterBoxHeight, 2, 2, 'S');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175);
    doc.text(filterLines, mg + 2, y + 5);

    y += filterBoxHeight + 6;

    // ===== SUMMARY CARDS =====
    const heroH = 24;
    const heroCols = [
        { label: 'Total Orders', value: String(totalOrders) },
        { label: 'Total Revenue', value: fmt(totalSales) },
        {
            label: isClientDeliveryFeeView ? 'Delivery Fee' : 'Estimated Profit',
            value: fmt(isClientDeliveryFeeView ? totalDeliveryFee : totalProfit)
        }
    ];

    const heroW = cw / 3;

    heroCols.forEach((c, i) => {
        const x = mg + heroW * i;

        const cardFill = i === 0
            ? [255, 247, 237] as [number, number, number]
            : i === 1
                ? [239, 246, 255] as [number, number, number]
                : [236, 253, 245] as [number, number, number];

        doc.setFillColor(...cardFill);
        doc.setDrawColor(...colors.line);
        doc.roundedRect(x, y, heroW - 2, heroH, 2, 2, 'FD');

        doc.setFontSize(8);
        doc.setTextColor(...colors.muted);
        doc.text(c.label, x + 4, y + 7);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.ink);
        doc.text(c.value, x + 4, y + 17);
    });

    y += heroH + 8;

    y += 2;

    // ===== STATUS TABLE (BORDERED) =====
    checkPage(50);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Status Breakdown', mg, y);

    y += 6;

    const statusCols = [
        { name: 'Status', w: cw * 0.45 },
        { name: 'Orders', w: cw * 0.17 },
        { name: 'Rate', w: cw * 0.13 },
        { name: 'Revenue', w: cw * 0.25 },
    ];

    let statusX = mg;
    doc.setTextColor(...colors.tableHeaderText);
    doc.setFontSize(8);
    statusCols.forEach((col) => {
        doc.setFillColor(...colors.tableHeaderBg);
        doc.rect(statusX, y, col.w, rowH, 'FD');
        doc.setDrawColor(...colors.line);
        doc.rect(statusX, y, col.w, rowH, 'S');
        doc.text(col.name, statusX + 2, y + 4.8);
        statusX += col.w;
    });

    y += rowH;

    statusMap.forEach((count, name) => {

        checkPage(rowH + 1);

        const revenue = orders
            .filter(o => o.deliveryStatus?.name === name)
            .reduce((s, o) => s + o.totalPrice, 0);

        const rate = totalOrders ? `${Math.round((count / totalOrders) * 100)}%` : '0%';

        const rowData = [name, String(count), rate, fmt(revenue)];
        let rowX = mg;
        rowData.forEach((value, idx) => {
            doc.setFillColor(...colors.zebra);
            doc.rect(rowX, y, statusCols[idx].w, rowH, 'F');
            doc.setDrawColor(...colors.line);
            doc.rect(rowX, y, statusCols[idx].w, rowH, 'S');

            doc.setTextColor(...colors.ink);
            doc.setFontSize(8);
            if (idx === 3) {
                doc.text(value, rowX + statusCols[idx].w - 2, y + 4.8, { align: 'right' });
            } else {
                doc.text(value, rowX + 2, y + 4.8);
            }
            rowX += statusCols[idx].w;
        });

        y += rowH;
    });

    y += 6;

    // ===== ORDERS TABLE (BORDERED GRID) =====
    checkPage(50);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order Details (${totalOrders})`, mg, y);

    y += 6;

    const columns = isClientDeliveryFeeView
        ? [
            { key: 'idx', header: '#', w: 0.05, align: 'left' as const },
            { key: 'date', header: 'Date', w: 0.10, align: 'left' as const },
            { key: 'code', header: 'Code', w: 0.12, align: 'left' as const },
            { key: 'customer', header: 'Customer', w: 0.18, align: 'left' as const },
            { key: 'city', header: 'City', w: 0.12, align: 'left' as const },
            { key: 'payment', header: 'Payment', w: 0.13, align: 'left' as const },
            { key: 'status', header: 'Status', w: 0.12, align: 'left' as const },
            { key: 'fee', header: 'Delivery Fee', w: 0.09, align: 'right' as const },
            { key: 'total', header: 'Total', w: 0.09, align: 'right' as const },
        ]
        : [
            { key: 'idx', header: '#', w: 0.05, align: 'left' as const },
            { key: 'date', header: 'Date', w: 0.10, align: 'left' as const },
            { key: 'code', header: 'Code', w: 0.12, align: 'left' as const },
            { key: 'customer', header: 'Customer', w: 0.18, align: 'left' as const },
            { key: 'city', header: 'City', w: 0.12, align: 'left' as const },
            { key: 'payment', header: 'Payment', w: 0.13, align: 'left' as const },
            { key: 'status', header: 'Status', w: 0.12, align: 'left' as const },
            { key: 'total', header: 'Total', w: 0.09, align: 'right' as const },
            { key: 'profit', header: 'Profit', w: 0.09, align: 'right' as const },
        ];

    const colWidths = columns.map((c) => c.w * cw);

    const drawOrdersTableHeader = () => {
        let x = mg;
        doc.setTextColor(...colors.tableHeaderText);
        doc.setFontSize(7.3);
        columns.forEach((col, i) => {
            const w = colWidths[i];
            doc.setFillColor(...colors.tableHeaderBg);
            doc.rect(x, y, w, rowH, 'FD');
            doc.setDrawColor(...colors.line);
            doc.rect(x, y, w, rowH, 'S');
            doc.text(col.header, x + 1.6, y + 4.8);
            x += w;
        });
        y += rowH;
    };

    drawOrdersTableHeader();

    orders.forEach((o, i) => {

        if (y + rowH > pageH - mg) {
            doc.addPage();
            y = mg;
            drawOrdersTableHeader();
        }

        const paymentText = `${o.paymentStatus?.name || '-'} / ${o.paymentType?.name || '-'}`;

        const valuesByKey: Record<string, string> = {
            idx: String(i + 1),
            date: getSROrderDate(o),
            code: o.orderCode?.code || '-',
            customer: o.deliveryTo?.fullName || '-',
            city: o.deliveryTo?.city?.name || '-',
            payment: paymentText,
            status: o.deliveryStatus?.name || '-',
            fee: fmt(o.deliveryFee || 0),
            total: fmt(o.totalPrice),
            profit: fmt(getSRProfit(o)),
        };

        let x = mg;
        columns.forEach((col, colIndex) => {
            const w = colWidths[colIndex];
            doc.setFillColor(...(i % 2 === 0 ? colors.zebra : [255, 255, 255] as [number, number, number]));
            doc.rect(x, y, w, rowH, 'F');
            doc.setDrawColor(...colors.line);
            doc.rect(x, y, w, rowH, 'S');

            doc.setFontSize(7.2);
            doc.setTextColor(...colors.ink);
            const rawValue = valuesByKey[col.key] || '-';
            const trimmedValue = doc.splitTextToSize(rawValue, w - 3)[0] || '-';

            if (col.align === 'right') {
                doc.text(trimmedValue, x + w - 1.4, y + 4.8, { align: 'right' });
            } else {
                doc.text(trimmedValue, x + 1.4, y + 4.8);
            }
            x += w;
        });

        y += rowH;
    });

    // ===== FOOTER =====
    const pages = doc.getNumberOfPages();

    for (let p = 1; p <= pages; p++) {
        doc.setPage(p);

        doc.setFontSize(7);
        doc.setTextColor(...colors.muted);

        doc.text('Confidential - Deliveryya Internal Report', mg, pageH - mg + 4);
        doc.text(`Page ${p} of ${pages}`, pageW - mg, pageH - mg + 4, { align: 'right' });
    }

    if (shouldDownload) {
        const scopePrefix = isClientDeliveryFeeView ? 'client-sales-report' : 'delivery-sales-report';
        doc.save(`${scopePrefix}-${Date.now()}.pdf`);
    }

    return doc;
};

export const printSalesReport = async (reportData: SalesReportData): Promise<void> => {
    const doc = await generateSalesReportPDF(reportData, false);
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
        throw new Error('Unable to open print window. Please allow popups and try again.');
    }
};

// --- Financial Report --------------------------------------------------------

export interface FinancialReportTransaction {
    id: number;
    amount: number;
    flowType: 'Incoming' | 'Outgoing' | string;
    paymentStatus: string;
    paymentType: string;
    accountHolder: string;
    note: string;
    referenceCode: string;
    createdAt?: string;
    createdDate?: string;
    date?: string;
}

export interface FinancialReportData {
    transactions: FinancialReportTransaction[];
    activeFilters: { label: string }[];
    reportScopeLabel?: string;
    dateRangeLabel?: string;
}

const getFinancialTransactionDate = (row: FinancialReportTransaction): string => {
    const raw = row.createdAt ?? row.createdDate ?? row.date ?? null;
    if (!raw) return 'N/A';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const generateFinancialReportPDF = async (
    reportData: FinancialReportData,
    shouldDownload = true,
): Promise<jsPDF> => {
    const { transactions, activeFilters, reportScopeLabel, dateRangeLabel } = reportData;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const mg = 14;
    const cw = pageW - mg * 2;
    const rowH = 7;

    const fmt = (v: number) => `LKR ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const colors = {
        ink: [17, 24, 39] as [number, number, number],
        muted: [100, 116, 139] as [number, number, number],
        line: [203, 213, 225] as [number, number, number],
        brandBg: [255, 244, 230] as [number, number, number],
        brandAccent: [234, 88, 12] as [number, number, number],
        tableHeaderBg: [226, 232, 240] as [number, number, number],
        tableHeaderText: [15, 23, 42] as [number, number, number],
        zebra: [252, 253, 255] as [number, number, number],
    };

    const generatedAt = new Date().toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const resolvedDateRange = dateRangeLabel || 'All dates';

    const incomingTransactions = transactions.filter((t) => (t.flowType || '').toLowerCase() === 'incoming');
    const outgoingTransactions = transactions.filter((t) => (t.flowType || '').toLowerCase() === 'outgoing');

    const totalTransactions = transactions.length;
    const totalIncoming = incomingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOutgoing = outgoingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const netCashFlow = totalIncoming - totalOutgoing;

    const statusMap = new Map<string, { count: number; amount: number }>();
    transactions.forEach((t) => {
        const key = t.paymentStatus || 'Unknown';
        const current = statusMap.get(key) || { count: 0, amount: 0 };
        statusMap.set(key, { count: current.count + 1, amount: current.amount + (t.amount || 0) });
    });

    let logoBase64 = '';
    try {
        logoBase64 = await loadImageAsBase64(logoTextImage);
    } catch (error) {
        console.error('Unable to load report logo:', error);
    }

    let y = mg;

    const checkPage = (need: number) => {
        if (y + need > pageH - mg) {
            doc.addPage();
            y = mg;
        }
    };

    const headerLogoW = 66;
    const headerLogoH = 22;
    const headerTopRowH = 24;

    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', mg, y - 1, headerLogoW, headerLogoH);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.setFontSize(8.5);
    doc.text('Generated', pageW - mg, y + 4, { align: 'right' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.ink);
    doc.text(generatedAt, pageW - mg, y + 9, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.ink);
    // doc.text(`Range: ${resolvedDateRange}`, pageW - mg, y + 15, { align: 'right' });

    y += headerTopRowH + 3;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.ink);
    doc.text('Delivery Company - Financial Report', mg, y + 2);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(reportScopeLabel || 'Accounts', mg, y + 8);

    y += 14;

    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(1.1);
    doc.line(mg, y, pageW - mg, y);
    // jsPDF line width is global; reset after the accent divider to keep table borders slim.
    doc.setLineWidth(0.2);

    y += 6;

    const appliedFiltersText =
        activeFilters.length > 0
            ? activeFilters.map((f) => f.label).join(' | ')
            : 'None (All records in current access scope)';

    const filterLines = doc.splitTextToSize(`Applied Filters: ${appliedFiltersText}`, cw - 4);
    const filterBoxHeight = Math.max(10, filterLines.length * 4 + 5);
    checkPage(filterBoxHeight + 2);

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(mg, y, cw, filterBoxHeight, 2, 2, 'F');
    doc.setDrawColor(147, 197, 253);
    doc.roundedRect(mg, y, cw, filterBoxHeight, 2, 2, 'S');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175);
    doc.text(filterLines, mg + 2, y + 5);

    y += filterBoxHeight + 6;

    const cards = [
        { label: 'Transactions', value: String(totalTransactions), fill: [255, 247, 237] as [number, number, number] },
        { label: 'Total Inflow', value: fmt(totalIncoming), fill: [236, 253, 245] as [number, number, number] },
        { label: 'Total Outflow', value: fmt(totalOutgoing), fill: [254, 242, 242] as [number, number, number] },
        { label: 'Net Cash Flow', value: fmt(netCashFlow), fill: [239, 246, 255] as [number, number, number] },
    ];

    const cardGap = 2;
    const cardW = (cw - cardGap * 3) / 4;
    const cardH = 22;

    cards.forEach((card, index) => {
        const x = mg + (cardW + cardGap) * index;
        doc.setFillColor(...card.fill);
        doc.setDrawColor(...colors.line);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.muted);
        doc.text(card.label, x + 3, y + 7);

        doc.setFontSize(11.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.ink);
        doc.text(card.value, x + 3, y + 16);
    });

    y += cardH + 8;

    checkPage(45);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.ink);
    doc.text('Payment Status Breakdown', mg, y);

    y += 6;

    const statusCols = [
        { name: 'Status', w: cw * 0.5 },
        { name: 'Transactions', w: cw * 0.2 },
        { name: 'Amount', w: cw * 0.3 },
    ];

    let statusX = mg;
    doc.setTextColor(...colors.tableHeaderText);
    doc.setFontSize(8);
    statusCols.forEach((col) => {
        doc.setFillColor(...colors.tableHeaderBg);
        doc.rect(statusX, y, col.w, rowH, 'FD');
        doc.setDrawColor(...colors.line);
        doc.rect(statusX, y, col.w, rowH, 'S');
        doc.text(col.name, statusX + 2, y + 4.8);
        statusX += col.w;
    });

    y += rowH;

    statusMap.forEach((summary, statusName) => {
        checkPage(rowH + 1);

        const rowData = [statusName, String(summary.count), fmt(summary.amount)];
        let rowX = mg;

        rowData.forEach((value, idx) => {
            doc.setFillColor(...colors.zebra);
            doc.rect(rowX, y, statusCols[idx].w, rowH, 'F');
            doc.setDrawColor(...colors.line);
            doc.rect(rowX, y, statusCols[idx].w, rowH, 'S');

            doc.setFontSize(8);
            doc.setTextColor(...colors.ink);
            if (idx === 2) {
                doc.text(value, rowX + statusCols[idx].w - 2, y + 4.8, { align: 'right' });
            } else {
                doc.text(value, rowX + 2, y + 4.8);
            }

            rowX += statusCols[idx].w;
        });

        y += rowH;
    });

    y += 8;

    checkPage(70);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.ink);
    doc.text(`Financial Transactions (${totalTransactions})`, mg, y);

    y += 6;

    // Date strip above the table to match the compact report layout.
    const dateStripH = 8.5;
    doc.setFillColor(230, 234, 240);
    doc.setDrawColor(196, 205, 216);
    doc.rect(mg, y, cw, dateStripH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(`Date: ${resolvedDateRange}`, mg + 2, y + 5.8);

    y += dateStripH + 4;

    const tableHeaderH = 8.5;
    const tableRowH = 11;
    const columns = [
        { key: 'order', header: 'Order', w: 0.17, align: 'left' as const },
        { key: 'date', header: 'Date', w: 0.10, align: 'left' as const },
        { key: 'customer', header: 'Customer / City', w: 0.24, align: 'left' as const },
        { key: 'payment', header: 'Payment', w: 0.17, align: 'left' as const },
        { key: 'flow', header: 'Flow', w: 0.10, align: 'left' as const },
        { key: 'amount', header: 'Amount (LKR)', w: 0.11, align: 'right' as const },
        { key: 'net', header: 'Net (LKR)', w: 0.11, align: 'right' as const },
    ];
    const colWidths = columns.map((c) => c.w * cw);

    const drawTransactionsHeader = () => {
        let x = mg;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(8.4);
        columns.forEach((col, i) => {
            const w = colWidths[i];
            doc.setFillColor(205, 212, 222);
            doc.setDrawColor(196, 205, 216);
            doc.rect(x, y, w, tableHeaderH, 'FD');
            if (col.align === 'right') {
                doc.text(col.header, x + w - 1.6, y + 5.5, { align: 'right' });
            } else {
                doc.text(col.header, x + 1.6, y + 5.5);
            }
            x += w;
        });
        y += tableHeaderH;
    };

    drawTransactionsHeader();

    transactions.forEach((transaction, index) => {
        if (y + tableRowH > pageH - mg - tableRowH) {
            doc.addPage();
            y = mg;
            drawTransactionsHeader();
        }

        const isIncoming = (transaction.flowType || '').toLowerCase() === 'incoming';
        const netValue = isIncoming ? (transaction.amount || 0) : -(transaction.amount || 0);

        const customerMain = (transaction.accountHolder || '-').trim();
        const customerSub = (transaction.note || '-').trim();
        const paymentMain = (transaction.paymentStatus || '-').trim();
        const paymentSub = (transaction.paymentType || '-').trim();

        const row = {
            order: (transaction.referenceCode || '-').trim(),
            date: getFinancialTransactionDate(transaction),
            customerMain,
            customerSub,
            paymentMain,
            paymentSub,
            flow: (transaction.flowType || '-').trim(),
            amount: (transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            net: `${netValue >= 0 ? '+' : '-'} ${Math.abs(netValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        };

        let x = mg;
        const rowFill = index % 2 === 0 ? [245, 247, 250] as [number, number, number] : [237, 241, 246] as [number, number, number];

        columns.forEach((col, colIndex) => {
            const w = colWidths[colIndex];
            doc.setFillColor(...rowFill);
            doc.setDrawColor(204, 212, 221);
            doc.rect(x, y, w, tableRowH, 'FD');

            if (col.key === 'customer' || col.key === 'payment') {
                const mainText = col.key === 'customer' ? row.customerMain : row.paymentMain;
                const subText = col.key === 'customer' ? row.customerSub : row.paymentSub;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.6);
                doc.setTextColor(31, 41, 55);
                const mainLine = doc.splitTextToSize(mainText, w - 3)[0] || '-';
                doc.text(mainLine, x + 1.4, y + 4.3);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.1);
                doc.setTextColor(100, 116, 139);
                const subLine = doc.splitTextToSize(subText, w - 3)[0] || '-';
                doc.text(subLine, x + 1.4, y + 8.7);
            } else {
                doc.setFont('helvetica', col.key === 'order' ? 'bold' : 'normal');
                doc.setFontSize(8.1);

                let cellValue = '';
                if (col.key === 'order') cellValue = row.order;
                if (col.key === 'date') cellValue = row.date;
                if (col.key === 'flow') cellValue = row.flow;
                if (col.key === 'amount') cellValue = row.amount;
                if (col.key === 'net') cellValue = row.net;

                const singleLine = doc.splitTextToSize(cellValue || '-', w - 3)[0] || '-';

                if (col.key === 'net') {
                    doc.setTextColor(netValue >= 0 ? 5 : 185, netValue >= 0 ? 150 : 28, netValue >= 0 ? 105 : 28);
                } else {
                    doc.setTextColor(31, 41, 55);
                }

                if (col.align === 'right') {
                    doc.text(singleLine, x + w - 1.6, y + 6.4, { align: 'right' });
                } else {
                    doc.text(singleLine, x + 1.4, y + 6.4);
                }
            }

            x += w;
        });

        y += tableRowH;
    });

    if (y + tableRowH > pageH - mg) {
        doc.addPage();
        y = mg;
        drawTransactionsHeader();
    }

    const grandAmount = totalIncoming + totalOutgoing;
    let gx = mg;
    columns.forEach((col, colIndex) => {
        const w = colWidths[colIndex];
        doc.setFillColor(198, 226, 204);
        doc.setDrawColor(173, 210, 184);
        doc.rect(gx, y, w, tableRowH, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8);
        doc.setTextColor(31, 41, 55);

        if (colIndex === 0) {
            doc.text('GRAND TOTALS', gx + 1.6, y + 6.6);
        }
        if (col.key === 'amount') {
            doc.text(grandAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), gx + w - 1.6, y + 6.6, { align: 'right' });
        }
        if (col.key === 'net') {
            doc.setTextColor(netCashFlow >= 0 ? 5 : 185, netCashFlow >= 0 ? 150 : 28, netCashFlow >= 0 ? 105 : 28);
            const netLabel = `${netCashFlow >= 0 ? '+' : '-'} ${Math.abs(netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            doc.text(netLabel, gx + w - 1.6, y + 6.6, { align: 'right' });
        }

        gx += w;
    });

    y += tableRowH;

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(...colors.muted);
        doc.text('Confidential - Deliveryya Financial Report', mg, pageH - mg + 4);
        doc.text(`Page ${p} of ${pages}`, pageW - mg, pageH - mg + 4, { align: 'right' });
    }

    if (shouldDownload) {
        doc.save(`financial-report-${Date.now()}.pdf`);
    }

    return doc;
};

export const printFinancialReport = async (reportData: FinancialReportData): Promise<void> => {
    const doc = await generateFinancialReportPDF(reportData, false);
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
        throw new Error('Unable to open print window. Please allow popups and try again.');
    }
};
