import { ArrowPathIcon, BoltIcon, CurrencyDollarIcon, MagnifyingGlassIcon, ShoppingBagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState, useMemo, type FormEvent } from 'react';
import axiosInstance from '../../../util/AxiosUtil';
import JwtUtil from '../../../util/JwtUtil';
import { swalAlert } from '../../../util/SwalUtil';
import { buildProofUploadFile, uploadProofToStorage } from '../../../util/PaymentProofUtil';
import PaymentProofModal from './PaymentProofModal';

interface OnHandOrdersData {
  orderPrices: number;
  collectivePrices: number;
  onHandUrgentJobCount: number;
  urgentJobValues: number;
  onHandOrderCount: number;
  urgentJobList: Array<Record<string, unknown>>;
  orderList: Array<Record<string, unknown>>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (...vals: unknown[]): string => {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
};

const normalizeReferenceCode = (code: string): string => code.trim().toUpperCase();

const getOrderReferenceCode = (order: Record<string, unknown>): string => {
  const orderCode = isRecord(order.orderCode) ? order.orderCode : null;
  return str(orderCode?.code, order.orderCode, order.code);
};

const getUrgentReferenceCode = (job: Record<string, unknown>): string => str(job.jobCode, job.code);
const getUrgentPaymentAmount = (job: Record<string, unknown>): number => Number(job.cost ?? job.amount ?? job.totalPrice) || 0;

const getPaginatedItems = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return value.items.filter(isRecord);
  }

  return [];
};

const mergeRowsByCode = (
  tableRows: Array<Record<string, unknown>>,
  manualRows: Array<Record<string, unknown>>,
  getCode: (row: Record<string, unknown>) => string,
): Array<Record<string, unknown>> => {
  const seen = new Set<string>();

  return [...tableRows, ...manualRows].filter((row, index) => {
    const code = normalizeReferenceCode(getCode(row)) || `ROW-${index}`;
    if (seen.has(code)) {
      return false;
    }

    seen.add(code);
    return true;
  });
};

const formatCurrency = (value: number): string => {
  return `${(value || 0).toFixed(2)}`;
};

