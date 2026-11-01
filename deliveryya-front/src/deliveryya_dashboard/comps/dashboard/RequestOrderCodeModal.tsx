import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import axiosInstance from '../../../util/AxiosUtil';

type SetOrderCodeRequestPayload = {
  qty: number;
  orderCodeRequestId: number;
  printedBarcodesNeeded: boolean;
};

interface RequestOrderCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function RequestOrderCodeModal({ isOpen, onClose, onSuccess }: RequestOrderCodeModalProps) {
  const [createQty, setCreateQty] = useState('10');
  const [createOrderCodeRequestId, setCreateOrderCodeRequestId] = useState('1');
  const [createPrintedBarcodesNeeded, setCreatePrintedBarcodesNeeded] = useState(true);
  const [createError, setCreateError] = useState('');
  const [isSubmittingCreateRequest, setIsSubmittingCreateRequest] = useState(false);

  const handleCloseModal = () => {
    setCreateError('');
    setCreateQty('10');
    setCreateOrderCodeRequestId('1');
    setCreatePrintedBarcodesNeeded(true);
    setIsSubmittingCreateRequest(false);
    onClose();
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
      orderCodeRequestId:1,
      printedBarcodesNeeded: createPrintedBarcodesNeeded,
    };

    try {
      setIsSubmittingCreateRequest(true);
      setCreateError('');

      const response = await axiosInstance.post('/orders/set-order-code-request', payload);
      const status = Number(response?.data?.status ?? response?.status ?? 0);

      if (status >= 200 && status < 300) {
        window.alert('Order code request created successfully.');
        handleCloseModal();
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      throw new Error(response?.data?.desc || 'Failed to create order code request.');
    } catch (error: any) {
      setCreateError(error?.response?.data?.desc || error?.message || 'Failed to create order code request.');
    } finally {
      setIsSubmittingCreateRequest(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Request order code">
      <div className="absolute inset-0" onClick={handleCloseModal} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Request Order Code</h2>
            <p className="text-sm text-white/90 mt-1">Create a new order code request for your market.</p>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="h-8 w-8 rounded-md border border-white/30 bg-white/10 text-white hover:bg-white/20 inline-flex items-center justify-center shrink-0"
            aria-label="Close request order code modal"
            title="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            <span className="font-medium">Quantity</span>
            <input
              type="number"
              min={1}
              step="1"
              value={createQty}
              onChange={(event) => {
                setCreateQty(event.target.value);
                setCreateError('');
              }}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-orange-200"
              placeholder="Enter number of order codes"
              disabled={isSubmittingCreateRequest}
            />
          </label>

          {/* <label className="flex flex-col gap-1 text-sm text-gray-700">
            <span className="font-medium">Order Code Request ID</span>
            <input
              type="number"
              min={1}
              step="1"
              value={createOrderCodeRequestId}
              onChange={(event) => {
                setCreateOrderCodeRequestId(event.target.value);
                setCreateError('');
              }}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-orange-200"
              placeholder="Enter request ID"
              disabled={isSubmittingCreateRequest}
            />
          </label> */}

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={createPrintedBarcodesNeeded}
              onChange={(event) => {
                setCreatePrintedBarcodesNeeded(event.target.checked);
                setCreateError('');
              }}
              className="h-4 w-4 rounded accent-[#F59B0F]"
              disabled={isSubmittingCreateRequest}
            />
            <span className="font-medium">Printed Barcodes Needed</span>
          </label>

          {createError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmittingCreateRequest}
            className="h-10 px-4 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmitCreateRequest()}
            disabled={isSubmittingCreateRequest}
            className="h-10 px-4 rounded-md bg-[#F59B0F] text-white text-sm font-medium hover:bg-[#E28F0D] disabled:opacity-60"
          >
            {isSubmittingCreateRequest ? 'Submitting...' : 'Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequestOrderCodeModal;
