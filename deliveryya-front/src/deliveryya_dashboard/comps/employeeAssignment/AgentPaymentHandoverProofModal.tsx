import { DocumentCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { FormEvent } from 'react';
import Select from 'react-select';
import type { BankDetailOption } from '../../../services/BankDetailService';

interface OnHandPaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrderRows: Array<Record<string, unknown>>;
  selectedUrgentRows: Array<Record<string, unknown>>;
  selectedOrdersTotal: number;
  selectedUrgentJobsTotal: number;
  paymentProofFiles: File[];
  onPaymentProofFilesChange: (files: File[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveSelectedRow: (kind: 'order' | 'urgent', code: string) => void;
  isSubmitting: boolean;
  uploadProgress?: number | null;
  submitError: string | null;
  bankDetails: BankDetailOption[];
  selectedBankDetail: BankDetailOption | null;
  onBankDetailChange: (option: BankDetailOption | null) => void;
  collectivePrices?: number;
  selectedEditedOrdersTotal?: number;
  orderAmountEdits?: Record<string, number>;
  onOrderAmountEdit?: (orderCode: string, amount: number) => void;
  isRecord?: (value: unknown) => value is Record<string, unknown>;
  str?: (...values: unknown[]) => string;
}

const getText = (row: Record<string, unknown>, ...keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = (value as Record<string, unknown>).code;
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '-';
};

function OnHandPaymentProofModal({
  isOpen,
  onClose,
  selectedOrderRows,
  selectedUrgentRows,
  selectedOrdersTotal,
  selectedUrgentJobsTotal,
  paymentProofFiles,
  onPaymentProofFilesChange,
  onSubmit,
  onRemoveSelectedRow,
  isSubmitting,
  uploadProgress,
  submitError,
  bankDetails,
  selectedBankDetail,
  onBankDetailChange,
}: OnHandPaymentProofModalProps) {
  if (!isOpen) return null;

  const rows = [
    ...selectedOrderRows.map((row) => ({
      kind: 'order' as const,
      code: getText(row, 'orderCode', 'code', 'id'),
      amount: Number(row.collectivePrice) || 0,
    })),
    ...selectedUrgentRows.map((row) => ({
      kind: 'urgent' as const,
      code: getText(row, 'jobCode', 'code', 'id'),
      amount: Number(row.cost ?? row.amount ?? row.totalPrice) || 0,
    })),
  ];
  const total = selectedOrdersTotal + selectedUrgentJobsTotal;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPaymentProofFilesChange(Array.from(event.target.files || []));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2"><DocumentCheckIcon className="h-6 w-6" /></div>
            <div>
              <h2 className="text-xl font-black">Agent payment handover</h2>
              <p className="mt-1 text-sm text-white/80">Confirm the handover amount and attach the transfer proof.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-full p-2 hover:bg-white/20 disabled:opacity-50">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 overflow-y-auto p-6">
          {submitError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{submitError}</div>}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">References</p><p className="mt-1 text-2xl font-black text-slate-900">{rows.length}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Orders / jobs</p><p className="mt-1 text-2xl font-black text-slate-900">{selectedOrderRows.length} / {selectedUrgentRows.length}</p></div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs font-bold uppercase text-orange-700">Handover total</p><p className="mt-1 text-2xl font-black text-slate-900">LKR {total.toFixed(2)}</p></div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">Receiving company bank account <span className="text-red-500">*</span></label>
            <Select
              options={bankDetails}
              value={selectedBankDetail}
              onChange={(option) => onBankDetailChange(option)}
              isClearable
              isDisabled={isSubmitting}
              placeholder="Select the company bank account..."
              noOptionsMessage={() => 'No active company bank accounts found.'}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">Selected handover references</div>
            <div className="max-h-56 overflow-y-auto">
              {rows.map((row) => (
                <div key={`${row.kind}-${row.code}`} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-0">
                  <div><span className="font-bold text-slate-900">{row.code}</span><span className="ml-2 text-xs uppercase text-slate-500">{row.kind}</span></div>
                  <div className="flex items-center gap-3"><span className="font-semibold text-slate-700">LKR {row.amount.toFixed(2)}</span><button type="button" onClick={() => onRemoveSelectedRow(row.kind, row.code)} disabled={isSubmitting} className="text-xs font-bold text-red-600 hover:text-red-800">Remove</button></div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">Payment proof <span className="text-red-500">*</span></label>
            <input type="file" accept="image/*,application/pdf" multiple onChange={handleFileChange} disabled={isSubmitting} className="block w-full rounded-xl border border-slate-200 p-3 text-sm" />
            {paymentProofFiles.length > 0 && <p className="mt-2 text-xs text-slate-500">{paymentProofFiles.length} file(s) selected</p>}
          </div>

          {isSubmitting && <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Uploading proof{typeof uploadProgress === 'number' ? ` (${uploadProgress}%)` : '...'}</div>}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
            <button type="submit" disabled={isSubmitting || !selectedBankDetail || rows.length === 0} className="rounded-xl bg-[#F59B0F] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#D17F0A] disabled:cursor-not-allowed disabled:opacity-50">Submit handover</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OnHandPaymentProofModal;
