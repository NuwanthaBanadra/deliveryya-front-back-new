import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import {
    ArrowPathIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Fragment, useEffect, useMemo, useState } from 'react';
import AsyncSelect from 'react-select/async';
import Swal from 'sweetalert2';
import axiosInstance from '../../../util/AxiosUtil';
import type { DeliveryFee, SelectOption } from './DeliveryFees';

type ApiResponse<T> = {
    status?: number;
    message?: string;
    desc?: string;
    object?: T;
};

type DeliveryFeeUpsertModalProps = {
    isOpen: boolean;
    mode: 'create' | 'update';
    deliveryFee: DeliveryFee | null;
    defaultCityOptions: SelectOption<number>[];
    loadCityOptions: (inputValue: string) => Promise<SelectOption<number>[]>;
    onClose: () => void;
    onSaved: () => void;
};

type UpsertPayload = {
    id: number;
    cityId: number;
    fee: number;
    additionalFee: number;
};

const getCityLabel = (deliveryFee: DeliveryFee | null): SelectOption<number> | null => {
    const city = deliveryFee?.city;
    if (!city?.id) return null;

    const districtName = city.district?.name || city.districtName;
    return {
        value: city.id,
        label: districtName ? `${city.name} (${districtName})` : city.name,
    };
};

const toAmount = (value: string): number | null => {
    if (value.trim() === '') return null;

    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
};

function DeliveryFeeUpsertModal({
    isOpen,
    mode,
    deliveryFee,
    defaultCityOptions,
    loadCityOptions,
    onClose,
    onSaved,
}: DeliveryFeeUpsertModalProps) {
    const [selectedCity, setSelectedCity] = useState<SelectOption<number> | null>(null);
    const [fee, setFee] = useState('');
    const [additionalFee, setAdditionalFee] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isUpdate = mode === 'update';

    useEffect(() => {
        if (!isOpen) return;

        setSelectedCity(getCityLabel(deliveryFee));
        setFee(deliveryFee?.fee === null || deliveryFee?.fee === undefined ? '' : String(deliveryFee.fee));
        setAdditionalFee(
            deliveryFee?.additionalFee === null || deliveryFee?.additionalFee === undefined
                ? ''
                : String(deliveryFee.additionalFee)
        );
        setFormError(null);
    }, [deliveryFee, isOpen]);

    const modalTitle = isUpdate ? 'Update Delivery Fee' : 'Add Delivery Fee';
    const submitLabel = isUpdate ? 'Update Fee' : 'Create Fee';

    const cityOptions = useMemo(() => {
        if (!selectedCity) return defaultCityOptions;

        const hasSelectedCity = defaultCityOptions.some((option) => option.value === selectedCity.value);
        return hasSelectedCity ? defaultCityOptions : [selectedCity, ...defaultCityOptions];
    }, [defaultCityOptions, selectedCity]);

    const handleSubmit = async () => {
        const feeAmount = toAmount(fee);
        const additionalFeeAmount = additionalFee.trim() === '' ? 0 : toAmount(additionalFee);

        if (!selectedCity?.value) {
            setFormError('Please select a city.');
            return;
        }
        if (feeAmount === null || feeAmount < 0) {
            setFormError('Please enter a valid delivery fee.');
            return;
        }
        if (additionalFeeAmount === null || additionalFeeAmount < 0) {
            setFormError('Please enter a valid additional fee.');
            return;
        }

        const payload: UpsertPayload = {
            id: isUpdate ? deliveryFee?.id ?? 0 : 0,
            cityId: selectedCity.value,
            fee: feeAmount,
            additionalFee: additionalFeeAmount,
        };

        setIsSubmitting(true);
        setFormError(null);

        try {
            const response = await axiosInstance.post<ApiResponse<DeliveryFee>>(
                '/delivery-fees/upsert-delivery-fee',
                payload
            );

            if (response.data.message?.toLowerCase() === 'success') {
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: isUpdate ? 'Delivery fee updated' : 'Delivery fee created',
                    showConfirmButton: false,
                    timer: 1600,
                });
                onSaved();
                return;
            }

            setFormError(response.data.desc || 'Unable to save the delivery fee.');
        } catch (submitError: any) {
            console.error('Error saving delivery fee:', submitError);
            setFormError(submitError?.response?.data?.desc || 'Unable to save the delivery fee right now.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={isSubmitting ? () => undefined : onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 translate-y-4 scale-[0.98]"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-4 scale-[0.98]"
                        >
                            <DialogPanel
                                className="w-full max-w-2xl overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl"
                                style={{ background: 'linear-gradient(180deg, #FFF8F2 0%, #FFFFFF 55%, #FFFFFF 100%)' }}
                            >
                                <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4 md:px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg shadow-orange-500/25">
                                            <CurrencyDollarIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-xl font-black text-slate-900">
                                                {modalTitle}
                                            </DialogTitle>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {isUpdate ? 'Edit city pricing for this service area.' : 'Create pricing for a delivery service city.'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="rounded-xl border border-orange-100 bg-white p-2 text-slate-500 transition hover:border-orange-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                        title="Close"
                                        aria-label="Close delivery fee modal"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-5 px-5 py-5 md:px-6">
                                    {formError && (
                                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                            {formError}
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                                            City
                                        </label>
                                        <AsyncSelect
                                            cacheOptions
                                            defaultOptions={cityOptions}
                                            loadOptions={loadCityOptions}
                                            value={selectedCity}
                                            onChange={(selected: any) => setSelectedCity(selected)}
                                            styles={modalSelectFieldStyles}
                                            placeholder="Search or select city..."
                                            className="react-select-container"
                                            classNamePrefix="react-select"
                                            isDisabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                                                Delivery Fee <span className="normal-case tracking-normal text-gray-400">(LKR)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={fee}
                                                onChange={(event) => setFee(event.target.value)}
                                                placeholder="e.g. 1000"
                                                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                                disabled={isSubmitting}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                                                Additional Fee <span className="normal-case tracking-normal text-gray-400">(LKR)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={additionalFee}
                                                onChange={(event) => setAdditionalFee(event.target.value)}
                                                placeholder="e.g. 25"
                                                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-[#F59B0F] focus:bg-white focus:outline-none"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3">
                                        <div className="flex items-start gap-3 text-sm text-orange-900">
                                            <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#D17F0A]" />
                                            <p>
                                                Each city should have one active delivery fee record. Updating an existing city will replace the saved service fee values.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse gap-3 border-t border-orange-100 bg-white px-5 py-4 sm:flex-row sm:justify-end md:px-6">
                                    <button
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-[#F59B0F] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#AC6C2A]/25 transition hover:from-[#AC6C2A] hover:to-[#F59B0F] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSubmitting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                                        {submitLabel}
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export default DeliveryFeeUpsertModal;

const modalSelectFieldStyles = {
    control: (base: any, state: any) => ({
        ...base,
        padding: '0.25rem',
        borderWidth: '2px',
        borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
        borderRadius: '0.75rem',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
        '&:hover': {
            borderColor: '#FCD34D',
        },
        transition: 'all 0.3s',
        backgroundColor: state.isDisabled ? '#F9FAFB' : 'white',
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
