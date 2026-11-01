import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../page_comps/auth/AuthLayout';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { TbTruckDelivery } from 'react-icons/tb';
import axiosInstance from '../util/AxiosUtil';
import Swal from 'sweetalert2';

function SignUp() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        dateOfBirth: '',
        nic: '',
        password: '',
        confirmPassword: ''
    });

    const [fieldErrors, setFieldErrors] = useState({
        firstName: '',
        lastName: '',
        email: '',
        dateOfBirth: '',
        nic: '',
        password: '',
        confirmPassword: ''
    });

    const [touchedFields, setTouchedFields] = useState({
        firstName: false,
        lastName: false,
        email: false,
        dateOfBirth: false,
        nic: false,
        password: false,
        confirmPassword: false
    });

    // Validation functions
    const validateFirstName = (value: string): string => {
        if (!value.trim()) return 'First name is required';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'First name can only contain letters';
        return '';
    };

    const validateLastName = (value: string): string => {
        if (!value.trim()) return 'Last name is required';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Last name can only contain letters';
        return '';
    };

    const validateEmail = (value: string): string => {
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
    };

    const validateDateOfBirth = (value: string): string => {
        if (!value) return 'Date of birth is required';
        return '';
    };

    const validateNIC = (value: string): string => {
        if (!value.trim()) return 'NIC is required';
        const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
        if (!nicRegex.test(value)) return 'Please enter a valid NIC (9 digits + V/X or 12 digits)';
        return '';
    };

    const validatePassword = (value: string): string => {
        if (!value) return 'Password is required';
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,64}$/;
        if (!passwordRegex.test(value)) return 'Password must be 8-64 characters and contain uppercase, lowercase, number, and special character (@$!%*?)';
        return '';
    };

    const validateConfirmPassword = (value: string, password: string): string => {
        if (!value) return 'Please confirm your password';
        if (value !== password) return 'Passwords do not match';
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Validate field on change if already touched
        if (touchedFields[name as keyof typeof touchedFields]) {
            let error = '';
            switch (name) {
                case 'firstName':
                    error = validateFirstName(value);
                    break;
                case 'lastName':
                    error = validateLastName(value);
                    break;
                case 'email':
                    error = validateEmail(value);
                    break;
                case 'dateOfBirth':
                    error = validateDateOfBirth(value);
                    break;
                case 'nic':
                    error = validateNIC(value);
                    break;
                case 'password':
                    error = validatePassword(value);
                    // Revalidate confirm password if it's already filled
                    if (formData.confirmPassword) {
                        setFieldErrors(prev => ({
                            ...prev,
                            confirmPassword: validateConfirmPassword(formData.confirmPassword, value)
                        }));
                    }
                    break;
                case 'confirmPassword':
                    error = validateConfirmPassword(value, formData.password);
                    break;
            }
            setFieldErrors(prev => ({
                ...prev,
                [name]: error
            }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTouchedFields(prev => ({
            ...prev,
            [name]: true
        }));

        // Validate on blur
        let error = '';
        switch (name) {
            case 'firstName':
                error = validateFirstName(value);
                break;
            case 'lastName':
                error = validateLastName(value);
                break;
            case 'email':
                error = validateEmail(value);
                break;
            case 'dateOfBirth':
                error = validateDateOfBirth(value);
                break;
            case 'nic':
                error = validateNIC(value);
                break;
            case 'password':
                error = validatePassword(value);
                break;
            case 'confirmPassword':
                error = validateConfirmPassword(value, formData.password);
                break;
        }
        setFieldErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const validateForm = (): boolean => {
        const errors = {
            firstName: validateFirstName(formData.firstName),
            lastName: validateLastName(formData.lastName),
            email: validateEmail(formData.email),
            dateOfBirth: validateDateOfBirth(formData.dateOfBirth),
            nic: validateNIC(formData.nic),
            password: validatePassword(formData.password),
            confirmPassword: validateConfirmPassword(formData.confirmPassword, formData.password)
        };

        setFieldErrors(errors);
        setTouchedFields({
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true,
            nic: true,
            password: true,
            confirmPassword: true
        });

        return !Object.values(errors).some(error => error !== '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        if (!validateForm()) {
            return;
        }

        setLoading(true);

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
                    localStorage.setItem('jwtToken', token);

                    const result = await Swal.fire({
                        icon: 'success',
                        title: 'Account Created Successfully!',
                        text: 'Welcome to DeliveryYa!',
                        confirmButtonText: 'OK',
                        background: '#FFF4EE',
                        color: '#1A1F3A',
                        iconColor: '#00BFA5',
                        customClass: {
                            popup: 'rounded-xl shadow-2xl',
                            confirmButton: 'bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] px-8 py-3 rounded-lg font-bold text-white border-0'
                        }
                    });

                    if (result.isConfirmed || result.isDismissed) {
                        localStorage.setItem('signupSuccess', 'true');
                        localStorage.setItem('signupEmail', formData.email);
                        navigate(-1);
                    }
                } else {
                    setFieldErrors(prev => ({
                        ...prev,
                        email: 'Registration successful but no token received'
                    }));
                }
            } else {
                setFieldErrors(prev => ({
                    ...prev,
                    email: response.data.message || 'Registration failed'
                }));
            }
        } catch (err: any) {
            if (err.response) {
                const errorData = err.response.data;

                if (err.response.status === 400 && errorData.exData && typeof errorData.exData === 'object') {
                    // Map backend validation errors to form fields
                    const backendErrors: any = {};
                    Object.entries(errorData.exData).forEach(([field, message]) => {
                        backendErrors[field] = message as string;
                    });
                    setFieldErrors(prev => ({ ...prev, ...backendErrors }));
                    setTouchedFields(prev => ({
                        ...prev,
                        ...Object.keys(backendErrors).reduce((acc, field) => ({
                            ...acc,
                            [field]: true
                        }), {})
                    }));
                } else if (err.response.status === 409) {
                    // Check if exData contains field-specific errors
                    if (errorData.exData && typeof errorData.exData === 'object') {
                        const backendErrors: any = {};
                        Object.entries(errorData.exData).forEach(([field, message]) => {
                            backendErrors[field] = message as string;
                        });
                        setFieldErrors(prev => ({ ...prev, ...backendErrors }));
                        setTouchedFields(prev => ({
                            ...prev,
                            ...Object.keys(backendErrors).reduce((acc, field) => ({
                                ...acc,
                                [field]: true
                            }), {})
                        }));
                    } else {
                        // Generic conflict error
                        setTouchedFields(prev => ({
                            ...prev,
                            email: true
                        }));
                        setFieldErrors(prev => ({
                            ...prev,
                            email: errorData.desc || 'This email is already registered'
                        }));
                    }
                } else {
                    setFieldErrors(prev => ({
                        ...prev,
                        email: errorData.desc || 'An error occurred during registration'
                    }));
                }
            } else if (err.request) {
                setFieldErrors(prev => ({
                    ...prev,
                    email: 'No response from server. Please check your internet connection.'
                }));
            } else {
                setFieldErrors(prev => ({
                    ...prev,
                    email: 'An unexpected error occurred'
                }));
            }
            console.error('Signup error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getInputClassName = (fieldName: keyof typeof fieldErrors) => {
        const hasError = touchedFields[fieldName] && fieldErrors[fieldName];
        return `w-full px-4 py-3.5 rounded-xl border-2 ${hasError
            ? 'border-red-500 bg-red-50 focus:border-red-600'
            : 'border-gray-200 focus:border-[#FFA726] bg-gray-50 focus:bg-white'
            } focus:outline-hidden transition-all [&:-webkit-autofill]:bg-orange-50 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(255_247_237)]`;
    };

    const getInputWithIconClassName = (fieldName: keyof typeof fieldErrors) => {
        const hasError = touchedFields[fieldName] && fieldErrors[fieldName];
        return `w-full pl-12 pr-4 py-3.5 rounded-xl border-2 ${hasError
            ? 'border-red-500 bg-red-50 focus:border-red-600'
            : 'border-gray-200 focus:border-[#FFA726] bg-gray-50 focus:bg-white'
            } focus:outline-hidden transition-all [&:-webkit-autofill]:bg-orange-50 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(255_247_237)]`;
    };

    const getPasswordInputClassName = (fieldName: keyof typeof fieldErrors) => {
        const hasError = touchedFields[fieldName] && fieldErrors[fieldName];
        return `w-full pl-12 pr-12 py-3.5 rounded-xl border-2 ${hasError
            ? 'border-red-500 bg-red-50 focus:border-red-600'
            : 'border-gray-200 focus:border-[#FFA726] bg-gray-50 focus:bg-white'
            } focus:outline-hidden transition-all [&:-webkit-autofill]:bg-orange-50 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(255_247_237)]`;
    };

    return (
        <AuthLayout
            title="Create an Account"
            subtitle="Join us for a seamless shopping experience"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* First Name and Last Name */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-[#1A1F3A] mb-2">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={getInputClassName('firstName')}
                            placeholder="John"
                        />
                        {touchedFields.firstName && fieldErrors.firstName && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.firstName}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-[#1A1F3A] mb-2">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={getInputClassName('lastName')}
                            placeholder="Doe"
                        />
                        {touchedFields.lastName && fieldErrors.lastName && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.lastName}</p>
                        )}
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-bold text-[#1A1F3A] mb-2">
                        Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={getInputWithIconClassName('email')}
                            placeholder="your@email.com"
                        />
                    </div>
                    {touchedFields.email && fieldErrors.email && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                    )}
                </div>

                {/* Date of Birth and NIC */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-[#1A1F3A] mb-2">
                            Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            max={new Date().toISOString().split('T')[0]}
                            className={getInputClassName('dateOfBirth')}
                        />
                        {touchedFields.dateOfBirth && fieldErrors.dateOfBirth && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.dateOfBirth}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-[#1A1F3A] mb-2">
                            NIC <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nic"
                            value={formData.nic}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={getInputClassName('nic')}
                            placeholder="123456789V"
                        />
                        {touchedFields.nic && fieldErrors.nic && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.nic}</p>
                        )}
                    </div>
                </div>

                {/* Password */}
                <div>
                    <label className="block text-sm font-bold text-[#1A1F3A] mb-2">
                        Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={getPasswordInputClassName('password')}
                            placeholder="Enter your password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B35] transition-colors"
                        >
                            {showPassword ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                        </button>
                    </div>
                    {touchedFields.password && fieldErrors.password && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block text-sm font-bold text-[#1A1F3A] mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={getPasswordInputClassName('confirmPassword')}
                            placeholder="Confirm your password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B35] transition-colors"
                        >
                            {showConfirmPassword ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                        </button>
                    </div>
                    {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.confirmPassword}</p>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                    <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
                    <TbTruckDelivery className="w-5 h-5" />
                </button>
            </form>

            <p className="text-center text-[#2C3E50] mt-8">
                Already have an account?{' '}
                <Link
                    to="/sign-in"
                    className="font-bold text-[#FF6B35] hover:text-[#FF8C42] transition-colors"
                >
                    Sign In
                </Link>
            </p>
        </AuthLayout>
    );
}

export default SignUp;
