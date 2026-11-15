import React, { useState, useEffect, useRef } from 'react';
import { UserIcon, PhoneIcon, MapPinIcon, IdentificationIcon, DocumentTextIcon, XCircleIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../../util/AxiosUtil';

export type ThirdPartySenderData = {
    id?: number | null;
    name: string;
    address: string;
    note: string;
    nic: string;
    mobile1: string;
    mobile2: string;
    whatsapp: string;
};

interface ThirdPartySenderFormProps {
    data: ThirdPartySenderData;
    onChange: (data: ThirdPartySenderData) => void;
    errors?: Partial<Record<keyof ThirdPartySenderData, string>>;
}

interface Suggestion {
    id: number;
    name: string;
    nic: string;
    address: string;
    whatsapp: string;
    first_mob: string;
    sec_mob: string;
    note: string;
}

const ThirdPartySenderForm: React.FC<ThirdPartySenderFormProps> = ({ data, onChange, errors = {} }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [searchTerm]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!debouncedSearchTerm || data.id) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await axiosInstance.post('/orders/get-third-party-senders', {
                    pageNumber: 0,
                    countPerPage: 5,
                    search: debouncedSearchTerm,
                    searchAddress: false,
                    searchNote: false
                });

                if (response.data?.message === 'Success') {
                    const items = response.data?.object?.items || [];
                    setSuggestions(items);
                    setShowSuggestions(items.length > 0);
                }
            } catch (error) {
                console.error("Error fetching third party senders", error);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchSuggestions();
    }, [debouncedSearchTerm, data.id]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleInputChange = (field: keyof ThirdPartySenderData, value: string) => {
        // If they start typing and had an existing ID loaded, we could clear it, or we allow edit?
        // The requirements say "when id provided backend is check recodes and update the id... otherwise make sure to set id null"
        // Let's trigger search when name, nic, mobile1, mobile2, whatsapp changes
        if (['name', 'nic', 'mobile1', 'mobile2', 'whatsapp'].includes(field)) {
            setSearchTerm(value);
            if (data.id) {
                onChange({ ...data, [field]: value, id: null });
            } else {
                onChange({ ...data, [field]: value });
            }
        } else {
            onChange({ ...data, [field]: value });
        }
    };

    const handleSelectSuggestion = (suggestion: Suggestion) => {
        onChange({
            id: suggestion.id,
            name: suggestion.name || '',
            nic: suggestion.nic || '',
            address: suggestion.address || '',
            note: suggestion.note || '',
            mobile1: suggestion.first_mob || '',
            mobile2: suggestion.sec_mob || '',
            whatsapp: suggestion.whatsapp || ''
        });
        setShowSuggestions(false);
        setShowModal(false);
        setSearchTerm('');
    };

    const handleClearSelected = () => {
        onChange({
            id: null,
            name: '',
            address: '',
            note: '',
            nic: '',
            mobile1: '',
            mobile2: '',
            whatsapp: ''
        });
        setSearchTerm('');
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 mt-6 relative" ref={wrapperRef}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-bold text-gray-800">Third Party Sender (Optional)</h2>
                    {isLoading && <span className="text-xs text-gray-500">Searching...</span>}
                </div>
                {data.id && (
                    <button
                        type="button"
                        onClick={handleClearSelected}
                        className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                        <XCircleIcon className="w-4 h-4" />
                        Clear Selected
                    </button>
                )}
            </div>

            {showSuggestions && !showModal && (
                <div className="absolute top-16 right-5 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded shadow-md z-10 flex items-center gap-3">
                    <span className="text-sm font-medium">There are records available</span>
                    <button 
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-semibold"
                    >
                        View
                    </button>
                    <button 
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="text-blue-400 hover:text-blue-600"
                    >
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`pl-10 w-full rounded-lg border ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-amber-500 focus:border-amber-500'} bg-white px-4 py-2 outline-none transition-all`}
                            placeholder="Enter sender name"
                        />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* NIC */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        NIC
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IdentificationIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={data.nic}
                            onChange={(e) => handleInputChange('nic', e.target.value)}
                            className={`pl-10 w-full rounded-lg border ${errors.nic ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-amber-500 focus:border-amber-500'} bg-white px-4 py-2 outline-none transition-all`}
                            placeholder="Enter NIC"
                        />
                    </div>
                </div>

                {/* Mobile 1 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile 1
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <PhoneIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={data.mobile1}
                            onChange={(e) => handleInputChange('mobile1', e.target.value)}
                            className={`pl-10 w-full rounded-lg border ${errors.mobile1 ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-amber-500 focus:border-amber-500'} bg-white px-4 py-2 outline-none transition-all`}
                            placeholder="e.g. 0771234567"
                        />
                    </div>
                    {errors.mobile1 && <p className="mt-1 text-sm text-red-500">{errors.mobile1}</p>}
                </div>

                {/* WhatsApp */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        WhatsApp
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <PhoneIcon className="h-5 w-5 text-green-500" />
                        </div>
                        <input
                            type="text"
                            value={data.whatsapp}
                            onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                            className={`pl-10 w-full rounded-lg border ${errors.whatsapp ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-amber-500 focus:border-amber-500'} bg-white px-4 py-2 outline-none transition-all`}
                            placeholder="e.g. 0771234567"
                        />
                    </div>
                </div>
                
                {/* Mobile 2 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile 2 
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <PhoneIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={data.mobile2}
                            onChange={(e) => handleInputChange('mobile2', e.target.value)}
                            className={`pl-10 w-full rounded-lg border ${errors.mobile2 ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-amber-500 focus:border-amber-500'} bg-white px-4 py-2 outline-none transition-all`}
                            placeholder="e.g. 0711234567"
                        />
                    </div>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                    </label>
                    <div className="relative">
                        <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                            <MapPinIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                            value={data.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            rows={2}
                            className={`pl-10 w-full rounded-lg border ${errors.address ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-amber-500 focus:border-amber-500'} bg-white px-4 py-2 outline-none transition-all resize-none`}
                            placeholder="Enter sender address"
                        />
                    </div>
                </div>

                {/* Note */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note
                    </label>
                    <div className="relative">
                        <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                            value={data.note}
                            onChange={(e) => handleInputChange('note', e.target.value)}
                            rows={2}
                            className={`pl-10 w-full rounded-lg border border-gray-300 focus:ring-amber-500 focus:border-amber-500 bg-white px-4 py-2 outline-none transition-all resize-none`}
                            placeholder="Any notes..."
                        />
                    </div>
                </div>

            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h2 className="text-lg font-bold text-gray-800">Select Existing Sender</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {suggestions.map((sug) => (
                                <div 
                                    key={sug.id} 
                                    className="border border-gray-200 rounded-lg p-4 mb-3 hover:border-amber-500 hover:bg-amber-50 cursor-pointer transition-colors"
                                    onClick={() => handleSelectSuggestion(sug)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-800">{sug.name}</h3>
                                            <p className="text-sm text-gray-600 mb-1">{sug.nic && `NIC: ${sug.nic}`}</p>
                                            <p className="text-sm text-gray-600 mb-1">{sug.address}</p>
                                            <div className="flex gap-3 text-xs text-gray-500 mt-2">
                                                {sug.first_mob && <span>📞 {sug.first_mob}</span>}
                                                {sug.whatsapp && <span className="text-green-600">💬 {sug.whatsapp}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThirdPartySenderForm;