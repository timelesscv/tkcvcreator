
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BackButton, FormInput, FormSection } from './FormComponents';
import { User, Building, Shield, Crown, BarChart, LogOut, Save, UserCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ProfilePage: React.FC<Props> = ({ onBack }) => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    agencyName: user?.agencyName || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  if (!user) return null;

  // Calculate Subscription Days
  const getDaysLeft = () => {
    if (!user.subscriptionExpiry) return 0;
    const end = new Date(user.subscriptionExpiry);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.new !== passData.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      await changePassword(passData.new);
      setPassData({ current: '', new: '', confirm: '' });
      setMessage({ type: 'success', text: 'Password changed successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to change password.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 pt-20 animate-fade-in">
      <BackButton onClick={onBack} />
      
      <div className="text-center mb-10">
         <div className="w-24 h-24 bg-gradient-to-br from-accentAll to-orange-600 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
            {user.agencyName.charAt(0).toUpperCase()}
         </div>
         <h1 className="text-3xl font-bold text-white">{user.agencyName}</h1>
         <p className="text-slate-400 flex items-center justify-center gap-2 mt-2">
            <UserCircle size={16}/> {user.name} • <span className="text-green-400 capitalize">{user.role}</span>
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* LEFT COLUMN */}
         <div className="space-y-6">
            
            {/* Subscription Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-surfaceElevated rounded-2xl p-6 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Crown size={120} />
               </div>
               <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  <Crown className="text-yellow-400"/> Subscription Status
               </h3>
               <div className="text-sm text-slate-400 mb-6">Current Plan: {user.subscriptionStatus === 'active' ? 'Premium Access' : 'Inactive'}</div>
               
               <div className="flex items-end gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">{getDaysLeft()}</span>
                  <span className="text-lg text-slate-400 mb-2">Days Remaining</span>
               </div>
               <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                   <div className="bg-yellow-400 h-full" style={{ width: `${Math.min(getDaysLeft(), 30) / 30 * 100}%` }}></div>
               </div>
               <p className="text-xs text-slate-500 mt-2">Expires on: {new Date(user.subscriptionExpiry || '').toDateString()}</p>
            </div>

            {/* Stats Card */}
            <div className="bg-secondary p-6 rounded-2xl border-l-4 border-blue-500">
               <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <BarChart className="text-blue-500"/> Analytics
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-white">{user.cvGeneratedCount || 0}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide mt-1">CVs Generated</div>
                  </div>
                  <div className="bg-primary p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-white">6</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide mt-1">Templates Available</div>
                  </div>
               </div>
            </div>

            <button onClick={logout} className="w-full py-4 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl hover:bg-red-900/40 transition-all font-bold flex items-center justify-center gap-2">
               <LogOut size={20}/> Sign Out
            </button>
         </div>

         {/* RIGHT COLUMN */}
         <div className="space-y-6">
            
            {/* Profile Settings */}
            <FormSection title="Agency Details" icon={<Building />} accentColor="border-accentAll">
               <div className="space-y-4">
                  <FormInput 
                    label="Agency Name" 
                    value={formData.agencyName} 
                    onChange={e => setFormData({...formData, agencyName: e.target.value})} 
                    disabled={!isEditing}
                  />
                  <FormInput 
                    label="Owner Name" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    disabled={!isEditing}
                  />
                  <FormInput 
                    label="Phone Number" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    disabled={!isEditing}
                  />
                  <FormInput 
                    label="Email (Login ID)" 
                    value={formData.email} 
                    readOnly 
                    className="opacity-50 cursor-not-allowed"
                  />
                  
                  {isEditing ? (
                      <div className="flex gap-2">
                          <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-700 rounded-lg text-white">Cancel</button>
                          <button onClick={handleSaveProfile} className="flex-1 py-2 bg-green-600 rounded-lg text-white flex items-center justify-center gap-2">
                              <Save size={16}/> Save Changes
                          </button>
                      </div>
                  ) : (
                      <button onClick={() => setIsEditing(true)} className="w-full py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800">
                          Edit Details
                      </button>
                  )}
               </div>
            </FormSection>

            {/* Password Change */}
            <FormSection title="Security" icon={<Shield />} accentColor="border-accentAll">
               <form onSubmit={handleChangePassword} className="space-y-4">
                   <FormInput 
                      type="password"
                      label="Current Password" 
                      value={passData.current}
                      onChange={e => setPassData({...passData, current: e.target.value})}
                      placeholder="••••••"
                   />
                   <div className="grid grid-cols-2 gap-2">
                        <FormInput 
                            type="password"
                            label="New Password" 
                            value={passData.new}
                            onChange={e => setPassData({...passData, new: e.target.value})}
                        />
                        <FormInput 
                            type="password"
                            label="Confirm" 
                            value={passData.confirm}
                            onChange={e => setPassData({...passData, confirm: e.target.value})}
                        />
                   </div>
                   <button type="submit" className="w-full py-2 bg-surfaceElevated hover:bg-slate-600 rounded-lg text-white transition-all">
                       Update Password
                   </button>
               </form>
            </FormSection>

         </div>
      </div>

      {message && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl animate-fade-in-down ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
              {message.text}
              <button onClick={() => setMessage(null)} className="ml-4 font-bold opacity-70 hover:opacity-100">✕</button>
          </div>
      )}
    </div>
  );
};
