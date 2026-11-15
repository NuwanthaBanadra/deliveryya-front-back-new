import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import type { WalletRecordDto } from '../../../types/WalletTypes';

type Props = {
  isOpen: boolean;
  operation: WalletRecordDto | null;
  onClose: () => void;
};

const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export default function WalletOperationDetailModal({ isOpen, operation, onClose }: Props) {
  if (!operation) return null;

  const isExpense = operation.isExpense;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                      Wallet Operation Detail
                    </h3>
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Transaction Amount</label>
                      <p className={`mt-1 text-lg font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                        {operation.amount !== null ? formatCurrency(operation.amount) : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500">Resulting Balance</label>
                      <p className={`mt-1 text-lg font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(operation.balance)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500">Type</label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          isExpense
                            ? 'bg-red-50 text-red-700 ring-red-600/20'
                            : 'bg-green-50 text-green-700 ring-green-600/20'
                        }`}>
                          {isExpense ? 'Expense / Debit' : 'Income / Credit'}
                        </span>
                      </p>
                    </div>

                    {operation.code && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Code</label>
                        <p className="mt-1 text-sm text-gray-900">{operation.code}</p>
                      </div>
                    )}

                    {operation.toOrFrom !== null && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">To / From</label>
                        <p className="mt-1 text-sm text-gray-900">{operation.toOrFrom}</p>
                      </div>
                    )}

                    {operation.ref && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Reference</label>
                        <p className="mt-1 text-sm text-gray-900">{operation.ref}</p>
                      </div>
                    )}

                    {operation.paymentCategory && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Payment Category</label>
                        <p className="mt-1 text-sm text-gray-900">{operation.paymentCategory.name}</p>
                      </div>
                    )}

                    {operation.paymentStatus && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Payment Status</label>
                        <p className="mt-1 text-sm text-gray-900">{operation.paymentStatus.name}</p>
                      </div>
                    )}

                    {operation.otherReason && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Other Reason</label>
                        <p className="mt-1 text-sm text-gray-900">{operation.otherReason}</p>
                      </div>
                    )}

                    {operation.note && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Note</label>
                        <p className="mt-1 text-sm text-gray-900">{operation.note}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-500">Operation Date/Time</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(operation.createdAt)}</p>
                    </div>

                    {operation.updatedAt && operation.updatedAt !== operation.createdAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(operation.updatedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
