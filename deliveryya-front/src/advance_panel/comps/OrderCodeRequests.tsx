import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentCheckIcon, EllipsisVerticalIcon, EyeIcon, PlusIcon, PrinterIcon, QrCodeIcon, TrashIcon, XMarkIcon, } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import Select from 'react-select';
import Swal from 'sweetalert2';
import axiosInstance from '../../util/AxiosUtil';
import { swalAlert, swalConfirm, swalErrorModal } from '../../util/SwalUtil';

type RequestedOrderCode = {
  code: string;
  isUsed: boolean;
};

type OrderCodeRequestRow = {
  id: number;
  clientName: string;
  requestedOrderCodes: RequestedOrderCode[];
  qty: number;
  userId: number | null;
  printedBarcodesNeeded: boolean;
  requestedAt: string;
  isPrinted: boolean;
};

type OrderCodeRequestApiResponse = {
  object?: unknown;
  exData?: unknown;
  message?: string;
  desc?: string;
};

type OrderCodesApiResponse = {
  object?: unknown;
  exData?: unknown;
  message?: string;
  desc?: string;
};

type SetOrderCodeRequestPayload = {
  qty: number;
  orderCodeRequestId: number;
  printedBarcodesNeeded: boolean;
};

type GenerateRequestCodesPayload = {
  qty: number;
  orderCodeRequestId: number;
  userId: number;
  printedBarcodesNeeded: boolean;
};

type PrintPageSize = 'a4' | 'a5' | 'letter' | 'legal' | 'custom';

type PdfPageFormat = 'a4' | 'a5' | 'letter' | 'legal' | [number, number];

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

const customSelectFieldStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '2.5rem',
    borderWidth: '1px',
    borderColor: state.isFocused ? '#F59B0F' : '#D1D5DB',
    borderRadius: '0.5rem',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
    '&:hover': {
      borderColor: '#FCD34D',
    },
    transition: 'all 0.2s',
    backgroundColor: 'white',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#6B7280',
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.5rem',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'used') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'unused' || normalized === 'not_used') {
      return false;
    }
  }
  return fallback;
};

const extractItemsAndTotal = (raw: unknown): { items: unknown[]; totalCount: number } => {
  const root = asRecord(raw);
  if (!root) {
    return { items: [], totalCount: 0 };
  }

  const object = root.object ?? root.exData ?? root;

  if (Array.isArray(object)) {
    return { items: object, totalCount: object.length };
  }

  const objectRecord = asRecord(object);
  if (!objectRecord) {
    return { items: [], totalCount: 0 };
  }

  const items = asArray(objectRecord.items ?? objectRecord.requests ?? objectRecord.content);
  const totalCount = asNumber(
    objectRecord.totalCount ?? objectRecord.totalElements ?? objectRecord.total,
    items.length,
  );

  return { items, totalCount };
};

const mapRequestedOrderCode = (raw: unknown): RequestedOrderCode | null => {
  if (typeof raw === 'string' || typeof raw === 'number') {
    return {
      code: String(raw),
      isUsed: false,
    };
  }

  const record = asRecord(raw);
  if (!record) return null;

  const code = asString(record.code ?? record.orderCode ?? record.barcode ?? record.value, '').trim();
  if (!code) return null;

  return {
    code,
    isUsed: asBoolean(record.isUsed ?? record.used ?? record.isActive ?? record.status, false),
  };
};

const normalizeOrderCode = (value: string): string => value.trim().toLowerCase();

const extractAvailableOrderCodeSet = (raw: unknown): Set<string> => {
  const { items } = extractItemsAndTotal(raw);

  return new Set(
    items
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return normalizeOrderCode(String(item));
        }

        const record = asRecord(item);
        if (!record) return '';

        const code = asString(record.code ?? record.orderCode ?? record.barcode ?? record.value, '').trim();
        return code ? normalizeOrderCode(code) : '';
      })
      .filter((value) => Boolean(value)),
  );
};

const getClientName = (row: Record<string, unknown>): string => {
  const directName = asString(row.clientName ?? row.customerName ?? row.userName ?? row.name, '').trim();
  if (directName) return directName;

  const user = asRecord(row.user ?? row.client ?? row.customer ?? row.users);
  if (!user) return '-';

  const fullName = `${asString(user.firstName, '').trim()} ${asString(user.lastName, '').trim()}`.trim();
  if (fullName) return fullName;

  const fallback = asString(user.name, '').trim();
  return fallback || '-';
};

