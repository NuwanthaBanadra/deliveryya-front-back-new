import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './comps/main_comps/SideBar';
import TopBar from '../page_comps/shared/TopBar';

function AdvancePanel() {
  // Initialize sidebar as open on desktop, closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onMenuToggle={handleMenuToggle} isSidebarOpen={isSidebarOpen} showMessages={false} />

        <main className="flex-1 min-w-0 mt-24 lg:mt-20 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdvancePanel;