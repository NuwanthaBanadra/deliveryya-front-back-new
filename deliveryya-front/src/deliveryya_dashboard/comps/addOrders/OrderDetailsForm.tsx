import { BuildingOfficeIcon, CubeIcon, CurrencyDollarIcon, DocumentTextIcon, ScaleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef, useCallback } from 'react';
import Select from 'react-select';
import DeliveryAddressForm from './DeliveryAddressForm';
import type { DeliveryAddress } from './DeliveryAddressForm';
import axiosInstance from '../../../util/AxiosUtil';
import RichTextEditor from '../../../advance_panel/comps/my_market/products/RichTextEditor';
import Swal from 'sweetalert2';
import { swalButtonClasses, swalColors } from './swalColors';
import { debounce } from '../../../util/DebounceUtil';

export interface OrderDetails {
    orderCode: number | string;
    orderCodeLabel?: string;
    orderPrice: number;
    collectivePrice: number;
    quantity: number;
    weight: number;
    description: string;
    deliveryFee: number;
    dontCollectDeliveryFeeFromCustomer: boolean;
    paymentType: number;
    remainingBalance: number;
}

interface OrderDetailsFormProps {
    orderDetails: OrderDetails;
    onOrderDetailsChange: (details: OrderDetails) => void;
    deliveryAddress: DeliveryAddress;
    onDeliveryAddressChange: (details: DeliveryAddress) => void;
    orderErrors?: Partial<Record<keyof OrderDetails, string>>;
    deliveryErrors?: Partial<Record<keyof DeliveryAddress, string>>;
}

interface CityOption {
    value: string;
    label: string;
    cityId: number;
}

