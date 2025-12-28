
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CustomTemplate } from '../../types';
import { BackButton, FormSection } from './FormComponents';
import { Settings, Globe, LayoutTemplate, ToggleLeft, ToggleRight, Trash, Loader2, CheckCircle, Edit3 } from 'lucide-react';
import { TemplateBuilder } from './TemplateBuilder';

interface Props {
  onBack: () => void;
}

export const SettingsPage: React.FC<Props> = ({ onBack }) => {
  const { settings, saveSettings, templates, deleteTemplate, saveTemplate } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'templates'>('general');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const toggleCountry = (key: keyof typeof settings.enabledCountries) => {
     const newSettings = {
         ...settings,
         enabledCountries: {
             ...settings.enabledCountries,
             [key]: !settings.enabledCountries[key]
         }
     };
     saveSettings(newSettings);
  };

  // Fix: handleSaveTemplate must accept both template data and pageAssets (Files/URLs) as expected by the saveTemplate function and TemplateBuilder onSave prop.
  const handleSaveTemplate = async (template: any, assets: (string | File)[]) => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      // Fix: Pass both arguments to saveTemplate to ensure background images are correctly processed and uploaded.
      await saveTemplate(template, assets);
      setSaveStatus({ type: 'success', text: 'Template deployed successfully!' });
      setTimeout(() => {
        setShowBuilder(false);
        setEditingTemplate(null);
        setSaveStatus(null);
      }, 1500);
    } catch (e: any) {
      setSaveStatus({ type: 'error', text: e.message || 'Failed to save template.' });
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (t: CustomTemplate) => {
    setEditingTemplate(t);
    setShowBuilder(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 pt-20 animate-fade-in">
      <BackButton onClick={onBack} />
      
      <div className="text-center mb-10">
         <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Settings className="text-accentAll"/> Layout Architect
         </h1>
      </div>

      <div className="flex justify-center mb-12 gap-4">
          <button 
             onClick={() => setActiveTab('general')}
             className={`px-8 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-accentAll text-black shadow-lg shadow-accentAll/20' : 'bg-surface text-slate-400'}`}
          >
             General Settings
          </button>
          <button 
             onClick={() => setActiveTab('templates')}
             className={`px-8 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'templates' ? 'bg-accentAll text-black shadow-lg shadow-accentAll/20' : 'bg-surface text-slate-400'}`}
          >
             Office Layouts
          </button>
      </div>

      {activeTab === 'general' && (
          <div className="max-w-2xl mx-auto">
             <FormSection title="Deployment Targets" icon={<Globe />} accentColor="border-accentAll">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {Object.entries(settings.enabledCountries).map(([key, enabled]) => (
                       <div key={key} className="flex items-center justify-between p-4 bg-primary rounded-2xl border border-surfaceElevated hover:border-accentAll/30 transition-all group">
                           <span className="capitalize font-black text-xs tracking-widest text-white group-hover:text-accentAll transition-colors">{key}</span>
                           <button onClick={() => toggleCountry(key as any)} className="text-2xl transition-all hover:scale-110">
                               {enabled ? <ToggleRight className="text-green-500 w-10 h-10"/> : <ToggleLeft className="text-slate-600 w-10 h-10"/>}
                           </button>
                       </div>
                   ))}
                </div>
             </FormSection>
          </div>
      )}

      {activeTab === 'templates' && (
          <div>
              {!showBuilder ? (
                  <>
                    <div className="flex justify-between items-center mb-8 bg-secondary/50 p-6 rounded-[32px] border border-surfaceElevated">
                        <div>
                          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Office Layouts</h2>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{templates.length} Configurations Loaded</p>
                        </div>
                        <button onClick={() => { setEditingTemplate(null); setShowBuilder(true); }} className="px-8 py-3 bg-pixel text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-pixelDark transition-all shadow-pixel">
                            + Design New Layout
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map(t => (
                            <div key={t.id} className="bg-secondary p-6 rounded-[32px] border border-surfaceElevated relative group overflow-hidden hover:border-pixel transition-all hover:-translate-y-1">
                                <div className="absolute top-0 left-0 w-1 h-full bg-pixel/40"></div>
                                <h3 className="font-black text-white text-lg uppercase tracking-tight truncate pr-8">{t.name}</h3>
                                <div className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-6 flex items-center gap-2">
                                  {t.country} • {t.fields.length} Fields
                                </div>
                                
                                <div className="h-48 bg-primary rounded-[24px] overflow-hidden mb-4 relative border border-surfaceElevated/50 group-hover:border-pixel/30 transition-colors">
                                    <img src={t.pages[0] || ''} alt={t.name} className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <span className="px-4 py-2 bg-pixel/20 backdrop-blur-md rounded-xl text-white text-[10px] font-black tracking-widest border border-pixel/30">PREVIEW</span>
                                    </div>
                                </div>
                                
                                <div className="absolute top-6 right-6 flex items-center gap-2">
                                    <button 
                                       onClick={() => startEdit(t)}
                                       className="p-2 bg-surface rounded-lg text-slate-400 hover:text-pixel hover:bg-pixel/10 transition-all"
                                       title="Edit Layout"
                                    >
                                       <Edit3 size={16} />
                                    </button>
                                    <button 
                                       onClick={() => deleteTemplate(t.id)}
                                       className="p-2 bg-surface rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                       title="Delete Template"
                                    >
                                       <Trash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {templates.length === 0 && (
                            <div className="col-span-full text-center p-20 text-slate-500 border-2 border-dashed border-surfaceElevated rounded-[48px] bg-secondary/20">
                                <LayoutTemplate size={48} className="mx-auto mb-6 opacity-10" />
                                <h4 className="font-black text-white text-lg uppercase tracking-tighter mb-2">No Architectures Found</h4>
                                <p className="text-xs uppercase tracking-widest font-bold opacity-40">Create a layout to begin generating CVs</p>
                            </div>
                        )}
                    </div>
                  </>
              ) : (
                  <div className="fixed inset-0 z-[200]">
                    <TemplateBuilder 
                      initialTemplate={editingTemplate}
                      onSave={handleSaveTemplate}
                      onCancel={() => { setShowBuilder(false); setEditingTemplate(null); }}
                    />
                    
                    {/* Save Overlay */}
                    {(isSaving || saveStatus) && (
                      <div className="fixed inset-0 bg-primary/90 backdrop-blur-md z-[210] flex items-center justify-center animate-fade-in">
                        <div className="bg-secondary p-12 rounded-[48px] border border-surfaceElevated shadow-glass text-center max-w-sm w-full">
                          {isSaving ? (
                            <>
                              <Loader2 className="w-12 h-12 text-pixel animate-spin mx-auto mb-6" />
                              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Deploying Architecture...</h3>
                              <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Compiling layout fields</p>
                            </>
                          ) : saveStatus?.type === 'success' ? (
                            <>
                              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-6" />
                              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Deployed Successfully!</h3>
                              <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Returning to studio console</p>
                            </>
                          ) : (
                            <>
                              <Trash className="w-12 h-12 text-red-500 mx-auto mb-6" />
                              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Deployment Failed</h3>
                              <p className="text-xs text-red-500/60 mt-2 font-bold uppercase tracking-widest">{saveStatus?.text}</p>
                              <button onClick={() => setSaveStatus(null)} className="mt-8 px-6 py-2 bg-surface text-white rounded-xl text-xs font-bold uppercase tracking-widest">Retry</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
              )}
          </div>
      )}

    </div>
  );
};
