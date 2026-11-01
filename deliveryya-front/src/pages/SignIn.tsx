import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { TbTruckDelivery } from 'react-icons/tb';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../page_comps/auth/AuthLayout';
import axiosInstance from '../util/AxiosUtil';
import { swalAlert } from '../util/SwalUtil';
import { getToken } from 'firebase/messaging';
import { messaging } from '../util/FireBase';
import JwtUtil from '../util/JwtUtil';
import Swal from 'sweetalert2';

const FCM_VAPID_KEY = 'BA0SSrBhGwG19kyaojWnp5VzGR-f4HssZHUWMRZLEwYxD5iQpM58LMDQBjF0L6RT2YJSzMCtpgy-y1gRcaas6xg';
const DEVICE_ID_STORAGE_KEY = 'deliveryya_device_id';

type NotificationPermissionResult = NotificationPermission | 'unsupported';
type LoginExData = {
    token?: string;
    userId?: string | number;
    email?: string;
    roleId?: unknown;
    userRoleId?: unknown;
    user_role_id?: unknown;
    role?: {
        id?: unknown;
    } | null;
    userRole?: {
        id?: unknown;
    } | null;
};
type ApiError = {
    response?: {
        status: number;
        data: {
            desc?: string;
            exData?: Record<string, unknown>;
        };
    };
    request?: unknown;
};

const getNotificationSettingsUrl = (): string | null => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
        return null;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const siteDetailsPath = `settings/content/siteDetails?site=${encodeURIComponent(window.location.origin)}`;

    if (userAgent.includes('edg/')) {
        return `edge://${siteDetailsPath}`;
    }

    if (userAgent.includes('firefox/')) {
        return 'about:preferences#privacy';
    }

    if (userAgent.includes('safari/') && !userAgent.includes('chrome/') && !userAgent.includes('chromium/')) {
        return null;
    }

    return `chrome://${siteDetailsPath}`;
};

const getOrCreateDeviceId = (): string => {
    if (typeof window === 'undefined') {
        return 'unknown-device';
    }

    const storedDeviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (storedDeviceId) {
        return storedDeviceId;
    }

    const deviceId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    return deviceId;
};

const getNotificationManualStepsHtml = (permission: NotificationPermissionResult): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'this site';
    const settingsUrl = permission === 'unsupported' ? null : getNotificationSettingsUrl();
    const browserSettingsText = permission === 'unsupported'
        ? 'This browser does not support web push notifications. Please use a browser that supports notifications, such as Chrome, Edge, or Firefox.'
        : settingsUrl
        ? 'Use the button below to open this site notification setting, then allow notifications for DeliveryYa.'
        : 'Open your browser settings manually, then allow notifications for this site.';
    const blockedText = permission === 'denied'
        ? '<p style="margin:0 0 12px;color:#b45309;"><strong>Notifications are blocked.</strong> Your browser will not show the permission popup again until you change the site setting manually.</p>'
        : '';
    const settingsSteps = permission === 'unsupported'
        ? ''
        : `
            <ol style="margin:0 0 12px 20px;padding:0;">
                <li>Click the lock or site settings icon beside the address bar.</li>
                <li>Open <strong>Site settings</strong> or <strong>Permissions</strong>.</li>
                <li>Set <strong>Notifications</strong> to <strong>Allow</strong> for <strong>${origin}</strong>.</li>
                <li>Return to DeliveryYa and continue using your account.</li>
            </ol>
            <p style="margin:0;color:#64748b;font-size:13px;">If the settings button does not open, go to your browser settings and search for "Notifications".</p>
        `;

    return `
        <div style="text-align:left;line-height:1.6;color:#1A1F3A;">
            <p style="margin:0 0 12px;">Notifications help DeliveryYa send order updates, delivery status changes, and important account alerts even when this tab is not open.</p>
            ${blockedText}
            <p style="margin:0 0 12px;">${browserSettingsText}</p>
            ${settingsSteps}
        </div>
    `;
};

const getNotificationPermission = (): NotificationPermissionResult => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }

    return Notification.permission;
};

