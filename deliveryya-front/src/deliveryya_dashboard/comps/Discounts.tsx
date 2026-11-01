import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, PlusIcon, TagIcon, TrashIcon, UserGroupIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import type { StylesConfig } from 'react-select';
import Swal from 'sweetalert2';
import axiosInstance from '../../util/AxiosUtil';

interface ApiUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

type UserOption = {
  value: number;
  label: string;
};

interface ApiCity {
  id: number;
  name: string;
  district: {
    id: number;
    name: string;
  };
}

interface ApiDiscount {
  id: number;
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  city: ApiCity;
  discount: number;
}

interface DistrictOption {
  value: number;
  label: string;
}

interface CityOption {
  id: number;
  name: string;
  districtId: number;
}

interface DistrictDiscountRow {
  districtId: number;
  districtName: string;
  discounts: ApiDiscount[];
}

interface PaginatedDiscountsResponse {
  items: ApiDiscount[];
  totalCount: number;
  totalPages: number;
  pageNumber: number;
  countPerPage: number;
}

interface UserDiscountCard {
  userId: number;
  userName: string;
  userEmail: string;
  discounts: ApiDiscount[];
  districtRows: DistrictDiscountRow[];
}

const customSelectStyles: StylesConfig<UserOption | DistrictOption, false> = {
  control: (base, state) => ({
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
  option: (base, state) => ({
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
  placeholder: (base) => ({
    ...base,
    color: '#9CA3AF',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(245, 155, 15, 0.2)',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

function Discounts() {
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [userDiscounts, setUserDiscounts] = useState<ApiDiscount[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewCitiesModalOpen, setIsViewCitiesModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictOption | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCities, setSelectedCities] = useState<number[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [selectAllCities, setSelectAllCities] = useState(false);
  const [viewingDistrict, setViewingDistrict] = useState<DistrictDiscountRow | null>(null);
  const [updatingDiscount, setUpdatingDiscount] = useState<{ cityIds: number[]; userId: number } | null>(null);
  const [newDiscountAmount, setNewDiscountAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    pageNumber: 0,
    countPerPage: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isNavigatingToUser, setIsNavigatingToUser] = useState(
    Boolean(location.state?.userId && location.state?.userName)
  );
  const [viewMode, setViewMode] = useState<'all' | 'user'>('all');
  const requestVersion = useRef(0);

  const districtRows = useMemo<DistrictDiscountRow[]>(() => {
    const rows = new Map<number, DistrictDiscountRow>();

    console.log('Building districtRows from userDiscounts:', userDiscounts);
    userDiscounts.forEach((discount) => {
      const district = discount.city.district;
      const existing = rows.get(district.id);
      if (existing) {
        existing.discounts.push(discount);
      } else {
        rows.set(district.id, {
          districtId: district.id,
          districtName: district.name,
          discounts: [discount],
        });
      }
    });

    const result = Array.from(rows.values());
    console.log('Built districtRows:', result);
    return result;
  }, [userDiscounts]);

  const userDiscountCards = useMemo<UserDiscountCard[]>(() => {
    const userMap = new Map<number, UserDiscountCard>();

    userDiscounts.forEach((discount) => {
      const userId = discount.user.id;
      const existing = userMap.get(userId);
      if (existing) {
        existing.discounts.push(discount);
      } else {
        userMap.set(userId, {
          userId,
          userName: `${discount.user.firstName || ''} ${discount.user.lastName || ''}`.trim(),
          userEmail: discount.user.email || '',
          discounts: [discount],
          districtRows: [],
        });
      }
    });

    // Group discounts by district for each user
    userMap.forEach((card) => {
      const districtMap = new Map<number, DistrictDiscountRow>();
      card.discounts.forEach((discount) => {
        const district = discount.city.district;
        const existing = districtMap.get(district.id);
        if (existing) {
          existing.discounts.push(discount);
        } else {
          districtMap.set(district.id, {
            districtId: district.id,
            districtName: district.name,
            discounts: [discount],
          });
        }
      });
      card.districtRows = Array.from(districtMap.values());
    });

    return Array.from(userMap.values());
  }, [userDiscounts]);

  // Auto-load users with discounts on page load (only when no user is selected)
  useEffect(() => {
    console.log('fetchAllDiscounts effect triggered, selectedUser:', selectedUser, 'isNavigatingToUser:', isNavigatingToUser);
    if (!selectedUser && !isNavigatingToUser) {
      fetchAllDiscounts();
    }
  }, [pagination.pageNumber, itemsPerPage]);

  // Handle navigation from User Management table
  useEffect(() => {
    if (location.state?.userId && location.state?.userName) {
      const { userId, userName } = location.state;
      console.log('Navigation state detected, setting user:', userId, userName);
      setIsNavigatingToUser(true); // Prevent fetchAllDiscounts from running
      setViewMode('user'); // Explicitly set to user mode
      setUserDiscounts([]); // Clear previous data first
      setSelectedUser({ value: Number(userId), label: userName });
      console.log('selectedUser set to:', { value: Number(userId), label: userName });
      fetchUserDiscounts(Number(userId)).finally(() => {
        setIsNavigatingToUser(false); // Re-enable fetchAllDiscounts after navigation completes
      });
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchAllDiscounts = async () => {
    const requestVersionForFetch = ++requestVersion.current;
    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/discounts/get-users-with-discounts', {
        pageNumber: pagination.pageNumber,
        countPerPage: itemsPerPage,
      });
      const data = response.data?.object as PaginatedDiscountsResponse;
      if (requestVersionForFetch === requestVersion.current && data) {
        setUserDiscounts(data.items || []);
        setPagination(prev => ({
          ...prev,
          countPerPage: itemsPerPage,
          totalCount: data.totalCount,
          totalPages: data.totalPages,
        }));
      }
    } catch (error) {
      if (requestVersionForFetch === requestVersion.current) {
        console.error('Error fetching all discounts:', error);
        Swal.fire('Error', 'Failed to fetch discounts', 'error');
      }
    } finally {
      if (requestVersionForFetch === requestVersion.current) {
        setIsLoading(false);
      }
    }
  };

  const loadUsers = async (inputValue: string) => {
    if (inputValue.length < 2) return [];
    try {
      const response = await axiosInstance.post('/users/get-users', {
        pageNumber: 0,
        countPerPage: 20,
        search: inputValue,
      });
      const users = response.data?.object?.items || [];
      return users.map((user: ApiUser): UserOption => ({
        value: user.id,
        label: `${user.firstName || ''} ${user.lastName || ''} (${user.email || ''})`.trim(),
      }));
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  };

  const fetchUserDiscounts = async (userId: number) => {
    const requestVersionForFetch = ++requestVersion.current;
    setIsLoading(true);
    try {
      console.log('Fetching discounts for userId:', userId);
      const response = await axiosInstance.post('/discounts/get-by-user', { userId });
      const discounts = response.data?.object || [];
      if (requestVersionForFetch !== requestVersion.current) {
        return;
      }

      console.log('Received discounts for user:', discounts);
      setUserDiscounts(discounts);
      if (discounts.length === 0) {
        Swal.fire('No Discounts', 'This user does not have any discounts configured.', 'info');
      }
    } catch (error) {
      if (requestVersionForFetch === requestVersion.current) {
        console.error('Error fetching discounts:', error);
        setUserDiscounts([]);
        Swal.fire('Error', 'Failed to fetch discounts', 'error');
      }
    } finally {
      if (requestVersionForFetch === requestVersion.current) {
        setIsLoading(false);
      }
    }
  };

  const handleUserSelect = (user: UserOption | null) => {
    setSelectedUser(user);
    setUserDiscounts([]); // Always clear discounts when user selection changes
    if (user) {
      setViewMode('user');
      fetchUserDiscounts(user.value);
    } else {
      setViewMode('all');
      fetchAllDiscounts();
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, pageNumber: newPage }));
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setPagination(prev => ({ ...prev, pageNumber: 0 }));
  };

  const fetchDistricts = async () => {
    try {
      const response = await axiosInstance.get('/users/get-districts');
      const districts = response.data?.object || [];
      return districts.map((district: { id: number; name: string }): DistrictOption => ({
        value: district.id,
        label: district.name,
      }));
    } catch (error) {
      console.error('Error fetching districts:', error);
      return [];
    }
  };

  const fetchCitiesByDistrict = async (districtId: number): Promise<CityOption[]> => {
    try {
      const response = await axiosInstance.post('/users/get-cities', {
        pageNumber: 0,
        countPerPage: 100,
        districtId,
      });
      const cities = response.data?.object?.items || [];
      const cityOptions = cities.map((city: ApiCity): CityOption => ({
          id: city.id,
          name: city.name,
          districtId: city.district?.id || districtId,
        }));
      setCities(cityOptions);
      return cityOptions;
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
      return [];
    }
  };

  const handleDistrictSelect = async (district: DistrictOption | null) => {
    setSelectedDistrict(district);
    setSelectedCities([]);
    setSelectAllCities(false);
    if (district) {
      await fetchCitiesByDistrict(district.value);
    } else {
      setCities([]);
    }
  };

  const handleCityToggle = (cityId: number) => {
    setSelectedCities((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  };

  const handleSelectAllCities = () => {
    if (selectAllCities) {
      setSelectedCities([]);
    } else {
      setSelectedCities(cities.map((city) => city.id));
    }
    setSelectAllCities(!selectAllCities);
  };

  const handleAddDiscount = async () => {
    if (!selectedUser || selectedCities.length === 0 || discountAmount <= 0) {
      Swal.fire('Validation Error', 'Please fill all required fields', 'warning');
      return;
    }

    try {
      const response = await axiosInstance.post('/discounts/create', {
        userId: selectedUser.value,
        cityIds: selectedCities,
        discount: discountAmount,
      });

      if (response.data?.status === 200 || response.data?.status === 207) {
        Swal.fire('Success', response.data?.desc || 'Discount added successfully', 'success');
        setIsAddModalOpen(false);
        setSelectedDistrict(null);
        setCities([]);
        setSelectedCities([]);
        setDiscountAmount(0);
        setSelectAllCities(false);
        fetchUserDiscounts(selectedUser.value);
      } else {
        Swal.fire('Error', response.data?.desc || 'Failed to add discount', 'error');
      }
    } catch (error: unknown) {
      console.error('Error adding discount:', error);
      const details = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { desc?: string } } }).response?.data?.desc
        : undefined;
      Swal.fire('Error', details || 'Failed to add discount', 'error');
    }
  };

  const handleDeleteDiscount = async (row: DistrictDiscountRow) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete the discount for all ${row.discounts.length} selected ${row.discounts.length === 1 ? 'city' : 'cities'} in ${row.districtName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F59B0F',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed && selectedUser) {
      try {
        const responses = await Promise.all(row.discounts.map((discount) =>
          axiosInstance.post('/discounts/delete', {
            userId: selectedUser.value,
            cityId: discount.city.id,
          })
        ));

        if (responses.every((response) => response.data?.status === 200)) {
          Swal.fire('Deleted!', 'Discount has been deleted.', 'success');
          fetchUserDiscounts(selectedUser.value);
        } else {
          const failedResponse = responses.find((response) => response.data?.status !== 200);
          Swal.fire('Error', failedResponse?.data?.desc || 'Failed to delete discount', 'error');
        }
      } catch (error: unknown) {
        console.error('Error deleting discount:', error);
        const details = error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { desc?: string } } }).response?.data?.desc
          : undefined;
        Swal.fire('Error', details || 'Failed to delete discount', 'error');
      }
    }
  };

  const handleDeleteDiscountForUser = async (userId: number, row: DistrictDiscountRow) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete the discount for all ${row.discounts.length} selected ${row.discounts.length === 1 ? 'city' : 'cities'} in ${row.districtName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F59B0F',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        const responses = await Promise.all(row.discounts.map((discount) =>
          axiosInstance.post('/discounts/delete', {
            userId: userId,
            cityId: discount.city.id,
          })
        ));

        if (responses.every((response) => response.data?.status === 200)) {
          Swal.fire('Deleted!', 'Discount has been deleted.', 'success');
          fetchAllDiscounts();
        } else {
          const failedResponse = responses.find((response) => response.data?.status !== 200);
          Swal.fire('Error', failedResponse?.data?.desc || 'Failed to delete discount', 'error');
        }
      } catch (error: unknown) {
        console.error('Error deleting discount:', error);
        const details = error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { desc?: string } } }).response?.data?.desc
          : undefined;
        Swal.fire('Error', details || 'Failed to delete discount', 'error');
      }
    }
  };

  const handleViewCities = (row: DistrictDiscountRow) => {
    setViewingDistrict(row);
    setIsViewCitiesModalOpen(true);
  };

  const handleUpdateDiscount = async (row: DistrictDiscountRow) => {
    setUpdatingDiscount({
      cityIds: row.discounts.map((discount) => discount.city.id),
      userId: row.discounts[0].user.id,
    });
    const district = row.discounts[0].city.district;
    setSelectedDistrict({ value: district.id, label: district.name });
    const cityOptions = await fetchCitiesByDistrict(district.id);
    const selectedCityIds = row.discounts.map((discount) => discount.city.id);
    setSelectedCities(selectedCityIds);
    setSelectAllCities(cityOptions.length > 0 && cityOptions.every((city) => selectedCityIds.includes(city.id)));
    setNewDiscountAmount(row.discounts[0].discount);
    setIsUpdateModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!updatingDiscount || selectedCities.length === 0 || newDiscountAmount <= 0) {
      Swal.fire('Validation Error', 'Select at least one city and enter a valid discount amount', 'warning');
      return;
    }

    try {
      const currentCityIds = new Set(updatingDiscount.cityIds);
      const selectedCityIds = new Set(selectedCities);
      const removedCityIds = updatingDiscount.cityIds.filter((cityId) => !selectedCityIds.has(cityId));
      const addedCityIds = selectedCities.filter((cityId) => !currentCityIds.has(cityId));
      const retainedCityIds = selectedCities.filter((cityId) => currentCityIds.has(cityId));

      const responses = await Promise.all([
        ...removedCityIds.map((cityId) =>
          axiosInstance.post('/discounts/delete', {
            userId: updatingDiscount.userId,
            cityId,
          })
        ),
        ...retainedCityIds.map((cityId) =>
          axiosInstance.post('/discounts/update', {
            userId: updatingDiscount.userId,
            cityId,
            discount: newDiscountAmount,
          })
        ),
        ...(addedCityIds.length > 0 && selectedDistrict
          ? [axiosInstance.post('/discounts/create', {
            userId: updatingDiscount.userId,
            cityIds: addedCityIds,
            discount: newDiscountAmount,
          })]
          : []),
      ]);

      const failedResponse = responses.find((response) => response.data?.status !== 200 && response.data?.status !== 207);
      if (!failedResponse) {
        Swal.fire('Success', 'Discount updated successfully', 'success');
        setIsUpdateModalOpen(false);
        setUpdatingDiscount(null);
        setNewDiscountAmount(0);
        setSelectedDistrict(null);
        setCities([]);
        setSelectedCities([]);
        setSelectAllCities(false);

        if (selectedUser) {
          fetchUserDiscounts(selectedUser.value);
        }
      } else {
        Swal.fire('Error', failedResponse.data?.desc || 'Failed to update discount', 'error');
      }
    } catch (error: unknown) {
      console.error('Error updating discount:', error);
      const details = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { desc?: string } } }).response?.data?.desc
        : undefined;
      Swal.fire('Error', details || 'Failed to update discount', 'error');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const totalDiscountedCities = userDiscountCards.reduce(
    (total, userCard) => total + userCard.discounts.length,
    0,
  );
  const totalDiscountedDistricts = userDiscountCards.reduce(
    (total, userCard) => total + userCard.districtRows.length,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mb-6">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#AC6C2A] bg-clip-text text-transparent">
            Discounts Management
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Search for users and manage their discounts by district and city.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Users with discounts</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{userDiscountCards.length}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Discounted cities</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{totalDiscountedCities}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <MapPinIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Discounted districts</p>
                <p className="text-3xl font-black text-red-700 mt-1">{totalDiscountedDistricts}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <TagIcon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* User Search */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide block">
                Search user
              </label>
              <AsyncSelect
                loadOptions={loadUsers}
                onChange={handleUserSelect}
                value={selectedUser}
                placeholder="Search by name or email..."
                styles={customSelectStyles}
                isClearable
                menuPortalTarget={document.body}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
            {selectedUser && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59B0F] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#D17F0A]"
              >
                <PlusIcon className="w-5 h-5" />
                Add discount
              </button>
            )}
          </div>
        </div>

        {/* All Discounts Cards (when no user selected) */}
        {viewMode === 'all' && (
          <>
            {console.log('Rendering all-users view, selectedUser:', selectedUser, 'userDiscounts:', userDiscounts, 'viewMode:', viewMode)}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 md:px-6">
                <div>
                  <h2 className="text-lg font-black text-gray-900">All users with discounts</h2>
                  <p className="text-sm text-gray-500 mt-1">Review and manage active city discounts.</p>
                </div>
                <TagIcon className="w-6 h-6 text-[#F59B0F]" />
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F59B0F]"></div>
                  </div>
                ) : userDiscountCards.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <TagIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No discounts found</p>
                    <p className="text-sm">Search for a user to view their discounts</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {userDiscountCards.map((userCard) => (
                      <div key={userCard.userId} className="rounded-2xl border border-gray-100 overflow-hidden">
                        {/* User Header */}
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[#D17F0A]">
                              <UserIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-900">{userCard.userName}</h3>
                              <p className="text-sm text-gray-500">{userCard.userEmail}</p>
                            </div>
                          </div>
                        </div>

                        {/* Discounts Table for this user */}
                        <div className="p-4">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                <th className="text-left py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wider">District</th>
                                <th className="text-left py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wider">Cities</th>
                                <th className="text-left py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wider">Discount</th>
                                <th className="text-right py-3 px-3 text-gray-700 font-bold text-xs uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userCard.districtRows.map((row) => (
                                <tr key={row.districtId} className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                                  <td className="py-3 px-3 text-gray-700 font-medium text-sm">
                                    {row.districtName}
                                  </td>
                                  <td className="py-3 px-3 text-gray-700 font-medium text-sm">
                                    {row.discounts.length} {row.discounts.length === 1 ? 'city' : 'cities'}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold text-xs">
                                      {formatCurrency(row.discounts[0].discount)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <div className="flex justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setUpdatingDiscount({
                                            cityIds: row.discounts.map((discount) => discount.city.id),
                                            userId: row.discounts[0].user.id,
                                          });
                                          const district = row.discounts[0].city.district;
                                          setSelectedDistrict({ value: district.id, label: district.name });
                                          fetchCitiesByDistrict(district.id).then((cityOptions) => {
                                            const selectedCityIds = row.discounts.map((discount) => discount.city.id);
                                            setSelectedCities(selectedCityIds);
                                            setSelectAllCities(cityOptions.length > 0 && cityOptions.every((city) => selectedCityIds.includes(city.id)));
                                            setNewDiscountAmount(row.discounts[0].discount);
                                            setIsUpdateModalOpen(true);
                                          });
                                        }}
                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-all duration-300"
                                        title="Update discount"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleDeleteDiscountForUser(row.discounts[0].user.id, row);
                                        }}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all duration-300"
                                        title="Delete discount"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {pagination.totalPages > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        Showing {pagination.pageNumber * itemsPerPage + 1} to{' '}
                        {Math.min((pagination.pageNumber + 1) * itemsPerPage, pagination.totalCount)} of{' '}
                        {pagination.totalCount} results
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Per page:</label>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                          className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm bg-white focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.pageNumber - 1)}
                        disabled={pagination.pageNumber === 0}
                        className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      <span className="px-4 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-gray-900">
                        {pagination.pageNumber + 1} / {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.pageNumber + 1)}
                        disabled={pagination.pageNumber >= pagination.totalPages - 1}
                        className="p-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* User Card with Discounts Table */}
        {viewMode === 'user' && selectedUser && (
          <>
            {console.log('Rendering selected-user view, selectedUser:', selectedUser, 'userDiscounts:', userDiscounts, 'viewMode:', viewMode)}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* User Info Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 px-4 py-4 md:px-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-[#D17F0A]">
                  <UserIcon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected user</p>
                  <h2 className="text-lg font-black text-gray-900">{selectedUser.label}</h2>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-[#F59B0F] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#D17F0A] transition-all"
              >
                <PlusIcon className="w-5 h-5" />
                Add Discount
              </button>
            </div>

            {/* Discounts Table */}
            <div className="p-4 md:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F59B0F]"></div>
                </div>
              ) : userDiscounts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <TagIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No discounts found for this user</p>
                  <p className="text-sm">Click "Add Discount" to create one</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider">District</th>
                        <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider">City</th>
                        <th className="text-left py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider">Discount</th>
                        <th className="text-right py-4 px-4 text-gray-700 font-bold text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {districtRows.map((row) => (
                        <tr key={row.districtId} className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleViewCities(row)}
                              className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-orange-200 transition-colors"
                            >
                              {row.districtName}
                            </button>
                          </td>
                          <td className="py-4 px-4 text-gray-700 font-medium">
                            {row.discounts.length} {row.discounts.length === 1 ? 'city' : 'cities'}
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold text-sm">
                              {formatCurrency(row.discounts[0].discount)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpdateDiscount(row)}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all duration-300"
                                title="Update discount"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteDiscount(row)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-300"
                                title="Delete discount"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Add Discount Modal */}
      <Transition appear show={isAddModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsAddModalOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
                  <DialogTitle as="h3" className="text-2xl font-bold text-gray-900 mb-6">
                    Add Discount
                  </DialogTitle>

                  <div className="space-y-6">
                    {/* District Selection */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Select District</label>
                      <AsyncSelect
                        loadOptions={fetchDistricts}
                        onChange={handleDistrictSelect}
                        value={selectedDistrict}
                        placeholder="Select a district..."
                        styles={customSelectStyles}
                        isClearable
                        menuPortalTarget={document.body}
                      />
                    </div>

                    {/* Cities Selection */}
                    {cities.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-bold text-gray-700">Select Cities</label>
                          <button
                            onClick={handleSelectAllCities}
                            className="text-sm font-semibold text-[#F59B0F] hover:text-[#AC6C2A] transition-colors"
                          >
                            {selectAllCities ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                          {cities.map((city) => (
                            <label
                              key={city.id}
                              className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCities.includes(city.id)}
                                onChange={() => handleCityToggle(city.id)}
                                className="w-4 h-4 text-[#F59B0F] rounded border-gray-300 focus:ring-[#F59B0F]"
                              />
                              <span className="text-gray-700 font-medium">{city.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Discount Amount */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Discount Amount (LKR)</label>
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all"
                        placeholder="Enter discount amount"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddDiscount}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-bold hover:shadow-lg transition-all duration-300"
                    >
                      Add Discount
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* View Cities Modal */}
      <Transition appear show={isViewCitiesModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsViewCitiesModalOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <DialogTitle as="h3" className="text-xl font-bold text-gray-900">
                      {viewingDistrict ? 'Cities in District' : 'Discount Details'}
                    </DialogTitle>
                    <button
                      onClick={() => setIsViewCitiesModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {viewingDistrict ? (
                    <div className="space-y-4">
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                        <p className="text-sm font-semibold text-orange-600 mb-1">District</p>
                        <p className="text-lg font-bold text-gray-900">{viewingDistrict.districtName}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-600">Cities with Discounts:</p>
                        {viewingDistrict.discounts.map((discount) => (
                          <div key={discount.city.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{discount.city.name}</p>
                              <p className="text-sm text-gray-600">{formatCurrency(discount.discount)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setIsViewCitiesModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-bold hover:shadow-lg transition-all duration-300"
                    >
                      Close
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Update Discount Modal */}
      <Transition appear show={isUpdateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsUpdateModalOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
                  <DialogTitle as="h3" className="text-2xl font-bold text-gray-900 mb-6">
                    Update Discount
                  </DialogTitle>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Select District</label>
                      <AsyncSelect
                        loadOptions={fetchDistricts}
                        onChange={async (district) => {
                          await handleDistrictSelect(district);
                        }}
                        value={selectedDistrict}
                        placeholder="Select a district..."
                        styles={customSelectStyles}
                        isClearable
                        menuPortalTarget={document.body}
                      />
                    </div>

                    {selectedDistrict && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-bold text-gray-700">Select Cities</label>
                          <button
                            type="button"
                            onClick={handleSelectAllCities}
                            className="text-sm font-semibold text-[#F59B0F] hover:text-[#AC6C2A] transition-colors"
                          >
                            {selectAllCities ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                          {cities.length > 0 ? cities.map((city) => (
                            <label
                              key={city.id}
                              className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCities.includes(city.id)}
                                onChange={() => handleCityToggle(city.id)}
                                className="w-4 h-4 text-[#F59B0F] rounded border-gray-300 focus:ring-[#F59B0F]"
                              />
                              <span className="text-gray-700 font-medium">{city.name}</span>
                            </label>
                          )) : (
                            <p className="text-sm text-gray-500">No cities found for this district.</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">New Discount Amount (LKR)</label>
                      <input
                        type="number"
                        value={newDiscountAmount}
                        onChange={(e) => setNewDiscountAmount(Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all"
                        placeholder="Enter new discount amount"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      onClick={() => setIsUpdateModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateSubmit}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-bold hover:shadow-lg transition-all duration-300"
                    >
                      Update
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default Discounts;
