
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "../services/supabaseClient";

export interface MRZData {
  passportNumber: string;
  fullName: string;
  dob: string; 
  expiryDate: string;
  issueDate?: string;
  nationality: string;
  sex: string;
  pob: string;
  placeOfIssue: string;
}

/**
 * Directly pulls active Gemini API keys from Supabase tables:
 * - Queries `api_vault` table for active keys (is_active = true)
 * - Queries `profiles` table for personal_api_key
 * - Caches and updates runtime environment
 */
export async function getActiveGeminiApiKeys(): Promise<string[]> {
  const keys: string[] = [];

  // 1. Query Supabase api_vault table
  try {
    const { data: vaultData, error: vaultError } = await supabase
      .from('api_vault')
      .select('key_value')
      .eq('is_active', true);

    if (!vaultError && vaultData && vaultData.length > 0) {
      vaultData.forEach((row: any) => {
        const k = row.key_value?.trim();
        if (k && !keys.includes(k)) keys.push(k);
      });
    }
  } catch (err) {
    console.warn("[API Engine] Notice while querying api_vault table:", err);
  }

  // 2. Query Supabase profiles table for personal_api_key
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('personal_api_key')
        .eq('id', session.user.id)
        .maybeSingle();

      const pk = profile?.personal_api_key?.trim();
      if (pk && !keys.includes(pk)) keys.push(pk);
    }

    const { data: anyProfiles } = await supabase
      .from('profiles')
      .select('personal_api_key')
      .not('personal_api_key', 'is', null)
      .limit(10);

    if (anyProfiles) {
      anyProfiles.forEach((p: any) => {
        const pk = p.personal_api_key?.trim();
        if (pk && !keys.includes(pk)) keys.push(pk);
      });
    }
  } catch (err) {
    console.warn("[API Engine] Notice while querying profiles table:", err);
  }

  // 3. Check localStorage vault fallback
  try {
    const localVault = localStorage.getItem('pixel_api_vault');
    if (localVault) {
      const parsed = JSON.parse(localVault);
      if (Array.isArray(parsed)) {
        parsed.filter((k: any) => k.is_active).forEach((k: any) => {
          const val = k.key_value?.trim();
          if (val && !keys.includes(val)) keys.push(val);
        });
      }
    }
    const cachedActive = localStorage.getItem('pixel_active_key')?.trim();
    if (cachedActive && !keys.includes(cachedActive)) keys.push(cachedActive);
  } catch {}

  // 4. Runtime environment
  const envKey = (window as any).process?.env?.API_KEY || (globalThis as any).process?.env?.API_KEY || process.env.API_KEY || '';
  if (envKey.trim() && !keys.includes(envKey.trim())) {
    keys.push(envKey.trim());
  }

  return keys;
}

export async function fetchApiKeyFromSupabaseTables(): Promise<string> {
  const keys = await getActiveGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error("No active Gemini API key found in Supabase 'api_vault' or 'profiles' tables. Please add an active key in Admin > API Vault.");
  }
  const chosen = keys[0];
  if ((window as any).process?.env) (window as any).process.env.API_KEY = chosen;
  if ((globalThis as any).process?.env) (globalThis as any).process.env.API_KEY = chosen;
  try { localStorage.setItem('pixel_active_key', chosen); } catch {}
  return chosen;
}

/**
 * Calculates Ethiopian passport issue dates based on official standards:
 * Standard: Issue Date = Expiry Date - 5 years + 1 day (-5y + 1d).
 * If the resulting issue date is still in the future relative to the current date
 * (indicating a 10-year validity passport), calculate by -10 years + 1 day (-10y + 1d).
 */
