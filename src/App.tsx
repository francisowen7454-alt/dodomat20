import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './components/public/LandingPage';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { AuthModal } from './components/public/AuthModal';

import { ThemeProvider } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();

  const [currentView, setCurrentView] = useState<'landing' | 'staff' | 'manager'>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Handle automatic role routing on authentication state change
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'manager') {
        setCurrentView('manager');
      } else {
        setCurrentView('staff');
      }
    } else {
      setCurrentView('landing');
    }
  }, [currentUser?.id]);

  const handleNavigate = (view: 'landing' | 'staff' | 'manager') => {
    // Strict Role-Based Access Control (RBAC):
    // Manager cannot access Staff Dashboard; Staff cannot access Manager Dashboard/Reports.
    if (view === 'manager') {
      if (!currentUser) {
        setAuthMode('login');
        setAuthModalOpen(true);
        return;
      }
      if (currentUser.role !== 'manager') {
        setCurrentView('staff');
        return;
      }
    }

    if (view === 'staff') {
      if (!currentUser) {
        setAuthMode('login');
        setAuthModalOpen(true);
        return;
      }
      if (currentUser.role === 'manager') {
        // Manager cannot access staff dashboard
        setCurrentView('manager');
        return;
      }
    }

    setCurrentView(view);
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onOpenAuth={handleOpenAuth}
            onEnterPortal={(portal) => handleNavigate(portal)}
          />
        )}

        {currentView === 'staff' && (
          currentUser?.role === 'staff' ? (
            <StaffDashboard />
          ) : (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white dark:bg-slate-900 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 text-center space-y-3 shadow-sm">
                <div className="text-red-600 dark:text-red-400 font-bold text-base">Access Denied: Staff Workspace Restricted</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Managers cannot directly access the staff operational workspace. Executive functions and audit reviews must be performed from the Manager Portal.
                </p>
                <button
                  onClick={() => setCurrentView('manager')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Return to Manager Portal
                </button>
              </div>
            </div>
          )
        )}

        {currentView === 'manager' && (
          currentUser?.role === 'manager' ? (
            <ManagerDashboard />
          ) : (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white dark:bg-slate-900 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 text-center space-y-3 shadow-sm">
                <div className="text-red-600 dark:text-red-400 font-bold text-base">Access Denied: Executive Clearance Required</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Staff members are restricted from accessing executive manager dashboards and period audits. Please log in with an authorized manager account.
                </p>
                <button
                  onClick={() => setCurrentView('staff')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Return to Staff Workspace
                </button>
              </div>
            </div>
          )
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccessNavigate={(role) => {
          setCurrentView(role);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