const mapOrderCodeRequest = (raw: unknown): OrderCodeRequestRow | null => {
  const record = asRecord(raw);
  if (!record) return null;

  const id = asNumber(record.id ?? record.requestId ?? record.orderCodeRequestId);
  if (!id) return null;

  const codeArray = asArray(
    record.requestedOrderCodes ??
    record.orderCodes ??
    record.ordercodes ??
    record.requestedCodes ??
    record.barcodes ??
    record.printedBarcodes,
  );

  return {
    id,
    clientName: getClientName(record),
    requestedOrderCodes: codeArray
      .map(mapRequestedOrderCode)
      .filter((item): item is RequestedOrderCode => item !== null),
    qty: asNumber(record.qty ?? record.requestedQty ?? record.count ?? codeArray.length, codeArray.length),
    userId: asNumber(record.userId ?? asRecord(record.user)?.id ?? asRecord(record.users)?.id, 0) || null,
    printedBarcodesNeeded: asBoolean(
      record.printedBarcodesNeeded ?? record.needPrintedBarcodes ?? record.printedNeeded,
      true,
    ),
    requestedAt: asString(record.requestedAt ?? record.createdAt ?? record.time ?? record.created_date, ''),
    isPrinted: asBoolean(record.isPrinted ?? record.printed ?? record.isDone, false),
  };
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const generateBarcodeImage = async (value: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, {
        format: 'CODE128',
        width: 2,
        height: 64,
        displayValue: false,
        margin: 0,
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      reject(error);
    }
  });
};

const resolvePdfPageFormat = (
  printPageSize: PrintPageSize,
  customPageWidthMm: string,
  customPageHeightMm: string,
): PdfPageFormat => {
  if (printPageSize !== 'custom') {
    return printPageSize;
  }

  const width = Number(customPageWidthMm);
  const height = Number(customPageHeightMm);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return 'a4';
  }

  // Keep custom sizes within a practical print range.
  const clampedWidth = Math.min(420, Math.max(80, width));
  const clampedHeight = Math.min(594, Math.max(80, height));
  return [clampedWidth, clampedHeight];
};

const generateOrderCodesPdf = async (
  codes: string[],
  pageFormat: PdfPageFormat,
  columnsArg = 3,
): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: pageFormat });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 6;
  const columns = Math.max(1, Math.floor(Number(columnsArg) || 1));
  const columnGap = 1.5;
  const rowGap = 1.5;
  const cardWidth = (pageWidth - margin * 2 - columnGap * (columns - 1)) / columns;
  const cardHeight = 32;
  const usableHeight = pageHeight - margin * 2;
  const rowsPerPage = Math.max(1, Math.floor((usableHeight + rowGap) / (cardHeight + rowGap)));
  const itemsPerPage = rowsPerPage * columns;

  for (let i = 0; i < codes.length; i += 1) {
    const code = codes[i];
    const indexInPage = i % itemsPerPage;

    if (i > 0 && indexInPage === 0) {
      doc.addPage();
    }

    const rowInPage = Math.floor(indexInPage / columns);
    const columnInPage = indexInPage % columns;
    const x = margin + columnInPage * (cardWidth + columnGap);
    const y = margin + rowInPage * (cardHeight + rowGap);

    const barcodeImage = await generateBarcodeImage(code);

    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    // Dashed border acts as a paper cut guide around each barcode label.
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(x - 0.8, y - 0.8, cardWidth + 1.6, cardHeight + 1.6);
    doc.setLineDashPattern([], 0);

    // If there's only one barcode per row, make it span the full card width.
    doc.addImage(barcodeImage, 'PNG', x + 2, y + 6, cardWidth - 4, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text(code, x + cardWidth / 2, y + 27, { align: 'center' });
  }

  return doc;
};

