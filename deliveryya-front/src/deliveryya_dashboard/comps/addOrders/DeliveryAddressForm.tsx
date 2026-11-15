import {
    BuildingOfficeIcon,
    CheckCircleIcon,
    IdentificationIcon,
    MagnifyingGlassIcon,
    MapIcon,
    MapPinIcon,
    PencilSquareIcon,
    PhoneIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MapLocationModal from './MapLocationModal';
import { BsWhatsapp } from 'react-icons/bs';
import Select from 'react-select';
import { customSelectFieldStyles } from './OrderDetailsForm';
import axiosInstance from '../../../util/AxiosUtil';
import { debounce } from '../../../util/DebounceUtil';

export interface DeliveryAddress {
    id?: number | null;
    recipientName: string;
    address: string;
    mobile1: string;
    mobile2: string;
    whatsapp: string;
    postalCode: string;
    city: string;
    cityId: number | null;
    googleMapLocation: string;
}

interface DeliveryAddressFormProps {
    deliveryAddress: DeliveryAddress;
    onDeliveryAddressChange: (details: DeliveryAddress) => void;
    errors?: Partial<Record<keyof DeliveryAddress, string>>;
}

interface City {
    id: number;
    name: string;
    districtId: number;
    district?: {
        id: number;
        name: string;
    };
}

interface CityOption {
    value: string;
    label: string;
    cityId: number;
}

interface DeliveryHistorySuggestion {
    id: number;
    fullName: string;
    address: string;
    primaryMobile: string;
    secondaryMobile: string;
    whatsapp: string;
    cityName: string;
    cityId: number | null;
    location: string;
}

function DeliveryAddressForm({ deliveryAddress, onDeliveryAddressChange, errors }: DeliveryAddressFormProps) {
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [deliveryHistorySuggestions, setDeliveryHistorySuggestions] = useState<DeliveryHistorySuggestion[]>([]);
    const [deliveryHistoryCounts, setDeliveryHistoryCounts] = useState({
        totalCount: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        pendingDeliveries: 0,
    });
    const [isLoadingDeliveryHistory, setIsLoadingDeliveryHistory] = useState(false);
    const [deliveryHistoryError, setDeliveryHistoryError] = useState<string | null>(null);
    const [deliveryHistoryState, setDeliveryHistoryState] = useState<'idle' | 'loaded' | 'updated'>('idle');
    const deliveryHistoryRequestRef = useRef(0);

    const handleChange = (field: keyof DeliveryAddress, value: string | number | null) => {
        const nextAddress = {
            ...deliveryAddress,
            [field]: value,
        };

        if (deliveryAddress.id != null && field !== 'id') {
            nextAddress.id = null;
            setDeliveryHistoryState('updated');
        }

        onDeliveryAddressChange(nextAddress);
    };

    const handleOpenMapModal = () => {
        setIsMapModalOpen(true);
    };

    const formatPhoneNumber = (value: string) => {
        const digits = value.replace(/\D/g, '');
        return digits;
    };

    const deliveryHistoryQuery = useMemo(() => {
        return [
            deliveryAddress.recipientName,
            deliveryAddress.mobile1,
            deliveryAddress.mobile2,
            deliveryAddress.whatsapp,
            deliveryAddress.address,
            deliveryAddress.city,
        ]
            .map((value) => value.trim())
            .filter(Boolean)
            .join(' ')
            .trim();
    }, [deliveryAddress.recipientName, deliveryAddress.mobile1, deliveryAddress.mobile2, deliveryAddress.whatsapp, deliveryAddress.address, deliveryAddress.city]);

    const handleSelectHistorySuggestion = (suggestion: DeliveryHistorySuggestion) => {
        setDeliveryHistoryState('loaded');
        setDeliveryHistoryError(null);

        onDeliveryAddressChange({
            ...deliveryAddress,
            id: suggestion.id,
            recipientName: suggestion.fullName || deliveryAddress.recipientName,
            address: suggestion.address || deliveryAddress.address,
            mobile1: suggestion.primaryMobile || deliveryAddress.mobile1,
            mobile2: suggestion.secondaryMobile || deliveryAddress.mobile2,
            whatsapp: suggestion.whatsapp || deliveryAddress.whatsapp,
            city: suggestion.cityName || deliveryAddress.city,
            cityId: suggestion.cityId ?? deliveryAddress.cityId,
        });
    };

    const fetchDeliveryHistorySuggestions = useCallback(async (searchQuery: string) => {
        const normalizedQuery = searchQuery.trim();

        if (normalizedQuery.length < 2) {
            setDeliveryHistorySuggestions([]);
            setDeliveryHistoryCounts({
                totalCount: 0,
                successfulDeliveries: 0,
                failedDeliveries: 0,
                pendingDeliveries: 0,
            });
            setDeliveryHistoryError(null);
            setIsLoadingDeliveryHistory(false);
            return;
        }

        const requestId = deliveryHistoryRequestRef.current + 1;
        deliveryHistoryRequestRef.current = requestId;

        setIsLoadingDeliveryHistory(true);
        setDeliveryHistoryError(null);

        try {
            const response = await axiosInstance.post('/orders/get-deliveryTo-history', {
                search: normalizedQuery,
                pageNumber: 0,
                countPerPage: 6,
            });

            if (deliveryHistoryRequestRef.current !== requestId) {
                return;
            }

            const payload = response.data?.object || response.data?.exData || {};
            const relatedDeliveries = Array.isArray(payload?.relatedDeliveriesDetails) ? payload.relatedDeliveriesDetails : [];
            const totalCount = Number(payload?.totalCount ?? relatedDeliveries.length ?? 0) || 0;
            const successfulDeliveries = Number(payload?.successfulDeliveries ?? 0) || 0;
            const failedDeliveries = Number(payload?.failedDeliveries ?? 0) || 0;
            const pendingDeliveries = Math.max(totalCount - successfulDeliveries - failedDeliveries, 0);

            setDeliveryHistoryCounts({
                totalCount,
                successfulDeliveries,
                failedDeliveries,
                pendingDeliveries,
            });

            setDeliveryHistorySuggestions(
                relatedDeliveries.map((item: Record<string, any>) => ({
                    id: Number(item?.id ?? 0),
                    fullName: String(item?.fullName ?? item?.recipientName ?? item?.name ?? 'N/A'),
                    address: String(item?.address ?? 'N/A'),
                    primaryMobile: String(item?.primaryMobile ?? item?.mobile1 ?? item?.mobile ?? ''),
                    secondaryMobile: String(item?.secondaryMobile ?? item?.mobile2 ?? ''),
                    whatsapp: String(item?.whatsapp ?? ''),
                    cityName: String(item?.city?.name ?? item?.cityName ?? item?.location ?? ''),
                    cityId: Number(item?.city?.id ?? item?.cityId ?? 0) || null,
                    location: String(item?.location ?? ''),
                }))
            );
        } catch (error) {
            if (deliveryHistoryRequestRef.current !== requestId) {
                return;
            }

            console.error('Error fetching delivery-to history:', error);
            setDeliveryHistorySuggestions([]);
            setDeliveryHistoryCounts({
                totalCount: 0,
                successfulDeliveries: 0,
                failedDeliveries: 0,
                pendingDeliveries: 0,
            });
            setDeliveryHistoryError('Unable to load delivery suggestions right now.');
        } finally {
            if (deliveryHistoryRequestRef.current === requestId) {
                setIsLoadingDeliveryHistory(false);
            }
        }
    }, []);

    // Fetch cities from API
    const fetchCities = async (searchQuery: string = '') => {
        setIsLoadingCities(true);
        try {
            const response = await axiosInstance.post('/users/get-cities', {
                pageNumber: 0,
                countPerPage: 100,
                totalCount: 0,
                totalPages: 0,
                districtId: 0,
                cityId: null,
                search: searchQuery
            });

            if (response.data && response.data.message == "Success") {
                const cities = response.data.object.items;

                const options: CityOption[] = cities.map((city: any) => {
                    const label = city.district?.name
                        ? `${city.name} (${city.district.name})`
                        : city.districtName
                            ? `${city.name} (${city.districtName})`
                            : city.name;

                    return {
                        value: city.name,
                        label: label,
                        cityId: city.id
                    };
                });

                setCityOptions(options);
            } else {
                console.warn('No cities items found in response');
                setCityOptions([]);
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                console.error('Error response:', (error as any).response);
            }
            setCityOptions([]);
        } finally {
            setIsLoadingCities(false);
        }
    };

    const debouncedFetchCities = useCallback(
        debounce((searchQuery: string) => {
            fetchCities(searchQuery);
        }, 800),
        []
    );

    const debouncedFetchDeliveryHistory = useMemo(
        () => debounce((searchQuery: string) => {
            void fetchDeliveryHistorySuggestions(searchQuery);
        }, 650),
        [fetchDeliveryHistorySuggestions]
    );

    useEffect(() => {
        fetchCities();
    }, []);

    useEffect(() => {
        debouncedFetchDeliveryHistory(deliveryHistoryQuery);
    }, [deliveryHistoryQuery, debouncedFetchDeliveryHistory]);

    const handleInputChange = (inputValue: string) => {
        setSearchInput(inputValue);
        if (inputValue.trim().length >= 2) {
            debouncedFetchCities(inputValue);
        } else if (inputValue.trim().length === 0) {
            fetchCities();
        }
    };


    return (
        <div className="pt-4 mt-4 border-gray-200 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gray-100 rounded-lg">
                    <MapPinIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h3 className="text-[18px] font-bold text-gray-800">Delivery Information</h3>
                    <p className="text-xs text-gray-600">Customer address and contact details</p>
                </div>
            </div>

            {/* Row 1: Recipient Name & Mobile Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                        <IdentificationIcon className="w-5 h-5 text-[#D97706]" />
                        Recipient Name
                        <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={deliveryAddress.recipientName}
                        onChange={(e) => handleChange('recipientName', e.target.value)}
                        placeholder="Enter recipient full name"
                        className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${errors?.recipientName ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                    />
                    {errors?.recipientName && (
                        <p className="mt-1 text-xs text-red-600">{errors.recipientName}</p>
                    )}
                </div>

                <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                        <PhoneIcon className="w-5 h-5 text-[#D97706]" />
                        Mobile Number 1
                        <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        {/* <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            +94
                        </span> */}
                        <input
                            type="tel"
                            value={deliveryAddress.mobile1}
                            onChange={(e) => handleChange('mobile1', formatPhoneNumber(e.target.value))}
                            placeholder="0701234567 or 94701234567"
                            maxLength={12}
                            className={`w-full pl-4 pr-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${errors?.mobile1 ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                        />
                    </div>
                    {errors?.mobile1 && (
                        <p className="mt-1 text-xs text-red-600">{errors.mobile1}</p>
                    )}
                </div>

                <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                        <PhoneIcon className="w-5 h-5 text-[#D97706]" />
                        Mobile Number 2
                    </label>
                    <div className="relative">
                        {/* <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            +94
                        </span> */}
                        <input
                            type="tel"
                            value={deliveryAddress.mobile2}
                            onChange={(e) => handleChange('mobile2', formatPhoneNumber(e.target.value))}
                            placeholder="0701234567 or 94701234567"
                            maxLength={12}
                            className={`w-full pl-4 pr-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${errors?.mobile2 ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                        />
                    </div>
                    {errors?.mobile2 && (
                        <p className="mt-1 text-xs text-red-600">{errors.mobile2}</p>
                    )}
                </div>
            </div>


            {/* Row 3: City, Postal Code, Google Map */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                        <BsWhatsapp className="w-4.5 h-4.5 text-[#D97706]" />
                        Whatsapp
                        <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <div className="relative">
                        {/* <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            +94
                        </span> */}
                        <input
                            type="tel"
                            value={deliveryAddress.whatsapp}
                            onChange={(e) => handleChange('whatsapp', formatPhoneNumber(e.target.value))}
                            placeholder="0701234567 or 94701234567"
                            maxLength={12}
                            className={`w-full pl-4 pr-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${errors?.whatsapp ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                        />
                    </div>
                    {errors?.whatsapp && (
                        <p className="mt-1 text-xs text-red-600">{errors.whatsapp}</p>
                    )}
                </div>
                <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                        <BuildingOfficeIcon className="w-5 h-5 text-[#D97706]" />
                        City
                        <span className="text-red-500">*</span>
                    </label>
                    <Select
                        options={cityOptions}
                        value={cityOptions.find(opt => opt.value === deliveryAddress.city)}
                        onChange={(selected) => {
                            handleChange('city', selected?.value || '');
                            handleChange('cityId', selected?.cityId ?? null);
                        }}
                        onInputChange={handleInputChange}
                        styles={customSelectFieldStyles}
                        placeholder="Search or select city..."
                        isLoading={isLoadingCities}
                        loadingMessage={() => "Loading cities..."}
                        noOptionsMessage={() => searchInput.length >= 2 ? "No cities found" : "Type to search cities"}
                        className="react-select-container rounded-xl"
                        classNamePrefix="react-select"
                        isClearable
                    />
                    {errors?.city && (
                        <p className="mt-1 text-xs text-red-600">{errors.city}</p>
                    )}
                </div>

                {/* <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                        <MapPinIcon className="w-5 h-5 text-[#D97706]" />
                        Postal Code
                        <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={deliveryAddress.postalCode}
                        onChange={(e) => handleChange('postalCode', e.target.value)}
                        placeholder="e.g., 10100"
                        maxLength={5}
                        className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${errors?.postalCode ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                    />
                    {errors?.postalCode && (
                        <p className="mt-1 text-xs text-red-600">{errors.postalCode}</p>
                    )}
                </div> */}

            </div>

            {(deliveryAddress.id != null || deliveryHistoryState !== 'idle') && (
                <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm shadow-sm transition-all duration-300 ${deliveryHistoryState === 'updated' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    <div className="flex items-center gap-2">
                        {deliveryHistoryState === 'updated' ? (
                            <PencilSquareIcon className="h-5 w-5 animate-pulse" />
                        ) : (
                            <CheckCircleIcon className="h-5 w-5" />
                        )}
                        <span className="font-semibold">
                            {deliveryHistoryState === 'updated'
                                ? 'Data updated - this will save as a new record.'
                                : `Loaded from delivery history${deliveryAddress.id != null ? ` #${deliveryAddress.id}` : ''}`}
                        </span>
                    </div>
                </div>
            )}

            <div className="mb-5 rounded-2xl border border-orange-200 bg-linear-to-br from-white to-orange-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <MagnifyingGlassIcon className="h-5 w-5 text-[#F59B0F]" />
                            <h4 className="text-sm font-bold text-gray-800">Delivery History Suggestions</h4>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Search by recipient, phone, address, or city to reuse an existing delivery record.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wide sm:grid-cols-4">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-emerald-700">
                            Success {deliveryHistoryCounts.successfulDeliveries}
                        </div>
                        <div className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-red-700">
                            Failed {deliveryHistoryCounts.failedDeliveries}
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-amber-700">
                            Pending {deliveryHistoryCounts.pendingDeliveries}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-slate-600">
                            Total {deliveryHistoryCounts.totalCount}
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    {isLoadingDeliveryHistory ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-gray-600">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#F59B0F] border-t-transparent" />
                            Loading delivery history...
                        </div>
                    ) : deliveryHistoryError ? (
                        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {deliveryHistoryError}
                        </div>
                    ) : deliveryHistorySuggestions.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {deliveryHistorySuggestions.map((suggestion, index) => {
                                const isSelected = deliveryAddress.id === suggestion.id;

                                return (
                                    <button
                                        key={`${suggestion.id}-${index}`}
                                        type="button"
                                        onClick={() => handleSelectHistorySuggestion(suggestion)}
                                        className={`rounded-2xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${isSelected ? 'border-[#F59B0F] bg-orange-50 shadow-sm' : 'border-orange-100 bg-white hover:border-orange-200'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                                        #{suggestion.id}
                                                    </span>
                                                    <span className="truncate text-sm font-bold text-slate-900">{suggestion.fullName}</span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600">{suggestion.address}</p>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    {suggestion.cityName || suggestion.location || 'No city information'}
                                                </p>
                                            </div>
                                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {isSelected ? 'Loaded' : 'Load'}
                                            </span>
                                        </div>
                                        <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                                            {suggestion.primaryMobile && <p>Primary: {suggestion.primaryMobile}</p>}
                                            {suggestion.secondaryMobile && <p>Secondary: {suggestion.secondaryMobile}</p>}
                                            {suggestion.whatsapp && <p>WhatsApp: {suggestion.whatsapp}</p>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-orange-200 bg-white px-4 py-4 text-sm text-gray-500">
                            Type at least 2 characters in the delivery details to see matching history suggestions.
                        </div>
                    )}
                </div>
            </div>

            {/* Row 2: Address */}
            <div className="group mb-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                    <BuildingOfficeIcon className="w-5 h-5 text-[#D97706]" />
                    Delivery Address
                    <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={deliveryAddress.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Enter complete delivery address including street, house/building number, landmarks..."
                    rows={3}
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 resize-none ${errors?.address ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                />
                {errors?.address && (
                    <p className="mt-1 text-xs text-red-600">{errors.address}</p>
                )}
            </div>

            {/* Google Map */}
            <div className="group mb-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                    <MapIcon className="w-5 h-5 text-[#D97706]" />
                    Google Maps Location URL
                    <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                    <input
                        type="url"
                        value={deliveryAddress.googleMapLocation}
                        onChange={(e) => handleChange('googleMapLocation', e.target.value)}
                        placeholder="Paste Google Maps link here (e.g., https://maps.google.com/...)"
                        className={`w-full pr-40 px-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${errors?.googleMapLocation ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                    />
                    <button
                        type="button"
                        onClick={handleOpenMapModal}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                        Select Location
                    </button>
                </div>
                {errors?.googleMapLocation && (
                    <p className="mt-1 text-xs text-red-600">{errors.googleMapLocation}</p>
                )}
                {deliveryAddress.googleMapLocation && (
                    <a
                        href={deliveryAddress.googleMapLocation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex ms-5 items-center gap-2 mt-2 text-sm text-[#D97706] hover:text-[#92400E] font-medium transition-colors"
                    >
                        <MapIcon className="w-4 h-4" />
                        View on Google Maps
                    </a>
                )}
            </div>

            <MapLocationModal
                isOpen={isMapModalOpen}
                initialUrl={deliveryAddress.googleMapLocation}
                onClose={() => setIsMapModalOpen(false)}
                onConfirm={(url, address) => {
                    if (address) {
                        console.log(address);
                        
                        handleChange('address', address);
                    }

                    handleChange('googleMapLocation', url);
                    setIsMapModalOpen(false);
                }}
            />



            {/* Info Card */}
            <div className="p-4 bg-linear-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                <div className="flex gap-3">
                    <div className="shrink-0">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <MapPinIcon className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-1">Pro Tip</h4>
                        <p className="text-sm text-gray-600">
                            Adding a Google Maps location helps delivery riders find the exact location faster, ensuring quicker and more accurate deliveries.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DeliveryAddressForm
