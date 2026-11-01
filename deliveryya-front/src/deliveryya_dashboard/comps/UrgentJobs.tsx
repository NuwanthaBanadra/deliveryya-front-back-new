import {
  ArrowPathIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  XCircleIcon,
  TruckIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  FaArrowUpRightFromSquare,
  FaCircleUser,
  FaLocationDot,
  FaPhone,
  FaRoad,
  FaTruckFast,
  FaUserGroup,
} from 'react-icons/fa6';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Select, { type SingleValue } from 'react-select';
import AsyncSelect from 'react-select/async';
import Swal from 'sweetalert2';
import { debounce } from '../../util/DebounceUtil';
import axiosInstance from '../../util/AxiosUtil';
import { mapKey } from '../../util/AccessController'
import { buildDefaultGoogleMapsEmbedLink, buildGoogleMapsEmbedLinkFromUrls } from '../../util/GoogleMapsUrlUtil'
import { buildUrgentJobUpdateLink } from '../../util/UrgentJobLinkUtil';

interface EmployeeSelectOption {
  value: string | number;
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const customSelectFieldStyles: any = {
  control: (base: Record<string, unknown>, state: Record<string, unknown>) => ({
    ...base,
    padding: '0.2rem',
    borderWidth: '2px',
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    borderRadius: '0.75rem',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
    '&:hover': {
      borderColor: '#FCD34D',
    },
    transition: 'all 0.3s',
    backgroundColor: 'white',
  }),
  option: (base: Record<string, unknown>, state: Record<string, unknown>) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#F59B0F'
      : state.isFocused
        ? '#FEF3C7'
        : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#F59B0F',
    },
  }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: '#9CA3AF',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(245, 155, 15, 0.2)',
  }),
};

const str = (...vals: unknown[]): string => {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
};


interface ApiResponse<T> {
  message?: string;
  desc?: string;
  object?: T;
  exData?: unknown;
}

interface UrgentJobCheckpoint {
  id: string;
  task: string;
  location: string;
  scheduledAt: string | null;
  expectedTimeDuration: number | null;
}

interface UrgentJobRecord {
  id: string;
  job: string;
  description: string;
  username: string;
  mobile: string;
  nic: string;
  email: string;
  vehicleLabel: string;
  vehicleTypeId: number;
  vehicleId: number;
  status: string;
  jobStatusId: number;
  verificationStatusId: number;
  paymentTypeId: number;
  paymentStatusId: number;
  cost: number | null;
  jobCode: string;
  createdAt: string | null;
  scheduledAt: string | null;
  tripDistance: number | null;
  checkpoints: UrgentJobCheckpoint[];
  placedUserId?: string | number | null;
}

interface UrgentJobUpdatePayload {
  id: string;
  job: string;
  description: string;
  username: string;
  mobile: string;
  nic: string;
  email: string;
  vehicleTypeId: number;
  tripDistance: number | null;
  checkpoints: Array<{
    task: string;
    location: string;
    scheduledAt: string | null;
    expectedTimeDuration: number | null;
  }>;
}

interface UpdateFormData {
  message: string;
  vehicleTypeId: string;
  paymentTypeId: string;
  cost: string;
}

interface SelectOption {
  value: number;
  label: string;
}

interface FilterSelectOption {
  value: string;
  label: string;
}

const FETCH_PAGE_SIZE = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringValue = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
};

const getNumberValue = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

const getNestedName = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (isRecord(value)) {
      const name = getStringValue(value.name, value.label, value.title, value.status);
      if (name) {
        return name;
      }
    }
  }

  return null;
};

const getDateValue = (...values: unknown[]): string | null => {
  for (const value of values) {
    const raw = getStringValue(value);
    if (!raw) {
      continue;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
};

const formatDate = (value: string | null, includeTime = false) => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime
      ? {
        hour: '2-digit' as const,
        minute: '2-digit' as const,
      }
      : {}),
  });
};

const getGoogleMapsSearchLink = (location: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

const getGoogleMapsDirectionsLink = (checkpoints: UrgentJobCheckpoint[]) => {
  const locations = checkpoints.map((checkpoint) => checkpoint.location?.trim()).filter(Boolean) as string[];

  if (locations.length === 0) {
    return 'https://www.google.com/maps';
  }

  if (locations.length === 1) {
    return getGoogleMapsSearchLink(locations[0]);
  }

  const origin = encodeURIComponent(locations[0]);
  const destination = encodeURIComponent(locations[locations.length - 1]);
  const waypointsRaw = locations.slice(1, -1);
  const waypoints = waypointsRaw.length > 0 ? `&waypoints=${waypointsRaw.map((location) => encodeURIComponent(location)).join('%7C')}` : '';

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
};

const getStatusBadge = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes('complete') || normalized.includes('done') || normalized.includes('closed')) {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }

  if (
    normalized.includes('progress') ||
    normalized.includes('dispatch') ||
    normalized.includes('pickup') ||
    normalized.includes('accept')
  ) {
    return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  }

  if (normalized.includes('cancel') || normalized.includes('reject')) {
    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  }

  if (normalized.includes('pending') || normalized.includes('new') || normalized.includes('urgent')) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }

  return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
};

const isActiveStatus = (status: string) => {
  const normalized = status.toLowerCase();
  return !normalized.includes('complete') && !normalized.includes('cancel') && !normalized.includes('reject');
};

const getRawItems = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (!isRecord(data)) {
    return [];
  }

  if (Array.isArray(data.items)) {
    return data.items.filter(isRecord);
  }

  if (Array.isArray(data.content)) {
    return data.content.filter(isRecord);
  }

  if (Array.isArray(data.rows)) {
    return data.rows.filter(isRecord);
  }

  if (Array.isArray(data.data)) {
    return data.data.filter(isRecord);
  }

  return [];
};

