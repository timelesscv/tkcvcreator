
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AppSettings, CustomTemplate } from '../types';
import { supabase } from '../services/supabaseClient';

interface ApiKey {
  id: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  settings: AppSettings;
  templates: CustomTemplate[];
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
  trackGeneration: (amount?: number) => void;
  saveSettings: (s: AppSettings) => void;
  saveTemplate: (t: CustomTemplate, pageAssets: (string | File)[]) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getAllUsers: () => Promise<User[]>;
  addSubscription: (userId: string, type: 'month' | 'year' | '15days') => Promise<void>;
  terminateUser: (userId: string) => Promise<void>;
  promoteSelf: () => Promise<void>;
  getApiKeys: () => Promise<ApiKey[]>;
  addApiKey: (key: string) => Promise<void>;
  toggleApiKey: (id: string, active: boolean) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  cycleApiKey: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SUPER_ADMIN_EMAIL = "nathanasrat262@gmail.com";
const DEFAULT_SETTINGS: AppSettings = { enabledCountries: { kuwait: true, saudi: true, jordan: true, oman: true, uae: true, qatar: true, bahrain: true } };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);

  const cycleApiKey = async (providedKey?: string) => {
    // Determine the key to use (Priority: Passed key > User profile key > Vault key)
    let targetKey = providedKey || user?.personalApiKey;

    if (!targetKey) {
      try {
        const { data: keys } = await supabase
          .from('api_vault')
          .select('key_value')
          .eq('is_active', true);
        
        if (keys && keys.length > 0) {
          const randomIndex = Math.floor(Math.random() * keys.length);
          targetKey = keys[randomIndex].key_value;
        }
      } catch (e) {
        console.error("[API Vault] Key rotation failure:", e);
      }
    }

    // Apply the key to the global environment where the Gemini SDK expects it
    if (targetKey) {
      if ((window as any).process?.env) {
        (window as any).process.env.API_KEY = targetKey;
      }
      if ((globalThis as any).process?.env) {
        (globalThis as any).process.env.API_KEY = targetKey;
      }
    }
  };

  const fetchUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data && !error) {
        if (data.email === SUPER_ADMIN_EMAIL && data.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
          data.role = 'admin';
        }

        // Apply personal API key to global context immediately
        if (data.personal_api_key) {
          await cycleApiKey(data.personal_api_key);
        } else {
          await cycleApiKey();
        }

        setUser({
          id: data.id, email: data.email, name: data.name, agencyName: data.agency_name,
          phone: data.phone, role: data.role, subscriptionStatus: data.subscription_status,
          subscriptionPlan: data.subscription_plan, subscriptionExpiry: data.subscription_expiry,
          joinedDate: data.created_at, cvGeneratedCount: data.cv_generated_count || 0,
          personalApiKey: data.personal_api_key
        });
      }
    } catch (e) { 
      console.error("Error fetching user:", e); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const fetchTemplates = async (userId: string) => {
    try {
      const { data } = await supabase.from('templates').select('*').eq('owner_id', userId);
      if (data) {
        setTemplates(data.map((t: any) => ({
          id: t.id, name: t.name, officeName: t.office_name || t.name,
          country: t.country, pages: t.pages || [], fields: t.fields, createdAt: t.created_at
        })));
      }
    } catch (e) { console.error("Error fetching templates:", e); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { 
        fetchUser(session.user.id); 
        fetchTemplates(session.user.id); 
      } else { 
        setIsLoading(false); 
        cycleApiKey();
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { 
        fetchUser(session.user.id); 
        fetchTemplates(session.user.id); 
      } else { 
        setUser(null); 
        setTemplates([]); 
        setIsLoading(false); 
        cycleApiKey();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (data: any) => {
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) throw error;
  };

  const register = async (data: any) => {
    const { error } = await supabase.auth.signUp({
      email: data.email, password: data.password,
      options: { data: { name: data.name, agency_name: data.agencyName, phone: data.phone } }
    });
    if (error) throw error;
  };

  const logout = async () => { await supabase.auth.signOut(); };
  const refreshUser = () => { if (user) fetchUser(user.id); };
  
  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ name: data.name, agency_name: data.agencyName, phone: data.phone }).eq('id', user.id);
    if (error) throw error;
    refreshUser();
  };

  const changePassword = async (newPass: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  };

  const trackGeneration = async (amount: number = 1) => {
    if (!user) return;
    const nextCount = (user.cvGeneratedCount || 0) + amount;
    await supabase.from('profiles').update({ cv_generated_count: nextCount }).eq('id', user.id);
    refreshUser();
  };

  const saveSettings = (s: AppSettings) => {
    setSettings(s);
    localStorage.setItem('pixel_settings', JSON.stringify(s));
  };

  const saveTemplate = async (t: CustomTemplate, pageAssets: (string | File)[]) => {
    if (!user) return;
    const uploadedPages = await Promise.all(pageAssets.map(async (asset, idx) => {
      if (typeof asset === 'string' && asset.startsWith('http')) return asset;
      const file = typeof asset === 'string' ? null : asset;
      if (!file) return asset as string;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${t.id}/${idx}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('backgrounds').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('backgrounds').getPublicUrl(data.path);
      return publicUrl;
    }));
    const { error } = await supabase.from('templates').upsert({
      id: t.id, owner_id: user.id, name: t.name, office_name: t.officeName, country: t.country, pages: uploadedPages, fields: t.fields
    });
    if (error) throw error;
    fetchTemplates(user.id);
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) throw error;
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const getAllUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((d: any) => ({
      id: d.id, email: d.email, name: d.name, agencyName: d.agency_name, phone: d.phone, role: d.role,
      subscriptionStatus: d.subscription_status, subscriptionPlan: d.subscription_plan,
      subscriptionExpiry: d.subscription_expiry, joinedDate: d.created_at, cvGeneratedCount: d.cv_generated_count || 0,
      personalApiKey: d.personal_api_key
    }));
  };

  const addSubscription = async (userId: string, type: 'month' | 'year' | '15days') => {
    const { data } = await supabase.from('profiles').select('subscription_expiry').eq('id', userId).single();
    let currentExpiry = data?.subscription_expiry ? new Date(data.subscription_expiry) : new Date();
    if (currentExpiry < new Date()) currentExpiry = new Date();
    if (type === 'month') currentExpiry.setMonth(currentExpiry.getMonth() + 1);
    else if (type === 'year') currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
    else if (type === '15days') currentExpiry.setDate(currentExpiry.getDate() + 15);
    await supabase.from('profiles').update({ subscription_status: 'active', subscription_expiry: currentExpiry.toISOString() }).eq('id', userId);
  };

  const terminateUser = async (userId: string) => {
    await supabase.from('profiles').update({ subscription_status: 'inactive' }).eq('id', userId);
  };

  const promoteSelf = async () => {
    if (user) { await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id); refreshUser(); }
  };

  const getApiKeys = async () => {
    const { data, error } = await supabase.from('api_vault').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const addApiKey = async (key_value: string) => {
    const { error } = await supabase.from('api_vault').insert([{ key_value, is_active: true }]);
    if (error) throw error;
  };

  const toggleApiKey = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from('api_vault').update({ is_active }).eq('id', id);
    if (error) throw error;
  };

  const deleteApiKey = async (id: string) => {
    const { error } = await supabase.from('api_vault').delete().eq('id', id);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, settings, templates, login, register, logout, refreshUser,
      updateProfile, changePassword, trackGeneration, saveSettings, saveTemplate,
      deleteTemplate, getAllUsers, addSubscription, terminateUser, promoteSelf,
      getApiKeys, addApiKey, toggleApiKey, deleteApiKey, cycleApiKey
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
