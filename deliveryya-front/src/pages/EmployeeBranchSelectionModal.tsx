import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { BuildingOffice2Icon, CheckIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import type { Branch } from '../types/BranchTypes';

type Props = {
  isOpen: boolean;
  branches: Branch[];
  onSelect: (branch: Branch) => void;
};

export default function EmployeeBranchSelectionModal({ isOpen, branches, onSelect }: Props) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => undefined}>
        <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-4 scale-[0.98]" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-4 scale-[0.98]">
              <DialogPanel className="w-full max-w-lg overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl">
                <div className="border-b border-orange-100 bg-orange-50/60 px-6 py-5">
                  <DialogTitle className="text-xl font-black text-slate-900">Choose your branch</DialogTitle>
                  <p className="mt-1 text-sm text-slate-500">Select the branch you want to work with for this session.</p>
                </div>
                <div className="space-y-3 p-6">
                  {branches.map((branch) => (
                    <button key={branch.id} type="button" onClick={() => onSelect(branch)} className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left transition hover:border-orange-300 hover:bg-orange-50">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#AC6C2A]"><BuildingOffice2Icon className="h-6 w-6" /></span>
                      <span className="min-w-0 flex-1"><span className="block font-bold text-slate-900">{branch.name}</span><span className="mt-1 block truncate text-sm text-slate-500">{branch.location} · {branch.city?.name}</span></span>
                      <CheckIcon className="h-5 w-5 text-[#AC6C2A]" />
                    </button>
                  ))}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
