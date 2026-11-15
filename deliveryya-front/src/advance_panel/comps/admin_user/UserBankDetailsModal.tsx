import { BanknotesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import BankDetailsManager from '../../../deliveryya_dashboard/comps/bankDetails/BankDetailsManager';

type UserBankDetailsModalProps = {
  isOpen: boolean;
  userId: string | number | null;
  userName?: string;
  onClose: () => void;
};

export function UserBankDetailsModal({ isOpen, userId, userName, onClose }: UserBankDetailsModalProps) {
  if (!isOpen) {
    return null;
  }

  const ownerLabel = userName?.trim() || (userId ? `User #${userId}` : 'selected user');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#9A5F11] px-6 py-5 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
            aria-label="Close bank details"
            title="Close bank details"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <BanknotesIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black">Bank Details</h2>
              <p className="mt-1 truncate text-sm font-semibold text-orange-100">{ownerLabel}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
          <BankDetailsManager
            userId={userId}
            ownerLabel={ownerLabel}
            variant="modal"
            title="Bank Details"
            showHeader
          />
        </div>
      </div>
    </div>
  );
}
