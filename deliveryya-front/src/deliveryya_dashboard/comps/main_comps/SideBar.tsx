import {
  ArrowLeftOnRectangleIcon,
  BoltIcon, BuildingStorefrontIcon, ChartBarIcon, ChevronDownIcon, ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  TruckIcon, UserGroupIcon, WalletIcon, TagIcon
} from '@heroicons/react/24/outline';
import React from 'react';
import { RiBankLine } from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';
import logoImage from '../../../assets/images/logo.jpeg';
import type { DecodedUserData } from '../../../types/EntitiesTypes';
import JwtUtil from '../../../util/JwtUtil';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  href: string;
  badge?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: number;
  subItems?: SubMenuItem[];
}

interface MenuGroup {
  title: string;
  items: NavItem[];
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = React.useState('dashboard');
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);
  const [isHovered, setIsHovered] = React.useState(false);
  const [showMarketSection, setShowMarketSection] = React.useState(false);

  // React.useEffect(() => {
  //   const path = location.pathname;

  //   if (path.includes('/order-checkout-confirmation')) {
  //     setActiveItem('order-checkout');
  //     return;
  //   }
  //   if (path.includes('/order-checkout')) {
  //     setActiveItem('order-checkout');
  //     return;
  //   }
  //   if (path.includes('/order-analytics')) {
  //     setActiveItem('order-analytics');
  //     return;
  //   }
  //   if (path.includes('/employee-assignments')) {
  //     setActiveItem('employee-assignments');
  //     return;
  //   }
  //   if (path.includes('/urgent-jobs')) {
  //     setActiveItem('urgent-jobs');
  //     return;
  //   }
  //   if (path.includes('/placed-orders')) {
  //     setActiveItem('placed-orders');
  //     return;
  //   }
  //   if (path.includes('/add-orders')) {
  //     setActiveItem('add-orders');
  //     return;
  //   }

  //   setActiveItem('dashboard');
  // }, [location.pathname]);

  const toggleMenu = (id: string) => {
    setExpandedMenus((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Check if sidebar should show expanded view
  const isExpanded = isOpen || isHovered;

  const menuGroups: MenuGroup[] = [
    {
      title: 'MAIN MENU',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <ChartBarIcon className="w-5 h-5" />,
          href: 'dashboard',
        },
        {
          id: 'add-orders',
          label: 'Add Orders',
          icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
          href: 'add-orders',
        },
        {
          id: 'placed-orders',
          label: 'Placed Orders',
          icon: <TruckIcon className="w-5 h-5" />,
          href: 'placed-orders',
        },
        {
          id: 'order-checkout',
          label: 'Order Checkout',
          icon: <CurrencyDollarIcon className="w-5 h-5" />,
          href: 'order-checkout',
        },
        // {
        //   id: 'order-analytics',
        //   label: 'Order Analytics',
        //   icon: <ChartBarIcon className="w-5 h-5" />,
        //   href: 'order-analytics',
        // },
        {
          id: 'employee-assignments',
          label: 'Employee Assignments',
          icon: <UserGroupIcon className="w-5 h-5" />,
          href: 'employee-assignments',
        },
        {
          id: 'agent-payment-handover',
          label: 'Agent Payment Handover',
          icon: <BanknotesIcon className="w-5 h-5" />,
          href: 'agent-payment-handover',
        },
        {
          id: 'urgent-jobs',
          label: 'Urgent Jobs',
          icon: <BoltIcon className="w-5 h-5" />,
          href: 'urgent-jobs',
        },
        {
          id: 'Accounts',
          label: 'Accounts',
          icon: <RiBankLine className="w-5 h-5" />,
          href: 'accounts',
        },
        {
          id: 'company-wallet',
          label: 'Company Wallet',
          icon: <WalletIcon className="w-5 h-5" />,
          href: 'company-wallet',
        },
        {
          id: 'agent-wallet',
          label: 'Agent Wallet',
          icon: <WalletIcon className="w-5 h-5" />,
          href: 'agent-wallet',
        },
        {
          id: 'discounts',
          label: 'Discounts',
          icon: <TagIcon className="w-5 h-5" />,
          href: 'discounts',
        },
        // {
        //   id: 'my-market',
        //   label: 'My Market',
        //   icon: <ShoppingBagIcon className="w-5 h-5" />,
        //   badge: 12,
        //   subItems: [
        //     { id: 'manage-products', label: 'Manage Products', href: '/advance-panel/my-market' },
        //     { id: 'add-product', label: 'Add Product', href: '/advance-panel/my-market/add-product' },
        //     { id: 'categories', label: 'Categories', href: '/advance-panel/my-market/categories' },
        //     { id: 'brands', label: 'Brands', href: '/advance-panel/my-market/brands' },
        //   ],
        // },
      ],
    },
    // {
    //   title: 'MANAGEMENT',
    //   items: [
    //     {
    //       id: 'orders',
    //       label: 'Orders',
    //       icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
    //       badge: 8,
    //       subItems: [
    //         { id: 'all-orders', label: 'All Orders', href: '#' },
    //         { id: 'pending', label: 'Pending', href: '#', badge: 5 },
    //         { id: 'processing', label: 'Processing', href: '#', badge: 3 },
    //         { id: 'completed', label: 'Completed', href: '#' },
    //         { id: 'cancelled', label: 'Cancelled', href: '#' },
    //       ],
    //     },
    //     {
    //       id: 'products',
    //       label: 'Products',
    //       icon: <ShoppingBagIcon className="w-5 h-5" />,
    //       badge: 12,
    //       subItems: [
    //         { id: 'all-products', label: 'All Products', href: '#' },
    //         { id: 'add-product', label: 'Add Product', href: '#' },
    //         { id: 'categories', label: 'Categories', href: '#' },
    //         { id: 'brands', label: 'Brands', href: '#' },
    //       ],
    //     },
    //     {
    //       id: 'delivery',
    //       label: 'Delivery',
    //       icon: <TruckIcon className="w-5 h-5" />,
    //       subItems: [
    //         { id: 'active-deliveries', label: 'Active Deliveries', href: '#', badge: 4 },
    //         { id: 'delivery-partners', label: 'Delivery Partners', href: '#' },
    //         { id: 'delivery-zones', label: 'Delivery Zones', href: '#' },
    //       ],
    //     },
    //     {
    //       id: 'users',
    //       label: 'Users',
    //       icon: <UserGroupIcon className="w-5 h-5" />,
    //       subItems: [
    //         { id: 'customers', label: 'Customers', href: '#' },
    //         { id: 'admins', label: 'Admins', href: '#' },
    //         { id: 'roles', label: 'Roles & Permissions', href: '#' },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   title: 'ANALYTICS',
    //   items: [
    //     {
    //       id: 'analytics',
    //       label: 'Analytics',
    //       icon: <ChartBarIcon className="w-5 h-5" />,
    //       href: '#',
    //     },
    //     {
    //       id: 'sales',
    //       label: 'Sales Report',
    //       icon: <CurrencyDollarIcon className="w-5 h-5" />,
    //       href: '#',
    //     },
    //   ],
    // },
    // {
    //   title: 'SETTINGS',
    //   items: [
    //     {
    //       id: 'promotions',
    //       label: 'Promotions',
    //       icon: <TagIcon className="w-5 h-5" />,
    //       href: '#',
    //     },
    //     {
    //       id: 'notifications',
    //       label: 'Notifications',
    //       icon: <BellAlertIcon className="w-5 h-5" />,
    //       badge: 3,
    //       href: '#',
    //     },
    //     {
    //       id: 'settings',
    //       label: 'Settings',
    //       icon: <Cog6ToothIcon className="w-5 h-5" />,
    //       href: '#',
    //     },
    //   ],
    // },
  ];

  const sidebarMenuGroups: MenuGroup[] = showMarketSection
    ? [
      ...menuGroups,
      {
        title: 'MARKET',
        items: [
          {
            id: 'request-for-market',
            label: 'Request For Market',
            icon: <BuildingStorefrontIcon className="w-5 h-5" />,
            href: 'request-for-market',
          },
          {
            id: 'user-requests',
            label: 'User Requests',
            icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
            href: 'user-requests',
          },
        ],
      },
    ]
    : menuGroups;

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    navigate('/sign-in', { replace: true });
  };

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
        <div className={`border-b border-gray-200 bg-gradient-to-r from-orange-50 to-transparent flex-shrink-0 transition-all duration-300 ${isExpanded ? 'px-6 py-5' : 'lg:px-0 lg:py-3.5 px-6 py-5'
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
            <div className="relative w-12 h-10 rounded-xl overflow-hidden shadow-md ring-2 ring-[#F59B0F] group-hover/logo:ring-[#AC6C2A] group-hover/logo:shadow-lg transition-all duration-300 group-hover/logo:scale-105 bg-white flex-shrink-0">
              <img
                src={logoImage}
                alt="DeliveryYa Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 overflow-hidden whitespace-nowrap">
              <h2 className="font-black text-lg bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] bg-clip-text text-transparent leading-tight">
                DeliveryYa
              </h2>
              <p className="text-xs text-gray-500 font-semibold">Admin Panel</p>
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
          {sidebarMenuGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1 mb-6">
              {/* Group Title - Hidden when collapsed on desktop */}
              <h3 className={`text-xs font-bold text-gray-400 uppercase tracking-wider transition-all duration-300 ${isExpanded ? 'px-3 mb-2 opacity-100 h-auto' : 'lg:px-0 lg:mb-0 lg:opacity-0 lg:h-0 lg:overflow-hidden px-3 mb-2 opacity-100'
                }`}>
                {group.title}
              </h3>

              {/* Group Items */}
              {group.items.map((item) => (
                <div key={item.id}>
                  {/* Main Menu Item */}
                  <button
                    type="button"
                    title={item.label}
                    onClick={() => {
                      if (item.subItems) {
                        toggleMenu(item.id);
                      } else if (item.href) {
                        setActiveItem(item.id);
                        navigate(item.href);
                        if (window.innerWidth < 1024) onClose?.();
                      }
                    }}
                    className={`w-full rounded-lg font-semibold text-sm transition-all duration-300 group/item relative overflow-hidden ${activeItem === item.id && !item.subItems
                      ? 'bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg'
                      : 'text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F]'
                      } ${isExpanded ? 'px-3 py-3' : 'lg:px-2.5 lg:py-2.5 px-3 py-3'
                      }`}
                  >
                    {/* Collapsed Layout - Centered Icon Only */}
                    {!isExpanded && (
                      <div className="hidden lg:flex items-center justify-center w-full">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${activeItem === item.id && !item.subItems ? 'bg-white/20 scale-105' : 'group-hover/item:bg-white/10'
                          }`}>
                          <span className="[&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[2.2]">
                            {item.icon}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Expanded Layout - Full Content */}
                    <div className={`flex items-center justify-between w-full ${!isExpanded ? 'lg:hidden' : ''
                      }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`transition-all duration-300 flex-shrink-0 ${activeItem === item.id && !item.subItems ? 'scale-110' : 'group-hover/item:scale-110'
                          }`}>
                          {item.icon}
                        </span>
                        <span className="whitespace-nowrap overflow-hidden">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${activeItem === item.id && !item.subItems
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

                  {/* Sub Menu Items - Only show when expanded */}
                  {item.subItems && expandedMenus.includes(item.id) && isExpanded && (
                    <div className="ml-9 mt-1 space-y-1 animate-slideDown">
                      {item.subItems.map((subItem) => (
                        <button
                          key={subItem.id}
                          type="button"
                          title={subItem.label}
                          onClick={() => {
                            setActiveItem(subItem.id);
                            navigate(subItem.href);
                            if (window.innerWidth < 1024) onClose?.();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 group/subitem ${activeItem === subItem.id
                            ? 'bg-orange-100 text-[#F59B0F] font-bold scale-[1.01]'
                            : 'text-gray-600 hover:bg-orange-50 hover:text-[#F59B0F]'
                            }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full bg-current transition-transform group-hover/subitem:scale-125 ${activeItem === subItem.id ? 'scale-125' : ''
                              }`}></span>
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
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout Section - At Bottom */}
        <div className={`border-t border-gray-200 bg-gradient-to-t from-gray-50 to-transparent flex-shrink-0 transition-all duration-300 ${isExpanded ? 'px-4 py-4' : 'lg:px-2 lg:py-4 px-4 py-4'
          }`}>
          <button
            type="button"
            title="Logout"
            onClick={handleLogout}
            className={`w-full rounded-lg bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group/logout relative ${isExpanded ? 'px-4 py-3' : 'lg:px-2.5 lg:py-2.5 px-4 py-3'
              }`}
          >
            {/* Collapsed Layout - Centered Icon Only */}
            {!isExpanded && (
              <div className="hidden lg:flex items-center justify-center w-full">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 group-hover/logout:bg-white/20 transition-all duration-300">
                  <ArrowLeftOnRectangleIcon className="w-[18px] h-[18px] stroke-[2.2] transition-transform group-hover/logout:-translate-x-0.5" />
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
        className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'
          }`}
      />
    </>
  );
}

export default Sidebar;
