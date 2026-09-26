import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';

interface Props {
  imageSrc: string;
  aspectRatio?: number;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

type DragMode = 'none' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

interface CropBox {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  w: number; // percentage 0-100
  h: number; // percentage 0-100
}

export const ImageCropper: React.FC<Props> = ({ 
  imageSrc, 
  onCrop, 
  onCancel 
}) => {
  const [currentImg, setCurrentImg] = useState<HTMLImageElement | null>(null);
  
  // Free-moving crop box in percentages (0-100)
  const [crop, setCrop] = useState<CropBox>({ x: 10, y: 10, w: 80, h: 80 });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: CropBox;
    imgRect: DOMRect | null;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startCrop: { x: 10, y: 10, w: 80, h: 80 },
    imgRect: null
  });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setCurrentImg(img);
      // Initialize free-moving crop box covering 80% centered
      setCrop({ x: 10, y: 10, w: 80, h: 80 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Pointer down on frame or handle
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imgRef.current) return;

    const clientX = 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientX : e.nativeEvent.clientX;
    const clientY = 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientY : e.nativeEvent.clientY;

    dragRef.current = {
      mode,
      startX: clientX,
      startY: clientY,
      startCrop: { ...crop },
      imgRect: imgRef.current.getBoundingClientRect()
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const { mode, startX, startY, startCrop, imgRect } = dragRef.current;
      if (mode === 'none' || !imgRect || !currentImg) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const dxPx = clientX - startX;
      const dyPx = clientY - startY;

      // Convert pixel deltas to percentage of image
      const dx = (dxPx / imgRect.width) * 100;
      const dy = (dyPx / imgRect.height) * 100;

      if (mode === 'move') {
        const maxX = 100 - startCrop.w;
        const maxY = 100 - startCrop.h;
        setCrop({
          x: Math.max(0, Math.min(maxX, startCrop.x + dx)),
          y: Math.max(0, Math.min(maxY, startCrop.y + dy)),
          w: startCrop.w,
          h: startCrop.h
        });
        return;
      }

      // 100% Free-move resizing on every handle
      let newX = startCrop.x;
      let newY = startCrop.y;
      let newW = startCrop.w;
      let newH = startCrop.h;
      const minSize = 5;

      if (mode.includes('e')) {
        newW = Math.max(minSize, Math.min(100 - startCrop.x, startCrop.w + dx));
      }
      if (mode.includes('w')) {
        const proposedW = startCrop.w - dx;
        if (proposedW >= minSize && startCrop.x + dx >= 0) {
          newX = startCrop.x + dx;
          newW = proposedW;
        }
      }
      if (mode.includes('s')) {
        newH = Math.max(minSize, Math.min(100 - startCrop.y, startCrop.h + dy));
      }
      if (mode.includes('n')) {
        const proposedH = startCrop.h - dy;
        if (proposedH >= minSize && startCrop.y + dy >= 0) {
          newY = startCrop.y + dy;
          newH = proposedH;
        }
      }

      setCrop({
        x: Math.max(0, Math.min(100 - newW, newX)),
        y: Math.max(0, Math.min(100 - newH, newY)),
        w: Math.max(minSize, Math.min(100, newW)),
        h: Math.max(minSize, Math.min(100, newH))
      });
    };

    const handlePointerUp = () => {
      dragRef.current.mode = 'none';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [currentImg]);

  // Export cropped image cleanly
  const handleSave = () => {
    if (!currentImg) return;

    const nw = currentImg.naturalWidth;
    const nh = currentImg.naturalHeight;

    const sx = Math.max(0, Math.round((crop.x / 100) * nw));
    const sy = Math.max(0, Math.round((crop.y / 100) * nh));
    const sw = Math.min(nw - sx, Math.round((crop.w / 100) * nw));
    const sh = Math.min(nh - sy, Math.round((crop.h / 100) * nh));

    if (sw <= 0 || sh <= 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(currentImg, sx, sy, sw, sh, 0, 0, sw, sh);
    const cropped = canvas.toDataURL('image/png', 0.95);
    onCrop(cropped);
  };

  // Render via React portal to document.body so parent overflow-hidden / backdrop-blur NEVER cuts it off
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 select-none">
      <div className="bg-[#121620] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-lg w-full max-h-[92vh]">
        
        {/* Top Header - Always visible with Save and Cancel */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#161c28]">
          <span className="text-xs font-black uppercase text-white tracking-wider">Crop Photo</span>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-pixel hover:bg-pixelDark text-white text-xs font-black uppercase tracking-wider shadow-pixel flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Check size={14} /> Save
            </button>
          </div>
        </div>

        {/* Free-Moving Framing Area */}
        <div className="relative bg-black flex-1 flex items-center justify-center p-2 overflow-hidden min-h-[280px] max-h-[65vh]">
          {currentImg ? (
            <div className="relative inline-block max-w-full max-h-full">
              <img
                ref={imgRef}
                src={currentImg.src}
                alt="Source"
                className="max-h-[60vh] max-w-full w-auto h-auto object-contain block mx-auto pointer-events-none select-none"
              />

              {/* Outside Dark Overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'rgba(0, 0, 0, 0.65)',
                  clipPath: `polygon(
                    0% 0%, 0% 100%, 100% 100%, 100% 0%,
                    ${crop.x}% 0%,
                    ${crop.x}% ${crop.y}%,
                    ${crop.x + crop.w}% ${crop.y}%,
                    ${crop.x + crop.w}% ${crop.y + crop.h}%,
                    ${crop.x}% ${crop.y + crop.h}%,
                    ${crop.x}% 0%
                  )`
                }}
              />

              {/* Free-moving Crop Frame */}
              <div
                onMouseDown={(e) => handlePointerDown(e, 'move')}
                onTouchStart={(e) => handlePointerDown(e, 'move')}
                className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.7)] cursor-move z-20"
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.w}%`,
                  height: `${crop.h}%`
                }}
              >
                {/* 3x3 Grid */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* 4 Corner Handles */}
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'nw')}
                  onTouchStart={(e) => handlePointerDown(e, 'nw')}
                  className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-pixel rounded-full shadow-md cursor-nwse-resize"
                />
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'ne')}
                  onTouchStart={(e) => handlePointerDown(e, 'ne')}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-pixel rounded-full shadow-md cursor-nesw-resize"
                />
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'sw')}
                  onTouchStart={(e) => handlePointerDown(e, 'sw')}
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-pixel rounded-full shadow-md cursor-nesw-resize"
                />
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'se')}
                  onTouchStart={(e) => handlePointerDown(e, 'se')}
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-pixel rounded-full shadow-md cursor-nwse-resize"
                />

                {/* 4 Edge Handles */}
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'n')}
                  onTouchStart={(e) => handlePointerDown(e, 'n')}
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 bg-white border border-pixel rounded-full shadow cursor-ns-resize"
                />
                <div
                  onMouseDown={(e) => handlePointerDown(e, 's')}
                  onTouchStart={(e) => handlePointerDown(e, 's')}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 bg-white border border-pixel rounded-full shadow cursor-ns-resize"
                />
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'w')}
                  onTouchStart={(e) => handlePointerDown(e, 'w')}
                  className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-6 bg-white border border-pixel rounded-full shadow cursor-ew-resize"
                />
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'e')}
                  onTouchStart={(e) => handlePointerDown(e, 'e')}
                  className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-6 bg-white border border-pixel rounded-full shadow cursor-ew-resize"
                />
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs font-bold animate-pulse">Loading image...</div>
          )}
        </div>

        {/* Bottom Bar with large Save & Cancel buttons */}
        <div className="px-4 py-3 bg-[#161c28] border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <X size={15} /> Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-pixel hover:bg-pixelDark text-white text-xs font-black uppercase tracking-wider shadow-pixel flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Check size={15} /> Save Crop
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
