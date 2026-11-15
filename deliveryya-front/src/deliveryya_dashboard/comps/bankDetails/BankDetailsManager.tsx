import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Select, { type SingleValue, type StylesConfig } from 'react-select';
import axiosInstance from '../../../util/AxiosUtil';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import { swalAlert, swalConfirm, swalErrorModal } from '../../../util/SwalUtil';

type ApiResponse<T> = {
  message?: string;
  desc?: string;
  object?: T;
  exData?: T;
};

type BankOption = {
  id: number;
  name: string;
};

type BankDetailRecord = {
  id?: number | string;
  name?: string | null;
  accNumber?: string | null;
  accountNumber?: string | null;
  branch?: string | null;
  bank?: BankOption | null;
  bankId?: number | string | null;
  userId?: number | string | null;
  isActive?: boolean | null;
  isDeleted?: boolean | null;
};

type PaginatedBankDetailsObject = {
  pageNumber?: number;
  countPerPage?: number;
  totalCount?: number;
  totalPages?: number;
  total?: number;
  totalElements?: number;
  items?: BankDetailRecord[];
};

type BankDetailsObject = BankDetailRecord[] | PaginatedBankDetailsObject;

type BankDetailViewModel = {
  id: number;
  name: string;
  accNumber: string;
  branch: string;
  bankId: number;
  bankName: string;
  userId: number;
  isActive: boolean;
  isDeleted: boolean;
};

type BankDetailFormState = {
  name: string;
  accNumber: string;
  branch: string;
  bankId: string;
  isActive: boolean;
};

type SelectOption = {
  value: number;
  label: string;
};

type BankDetailsManagerVariant = 'page' | 'modal' | 'embedded';

export type BankDetailsManagerProps = {
  userId: number | string | null | undefined;
  title?: string;
  subtitle?: string;
  ownerLabel?: string;
  variant?: BankDetailsManagerVariant;
  className?: string;
  showHeader?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  allowStatusToggle?: boolean;
  onChanged?: () => void;
};

const EMPTY_FORM_STATE: BankDetailFormState = {
  name: '',
  accNumber: '',
  branch: '',
  bankId: '',
  isActive: true,
};

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: 6, label: '6 / page' },
  { value: 12, label: '12 / page' },
  { value: 24, label: '24 / page' },
];

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '48px',
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(245, 155, 15, 0.12)' : 'none',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#F59B0F',
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    zIndex: 140,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 150,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
    fontWeight: 600,
    '&:active': {
      backgroundColor: '#F59B0F',
      color: 'white',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9CA3AF',
    fontWeight: 500,
  }),
  singleValue: (base) => ({
    ...base,
    color: '#1F2937',
    fontWeight: 600,
  }),
};

const extractItems = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === 'object' && Array.isArray((value as { items?: T[] }).items)) {
    return (value as { items: T[] }).items;
  }

  return [];
};

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toNonNegativeInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const getPaginatedObject = (value: unknown): PaginatedBankDetailsObject | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as PaginatedBankDetailsObject;
  }

  return null;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybeError = error as {
    response?: { data?: { desc?: string; message?: string } };
    message?: string;
  };

  return maybeError.response?.data?.desc || maybeError.response?.data?.message || maybeError.message || fallback;
};

const getStatusBadgeClass = (isActive: boolean) =>
  isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-gray-200 bg-gray-100 text-gray-600';

const getRootClassName = (variant: BankDetailsManagerVariant, className?: string) => {
  const base =
    variant === 'page'
      ? 'rounded-3xl border border-orange-100 bg-white/95 p-5 shadow-lg shadow-orange-100/60 sm:p-6'
      : 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5';

  return [base, className].filter(Boolean).join(' ');
};

function BankDetailsManager({
  userId,
  title = 'Bank Details',
  subtitle,
  ownerLabel = 'this user',
  variant = 'page',
  className,
  showHeader = true,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  allowStatusToggle = true,
  onChanged,
}: BankDetailsManagerProps) {
  const resolvedUserId = useMemo(() => toPositiveInteger(userId), [userId]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyBankDetailId, setBusyBankDetailId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetailViewModel[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0].value);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<BankDetailViewModel | null>(null);
  const [formState, setFormState] = useState<BankDetailFormState>(EMPTY_FORM_STATE);
  const [formError, setFormError] = useState('');
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [pendingBankDetailPayload, setPendingBankDetailPayload] = useState<any>(null);

  const bankSelectOptions = useMemo(
    () => banks.map((bank) => ({ value: bank.id, label: bank.name })),
    [banks]
  );

  const selectedBankOption = useMemo(
    () => bankSelectOptions.find((option) => option.value === Number(formState.bankId)) ?? null,
    [bankSelectOptions, formState.bankId]
  );

  const selectedPageSizeOption = useMemo(
    () => PAGE_SIZE_OPTIONS.find((option) => option.value === pageSize) ?? PAGE_SIZE_OPTIONS[0],
    [pageSize]
  );
  const canManageBankDetails = useMemo(
    () => hasAccess(FRONTEND_ACCESS_IDS.BANK_DETAILS),
    []
  );
  const canCreateBankDetails = allowCreate && canManageBankDetails;
  const canEditBankDetails = allowEdit && canManageBankDetails;
  const canToggleBankDetailStatus = allowStatusToggle && canManageBankDetails;
  const canDeleteBankDetails = useMemo(
    () => allowDelete && canManageBankDetails,
    [allowDelete, canManageBankDetails]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(0);
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadBankDetails = useCallback(async () => {
    if (!resolvedUserId) {
      setIsLoading(false);
      setError('Unable to identify the user for bank details.');
      setBanks([]);
      setBankDetails([]);
      setTotalCount(0);
      setTotalPages(1);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const [bankDetailsResponse, banksResponse] = await Promise.all([
        axiosInstance.post<ApiResponse<BankDetailsObject>>('/markets/get-bank-details', {
          pageNumber: page,
          countPerPage: pageSize,
          marketId: null,
          userId: resolvedUserId,
          bankDetailId: null,
          bankId: null,
          isActive: null,
          search: debouncedSearch || null,
          items: [],
        }),
        axiosInstance
          .get<ApiResponse<BankOption[]>>('/markets/get-banks')
          .catch(() => ({ data: { object: [] as BankOption[] } as ApiResponse<BankOption[]> })),
      ]);

      const bankItems = extractItems<BankOption>(banksResponse.data.object ?? banksResponse.data.exData ?? banksResponse.data);
      const responseObject = bankDetailsResponse.data.object ?? bankDetailsResponse.data.exData ?? bankDetailsResponse.data;
      const paginatedObject = getPaginatedObject(responseObject);
      const detailItems = extractItems<BankDetailRecord>(
        responseObject
      );
      const resolvedTotalCount =
        toNonNegativeInteger(paginatedObject?.totalCount) ??
        toNonNegativeInteger(paginatedObject?.totalElements) ??
        toNonNegativeInteger(paginatedObject?.total) ??
        detailItems.length;
      const resolvedTotalPages =
        toPositiveInteger(paginatedObject?.totalPages) ?? Math.max(1, Math.ceil(resolvedTotalCount / pageSize));

      const mappedDetails = detailItems
        .map((detail) => {
          const id = toPositiveInteger(detail.id);
          if (!id) {
            return null;
          }

          const bankId = toPositiveInteger(detail.bank?.id ?? detail.bankId) ?? 0;

          return {
            id,
            name: detail.name?.trim() || 'Unnamed account',
            accNumber: detail.accNumber?.trim() || detail.accountNumber?.trim() || 'N/A',
            branch: detail.branch?.trim() || 'N/A',
            bankId,
            bankName: detail.bank?.name?.trim() || bankItems.find((bank) => bank.id === bankId)?.name || 'Unknown bank',
            userId: toPositiveInteger(detail.userId) ?? resolvedUserId,
            isActive: detail.isActive !== false,
            isDeleted: detail.isDeleted === true,
          };
        })
        .filter((detail): detail is BankDetailViewModel => Boolean(detail));

      setBanks(bankItems);
      setBankDetails(mappedDetails);
      setTotalCount(resolvedTotalCount);
      setTotalPages(Math.max(1, resolvedTotalPages));
    } catch (loadError) {
      console.error('Failed to load bank details:', loadError);
      setError(getErrorMessage(loadError, 'Failed to load bank details.'));
      setBankDetails([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, pageSize, resolvedUserId]);

  useEffect(() => {
    void loadBankDetails();
  }, [loadBankDetails]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const stats = useMemo(() => {
    const active = bankDetails.filter((detail) => detail.isActive).length;
    return {
      total: totalCount,
      active,
      inactive: bankDetails.length - active,
    };
  }, [bankDetails, totalCount]);

  const showingRange = useMemo(() => {
    if (totalCount === 0) {
      return { from: 0, to: 0 };
    }

    const from = page * pageSize + 1;
    const to = Math.min(totalCount, page * pageSize + bankDetails.length);
    return { from, to };
  }, [bankDetails.length, page, pageSize, totalCount]);

  const openCreateForm = () => {
    if (!canCreateBankDetails) return;

    if (!resolvedUserId) {
      void swalErrorModal('User Missing', 'Unable to identify the user before adding bank details.');
      return;
    }

    setEditingDetail(null);
    setFormState({
      ...EMPTY_FORM_STATE,
      bankId: String(banks[0]?.id ?? ''),
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (detail: BankDetailViewModel) => {
    if (!canEditBankDetails) return;

    setEditingDetail(detail);
    setFormState({
      name: detail.name,
      accNumber: detail.accNumber,
      branch: detail.branch,
      bankId: String(detail.bankId || ''),
      isActive: detail.isActive,
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingDetail(null);
    setFormState(EMPTY_FORM_STATE);
    setFormError('');
    setIsOtpModalOpen(false);
    setOtp('');
    setOtpError('');
    setPendingBankDetailPayload(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resolvedUserId) {
      setFormError('Unable to identify the user.');
      return;
    }

    if (!canManageBankDetails) {
      setFormError('You do not have access to save bank details.');
      return;
    }

    if (!formState.name.trim() || !formState.accNumber.trim() || !formState.branch.trim() || !formState.bankId) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const bankId = Number(formState.bankId);
    const bank = banks.find((item) => item.id === bankId);

    if (!bank) {
      setFormError('Please select a valid bank.');
      return;
    }

    const payload = {
      ...(editingDetail ? { id: editingDetail.id } : {}),
      name: formState.name.trim(),
      accNumber: formState.accNumber.trim(),
      branch: formState.branch.trim(),
      bank: {
        id: bank.id,
        name: bank.name,
      },
      userId: resolvedUserId,
      isActive: formState.isActive,
    };

    setPendingBankDetailPayload(payload);
    await sendOtpAndOpenModal();
  };

  const sendOtpAndOpenModal = async () => {
    if (!resolvedUserId) {
      setFormError('Unable to identify the user.');
      return;
    }

    try {
      setIsSendingOtp(true);
      setFormError('');

      const operationType = editingDetail ? 'update' : 'create';
      await axiosInstance.post('/markets/send-otp-bank-detail', {
        userId: resolvedUserId,
        operationType,
      });

      setIsOtpModalOpen(true);
      setOtp('');
      setOtpError('');
    } catch (otpError) {
      console.error('Failed to send OTP:', otpError);
      setFormError(getErrorMessage(otpError, 'Failed to send verification code. Please try again.'));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpVerification = async () => {
    if (!resolvedUserId || !pendingBankDetailPayload) {
      return;
    }

    if (!otp.trim() || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit code.');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setOtpError('');

      const operationType = editingDetail ? 'update' : 'create';
      await axiosInstance.post('/markets/verify-otp-bank-detail', {
        userId: resolvedUserId,
        otp: otp.trim(),
        operationType,
      });

      // OTP verified, now save the bank detail
      setIsSaving(true);
      if (editingDetail) {
        await axiosInstance.post('/markets/update-bank-detail', pendingBankDetailPayload);
      } else {
        await axiosInstance.post('/markets/set-bank-detail', pendingBankDetailPayload);
      }

      await loadBankDetails();
      onChanged?.();
      setIsOtpModalOpen(false);
      setIsFormOpen(false);
      setEditingDetail(null);
      setFormState(EMPTY_FORM_STATE);
      setPendingBankDetailPayload(null);
      setOtp('');
      void swalAlert(
        editingDetail ? 'Bank Detail Updated' : 'Bank Detail Added',
        editingDetail ? 'The bank detail was updated successfully.' : 'The bank detail was added successfully.',
        'success'
      );
    } catch (verifyError) {
      console.error('Failed to verify OTP or save bank detail:', verifyError);
      const errorMsg = getErrorMessage(verifyError, 'Verification failed. Please check the code and try again.');
      setOtpError(errorMsg);
    } finally {
      setIsVerifyingOtp(false);
      setIsSaving(false);
    }
  };

  const handleDelete = async (detail: BankDetailViewModel) => {
    if (!canDeleteBankDetails) return;

    const confirmed = await swalConfirm(
      'Delete Bank Detail',
      `Delete ${detail.bankName} account ${detail.accNumber}?`,
      'Yes, delete',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyBankDetailId(detail.id);
      await axiosInstance.delete('/markets/delete-bank-detail', {
        params: { bankDetailId: detail.id },
      });
      await loadBankDetails();
      onChanged?.();
      void swalAlert('Bank Detail Deleted', 'The bank detail was removed successfully.', 'success');
    } catch (deleteError) {
      console.error('Failed to delete bank detail:', deleteError);
      void swalErrorModal('Delete Failed', getErrorMessage(deleteError, 'Failed to delete bank detail.'));
    } finally {
      setBusyBankDetailId(null);
    }
  };

  const handleToggleStatus = async (detail: BankDetailViewModel) => {
    if (!canToggleBankDetailStatus) return;

    const nextStatus = !detail.isActive;
    const actionText = nextStatus ? 'enable' : 'disable';
    const confirmed = await swalConfirm(
      `${nextStatus ? 'Enable' : 'Disable'} Bank Detail`,
      `Are you sure you want to ${actionText} ${detail.bankName} account ${detail.accNumber}?`,
      `Yes, ${actionText}`,
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyBankDetailId(detail.id);
      await axiosInstance.put('/markets/update-bank-detail-status', null, {
        params: {
          bankDetailId: detail.id,
          isActive: nextStatus,
        },
      });
      await loadBankDetails();
      onChanged?.();
      void swalAlert(
        nextStatus ? 'Bank Detail Enabled' : 'Bank Detail Disabled',
        `The bank detail was ${nextStatus ? 'enabled' : 'disabled'} successfully.`,
        'success'
      );
    } catch (statusError) {
      console.error('Failed to update bank detail status:', statusError);
      void swalErrorModal('Status Update Failed', getErrorMessage(statusError, 'Failed to update bank detail status.'));
    } finally {
      setBusyBankDetailId(null);
    }
  };

  const subtitleText =
    subtitle ||
    `Manage account names, banks, branches, and active payment accounts for ${ownerLabel}.`;

  return (
    <section className={getRootClassName(variant, className)}>
      {showHeader && (
        <div className="flex flex-col gap-4 border-b border-orange-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] text-white shadow-md">
              <BanknotesIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
              <p className="mt-1 text-sm font-medium text-gray-600">{subtitleText}</p>
            </div>
          </div>

          {canCreateBankDetails && (
            <button
              type="button"
              onClick={openCreateForm}
              disabled={!resolvedUserId || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusIcon className="h-5 w-5" />
              Add Bank Detail
            </button>
          )}
        </div>
      )}

      <div className={showHeader ? 'mt-5 space-y-5' : 'space-y-5'}>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-orange-100 bg-orange-50/50">
            <div className="border-r border-orange-100 px-4 py-3">
              <p className="text-xs font-medium uppercase text-gray-500">Total Matches</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <div className="border-r border-orange-100 px-4 py-3">
              <p className="text-xs font-medium uppercase text-gray-500">Active Here</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{stats.active}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-medium uppercase text-gray-500">Inactive Here</p>
              <p className="mt-1 text-xl font-semibold text-gray-700">{stats.inactive}</p>
            </div>
          </div>

          <label className="block">
            <span className="sr-only">Search bank details</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              placeholder="Search bank, branch, account..."
              className="h-full min-h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#F59B0F] focus:ring-4 focus:ring-orange-100"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-8 text-sm font-semibold text-gray-600">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-[#F59B0F]" />
            Loading bank details...
          </div>
        ) : error ? (
          <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : bankDetails.length === 0 && !debouncedSearch ? (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#AC6C2A] shadow-sm">
              <CreditCardIcon className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-semibold text-gray-900">No bank details yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm font-medium text-gray-600">
              Add a bank account so payment and settlement workflows have a verified destination.
            </p>
            {canCreateBankDetails && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#AC6C2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8d5823]"
              >
                <PlusIcon className="h-5 w-5" />
                Add First Bank Detail
              </button>
            )}
          </div>
        ) : bankDetails.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center text-sm font-semibold text-gray-600">
            No bank details match your search.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {bankDetails.map((detail) => (
              <article
                key={detail.id}
                className={`rounded-2xl border p-4 shadow-sm transition ${
                  detail.isActive
                    ? 'border-orange-100 bg-white hover:border-orange-200'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(detail.isActive)}`}>
                        {detail.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {detail.isDeleted && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          Deleted
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs font-medium uppercase text-[#AC6C2A]">{detail.bankName}</p>
                    <h3 className="mt-1 break-words text-lg font-semibold text-gray-900">{detail.name}</h3>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {canEditBankDetails && (
                      <button
                        type="button"
                        onClick={() => openEditForm(detail)}
                        disabled={busyBankDetailId === detail.id}
                        title="Edit bank detail"
                        aria-label={`Edit bank detail ${detail.id}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-[#AC6C2A] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                    )}
                    {canToggleBankDetailStatus && (
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(detail)}
                        disabled={busyBankDetailId === detail.id}
                        title={detail.isActive ? 'Disable bank detail' : 'Enable bank detail'}
                        aria-label={`${detail.isActive ? 'Disable' : 'Enable'} bank detail ${detail.id}`}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          detail.isActive
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {detail.isActive ? <NoSymbolIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
                      </button>
                    )}
                    {canDeleteBankDetails && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(detail)}
                        disabled={busyBankDetailId === detail.id}
                        title="Delete bank detail"
                        aria-label={`Delete bank detail ${detail.id}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase text-gray-500">Account Number</p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">{detail.accNumber}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase text-gray-500">Branch</p>
                    <p className="mt-1 break-words text-sm font-semibold text-gray-900">{detail.branch}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && !error && totalCount > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-gray-600">
              Showing <span className="font-semibold text-gray-900">{showingRange.from}</span> to{' '}
              <span className="font-semibold text-gray-900">{showingRange.to}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span>
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-36">
                <Select
                  options={PAGE_SIZE_OPTIONS}
                  value={selectedPageSizeOption}
                  onChange={(option: SingleValue<SelectOption>) => {
                    const nextPageSize = option?.value ?? PAGE_SIZE_OPTIONS[0].value;

                    setPage(0);
                    setPageSize(nextPageSize);
                  }}
                  styles={selectStyles}
                  isSearchable={false}
                  aria-label="Bank details per page"
                  menuPortalTarget={document.body}
                />
              </div>

              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0 || isLoading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous bank details page"
                title="Previous page"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                {page + 1} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={page >= totalPages - 1 || isLoading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next bank details page"
                title="Next page"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingDetail ? 'Update Bank Detail' : 'Add Bank Detail'}
                </h3>
                <p className="text-xs font-semibold text-gray-500">Keep bank, branch, and account holder data accurate.</p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving || isSendingOtp}
                aria-label="Close bank detail form"
                title="Close bank detail form"
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  <span>Bank</span>
                  <Select
                    options={bankSelectOptions}
                    value={selectedBankOption}
                    onChange={(option: SingleValue<SelectOption>) =>
                      setFormState((current) => ({ ...current, bankId: option ? String(option.value) : '' }))
                    }
                    placeholder="Select bank"
                    styles={selectStyles}
                    isDisabled={isSaving || isSendingOtp}
                    isClearable
                    menuPortalTarget={document.body}
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-gray-700">
                  <span>Account Holder Name</span>
                  <input
                    value={formState.name}
                    onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                    type="text"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#F59B0F] focus:ring-4 focus:ring-orange-100"
                    placeholder="Account holder name"
                    disabled={isSaving || isSendingOtp}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  <span>Account Number</span>
                  <input
                    value={formState.accNumber}
                    onChange={(event) => setFormState((current) => ({ ...current, accNumber: event.target.value }))}
                    type="text"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#F59B0F] focus:ring-4 focus:ring-orange-100"
                    placeholder="Account number"
                    disabled={isSaving || isSendingOtp}
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-gray-700">
                  <span>Branch</span>
                  <input
                    value={formState.branch}
                    onChange={(event) => setFormState((current) => ({ ...current, branch: event.target.value }))}
                    type="text"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#F59B0F] focus:ring-4 focus:ring-orange-100"
                    placeholder="Branch name"
                    disabled={isSaving || isSendingOtp}
                  />
                </label>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <span>
                  Active Bank Detail
                  <span className="block text-xs font-semibold text-gray-500">Inactive accounts stay saved but cannot be selected for payments.</span>
                </span>
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) => setFormState((current) => ({ ...current, isActive: event.target.checked }))}
                  disabled={isSaving || isSendingOtp}
                  className="h-5 w-5 rounded border-gray-300 accent-[#F59B0F]"
                />
              </label>

              {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</p>}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving || isSendingOtp}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isSendingOtp}
                  className="rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSendingOtp ? 'Sending Code...' : isSaving ? 'Saving...' : editingDetail ? 'Update Bank Detail' : 'Create Bank Detail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isOtpModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">Verify Your Identity</h3>
                <p className="text-xs font-semibold text-gray-500">Enter the 6-digit code sent to your registered mobile number.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOtpModalOpen(false);
                  setOtp('');
                  setOtpError('');
                  setPendingBankDetailPayload(null);
                }}
                disabled={isVerifyingOtp}
                aria-label="Close OTP modal"
                title="Close OTP modal"
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="space-y-2 text-sm font-medium text-gray-700">
                <span>Verification Code</span>
                <input
                  value={otp}
                  onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    setOtpError('');
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl font-mono font-semibold tracking-widest outline-none transition focus:border-[#F59B0F] focus:ring-4 focus:ring-orange-100"
                  placeholder="000000"
                  disabled={isVerifyingOtp}
                  autoFocus
                />
              </label>

              {otpError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{otpError}</p>}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOtpVerification}
                  disabled={isVerifyingOtp || otp.length !== 6}
                  className="rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify & Save'}
                </button>
                <button
                  type="button"
                  onClick={sendOtpAndOpenModal}
                  disabled={isVerifyingOtp}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Resend Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default BankDetailsManager;
