import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CameraIcon, XMarkIcon, CheckIcon, PencilSquareIcon, PlusIcon, TrashIcon, HomeIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { UserIcon, EnvelopeIcon, CalendarIcon, IdentificationIcon, UserCircleIcon, ExclamationTriangleIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import axiosInstance, { baseURL } from '../../../util/AxiosUtil';
import JwtUtil from '../../../util/JwtUtil';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

// Define interfaces based on backend DTOs
interface GenderDto {
  id: number;
  name: string;
}

interface UserRoleDto {
  id: number;
  name: string;
}

interface VerificationStatusDto {
  id: number;
  name: string;
}

interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  dob: string; // LocalDate as string from backend
  profileImg: string;
  nic: string;
  email: string;
  password: string;
  isActive: boolean;
  verificationStatus: VerificationStatusDto | null;
  gender: GenderDto | null;
  userRole: UserRoleDto | null;
  emailVerified: boolean;
}

// City and District Interfaces
interface DistrictDto {
  id: number;
  name: string;
}

interface CityDto {
  id: number;
  name: string;
  district: DistrictDto;
}

// Interface for paginated city response
interface CityResponse {
  pageNumber: number;
  countPerPage: number;
  totalCount: number;
  totalPages: number;
  districtId: number | null;
  cityId: number | null;
  search: string | null;
  items: CityDto[];
}

// Address Interface based on API response
interface AddressDto {
  id: number;
  address: string;
  tag: string;
  permanent: boolean;
  users: null;
  primaryMobile: string;
  secondaryMobile: string;
  whatsapp: string;
  cities: CityDto;
  location: string | null;
}

// Address Form Data Interface
interface AddressFormData {
  address: string;
  tag: string;
  permanent: boolean;
  location: string;
  primaryMobile: string;
  secondaryMobile: string;
  whatsapp: string;
  cityId: number;
}

// UserData Interface based on API response
interface UserDataDto {
  id: number;
  primaryMobile: string;
  secondaryMobile: string | null;
  whatsapp: string | null;
  postalCode: string | null;
  address: string | null;
  cities: CityDto;
  isPnoVerified: boolean;
}

// UserData Form Data Interface
interface UserDataFormData {
  primaryMobile: string;
  secondaryMobile: string;
  whatsapp: string;
  postalCode: string;
  address: string;
  cityId: number;
}

interface UpdateUserDto {
  firstName: string;
  lastName: string;
  dob: string;
  profileImg?: string;
  nic: string;
  email: string;
  password?: string;
  isActive?: boolean;
  verificationStatus: VerificationStatusDto | null;
  gender: GenderDto | null;
  userRole: UserRoleDto | null;
}

// API Response interface
interface ApiResponse<T = any> {
  status: number;
  message: string;
  desc: string;
  exData: T | null;
  object?: T; // For endpoints that return data in 'object' field
}

// Status Code Constants
const STATUS_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

type PersonalFieldKey = 'firstName' | 'lastName' | 'email' | 'dateOfBirth' | 'nic' | 'gender';
type PersonalFieldErrors = Record<PersonalFieldKey, string>;
type PersonalTouchedFields = Record<PersonalFieldKey, boolean>;

const createEmptyPersonalFieldErrors = (): PersonalFieldErrors => ({
  firstName: '',
  lastName: '',
  email: '',
  dateOfBirth: '',
  nic: '',
  gender: ''
});

const createUntouchedPersonalFields = (): PersonalTouchedFields => ({
  firstName: false,
  lastName: false,
  email: false,
  dateOfBirth: false,
  nic: false,
  gender: false
});

const personalFieldAliasMap: Record<string, PersonalFieldKey> = {
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  dob: 'dateOfBirth',
  dateOfBirth: 'dateOfBirth',
  birthday: 'dateOfBirth',
  nic: 'nic',
  nationalIdentityCard: 'nic',
  gender: 'gender',
  genderId: 'gender'
};