const requestNotificationAccess = async (): Promise<NotificationPermissionResult> => {
    try {
        return await Notification.requestPermission();
    } catch (error) {
        console.error('Notification permission request failed:', error);
        return Notification.permission;
    }
};

const openNotificationSettings = (settingsUrl: string): void => {
    try {
        const settingsWindow = window.open(settingsUrl, '_blank', 'noopener,noreferrer');

        if (!settingsWindow) {
            window.location.href = settingsUrl;
        }
    } catch (error) {
        console.error('Unable to open notification settings:', error);
    }
};

const showNotificationPermissionPrompt = async (permission: NotificationPermissionResult): Promise<NotificationPermissionResult> => {
    if (permission === 'granted') {
        return permission;
    }

    const settingsUrl = permission === 'unsupported' ? null : getNotificationSettingsUrl();

    if (permission === 'default') {
        const result = await Swal.fire<NotificationPermissionResult>({
            icon: 'info',
            title: 'Enable Delivery Updates?',
            html: `
                <div style="text-align:left;line-height:1.6;color:#1A1F3A;">
                    <p style="margin:0 0 12px;">Allow notifications to get order updates, delivery status changes, and important account alerts as they happen.</p>
                    <p style="margin:0;color:#64748b;">You can continue without enabling them, and you can change this later from your browser settings.</p>
                </div>
            `,
            confirmButtonText: 'Allow Notifications',
            showCancelButton: true,
            cancelButtonText: 'Continue Without',
            confirmButtonColor: '#F59B0F',
            cancelButtonColor: '#6B7280',
            background: '#FFFDF5',
            color: '#1A1F3A',
            customClass: {
                popup: 'rounded-2xl shadow-2xl',
            },
            preConfirm: () => requestNotificationAccess(),
        });

        const requestedPermission = result.value ?? getNotificationPermission();

        if (requestedPermission === 'denied') {
            return showNotificationPermissionPrompt(requestedPermission);
        }

        return requestedPermission;
    }

    await Swal.fire({
        icon: permission === 'unsupported' ? 'info' : 'warning',
        title: permission === 'unsupported' ? 'Notifications Unavailable' : 'Notifications Are Blocked',
        html: getNotificationManualStepsHtml(permission),
        confirmButtonText: settingsUrl ? 'Open Notification Settings' : 'OK',
        showCancelButton: Boolean(settingsUrl),
        cancelButtonText: 'Continue Without',
        confirmButtonColor: '#F59B0F',
        cancelButtonColor: '#6B7280',
        background: '#FFFDF5',
        color: '#1A1F3A',
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
        },
        preConfirm: () => {
            if (settingsUrl) {
                openNotificationSettings(settingsUrl);
            }
        },
    });

    return getNotificationPermission();
};

const saveUserNotificationToken = async (jwtToken: string): Promise<{ success: boolean; message: string }> => {
    try {
        const FCMToken = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });

        if (!FCMToken) {
            return {
                success: false,
                message: 'No notification registration token was available. Please refresh and try again.',
            };
        }

        const response = await axiosInstance.post('/users/save-user-token',
            {
                token: FCMToken,
                deviceId: getOrCreateDeviceId(),
                tokenType: {
                    id: 1
                }
            }, {
            headers: {
                Authorization: `Bearer ${jwtToken}`
            }
        });

        if (response.status === 200 && response.data.message?.toLowerCase() === 'success') {
            return {
                success: true,
                message: 'Notification token saved.',
            };
        }

        return {
            success: false,
            message: response.data?.desc || 'Unable to save notification access. Please try again.',
        };
    } catch (error) {
        console.error('Notification token save failed:', error);
        return {
            success: false,
            message: 'Unable to prepare notifications for this browser. Please refresh and try again.',
        };
    }
};