const OrderDetailsForm = ({ orderDetails, onOrderDetailsChange, deliveryAddress, onDeliveryAddressChange, orderErrors, deliveryErrors,
}: OrderDetailsFormProps) => {
    const [orderCodeOptions, setOrderCodeOptions] = useState<Array<{ value: number; label: string }>>([]);
    const [isLoadingOrderCodes, setIsLoadingOrderCodes] = useState(false);
    const [paymentTypeOptions, setPaymentTypeOptions] = useState<Array<{ value: number; label: string }>>([]);
    const [isLoadingPaymentTypes, setIsLoadingPaymentTypes] = useState(false);
    const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [isLoadingDeliveryCost, setIsLoadingDeliveryCost] = useState(false);
    const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
    const deliverySectionRef = useRef<HTMLDivElement | null>(null);
    const hasDeliveryErrors = Boolean(deliveryErrors && Object.keys(deliveryErrors).length > 0);
    const latestOrderDetailsRef = useRef(orderDetails);

    useEffect(() => {
        if (!hasDeliveryErrors) {
            return;
        }

        setIsDeliveryOpen(true);
        deliverySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [hasDeliveryErrors]);

    const handleChange = (field: keyof OrderDetails, value: string | number | boolean) => {
        onOrderDetailsChange({
            ...orderDetails,
            [field]: value,
        });
    };

    const isCodPaymentType = (paymentTypeId?: number) => paymentTypeId === 1;
    const isCodPayment = isCodPaymentType(orderDetails.paymentType);

    const fetchCities = useCallback(async (searchQuery: string = '') => {
        setIsLoadingCities(true);
        try {
            const response = await axiosInstance.post('/users/get-cities', {
                pageNumber: 0,
                countPerPage: 100,
                totalCount: 0,
                totalPages: 0,
                districtId: 0,
                cityId: null,
                search: searchQuery,
            });

            if (response.data && response.data.message === 'Success') {
                const cities = response.data.object?.items ?? [];

                const options: CityOption[] = cities.map((city: any) => {
                    const label = city.district?.name
                        ? `${city.name} (${city.district.name})`
                        : city.districtName
                            ? `${city.name} (${city.districtName})`
                            : city.name;

                    return {
                        value: city.name,
                        label,
                        cityId: city.id,
                    };
                });

                setCityOptions(options);
            } else {
                setCityOptions([]);
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            setCityOptions([]);
        } finally {
            setIsLoadingCities(false);
        }
    }, []);

    const debouncedFetchCities = useRef(
        debounce((searchQuery: string) => {
            void fetchCities(searchQuery);
        }, 800)
    ).current;

    const fetchOrderCodes = async () => {
        setIsLoadingOrderCodes(true);
        try {
            const response = await axiosInstance.get('/orders/get-order-codes?isFilled=false');

            if (response.data && response.data.object && Array.isArray(response.data.object)) {
                const codes = response.data.object;
                const options = codes.map((order: any) => {
                    const idValue = Number(order?.id ?? order?.code ?? 0);
                    const labelValue = String(order?.code ?? order?.id ?? '');
                    return {
                        value: idValue,
                        label: labelValue,
                    };
                });

                setOrderCodeOptions(options);
            } else {
                setOrderCodeOptions([]);
            }
        } catch (error) {
            console.error('Error fetching order codes:', error);
            setOrderCodeOptions([]);
        } finally {
            setIsLoadingOrderCodes(false);
        }
    };

    const fetchPaymentTypes = async () => {
        setIsLoadingPaymentTypes(true);
        try {
            const response = await axiosInstance.get('/payment/get-payment-types');

            if (response.data && response.data.object && Array.isArray(response.data.object)) {
                const types = response.data.object.filter((paymentType: any) => {
                    const id = Number(paymentType.id ?? paymentType.code ?? 0);
                    return id === 1 || id === 2;
                });
                const options = types.map((paymentType: any) => ({
                    value: Number(paymentType.id ?? paymentType.code ?? 0),
                    label: String(paymentType.name ?? paymentType.code ?? paymentType.id ?? ''),
                }));

                setPaymentTypeOptions(options);
            } else {
                setPaymentTypeOptions([]);
            }
        } catch (error) {
            console.error('Error fetching payment types:', error);
            setPaymentTypeOptions([]);
        } finally {
            setIsLoadingPaymentTypes(false);
        }
    };

    const fetchDeliveryCost = async (cityId: number, weight: number) => {
        setIsLoadingDeliveryCost(true);
        try {
            const response = await axiosInstance.get('/delivery-fees/get-delivery-cost-by-city-id', {
                params: {
                    id: cityId,
                    weight,
                },
            });

            const hasError = response.data?.message === 'Error' || response.data?.object == null;
            if (hasError) {
                const errorMessage = response.data?.desc || 'Delivery fee not available for selected city.';
                await Swal.fire({
                    icon: 'error',
                    title: 'Delivery fee not found',
                    text: errorMessage,
                    confirmButtonText: 'OK',
                    confirmButtonColor: swalColors.confirm,
                    iconColor: swalColors.error,
                    background: swalColors.background,
                    customClass: {
                        confirmButton: swalButtonClasses.error,
                    },
                    buttonsStyling: false,
                });
                onDeliveryAddressChange({
                    ...deliveryAddress,
                    city: '',
                    cityId: null,
                });
                onOrderDetailsChange({
                    ...latestOrderDetailsRef.current,
                    deliveryFee: 0,
                });
                return;
            }

            const deliveryCost = Number(response.data?.object ?? 0);
            onOrderDetailsChange({
                ...latestOrderDetailsRef.current,
                deliveryFee: deliveryCost,
            });
        } catch (error) {
            console.error('Error fetching delivery cost:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Failed to fetch delivery fee',
                text: 'Please try again after selecting the city and weight.',
                confirmButtonText: 'OK',
                confirmButtonColor: swalColors.confirm,
                iconColor: swalColors.error,
                background: swalColors.background,
                customClass: {
                    confirmButton: swalButtonClasses.error,
                },
                buttonsStyling: false,
            });
            onDeliveryAddressChange({
                ...deliveryAddress,
                city: '',
                cityId: null,
            });
            onOrderDetailsChange({
                ...latestOrderDetailsRef.current,
                deliveryFee: 0,
            });
        } finally {
            setIsLoadingDeliveryCost(false);
        }
    };

    useEffect(() => {
        fetchOrderCodes();
        fetchPaymentTypes();
        fetchCities();
    }, []);

    useEffect(() => {
        latestOrderDetailsRef.current = orderDetails;
    }, [orderDetails]);

    useEffect(() => {
        if (orderDetails.paymentType) {
            return;
        }

        const defaultPaymentType = paymentTypeOptions.find(option => option.value === 1);
        if (defaultPaymentType) {
            onOrderDetailsChange({
                ...orderDetails,
                paymentType: 1,
                remainingBalance: isCodPaymentType(defaultPaymentType.value) ? 0 : orderDetails.orderPrice,
            });
        }
    }, [paymentTypeOptions, orderDetails, onOrderDetailsChange]);

    useEffect(() => {
        if (hasDeliveryErrors) {
            setIsDeliveryOpen(true);
        }
    }, [hasDeliveryErrors]);

    useEffect(() => {
        if (!deliveryAddress.cityId || orderDetails.weight <= 0) {
            if (latestOrderDetailsRef.current.deliveryFee !== 0) {
                onOrderDetailsChange({
                    ...latestOrderDetailsRef.current,
                    deliveryFee: 0,
                });
            }
            return;
        }

        const timeoutId = window.setTimeout(() => {
            fetchDeliveryCost(deliveryAddress.cityId as number, orderDetails.weight);
        }, 400);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [deliveryAddress.cityId, orderDetails.weight, onOrderDetailsChange]);

    useEffect(() => {
        if (!isDeliveryOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (
                deliverySectionRef.current &&
                !deliverySectionRef.current.contains(event.target as Node)
            ) {
                setIsDeliveryOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDeliveryOpen]);

        const handleCityInputChange = (inputValue: string) => {
            setSearchInput(inputValue);

            if (inputValue.trim().length >= 2) {
                debouncedFetchCities(inputValue);
            } else if (inputValue.trim().length === 0) {
                fetchCities();
            }
        };

        const handleCityChange = (selected: CityOption | null) => {
            onDeliveryAddressChange({
                ...deliveryAddress,
                id: null,
                city: selected?.value || '',
                cityId: selected?.cityId ?? null,
            });
        };

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Header with gradient */}
            {/* <div className="bg-amber-500 p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent"></div>
                <div className="relative flex items-center gap-3">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                        <DocumentTextIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">Order Details</h2>
                    </div>
                </div>
            </div> */}

            {/* Form Content */}
            <div className="p-6 space-y-5 animate-fade-in">
                {/* Row 1: Order Code, Order Price */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Order Code */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                            <DocumentTextIcon className="w-5 h-5 text-[#D97706]" />
                            Order Code
                            <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={orderCodeOptions}
                            value={orderCodeOptions.find(opt => opt.value === orderDetails.orderCode)}
                            onChange={(selected) => {
                                onOrderDetailsChange({
                                    ...orderDetails,
                                    orderCode: selected?.value ?? 0,
                                    orderCodeLabel: selected?.label ?? '',
                                });
                            }}
                            styles={customSelectFieldStyles}
                            placeholder="Select order code..."
                            isLoading={isLoadingOrderCodes}
                            loadingMessage={() => "Loading order codes..."}
                            noOptionsMessage={() => "No order codes available"}
                            className={`react-select-container ${orderErrors?.orderCode ? 'ring-1 ring-red-300 rounded-xl' : ''}`}
                            classNamePrefix="react-select"
                        />
                        {orderErrors?.orderCode && (
                            <p className="mt-1 text-xs text-red-600">{orderErrors.orderCode}</p>
                        )}
                    </div>
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                            <DocumentTextIcon className="w-5 h-5 text-[#D97706]" />
                            Payment Type
                            <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={paymentTypeOptions}
                            value={paymentTypeOptions.find(opt => opt.value === orderDetails.paymentType)}
                            onChange={(selected) => {
                                const nextPaymentType = Number(selected?.value || 0);
                                const nextRemaining = isCodPaymentType(nextPaymentType)
                                    ? 0
                                    : orderDetails.orderPrice;

                                onOrderDetailsChange({
                                    ...orderDetails,
                                    paymentType: nextPaymentType,
                                    // remainingBalance: nextRemaining,
                                });
                            }}
                            styles={customSelectFieldStyles}
                            placeholder="Select payment type..."
                            isLoading={isLoadingPaymentTypes}
                            loadingMessage={() => "Loading payment types..."}
                            noOptionsMessage={() => "No payment types available"}
                            className={`react-select-container ${orderErrors?.paymentType ? 'ring-1 ring-red-300 rounded-xl' : ''}`}
                            classNamePrefix="react-select"
                        />
                        {orderErrors?.paymentType && (
                            <p className="mt-1 text-xs text-red-600">{orderErrors.paymentType}</p>
                        )}
                    </div>
                    {/* Order Value */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                            <CurrencyDollarIcon className="w-5 h-5 text-[#D97706]" />
                            Order Value (LKR)
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={orderDetails.orderPrice || ''}
                            onChange={(e) => {
                                const nextPrice = parseFloat(e.target.value) || 0;
                                // const selectedPaymentType = paymentTypeOptions.find(
                                //     option => option.value === orderDetails.paymentType
                                // );
                                // const nextRemaining = isCodPaymentType(selectedPaymentType?.value)
                                //     ? 0
                                //     : nextPrice;

                                onOrderDetailsChange({
                                    ...orderDetails,
                                    orderPrice: nextPrice,
                                    remainingBalance: nextPrice,
                                });
                            }}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`w-full px-4 py-3.5 text-right border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${orderErrors?.orderPrice ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                        />
                        {orderErrors?.orderPrice && (
                            <p className="mt-1 text-xs text-red-600">{orderErrors.orderPrice}</p>
                        )}
                    </div>


                </div>

                {/* Row 2: Delivery Fee, City & Weight */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* Remaining Balance */}
                    {!isCodPayment && (
                        <div className="group">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                                <CurrencyDollarIcon className="w-5 h-5 text-[#D97706]" />
                                Remaining Balance (LKR)
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={orderDetails.remainingBalance || ''}
                                onChange={(e) => {
                                    const nextRemaining = parseFloat(e.target.value) || 0;
                                    const selectedPaymentType = paymentTypeOptions.find(
                                        option => option.value === orderDetails.paymentType
                                    );
                                    const cappedRemaining = Math.min(nextRemaining, orderDetails.orderPrice || 0);
                                    const updatedRemaining = isCodPaymentType(selectedPaymentType?.value)
                                        ? 0
                                        : cappedRemaining;

                                    handleChange('remainingBalance', updatedRemaining);
                                }}
                                placeholder="0.00"
                                min="0"
                                max={orderDetails.orderPrice || 0}
                                step="0.01"
                                className={`w-full px-4 py-3.5 text-right border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${orderErrors?.orderPrice ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                            />
                            {orderErrors?.orderPrice && (
                                <p className="mt-1 text-xs text-red-600">{orderErrors.orderPrice}</p>
                            )}
                        </div>
                    )}

                    {/* Weight */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                            <ScaleIcon className="w-5 h-5 text-[#D97706]" />
                            Weight (kg)
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={orderDetails.weight || ''}
                            onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`text-center w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${orderErrors?.weight ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                        />
                        {orderErrors?.weight && (
                            <p className="mt-1 text-xs text-red-600">{orderErrors.weight}</p>
                        )}
                    </div>

                    {/* City */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                            <BuildingOfficeIcon className="w-5 h-5 text-[#D97706]" />
                            City
                            <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={cityOptions}
                            value={cityOptions.find((opt) => opt.value === deliveryAddress.city) || null}
                            onChange={(selected) => handleCityChange(selected as CityOption | null)}
                            onInputChange={handleCityInputChange}
                            styles={customSelectFieldStyles}
                            placeholder="Search or select city..."
                            isLoading={isLoadingCities}
                            loadingMessage={() => 'Loading cities...'}
                            noOptionsMessage={() => (searchInput.trim().length >= 2 ? 'No cities found' : 'Type to search cities')}
                            className="react-select-container rounded-xl"
                            classNamePrefix="react-select"
                            isClearable
                        />
                    </div>
                    
                </div>

                <div className="group border-b-2 border-slate-200 pb-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={orderDetails.dontCollectDeliveryFeeFromCustomer}
                            onChange={(e) => handleChange('dontCollectDeliveryFeeFromCustomer', e.target.checked)}
                            className="h-5 w-5 accent-amber-400  rounded-full"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Don't Collect Delivery Fee From Customer
                        </span>
                    </label>
                </div>

                <div className="group border-b-2 border-slate-200  pb-6">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5 ">
                        <DocumentTextIcon className="w-5 h-5 text-[#D97706]" />
                        Description
                    </label>
                    <RichTextEditor
                        content={orderDetails.description}
                        onChange={(html) => handleChange('description', html)}
                    />
                    {orderErrors?.description && (
                        <p className="mt-1 text-xs text-red-600">{orderErrors.description}</p>
                    )}
                </div>

                <div ref={deliverySectionRef} className="border-b-2 border-slate-200 pb-6">
                    <button
                        type="button"
                        onClick={() => setIsDeliveryOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left transition-all duration-300 hover:border-amber-300 focus:outline-none focus:ring-4 focus:ring-[#D97706]/10"
                        aria-expanded={isDeliveryOpen}
                    >
                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <CubeIcon className="w-5 h-5 text-[#D97706]" />
                            Delivery Details
                        </span>
                        <span className="text-gray-500 transition-transform duration-300">
                            {isDeliveryOpen ? (
                                <ChevronUpIcon className="w-5 h-5" />
                            ) : (
                                <ChevronDownIcon className="w-5 h-5" />
                            )}
                        </span>
                    </button>

                    <div
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${isDeliveryOpen ? 'max-h-500 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}
                    >
                        <div className={`transition-all duration-500 ${isDeliveryOpen ? 'translate-y-0' : '-translate-y-2'}`}>
                            <DeliveryAddressForm
                                deliveryAddress={deliveryAddress}
                                onDeliveryAddressChange={onDeliveryAddressChange}
                                errors={deliveryErrors}
                            />
                        </div>
                    </div>
                </div>

                {/* Total Summary Card */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600 font-medium">Subtotal:</span>
                        <span className="text-lg font-semibold text-gray-800">
                            Rs. {orderDetails.remainingBalance.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600 font-medium">Delivery Fee:</span>
                        <span className="text-lg font-semibold text-gray-800">
                            {isLoadingDeliveryCost
                                ? 'Calculating...'
                                : `Rs. ${orderDetails.deliveryFee.toFixed(2)}`}
                        </span>
                    </div>
                    <div className="border-t-2 border-amber-300 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-700">Total Amount (COD):</span>
                            <span className="text-xl font-bold text-amber-600">
                                Rs. {(
                                    orderDetails.remainingBalance +
                                    (orderDetails.dontCollectDeliveryFeeFromCustomer ? 0 : orderDetails.deliveryFee)
                                ).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsForm;



export const customSelectFieldStyles = {
    control: (base: any, state: any) => ({
        ...base,
        padding: '0.5rem',
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
