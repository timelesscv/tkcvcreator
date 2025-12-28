
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CustomTemplate, TemplateField, FieldType, FieldCategory } from '../../types';
import { 
  ChevronLeft, Save, Trash2, Type, MousePointer2, Bold, Italic, 
  AlignLeft, AlignCenter, AlignRight, Search, CheckSquare, 
  ImageIcon, Building, Files, FilePlus, Grid, CaseSensitive,
  LayoutDashboard, AlignStartVertical, AlignEndVertical, AlignCenterVertical,
  AlignStartHorizontal, AlignEndHorizontal, AlignCenterHorizontal
} from 'lucide-react';

interface Props {
  onSave: (template: CustomTemplate, pageAssets: (string | File)[]) => void;
  onCancel: () => void;
  initialTemplate?: CustomTemplate | null;
}

type ResizeDir = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | null;

const FONT_FAMILIES = [
  { value: 'Helvetica', label: 'Sans-Serif (Standard)' },
  { value: 'Times New Roman', label: 'Serif (Standard)' },
  { value: 'Courier', label: 'Monospace (Standard)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Century', label: 'Century' },
  { value: 'Poppins', label: 'Poppins' },
];

const FIELD_GROUPS = [
  {
    title: '1. Photos',
    fields: [
      { key: 'photoFace', label: 'Face Photo', type: 'image', category: 'personal' },
      { key: 'photoFull', label: 'Full Body Photo', type: 'image', category: 'personal' },
      { key: 'photoPassport', label: 'Passport Photo', type: 'image', category: 'personal' }
    ]
  },
  {
    title: '2. Position & Salary',
    fields: [
      { key: 'currentDate', label: "Today's Date", type: 'text', category: 'personal' },
      { key: 'officeName', label: 'Office Name (Auto)', type: 'text', category: 'personal' },
      { key: 'positionApplied', label: 'Applied Position', type: 'text', category: 'personal' },
      { key: 'refNo', label: 'Ref No', type: 'text', category: 'personal' },
      { key: 'monthlySalary', label: 'Monthly Salary', type: 'text', category: 'personal' }
    ]
  },
  {
    title: '3. Personal Details',
    fields: [
      { key: 'fullName', label: 'Full Name', type: 'text', category: 'personal' },
      { key: 'religion', label: 'Religion', type: 'text', category: 'personal' },
      { key: 'dob', label: 'Date of Birth', type: 'text', category: 'personal' },
      { key: 'age', label: 'Age', type: 'text', category: 'personal' },
      { key: 'pob', label: 'Place of Birth', type: 'text', category: 'personal' },
      { key: 'maritalStatus', label: 'Marital Status', type: 'text', category: 'personal' },
      { key: 'children', label: 'Children', type: 'text', category: 'personal' },
      { key: 'education', label: 'Education', type: 'text', category: 'personal' },
      { key: 'height', label: 'Height', type: 'text', category: 'personal' },
      { key: 'weight', label: 'Weight', type: 'text', category: 'personal' }
    ]
  },
  {
    title: '4. Passport Details',
    fields: [
      { key: 'passportNumber', label: 'Passport No', type: 'text', category: 'passport' },
      { key: 'issueDate', label: 'Issue Date', type: 'text', category: 'passport' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'text', category: 'passport' },
      { key: 'placeOfIssue', label: 'Place of Issue', type: 'text', category: 'passport' }
    ]
  },
  {
    title: '5. Language Proficiency',
    fields: [
      { key: 'langEnglishPoor', label: 'English: Poor', type: 'boolean', category: 'skills' },
      { key: 'langEnglishFair', label: 'English: Fair', type: 'boolean', category: 'skills' },
      { key: 'langEnglishFluent', label: 'English: Fluent', type: 'boolean', category: 'skills' },
      { key: 'langArabicPoor', label: 'Arabic: Poor', type: 'boolean', category: 'skills' },
      { key: 'langArabicFair', label: 'Arabic: Fair', type: 'boolean', category: 'skills' },
      { key: 'langArabicFluent', label: 'Arabic: Fluent', type: 'boolean', category: 'skills' }
    ]
  },
  {
    title: '6. Previous Employment (All Records)',
    fields: [
      { key: 'expCountry1', label: 'Country 1', type: 'text', category: 'experience' },
      { key: 'expPeriod1', label: 'Period 1', type: 'text', category: 'experience' },
      { key: 'expPosition1', label: 'Position 1', type: 'text', category: 'experience' },
      { key: 'expCountry2', label: 'Country 2', type: 'text', category: 'experience' },
      { key: 'expPeriod2', label: 'Period 2', type: 'text', category: 'experience' },
      { key: 'expPosition2', label: 'Position 2', type: 'text', category: 'experience' },
      { key: 'expCountry3', label: 'Country 3', type: 'text', category: 'experience' },
      { key: 'expPeriod3', label: 'Period 3', type: 'text', category: 'experience' },
      { key: 'expPosition3', label: 'Position 3', type: 'text', category: 'experience' },
      { key: 'expCountry4', label: 'Country 4', type: 'text', category: 'experience' },
      { key: 'expPeriod4', label: 'Period 4', type: 'text', category: 'experience' },
      { key: 'expPosition4', label: 'Position 4', type: 'text', category: 'experience' },
    ]
  },
  {
    title: '7. Skills & Performance',
    fields: [
      { key: 'skillWashing', label: 'Washing', type: 'checkmark', category: 'skills' },
      { key: 'skillCooking', label: 'Cooking', type: 'checkmark', category: 'skills' },
      { key: 'skillBabyCare', label: 'Baby Care', type: 'checkmark', category: 'skills' },
      { key: 'skillCleaning', label: 'Cleaning', type: 'checkmark', category: 'skills' },
      { key: 'skillIroning', label: 'Ironing', type: 'checkmark', category: 'skills' },
      { key: 'skillSewing', label: 'Sewing', type: 'checkmark', category: 'skills' },
    ]
  },
  {
    title: '8. Contact Person',
    fields: [
      { key: 'contactName', label: 'Contact Name', type: 'text', category: 'contact' },
      { key: 'contactAddress', label: 'Contact Address', type: 'text', category: 'contact' },
      { key: 'contactRelation', label: 'Relationship', type: 'text', category: 'contact' },
      { key: 'contactPhone', label: 'Contact Phone', type: 'text', category: 'contact' }
    ]
  },
  {
    title: '9. Custom Fields',
    fields: [
      { key: 'customField1', label: 'Custom 1', type: 'text', category: 'custom' },
      { key: 'customField2', label: 'Custom 2', type: 'text', category: 'custom' },
      { key: 'customField3', label: 'Custom 3', type: 'text', category: 'custom' },
      { key: 'customField4', label: 'Custom 4', type: 'text', category: 'custom' },
      { key: 'customField5', label: 'Custom 5', type: 'text', category: 'custom' },
      { key: 'customField6', label: 'Custom 6', type: 'text', category: 'custom' },
      { key: 'customField7', label: 'Custom 7', type: 'text', category: 'custom' },
      { key: 'customField8', label: 'Custom 8', type: 'text', category: 'custom' },
      { key: 'customField9', label: 'Custom 9', type: 'text', category: 'custom' },
      { key: 'customField10', label: 'Custom 10', type: 'text', category: 'custom' },
    ]
  }
];

