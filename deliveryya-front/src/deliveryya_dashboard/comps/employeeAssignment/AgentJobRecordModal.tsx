import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  CheckIcon,
  XCircleIcon,
  UserCircleIcon,
  EnvelopeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { AssignmentRecord, EmployeeOption } from './types';

interface AgentJobRecordModalProps {
  record: AssignmentRecord | null;
  employeeMap?: Map<string, EmployeeOption>;
  acceptanceError: string | null;
  isUpdatingAcceptance: boolean;
  onClose: () => void;
  onUpdateAcceptance: (accepted: boolean) => void;
}

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

const buildLocationLink = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '—') return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
};

function AgentJobRecordModal({
  record,
  employeeMap,
  acceptanceError,
  isUpdatingAcceptance,
  onClose,
  onUpdateAcceptance,
}: AgentJobRecordModalProps) {
  if (!record) return null;

  const displayName = record.employee
    ? `${record.employee.firstName} ${record.employee.lastName}`.trim()
    : 'Unknown';
  const mobile = record.employee?.mobile || '-';
  const whatsapp = record.employee?.whatsapp || mobile;
  const creatorName = record.createdByUser
    ? `${record.createdByUser.firstName} ${record.createdByUser.lastName}`.trim()
    : 'Unknown';
  const creatorEmail = record.createdByUser?.email || '-';
  const isAccepted = record.accepted === true;
  const isPending = record.accepted === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 bg-linear-to-r from-[#F59B0F] to-[#D17F0A] px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
            title="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Agent Job</p>
              <h3 className="text-xl font-black text-white">Job Record #{record.id}</h3>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Acceptance Status */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-linear-to-r from-gray-50 to-gray-100 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs text-gray-600">
              <ClockIcon className="h-4 w-4 shrink-0 text-gray-400" />
              Created: {formatDateTime(record.createdAt)}
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ${
                isAccepted
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : isPending
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
              }`}
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              {isAccepted ? 'Accepted' : isPending ? 'Pending' : 'Unknown'}
            </span>
          </div>

          {/* Employee Details */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">Assigned Employee</p>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                <UserCircleIcon className="h-6 w-6 text-[#F59B0F]" />
              </span>
              <div>
                <p className="font-bold text-gray-900">{displayName}</p>
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-gray-600">
                  <a
                    href={`tel:${mobile}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    title="Call employee"
                  >
                    <PhoneIcon className="h-3.5 w-3.5" />
                    {mobile}
                  </a>
                  {whatsapp && whatsapp !== mobile && (
                    <a
                      href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:underline"
                      title="Message on WhatsApp"
                    >
                      <PhoneIcon className="h-3.5 w-3.5" />
                      {whatsapp}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Created By User */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">Created By</p>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900">{creatorName}</p>
                <a
                  href={`mailto:${creatorEmail}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  title="Send email"
                >
                  <EnvelopeIcon className="h-3.5 w-3.5" />
                  {creatorEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Main Task */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <ClipboardDocumentListIcon className="h-3.5 w-3.5" /> Main Task
            </p>
            <p className="text-sm text-gray-800">{record.task}</p>
          </div>

          {/* Subtasks */}
          {record.tasks && record.tasks.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Scheduled Tasks ({record.tasks.length})
              </p>
              <div className="space-y-3">
                {record.tasks.map((task) => {
                  const locationLink = buildLocationLink(task.location);
                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{task.task}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                            <ClockIcon className="h-3.5 w-3.5" />
                            Be at: {formatDateTime(task.beAt)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-bold ${
                            task.isComplete
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {task.isComplete ? (
                            <>
                              <CheckIcon className="h-3 w-3 mr-1" />
                              Complete
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              Pending
                            </>
                          )}
                        </span>
                      </div>

                      {locationLink ? (
                        <a
                          href={locationLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-800"
                          title="Open location in Google Maps"
                        >
                          <MapPinIcon className="h-3.5 w-3.5" />
                          {task.location.substring(0, 60)}
                          {task.location.length > 60 ? '...' : ''}
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">No location provided</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Created
              </p>
              <p className="text-xs font-semibold text-gray-800">
                {formatDateTime(record.createdAt)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Updated
              </p>
              <p className="text-xs font-semibold text-gray-800">
                {formatDateTime(record.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {acceptanceError && (
          <div className="px-6 pb-1">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {acceptanceError}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>
          {record.accepted === false && (
            <>
              <button
                type="button"
                onClick={() => onUpdateAcceptance(false)}
                disabled={isUpdatingAcceptance}
                className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                {isUpdatingAcceptance ? 'Updating...' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => onUpdateAcceptance(true)}
                disabled={isUpdatingAcceptance}
                className="rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:opacity-60"
              >
                {isUpdatingAcceptance ? 'Updating...' : 'Accept'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentJobRecordModal;
