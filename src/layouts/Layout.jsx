import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle responsive sidebar state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check initial size
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex bg-[#F9FAFB] h-screen overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed lg:relative ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-transform duration-300 ease-in-out z-30`}>
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </div>

      {/* Main Content Area */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${isCollapsed && !isMobileMenuOpen ? 'lg:ml-16' : 'lg:ml-64'} ${isMobileMenuOpen ? 'ml-64' : ''} lg:min-h-screen`}>
        {/* Navbar */}
        <Navbar 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[#F9FAFB]">
          <div className="p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}