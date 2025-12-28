
import React, { useState } from 'react';
import { ViewState, AppSettings } from '../../types';
import { 
  LayoutDashboard, 
  FolderPlus, 
  Settings, 
  UserCircle, 
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  ChevronRight,
  Globe,
  HelpCircle,
  Phone,
  Crown,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  settings: AppSettings;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<Props> = ({ currentView, onNavigate, settings, isOpen, onToggle }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const { logout, user } = useAuth();

  const getDaysLeft = () => {
    if (!user?.subscriptionExpiry) return 0;
    const end = new Date(user.subscriptionExpiry);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const daysLeft = getDaysLeft();

  const MenuItem = ({ view, icon, label }: { view: ViewState; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => onNavigate(view)}
      className={`
        w-full flex items-center transition-all mb-1 relative group
        ${isOpen ? 'px-4 py-2.5 gap-3 rounded-xl' : 'justify-center py-3 rounded-xl'}
        ${currentView === view 
          ? 'bg-pixel text-white shadow-lg shadow-pixel/30' 
          : 'text-slate-400 hover:bg-surfaceElevated hover:text-white'}
      `}
      title={!isOpen ? label : ''}
    >
      <div className="shrink-0 flex items-center justify-center">
        {icon}
      </div>
      {isOpen && <span className="whitespace-nowrap font-bold text-xs tracking-tight">{label}</span>}
      {!isOpen && currentView === view && (
        <div className="absolute left-0 w-1 h-5 bg-white rounded-r-full"></div>
      )}
    </button>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={onToggle}
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-secondary border border-surfaceElevated text-white rounded-xl shadow-2xl"
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar Container */}
      <div 
        className={`
          fixed top-0 right-0 h-screen bg-secondary border-l border-surfaceElevated z-40 transition-all duration-300 ease-in-out flex flex-col
          ${isOpen ? 'w-64 translate-x-0' : 'w-20 translate-x-0 lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full p-3.5">
          
          {/* Header */}
          <div className={`flex items-center mb-8 px-1 pt-1 ${isOpen ? 'justify-between' : 'flex-col gap-5 justify-center'}`}>
            <button onClick={onToggle} className="hidden lg:block text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-surfaceElevated">
               {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            
            {isOpen && (
               <div className="flex flex-col animate-fade-in text-right ml-auto mr-3">
                 <span className="font-black text-white text-lg tracking-tighter leading-none">Pixel CV</span>
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Engine v2.0</span>
               </div>
            )}
            
            <div 
              className={`
                bg-gradient-to-br from-pixel to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-pixel/20 transition-all
                ${isOpen ? 'w-8 h-8' : 'w-10 h-10'}
              `}
            >
               <span className="font-black text-white text-base">P</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
            <MenuItem view="dashboard" icon={<LayoutDashboard size={18}/>} label="Dashboard" />
            
            <div className="mt-4">
               <button 
                 onClick={() => isOpen ? setIsCreateOpen(!isCreateOpen) : onToggle()}
                 className={`
                   w-full flex items-center transition-all text-slate-400 hover:text-white hover:bg-surfaceElevated mb-1
                   ${isOpen ? 'px-4 py-2.5 rounded-xl justify-between' : 'justify-center py-3 rounded-xl'}
                   ${isCreateOpen && isOpen ? 'bg-surfaceElevated/40' : ''}
                 `}
               >
                  <div className="flex items-center gap-3">
                     <FolderPlus size={18}/>
                     {isOpen && <span className="font-bold text-xs tracking-tight">Form Filler</span>}
                  </div>
                  {isOpen && (isCreateOpen ? <ChevronDown size={12} className="opacity-40"/> : <ChevronRight size={12} className="opacity-40"/>)}
               </button>

               {isCreateOpen && isOpen && (
                 <div className="mr-2 mt-1 space-y-1 border-r border-surfaceElevated pr-2 text-right animate-fade-in-down">
                    {Object.entries(settings.enabledCountries).map(([country, enabled]) => {
                        const flags: Record<string, string> = {
                          kuwait: "🇰🇼",
                          saudi: "🇸🇦",
                          jordan: "🇯🇴",
                          oman: "🇴🇲",
                          uae: "🇦🇪",
                          qatar: "🇶🇦",
                          bahrain: "🇧🇭"
                        };
                        return enabled && (
                          <button
                            key={country}
                            onClick={() => onNavigate(country as ViewState)}
                            className={`
                              w-full flex items-center justify-end gap-2.5 px-3 py-1.5 rounded-lg transition-all
                              ${currentView === country 
                                ? 'text-pixel font-black' 
                                : 'text-slate-500 hover:text-white'}
                            `}
                          >
                            <span className="whitespace-nowrap text-[9px] uppercase tracking-widest font-black">{country}</span>
                            <span className="text-sm leading-none">{flags[country] || "🏳️"}</span>
                          </button>
                        );
                    })}
                    <button
                      onClick={() => onNavigate('all')}
                      className={`
                        w-full flex items-center justify-end gap-2.5 px-3 py-1.5 rounded-lg transition-all
                        ${currentView === 'all' ? 'text-accentAll font-black' : 'text-slate-500 hover:text-white'}
                      `}
                    >
                      <span className="whitespace-nowrap text-[9px] uppercase tracking-widest font-black">Global Mass</span>
                      <Globe size={14}/>
                    </button>
                 </div>
               )}
            </div>

            <div className="my-5 border-t border-surfaceElevated mx-1"></div>
            
            <MenuItem view="profile" icon={<UserCircle size={18}/>} label="My Agency" />
            <MenuItem view="settings" icon={<Settings size={18}/>} label="Builder Studio" />
            <MenuItem view="help" icon={<HelpCircle size={18}/>} label="Help & Docs" />
            <MenuItem view="contact" icon={<Phone size={18}/>} label="Support Line" />
          </div>

          {/* Subscription Card */}
          <div className="shrink-0 mt-4">
            {isOpen && user ? (
              <div className="mb-4 p-4 bg-surface rounded-2xl border border-surfaceElevated relative overflow-hidden group">
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-pixel/10 rounded-full blur-2xl transition-transform group-hover:scale-125" />
                <div className="flex items-center gap-2 mb-2 text-yellow-500 font-black text-[9px] uppercase tracking-[0.2em]">
                  <Crown size={12} /> Membership
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-black text-white leading-none tracking-tighter">{daysLeft}</div>
                    <div className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Days Left</div>
                  </div>
                  <Clock size={16} className="text-slate-700 mb-0.5" />
                </div>
              </div>
            ) : (
              <div className="mb-4 flex flex-col items-center gap-0.5 text-yellow-500/50 p-2">
                <Crown size={16} />
                <span className="text-[10px] font-black">{daysLeft}</span>
              </div>
            )}
            
            <div className={`pt-3 border-t border-surfaceElevated ${!isOpen ? 'flex justify-center' : ''}`}>
               <button 
                 onClick={logout} 
                 className={`
                    w-full flex items-center transition-all rounded-xl text-red-400 hover:bg-red-900/10
                    ${isOpen ? 'px-4 py-3.5 font-black text-[10px] gap-3' : 'h-11 w-11 justify-center'}
                 `}
                 title={!isOpen ? "Sign Out" : ""}
               >
                  <LogOut size={18} />
                  {isOpen && <span className="uppercase tracking-[0.1em] font-black">Sign Out</span>}
               </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
