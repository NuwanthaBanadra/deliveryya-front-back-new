import { FiCheckCircle, FiClock, FiFlag, FiMail, FiMapPin, FiPhone, FiTruck } from 'react-icons/fi';

type UrgentJobTask = {
    id: number;
    location?: string | null;
    task?: string | null;
    beAt?: string | null;
    expectedTimeDuration?: number | null;
};

type UrgentJobItem = {
    id: number;
    job?: string | null;
    decs?: string | null;
    mobile?: string | null;
    email?: string | null;
    jobCode?: string | null;
    trip?: number | null;
    vehicleType?: { name?: string | null } | null;
    jobStatus?: { name?: string | null } | null;
    items?: UrgentJobTask[] | null;
};

type Props = {
    code: string;
    detail: UrgentJobItem | null;
    error?: string;
};

const formatDateTime = (value?: string | null): string => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
};

function ReferenceUrgentJobCard({ code, detail, error }: Props) {
    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Urgent Job {code}</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-700">Urgent Job {code}</p>
                <p className="text-sm text-gray-500 mt-1">No details found.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-cyan-200 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-4 space-y-4">
            <h4 className="text-sm font-bold text-cyan-900">Urgent Job: {detail.jobCode || code}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl bg-white border border-sky-100 p-3 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Job Code</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-sky-900">
                        <FiFlag className="h-4 w-4" />
                        <span>{detail.jobCode || code}</span>
                    </div>
                </div>
                <div className="rounded-xl bg-white border border-sky-100 p-3 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Vehicle</p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FiTruck className="h-4 w-4 text-cyan-700" />
                        <span>{detail.vehicleType?.name || 'N/A'}</span>
                    </div>
                </div>
                <div className="rounded-xl bg-white border border-sky-100 p-3 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Distance</p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FiMapPin className="h-4 w-4 text-cyan-700" />
                        <span>{detail.trip ?? 'N/A'} km</span>
                    </div>
                </div>
                <div className="rounded-xl bg-white border border-sky-100 p-3 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FiCheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>{detail.jobStatus?.name || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <div className="rounded-xl bg-white border border-sky-100 p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Job</p>
                <p className="text-base font-bold text-gray-900">{detail.job || 'N/A'}</p>
                <p className="text-sm text-gray-600 mt-2">{detail.decs || 'No description available.'}</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-3 text-sm text-gray-700">
                    <div className="inline-flex items-center gap-2">
                        <FiPhone className="h-4 w-4 text-cyan-700" />
                        <span>{detail.mobile || 'N/A'}</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <FiMail className="h-4 w-4 text-cyan-700" />
                        <span>{detail.email || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-cyan-100 bg-white p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Task Route</p>
                <div className="space-y-2">
                    {(detail.items || []).map((task, index) => (
                        <div key={task.id} className="rounded-lg bg-cyan-50/70 border border-cyan-100 px-3 py-3">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">{task.task || 'N/A'}</p>
                                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600">
                                        <FiMapPin className="h-3.5 w-3.5" />
                                        {task.location || 'N/A'}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                        <span className="inline-flex items-center gap-1.5">
                                            <FiClock className="h-3.5 w-3.5" />
                                            {formatDateTime(task.beAt)}
                                        </span>
                                        <span>ETA {task.expectedTimeDuration ?? 'N/A'}h</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ReferenceUrgentJobCard;