const openPrintDialogForPdf = (doc: jsPDF): void => {
  doc.autoPrint();

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.src = blobUrl;

  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  iframe.onload = () => {
    const printTarget = iframe.contentWindow;
    if (!printTarget) {
      cleanup();
      throw new Error('Unable to open print dialog. Please try again.');
    }

    printTarget.onafterprint = cleanup;
    printTarget.focus();
    printTarget.print();

    // Fallback cleanup for browsers that do not fire onafterprint reliably for PDF iframes.
    window.setTimeout(cleanup, 60_000);
  };

  document.body.appendChild(iframe);
};

function OrderCodeRequests() {
  const [rows, setRows] = useState<OrderCodeRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pageNumber, setPageNumber] = useState(0);
  const [countPerPage, setCountPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [selectedCodesByRequest, setSelectedCodesByRequest] = useState<Record<number, string[]>>({});
  const [isPrintingSelected, setIsPrintingSelected] = useState(false);
  const [printingRequestId, setPrintingRequestId] = useState<number | null>(null);
  const [printPageSize, setPrintPageSize] = useState<PrintPageSize>('a4');
  const [customPageWidthMm, setCustomPageWidthMm] = useState('210');
  const [customPageHeightMm, setCustomPageHeightMm] = useState('297');
  const [printMode, setPrintMode] = useState<'card' | 'raw'>('raw');
  const [rawBarcodesPerRow, setRawBarcodesPerRow] = useState('3');
  const [autoAdjustHeight, setAutoAdjustHeight] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createQty, setCreateQty] = useState('10');
  const [createOrderCodeRequestId, setCreateOrderCodeRequestId] = useState('1');
  const [createPrintedBarcodesNeeded, setCreatePrintedBarcodesNeeded] = useState(true);
  const [createError, setCreateError] = useState('');
  const [isSubmittingCreateRequest, setIsSubmittingCreateRequest] = useState(false);
  const [openMoreRequestId, setOpenMoreRequestId] = useState<number | null>(null);
  const [generatingRequestId, setGeneratingRequestId] = useState<number | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / countPerPage)),
    [totalCount, countPerPage],
  );

  const printedCount = useMemo(
    () => rows.filter((row) => row.isPrinted).length,
    [rows],
  );

  const activeRequest = useMemo(
    () => rows.find((row) => row.id === activeRequestId) ?? null,
    [rows, activeRequestId],
  );

  const pagePresetOptions: SelectOption<PrintPageSize>[] = useMemo(
    () => [
      { value: 'a4', label: 'A4 (210 x 297 mm)' },
      { value: 'a5', label: 'A5 (148 x 210 mm)' },
      { value: 'letter', label: 'Letter (216 x 279 mm)' },
      { value: 'legal', label: 'Legal (216 x 356 mm)' },
      { value: 'custom', label: 'Custom' },
    ],
    [],
  );

  const printedBarcodeNeededOptions: SelectOption<string>[] = useMemo(
    () => [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
    [],
  );

  const pageSizeOptions: SelectOption<number>[] = useMemo(
    () => [
      { value: 5, label: '5' },
      { value: 10, label: '10' },
      { value: 20, label: '20' },
      { value: 50, label: '50' },
    ],
    [],
  );

  const loadOrderCodeRequests = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const [requestsResponse, orderCodesResponse] = await Promise.all([
        axiosInstance.post<OrderCodeRequestApiResponse>('/orders/get-order-code-requests', {
          pageNumber,
          countPerPage,
        }),
        axiosInstance.get<OrderCodesApiResponse>('/orders/get-order-codes', {
          params: {
            isFilled: false,
          },
        }),
      ]);

      const { items, totalCount: backendTotalCount } = extractItemsAndTotal(requestsResponse.data);
      const availableOrderCodes = extractAvailableOrderCodeSet(orderCodesResponse.data);

      const mappedRows = items
        .map(mapOrderCodeRequest)
        .filter((item): item is OrderCodeRequestRow => item !== null)
        .map((row) => ({
          ...row,
          requestedOrderCodes: row.requestedOrderCodes.map((orderCode) => ({
            ...orderCode,
            isUsed: !availableOrderCodes.has(normalizeOrderCode(orderCode.code)),
          })),
        }));

      setRows(mappedRows);
      setTotalCount(backendTotalCount || mappedRows.length);
      setActiveRequestId(null);
      setSelectedCodesByRequest({});
    } catch (error: any) {
      setRows([]);
      setTotalCount(0);
      setLoadError(error?.response?.data?.desc || error?.message || 'Failed to load ordercode requests.');
    } finally {
      setIsLoading(false);
    }
  }, [pageNumber, countPerPage]);

  useEffect(() => {
    void loadOrderCodeRequests();
  }, [loadOrderCodeRequests]);

  const handleDelete = async (id: number) => {
    const confirmed = await swalConfirm(`Delete ordercode request #${id}?`, 'This action cannot be undone.', 'Delete', 'Cancel');
    if (!confirmed) return;

    setRows((prev) => prev.filter((row) => row.id !== id));
    if (activeRequestId === id) {
      setActiveRequestId(null);
    }
    setSelectedCodesByRequest((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handlePrint = async (id: number) => {
    const requestRow = rows.find((row) => row.id === id);
    if (!requestRow) {
      await swalAlert('Not found', 'Ordercode request not found. Please refresh and try again.', 'warning');
      return;
    }

    const allCodes = requestRow.requestedOrderCodes
      .map((orderCode) => orderCode.code.trim())
      .filter((code) => code.length > 0);

    if (allCodes.length === 0) {
      await swalAlert('No codes', 'No order codes available to print for this request.', 'warning');
      return;
    }

    try {
      setPrintingRequestId(id);
      const pageFormat = resolvePdfPageFormat(printPageSize, customPageWidthMm, customPageHeightMm);
      const columns = Math.max(1, Number(rawBarcodesPerRow) || 1);
      const pdf = await generateOrderCodesPdf(allCodes, pageFormat, columns);
      openPrintDialogForPdf(pdf);

      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isPrinted: true } : row)));
      await swalAlert('Print', `Print dialog opened for ${allCodes.length} order code(s).`, 'success');
    } catch (error) {
      console.error('Failed to print ordercode request:', error);
      await swalErrorModal('Failed', 'Failed to generate barcode PDF. Please try again.');
    } finally {
      setPrintingRequestId(null);
    }
  };

  const handleToggleOrderCode = (requestId: number, code: string) => {
    setSelectedCodesByRequest((prev) => {
      const current = prev[requestId] ?? [];
      const isSelected = current.includes(code);
      const nextCodes = isSelected
        ? current.filter((value) => value !== code)
        : [...current, code];

      return {
        ...prev,
        [requestId]: nextCodes,
      };
    });
  };

  const handlePrintCustom = async (requestId: number) => {
    const selectedCodes = selectedCodesByRequest[requestId] ?? [];
    if (selectedCodes.length === 0) {
      await swalAlert('No selection', 'Please select at least one order code to print.', 'warning');
      return;
    }

    try {
      setIsPrintingSelected(true);
      const pageFormat = resolvePdfPageFormat(printPageSize, customPageWidthMm, customPageHeightMm);
      const columns = Math.max(1, Number(rawBarcodesPerRow) || 1);
      const pdf = await generateOrderCodesPdf(selectedCodes, pageFormat, columns);

      openPrintDialogForPdf(pdf);

      setRows((prev) => prev.map((row) => (row.id === requestId ? { ...row, isPrinted: true } : row)));
      setSelectedCodesByRequest((prev) => ({
        ...prev,
        [requestId]: [],
      }));

      if (selectedCodes.length === 1) {
        await swalAlert('Print', `Print dialog opened for order code ${selectedCodes[0]}.`, 'success');
      } else {
        await swalAlert('Print', `Print dialog opened for ${selectedCodes.length} order codes.`, 'success');
      }
    } catch (error) {
      console.error('Failed to print selected order codes:', error);
      await swalErrorModal('Failed', 'Failed to generate barcode PDF. Please try again.');
    } finally {
      setIsPrintingSelected(false);
    }
  };

  const handleGenerateOrderCodes = async (row: OrderCodeRequestRow) => {
    if (!Number.isFinite(row.qty) || row.qty <= 0) {
      await swalAlert('Invalid qty', 'Invalid request qty. Please refresh and try again.', 'warning');
      return;
    }

    if (!row.userId || row.userId <= 0) {
      await swalAlert('Missing user', 'Missing user id for this request. Please refresh and try again.', 'warning');
      return;
    }

    const payload: GenerateRequestCodesPayload = {
      qty: row.qty,
      orderCodeRequestId: row.id,
      userId: row.userId,
      printedBarcodesNeeded: row.printedBarcodesNeeded,
    };

    try {
      setGeneratingRequestId(row.id);
      const response = await axiosInstance.post('/orders/request-codes', payload);
      const status = Number(response?.data?.status ?? response?.status ?? 0);

      if (status >= 200 && status < 300) {
        await swalAlert('Success', `Ordercodes generated for request #${row.id}.`, 'success');
        setOpenMoreRequestId(null);
        await loadOrderCodeRequests();
        return;
      }

      throw new Error(response?.data?.desc || 'Failed to generate ordercodes.');
    } catch (error: any) {
      await swalErrorModal('Failed', error?.response?.data?.desc || error?.message || 'Failed to generate ordercodes.');
    } finally {
      setGeneratingRequestId(null);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
    setCreateError('');
  };

  useEffect(() => {
    if (autoAdjustHeight) {
      setCustomPageHeightMm(customPageWidthMm);
    }
  }, [customPageWidthMm, autoAdjustHeight]);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateError('');
    setCreateQty('10');
    setCreateOrderCodeRequestId('');
    setCreatePrintedBarcodesNeeded(true);
    setIsSubmittingCreateRequest(false);
  };

  const handleSubmitCreateRequest = async () => {
    const qty = Number(createQty);
    const orderCodeRequestId = Number(createOrderCodeRequestId);

    if (!Number.isFinite(qty) || qty <= 0) {
      setCreateError('Qty must be a valid number greater than 0.');
      return;
    }

    if (!Number.isFinite(orderCodeRequestId) || orderCodeRequestId <= 0) {
      setCreateError('Order Code Request ID must be a valid number greater than 0.');
      return;
    }

    const payload: SetOrderCodeRequestPayload = {
      qty,
      orderCodeRequestId,
      printedBarcodesNeeded: createPrintedBarcodesNeeded,
    };

    try {
      setIsSubmittingCreateRequest(true);
      setCreateError('');

      const response = await axiosInstance.post('/orders/set-order-code-request', payload);
      const status = Number(response?.data?.status ?? response?.status ?? 0);

      if (status >= 200 && status < 300) {
        await swalAlert('Success', 'Order code request created successfully.', 'success');
        handleCloseCreateModal();
        await loadOrderCodeRequests();
        return;
      }

      throw new Error(response?.data?.desc || 'Failed to create order code request.');
    } catch (error: any) {
      setCreateError(error?.response?.data?.desc || error?.message || 'Failed to create order code request.');
    } finally {
      setIsSubmittingCreateRequest(false);
    }
  };

  const pendingPrintCount = Math.max(0, rows.length - printedCount);
  const generatedCount = rows.filter((row) => row.requestedOrderCodes.length > 0).length;
  const totalCodesLoaded = rows.reduce((total, row) => total + row.requestedOrderCodes.length, 0);
  const startItem = totalCount === 0 ? 0 : pageNumber * countPerPage + 1;
  const endItem = Math.min(pageNumber * countPerPage + rows.length, totalCount);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mb-6">
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-3xl font-black text-transparent md:text-4xl">
            Ordercode Requests
          </h1>
          <p className="text-sm text-gray-600 md:text-base">Track all ordercode requests and print status.</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="mt-1 text-3xl font-black text-gray-900">{totalCount}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                <ClipboardDocumentCheckIcon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Printed Loaded</p>
                <p className="mt-1 text-3xl font-black text-green-700">{printedCount}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <PrinterIcon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Print</p>
                <p className="mt-1 text-3xl font-black text-gray-900">{pendingPrintCount}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                <QrCodeIcon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Codes Loaded</p>
                <p className="mt-1 text-3xl font-black text-purple-700">{totalCodesLoaded}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
                <QrCodeIcon className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Request Controls</p>
              <p className="text-xs text-gray-500">{generatedCount} loaded request{generatedCount === 1 ? '' : 's'} already have generated ordercodes.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadOrderCodeRequests()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-bold">Error loading ordercode requests</p>
          <p className="text-sm">{loadError}</p>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-700">
            {isLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : (
              <>
                Showing <span className="font-bold text-gray-900">{startItem}-{endItem}</span> of{' '}
                <span className="font-bold text-gray-900">{totalCount}</span> requests
              </>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <span className="text-sm font-medium text-gray-600">Per page:</span>
              <div className="w-28">
                <Select<SelectOption<number>, false>
                  value={pageSizeOptions.find((option) => option.value === countPerPage) ?? pageSizeOptions[1]}
                  onChange={(option) => {
                    setCountPerPage(option?.value ?? 10);
                    setPageNumber(0);
                  }}
                  options={pageSizeOptions}
                  styles={customSelectFieldStyles}
                  isSearchable={false}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  aria-label="Rows per page"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPageNumber((prev) => Math.max(0, prev - 1))}
                  disabled={pageNumber <= 0 || isLoading}
                  className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white"
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
                </button>
                <div className="rounded-lg border-2 border-gray-200 bg-white px-4 py-1.5 text-sm font-bold text-gray-900">
                  {pageNumber + 1} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPageNumber((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
                  disabled={pageNumber + 1 >= totalPages || isLoading}
                  className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white"
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => void loadOrderCodeRequests()}
                disabled={isLoading}
                className="rounded-lg border-2 border-gray-200 bg-white p-2 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-40"
                title="Refresh requests"
                aria-label="Refresh requests"
              >
                <ArrowPathIcon className={`h-5 w-5 text-gray-700 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-linear-to-r from-gray-50 to-gray-100">
                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Client Name</th>
                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Qty</th>
                <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Time</th>
                <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-700">Status</th>
                <th className="whitespace-nowrap px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-medium text-gray-500">
                    Loading ordercode requests...
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const hasGeneratedOrderCodes = row.requestedOrderCodes.length > 0;

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-orange-50/40">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-bold text-gray-900">{row.clientName}</p>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-bold text-gray-900">{row.qty}</td>

                      <td className="px-4 py-4 text-sm text-gray-700">{formatDateTime(row.requestedAt)}</td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${row.isPrinted
                            ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                            }`}
                        >
                          {row.isPrinted ? 'Printed' : 'Pending'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="relative flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveRequestId(row.id)}
                            title="View order codes"
                            aria-label="View order codes"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 bg-white text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            title="Delete request"
                            aria-label="Delete request"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-red-100 bg-white text-red-600 transition-all hover:border-red-200 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => void handlePrint(row.id)}
                            disabled={printingRequestId === row.id}
                            title={printingRequestId === row.id ? 'Preparing print...' : row.isPrinted ? 'Print again (already printed)' : 'Print request'}
                            aria-label={printingRequestId === row.id ? 'Preparing print' : row.isPrinted ? 'Print again, already printed' : 'Print request'}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 bg-white text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMoreRequestId((prev) => (prev === row.id ? null : row.id))}
                              title="More actions"
                              aria-label="More actions"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 bg-white text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50"
                            >
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </button>

                            {openMoreRequestId === row.id && (
                              <div className="absolute right-full top-1/2 z-30 mr-2 min-w-40 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
                                <button
                                  type="button"
                                  onClick={() => void handleGenerateOrderCodes(row)}
                                  disabled={generatingRequestId === row.id || hasGeneratedOrderCodes}
                                  title={
                                    hasGeneratedOrderCodes
                                      ? 'Ordercodes already generated'
                                      : generatingRequestId === row.id
                                        ? 'Generating ordercodes...'
                                        : 'Generate ordercodes'
                                  }
                                  aria-label={
                                    hasGeneratedOrderCodes
                                      ? 'Ordercodes already generated'
                                      : generatingRequestId === row.id
                                        ? 'Generating ordercodes'
                                        : 'Generate ordercodes'
                                  }
                                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <QrCodeIcon className="h-4 w-4" />
                                  <span>
                                    {generatingRequestId === row.id ? 'Generating...' : hasGeneratedOrderCodes ? 'Generated' : 'Generate'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {!isLoading && rows.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-orange-100 to-orange-200">
                  <ClipboardDocumentCheckIcon className="h-10 w-10 text-[#F59B0F]" />
                </div>
                <p className="mb-2 text-xl font-black text-gray-900">No ordercode requests found</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Requested order codes">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-orange-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-orange-100 px-4 py-3 sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Requested Order Codes</h2>
                  <span
                    className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold ${activeRequest.isPrinted
                      ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      }`}
                  >
                    {activeRequest.isPrinted ? 'Already Printed' : 'Not Printed Yet'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{activeRequest.clientName}</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveRequestId(null)}
                className="h-9 w-9 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center"
                aria-label="Close requested order codes"
                title="Close"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-800">
                    Requested Order Codes ({activeRequest.requestedOrderCodes.length})
                  </p>
                  <div className="text-xs text-gray-600 font-medium">
                    Pending: <span className="text-amber-700">{activeRequest.requestedOrderCodes.filter((orderCode) => !orderCode.isUsed).length}</span>
                    {' | '}
                    Selected: <span className="text-gray-900">{(selectedCodesByRequest[activeRequest.id] ?? []).length}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allCodes = activeRequest.requestedOrderCodes.map((c) => c.code);
                      setSelectedCodesByRequest((prev) => ({
                        ...prev,
                        [activeRequest.id]: allCodes,
                      }));
                    }}
                    className="text-xs font-medium text-[#F59B0F] hover:text-[#D17F0A] transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCodesByRequest((prev) => ({
                        ...prev,
                        [activeRequest.id]: [],
                      }));
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {activeRequest.requestedOrderCodes.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  No requested order codes in this request.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {activeRequest.requestedOrderCodes.map((orderCode) => {
                    const isSelected = (selectedCodesByRequest[activeRequest.id] ?? []).includes(orderCode.code);

                    return (
                      <label
                        key={orderCode.code}
                        className={`rounded-lg border p-2.5 flex items-center justify-between gap-2 ${orderCode.isUsed
                          ? 'bg-gray-50 border-gray-200 text-gray-500'
                          : 'bg-white border-gray-200 text-gray-800'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleOrderCode(activeRequest.id, orderCode.code)}
                            className="h-4 w-4 accent-[#F59B0F]"
                          />
                          <span className="text-sm font-medium">{orderCode.code}</span>
                        </div>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${orderCode.isUsed
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                            }`}
                        >
                          {orderCode.isUsed ? 'Used' : 'Not Used'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Print Page Size</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-medium">Page Preset</span>
                    <Select<SelectOption<PrintPageSize>, false>
                      value={
                        pagePresetOptions.find((option) => option.value === printPageSize) ?? null
                      }
                      onChange={(selectedOption) => {
                        if (selectedOption) {
                          setPrintPageSize(selectedOption.value);
                        }
                      }}
                      options={pagePresetOptions}
                      styles={customSelectFieldStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      instanceId="ordercode-request-page-preset"
                      aria-label="Select print page preset"
                    />
                  </label>

                  {printPageSize === 'custom' && (
                    <>
                      <label className="flex flex-col gap-1 text-sm text-gray-700">
                        <span className="font-medium">Width (mm)</span>
                        <input
                          type="number"
                          min={80}
                          max={420}
                          step="1"
                          value={customPageWidthMm}
                          onChange={(event) => setCustomPageWidthMm(event.target.value)}
                          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm text-gray-700">
                        <span className="font-medium">Height (mm)</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={80}
                            max={594}
                            step="1"
                            value={customPageHeightMm}
                            onChange={(event) => setCustomPageHeightMm(event.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800"
                          />
                          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={autoAdjustHeight}
                              onChange={(e) => {
                                const next = e.target.checked;
                                setAutoAdjustHeight(next);
                                if (next) setCustomPageHeightMm(customPageWidthMm);
                              }}
                              className="h-4 w-4"
                            />
                            <span>Match width</span>
                          </label>
                        </div>
                      </label>

                      <div className="col-span-full">

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="flex flex-col gap-1 text-sm text-gray-700">
                            <span className="font-medium">Barcodes per Row</span>
                            <input
                              type="number"
                              min={1}
                              step="1"
                              value={rawBarcodesPerRow}
                              onChange={(e) => setRawBarcodesPerRow(e.target.value)}
                              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800"
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handlePrintCustom(activeRequest.id)}
                  disabled={(selectedCodesByRequest[activeRequest.id] ?? []).length === 0 || isPrintingSelected}
                  title="Print selected order codes"
                  aria-label="Print selected order codes"
                  className="h-10 w-10 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                >
                  <PrinterIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default OrderCodeRequests;
