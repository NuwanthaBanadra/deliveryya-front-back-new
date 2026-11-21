import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import type { PaymentRecordSummaryDto } from '../../../types/WalletTypes';
import PaymentProofPreview from './PaymentProofPreview';

const money = (value: number | null) => value == null ? 'N/A' : `LKR ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4"><p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</p><p className="mt-1 break-words text-sm font-bold text-gray-800">{value === null || value === undefined || value === '' ? 'N/A' : value}</p></div>;
}

export default function PaymentRecordDetailModal({ isOpen, record, onClose }: { isOpen: boolean; record: PaymentRecordSummaryDto | null; onClose: () => void }) {
  if (!record) return null;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
          <div className="flex min-h-full items-center justify-center">
            <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-4 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:scale-95">
              <DialogPanel className="w-full max-w-5xl overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl">
                <div className="relative bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#9A5F11] px-6 py-5 text-white">
                  <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-xl bg-white/15 p-2 text-white hover:bg-white/25"><XMarkIcon className="h-5 w-5" /></button>
                  <div className="flex items-center gap-3 pr-12"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20"><DocumentTextIcon className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Accounts</p><DialogTitle className="text-xl font-black">Payment record</DialogTitle><p className="mt-1 text-xs text-white/80">Payment ID: {record.id}</p></div></div>
                </div>
                <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Amount" value={money(record.amount)} />
                    <Detail label="Payment type" value={record.paymentType?.name} />
                    <Detail label="Category" value={record.paymentCategory?.name} />
                    <Detail label="Verification" value={record.verificationStatus?.name} />
                    <Detail label="Bank" value={record.bankDetail?.bank?.name || record.bankDetail?.name} />
                    <Detail label="Account number" value={record.bankDetail?.accNumber} />
                    <Detail label="Branch" value={record.bankDetail?.branch} />
                    <Detail label="Created" value={record.createdAt ? new Date(record.createdAt).toLocaleString() : null} />
                  </div>
                  {record.desc && <div className="mt-3"><Detail label="Description" value={record.desc} /></div>}
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <PaymentProofPreview proofUrl={record.proofUrl} />
                    <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Payment items</p>
                      <div className="mt-3 divide-y divide-gray-100">
                        {record.paymentRecordItems.length ? record.paymentRecordItems.map((item, index) => (
                          <div key={item.id ?? `${item.code}-${index}`} className="flex items-start justify-between gap-3 py-3"><div><p className="text-sm font-black text-gray-900">{item.code || 'N/A'}</p>{item.note && <p className="mt-1 text-xs text-gray-500">{item.note}</p>}</div><p className="text-sm font-black text-gray-900">{money(item.amount)}</p></div>
                        )) : <p className="py-6 text-center text-sm text-gray-500">No payment items attached.</p>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-700">Close</button></div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
