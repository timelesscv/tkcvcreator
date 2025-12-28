
import React, { useState, useEffect, useMemo } from 'react';
import { BaseFormData } from '../../types';
import { FormInput, FormCheckbox, FormSection, PhotoUpload, Header, BackButton, FormSelect, FormRadio } from '../ui/FormComponents';
import { ImageIcon, Sparkles, FileText, ChevronRight, Building, User, Briefcase, Languages, History, Contact, PlusCircle, CheckCircle2 } from 'lucide-react';
import { generateTemplatePDF } from '../../utils/pdfGenerator';
import { processPassportImage, MRZData } from '../../utils/mrzHelper';
import { useAuth } from '../../context/AuthContext';

interface Props {
  country: string;
  flag: string;
  onBack: () => void;
}

export default function DynamicCountryForm({ country, flag, onBack }: Props) {
  // Fix: Removed activeApiKey from useAuth hook as utilities use process.env.API_KEY directly.
  const { user, trackGeneration, templates } = useAuth();
  const countryTemplates = templates.filter(t => t.country === country);
  
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState<BaseFormData>(() => {
    const initial: BaseFormData = {
      photos: { face: null, full: null, passport: null },
      officeName: '',
      hasExperience: false,
      religion: 'MUSLIM',
      maritalStatus: 'SINGLE',
      currentDate: new Date().toISOString().split('T')[0],
      langEnglishPoor: false,
      langEnglishFair: false,
      langEnglishFluent: false,
      langArabicPoor: false,
      langArabicFair: false,
      langArabicFluent: false,
    };
    return initial;
  });

  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age > 0 && age < 100) {
        setFormData(prev => ({ ...prev, age: age.toString() }));
      }
    }
  }, [formData.dob]);

  const handleInputChange = (key: string, value: any) => {
    const formattedValue = typeof value === 'string' ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [key]: formattedValue }));
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

  const handlePhotoUpload = async (type: 'face' | 'full' | 'passport', file: File | string) => {
    if (typeof file === 'string') {
      setFormData(prev => ({
        ...prev,
        photos: { ...prev.photos, [type]: file }
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({
        ...prev,
        photos: { ...prev.photos, [type]: e.target?.result as string }
      }));
    };
    reader.readAsDataURL(file);

    if (type === 'passport') {
      setIsScanning(true);
      try {
        // Fix: Removed unnecessary activeApiKey argument to match processPassportImage signature.
        const data: MRZData = await processPassportImage(file);
        setFormData(prev => ({
          ...prev,
          fullName: data.fullName,
          passportNumber: data.passportNumber,
          dob: data.dob,
          expiryDate: data.expiryDate,
          placeOfIssue: data.placeOfIssue || 'ADDIS ABABA',
          pob: data.pob
        }));
      } catch (e: any) {
        alert("Scan Failed: " + e.message);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const hasField = (key: string) => {
    return countryTemplates.some(t => t.fields.some(f => f.key === key));
  };

  const getCustomLabel = (key: string) => {
    for (const t of countryTemplates) {
      const f = t.fields.find(field => field.key === key);
      if (f?.customLabel) return f.customLabel;
    }
    return null;
  };

  const hasAnyField = (keys: string[]) => keys.some(key => hasField(key));

  const requiredExpRecords = useMemo(() => {
    let max = 0;
    countryTemplates.forEach(t => {
      t.fields.forEach(f => {
        const match = f.key.match(/^expCountry(\d)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > max) max = num;
        }
      });
    });
    return max;
  }, [countryTemplates]);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-32 animate-fade-in relative bg-primary">
      <BackButton onClick={onBack} />
      <Header title={`${country.toUpperCase()} Generator`} subtitle="Engineered Recruitment Solution" flag={flag} />

      {countryTemplates.length === 0 ? (
        <div className="bg-black/80 p-20 rounded-[48px] border-2 border-dashed border-white/10 text-center backdrop-blur-md">
            <Sparkles size={64} className="mx-auto mb-6 text-slate-800" />
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">No Layouts Detected</h3>
            <p className="text-slate-500 mb-12 max-w-xs mx-auto text-sm">Please build and deploy a template in the Studio to activate this country.</p>
            <button onClick={() => (window as any).onNavigate('settings')} className="px-10 py-4 bg-pixel text-white font-black rounded-2xl hover:bg-pixelDark transition-all shadow-pixel">
              Open Studio Console
            </button>
        </div>
      ) : (
        <div className="space-y-12">
          
          {hasAnyField(['photoFace', 'photoFull', 'photoPassport']) && (
            <FormSection title="Media Assets" icon={<ImageIcon size={14}/>} accentColor="pixel">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {hasField('photoFace') && <PhotoUpload label="FACE PHOTO" type="face" preview={formData.photos.face} onUpload={f => handlePhotoUpload('face', f)} onRemove={() => handleInputChange('photos', {...formData.photos, face: null})} colorClass="pixel" />}
                  {hasField('photoFull') && <PhotoUpload label="FULL BODY" type="full" preview={formData.photos.full} onUpload={f => handlePhotoUpload('full', f)} onRemove={() => handleInputChange('photos', {...formData.photos, full: null})} colorClass="pixel" />}
                  {hasField('photoPassport') && <PhotoUpload label="PASSPORT SCAN" type="pass" preview={formData.photos.passport} onUpload={f => handlePhotoUpload('passport', f)} onRemove={() => handleInputChange('photos', {...formData.photos, passport: null})} colorClass="pixel" isScanning={isScanning} />}
              </div>
            </FormSection>
          )}

          <FormSection title="Recruitment Parameters" icon={<Briefcase size={14}/>} accentColor="pixel">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasField('officeName') && <FormInput label="Agency/Office Identity" value={formData.officeName || ''} onChange={e => handleInputChange('officeName', e.target.value)} placeholder="e.g. STAR AGENCY" />}
                {hasField('refNo') && <FormInput label="Ref No" value={formData.refNo || ''} onChange={e => handleInputChange('refNo', e.target.value)} placeholder="TK-101" />}
                {hasField('positionApplied') && <FormInput label="Position Applied For" value={formData.positionApplied || ''} onChange={e => handleInputChange('positionApplied', e.target.value)} placeholder="HOUSEMAID" />}
                {hasField('monthlySalary') && <FormInput label="Monthly Salary" value={formData.monthlySalary || ''} onChange={e => handleInputChange('monthlySalary', e.target.value)} placeholder="1200 SR" />}
                {hasField('currentDate') && <FormInput label="Generation Date" type="date" value={formData.currentDate || ''} onChange={e => handleInputChange('currentDate', e.target.value)} />}
            </div>
          </FormSection>

          <FormSection title="Personal Profile" icon={<User size={14}/>} accentColor="pixel">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasField('fullName') && <FormInput label="Full Name" value={formData.fullName || ''} onChange={e => handleInputChange('fullName', e.target.value)} />}
                {hasField('religion') && <FormSelect label="Religion" value={formData.religion} onChange={e => handleInputChange('religion', e.target.value)} options={[{value:'MUSLIM',label:'MUSLIM'},{value:'CHRISTIAN',label:'CHRISTIAN'},{value:'OTHER',label:'OTHER'}]} />}
                {hasField('dob') && <FormInput label="Date of Birth" type="date" value={formData.dob || ''} onChange={e => handleInputChange('dob', e.target.value)} />}
                {hasField('age') && <FormInput label="Age (Auto-Calculated)" value={formData.age || ''} readOnly className="opacity-60 bg-black/20" />}
                {hasField('pob') && <FormInput label="Place of Birth" value={formData.pob || ''} onChange={e => handleInputChange('pob', e.target.value)} placeholder="ADDIS ABABA" />}
                {hasField('maritalStatus') && <FormSelect label="Marital Status" value={formData.maritalStatus} onChange={e => handleInputChange('maritalStatus', e.target.value)} options={[{value:'SINGLE',label:'SINGLE'},{value:'MARRIED',label:'MARRIED'},{value:'DIVORCED',label:'DIVORCED'},{value:'WIDOWED',label:'WIDOWED'}]} />}
                {hasField('children') && <FormInput label="No. of Children" type="number" value={formData.children || ''} onChange={e => handleInputChange('children', e.target.value)} />}
                {hasField('education') && <FormInput label="Educational Background" value={formData.education || ''} onChange={e => handleInputChange('education', e.target.value)} />}
                {hasField('height') && <FormInput label="Height" value={formData.height || ''} onChange={e => handleInputChange('height', e.target.value)} placeholder="1.65 M" />}
                {hasField('weight') && <FormInput label="Weight" value={formData.weight || ''} onChange={e => handleInputChange('weight', e.target.value)} placeholder="58 KG" />}
            </div>
          </FormSection>

          {hasAnyField(['passportNumber', 'issueDate', 'expiryDate', 'placeOfIssue']) && (
            <FormSection title="Travel Credentials" icon={<Contact size={14}/>} accentColor="pixel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasField('passportNumber') && <FormInput label="Passport Number" value={formData.passportNumber || ''} onChange={e => handleInputChange('passportNumber', e.target.value)} />}
                {hasField('issueDate') && <FormInput label="Issue Date" type="date" value={formData.issueDate || ''} onChange={e => handleInputChange('issueDate', e.target.value)} />}
                {hasField('expiryDate') && <FormInput label="Expiry Date" type="date" value={formData.expiryDate || ''} onChange={e => handleInputChange('expiryDate', e.target.value)} />}
                {hasField('placeOfIssue') && <FormInput label="Place of Issue" value={formData.placeOfIssue || ''} onChange={e => handleInputChange('placeOfIssue', e.target.value)} />}
              </div>
            </FormSection>
          )}

          {hasAnyField(['langEnglishPoor', 'langEnglishFair', 'langEnglishFluent', 'langArabicPoor', 'langArabicFair', 'langArabicFluent']) && (
            <FormSection title="Language Proficiency" icon={<Languages size={14}/>} accentColor="pixel">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-surfaceElevated pb-4">
                  <div className="w-32 font-black text-white text-[11px] uppercase tracking-widest">English</div>
                  <div className="flex gap-6">
                    {['Poor', 'Fair', 'Fluent'].map(level => (
                      <FormRadio key={`eng-${level}`} label={level} checked={!!formData[`langEnglish${level}`]} onChange={() => handleLanguageSelect('English', level as any)} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-32 font-black text-white text-[11px] uppercase tracking-widest">Arabic</div>
                  <div className="flex gap-6">
                    {['Poor', 'Fair', 'Fluent'].map(level => (
                      <FormRadio key={`ara-${level}`} label={level} checked={!!formData[`langArabic${level}`]} onChange={() => handleLanguageSelect('Arabic', level as any)} />
                    ))}
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
                  {hasField('skillWashing') && <FormCheckbox id="skillWashing" label="Washing" checked={!!formData.skillWashing} onChange={e => handleInputChange('skillWashing', e.target.checked)} />}
                  {hasField('skillCooking') && <FormCheckbox id="skillCooking" label="Cooking" checked={!!formData.skillCooking} onChange={e => handleInputChange('skillCooking', e.target.checked)} />}
                  {hasField('skillBabyCare') && <FormCheckbox id="skillBabyCare" label="Baby Care" checked={!!formData.skillBabyCare} onChange={e => handleInputChange('skillBabyCare', e.target.checked)} />}
                  {hasField('skillCleaning') && <FormCheckbox id="skillCleaning" label="Cleaning" checked={!!formData.skillCleaning} onChange={e => handleInputChange('skillCleaning', e.target.checked)} />}
                  {hasField('skillIroning') && <FormCheckbox id="skillIroning" label="Ironing" checked={!!formData.skillIroning} onChange={e => handleInputChange('skillIroning', e.target.checked)} />}
                  {hasField('skillSewing') && <FormCheckbox id="skillSewing" label="Sewing" checked={!!formData.skillSewing} onChange={e => handleInputChange('skillSewing', e.target.checked)} />}
               </div>
            </FormSection>
          )}

          {hasAnyField(['customField1', 'customField2', 'customField3', 'customField4', 'customField5', 'customField6', 'customField7', 'customField8', 'customField9', 'customField10']) && (
            <FormSection title="Additional Information" icon={<PlusCircle size={14}/>} accentColor="pixel">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(idx => {
                  const key = `customField${idx}`;
                  const customLabel = getCustomLabel(key);
                  return hasField(key) && (
                    <FormInput 
                      key={key}
                      label={customLabel || `Custom Information ${idx}`} 
                      value={formData[key] || ''} 
                      onChange={e => handleInputChange(key, e.target.value)} 
                      placeholder="..." 
                    />
                  );
                })}
               </div>
            </FormSection>
          )}

          <div className="bg-black/80 p-12 rounded-[56px] border border-white/5 shadow-2xl mt-16 backdrop-blur-3xl relative overflow-hidden group">
            <div className="text-center mb-10 relative z-10">
                <h4 className="text-xs font-black text-pixel uppercase tracking-[0.4em] mb-3">Generation Engine</h4>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Choose an office template to compile your final CV.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                {countryTemplates.map(t => (
                  <button key={t.id} onClick={() => { generateTemplatePDF(formData, t, user?.agencyName); trackGeneration(1); }} className="p-8 bg-white/5 border border-white/10 rounded-[32px] flex items-center justify-between hover:bg-pixel hover:border-pixel transition-all group/btn shadow-xl">
                    <div className="flex items-center gap-5">
                       <div className="p-4 rounded-[20px] bg-black/40 text-pixel group-hover/btn:text-white transition-all"><FileText size={24}/></div>
                       <div className="text-left"><div className="font-black text-white text-sm uppercase">{t.name}</div><div className="text-[10px] text-slate-500 uppercase font-black mt-1">{t.fields.length} Active Fields</div></div>
                    </div>
                    <ChevronRight size={24} className="text-slate-700 group-hover/btn:text-white transition-all" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
