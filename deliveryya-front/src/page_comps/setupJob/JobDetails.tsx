import { BoltIcon, ClockIcon, MapPinIcon, MinusCircleIcon, PlusCircleIcon, TruckIcon, UserIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AxiosError } from 'axios';
import Swal from 'sweetalert2';
import Select, { type SingleValue } from 'react-select';
import MapLocationModal from '../../deliveryya_dashboard/comps/addOrders/MapLocationModal';
import { customSelectFieldStyles } from '../../deliveryya_dashboard/comps/addOrders/OrderDetailsForm';
import axiosInstance from '../../util/AxiosUtil';
import { TbMapPin2 } from 'react-icons/tb';
import { BsSendCheckFill } from 'react-icons/bs';

interface VehicleType {
    id: number;
    name: string;
}

interface VehicleOption {
    value: number;
    label: string;
}

interface ApiObjectResponse<T> {
    status?: number;
    object?: T;
    message?: string;
    desc?: string;
    exData?: Record<string, string> | null;
}

interface JobItemForm {
    id: string;
    location: string;
    locationAddress: string;
    task: string;
    beAt: string;
    expectedTimeDuration: string;
}

export interface UrgentJobFormPrefill {
    id?: string;
    job?: string;
    description?: string;
    username?: string;
    mobile?: string;
    nic?: string;
    email?: string;
    vehicleTypeId?: number | null;
    tripDistance?: number | null;
    checkpoints?: Array<{
        task?: string;
        location?: string;
        scheduledAt?: string | null;
        expectedTimeDuration?: number | null;
    }>;
}

interface FieldErrors {
    job?: string;
    username?: string;
    mobile?: string;
    email?: string;
    nic?: string;
    items?: Record<string, { task?: string; location?: string }>;
}

interface UrgentJobPayloadItem {
    location: string;
    task: string;
    beAt: string | null;
    expectedTimeDuration: number | null;
}

interface UrgentJobPayload {
    job: string;
    desc: string;
    mobile: string;
    username: string;
    nic: string;
    email: string;
    vehicleTypeId: number | null;
    trip: number | null;
    items: UrgentJobPayloadItem[];
}

type CenterAlertType = 'success' | 'warning' | 'error' | 'info';

export const centerModalAlert = async (title: string, message: string, type: CenterAlertType = 'info') => {
    await Swal.fire({
        icon: type,
        title,
        text: message,
        position: 'center',
        toast: false,
        showConfirmButton: true,
        confirmButtonText: 'OK',
        confirmButtonColor: '#D97706',
        allowOutsideClick: true,
        allowEscapeKey: true,
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
            confirmButton: 'rounded-lg px-5 py-2 font-semibold',
        },
    });
};

const createItem = (): JobItemForm => ({
    id: `job-item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    location: '',
    locationAddress: '',
    task: '',
    beAt: '',
    expectedTimeDuration: '',
});

interface SortableItemProps {
    item: JobItemForm;
    index: number;
    itemsLength: number;
    removeItem: (id: string) => void;
    updateItem: (id: string, key: keyof JobItemForm, value: string) => void;
    setActiveLocationItemId: (id: string) => void;
    itemFieldError?: { task?: string; location?: string };
}

function SortableItem({ item, index, itemsLength, removeItem, updateItem, setActiveLocationItemId, itemFieldError }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <article
            ref={setNodeRef}
            style={style}
            className={`rounded-2xl border border-gray-200 bg-linear-to-r from-white via-white to-amber-50/40 p-4 md:p-5 relative ${isDragging ? 'shadow-lg shadow-black/10 opacity-90' : ''}`}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-grab active:cursor-grabbing transition-colors touch-none"
                    >
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <h4 className="font-bold text-gray-800">Checkpoint {index + 1}</h4>
                </div>
                <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={itemsLength <= 1}
                    className="inline-flex self-start sm:self-auto items-center gap-1.5 text-sm font-semibold text-red-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    <MinusCircleIcon className="w-5 h-5" />
                    Remove
                </button>
            </div>

            <div className="mt-4 space-y-4">
                {/* Responsive Row: Location (full on mobile, inline with BeAt+Duration on md+) */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Location */}
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-700">Location</label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <input
                                type="text"
                                value={item.locationAddress || item.location}
                                onChange={(event) => updateItem(item.id, 'location', event.target.value)}
                                placeholder="https://www.google.com/maps/place/?q=place_id:ChIJBdd4543df9Z4joR1D6pSk53wP0"
                                className={`flex-1 min-w-0 px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${itemFieldError?.location ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-gray-200 focus:ring-amber-100 focus:border-amber-400'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setActiveLocationItemId(item.id)}
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-1 rounded-lg border-2 border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-2 text-sm font-semibold transition-all"
                            >
                                <MapPinIcon className="w-4 h-4" />
                                Pick
                            </button>
                        </div>
                        {item.locationAddress && (
                            <p className="mt-1 text-xs text-gray-500 truncate">Selected: {item.locationAddress}</p>
                        )}
                        {itemFieldError?.location && (
                            <p className="mt-1 text-xs text-red-600">{itemFieldError.location}</p>
                        )}
                    </div>

                    <div className="w-full md:w-35">
                        <label className="text-sm font-semibold text-gray-700">Duration <small>(Min)</small></label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.expectedTimeDuration ?? ""}
                            onChange={(event) => {
                                const val = event.target.value;

                                // Allow empty string
                                if (val === "") {
                                    updateItem(item.id, "expectedTimeDuration", "");
                                    return;
                                }

                                // Only allow positive numbers
                                const num = Number(val);
                                if (num >= 0) {
                                    updateItem(item.id, "expectedTimeDuration", num.toString());
                                }
                            }}
                            placeholder="15"
                            className="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all text-center"
                        />
                    </div>

                    <div className="w-full md:w-50">
                        <label className="text-sm font-semibold text-gray-700">Be At <small>(Optional)</small></label>
                        <input
                            type="datetime-local"
                            value={item.beAt}
                            onChange={(event) => updateItem(item.id, 'beAt', event.target.value)}
                            className="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all"
                        />
                    </div>
                </div>

                {/* Task Row */}
                <div>
                    <label className="text-sm font-semibold text-gray-700">Task</label>
                    <textarea
                        value={item.task}
                        onChange={(event) => updateItem(item.id, 'task', event.target.value)}
                        placeholder="Pick up medical supplies"
                        className={`mt-2 w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${itemFieldError?.task ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-gray-200 focus:ring-amber-100 focus:border-amber-400'}`}
                    />
                    {itemFieldError?.task && (
                        <p className="mt-1 text-xs text-red-600">{itemFieldError.task}</p>
                    )}
                </div>
            </div>
        </article>
    );
}

interface JobDetailsProps {
    onLocationsChange?: (urls: string[]) => void;
    initialData?: UrgentJobFormPrefill;
    isUpdateMode?: boolean;
}

