
import React, { useState } from 'react';
import { 
  Camera, User, FileText, ArrowLeft, Loader2, ScanLine, 
  Trash2, CheckCircle2, ChevronDown, Check, Sparkles, Crop, Eraser, AlertCircle 
} from 'lucide-react';
import { removeBackground } from '../../utils/bgRemover';
import { ImageCropper } from './ImageCropper';
import { useAuth } from '../../context/AuthContext';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const FormInput: React.FC<InputProps> = ({ label, className, ...props }) => (
  <div className="flex flex-col gap-1.5 group">
    <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1 transition-colors group-focus-within:text-pixel">{label}</label>
    <input
      className={`w-full p-3.5 bg-black/40 border border-surfaceElevated rounded-2xl text-white outline-none focus:border-pixel focus:ring-4 focus:ring-pixel/10 transition-all duration-200 placeholder:text-slate-700 ${className}`}
      {...props}
    />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export const FormSelect: React.FC<SelectProps> = ({ label, options, className, ...props }) => (
  <div className="flex flex-col gap-1.5 group">
    <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1 transition-colors group-focus-within:text-pixel">{label}</label>
    <div className="relative">
      <select
        className={`w-full p-3.5 bg-black/40 border border-surfaceElevated rounded-2xl text-white outline-none focus:border-pixel focus:ring-4 focus:ring-pixel/10 transition-all duration-200 appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-secondary text-white">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-pixel" size={16} />
    </div>
  </div>
);

export const FormCheckbox: React.FC<{ id: string; label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string }> = ({ id, label, checked, onChange, className }) => (
  <div className={`flex items-center gap-4 p-4 bg-black/40 border border-surfaceElevated rounded-2xl cursor-pointer hover:border-pixel transition-all group ${className}`}>
    <div className="relative flex items-center justify-center">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 appearance-none border-2 border-slate-700 rounded-md checked:bg-pixel checked:border-pixel transition-all cursor-pointer"
      />
      {checked && <Check className="absolute pointer-events-none w-4 h-4 text-white" />}
    </div>
    <label htmlFor={id} className={`cursor-pointer font-black text-xs select-none uppercase tracking-widest text-slate-400 group-hover:text-white`}>{label}</label>
  </div>
);

export const FormRadio: React.FC<{ checked: boolean; onChange: () => void; label?: string }> = ({ checked, onChange, label }) => (
  <button 
    type="button"
    onClick={onChange} 
    className={`flex items-center group outline-none ${label ? 'gap-1' : ''}`}
  >
    <div className="relative flex items-center justify-center p-2">
      <div className={`w-7 h-7 rounded-full border-2 transition-all duration-300 ${checked ? 'border-pixel bg-pixel shadow-[0_0_15px_rgba(125,109,243,0.8)]' : 'border-slate-700 bg-transparent group-hover:border-slate-500'}`}></div>
      {checked && <div className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-lg animate-fade-in"></div>}
    </div>
    {label && <span className="text-[11px] font-black text-slate-500 group-hover:text-white transition-colors uppercase tracking-widest">{label}</span>}
  </button>
);

export const PhotoUpload: React.FC<{ label: string; type: 'face' | 'full' | 'pass'; preview: string | null; onUpload: (file: File | string) => void; onRemove?: () => void; colorClass: string; isScanning?: boolean }> = ({ label, type, preview, onUpload, onRemove, colorClass, isScanning }) => {
  const Icon = type === 'face' ? Camera : type === 'full' ? User : FileText;
  // Fix: Removed activeApiKey as Utilities use process.env.API_KEY directly.
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveBg = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!preview) return;
    setIsRemovingBg(true);
    setError(null);
    try {
      // Fix: Removed unnecessary second argument as per removeBackground definition and SDK guidelines.
      const result = await removeBackground(preview);
      onUpload(result);
    } catch (err: any) {
      setError("AI limit reached or image unclear. Please try again later.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleCropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCropping(true);
  };

  const handleCropComplete = (croppedBase64: string) => {
    onUpload(croppedBase64);
    setIsCropping(false);
  };

  return (
    <div className="flex flex-col gap-2 relative group-upload">
      <div className={`w-full flex flex-col items-center justify-center min-h-[180px] bg-black/60 border-2 border-dashed border-surfaceElevated rounded-3xl cursor-pointer hover:bg-black/80 hover:border-${colorClass} transition-all relative overflow-hidden shadow-inner`}>
        {preview ? (
          <div className="relative w-full h-full p-2 group">
             <img src={preview} alt={label} className="w-full h-40 object-contain rounded-2xl" />
             
             <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-30">
               <button 
                  onClick={(e) => { e.stopPropagation(); if (onRemove) onRemove(); }}
                  className="bg-red-500/90 backdrop-blur-sm text-white p-2.5 rounded-xl transition-all hover:bg-red-600 hover:scale-110 shadow-xl border border-white/10"
                  title="Delete"
               >
                  <Trash2 size={16} />
               </button>
               
               {(type === 'face' || type === 'full') && (
                 <>
                   <button 
                      onClick={handleCropClick}
                      className="bg-pixel/90 backdrop-blur-sm text-white p-2.5 rounded-xl transition-all hover:bg-pixel hover:scale-110 shadow-xl border border-white/10"
                      title="Crop Image"
                   >
                      <Crop size={16} />
                   </button>
                   
                   <button 
                      onClick={handleRemoveBg}
                      disabled={isRemovingBg}
                      className="bg-indigo-600/90 backdrop-blur-sm text-white p-2.5 rounded-xl transition-all hover:bg-indigo-700 hover:scale-110 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                      title="Remove Background (AI)"
                   >
                      {isRemovingBg ? <Loader2 size={16} className="animate-spin" /> : <Eraser size={16} />}
                   </button>
                 </>
               )}
             </div>

             {isRemovingBg && (
               <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px] flex flex-col items-center justify-center rounded-2xl z-40 animate-fade-in">
                  <Sparkles className="text-pixel animate-pulse mb-3" size={32} />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">AI Segmenting...</span>
               </div>
             )}

             {error && (
               <div className="absolute bottom-2 left-2 right-2 bg-red-500/90 text-white text-[9px] font-black uppercase p-2 rounded-lg flex items-center gap-2 z-50 animate-fade-in">
                  <AlertCircle size={12} />
                  <span>{error}</span>
               </div>
             )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full p-6 cursor-pointer">
            <div className={`p-4 rounded-2xl bg-primary mb-3 text-slate-500 group-hover:text-white transition-colors`}>
                <Icon size={28} />
            </div>
            <span className={`font-black text-[11px] tracking-widest uppercase text-slate-500`}>{label}</span>
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <span className="text-[10px] text-slate-600 mt-1 uppercase font-black opacity-40">Click to upload</span>
          </label>
        )}

        {isScanning && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white backdrop-blur-sm z-20">
            <ScanLine className="w-8 h-8 mb-3 animate-pulse text-pixel" />
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-pixel" />
              <span className="text-xs font-black uppercase tracking-tighter">AI Extraction...</span>
            </div>
          </div>
        )}
      </div>

      {isCropping && preview && (
        <ImageCropper 
          imageSrc={preview} 
          aspectRatio={type === 'face' ? 0.8 : 0.65} 
          onCrop={handleCropComplete} 
          onCancel={() => setIsCropping(false)} 
        />
      )}
    </div>
  );
};

export const FormSection: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode; accentColor: string }> = ({ title, children, icon, accentColor }) => (
  <div className={`bg-black/60 backdrop-blur-xl p-8 rounded-[40px] border border-white/5 relative overflow-hidden mb-8 shadow-2xl animate-fade-in transition-all hover:border-white/10`}>
    <div className={`absolute top-0 left-0 w-1.5 h-full bg-pixel`}></div>
    <div className="flex items-center gap-3 mb-10 text-[11px] font-black tracking-[0.2em] text-slate-500 uppercase">
      {icon}
      <span>{title}</span>
    </div>
    <div className="relative z-10">{children}</div>
  </div>
);

export const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="fixed top-8 left-8 z-50 flex items-center gap-2 px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/5 rounded-2xl font-bold text-sm hover:bg-black hover:-translate-x-1 transition-all shadow-2xl">
    <ArrowLeft size={18} /> Back
  </button>
);

export const Header: React.FC<{ title: string; subtitle: string; flag: string }> = ({ title, subtitle, flag }) => (
  <div className="text-center mb-16 pt-24 animate-fade-in-down">
    <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">
       Pixel Recruitment Engine v2.5
    </div>
    <div className="text-6xl font-black mb-4 flex items-center justify-center gap-4">
      <span className="drop-shadow-2xl">{flag}</span>
      <span className="bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent uppercase tracking-tighter">{title}</span>
    </div>
    <div className="text-slate-500 font-medium max-w-md mx-auto">{subtitle}</div>
  </div>
);
