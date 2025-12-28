
import { GoogleGenAI } from "@google/genai";

/**
 * Uses Gemini 2.5 Flash Image to isolate the subject.
 */
export const removeBackground = async (imageBase64: string): Promise<string> => {
  // Always use process.env.API_KEY directly as per SDK guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid image format");
  
  const mimeType = matches[1];
  const data = matches[2];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: 'Remove the background from this image. Keep only the person. Output must be a PNG with a transparent background.' }
        ]
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) throw new Error("Empty response");

    for (const part of candidate.content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    
    throw new Error("No image generated");
  } catch (error: any) {
    console.error("BG Remove Error:", error);
    throw error;
  }
};