function ProfilePanel() {
  const navigate = useNavigate();
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [userData, setUserData] = useState<UserDto | null>(null);
  const [personalFormData, setPersonalFormData] = useState<UpdateUserDto | null>(null);

  // Address State
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressSuccess, setAddressSuccess] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressFormData, setAddressFormData] = useState<AddressFormData>({
    address: '',
    tag: '',
    permanent: false,
    location: '',
    primaryMobile: '',
    secondaryMobile: '',
    whatsapp: '',
    cityId: 0
  });

  // UserData State
  const [userDataList, setUserDataList] = useState<UserDataDto[]>([]);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [isSavingUserData, setIsSavingUserData] = useState(false);
  const [isDeletingUserData, setIsDeletingUserData] = useState(false);
  const [userDataError, setUserDataError] = useState('');
  const [userDataSuccess, setUserDataSuccess] = useState('');
  const [showUserDataForm, setShowUserDataForm] = useState(false);
  const [editingUserDataId, setEditingUserDataId] = useState<number | null>(null);
  const [userDataFormData, setUserDataFormData] = useState<UserDataFormData>({
    primaryMobile: '',
    secondaryMobile: '',
    whatsapp: '',
    postalCode: '',
    address: '',
    cityId: 0
  });

  // Mobile Verification State
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [mobileVerified, setMobileVerified] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Cities State
  const [cities, setCities] = useState<CityDto[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [genders, setGenders] = useState<GenderDto[]>([]);
  const [isLoadingGenders, setIsLoadingGenders] = useState(false);

  // Field-level validation state for address form
  const [addressFieldErrors, setAddressFieldErrors] = useState({
    address: '',
    tag: '',
    primaryMobile: '',
    secondaryMobile: '',
    whatsapp: '',
    cityId: ''
  });

  const [addressTouchedFields, setAddressTouchedFields] = useState({
    address: false,
    tag: false,
    primaryMobile: false,
    secondaryMobile: false,
    whatsapp: false,
    cityId: false
  });

  // Field-level validation state for UserData form
  const [userDataFieldErrors, setUserDataFieldErrors] = useState({
    primaryMobile: '',
    secondaryMobile: '',
    whatsapp: '',
    postalCode: '',
    address: '',
    cityId: ''
  });

  const [userDataTouchedFields, setUserDataTouchedFields] = useState({
    primaryMobile: false,
    secondaryMobile: false,
    whatsapp: false,
    postalCode: false,
    address: false,
    cityId: false
  });

  // Profile Image State
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageSuccess, setImageSuccess] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return '';
    const cleanedUrl = url.replace(/\\/g, '/').trim();
    if (cleanedUrl.startsWith('data:')) return cleanedUrl;
    if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) return cleanedUrl;

    // Support values like /uploads/..., uploads/..., /profiles/..., and profiles/...
    const normalizedPath = cleanedUrl.replace(/^\/+/, '');
    if (normalizedPath.startsWith('/uploads/')) {
      return `${baseURL}/${normalizedPath}`;
    }

    return `${baseURL}/uploads/${normalizedPath}`;
  };

  // Email Verification State
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState('');
  const [emailVerificationSuccess, setEmailVerificationSuccess] = useState('');

  // Clear messages after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) setError('');
      if (success) setSuccess('');
      if (addressError) setAddressError('');
      if (addressSuccess) setAddressSuccess('');
      if (userDataError) setUserDataError('');
      if (userDataSuccess) setUserDataSuccess('');
    }, 5000);

    return () => clearTimeout(timer);
  }, [error, success, addressError, addressSuccess, userDataError, userDataSuccess]);

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
    loadCities();
    loadGenders();
  }, []);

  // Load addresses when user data is loaded
  useEffect(() => {
    if (userData?.id) {
      loadUserAddresses();
      loadUserData();
    }
  }, [userData]);

  const handleApiError = (error: any, defaultMessage: string): string => {
    console.error('API Error:', error);

    if (error.response) {
      const { status, data } = error.response;
      const apiResponse = data as ApiResponse;

      switch (status) {
        case STATUS_CODES.UNAUTHORIZED:
          // Token expired or invalid
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('rememberMe');
          navigate('/sign-in', { replace: true });
          return 'Session expired. Please login again.';

        case STATUS_CODES.BAD_REQUEST:
          // Validation errors
          if (apiResponse.exData && typeof apiResponse.exData === 'object') {
            return Object.values(apiResponse.exData).join(', ') || apiResponse.desc || 'Invalid input';
          }
          return apiResponse.desc || 'Invalid request';

        case STATUS_CODES.CONFLICT:
          return apiResponse.desc || 'Conflict occurred. Please check your data.';

        case STATUS_CODES.NOT_FOUND:
          return apiResponse.desc || 'Resource not found.';

        case STATUS_CODES.FORBIDDEN:
          return apiResponse.desc || 'Access denied.';

        case STATUS_CODES.INTERNAL_SERVER_ERROR:
          return apiResponse.desc || 'Server error. Please try again later.';

        default:
          return apiResponse.desc || `Error ${status}: ${defaultMessage}`;
      }
    } else if (error.request) {
      // Network error
      return 'Network error. Please check your connection.';
    } else {
      // Request setup error
      return error.message || defaultMessage;
    }
  };

  const handleApiSuccess = (response: any, successMessage: string): void => {
    const apiResponse = response.data as ApiResponse;

    // Consider it a success if status is 200, regardless of message field
    if (apiResponse.status === STATUS_CODES.SUCCESS) {
      // Clear any existing errors
      setError('');
      // Set success message
      setSuccess(successMessage);
    } else {
      // Status is not 200, treat as error
      throw new Error(apiResponse.desc || 'Operation failed');
    }
  };

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      // Get user ID from JWT token
      const token = localStorage.getItem("jwtToken");
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      // Validate token
      if (!JwtUtil.validateToken(token)) {
        throw new Error("Session expired. Please login again.");
      }

      // Get user profile from API
      const response = await axiosInstance.get("/users/get-user-by-id");

      // Check if response is successful
      // The get-user-by-id endpoint returns user data in the 'object' field
      if (response.status === 200 && response.data) {
        const apiResponse = response.data as ApiResponse;

        // Extract user data from 'object' field (main source of truth)
        // Falls back to response.data for compatibility
        const userData = (apiResponse.object || response.data) as UserDto;

        if (!userData?.id) {
          throw new Error('Invalid user data received');
        }

        setUserData(userData);
        // Initialize form without storing password
        setPersonalFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          dob: userData.dob || '',
          profileImg: userData.profileImg || '',
          nic: userData.nic || '',
          email: userData.email || '',
          password: '', // Empty - we'll use the stored password from userData
          isActive: userData.isActive,
          verificationStatus: userData.verificationStatus,
          gender: userData.gender,
          userRole: userData.userRole
        });
        setImagePreview(normalizeImageUrl(userData.profileImg));
      } else {
        throw new Error('Failed to load profile');
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Failed to load profile. Please try again.');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ============ Address Management ============
  const loadCities = async () => {
    try {
      setIsLoadingCities(true);

      const payload = {
        pageNumber: 0,
        countPerPage: 80
      };

      const response = await axiosInstance.post("/users/get-cities", payload);

      if (response.data?.status === STATUS_CODES.SUCCESS && response.data?.object) {
        // Extract items from the paginated response
        const citiesData = response.data.object.items || [];
        setCities(citiesData);
      } else {
        console.error('Failed to load cities');
        setCities([]);
      }
    } catch (err) {
      console.error('Error loading cities:', err);
      setCities([]);
    } finally {
      setIsLoadingCities(false);
    }
  };

  const loadGenders = async () => {
    try {
      setIsLoadingGenders(true);

      const response = await axiosInstance.get("/users/get-genders");
      const data = response.data?.object || response.data?.data || response.data || [];
      const genderItems = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setGenders(genderItems);
    } catch (err) {
      console.error('Error loading genders:', err);
      setGenders([]);
    } finally {
      setIsLoadingGenders(false);
    }
  };

  const loadUserAddresses = async () => {
    if (!userData?.id) return;

    try {
      setIsLoadingAddresses(true);
      setAddressError('');

      const response = await axiosInstance.get("/users/get-address-by-id-or-user-id");

      if (response.data?.status === STATUS_CODES.SUCCESS && response.data?.object) {
        setAddresses(response.data.object);
      } else {
        setAddresses([]);
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Failed to load addresses');
      setAddressError(errorMessage);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const validateAddressField = (field: string, value: string): string => {
    switch (field) {
      case 'address':
        if (!value.trim()) return 'Address is required';
        if (value.length < 5) return 'Address must be at least 5 characters';
        if (value.length > 255) return 'Address must be less than 255 characters';
        return '';

      case 'tag':
        if (!value.trim()) return 'Tag is required';
        if (value.length < 2) return 'Tag must be at least 2 characters';
        if (value.length > 50) return 'Tag must be less than 50 characters';
        return '';

      case 'primaryMobile':
        if (!value.trim()) return 'Primary mobile number is required';
        if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 10-digit mobile number';
        return '';

      case 'secondaryMobile':
        if (value.trim() && !/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 10-digit mobile number';
        return '';

      case 'whatsapp':
        if (!value.trim()) return 'WhatsApp number is required';
        if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 10-digit WhatsApp number';
        return '';

      case 'cityId':
        if (!value || parseInt(value) === 0) return 'Please select a city';
        return '';

      default:
        return '';
    }
  };

  const handleAddressFieldChange = (field: string, value: string | boolean | number) => {
    setAddressFormData(prev => ({ ...prev, [field]: value }));

    if (addressTouchedFields[field as keyof typeof addressTouchedFields]) {
      const error = validateAddressField(field, value.toString());
      setAddressFieldErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleAddressFieldBlur = (field: string, value: string) => {
    setAddressTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateAddressField(field, value);
    setAddressFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateAddressForm = (): boolean => {
    const errors = {
      address: validateAddressField('address', addressFormData.address),
      tag: validateAddressField('tag', addressFormData.tag),
      primaryMobile: validateAddressField('primaryMobile', addressFormData.primaryMobile),
      secondaryMobile: validateAddressField('secondaryMobile', addressFormData.secondaryMobile),
      whatsapp: validateAddressField('whatsapp', addressFormData.whatsapp),
      cityId: addressFormData.cityId === 0 ? 'Please select a city' : validateAddressField('cityId', addressFormData.cityId.toString())
    };

    setAddressFieldErrors(errors);
    setAddressTouchedFields({
      address: true,
      tag: true,
      primaryMobile: true,
      secondaryMobile: true,
      whatsapp: true,
      cityId: true
    });

    return !Object.values(errors).some(e => e);
  };

  const resetAddressForm = () => {
    setAddressFormData({
      address: '',
      tag: '',
      permanent: false,
      location: '',
      primaryMobile: '',
      secondaryMobile: '',
      whatsapp: '',
      cityId: 0
    });
    setAddressFieldErrors({
      address: '',
      tag: '',
      primaryMobile: '',
      secondaryMobile: '',
      whatsapp: '',
      cityId: ''
    });
    setAddressTouchedFields({
      address: false,
      tag: false,
      primaryMobile: false,
      secondaryMobile: false,
      whatsapp: false,
      cityId: false
    });
    setEditingAddressId(null);
  };

  const handleAddAddress = () => {
    resetAddressForm();
    setShowAddressForm(true);
  };

  const handleEditAddress = (address: AddressDto) => {
    setAddressFormData({
      address: address.address,
      tag: address.tag,
      permanent: address.permanent,
      location: address.location || '',
      primaryMobile: address.primaryMobile,
      secondaryMobile: address.secondaryMobile || '',
      whatsapp: address.whatsapp,
      cityId: address.cities.id
    });
    setEditingAddressId(address.id);
    setShowAddressForm(true);
    setAddressFieldErrors({
      address: '',
      tag: '',
      primaryMobile: '',
      secondaryMobile: '',
      whatsapp: '',
      cityId: ''
    });
  };

  const handleCancelAddressForm = () => {
    setShowAddressForm(false);
    resetAddressForm();
  };

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) return;

    try {
      setIsSavingAddress(true);
      setAddressError('');
      setAddressSuccess('');

      const selectedCity = cities.find(c => c.id === addressFormData.cityId);

      if (!selectedCity) {
        setAddressError('Invalid city selected');
        setIsSavingAddress(false);
        return;
      }

      const payload = {
        address: addressFormData.address,
        tag: addressFormData.tag,
        permanent: addressFormData.permanent,
        location: addressFormData.location || null,
        primaryMobile: addressFormData.primaryMobile,
        secondaryMobile: addressFormData.secondaryMobile || null,
        whatsapp: addressFormData.whatsapp,
        cities: {
          id: selectedCity.id,
          name: selectedCity.name
        }
      };

      let response;
      if (editingAddressId) {
        // Update existing address using /users/add-address with id in payload
        const updatePayload = { ...payload, id: editingAddressId };
        response = await axiosInstance.post("/users/add-address", updatePayload);
      } else {
        // Add new address
        response = await axiosInstance.post("/users/add-address", payload);
      }

      if (response.data?.status === STATUS_CODES.SUCCESS) {
        setAddressSuccess(editingAddressId ? 'Address updated successfully!' : 'Address added successfully!');

        await Swal.fire({
          icon: 'success',
          title: editingAddressId ? 'Address Updated!' : 'Address Added!',
          text: editingAddressId ? 'Your address has been updated successfully.' : 'Your new address has been added successfully.',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: '#FFF4EE',
          color: '#1A1F3A',
          iconColor: '#00BFA5',
          customClass: {
            popup: 'rounded-xl shadow-2xl',
            timerProgressBar: 'bg-linear-to-r from-[#FF6B35] to-[#FF8C42]'
          }
        });

        await loadUserAddresses();
        handleCancelAddressForm();
      } else {
        throw new Error(response.data?.desc || 'Failed to save address');
      }
    } catch (err: any) {
      console.error('Save address error:', err);
      const errorMessage = handleApiError(err, 'Failed to save address');
      setAddressError(errorMessage);
    } finally {
      setIsSavingAddress(false);
    }
  };


  const getAddressTagIcon = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('home') || tagLower.includes('house')) {
      return <HomeIcon className="w-5 h-5" />;
    } else if (tagLower.includes('office') || tagLower.includes('work')) {
      return <BuildingOfficeIcon className="w-5 h-5" />;
    } else {
      return <HomeIcon className="w-5 h-5" />;
    }
  };

  // ============ UserData Management ============
  const loadUserData = async () => {
    if (!userData?.id) return;

    try {
      setIsLoadingUserData(true);
      setUserDataError('');

      const response = await axiosInstance.get("/users/get-user-data");

      if (response.data?.status === STATUS_CODES.SUCCESS && response.data?.object) {
        setUserDataList(response.data.object);
      } else {
        setUserDataList([]);
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Failed to load mobile details');
      setUserDataError(errorMessage);
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const validateUserDataField = (field: string, value: string): string => {
    switch (field) {
      case 'primaryMobile':
        if (!value.trim()) return 'Primary mobile number is required';
        if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 10-digit mobile number';
        return '';

      case 'secondaryMobile':
        if (value.trim() && !/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 10-digit mobile number';
        return '';

      case 'whatsapp':
        if (!value.trim()) return 'WhatsApp number is required';
        if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 10-digit WhatsApp number';
        return '';

      case 'postalCode':
        if (value.trim() && !/^\d{5}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 5-digit postal code';
        return '';

      case 'address':
        if (!value.trim()) return 'Address is required';
        if (value.length < 5) return 'Address must be at least 5 characters';
        if (value.length > 255) return 'Address must be less than 255 characters';
        return '';

      case 'cityId':
        if (!value || parseInt(value) === 0) return 'Please select a city';
        return '';

      default:
        return '';
    }
  };

  const handleUserDataFieldChange = (field: string, value: string | number) => {
    setUserDataFormData(prev => ({ ...prev, [field]: value }));

    if (userDataTouchedFields[field as keyof typeof userDataTouchedFields]) {
      const error = validateUserDataField(field, value.toString());
      setUserDataFieldErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleUserDataFieldBlur = (field: string, value: string) => {
    setUserDataTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateUserDataField(field, value);
    setUserDataFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateUserDataForm = (): boolean => {
    const errors = {
      primaryMobile: validateUserDataField('primaryMobile', userDataFormData.primaryMobile),
      secondaryMobile: validateUserDataField('secondaryMobile', userDataFormData.secondaryMobile),
      whatsapp: validateUserDataField('whatsapp', userDataFormData.whatsapp),
      postalCode: validateUserDataField('postalCode', userDataFormData.postalCode),
      address: validateUserDataField('address', userDataFormData.address),
      cityId: userDataFormData.cityId === 0 ? 'Please select a city' : validateUserDataField('cityId', userDataFormData.cityId.toString())
    };

    setUserDataFieldErrors(errors);
    setUserDataTouchedFields({
      primaryMobile: true,
      secondaryMobile: true,
      whatsapp: true,
      postalCode: true,
      address: true,
      cityId: true
    });

    return !Object.values(errors).some(e => e);
  };

  const resetUserDataForm = () => {
    setUserDataFormData({
      primaryMobile: '',
      secondaryMobile: '',
      whatsapp: '',
      postalCode: '',
      address: '',
      cityId: 0
    });
    setUserDataFieldErrors({
      primaryMobile: '',
      secondaryMobile: '',
      whatsapp: '',
      postalCode: '',
      address: '',
      cityId: ''
    });
    setUserDataTouchedFields({
      primaryMobile: false,
      secondaryMobile: false,
      whatsapp: false,
      postalCode: false,
      address: false,
      cityId: false
    });
    setEditingUserDataId(null);

    // Reset verification state
    setMobileVerified(false);
    setCodeSent(false);
    setVerificationCode('');
    setVerificationError('');
  };

  const handleAddUserData = () => {
    resetUserDataForm();
    setShowUserDataForm(true);
  };

  const handleEditUserData = (userDataItem: UserDataDto) => {
    setUserDataFormData({
      primaryMobile: userDataItem.primaryMobile,
      secondaryMobile: userDataItem.secondaryMobile || '',
      whatsapp: userDataItem.whatsapp || '',
      postalCode: userDataItem.postalCode || '',
      address: userDataItem.address || '',
      cityId: userDataItem.cities.id
    });
    setEditingUserDataId(userDataItem.id);
    setShowUserDataForm(true);
    setMobileVerified(userDataItem.isPnoVerified);
    setUserDataFieldErrors({
      primaryMobile: '',
      secondaryMobile: '',
      whatsapp: '',
      postalCode: '',
      address: '',
      cityId: ''
    });
  };

  const handleCancelUserDataForm = () => {
    setShowUserDataForm(false);
    resetUserDataForm();
  };

  const handleSaveUserData = async () => {
    // Require mobile verification for new entries or when primary mobile changes
    if (!editingUserDataId || (editingUserDataId && !mobileVerified)) {
      if (!mobileVerified) {
        setUserDataError('Please verify your mobile number before saving');
        return;
      }
    }

    if (!validateUserDataForm()) return;

    try {
      setIsSavingUserData(true);
      setUserDataError('');
      setUserDataSuccess('');

      const selectedCity = cities.find(c => c.id === userDataFormData.cityId);

      if (!selectedCity) {
        setUserDataError('Invalid city selected');
        setIsSavingUserData(false);
        return;
      }

      const payload = {
        primaryMobile: userDataFormData.primaryMobile,
        secondaryMobile: userDataFormData.secondaryMobile || null,
        whatsapp: userDataFormData.whatsapp,
        postalCode: userDataFormData.postalCode || null,
        address: userDataFormData.address,
        cities: {
          id: selectedCity.id,
          name: selectedCity.name
        }
      };

      let response;
      if (editingUserDataId) {
        const updatePayload = { ...payload, id: editingUserDataId, isPnoVerified: mobileVerified };
        response = await axiosInstance.post("/users/add-user-data", updatePayload);
      } else {
        const newPayload = { ...payload, isPnoVerified: mobileVerified };
        response = await axiosInstance.post("/users/add-user-data", newPayload);
      }

      if (response.data?.status === STATUS_CODES.SUCCESS) {
        setUserDataSuccess(editingUserDataId ? 'Mobile details updated successfully!' : 'Mobile details added successfully!');

        await Swal.fire({
          icon: 'success',
          title: editingUserDataId ? 'Mobile Details Updated!' : 'Mobile Details Added!',
          text: editingUserDataId ? 'Your mobile details have been updated successfully.' : 'Your mobile details have been added successfully.',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: '#FFF4EE',
          color: '#1A1F3A',
          iconColor: '#00BFA5',
          customClass: {
            popup: 'rounded-xl shadow-2xl',
            timerProgressBar: 'bg-linear-to-r from-[#FF6B35] to-[#FF8C42]'
          }
        });

        await loadUserData();
        handleCancelUserDataForm();
      } else {
        throw new Error(response.data?.desc || 'Failed to save mobile details');
      }
    } catch (err: any) {
      console.error('Save user data error:', err);
      const errorMessage = handleApiError(err, 'Failed to save mobile details');
      setUserDataError(errorMessage);
    } finally {
      setIsSavingUserData(false);
    }
  };

  const handleDeleteUserData = async (userDataId: number) => {
    try {
      setIsDeletingUserData(true);
      setUserDataError('');
      setUserDataSuccess('');

      const result = await Swal.fire({
        title: 'Delete Mobile Details?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#F59B0F',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
        background: '#FFF4EE',
        color: '#1A1F3A'
      });

      if (result.isConfirmed) {
        await axiosInstance.delete(`/users/delete-user-data?userDataId=${userDataId}`);
        setUserDataSuccess('Mobile details deleted successfully!');

        await Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Your mobile details have been deleted.',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          background: '#FFF4EE',
          color: '#1A1F3A',
          iconColor: '#00BFA5'
        });

        await loadUserData();
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Failed to delete mobile details');
      setUserDataError(errorMessage);
    } finally {
      setIsDeletingUserData(false);
    }
  };

  // ============ Mobile Verification Handlers ============
  const handleSendVerificationCode = async () => {
    if (!userDataFormData.primaryMobile) {
      setVerificationError('Please enter a mobile number first');
      return;
    }

    const mobileError = validateUserDataField('primaryMobile', userDataFormData.primaryMobile);
    if (mobileError) {
      setVerificationError(mobileError);
      return;
    }

    try {
      setIsSendingCode(true);
      setVerificationError('');

      const response = await axiosInstance.post("/users/send-mobile-verification", null, {
        params: { mobileNumber: userDataFormData.primaryMobile }
      });

      console.log('Verification code response:', response.data);

      const responseStatus = Number(response.data?.status ?? response.status);

      if (responseStatus === STATUS_CODES.SUCCESS) {
        setCodeSent(true);
        setVerificationError('');
        setMobileVerified(false);
        setVerificationCode('');
        setShowVerificationModal(true);

        // Show success toast without blocking
        Swal.fire({
          icon: 'success',
          title: 'Code Sent!',
          text: 'A 4-digit verification code has been sent to your mobile number.',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: '#FFF4EE',
          color: '#1A1F3A',
          iconColor: '#00BFA5',
          toast: true,
          position: 'top-end'
        });
      } else {
        setVerificationError(response.data?.desc || 'Failed to send verification code');
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Failed to send verification code');
      setVerificationError(errorMessage);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 4) {
      setVerificationError('Please enter the 4-digit verification code');
      return;
    }

    try {
      setIsVerifyingCode(true);
      setVerificationError('');

      const response = await axiosInstance.post("/users/verify-mobile-code", null, {
        params: { code: verificationCode }
      });

      if (response.data?.status === STATUS_CODES.SUCCESS && response.data?.object === true) {
        setMobileVerified(true);
        setVerificationError('');
        setCodeSent(false);
        setShowVerificationModal(false);

        await Swal.fire({
          icon: 'success',
          title: 'Verified!',
          text: 'Your mobile number has been verified successfully.',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          background: '#FFF4EE',
          color: '#1A1F3A',
          iconColor: '#00BFA5'
        });
      } else {
        setVerificationError(response.data?.desc || 'Invalid verification code');
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Failed to verify code');
      setVerificationError(errorMessage);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = () => {
    setCodeSent(false);
    setVerificationCode('');
    setMobileVerified(false);
    setVerificationError('');
    handleSendVerificationCode();
  };

  const handleCloseVerificationModal = () => {
    setShowVerificationModal(false);
    setVerificationCode('');
    setVerificationError('');
  };

  // ============ Personal Info Helpers ============
  const getInputClassName = (field: PersonalFieldKey) =>
    `w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold text-gray-900 shadow-sm outline-none transition ${fieldErrors[field] && touchedFields[field]
      ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100'
      : 'border-gray-200 focus:border-[#F59B0F] focus:ring-4 focus:ring-orange-100'
    } [&:-webkit-autofill]:bg-orange-50 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(255_247_237)]`;

  const getAddressInputClassName = (field: keyof typeof addressFieldErrors) =>
    `w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${addressFieldErrors[field] && addressTouchedFields[field]
      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
      : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
    }`;

  const getPersonalValidationErrors = (): PersonalFieldErrors => {
    if (!personalFormData) return createEmptyPersonalFieldErrors();

    return {
      firstName: validateFirstName(personalFormData.firstName),
      lastName: validateLastName(personalFormData.lastName),
      email: validateEmail(personalFormData.email),
      dateOfBirth: validateDateOfBirth(personalFormData.dob),
      nic: validateNIC(personalFormData.nic),
      gender: validateGender(personalFormData.gender)
    };
  };

  const touchAllPersonalFields = () => {
    setTouchedFields({
      firstName: true,
      lastName: true,
      email: true,
      dateOfBirth: true,
      nic: true,
      gender: true
    });
  };

  const resetPersonalValidation = () => {
    setFieldErrors(createEmptyPersonalFieldErrors());
    setTouchedFields(createUntouchedPersonalFields());
  };

  const validatePersonalForm = (): boolean => {
    const errors = getPersonalValidationErrors();

    setFieldErrors(errors);
    touchAllPersonalFields();

    return !Object.values(errors).some(e => e);
  };

  const validatePersonalField = (field: PersonalFieldKey, value: string): string => {
    switch (field) {
      case 'firstName':
        return validateFirstName(value);
      case 'lastName':
        return validateLastName(value);
      case 'email':
        return validateEmail(value);
      case 'dateOfBirth':
        return validateDateOfBirth(value);
      case 'nic':
        return validateNIC(value);
      case 'gender':
        return validateGender(personalFormData?.gender ?? null);
      default:
        return '';
    }
  };

  const handlePersonalFieldChange = (field: PersonalFieldKey, value: string) => {
    if (!personalFormData) return;

    if (field === 'dateOfBirth') {
      setPersonalFormData({ ...personalFormData, dob: value });
    } else {
      setPersonalFormData({ ...personalFormData, [field]: value });
    }

    if (touchedFields[field]) {
      const error = validatePersonalField(field, value);
      setFieldErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handlePersonalFieldBlur = (field: PersonalFieldKey, value: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validatePersonalField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateFirstName = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return 'First name is required';
    if (normalized.length < 2 || normalized.length > 45) return 'First name must be 2-45 characters';
    if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(normalized)) return 'First name can only contain letters, spaces, apostrophes, or hyphens';
    return '';
  };

  const validateLastName = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return 'Last name is required';
    if (normalized.length < 2 || normalized.length > 45) return 'Last name must be 2-45 characters';
    if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(normalized)) return 'Last name can only contain letters, spaces, apostrophes, or hyphens';
    return '';
  };

  const validateEmail = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return 'Email is required';
    if (normalized.length < 10 || normalized.length > 100) return 'Email must be 10-100 characters';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) return 'Please enter a valid email address';
    return '';
  };

  const validateDateOfBirth = (value: string): string => {
    if (!value) return 'Date of birth is required';
    const dob = new Date(value);
    const today = new Date();
    if (Number.isNaN(dob.getTime())) return 'Please enter a valid date of birth';
    if (dob > today) return 'Date of birth cannot be in the future';
    return '';
  };

  const validateNIC = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return 'NIC is required';
    if (normalized.length < 9 || normalized.length > 12) return 'NIC must be 9-12 characters';
    const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
    if (!nicRegex.test(normalized)) return 'Please enter a valid NIC (9 digits + V/X or 12 digits)';
    return '';
  };

  const validateGender = (value: GenderDto | null): string => {
    if (!value?.id) return 'Gender is required before updating profile details';
    return '';
  };

  const validateProfileImg = (value: string): string => {
    // profileImg is optional, so empty is valid
    if (!value) return '';
    if (value.length > 150) return 'Profile image URL must be max 150 characters';
    return '';
  };

  // Field-level validation state for personal info
  const [fieldErrors, setFieldErrors] = useState<PersonalFieldErrors>(createEmptyPersonalFieldErrors);
  const [touchedFields, setTouchedFields] = useState<PersonalTouchedFields>(createUntouchedPersonalFields);

  const markMissingGender = () => {
    const message = 'Please select a gender before updating your profile.';
    setError(message);
    setFieldErrors(prev => ({ ...prev, gender: message }));
    setTouchedFields(prev => ({ ...prev, gender: true }));
    setIsEditingPersonal(true);
  };

  const buildUserUpdatePayload = (overrides: Partial<UpdateUserDto> = {}): UpdateUserDto | null => {
    if (!userData || !personalFormData) return null;

    const gender = overrides.gender ?? personalFormData.gender ?? userData.gender;
    if (!gender?.id) {
      markMissingGender();
      return null;
    }

    const payload: UpdateUserDto = {
      firstName: personalFormData.firstName.trim(),
      lastName: personalFormData.lastName.trim(),
      dob: personalFormData.dob,
      nic: personalFormData.nic.trim().toUpperCase(),
      email: personalFormData.email.trim().toLowerCase(),
      profileImg: personalFormData.profileImg || '',
      isActive: personalFormData.isActive,
      verificationStatus: personalFormData.verificationStatus,
      gender,
      userRole: personalFormData.userRole,
      ...overrides,
    };

    payload.gender = gender;
    return payload;
  };

  const extractPersonalApiFieldErrors = (err: any): Partial<PersonalFieldErrors> => {
    const exData = err?.response?.data?.exData;
    if (!exData || typeof exData !== 'object' || Array.isArray(exData)) {
      return {};
    }

    return Object.entries(exData).reduce<Partial<PersonalFieldErrors>>((errors, [rawKey, rawValue]) => {
      const normalizedKey = rawKey.replace(/\[[^\]]*\]/g, '').split('.').pop() || rawKey;
      const mappedKey = personalFieldAliasMap[normalizedKey] || personalFieldAliasMap[rawKey];

      if (!mappedKey) {
        return errors;
      }

      const message = Array.isArray(rawValue)
        ? rawValue.filter(Boolean).join(', ')
        : String(rawValue || '').trim();

      if (message) {
        errors[mappedKey] = message;
      }

      return errors;
    }, {});
  };

  const applyPersonalApiFieldErrors = (err: any) => {
    const apiFieldErrors = extractPersonalApiFieldErrors(err);
    const fields = Object.keys(apiFieldErrors) as PersonalFieldKey[];

    if (fields.length === 0) {
      return false;
    }

    setFieldErrors(prev => ({ ...prev, ...apiFieldErrors }));
    setTouchedFields(prev => fields.reduce<PersonalTouchedFields>(
      (next, field) => ({ ...next, [field]: true }),
      { ...prev }
    ));
    return true;
  };

  const handlePersonalSave = async () => {
    if (!userData || !personalFormData) return;
    if (isSavingPersonal) return;

    try {
      setError('');
      setSuccess('');

      // Validate all fields
      if (!validatePersonalForm()) {
        return;
      }

      const updateData = buildUserUpdatePayload();
      if (!updateData) return;

      setIsSavingPersonal(true);
      const response = await axiosInstance.post("/users/update-user", updateData);

      // Handle success - response has exData: null
      handleApiSuccess(response, 'Profile updated successfully!');

      // Show success SweetAlert
      await Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        text: 'Your personal details have been updated successfully.',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#FFF4EE',
        color: '#1A1F3A',
        iconColor: '#00BFA5',
        customClass: {
          popup: 'rounded-xl shadow-2xl',
          timerProgressBar: 'bg-linear-to-r from-[#FF6B35] to-[#FF8C42]'
        }
      });

      // Reload user data to get fresh data from server
      await loadUserProfile();
      setIsEditingPersonal(false);

      // Clear validation state
      resetPersonalValidation();

    } catch (err: any) {
      const errorMessage = handleApiError(err, "Failed to update profile");
      applyPersonalApiFieldErrors(err);
      setError(errorMessage);
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handlePersonalCancel = () => {
    if (userData) {
      setPersonalFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        dob: userData.dob || '',
        profileImg: userData.profileImg || '',
        nic: userData.nic || '',
        email: userData.email || '',
        password: userData.password || '',
        isActive: userData.isActive,
        verificationStatus: userData.verificationStatus,
        gender: userData.gender,
        userRole: userData.userRole
      });
    }
    setIsEditingPersonal(false);
    setError('');
    setSuccess('');

    resetPersonalValidation();
  };

  // ============ Profile Image Handlers ============
  const uploadProfileImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('files', file);

    const response = await axiosInstance.post('/storage/upload?path=profiles', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && (response.data.message === 'Success' || response.data.message === 'success')) {
      const uploadedPaths: string[] = Array.isArray(response.data.object) ? response.data.object : [];
      if (!uploadedPaths.length) {
        throw new Error('No image path returned from upload service');
      }
      return uploadedPaths[0];
    }

    throw new Error(response.data?.desc || 'Failed to upload profile image');
  };

  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userData || !personalFormData) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setPendingImageFile(file);
    setImageError('');
    setImageSuccess('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveImage = async () => {
    if (!pendingImageFile || !userData || !personalFormData) return;

    if (!(personalFormData.gender ?? userData.gender)?.id) {
      markMissingGender();
      setImageError('Select gender in personal information before saving a profile image.');
      return;
    }

    setIsUploadingImage(true);
    setImageError('');
    setImageSuccess('');

    try {
      const uploadedImagePath = await uploadProfileImage(pendingImageFile);

      // Validate image URL length according to API spec (max 100 characters)
      const profileImgError = validateProfileImg(uploadedImagePath);
      if (profileImgError) {
        setImageError(profileImgError);
        setImagePreview(normalizeImageUrl(userData?.profileImg || ''));
        return;
      }

      const updateData = buildUserUpdatePayload({ profileImg: uploadedImagePath });
      if (!updateData) return;

      const response = await axiosInstance.post("/users/update-user", updateData);

      handleApiSuccess(response, 'Profile image updated successfully!');

      await Swal.fire({
        icon: 'success',
        title: 'Profile Picture Updated!',
        text: 'Your profile image has been updated successfully.',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#FFF4EE',
        color: '#1A1F3A',
        iconColor: '#00BFA5',
        customClass: {
          popup: 'rounded-xl shadow-2xl',
          timerProgressBar: 'bg-linear-to-r from-[#FF6B35] to-[#FF8C42]'
        }
      });

      await loadUserProfile();
      setPendingImageFile(null);
      setTimeout(() => setImageSuccess(''), 3000);
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Failed to update profile image');
      applyPersonalApiFieldErrors(err);
      setImageError(errorMessage);
      setImagePreview(normalizeImageUrl(userData?.profileImg || ''));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCancelPendingImage = () => {
    setPendingImageFile(null);
    setImagePreview(normalizeImageUrl(userData?.profileImg || ''));
    setImageError('');
    setImageSuccess('');
  };

  const handleRemoveImage = async () => {
    if (!userData || !personalFormData) return;

    try {
      setImageError('');
      setImageSuccess('');

      const updateData = buildUserUpdatePayload({ profileImg: '' });
      if (!updateData) {
        setImageError('Select gender in personal information before removing a profile image.');
        return;
      }

      const response = await axiosInstance.post("/users/update-user", updateData);

      handleApiSuccess(response, 'Profile image removed successfully!');

      await Swal.fire({
        icon: 'success',
        title: 'Profile Picture Removed!',
        text: 'Your profile image has been removed successfully.',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#FFF4EE',
        color: '#1A1F3A',
        iconColor: '#00BFA5',
        customClass: {
          popup: 'rounded-xl shadow-2xl',
          timerProgressBar: 'bg-linear-to-r from-[#FF6B35] to-[#FF8C42]'
        }
      });

      await loadUserProfile();
      setPendingImageFile(null);
      setTimeout(() => setImageSuccess(''), 3000);
    } catch (err: any) {
      const errorMessage = handleApiError(err, "Failed to remove profile image");
      applyPersonalApiFieldErrors(err);
      setImageError(errorMessage);
    }
  };

  // ============ Email Verification Handler ============
  const handleSendVerificationEmail = async () => {
    if (!userData) return;

    try {
      setIsVerifyingEmail(true);
      setEmailVerificationError('');
      setEmailVerificationSuccess('');

      // const verificationUrl = `${window.location.origin}/verify-email`;
      const verificationUrl = `/verify-email`;

      const emailTemplate = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - DeliveryYa</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #FFF4EE 0%, #FFE5D9 100%);
            padding: 20px;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .email-header {
            background: linear-gradient(90deg, #F59B0F 0%, #AC6C2A 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .email-header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .email-header p {
            color: #FFF4EE;
            font-size: 16px;
        }

        .email-body {
            padding: 40px 30px;
        }

        .greeting {
            font-size: 20px;
            color: #1A1F3A;
            font-weight: 600;
            margin-bottom: 20px;
        }

        .message {
            color: #2C3E50;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.8;
        }

        .info-box {
            background: #FFF7EB;
            border-left: 4px solid #AC6C2A;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .info-box p {
            color: #00897B;
            font-size: 14px;
            margin: 0;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(90deg, #F59B0F 0%, #AC6C2A 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 4px 15px rgba(245, 155, 15, 0.18);
            margin: 20px 0;
        }

        .button-container {
            text-align: center;
            margin: 30px 0;
        }

        .warning-box {
            background: #FFF3E0;
            border-left: 4px solid #FFA726;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .warning-box p {
            color: #E65100;
            font-size: 14px;
            margin: 0;
        }

        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, #FFD4C4 50%, transparent 100%);
            margin: 30px 0;
        }

        .footer {
            background: #1A1F3A;
            padding: 30px;
            text-align: center;
            color: #ffffff;
        }

        .footer-links {
            margin: 20px 0;
        }

        .footer-links a {
            color: #F59B0F;
            text-decoration: none;
            margin: 0 15px;
            font-size: 14px;
        }

        .footer-text {
            color: #94A3B8;
            font-size: 12px;
            margin-top: 20px;
            line-height: 1.8;
        }

        .brand-name {
            color: #F59B0F;
            font-weight: 700;
        }

        .link-text {
            color: #F59B0F;
            font-size: 13px;
            word-break: break-all;
            background: #FFF7EB;
            padding: 12px;
            border-radius: 6px;
            margin: 15px 0;
            display: inline-block;
            width: 100%;
        }
    </style>
</head>

<body>
    <div class="email-container">
        <div class="email-header">
            <h1>Verify Your Email</h1>
            <p>Welcome to DeliveryYa!</p>
        </div>

        <div class="email-body">
            <p class="greeting">Hello, ${userData.firstName}!</p>

            <p class="message">
                Thank you for signing up with <strong class="brand-name">DeliveryYa</strong>!
                We're excited to have you on board. To complete your registration and start
                enjoying our fast and reliable delivery services, please verify your email address.
            </p>

            <div class="info-box">
                <p><strong>Why verify?</strong> Email verification helps us ensure the security
                    of your account and allows us to send you important updates about your deliveries.</p>
            </div>

            <div class="button-container">
                <a href="{{verification_link}}" class="cta-button">
                    Verify Email Address
                </a>
            </div>

            <div class="divider"></div>

            <p class="message" style="font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:
            </p>
            <div class="link-text">
                {{verification_link}}
            </div>

            <div class="warning-box">
                <p><strong>⚠️ Security Notice:</strong> If you didn't create an account with
                    DeliveryYa, please ignore this email or contact our support team immediately.</p>
            </div>

            <p class="message" style="margin-top: 30px; font-size: 14px;">
                Need help? Our support team is always here to assist you.
            </p>

            <p class="message" style="font-size: 14px; margin-top: 20px;">
                Best regards,<br>
                <strong class="brand-name">The DeliveryYa Team</strong>
            </p>
        </div>

        <div class="footer">
            <p class="footer-text">
                © 2026 <span class="brand-name">DeliveryYa</span>. All rights reserved.
            </p>
            <p class="footer-text" style="margin-top: 15px; font-size: 11px;">
                This is an automated email. Please do not reply to this message.
            </p>
        </div>
    </div>
</body>

</html>`;

      const payload = {
        email: userData.email,
        subject: 'Verify Your Email Address - DeliveryYa',
        design: emailTemplate,
        route: verificationUrl
      };

      const response = await axiosInstance.post('/email/send-verify-email', payload);

      if (response.data.message?.toLowerCase() === 'success') {
        setEmailVerificationSuccess('Verification email sent successfully! Please check your inbox and click the verification link.');
        setTimeout(() => setEmailVerificationSuccess(''), 5000);
      } else {
        throw new Error(response.data.desc || 'Failed to send verification email');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.desc || 'Failed to send verification email. Please try again.';
      setEmailVerificationError(errorMessage);
      setTimeout(() => setEmailVerificationError(''), 5000);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59B0F]"></div>
        <p className="text-gray-600 font-medium">Loading your profile...</p>
      </div>
    );
  }

  if (!userData || !personalFormData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600 font-semibold mb-4">{error || 'Failed to load profile'}</p>
        <button
          onClick={loadUserProfile}
          className="px-4 py-2 bg-[#F59B0F] text-white font-semibold rounded-lg hover:bg-[#AC6C2A] transition-colors duration-300"
        >
          Retry
        </button>
      </div>
    );
  }

  const personalValidationIssues = Object.values(fieldErrors).filter(Boolean);
  const profileCompletionItems = [
    Boolean(userData.firstName?.trim() && userData.lastName?.trim()),
    Boolean(userData.email?.trim()),
    Boolean(userData.dob),
    Boolean(userData.nic?.trim()),
    Boolean(userData.gender?.id),
    Boolean(userData.emailVerified),
  ];
  const profileCompletionPercent = Math.round(
    (profileCompletionItems.filter(Boolean).length / profileCompletionItems.length) * 100
  );
  const displayFullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'DeliveryYa user';
  const formattedDob = userData.dob
    ? new Date(userData.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not provided';
  const roleNameUpper = (userData.userRole?.name || 'Customer').toUpperCase();
  const permanentAddressCount = addresses.filter((address) => address.permanent).length;
  const accountStateLabel = userData.isActive ? 'ACTIVE' : 'INACTIVE';
  const emailStateLabel = userData.emailVerified ? 'VERIFIED' : 'PENDING';
  const genderStateLabel = userData.gender?.name || 'Required';
  const compactDetailGroups: Array<{
    title: string;
    icon: React.ReactNode;
    items: Array<{ label: string; value: string; valueClass?: string }>;
  }> = [
    {
      title: 'Identity',
      icon: <UserIcon className="h-4 w-4" />,
      items: [
        { label: 'Full name', value: displayFullName },
        { label: 'NIC', value: userData.nic || 'Not provided' },
        { label: 'Date of birth', value: formattedDob },
      ],
    },
    {
      title: 'Contact',
      icon: <EnvelopeIcon className="h-4 w-4" />,
      items: [
        { label: 'Email', value: userData.email || 'Not provided', valueClass: 'break-all' },
        { label: 'Email status', value: emailStateLabel },
        { label: 'Addresses', value: `${addresses.length} saved / ${permanentAddressCount} permanent` },
      ],
    },
    {
      title: 'Account',
      icon: <ShieldCheckIcon className="h-4 w-4" />,
      items: [
        { label: 'User role', value: roleNameUpper },
        { label: 'Account', value: accountStateLabel },
        { label: 'Verification', value: userData.verificationStatus?.name || 'Pending' },
        { label: 'Gender', value: genderStateLabel, valueClass: userData.gender?.id ? '' : 'text-red-700' },
      ],
    },
  ];

  return (
    <div className="space-y-5 pb-6 sm:space-y-6 sm:pb-8">
      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-green-600" />
            <p className="text-green-700 font-semibold text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
          <p className="text-red-600 font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* ============ Profile Header Card ============ */}
      <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="bg-linear-to-r from-orange-50 via-white to-amber-50 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
              <div className="relative group inline-block">
                <div className="relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={`${userData.firstName || ''} ${userData.lastName || ''}`}
                      className="h-32 w-32 rounded-3xl border-4 border-white object-cover object-top shadow-lg shadow-orange-200/50"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-white bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] text-3xl font-black text-white shadow-lg shadow-orange-200/50">
                      {(userData.firstName?.[0] || '') + (userData.lastName?.[0] || '') || 'U'}
                    </div>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="absolute bottom-2 right-2 rounded-2xl bg-white p-3 text-[#F59B0F] shadow-lg transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Change profile picture"
                  >
                    {isUploadingImage ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#F59B0F] border-t-transparent" />
                    ) : (
                      <CameraIcon className="h-5 w-5" />
                    )}
                  </button>

                  {pendingImageFile && (
                    <button
                      onClick={handleCancelPendingImage}
                      className="absolute right-2 top-2 rounded-2xl bg-red-500 p-2 text-white shadow-lg transition hover:bg-red-600"
                      title="Cancel selected image"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                  disabled={isUploadingImage}
                />

                <div className="mt-3 grid gap-2">
                  {pendingImageFile && (
                    <button
                      onClick={handleSaveImage}
                      disabled={isUploadingImage}
                      className="rounded-xl bg-[#F59B0F] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#AC6C2A] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save image
                    </button>
                  )}

                  {!pendingImageFile && !!userData.profileImg && (
                    <button
                      onClick={handleRemoveImage}
                      disabled={isUploadingImage}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove image
                    </button>
                  )}
                </div>

                {imageError && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600 shadow-lg animate-fade-in">
                    {imageError}
                  </div>
                )}

                {imageSuccess && (
                  <div className="absolute left-0 top-full z-20 mt-2 flex w-72 items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-600 shadow-lg animate-fade-in">
                    <CheckIcon className="h-4 w-4" />
                    {imageSuccess}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#AC6C2A]">{roleNameUpper}</p>
                <h1 className="mt-2 text-3xl font-black text-gray-950 sm:text-4xl">
                  {displayFullName}
                </h1>
                <p className="mt-2 break-all text-sm font-semibold text-gray-600">{userData.email || ''}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${userData.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                    {userData.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${userData.emailVerified ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
                    {userData.emailVerified ? 'Email verified' : 'Email pending'}
                  </span>
                  <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#AC6C2A] ring-1 ring-orange-200">
                    {userData.verificationStatus?.name || 'Pending'}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${userData.gender?.id ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                    {userData.gender?.name || 'Gender required'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-105 lg:grid-cols-1">
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-orange-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Profile strength</p>
                    <p className="mt-1 text-sm font-black text-gray-900">{profileCompletionPercent}% complete</p>
                  </div>
                  <SparklesIcon className="h-5 w-5 text-[#F59B0F]" />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100">
                  <div
                    className="h-full rounded-full bg-[#F59B0F] transition-all"
                    style={{ width: `${profileCompletionPercent}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-orange-100">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Addresses</p>
                <p className="mt-1 text-sm font-black text-gray-900">{addresses.length} saved / {permanentAddressCount} permanent</p>
              </div>
              <div className={`rounded-2xl px-4 py-3 shadow-sm ring-1 ${userData.gender?.id ? 'bg-white/80 ring-orange-100' : 'bg-red-50 ring-red-200'}`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${userData.gender?.id ? 'text-gray-400' : 'text-red-500'}`}>Required field</p>
                <p className={`mt-1 text-sm font-black ${userData.gender?.id ? 'text-gray-900' : 'text-red-700'}`}>
                  {userData.gender?.id ? 'Profile update ready' : 'Select gender to save updates'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Personal Information Section ============ */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#AC6C2A] ring-1 ring-orange-200">
                  <UserCircleIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">Profile details</h2>
                  <p className="text-xs font-semibold text-gray-500">Identity, contact, and verification fields</p>
                </div>
              </div>
              {!isEditingPersonal && (
                <button
                  onClick={() => setIsEditingPersonal(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#F59B0F] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#AC6C2A] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isUploadingImage}
                  aria-label="Edit personal information"
                  title="Edit personal information"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {!userData.gender?.id && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Gender is required before profile updates can be saved.
              </div>
            )}

            {isEditingPersonal ? (
              <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="rounded-3xl border border-orange-100 bg-linear-to-b from-orange-50 to-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#AC6C2A] shadow-sm ring-1 ring-orange-100">
                      <SparklesIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#AC6C2A]">Update preview</p>
                      <p className="text-sm font-black text-gray-900">{personalFormData.firstName || userData.firstName || 'First'} {personalFormData.lastName || userData.lastName || 'Last'}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Email</p>
                    <p className="mt-1 break-all text-sm font-bold text-gray-900">{personalFormData.email || 'Not provided'}</p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Gender</p>
                      <p className={`mt-1 text-sm font-black ${personalFormData.gender?.id ? 'text-emerald-700' : 'text-red-700'}`}>
                        {personalFormData.gender?.name || 'Required'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Status</p>
                      <p className="mt-1 text-sm font-black text-gray-900">{userData.verificationStatus?.name || 'Pending'}</p>
                    </div>
                  </div>

                  {personalValidationIssues.length > 0 ? (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                        <div>
                          <p className="text-sm font-black text-red-800">Fix these before saving</p>
                          <div className="mt-2 space-y-1">
                            {personalValidationIssues.slice(0, 4).map((issue) => (
                              <p key={issue} className="text-xs font-semibold text-red-700">{issue}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-sm font-black text-emerald-800">Ready to save</p>
                          <p className="mt-1 text-xs font-semibold text-emerald-700">Required fields are currently valid.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </aside>

                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Edit identity</p>
                      <h3 className="text-lg font-black text-gray-900">Personal details</h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 ring-1 ring-gray-200">
                      {personalValidationIssues.length === 0 ? 'Valid' : `${personalValidationIssues.length} issue${personalValidationIssues.length === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* First Name */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <UserIcon className="w-4 h-4 text-[#F59B0F]" />
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={personalFormData.firstName || ''}
                      onChange={(e) => handlePersonalFieldChange('firstName', e.target.value)}
                      onBlur={(e) => handlePersonalFieldBlur('firstName', e.target.value)}
                      className={getInputClassName('firstName')}
                      placeholder="Enter first name"
                    />
                    {touchedFields.firstName && !fieldErrors.firstName && personalFormData.firstName && (
                      <CheckIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {touchedFields.firstName && fieldErrors.firstName && (
                    <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                      <XMarkIcon className="w-3 h-3" />
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <UserIcon className="w-4 h-4 text-[#F59B0F]" />
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={personalFormData.lastName || ''}
                      onChange={(e) => handlePersonalFieldChange('lastName', e.target.value)}
                      onBlur={(e) => handlePersonalFieldBlur('lastName', e.target.value)}
                      className={getInputClassName('lastName')}
                      placeholder="Enter last name"
                    />
                    {touchedFields.lastName && !fieldErrors.lastName && personalFormData.lastName && (
                      <CheckIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {touchedFields.lastName && fieldErrors.lastName && (
                    <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                      <XMarkIcon className="w-3 h-3" />
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <EnvelopeIcon className="w-4 h-4 text-[#F59B0F]" />
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={personalFormData.email || ''}
                      onChange={(e) => handlePersonalFieldChange('email', e.target.value)}
                      onBlur={(e) => handlePersonalFieldBlur('email', e.target.value)}
                      className={getInputClassName('email')}
                      placeholder="Enter email address"
                    />
                    {touchedFields.email && !fieldErrors.email && personalFormData.email && (
                      <CheckIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {touchedFields.email && fieldErrors.email && (
                    <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                      <XMarkIcon className="w-3 h-3" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <CalendarIcon className="w-4 h-4 text-[#F59B0F]" />
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={personalFormData.dob || ''}
                      onChange={(e) => handlePersonalFieldChange('dateOfBirth', e.target.value)}
                      onBlur={(e) => handlePersonalFieldBlur('dateOfBirth', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={getInputClassName('dateOfBirth')}
                    />
                    {touchedFields.dateOfBirth && !fieldErrors.dateOfBirth && personalFormData.dob && (
                      <CheckIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {touchedFields.dateOfBirth && fieldErrors.dateOfBirth && (
                    <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                      <XMarkIcon className="w-3 h-3" />
                      {fieldErrors.dateOfBirth}
                    </p>
                  )}
                </div>

                {/* NIC */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <IdentificationIcon className="w-4 h-4 text-[#F59B0F]" />
                    NIC <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={personalFormData.nic || ''}
                      onChange={(e) => handlePersonalFieldChange('nic', e.target.value)}
                      onBlur={(e) => handlePersonalFieldBlur('nic', e.target.value)}
                      className={getInputClassName('nic')}
                      placeholder="Enter NIC number"
                    />
                    {touchedFields.nic && !fieldErrors.nic && personalFormData.nic && (
                      <CheckIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {touchedFields.nic && fieldErrors.nic && (
                    <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                      <XMarkIcon className="w-3 h-3" />
                      {fieldErrors.nic}
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <UserCircleIcon className="w-4 h-4 text-[#F59B0F]" />
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={personalFormData.gender?.id || ''}
                    onChange={(e) => {
                      const selectedGender = e.target.value ? {
                        id: parseInt(e.target.value),
                        name: e.target.selectedOptions[0].text
                      } : null;

                      setPersonalFormData({
                        ...personalFormData,
                        gender: selectedGender
                      });
                      setTouchedFields(prev => ({ ...prev, gender: true }));
                      setFieldErrors(prev => ({ ...prev, gender: validateGender(selectedGender) }));
                    }}
                    onBlur={() => {
                      setTouchedFields(prev => ({ ...prev, gender: true }));
                      setFieldErrors(prev => ({ ...prev, gender: validateGender(personalFormData.gender) }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all duration-300 bg-white hover:border-gray-300 ${fieldErrors.gender && touchedFields.gender
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
                    }`}
                    disabled={isLoadingGenders}
                  >
                    <option value="">{isLoadingGenders ? 'Loading genders...' : 'Select gender'}</option>
                    {genders.length > 0 ? (
                      genders.map((gender) => (
                        <option key={gender.id} value={gender.id}>
                          {gender.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="1">Male</option>
                        <option value="2">Female</option>
                      </>
                    )}
                  </select>
                  {touchedFields.gender && fieldErrors.gender && (
                    <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                      <XMarkIcon className="w-3 h-3" />
                      {fieldErrors.gender}
                    </p>
                  )}
                </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(240px,0.85fr),minmax(0,1.9fr)]">
                  <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#AC6C2A] ring-1 ring-orange-100">
                        <UserCircleIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Account snapshot</p>
                        <p className="mt-1 text-xl font-black leading-6 text-gray-900">{displayFullName}</p>
                        <p className="mt-1 break-all text-xs font-semibold text-gray-500">{userData.email || 'No email'}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-orange-50 px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#AC6C2A]">Role</p>
                        <p className="mt-1 text-sm font-black text-gray-900">{roleNameUpper}</p>
                      </div>
                      <div className={`rounded-xl px-3 py-2 ${userData.gender?.id ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-wide ${userData.gender?.id ? 'text-emerald-700' : 'text-red-600'}`}>Gender</p>
                        <p className={`mt-1 text-sm font-black ${userData.gender?.id ? 'text-gray-900' : 'text-red-700'}`}>{genderStateLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    {compactDetailGroups.map((group) => (
                      <div key={group.title} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#AC6C2A] ring-1 ring-orange-100">
                            {group.icon}
                          </div>
                          <h3 className="text-sm font-black text-gray-900">{group.title}</h3>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {group.items.map((item) => (
                            <div key={`${group.title}-${item.label}`} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 py-2 first:pt-0 last:pb-0">
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{item.label}</p>
                              <p className={`min-w-0 text-sm font-bold text-gray-800 ${item.valueClass || ''}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Only shown in edit mode */}
          {isEditingPersonal && (
            <div className="px-4 sm:px-6 lg:px-8 pb-5 sm:pb-6 lg:pb-8">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handlePersonalCancel}
                  disabled={isSavingPersonal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XMarkIcon className="w-5 h-5" />
                  Cancel
                </button>
                <button
                  onClick={handlePersonalSave}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59B0F] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#AC6C2A] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isUploadingImage || isSavingPersonal}
                >
                  {isSavingPersonal ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <CheckIcon className="w-5 h-5" />
                  )}
                  {isSavingPersonal ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ Address Management Section ============ */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-3 py-4 sm:px-4 sm:py-4 lg:px-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#AC6C2A] ring-1 ring-orange-200">
                <HomeIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">Address Book</h2>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                  <span>{addresses.length} saved</span>
                  <span className="text-gray-300">/</span>
                  <span>{permanentAddressCount} permanent</span>
                </div>
              </div>
            </div>
            {!showAddressForm && (
              <button
                onClick={handleAddAddress}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59B0F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#AC6C2A] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSavingAddress || isDeletingAddress}
              >
                <PlusIcon className="h-4 w-4" />
                Add Address
              </button>
            )}
          </div>
        </div>

        {/* Address Error/Success Messages */}
        {addressError && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:mx-6">
            <p className="text-sm font-semibold text-red-700">{addressError}</p>
          </div>
        )}
        {addressSuccess && (
          <div className="mx-4 mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 sm:mx-6">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-green-700">{addressSuccess}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 p-3 sm:p-5 lg:p-6">
          {/* Address Form */}
          {showAddressForm && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#AC6C2A]">
                    {editingAddressId ? 'Edit address' : 'New address'}
                  </p>
                  <h3 className="text-base font-black text-gray-900">
                    {editingAddressId ? 'Update saved location' : 'Save delivery location'}
                  </h3>
                </div>
                <label className="inline-flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-orange-100">
                  <input
                    type="checkbox"
                    checked={addressFormData.permanent}
                    onChange={(e) => handleAddressFieldChange('permanent', e.target.checked)}
                    className="peer sr-only"
                    disabled={isSavingAddress}
                  />
                  <span className="relative h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-[#F59B0F] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
                  <span className="text-xs font-bold text-gray-700">Permanent</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                {/* Address Line */}
                <div className="lg:col-span-4">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Address Line <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={addressFormData.address}
                    onChange={(e) => handleAddressFieldChange('address', e.target.value)}
                    onBlur={(e) => handleAddressFieldBlur('address', e.target.value)}
                    className={getAddressInputClassName('address')}
                    rows={2}
                    placeholder="Enter full address"
                    disabled={isSavingAddress}
                  />
                  {addressTouchedFields.address && addressFieldErrors.address && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{addressFieldErrors.address}</p>
                  )}
                </div>

                {/* Tag */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Tag <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressFormData.tag}
                    onChange={(e) => handleAddressFieldChange('tag', e.target.value)}
                    onBlur={(e) => handleAddressFieldBlur('tag', e.target.value)}
                    className={getAddressInputClassName('tag')}
                    placeholder="Home"
                    disabled={isSavingAddress}
                  />
                  {addressTouchedFields.tag && addressFieldErrors.tag && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{addressFieldErrors.tag}</p>
                  )}
                </div>

                {/* Location/Additional Info */}
                <div className="lg:order-5 lg:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Location Details
                  </label>
                  <input
                    type="text"
                    value={addressFormData.location}
                    onChange={(e) => handleAddressFieldChange('location', e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                    placeholder="Apartment, landmark, gate"
                    disabled={isSavingAddress}
                  />
                </div>

                {/* City */}
                <div className="lg:order-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addressFormData.cityId}
                    onChange={(e) => handleAddressFieldChange('cityId', parseInt(e.target.value) || 0)}
                    onBlur={() => handleAddressFieldBlur('cityId', addressFormData.cityId.toString())}
                    className={getAddressInputClassName('cityId')}
                    disabled={isLoadingCities || isSavingAddress}
                  >
                    <option value={0}>Select City</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name} - {city.district?.name || ''}
                      </option>
                    ))}
                  </select>
                  {addressTouchedFields.cityId && addressFieldErrors.cityId && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{addressFieldErrors.cityId}</p>
                  )}
                </div>

                {/* Primary Mobile */}
                <div className="lg:order-3">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Primary <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={addressFormData.primaryMobile}
                    onChange={(e) => handleAddressFieldChange('primaryMobile', e.target.value)}
                    onBlur={(e) => handleAddressFieldBlur('primaryMobile', e.target.value)}
                    className={getAddressInputClassName('primaryMobile')}
                    placeholder="0771234567"
                    disabled={isSavingAddress}
                  />
                  {addressTouchedFields.primaryMobile && addressFieldErrors.primaryMobile && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{addressFieldErrors.primaryMobile}</p>
                  )}
                </div>

                {/* Secondary Mobile */}
                <div className="lg:order-6 lg:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Secondary Mobile
                  </label>
                  <input
                    type="tel"
                    value={addressFormData.secondaryMobile}
                    onChange={(e) => handleAddressFieldChange('secondaryMobile', e.target.value)}
                    onBlur={(e) => handleAddressFieldBlur('secondaryMobile', e.target.value)}
                    className={getAddressInputClassName('secondaryMobile')}
                    placeholder="0781234567"
                    disabled={isSavingAddress}
                  />
                  {addressTouchedFields.secondaryMobile && addressFieldErrors.secondaryMobile && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{addressFieldErrors.secondaryMobile}</p>
                  )}
                </div>

                {/* WhatsApp */}
                <div className="lg:order-4">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={addressFormData.whatsapp}
                    onChange={(e) => handleAddressFieldChange('whatsapp', e.target.value)}
                    onBlur={(e) => handleAddressFieldBlur('whatsapp', e.target.value)}
                    className={getAddressInputClassName('whatsapp')}
                    placeholder="0771234567"
                    disabled={isSavingAddress}
                  />
                  {addressTouchedFields.whatsapp && addressFieldErrors.whatsapp && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{addressFieldErrors.whatsapp}</p>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handleCancelAddressForm}
                  disabled={isSavingAddress}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59B0F] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#AC6C2A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingAddress ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    editingAddressId ? 'Update Address' : 'Save Address'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Address List */}
          {isLoadingAddresses ? (
            <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#F59B0F]" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-gray-400 ring-1 ring-gray-200">
                  <HomeIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-800">No addresses saved</p>
                  <p className="text-xs font-semibold text-gray-500">Add a delivery address to speed up checkout.</p>
                </div>
              </div>
              {!showAddressForm && (
                <button
                  type="button"
                  onClick={handleAddAddress}
                  className="rounded-xl bg-[#F59B0F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#AC6C2A]"
                >
                  Add Address
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`grid gap-3 rounded-2xl border p-4 transition hover:border-orange-200 hover:bg-orange-50/30 lg:grid-cols-[190px_minmax(0,1fr)_230px_44px] lg:items-center ${address.permanent
                    ? 'border-orange-200 bg-orange-50/50'
                    : 'border-gray-200 bg-white'
                    }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${address.permanent ? 'bg-[#F59B0F] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {getAddressTagIcon(address.tag)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-gray-900">{address.tag}</p>
                        {address.permanent && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#AC6C2A] ring-1 ring-orange-200">
                            Permanent
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {address.cities.name} / {address.cities.district?.name || 'District'}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-gray-800">{address.address}</p>
                    {address.location && (
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        Location: {address.location}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-3 lg:grid-cols-1">
                    <p className="min-w-0 font-semibold text-gray-700">
                      <span className="text-gray-400">Primary:</span>{' '}
                      <span className="break-all">{address.primaryMobile}</span>
                    </p>
                    <p className="min-w-0 font-semibold text-gray-700">
                      <span className="text-gray-400">WhatsApp:</span>{' '}
                      <span className="break-all">{address.whatsapp}</span>
                    </p>
                    {address.secondaryMobile && (
                      <p className="min-w-0 font-semibold text-gray-700">
                        <span className="text-gray-400">Secondary:</span>{' '}
                        <span className="break-all">{address.secondaryMobile}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditAddress(address)}
                    disabled={isSavingAddress}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-[#F59B0F] hover:text-[#F59B0F] disabled:cursor-not-allowed disabled:opacity-50 lg:justify-self-end"
                    aria-label={`Edit ${address.tag} address`}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ Mobile Details Section ============ */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-3 py-4 sm:px-4 sm:py-4 lg:px-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#AC6C2A] ring-1 ring-orange-200">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">Mobile Details</h2>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                  <span>{userDataList.length} saved</span>
                </div>
              </div>
            </div>
            {!showUserDataForm && (
              <button
                onClick={handleAddUserData}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59B0F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#AC6C2A] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSavingUserData || isDeletingUserData}
              >
                <PlusIcon className="h-4 w-4" />
                Add Mobile Details
              </button>
            )}
          </div>
        </div>

        {/* UserData Error/Success Messages */}
        {userDataError && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:mx-6">
            <p className="text-sm font-semibold text-red-700">{userDataError}</p>
          </div>
        )}
        {userDataSuccess && (
          <div className="mx-4 mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 sm:mx-6">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-green-700">{userDataSuccess}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 p-3 sm:p-5 lg:p-6">
          {/* UserData Form */}
          {showUserDataForm && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#AC6C2A]">
                    {editingUserDataId ? 'Edit mobile details' : 'New mobile details'}
                  </p>
                  <h3 className="text-base font-black text-gray-900">
                    {editingUserDataId ? 'Update mobile information' : 'Add mobile information'}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {/* Primary Mobile */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Primary Mobile <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={userDataFormData.primaryMobile}
                      onChange={(e) => handleUserDataFieldChange('primaryMobile', e.target.value)}
                      onBlur={(e) => handleUserDataFieldBlur('primaryMobile', e.target.value)}
                      className={`flex-1 px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${userDataFieldErrors.primaryMobile && userDataTouchedFields.primaryMobile
                        ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
                      }`}
                      placeholder="0771234567"
                      disabled={isSavingUserData || mobileVerified}
                    />
                    {!mobileVerified && (
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={isSendingCode || !userDataFormData.primaryMobile}
                        className="px-4 py-3 bg-[#F59B0F] text-white rounded-lg font-bold text-sm hover:bg-[#AC6C2A] transition disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSendingCode ? 'Sending...' : codeSent ? 'Resend' : 'Verify'}
                      </button>
                    )}
                  </div>
                  {userDataTouchedFields.primaryMobile && userDataFieldErrors.primaryMobile && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{userDataFieldErrors.primaryMobile}</p>
                  )}
                  {mobileVerified && (
                    <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-green-600">
                      <CheckIcon className="h-3 w-3" />
                      Mobile verified
                    </div>
                  )}
                </div>


                {/* Secondary Mobile */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Secondary Mobile
                  </label>
                  <input
                    type="tel"
                    value={userDataFormData.secondaryMobile}
                    onChange={(e) => handleUserDataFieldChange('secondaryMobile', e.target.value)}
                    onBlur={(e) => handleUserDataFieldBlur('secondaryMobile', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${userDataFieldErrors.secondaryMobile && userDataTouchedFields.secondaryMobile
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
                    }`}
                    placeholder="0781234567"
                    disabled={isSavingUserData}
                  />
                  {userDataTouchedFields.secondaryMobile && userDataFieldErrors.secondaryMobile && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{userDataFieldErrors.secondaryMobile}</p>
                  )}
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={userDataFormData.whatsapp}
                    onChange={(e) => handleUserDataFieldChange('whatsapp', e.target.value)}
                    onBlur={(e) => handleUserDataFieldBlur('whatsapp', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${userDataFieldErrors.whatsapp && userDataTouchedFields.whatsapp
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
                    }`}
                    placeholder="0771234567"
                    disabled={isSavingUserData}
                  />
                  {userDataTouchedFields.whatsapp && userDataFieldErrors.whatsapp && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{userDataFieldErrors.whatsapp}</p>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={userDataFormData.postalCode}
                    onChange={(e) => handleUserDataFieldChange('postalCode', e.target.value)}
                    onBlur={(e) => handleUserDataFieldBlur('postalCode', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${userDataFieldErrors.postalCode && userDataTouchedFields.postalCode
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
                    }`}
                    placeholder="12345"
                    disabled={isSavingUserData}
                  />
                  {userDataTouchedFields.postalCode && userDataFieldErrors.postalCode && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{userDataFieldErrors.postalCode}</p>
                  )}
                </div>

                {/* Address */}
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={userDataFormData.address}
                    onChange={(e) => handleUserDataFieldChange('address', e.target.value)}
                    onBlur={(e) => handleUserDataFieldBlur('address', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${userDataFieldErrors.address && userDataTouchedFields.address
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
                    }`}
                    rows={2}
                    placeholder="Enter full address"
                    disabled={isSavingUserData}
                  />
                  {userDataTouchedFields.address && userDataFieldErrors.address && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{userDataFieldErrors.address}</p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userDataFormData.cityId}
                    onChange={(e) => handleUserDataFieldChange('cityId', parseInt(e.target.value) || 0)}
                    onBlur={() => handleUserDataFieldBlur('cityId', userDataFormData.cityId.toString())}
                    className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${userDataFieldErrors.cityId && userDataTouchedFields.cityId
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20'
                    }`}
                    disabled={isLoadingCities || isSavingUserData}
                  >
                    <option value={0}>Select City</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name} - {city.district?.name || ''}
                      </option>
                    ))}
                  </select>
                  {userDataTouchedFields.cityId && userDataFieldErrors.cityId && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{userDataFieldErrors.cityId}</p>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handleCancelUserDataForm}
                  disabled={isSavingUserData}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserData}
                  disabled={isSavingUserData}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59B0F] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#AC6C2A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingUserData ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    editingUserDataId ? 'Update Details' : 'Save Details'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* UserData List */}
          {isLoadingUserData ? (
            <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#F59B0F]" />
            </div>
          ) : userDataList.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-gray-400 ring-1 ring-gray-200">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-800">No mobile details saved</p>
                  <p className="text-xs font-semibold text-gray-500">Add your mobile details for better communication.</p>
                </div>
              </div>
              {!showUserDataForm && (
                <button
                  type="button"
                  onClick={handleAddUserData}
                  className="rounded-xl bg-[#F59B0F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#AC6C2A]"
                >
                  Add Mobile Details
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {userDataList.map((userDataItem) => (
                <div
                  key={userDataItem.id}
                  className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-orange-200 hover:bg-orange-50/30 lg:grid-cols-[200px_minmax(0,1fr)_44px] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-gray-900">Mobile Details</p>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {userDataItem.cities.name} / {userDataItem.cities.district?.name || 'District'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 lg:grid-cols-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 font-semibold text-gray-700">
                          <span className="text-gray-400">Primary:</span>{' '}
                          <span className="break-all">{userDataItem.primaryMobile}</span>
                        </p>
                        {userDataItem.isPnoVerified && (
                          <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5">
                            <ShieldCheckIcon className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-semibold text-green-700">Verified</span>
                          </div>
                        )}
                      </div>
                      {userDataItem.secondaryMobile && (
                        <p className="min-w-0 font-semibold text-gray-700">
                          <span className="text-gray-400">Secondary:</span>{' '}
                          <span className="break-all">{userDataItem.secondaryMobile}</span>
                        </p>
                      )}
                      <p className="min-w-0 font-semibold text-gray-700">
                        <span className="text-gray-400">WhatsApp:</span>{' '}
                        <span className="break-all">{userDataItem.whatsapp}</span>
                      </p>
                      {userDataItem.postalCode && (
                        <p className="min-w-0 font-semibold text-gray-700">
                          <span className="text-gray-400">Postal Code:</span>{' '}
                          <span className="break-all">{userDataItem.postalCode}</span>
                        </p>
                      )}
                    </div>
                    {userDataItem.address && (
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        Address: {userDataItem.address}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 lg:justify-self-end">
                    <button
                      type="button"
                      onClick={() => handleEditUserData(userDataItem)}
                      disabled={isSavingUserData}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-[#F59B0F] hover:text-[#F59B0F] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Edit mobile details"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUserData(userDataItem.id)}
                      disabled={isDeletingUserData}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Delete mobile details"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ Email Verification Section ============ */}
      {!userData.emailVerified && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-6 overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Email Verification Required</h3>
              <p className="text-sm text-blue-800 mb-4">
                Your email address has not been verified yet. Verify it to unlock full access to your account features.
              </p>
              <p className="text-xs text-blue-700 mb-4">
                Verification email will be sent to: <span className="font-semibold">{userData.email}</span>
              </p>

              {emailVerificationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-semibold">{emailVerificationError}</p>
                </div>
              )}

              {emailVerificationSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-600 font-semibold">{emailVerificationSuccess}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleSendVerificationEmail}
                disabled={isVerifyingEmail || isUploadingImage}
                className="px-6 py-2 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300"
              >
                {isVerifyingEmail ? 'Sending...' : 'Send Verification Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Verification Modal */}
      {showVerificationModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Verify Mobile Number</h3>
              <button
                type="button"
                onClick={handleCloseVerificationModal}
                className="text-gray-400 transition hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-sm text-gray-600">
                Enter the 4-digit verification code sent to <span className="font-semibold">{userDataFormData.primaryMobile}</span>
              </p>
              <p className="text-xs text-gray-500">Valid for 5 minutes.</p>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Verification Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none transition-all duration-300 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                placeholder="0000"
                maxLength={4}
                disabled={isVerifyingCode}
                autoFocus
              />
              {verificationError && (
                <p className="mt-2 text-xs font-semibold text-red-600">{verificationError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={isVerifyingCode || verificationCode.length !== 4}
                className="flex-1 rounded-lg bg-[#F59B0F] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#AC6C2A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isVerifyingCode ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isSendingCode}
                className="rounded-lg border-2 border-[#F59B0F] px-4 py-3 text-sm font-bold text-[#F59B0F] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingCode ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ProfilePanel;
