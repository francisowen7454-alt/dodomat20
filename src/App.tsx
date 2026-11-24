import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './components/public/LandingPage';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { AuthModal } from './components/public/AuthModal';

import { ThemeProvider } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();

  const [currentView, setCurrentView] = useState<'landing' | 'staff'>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Handle automatic routing on authentication state change
  useEffect(() => {
    if (currentUser) {
      setCurrentView('staff');
    } else {
      setCurrentView('landing');
    }
  }, [currentUser?.id]);

  const handleNavigate = (view: 'landing' | 'staff') => {
    if (view === 'staff' && !currentUser) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
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

        {currentView === 'staff' && currentUser && (
          <StaffDashboard />
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccessNavigate={() => {
          setCurrentView('staff');
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
