
import React from 'react';
import { ViewState } from '../types';
import { Globe, UserCircle, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onNavigate: (view: ViewState) => void;
  greeting: string;
}

const Dashboard: React.FC<Props> = ({ onNavigate, greeting }) => {
  const { user, settings, templates } = useAuth();
  
  const Card = ({ 
    title, flag, stats, list, onClick, accentColor, shadowColor 
  }: { 
    title: string; flag: React.ReactNode; stats: string; list: string; 
    onClick: () => void; accentColor: string; shadowColor: string; 
  }) => (
    <div 
      onClick={onClick}
      className={`
        bg-surface p-8 rounded-[32px] border-2 border-${accentColor} 
        cursor-pointer transition-all duration-500 
        hover:-translate-y-2 hover:shadow-2xl hover:${shadowColor}
        group relative overflow-hidden
      `}
    >
      <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-all duration-1000 group-hover:left-[100%]" />
      <div className="text-5xl mb-6 filter drop-shadow-xl transform group-hover:scale-110 transition-transform">{flag}</div>
      <h3 className="text-2xl font-black mb-3 text-white tracking-tight uppercase">{title}</h3>
      <div className="text-slate-400 font-bold mb-2 text-sm">{stats}</div>
      <div className="text-slate-500 text-xs font-medium uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{list}</div>
    </div>
  );

  const getTemplateCount = (country: string) => {
    return templates.filter(t => t.country === country).length;
  };

  return (
    <div className="animate-fade-in flex flex-col items-start lg:items-center">
      <div className="mb-16 w-full lg:text-center">
        <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter leading-tight">
          <span className="bg-gradient-to-r from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">
            {greeting}
          </span>
        </h1>
        <p className="text-slate-500 text-sm md:text-base font-medium tracking-tight opacity-70 mt-1 uppercase tracking-[0.1em]">
          Professional Recruitment Solutions <span className="text-pixel opacity-40 px-2">|</span> Pixel CV Engine v2.0
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {Object.entries(settings.enabledCountries).map(([key, enabled]) => {
            if (!enabled) return null;
            const count = getTemplateCount(key);
            const flags: Record<string, string> = {
              kuwait: "🇰🇼",
              saudi: "🇸🇦",
              jordan: "🇯🇴",
              oman: "🇴🇲",
              uae: "🇦🇪",
              qatar: "🇶🇦",
              bahrain: "🇧🇭"
            };
            return (
                <Card 
                  key={key}
                  title={key} 
                  flag={flags[key] || "🏳️"} 
                  stats={`${count} Active Layouts`} 
                  list={count === 0 ? 'Initialize Template' : 'Live and Production Ready'}
                  onClick={() => onNavigate(key as ViewState)} 
                  accentColor={`accent${key.charAt(0).toUpperCase() + key.slice(1)}` as any} 
                  shadowColor={`shadow-accent${key.charAt(0).toUpperCase() + key.slice(1)}/20` as any}
                />
            );
        })}

        <Card 
          title="GENERATE ALL" flag={<Globe className="w-10 h-10 text-accentAll" />} stats="Mass Export" list="Sync all office templates"
          onClick={() => onNavigate('all')} accentColor="accentAll" shadowColor="shadow-accentAll/20"
        />
        
        <Card 
          title="MY AGENCY" flag={<UserCircle className="w-10 h-10 text-white" />} stats={`${user?.cvGeneratedCount || 0} Successful Cycles`} list="Branding & API Config"
          onClick={() => onNavigate('profile')} accentColor="white" shadowColor="shadow-white/10"
        />

        <Card 
          title="STUDIO" flag={<Settings className="w-10 h-10 text-slate-400" />} stats="Template Architect" list="Design & Field Mapping"
          onClick={() => onNavigate('settings')} accentColor="slate-500" shadowColor="shadow-slate-500/10"
        />
      </div>
      
      <footer className="mt-20 w-full flex justify-between items-center text-slate-700 text-[9px] font-black uppercase tracking-[0.4em] border-t border-surfaceElevated pt-6 opacity-30">
        <span>Pixel Recruitment OS</span>
        <span>© 2024 TK INT</span>
      </footer>
    </div>
  );
};

export default Dashboard;
