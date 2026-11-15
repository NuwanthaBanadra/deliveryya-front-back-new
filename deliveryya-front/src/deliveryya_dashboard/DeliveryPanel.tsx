import { useEffect, useState, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from '../page_comps/shared/TopBar';
import Sidebar from './comps/main_comps/SideBar';

function DeliveryPanel() {
  // Initialize sidebar as open on desktop, closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Get page title based on current route
  const currentPage = useMemo(() => {
    const path = location.pathname;

    if (path === '/dashboard') return 'Dashboard';
    if (path.includes('/my-market/add-product')) return 'Add Product';
    if (path.includes('/my-market')) return 'My Market';
    if (path.includes('order-checkout-confirmation')) return 'Delivery Confirmation';
    if (path.includes('order-checkout')) return 'Order Checkout';
    if (path.includes('agent-payment-handover')) return 'Agent Payment Handover';
    if (path.includes('order-analytics')) return 'Order Analytics';
    if (path.includes('employee-assignments/pickup-requests')) return 'Pickup Request Assignments';
    if (path.includes('employee-assignments')) return 'Employee Assignments';
    if (path.includes('urgent-jobs')) return 'Urgent Jobs';
    if (path.includes('/orders')) return 'Orders';
    if (path.includes('/products')) return 'Products';
    if (path.includes('/delivery')) return 'Delivery';
    if (path.includes('/users')) return 'Users';
    if (path.includes('/analytics')) return 'Analytics';
    if (path.includes('/sales')) return 'Sales Report';
    if (path.includes('/promotions')) return 'Promotions';
    if (path.includes('/notifications')) return 'Notifications';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/profile')) return 'Profile';

    return 'Dashboard';
  }, [location.pathname]);

  useEffect(() => {
    // Check if screen is desktop size on mount
    const checkScreenSize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleMenuToggle = (open: boolean) => {
    setIsSidebarOpen(open);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col">
        <TopBar onMenuToggle={handleMenuToggle} isSidebarOpen={isSidebarOpen} currentPage={currentPage} />

        <main className="flex-1 mt-24 lg:mt-20 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-auto">
          <div className="mx-auto p-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DeliveryPanel;