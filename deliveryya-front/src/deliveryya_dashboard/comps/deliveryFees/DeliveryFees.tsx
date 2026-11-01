import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ArrowPathIcon, ArrowUpTrayIcon, BanknotesIcon, BuildingOffice2Icon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, CurrencyDollarIcon, EllipsisVerticalIcon, EyeIcon, FunnelIcon, MapPinIcon, MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, TrashIcon, TruckIcon, XMarkIcon, } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import Swal from 'sweetalert2';
import axiosInstance from '../../../util/AxiosUtil';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import DeliveryFeeBulkImportModal from './DeliveryFeeBulkImportModal';
import DeliveryFeeUpsertModal from './DeliveryFeeUpsertModal';

type ApiResponse<T> = {
    status?: number;
    message?: string;
    desc?: string;
    exData?: unknown;
    object?: T;
};

type District = {
    id: number;
    name: string;
};

export type City = {
    id: number;
    name: string;
    district?: District | null;
    districtName?: string | null;
};

export type DeliveryFee = {
    id: number;
    city?: City | null;
    fee: number | null;
    additionalFee?: number | null;
};

type PaginatedObject<T> = {
    pageNumber?: number;
    countPerPage?: number;
    totalCount?: number;
    totalPages?: number;
    items?: T[];
};

type DeliveryFeesObject = PaginatedObject<DeliveryFee> & {
    deliveryFeeId?: number | null;
    deliveryFeeFrom?: number | null;
    deliveryFeeTo?: number | null;
    additionalFeeFrom?: number | null;
    additionalFeeTo?: number | null;
    cityId?: number | null;
    districtId?: number | null;
    search?: string;
};

export type SelectOption<T extends string | number | null = number> = {
    value: T;
    label: string;
};

type DeliveryFeesRequestBody = {
    pageNumber: number;
    countPerPage: number;
    deliveryFeeId: number | null;
    deliveryFeeFrom: number | null;
    deliveryFeeTo: number | null;
    additionalFeeFrom: number | null;
    additionalFeeTo: number | null;
    cityId: number | null;
    districtId: number | null;
    search: string;
};

const INITIAL_QUERY: DeliveryFeesRequestBody = {
    pageNumber: 0,
    countPerPage: 10,
    deliveryFeeId: null,
    deliveryFeeFrom: null,
    deliveryFeeTo: null,
    additionalFeeFrom: null,
    additionalFeeTo: null,
    cityId: null,
    districtId: null,
    search: '',
};

const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';

    return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const toNumberOrNull = (value: string): number | null => {
    if (value.trim() === '') return null;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const getItems = <T,>(objectData: PaginatedObject<T> | T[] | undefined): T[] => {
    if (Array.isArray(objectData)) return objectData;
    return objectData?.items || [];
};

function debounceAsync<T>(fn: (arg: string) => Promise<T>, delay: number): (arg: string) => Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    return (arg: string): Promise<T> =>
        new Promise((resolve, reject) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(arg).then(resolve).catch(reject), delay);
        });
}

const getCityLabel = (city?: City | null): string => {
    if (!city) return 'Unassigned city';

    const districtName = city.district?.name || city.districtName;
    return districtName ? `${city.name} (${districtName})` : city.name;
};

