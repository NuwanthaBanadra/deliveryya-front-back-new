import { DocumentCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import PaymentProofDetails from './PaymentProofDetails';

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrderRows: Array<Record<string, unknown>>;
  selectedUrgentRows: Array<Record<string, unknown>>;
  collectivePrices?: number;
  selectedOrdersTotal: number;
  selectedEditedOrdersTotal?: number;
  orderAmountEdits?: Record<string, number>;
  onOrderAmountEdit?: (orderCode: string, amount: number) => void;
  onRemoveSelectedRow?: (kind: 'order' | 'urgent', code: string) => void;
  selectedUrgentJobsTotal: number;
  paymentProofFiles: File[];
  onPaymentProofFilesChange: (files: File[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  uploadProgress?: number | null;
  submitError: string | null;
  formatCurrency: (value: number) => string;
  isRecord: (value: unknown) => value is Record<string, unknown>;
  str: (...vals: unknown[]) => string;
}

function PaymentProofModal({
  isOpen,
  onClose,
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
  isSubmitting,
  uploadProgress,
  submitError,
  formatCurrency,
  isRecord,
  str,
}: PaymentProofModalProps) {
  const resolvedSelectedEditedOrdersTotal =
    typeof selectedEditedOrdersTotal === 'number' ? selectedEditedOrdersTotal : selectedOrdersTotal;
  const resolvedOrderAmountEdits = orderAmountEdits || {};
  const resolvedOnOrderAmountEdit = onOrderAmountEdit || (() => {});
  const resolvedOnRemoveSelectedRow = onRemoveSelectedRow || (() => {});

  useEffect(() => {
    if (!isOpen || !isSubmitting) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, isSubmitting]);

  useEffect(() => {
    if (!isOpen || !isSubmitting) {
      return;
    }

    const handleRefreshShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isRefreshKey = key === 'f5' || ((event.ctrlKey || event.metaKey) && key === 'r');

      if (!isRefreshKey) {
        return;
      }

      event.preventDefault();
      window.alert('Do not refresh the page or close the modal until it is uploaded properly.');
    };

    window.addEventListener('keydown', handleRefreshShortcuts);
    return () => {
      window.removeEventListener('keydown', handleRefreshShortcuts);
    };
  }, [isOpen, isSubmitting]);

  const handleProtectedClose = () => {
    if (isSubmitting) {
      window.alert('Do not refresh the page or close the modal until it is uploaded properly.');
      return;
    }
    onClose();
  };

  const handleProtectedSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isSubmitting) {
      event.preventDefault();
      return;
    }
    onSubmit(event);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#FFA726] px-6 py-4">
          <button
            type="button"
            onClick={handleProtectedClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
            title="Close payment proof modal"
            disabled={isSubmitting}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="rounded-xl bg-white/20 p-2 text-white">
              <DocumentCheckIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Submit Payment Proof</h3>
              <p className="mt-1 text-sm text-white/75">Review selected rows and upload proof image or PDF.</p>
            </div>
          </div>
        </div>

        <PaymentProofDetails
          selectedOrderRows={selectedOrderRows}
          selectedUrgentRows={selectedUrgentRows}
          collectivePrices={collectivePrices ?? 0}
          selectedOrdersTotal={selectedOrdersTotal}
          selectedEditedOrdersTotal={resolvedSelectedEditedOrdersTotal}
          orderAmountEdits={resolvedOrderAmountEdits}
          onOrderAmountEdit={resolvedOnOrderAmountEdit}
          onRemoveSelectedRow={resolvedOnRemoveSelectedRow}
          selectedUrgentJobsTotal={selectedUrgentJobsTotal}
          paymentProofFiles={paymentProofFiles}
          onPaymentProofFilesChange={onPaymentProofFilesChange}
          onSubmit={handleProtectedSubmit}
          onCancel={handleProtectedClose}
          isSubmitting={isSubmitting}
          uploadProgress={uploadProgress}
          submitError={submitError}
          formatCurrency={formatCurrency}
          isRecord={isRecord}
          str={str}
        />
      </div>
    </div>
  );
}

export default PaymentProofModal;
