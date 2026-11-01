import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import axiosInstance from '../../../util/AxiosUtil';
import type {
  EmployeeFormData,
  UserRole,
  Branch,
  VerificationStatus,
  SetEmployeeRequestDto,
} from './types';

interface EmployeeRegistrationFormProps {
  userId: number;
  firstName: string;
  lastName: string;
  onSuccess: () => void;
  isLoading: boolean;
}

export const EmployeeRegistrationForm = ({
  userId,
  firstName,
  lastName,
  onSuccess,
  isLoading,
}: EmployeeRegistrationFormProps) => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [verificationStatuses, setVerificationStatuses] = useState<VerificationStatus[]>([]);

  const [formData, setFormData] = useState<EmployeeFormData>({
    userId,
    firstName,
    lastName,
    mobile: '',
    whatsapp: '',
    verificationStatusId: 0,
    userRoleId: 0,
    branchId: 0,
    liveLocation: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizeRoleList = (payload: any): UserRole[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.object?.items)) return payload.object.items;
    if (Array.isArray(payload?.object)) return payload.object;
    if (Array.isArray(payload?.data?.object?.items)) return payload.data.object.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const normalizeBranchList = (payload: any): Branch[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.object?.items)) return payload.object.items;
    if (Array.isArray(payload?.object)) return payload.object;
    if (Array.isArray(payload?.data?.object?.items)) return payload.data.object.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const normalizeVerificationStatusList = (payload: any): VerificationStatus[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.object?.items)) return payload.object.items;
    if (Array.isArray(payload?.object)) return payload.object;
    if (Array.isArray(payload?.data?.object?.items)) return payload.data.object.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, branchesRes, verificationStatusesRes] = await Promise.all([
          axiosInstance.get('/users/get-user-roles'),
          axiosInstance.post('/branches/get-branches', {
            pageNumber: 0,
            countPerPage: 10,
          }),
          axiosInstance.get('/users/get-verification-statuses'),
        ]);

        const roles = normalizeRoleList(rolesRes.data);
        const branchList = normalizeBranchList(branchesRes.data);
        const verificationStatusList = normalizeVerificationStatusList(verificationStatusesRes.data);

        setUserRoles(roles);
        setBranches(branchList);
        setVerificationStatuses(verificationStatusList);
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load user roles, branches, or verification statuses',
        });
      }
    };

    fetchData();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const sriLankaPhoneRegex = /^\+94\d{9}$/;

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!sriLankaPhoneRegex.test(formData.mobile.trim())) {
      newErrors.mobile = 'Enter a valid Sri Lankan number (e.g. +94712345678)';
    }

    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp number is required';
    } else if (!sriLankaPhoneRegex.test(formData.whatsapp.trim())) {
      newErrors.whatsapp = 'Enter a valid Sri Lankan number (e.g. +94712345678)';
    }

    if (!formData.verificationStatusId)
      newErrors.verificationStatusId = 'Verification status is required';
    if (!formData.userRoleId) newErrors.userRoleId = 'User role is required';
    if (!formData.branchId) newErrors.branchId = 'Branch is required';
    if (!formData.liveLocation.trim())
      newErrors.liveLocation = 'Live location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => {
      if (name === 'mobile' || name === 'whatsapp' || name === 'liveLocation') {
        return { ...prev, [name]: value };
      }

      const parsedValue = value ? parseInt(value, 10) : 0;
      return { ...prev, [name]: parsedValue };
    });

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const fullName = `${firstName} ${lastName}`;

      const selectedRole = userRoles.find(role => role.id === formData.userRoleId);
      const selectedBranch = branches.find(branch => branch.id === formData.branchId);
      const selectedVerificationStatus = verificationStatuses.find(
        status => status.id === formData.verificationStatusId,
      );

      const employeeData: SetEmployeeRequestDto = {
        id: formData.userId,
        location: formData.liveLocation,
        liveLocation: formData.liveLocation,
        mobile: formData.mobile.trim(),
        whatsapp: formData.whatsapp.trim(),
        userRoles: {
          id: formData.userRoleId,
          name: selectedRole?.name,
        },
        verificationStatus: {
          id: formData.verificationStatusId,
          name: selectedVerificationStatus?.name,
        },
        branches: {
          id: formData.branchId,
          name: selectedBranch?.name,
        },
        users: {
          id: formData.userId,
          name: fullName,
        },
      };

      await axiosInstance.post('/employees/set-employee', employeeData);

      await Swal.fire({
        icon: 'success',
        title: 'Employee Registration Successful',
        text: `${fullName} has been registered as an employee.`,
      });

      onSuccess();
    } catch (error: any) {

      if (error.response?.status === 409 && error.response?.data.message == "Error") {

        Swal.fire({
          icon: 'warning',
          title: 'An Error Occuered',
          text: error.response?.data.desc,
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: error.response?.data?.message || 'Failed to register employee',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#F59B0F] text-white flex items-center justify-center font-bold flex-shrink-0">
          {firstName[0]}{lastName[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Employee Registration</h2>
          <p className="text-sm text-gray-500">
            Registering: <span className="font-semibold text-[#F59B0F]">{firstName} {lastName}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="+94712345678"
              disabled={isSubmitting || isLoading}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${errors.mobile ? 'border-red-400' : 'border-gray-200'
                }`}
            />
            {errors.mobile && (
              <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number *
            </label>
            <input
              type="tel"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="+94712345678"
              disabled={isSubmitting || isLoading}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${errors.whatsapp ? 'border-red-400' : 'border-gray-200'
                }`}
            />
            {errors.whatsapp && (
              <p className="text-red-500 text-sm mt-1">{errors.whatsapp}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Role *
            </label>
            <Select
              options={userRoles.map(r => ({ value: r.id, label: r.name }))}
              value={formData.userRoleId ? { value: formData.userRoleId, label: userRoles.find(r => r.id === formData.userRoleId)?.name ?? '' } : null}
              onChange={selected => {
                setFormData(prev => ({ ...prev, userRoleId: selected?.value ?? 0 }));
                if (errors.userRoleId) setErrors(prev => { const e = { ...prev }; delete e.userRoleId; return e; });
              }}
              styles={customSelectFieldStyles}
              placeholder="Select a role..."
              isDisabled={isSubmitting || isLoading}
              className={errors.userRoleId ? 'ring-1 ring-red-300 rounded-xl' : ''}
              classNamePrefix="react-select"
            />
            {errors.userRoleId && (
              <p className="text-red-500 text-sm mt-1">{errors.userRoleId}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch *
            </label>
            <Select
              options={branches.map(b => ({ value: b.id, label: b.name }))}
              value={formData.branchId ? { value: formData.branchId, label: branches.find(b => b.id === formData.branchId)?.name ?? '' } : null}
              onChange={selected => {
                setFormData(prev => ({ ...prev, branchId: selected?.value ?? 0 }));
                if (errors.branchId) setErrors(prev => { const e = { ...prev }; delete e.branchId; return e; });
              }}
              styles={customSelectFieldStyles}
              placeholder="Select a branch..."
              isDisabled={isSubmitting || isLoading}
              className={errors.branchId ? 'ring-1 ring-red-300 rounded-xl' : ''}
              classNamePrefix="react-select"
            />
            {errors.branchId && (
              <p className="text-red-500 text-sm mt-1">{errors.branchId}</p>
            )}
          </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verification Status *
          </label>
          <Select
            options={verificationStatuses.map(s => ({ value: s.id, label: s.name }))}
            value={formData.verificationStatusId ? { value: formData.verificationStatusId, label: verificationStatuses.find(s => s.id === formData.verificationStatusId)?.name ?? '' } : null}
            onChange={selected => {
              setFormData(prev => ({ ...prev, verificationStatusId: selected?.value ?? 0 }));
              if (errors.verificationStatusId) setErrors(prev => { const e = { ...prev }; delete e.verificationStatusId; return e; });
            }}
            styles={customSelectFieldStyles}
            placeholder="Select verification status..."
            isDisabled={isSubmitting || isLoading}
            className={errors.verificationStatusId ? 'ring-1 ring-red-300 rounded-xl' : ''}
            classNamePrefix="react-select"
          />
          {errors.verificationStatusId && (
            <p className="text-red-500 text-sm mt-1">{errors.verificationStatusId}</p>
          )}
        </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Live Location *
          </label>
          <input
            type="text"
            name="liveLocation"
            value={formData.liveLocation}
            onChange={handleChange}
            placeholder="e.g. https://maps.app.goo.gl/... or 123 Main Street"
            disabled={isSubmitting || isLoading}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${
              errors.liveLocation ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {errors.liveLocation && (
            <p className="text-red-500 text-sm mt-1">{errors.liveLocation}</p>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="flex-1 px-6 py-3 bg-[#F59B0F] text-white font-bold rounded-xl hover:bg-[#E88A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isSubmitting ? 'Registering...' : 'Register Employee'}
          </button>
        </div>
      </form>

    </div>
  );
};


const customSelectFieldStyles = {
  control: (base: any, state: any) => ({
    ...base,
    padding: '3px',
    borderWidth: '2px',
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    borderRadius: '9px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
    '&:hover': {
      borderColor: '#FCD34D',
    },
    transition: 'all 0.3s',
    backgroundColor: '',
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