const DeliveryFees = () => {
    const navigate = useNavigate();
    const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [cityOptions, setCityOptions] = useState<SelectOption<number>[]>([]);
    const [upsertCityOptions, setUpsertCityOptions] = useState<SelectOption<number>[]>([]);
    const [query, setQuery] = useState<DeliveryFeesRequestBody>(INITIAL_QUERY);
    const [totalCount, setTotalCount] = useState(0);
    const [backendTotalPages, setBackendTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingFilters, setIsLoadingFilters] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [upsertModalState, setUpsertModalState] = useState<{
        isOpen: boolean;
        mode: 'create' | 'update';
        deliveryFee: DeliveryFee | null;
    }>({ isOpen: false, mode: 'create', deliveryFee: null });
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const canManageDeliveryFees = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.DELIVERY_FEES_MANAGEMENT), []);
    const canDeleteDeliveryFees = useMemo(() => hasAccess(FRONTEND_ACCESS_IDS.DELIVERY_FEE_DELETE), []);

    const updateQuery = useCallback((patch: Partial<DeliveryFeesRequestBody>) => {
        setQuery((current) => ({ ...current, ...patch }));
    }, []);

    const updateQueryAndResetPage = useCallback((patch: Partial<DeliveryFeesRequestBody>) => {
        setQuery((current) => ({ ...current, ...patch, pageNumber: 0 }));
    }, []);

    const fetchDeliveryFees = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const requestBody: DeliveryFeesRequestBody = {
            ...query,
            search: query.search.trim(),
            deliveryFeeId: query.deliveryFeeId || null,
            cityId: query.cityId || null,
            districtId: query.districtId || null,
        };

        try {
            const response = await axiosInstance.post<ApiResponse<DeliveryFeesObject>>(
                '/delivery-fees/get-delivery-fees',
                requestBody
            );

            if (response.data.message?.toLowerCase() === 'success') {
                const responseObject = response.data.object;
                const items = responseObject?.items || [];

                setDeliveryFees(items);
                setTotalCount(responseObject?.totalCount ?? items.length);
                setBackendTotalPages(Math.max(1, responseObject?.totalPages ?? 1));
            } else {
                setDeliveryFees([]);
                setTotalCount(0);
                setBackendTotalPages(1);
                setError(response.data.desc || 'Failed to load delivery fees');
            }
        } catch (fetchError) {
            console.error('Error loading delivery fees:', fetchError);
            setDeliveryFees([]);
            setTotalCount(0);
            setBackendTotalPages(1);
            setError('Failed to connect to delivery fee service');
        } finally {
            setIsLoading(false);
        }
    }, [query]);

    const fetchDistricts = useCallback(async () => {
        setIsLoadingFilters(true);
        try {
            const response = await axiosInstance.get<ApiResponse<PaginatedObject<District> | District[]>>('/users/get-districts');
            const districtItems = getItems(response.data.object);

            setDistricts(districtItems);
        } catch (fetchError) {
            console.error('Error loading districts:', fetchError);
            setDistricts([]);
        } finally {
            setIsLoadingFilters(false);
        }
    }, []);

    const loadCityOptions = useCallback(async (inputValue: string): Promise<SelectOption<number>[]> => {
        const search = inputValue.trim();

        try {
            const response = await axiosInstance.post<ApiResponse<PaginatedObject<City>>>('/users/get-cities', {
                pageNumber: 0,
                countPerPage: 30,
                totalCount: 0,
                totalPages: 0,
                districtId: query.districtId ?? 0,
                cityId: null,
                search,
            });

            const cities = response.data.object?.items || [];
            const options = cities.map((city) => ({
                value: city.id,
                label: getCityLabel(city),
            }));

            if (!search) {
                setCityOptions(options);
            }

            return [{ value: 0, label: 'All cities' }, ...options];
        } catch (fetchError) {
            console.error('Error loading cities:', fetchError);
            return [{ value: 0, label: 'All cities' }];
        }
    }, [query.districtId]);

    const loadUpsertCityOptions = useCallback(async (inputValue: string): Promise<SelectOption<number>[]> => {
        const search = inputValue.trim();

        try {
            const response = await axiosInstance.post<ApiResponse<PaginatedObject<City>>>('/users/get-cities', {
                pageNumber: 0,
                countPerPage: 30,
                totalCount: 0,
                totalPages: 0,
                districtId: 0,
                cityId: null,
                search,
            });

            const cities = response.data.object?.items || [];
            const options = cities.map((city) => ({
                value: city.id,
                label: getCityLabel(city),
            }));

            if (!search) {
                setUpsertCityOptions(options);
            }

            return options;
        } catch (fetchError) {
            console.error('Error loading modal cities:', fetchError);
            return [];
        }
    }, []);

    const debouncedLoadCityOptions = useMemo(
        () => debounceAsync(loadCityOptions, 500),
        [loadCityOptions]
    );

    const debouncedLoadUpsertCityOptions = useMemo(
        () => debounceAsync(loadUpsertCityOptions, 500),
        [loadUpsertCityOptions]
    );

    useEffect(() => {
        fetchDeliveryFees();
    }, [fetchDeliveryFees]);

    useEffect(() => {
        fetchDistricts();
    }, [fetchDistricts]);

    useEffect(() => {
        void loadCityOptions('');
    }, [loadCityOptions]);

    useEffect(() => {
        void loadUpsertCityOptions('');
    }, [loadUpsertCityOptions]);

    const districtOptions = useMemo<SelectOption<number>[]>(() => [
        { value: 0, label: 'All districts' },
        ...districts.map((district) => ({ value: district.id, label: district.name })),
    ], [districts]);

    const defaultCityOptions = useMemo<SelectOption<number>[]>(() => [
        { value: 0, label: 'All cities' },
        ...cityOptions,
    ], [cityOptions]);

    const selectedDistrictOption = useMemo<SelectOption<number>>(() => {
        if (!query.districtId) return { value: 0, label: 'All districts' };

        return {
            value: query.districtId,
            label: districts.find((district) => district.id === query.districtId)?.name || `District #${query.districtId}`,
        };
    }, [districts, query.districtId]);

    const selectedCityOption = useMemo<SelectOption<number>>(() => {
        if (!query.cityId) return { value: 0, label: 'All cities' };

        return {
            value: query.cityId,
            label: cityOptions.find((city) => city.value === query.cityId)?.label || `City #${query.cityId}`,
        };
    }, [cityOptions, query.cityId]);

    const activeFilters = useMemo(() => {
        const chips: { label: string; onRemove: () => void }[] = [];

        if (query.search) {
            chips.push({
                label: `Search: "${query.search}"`,
                onRemove: () => updateQueryAndResetPage({ search: '' }),
            });
        }
        if (query.districtId) {
            chips.push({
                label: `District: ${selectedDistrictOption.label}`,
                onRemove: () => updateQueryAndResetPage({ districtId: null, cityId: null }),
            });
        }
        if (query.cityId) {
            chips.push({
                label: `City: ${selectedCityOption.label}`,
                onRemove: () => updateQueryAndResetPage({ cityId: null }),
            });
        }
        if (query.deliveryFeeId) {
            chips.push({
                label: `Fee ID: ${query.deliveryFeeId}`,
                onRemove: () => updateQueryAndResetPage({ deliveryFeeId: null }),
            });
        }
        if (query.deliveryFeeFrom !== null) {
            chips.push({
                label: `Min fee: LKR ${query.deliveryFeeFrom}`,
                onRemove: () => updateQueryAndResetPage({ deliveryFeeFrom: null }),
            });
        }
        if (query.deliveryFeeTo !== null) {
            chips.push({
                label: `Max fee: LKR ${query.deliveryFeeTo}`,
                onRemove: () => updateQueryAndResetPage({ deliveryFeeTo: null }),
            });
        }
        if (query.additionalFeeFrom !== null) {
            chips.push({
                label: `Min extra: LKR ${query.additionalFeeFrom}`,
                onRemove: () => updateQueryAndResetPage({ additionalFeeFrom: null }),
            });
        }
        if (query.additionalFeeTo !== null) {
            chips.push({
                label: `Max extra: LKR ${query.additionalFeeTo}`,
                onRemove: () => updateQueryAndResetPage({ additionalFeeTo: null }),
            });
        }

        return chips;
    }, [query, selectedCityOption.label, selectedDistrictOption.label, updateQueryAndResetPage]);

    const summary = useMemo(() => {
        const fees = deliveryFees
            .map((item) => item.fee)
            .filter((fee): fee is number => typeof fee === 'number' && Number.isFinite(fee));

        const districtNames = new Set(
            deliveryFees
                .map((item) => item.city?.district?.name || item.city?.districtName)
                .filter((name): name is string => Boolean(name))
        );

        const totalFee = fees.reduce((sum, fee) => sum + fee, 0);
        const averageFee = fees.length > 0 ? totalFee / fees.length : null;
        const highestFee = fees.length > 0 ? Math.max(...fees) : null;

        return {
            totalRecords: totalCount,
            districtsCovered: districtNames.size,
            averageFee,
            highestFee,
        };
    }, [deliveryFees, totalCount]);

    const totalPages = Math.max(1, backendTotalPages);

    useEffect(() => {
        setQuery((current) => ({ ...current, pageNumber: Math.min(current.pageNumber, totalPages - 1) }));
    }, [totalPages]);

    const showingRange = useMemo(() => {
        if (totalCount === 0 || deliveryFees.length === 0) {
            return { from: 0, to: 0 };
        }

        const from = query.pageNumber * query.countPerPage + 1;
        const to = Math.min(totalCount, query.pageNumber * query.countPerPage + deliveryFees.length);

        return { from, to };
    }, [deliveryFees.length, query.countPerPage, query.pageNumber, totalCount]);

    const resetFilters = () => {
        updateQuery({ ...INITIAL_QUERY });
    };

    const openCreateModal = () => {
        setUpsertModalState({ isOpen: true, mode: 'create', deliveryFee: null });
    };

    const openBulkImportModal = () => {
        setIsBulkImportOpen(true);
    };

    const openUpdateModal = (deliveryFee: DeliveryFee) => {
        setUpsertModalState({ isOpen: true, mode: 'update', deliveryFee });
    };

    const closeUpsertModal = () => {
        setUpsertModalState((current) => ({ ...current, isOpen: false }));
    };

    const handleUpsertSaved = () => {
        setUpsertModalState({ isOpen: false, mode: 'create', deliveryFee: null });
        fetchDeliveryFees();
        loadUpsertCityOptions('');
        loadCityOptions('');
    };

    const handleBulkImportCompleted = () => {
        fetchDeliveryFees();
        loadUpsertCityOptions('');
        loadCityOptions('');
    };

    const handleViewDeliveryFee = (deliveryFee: DeliveryFee) => {
        Swal.fire({
            title: `Delivery Fee #${deliveryFee.id}`,
            text: [
                `City: ${deliveryFee.city?.name || 'N/A'}`,
                `District: ${deliveryFee.city?.district?.name || deliveryFee.city?.districtName || 'N/A'}`,
                `Delivery Fee: LKR ${formatCurrency(deliveryFee.fee)}`,
                `Additional Fee: ${deliveryFee.additionalFee === undefined ? '-' : `LKR ${formatCurrency(deliveryFee.additionalFee)}`}`,
            ].join('\n'),
            icon: 'info',
            confirmButtonColor: '#F59B0F',
        });
    };

    const handleDeleteDeliveryFee = async (deliveryFee: DeliveryFee) => {
        const result = await Swal.fire({
            title: 'Delete delivery fee?',
            text: `This will remove the fee record for ${getCityLabel(deliveryFee.city)}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#6B7280',
        });

        if (!result.isConfirmed) return;

        try {
            const response = await axiosInstance.delete<ApiResponse<unknown>>('/delivery-fees/delete-delivery-fee', {
                params: { id: deliveryFee.id },
            });

            if (response.data.message?.toLowerCase() === 'success') {
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Delivery fee deleted',
                    showConfirmButton: false,
                    timer: 1600,
                });
                fetchDeliveryFees();
                return;
            }

            await Swal.fire('Delete failed', response.data.desc || 'Unable to delete this delivery fee.', 'error');
        } catch (deleteError: any) {
            console.error('Error deleting delivery fee:', deleteError);
            await Swal.fire(
                'Delete failed',
                deleteError?.response?.data?.desc || 'Unable to delete this delivery fee right now.',
                'error'
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="mb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
                            Delivery Fees
                        </h1>
                        <p className="text-gray-600 text-sm md:text-base">
                            View delivery service fees by city and district.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/deliverYya-cloud-console/discounts')}
                        className="inline-flex items-center justify-center rounded-xl bg-[#F59B0F] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#D17F0A] sm:mt-1"
                    >
                        Discounts Management
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Total Fee Records</p>
                                <p className="text-3xl font-black text-gray-900 mt-1">{summary.totalRecords}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                <TruckIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Average Fee</p>
                                <p className="text-3xl font-black text-emerald-700 mt-1">
                                    {formatCurrency(summary.averageFee)}
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <CurrencyDollarIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Highest Fee</p>
                                <p className="text-3xl font-black text-red-700 mt-1">
                                    {formatCurrency(summary.highestFee)}
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                                <BanknotesIcon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Districts Covered</p>
                                <p className="text-3xl font-black text-sky-700 mt-1">{summary.districtsCovered}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
                                <BuildingOffice2Icon className="w-7 h-7 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            value={query.search}
                            onChange={(event) => updateQueryAndResetPage({ search: event.target.value })}
                            placeholder="Search by city, district or fee..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#F59B0F] transition-all text-sm md:text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">
                                District
                            </label>
                            <Select
                                isLoading={isLoadingFilters}
                                options={districtOptions}
                                value={selectedDistrictOption}
                                onChange={(selected) =>
                                    updateQueryAndResetPage({
                                        districtId: Number(selected?.value || 0) || null,
                                        cityId: null,
                                    })
                                }
                                styles={customSelectFieldStyles}
                                placeholder="Select district..."
                                className="react-select-container"
                                classNamePrefix="react-select"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">
                                City
                            </label>
                            <AsyncSelect
                                key={query.districtId ?? 'all-districts'}
                                cacheOptions
                                defaultOptions={defaultCityOptions}
                                loadOptions={debouncedLoadCityOptions}
                                value={selectedCityOption}
                                onChange={(selected: SelectOption<number> | null) =>
                                    updateQueryAndResetPage({ cityId: Number(selected?.value || 0) || null })
                                }
                                styles={customSelectFieldStyles}
                                placeholder="Search or select city..."
                                className="react-select-container"
                                classNamePrefix="react-select"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchDeliveryFees}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-50"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>

                        {canManageDeliveryFees && (
                            <>
                                <button
                                    onClick={openCreateModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#D17F0A] text-white font-semibold hover:shadow-lg transition-all"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add Delivery Fee
                                </button>

                                <button
                                    onClick={openBulkImportModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:border-[#F59B0F] transition-all"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                    Bulk CSV
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => setShowAdvanced((prev) => !prev)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${showAdvanced
                                ? 'border-[#F59B0F] bg-orange-50 text-[#D17F0A]'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:border-[#F59B0F]'
                                }`}
                        >
                            <FunnelIcon className="w-4 h-4" />
                            Advanced Filters
                            {showAdvanced ? (
                                <ChevronUpIcon className="w-3.5 h-3.5" />
                            ) : (
                                <ChevronDownIcon className="w-3.5 h-3.5" />
                            )}
                        </button>

                        <button
                            onClick={resetFilters}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:border-[#F59B0F] transition-all"
                        >
                            Reset Filters
                        </button>
                    </div>

                    {showAdvanced && (
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Advanced Filters
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Fee ID
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.deliveryFeeId ?? ''}
                                        onChange={(event) => updateQueryAndResetPage({ deliveryFeeId: toNumberOrNull(event.target.value) })}
                                        placeholder="e.g. 25"
                                        aria-label="Delivery fee ID"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Fee From
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.deliveryFeeFrom ?? ''}
                                        onChange={(event) => updateQueryAndResetPage({ deliveryFeeFrom: toNumberOrNull(event.target.value) })}
                                        placeholder="e.g. 500"
                                        aria-label="Minimum delivery fee"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Fee To
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.deliveryFeeTo ?? ''}
                                        onChange={(event) => updateQueryAndResetPage({ deliveryFeeTo: toNumberOrNull(event.target.value) })}
                                        placeholder="e.g. 1500"
                                        aria-label="Maximum delivery fee"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Extra From
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.additionalFeeFrom ?? ''}
                                        onChange={(event) => updateQueryAndResetPage({ additionalFeeFrom: toNumberOrNull(event.target.value) })}
                                        placeholder="e.g. 100"
                                        aria-label="Minimum additional fee"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide block">
                                        Extra To
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={query.additionalFeeTo ?? ''}
                                        onChange={(event) => updateQueryAndResetPage({ additionalFeeTo: toNumberOrNull(event.target.value) })}
                                        placeholder="e.g. 300"
                                        aria-label="Maximum additional fee"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#F59B0F] text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeFilters.length > 0 && (
                        <div className="border-t border-gray-100 pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                                    Active:
                                </span>
                                {activeFilters.map((chip) => (
                                    <span
                                        key={chip.label}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 ring-1 ring-orange-200"
                                    >
                                        {chip.label}
                                        <button
                                            onClick={chip.onRemove}
                                            title={`Remove ${chip.label}`}
                                            className="hover:text-orange-600 transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="text-sm text-gray-700">
                            {isLoading ? (
                                <span className="text-gray-500">Loading...</span>
                            ) : (
                                <>
                                    Showing{' '}
                                    <span className="font-bold text-gray-900">{showingRange.from}</span>{' '}
                                    to{' '}
                                    <span className="font-bold text-gray-900">{showingRange.to}</span>{' '}
                                    of{' '}
                                    <span className="font-bold text-gray-900">{totalCount}</span>{' '}
                                    fees
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 font-medium">Per page:</span>
                                <div style={{ minWidth: 90 }}>
                                    <Select
                                        options={[
                                            { value: 10, label: '10' },
                                            { value: 20, label: '20' },
                                            { value: 50, label: '50' },
                                        ]}
                                        value={{ value: query.countPerPage, label: String(query.countPerPage) }}
                                        onChange={(selected) =>
                                            setQuery((current) => ({
                                                ...current,
                                                countPerPage: Number(selected?.value || 10),
                                                pageNumber: 0,
                                            }))
                                        }
                                        styles={customSelectFieldStyles}
                                        placeholder="Rows per page"
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        aria-label="Rows per page"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() =>
                                        setQuery((current) => ({ ...current, pageNumber: Math.max(0, current.pageNumber - 1) }))
                                    }
                                    disabled={query.pageNumber === 0 || isLoading}
                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all disabled:opacity-40"
                                    title="Previous page"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                                </button>
                                <div className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                                    {query.pageNumber + 1} / {totalPages}
                                </div>
                                <button
                                    onClick={() =>
                                        setQuery((current) => ({
                                            ...current,
                                            pageNumber: Math.min(totalPages - 1, current.pageNumber + 1),
                                        }))
                                    }
                                    disabled={query.pageNumber >= totalPages - 1 || isLoading}
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
                    <p className="font-bold">Error loading delivery fees</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Fee ID
                                </th>
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    City
                                </th>
                                <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    District
                                </th>
                                <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Delivery Fee <small>(LKR)</small>
                                </th>
                                <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Additional Fee <small>(LKR)</small>
                                </th>
                                <th className="text-center py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {deliveryFees.map((deliveryFee) => (
                                <tr key={deliveryFee.id} className="transition-colors hover:bg-orange-50/50">
                                    <td className="py-4 px-4">
                                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 ring-1 ring-gray-200">
                                            #{deliveryFee.id}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-orange-100 text-[#D17F0A] items-center justify-center">
                                                <MapPinIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{deliveryFee.city?.name || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">City ID: {deliveryFee.city?.id ?? '-'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm font-medium text-gray-700">
                                        {deliveryFee.city?.district?.name || deliveryFee.city?.districtName || 'N/A'}
                                    </td>
                                    <td className="py-4 px-4 text-sm font-black text-gray-900 text-right">
                                        {formatCurrency(deliveryFee.fee)}
                                    </td>
                                    <td className="py-4 px-4 text-sm font-semibold text-gray-700 text-right">
                                        {deliveryFee.additionalFee === undefined ? '-' : formatCurrency(deliveryFee.additionalFee)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleViewDeliveryFee(deliveryFee)}
                                                className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#F59B0F] transition-all"
                                                title="View details"
                                                aria-label="View delivery fee details"
                                            >
                                                <EyeIcon className="w-5 h-5 text-gray-700" />
                                            </button>

                                            {canManageDeliveryFees && (
                                                <button
                                                    onClick={() => openUpdateModal(deliveryFee)}
                                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] transition-all"
                                                    title="Update"
                                                    aria-label="Update delivery fee"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5 text-gray-700" />
                                                </button>
                                            )}

                                            {canDeleteDeliveryFees && (
                                                <button
                                                    onClick={() => handleDeleteDeliveryFee(deliveryFee)}
                                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                                    title="Delete"
                                                    aria-label="Delete delivery fee"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}

                                            {(canManageDeliveryFees || canDeleteDeliveryFees) && (
                                                <Menu as="div" className="relative">
                                                <MenuButton
                                                    className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#F59B0F] transition-all"
                                                    title="More actions"
                                                    aria-label="More delivery fee actions"
                                                >
                                                    <EllipsisVerticalIcon className="w-5 h-5 text-gray-700" />
                                                </MenuButton>
                                                <MenuItems className="absolute right-0 z-100 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-100 data-closed:opacity-0 overflow-hidden">
                                                    <div className="p-1">
                                                        {canManageDeliveryFees && (
                                                            <MenuItem>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => openUpdateModal(deliveryFee)}
                                                                        className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-700 rounded-lg transition ${active ? 'bg-gray-100' : ''}`}
                                                                    >
                                                                        <PencilSquareIcon className="w-4 h-4" />
                                                                        Update
                                                                    </button>
                                                                )}
                                                            </MenuItem>
                                                        )}

                                                        {canDeleteDeliveryFees && (
                                                            <MenuItem>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => handleDeleteDeliveryFee(deliveryFee)}
                                                                        className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg transition ${active ? 'bg-red-50' : ''}`}
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </MenuItem>
                                                        )}
                                                    </div>
                                                </MenuItems>
                                            </Menu>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {!isLoading && deliveryFees.length === 0 && (
                        <div className="py-16 text-center">
                            <div className="inline-flex flex-col items-center px-6">
                                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
                                    <TruckIcon className="w-10 h-10 text-[#F59B0F]" />
                                </div>
                                <p className="text-xl font-black text-gray-900 mb-2">
                                    No delivery fees found
                                </p>
                                <p className="text-gray-600">
                                    Try adjusting the city, district, or fee filters.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DeliveryFeeUpsertModal
                isOpen={upsertModalState.isOpen}
                mode={upsertModalState.mode}
                deliveryFee={upsertModalState.deliveryFee}
                defaultCityOptions={upsertCityOptions}
                loadCityOptions={debouncedLoadUpsertCityOptions}
                onClose={closeUpsertModal}
                onSaved={handleUpsertSaved}
            />

            <DeliveryFeeBulkImportModal
                isOpen={isBulkImportOpen}
                onClose={() => setIsBulkImportOpen(false)}
                onCompleted={handleBulkImportCompleted}
            />
        </div>
    );
};

export default DeliveryFees;

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
