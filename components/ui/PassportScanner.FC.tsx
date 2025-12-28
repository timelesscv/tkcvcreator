
import React, { useState } from 'react';
import { Scan, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { processPassportImage, MRZData } from '../../utils/mrzHelper';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onScanComplete: (data: MRZData) => void;
  className?: string;
}

export const PassportScanner: React.FC<Props> = ({ onScanComplete, className }) => {
  // Fix: Removed activeApiKey from useAuth as utilities handle the key via process.env.API_KEY.
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Fix: Removed unnecessary activeApiKey argument to match processPassportImage signature.
      const data = await processPassportImage(file);
      onScanComplete(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to read passport. Ensure image is clear, no glare, and contains the bottom code lines.");
    } finally {
      setLoading(false);
      // Reset input so same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="relative flex items-center justify-center gap-2 w-full p-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all text-white font-bold border border-blue-400/30">
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Scanning MRZ...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Scan Successful!</span>
          </>
        ) : (
          <>
            <Scan className="w-5 h-5" />
            <span>Scan Passport & Auto-Fill</span>
          </>
        )}
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          hidden 
          disabled={loading}
        />
      </label>
      
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="text-xs text-slate-500 text-center">
        Upload a clear photo of the passport page. We scan the bottom code lines.
      </div>
    </div>
  );
};
