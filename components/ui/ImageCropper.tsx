
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, Check, X } from 'lucide-react';

interface Props {
  imageSrc: string;
  aspectRatio: number;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

type InteractionType = 'none' | 'dragging' | 'resizing';
type ResizeDir = 't' | 'b' | 'l' | 'r' | 'tl' | 'tr' | 'bl' | 'br';

export const ImageCropper: React.FC<Props> = ({ imageSrc, aspectRatio, onCrop, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  
  const [cropBox, setCropBox] = useState({ x: 20, y: 20, w: 30, h: 30 / aspectRatio });
  const [interaction, setInteraction] = useState<InteractionType>('none');
  const [activeDir, setActiveDir] = useState<ResizeDir | null>(null);
  
  const dragStart = useRef({ 
    x: 0, 
    y: 0, 
    initialBox: { x: 20, y: 20, w: 30, h: 30 } 
  });

  const WORKSPACE_WIDTH = 180; 
  const WORKSPACE_HEIGHT = WORKSPACE_WIDTH / 0.75; 

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      const initialH = 30 / aspectRatio;
      setCropBox({ x: 20, y: 20, w: 40, h: initialH > 80 ? 60 : initialH });
    };
  }, [imageSrc, aspectRatio]);

  const getCoords = (e: MouseEvent | React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleMouseDown = (e: React.MouseEvent, type: InteractionType, dir: ResizeDir | null = null) => {
    e.stopPropagation();
    const coords = getCoords(e);
    dragStart.current = { x: coords.x, y: coords.y, initialBox: { ...cropBox } };
    setInteraction(type);
    setActiveDir(dir);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (interaction === 'none') return;
    const coords = getCoords(e);
    const dx = coords.x - dragStart.current.x;
    const dy = coords.y - dragStart.current.y;
    const init = dragStart.current.initialBox;

    if (interaction === 'dragging') {
      setCropBox(prev => ({
        ...prev,
        x: Math.max(0, Math.min(100 - prev.w, init.x + dx)),
        y: Math.max(0, Math.min(100 - prev.h, init.y + dy))
      }));
    } else if (interaction === 'resizing' && activeDir) {
      setCropBox(prev => {
        let { x, y, w, h } = { ...prev };
        const minSize = 5;
        if (activeDir.includes('r')) w = Math.max(minSize, Math.min(100 - init.x, init.w + dx));
        if (activeDir.includes('l')) {
          const delta = init.x - coords.x;
          if (init.w + delta > minSize) { x = Math.max(0, coords.x); w = init.w + (init.x - x); }
        }
        if (activeDir.includes('b')) h = Math.max(minSize, Math.min(100 - init.y, init.h + dy));
        if (activeDir.includes('t')) {
          const delta = init.y - coords.y;
          if (init.h + delta > minSize) { y = Math.max(0, coords.y); h = init.h + (init.y - y); }
        }
        return { x, y, w, h };
      });
    }
  }, [interaction, activeDir]);

  const handleMouseUp = useCallback(() => setInteraction('none'), []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleSave = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    const exportW = 1000;
    const exportH = (cropBox.h / cropBox.w) * exportW;
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(exportW / 2, exportH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const drawW = (100 / cropBox.w) * exportW;
    const drawH = drawW * (image.height / image.width);
    const offX = -(cropBox.x + cropBox.w / 2 - 50) * (exportW / cropBox.w);
    const offY = -(cropBox.y + cropBox.h / 2 - 50) * (exportH / cropBox.h);
    ctx.drawImage(image, -drawW / 2 + offX, -drawH / 2 + offY, drawW, drawH);
    ctx.restore();
    onCrop(canvas.toDataURL('image/png', 1.0));
  };

  const Handle = ({ dir, className }: { dir: ResizeDir, className: string }) => (
    <div 
      onMouseDown={(e) => handleMouseDown(e, 'resizing', dir)}
      className={`absolute w-2 h-2 bg-white border border-pixel rounded-full z-30 shadow-md hover:scale-125 transition-transform ${className}`}
    />
  );

  return (
    <div className="fixed inset-0 z-[600] bg-black/90 flex items-center justify-center p-2 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1c222b] rounded-[32px] border border-white/10 shadow-2xl overflow-hidden p-4 flex flex-row items-stretch gap-4 max-w-[340px] w-full">
        
        {/* LEFT: WORKSPACE */}
        <div 
          ref={containerRef}
          className="relative bg-black rounded-2xl overflow-hidden border border-white/5 flex-1 select-none shadow-2xl"
          style={{ height: WORKSPACE_HEIGHT }}
        >
          {image && (
            <img 
              src={imageSrc} 
              className="w-full h-full object-contain pointer-events-none transition-transform"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          )}
          
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />

          <div 
            onMouseDown={(e) => handleMouseDown(e, 'dragging')}
            className="absolute border-2 border-white z-20 cursor-move shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]"
            style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%` }}
          >
            <Handle dir="tl" className="-top-1 -left-1 cursor-nw-resize" />
            <Handle dir="tr" className="-top-1 -right-1 cursor-ne-resize" />
            <Handle dir="bl" className="-bottom-1 -left-1 cursor-sw-resize" />
            <Handle dir="br" className="-bottom-1 -right-1 cursor-se-resize" />
            <Handle dir="t" className="-top-1 left-1/2 -translate-x-1/2 cursor-n-resize" />
            <Handle dir="b" className="-bottom-1 left-1/2 -translate-x-1/2 cursor-s-resize" />
            <Handle dir="l" className="-left-1 top-1/2 -translate-y-1/2 cursor-w-resize" />
            <Handle dir="r" className="-right-1 top-1/2 -translate-y-1/2 cursor-e-resize" />
          </div>
        </div>

        {/* RIGHT: SIDEBAR */}
        <div className="flex flex-col gap-3 w-[100px] shrink-0">
          <div className="space-y-1">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block text-center">Preview</span>
            <div className="bg-black rounded-lg border border-white/10 p-1 aspect-[3/4] overflow-hidden flex items-center justify-center">
               <div className="relative w-full h-full bg-zinc-900 rounded-[2px] overflow-hidden">
                 {image && (
                    <img 
                      src={imageSrc} 
                      className="absolute max-none"
                      style={{ 
                        width: (100 / cropBox.w) * 100 + '%',
                        left: -(cropBox.x * (100 / cropBox.w)) + '%',
                        top: -(cropBox.y * (100 / cropBox.h)) + '%',
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: 'center'
                      }}
                    />
                 )}
               </div>
            </div>
          </div>

          <button 
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 border border-white/5 flex items-center justify-center gap-1.5 font-black text-[8px] uppercase tracking-widest"
          >
            <RotateCw size={10} /> Rotate
          </button>

          <div className="mt-auto flex flex-col gap-2">
            <button 
              onClick={handleSave} 
              className="w-full py-2.5 bg-pixel text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-pixelDark transition-all shadow-pixel flex items-center justify-center gap-1.5"
            >
              <Check size={12} /> Save
            </button>
            <button 
              onClick={onCancel} 
              className="w-full py-2 bg-transparent text-slate-600 font-black text-[9px] uppercase tracking-widest hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
