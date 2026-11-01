import { BoltIcon, CurrencyDollarIcon, ShoppingBagIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { buildPdfFromImages } from '../../../util/PaymentProofUtil';

interface PaymentProofDetailsProps {
  selectedOrderRows: Array<Record<string, unknown>>;
  selectedUrgentRows: Array<Record<string, unknown>>;
  collectivePrices: number;
  selectedOrdersTotal: number;
  selectedEditedOrdersTotal: number;
  orderAmountEdits: Record<string, number>;
  onOrderAmountEdit: (orderCode: string, amount: number) => void;
  onRemoveSelectedRow: (kind: 'order' | 'urgent', code: string) => void;
  selectedUrgentJobsTotal: number;
  paymentProofFiles: File[];
  onPaymentProofFilesChange: (files: File[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  uploadProgress?: number | null;
  submitError: string | null;
  formatCurrency: (value: number) => string;
  isRecord: (value: unknown) => value is Record<string, unknown>;
  str: (...vals: unknown[]) => string;
}

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  accentClassName: string;
  iconClassName: string;
}

const StatCard = ({ icon, title, value, accentClassName, iconClassName }: StatCardProps) => (
  <div className={`rounded-xl border p-4 ${accentClassName}`}>
    <div className="flex items-center gap-4">
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ${iconClassName}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <p className="mt-1 text-3xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const getUrgentPaymentAmount = (job: Record<string, unknown>): number => Number(job.cost ?? job.amount ?? job.totalPrice) || 0;

function PaymentProofDetails({
  selectedOrderRows,
  selectedUrgentRows,
  collectivePrices,
  selectedOrdersTotal,
  selectedEditedOrdersTotal,
  orderAmountEdits,
  onOrderAmountEdit,
  onRemoveSelectedRow,
  selectedUrgentJobsTotal,
  paymentProofFiles,
  onPaymentProofFilesChange,
  onSubmit,
  onCancel,
  isSubmitting,
  uploadProgress,
  submitError,
  formatCurrency,
  isRecord,
  str,
}: PaymentProofDetailsProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewName, setPdfPreviewName] = useState('');
  const grandTotal = selectedEditedOrdersTotal + selectedUrgentJobsTotal;
  const resolvedUploadProgress = typeof uploadProgress === 'number'
    ? Math.min(100, Math.max(0, uploadProgress))
    : null;

  const selectedRows = useMemo(() => {
    const orderRows = selectedOrderRows.map((order, idx) => {
      const orderCode = isRecord(order.orderCode) ? order.orderCode : null;
      const deliveryTo = isRecord(order.deliveryTo) ? order.deliveryTo : null;
      const code = str(orderCode?.code, order.orderCode, order.code, order.id, `ORD-${idx + 1}`);
      const normalizedCode = str(orderCode?.code, order.orderCode, order.code).toUpperCase();
      const collectivePrice = Number(order.collectivePrice) || 0;
      const deliveryFee = Number(order.deliveryFee ?? order.deliveryCharge ?? order.deliveryCharges) || 0;
      const editedAmount = typeof orderAmountEdits[normalizedCode] === 'number'
        ? orderAmountEdits[normalizedCode]
        : collectivePrice;

      return {
        key: `order-${idx}-${code}`,
        kind: 'order' as const,
        code,
        customer: str(deliveryTo?.fullName, 'N/A'),
        collectivePrice,
        deliveryFee,
        amount: editedAmount,
        normalizedCode,
      };
    });

    const urgentRows = selectedUrgentRows.map((job, idx) => {
      const code = str(job.jobCode, job.code, job.id, `UJC-${idx + 1}`);
      const normalizedCode = str(job.jobCode, job.code).toUpperCase();
      const cost = getUrgentPaymentAmount(job);
      const deliveryFee = Number(job.deliveryFee ?? job.deliveryCharge ?? job.deliveryCharges) || 0;

      return {
        key: `urgent-${idx}-${code}`,
        kind: 'urgent' as const,
        code,
        customer: str(job.username, 'N/A'),
        collectivePrice: 0,
        deliveryFee,
        amount: cost,
        normalizedCode,
      };
    });

    return [...orderRows, ...urgentRows];
  }, [selectedOrderRows, selectedUrgentRows, isRecord, orderAmountEdits, str]);

  const totalDeliveryFees = useMemo(
    () => selectedRows.reduce((total, row) => total + (Number(row.deliveryFee) || 0), 0),
    [selectedRows],
  );

  const setPdfPreviewFile = (file: File) => {
    const nextUrl = URL.createObjectURL(file);
    setPdfPreviewUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return nextUrl;
    });
    setPdfPreviewName(file.name);
  };

  const clearPdfPreview = () => {
    setPdfPreviewUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return null;
    });
    setPdfPreviewName('');
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    onPaymentProofFilesChange(files);

    if (files.length === 1 && files[0].type === 'application/pdf') {
      setPdfPreviewFile(files[0]);
      return;
    }

    clearPdfPreview();

    // Show spinner if multiple images are selected
    if (files.length > 1 && files.every((f) => f.type.startsWith('image/'))) {
      setIsGeneratingPdf(true);
      setGenerationProgress(0);
      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setGenerationProgress((prev) => Math.min(prev + 20, 90));
        }, 100);

        // Generate preview PDF from selected images.
        const previewPdf = await buildPdfFromImages(files, 'payment-proof-preview');
        setPdfPreviewFile(previewPdf);

        clearInterval(progressInterval);
        setGenerationProgress(100);

        // Reset after a brief moment
        setTimeout(() => {
          setIsGeneratingPdf(false);
          setGenerationProgress(0);
        }, 500);
      } catch (error) {
        setIsGeneratingPdf(false);
        setGenerationProgress(0);
        clearPdfPreview();
        console.error('PDF generation preview failed:', error);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<ShoppingBagIcon className="h-7 w-7 text-white" />}
          title="On Hand Orders Total (LKR)"
          value={formatCurrency(selectedEditedOrdersTotal)}
          accentClassName="border-gray-200 bg-gray-50"
          iconClassName="bg-linear-to-br from-blue-500 to-blue-600 shadow-blue-500/25"
        />
        <StatCard
          icon={<BoltIcon className="h-7 w-7 text-white" />}
          title="Urgent Jobs Total (LKR)"
          value={formatCurrency(selectedUrgentJobsTotal)}
          accentClassName="border-gray-200 bg-gray-50"
          iconClassName="bg-linear-to-br from-amber-500 to-amber-600 shadow-amber-500/25"
        />
        <StatCard
          icon={<CurrencyDollarIcon className="h-7 w-7 text-white" />}
          title="Grand Total (LKR)"
          value={formatCurrency(grandTotal)}
          accentClassName="border-orange-200 bg-orange-50"
          iconClassName="bg-linear-to-br from-orange-500 to-orange-600 shadow-orange-500/25"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Collective Prices (LKR)</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{formatCurrency(collectivePrices)}</p>
          <p className="mt-2 text-xs text-gray-600">Selected On Hand Collective Prices: {formatCurrency(selectedOrdersTotal)}</p>
          <p className="mt-1 text-xs text-gray-600">Edited On Hand Amount Total: {formatCurrency(selectedEditedOrdersTotal)}</p>
          <p className="mt-1 text-xs font-semibold text-amber-700">Check: Keep edited order amounts aligned with collective prices.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Delivery Fees (LKR)</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{formatCurrency(totalDeliveryFees)}</p>
          <p className="mt-2 text-xs text-gray-600">Includes selected On Hand Orders and Urgent Jobs delivery fees.</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="font-bold text-gray-900">Selected On Hand Orders and Urgent Jobs ({selectedRows.length})</h4>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {selectedRows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">No rows selected.</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase"></th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Customer</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Collective Price <small>(LKR)</small></th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Delivery Fee <small>(LKR)</small></th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Amount <small>(LKR)</small></th>
                  {/* <th className="px-4 py-2 text-center text-xs font-bold text-gray-600 uppercase">Action</th> */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedRows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-4 py-2 text-center text-sm">
                      <button
                        type="button"
                        onClick={() => onRemoveSelectedRow(row.kind, row.normalizedCode)}
                        disabled={isSubmitting || !row.normalizedCode}
                        title={`Remove ${row.code}`}
                        aria-label={`Remove ${row.code}`}
                        className="rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">{row.code}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.customer}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">
                      {row.kind === 'order' ? formatCurrency(row.collectivePrice) : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">{formatCurrency(row.deliveryFee)}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      {row.kind === 'order' ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={Number.isFinite(row.amount) ? row.amount : 0}
                          title={`Editable amount for ${row.code}`}
                          aria-label={`Editable amount for ${row.code}`}
                          onChange={(event) => {
                            const nextAmount = Number(event.target.value);
                            onOrderAmountEdit(row.normalizedCode, Number.isFinite(nextAmount) ? nextAmount : 0);
                          }}
                          disabled={isSubmitting || !row.normalizedCode}
                          className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">{formatCurrency(row.amount)}</span>
                      )}
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <label htmlFor="payment-proof" className="block text-sm font-bold text-gray-800 mb-2">
          Payment Proof (Image or PDF). If multiple images are selected, they will be converted into one PDF.
        </label>
        <input
          id="payment-proof"
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileChange}
          disabled={isGeneratingPdf || isSubmitting}
          className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-800 hover:file:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {isSubmitting && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            <div className="flex items-center justify-between gap-3">
              <span>{resolvedUploadProgress === null ? 'Preparing payment proof...' : 'Uploading payment proof...'}</span>
              {resolvedUploadProgress !== null && <span>{resolvedUploadProgress}%</span>}
            </div>
            {resolvedUploadProgress !== null && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200">
                <div
                  className="h-full rounded-full bg-[#F59B0F] transition-all duration-300 ease-out"
                  style={{ width: `${resolvedUploadProgress}%` }}
                />
              </div>
            )}
            <p className="mt-2 text-xs font-semibold text-amber-700">
              Do not refresh the page or close the modal until it is uploaded properly.
            </p>
          </div>
        )}
        {isGeneratingPdf && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">Generating PDF from images...</p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-blue-200">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {paymentProofFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-600">Selected files: <span className="font-semibold text-gray-900">{paymentProofFiles.length}</span></p>
            {paymentProofFiles.map((file, idx) => (
              <p key={`${file.name}-${idx}`} className="text-xs text-gray-500">• {file.name}</p>
            ))}
          </div>
        )}
        {pdfPreviewUrl && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-900">PDF preview is ready{pdfPreviewName ? `: ${pdfPreviewName}` : ''}</p>
            <a
              href={pdfPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              Preview Generated PDF
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || paymentProofFiles.length === 0 || selectedOrderRows.length + selectedUrgentRows.length === 0}
          className="rounded-lg bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2 text-sm font-semibold text-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Uploading Proof...' : 'Submit Payment Proof'}
        </button>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-[#F59B0F] rounded-full animate-spin" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Processing Payment Proof</p>
            <p className="text-sm text-gray-600 mt-2">
              {resolvedUploadProgress === null ? 'Preparing your proof file...' : `Uploading proof ${resolvedUploadProgress}%`}
            </p>
            {resolvedUploadProgress !== null && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#F59B0F] transition-all duration-300 ease-out"
                  style={{ width: `${resolvedUploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

export default PaymentProofDetails;
