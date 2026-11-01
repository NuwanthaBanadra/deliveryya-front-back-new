import { Disclosure, DisclosureButton, DisclosurePanel, MenuItem } from '@headlessui/react';
import { Bars3Icon, ShoppingCartIcon, UserCircleIcon, UserIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import NavbarSearch from './NavbarSearch';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdTrackChanges } from 'react-icons/md';
import logoImage from '../../assets/images/logo.jpeg';
import { CART_STORAGE_KEY, CART_UPDATED_EVENT, getCartItems } from '../../util/CartUtil';
import JwtUtil from '../../util/JwtUtil';
import ProfileMenu from '../shared/ProfileMenu';
import { buildUserProfileFromSession, type LoggedInUserProfile } from '../../util/UserProfileUtil.ts';
import axiosInstance from '../../util/AxiosUtil';
import NotificationsPanel, { type NotificationItem } from '../shared/NotificationsPanel';
import { checkAccess } from '../../util/AccessController.ts';
import { FRONTEND_ACCESS_IDS } from '../../util/FrontendAccess.ts';

const navigation = [
    { name: 'Home', href: '/home' },
    { name: 'Store', href: '/store' },
    // { name: 'One time order', href: '/one-time-order' },
    { name: 'Services', href: '/services' },
    { name: 'Track Order', href: '/track-your-order' },
    { name: 'Complaints', href: '/complaints', accessId: FRONTEND_ACCESS_IDS.COMPLAINT_ACCESS },
    // { name: 'Urgent Job', href: '/urgent-job' },
    { name: 'About', href: '/about' },
]

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export default function NavBar() {
    const [scrolled, setScrolled] = useState(false);
    const [isMobileNavHidden, setIsMobileNavHidden] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        const token = localStorage.getItem('jwtToken');
        return token ? JwtUtil.validateToken(token) : false;
    });
    const [loggedInUserProfile, setLoggedInUserProfile] = useState<LoggedInUserProfile | null>(
        () => buildUserProfileFromSession()
    );
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState('');
    const [profileImageFailed, setProfileImageFailed] = useState(false);
    const [notificationsLoaded, setNotificationsLoaded] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [markingReadId, setMarkingReadId] = useState<number | null>(null);
    const searchPanelRef = useRef<HTMLDivElement | null>(null);
    const searchButtonRef = useRef<HTMLButtonElement | null>(null);
    const lastScrollYRef = useRef(0);
    const canUseNavbar = !isLoggedIn || checkAccess(FRONTEND_ACCESS_IDS.NAVBAR_ACCESS);
    const canUseNotifications = !isLoggedIn || checkAccess(FRONTEND_ACCESS_IDS.NOTIFICATION_ACCESS);
    const canUseCart = !isLoggedIn || checkAccess(FRONTEND_ACCESS_IDS.CHECKOUT_CART_ACCESS);
    const visibleNavigation = useMemo(
        () => navigation.filter((item) => !isLoggedIn || !item.accessId || checkAccess(item.accessId)),
        [isLoggedIn]
    );
    const notificationCount = notifications.filter((n) => !n.isRead).length;

    const updateCartCount = () => {
        const items = getCartItems();
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalItems);
    };

    useEffect(() => {
        updateCartCount();

        const updateAuthState = () => {
            const token = localStorage.getItem('jwtToken');
            const isValid = token ? JwtUtil.validateToken(token) : false;
            setIsLoggedIn(isValid);
            setLoggedInUserProfile(isValid ? buildUserProfileFromSession() : null);
            setProfileImageFailed(false);
        };

        updateAuthState();

        const handleStorage = (event: StorageEvent) => {
            if (!event.key || event.key === CART_STORAGE_KEY) {
                updateCartCount();
            }
            updateAuthState();
        };

        const handleCartUpdated = () => updateCartCount();
        const handleFocus = () => updateAuthState();

        window.addEventListener('storage', handleStorage);
        window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
        window.addEventListener('focus', handleFocus);

        const onScroll = () => {
            const currentScrollY = window.scrollY;
            const isMobile = window.innerWidth < 1024;

            setScrolled(currentScrollY > 20);

            if (!isMobile) {
                setIsMobileNavHidden(false);
                lastScrollYRef.current = currentScrollY;
                return;
            }

            if (currentScrollY < 24) {
                setIsMobileNavHidden(false);
            } else if (currentScrollY > lastScrollYRef.current + 8) {
                setIsMobileNavHidden(true);
            } else if (currentScrollY < lastScrollYRef.current - 8) {
                setIsMobileNavHidden(false);
            }

            lastScrollYRef.current = currentScrollY;
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    useEffect(() => {
        if (!isLoggedIn || !canUseNotifications || notificationsLoaded) return;

        const loadNotifications = async () => {
            try {
                setNotificationsLoading(true);
                setNotificationsError('');

                const response = await axiosInstance.post('/notifications/get-all-notifications', {
                    pageNumber: 0,
                    countPerPage: 10,
                });

                setNotifications(response.data?.object?.items ?? []);
                setNotificationsLoaded(true);
            } catch (err) {
                console.error('Failed to load notifications:', err);
                setNotificationsError('Unable to load notifications right now.');
            } finally {
                setNotificationsLoading(false);
            }
        };

        void loadNotifications();
    }, [isLoggedIn, canUseNotifications, notificationsLoaded]);

    useEffect(() => {
        if (!isSearchOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) return;

            if (searchPanelRef.current?.contains(target) || searchButtonRef.current?.contains(target)) {
                return;
            }

            setIsSearchOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [isSearchOpen]);

    useEffect(() => {
        setIsSearchOpen(false);
    }, [location.pathname, location.search, location.hash]);

    const toggleNotifications = () => {
        if (!isLoggedIn || !canUseNotifications) return;
        setIsNotificationsOpen((s) => !s);
    };

    const toggleSearch = () => setIsSearchOpen((s) => !s);

    const handleOpenNotification = async (notification: NotificationItem) => {
        setSelectedNotification(notification);
        if (notification.isRead) return;

        try {
            setMarkingReadId(notification.id);
            await axiosInstance.put(`/notifications/mark-as-read?id=${notification.id}`);
            setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
            setSelectedNotification((cur) => (cur && cur.id === notification.id ? { ...cur, isRead: true } : cur));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        } finally {
            setMarkingReadId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        setIsLoggedIn(false);
        navigate('/sign-in', { replace: true });
    };

    // Check if navigation item is current
    const isCurrentPage = (href: string) => {
        if (href === '#') {
            return false;
        }

        if (href === '/home' || href === '/') {
            return location.pathname === '/' || location.pathname === '/home';
        }

        return location.pathname === href || location.pathname.startsWith(href + '/');
    };

    return (
        <Disclosure as="nav" className={`sticky top-0 z-50 transform transition-all duration-500 ease-out lg:translate-y-0 ${
            isMobileNavHidden ? '-translate-y-full' : 'translate-y-0'
        } ${scrolled
            ? 'bg-white/88 shadow-2xl border-b-2 border-[#F59B0F]/80 backdrop-blur-xl'
            : 'bg-orange-50/78 backdrop-blur-xl shadow-lg border-b border-[#F59B0F]/20'
            }`}>
            {({ close }) => (
                <>

            <div className="max-w-480 mx-auto px-1 sm:px-6  lg:px-20 ">
                {/* <div className="max-w-480 mx-auto px-8 sm:px-12 lg:px-20 xl:px-32"> */}
                <div className="relative flex flex-col">
                    {/* Main navbar row */}
                    <div className="flex h-20 items-center justify-between w-full sm:h-24">
                        {/* Mobile menu button */}
                        <div className="flex items-center lg:hidden">
                            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-xl p-2.5 text-[#AC6C2A] hover:bg-orange-50 hover:text-[#F59B0F] transition-all duration-300">
                                <span className="sr-only">Open main menu</span>
                                <Bars3Icon aria-hidden="true" className="block h-7 w-7 group-data-open:hidden" />
                                <XMarkIcon aria-hidden="true" className="hidden h-7 w-7 group-data-open:block" />
                            </DisclosureButton>
                        </div>

                        {/* Logo - Centered on Mobile */}
                        <div className="flex items-center absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0">
                            <div className="flex items-center gap-4 group cursor-pointer">
                                <div className="relative h-12 w-20 overflow-hidden rounded-2xl bg-white shadow-xl ring-3 ring-[#F59B0F] transition-all duration-500 group-hover:scale-105 group-hover:ring-[#AC6C2A] group-hover:shadow-2xl sm:h-14 sm:w-20">
                                    <img
                                        src={logoImage}
                                        alt="DeliveryYa Logo"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className='font-black text-3xl bg-linear-to-r from-[#F59B0F] via-[#AC6C2A] to-[#F59B0F] bg-clip-text text-transparent tracking-tight'>
                                        DeliveryYa
                                    </h1>
                                    <p className="text-xs font-bold text-[#474645] tracking-wide">Fast & Fresh Delivery</p>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex lg:items-center lg:space-x-2">
                            {visibleNavigation.map((item) => {
                                const isCurrent = isCurrentPage(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        aria-current={isCurrent ? 'page' : undefined}
                                        className={classNames(
                                            isCurrent
                                                ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg scale-105'
                                                : 'text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F]',
                                            'relative rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-md'
                                        )}
                                    >
                                        {item.name}
                                        {isCurrent && (
                                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-linear-to-r from-transparent via-white to-transparent rounded-full"></span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right side icons - Desktop only */}
                        <div className="flex items-center sm:gap-2 shrink-0">

                            {/* Cart */}
                            {/* Search */}
                            <button
                                ref={searchButtonRef}
                                type="button"
                                onClick={toggleSearch}
                                className="hidden p-2 rounded-full hover:bg-orange-50 text-gray-700 hover:text-[#F59B0F] transition-all duration-300 lg:inline-flex"
                                aria-label="Search"
                                aria-expanded={isSearchOpen}
                            >
                                <MagnifyingGlassIcon className="h-6 w-6" />
                            </button>

                            {canUseCart && (
                                <Link to="/cart" className="relative hidden sm:flex p-2 sm:p-3 rounded-full hover:bg-orange-50 text-gray-700 hover:text-[#F59B0F] transition-all duration-300 group" aria-label="Go to cart">
                                    <ShoppingCartIcon className="h-6 w-6" />
                                    <span className="absolute -top-1 -right-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                </Link>
                            )}

                            {canUseNotifications && (
                                <NotificationsPanel
                                    isOpen={isNotificationsOpen}
                                    notificationCount={notificationCount}
                                    notifications={notifications}
                                    notificationsLoading={notificationsLoading}
                                    notificationsError={notificationsError}
                                    markingReadId={markingReadId}
                                    selectedNotification={selectedNotification}
                                    onToggle={toggleNotifications}
                                    onClose={() => setIsNotificationsOpen(false)}
                                    onRetry={() => setNotificationsLoaded(false)}
                                    onOpenNotification={(notification) => void handleOpenNotification(notification)}
                                    onCloseSelectedNotification={() => setSelectedNotification(null)}
                                />
                            )}

                            {isLoggedIn ? (
                                <ProfileMenu
                                    name={loggedInUserProfile?.name || 'User'}
                                    email={loggedInUserProfile?.email || ''}
                                    className="relative"
                                    buttonClassName="flex items-center gap-2 rounded-xl hover:bg-orange-50 p-2.5 transition-all duration-300 group"
                                    itemsClassName="absolute right-0 z-10 mt-3 w-64 origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-100 data-leave:ease-in overflow-hidden"
                                    headerClassName="bg-linear-to-r from-[#F59B0F] via-[#AC6C2A] to-[#F59B0F] px-5 py-4"
                                    trigger={
                                        <div className="h-10 w-10 rounded-full border-2 border-[#F59B0F] text-yellow-900 font-bold text-xs sm:text-sm shadow-md group-hover:shadow-lg transition-all overflow-hidden bg-white flex items-center justify-center">
                                            {loggedInUserProfile?.avatarUrl && !profileImageFailed ? (
                                                <img
                                                    src={loggedInUserProfile.avatarUrl}
                                                    alt={loggedInUserProfile.name || 'User profile'}
                                                    className="h-full w-full object-cover"
                                                    onError={() => setProfileImageFailed(true)}
                                                />
                                            ) : (
                                                <UserIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                                            )}
                                        </div>
                                    }
                                >
                                    <MenuItem>
                                                <Link
                                                    to="/deliverYya-cloud-console"
                                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F] rounded-xl transition-colors data-focus:bg-orange-50"
                                                >
                                                    <span className="text-xl">👤</span>
                                                    <span>Your Profile</span>
                                                </Link>
                                    </MenuItem>
                                    <MenuItem>
                                                <Link
                                                    to="/deliverYya-cloud-console/receiving-orders"
                                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F] rounded-xl transition-colors data-focus:bg-orange-50"
                                                >
                                                    <span className="text-xl">📦</span>
                                                    <span>My Orders</span>
                                                </Link>
                                    </MenuItem>

                                    {/* <MenuItem>
                                        <a
                                            href="#"
                                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F] rounded-xl transition-colors data-focus:bg-orange-50"
                                        >
                                            <span className="text-xl">⚙️</span>
                                            <span>Settings</span>
                                        </a>
                                    </MenuItem> */}
                                    <div className="border-t border-gray-100 p-2">
                                        <MenuItem>
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors data-focus:bg-red-50"
                                            >
                                                <span className="text-xl">🚪</span>
                                                <span>Sign out</span>
                                            </button>
                                        </MenuItem>
                                    </div>
                                </ProfileMenu>
                            ) : (
                                <Link
                                    to="/sign-in"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#F59B0F] text-[#AC6C2A] bg-white shadow-md hover:shadow-xl hover:border-[#AC6C2A] hover:text-[#F59B0F] transition-all duration-300 hover:scale-[1.03]"
                                    aria-label="Sign in"
                                    title="Sign in"
                                >
                                    <UserCircleIcon className="h-6 w-6" />
                                </Link>
                            )}
                        </div>

                        {/* Mobile Right side icons - Cart & Profile only */}

                    </div>

                </div>
                    </div>

            {/* Search panel (visible when search icon clicked) - reuse StoreSearch for consistent behavior */}
            {isSearchOpen && (
                <div ref={searchPanelRef} className="absolute left-0 right-0 top-full z-40 hidden lg:block">
                    <NavbarSearch onNavigate={() => setIsSearchOpen(false)} />
                </div>
            )}

            {/* Mobile menu panel */}
            <DisclosurePanel className="lg:hidden bg-white border-t-2 border-[#F59B0F]">
                <div className="space-y-1 px-4 py-4">
                    <div className="pb-4">
                        <NavbarSearch compact onNavigate={() => close()} />
                    </div>
                    {visibleNavigation.map((item) => {
                        const isCurrent = isCurrentPage(item.href);
                        return (
                            <DisclosureButton
                                key={item.name}
                                as={Link}
                                to={item.href}
                                aria-current={isCurrent ? 'page' : undefined}
                                className={classNames(
                                    isCurrent
                                        ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg'
                                        : 'text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F]',
                                    'block rounded-xl px-5 py-3.5 text-base font-bold transition-all'
                                )}
                            >
                                {item.name}
                            </DisclosureButton>
                        );
                    })}
                    {canUseCart && (
                        <DisclosureButton
                            as={Link}
                            to="/cart"
                            className="flex items-center justify-between rounded-xl px-5 py-3.5 text-base font-bold text-gray-700 transition-all hover:bg-orange-50 hover:text-[#F59B0F]"
                        >
                            <span className="flex items-center gap-3">
                                <ShoppingCartIcon className="h-5 w-5" />
                                <span>Cart</span>
                            </span>
                            <span className="rounded-full bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-2.5 py-1 text-xs font-black text-white shadow-sm">
                                {cartCount > 99 ? '99+' : cartCount}
                            </span>
                        </DisclosureButton>
                    )}
                    <div className="pt-3">
                        <button className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-5 py-3.5 rounded-xl font-bold shadow-lg">
                            <MdTrackChanges className="w-5 h-5" />
                            <span>Track Order</span>
                        </button>
                    </div>
                </div>
            </DisclosurePanel>
                </>
            )}
        </Disclosure>
    )
}
