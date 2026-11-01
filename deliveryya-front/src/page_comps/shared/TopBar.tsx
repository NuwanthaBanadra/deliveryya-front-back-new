import { MenuItem } from '@headlessui/react';
import { Bars3Icon, EnvelopeIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { IoSearchSharp } from 'react-icons/io5';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../util/AxiosUtil.ts';
import { hasAccess } from '../../util/AccessController.ts';
import { FRONTEND_ACCESS_IDS } from '../../util/FrontendAccess.ts';
import JwtUtil from '../../util/JwtUtil.tsx';
import NotificationsPanel, { type NotificationItem } from './NotificationsPanel.tsx';
import ProfileMenu from './ProfileMenu.tsx';
import { buildUserProfileFromSession, type LoggedInUserProfile } from '../../util/UserProfileUtil.ts';

type NotificationResponse = {
  object?: {
    pageNumber: number;
    countPerPage: number;
    totalCount: number;
    totalPages: number;
    items: NotificationItem[];
    userId: number;
  } | null;
  message?: string;
};

interface TopBarProps {
  onMenuToggle?: (open: boolean) => void;
  isSidebarOpen?: boolean;
  currentPage?: string;
  showMessages?: boolean;
}

function TopBar({ onMenuToggle, isSidebarOpen, currentPage = 'Dashboard', showMessages = true }: TopBarProps) {
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [loggedInUserProfile, setLoggedInUserProfile] = useState<LoggedInUserProfile | null>(
    () => buildUserProfileFromSession(),
  );
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('jwtToken');
    return token ? JwtUtil.validateToken(token) : false;
  });
  const canUseNavbar = !isLoggedIn || hasAccess(FRONTEND_ACCESS_IDS.NAVBAR_ACCESS);
  const canUseNotifications = !isLoggedIn || hasAccess(FRONTEND_ACCESS_IDS.NOTIFICATION_ACCESS);

  useEffect(() => {
    const updateAuthState = () => {
      const token = localStorage.getItem('jwtToken');
      const isValid = token ? JwtUtil.validateToken(token) : false;
      setIsLoggedIn(isValid);
      setLoggedInUserProfile(isValid ? buildUserProfileFromSession() : null);
      setProfileImageFailed(false);
    };

    updateAuthState();
    window.addEventListener('storage', updateAuthState);
    window.addEventListener('focus', updateAuthState);

    return () => {
      window.removeEventListener('storage', updateAuthState);
      window.removeEventListener('focus', updateAuthState);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !canUseNotifications || notificationsLoaded) {
      return;
    }

    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true);
        setNotificationsError('');

        const response = await axiosInstance.post<NotificationResponse>('/notifications/get-all-notifications', {
          pageNumber: 0,
          countPerPage: 10,
        });

        setNotifications(response.data?.object?.items ?? []);
        setNotificationsLoaded(true);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        setNotificationsError('Unable to load notifications right now.');
      } finally {
        setNotificationsLoading(false);
      }
    };

    void loadNotifications();
  }, [isLoggedIn, canUseNotifications, notificationsLoaded]);

  const handleMenuClick = () => {
    onMenuToggle?.(!isSidebarOpen);
  };

  const toggleNotifications = () => {
    if (!isLoggedIn || !canUseNotifications) {
      return;
    }

    setIsNotificationsOpen((open) => !open);
  };

  const notificationCount = notifications.filter((notification) => !notification.isRead).length;

  const handleOpenNotification = async (notification: NotificationItem) => {
    setSelectedNotification(notification);

    if (notification.isRead) {
      return;
    }

    try {
      setMarkingReadId(notification.id);
      await axiosInstance.put(`/notifications/mark-as-read?id=${notification.id}`);

      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
      );

      setSelectedNotification((current) =>
        current && current.id === notification.id ? { ...current, isRead: true } : current,
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
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

  return (
    <div
      className={`fixed top-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm transition-all duration-300 ${isSidebarOpen ? 'left-0 lg:left-64' : 'left-0 lg:left-20'
        }`}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Menu Toggle & Title */}
          <div className="flex items-center gap-4">
            {/* Menu Toggle - All Screens */}
            <button
              onClick={handleMenuClick}
              className="p-2 rounded-lg hover:bg-orange-50 text-gray-600 hover:text-[#F59B0F] transition-all duration-300"
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {/* Desktop: Always show triple-bar icon */}
              <Bars3Icon className="hidden md:block w-6 h-6" />

              {/* Mobile/Tablet: Toggle between X and triple-bar */}
              {isSidebarOpen ? (
                <XMarkIcon className="md:hidden w-6 h-6" />
              ) : (
                <Bars3Icon className="md:hidden w-6 h-6" />
              )}
            </button>

            {/* Title */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] bg-clip-text text-transparent">
                {currentPage}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Welcome back!</p>
            </div>
          </div>

          {/* Center: Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 transition-all duration-300 ${searchFocused
                ? 'border-[#F59B0F] bg-orange-50 shadow-md'
                : 'border-gray-200 bg-gray-50 hover:border-[#F59B0F]/50'
                }`}
            >
              <IoSearchSharp className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
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
                onOpenNotification={(notification) => {
                  void handleOpenNotification(notification);
                }}
                onCloseSelectedNotification={() => setSelectedNotification(null)}
              />
            )}

            {/* Messages */}
            {showMessages && canUseNotifications && (
              <button
                title="Messages"
                aria-label="Messages"
                className="relative p-2 rounded-lg hover:bg-orange-50 text-gray-600 hover:text-[#F59B0F] transition-all duration-300"
              >
                <EnvelopeIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="absolute top-1 right-1 px-1 py-0 text-xs font-bold text-white bg-orange-500 rounded-full">2</span>
              </button>
            )}

            {isLoggedIn ? (
              <ProfileMenu
                name={loggedInUserProfile?.name || 'User'}
                email={loggedInUserProfile?.email || ''}
                buttonClassName="flex items-center gap-2 p-1.5 rounded-lg hover:bg-orange-50 transition-all duration-300 group"
                itemsClassName="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-100 data-leave:ease-in overflow-hidden"
                headerClassName="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-4"
                trigger={
                  <>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow">
                      {loggedInUserProfile?.avatarUrl && !profileImageFailed ? (
                        <img
                          src={loggedInUserProfile.avatarUrl}
                          alt={loggedInUserProfile.name || 'User profile'}
                          className="w-full h-full rounded-full object-cover"
                          onError={() => setProfileImageFailed(true)}
                        />
                      ) : (
                        <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm font-semibold text-gray-700 group-hover:text-[#F59B0F] transition-colors">
                      Profile
                    </span>
                  </>
                }
              >
                <MenuItem>
                  <Link
                    to="/home"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F] rounded-xl transition-colors data-focus:bg-orange-50"
                  >
                    <span className="text-xl">🏠</span>
                    <span>Home</span>
                  </Link>
                </MenuItem>
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
                  <button className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F] rounded-lg transition-colors duration-300">
                    <span className="text-lg">⚙️</span>
                    <span>Settings</span>
                  </button>
                </MenuItem> */}
                <div className="border-t border-gray-100 p-2">
                  <MenuItem>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-300"
                    >
                      <span className="text-lg">🚪</span>
                      <span>Logout</span>
                    </button>
                  </MenuItem>
                </div>
              </ProfileMenu>
            ) : (
              <Link
                to="/sign-in"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold text-white bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:shadow-lg transition-all duration-300"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Search */}
          <div className="md:hidden absolute left-0 right-0 top-full bg-white border-t border-gray-200 px-4 py-3 hidden group-hover:block">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-gray-50">
              <IoSearchSharp className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="flex-1 bg-transparent outline-none text-sm text-gray-700"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
