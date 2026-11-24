import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LogOut,
  User as UserIcon,
  Briefcase,
  Settings,
  KeyRound,
  Menu,
  X,
  ArrowRight,
  Search,
  Sun,
  Moon,
} from 'lucide-react';
import { ProfileModal } from '../shared/ProfileModal';
import { NotificationCenter } from '../shared/NotificationCenter';
import { PWAInstallButton } from '../shared/PWAInstallButton';
import { GlobalSearchModal } from '../shared/GlobalSearchModal';

interface NavbarProps {
  currentView: 'landing' | 'staff';
  onNavigate: (view: 'landing' | 'staff') => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { currentUser, logout } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global keyboard shortcut: Ctrl+K / Cmd+K to toggle global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMobileNav = (view: 'landing' | 'staff') => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 no-print transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleMobileNav('landing')}
              className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 hover:text-blue-900 dark:hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center text-sm font-black tracking-wider shadow-sm">
                T20
              </span>
              <span className="font-extrabold tracking-tight hidden sm:inline">T20 Server</span>
            </button>
          </div>

          {/* Zone 2: Global Search Bar + Navigation links */}
          <div className="flex items-center gap-4 flex-1 max-w-xl mx-2">
            {/* Global Search Component in Navbar */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700 rounded-xl transition-all shadow-2xs group cursor-pointer"
              title="Quick search products or sales records by name or SKU (Ctrl+K)"
              aria-label="Open Global Search"
            >
              <span className="flex items-center gap-2 truncate text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                <span className="truncate text-xs font-normal">
                  Search inventory & sales by name or SKU...
                </span>
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-2xs shrink-0">
                <span className="text-[11px] leading-none">⌘</span>K
              </kbd>
            </button>

            {/* Desktop Navigation links */}
            <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
              <button
                onClick={() => onNavigate('landing')}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                  currentView === 'landing' ? 'text-slate-900 dark:text-white font-bold underline decoration-2 underline-offset-8' : ''
                }`}
              >
                Home
              </button>

              {currentUser && (
                <button
                  onClick={() => onNavigate('staff')}
                  className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'staff' ? 'text-slate-900 dark:text-white font-bold underline decoration-2 underline-offset-8' : ''
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Staff Workspace</span>
                </button>
              )}
            </nav>
          </div>

          {/* Zone 3: Profile, Theme Switcher & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Install App Button on Desktop & Tablet */}
            <PWAInstallButton className="hidden md:inline-flex" />

            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer shadow-2xs"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme appearance"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200" />
              )}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* In-App Stock Notification Bell */}
                <NotificationCenter
                  onNavigateToInventory={() => onNavigate('staff')}
                />

                {/* User Info - Prominently visible across mobile & desktop */}
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer max-w-[170px] sm:max-w-none shadow-2xs"
                  title="Click to view and edit profile credentials"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 flex items-center justify-center font-bold text-[10px] sm:text-xs uppercase shrink-0">
                    {(currentUser.fullName || currentUser.username).slice(0, 2)}
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                      {currentUser.fullName || currentUser.username}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      @{currentUser.username} · Staff
                    </span>
                  </div>
                  <Settings className="w-3.5 h-3.5 text-slate-400 ml-0.5 sm:ml-1 shrink-0 hidden sm:block" />
                </button>

                {/* Direct Portal Indicator */}
                <button
                  onClick={() => onNavigate('staff')}
                  className="hidden lg:inline-flex px-3 py-1.5 text-xs font-semibold bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Briefcase className="w-3.5 h-3.5 text-white" />
                  <span>Staff Workspace</span>
                </button>

                {/* Mobile direct profile button */}
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors sm:hidden min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                  title="Edit Profile & Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                {/* Logout button */}
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Mobile Hamburger toggle button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap min-h-[36px] cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-sm min-h-[36px] cursor-pointer"
                >
                  Register
                </button>

                {/* Mobile Hamburger toggle button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-5 space-y-3 shadow-xl animate-fade-in transition-colors">
            {/* Quick Search trigger inside mobile menu */}
            <button
              onClick={() => {
                setIsSearchOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors min-h-[42px] border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Search Inventory & Sales (Name/SKU)</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-500 dark:text-slate-300">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Theme Toggle Card */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-blue-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span>Appearance Mode</span>
              </span>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Switch to Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Switch to Dark</span>
                  </>
                )}
              </button>
            </div>

            {currentUser && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {currentUser.username.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      @{currentUser.username} · {currentUser.role}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsProfileOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            )}

            {/* Mobile PWA Install Button */}
            <div className="pt-1">
              <PWAInstallButton variant="compact" className="w-full justify-center py-2.5" />
            </div>

            <div className="flex flex-col space-y-1">
              <button
                onClick={() => handleMobileNav('landing')}
                className={`w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors min-h-[42px] cursor-pointer ${
                  currentView === 'landing'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>Home Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {currentUser && (
                <button
                  onClick={() => handleMobileNav('staff')}
                  className={`w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors min-h-[42px] cursor-pointer ${
                    currentView === 'staff'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>Staff Operations Workspace</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <a
                href="#about-section"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  if (currentView !== 'landing') {
                    e.preventDefault();
                    onNavigate('landing');
                    setTimeout(() => {
                      document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }
                }}
                className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg block min-h-[42px] flex items-center justify-between"
              >
                <span>About System Architecture</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <a
                href="#capabilities-section"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  if (currentView !== 'landing') {
                    e.preventDefault();
                    onNavigate('landing');
                    setTimeout(() => {
                      document.getElementById('capabilities-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }
                }}
                className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg block min-h-[42px] flex items-center justify-between"
              >
                <span>System Capabilities</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>

            {currentUser && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsProfileOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Update Password / Username</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigateToView={onNavigate}
      />

      {/* Profile & Security Credentials Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};