export function calculateEthiopianIssueDate(expiryDateStr: string): string {
  if (!expiryDateStr || typeof expiryDateStr !== 'string') return '';
  const trimmed = expiryDateStr.trim();
  if (!trimmed) return '';

  let year: number | null = null;
  let month: number | null = null; // 0-indexed
  let day: number | null = null;

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  // Match DD-MM-YYYY or DD/MM/YYYY
  const altMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  // Match MRZ format YYMMDD (6 digits)
  const mrzMatch = trimmed.match(/^(\d{2})(\d{2})(\d{2})$/);

  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  } else if (altMatch) {
    day = parseInt(altMatch[1], 10);
    month = parseInt(altMatch[2], 10) - 1;
    year = parseInt(altMatch[3], 10);
  } else if (mrzMatch) {
    const yy = parseInt(mrzMatch[1], 10);
    year = yy < 50 ? 2000 + yy : 1900 + yy;
    month = parseInt(mrzMatch[2], 10) - 1;
    day = parseInt(mrzMatch[3], 10);
  } else {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      month = parsed.getMonth();
      day = parsed.getDate();
    }
  }

  if (year === null || month === null || day === null || isNaN(year) || isNaN(month) || isNaN(day)) {
    return '';
  }

  // Standard: Issue Date = Expiry Date - 5 years + 1 day
  let result = new Date(year - 5, month, day + 1);
  const now = new Date();

  // If the resulting issue date is still in the future relative to the current date, calculate -10 years + 1 day
  if (result > now) {
    result = new Date(year - 10, month, day + 1);
  }

  const yyyy = result.getFullYear();
  const mm = String(result.getMonth() + 1).padStart(2, '0');
  const dd = String(result.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  const keys = await getActiveGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error("No active Gemini API key found in Supabase 'api_vault' or 'profiles' tables. Please add an active key in Admin > API Vault.");
  }
  
  const base64Data = await fileToBase64(file);
  let lastError: any = null;

  const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];

  for (const apiKey of keys) {
    for (const model of candidateModels) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } },
              { text: "Extract passport details from this passport image. Carefully scan the MRZ lines at the bottom (2 lines of 44 characters for TD3 passports) as well as the visual document page fields. Return JSON with: mrzLine1, fullName, passportNumber, nationality, dob (YYYY-MM-DD), sex (M or F), expiryDate (YYYY-MM-DD), issueDate (YYYY-MM-DD if found), pob (Place of birth), placeOfIssue." }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mrzLine1: { type: Type.STRING },
                fullName: { type: Type.STRING },
                passportNumber: { type: Type.STRING },
                nationality: { type: Type.STRING },
                dob: { type: Type.STRING },
                sex: { type: Type.STRING },
                expiryDate: { type: Type.STRING },
                issueDate: { type: Type.STRING },
                pob: { type: Type.STRING },
                placeOfIssue: { type: Type.STRING }
              },
              required: ["passportNumber", "dob", "expiryDate"]
            }
          }
        });

        const text = response.text || '{}';
        const data = JSON.parse(text);
        
        const expiryDate = data.expiryDate || '';
        const calculatedIssueDate = calculateEthiopianIssueDate(expiryDate) || data.issueDate || '';
        
        // Save the working key to active state
        if ((window as any).process?.env) (window as any).process.env.API_KEY = apiKey;
        if ((globalThis as any).process?.env) (globalThis as any).process.env.API_KEY = apiKey;
        try { localStorage.setItem('pixel_active_key', apiKey); } catch {}

        return {
          fullName: parseEthiopianMRZName(data.mrzLine1 || "") || (data.fullName || '').toUpperCase(),
          passportNumber: (data.passportNumber || '').toUpperCase(),
          dob: data.dob || '',
          expiryDate: expiryDate,
          issueDate: calculatedIssueDate,
          nationality: (data.nationality || 'ETHIOPIAN').toUpperCase(),
          sex: (data.sex || '').toUpperCase(),
          pob: (data.pob || 'ADDIS ABABA').toUpperCase(),
          placeOfIssue: 'ADDIS ABABA'
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[MRZ Scanner] Error with model ${model} and key ${apiKey.substring(0, 8)}...:`, err?.message || err);
        // If it's a model-not-found error, try the next model with same key; otherwise try next key
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('not found') || msg.includes('unsupported model') || msg.includes('404')) {
          continue;
        }
        break; // Move to next key for auth/quota errors
      }
    }
  }

  throw new Error(`Failed to call Gemini API: ${lastError?.message || 'Check API key permissions and quota in Supabase api_vault table.'}`);
};
