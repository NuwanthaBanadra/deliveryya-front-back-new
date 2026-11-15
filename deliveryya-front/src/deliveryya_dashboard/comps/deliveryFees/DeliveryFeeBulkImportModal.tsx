import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import {
    ArrowPathIcon,
    ArrowUpTrayIcon,
    CheckCircleIcon,
    DocumentArrowDownIcon,
    TableCellsIcon,
    XCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Fragment, useMemo, useState } from 'react';
import axiosInstance from '../../../util/AxiosUtil';
import type { DeliveryFee } from './DeliveryFees';

type ApiResponse<T> = {
    status?: number;
    message?: string;
    desc?: string;
    object?: T;
};

type BulkRowStatus = 'ready' | 'invalid' | 'saving' | 'success' | 'error';

type BulkDeliveryFeeRow = {
    key: string;
    rowNumber: number;
    id: number;
    cityId: number | null;
    fee: number | null;
    additionalFee: number;
    status: BulkRowStatus;
    message: string;
    backendStatus?: number;
};

type UpsertPayload = {
    id: number;
    cityId: number;
    fee: number;
    additionalFee: number;
};

type DeliveryFeeBulkImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onCompleted: () => void;
};

const SAMPLE_CSV = 'id,cityId,fee,additionalFee\n0,25,1000,0\n0,26,1200,50\n';

const normalizeHeader = (header: string): string =>
    header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const parseCsvLine = (line: string): string[] => {
    const cells: string[] = [];
    let currentCell = '';
    let isQuoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"' && isQuoted && nextChar === '"') {
            currentCell += '"';
            index += 1;
            continue;
        }

        if (char === '"') {
            isQuoted = !isQuoted;
            continue;
        }

        if (char === ',' && !isQuoted) {
            cells.push(currentCell.trim());
            currentCell = '';
            continue;
        }

        currentCell += char;
    }

    cells.push(currentCell.trim());
    return cells;
};

const getColumnIndex = (headers: string[], aliases: string[]): number =>
    headers.findIndex((header) => aliases.includes(header));

