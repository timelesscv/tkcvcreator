import { GoogleGenAI } from "@google/genai";
import { getActiveGeminiApiKeys } from "./mrzHelper";

/**
 * AI Studio Background Replacer:
 * Replaces busy backgrounds (or unwanted checkerboard artifacts) with a clean, flat, 
 * solid pure studio white (#FFFFFF) background, keeping the subject completely intact.
 */
export const removeBackground = async (imageBase64: string): Promise<string> => {
  if (!imageBase64) throw new Error("No image provided");

  const { data, mimeType, fullDataUrl } = await parseImageInput(imageBase64);

  // 1. Pull active Gemini API keys
  const keys = await getActiveGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error("No active Gemini API key found. Please check API Vault in Admin settings.");
  }

  const candidateModels = ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'];

  for (const apiKey of keys) {
    if (!apiKey) continue;
    for (const model of candidateModels) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { data, mimeType } },
              { 
                text: 'You are an expert photo studio editor for official employment and CV documents. ' +
                      'TASK: Keep the person in this image completely natural, sharp, and intact (preserve face, skin, abaya, hijab, clothing colors, hands, feet, and edges). ' +
                      'Replace the entire background (including any room walls, doors, curtains, or checkerboard grids) with a clean, flat, seamless solid pure studio white (#FFFFFF) background. ' +
                      'The entire background must be 100% solid flat pure white with zero patterns, zero grid, zero checkerboard, and zero textures.'
              }
            ]
          }
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[BG Studio] Model ${model} notice:`, err?.message || err);
      }
    }
  }

  // If AI generation could not complete, throw clean error without modifying original photo
  throw new Error("AI service temporarily unavailable. Please try again in a moment.");
};

/**
 * Normalizes input image into base64 data and mimeType
 */
async function parseImageInput(input: string): Promise<{ data: string; mimeType: string; fullDataUrl: string }> {
  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      let mime = match[1];
      if (mime === 'image/jpg') mime = 'image/jpeg';
      return { data: match[2], mimeType: mime, fullDataUrl: input };
    }
  }

  if (input.startsWith('http') || input.startsWith('blob:')) {
    const response = await fetch(input);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const match = result.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          let mime = match[1];
          if (mime === 'image/jpg') mime = 'image/jpeg';
          resolve({ data: match[2], mimeType: mime, fullDataUrl: result });
        } else {
          resolve({ data: result.split(',')[1] || result, mimeType: 'image/jpeg', fullDataUrl: result });
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  return {
    data: input,
    mimeType: 'image/jpeg',
    fullDataUrl: `data:image/jpeg;base64,${input}`
  };
}
