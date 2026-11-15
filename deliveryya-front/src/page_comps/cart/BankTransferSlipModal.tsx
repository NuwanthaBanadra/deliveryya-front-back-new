import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { FaBuildingColumns, FaCloudArrowUp, FaFileCircleCheck, FaXmark } from 'react-icons/fa6';
import axiosInstance from '../../util/AxiosUtil';

type BankAccountDetails = {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  swiftCode?: string;
};

type BankTransferSlipModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, bankDetailId: number) => Promise<void> | void;
  isSubmitting?: boolean;
  marketId?: number;
};

type ApiBank = {
  id: number;
  name: string;
};

type ApiBankDetail = {
  id: number;
  name: string;
  accNumber: string;
  branch: string;
  bank?: {
    id: number;
    name: string;
  } | null;
};

const getResolvedMarketOwnerUserId = (market: unknown): number | null => {
  if (!market || typeof market !== 'object') {
    return null;
  }

  const candidate = market as Record<string, any>;
  const ownerSource = candidate.users ?? candidate.owner ?? candidate.user;
  const ownerId = Number(ownerSource?.id ?? ownerSource?.userId ?? ownerSource?.ownerId);

  return Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null;
};

const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const BankTransferSlipModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  marketId,
}: BankTransferSlipModalProps) => {
  const [selectedSlip, setSelectedSlip] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [bankAccountDetails, setBankAccountDetails] = useState<BankAccountDetails[]>([]);
  const [selectedBankDetailId, setSelectedBankDetailId] = useState<number | null>(null);
  const [isLoadingBankDetails, setIsLoadingBankDetails] = useState(false);
  const [bankDetailsError, setBankDetailsError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedSlip(null);
      setSelectedBankDetailId(null);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadBankDetails = async () => {
      try {
        setIsLoadingBankDetails(true);
        setBankDetailsError('');

        if (!marketId || marketId <= 0) {
          if (!isMounted) return;
          setBankAccountDetails([]);
          setBankDetailsError('Unable to determine the market for this order. Please try again from a market-specific checkout.');
          return;
        }

        const marketRequestBody = {
          pageNumber: 0,
          countPerPage: 1,
          marketId,
          isActive: true,
          userId: null,
          marketCategoryId: null,
          search: '',
          items: [],
        };

        let marketResponse = await axiosInstance.post('/markets/get-markets', marketRequestBody);
        let marketItems = marketResponse.data?.object?.items ?? marketResponse.data?.exData?.items ?? [];

        if (String(marketResponse.data?.message || '').toLowerCase() !== 'success' || marketItems.length === 0) {
          const { items: _items, ...marketQueryParams } = marketRequestBody;
          marketResponse = await axiosInstance.get('/markets/get-markets', { params: marketQueryParams });
          marketItems = marketResponse.data?.object?.items ?? marketResponse.data?.exData?.items ?? [];
        }

        const resolvedMarket = Array.isArray(marketItems) ? marketItems[0] : null;
        const marketOwnerUserId = getResolvedMarketOwnerUserId(resolvedMarket);

        if (!marketOwnerUserId) {
          if (!isMounted) return;
          setBankAccountDetails([]);
          setBankDetailsError('Unable to resolve the market owner for this order.');
          return;
        }

        const [bankDetailsResponse, banksResponse] = await Promise.all([
          axiosInstance.get('/markets/get-bank-details-by-user-id', {
            params: { userId: marketOwnerUserId },
          }),
          axiosInstance.get('/markets/get-banks'),
        ]);

        const detailsList = (bankDetailsResponse.data?.object || []) as ApiBankDetail[];
        const banksList = (banksResponse.data?.object || []) as ApiBank[];

        if (detailsList.length === 0) {
          if (!isMounted) return;
          setBankAccountDetails([]);
          setBankDetailsError('No bank account details available right now. Please try again later.');
          return;
        }

        const mappedDetails = detailsList.map((detail) => {
          const bankNameFromDetails = detail.bank?.name?.trim();
          const bankNameFromBanks = banksList.find((bank) => bank.id === detail.bank?.id)?.name?.trim();

          return {
            id: Number(detail.id),
            bankName: bankNameFromDetails || bankNameFromBanks || 'N/A',
            accountName: detail.name || 'N/A',
            accountNumber: detail.accNumber || 'N/A',
            branch: detail.branch || 'N/A',
          };
        });

        if (!isMounted) return;
        setBankAccountDetails(mappedDetails);
        setSelectedBankDetailId((prev) => {
          if (prev && mappedDetails.some((detail) => detail.id === prev)) {
            return prev;
          }
          return mappedDetails[0]?.id ?? null;
        });
      } catch (loadError) {
        console.error('Failed to load bank account details:', loadError);
        if (!isMounted) return;
        setBankAccountDetails([]);
        setBankDetailsError('Failed to load bank account details. Please try again.');
      } finally {
        if (isMounted) {
          setIsLoadingBankDetails(false);
        }
      }
    };

    void loadBankDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, marketId]);

  if (!isOpen) {
    return null;
  }

  const handleSlipChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedSlip(null);
      return;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSizeInBytes = 5 * 1024 * 1024;

    if (!allowedMimeTypes.includes(file.type)) {
      setSelectedSlip(null);
      setError('Please upload a JPG, PNG, or PDF file.');
      return;
    }

    if (file.size > maxSizeInBytes) {
      setSelectedSlip(null);
      setError('File size must be 5MB or less.');
      return;
    }

    setError('');
    setSelectedSlip(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSlip) {
      setError('Please select a payment slip before continuing.');
      return;
    }

    if (!selectedBankDetailId) {
      setError('Please select a bank account before continuing.');
      return;
    }

    setError('');
    await onSubmit(selectedSlip, selectedBankDetailId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-2xl border border-orange-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-orange-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Bank Transfer Confirmation</h3>
            <p className="text-xs text-gray-500">Upload your payment slip to verify your order quickly.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close payment slip modal"
          >
            <FaXmark />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#AC6C2A]">
              <FaBuildingColumns />
              Bank Account Details
            </div>
            {isLoadingBankDetails && <p className="text-sm text-gray-600">Loading bank account details...</p>}

            {!isLoadingBankDetails && bankDetailsError && (
              <p className="text-sm font-medium text-red-600">{bankDetailsError}</p>
            )}

            {!isLoadingBankDetails && !bankDetailsError && bankAccountDetails.length > 0 && (
              <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                {bankAccountDetails.map((bankDetail, index) => (
                  <button
                    key={`${bankDetail.accountNumber}-${index}`}
                    type="button"
                    onClick={() => setSelectedBankDetailId(bankDetail.id)}
                    className={`rounded-lg border bg-white/70 p-3 text-left transition-colors ${
                      selectedBankDetailId === bankDetail.id
                        ? 'border-[#F59B0F] ring-2 ring-orange-200'
                        : 'border-orange-200 hover:border-orange-300'
                    }`}
                  >
                    <p><span className="font-medium text-gray-900">Bank:</span> {bankDetail.bankName}</p>
                    <p><span className="font-medium text-gray-900">Branch:</span> {bankDetail.branch}</p>
                    <p><span className="font-medium text-gray-900">Account Name:</span> {bankDetail.accountName}</p>
                    <p><span className="font-medium text-gray-900">Account No:</span> {bankDetail.accountNumber}</p>
                    {bankDetail.swiftCode && (
                      <p><span className="font-medium text-gray-900">SWIFT:</span> {bankDetail.swiftCode}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="block rounded-xl border border-dashed border-orange-300 bg-orange-50/40 p-4 text-center transition-colors hover:bg-orange-50">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleSlipChange}
              disabled={isSubmitting}
              className="hidden"
            />
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#F59B0F] shadow-sm">
              <FaCloudArrowUp />
            </div>
            <p className="text-sm font-semibold text-gray-800">Upload payment slip</p>
            <p className="text-xs text-gray-500">Accepted: JPG, PNG, PDF (Max 5MB)</p>
          </label>

          {selectedSlip && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <FaFileCircleCheck className="shrink-0" />
              <p className="truncate">
                {selectedSlip.name} ({formatFileSize(selectedSlip.size)})
              </p>
            </div>
          )}

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Upload Later
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Slip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export type { BankAccountDetails };
export default BankTransferSlipModal;
