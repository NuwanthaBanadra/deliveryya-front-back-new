import { ArrowLeftOnRectangleIcon, BuildingOffice2Icon, BuildingStorefrontIcon, ChevronDownIcon, ClipboardDocumentListIcon, DocumentTextIcon, ShoppingBagIcon, TruckIcon, UserCircleIcon, UsersIcon, BoltIcon, ChartBarIcon, CurrencyDollarIcon, UserGroupIcon, WalletIcon, TagIcon } from '@heroicons/react/24/outline';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImage from '../../../assets/images/logo.jpeg';
import { RiBankLine } from 'react-icons/ri';
import { BanknotesIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { ACCESS_DETAILS_UPDATED_EVENT, clearAccessDetails, ensureAccessDetails, hasAnyAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_GROUPS, FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import { MdOutlineDeliveryDining } from 'react-icons/md';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: number;
  allowedAccessIds?: readonly number[];
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: number;
  subItems?: SubMenuItem[];
  allowedAccessIds?: readonly number[];
}

interface MenuGroup {
  title: string;
  items: NavItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'PERSONAL',
    items: [
      {
        id: 'profile-panel',
        label: 'Profile Panel',
        icon: <UserCircleIcon className="w-5 h-5" />,
        href: '/deliverYya-cloud-console',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.PROFILE_PANEL],
      },
      {
        id: 'receiving-orders',
        label: 'My Orders',
        icon: <TruckIcon className="w-5 h-5" />,
        href: 'receiving-orders',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.RECEIVING_ORDERS],
      },
      {
        id: 'my-requests',
        label: 'My Requests',
        icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
        href: 'my-requests',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.MY_REQUESTS],
      },
      {
        id: 'my-complaints',
        label: 'My Complaints',
        icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
        href: 'my-complaints',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.MY_COMPLAINTS],
      },
    ],
  },
  {
    title: 'MARKETPLACE',
    items: [
      {
        id: 'markets',
        label: 'Markets',
        icon: <BuildingStorefrontIcon className="w-5 h-5" />,
        subItems: [
          { id: 'market-directory', label: 'Markets Directory', href: 'markets', icon: <BuildingStorefrontIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.VIEW_MARKETS] },
        ],
      },

      {
        id: 'my-market',
        label: 'My Market',
        icon: <ShoppingBagIcon className="w-5 h-5" />,
        subItems: [
          { id: 'manage-products', label: 'Manage Products', href: 'my-market', icon: <ShoppingBagIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.MY_MARKET_PRODUCTS] },
          { id: 'categories', label: 'Categories & Brands', href: 'my-market/categories', icon: <ClipboardDocumentListIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.MY_MARKET_CATEGORIES] },
        ],
      },
      {
        id: 'request-for-market',
        label: 'Request For Market',
        icon: <ShoppingBagIcon className="w-5 h-5" />,
        href: 'request-for-market',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.REQUEST_FOR_MARKET],
      },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      {
        id: 'add-orders',
        label: 'Add Orders',
        icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
        href: 'add-orders',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.ADD_ORDERS],
      },
      {
        id: 'ordercode-requests',
        label: 'Ordercode Requests',
        icon: <DocumentTextIcon className="w-5 h-5" />,
        href: 'ordercode-requests',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.ORDER_CODE_REQUESTS],
      },
      {
        id: 'placed-orders',
        label: 'Placed Orders',
        icon: <TruckIcon className="w-5 h-5" />,
        href: 'placed-orders',
        allowedAccessIds: FRONTEND_ACCESS_GROUPS.PLACED_ORDERS_ANY,
      },
      {
        id: 'order-checkout',
        label: 'Order Checkout',
        icon: <CurrencyDollarIcon className="w-5 h-5" />,
        href: 'order-checkout',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.ORDER_CHECKOUT],
      },
      {
        id: 'order-analytics',
        label: 'Order Analytics',
        icon: <ChartBarIcon className="w-5 h-5" />,
        href: 'order-analytics',
        allowedAccessIds: FRONTEND_ACCESS_GROUPS.ORDER_ANALYTICS_ANY,
      },
      {
        id: 'urgent-jobs',
        label: 'Urgent Jobs',
        icon: <BoltIcon className="w-5 h-5" />,
        href: 'urgent-jobs',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.URGENT_JOBS],
      },
    ],
  },
  {
    title: 'AGENT MANAGEMENT',
    items: [
      {
        id: 'agent-jobs',
        label: 'Agent Jobs',
        icon: <UserGroupIcon className="w-5 h-5" />,
        subItems: [
          { id: 'argent-jobs', label: 'Argent Jobs', href: 'employee-assignments', icon: <UserGroupIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.EMPLOYEE_ASSIGNMENTS] },
          { id: 'pickup-request-assignments', label: 'Pickup requests', href: 'employee-assignments/pickup-requests', icon: <TruckIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.PICKUP_REQUEST_ASSIGNMENTS] },
          { id: 'on-hand-orders', label: 'On hand orders', href: 'employee-assignments/on-hand-orders', icon: <ClipboardDocumentListIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.ON_HAND_ORDERS] },
          { id: 'delivery-history', label: 'Delivery History', href: 'employee-assignments/delivery-history', icon: <TruckIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.ON_HAND_ORDERS] },
        ],
      },
      {
        id: 'agent-payment-handover',
        label: 'Agent Payment Handover',
        icon: <BanknotesIcon className="w-5 h-5" />,
        href: 'agent-payment-handover',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.PAYMENT_HANDOVER],
      },
      {
        id: 'deliery-fees',
        label: 'Delivery Fees',
        icon: <MdOutlineDeliveryDining className="w-5 h-5" />,
        href: 'delivery-fees',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.DELIVERY_FEES_MANAGEMENT, FRONTEND_ACCESS_IDS.DELIVERY_FEES_VIEW],
      },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <ChartBarIcon className="w-5 h-5" />,
        href: 'dashboard',
        allowedAccessIds: FRONTEND_ACCESS_GROUPS.DASHBOARD_ANY,
      },
      {
        id: 'manage-users',
        label: 'Manage Users',
        icon: <UsersIcon className="w-5 h-5" />,
        href: 'manage-users',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.MANAGE_USERS],
      },
      {
        id: 'verify-documents',
        label: 'Verify Documents',
        icon: <DocumentTextIcon className="w-5 h-5" />,
        href: 'verify-documents',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.VERIFY_DOCUMENTS],
      },
      {
        id: 'user-requests',
        label: 'User Requests',
        icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
        href: 'user-requests',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.USER_REQUESTS_MANAGE],
      },
      {
        id: 'complaints-management',
        label: 'Manage Complaints',
        icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
        href: 'complaints',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.COMPLAINTS_MANAGEMENT],
      },
      {
        id: 'branches',
        label: 'Manage Branches',
        icon: <BuildingOffice2Icon className="w-5 h-5" />,
        href: 'branches',
        allowedAccessIds: FRONTEND_ACCESS_GROUPS.BRANCHES_ANY,
      },
      {
        id: 'access-management',
        label: 'Access Management',
        icon: <ShieldCheckIcon className="w-5 h-5" />,
        subItems: [
          {
            id: 'access-catalog', label: 'Accesses & APIs', href: 'access-management/accesses', icon: <ShieldCheckIcon className="w-4 h-4" />,
            allowedAccessIds: [FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT],
          },
          {
            id: 'user-roles', label: 'User Roles', href: 'access-management/roles', icon: <UsersIcon className="w-4 h-4" />,
            allowedAccessIds: [FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT],
          },
          {
            id: 'user-access-control', label: 'User Access Control', href: 'access-management/users', icon: <UserCircleIcon className="w-4 h-4" />,
            allowedAccessIds: [FRONTEND_ACCESS_IDS.ACCESS_MANAGEMENT],
          },
        ],
        allowedAccessIds: FRONTEND_ACCESS_GROUPS.ACCESS_MANAGEMENT_ANY,
      },
      {
        id: 'discounts',
        label: 'Discounts',
        icon: <TagIcon className="w-5 h-5" />,
        href: 'discounts',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.DISCOUNTS_MANAGEMENT],
      },
      // {
      //   id: 'reports',
      //   label: 'Reports',
      //   icon: <DocumentTextIcon className="w-5 h-5" />,
      //   subItems: [
      //     { id: 'settlement-report', label: 'Settlement Report', href: 'settlement-report', icon: <DocumentTextIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.SETTLEMENT_REPORT] },
      //     { id: 'user-monthly-orders', label: 'User Monthly Orders', href: 'user-monthly-orders', icon: <DocumentTextIcon className="w-4 h-4" />, allowedAccessIds: [FRONTEND_ACCESS_IDS.USER_MONTHLY_ORDERS] },
      //   ],
      //   allowedAccessIds: FRONTEND_ACCESS_GROUPS.REPORTS_ANY,
      // },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      {
        id: 'accounts',
        label: 'Accounts',
        icon: <RiBankLine className="w-5 h-5" />,
        href: 'accounts',
        allowedAccessIds: FRONTEND_ACCESS_GROUPS.ACCOUNTS_ANY,
      },
      {
        id: 'bank-details',
        label: 'Bank Details',
        icon: <BanknotesIcon className="w-5 h-5" />,
        href: 'bank-details',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.BANK_DETAILS],
      },
      {
        id: 'company-wallet',
        label: 'Company Wallet',
        icon: <WalletIcon className="w-5 h-5" />,
        href: 'company-wallet',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.COMPANY_WALLET],
      },
      {
        id: 'agent-wallet',
        label: 'Agent Wallet',
        icon: <WalletIcon className="w-5 h-5" />,
        href: 'agent-wallet',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.AGENT_WALLET],
      },
      {
        id: 'client-market-owner-wallet',
        label: 'Client / Market Owner Wallet',
        icon: <WalletIcon className="w-5 h-5" />,
        href: 'client-market-owner-wallet',
        allowedAccessIds: [FRONTEND_ACCESS_IDS.CLIENT_MARKET_OWNER_WALLET],
      },
    ],
  }
];