const toDateTimeLocal = (value: string | null | undefined): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function JobDetails({ onLocationsChange, initialData, isUpdateMode = false }: JobDetailsProps) {
    const [job, setJob] = useState('Emergency Delivery');
    const [desc, setDesc] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [nic, setNic] = useState('');
    const [email, setEmail] = useState('');
    const [trip, setTrip] = useState('');

    const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
    const [vehicleTypeId, setVehicleTypeId] = useState<number | null>(null);
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
    const [items, setItems] = useState<JobItemForm[]>([
        { ...createItem(), task: 'Pick up package' },
        { ...createItem(), task: 'Deliver package' },
    ]);
    const [activeLocationItemId, setActiveLocationItemId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState('');
    const activeItem = useMemo(
        () => items.find((item) => item.id === activeLocationItemId) ?? null,
        [activeLocationItemId, items]
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px drag distance before activating
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const fetchVehicleTypes = async () => {
        setIsLoadingVehicles(true);
        try {
            const response = await axiosInstance.get<ApiObjectResponse<VehicleType[]>>('/vehicles/get-vehicle-types');
            const options = (response.data.object ?? []).map((type) => ({
                value: Number(type.id),
                label: type.name,
            }));
            setVehicleOptions(options);
        } catch (error) {
            console.error('Failed to fetch vehicle types:', error);
            setVehicleOptions([]);
            await centerModalAlert('Vehicle Types', 'Could not load vehicle types right now.', 'warning');
        } finally {
            setIsLoadingVehicles(false);
        }
    };

    useEffect(() => {
        void fetchVehicleTypes();
    }, []);

    useEffect(() => {
        if (!initialData) return;

        setJob(initialData.job?.trim() || 'Emergency Delivery');
        setDesc(initialData.description?.trim() || '');
        setMobile(initialData.mobile?.trim() || '');
        setUsername(initialData.username?.trim() || '');
        setNic(initialData.nic?.trim() || '');
        setEmail(initialData.email?.trim() || '');
        setTrip(initialData.tripDistance !== null && initialData.tripDistance !== undefined ? String(initialData.tripDistance) : '');
        setVehicleTypeId(typeof initialData.vehicleTypeId === 'number' ? initialData.vehicleTypeId : null);

        const mappedItems = (initialData.checkpoints || [])
            .map((checkpoint) => ({
                ...createItem(),
                task: checkpoint.task?.trim() || '',
                location: checkpoint.location?.trim() || '',
                locationAddress: checkpoint.location?.trim() || '',
                beAt: toDateTimeLocal(checkpoint.scheduledAt),
                expectedTimeDuration:
                    checkpoint.expectedTimeDuration !== null && checkpoint.expectedTimeDuration !== undefined
                        ? String(checkpoint.expectedTimeDuration)
                        : '',
            }))
            .filter((item) => item.task || item.location);

        if (mappedItems.length > 0) {
            setItems(mappedItems);
        }
    }, [initialData]);

    useEffect(() => {
        if (!onLocationsChange) {
            return;
        }

        onLocationsChange(
            items
                .map((item) => item.location.trim())
                .filter(Boolean)
        );
    }, [items, onLocationsChange]);

    const updateItem = (id: string, key: keyof JobItemForm, value: string) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
        if (key === 'task' || key === 'location') {
            setFieldErrors(prev => ({
                ...prev,
                items: prev.items
                    ? { ...prev.items, [id]: { ...prev.items[id], [key]: undefined } }
                    : prev.items,
            }));
        }
    };

    const addItem = () => {
        setItems((prev) => [...prev, createItem()]);
    };

    const removeItem = (id: string) => {
        setItems((prev) => {
            if (prev.length <= 2) {
                void centerModalAlert('Error', 'At least two checkpoints needed', 'info');
                return prev;
            }
            return prev.filter((item) => item.id !== id);
        });
    };

    const validate = (): boolean => {
        const normalizedMobile = mobile.replace(/\D/g, '');
        const validMobile = /^(?:94|0)\d{9}$/.test(normalizedMobile);
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

        const errors: FieldErrors = {};

        if (!job.trim()) errors.job = 'Mission title is required.';
        if (!username.trim()) errors.username = 'Client name is required.';
        if (!mobile.trim() || !validMobile) errors.mobile = 'Please enter a valid mobile number.';
        if (!email.trim() || !validEmail) errors.email = 'Please enter a valid email address.';
        if (!nic.trim()) errors.nic = 'NIC is required.';

        const itemErrors: Record<string, { task?: string; location?: string }> = {};
        items.forEach((item) => {
            const ie: { task?: string; location?: string } = {};
            if (!item.task.trim()) ie.task = 'Task is required.';
            if (!item.location.trim()) ie.location = 'Location is required.';
            if (ie.task || ie.location) itemErrors[item.id] = ie;
        });
        if (Object.keys(itemErrors).length > 0) errors.items = itemErrors;

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const buildPayload = (): UrgentJobPayload => {
        const missionItems: UrgentJobPayloadItem[] = items.map((item) => {
            const parsedDuration = Number(item.expectedTimeDuration);
            const duration = item.expectedTimeDuration.trim() === '' || Number.isNaN(parsedDuration)
                ? null
                : parsedDuration;

            return {
                location: item.location,
                task: item.task.trim(),
                beAt: item.beAt ? new Date(item.beAt).toISOString() : null,
                expectedTimeDuration: duration,
            };
        });

        return {
            job: job.trim(),
            desc: desc.trim(),
            mobile: mobile.trim(),
            username: username.trim(),
            nic: nic.trim(),
            email: email.trim(),
            vehicleTypeId,
            trip: 0,
            items: missionItems,
        };
    };

    const resetForm = () => {
        setJob('Emergency Delivery');
        setDesc('');
        setMobile('');
        setUsername('');
        setNic('');
        setEmail('');
        setTrip('');
        setVehicleTypeId(null);
        setItems([{ ...createItem(), task: 'Pick up package' }, { ...createItem(), task: 'Deliver package' },]);
        setFieldErrors({});
        setServerError('');
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        const payload = buildPayload();
        setIsSubmitting(true);
        setServerError('');

        try {
            const response = await axiosInstance.post<ApiObjectResponse<null>>('/urgent-jobs/set-urgent-job', payload);
            const isSuccess = response.status >= 200 && response.status < 300;

            if (!isSuccess) {
                await centerModalAlert('Urgent Job', response.data.desc || 'Failed to create urgent job.', 'error');
                return;
            }

            await centerModalAlert('Urgent Job', response.data.desc || 'Urgent job created successfully.', 'success');
            resetForm();
        } catch (error) {
            console.error('Failed to create urgent job:', error);
            const axiosError = error as AxiosError<ApiObjectResponse<null>>;
            const status = axiosError.response?.status;
            const responseData = axiosError.response?.data;

            if (status === 400) {
                const fieldErrorMessages = responseData?.exData && typeof responseData.exData === 'object'
                    ? Object.values(responseData.exData).filter(Boolean).join(', ')
                    : '';
                const validationMessage = fieldErrorMessages || responseData?.desc || 'Validation failed.';

                setServerError(validationMessage);
                await centerModalAlert('Validation Error', validationMessage, 'warning');
                return;
            }

            if (status === 409) {
                const conflictMessage = responseData?.desc || 'Urgent job already exists for this request.';
                await centerModalAlert('Conflict', conflictMessage, 'info');
                return;
            }

            await centerModalAlert('Urgent Job', responseData?.desc || 'Could not create urgent job. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative w-full px-4 md:px-6 lg:px-0 py-6 md:py-8">
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-14 -left-20 w-80 h-80 rounded-full bg-amber-200/30 blur-3xl" />
                <div className="absolute -bottom-20 -right-12 w-96 h-96 rounded-full bg-orange-200/35 blur-3xl" />
            </div>

            <section className="rounded-3xl border border-amber-100 bg-linear-to-r from-amber-50 via-orange-50 to-white shadow-lg shadow-amber-100/60 p-5 md:p-7">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
                            <BoltIcon className="w-4 h-4" />
                            Priority Mission
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-3">{isUpdateMode ? 'Update Urgent Job' : 'Create Urgent Job'}</h2>
                        <p className="text-sm md:text-base text-gray-600 mt-2 max-w-2xl">
                            {isUpdateMode
                                ? 'Review and adjust mission details before dispatch updates.'
                                : 'Configure your mission checkpoints, assign the right vehicle, and dispatch instantly.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 min-w-0 lg:min-w-80">
                        <div className="rounded-2xl bg-white/90 border border-amber-100 px-4 py-3">
                            <p className="text-xs text-gray-500">Checkpoints</p>
                            <p className="text-xl font-bold text-amber-600">{items.length}</p>
                        </div>
                        <div className="rounded-2xl bg-white/90 border border-amber-100 px-4 py-3">
                            <p className="text-xs text-gray-500">Vehicle</p>
                            <p className="text-xl font-bold text-amber-600">
                                {vehicleOptions.find((option) => option.value === vehicleTypeId)?.label || 'Not set'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 rounded-3xl border border-gray-200 bg-white shadow-md overflow-hidden">
                    <div className="px-5 md:px-7 py-4 border-b border-gray-100 bg-gray-50/70">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-amber-500" />
                            Client and Mission Details
                        </h3>
                    </div>

                    <div className="p-5 md:p-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-700">Mission Name</label>
                            <input
                                type="text"
                                value={job}
                                onChange={(event) => { setJob(event.target.value); setFieldErrors(prev => ({ ...prev, job: undefined })); }}
                                placeholder="Emergency Delivery"
                                className={`mt-2 w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${fieldErrors.job ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-gray-200 focus:ring-amber-100 focus:border-amber-400'}`}
                            />
                            {fieldErrors.job && <p className="mt-1 text-xs text-red-600">{fieldErrors.job}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700">Client Name</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(event) => { setUsername(event.target.value); setFieldErrors(prev => ({ ...prev, username: undefined })); }}
                                placeholder="John Doe"
                                className={`mt-2 w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${fieldErrors.username ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-gray-200 focus:ring-amber-100 focus:border-amber-400'}`}
                            />
                            {fieldErrors.username && <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700">Mobile</label>
                            <input
                                type="text"
                                value={mobile}
                                onChange={(event) => { setMobile(event.target.value); setFieldErrors(prev => ({ ...prev, mobile: undefined })); }}
                                placeholder="0771234567"
                                className={`mt-2 w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${fieldErrors.mobile ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-gray-200 focus:ring-amber-100 focus:border-amber-400'}`}
                            />
                            {fieldErrors.mobile && <p className="mt-1 text-xs text-red-600">{fieldErrors.mobile}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700">NIC</label>
                            <input
                                type="text"
                                value={nic}
                                onChange={(event) => { setNic(event.target.value); setFieldErrors(prev => ({ ...prev, nic: undefined })); }}
                                placeholder="199812345678"
                                className={`mt-2 w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${fieldErrors.nic ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-gray-200 focus:ring-amber-100 focus:border-amber-400'}`}
                            />
                            {fieldErrors.nic && <p className="mt-1 text-xs text-red-600">{fieldErrors.nic}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => { setEmail(event.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                                placeholder="john.doe@example.com"
                                className={`mt-2 w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${fieldErrors.email ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-gray-200 focus:ring-amber-100 focus:border-amber-400'}`}
                            />
                            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700">Vehicle Type (Optional)</label>
                            <div className="mt-2">
                                <Select
                                    options={vehicleOptions}
                                    value={vehicleOptions.find((option) => option.value === vehicleTypeId) || null}
                                    onChange={(selected: SingleValue<VehicleOption>) => {
                                        setVehicleTypeId(selected?.value ?? null);
                                    }}
                                    isClearable
                                    isLoading={isLoadingVehicles}
                                    placeholder="Select preferred vehicle"
                                    styles={customSelectFieldStyles}
                                    classNamePrefix="react-select"
                                />
                            </div>
                        </div>

                        {/* <div>
                            <label className="text-sm font-semibold text-gray-700">Trip Distance (km)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={trip}
                                onChange={(event) => setTrip(event.target.value)}
                                placeholder="25.5"
                                className="mt-2 w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all"
                            />
                        </div> */}

                        <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-gray-700">Mission Description</label>
                            <textarea
                                value={desc}
                                onChange={(event) => setDesc(event.target.value)}
                                rows={4}
                                placeholder="Urgent medical supplies delivery required"
                                className="mt-2 w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-5 rounded-3xl border border-amber-200 bg-linear-to-b from-white to-amber-50/60 shadow-md p-5 md:p-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <TruckIcon className="w-5 h-5 text-amber-500" />
                        Dispatch Summary
                    </h3>
                    <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-amber-100 bg-white px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600">Mission</span>
                            <span className="text-sm font-semibold text-gray-800 text-right max-w-52 truncate">{job || '-'}</span>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-white px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600">Client</span>
                            <span className="text-sm font-semibold text-gray-800 text-right max-w-52 truncate">{username || '-'}</span>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-white px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600">Contact</span>
                            <span className="text-sm font-semibold text-gray-800 text-right max-w-52 truncate">{mobile || '-'}</span>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-white px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600">Distance</span>
                            <span className="text-sm font-semibold text-gray-800">{trip ? `${trip} km` : 'Not set'}</span>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-white px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600">Vehicle Type</span>
                            <span className="text-sm font-semibold text-gray-800 text-right max-w-52 truncate">
                                {vehicleOptions.find((option) => option.value === vehicleTypeId)?.label || 'Not selected'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                        <ClockIcon className="w-5 h-5 shrink-0 mt-0.5" />
                        Use mission checkpoints to set exact pickup and delivery sequence for urgent handling.
                    </div>
                </div>
            </section>

            <section className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-md overflow-hidden">
                <div className="px-5 md:px-7 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50/70">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <MapPinIcon className="w-5 h-5 text-amber-500" />
                        Mission Checkpoints
                    </h3>
                    <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 transition-all"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Add Checkpoint
                    </button>
                </div>

                <div className="p-5 md:p-7 space-y-5">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {items.map((item, index) => (
                                <SortableItem
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    itemsLength={items.length}
                                    removeItem={removeItem}
                                    updateItem={updateItem}
                                    setActiveLocationItemId={setActiveLocationItemId}
                                    itemFieldError={fieldErrors.items?.[item.id]}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {serverError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {serverError}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-all"
                        >
                            Clear Form
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                void handleSubmit();
                            }}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-70 text-white px-6 py-3 text-sm font-semibold transition-all"
                        >
                            <TbMapPin2 /> View Directions
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                void handleSubmit();
                            }}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white px-6 py-3 text-sm font-semibold transition-all"
                        >
                            {isSubmitting
                                ? "Sending Request..."
                                : (
                                    <span className="inline-flex items-center gap-2">
                                        <BsSendCheckFill />
                                        Request
                                    </span>
                                )
                            }

                        </button>
                    </div>
                </div>
            </section>

            <MapLocationModal
                isOpen={Boolean(activeItem)}
                initialUrl={activeItem?.location || ''}
                onClose={() => setActiveLocationItemId(null)}
                onConfirm={(url, address) => {
                    if (!activeItem) {
                        return;
                    }

                    setItems((prev) => prev.map((item) => (
                        item.id === activeItem.id
                            ? {
                                ...item,
                                location: url,
                                locationAddress: address,
                            }
                            : item
                    )));
                    setActiveLocationItemId(null);
                }}
            />
        </div>
    );
}

export default JobDetails;