import { useState } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../../util/AxiosUtil';
import type { SignUpFormData } from './types';

interface SignUpFormProps {
  onSignUpSuccess: (userId: number, firstName: string, lastName: string) => void;
  isLoading: boolean;
}

export const SignUpForm = ({ onSignUpSuccess, isLoading }: SignUpFormProps) => {
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    nic: '',
    dateOfBirth: '',
  });

  const [errors, setErrors] = useState<Partial<SignUpFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<SignUpFormData> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email format';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';

    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    if (!formData.nic.trim()) newErrors.nic = 'NIC is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof SignUpFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dateOfBirth,
        nic: formData.nic,
        email: formData.email,
        password: formData.password,
        profileImg: "",
        isActive: true,
        verificationStatus: {
          id: 1,
          name: "Pending"
        },
        userRole: {
          id: 5,
          name: "Customer"
        }
      };

      const response = await axiosInstance.post('/users/sign-up', payload);

      if (response.data.status === 200) {
        const token = response.data.desc;
        
        if (token) {
          // Decode JWT to get userId
          const decoded = JSON.parse(atob(token.split('.')[1]));
          const userId = decoded.userId;

              localStorage.setItem('jwtToken', token);

          Swal.fire({
            icon: 'success',
            title: 'Registration Successful',
            text: 'User account created. Now proceed with employee registration.',
          });

          onSignUpSuccess(userId, formData.firstName, formData.lastName);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Registration Failed',
            text: 'Registration successful but no token received',
          });
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: response.data.message || 'Registration failed',
        });
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Sign Up Failed',
        text: error.response?.data?.message || 'Failed to create user account',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-8 bg-white border border-gray-200 rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-5">Create New User Account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${
                errors.firstName ? 'border-red-400' : 'border-gray-200'
              }`}
              disabled={isSubmitting || isLoading}
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${
                errors.lastName ? 'border-red-400' : 'border-gray-200'
              }`}
              disabled={isSubmitting || isLoading}
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${
              errors.email ? 'border-red-400' : 'border-gray-200'
            }`}
            disabled={isSubmitting || isLoading}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${
                errors.dateOfBirth ? 'border-red-400' : 'border-gray-200'
              }`}
              disabled={isSubmitting || isLoading}
            />
            {errors.dateOfBirth && (
              <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NIC
            </label>
            <input
              type="text"
              name="nic"
              value={formData.nic}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${
                errors.nic ? 'border-red-400' : 'border-gray-200'
              }`}
              disabled={isSubmitting || isLoading}
            />
            {errors.nic && (
              <p className="text-red-500 text-sm mt-1">{errors.nic}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${
                errors.password ? 'border-red-400' : 'border-gray-200'
              }`}
              disabled={isSubmitting || isLoading}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all ${
                errors.confirmPassword ? 'border-red-400' : 'border-gray-200'
              }`}
              disabled={isSubmitting || isLoading}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full px-6 py-3 bg-[#F59B0F] text-white font-bold rounded-xl hover:bg-[#E88A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account & Continue'}
        </button>
      </form>
    </div>
  );
};