const isAllowedMenuItem = (
  allowedAccessIds?: readonly number[]
): boolean => {
  if (allowedAccessIds && allowedAccessIds.length > 0) {
    return hasAnyAccess(allowedAccessIds);
  }

  return true;
};

const getActiveItemFromPath = (pathname: string): string => {
  // Normalize pathname by removing the cloud console base path
  const normalized = pathname.replace(/^\/deliverYya-cloud-console\/?/, '').split('?')[0];

  // Check in order of specificity (longest paths first)
  if (normalized.startsWith('my-market/categories')) return 'categories';
  if (normalized.startsWith('my-market/add-product')) return 'add-product';
  if (normalized.startsWith('my-market')) return 'manage-products';
  if (normalized.startsWith('access-management/user-access-control')) return 'user-access-control';
  if (normalized.startsWith('access-management/users')) return 'user-access-control';
  if (normalized.startsWith('access-management/roles')) return 'user-roles';
  if (normalized.startsWith('access-management/accesses')) return 'access-catalog';
  if (normalized.startsWith('access-management')) return 'access-catalog';
  if (normalized.startsWith('my-requests')) return 'my-requests';
  if (normalized.startsWith('request-for-market')) return 'request-for-market';
  if (normalized.startsWith('user-requests')) return 'user-requests';
  if (normalized.startsWith('markets/categories')) return 'market-directory';
  if (normalized.startsWith('markets')) return 'market-directory';
  if (normalized.startsWith('ordercode-requests')) return 'ordercode-requests';
  if (normalized.startsWith('manage-users')) return 'manage-users';
  if (normalized.startsWith('branches')) return 'branches';
  if (normalized.startsWith('verify-documents')) return 'verify-documents';
  if (normalized.startsWith('my-complaints')) return 'my-complaints';
  if (normalized.startsWith('complaints')) return 'complaints-management';
  if (normalized.startsWith('receiving-orders')) return 'receiving-orders';
  if (normalized.startsWith('dashboard')) return 'dashboard';
  if (normalized.startsWith('add-orders')) return 'add-orders';
  if (normalized.startsWith('placed-orders')) return 'placed-orders';
  if (normalized.startsWith('order-checkout')) return 'order-checkout';
  if (normalized.startsWith('order-analytics')) return 'order-analytics';
  if (normalized.startsWith('employee-assignments/pickup-requests')) return 'pickup-request-assignments';
  if (normalized.startsWith('employee-assignments/on-hand-orders')) return 'on-hand-orders';
  if (normalized.startsWith('employee-assignments/delivery-history')) return 'delivery-history';
  if (normalized.startsWith('employee-assignments/argent-jobs')) return 'argent-jobs';
  if (normalized.startsWith('employee-assignments')) return 'argent-jobs';
  if (normalized.startsWith('urgent-jobs')) return 'urgent-jobs';
  if (normalized.startsWith('accounts')) return 'accounts';
  if (normalized.startsWith('bank-details')) return 'bank-details';
  if (normalized.startsWith('company-wallet')) return 'company-wallet';
  if (normalized.startsWith('agent-wallet')) return 'agent-wallet';
  if (normalized.startsWith('delivery-fees')) return 'deliery-fees';
  if (normalized.startsWith('discounts')) return 'discounts';
  if (normalized.startsWith('settlement-report')) return 'settlement-report';
  if (normalized.startsWith('user-monthly-orders')) return 'user-monthly-orders';

  return 'profile-panel';
};

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setAccessDetailsVersion] = useState(0);
  const [activeItem, setActiveItem] = useState<string>(() =>
    getActiveItemFromPath(location.pathname)
  );
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    'my-market',
    'markets',
    'agent-jobs',
    'access-management',
  ]);
  const [isHovered, setIsHovered] = useState(false);
  const userNavigatedRef = useRef(false);

  const isParentItemActive = (item: NavItem) => {
    if (!item.subItems) return activeItem === item.id;
    return item.subItems.some((subItem) => subItem.id === activeItem);
  };

  // Update active item when location changes (for back/forward button support)
  useEffect(() => {
    const refreshVisibleMenus = () => setAccessDetailsVersion((version) => version + 1);

    window.addEventListener(ACCESS_DETAILS_UPDATED_EVENT, refreshVisibleMenus);
    void ensureAccessDetails().finally(refreshVisibleMenus);

    return () => {
      window.removeEventListener(ACCESS_DETAILS_UPDATED_EVENT, refreshVisibleMenus);
    };
  }, []);

  useEffect(() => {
    // Only update from path if not a user-initiated navigation
    if (!userNavigatedRef.current) {
      setActiveItem(getActiveItemFromPath(location.pathname));
    }
    userNavigatedRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    const parentWithActiveChild = menuGroups
      .flatMap((group) => group.items)
      .find((item) => item.subItems?.some((subItem) => subItem.id === activeItem));

    if (parentWithActiveChild) {
      setExpandedMenus((prev) =>
        prev.includes(parentWithActiveChild.id) ? prev : [...prev, parentWithActiveChild.id]
      );
    }
  }, [activeItem]);

  const handleNavigate = (itemId: string, href: string) => {
    userNavigatedRef.current = true;
    setActiveItem(itemId);
    navigate(href);
    if (window.innerWidth < 1024) onClose?.();
  };

  const toggleMenu = (id: string) => {
    setExpandedMenus((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    clearAccessDetails();
    navigate('/sign-in', { replace: true });
  };

  // Check if sidebar should show expanded view
  const isExpanded = isOpen || isHovered;
  const visibleMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (!item.subItems) {
            return isAllowedMenuItem(item.allowedAccessIds) ? item : null;
          }

          const visibleSubItems = item.subItems.filter((subItem) => isAllowedMenuItem(subItem.allowedAccessIds));

          if (visibleSubItems.length === 0) {
            return null;
          }

          return {
            ...item,
            subItems: visibleSubItems,
          };
        })
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile Overlay - Only on small screens */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-xl z-50 transition-all duration-300 transform flex flex-col group ${isOpen
          ? 'w-64 translate-x-0'
          : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0 lg:hover:w-64 lg:hover:shadow-2xl'
          }`}
      >
        {/* Logo Section - At Top */}
        <div className={`border-b border-gray-200 bg-linear-to-r from-orange-50 to-transparent shrink-0 transition-all duration-300 ${isExpanded ? 'px-6 py-5' : 'lg:px-0 lg:py-3.5 px-6 py-5'
          }`}>
          {/* Collapsed Layout - Centered Logo */}
          {!isExpanded && (
            <div className="hidden lg:flex items-center justify-center w-full group/logo cursor-pointer">
              <div className="relative w-14 h-11 rounded-xl overflow-hidden shadow-md ring-2 ring-[#F59B0F] group-hover/logo:ring-[#AC6C2A] group-hover/logo:shadow-lg transition-all duration-300 group-hover/logo:scale-105 bg-white">
                <img
                  src={logoImage}
                  alt="DeliveryYa Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Expanded Layout - Full Logo with Text */}
          <div className={`flex items-center gap-3 group/logo cursor-pointer ${!isExpanded ? 'lg:hidden' : ''
            }`}>
            <div className="relative h-11 w-15 shrink-0 rounded-xl overflow-hidden bg-white shadow-md ring-2 ring-[#F59B0F] transition-all duration-300 group-hover/logo:scale-105 group-hover/logo:ring-[#AC6C2A] group-hover/logo:shadow-lg">
              <img
                src={logoImage}
                alt="DeliveryYa Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 overflow-hidden whitespace-nowrap">
              <h2 className="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] bg-clip-text text-[21px] font-black leading-tight text-transparent">
                DeliveryYa
              </h2>
              <p className="text-[12px] text-gray-500 font-semibold">Cloud Console</p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            title="Close sidebar"
            className="absolute top-5 right-4 lg:hidden p-2 rounded-lg hover:bg-orange-100 text-gray-500 hover:text-[#F59B0F] transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items - Scrollable */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition-all duration-300 ${isExpanded ? 'px-3' : 'lg:px-2 px-3'
          }`}>
          {visibleMenuGroups.map((group, groupIndex) => (

            <div key={groupIndex} className="space-y-1 mb-6">
              {/* Group Title - Hidden when collapsed on desktop */}
              <h3 className={`text-xs font-bold text-gray-400 uppercase tracking-wider transition-all duration-300 ${isExpanded ? 'px-3 mb-2 opacity-100 h-auto' : 'lg:px-0 lg:mb-0 lg:opacity-0 lg:h-0 lg:overflow-hidden px-3 mb-2 opacity-100'
                }`}>
                {group.title}
              </h3>

              {/* Group Items */}
              {group.items.map((item) => {
                const parentActive = isParentItemActive(item);

                return (
                  <div key={item.id}>
                    {/* Main Menu Item */}
                    <button
                      type="button"
                      title={item.label}
                      onClick={() => {
                        if (item.subItems) {
                          toggleMenu(item.id);
                        } else if (item.href) {
                          handleNavigate(item.id, item.href);
                        }
                      }}
                      className={`w-full rounded-lg font-semibold text-sm transition-all duration-300 group/item relative ${parentActive
                        ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg'
                        : 'text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F]'
                        } ${isExpanded ? 'px-3 py-3' : 'lg:px-2.5 lg:py-2.5 px-3 py-3'
                        }`}
                    >
                      {/* Collapsed Layout - Centered Icon Only */}
                      {!isExpanded && (
                        <div className="hidden lg:flex items-center justify-center w-full">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${parentActive ? 'bg-white/20 scale-105' : 'group-hover/item:bg-white/10'
                            }`}>
                            <span className="[&>svg]:h-4.5 [&>svg]:w-4.5 [&>svg]:stroke-[2.2]">
                              {item.icon}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Expanded Layout - Full Content */}
                      <div className={`flex items-center justify-between w-full ${!isExpanded ? 'lg:hidden' : ''
                        }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`transition-all duration-300 shrink-0 ${parentActive ? 'scale-110' : 'group-hover/item:scale-110'
                            }`}>
                            {item.icon}
                          </span>
                          <span className="whitespace-nowrap overflow-hidden">
                            {item.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${parentActive
                                ? 'bg-white/30 text-white'
                                : 'bg-[#F59B0F] text-white'
                                }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.subItems && (
                            <ChevronDownIcon
                              className={`w-4 h-4 transition-transform duration-300 ${expandedMenus.includes(item.id) ? 'rotate-180' : ''
                                }`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Hover tooltip for collapsed state */}
                      {!isExpanded && (
                        <div className="hidden lg:group-hover/item:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                          {item.label}
                          {item.badge && (
                            <span className="ml-2 px-1.5 py-0.5 bg-[#F59B0F] rounded-full">{item.badge}</span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Inline sub-menu when the sidebar is open */}
                    {item.subItems && expandedMenus.includes(item.id) && isOpen && (
                      <div className="ml-9 mt-1 space-y-1 animate-slideDown">
                        {item.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            type="button"
                            title={subItem.label}
                            onClick={() => handleNavigate(subItem.id, subItem.href)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 group/subitem ${activeItem === subItem.id
                              ? 'bg-orange-100 text-[#F59B0F] font-bold scale-[1.01]'
                              : 'text-gray-600 hover:bg-orange-50 hover:text-[#F59B0F]'
                              }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full bg-current transition-transform group-hover/subitem:scale-125 ${activeItem === subItem.id ? 'scale-125' : ''}`}></span>
                              {subItem.label}
                            </span>
                            {subItem.badge && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F59B0F] text-white">
                                {subItem.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Icon-only flyout while the desktop sidebar is collapsed */}
                    {item.subItems && expandedMenus.includes(item.id) && !isOpen && isHovered && (
                      <div className="absolute left-full ml-1 top-0 z-[60] hidden min-w-12 flex-col gap-1 rounded-xl border border-orange-100 bg-white p-1.5 shadow-xl lg:flex">
                        {item.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            type="button"
                            title={subItem.label}
                            aria-label={subItem.label}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleNavigate(subItem.id, subItem.href);
                            }}
                            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${activeItem === subItem.id
                              ? 'bg-[#F59B0F] text-white shadow-md'
                              : 'text-gray-600 hover:bg-orange-50 hover:text-[#F59B0F]'
                              }`}
                          >
                            {subItem.icon ?? item.icon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Logout Section - At Bottom */}
        <div className={`border-t border-gray-200 bg-linear-to-t from-gray-50 to-transparent shrink-0 transition-all duration-300 ${isExpanded ? 'px-4 py-4' : 'lg:px-2 lg:py-4 px-4 py-4'
          }`}>
          <button
            type="button"
            title="Logout"
            onClick={handleLogout}
            className={`w-full rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group/logout relative ${isExpanded ? 'px-4 py-3' : 'lg:px-2.5 lg:py-2.5 px-4 py-3'
              }`}
          >
            {/* Collapsed Layout - Centered Icon Only */}
            {!isExpanded && (
              <div className="hidden lg:flex items-center justify-center w-full">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 group-hover/logout:bg-white/20 transition-all duration-300">
                  <ArrowLeftOnRectangleIcon className="w-4.5 h-4.5 stroke-[2.2] transition-transform group-hover/logout:-translate-x-0.5" />
                </div>
              </div>
            )}

            {/* Expanded Layout - Full Content */}
            <div className={`flex items-center justify-center gap-2 ${!isExpanded ? 'lg:hidden' : ''
              }`}>
              <ArrowLeftOnRectangleIcon className="w-5 h-5 transition-transform group-hover/logout:-translate-x-1" />
              <span className="whitespace-nowrap">
                Logout
              </span>
            </div>

            {/* Hover tooltip for collapsed state */}
            {!isExpanded && (
              <div className="hidden lg:group-hover/logout:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Spacer for layout - Dynamic width based on sidebar state */}
      <div
        className={`hidden lg:block shrink-0 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'
          }`}
      />
    </>
  );
}

export default Sidebar;
