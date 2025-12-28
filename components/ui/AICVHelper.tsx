
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, FileSearch, FileUp, Loader2 } from 'lucide-react';
import { BaseFormData } from '../../types';

interface Props {
  formData: BaseFormData;
  onUpdate?: (data: Partial<BaseFormData>) => void;
  mode: 'parser' | 'audit';
}

export const AICVHelper: React.FC<Props> = ({ formData, onUpdate, mode }) => {
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleAudit = async () => {
    // Fix: Obtained API key exclusively from process.env.API_KEY as per initialization guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    setLoading(true);
    try {
        const prompt = `Review this CV JSON data for a domestic worker. 
        Check for spelling errors and logical inconsistencies (like age vs DOB).
        Return a concise Markdown list.
        Data: ${JSON.stringify(formData)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        setAuditResult(response.text || "No feedback generated.");
    } catch (e) {
        setAuditResult("Error connecting to AI service.");
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleParserUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdate) return;

    setLoading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
        
        try {
            // Fix: Obtained API key exclusively from process.env.API_KEY as per initialization guidelines
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = "Extract CV details into JSON. Keys: fullName, religion, dob (YYYY-MM-DD), pob, maritalStatus, children, passportNumber, issueDate, expiryDate, weight, height, expCountry, expPeriod, expPosition.";

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } },
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: "application/json" }
            });

            let text = response.text;
            if (text) {
                const parsed = JSON.parse(text);
                
                const updates: Partial<BaseFormData> = {};
                if (parsed.fullName) updates.fullName = parsed.fullName.toUpperCase();
                if (parsed.religion) updates.religion = parsed.religion.toUpperCase();
                if (parsed.dob) updates.dob = parsed.dob;
                if (parsed.pob) updates.pob = parsed.pob.toUpperCase();
                if (parsed.passportNumber) updates.passportNumber = parsed.passportNumber.toUpperCase();
                if (parsed.expCountry) {
                    updates.hasExperience = true;
                    updates.expCountry1 = parsed.expCountry.toUpperCase();
                    updates.expPeriod1 = parsed.expPeriod;
                    updates.expPosition1 = parsed.expPosition.toUpperCase();
                }
                
                onUpdate(updates);
                setAuditResult("✅ Auto-filled from image successfully!");
            } else {
                setUploadError("AI returned empty response.");
            }

        } catch (err) {
            console.error(err);
            setUploadError("Failed to parse image.");
        } finally {
            setLoading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  if (mode === 'parser') {
      return (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl">
            <h4 className="flex items-center gap-2 text-purple-300 font-bold mb-3">
                <Sparkles className="w-5 h-5" /> AI Resume Parser
            </h4>
            <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-purple-500/50 rounded-xl cursor-pointer hover:bg-purple-900/20 transition-all">
                {loading ? <Loader2 className="animate-spin text-purple-400"/> : <FileUp className="text-purple-400"/>}
                <span className="text-sm text-purple-200">{loading ? 'Analyzing Document...' : 'Upload Old CV Image to Auto-Fill'}</span>
                <input type="file" accept="image/*" hidden onChange={handleParserUpload} disabled={loading} />
            </label>
            {uploadError && <p className="text-red-400 text-xs mt-2">{uploadError}</p>}
            {auditResult && <p className="text-green-400 text-xs mt-2">{auditResult}</p>}
        </div>
      );
  }

  return (
    <div className="mt-8">
        <button 
            onClick={handleAudit} 
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-bold transition-all disabled:opacity-50"
        >
            {loading ? <Loader2 className="animate-spin" /> : <FileSearch />}
            {loading ? 'AI is Checking...' : 'Audit CV with AI'}
        </button>

        {auditResult && (
            <div className="mt-4 p-4 bg-surface rounded-xl border border-surfaceElevated animate-fade-in">
                <h5 className="font-bold text-slate-300 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400"/> AI Analysis Report
                </h5>
                <div className="prose prose-invert text-sm text-slate-400">
                    <pre className="whitespace-pre-wrap font-sans">{auditResult}</pre>
                </div>
            </div>
        )}
    </div>
  );
};
