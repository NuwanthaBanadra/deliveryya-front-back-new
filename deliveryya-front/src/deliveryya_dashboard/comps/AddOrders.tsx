import {
    ExclamationTriangleIcon,
    PlusCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../util/AxiosUtil';
import type { OrderDataForPdf } from '../../util/PdfUtil';
import type { DeliveryAddress } from './addOrders/DeliveryAddressForm';
import type { OrderDetails } from './addOrders/OrderDetailsForm';
import OrderDetailsForm from './addOrders/OrderDetailsForm';
import { swalButtonClasses, swalColors } from './addOrders/swalColors';
import ThirdPartySenderForm, { type ThirdPartySenderData } from './addOrders/ThirdPartySenderForm';
import { buildOrderSlipPreviewHtml, generateOrderSlipPdfMake } from './pdfGenaretor/PdfGenerator';
import JwtUtil from '../../util/JwtUtil';


const AddOrders = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string>('');
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [lastSavedOrder, setLastSavedOrder] = useState<{
        orderCode: string;
        cityName: string;
        orderCodeUserId?: number;
        marketOrderId?: number;
        thirdPartySender?: {
            id?: number;
            name?: string;
            address?: string;
            note?: string;
            first_mob?: string;
            sec_mob?: string;
            whatsapp?: string;
        };
        orderDetails: OrderDetails;
        deliveryAddress: DeliveryAddress;
    } | null>(null);
    const [previewHtml, setPreviewHtml] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const [orderErrors, setOrderErrors] = useState<Partial<Record<keyof OrderDetails, string>>>({});
    const [deliveryErrors, setDeliveryErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({});
    const [thirdPartyErrors, setThirdPartyErrors] = useState<Partial<Record<keyof ThirdPartySenderData, string>>>({});

    const [isEmployee, setIsEmployee] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (token) {
            const decoded = JwtUtil.decodeToken(token);
            if (decoded && decoded.isEmployee) {
                setIsEmployee(true);
            }
        }
    }, []);

    const [thirdPartyDetails, setThirdPartyDetails] = useState<ThirdPartySenderData>({
        id: null,
        name: '',
        address: '',
        note: '',
        nic: '',
        mobile1: '',
        mobile2: '',
        whatsapp: ''
    });

    const getOrderDataForPdf = (): OrderDataForPdf | null => {
        if (!lastSavedOrder) {
            return null;
        }

        return {
            orderId: '',
            orderCode: lastSavedOrder.orderCode,
            orderPrice: lastSavedOrder.orderDetails.orderPrice,
            collectivePrice:
                Number(lastSavedOrder.orderDetails.remainingBalance || 0) +
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
            orderCodeUserId: lastSavedOrder.orderCodeUserId,
            marketOrderId: lastSavedOrder.marketOrderId,
            thirdPartySender: lastSavedOrder.thirdPartySender,
        };
    };

    useEffect(() => {
        const loadPreview = async () => {
            if (!showPrintModal || !lastSavedOrder) {
                setPreviewHtml('');
                return;
            }

            const orderData = getOrderDataForPdf();
            if (!orderData) {
                setPreviewHtml('');
                return;
            }

            setIsPreviewLoading(true);
            try {
                const html = await buildOrderSlipPreviewHtml(orderData);
                setPreviewHtml(html);
            } catch (error) {
                console.error('Failed to load slip preview:', error);
                setPreviewHtml('');
            } finally {
                setIsPreviewLoading(false);
            }
        };

        void loadPreview();
    }, [showPrintModal, lastSavedOrder]);

    const handleDownloadPDF = async () => {
        const orderData = getOrderDataForPdf();
        if (!orderData) return;

        try {
            await generateOrderSlipPdfMake(orderData, 'download');
        } catch (error) {
            console.error('Error generating PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to generate PDF',
                confirmButtonColor: swalColors.confirm,
                iconColor: swalColors.error,
                background: swalColors.background,
            });
        }
    };

    const handlePrintPDF = async () => {
        const orderData = getOrderDataForPdf();
        if (!orderData) return;

        try {
            await generateOrderSlipPdfMake(orderData, 'print');
        } catch (error) {
            console.error('Error generating PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to generate PDF',
                confirmButtonColor: swalColors.confirm,
                iconColor: swalColors.error,
                background: swalColors.background,
            });
        }
    };

    // Single Order State
    const [orderDetails, setOrderDetails] = useState<OrderDetails>({
        orderCode: 0,
        orderCodeLabel: '',
        orderPrice: 0,
        collectivePrice: 0,
        remainingBalance: 0,
        quantity: 1,
        weight: 0,
        description: '',
        deliveryFee: 0,
        dontCollectDeliveryFeeFromCustomer: false,
        paymentType: 1,
    });

    const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
        recipientName: '',
        address: '',
        mobile1: '',
        mobile2: '',
        whatsapp: '',
        postalCode: '',
        city: '',
        cityId: null,
        googleMapLocation: '',
    });

    const validateOrderDetails = (): Partial<Record<keyof OrderDetails, string>> => {
        const errors: Partial<Record<keyof OrderDetails, string>> = {};

        const hasOrderCode =
            typeof orderDetails.orderCode === 'string'
                ? Boolean(orderDetails.orderCode.trim())
                : Number(orderDetails.orderCode || 0) > 0;

        if (!hasOrderCode) {
            errors.orderCode = 'Order code is required';
        }
        if (orderDetails.orderPrice <= 0) {
            errors.orderPrice = 'Order price must be greater than 0';
        }
        if (orderDetails.quantity <= 0) {
            errors.quantity = 'Quantity must be at least 1';
        }
        if (orderDetails.weight <= 0) {
            errors.weight = 'Weight must be greater than 0';
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

    const validateThirdPartySender = (): Partial<Record<keyof ThirdPartySenderData, string>> => {
        const errors: Partial<Record<keyof ThirdPartySenderData, string>> = {};
        const hasAnyFieldFilled = Boolean(
            thirdPartyDetails.name.trim() ||
            thirdPartyDetails.nic.trim() ||
            thirdPartyDetails.mobile1.trim() ||
            thirdPartyDetails.whatsapp.trim() ||
            thirdPartyDetails.mobile2.trim() ||
            thirdPartyDetails.address.trim() ||
            thirdPartyDetails.note.trim()
        );

        if (!hasAnyFieldFilled) {
            return errors;
        }

        const normalizePhone = (value: string) => value.replace(/\D/g, '');
        const isValidMobile = (value: string) => /^(?:94|0)(70|76|78|74|71|72|75|77)\d{7}$/.test(value); // updated regex

        if (!thirdPartyDetails.name.trim()) {
            errors.name = 'Sender name is required when filling third party details';
        }
        
        if (!thirdPartyDetails.mobile1.trim()) {
            errors.mobile1 = 'First mobile number is required';
        }
        if (!thirdPartyDetails.mobile2.trim()) {
            errors.mobile2 = 'Second mobile number is required';
        }
        if (!thirdPartyDetails.whatsapp.trim()) {
            errors.whatsapp = 'WhatsApp number is required';
        }

        if (thirdPartyDetails.mobile1.trim() && !isValidMobile(normalizePhone(thirdPartyDetails.mobile1))) {
            errors.mobile1 = 'Invalid mobile number';
        }
        if (thirdPartyDetails.whatsapp.trim() && !isValidMobile(normalizePhone(thirdPartyDetails.whatsapp))) {
            errors.whatsapp = 'Invalid WhatsApp number';
        }
        if (thirdPartyDetails.mobile2.trim() && !isValidMobile(normalizePhone(thirdPartyDetails.mobile2))) {
            errors.mobile2 = 'Invalid mobile number';
        }

        return errors;
    };

    const handleDeliveryAddressChange = (next: DeliveryAddress) => {
        const normalizePhone = (value: string) => value.replace(/\D/g, '');
        const isValidMobile = (value: string) => /^(?:94|0)(70|76|78|74)\d{7}$/.test(value);

        setDeliveryAddress(next);
        setDeliveryErrors(prev => {
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

    const handleAddOrder = async () => {
        // console.log(orderDetails.description);

        setFormError('');
        setOrderErrors({});
        setDeliveryErrors({});
        setThirdPartyErrors({});
        setLastSavedOrder(null);

        const orderValidationErrors = validateOrderDetails();
        const deliveryValidationErrors = validateDeliveryAddress();
        const thirdPartyValidationErrors = validateThirdPartySender();
        
        const hasErrors =
            Object.keys(orderValidationErrors).length > 0 ||
            Object.keys(deliveryValidationErrors).length > 0 ||
            Object.keys(thirdPartyValidationErrors).length > 0;

        if (hasErrors) {
            setOrderErrors(orderValidationErrors);
            setDeliveryErrors(deliveryValidationErrors);
            setThirdPartyErrors(thirdPartyValidationErrors);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const paymentTypeId = Number(orderDetails.paymentType || 0);
        const orderCodeId = Number(orderDetails.orderCode || 0);
        const discount = 0;
        const collectivePrice = Number(orderDetails.remainingBalance || 0);
        const deliveryFee = Number(orderDetails.deliveryFee || 0);
        const totalPrice = orderDetails.orderPrice;
        const locationValue = deliveryAddress.googleMapLocation?.trim();

        const hasThirdPartyDetails = Boolean(
            thirdPartyDetails.name.trim() ||
            thirdPartyDetails.nic.trim() ||
            thirdPartyDetails.mobile1.trim() ||
            thirdPartyDetails.mobile2.trim() ||
            thirdPartyDetails.whatsapp.trim() ||
            thirdPartyDetails.address.trim() ||
            thirdPartyDetails.note.trim()
        );

        const thirdPartyPayload = isEmployee
            ? (hasThirdPartyDetails
                ? {
                    id: thirdPartyDetails.id || null,
                    name: thirdPartyDetails.name,
                    address: thirdPartyDetails.address,
                    note: thirdPartyDetails.note,
                    nic: thirdPartyDetails.nic,
                    first_mob: thirdPartyDetails.mobile1,
                    sec_mob: thirdPartyDetails.mobile2,
                    whatsapp: thirdPartyDetails.whatsapp,
                }
                : null)
            : null;

        const payload = {
            discount,
            paymentType: {
                id: paymentTypeId,
            },
            deliveryFee,
            collectivePrice,
            qty: 1,
            totalPrice,
            desc: orderDetails.description || '',
            weight: Number(orderDetails.weight || 0),
            dontCollectDeliveryFeeFromCustomer: Boolean(orderDetails.dontCollectDeliveryFeeFromCustomer),
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
                ...(locationValue ? { location: locationValue } : {}),
            },
            orderCode: {
                id: orderCodeId > 0 ? orderCodeId : null,
            },
            thirdPartySenders: thirdPartyPayload,
        };

        setIsSubmitting(true);
        try {
            const response = await axiosInstance.post('/orders/set-order', payload);
            const message = response.data?.message;
            const description = response.data?.desc;
            const savedOrderPayload = response.data?.object || response.data?.exData || {};
            const marketOrderId = Number(
                savedOrderPayload?.marketOrder?.id || savedOrderPayload?.marketOrderId || 0,
            ) || undefined;
            const orderCodeUserId = Number(
                savedOrderPayload?.orderCode?.users?.id || savedOrderPayload?.orderCodeUserId || 0,
            ) || undefined;
            const savedThirdParty = savedOrderPayload?.thirdPartySenders || null;

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

            // Resolve formatted city name for PDF
            let cityDisplayName = deliveryAddress.city;
            if (deliveryAddress.cityId) {
                try {
                    const cityRes = await axiosInstance.post('/users/get-cities', {
                        pageNumber: 0,
                        countPerPage: 10,
                        cityId: deliveryAddress.cityId,
                    });
                    if (cityRes.data?.message === 'Success') {
                        const items = cityRes.data?.object?.items;
                        if (Array.isArray(items) && items.length > 0) {
                            const c = items[0];
                            cityDisplayName = c.district?.name
                                ? `${c.name}(${c.district.name})`
                                : c.name;
                        }
                    }
                } catch {
                    // fall back to stored city name
                }
            }

            // Store the last saved order data for PDF generation (BEFORE resetting form)
            setLastSavedOrder({
                orderCode: orderDetails.orderCodeLabel || String(orderDetails.orderCode || ''),
                cityName: cityDisplayName,
                orderCodeUserId,
                marketOrderId,
                thirdPartySender: savedThirdParty
                    ? {
                        id: savedThirdParty?.id,
                        name: savedThirdParty?.name,
                        address: savedThirdParty?.address,
                        note: savedThirdParty?.note,
                        first_mob: savedThirdParty?.first_mob,
                        sec_mob: savedThirdParty?.sec_mob,
                        whatsapp: savedThirdParty?.whatsapp,
                    }
                    : (hasThirdPartyDetails
                        ? {
                            id: thirdPartyDetails.id || undefined,
                            name: thirdPartyDetails.name,
                            address: thirdPartyDetails.address,
                            note: thirdPartyDetails.note,
                            first_mob: thirdPartyDetails.mobile1,
                            sec_mob: thirdPartyDetails.mobile2,
                            whatsapp: thirdPartyDetails.whatsapp,
                        }
                        : undefined),
                orderDetails: orderDetails,
                deliveryAddress: deliveryAddress,
            });

            setOrderDetails({
                orderCode: 0,
                orderCodeLabel: '',
                orderPrice: 0,
                collectivePrice: 0,
                remainingBalance: 0,
                quantity: 1,
                weight: 0,
                description: '',
                deliveryFee: 0,
                dontCollectDeliveryFeeFromCustomer: false,
                paymentType: 1,
            });

            setDeliveryAddress({
                recipientName: '',
                address: '',
                mobile1: '',
                mobile2: '',
                whatsapp: '',
                postalCode: '',
                city: '',
                cityId: null,
                googleMapLocation: '',
            });

            setThirdPartyDetails({
                id: null,
                name: '',
                address: '',
                note: '',
                nic: '',
                mobile1: '',
                mobile2: '',
                whatsapp: ''
            });

            const result = await Swal.fire({
                title: 'Order saved!',
                text: description || 'Order saved successfully!',
                icon: 'success',
                confirmButtonText: 'OK',
                showDenyButton: true,
                denyButtonText: '📄 Generate PDF',
                confirmButtonColor: swalColors.confirm,
                iconColor: swalColors.success,
                background: swalColors.background,
                customClass: {
                    confirmButton: swalButtonClasses.confirm,
                    denyButton: 'px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 focus:outline-none',
                    actions: 'gap-4 flex-row'
                },
                buttonsStyling: false,
            });

            if (result.isDenied) {
                setShowPrintModal(true);
            }
        } catch (error) {
            console.error('Failed to save order:', error);
            setFormError('');
            const errorMessage =
                (error && typeof error === 'object' && 'response' in error
                    ? (error as any).response?.data?.desc
                    : null) || 'Failed to save order. Please try again.';
            await Swal.fire({
                title: 'Save failed',
                text: errorMessage,
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
            setOrderDetails({
                orderCode: 0,
                orderCodeLabel: '',
                orderPrice: 0,
                collectivePrice: 0,
                remainingBalance: 0,
                quantity: 1,
                weight: 0,
                description: '',
                deliveryFee: 0,
                dontCollectDeliveryFeeFromCustomer: false,
                paymentType: 1,
            });

            setDeliveryAddress({
                recipientName: '',
                address: '',
                mobile1: '',
                mobile2: '',
                whatsapp: '',
                postalCode: '',
                city: '',
                cityId: null,
                googleMapLocation: '',
            });
            setThirdPartyDetails({
                id: null,
                name: '',
                address: '',
                note: '',
                nic: '',
                mobile1: '',
                mobile2: '',
                whatsapp: ''
            });

            setFormError('');
            setOrderErrors({});
            setDeliveryErrors({});
            setThirdPartyErrors({});
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
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="mb-6 animate-fade-in">
                <div className="bg-amber-500 rounded-xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent"></div>

                    <div className="relative">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">
                            Add COD Orders
                        </h1>
                        <p className="text-amber-50 text-sm max-w-2xl">
                            Create new cash on delivery orders for your customers
                        </p>
                    </div>
                </div>

                {/* Form Error */}
                {formError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm animate-shake">
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

            </div>

            {/* Form Section */}
            <div id="order-form" className="space-y-6">
                <OrderDetailsForm
                    orderDetails={orderDetails}
                    onOrderDetailsChange={setOrderDetails}
                    deliveryAddress={deliveryAddress}
                    onDeliveryAddressChange={handleDeliveryAddressChange}
                    orderErrors={orderErrors}
                    deliveryErrors={deliveryErrors}
                />

                {isEmployee && (
                    <ThirdPartySenderForm
                        data={thirdPartyDetails}
                        onChange={setThirdPartyDetails}
                        errors={thirdPartyErrors}
                    />
                )}

                {/* Action Buttons */}
                <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <button
                            onClick={handleReset}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Reset Form
                        </button>
                        <button
                            onClick={handleAddOrder}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            Save Order
                        </button>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex gap-3">
                        <div className="shrink-0">
                            <ExclamationTriangleIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800 mb-1">How it works</h3>
                            <ul className="space-y-1 text-xs text-gray-700">
                                <li>• Fill in the order details and click "Save Order"</li>
                                <li>• The order is sent immediately for processing</li>
                                <li>• After saving, click "Generate PDF" in the success dialog to create a printable slip</li>
                                <li>• Review the delivery details before saving</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Modal - Overlay with Print Template */}
            {showPrintModal && lastSavedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center print:hidden overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl m-4 max-w-4xl w-full print:hidden" id="print-modal">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-amber-600 text-white p-4 rounded-t-xl flex justify-between items-center">
                            <h2 className="text-lg font-bold">Order Slip Preview</h2>
                            <button
                                onClick={() => setShowPrintModal(false)}
                                className="text-white hover:bg-amber-700 p-2 rounded"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body - Print Template */}
                        <div className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                            {isPreviewLoading ? (
                                <div className="h-[70vh] w-full rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                                    Preparing print template...
                                </div>
                            ) : previewHtml ? (
                                <iframe
                                    title="Order Slip Preview"
                                    className="w-full h-[70vh] rounded-lg border border-gray-200 bg-white"
                                    srcDoc={previewHtml}
                                />
                            ) : (
                                <div className="h-[70vh] w-full rounded-lg border border-red-200 bg-red-50 flex items-center justify-center text-sm text-red-600">
                                    Failed to load preview.
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-gray-100 p-4 rounded-b-xl flex gap-3 justify-end border-t">
                            <button
                                onClick={() => setShowPrintModal(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
                            >
                                📄 Download PDF
                            </button>
                            <button
                                onClick={handlePrintPDF}
                                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                            >
                                🖨️ Print Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddOrders;
