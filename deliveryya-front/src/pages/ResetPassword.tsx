import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import JwtUtil from "../util/JwtUtil";
import axiosInstance from "../util/AxiosUtil";
import type { DecodedUserData } from "../types/EntitiesTypes";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  
  // Password fields
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  // Validation errors
  const [passwordError, setPasswordError] = useState<string>("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Reset token is missing");
      return;
    }

    const decoded = JwtUtil.decodeToken(token) as DecodedUserData | null;

    // Use email if present, otherwise fall back to sub
    if (decoded?.email) {
      setEmail(decoded.email);
      return;
    }

    if (decoded?.sub) {
      setEmail(decoded.sub);
      return;
    }

    // If decode fails or lacks email, still allow reset (backend validates)
    setEmail("");
  }, [searchParams]);

  const validatePassword = (password: string): string => {
    if (!password) return 'New password is required';
    if (password.length < 8 || password.length > 64) return 'Password must be 8-64 characters';
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,64}$/;
    if (!passwordRegex.test(password)) {
      return 'Password must include uppercase, lowercase, digit and special character';
    }
    return '';
  };

  const validateConfirmPassword = (confirm: string, newPass: string): string => {
    if (!confirm) return 'Please confirm your password';
    if (confirm !== newPass) return 'Passwords do not match';
    return '';
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    const error = validatePassword(value);
    setPasswordError(error);
    
    // Re-validate confirm password if it's filled
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword, value);
      setConfirmPasswordError(confirmError);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    const error = validateConfirmPassword(value, newPassword);
    setConfirmPasswordError(error);
  };

  const handleResetPassword = async () => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Reset token is missing");
      return;
    }

    // Validate passwords
    const passError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(confirmPassword, newPassword);
    
    setPasswordError(passError);
    setConfirmPasswordError(confirmError);

    if (passError || confirmError) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post("/users/reset-password-email", {
        token,
        password: newPassword,
      });

      if (response.data?.message === "Success") {
        setSuccess(true);

        setTimeout(() => {
          navigate("/sign-in");
        }, 2000);
      } else if (response.data?.message === "Error") {
        setError(response.data?.desc || "Failed to reset password. Please try again.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } catch (err: any) {
      if (err.response) {
        setError(err.response.data?.desc || "Failed to reset password. Please try again.");
      } else if (err.request) {
        setError("No response from server. Please check your internet connection.");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (error && !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF4EE] to-[#FFE5D9] flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#EF5350]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A1F3A] mb-2">Reset Failed</h2>
            <p className="text-[#2C3E50]">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF4EE] to-[#FFE5D9] flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full">
        {/* Header Icon */}
        <div className="w-20 h-20 bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-[#1A1F3A] mb-2">
          Reset Your Password
        </h1>

        {/* Email Display */}
        {email && (
          <div className="text-center mb-6">
            <p className="text-[#2C3E50] mb-2">Reset password for:</p>
            <div className="bg-[#FFF4EE] rounded-lg p-4 border-2 border-[#FFD4C4]">
              <strong className="text-lg text-[#FF6B35] break-all">{email}</strong>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-[#EF5350] rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-[#EF5350] mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-[#EF5350]">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-[#E0F7F4] border-l-4 border-[#00BFA5] rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-[#00BFA5] mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="text-[#00897B] font-semibold">Password reset successfully!</p>
                <p className="text-[#00897B] mt-1">Redirecting to login...</p>
              </div>
            </div>
          </div>
        )}

        {/* Password Fields */}
        {!success && (
          <div className="space-y-4 mb-6">
            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1F3A] mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${
                    passwordError
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20'
                  }`}
                  placeholder="Enter new password (min 8 characters)"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#FF6B35] transition-colors"
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{passwordError}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1F3A] mb-2">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-300 ${
                    confirmPasswordError
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20'
                  }`}
                  placeholder="Confirm new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#FF6B35] transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{confirmPasswordError}</p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 mb-2">Password Requirements:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• At least 8 characters long (max 64)</li>
                <li>• At least one uppercase letter (A-Z)</li>
                <li>• At least one lowercase letter (a-z)</li>
                <li>• At least one digit (0-9)</li>
                <li>• At least one special character (@$!%*?&)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {!success && (
          <button
            onClick={handleResetPassword}
            disabled={loading || !email || !newPassword || !confirmPassword}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-300 ${
              loading || !email || !newPassword || !confirmPassword
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] hover:from-[#FF5722] hover:to-[#FF6B35] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting Password...
              </span>
            ) : (
              "Reset Password"
            )}
          </button>
        )}

        {/* Info Text */}
        <p className="text-center text-sm text-[#2C3E50] mt-6">
          Make sure to choose a strong password that you haven't used elsewhere.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
