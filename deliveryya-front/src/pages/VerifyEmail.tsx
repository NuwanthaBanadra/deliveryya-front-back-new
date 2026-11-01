import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import JwtUtil from "../util/JwtUtil";
import axiosInstance from "../util/AxiosUtil";
import type { DecodedUserData } from "../types/EntitiesTypes";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Verification token is missing");
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

    // If decode fails or lacks email, still allow verification (backend validates)
    setEmail("");
  }, [searchParams]);

  const handleVerifyEmail = async () => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Verification token is missing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.get("/email/verify-email-by-token", {
        params: { token },
      });

      if (response.data?.message === "Success") {
        setSuccess(true);

        setTimeout(() => {
          // navigate("/signin");
          navigate("/home");
        }, 2000);
      } else if (response.data?.message === "Error") {
        setError(response.data?.desc || "Failed to verify email. Please try again.");
      } else {
        setError("Failed to verify email. Please try again.");
      }
    } catch (err: any) {
      if (err.response) {
        setError(err.response.data?.desc || "Failed to verify email. Please try again.");
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
            <h2 className="text-2xl font-bold text-[#1A1F3A] mb-2">Verification Failed</h2>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-[#1A1F3A] mb-2">
          Email Verification
        </h1>

        {/* Email Display */}
        {email && (
          <div className="text-center mb-6">
            <p className="text-[#2C3E50] mb-2">Please verify your email address:</p>
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
                <p className="text-[#00897B] font-semibold">Email verified successfully!</p>
                <p className="text-[#00897B] mt-1">Redirecting to login...</p>
              </div>
            </div>
          </div>
        )}

        {/* Verify Button */}
        {!success && (
          <button
            onClick={handleVerifyEmail}
            disabled={loading || !email}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-300 ${loading || !email
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
                Verifying...
              </span>
            ) : (
              "Verify Email"
            )}
          </button>
        )}

        {/* Info Text */}
        <p className="text-center text-sm text-[#2C3E50] mt-6">
          By verifying your email, you confirm that you have access to this email address.
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;