import {
    ChevronDownIcon,
    ChevronUpIcon,
    CubeIcon,
    CurrencyDollarIcon,
    DocumentTextIcon,
    ScaleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import DeliveryAddressForm from '../../deliveryya_dashboard/comps/addOrders/DeliveryAddressForm';
import type { DeliveryAddress } from '../../deliveryya_dashboard/comps/addOrders/DeliveryAddressForm';
import type { OrderDetails } from '../../deliveryya_dashboard/comps/addOrders/OrderDetailsForm';
import { customSelectFieldStyles } from '../../deliveryya_dashboard/comps/addOrders/OrderDetailsForm';
import axiosInstance from '../../util/AxiosUtil';
import Swal from 'sweetalert2';
import { swalButtonClasses, swalColors } from '../../deliveryya_dashboard/comps/addOrders/swalColors';
import RichTextEditor from '../../advance_panel/comps/my_market/products/RichTextEditor';

interface OneTimeOrderDetailsFormProps {
    orderDetails: OrderDetails;
    onOrderDetailsChange: (details: OrderDetails) => void;
    deliveryAddress: DeliveryAddress;
    onDeliveryAddressChange: (details: DeliveryAddress) => void;
    orderErrors?: Partial<Record<keyof OrderDetails, string>>;
    deliveryErrors?: Partial<Record<keyof DeliveryAddress, string>>;
}

const OneTimeOrderDetailsForm = ({
    orderDetails,
    onOrderDetailsChange,
    deliveryAddress,
    onDeliveryAddressChange,
    orderErrors,
    deliveryErrors,
}: OneTimeOrderDetailsFormProps) => {
    const [paymentTypeOptions, setPaymentTypeOptions] = useState<Array<{ value: number; label: string }>>([]);
    const [isLoadingPaymentTypes, setIsLoadingPaymentTypes] = useState(false);
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

    const handleChange = (field: keyof OrderDetails, value: string | number) => {
        onOrderDetailsChange({
            ...orderDetails,
            [field]: value,
        });
    };

    const isBankTransfer = (paymentTypeId?: number) => paymentTypeId === 2;

    const fetchPaymentTypes = async () => {
        setIsLoadingPaymentTypes(true);
        try {
            const response = await axiosInstance.get('/payment/get-payment-types');

            if (response.data && response.data.object && Array.isArray(response.data.object)) {
                const options = response.data.object.map((paymentType: any) => ({
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
            const response = await axiosInstance.get('/payment/get-delivery-cost-by-city-id', {
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
        fetchPaymentTypes();
    }, []);

    useEffect(() => {
        latestOrderDetailsRef.current = orderDetails;
    }, [orderDetails]);

    useEffect(() => {
        if (orderDetails.paymentType) {
            return;
        }

        const defaultPaymentType = paymentTypeOptions.find((option) => option.value === 1);
        if (defaultPaymentType) {
            onOrderDetailsChange({
                ...orderDetails,
                paymentType: 1,
                remainingBalance: isBankTransfer(defaultPaymentType.value) ? 0 : orderDetails.orderPrice,
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
            if (deliverySectionRef.current && !deliverySectionRef.current.contains(event.target as Node)) {
                setIsDeliveryOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDeliveryOpen]);

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-5 animate-fade-in">
                {/* <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-800">Order Code</p>
                    <p className="text-xs text-amber-700">This form auto-generates an order code when you save.</p>
                </div> */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                            <DocumentTextIcon className="w-5 h-5 text-[#D97706]" />
                            Payment Type
                            <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={paymentTypeOptions}
                            value={paymentTypeOptions.find((opt) => opt.value === orderDetails.paymentType)}
                            onChange={(selected) => {
                                const nextPaymentType = Number(selected?.value || 0);
                                const nextRemaining = isBankTransfer(nextPaymentType) ? 0 : orderDetails.orderPrice;

                                onOrderDetailsChange({
                                    ...orderDetails,
                                    paymentType: nextPaymentType,
                                    remainingBalance: nextRemaining,
                                });
                            }}
                            styles={customSelectFieldStyles}
                            placeholder="Select payment type..."
                            isLoading={isLoadingPaymentTypes}
                            loadingMessage={() => 'Loading payment types...'}
                            noOptionsMessage={() => 'No payment types available'}
                            className={`react-select-container ${orderErrors?.paymentType ? 'ring-1 ring-red-300 rounded-xl' : ''}`}
                            classNamePrefix="react-select"
                        />
                        {orderErrors?.paymentType && <p className="mt-1 text-xs text-red-600">{orderErrors.paymentType}</p>}
                    </div>

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
                                const selectedPaymentType = paymentTypeOptions.find(
                                    (option) => option.value === orderDetails.paymentType
                                );
                                const nextRemaining = isBankTransfer(selectedPaymentType?.value) ? 0 : nextPrice;

                                onOrderDetailsChange({
                                    ...orderDetails,
                                    orderPrice: nextPrice,
                                    remainingBalance: nextRemaining,
                                });
                            }}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`w-full px-4 py-3.5 text-right border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${orderErrors?.orderPrice ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                        />
                        {orderErrors?.orderPrice && <p className="mt-1 text-xs text-red-600">{orderErrors.orderPrice}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                                    (option) => option.value === orderDetails.paymentType
                                );
                                const updatedRemaining = isBankTransfer(selectedPaymentType?.value) ? 0 : nextRemaining;

                                handleChange('remainingBalance', updatedRemaining);
                            }}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`w-full px-4 py-3.5 text-right border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${orderErrors?.orderPrice ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                        />
                    </div>

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
                        {orderErrors?.weight && <p className="mt-1 text-xs text-red-600">{orderErrors.weight}</p>}
                    </div>

                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                            <ScaleIcon className="w-5 h-5 text-[#D97706]" />
                            Quantity
                        </label>
                        <input
                            type="number"
                            value={orderDetails.quantity || ''}
                            onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`text-center w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 outline-none transition-all duration-300 hover:border-amber-300 bg-white placeholder:text-gray-400 ${orderErrors?.quantity ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#D97706] focus:ring-[#D97706]/10'}`}
                        />
                        {orderErrors?.quantity && <p className="mt-1 text-xs text-red-600">{orderErrors.quantity}</p>}
                    </div>
                </div>

                <div className="group border-b-2 border-slate-200 pb-6">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                        <DocumentTextIcon className="w-5 h-5 text-[#D97706]" />
                        Description
                    </label>
                    <RichTextEditor
                        content={orderDetails.description}
                        onChange={(html) => handleChange('description', html)}
                    />
                    {orderErrors?.description && <p className="mt-1 text-xs text-red-600">{orderErrors.description}</p>}
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
                            {isDeliveryOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
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

                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600 font-medium">Subtotal:</span>
                        <span className="text-lg font-semibold text-gray-800">Rs. {orderDetails.remainingBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600 font-medium">Delivery Fee:</span>
                        <span className="text-lg font-semibold text-gray-800">
                            {isLoadingDeliveryCost ? 'Calculating...' : `Rs. ${orderDetails.deliveryFee.toFixed(2)}`}
                        </span>
                    </div>
                    <div className="border-t-2 border-amber-300 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-700">Total Amount (COD):</span>
                            <span className="text-xl font-bold text-amber-600">
                                Rs. {(orderDetails.remainingBalance + orderDetails.deliveryFee).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OneTimeOrderDetailsForm;
