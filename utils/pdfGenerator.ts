
import { jsPDF } from "jspdf";
import { CustomTemplate } from '../types';
import { registerFonts } from './fonts.ts';

const formatDate = (dateStr: string, format: 'numeric' | 'alpha' = 'alpha'): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  if (format === 'numeric') {
    return `${day}/${month}/${year}`;
  }

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${day} ${months[date.getMonth()]} ${year}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : 
    [0, 0, 0];
};

const getMappedFont = (fontName: string): string => {
  const font = (fontName || 'Helvetica').toLowerCase();
  if (font.includes('helvetica') || font.includes('arial') || font.includes('sans')) return 'helvetica';
  if (font.includes('times') || font.includes('serif')) return 'times';
  if (font.includes('courier') || font.includes('mono')) return 'courier';
  if (font.includes('zapfdingbats') || font.includes('symbol')) return 'zapfdingbats';
  if (font.includes('century')) return 'Century';
  if (font.includes('poppins')) return 'Poppins';
  return 'helvetica';
};

const getBase64FromUrl = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const drawCheckmark = (doc: jsPDF, cx: number, cy: number, boxWidth: number, boxHeight: number, colorRgb: [number, number, number], fontSize?: number) => {
  doc.saveGraphicsState();
  doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);

  // If fontSize is provided, scale checkmark proportionally with the chosen font size
  let size: number;
  if (fontSize && fontSize > 0) {
    const desiredSize = fontSize * 0.35; // 1 pt = 0.3528 mm
    size = Math.max(1.2, Math.min(desiredSize, Math.min(boxWidth, boxHeight) * 0.85));
  } else {
    size = Math.max(2.0, Math.min(boxWidth, boxHeight) * 0.75);
  }

  const strokeW = Math.max(0.18, Math.min(size * 0.16, 0.85));
  doc.setLineWidth(strokeW);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  
  // Clean checkmark coordinates centered at (cx, cy)
  const p1x = cx - size * 0.35;
  const p1y = cy + size * 0.05;
  const p2x = cx - size * 0.05;
  const p2y = cy + size * 0.35;
  const p3x = cx + size * 0.40;
  const p3y = cy - size * 0.35;
  
  doc.line(p1x, p1y, p2x, p2y);
  doc.line(p2x, p2y, p3x, p3y);
  doc.restoreGraphicsState();
};

const isTruthyCheckbox = (v: any): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v > 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === '1' || s === 'on' || s === '✓' || s === 'x' || s === 'checked';
  }
  return false;
};

export const generateTemplatePDF = async (data: any, template: CustomTemplate, agencyName: string = "PIXEL"): Promise<void> => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  registerFonts(doc);

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;

  for (let i = 0; i < template.pages.length; i++) {
    if (i > 0) doc.addPage();
    const bgUrl = template.pages[i];
    
    if (bgUrl) {
      try {
        const base64Bg = await getBase64FromUrl(bgUrl);
        const format = base64Bg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(base64Bg, format, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, 'FAST');
      } catch (e) {
        console.error("Failed to load background", e);
      }
    }

    const pageFields = template.fields.filter(f => f.page === i + 1);
    for (const field of pageFields) {
      let val = data[field.key];
      
      if (field.key === 'currentDate') val = new Date().toISOString();
      else if (field.key === 'officeName') val = template.officeName || data.officeName || '';
      else if (field.key === 'photoFace') val = data.photos?.face;
      else if (field.key === 'photoFull') val = data.photos?.full;
      else if (field.key === 'photoPassport') val = data.photos?.passport;
      else if (field.key === 'placeOfIssue') val = data.placeOfIssue || 'ADDIS ABABA';

      const xl = (field.x / 100) * PAGE_WIDTH;
      const yt = (field.y / 100) * PAGE_HEIGHT;
      const width = (field.width / 100) * PAGE_WIDTH;
      const height = (field.height / 100) * PAGE_HEIGHT;

      if (field.type === 'image') {
        try {
          if (typeof val === 'string' && val.startsWith('data:image')) {
            const base64Img = await getBase64FromUrl(val);
            const format = base64Img.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(base64Img, format, xl, yt, width, height, undefined, 'MEDIUM');
          }
        } catch (e) {}
        continue;
      }

      const rgb = hexToRgb(field.color || '#000000');

      // Checkbox rendering: clean checkmark scaled to field.fontSize
      if (field.type === 'checkmark') {
        if (!isTruthyCheckbox(val)) {
          // Left blank when unchecked
          continue;
        }
        const cx = xl + (width / 2);
        const cy = yt + (height / 2);
        drawCheckmark(doc, cx, cy, width, height, rgb, field.fontSize);
        continue;
      }

      // Boolean rendering (Output Mode: YES/NO): format as text "YES" or "NO"
      if (field.type === 'boolean') {
        if (isTruthyCheckbox(val)) {
          val = 'YES';
        } else if (val === false || val === 'false' || val === '0' || val === 'no' || val === 'NO') {
          val = 'NO';
        } else {
          // Unchecked boolean field left blank
          continue;
        }
      }

      // If an untyped text field was given a boolean value, format as checkmark or skip
      if (typeof val === 'boolean' || val === 'true' || val === 'false') {
        if (!isTruthyCheckbox(val)) {
          continue;
        }
        val = 'YES';
      }

      if (!val && val !== 0) continue;

      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      
      let style = 'normal';
      if (field.bold && field.italic) style = 'bolditalic';
      else if (field.bold) style = 'bold';
      else if (field.italic) style = 'italic';
      
      let font = getMappedFont(field.fontFamily);
      let text = String(val).trim();

      doc.setFont(font, style);
      
      // Auto-scale font size to fit box
      let currentFontSize = field.fontSize || 10;
      doc.setFontSize(currentFontSize);

      const isDateField = field.key.toLowerCase().includes('date') || field.key === 'dob';
      if (isDateField && field.type === 'text' && text.length > 5) {
        text = formatDate(text, field.dateFormat || 'alpha');
      }

      if (field.type === 'text') {
        const ptToMm = 0.3527;
        const padding = 0.5; // Small internal padding in mm
        const maxW = width - (padding * 2);
        const maxH = height - (padding * 2);

        // Decrease font size iteratively until text fits both width and height floor
        while ((doc.getTextWidth(text) > maxW || (currentFontSize * ptToMm) > maxH) && currentFontSize > 4) {
          currentFontSize -= 0.25;
          doc.setFontSize(currentFontSize);
        }
      } else {
        doc.setFontSize(field.fontSize || 10);
      }

      const anchorY = yt + (height / 2);
      let anchorX = xl;
      if (field.align === 'center') anchorX = xl + (width / 2);
      else if (field.align === 'right') anchorX = xl + width;

      doc.text(text, anchorX, anchorY, { 
        align: field.align || 'left',
        baseline: 'middle'
      });
    }
  }

  const clean = (s: any) => (s || '').toString().trim().toUpperCase().replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '_');
  const finalFileName = `${clean(agencyName)}_${clean(data.refNo || 'REF')}_${clean(data.fullName || 'CANDIDATE')}_${clean(template.officeName)}.pdf`;
  doc.save(finalFileName);
};
