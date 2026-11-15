import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useMemo, useState } from 'react';
import AsyncSelect from 'react-select/async';
import MapLocationModal from '../addOrders/MapLocationModal';
import axiosInstance from '../../../util/AxiosUtil';
import { debounce } from '../../../util/DebounceUtil';
import JwtUtil from '../../../util/JwtUtil';
import type { EmployeeSelectOption } from './types';

interface NewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SubJobFormItem {
  task: string;
  location: string;
  beAt: string;
}

const customSelectFieldStyles = {
  control: (base: any, state: any) => ({
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
  option: (base: any, state: any) => ({
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
  placeholder: (base: any) => ({
    ...base,
    color: '#9CA3AF',
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(245, 155, 15, 0.2)',
  }),
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (...vals: unknown[]): string => {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
};

const getRoleId = (item: Record<string, unknown>): number | null => {
  const role = isRecord(item.userRole) ? item.userRole : null;
  const roleIdRaw = str(item.userRoleId, role?.id);
  const parsed = Number(roleIdRaw);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAgentJobsScope = (): { roleId: number | null; userId: number | null } => {
  const token = localStorage.getItem('jwtToken');
  if (!token) return { roleId: null, userId: null };

  const decoded = JwtUtil.decodeToken(token);
  if (!decoded) return { roleId: null, userId: null };

  const roleId = Number(decoded.roleId);
  const localUserId = Number(localStorage.getItem('userId'));
  const jwtUserId = Number(decoded.userId);
  const effectiveUserId = Number.isFinite(localUserId) && localUserId > 0
    ? localUserId
    : (Number.isFinite(jwtUserId) && jwtUserId > 0 ? jwtUserId : null);

  const isLimitedRole = roleId === 5 || roleId === 6 || roleId === 7;
  return {
    roleId: Number.isFinite(roleId) ? roleId : null,
    userId: isLimitedRole ? effectiveUserId : null,
  };
};

function NewAssignmentModal({ isOpen, onClose, onSuccess }: NewAssignmentModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSelectOption | null>(null);
  const [task, setTask] = useState('');
  const [subJobs, setSubJobs] = useState<SubJobFormItem[]>([{ task: '', location: '', beAt: '' }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEmployeeOptions, setIsLoadingEmployeeOptions] = useState(false);
  
  // Map modal states
  const [subJobMapModalIndex, setSubJobMapModalIndex] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    setSelectedEmployee(null);
    setTask('');
    setSubJobs([{ task: '', location: '', beAt: '' }]);
    setFormError(null);
    setIsSaving(false);
    setIsLoadingEmployeeOptions(false);
    setSubJobMapModalIndex(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

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

  const handleSave = useCallback(async () => {
    if (!selectedEmployee) {
      setFormError('Please select an employee.');
      return;
    }
    if (!task.trim()) {
      setFormError('Please enter a task.');
      return;
    }

    const normalizedSubJobs = subJobs
      .map((item) => ({
        task: item.task.trim(),
        location: item.location.trim(),
        beAt: item.beAt,
      }))
      .filter((item) => item.task || item.location || item.beAt);

    if (normalizedSubJobs.length === 0) {
      setFormError('Please add at least one sub job.');
      return;
    }

    const hasInvalidSubJob = normalizedSubJobs.some((item) => !item.task || !item.location);
    if (hasInvalidSubJob) {
      setFormError('Each sub job needs both task and location.');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        userId: Number(selectedEmployee.value) || selectedEmployee.value,
        urgentJobId: null,
        task: task.trim(),
        tasks: normalizedSubJobs.map((item) => ({
          task: item.task,
          location: item.location,
          ...(item.beAt ? { beAt: item.beAt } : {}),
        })),
      };

      await axiosInstance.post('/agent-jobs/set-agent-job', body);
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving assignment:', error);
      setFormError('Failed to save the assignment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [onSuccess, resetForm, selectedEmployee, subJobs, task]);

  const addSubJob = useCallback(() => {
    setSubJobs((prev) => [...prev, { task: '', location: '', beAt: '' }]);
  }, []);

  const removeSubJob = useCallback((index: number) => {
    setSubJobs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateSubJobField = useCallback((index: number, field: keyof SubJobFormItem, value: string) => {
    setSubJobs((prev) => prev.map((item, i) => (
      i === index
        ? { ...item, [field]: value }
        : item
    )));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
            title="Close assignment modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <PencilSquareIcon className="h-6 w-6 text-white" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">New Job</p>
              <h3 className="text-xl font-black text-white">Create Assignment</h3>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 pr-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-500/80 [&::-webkit-scrollbar-thumb:hover]:bg-amber-600">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">Employee</p>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadEmployeeOptions}
              value={selectedEmployee}
              onChange={(option) => setSelectedEmployee(option)}
              placeholder="Search and select employee"
              isLoading={isLoadingEmployeeOptions}
              styles={customSelectFieldStyles}
              isClearable
              className="text-sm"
            />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <ClipboardDocumentListIcon className="h-3.5 w-3.5" /> Task
            </label>
            <textarea
              value={task}
              onChange={(event) => setTask(event.target.value)}
              rows={3}
              placeholder="Describe the task to perform"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-[#F59B0F] focus:outline-none"
            />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Sub Jobs</p>
              <button
                type="button"
                onClick={addSubJob}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <PlusCircleIcon className="h-4 w-4" />
                Add Sub Job
              </button>
            </div>

            <div className="space-y-3">
              {subJobs.map((item, index) => (
                <div key={`sub-job-${index}`} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500">Sub Job {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeSubJob(index)}
                      disabled={subJobs.length <= 1}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <label
                        htmlFor={`sub-job-task-${index}`}
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400"
                      >
                        <ClipboardDocumentListIcon className="h-3.5 w-3.5" /> Task
                      </label>
                      <input
                        id={`sub-job-task-${index}`}
                        type="text"
                        value={item.task}
                        onChange={(event) => updateSubJobField(index, 'task', event.target.value)}
                        placeholder="Sub job task"
                        className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#F59B0F] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`sub-job-location-${index}`}
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400"
                      >
                        <MapPinIcon className="h-3.5 w-3.5" /> Location
                      </label>
                      <div className="relative">
                        <input
                          id={`sub-job-location-${index}`}
                          type="url"
                          value={item.location}
                          readOnly
                          placeholder="Select location on map"
                          className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 pr-28 text-sm text-gray-800 focus:border-[#F59B0F] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setSubJobMapModalIndex(index)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-amber-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-amber-600"
                        >
                          Pick Map
                        </button>
                      </div>
                      {item.location && (
                        <a
                          href={item.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D97706] transition-colors hover:text-[#92400E]"
                        >
                          <MapPinIcon className="h-3.5 w-3.5" />
                          Open location
                        </a>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`sub-job-be-at-${index}`}
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400"
                      >
                        <CalendarDaysIcon className="h-3.5 w-3.5" /> Be at (optional)
                      </label>
                      <input
                        id={`sub-job-be-at-${index}`}
                        type="datetime-local"
                        value={item.beAt}
                        onChange={(event) => updateSubJobField(index, 'beAt', event.target.value)}
                        className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#F59B0F] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-60"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Create Job'}
          </button>
        </div>

        {/* Map Modals */}
        <MapLocationModal
          isOpen={subJobMapModalIndex !== null}
          initialUrl={subJobMapModalIndex !== null ? subJobs[subJobMapModalIndex]?.location || '' : ''}
          onClose={() => setSubJobMapModalIndex(null)}
          onConfirm={(url) => {
            if (subJobMapModalIndex !== null) {
              updateSubJobField(subJobMapModalIndex, 'location', url);
            }
            setSubJobMapModalIndex(null);
          }}
          title="Select Sub Job Location"
          subtitle="Click on the map to set this sub job location"
        />
      </div>
    </div>
  );
}

export default NewAssignmentModal;
