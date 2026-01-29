import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { SystemModal } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const userToggledRef = useRef(false); // Track if user manually toggled
  const { logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // Handle responsive sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      const wasMobile = isMobile;
      setIsMobile(mobile);
      
      // Only auto-adjust sidebar if user hasn't manually toggled on desktop
      // Or if transitioning between mobile and desktop
      if (mobile !== wasMobile) {
        if (mobile) {
          setSidebarOpen(false);
        } else if (!userToggledRef.current) {
          setSidebarOpen(true);
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    // Mark that user has manually toggled (only matters on desktop)
    if (!isMobile) {
      userToggledRef.current = true;
    }
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-base-100">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSystem={() => setSystemModalOpen(true)}
      />
      
      {/* System Modal */}
      <SystemModal 
        isOpen={systemModalOpen} 
        onClose={() => setSystemModalOpen(false)}
        onLogout={logout}
      />
      
      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-base-100 border-b border-base-300 px-4 py-2 flex items-center gap-2 md:hidden">
          <button 
            className="btn btn-ghost btn-sm btn-square"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-primary">Listabob</span>
        </div>
        
        {/* Desktop collapse button */}
        <button 
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-50 btn btn-ghost btn-xs btn-circle bg-base-200 border border-base-300 shadow-sm"
          style={{ left: sidebarOpen ? '15rem' : '0.5rem' }}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