const getUserId = (): number => {
  const token = localStorage.getItem('jwtToken');
  if (!token) return 0;

  const decoded = JwtUtil.decodeToken(token);
  const parsed = Number(decoded?.userId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadgeClass = (status: string, kind: 'payment' | 'delivery' | 'job'): string => {
  const normalized = status.trim().toLowerCase();

  if (!normalized) {
    return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  }

  if (kind === 'payment') {
    if (normalized.includes('paid') || normalized.includes('success') || normalized.includes('completed')) {
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    }
    if (normalized.includes('partial')) {
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    }
    if (normalized.includes('pending') || normalized.includes('unpaid') || normalized.includes('due')) {
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    }
    if (normalized.includes('failed') || normalized.includes('cancel')) {
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    }
    return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
  }

  if (kind === 'delivery') {
    if (normalized.includes('delivered') || normalized.includes('complete') || normalized.includes('completed')) {
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    }
    if (normalized.includes('transit') || normalized.includes('shipping') || normalized.includes('out for delivery')) {
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    }
    if (normalized.includes('pending') || normalized.includes('new') || normalized.includes('assigned')) {
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    }
    if (normalized.includes('failed') || normalized.includes('cancel')) {
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    }
    return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
  }

  if (normalized.includes('completed') || normalized.includes('accepted') || normalized.includes('done')) {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }
  if (normalized.includes('pending') || normalized.includes('waiting')) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }
  if (normalized.includes('rejected') || normalized.includes('cancel') || normalized.includes('failed')) {
    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  }
  return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
};

function OnHandOrders() {
  const [data, setData] = useState<OnHandOrdersData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isPaymentProofModalOpen, setIsPaymentProofModalOpen] = useState(false);
  const [paymentProofFiles, setPaymentProofFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editedOrderAmounts, setEditedOrderAmounts] = useState<Record<string, number>>({});
  const [manualReferenceCode, setManualReferenceCode] = useState('');
  const [manualOrderRows, setManualOrderRows] = useState<Array<Record<string, unknown>>>([]);
  const [manualUrgentRows, setManualUrgentRows] = useState<Array<Record<string, unknown>>>([]);
  const [isVerifyingManualReference, setIsVerifyingManualReference] = useState(false);
  const [manualReferenceError, setManualReferenceError] = useState<string | null>(null);

  const toggleRowSelection = useCallback((rowId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const loadOnHandOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await axiosInstance.get<{ object?: unknown }>('/orders/get-on-hand-orders', {
        params: { userId: getUserId() },
      });
      const obj = res.data?.object;
      if (isRecord(obj)) {
        setData({
          orderPrices: Number(obj.orderPrices) || 0,
          collectivePrices: Number(obj.collectivePrices) || 0,
          onHandUrgentJobCount: Number(obj.onHandUrgentJobCount) || 0,
          urgentJobValues: Number(obj.urgentJobValues) || 0,
          onHandOrderCount: Number(obj.onHandOrderCount) || 0,
          urgentJobList: Array.isArray(obj.urgentJobList) ? obj.urgentJobList.filter(isRecord) : [],
          orderList: Array.isArray(obj.orderList) ? obj.orderList.filter(isRecord) : [],
        });
      }
    } catch {
      setLoadError('Failed to load on-hand orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOnHandOrders();
  }, [loadOnHandOrders]);

  const stats = useMemo(() => ({
    totalOrderValue: data?.orderPrices || 0,
    collectiveValue: data?.collectivePrices || 0,
    urgentJobCount: data?.onHandUrgentJobCount || 0,
    urgentJobValue: data?.urgentJobValues || 0,
    orderCount: data?.onHandOrderCount || 0,
  }), [data]);

  const tableOrderList = useMemo(() => {
    return data?.orderList ?? [];
  }, [data?.orderList]);

  const tableUrgentJobList = useMemo(() => {
    return data?.urgentJobList ?? [];
  }, [data?.urgentJobList]);

  const getOrderRowId = useCallback((order: Record<string, unknown>, idx: number) => {
    return `order:${str(order.id, order.orderId) || idx}`;
  }, []);

  const getUrgentRowId = useCallback((job: Record<string, unknown>, idx: number) => {
    return `urgent:${str(job.id, job.jobId) || idx}`;
  }, []);

  const allRowIds = useMemo(
    () => [
      ...tableOrderList.map((order, idx) => getOrderRowId(order, idx)),
      ...tableUrgentJobList.map((job, idx) => getUrgentRowId(job, idx)),
    ],
    [tableOrderList, tableUrgentJobList, getOrderRowId, getUrgentRowId],
  );

  const areAllRowsSelected = allRowIds.length > 0 && allRowIds.every((rowId) => selectedRows.has(rowId));

  const selectedOrderRows = useMemo(
    () => tableOrderList.filter((order, idx) => selectedRows.has(getOrderRowId(order, idx))),
    [tableOrderList, selectedRows, getOrderRowId],
  );

  const selectedUrgentRows = useMemo(
    () => tableUrgentJobList.filter((job, idx) => selectedRows.has(getUrgentRowId(job, idx))),
    [tableUrgentJobList, selectedRows, getUrgentRowId],
  );

  const selectedPaymentOrderRows = useMemo(
    () => mergeRowsByCode(selectedOrderRows, manualOrderRows, getOrderReferenceCode),
    [selectedOrderRows, manualOrderRows],
  );

  const selectedPaymentUrgentRows = useMemo(
    () => mergeRowsByCode(selectedUrgentRows, manualUrgentRows, getUrgentReferenceCode),
    [selectedUrgentRows, manualUrgentRows],
  );

  const selectedReferenceCount = selectedPaymentOrderRows.length + selectedPaymentUrgentRows.length;

  const selectedOrdersTotal = useMemo(
    () => selectedPaymentOrderRows.reduce((total, order) => total + (Number(order.collectivePrice) || 0), 0),
    [selectedPaymentOrderRows],
  );

  const selectedUrgentJobsTotal = useMemo(
    () => selectedPaymentUrgentRows.reduce((total, job) => total + getUrgentPaymentAmount(job), 0),
    [selectedPaymentUrgentRows],
  );

  useEffect(() => {
    setEditedOrderAmounts((prev) => {
      const next: Record<string, number> = {};

      selectedPaymentOrderRows.forEach((order) => {
        const code = normalizeReferenceCode(getOrderReferenceCode(order));
        if (!code) {
          return;
        }

        const defaultAmount = Number((Number(order.collectivePrice) || 0).toFixed(2));
        next[code] = typeof prev[code] === 'number' ? prev[code] : defaultAmount;
      });

      return next;
    });
  }, [selectedPaymentOrderRows]);

  const selectedEditedOrdersTotal = useMemo(
    () => selectedPaymentOrderRows.reduce((total, order) => {
      const code = normalizeReferenceCode(getOrderReferenceCode(order));
      if (!code) {
        return total;
      }
      const fallbackAmount = Number((Number(order.collectivePrice) || 0).toFixed(2));
      const editedAmount = editedOrderAmounts[code];
      return total + (Number.isFinite(editedAmount) ? editedAmount : fallbackAmount);
    }, 0),
    [selectedPaymentOrderRows, editedOrderAmounts],
  );

  useEffect(() => {
    setSubmitError(null);
  }, [selectedRows, manualOrderRows, manualUrgentRows, editedOrderAmounts]);

  const areAllOrderRowsSelected = tableOrderList.length > 0 && tableOrderList.every((order, idx) => selectedRows.has(getOrderRowId(order, idx)));
  const areAllUrgentRowsSelected = tableUrgentJobList.length > 0 && tableUrgentJobList.every((job, idx) => selectedRows.has(getUrgentRowId(job, idx)));

  const toggleAllOrderRows = useCallback(() => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      const targetRows = tableOrderList.map((order, idx) => getOrderRowId(order, idx));
      const shouldSelectAll = targetRows.some((rowId) => !next.has(rowId));

      targetRows.forEach((rowId) => {
        if (shouldSelectAll) {
          next.add(rowId);
        } else {
          next.delete(rowId);
        }
      });

      return next;
    });
  }, [tableOrderList, getOrderRowId]);

  const toggleAllUrgentRows = useCallback(() => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      const targetRows = tableUrgentJobList.map((job, idx) => getUrgentRowId(job, idx));
      const shouldSelectAll = targetRows.some((rowId) => !next.has(rowId));

      targetRows.forEach((rowId) => {
        if (shouldSelectAll) {
          next.add(rowId);
        } else {
          next.delete(rowId);
        }
      });

      return next;
    });
  }, [tableUrgentJobList, getUrgentRowId]);

  const toggleAllRows = useCallback(() => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = allRowIds.some((rowId) => !next.has(rowId));

      allRowIds.forEach((rowId) => {
        if (shouldSelectAll) {
          next.add(rowId);
        } else {
          next.delete(rowId);
        }
      });

      return next;
    });
  }, [allRowIds]);

  const handleRemoveSelectedRow = useCallback((kind: 'order' | 'urgent', code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }

    setManualReferenceError(null);

    setSelectedRows((prev) => {
      const next = new Set(prev);

      if (kind === 'order') {
        tableOrderList.forEach((order, idx) => {
          if (normalizeReferenceCode(getOrderReferenceCode(order)) === normalizedCode) {
            next.delete(getOrderRowId(order, idx));
          }
        });
      } else {
        tableUrgentJobList.forEach((job, idx) => {
          if (normalizeReferenceCode(getUrgentReferenceCode(job)) === normalizedCode) {
            next.delete(getUrgentRowId(job, idx));
          }
        });
      }

      return next;
    });

    if (kind === 'order') {
      setManualOrderRows((prev) => prev.filter((order) => normalizeReferenceCode(getOrderReferenceCode(order)) !== normalizedCode));
      setEditedOrderAmounts((prev) => {
        const next = { ...prev };
        delete next[normalizedCode];
        return next;
      });
    } else {
      setManualUrgentRows((prev) => prev.filter((job) => normalizeReferenceCode(getUrgentReferenceCode(job)) !== normalizedCode));
    }
  }, [tableOrderList, tableUrgentJobList, getOrderRowId, getUrgentRowId]);

  const handleClosePaymentProofModal = () => {
    setIsPaymentProofModalOpen(false);
    setPaymentProofFiles([]);
    setUploadProgress(null);
  };

  const findPaymentReferenceByCode = async (
    normalizedCode: string,
    userId: number,
  ): Promise<{ kind: 'order' | 'urgent'; row: Record<string, unknown> } | null> => {
    const lookupKinds: Array<'order' | 'urgent'> = normalizedCode.startsWith('UJC')
      ? ['urgent']
      : normalizedCode.startsWith('ORD')
        ? ['order']
        : ['order', 'urgent'];

    for (const kind of lookupKinds) {
      if (kind === 'order') {
        const response = await axiosInstance.post<{ object?: unknown }>('/orders/get-orders', {
          pageNumber: 0,
          countPerPage: 5,
          orderCode: normalizedCode,
          userId,
          search: '',
        });
        const items = getPaginatedItems(response.data?.object);
        const exactMatch = items.find((item) => normalizeReferenceCode(getOrderReferenceCode(item)) === normalizedCode);
        const row = exactMatch || items[0] || null;

        if (row) {
          return { kind, row };
        }
      } else {
        const response = await axiosInstance.post<{ object?: unknown }>('/urgent-jobs/get-urgent-jobs', {
          pageNumber: 0,
          countPerPage: 5,
          jobCode: normalizedCode,
          userId,
          search: '',
        });
        const items = getPaginatedItems(response.data?.object);
        const exactMatch = items.find((item) => normalizeReferenceCode(getUrgentReferenceCode(item)) === normalizedCode);
        const row = exactMatch || items[0] || null;

        if (row) {
          return { kind, row };
        }
      }
    }

    return null;
  };

  const handleVerifyManualReference = async () => {
    const normalizedCode = normalizeReferenceCode(manualReferenceCode);
    if (!normalizedCode) {
      setManualReferenceError('Enter an order code or urgent job code first.');
      return;
    }

    const alreadySelected = selectedPaymentOrderRows.some((order) => normalizeReferenceCode(getOrderReferenceCode(order)) === normalizedCode)
      || selectedPaymentUrgentRows.some((job) => normalizeReferenceCode(getUrgentReferenceCode(job)) === normalizedCode);

    if (alreadySelected) {
      setManualReferenceError('This code is already included in the payment proof.');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setManualReferenceError('Unable to resolve current user id. Please sign in again.');
      return;
    }

    setIsVerifyingManualReference(true);
    setManualReferenceError(null);

    try {
      const verifiedReference = await findPaymentReferenceByCode(normalizedCode, userId);

      if (!verifiedReference) {
        setManualReferenceError('No order or urgent job was found for this code.');
        return;
      }

      if (verifiedReference.kind === 'order') {
        setManualOrderRows((prev) => mergeRowsByCode([], [...prev, verifiedReference.row], getOrderReferenceCode));
      } else {
        setManualUrgentRows((prev) => mergeRowsByCode([], [...prev, verifiedReference.row], getUrgentReferenceCode));
      }

      setManualReferenceCode('');
      setSubmitError(null);
    } catch (error) {
      console.error('Manual payment reference verification failed:', error);
      setManualReferenceError('Failed to verify this code. Please check it and try again.');
    } finally {
      setIsVerifyingManualReference(false);
    }
  };

  const paymentRecordItems = useMemo(() => {
    const orderItems = selectedPaymentOrderRows
      .map((order) => {
        const code = normalizeReferenceCode(getOrderReferenceCode(order));
        if (!code) {
          return null;
        }
        return {
          code,
          note: 'On-hand order payment',
          amount: Number(((editedOrderAmounts[code] ?? Number(order.collectivePrice)) || 0).toFixed(2)),
        };
      })
      .filter((item): item is { code: string; note: string; amount: number } => item !== null);

    const urgentItems = selectedPaymentUrgentRows
      .map((job) => {
        const code = normalizeReferenceCode(getUrgentReferenceCode(job));
        if (!code) {
          return null;
        }
        return {
          code,
          note: 'Urgent job payment',
          amount: Number(getUrgentPaymentAmount(job).toFixed(2)),
        };
      })
      .filter((item): item is { code: string; note: string; amount: number } => item !== null);

    return [...orderItems, ...urgentItems];
  }, [selectedPaymentOrderRows, selectedPaymentUrgentRows, editedOrderAmounts]);

  const manualReferenceBadges = useMemo(
    () => [
      ...manualOrderRows.map((order) => ({
        kind: 'order' as const,
        code: normalizeReferenceCode(getOrderReferenceCode(order)),
      })),
      ...manualUrgentRows.map((job) => ({
        kind: 'urgent' as const,
        code: normalizeReferenceCode(getUrgentReferenceCode(job)),
      })),
    ].filter((item) => item.code),
    [manualOrderRows, manualUrgentRows],
  );

  const handleSubmitPaymentProof = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (paymentProofFiles.length === 0) {
      setSubmitError('Please attach payment proof (image/pdf).');
      return;
    }
    if (selectedEditedOrdersTotal < 0) {
      setSubmitError('Edited selected on hand orders total cannot be negative.');
      return;
    }
    if (paymentRecordItems.length === 0) {
      setSubmitError('Unable to build payment record items. Please reselect rows and try again.');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setSubmitError('Unable to resolve current user id. Please sign in again.');
      return;
    }

    setIsSubmittingProof(true);
    setSubmitError(null);
    setUploadProgress(0);

    try {
      const preparedProofFile = await buildProofUploadFile(paymentProofFiles, 'on-hand-proof');
      const proofUrl = await uploadProofToStorage(preparedProofFile, 'payment-proofs', setUploadProgress);

      if (!proofUrl) {
        throw new Error('Proof upload returned an empty path.');
      }

      const finalAmount = Number((selectedEditedOrdersTotal + selectedUrgentJobsTotal).toFixed(2));

      const payload = {
        id: 0,
        amount: finalAmount,
        desc: `On-hand payment handover (${preparedProofFile.name})`,
        proofUrl,
        isReturn: false,
        paymentType: {
          id: 1,
        },
        paymentRecordItems,
      };

      await axiosInstance.post('/payment/create-payment-record', payload);

      swalAlert('Success', 'Payment proof submitted successfully.', 'success');
      setSelectedRows(new Set());
      setManualOrderRows([]);
      setManualUrgentRows([]);
      setEditedOrderAmounts({});
      handleClosePaymentProofModal();
      await loadOnHandOrders();
    } catch (error) {
      console.error('Payment proof submission failed:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit payment proof.');
    } finally {
      setIsSubmittingProof(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            On hand orders
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            View and manage all on-hand orders and urgent jobs.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Orders</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{stats.orderCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ShoppingBagIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Order Value <small>(LKR)</small></p>
                <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(stats.totalOrderValue)}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CurrencyDollarIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Urgent Jobs</p>
                <p className="text-3xl font-black text-amber-700 mt-1">{stats.urgentJobCount}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <BoltIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Urgent Job Value <small>(LKR)</small></p>
                <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(stats.urgentJobValue)}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <CurrencyDollarIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <label htmlFor="manual-payment-reference" className="mb-2 block text-sm font-bold text-gray-800">
                Add payment by order or urgent job code
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="manual-payment-reference"
                  type="text"
                  value={manualReferenceCode}
                  onChange={(event) => {
                    setManualReferenceCode(event.target.value.toUpperCase());
                    setManualReferenceError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleVerifyManualReference();
                    }
                  }}
                  placeholder="ORD-... or UJC-..."
                  disabled={isVerifyingManualReference || isSubmittingProof}
                  className="min-h-11 flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#F59B0F] focus:bg-white focus:ring-2 focus:ring-[#F59B0F]/15 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => { void handleVerifyManualReference(); }}
                  disabled={isVerifyingManualReference || isSubmittingProof || !manualReferenceCode.trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F59B0F] px-4 text-sm font-semibold text-white transition hover:bg-[#D17F0A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MagnifyingGlassIcon className={`h-4 w-4 ${isVerifyingManualReference ? 'animate-spin' : ''}`} />
                  {isVerifyingManualReference ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
              {manualReferenceError && (
                <p className="mt-2 text-sm font-semibold text-red-600">{manualReferenceError}</p>
              )}
            </div>

            {manualReferenceBadges.length > 0 && (
              <div className="lg:max-w-md">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Verified manual references</p>
                <div className="flex flex-wrap gap-2">
                  {manualReferenceBadges.map((item) => (
                    <span
                      key={`${item.kind}-${item.code}`}
                      className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-800"
                    >
                      {item.code}
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedRow(item.kind, item.code)}
                        disabled={isSubmittingProof}
                        className="rounded-full text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title={`Remove ${item.code}`}
                        aria-label={`Remove ${item.code}`}
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={areAllRowsSelected}
              onChange={toggleAllRows}
              disabled={allRowIds.length === 0}
              title="Select all rows in both tables"
              className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
            />
            Select all rows
          </label>
          <button
            type="button"
            onClick={() => setIsPaymentProofModalOpen(true)}
            disabled={selectedReferenceCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit Payment Proof
          </button>
          <button
            type="button"
            onClick={() => { void loadOnHandOrders(); }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-[#F59B0F] hover:bg-orange-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="inline-flex items-center rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800">
            Selected references: {selectedReferenceCount}
          </div>
        </div>

        {/* Error Message */}
        {loadError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
        {submitError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </div>

      {/* On Hand Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-gray-50 to-gray-100">
          <h2 className="text-lg font-bold text-gray-900">On Hand Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={areAllOrderRowsSelected}
                      onChange={toggleAllOrderRows}
                      title="Select all rows"
                      className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                    />
                  </label>
                </th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Order Code</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Customer</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Payment Status</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Delivery Status</th>
                <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Collective Price <small>(LKR)</small></th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (!data || (data.orderList?.length ?? 0) === 0) ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                      <p className="text-gray-600">Loading orders...</p>
                    </div>
                  </td>
                </tr>
              ) : tableOrderList.length > 0 ? (
                tableOrderList.map((order, idx) => {
                  const rowId = getOrderRowId(order, idx);
                  const isSelected = selectedRows.has(rowId);
                  const orderCode = isRecord(order.orderCode) ? order.orderCode : null;
                  const deliveryTo = isRecord(order.deliveryTo) ? order.deliveryTo : null;
                  const paymentStatus = isRecord(order.paymentStatus) ? order.paymentStatus : null;
                  const deliveryStatus = isRecord(order.deliveryStatus) ? order.deliveryStatus : null;
                  return (
                    <tr key={rowId} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-4 text-sm">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(rowId)}
                          title="Select row"
                          className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{str(orderCode?.code, order.id, `ORD-${idx + 1}`)}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <p className="font-semibold text-gray-900">{str(deliveryTo?.fullName, 'N/A')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{str(deliveryTo?.primaryMobile, deliveryTo?.secondaryMobile, '-')}</p>
                      </td>
                      <td className="text-center px-4 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(str(paymentStatus?.name, 'Unknown'), 'payment')}`}>
                          {str(paymentStatus?.name, 'Unknown')}
                        </span>
                      </td>
                      <td className="text-center px-4 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(str(deliveryStatus?.name, 'Unknown'), 'delivery')}`}>
                          {str(deliveryStatus?.name, 'Unknown')}
                        </span>
                      </td>
                      <td className="text-right px-4 py-4 text-sm font-semibold text-gray-900">{formatCurrency(Number(order.collectivePrice) || 0)}</td>
                      <td className="text-center px-4 py-4 text-sm text-gray-700">{str(order.createdAt) ? formatDateTime(String(order.createdAt)) : '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                        <ShoppingBagIcon className="w-10 h-10 text-[#F59B0F]" />
                      </div>
                      <p className="text-xl font-black text-gray-900 mb-2">No on-hand orders</p>
                      <p className="text-gray-600">No orders found in the system</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Urgent Jobs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-gray-50 to-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Urgent Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={areAllUrgentRowsSelected}
                      onChange={toggleAllUrgentRows}
                      title="Select all rows"
                      className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                    />
                  </label>
                </th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Job Code</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Job</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Customer</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Mobile</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Job Status</th>
                <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Cost <small>(LKR)</small></th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Trip (KM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (!data || (data.urgentJobList?.length ?? 0) === 0) ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                      <p className="text-gray-600">Loading urgent jobs...</p>
                    </div>
                  </td>
                </tr>
              ) : tableUrgentJobList.length > 0 ? (
                tableUrgentJobList.map((job, idx) => {
                  const rowId = getUrgentRowId(job, idx);
                  const isSelected = selectedRows.has(rowId);
                  const jobStatus = isRecord(job.jobStatus) ? job.jobStatus : null;
                  return (
                    <tr key={rowId} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-4 text-sm">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(rowId)}
                          title="Select row"
                          className="h-4 w-4 rounded border-gray-300 text-[#F59B0F] focus:ring-[#F59B0F]"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{str(job.jobCode, job.id, `UJOB-${idx + 1}`)}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-64 truncate" title={str(job.desc, job.job, 'N/A')}>
                        {str(job.job, job.desc, 'N/A')}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{str(job.username, 'N/A')}</td>
                      <td className="text-center px-4 py-4 text-sm text-gray-700">{str(job.mobile, '-')}</td>
                      <td className="text-center px-4 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(str(jobStatus?.name, 'Unknown'), 'job')}`}>
                          {str(jobStatus?.name, 'Unknown')}
                        </span>
                      </td>
                      <td className="text-right px-4 py-4 text-sm font-semibold text-gray-900">{formatCurrency(Number(job.cost) || 0)}</td>
                      <td className="text-center px-4 py-4 text-sm text-gray-700">{Number(job.trip) || 0}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                        <BoltIcon className="w-10 h-10 text-[#F59B0F]" />
                      </div>
                      <p className="text-xl font-black text-gray-900 mb-2">No urgent jobs</p>
                      <p className="text-gray-600">No urgent jobs found in the system</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentProofModal
        isOpen={isPaymentProofModalOpen}
        onClose={handleClosePaymentProofModal}
        selectedOrderRows={selectedPaymentOrderRows}
        selectedUrgentRows={selectedPaymentUrgentRows}
        collectivePrices={stats.collectiveValue}
        selectedOrdersTotal={selectedOrdersTotal}
        selectedEditedOrdersTotal={selectedEditedOrdersTotal}
        orderAmountEdits={editedOrderAmounts}
        onOrderAmountEdit={(orderCode, amount) => {
          setEditedOrderAmounts((prev) => ({
            ...prev,
            [orderCode]: Number(Number.isFinite(amount) && amount >= 0 ? amount : 0),
          }));
        }}
        onRemoveSelectedRow={handleRemoveSelectedRow}
        selectedUrgentJobsTotal={selectedUrgentJobsTotal}
        paymentProofFiles={paymentProofFiles}
        onPaymentProofFilesChange={setPaymentProofFiles}
        onSubmit={handleSubmitPaymentProof}
        isSubmitting={isSubmittingProof}
        uploadProgress={uploadProgress}
        submitError={submitError}
        formatCurrency={formatCurrency}
        isRecord={isRecord}
        str={str}
      />
    </div>
  );
}

export default OnHandOrders;
