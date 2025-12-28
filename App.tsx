
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState } from './types';
import Dashboard from './components/Dashboard';
import DynamicCountryForm from './components/forms/DynamicCountryForm';
import { HelpPage, ContactPage } from './components/InfoPages';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen, SubscriptionLock } from './components/ui/AuthScreens';
import { LogOut, Loader2, RefreshCcw, AlertCircle } from 'lucide-react';
import { ProfilePage } from './components/ui/ProfilePage';
import { SettingsPage } from './components/ui/SettingsPage';
import { Sidebar } from './components/ui/Sidebar';
import { AdminDashboard } from './components/ui/AdminDashboard';
import { supabase } from './services/supabaseClient';
import AllForm from './components/forms/AllForm';

const MainApp: React.FC = () => {
  const { user, logout, isLoading, settings } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [greeting, setGreeting] = useState('Welcome to Pixel!');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Safety timeout for loading screen
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        if (isLoading) setHasError(true);
      }, 10000); // 10 seconds timeout
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const navigateTo = useCallback((view: ViewState) => {
    const currentHash = window.location.hash.replace('#', '');
    if (view !== currentHash) {
      window.history.pushState({ view }, '', `#${view}`);
    }
    setCurrentView(view);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const initialView = (window.location.hash.replace('#', '') as ViewState) || 'dashboard';
    setCurrentView(initialView);
    window.history.replaceState({ view: initialView }, '', `#${initialView}`);

    const handlePopState = (event: PopStateEvent) => {
      const targetView = event.state?.view || (window.location.hash.replace('#', '') as ViewState) || 'dashboard';
      setCurrentView(targetView);
    };

    window.addEventListener('popstate', handlePopState);
    (window as any).onNavigate = navigateTo;
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigateTo]);

  useEffect(() => {
    const hour = new Date().getHours();
    const name = user?.agencyName || 'Agency';
    if (hour < 12) setGreeting(`Good Morning, ${name}! 🌅`);
    else if (hour < 17) setGreeting(`Good Afternoon, ${name}! ☀️`);
    else setGreeting(`Good Evening, ${name}! 🌙`);
  }, [user]);

  if (hasError) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Engine Initialization Failed</h2>
        <p className="text-slate-500 max-w-sm mb-8 text-sm font-medium">The application could not connect to the database or find its API vault. Check your connection or reset the session.</p>
        <button 
          onClick={() => { window.localStorage.clear(); window.location.reload(); }}
          className="px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-xs tracking-widest shadow-xl"
        >
          Factory Reset App
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-slate-400 gap-4 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-pixel blur-2xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-12 h-12 animate-spin text-pixel relative z-10" />
        </div>
        <div className="text-xl font-black text-white uppercase tracking-[0.2em] mt-4">Initializing Pixel</div>
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Compiling Database & API Vault...</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.subscriptionStatus !== 'active') {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <button onClick={logout} className="px-4 py-2 bg-secondary border border-surfaceElevated rounded-xl text-xs text-slate-500 hover:text-white flex items-center gap-2 transition-all shadow-xl">
            <LogOut size={14}/> Logout
          </button>
        </div>
        <SubscriptionLock />
      </>
    );
  }

  const renderView = () => {
    const flags: Record<string, string> = {
      kuwait: "🇰🇼",
      saudi: "🇸🇦",
      jordan: "🇯🇴",
      oman: "🇴🇲",
      uae: "🇦🇪",
      qatar: "🇶🇦",
      bahrain: "🇧🇭"
    };

    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={navigateTo} greeting={greeting} />;
      case 'help': return <HelpPage onBack={() => navigateTo('dashboard')} />;
      case 'contact': return <ContactPage onBack={() => navigateTo('dashboard')} />;
      case 'profile': return <ProfilePage onBack={() => navigateTo('dashboard')} />;
      case 'settings': return <SettingsPage onBack={() => navigateTo('dashboard')} />;
      case 'all': return <AllForm onBack={() => navigateTo('dashboard')} />;
      default: return <DynamicCountryForm country={currentView} flag={flags[currentView] || "🏳️"} onBack={() => navigateTo('dashboard')} />;
    }
  };

  return (
    <div className="font-sans antialiased text-slate-200 flex bg-primary min-h-screen relative overflow-x-hidden">
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:mr-64' : 'lg:mr-20'}`}>
        <div className="p-4 lg:p-12">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </div>
      </main>
      
      <Sidebar 
        currentView={currentView} 
        onNavigate={navigateTo} 
        settings={settings} 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;
