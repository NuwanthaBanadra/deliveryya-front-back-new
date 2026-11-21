import {Dialog, DialogPanel, DialogTitle, Transition, TransitionChild} from '@headlessui/react';
import {ArrowDownCircleIcon, ArrowUpCircleIcon, DocumentTextIcon, XMarkIcon} from '@heroicons/react/24/outline';
import {Fragment} from 'react';
import type {WalletRecordDto} from '../../../types/WalletTypes';

export interface WalletOperationDetailModalProps {
    isOpen: boolean;
    operation: WalletRecordDto | null;
    onClose: () => void;
    onOpenPaymentRecord?: () => void;
}

const money = (value: number | null) =>
    value == null ? 'N/A' : value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const displayDate = (value: string | null) => value ? new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
}) : '—';

function Detail({label, value}: { label: string; value: string | number | null | undefined }) {
    return <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4"><p
        className="text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</p><p
        className="mt-1 break-words text-sm font-bold text-gray-800">{value === null || value === undefined || value === '' ? 'N/A' : value}</p>
    </div>;
}

export function WalletOperationDetailModal({
                                               isOpen,
                                               operation,
                                               onClose,
                                               onOpenPaymentRecord
                                           }: WalletOperationDetailModalProps) {
    if (!operation) return null;
    const expense = Boolean(operation.isExpense);

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                                 leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"/>
                </TransitionChild>
                <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
                    <div className="flex min-h-full items-center justify-center">
                        <TransitionChild as={Fragment} enter="ease-out duration-200"
                                         enterFrom="opacity-0 translate-y-4 sm:scale-95"
                                         enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150"
                                         leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                         leaveTo="opacity-0 translate-y-4 sm:scale-95">
                            <DialogPanel
                                className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
                                <div
                                    className={`relative overflow-hidden px-6 py-6 text-white ${expense ? 'bg-linear-to-br from-red-700 to-rose-500' : 'bg-linear-to-br from-emerald-700 to-teal-500'}`}>
                                    <button type="button" onClick={onClose}
                                            className="absolute right-4 top-4 rounded-xl p-2 text-white/80 hover:bg-white/15 hover:text-white">
                                        <XMarkIcon className="h-5 w-5"/></button>
                                    <div className="flex items-center gap-4">
                                        {expense ? <ArrowDownCircleIcon className="h-12 w-12"/> :
                                            <ArrowUpCircleIcon className="h-12 w-12"/>}
                                        <div><DialogTitle className="text-xl font-black">Wallet operation</DialogTitle>
                                            <p className="mt-1 text-sm text-white/75">{displayDate(operation.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                                        <div><p
                                            className="text-xs font-bold uppercase tracking-wider text-white/70">{expense ? 'Debit' : 'Credit'}</p>
                                            <p className="mt-1 text-4xl font-black">{expense ? '-' : '+'}{money(operation.amount)}</p>
                                        </div>
                                        <div className="rounded-2xl bg-white/15 px-4 py-3 text-right backdrop-blur"><p
                                            className="text-[11px] font-bold uppercase tracking-wider text-white/70">Balance
                                            after</p><p
                                            className="mt-1 text-lg font-black">{money(operation.balance)}</p></div>
                                    </div>
                                </div>
                                <div className="grid gap-3 p-6 sm:grid-cols-2">
                                    <Detail label="Record ID" value={operation.id}/>
                                    <Detail label="Status" value={operation.paymentStatus?.name}/>
                                    <Detail label="Category" value={operation.paymentCategory?.name}/>
                                    <Detail label="Code" value={operation.code}/>
                                    <Detail label="Reference" value={operation.ref}/>
                                    <Detail label="Note" value={operation.note}/>
                                    <Detail label="Other reason" value={operation.otherReason}/>
                                    <Detail label="Created by"
                                            value={operation.createdByName ? `${operation.createdByName}${operation.createdByNic ? ` (${operation.createdByNic})` : ''}` : operation.createdBy}/>
                                    <Detail label="Last updated"
                                            value={operation.updatedAt ? displayDate(operation.updatedAt) : null}/>
                                </div>
                                <div
                                    className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
                                    {onOpenPaymentRecord && <button type="button" onClick={onOpenPaymentRecord}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-lg">
                                        <DocumentTextIcon className="h-4 w-4"/> Open payment record</button>}
                                    <button type="button" onClick={onClose}
                                            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-700">Close
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

