import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
  CameraIcon,
  CheckIcon,
  InformationCircleIcon,
  MapPinIcon,
  PhotoIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../../util/AxiosUtil';
import MapLocationModal from '../../../deliveryya_dashboard/comps/addOrders/MapLocationModal';
import JwtUtil from '../../../util/JwtUtil';

interface MarketRequestData {
  marketName: string;
  description: string;
  location: string;
  category: string;
  address: string;
  firstNum: string;
  secondNum: string;
  whatsApp: string;
}

interface LocationData {
  manualLocation: string;
  mapLocationUrl: string;
}

interface MarketCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ApiResponse<T = unknown> {
  status?: number | null;
  message?: string;
  desc?: string;
  object?: T;
  exData?: T;
}



function RequestForMarket() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<MarketRequestData>({
    marketName: '',
    description: '',
    location: '',
    category: '',
    address: '',
    firstNum: '',
    secondNum: '',
    whatsApp: '',
  });

  const [locationData, setLocationData] = useState<LocationData>({
    manualLocation: '',
    mapLocationUrl: '',
  });

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Cover image upload state
  const [coverPreview, setCoverPreview] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const categoryStyles = [
    { icon: '🛒', color: 'from-green-400 to-emerald-500' },
    { icon: '📱', color: 'from-blue-400 to-indigo-500' },
    { icon: '👗', color: 'from-pink-400 to-rose-500' },
    { icon: '🏡', color: 'from-amber-400 to-orange-500' },
    { icon: '💄', color: 'from-purple-400 to-violet-500' },
    { icon: '⚽', color: 'from-cyan-400 to-teal-500' },
    { icon: '📚', color: 'from-yellow-400 to-amber-500' },
    { icon: '✨', color: 'from-gray-400 to-slate-500' },
  ];

  useEffect(() => {
    const loadMarketCategories = async () => {
      setIsLoadingCategories(true);

      try {
        const response = await axiosInstance.get<ApiResponse<unknown>>('/markets/get-market-categories');

        const payload = response.data?.object ?? response.data?.exData ?? response.data;
        const categoryList = Array.isArray(payload)
          ? payload
          : Array.isArray((payload as { items?: unknown[] })?.items)
            ? (payload as { items: unknown[] }).items
            : [];

        const mappedCategories: MarketCategory[] = categoryList
          .map((item, index) => {
            if (!item || typeof item !== 'object') return null;

            const category = item as { id?: string | number; name?: string };
            if (category.id === undefined || category.id === null || !category.name) return null;

            const style = categoryStyles[index % categoryStyles.length];

            return {
              id: String(category.id),
              name: category.name,
              icon: style.icon,
              color: style.color,
            };
          })
          .filter((item): item is MarketCategory => item !== null);

        setCategories(mappedCategories);
      } catch (err) {
        console.error('Failed to load market categories:', err);
        setError('Failed to load market categories. Please refresh and try again.');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    void loadMarketCategories();
  }, []);

  // ============ Logo Handlers ============
  const triggerLogoInput = () => logoInputRef.current?.click();

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const removeLogo = () => {
    setLogoPreview('');
    setLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // ============ Cover Image Handlers ============
  const triggerCoverInput = () => coverInputRef.current?.click();

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Cover image size must be less than 10MB');
      return;
    }

    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const removeCover = () => {
    setCoverPreview('');
    setCoverFile(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // ============ Location Handlers ============
  const handleOpenMapModal = () => {
    setIsMapModalOpen(true);
  };

  const uploadMarketImages = async (files: File[], type: 'logo' | 'cover'): Promise<string> => {
    if (type === 'logo') {
      setIsUploadingLogo(true);
    } else {
      setIsUploadingCover(true);
    }

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await axiosInstance.post('/storage/upload?path=markets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && (response.data.message === 'Success' || response.data.message === 'success')) {
        const uploadedPaths: string[] = Array.isArray(response.data.object) ? response.data.object : [];
        if (!uploadedPaths.length) {
          throw new Error(`No ${type} image path returned from upload service`);
        }
        return uploadedPaths[0];
      }

      throw new Error(response.data?.desc || `Failed to upload ${type} image`);
    } finally {
      if (type === 'logo') {
        setIsUploadingLogo(false);
      } else {
        setIsUploadingCover(false);
      }
    }
  };

  // ============ Validation ============
  const normalizePhone = (value: string) => value.replace(/\D/g, '');
  const isValidPhone = (value: string) => /^(?:94|0)?\d{9}$/.test(value);

  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 1) {
      if (!formData.marketName.trim()) {
        setError('Market name is required');
        return false;
      }
      if (!formData.category) {
        setError('Please select a category');
        return false;
      }
      if (!logoFile && !logoPreview) {
        setError('Please upload a logo for your market');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.description.trim() || formData.description.length < 50 || formData.description.length > 150 ) {
        setError('Please provide a detailed description between 50 - 150 characters');
        return false;
      }
      if (!formData.address.trim()) {
        setError('Market address is required');
        return false;
      }
      if (!formData.firstNum.trim()) {
        setError('Primary contact number is required');
        return false;
      }

      const firstNumNormalized = normalizePhone(formData.firstNum);
      if (!isValidPhone(firstNumNormalized)) {
        setError('Primary contact number is invalid');
        return false;
      }

      if (formData.secondNum.trim() && !isValidPhone(normalizePhone(formData.secondNum))) {
        setError('Secondary contact number is invalid');
        return false;
      }

      if (formData.whatsApp.trim() && !isValidPhone(normalizePhone(formData.whatsApp))) {
        setError('WhatsApp contact number is invalid');
        return false;
      }

      if (!coverFile && !coverPreview) {
        setError('Please upload a cover image for your market');
        return false;
      }
    }

    if (step === 3) {
      if (!locationData.mapLocationUrl.trim()) {
        setError('Please pick a location on the map');
        return false;
      }
    }

    return true;
  };

  // ============ Navigation ============
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============ Submit ============
  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('jwtToken');
      const decodedUser = token ? JwtUtil.decodeToken(token) : null;
      const userId = decodedUser?.userId;

      if (!userId) {
        throw new Error('Unable to identify user. Please sign in again.');
      }

      const addressResponse = await axiosInstance.get<ApiResponse<unknown>>(
        `/users/get-address-by-id-or-user-id?userId=${userId}`,
      );

      const addressPayload = addressResponse.data?.object ?? addressResponse.data?.exData;
      const userAddresses = Array.isArray(addressPayload)
        ? addressPayload
        : Array.isArray((addressPayload as { items?: unknown[] })?.items)
          ? (addressPayload as { items: unknown[] }).items
          : [];

      if (userAddresses.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Address Required',
          text: 'You must add at least one address in your profile before requesting a market.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#F59B0F',
        });
        return;
      }

      if (!logoFile || !coverFile) {
        throw new Error('Please upload both logo and cover images.');
      }

      const [logoUrl, coverImgUrl] = await Promise.all([
        uploadMarketImages([logoFile], 'logo'),
        uploadMarketImages([coverFile], 'cover'),
      ]);

      const finalLocation = locationData.mapLocationUrl.trim();

      const categoryId = Number(formData.category);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        throw new Error('Please select a valid market category.');
      }

      const payload = {
        name: formData.marketName.trim(),
        location: finalLocation,
        address: formData.address.trim(),
        logoUrl,
        coverImgUrl,
        desc: formData.description.trim(),
        first_num: normalizePhone(formData.firstNum),
        second_num: formData.secondNum.trim() ? normalizePhone(formData.secondNum) : '',
        whats_app: formData.whatsApp.trim() ? normalizePhone(formData.whatsApp) : '',
        users: {
          id: userId,
        },
        marketCategory: {
          id: categoryId,
        },
        isActive: true,
        createdAt: new Date().toISOString(), // Add createdAt field
      };

      await axiosInstance.post('/markets/set-market', payload);

      setSuccess('Market request submitted successfully! We will review your application and get back to you soon.');
      setCurrentStep(4); // Success step
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to submit market request. Please try again.';
      setError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Request Failed',
        text: errorMessage,
        confirmButtonText: 'OK',
        confirmButtonColor: '#F59B0F',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <BuildingStorefrontIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Request Your Market</h1>
          </div>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl">
            Join our growing community of sellers! Fill out this form to create your own market space and start selling your products.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[1, 2, 3].map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300 ${currentStep >= step
                    ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg scale-110'
                    : 'bg-gray-200 text-gray-500'
                    }`}
                >
                  {currentStep > step ? <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : step}
                </div>
                <span
                  className={`text-xs sm:text-sm font-semibold mt-2 text-center ${currentStep >= step ? 'text-[#AC6C2A]' : 'text-gray-400'
                    }`}
                >
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Details'}
                  {step === 3 && 'Location'}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded transition-all duration-300 ${currentStep > step ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]' : 'bg-gray-200'
                    }`}
                ></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 animate-slideDown">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 font-semibold text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-6 animate-slideDown">
          <div className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-green-700 font-semibold text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="border-b border-gray-200 px-6 sm:px-8 py-4 bg-linear-to-r from-orange-50 to-transparent">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-[#FF6B35]" />
              Basic Information
            </h2>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Market Logo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Market Logo <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="relative group">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Market Logo"
                        className="w-32 h-32 rounded-2xl object-cover shadow-lg border-4 border-gray-100 group-hover:border-[#FF6B35] transition-all duration-300"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-2 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                        title="Remove logo"
                      >
                        <XMarkIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={triggerLogoInput}
                      className="w-32 h-32 rounded-2xl border-4 border-dashed border-gray-300 hover:border-[#FF6B35] flex flex-col items-center justify-center gap-2 transition-all duration-300 bg-gray-50 hover:bg-orange-50 group"
                    >
                      <CameraIcon className="w-8 h-8 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
                      <span className="text-xs text-gray-500 group-hover:text-[#FF6B35] font-semibold">Upload Logo</span>
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileSelect}
                    title="Select market logo"
                    aria-label="Market logo file input"
                    className="hidden"
                  />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">Upload a clear logo for your market. This will be displayed on your market profile.</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Recommended size: 512x512 pixels</li>
                    <li>• Format: PNG, JPG, or JPEG</li>
                    <li>• Maximum file size: 5MB</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Market Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Market Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.marketName}
                onChange={(e) => setFormData({ ...formData, marketName: e.target.value })}
                placeholder="e.g., Fresh Fruits Market, Tech Hub Electronics"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all duration-300"
              />
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Market Category <span className="text-red-500">*</span>
              </label>
              {isLoadingCategories ? (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="w-5 h-5 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-600 font-medium">Loading market categories...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium">
                  No categories available right now. Please try again later.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: category.id })}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${formData.category === category.id
                        ? `border-[#FF6B35] bg-linear-to-br ${category.color} text-white shadow-lg scale-105`
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                        }`}
                    >
                      <span className="text-3xl">{category.icon}</span>
                      <span className={`text-xs font-semibold text-center ${formData.category === category.id ? 'text-white' : 'text-gray-700'}`}>
                        {category.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Detailed Information */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="border-b border-gray-200 px-6 sm:px-8 py-4 bg-linear-to-r from-orange-50 to-transparent">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <InformationCircleIcon className="w-6 h-6 text-[#FF6B35]" />
              Detailed Information
            </h2>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Market Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Market Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what your market sells, your specialty items, unique features, and what makes your market stand out..."
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all duration-300 resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData.description.length} / 50 characters minimum
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Market Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your market address"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all duration-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Primary Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstNum}
                  onChange={(e) => setFormData({ ...formData, firstNum: e.target.value })}
                  placeholder="e.g., 0771234567"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Secondary Contact Number
                </label>
                <input
                  type="text"
                  value={formData.secondNum}
                  onChange={(e) => setFormData({ ...formData, secondNum: e.target.value })}
                  placeholder="e.g., 0112345678"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={formData.whatsApp}
                  onChange={(e) => setFormData({ ...formData, whatsApp: e.target.value })}
                  placeholder="e.g., 0771234567"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all duration-300"
                />
              </div>

              {/* Info Message removed */}
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Cover Image <span className="text-red-500">*</span>
              </label>
              {coverPreview ? (
                <div className="relative group">
                  <img
                    src={coverPreview}
                    alt="Market Cover"
                    className="w-full h-64 rounded-2xl object-cover shadow-lg border-4 border-gray-100 group-hover:border-[#FF6B35] transition-all duration-300"
                  />
                  <button
                    onClick={removeCover}
                    className="absolute top-4 right-4 p-3 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    title="Remove cover image"
                  >
                    <XMarkIcon className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={triggerCoverInput}
                    className="absolute bottom-4 right-4 p-3 bg-white rounded-full shadow-lg hover:bg-orange-50 transition-colors"
                    title="Change cover image"
                  >
                    <CameraIcon className="w-5 h-5 text-[#FF6B35]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={triggerCoverInput}
                  className="w-full h-64 rounded-2xl border-4 border-dashed border-gray-300 hover:border-[#FF6B35] flex flex-col items-center justify-center gap-3 transition-all duration-300 bg-gray-50 hover:bg-orange-50 group"
                >
                  <PhotoIcon className="w-16 h-16 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-600 group-hover:text-[#FF6B35] transition-colors">
                      Click to upload cover image
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileSelect}
                title="Select market cover image"
                aria-label="Market cover image file input"
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                This will be the banner image for your market. Choose a high-quality, attractive image that represents your brand.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="border-b border-gray-200 px-6 sm:px-8 py-4 bg-linear-to-r from-orange-50 to-transparent">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <MapPinIcon className="w-6 h-6 text-[#FF6B35]" />
              Location Information
            </h2>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-linear-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border-2 border-blue-100">
              <div className="flex items-start gap-3">
                <MapPinIcon className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">Location Picker</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Pick your market location from the map for accurate location details.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenMapModal}
                    className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 bg-white border-2 border-gray-300 text-gray-700 hover:border-[#FF6B35]"
                  >
                    Select Location
                  </button>
                </div>
              </div>
            </div>

            {locationData.mapLocationUrl && (
              <a
                href={locationData.mapLocationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm text-[#AC6C2A] hover:text-[#8A5725] font-medium transition-colors"
              >
                <MapPinIcon className="w-4 h-4" />
                View selected location on Google Maps
              </a>
            )}

            <MapLocationModal
              isOpen={isMapModalOpen}
              initialUrl={locationData.mapLocationUrl}
              onClose={() => setIsMapModalOpen(false)}
              onConfirm={(url, address) => {
                setLocationData((prev) => ({
                  ...prev,
                  mapLocationUrl: url,
                }));
                if (!formData.address.trim() && address) {
                  setFormData((prev) => ({
                    ...prev,
                    address,
                  }));
                }
                setIsMapModalOpen(false);
              }}
              title="Select Market Location"
              subtitle="Search or click on the map, then confirm your market location."
            />
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-linear-to-r from-green-400 to-emerald-500 rounded-full mb-6 animate-bounce">
              <CheckIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Request Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Thank you for your interest in joining DeliveryYa! Our team will review your market request and contact you within 2-3 business days.
            </p>
            <div className="bg-linear-to-r from-orange-50 to-amber-50 rounded-xl p-6 max-w-lg mx-auto mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">What's Next?</h3>
              <ul className="text-sm text-gray-600 space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-[#FF6B35] font-bold">1.</span>
                  <span>Our team will review your application</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF6B35] font-bold">2.</span>
                  <span>We'll verify your information and documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF6B35] font-bold">3.</span>
                  <span>You'll receive an email with approval status</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF6B35] font-bold">4.</span>
                  <span>Once approved, you can start adding products!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {currentStep < 4 && (
        <div className="flex justify-between items-center gap-4 mt-8">
          {currentStep > 1 ? (
            <button
              onClick={handlePrevious}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-300"
            >
              Previous
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 ml-auto"
            >
              Next Step
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-linear-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isUploadingLogo || isUploadingCover ? 'Uploading Images...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RequestForMarket;