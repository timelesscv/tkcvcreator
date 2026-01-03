
import React, { useState, useMemo, useEffect } from 'react';
import { BaseFormData, TemplateField } from '../../types';
import { FormInput, FormSection, PhotoUpload, Header, BackButton, FormRadio, FormCheckbox, FormSelect } from '../ui/FormComponents';
import { ImageIcon, Sparkles, Languages, User, ChevronRight, ListChecks, Building, Plus, History, Contact, CheckCircle2, PlusCircle, Loader2, FilePlus } from 'lucide-react';
import { generateTemplatePDF } from '../../utils/pdfGenerator';
import { processPassportImage, MRZData } from '../../utils/mrzHelper';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onBack: () => void;
}

const AllForm: React.FC<Props> = ({ onBack }) => {
  const { user, trackGeneration, templates } = useAuth();
  
  const [officeOverrides, setOfficeOverrides] = useState<Record<string, { refNo: string, monthlySalary: string }>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [formData, setFormData] = useState<BaseFormData>({
    photos: { face: null, full: null, passport: null },
    currentDate: new Date().toISOString().split('T')[0],
    religion: 'MUSLIM',
    maritalStatus: 'SINGLE',
    hasExperience: false,
    langEnglishPoor: false,
    langEnglishFair: false,
    langEnglishFluent: true,
    langArabicPoor: false,
    langArabicFair: true,
    langArabicFluent: false,
    contactRelation: 'FATHER'
  });

  // Auto Calculations & Intelligent Defaults
  useEffect(() => {
    setFormData(prev => {
      const updates: any = {};
      
      // 1. Age Calculation
      if (prev.dob) {
        const birthDate = new Date(prev.dob);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
          if (calculatedAge >= 0 && calculatedAge < 100 && prev.age !== calculatedAge.toString()) {
            updates.age = calculatedAge.toString();
          }
        }
      }

      // 2. Emergency Contact Address Sync
      if (prev.pob && !prev.contactAddress) {
        updates.contactAddress = prev.pob;
      }

      // 3. Previous Employment Defaults
      if (prev.hasExperience) {
        for (let i = 1; i <= 4; i++) {
          if (!prev[`expPosition${i}`]) {
            updates[`expPosition${i}`] = 'HOUSEMAID';
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  }, [formData.dob, formData.pob, formData.hasExperience]);

  const handleInputChange = (key: string, value: any) => {
    const formattedValue = typeof value === 'string' ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [key]: formattedValue }));
  };

  const handlePhotoUpdate = async (type: 'face' | 'full' | 'passport', f: File | string) => {
    if (typeof f === 'string') {
      handleInputChange('photos', { ...formData.photos, [type]: f });
      return;
    }

    const r = new FileReader();
    r.onload = (e) => handleInputChange('photos', { ...formData.photos, [type]: e.target?.result });
    r.readAsDataURL(f);

    if (type === 'passport') {
      setIsScanning(true);
      try {
        const data: MRZData = await processPassportImage(f);
        
        // TRICK: Extract Father/Grandfather name from Full Name (remove first name)
        const nameParts = data.fullName.split(' ');
        const extractedContactName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : data.fullName;

        setFormData(prev => ({ 
          ...prev, 
          fullName: data.fullName, 
          passportNumber: data.passportNumber, 
          dob: data.dob, 
          expiryDate: data.expiryDate, 
          placeOfIssue: data.placeOfIssue || 'ADDIS ABABA', 
          pob: data.pob,
          contactName: extractedContactName,
          contactAddress: data.pob,
          contactRelation: 'FATHER'
        }));
      } catch (e: any) { 
        alert("Passport Scan Failed: " + e.message); 
      } finally { 
        setIsScanning(false); 
      }
    }
  };

  const handleOverrideChange = (templateId: string, key: 'refNo' | 'monthlySalary', value: string) => {
    setOfficeOverrides(prev => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || { refNo: '', monthlySalary: '' }),
        [key]: value.toUpperCase()
      }
    }));
  };

  const incrementAllRefs = () => {
    setOfficeOverrides(prev => {
      const next = { ...prev };
      templates.forEach(t => {
        const current = next[t.id]?.refNo || '';
        const match = current.match(/^(.*?)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const num = parseInt(match[2]);
          const nextNum = (num + 1).toString().padStart(match[2].length, '0');
          next[t.id] = {
            ...(next[t.id] || { refNo: '', monthlySalary: '' }),
            refNo: prefix + nextNum
          };
        }
      });
      return next;
    });
  };

  const handleLanguageSelect = (language: 'English' | 'Arabic', level: 'Poor' | 'Fair' | 'Fluent') => {
    const prefix = `lang${language}`;
    setFormData(prev => ({
      ...prev,
      [`${prefix}Poor`]: level === 'Poor',
      [`${prefix}Fair`]: level === 'Fair',
      [`${prefix}Fluent`]: level === 'Fluent',
    }));
  };

  const hasFieldAcrossTemplates = (key: string) => templates.some(t => t.fields.some(f => f.key === key));
  const hasAnyField = (keys: string[]) => keys.some(key => hasFieldAcrossTemplates(key));

  const handledKeys = [
    'currentDate', 'positionApplied', 'refNo', 'monthlySalary', 'photoFace', 'photoFull', 'photoPassport',
    'fullName', 'religion', 'dob', 'pob', 'maritalStatus', 'children', 'education', 'height', 'weight', 'age',
    'passportNumber', 'issueDate', 'expiryDate', 'placeOfIssue', 'contactName', 'contactAddress', 'contactRelation', 'contactPhone',
    'langEnglish', 'langArabic', 'langEnglishPoor', 'langEnglishFair', 'langEnglishFluent', 'langArabicPoor', 'langArabicFair', 'langArabicFluent',
    'hasExperience', 'skillWashing', 'skillCooking', 'skillBabyCare', 'skillCleaning', 'skillIroning', 'skillSewing'
  ];
  
  for(let i=1; i<=4; i++) {
    handledKeys.push(`expCountry${i}`, `expPeriod${i}`, `expPosition${i}`);
  }

  const supplementalFields = useMemo(() => {
    const allTemplateFields = templates.flatMap(t => t.fields);
    const uniqueFieldsMap = new Map<string, TemplateField>();
    allTemplateFields.forEach(f => {
      if (!handledKeys.includes(f.key) && !uniqueFieldsMap.has(f.key)) {
        uniqueFieldsMap.set(f.key, f);
      }
    });
    return Array.from(uniqueFieldsMap.values());
  }, [templates]);

  const requiredExpRecords = useMemo(() => {
    let max = 0;
    templates.forEach(t => {
      t.fields.forEach(f => {
        const match = f.key.match(/^expCountry(\d)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > max) max = num;
        }
      });
    });
    return max;
  }, [templates]);

  const generateAll = async () => {
    if (templates.length === 0) return;
    setIsGenerating(true);
    try {
      for (const template of templates) {
        const specificData = {
          ...formData,
          refNo: officeOverrides[template.id]?.refNo || formData.refNo || '',
          monthlySalary: officeOverrides[template.id]?.monthlySalary || formData.monthlySalary || ''
        };
        await generateTemplatePDF(specificData, template, user?.agencyName);
        await new Promise(r => setTimeout(r, 600));
      }
      trackGeneration(templates.length);
    } catch (e) {
      console.error("Batch generation failed:", e);
      alert("Batch export failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-32 animate-fade-in relative bg-primary">
      <BackButton onClick={onBack} />
      <Header title="Mass Generate" subtitle="Automated Batch Recruitment Pipeline" flag="⚡" />

      {templates.length === 0 ? (
        <div className="bg-black/80 p-20 rounded-[48px] border-2 border-dashed border-white/10 text-center backdrop-blur-md">
            <Sparkles size={64} className="mx-auto mb-6 text-slate-800" />
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">No Active Layouts</h3>
            <p className="text-slate-500 mb-12 max-w-xs mx-auto text-sm">Design templates in Studio to enable batch export.</p>
            <button onClick={() => (window as any).onNavigate('settings')} className="px-10 py-4 bg-pixel text-white font-black rounded-2xl hover:bg-pixelDark transition-all shadow-pixel uppercase text-xs tracking-widest">Open Builder Console</button>
        </div>
      ) : (
        <div className="space-y-12">
          
          <FormSection title="Core Batch Data" icon={<ListChecks size={14} />} accentColor="pixel">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {hasFieldAcrossTemplates('currentDate') && (
                  <FormInput 
                    label="Generation Date" 
                    type="date" 
                    value={formData.currentDate || ''} 
                    onChange={e => handleInputChange('currentDate', e.target.value)} 
                  />
                )}
                {hasFieldAcrossTemplates('positionApplied') && (
                  <FormInput 
                    label="Position Applied For" 
                    value={formData.positionApplied || ''} 
                    onChange={e => handleInputChange('positionApplied', e.target.value)} 
                    placeholder="HOUSEMAID"
                  />
                )}
             </div>
          </FormSection>

          <div className="bg-black/60 backdrop-blur-xl p-8 rounded-[40px] border border-white/5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-[11px] font-black tracking-[0.2em] text-slate-500 uppercase">
                <Building size={14} />
                <span>Office Overrides (Horizontal Placement)</span>
              </div>
              <button 
                onClick={incrementAllRefs}
                className="flex items-center gap-2 px-6 py-2.5 bg-pixel text-white hover:bg-pixelDark rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-pixel"
              >
                <Plus size={14}/> +1 All Refs
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => {
                const needsRef = t.fields.some(f => f.key === 'refNo');
                const needsSalary = t.fields.some(f => f.key === 'monthlySalary');
                if (!needsRef && !needsSalary) return null;

                return (
                  <div key={t.id} className="bg-secondary/40 p-4 rounded-3xl border border-surfaceElevated group hover:border-pixel/30 transition-all flex flex-col">
                    <div className="text-[9px] font-black text-pixel uppercase tracking-[0.2em] mb-4 flex items-center gap-2 truncate">
                      <div className="w-1.5 h-1.5 rounded-full bg-pixel"></div>
                      {t.name}
                    </div>
                    <div className="flex flex-col gap-3">
                      {needsRef && (
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter w-12">Ref No</span>
                          <input 
                            value={officeOverrides[t.id]?.refNo || ''}
                            onChange={e => handleOverrideChange(t.id, 'refNo', e.target.value)}
                            className="flex-1 bg-primary/40 border border-surfaceElevated rounded-xl p-2 text-[11px] text-white outline-none focus:border-pixel transition-all placeholder:text-slate-800"
                            placeholder="TK-..."
                          />
                        </div>
                      )}
                      {needsSalary && (
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter w-12">Salary</span>
                          <input 
                            value={officeOverrides[t.id]?.monthlySalary || ''}
                            onChange={e => handleOverrideChange(t.id, 'monthlySalary', e.target.value)}
                            className="flex-1 bg-primary/40 border border-surfaceElevated rounded-xl p-2 text-[11px] text-white outline-none focus:border-pixel transition-all placeholder:text-slate-800"
                            placeholder="1200 SR"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasAnyField(['photoFace', 'photoFull', 'photoPassport']) && (
            <FormSection title="Shared Assets" icon={<ImageIcon size={14} />} accentColor="pixel">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {hasFieldAcrossTemplates('photoFace') && <PhotoUpload label="FACE PHOTO" type="face" preview={formData.photos.face} onUpload={c => handlePhotoUpdate('face', c)} onRemove={() => handleInputChange('photos', {...formData.photos, face: null})} colorClass="pixel" />}
                  {hasFieldAcrossTemplates('photoFull') && <PhotoUpload label="FULL BODY" type="full" preview={formData.photos.full} onUpload={c => handlePhotoUpdate('full', c)} onRemove={() => handleInputChange('photos', {...formData.photos, full: null})} colorClass="pixel" />}
                  {hasFieldAcrossTemplates('photoPassport') && <PhotoUpload label="PASSPORT PHOTO" type="pass" preview={formData.photos.passport} onUpload={c => handlePhotoUpdate('passport', c)} onRemove={() => handleInputChange('photos', {...formData.photos, passport: null})} colorClass="pixel" isScanning={isScanning} />}
              </div>
            </FormSection>
          )}

          {hasAnyField(['fullName', 'religion', 'dob', 'pob', 'maritalStatus', 'education', 'height', 'weight', 'children', 'age']) && (
            <FormSection title="Candidate Core Data" icon={<User size={14}/>} accentColor="pixel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hasFieldAcrossTemplates('fullName') && <FormInput label="Full Name" value={formData.fullName || ''} onChange={e => handleInputChange('fullName', e.target.value)} />}
                  {hasFieldAcrossTemplates('religion') && (
                    <FormSelect 
                      label="Religion" 
                      value={formData.religion || ''} 
                      onChange={e => handleInputChange('religion', e.target.value)} 
                      options={[
                        { value: 'MUSLIM', label: 'MUSLIM' },
                        { value: 'CHRISTIAN', label: 'CHRISTIAN' },
                        { value: 'OTHER', label: 'OTHER' }
                      ]} 
                    />
                  )}
                  {hasFieldAcrossTemplates('dob') && <FormInput label="Date of Birth" type="date" value={formData.dob || ''} onChange={e => handleInputChange('dob', e.target.value)} />}
                  {hasFieldAcrossTemplates('pob') && <FormInput label="Place of Birth" value={formData.pob || ''} onChange={e => handleInputChange('pob', e.target.value)} placeholder="ADDIS ABABA" />}
                  {hasFieldAcrossTemplates('maritalStatus') && (
                    <FormSelect 
                      label="Marital Status" 
                      value={formData.maritalStatus || ''} 
                      onChange={e => handleInputChange('maritalStatus', e.target.value)} 
                      options={[
                        { value: 'SINGLE', label: 'SINGLE' },
                        { value: 'MARRIED', label: 'MARRIED' },
                        { value: 'DIVORCED', label: 'DIVORCED' },
                        { value: 'WIDOWED', label: 'WIDOWED' }
                      ]} 
                    />
                  )}
                  {hasFieldAcrossTemplates('children') && <FormInput label="No. of Children" value={formData.children || ''} onChange={e => handleInputChange('children', e.target.value)} placeholder="0" />}
                  {hasFieldAcrossTemplates('education') && <FormInput label="Education" value={formData.education || ''} onChange={e => handleInputChange('education', e.target.value)} />}
                  {hasFieldAcrossTemplates('height') && <FormInput label="Height" value={formData.height || ''} onChange={e => handleInputChange('height', e.target.value)} placeholder="1.65 M" />}
                  {hasFieldAcrossTemplates('weight') && <FormInput label="Weight" value={formData.weight || ''} onChange={e => handleInputChange('weight', e.target.value)} placeholder="58 KG" />}
                  {hasFieldAcrossTemplates('age') && <FormInput label="Age" value={formData.age || ''} onChange={e => handleInputChange('age', e.target.value)} placeholder="24" />}
              </div>
            </FormSection>
          )}

          {hasAnyField(['passportNumber', 'issueDate', 'expiryDate', 'placeOfIssue']) && (
            <FormSection title="Passport Details" icon={<Contact size={14}/>} accentColor="pixel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasFieldAcrossTemplates('passportNumber') && <FormInput label="Passport Number" value={formData.passportNumber || ''} onChange={e => handleInputChange('passportNumber', e.target.value)} />}
                {hasFieldAcrossTemplates('issueDate') && <FormInput label="Issue Date" type="date" value={formData.issueDate || ''} onChange={e => handleInputChange('issueDate', e.target.value)} />}
                {hasFieldAcrossTemplates('expiryDate') && <FormInput label="Expiry Date" type="date" value={formData.expiryDate || ''} onChange={e => handleInputChange('expiryDate', e.target.value)} />}
                {hasFieldAcrossTemplates('placeOfIssue') && <FormInput label="Place of Issue" value={formData.placeOfIssue || ''} onChange={e => handleInputChange('placeOfIssue', e.target.value)} />}
              </div>
            </FormSection>
          )}

          {hasAnyField(['contactName', 'contactAddress', 'contactRelation', 'contactPhone']) && (
            <FormSection title="Emergency Contact" icon={<Contact size={14}/>} accentColor="pixel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasFieldAcrossTemplates('contactName') && <FormInput label="Contact Name" value={formData.contactName || ''} onChange={e => handleInputChange('contactName', e.target.value)} />}
                {hasFieldAcrossTemplates('contactAddress') && <FormInput label="Address" value={formData.contactAddress || ''} onChange={e => handleInputChange('contactAddress', e.target.value)} />}
                {hasFieldAcrossTemplates('contactRelation') && <FormInput label="Relationship" value={formData.contactRelation || ''} onChange={e => handleInputChange('contactRelation', e.target.value)} />}
                {hasFieldAcrossTemplates('contactPhone') && <FormInput label="Contact Phone" value={formData.contactPhone || ''} onChange={e => handleInputChange('contactPhone', e.target.value)} />}
              </div>
            </FormSection>
          )}

          {hasAnyField(['langEnglishPoor', 'langEnglishFair', 'langEnglishFluent', 'langArabicPoor', 'langArabicFair', 'langArabicFluent', 'langEnglish', 'langArabic']) && (
            <FormSection title="Language Matrix" icon={<Languages size={14}/>} accentColor="pixel">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hasFieldAcrossTemplates('langEnglish') && <FormInput label="English Level (Text)" value={formData.langEnglish || ''} onChange={e => handleInputChange('langEnglish', e.target.value)} />}
                  {hasFieldAcrossTemplates('langArabic') && <FormInput label="Arabic Level (Text)" value={formData.langArabic || ''} onChange={e => handleInputChange('langArabic', e.target.value)} />}
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-surfaceElevated pb-4">
                    <div className="w-32 font-black text-white text-[11px] uppercase tracking-widest">English</div>
                    <div className="flex gap-6">
                      {['Poor', 'Fair', 'Fluent'].map(level => (
                        <FormRadio 
                          key={`eng-${level}`}
                          label={level}
                          checked={!!formData[`langEnglish${level}`]} 
                          onChange={() => handleLanguageSelect('English', level as any)} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-32 font-black text-white text-[11px] uppercase tracking-widest">Arabic</div>
                    <div className="flex gap-6">
                      {['Poor', 'Fair', 'Fluent'].map(level => (
                        <FormRadio 
                          key={`ara-${level}`}
                          label={level}
                          checked={!!formData[`langArabic${level}`]} 
                          onChange={() => handleLanguageSelect('Arabic', level as any)} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {requiredExpRecords > 0 && (
            <FormSection title="Previous Employment History" icon={<History size={14}/>} accentColor="pixel">
              <div className="space-y-6">
                <FormCheckbox id="hasExperience" label="HAS PREVIOUS EXPERIENCE" checked={!!formData.hasExperience} onChange={e => handleInputChange('hasExperience', e.target.checked)} />
                {formData.hasExperience && (
                  <div className="grid grid-cols-1 gap-6 animate-fade-in">
                    {Array.from({ length: requiredExpRecords }).map((_, i) => {
                      const idx = i + 1;
                      return (
                        <div key={idx} className="bg-secondary/40 p-6 rounded-3xl border border-surfaceElevated relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 font-black text-[9px] text-slate-700 uppercase tracking-widest">Record {idx}</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormInput label="Country" value={formData[`expCountry${idx}`] || ''} onChange={e => handleInputChange(`expCountry${idx}`, e.target.value)} placeholder="SAUDI ARABIA" />
                            <FormInput label="Period (Years)" value={formData[`expPeriod${idx}`] || ''} onChange={e => handleInputChange(`expPeriod${idx}`, e.target.value)} placeholder="2 YEARS" />
                            <FormInput label="Position Held" value={formData[`expPosition${idx}`] || ''} onChange={e => handleInputChange(`expPosition${idx}`, e.target.value)} placeholder="HOUSEMAID" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </FormSection>
          )}

          {hasAnyField(['skillWashing', 'skillCooking', 'skillBabyCare', 'skillCleaning', 'skillIroning', 'skillSewing']) && (
            <FormSection title="Competency Profile" icon={<CheckCircle2 size={14}/>} accentColor="pixel">
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {hasFieldAcrossTemplates('skillWashing') && <FormCheckbox id="skillWashing" label="Washing" checked={!!formData.skillWashing} onChange={e => handleInputChange('skillWashing', e.target.checked)} />}
                  {hasFieldAcrossTemplates('skillCooking') && <FormCheckbox id="skillCooking" label="Cooking" checked={!!formData.skillCooking} onChange={e => handleInputChange('skillCooking', e.target.checked)} />}
                  {hasFieldAcrossTemplates('skillBabyCare') && <FormCheckbox id="skillBabyCare" label="Baby Care" checked={!!formData.skillBabyCare} onChange={e => handleInputChange('skillBabyCare', e.target.checked)} />}
                  {hasFieldAcrossTemplates('skillCleaning') && <FormCheckbox id="skillCleaning" label="Cleaning" checked={!!formData.skillCleaning} onChange={e => handleInputChange('skillCleaning', e.target.checked)} />}
                  {hasFieldAcrossTemplates('skillIroning') && <FormCheckbox id="skillIroning" label="Ironing" checked={!!formData.skillIroning} onChange={e => handleInputChange('skillIroning', e.target.checked)} />}
                  {hasFieldAcrossTemplates('skillSewing') && <FormCheckbox id="skillSewing" label="Sewing" checked={!!formData.skillSewing} onChange={e => handleInputChange('skillSewing', e.target.checked)} />}
               </div>
            </FormSection>
          )}

          {supplementalFields.length > 0 && (
            <FormSection title="Supplemental Information" icon={<FilePlus size={14}/>} accentColor="pixel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {supplementalFields.map(f => (
                  f.type === 'checkmark' || f.type === 'boolean' ? (
                    <FormCheckbox 
                      key={f.key} 
                      id={f.key} 
                      label={f.label} 
                      checked={!!formData[f.key]} 
                      onChange={e => handleInputChange(f.key, e.target.checked)} 
                    />
                  ) : (
                    <FormInput 
                      key={f.key} 
                      label={f.label} 
                      value={formData[f.key] || ''} 
                      onChange={e => handleInputChange(f.key, e.target.value)} 
                    />
                  )
                ))}
              </div>
            </FormSection>
          )}

          <div className="bg-black/80 p-16 rounded-[56px] border border-white/5 shadow-2xl mt-16 backdrop-blur-3xl text-center group">
            <h4 className="text-xs font-black text-pixel uppercase tracking-[0.4em] mb-8">Execute Batch</h4>
            <button 
              onClick={generateAll}
              disabled={isGenerating}
              className="px-20 py-6 bg-pixel rounded-[28px] font-black text-2xl text-white shadow-pixel hover:bg-pixelDark hover:scale-[1.03] transition-all flex items-center justify-center gap-6 mx-auto disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={32} className="animate-spin" />
                  GENERATING {templates.length} PDFs...
                </>
              ) : (
                <>
                  <Sparkles size={32} className="animate-pulse" />
                  GENERATE {templates.length} CVs
                  <ChevronRight size={32} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllForm;