const normalizeCheckpoint = (item: Record<string, unknown>, index: number): UrgentJobCheckpoint => ({
  id: getStringValue(item.id, item.jobItemId, item.checkpointId, `checkpoint-${index + 1}`) || `checkpoint-${index + 1}`,
  task: getStringValue(item.task, item.name, item.title, `Checkpoint ${index + 1}`) || `Checkpoint ${index + 1}`,
  location: getStringValue(item.locationAddress, item.location, item.address, item.mapAddress) || 'Location not available',
  scheduledAt: getDateValue(item.beAt, item.scheduledAt, item.expectedAt, item.time),
  expectedTimeDuration: getNumberValue(item.expectedTimeDuration, item.duration, item.expectedMinutes),
});

const normalizeUrgentJob = (item: Record<string, unknown>, index: number): UrgentJobRecord => {
  const checkpointsSource =
    (Array.isArray(item.items) && item.items.filter(isRecord)) ||
    (Array.isArray(item.missions) && item.missions.filter(isRecord)) ||
    (Array.isArray(item.checkpoints) && item.checkpoints.filter(isRecord)) ||
    [];

  const checkpoints = checkpointsSource.map((checkpoint, checkpointIndex) =>
    normalizeCheckpoint(checkpoint, checkpointIndex)
  );

  return {
    id: getStringValue(item.id, item.urgentJobId, item.jobId, `urgent-job-${index + 1}`) || `urgent-job-${index + 1}`,
    job: getStringValue(item.job, item.title, item.name, item.requestName, `Urgent Job ${index + 1}`) || `Urgent Job ${index + 1}`,
    description:
      getStringValue(item.decs, item.desc, item.description, item.note, item.remarks) || 'No mission description available.',
    username: getStringValue(item.username, item.userName, item.customerName, item.fullName) || 'Unknown client',
    mobile: getStringValue(item.mobile, item.phone, item.primaryMobile, item.contactNumber) || 'N/A',
    nic: getStringValue(item.nic, item.nationalId, item.nid, item.idNumber) || '',
    email: getStringValue(item.email, item.customerEmail) || 'N/A',
    vehicleLabel:
      getNestedName(item.vehicleType, item.vehicle, item.vehicleCategory) ||
      getStringValue(item.vehicleName, item.vehicleTypeName) ||
      'Unassigned',
    vehicleTypeId: getNumberValue(item.vehicleTypeId, isRecord(item.vehicleType) ? item.vehicleType.id : null) ?? 0,
    vehicleId: getNumberValue(item.vehicleId, isRecord(item.vehicle) ? item.vehicle.id : null) ?? 0,
    status:
      getNestedName(item.status, item.jobStatus, item.urgentJobStatus, item.currentStatus) ||
      getStringValue(item.state, item.jobState, item.deliveryStatus) ||
      'Pending',
    jobStatusId: getNumberValue(item.jobStatusId, isRecord(item.jobStatus) ? item.jobStatus.id : null) ?? 0,
    verificationStatusId:
      getNumberValue(item.verificationStatusId, isRecord(item.verificationStatus) ? item.verificationStatus.id : null) ?? 0,
    paymentTypeId: getNumberValue(item.paymentTypeId, isRecord(item.paymentType) ? item.paymentType.id : null) ?? 0,
    paymentStatusId: getNumberValue(item.paymentStatusId, isRecord(item.paymentStatus) ? item.paymentStatus.id : null) ?? 0,
    cost: getNumberValue(item.cost, item.price, item.totalPrice),
    jobCode: getStringValue(item.jobCode, item.code) || '',
    createdAt: getDateValue(item.createdAt, item.createdDate, item.createdOn, item.date),
    scheduledAt: getDateValue(item.scheduledAt, item.startAt, checkpoints[0]?.scheduledAt),
    tripDistance: getNumberValue(item.trip, item.distance, item.tripDistance),
    checkpoints,
    placedUserId: getStringValue(item.createdBy, item.placedUserId, item.createdById) || null,
  };
};

