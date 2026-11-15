// pdfGenaretor/ReportHeaderTemplate.ts

export interface ReportHeaderData {
    title: string;
    reportType: 'Sales Report' | 'Order Report' | 'Delivery Report';
    generatedDate: string;
    dateRange: string;
    totalOrders: number;
    totalRevenue: string;
    summaryMetrics: Array<{
        label: string;
        value: string;
        color?: string;
    }>;
    appliedFilters: Array<{
        label: string;
    }>;
    scopeLabel: string;
}

export const generateReportHeaderHtml = (
    data: ReportHeaderData,
    logoBase64: string
): string => {
    const {
        title,
        reportType,
        generatedDate,
        dateRange,
        totalOrders,
        totalRevenue,
        summaryMetrics,
        appliedFilters,
        scopeLabel,
    } = data;

    // Generate filter chips HTML
    const filterChipsHtml = appliedFilters.length > 0
        ? appliedFilters.map(filter => 
            `<span style="display:inline-block;padding:4px 12px;background:#fef3c7;color:#92400e;border-radius:16px;font-size:11px;font-weight:500;margin-right:6px;margin-bottom:4px;border:1px solid #fde68a;">${filter.label}</span>`
        ).join('')
        : '<span style="color:#6b7280;font-size:11px;font-style:italic;">No filters applied</span>';

    // Generate metrics cards HTML - ensure proper grid layout
    const metricsHtml = summaryMetrics.map(metric => `
        <div style="background:${metric.color || '#f9fafb'};border-radius:12px;padding:12px 16px;border:1px solid #e5e7eb;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <div style="font-size:11px;color:#4b5563;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.3px;">${metric.label}</div>
            <div style="font-size:20px;font-weight:700;color:#111827;">${metric.value}</div>
        </div>
    `).join('');

    return `
        <div style="font-family:Arial, Helvetica, sans-serif;color:#111827;width:100%;max-width:790px;margin:0 auto;box-sizing:border-box;">
            <!-- Header with Logo and Title -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #f3f4f6;">
                <div style="display:flex;align-items:center;gap:15px;">
                    <img src="${logoBase64}" alt="Deliveryya" style="width:50px;height:50px;object-fit:contain;border-radius:8px;" />
                    <div>
                        <div style="font-size:26px;font-weight:800;color:#f59b0f;letter-spacing:-0.5px;line-height:1.2;">DELIVERYYA</div>
                        <div style="font-size:14px;color:#4b5563;margin-top:2px;">${reportType}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Generated</div>
                    <div style="font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;">${generatedDate}</div>
                    <div style="font-size:11px;color:#f59b0f;margin-top:6px;font-weight:500;background:#fff7ed;padding:2px 10px;border-radius:20px;display:inline-block;">${scopeLabel}</div>
                </div>
            </div>

            <!-- Report Title and Date Range -->
            <div style="margin-bottom:24px;">
                <h1 style="font-size:24px;font-weight:700;margin:0 0 10px 0;color:#111827;">${title}</h1>
                <div style="display:flex;align-items:center;gap:12px;color:#4b5563;font-size:12px;flex-wrap:wrap;">
                    <span style="display:flex;align-items:center;gap:4px;"><span style="font-size:14px;">📅</span> ${dateRange}</span>
                    <span style="width:4px;height:4px;background:#d1d5db;border-radius:50%;display:inline-block;"></span>
                    <span style="display:flex;align-items:center;gap:4px;"><span style="font-size:14px;">📦</span> ${totalOrders.toLocaleString()} Orders</span>
                    <span style="width:4px;height:4px;background:#d1d5db;border-radius:50%;display:inline-block;"></span>
                    <span style="display:flex;align-items:center;gap:4px;"><span style="font-size:14px;">💰</span> ${totalRevenue}</span>
                </div>
            </div>

            <!-- Summary Metrics Grid - Fixed grid layout -->
            <div style="display:grid;grid-template-columns:repeat(${Math.min(4, summaryMetrics.length)}, 1fr);gap:12px;margin-bottom:24px;">
                ${metricsHtml}
            </div>

            <!-- Applied Filters Section -->
            <div style="background:#f9fafb;border-radius:12px;padding:14px 16px;margin-bottom:24px;border:1px solid #e5e7eb;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                    <span style="font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">🔍 Applied Filters</span>
                    <span style="background:#e5e7eb;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:600;color:#4b5563;">${appliedFilters.length}</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${filterChipsHtml}
                </div>
            </div>

            <!-- Section Title -->
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 12px 0;border-bottom:2px solid #e5e7eb;margin-bottom:16px;">
                <span style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.3px;">📋 ORDER DETAILS</span>
                <span style="font-size:10px;color:#6b7280;background:#f3f4f6;padding:2px 10px;border-radius:20px;">All values in Rs.</span>
            </div>
        </div>
    `;
};