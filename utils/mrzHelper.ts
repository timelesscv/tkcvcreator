
import { GoogleGenAI, Type } from "@google/genai";

export interface MRZData {
  passportNumber: string;
  fullName: string;
  dob: string; 
  expiryDate: string;
  nationality: string;
  sex: string;
  pob: string;
  placeOfIssue: string;
}

function parseEthiopianMRZName(raw: string): string {
  if (!raw || raw.length < 10) return "";
  const content = raw.trim().toUpperCase().substring(5).split('<<<<')[0];
  const parts = content.split('<<');
  if (parts.length >= 2) {
    const surname = parts[0].replace(/</g, ' ').trim();
    const given = parts[1].replace(/</g, ' ').trim();
    return `${given} ${surname}`.trim().toUpperCase();
  }
  return content.replace(/</g, ' ').trim().toUpperCase();
}

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const processPassportImage = async (file: File): Promise<MRZData> => {
  // Always use process.env.API_KEY directly as per SDK guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToBase64(file);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } },
        { text: "Extract passport details from MRZ lines. Focus on the bottom two lines. Provide JSON: mrzLine1, passportNumber, nationality, dob (YYYY-MM-DD), sex, expiryDate (YYYY-MM-DD), pob, placeOfIssue." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mrzLine1: { type: Type.STRING },
          passportNumber: { type: Type.STRING },
          nationality: { type: Type.STRING },
          dob: { type: Type.STRING },
          sex: { type: Type.STRING },
          expiryDate: { type: Type.STRING },
          pob: { type: Type.STRING },
          placeOfIssue: { type: Type.STRING }
        },
        required: ["mrzLine1", "passportNumber", "dob", "expiryDate"]
      }
    }
  });

  const text = response.text || '{}';
  const data = JSON.parse(text);
  
  return {
    fullName: parseEthiopianMRZName(data.mrzLine1 || ""),
    passportNumber: (data.passportNumber || '').toUpperCase(),
    dob: data.dob || '',
    expiryDate: data.expiryDate || '',
    nationality: (data.nationality || 'ETHIOPIAN').toUpperCase(),
    sex: (data.sex || '').toUpperCase(),
    pob: (data.pob || 'ADDIS ABABA').toUpperCase(),
    placeOfIssue: (data.placeOfIssue || 'ADDIS ABABA').toUpperCase()
  };
};