function SignIn() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [isSendingForgotPassword, setIsSendingForgotPassword] = useState(false);
    const [forgotPasswordError, setForgotPasswordError] = useState('');
    const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: false
    });

    const [fieldErrors, setFieldErrors] = useState({
        email: '',
        password: ''
    });

    const [touchedFields, setTouchedFields] = useState({
        email: false,
        password: false
    });

    // Load remembered email on component mount
    useEffect(() => {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        if (rememberMe) {
            const rememberedEmail = localStorage.getItem('rememberedEmail');
            if (rememberedEmail) {
                setFormData(prev => ({
                    ...prev,
                    email: rememberedEmail,
                    remember: true
                }));
            }
        }
    }, []);

    // Validation functions
    const validateEmail = (value: string): string => {
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
    };

    const validatePassword = (value: string): string => {
        if (!value) return 'Password is required';
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));

        // Validate field on change if already touched
        if (touchedFields[name as keyof typeof touchedFields]) {
            let error = '';
            if (name === 'email') {
                error = validateEmail(value);
            } else if (name === 'password') {
                error = validatePassword(value);
            }

            if (name !== 'remember') {
                setFieldErrors(prev => ({
                    ...prev,
                    [name]: error
                }));
            }
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
        if (name === 'email') {
            error = validateEmail(value);
        } else if (name === 'password') {
            error = validatePassword(value);
        }

        setFieldErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const validateForm = (): boolean => {
        const errors = {
            email: validateEmail(formData.email),
            password: validatePassword(formData.password)
        };

        setFieldErrors(errors);
        setTouchedFields({
            email: true,
            password: true
        });

        return !Object.values(errors).some(error => error !== '');
    };

    const buildForgotPasswordTemplate = (displayName: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - DeliveryYa</title>
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
            background: linear-gradient(135deg, #F59B0F 0%, #AC6C2A 100%);
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
            background: #E0F7F4;
            border-left: 4px solid #00BFA5;
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
            background: linear-gradient(135deg, #F59B0F 0%, #AC6C2A 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 4px 15px rgba(245, 155, 15, 0.3);
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
            color: #00BFA5;
            font-size: 13px;
            word-break: break-all;
            background: #E0F7F4;
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
            <h1>Reset Your Password</h1>
            <p>DeliveryYa Password Recovery</p>
        </div>

        <div class="email-body">
            <p class="greeting">Hello, ${displayName}!</p>

            <p class="message">
                We received a request to reset the password for your <strong class="brand-name">DeliveryYa</strong> account.
                If you didn't make this request, you can safely ignore this email. Your password will remain unchanged.
            </p>

            <div class="info-box">
                <p><strong>Why reset?</strong> Resetting your password keeps your account secure and protects your personal information.</p>
            </div>

            <div class="button-container">
                <a href="{{verification_link}}" class="cta-button">
                    Reset Your Password
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
                <p><strong>⚠️ Security Notice:</strong> This link will expire in 24 hours.
                If you didn't request a password reset, please ignore this email or contact our support team immediately.</p>
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

    const handleOpenForgotPasswordModal = () => {
        setForgotPasswordEmail(formData.email.trim());
        setForgotPasswordError('');
        setForgotPasswordSuccess('');
        setIsForgotPasswordModalOpen(true);
    };

    const handleCloseForgotPasswordModal = () => {
        if (isSendingForgotPassword) {
            return;
        }

        setIsForgotPasswordModalOpen(false);
        setForgotPasswordError('');
        setForgotPasswordSuccess('');
    };

    const handleSendForgotPasswordEmail = async () => {
        const normalizedEmail = forgotPasswordEmail.trim();
        const emailError = validateEmail(normalizedEmail);

        if (emailError) {
            setForgotPasswordError(emailError);
            setForgotPasswordSuccess('');
            return;
        }

        try {
            setIsSendingForgotPassword(true);
            setForgotPasswordError('');
            setForgotPasswordSuccess('');

            // const resetPasswordUrl = `${window.location.origin}/reset-password`;
            const resetPasswordUrl = `/reset-password`;
            const displayName = normalizedEmail.split('@')[0] || 'there';

            const payload = {
                email: normalizedEmail,
                subject: 'Reset Your Password - DeliveryYa',
                design: buildForgotPasswordTemplate(displayName),
                route: resetPasswordUrl,
            };

            const response = await axiosInstance.post('/users/send-reset-password-email', payload);

            if (response.data.message?.toLowerCase() === 'success') {
                setForgotPasswordSuccess('Password reset email sent successfully! Please check your inbox and click the reset link.');
                setTimeout(() => setForgotPasswordSuccess(''), 5000);
            } else {
                throw new Error(response.data.desc || 'Failed to send password reset email');
            }
        } catch (err: unknown) {
            const apiError = err as ApiError;
            const errorMessage = apiError.response?.data?.desc || 'Failed to send password reset email. Please try again.';
            setForgotPasswordError(errorMessage);
            setTimeout(() => setForgotPasswordError(''), 5000);
        } finally {
            setIsSendingForgotPassword(false);
        }
    };

    const clearAuthenticatedSession = () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
    };

    const persistLoginSession = (
        token: string,
        exData: LoginExData,
        decodedData: ReturnType<typeof JwtUtil.decodeToken>
    ) => {
        localStorage.setItem('jwtToken', token);

        const userId = exData?.userId ?? decodedData?.userId;
        if (userId !== undefined && userId !== null) {
            localStorage.setItem('userId', userId.toString());
        }

        const userEmail = exData?.email ?? decodedData?.email;
        if (userEmail) {
            localStorage.setItem('userEmail', userEmail);
        }

        if (formData.remember) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('rememberedEmail', formData.email);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberedEmail');
        }
    };

    const completeSuccessfulLogin = (
        token: string,
        exData: LoginExData,
        decodedData: ReturnType<typeof JwtUtil.decodeToken>
    ) => {
        persistLoginSession(token, exData, decodedData);
        void swalAlert("Success", "User Login Successful", "success");
        const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
        navigate(returnTo && returnTo.startsWith('/') ? returnTo : "/home", { replace: true });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const payload = {
                email: formData.email,
                password: formData.password
            };

            const response = await axiosInstance.post('/users/login', payload);

            if (response.data.status === 200 && response.data.message?.toLowerCase() === 'success') {
                const exData = (response.data.exData ?? {}) as LoginExData;
                const token = exData?.token;
                if (token) {
                    const decodedData = JwtUtil.decodeToken(token);
                    let notificationPermission = getNotificationPermission();

                    if (decodedData?.isEmployee && (typeof navigator === 'undefined' || !("geolocation" in navigator))) {
                        clearAuthenticatedSession();
                        void swalAlert("Location Required", "Geolocation is not supported by your browser. Access denied.", "error");
                        return;
                    }

                    localStorage.setItem('jwtToken', token);

                    if (notificationPermission !== 'granted') {
                        notificationPermission = await showNotificationPermissionPrompt(notificationPermission);
                    }

                    if (notificationPermission === 'granted') {
                        const notificationSaveResult = await saveUserNotificationToken(token);

                        if (!notificationSaveResult.success) {
                            void swalAlert("Notifications unavailable", notificationSaveResult.message, "warning");
                        }
                    }

                    completeSuccessfulLogin(token, exData, decodedData);
                } else {
                    setFieldErrors(prev => ({
                        ...prev,
                        email: 'Login successful but no token received'
                    }));
                }
            } else {
                setFieldErrors(prev => ({
                    ...prev,
                    email: response.data.desc || 'Unable to sign in. Please try again.'
                }));
            }
        } catch (err: unknown) {
            const apiError = err as ApiError;

            if (apiError.response) {
                const errorData = apiError.response.data;
                const errorDesc = errorData.desc || '';

                if (apiError.response.status === 401) {
                    setTouchedFields({
                        email: true,
                        password: true
                    });

                    // Check if error is email-related or password-related
                    const lowerDesc = errorDesc.toLowerCase();
                    const isEmailError = lowerDesc.includes('email') ||
                        lowerDesc.includes('user not found') ||
                        lowerDesc.includes('account not found') ||
                        lowerDesc.includes('no user found');
                    const isPasswordError = lowerDesc.includes('password') ||
                        lowerDesc.includes('incorrect') ||
                        lowerDesc.includes('wrong') ||
                        lowerDesc.includes('invalid');

                    if (isEmailError) {
                        setFieldErrors({
                            email: errorDesc || 'Invalid email address',
                            password: ''
                        });
                    } else if (isPasswordError) {
                        setFieldErrors({
                            email: '',
                            password: errorDesc || 'Invalid password'
                        });
                    } else {
                        // Generic credentials error - show in password field
                        setFieldErrors({
                            email: '',
                            password: errorDesc || 'Invalid email or password'
                        });
                    }
                } else if (apiError.response.status === 409) {
                    // Conflict error - could be email or password related
                    setTouchedFields({
                        email: true,
                        password: true
                    });

                    const lowerDesc = errorDesc.toLowerCase();
                    const isEmailError = lowerDesc.includes('email') ||
                        lowerDesc.includes('user does not exist') ||
                        lowerDesc.includes('user dose not exist') ||
                        lowerDesc.includes('user not found');

                    if (isEmailError) {
                        setFieldErrors({
                            email: errorDesc || 'User does not exist',
                            password: ''
                        });
                    } else {
                        setFieldErrors({
                            email: '',
                            password: errorDesc || 'Invalid password'
                        });
                    }
                } else if (apiError.response.status === 400) {
                    if (errorData.exData && typeof errorData.exData === 'object') {
                        const backendErrors: Record<string, string> = {};
                        Object.entries(errorData.exData).forEach(([field, message]) => {
                            backendErrors[field] = typeof message === 'string' ? message : String(message ?? '');
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
                        setFieldErrors(prev => ({
                            ...prev,
                            email: errorDesc || 'Invalid input data'
                        }));
                    }
                } else if (apiError.response.status === 403) {
                    setTouchedFields(prev => ({
                        ...prev,
                        email: true
                    }));
                    setFieldErrors(prev => ({
                        ...prev,
                        email: errorDesc || 'Your account is inactive. Please contact support.'
                    }));
                } else {
                    setFieldErrors(prev => ({
                        ...prev,
                        email: errorDesc || 'An error occurred during sign in'
                    }));
                }
            } else if (apiError.request) {
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
            console.error('Sign in error:', err);
        } finally {
            setLoading(false);
        }
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
        <>
            <AuthLayout
                title="Welcome Back!"
                subtitle="Sign in to continue your shopping journey"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
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

                    {/* Remember & Forgot */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="remember"
                                checked={formData.remember}
                                onChange={handleChange}
                                className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                            />
                            <span className="text-sm font-medium text-[#2C3E50] group-hover:text-[#FF6B35] transition-colors">
                                Remember me
                            </span>
                        </label>
                        <Link
                            to="#"
                            onClick={(event) => {
                                event.preventDefault();
                                handleOpenForgotPasswordModal();
                            }}
                            className="text-sm font-bold text-[#FF6B35] hover:text-[#FF8C42] transition-colors"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                        <TbTruckDelivery className="w-5 h-5" />
                    </button>
                </form>

                <p className="text-center text-[#2C3E50] mt-8">
                    Don't have an account?{' '}
                    <Link
                        to="/sign-up"
                        className="font-bold text-[#FF6B35] hover:text-[#FF8C42] transition-colors"
                    >
                        Sign Up Now
                    </Link>
                </p>

            </AuthLayout>
            {isForgotPasswordModalOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/55 p-4"
                    onClick={handleCloseForgotPasswordModal}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="forgot-password-modal-title"
                        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="border-b border-gray-200 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-4 text-white">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 id="forgot-password-modal-title" className="text-lg font-bold">Forgot Password</h3>
                                    <p className="mt-1 text-sm text-white/90">Enter your email to receive a secure reset link.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseForgotPasswordModal}
                                    disabled={isSendingForgotPassword}
                                    className="inline-flex items-center gap-1 rounded-md border border-white/50 px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <MdClose className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 px-5 py-5">
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-[#1A1F3A]">Email Address</span>
                                <input
                                    type="email"
                                    value={forgotPasswordEmail}
                                    onChange={(event) => setForgotPasswordEmail(event.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                                />
                            </label>

                            {forgotPasswordError && (
                                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                    {forgotPasswordError}
                                </p>
                            )}

                            {forgotPasswordSuccess && (
                                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                                    {forgotPasswordSuccess}
                                </p>
                            )}

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleCloseForgotPasswordModal}
                                    disabled={isSendingForgotPassword}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleSendForgotPasswordEmail()}
                                    disabled={isSendingForgotPassword}
                                    className="rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSendingForgotPassword ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}

export default SignIn;