export const TemplateBuilder: React.FC<Props> = ({ onSave, onCancel, initialTemplate }) => {
  const [pages, setPages] = useState<string[]>(initialTemplate?.pages || []);
  const [pageAssets, setPageAssets] = useState<(string | File)[]>(initialTemplate?.pages || []);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [name, setName] = useState(initialTemplate?.name || 'New Layout');
  const [officeName, setOfficeName] = useState(initialTemplate?.officeName || '');
  const [country, setCountry] = useState(initialTemplate?.country || 'kuwait');
  const [fields, setFields] = useState<TemplateField[]>(initialTemplate?.fields || []);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [snapToGrid, setSnapToGrid] = useState(false);
  
  const [interactionMode, setInteractionMode] = useState<'none' | 'dragging' | 'resizing' | 'marquee'>('none');
  const [resizeDir, setResizeDir] = useState<ResizeDir>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialSelectedFields = useRef<TemplateField[]>([]);

  const handlePageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setPages([...pages, reader.result as string]);
        setPageAssets([...pageAssets, file]);
        if (pages.length === 0) setCurrentPageIndex(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const addField = (template: any) => {
    if (pages.length === 0) return alert("Please upload a CV page background first.");
    const newField: TemplateField = {
      id: crypto.randomUUID(),
      key: template.key,
      label: template.label,
      x: 10, y: 10, width: template.type === 'checkmark' ? 4 : 40, height: template.type === 'checkmark' ? 4 : 6,
      page: currentPageIndex + 1,
      type: template.type as FieldType,
      category: template.category as FieldCategory,
      fontSize: 12, fontFamily: 'Helvetica', color: '#000000',
      bold: false, italic: false, align: 'left',
      dateFormat: 'alpha'
    };
    setFields([...fields, newField]);
    setSelectedFieldIds([newField.id]);
  };

  const getRelativeCoords = (e: MouseEvent | React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleMouseDown = (e: React.MouseEvent, fieldId?: string, dir: ResizeDir = null) => {
    const coords = getRelativeCoords(e);
    dragStartPos.current = coords;

    if (fieldId) {
      e.stopPropagation();
      const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
      
      if (isMulti) {
        setSelectedFieldIds(prev => prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]);
      } else if (!selectedFieldIds.includes(fieldId)) {
        setSelectedFieldIds([fieldId]);
      }

      if (dir) {
        setInteractionMode('resizing');
        setResizeDir(dir);
      } else {
        setInteractionMode('dragging');
      }
      initialSelectedFields.current = fields.filter(f => (isMulti ? [...selectedFieldIds, fieldId] : selectedFieldIds).includes(f.id));
    } else {
      setInteractionMode('marquee');
      setMarqueeRect({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) setSelectedFieldIds([]);
    }
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (interactionMode === 'none' || !containerRef.current) return;
    const currentCoords = getRelativeCoords(e);
    const deltaX = currentCoords.x - dragStartPos.current.x;
    const deltaY = currentCoords.y - dragStartPos.current.y;

    if (interactionMode === 'dragging') {
      setFields(prev => prev.map(f => {
        if (selectedFieldIds.includes(f.id)) {
          const initial = initialSelectedFields.current.find(ifield => ifield.id === f.id);
          if (!initial) return f;
          let newX = initial.x + deltaX;
          let newY = initial.y + deltaY;
          if (snapToGrid) {
            newX = Math.round(newX / 2) * 2;
            newY = Math.round(newY / 2) * 2;
          }
          return { ...f, x: Math.max(0, Math.min(100 - f.width, newX)), y: Math.max(0, Math.min(100 - f.height, newY)) };
        }
        return f;
      }));
    } else if (interactionMode === 'resizing' && selectedFieldIds.length === 1) {
      const targetedId = selectedFieldIds[0];
      setFields(prev => prev.map(f => {
        if (f.id !== targetedId) return f;
        let { x, y, width, height } = f;
        if (resizeDir?.includes('r')) width = Math.max(1, currentCoords.x - x);
        if (resizeDir?.includes('l')) { const d = x - currentCoords.x; if (width + d > 1) { x = currentCoords.x; width += d; } }
        if (resizeDir?.includes('b')) height = Math.max(1, currentCoords.y - y);
        if (resizeDir?.includes('t')) { const d = y - currentCoords.y; if (height + d > 1) { y = currentCoords.y; height += d; } }
        
        if (snapToGrid) {
          x = Math.round(x / 1) * 1;
          y = Math.round(y / 1) * 1;
          width = Math.round(width / 1) * 1;
          height = Math.round(height / 1) * 1;
        }

        return { ...f, x, y, width, height };
      }));
    } else if (interactionMode === 'marquee') {
      setMarqueeRect(prev => prev ? { ...prev, x2: currentCoords.x, y2: currentCoords.y } : null);
    }
  }, [interactionMode, selectedFieldIds, resizeDir, snapToGrid]);

  const handleGlobalMouseUp = useCallback(() => {
    if (interactionMode === 'marquee' && marqueeRect) {
      const xMin = Math.min(marqueeRect.x1, marqueeRect.x2);
      const xMax = Math.max(marqueeRect.x1, marqueeRect.x2);
      const yMin = Math.min(marqueeRect.y1, marqueeRect.y2);
      const yMax = Math.max(marqueeRect.y1, marqueeRect.y2);

      const newlySelected = fields
        .filter(f => f.page === currentPageIndex + 1)
        .filter(f => f.x >= xMin && f.x + f.width <= xMax && f.y >= yMin && f.y + f.height <= yMax)
        .map(f => f.id);
      
      setSelectedFieldIds(prev => Array.from(new Set([...prev, ...newlySelected])));
    }
    setInteractionMode('none');
    setMarqueeRect(null);
  }, [interactionMode, marqueeRect, fields, currentPageIndex]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  const updateSelectedFields = (updates: Partial<TemplateField>) => {
    setFields(prev => prev.map(f => selectedFieldIds.includes(f.id) ? { ...f, ...updates } : f));
  };

  const alignFields = (type: 'top' | 'bottom' | 'left' | 'right' | 'h-center' | 'v-center') => {
    if (selectedFieldIds.length < 2) return;
    const selected = fields.filter(f => selectedFieldIds.includes(f.id));
    
    let targetValue = 0;
    switch(type) {
      case 'top': targetValue = Math.min(...selected.map(f => f.y)); break;
      case 'bottom': targetValue = Math.max(...selected.map(f => f.y + f.height)); break;
      case 'left': targetValue = Math.min(...selected.map(f => f.x)); break;
      case 'right': targetValue = Math.max(...selected.map(f => f.x + f.width)); break;
      case 'h-center': targetValue = selected.reduce((acc, f) => acc + (f.x + f.width/2), 0) / selected.length; break;
      case 'v-center': targetValue = selected.reduce((acc, f) => acc + (f.y + f.height/2), 0) / selected.length; break;
    }

    setFields(prev => prev.map(f => {
      if (!selectedFieldIds.includes(f.id)) return f;
      switch(type) {
        case 'top': return { ...f, y: targetValue };
        case 'bottom': return { ...f, y: targetValue - f.height };
        case 'left': return { ...f, x: targetValue };
        case 'right': return { ...f, x: targetValue - f.width };
        case 'h-center': return { ...f, x: targetValue - f.width/2 };
        case 'v-center': return { ...f, y: targetValue - f.height/2 };
        default: return f;
      }
    }));
  };

  const primaryField = fields.find(f => f.id === selectedFieldIds[selectedFieldIds.length - 1]);

  const ResizeHandle = ({ dir }: { dir: ResizeDir }) => {
    const cursorClass = { tl: 'cursor-nw-resize', tr: 'cursor-ne-resize', bl: 'cursor-sw-resize', br: 'cursor-se-resize', t: 'cursor-n-resize', b: 'cursor-s-resize', l: 'cursor-w-resize', r: 'cursor-e-resize' }[dir as string];
    const posClass = { tl: '-top-1.5 -left-1.5', tr: '-top-1.5 -right-1.5', bl: '-bottom-1.5 -left-1.5', br: '-bottom-1.5 -right-1.5', t: '-top-1.5 left-1/2 -translate-x-1/2', b: '-bottom-1.5 left-1/2 -translate-x-1/2', l: '-left-1.5 top-1/2 -translate-y-1/2', r: '-right-1.5 top-1/2 -translate-y-1/2' }[dir as string];
    return (
      <div 
        onMouseDown={(e) => handleMouseDown(e, selectedFieldIds[0], dir)}
        className={`absolute w-3 h-3 bg-white border-2 border-pixel rounded-full z-50 shadow-sm ${cursorClass} ${posClass}`} 
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-primary z-[100] flex flex-col overflow-hidden text-slate-200 animate-fade-in">
      <header className="h-20 border-b border-surfaceElevated bg-secondary flex items-center justify-between px-6 shrink-0 shadow-lg">
        <div className="flex items-center gap-6">
          <button onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group uppercase font-black text-[10px]">
            <ChevronLeft size={20} /> Exit Studio
          </button>
          <div className="flex items-center gap-3">
             <Building size={14} className="text-pixel" />
             <div className="flex flex-col gap-0.5">
               <input value={officeName} onChange={e => setOfficeName(e.target.value)} className="bg-transparent border-none p-0 font-black text-sm outline-none focus:ring-0 w-48 placeholder:text-slate-700" placeholder="OFFICE NAME..." />
               <input value={name} onChange={e => setName(e.target.value)} className="bg-transparent border-none p-0 text-slate-500 font-bold text-[10px] outline-none focus:ring-0 w-48" placeholder="LAYOUT VERSION..." />
             </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Target Country</span>
              <select 
                value={country} 
                onChange={e => setCountry(e.target.value)}
                className="bg-primary text-pixel border border-surfaceElevated px-4 py-1.5 rounded-xl font-black text-[10px] uppercase outline-none focus:ring-0 cursor-pointer"
              >
                <option value="kuwait">KUWAIT</option>
                <option value="saudi">SAUDI ARABIA</option>
                <option value="jordan">JORDAN</option>
                <option value="oman">OMAN</option>
                <option value="uae">UAE</option>
                <option value="qatar">QATAR</option>
                <option value="bahrain">BAHRAIN</option>
              </select>
            </div>

            <button 
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${snapToGrid ? 'bg-pixel text-white shadow-lg' : 'bg-surface text-slate-500 border border-surfaceElevated'}`}
            >
                <Grid size={14} /> Grid Snap
            </button>
        </div>

        <button onClick={() => { if(!officeName) return alert("Office Name required."); onSave({ id: initialTemplate?.id || crypto.randomUUID(), name, officeName, country, pages: [], fields, createdAt: initialTemplate?.createdAt || new Date().toISOString() }, pageAssets); }} className="px-8 py-3 bg-pixel rounded-xl text-white font-black text-[11px] hover:bg-pixelDark transition-all shadow-pixel">
          <Save size={16} className="inline mr-2" /> DEPLOY
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-surfaceElevated bg-secondary flex flex-col shrink-0">
          <div className="p-4 border-b border-surfaceElevated bg-black/20">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                <input placeholder="SEARCH FIELDS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-primary border border-surfaceElevated rounded-lg pl-10 pr-4 py-2.5 text-[10px] font-black tracking-widest text-white outline-none focus:border-pixel transition-all" />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            <div className="mb-6 px-2">
               <h4 className="px-2 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                 <span><Files size={12} className="inline mr-2"/> Pages</span>
                 <label className="text-pixel hover:text-white cursor-pointer"><FilePlus size={16} /><input type="file" hidden accept="image/*" onChange={handlePageUpload} /></label>
               </h4>
               <div className="grid grid-cols-3 gap-2">
                  {pages.map((p, idx) => (
                    <button key={idx} onClick={() => setCurrentPageIndex(idx)} className={`relative aspect-[21/29] rounded-lg border-2 overflow-hidden ${currentPageIndex === idx ? 'border-pixel ring-2 ring-pixel/20' : 'border-surfaceElevated opacity-40 hover:opacity-70 transition-all'}`}>
                       <img src={p} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                         <span className="text-[10px] font-black text-white">{idx+1}</span>
                       </div>
                    </button>
                  ))}
               </div>
            </div>
            {FIELD_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="mb-4">
                 <h4 className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase border-b border-surfaceElevated/30 tracking-widest">{group.title}</h4>
                 <div className="space-y-0.5 mt-2">
                   {group.fields.filter(f => f.label.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
                      <button key={f.key} onClick={() => addField(f)} className="w-full text-left px-4 py-2 rounded-xl hover:bg-surfaceElevated flex items-center gap-3 transition-all group/field">
                         <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-slate-500 group-hover/field:text-pixel transition-colors">{f.type === 'checkmark' ? <CheckSquare size={14}/> : f.type === 'image' ? <ImageIcon size={14}/> : <Type size={14}/>}</div>
                         <span className="text-xs font-bold text-slate-400 group-hover/field:text-white transition-colors">{f.label}</span>
                      </button>
                   ))}
                 </div>
              </div>
            ))}
          </div>
        </aside>

        <main 
          className="flex-1 bg-primary overflow-auto flex flex-col items-center p-12 relative scrollbar-hide" 
          onMouseDown={(e) => handleMouseDown(e)}
        >
          <div ref={containerRef} className="relative bg-white shadow-2xl shrink-0 border border-surfaceElevated" style={{ width: '100%', maxWidth: '650px', aspectRatio: '210/297' }}>
            {pages.length > 0 ? (
              <>
                <img src={pages[currentPageIndex]} className="w-full h-full object-fill pointer-events-none" />
                {fields.filter(f => f.page === currentPageIndex + 1).map(f => (
                  <div 
                    key={f.id} 
                    onMouseDown={e => handleMouseDown(e, f.id)} 
                    onClick={e => e.stopPropagation()} 
                    className={`absolute border flex items-center justify-center transition-all cursor-move ${selectedFieldIds.includes(f.id) ? 'border-pixel bg-pixel/10 z-30 ring-1 ring-pixel/20 border-solid' : 'border-slate-300 border-dashed bg-white/5 hover:border-pixel/40'}`} 
                    style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}%`, height: `${f.height}%`, fontFamily: f.fontFamily, fontSize: `${f.fontSize}px`, color: f.color, textAlign: f.align, fontWeight: f.bold ? 'bold' : 'normal', fontStyle: f.italic ? 'italic' : 'normal' }}
                  >
                    {selectedFieldIds.length === 1 && selectedFieldIds[0] === f.id && (
                      <>
                        <ResizeHandle dir="tl" /><ResizeHandle dir="tr" /><ResizeHandle dir="bl" /><ResizeHandle dir="br" />
                        <ResizeHandle dir="t" /><ResizeHandle dir="b" /><ResizeHandle dir="l" /><ResizeHandle dir="r" />
                      </>
                    )}
                    <span className="truncate px-1 w-full text-[8px] opacity-40 font-black uppercase tracking-tighter select-none">{f.type === 'checkmark' ? '✓' : (f.customLabel || f.label)}</span>
                  </div>
                ))}
                {marqueeRect && (
                  <div 
                    className="absolute bg-pixel/10 border border-pixel border-dashed z-50 pointer-events-none"
                    style={{
                      left: `${Math.min(marqueeRect.x1, marqueeRect.x2)}%`,
                      top: `${Math.min(marqueeRect.y1, marqueeRect.y2)}%`,
                      width: `${Math.abs(marqueeRect.x1 - marqueeRect.x2)}%`,
                      height: `${Math.abs(marqueeRect.y1 - marqueeRect.y2)}%`
                    }}
                  />
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-secondary/50">
                <LayoutDashboard size={64} className="opacity-10 mb-4" />
                <label className="px-10 py-4 bg-pixel text-white font-black text-xs uppercase rounded-2xl cursor-pointer hover:bg-pixelDark transition-all shadow-pixel">Import Background<input type="file" hidden accept="image/*" onChange={handlePageUpload} /></label>
              </div>
            )}
          </div>
        </main>

        <aside className="w-80 border-l border-surfaceElevated bg-secondary p-6 overflow-y-auto scrollbar-hide">
          {selectedFieldIds.length > 0 ? (
            <div className="space-y-6 animate-slide-in">
              <h3 className="text-white font-black text-xl uppercase truncate">
                {selectedFieldIds.length > 1 ? `${selectedFieldIds.length} FIELDS SELECTED` : (primaryField?.customLabel || primaryField?.label)}
              </h3>

              {/* Unique Properties (Only for Single Selection) */}
              {selectedFieldIds.length === 1 && primaryField && (
                <>
                  {primaryField.type !== 'image' && (
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Output Mode</label>
                      <div className="flex gap-1 p-1 bg-primary border border-surfaceElevated rounded-xl">
                        <button onClick={() => updateSelectedFields({ type: 'text' })} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${primaryField.type === 'text' ? 'bg-pixel text-white' : 'text-slate-600'}`}>Text</button>
                        <button onClick={() => updateSelectedFields({ type: 'checkmark' })} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${primaryField.type === 'checkmark' ? 'bg-pixel text-white' : 'text-slate-600'}`}>Check</button>
                        <button onClick={() => updateSelectedFields({ type: 'boolean' })} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${primaryField.type === 'boolean' ? 'bg-pixel text-white' : 'text-slate-600'}`}>Yes/No</button>
                      </div>
                    </div>
                  )}

                  {primaryField.category === 'custom' && (
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Rename Custom Field</label>
                      <div className="flex gap-2 bg-primary border border-surfaceElevated p-2 rounded-xl">
                        <CaseSensitive size={14} className="text-pixel mt-1.5 ml-1"/>
                        <input value={primaryField.customLabel || ''} onChange={e => updateSelectedFields({ customLabel: e.target.value.toUpperCase() })} className="bg-transparent border-none p-0 text-sm text-white outline-none w-full" placeholder="e.g. DRIVING LICENSE" />
                      </div>
                    </div>
                  )}

                  {(primaryField.key.toLowerCase().includes('date') || primaryField.key === 'dob') && (
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Date Output Style</label>
                      <div className="flex gap-1 p-1 bg-primary border border-surfaceElevated rounded-xl">
                        <button onClick={() => updateSelectedFields({ dateFormat: 'numeric' })} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${primaryField.dateFormat === 'numeric' ? 'bg-pixel text-white' : 'text-slate-600'}`}>14/02/2025</button>
                        <button onClick={() => updateSelectedFields({ dateFormat: 'alpha' })} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${primaryField.dateFormat === 'alpha' ? 'bg-pixel text-white' : 'text-slate-600'}`}>14 FEB 2025</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Shared Properties (One or Many) */}
              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Font Family</label>
                <select value={primaryField?.fontFamily} onChange={e => updateSelectedFields({ fontFamily: e.target.value })} className="w-full bg-primary border border-surfaceElevated rounded-xl px-4 py-2 text-xs text-white outline-none appearance-none cursor-pointer">
                  {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Size</label>
                  <input type="number" value={primaryField?.fontSize} onChange={e => updateSelectedFields({ fontSize: parseInt(e.target.value) })} className="w-full bg-primary border border-surfaceElevated rounded-xl px-4 py-2 text-xs text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Color</label>
                  <input type="color" value={primaryField?.color} onChange={e => updateSelectedFields({ color: e.target.value })} className="w-full h-8 cursor-pointer rounded-lg bg-transparent p-0 border-none" />
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Formatting</label>
                 <div className="flex gap-1 p-1 bg-primary border border-surfaceElevated rounded-2xl">
                    <button onClick={() => updateSelectedFields({ bold: !primaryField?.bold })} className={`flex-1 p-2 rounded-xl ${primaryField?.bold ? 'bg-pixel text-white' : 'text-slate-600'}`}><Bold size={16} className="mx-auto" /></button>
                    <button onClick={() => updateSelectedFields({ italic: !primaryField?.italic })} className={`flex-1 p-2 rounded-xl ${primaryField?.italic ? 'bg-pixel text-white' : 'text-slate-600'}`}><Italic size={16} className="mx-auto" /></button>
                    <button onClick={() => updateSelectedFields({ align: 'left' })} className={`flex-1 p-2 rounded-xl ${primaryField?.align === 'left' ? 'bg-pixel text-white' : 'text-slate-600'}`}><AlignLeft size={16} className="mx-auto" /></button>
                    <button onClick={() => updateSelectedFields({ align: 'center' })} className={`flex-1 p-2 rounded-xl ${primaryField?.align === 'center' ? 'bg-pixel text-white' : 'text-slate-600'}`}><AlignCenter size={16} className="mx-auto" /></button>
                    <button onClick={() => updateSelectedFields({ align: 'right' })} className={`flex-1 p-2 rounded-xl ${primaryField?.align === 'right' ? 'bg-pixel text-white' : 'text-slate-600'}`}><AlignRight size={16} className="mx-auto" /></button>
                 </div>
              </div>

              {/* Positional Alignment (Only for Multi-Selection) */}
              {selectedFieldIds.length > 1 && (
                <div className="space-y-2 pt-4 border-t border-surfaceElevated">
                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Global Alignment</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => alignFields('left')} className="p-2 bg-primary border border-surfaceElevated rounded-xl hover:bg-pixel hover:text-white transition-all"><AlignStartVertical size={16} className="mx-auto"/></button>
                    <button onClick={() => alignFields('h-center')} className="p-2 bg-primary border border-surfaceElevated rounded-xl hover:bg-pixel hover:text-white transition-all"><AlignCenterVertical size={16} className="mx-auto"/></button>
                    <button onClick={() => alignFields('right')} className="p-2 bg-primary border border-surfaceElevated rounded-xl hover:bg-pixel hover:text-white transition-all"><AlignEndVertical size={16} className="mx-auto"/></button>
                    <button onClick={() => alignFields('top')} className="p-2 bg-primary border border-surfaceElevated rounded-xl hover:bg-pixel hover:text-white transition-all"><AlignStartHorizontal size={16} className="mx-auto"/></button>
                    <button onClick={() => alignFields('v-center')} className="p-2 bg-primary border border-surfaceElevated rounded-xl hover:bg-pixel hover:text-white transition-all"><AlignCenterHorizontal size={16} className="mx-auto"/></button>
                    <button onClick={() => alignFields('bottom')} className="p-2 bg-primary border border-surfaceElevated rounded-xl hover:bg-pixel hover:text-white transition-all"><AlignEndHorizontal size={16} className="mx-auto"/></button>
                  </div>
                </div>
              )}

              <button onClick={() => { setFields(fields.filter(f => !selectedFieldIds.includes(f.id))); setSelectedFieldIds([]); }} className="w-full py-3 bg-red-900/20 text-red-400 border border-red-900/40 rounded-xl font-bold flex items-center justify-center gap-2 text-xs">
                <Trash2 size={16} /> REMOVE {selectedFieldIds.length > 1 ? selectedFieldIds.length : ''} FIELD{selectedFieldIds.length > 1 ? 'S' : ''}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center">
              <MousePointer2 size={64} className="mb-6 animate-bounce" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Select fields to modify architecture</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