const parseRequiredNumber = (value: string | undefined): number | null => {
    if (!value || value.trim() === '') return null;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const parseOptionalNumber = (value: string | undefined, fallback: number): number => {
    if (!value || value.trim() === '') return fallback;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

const parseDeliveryFeeCsv = (csvText: string): BulkDeliveryFeeRow[] => {
    const rows = csvText
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

    if (rows.length < 2) {
        throw new Error('CSV must include a header row and at least one data row.');
    }

    const headers = parseCsvLine(rows[0]).map(normalizeHeader);
    const idIndex = getColumnIndex(headers, ['id', 'deliveryfeeid', 'feeid']);
    const cityIdIndex = getColumnIndex(headers, ['cityid', 'city']);
    const feeIndex = getColumnIndex(headers, ['fee', 'deliveryfee']);
    const additionalFeeIndex = getColumnIndex(headers, ['additionalfee', 'extrafee']);

    if (cityIdIndex === -1 || feeIndex === -1) {
        throw new Error('CSV must include cityId and fee columns.');
    }

    return rows.slice(1).map((line, index) => {
        const cells = parseCsvLine(line);
        const id = idIndex === -1 ? 0 : parseOptionalNumber(cells[idIndex], 0);
        const cityId = parseRequiredNumber(cells[cityIdIndex]);
        const fee = parseRequiredNumber(cells[feeIndex]);
        const additionalFee = additionalFeeIndex === -1 ? 0 : parseOptionalNumber(cells[additionalFeeIndex], 0);
        const validationErrors: string[] = [];

        if (!cityId || cityId < 1) validationErrors.push('City ID is required');
        if (fee === null || fee < 0) validationErrors.push('Delivery fee is invalid');
        if (additionalFee < 0) validationErrors.push('Additional fee is invalid');

        return {
            key: `${Date.now()}-${index}`,
            rowNumber: index + 2,
            id: id > 0 ? id : 0,
            cityId,
            fee,
            additionalFee,
            status: validationErrors.length > 0 ? 'invalid' : 'ready',
            message: validationErrors.length > 0 ? validationErrors.join(', ') : 'Ready to import',
        };
    });
};

const getStatusBadge = (status: BulkRowStatus): string => {
    if (status === 'success') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    if (status === 'error' || status === 'invalid') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    if (status === 'saving') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
};

const getStatusLabel = (status: BulkRowStatus): string => {
    if (status === 'success') return 'Stored';
    if (status === 'error') return 'Failed';
    if (status === 'invalid') return 'Invalid';
    if (status === 'saving') return 'Saving';
    return 'Ready';
};

function DeliveryFeeBulkImportModal({ isOpen, onClose, onCompleted }: DeliveryFeeBulkImportModalProps) {
    const [rows, setRows] = useState<BulkDeliveryFeeRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [parseError, setParseError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const summary = useMemo(() => {
        const success = rows.filter((row) => row.status === 'success').length;
        const failed = rows.filter((row) => row.status === 'error' || row.status === 'invalid').length;
        const ready = rows.filter((row) => row.status === 'ready').length;

        return { success, failed, ready, total: rows.length };
    }, [rows]);

    const rowsToProcess = useMemo(
        () => rows.filter((row) => row.status !== 'invalid' && row.status !== 'success'),
        [rows]
    );

    const updateRow = (key: string, patch: Partial<BulkDeliveryFeeRow>) => {
        setRows((currentRows) =>
            currentRows.map((row) => (row.key === key ? { ...row, ...patch } : row))
        );
    };

    const handleCsvFile = async (file: File | null) => {
        if (!file) return;

        try {
            const text = await file.text();
            const parsedRows = parseDeliveryFeeCsv(text);
            setRows(parsedRows);
            setFileName(file.name);
            setParseError(null);
        } catch (error: any) {
            setRows([]);
            setFileName(file.name);
            setParseError(error?.message || 'Unable to read the CSV file.');
        }
    };

    const handleDownloadSample = () => {
        const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.href = url;
        link.download = 'delivery-fees-sample.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const resetImport = () => {
        setRows([]);
        setFileName('');
        setParseError(null);
    };

    const handleImport = async () => {
        if (rowsToProcess.length === 0 || isProcessing) return;

        setIsProcessing(true);

        for (const row of rowsToProcess) {
            if (!row.cityId || row.fee === null) {
                updateRow(row.key, {
                    status: 'invalid',
                    message: 'City ID and delivery fee are required',
                });
                continue;
            }

            const payload: UpsertPayload = {
                id: row.id || 0,
                cityId: row.cityId,
                fee: row.fee,
                additionalFee: row.additionalFee,
            };

            updateRow(row.key, {
                status: 'saving',
                message: 'Saving...',
                backendStatus: undefined,
            });

            try {
                const response = await axiosInstance.post<ApiResponse<DeliveryFee>>(
                    '/delivery-fees/upsert-delivery-fee',
                    payload
                );
                const isSuccess =
                    response.data.message?.toLowerCase() === 'success' ||
                    response.data.status === 200;

                updateRow(row.key, {
                    status: isSuccess ? 'success' : 'error',
                    message: response.data.desc || response.data.message || (isSuccess ? 'Stored successfully' : 'Unable to store row'),
                    backendStatus: response.data.status,
                });
            } catch (error: any) {
                updateRow(row.key, {
                    status: 'error',
                    message: error?.response?.data?.desc || error?.response?.data?.message || 'Unable to store row',
                    backendStatus: error?.response?.data?.status || error?.response?.status,
                });
            }
        }

        setIsProcessing(false);
        onCompleted();
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={isProcessing ? () => undefined : onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 translate-y-4 scale-[0.98]"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-4 scale-[0.98]"
                        >
                            <DialogPanel
                                className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl"
                                style={{ background: 'linear-gradient(180deg, #FFF8F2 0%, #FFFFFF 48%, #FFFFFF 100%)' }}
                            >
                                <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4 md:px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg shadow-orange-500/25">
                                            <TableCellsIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-xl font-black text-slate-900">
                                                Bulk Delivery Fee Import
                                            </DialogTitle>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Required columns: id, cityId, fee. Use id 0 for inserts. additionalFee is optional.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={onClose}
                                        disabled={isProcessing}
                                        className="rounded-xl border border-orange-100 bg-white p-2 text-slate-500 transition hover:border-orange-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                        title="Close"
                                        aria-label="Close bulk delivery fee import"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6">
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                                                CSV file
                                            </label>
                                            <input
                                                type="file"
                                                accept=".csv,text/csv"
                                                onChange={(event) => handleCsvFile(event.target.files?.[0] || null)}
                                                disabled={isProcessing}
                                                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all file:mr-4 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-orange-800 hover:file:bg-orange-200 focus:border-[#F59B0F] focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                            {fileName && (
                                                <p className="mt-2 text-xs font-semibold text-gray-500">
                                                    Loaded: {fileName}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={handleDownloadSample}
                                                disabled={isProcessing}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <DocumentArrowDownIcon className="h-4 w-4" />
                                                Sample CSV
                                            </button>
                                            <button
                                                onClick={resetImport}
                                                disabled={isProcessing || rows.length === 0}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>

                                    {parseError && (
                                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                            {parseError}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rows</p>
                                            <p className="mt-1 text-2xl font-black text-gray-900">{summary.total}</p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ready</p>
                                            <p className="mt-1 text-2xl font-black text-gray-900">{summary.ready}</p>
                                        </div>
                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Stored</p>
                                            <p className="mt-1 text-2xl font-black text-emerald-800">{summary.success}</p>
                                        </div>
                                        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Needs Review</p>
                                            <p className="mt-1 text-2xl font-black text-red-800">{summary.failed}</p>
                                        </div>
                                    </div>

                                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                                        <div className="max-h-[42vh] overflow-auto">
                                            <table className="min-w-full">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                                                            CSV Row
                                                        </th>
                                                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700">
                                                            ID
                                                        </th>
                                                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700">
                                                            City ID
                                                        </th>
                                                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700">
                                                            Fee
                                                        </th>
                                                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700">
                                                            Additional
                                                        </th>
                                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                                                            Status
                                                        </th>
                                                        <th className="min-w-[260px] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                                                            Backend Message
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {rows.map((row) => (
                                                        <tr key={row.key} className="transition-colors hover:bg-orange-50/40">
                                                            <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                                                {row.rowNumber}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                                {row.id}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                                {row.cityId ?? '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                                {row.fee ?? '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                                {row.additionalFee}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(row.status)}`}>
                                                                    {row.status === 'saving' && <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />}
                                                                    {row.status === 'success' && <CheckCircleIcon className="h-3.5 w-3.5" />}
                                                                    {(row.status === 'error' || row.status === 'invalid') && <XCircleIcon className="h-3.5 w-3.5" />}
                                                                    {getStatusLabel(row.status)}
                                                                    {row.backendStatus ? ` ${row.backendStatus}` : ''}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                                {row.message}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {rows.length === 0 && (
                                                <div className="py-12 text-center">
                                                    <div className="inline-flex flex-col items-center px-6">
                                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
                                                            <ArrowUpTrayIcon className="h-8 w-8 text-[#F59B0F]" />
                                                        </div>
                                                        <p className="text-lg font-black text-gray-900">No CSV rows loaded</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse gap-3 border-t border-orange-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                                    <p className="text-sm font-semibold text-gray-500">
                                        Import runs one row at a time and keeps backend results in this table.
                                    </p>
                                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                        <button
                                            onClick={onClose}
                                            disabled={isProcessing}
                                            className="rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={handleImport}
                                            disabled={isProcessing || rowsToProcess.length === 0}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#AC6C2A]/25 transition hover:from-[#AC6C2A] hover:to-[#F59B0F] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowUpTrayIcon className="h-4 w-4" />
                                            )}
                                            {isProcessing ? 'Importing' : 'Start Import'}
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export default DeliveryFeeBulkImportModal;
