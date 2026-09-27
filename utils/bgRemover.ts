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

  const candidateModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image'];
  let lastErrorMessage = '';

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
        lastErrorMessage = err?.message || String(err);
        console.warn(`[BG Studio] Model ${model} with key ${apiKey.substring(0, 8)}... notice:`, lastErrorMessage);
        // If rate limit or quota exceeded, break to next key immediately instead of hammering same key with different models
        if (lastErrorMessage.includes('quota') || lastErrorMessage.includes('RESOURCE_EXHAUSTED') || lastErrorMessage.includes('429')) {
          break;
        }
      }
    }
  }

  // If AI generation could not complete, throw informative error
  if (lastErrorMessage) {
    if (lastErrorMessage.includes('quota') || lastErrorMessage.includes('RESOURCE_EXHAUSTED') || lastErrorMessage.includes('429')) {
      throw new Error("Gemini API rate limit exceeded. Please add a second key to Supabase or wait 1 minute.");
    }
    throw new Error(`AI service error: ${lastErrorMessage}`);
  }
  throw new Error("AI service temporarily unavailable. Please try again in a moment.");
};

/**
 * Normalizes and optimizes input image (scales down large phone photos to max 1024px to prevent token quota exhaustion)
 */
async function parseImageInput(input: string): Promise<{ data: string; mimeType: string; fullDataUrl: string }> {
  // First obtain raw data URL
  let rawUrl = input;
  if (input.startsWith('http') || input.startsWith('blob:')) {
    try {
      const response = await fetch(input);
      const blob = await response.blob();
      rawUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {}
  } else if (!input.startsWith('data:')) {
    rawUrl = `data:image/jpeg;base64,${input}`;
  }

  // Downscale to max 1024px to reduce token consumption by 90%+
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 1024;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const optimizedUrl = canvas.toDataURL('image/jpeg', 0.88);
        const match = optimizedUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          resolve({ data: match[2], mimeType: match[1], fullDataUrl: optimizedUrl });
          return;
        }
      }
      // Fallback if canvas context fails
      const fallbackMatch = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (fallbackMatch) {
        resolve({ data: fallbackMatch[2], mimeType: fallbackMatch[1], fullDataUrl: rawUrl });
      } else {
        resolve({ data: rawUrl.split(',')[1] || rawUrl, mimeType: 'image/jpeg', fullDataUrl: rawUrl });
      }
    };
    img.onerror = () => {
      const fallbackMatch = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (fallbackMatch) {
        resolve({ data: fallbackMatch[2], mimeType: fallbackMatch[1], fullDataUrl: rawUrl });
      } else {
        resolve({ data: rawUrl.split(',')[1] || rawUrl, mimeType: 'image/jpeg', fullDataUrl: rawUrl });
      }
    };
    img.src = rawUrl;
  });
}
