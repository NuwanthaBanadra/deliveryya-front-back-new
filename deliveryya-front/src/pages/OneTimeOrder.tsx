import { ExclamationTriangleIcon, PlusCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import Swal from 'sweetalert2';
import OneTimeOrderDetailsForm from '../page_comps/oneTimeOrder/OneTimeOrderDetailsForm';
import NavBar from '../page_comps/home/NavBar';
import Footer from '../page_comps/home/Footer';
import type { DeliveryAddress } from '../deliveryya_dashboard/comps/addOrders/DeliveryAddressForm';
import type { OrderDetails } from '../deliveryya_dashboard/comps/addOrders/OrderDetailsForm';
import { swalButtonClasses, swalColors } from '../deliveryya_dashboard/comps/addOrders/swalColors';
import axiosInstance from '../util/AxiosUtil';
import { type OrderDataForPdf } from '../util/PdfUtil';
import { buildOrderSlipPreviewHtml, generateOrderSlipPdfMake } from '../deliveryya_dashboard/comps/pdfGenaretor/PdfGenerator';
import { IoRocketSharp } from 'react-icons/io5';

interface RequestedOrderCode {
    id: number | null;
    code: string;
}

const initialOrderDetails: OrderDetails = {
    orderCode: 0,
    orderCodeLabel: '',
    orderPrice: 0,
    remainingBalance: 0,
    collectivePrice: 0,
    quantity: 1,
    weight: 0,
    description: '',
    deliveryFee: 0,
    dontCollectDeliveryFeeFromCustomer: false,
    paymentType: 1,
};

const initialDeliveryAddress: DeliveryAddress = {
    recipientName: '',
    address: '',
    mobile1: '',
    mobile2: '',
    whatsapp: '',
    postalCode: '',
    city: '',
    cityId: null,
    googleMapLocation: '',
};

const OneTimeOrder = () => {
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string>('');
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [enablePdfAfterSave, setEnablePdfAfterSave] = useState(false);
    const [lastSavedOrder, setLastSavedOrder] = useState<{
        orderCode: string;
        cityName: string;
        orderDetails: OrderDetails;
        deliveryAddress: DeliveryAddress;
    } | null>(null);

    const [orderDetails, setOrderDetails] = useState<OrderDetails>(initialOrderDetails);
    const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(initialDeliveryAddress);

    const [orderErrors, setOrderErrors] = useState<Partial<Record<keyof OrderDetails, string>>>({});
    const [deliveryErrors, setDeliveryErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({});

    const getOrderDataForPdf = (): OrderDataForPdf | null => {
        if (!lastSavedOrder) return null;
        return {
            orderId: '',
            orderCode: lastSavedOrder.orderCode,
            orderPrice: lastSavedOrder.orderDetails.orderPrice,
            collectivePrice:
                Number(lastSavedOrder.orderDetails.orderPrice || 0) +
                (lastSavedOrder.orderDetails.dontCollectDeliveryFeeFromCustomer
                    ? 0
                    : Number(lastSavedOrder.orderDetails.deliveryFee || 0)),
            deliveryFee: lastSavedOrder.orderDetails.deliveryFee,
            quantity: lastSavedOrder.orderDetails.quantity,
            weight: lastSavedOrder.orderDetails.weight,
            description: lastSavedOrder.orderDetails.description,
            recipientName: lastSavedOrder.deliveryAddress.recipientName,
            address: lastSavedOrder.deliveryAddress.address,
            city: lastSavedOrder.cityName || lastSavedOrder.deliveryAddress.city,
            postalCode: lastSavedOrder.deliveryAddress.postalCode,
            mobile1: lastSavedOrder.deliveryAddress.mobile1,
            mobile2: lastSavedOrder.deliveryAddress.mobile2,
            whatsapp: lastSavedOrder.deliveryAddress.whatsapp,
            googleMapLocation: lastSavedOrder.deliveryAddress.googleMapLocation,
        };
    };

    const handleGeneratePDF = async () => {
        const orderData = getOrderDataForPdf();
        if (!orderData) return;
        
        try {
            setShowPrintModal(true);
            setPreviewHtml(''); // Reset previous preview
            const html = await buildOrderSlipPreviewHtml(orderData);
            setPreviewHtml(html);
        } catch (error) {
            console.error('Error generating PDF preview:', error);
        }
    };

    const handleDownloadPDF = async () => {
        const orderData = getOrderDataForPdf();
        if (!orderData) return;

        try {
            await generateOrderSlipPdfMake(orderData, 'download');
        } catch (error) {
            console.error('Error generating PDF:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to generate PDF',
                confirmButtonColor: swalColors.confirm,
                iconColor: swalColors.error,
                background: swalColors.background,
            });
        }
    };

    const validateOrderDetails = (): Partial<Record<keyof OrderDetails, string>> => {
        const errors: Partial<Record<keyof OrderDetails, string>> = {};

        if (orderDetails.orderPrice <= 0) {
            errors.orderPrice = 'Order price must be greater than 0';
        }
        if (orderDetails.quantity <= 0) {
            errors.quantity = 'Quantity must be at least 1';
        }
        if (orderDetails.weight <= 0) {
            errors.weight = 'Weight must be greater than 0';
        }
        if (!orderDetails.paymentType) {
            errors.paymentType = 'Payment type is required';
        }

        return errors;
    };

    const validateDeliveryAddress = (): Partial<Record<keyof DeliveryAddress, string>> => {
        const errors: Partial<Record<keyof DeliveryAddress, string>> = {};
        const normalizePhone = (value: string) => value.replace(/\D/g, '');
        const isValidMobile = (value: string) => /^(?:94|0)(70|76|78|74)\d{7}$/.test(value);

        if (!deliveryAddress.recipientName.trim()) {
            errors.recipientName = 'Recipient name is required';
        }
        if (!deliveryAddress.address.trim()) {
            errors.address = 'Delivery address is required';
        }
        if (!deliveryAddress.mobile1.trim()) {
            errors.mobile1 = 'At least one mobile number is required';
        } else if (!isValidMobile(normalizePhone(deliveryAddress.mobile1))) {
            errors.mobile1 = 'Mobile number must start with 070/074/076/078 or country code 94';
        }
        if (deliveryAddress.mobile2 && !isValidMobile(normalizePhone(deliveryAddress.mobile2))) {
            errors.mobile2 = 'Mobile number must start with 070/074/076/078 or country code 94';
        }
        if (deliveryAddress.whatsapp && !isValidMobile(normalizePhone(deliveryAddress.whatsapp))) {
            errors.whatsapp = 'Whatsapp number must start with 070/074/076/078 or country code 94';
        }
        if (!deliveryAddress.cityId) {
            errors.city = 'City is required';
        }

        return errors;
    };

    const handleDeliveryAddressChange = (next: DeliveryAddress) => {
        const normalizePhone = (value: string) => value.replace(/\D/g, '');
        const isValidMobile = (value: string) => /^(?:94|0)(70|76|78|74)\d{7}$/.test(value);

        setDeliveryAddress(next);
        setDeliveryErrors((prev) => {
            if (!prev || Object.keys(prev).length === 0) {
                return prev;
            }

            const updated = { ...prev };
            if (next.recipientName.trim()) {
                delete updated.recipientName;
            }
            if (next.address.trim()) {
                delete updated.address;
            }
            if (next.mobile1.trim() && isValidMobile(normalizePhone(next.mobile1))) {
                delete updated.mobile1;
            }
            if (!next.mobile2 || isValidMobile(normalizePhone(next.mobile2))) {
                delete updated.mobile2;
            }
            if (!next.whatsapp || isValidMobile(normalizePhone(next.whatsapp))) {
                delete updated.whatsapp;
            }
            if (next.cityId) {
                delete updated.city;
            }
            return updated;
        });
    };

    const requestOrderCode = async (): Promise<RequestedOrderCode> => {
        const response = await axiosInstance.get('/request-codes');

        if (response.data?.message && response.data.message !== 'Success') {
            throw new Error(response.data?.desc || 'Failed to generate order code.');
        }

        const objectOrData = response.data?.object ?? response.data?.data ?? response.data;
        const source = Array.isArray(objectOrData) ? objectOrData[0] : objectOrData;

        const generatedId = Number(source?.id ?? source?.orderCodeId ?? source?.codeId ?? 0);
        const generatedCodeValue =
            source?.code ?? source?.orderCode ?? source?.value ?? source?.label ?? generatedId;
        const generatedCode = String(generatedCodeValue || '').trim();

        if (!generatedCode && generatedId <= 0) {
            throw new Error('Generated order code was empty. Please try again.');
        }

        return {
            id: generatedId > 0 ? generatedId : null,
            code: generatedCode,
        };
    };

    const handleAddOrder = async () => {
        setFormError('');
        setOrderErrors({});
        setDeliveryErrors({});
        setLastSavedOrder(null);

        const orderValidationErrors = validateOrderDetails();
        const deliveryValidationErrors = validateDeliveryAddress();
        const hasErrors =
            Object.keys(orderValidationErrors).length > 0 ||
            Object.keys(deliveryValidationErrors).length > 0;

        if (hasErrors) {
            setOrderErrors(orderValidationErrors);
            setDeliveryErrors(deliveryValidationErrors);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);

        try {
            const requestedCode = await requestOrderCode();
            const paymentTypeId = Number(orderDetails.paymentType || 0);
            const discount = 0;
            const collectivePrice = Number(orderDetails.orderPrice || 0);
            const deliveryFee = Number(orderDetails.deliveryFee || 0);
            const totalPrice = collectivePrice + deliveryFee - discount;

            const payload = {
                discount,
                paymentType: {
                    id: paymentTypeId,
                },
                deliveryFee,
                collectivePrice,
                qty: Number(orderDetails.quantity || 0),
                totalPrice,
                desc: orderDetails.description || '',
                weight: Number(orderDetails.weight || 0),
                deliveryTo: {
                    id: deliveryAddress.id ?? null,
                    address: deliveryAddress.address,
                    primaryMobile: deliveryAddress.mobile1,
                    secondaryMobile: deliveryAddress.mobile2 || '',
                    whatsapp: deliveryAddress.whatsapp || '',
                    fullName: deliveryAddress.recipientName,
                    city: {
                        id: deliveryAddress.cityId,
                    },
                },
                orderCode: {
                    id: requestedCode.id,
                    code: requestedCode.code,
                },
            };

            const response = await axiosInstance.post('/orders/set-order', payload);
            const message = response.data?.message;
            const description = response.data?.desc;

            if (message !== 'Success') {
                await Swal.fire({
                    title: 'Save failed',
                    text: description || 'Failed to save order. Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    confirmButtonColor: swalColors.confirm,
                    iconColor: swalColors.error,
                    background: swalColors.background,
                    customClass: {
                        confirmButton: swalButtonClasses.error,
                    },
                    buttonsStyling: false,
                });
                return;
            }

            setLastSavedOrder({
                orderCode: requestedCode.code,
                cityName: deliveryAddress.city,
                orderDetails,
                deliveryAddress,
            });

            setOrderDetails(initialOrderDetails);
            setDeliveryAddress(initialDeliveryAddress);

            await Swal.fire({
                title: 'Order saved',
                text: description || `Order saved successfully with code ${requestedCode.code}.`,
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: swalColors.confirm,
                iconColor: swalColors.success,
                background: swalColors.background,
                customClass: {
                    confirmButton: swalButtonClasses.confirm,
                },
                buttonsStyling: false,
            });
        } catch (error) {
            console.error('Failed to save one-time order:', error);
            const fallbackMessage =
                error && typeof error === 'object' && 'response' in error
                    ? (error as any).response?.data?.desc
                    : null;

            await Swal.fire({
                title: 'Save failed',
                text: fallbackMessage || (error instanceof Error ? error.message : 'Failed to save order. Please try again.'),
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: swalColors.confirm,
                iconColor: swalColors.error,
                background: swalColors.background,
                customClass: {
                    confirmButton: swalButtonClasses.error,
                },
                buttonsStyling: false,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = async () => {
        const result = await Swal.fire({
            title: 'Reset the form?',
            text: 'All entered data will be cleared.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, reset',
            cancelButtonText: 'Cancel',
            confirmButtonColor: swalColors.confirm,
            cancelButtonColor: swalColors.cancel,
            iconColor: swalColors.warning,
            background: swalColors.background,
            customClass: {
                confirmButton: swalButtonClasses.confirm,
                cancelButton: swalButtonClasses.cancel,
            },
            buttonsStyling: false,
        });

        if (result.isConfirmed) {
            setLastSavedOrder(null);
            setOrderDetails(initialOrderDetails);
            setDeliveryAddress(initialDeliveryAddress);
            setFormError('');
            setOrderErrors({});
            setDeliveryErrors({});

            await Swal.fire({
                title: 'Reset complete',
                text: 'The form has been cleared.',
                icon: 'success',
                timer: 1200,
                showConfirmButton: false,
                iconColor: swalColors.success,
                background: swalColors.background,
            });
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <NavBar />
            <div className="relative min-h-screen overflow-x-hidden bg-linear-to-b from-amber-50 via-white to-orange-50/40">

                <div className="absolute top-16 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-yellow-300 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 sm:w-80 h-64 sm:h-80 bg-orange-300 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-175 bg-amber-200 rounded-full blur-3xl opacity-10 pointer-events-none"></div>

                <div className="relative max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-28 overflow-hidden">

                    <div className="relative text-center space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg max-w-full">
                            <PlusCircleIcon className="w-5 h-5" />
                            <span className="font-bold text-xs sm:text-sm tracking-wide">One-Time COD Order</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-gray-900 leading-tight">
                            One-Time {' '}
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                                Order
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                            Create a one-time order with an auto-generated order code.
                        </p>

                        <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                            <div className="rounded-2xl border border-amber-100 bg-white/90 backdrop-blur-sm px-4 py-3 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Step 1</p>
                                <p className="text-sm font-semibold text-gray-800 mt-1">Read important rules</p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-white/90 backdrop-blur-sm px-4 py-3 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Step 2</p>
                                <p className="text-sm font-semibold text-gray-800 mt-1">Request one-time order form</p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-white/90 backdrop-blur-sm px-4 py-3 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Step 3</p>
                                <p className="text-sm font-semibold text-gray-800 mt-1">Save and generate slip</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-gray-500 px-2">
                            <IoRocketSharp className="w-4 h-4 text-amber-600" />
                            <span className="text-center">Fast request flow with automatic code assignment and optional PDF slip</span>
                        </div>
                    </div>

                </div>

                <div className="mx-auto max-w-6xl pb-12 px-4 sm:px-6 lg:px-8 py-8">

                    {/* Rules and Guidelines Section */}
                    <div className="space-y-6">
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border border-amber-100/80">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Important Rules for One-Time Orders</h2>
                                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                    Please read and understand the following guidelines before placing your order.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors">
                                    <div className="shrink-0 mt-0.5">
                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-1">Order Code Generation</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Each order will be assigned a unique auto-generated order code. This code cannot be changed once created.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors">
                                    <div className="shrink-0 mt-0.5">
                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-1">Accurate Information Required</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Ensure all delivery details are accurate. Double-check recipient name, address, mobile numbers, and city before submitting.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors">
                                    <div className="shrink-0 mt-0.5">
                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-1">Payment on Delivery</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            One-time orders are Cash on Delivery (COD) only. The recipient must have the exact payment ready at the time of delivery.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors">
                                    <div className="shrink-0 mt-0.5">
                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-1">Valid Mobile Numbers</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Mobile numbers must start with 070, 074, 076, or 078 (or country code 94). At least one mobile number is required.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors">
                                    <div className="shrink-0 mt-0.5">
                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-1">Order Processing Time</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Once submitted, your order will be processed within 24 hours. You'll receive confirmation and tracking details.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors">
                                    <div className="shrink-0 mt-0.5">
                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-1">PDF Order Slip</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            After placing an order, you can enable the PDF option to download and print the order slip for your records.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 bg-linear-to-r from-sky-50 to-cyan-50 border border-sky-200 rounded-xl p-4 sm:p-5 shadow-sm">
                                <div className="flex gap-3">
                                    <div className="shrink-0">
                                        <ExclamationTriangleIcon className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-800 mb-1">How it works</h3>
                                        <ul className="space-y-1 text-xs sm:text-sm text-gray-700 leading-relaxed">
                                            <li>• Click "Request for One-Time Order" to open the order form</li>
                                            <li>• Fill in all required order and delivery details</li>
                                            <li>• The system will generate a unique order code automatically</li>
                                            <li>• After submission, you can download and print a PDF slip if needed</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                                {['Auto-generated order code', 'Fast validation before submit', 'Optional PDF slip after save'].map((item) => (
                                    <div
                                        key={item}
                                        className="inline-flex items-center gap-2 bg-white border border-orange-200 text-gray-700 px-4 py-2 rounded-full shadow-sm text-xs sm:text-sm font-semibold"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => setShowOrderForm(true)}
                                    className="group w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] text-white font-bold text-base sm:text-lg transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 flex items-center justify-center gap-3"
                                >
                                    <PlusCircleIcon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                                    Request for One-Time Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Form Modal */}
                {showOrderForm && (
                    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-2 sm:p-4">
                        <div className="bg-white rounded-2xl shadow-2xl border border-amber-100 m-2 sm:m-4 max-w-6xl w-full max-h-[92vh] overflow-y-auto">
                            <div className="sticky top-0 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white p-4 rounded-t-2xl flex justify-between items-center z-10 gap-2">
                                <h2 className="text-base sm:text-xl font-bold pr-2">One-Time COD Order Form</h2>
                                <button
                                    onClick={() => {
                                        setShowOrderForm(false);
                                        setFormError('');
                                        setOrderErrors({});
                                        setDeliveryErrors({});
                                    }}
                                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 bg-linear-to-b from-white to-amber-50/40">
                                {formError && (
                                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm animate-shake">
                                        <div className="flex items-start gap-3">
                                            <div className="shrink-0">
                                                <XCircleIcon className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-red-800 font-semibold text-base mb-1">Unable to proceed</h3>
                                                <p className="text-red-600 text-sm">{formError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div id="order-form" className="space-y-6">
                                    <OneTimeOrderDetailsForm
                                        orderDetails={orderDetails}
                                        onOrderDetailsChange={setOrderDetails}
                                        deliveryAddress={deliveryAddress}
                                        onDeliveryAddressChange={handleDeliveryAddressChange}
                                        orderErrors={orderErrors}
                                        deliveryErrors={deliveryErrors}
                                    />

                                    <div className="bg-white rounded-xl shadow-md p-4 border border-amber-100">
                                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                            <button
                                                onClick={handleReset}
                                                disabled={isSubmitting}
                                                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Reset Form
                                            </button>
                                            <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm font-medium w-full sm:w-auto">
                                                <input
                                                    type="checkbox"
                                                    checked={enablePdfAfterSave}
                                                    onChange={(e) => setEnablePdfAfterSave(e.target.checked)}
                                                    disabled={isSubmitting}
                                                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                Enable PDF Option
                                            </label>
                                            <button
                                                onClick={handleAddOrder}
                                                disabled={isSubmitting}
                                                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-linear-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                <PlusCircleIcon className="w-5 h-5" />
                                                Save One-Time Order
                                            </button>
                                        </div>
                                    </div>

                                    {lastSavedOrder && (
                                        <div className="bg-green-50 rounded-xl shadow-md p-4 border border-green-200">
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-green-700">Order Saved Successfully!</p>
                                                    <p className="text-xs text-green-600">
                                                        Generated code: <span className="font-semibold">{lastSavedOrder.orderCode}</span>
                                                    </p>
                                                </div>
                                                {enablePdfAfterSave && (
                                                    <button
                                                        onClick={handleGeneratePDF}
                                                        className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg whitespace-nowrap"
                                                    >
                                                        Generate PDF
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showPrintModal && lastSavedOrder && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center print:hidden overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-2xl m-4 max-w-4xl w-full print:hidden" id="print-modal">
                            <div className="sticky top-0 bg-amber-600 text-white p-4 rounded-t-xl flex justify-between items-center">
                                <h2 className="text-lg font-bold">Order Slip Preview</h2>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="text-white hover:bg-amber-700 p-2 rounded"
                                >
                                    X
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto h-[70vh]">
                                {previewHtml ? (
                                    <iframe
                                        title="Order Slip Preview"
                                        className="w-full h-full rounded-lg border border-gray-200 bg-white"
                                        srcDoc={previewHtml}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                                        <span className="ml-3 text-gray-600">Generating preview...</span>
                                    </div>
                                )}
                            </div>

                            <div className="sticky bottom-0 bg-gray-100 p-4 rounded-b-xl flex flex-col sm:flex-row gap-3 justify-end border-t">
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download PDF
                                </button>
                                <button
                                    onClick={async () => {
                                        const orderData = getOrderDataForPdf();
                                        if (orderData) {
                                            await generateOrderSlipPdfMake(orderData, 'print');
                                        }
                                    }}
                                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            <Footer />
        </div>
    );
};

export default OneTimeOrder;