function UrgentJobs() {
  const navigate = useNavigate();
  const [urgentJobs, setUrgentJobs] = useState<UrgentJobRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalJob, setModalJob] = useState<UrgentJobRecord | null>(null);
  const [clientHistory, setClientHistory] = useState<UrgentJobRecord[]>([]);
  const [isLoadingClientHistory, setIsLoadingClientHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSelectOption | null>(null);
  const [assignTask, setAssignTask] = useState('');
  const [assignFormError, setAssignFormError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingEmployeeOptions, setIsLoadingEmployeeOptions] = useState(false);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [openActionMenuJobId, setOpenActionMenuJobId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateFormData>({
    message: '',
    vehicleTypeId: '0',
    paymentTypeId: '0',
    cost: '',
  });
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<SelectOption[]>([]);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState<SelectOption[]>([]);

  const setFilterValue = (
    setter: (value: string) => void,
    option: SingleValue<FilterSelectOption>,
    fallback = 'all'
  ) => {
    setter(option?.value ?? fallback);
  };

  const fetchUrgentJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        pageNumber: 0,
        countPerPage: FETCH_PAGE_SIZE,
        search: search.trim() || null,
      };

      if (selectedStatus !== 'all') {
        payload.status = selectedStatus;
      }

      if (selectedVehicle !== 'all') {
        payload.vehicle = selectedVehicle;
      }

      if (startDate) {
        payload.startDate = `${startDate}T00:00:00`;
      }

      if (endDate) {
        payload.endDate = `${endDate}T23:59:59`;
      }

      //let response;

      const response = await axiosInstance.post<ApiResponse<unknown>>('/urgent-jobs/get-urgent-jobs', payload);
      // try {
      // } catch {
      //   response = await axiosInstance.get<ApiResponse<unknown>>('/urgent-jobs/get-urgent-jobs');
      // }

      const responseObject = response.data.object;
      const responseData = getRawItems(responseObject).length > 0 ? responseObject : response.data.exData;
      const rawItems = getRawItems(responseData);
      const normalizedJobs = rawItems.map((item, index) => normalizeUrgentJob(item, index));

      setUrgentJobs(normalizedJobs);
    } catch (fetchError) {
      console.error('Error loading urgent jobs:', fetchError);
      setUrgentJobs([]);
      setError('Failed to connect to urgent jobs service.');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedStatus, selectedVehicle, startDate, endDate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchUrgentJobs();
    }, 350);

    return () => clearTimeout(timeout);
  }, [search, selectedStatus, selectedVehicle, startDate, endDate, refreshTick, fetchUrgentJobs]);

  useEffect(() => {
    const fetchSelectOptions = async () => {
      try {
        const [vehiclesResponse, paymentTypesResponse] = await Promise.all([
          axiosInstance.get<ApiResponse<Array<{ id: number | string; name?: string; code?: string }>>>(
            '/vehicles/get-vehicle-types'
          ),
          axiosInstance.get<ApiResponse<Array<{ id: number | string; name?: string; code?: string }>>>(
            '/payment/get-payment-types'
          ),
        ]);

        const vehicles = Array.isArray(vehiclesResponse.data.object) ? vehiclesResponse.data.object : [];
        const paymentTypes = Array.isArray(paymentTypesResponse.data.object) ? paymentTypesResponse.data.object : [];

        setVehicleTypeOptions(
          vehicles.map((item) => ({
            value: Number(item.id ?? 0),
            label: String(item.name ?? item.code ?? item.id ?? ''),
          }))
        );

        setPaymentTypeOptions(
          paymentTypes.map((item) => ({
            value: Number(item.id ?? 0),
            label: String(item.name ?? item.code ?? item.id ?? ''),
          }))
        );
      } catch (optionsError) {
        console.error('Failed to load urgent job update options:', optionsError);
        setVehicleTypeOptions([]);
        setPaymentTypeOptions([]);
      }
    };

    void fetchSelectOptions();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, selectedStatus, selectedVehicle, startDate, endDate, pageSize]);

  const statusFilterOptions = useMemo<FilterSelectOption[]>(() => {
    const dynamicOptions = Array.from(new Set(urgentJobs.map((job) => job.status)))
      .filter(Boolean)
      .map((status) => ({ value: status, label: status }));

    return [{ value: 'all', label: 'All statuses' }, ...dynamicOptions];
  }, [urgentJobs]);

  const vehicleFilterOptions = useMemo<FilterSelectOption[]>(() => {
    const dynamicOptions = Array.from(new Set(urgentJobs.map((job) => job.vehicleLabel)))
      .filter(Boolean)
      .map((vehicle) => ({ value: vehicle, label: vehicle }));

    return [{ value: 'all', label: 'All vehicles' }, ...dynamicOptions];
  }, [urgentJobs]);

  const filteredJobs = urgentJobs;

  useEffect(() => {
    if (filteredJobs.length === 0) {
      setSelectedJobId(null);
      return;
    }

    const hasCurrentSelection = filteredJobs.some((job) => job.id === selectedJobId);
    if (!hasCurrentSelection) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const summary = useMemo(() => {
    const totalJobs = filteredJobs.length;
    const activeJobs = filteredJobs.filter((job) => isActiveStatus(job.status)).length;
    const completedJobs = filteredJobs.filter((job) => job.status.toLowerCase().includes('complete')).length;
    const totalCheckpoints = filteredJobs.reduce((sum, job) => sum + job.checkpoints.length, 0);

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      totalCheckpoints,
    };
  }, [filteredJobs]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  const paginatedJobs = useMemo(() => {
    const start = page * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, page, pageSize]);

  const showingRange = useMemo(() => {
    if (filteredJobs.length === 0) {
      return { from: 0, to: 0 };
    }

    const from = page * pageSize + 1;
    const to = Math.min(filteredJobs.length, (page + 1) * pageSize);
    return { from, to };
  }, [filteredJobs.length, page, pageSize]);

  const selectedJob = useMemo(
    () => filteredJobs.find((job) => job.id === selectedJobId) ?? paginatedJobs[0] ?? null,
    [filteredJobs, paginatedJobs, selectedJobId]
  );

  const [locationUrls, setLocationUrls] = useState<string[]>([]);
  const defaultEmbedLink = useMemo(() => buildDefaultGoogleMapsEmbedLink(mapKey), []);
  const [embeddedLink, setEmbeddedLink] = useState<string>(defaultEmbedLink);
  const [isEmbedLoading, setIsEmbedLoading] = useState(false);

  useEffect(() => {
    const locations = modalJob?.checkpoints.map((cp) => cp.location).filter(Boolean) ?? [];
    setLocationUrls(locations);
  }, [modalJob]);

  useEffect(() => {
    const controller = new AbortController();

    if (locationUrls.length === 0) {
      setEmbeddedLink(defaultEmbedLink);
      setIsEmbedLoading(false);
      return () => controller.abort();
    }

    setIsEmbedLoading(true);

    void buildGoogleMapsEmbedLinkFromUrls(locationUrls, mapKey, controller.signal)
      .then((nextLink) => {
        if (!controller.signal.aborted) {
          setEmbeddedLink(nextLink);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setEmbeddedLink(defaultEmbedLink);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsEmbedLoading(false);
        }
      });

    return () => controller.abort();
  }, [defaultEmbedLink, locationUrls]);

  const openMissionModal = (job: UrgentJobRecord) => {
    setSelectedJobId(job.id);
    setModalJob(job);
    setUpdateForm({
      message: job.description,
      vehicleTypeId: String(job.vehicleTypeId || 0),
      paymentTypeId: String(job.paymentTypeId || 0),
      cost: job.cost !== null ? String(job.cost) : '',
    });
    setIsMissionModalOpen(true);
    void fetchClientHistory(job.placedUserId ?? null);
  };

  const openRejectModal = (job: UrgentJobRecord) => {
    setSelectedJobId(job.id);
    setModalJob(job);
    setRejectReason('');
    setRejectError(null);
    setIsRejectModalOpen(true);
  };

  const openAssignModal = (job: UrgentJobRecord) => {
    setSelectedJobId(job.id);
    setModalJob(job);
    setSelectedEmployee(null);
    setAssignTask('');
    setAssignFormError(null);
    setIsAssignModalOpen(true);
  };

  const debouncedLoadEmployees = useMemo(
    () => debounce(async (inputValue: string, callback: (options: EmployeeSelectOption[]) => void) => {
      const query = inputValue.trim();
      if (query.length < 2) {
        callback([]);
        return;
      }

      setIsLoadingEmployeeOptions(true);
      try {
        const res = await axiosInstance.post<{ object?: unknown }>('/users/get-users', {
          pageNumber: 0,
          countPerPage: 50,
          search: query,
          isActive: true,
          isEmployee: true,
        });

        const obj = res.data?.object;
        const rows = (isRecord(obj) && Array.isArray(obj.items) ? obj.items : []).filter(isRecord);

        callback(rows.map((item, i) => {
          const firstName = str(item.firstName, item.fname) || '';
          const lastName = str(item.lastName, item.lname) || '';
          const fullName = [firstName, lastName].filter(Boolean).join(' ') || str(item.fullName, item.username) || `Employee ${i + 1}`;
          const mobile = str(item.mobile, item.phone) || 'N/A';
          const employeeId = str(item.id, item.employeeId) || `emp-search-${i}`;

          return {
            value: employeeId,
            label: `${fullName}${mobile !== 'N/A' ? ` - ${mobile}` : ''}`,
          };
        }));
      } catch (error) {
        console.error('Error loading employees:', error);
        callback([]);
      } finally {
        setIsLoadingEmployeeOptions(false);
      }
    }, 400),
    []
  );

  const loadEmployeeOptions = useCallback(
    (inputValue: string, callback: (options: EmployeeSelectOption[]) => void) => {
      debouncedLoadEmployees(inputValue, callback);
    },
    [debouncedLoadEmployees]
  );

  const fetchClientHistory = useCallback(async (userId: string | number | null) => {
    if (!userId) {
      setClientHistory([]);
      return;
    }

    setIsLoadingClientHistory(true);
    try {
      const payload: Record<string, unknown> = {
        pageNumber: 0,
        countPerPage: 50,
        placedUserId: Number(userId) || String(userId),
      };

      const response = await axiosInstance.post<ApiResponse<unknown>>('/urgent-jobs/get-urgent-jobs', payload);


      const responseObject = response.data.object;
      const responseData = getRawItems(responseObject).length > 0 ? responseObject : response.data.exData;
      const rawItems = getRawItems(responseData);
      const normalized = rawItems.map((item, idx) => normalizeUrgentJob(item, idx));
      setClientHistory(normalized);
    } catch (err) {
      console.error('Failed to load client history:', err);
      setClientHistory([]);
    } finally {
      setIsLoadingClientHistory(false);
    }
  }, []);

  const handleAssignSubmit = async () => {
    if (!modalJob || !selectedEmployee) {
      setAssignFormError('Please select an employee.');
      return;
    }
    if (!assignTask.trim()) {
      setAssignFormError('Please enter a task.');
      return;
    }

    setAssignFormError(null);
    setIsAssigning(true);
    try {
      const assignmentTasks = modalJob.checkpoints
        .map((checkpoint) => ({
          task: checkpoint.task?.trim() || assignTask.trim(),
          location: checkpoint.location?.trim() || 'Location not specified',
          ...(checkpoint.scheduledAt ? { beAt: checkpoint.scheduledAt } : {}),
        }))
        .filter((item) => item.task && item.location);

      const body: Record<string, unknown> = {
        userId: Number(selectedEmployee.value) || selectedEmployee.value,
        urgentJobId: Number(modalJob.id) || modalJob.id,
        task: assignTask.trim(),
        tasks:
          assignmentTasks.length > 0
            ? assignmentTasks
            : [
              {
                task: assignTask.trim(),
                location: 'Location not specified',
              },
            ],
      };

      await axiosInstance.post('/agent-jobs/set-agent-job', body);
      setIsAssignModalOpen(false);
      setModalJob(null);
      setRefreshTick((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving assignment:', error);
      setAssignFormError('Failed to save the assignment. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const copyUrgentJobUpdateLink = async (jobCode: string) => {
    const link = buildUrgentJobUpdateLink(jobCode);

    try {
      await navigator.clipboard.writeText(link);
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Urgent job link copied',
        showConfirmButton: false,
        timer: 1500,
        background: '#f9fafb',
        color: '#111827',
      });
    } catch {
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Failed to copy link',
        showConfirmButton: false,
        timer: 1500,
        background: '#fef2f2',
        color: '#7f1d1d',
      });
    }
  };

  const closeAllModals = () => {
    setIsMissionModalOpen(false);
    setIsRejectModalOpen(false);
    setIsAssignModalOpen(false);
    setOpenActionMenuJobId(null);
    setModalJob(null);
    setRejectError(null);
    setAssignFormError(null);
  };

  const openUpdatePage = (job: UrgentJobRecord) => {
    const payload: UrgentJobUpdatePayload = {
      id: job.id,
      job: job.job,
      description: job.description,
      username: job.username,
      mobile: job.mobile,
      nic: job.nic,
      email: job.email,
      vehicleTypeId: job.vehicleTypeId,
      tripDistance: job.tripDistance,
      checkpoints: job.checkpoints.map((checkpoint) => ({
        task: checkpoint.task,
        location: checkpoint.location,
        scheduledAt: checkpoint.scheduledAt,
        expectedTimeDuration: checkpoint.expectedTimeDuration,
      })),
    };

    navigate('/urgent-job-update', {
      state: {
        prefill: payload,
      },
    });
  };

  const handleUpdateSubmit = async () => {
    if (!modalJob) return;

    setIsSavingUpdate(true);

    const parsedCost = updateForm.cost.trim() === '' ? null : Number(updateForm.cost);
    const nextCost = Number.isFinite(parsedCost) ? parsedCost : modalJob.cost ?? 0;
    const parsedVehicleTypeId = Number(updateForm.vehicleTypeId);
    const nextVehicleTypeId = Number.isFinite(parsedVehicleTypeId) ? parsedVehicleTypeId : modalJob.vehicleTypeId;
    const parsedPaymentTypeId = Number(updateForm.paymentTypeId);
    const nextPaymentTypeId = Number.isFinite(parsedPaymentTypeId) ? parsedPaymentTypeId : modalJob.paymentTypeId;

    const selectedVehicleType = vehicleTypeOptions.find((option) => option.value === nextVehicleTypeId);

    const payload = {
      id: Number(modalJob.id) || 0,
      message: updateForm.message.trim() || modalJob.description,
      jobStatusId: modalJob.jobStatusId,
      vehicleId: modalJob.vehicleId,
      verificationStatusId: modalJob.verificationStatusId,
      cost: nextCost,
      trip: modalJob.tripDistance ?? 0,
      vehicleTypeId: nextVehicleTypeId,
      paymentTypeId: nextPaymentTypeId,
      paymentStatusId: modalJob.paymentStatusId,
    };

    try {
      await axiosInstance.post('/urgent-jobs/update-urgent-job-confidential-data', payload);

      setUrgentJobs((prev) =>
        prev.map((job) =>
          job.id === modalJob.id
            ? {
              ...job,
              description: payload.message || job.description,
              vehicleTypeId: payload.vehicleTypeId,
              paymentTypeId: payload.paymentTypeId,
              cost: payload.cost,
              vehicleLabel: selectedVehicleType?.label || job.vehicleLabel,
            }
            : job
        )
      );

      setModalJob((prev) =>
        prev
          ? {
            ...prev,
            description: payload.message,
            vehicleTypeId: payload.vehicleTypeId,
            paymentTypeId: payload.paymentTypeId,
            cost: payload.cost,
            vehicleLabel: selectedVehicleType?.label || prev.vehicleLabel,
          }
          : prev
      );

      setIsMissionModalOpen(false);
      setModalJob(null);
      setRefreshTick((prev) => prev + 1);
    } catch {
      // Keep modal open when backend update fails so user can retry.
    } finally {
      setIsSavingUpdate(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!modalJob) return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectError('Please enter a rejection reason.');
      return;
    }

    setIsSubmittingReject(true);
    setRejectError(null);

    const payload = {
      id: modalJob.id,
      reason: trimmedReason,
    };

    try {
      try {
        await axiosInstance.post('/urgent-jobs/reject-urgent-job', payload);
      } catch {
        // Apply local rejected state when backend endpoint is not available.
      }

      setUrgentJobs((prev) =>
        prev.map((job) =>
          job.id === modalJob.id
            ? {
              ...job,
              status: 'Rejected',
              description: `${job.description}\n\nRejected Reason: ${trimmedReason}`,
            }
            : job
        )
      );

      closeAllModals();
    } finally {
      setIsSubmittingReject(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 overflow-x-clip">
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
          <div>
            {/* <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-red-600 ring-1 ring-red-200">
              <BoltIcon className="h-4 w-4" />
              Urgent Operations
            </div> */}
            <h1 className="mt-3 text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
              Urgent Job Management
            </h1>
            <p className="text-gray-600 text-sm md:text-base mt-2 max-w-3xl">
              Monitor priority missions, review checkpoint flow, and keep urgent dispatch work visible from one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
            <button
              onClick={() => setRefreshTick((prev) => prev + 1)}
              disabled={isLoading}
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {/* <Link
              to="/urgent-job"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
            >
              <BoltIcon className="w-4 h-4" />
              Create Urgent Job
            </Link> */}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Jobs</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{summary.totalJobs}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <BoltIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Active Missions</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{summary.activeJobs}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ClockIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Completed</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{summary.completedJobs}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <TruckIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Checkpoints</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{summary.totalCheckpoints}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <MapPinIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by mission, client, contact, status or checkpoint..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm md:text-base"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Status</label>
              <Select<FilterSelectOption, false>
                value={statusFilterOptions.find((option) => option.value === selectedStatus) ?? statusFilterOptions[0]}
                onChange={(option) => setFilterValue(setSelectedStatus, option)}
                options={statusFilterOptions}
                isClearable={false}
                styles={customSelectFieldStyles}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Vehicle</label>
              <Select<FilterSelectOption, false>
                value={vehicleFilterOptions.find((option) => option.value === selectedVehicle) ?? vehicleFilterOptions[0]}
                onChange={(option) => setFilterValue(setSelectedVehicle, option)}
                options={vehicleFilterOptions}
                isClearable={false}
                styles={customSelectFieldStyles}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Created from</label>
              <div className="relative">
                <CalendarDaysIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  max={endDate || undefined}
                  aria-label="Filter urgent jobs from date"
                  title="Filter urgent jobs from date"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">Created to</label>
              <div className="relative">
                <CalendarDaysIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
                  aria-label="Filter urgent jobs to date"
                  title="Filter urgent jobs to date"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('all');
                setSelectedVehicle('all');
                setStartDate('');
                setEndDate('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
            >
              Reset Filters
            </button>
            <div className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
              Priority jobs should stay visible to dispatch and delivery teams.
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700">
              {isLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                <>
                  Showing <span className="font-bold text-gray-900">{showingRange.from}</span> to{' '}
                  <span className="font-bold text-gray-900">{showingRange.to}</span> of{' '}
                  <span className="font-bold text-gray-900">{filteredJobs.length}</span> urgent jobs
                </>
              )}
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  aria-label="Urgent jobs rows per page"
                  title="Urgent jobs rows per page"
                  className="px-3 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-gray-800 font-semibold text-sm focus:outline-none focus:border-[#F59B0F]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0 || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                  title="Previous page"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                  {page + 1} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                  title="Next page"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
          <p className="font-bold">Error loading urgent jobs</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Mission</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Client</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Vehicle</th>
                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Created</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Stops</th>
                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center">
                      <ArrowPathIcon className="w-10 h-10 text-[#F59B0F] animate-spin mb-4" />
                      <p className="text-gray-600">Loading urgent jobs...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;

                  return (
                    <tr
                      key={job.id}
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setOpenActionMenuJobId(null);
                      }}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-orange-50/70' : 'hover:bg-orange-50/40'}`}
                    >
                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900">{job.job}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Code: {job.jobCode}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-gray-900 text-sm">{job.username}</p>
                        <a href={`tel:${job.mobile}`} className="text-xs text-gray-500 mt-1 underline underline-offset-3" >{job.mobile}</a>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">{job.vehicleLabel}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">{formatDate(job.createdAt, true)}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadge(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-gray-900">{job.checkpoints.length}</td>
                      <td className="py-4 px-4 flex items-center">
                        <div className="relative flex items-center justify-end gap-2 mx-auto">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openMissionModal(job);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all"
                            title="View selected mission"
                          >
                            <EyeIcon className="w-4 h-4" />

                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAssignModal(job);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-xs font-bold hover:bg-orange-100 transition-all"
                            title="Assign employee to selected job"
                          >
                            <UserGroupIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyUrgentJobUpdateLink(job.jobCode);
                            }}
                            disabled={!job.jobCode}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            title="Copy urgent job update link"
                            aria-label="Copy urgent job update link"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </button>

                          {/* <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openUpdatePage(job);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-all"
                            title="View and update selected job"
                          >
                            <PencilSquareIcon className="w-4 h-4" />

                          </button> */}

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionMenuJobId((current) => (current === job.id ? null : job.id));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all"
                            title="More actions"
                            aria-label="More actions"
                          >
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </button>

                          {openActionMenuJobId === job.id && (
                            <div
                              className="absolute right-0 top-full z-20 mt-2 w-36 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
                              onClick={(event) => event.stopPropagation()}
                              role="menu"
                              aria-label="More urgent job actions"
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenActionMenuJobId(null);
                                  openRejectModal(job);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
                                role="menuitem"
                              >
                                <XCircleIcon className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {!isLoading && paginatedJobs.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                  <BoltIcon className="w-10 h-10 text-[#F59B0F]" />
                </div>
                <p className="text-xl font-black text-gray-900 mb-2">No urgent jobs found</p>
                <p className="text-gray-600 mb-6">Try adjusting the filters or create a new urgent mission.</p>
                <Link
                  to="/urgent-job"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
                >
                  <BoltIcon className="w-4 h-4" />
                  Open Urgent Job Form
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMissionModalOpen && modalJob && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl">
            {/* Header mapped from Accounts style but keeping creativity */}
            <div className="relative bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#9A5F11] px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6 md:px-7">
              <div className="pointer-events-none absolute -left-16 -top-14 h-40 w-40 rounded-full bg-orange-300/40 blur-2xl" />
              <div className="pointer-events-none absolute -right-10 top-3 h-24 w-24 rounded-full bg-amber-300/40 blur-xl" />

              <button
                type="button"
                onClick={closeAllModals}
                className="absolute right-4 top-4 z-20 rounded-full bg-white/20 p-1.5 text-white shadow-sm transition hover:bg-white/30"
                title="Close mission view"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-100">Mission Details</p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white md:text-3xl">{modalJob.job}</h2>
                  <p className="mt-1 text-sm text-orange-100">All urgent job information and actions in one place.</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
                  <span className={`inline-flex items-center self-start rounded-xl px-3 py-1.5 text-xs font-bold bg-white text-gray-800 w-fit`}>
                    {modalJob.status}
                  </span>
                  <a
                    href={getGoogleMapsDirectionsLink(modalJob.checkpoints)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                    title="Open full route in Google Maps"
                  >
                    <FaLocationDot className="h-3.5 w-3.5" />
                    Open Route
                    <FaArrowUpRightFromSquare className="h-3 w-3" />
                  </a>
                  <a
                    href={`tel:${modalJob.mobile}`}
                    className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                  >
                    <FaPhone className="h-3.5 w-3.5" />
                    Call Now
                  </a>
                </div>
              </div>
            </div>

            <div
              className="scrollbar-hover-only overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 md:px-7 bg-gray-50/50"
              style={{ maxHeight: 'calc(92vh - 140px)' }}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Client</p>
                  <div className="mt-2 flex items-center gap-2 text-gray-900">
                    <FaCircleUser className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-semibold">{modalJob.username}</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">{modalJob.mobile}</p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Vehicle</p>
                  <div className="mt-2 flex items-center gap-2 text-gray-900">
                    <FaTruckFast className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold">{modalJob.vehicleLabel}</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Scheduled: {formatDate(modalJob.scheduledAt, true)}</p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Trip</p>
                  <div className="mt-2 flex items-center gap-2 text-gray-900">
                    <FaRoad className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-semibold">
                      {modalJob.tripDistance !== null ? `${modalJob.tripDistance} km` : 'Not specified'}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">Stops: {modalJob.checkpoints.length}</p>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Cost</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {modalJob.cost !== null ? `${modalJob.cost.toLocaleString()} LKR` : 'Not specified'}
                  </p>
                  <p className="mt-2 text-xs text-gray-600">Job code: {modalJob.jobCode || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-3">
                <section className="space-y-5 md:col-span-2">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Mission Description</p>
                    <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-gray-700 md:text-base">{modalJob.description}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Checkpoint Flow</p>
                        <h3 className="mt-1 text-lg font-black text-gray-900">Mission Timeline</h3>
                      </div>
                      <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
                        <FaLocationDot className="h-4 w-4" />
                        {modalJob.checkpoints.length} stops
                      </div>
                    </div>

                    <div className="space-y-3">
                      {modalJob.checkpoints.length > 0 ? (
                        modalJob.checkpoints.map((checkpoint, index) => (
                          <div key={checkpoint.id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 font-black text-white shadow-lg shadow-orange-500/20">
                                  {index + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-base font-bold text-gray-900 wrap-break-word">{checkpoint.task}</p>
                                  <a
                                    href={getGoogleMapsSearchLink(checkpoint.location)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex max-w-full items-start gap-2 text-sm text-blue-700 hover:text-blue-900 wrap-break-word"
                                    title="Open checkpoint location in Google Maps"
                                  >
                                    <FaLocationDot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="min-w-0 wrap-break-word underline decoration-dotted underline-offset-2">{checkpoint.location}</span>
                                    <FaArrowUpRightFromSquare className="mt-0.5 h-3 w-3 shrink-0" />
                                  </a>
                                </div>
                              </div>

                              <div className="text-sm text-gray-600 md:text-right md:shrink-0">
                                <p>{formatDate(checkpoint.scheduledAt, true)}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Duration: {checkpoint.expectedTimeDuration !== null ? `${checkpoint.expectedTimeDuration} min` : 'Not set'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                          No checkpoint details were returned for this urgent job.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative h-80 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm md:h-112">
                    <iframe
                      className="h-full w-full rounded-2xl"
                      style={{ border: 0 }}
                      src={embeddedLink}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Delivery route preview"
                    ></iframe>
                    {isEmbedLoading && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
                        <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 shadow-lg shadow-orange-100/50">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                          <p className="text-sm font-medium text-gray-700">Updating route preview...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="space-y-5">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Dispatch Snapshot</p>
                    <h3 className="mt-2 text-xl font-black text-gray-900">Contact And Ops</h3>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                            <FaUserGroup className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Primary contact</p>
                            <p className="text-sm text-gray-600">{modalJob.username}</p>
                          </div>
                        </div>
                      </div>

                      <a
                        href={`tel:${modalJob.mobile}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-all hover:border-[#F59B0F] hover:bg-orange-50"
                      >
                        <FaPhone className="h-4 w-4" />
                        Call Client
                      </a>

                      <p className="text-xs text-gray-500">Created: {formatDate(modalJob.createdAt, true)}</p>
                      <p className="text-xs text-gray-500">Email: {modalJob.email || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5">
                    <p className="text-sm font-semibold text-gray-900">Confidential Update</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vehicle Type</label>
                        <select
                          value={updateForm.vehicleTypeId}
                          onChange={(event) => setUpdateForm((prev) => ({ ...prev, vehicleTypeId: event.target.value }))}
                          className="mt-2 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-[#F59B0F] focus:outline-none"
                          title="Vehicle type"
                        >
                          <option value="0">Select vehicle type</option>
                          {vehicleTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Type</label>
                        <select
                          value={updateForm.paymentTypeId}
                          onChange={(event) => setUpdateForm((prev) => ({ ...prev, paymentTypeId: event.target.value }))}
                          className="mt-2 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-[#F59B0F] focus:outline-none"
                          title="Payment type"
                        >
                          <option value="0">Select payment type</option>
                          {paymentTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cost</label>
                        <input
                          value={updateForm.cost}
                          onChange={(event) => setUpdateForm((prev) => ({ ...prev, cost: event.target.value }))}
                          placeholder="Enter job cost"
                          className="mt-2 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-[#F59B0F] focus:outline-none"
                          title="Urgent job cost"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</label>
                        <textarea
                          value={updateForm.message}
                          onChange={(event) => setUpdateForm((prev) => ({ ...prev, message: event.target.value }))}
                          rows={3}
                          className="mt-2 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-[#F59B0F] focus:outline-none"
                          title="Urgent job message"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleUpdateSubmit}
                        disabled={isSavingUpdate}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-60"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                        {isSavingUpdate ? 'Saving...' : 'Save Confidential Update'}
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
              <div className="mt-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">Client History</p>
                {isLoadingClientHistory ? (
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-700">Loading client history...</div>
                ) : clientHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">No previous urgent jobs found for this client.</div>
                ) : (
                  <div className="space-y-2">
                    {clientHistory.map((cj) => (
                      <div key={cj.id} className="rounded-xl border border-gray-100 bg-white">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedHistoryId((cur) => (cur === String(cj.id) ? null : String(cj.id)));
                          }}
                          className="w-full p-3 flex items-center justify-between text-left"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900">{cj.job}</p>
                            <p className="text-xs text-gray-500">{cj.jobCode || '—'} • {cj.status}</p>
                          </div>
                          <div className="text-right text-xs text-gray-500">{formatDate(cj.createdAt, true)}</div>
                        </button>

                        <div
                          className={`border-t border-gray-100 bg-gray-50 p-3 overflow-hidden transform transition-all duration-300 ${expandedHistoryId === String(cj.id) ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'
                            }`}
                          aria-hidden={expandedHistoryId !== String(cj.id)}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{cj.description}</p>

                              <div className="mt-3 space-y-2 text-sm text-gray-600">
                                <div>Client: <span className="font-semibold text-gray-900">{cj.username}</span></div>
                                <div>Mobile: <span className="font-semibold text-gray-900">{cj.mobile}</span></div>
                                <div>Email: <span className="font-semibold text-gray-900">{cj.email || 'N/A'}</span></div>
                                <div>Job code: <span className="font-semibold text-gray-900">{cj.jobCode || '—'}</span></div>
                                <div>Created: <span className="font-semibold text-gray-900">{formatDate(cj.createdAt, true)}</span></div>
                                <div>Cost: <span className="font-semibold text-gray-900">{cj.cost !== null ? `${cj.cost.toLocaleString()} LKR` : 'N/A'}</span></div>
                                <div>Vehicle: <span className="font-semibold text-gray-900">{cj.vehicleLabel}</span></div>
                                <div>Trip: <span className="font-semibold text-gray-900">{cj.tripDistance !== null ? `${cj.tripDistance} km` : 'N/A'}</span></div>
                              </div>

                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openMissionModal(cj)}
                                  className="px-3 py-1.5 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white text-sm font-semibold"
                                >
                                  Open job
                                </button>
                                <a
                                  href={getGoogleMapsDirectionsLink(cj.checkpoints)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-amber-600"
                                >
                                  Open route
                                </a>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-2">Stops</p>
                              <div className="space-y-2">
                                {cj.checkpoints.slice(0, 5).map((cp, i) => (
                                  <div key={cp.id} className="rounded-lg border border-gray-100 bg-white p-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900">{i + 1}. {cp.task}</p>
                                        <p className="text-xs text-gray-500">{cp.location}</p>
                                      </div>
                                      <div className="text-xs text-gray-500">{formatDate(cp.scheduledAt, true)}</div>
                                    </div>
                                  </div>
                                ))}
                                {cj.checkpoints.length > 5 && (
                                  <div className="text-xs text-gray-500">Showing 5 of {cj.checkpoints.length} stops</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isRejectModalOpen && modalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
            <button
              type="button"
              onClick={closeAllModals}
              className="absolute right-4 top-4 rounded-full bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-100"
              title="Close reject dialog"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            <div className="bg-linear-to-r from-red-50 via-rose-50 to-white px-6 py-5 border-b border-red-100">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Critical Action</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">Reject Urgent Job</h3>
              <p className="text-sm text-gray-600 mt-1">Provide a reason to reject {modalJob.job}.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                <p className="text-sm text-red-700 font-semibold">This action will mark the job as rejected in the dashboard.</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  rows={4}
                  placeholder="State why this urgent job is rejected..."
                  className="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:outline-none focus:border-red-400"
                  title="Rejection reason"
                />
                <div className="mt-2 flex items-center justify-between">
                  {rejectError ? <p className="text-xs text-red-600">{rejectError}</p> : <span className="text-xs text-gray-400">Minimum 1 character required</span>}
                  <span className="text-xs text-gray-400">{rejectReason.trim().length} chars</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeAllModals}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={isSubmittingReject}
                className="px-4 py-2 rounded-xl bg-linear-to-r from-red-600 to-red-700 text-white font-semibold hover:shadow-lg disabled:opacity-60"
              >
                {isSubmittingReject ? 'Rejecting...' : 'Reject Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAssignModalOpen && modalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="relative bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-6 pb-5 pt-6">
              <button
                type="button"
                onClick={closeAllModals}
                className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                title="Close assignment modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Urgent Mission</p>
                  <h3 className="text-xl font-black text-white">Assign Employee</h3>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="space-y-4">
                {assignFormError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                    <p className="text-sm text-red-700 font-semibold">{assignFormError}</p>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">Employee</p>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadEmployeeOptions}
                    value={selectedEmployee}
                    onChange={(option) => setSelectedEmployee(option as EmployeeSelectOption)}
                    placeholder="Search and select employee"
                    isLoading={isLoadingEmployeeOptions}
                    styles={customSelectFieldStyles}
                    isClearable
                    className="text-sm"
                  />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    <ClipboardDocumentListIcon className="h-3.5 w-3.5" /> Task Message
                  </label>
                  <textarea
                    value={assignTask}
                    onChange={(event) => setAssignTask(event.target.value)}
                    rows={3}
                    placeholder={`Describe the task for ${modalJob.job}...`}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#F59B0F] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAllModals}
                    className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignSubmit}
                    disabled={isAssigning}
                    className="px-5 py-2.5 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg disabled:opacity-60 transition-all flex items-center gap-2 text-sm"
                  >
                    {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default UrgentJobs;